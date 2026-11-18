#!/usr/bin/env python3
"""
Step 1 of CSS OSCE MCQ Pipeline:
Extract structured OSCE stations (from Google Docs + Compendium / Drive guides),
optimize all 256 clinical figures (border-trim + <=960px WebP) into public/images/,
and extract text/OCR digests from the 42 CSS Guide Documents in Google Drive.

Prerequisites: `gdocs`, `gdrive`, `pdftotext`, `pdftoppm`, `tesseract`, `Pillow`.
"""

import argparse
import json
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
IMG_OUT_DIR = REPO_ROOT / "public" / "images"
GUIDES_CATALOG = REPO_ROOT / "data" / "guides_catalog.json"

DOC_IDS = {
    "med": "1xQOVblVgn0MtkaJQKI3T6UtVKfwZH4GqjWgkVQoe6Jk",
    "surg": "1bvAysKjCqlB1Cvpg-j8KC7ZtVxGVcoYIQV-oUFaRfD4",
    "gynobs": "181exRioGegCPHAdmxqf4Vv8jhWy82r9EInRgqR7j6Wg",
    "paed": "1M0EsousJkpuMwWTBmBpx-xx3guJvvO_Ciy_IEYtZ_ag",
}

SPECIALTY_NAMES = {
    "med": "Medicine",
    "surg": "Surgery",
    "gynobs": "Gynaecology & Obstetrics",
    "paed": "Paediatrics",
}


def load_compendium_answers(compendium_path: Path) -> dict:
    md = compendium_path.read_text()
    ans = {}
    cur_h = None
    for line in md.splitlines():
        s = line.strip()
        if s.startswith("#### "):
            cur_h = s[5:].strip()
        elif s.startswith("- **Answer:** ") and cur_h:
            ans[cur_h] = s[len("- **Answer:** "):].strip()
    return ans


def parse_doc_stations(slug: str, body: dict, imgs: list, comp_answers: dict):
    """Parse Google Doc body into globally sequenced stations matched 1:1 to inlineObjectIds."""
    img_meta = {im["object_id"]: im for im in imgs}
    sections = []
    cur_domain = None
    cur_st = None
    used_oids = []
    seq_num = 0

    for blk in body.get("content", []):
        p = blk.get("paragraph")
        if not p:
            continue
        ns = p.get("paragraphStyle", {}).get("namedStyleType", "")
        txt = "".join(e.get("textRun", {}).get("content", "") for e in p.get("elements", [])).strip()
        oids = [
            e["inlineObjectElement"]["inlineObjectId"]
            for e in p.get("elements", [])
            if "inlineObjectElement" in e
        ]

        if ns == "HEADING_2" and re.match(r"^\d+\.\d+\s+", txt):
            cur_domain = txt
        elif ns == "HEADING_3" and re.match(r"^\d+\.\s+\[", txt):
            seq_num += 1
            m = re.match(r"^(\d+)\.\s+\[([^\]]+)\]\s+(.*)$", txt)
            st_num, batch_tag, title = m.group(1), m.group(2), m.group(3)
            raw_ans = comp_answers.get(txt, "")
            pm = re.match(r"^(\[[^\]]+\])\s*(.*)$", raw_ans)
            prov, ans_body = (pm.group(1), pm.group(2)) if pm else ("[Compiled Answer]", raw_ans)
            ans_clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", ans_body)
            ans_clean = re.sub(r"\*([^*]+)\*", r"\1", ans_clean)

            cur_st = {
                "id": f"{slug}_{seq_num:03d}",
                "heading": txt,
                "specialty": slug,
                "specialtyName": SPECIALTY_NAMES[slug],
                "domain": cur_domain,
                "stationNum": seq_num,
                "domainStationNum": int(st_num),
                "batch": batch_tag,
                "title": title,
                "questionLines": [],
                "imageObjectId": None,
                "imagePath": None,
                "answerProvenance": prov,
                "answerKeyMarkdown": ans_body,
                "answerKeyText": ans_clean,
            }
            sections.append(cur_st)
        elif cur_st is not None:
            if oids:
                oid = oids[0]
                cur_st["imageObjectId"] = oid
                used_oids.append((oid, cur_st["id"]))
            elif txt.startswith("✓ ANSWER") or txt.startswith("▪"):
                continue
            elif txt:
                if txt.startswith("QUESTION"):
                    txt = re.sub(r"^QUESTION\s*▸?\s*", "", txt).strip()
                if txt:
                    cur_st["questionLines"].append(txt)

    assert len(used_oids) == len(img_meta), f"{slug}: expected {len(img_meta)} imgs, got {len(used_oids)}"
    return sections, used_oids


def download_and_optimize_image(
    slug: str, doc_id: str, oid: str, station_id: str, work_dir: Path, img_out_dir: Path = IMG_OUT_DIR
):
    raw_dir = work_dir / "raw_imgs" / slug
    raw_dir.mkdir(parents=True, exist_ok=True)
    out_dir = img_out_dir / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_path = raw_dir / f"{oid}.png"
    out_path = out_dir / f"{station_id}.webp"

    if not raw_path.exists():
        for _ in range(4):
            res = subprocess.run(
                ["gdocs", "readonly", "download-image", doc_id, oid, "--output", str(raw_path)],
                capture_output=True,
                text=True,
            )
            if res.returncode == 0 and raw_path.exists():
                break
        else:
            raise RuntimeError(f"Failed download {doc_id} {oid}: {res.stderr}")

    im = Image.open(raw_path).convert("RGB")
    w, h = im.size
    if w > 120 and h > 120:
        px = im.load()

        def row_uniform(y):
            c0 = px[w // 2, y]
            return all(
                abs(px[x, y][k] - c0[k]) < 14
                for x in range(10, w - 10, max(1, w // 20))
                for k in range(3)
            ) and (min(c0) > 225 or y < 6)

        def col_uniform(x):
            c0 = px[x, h // 2]
            return (
                all(
                    abs(px[x, y][k] - c0[k]) < 14
                    for y in range(16, h - 16, max(1, h // 20))
                    for k in range(3)
                )
                and min(c0) > 225
            )

        top, bot, left, right = 0, h, 0, w
        while top < 20 and row_uniform(top):
            top += 1
        while h - bot < 20 and row_uniform(bot - 1):
            bot -= 1
        while left < 20 and col_uniform(left):
            left += 1
        while w - right < 20 and col_uniform(right - 1):
            right -= 1
        if right - left > 60 and bot - top > 60:
            im = im.crop((left, top, right, bot))

    if max(im.size) > 960:
        im.thumbnail((960, 960), Image.Resampling.LANCZOS)
    im.save(out_path, "WEBP", quality=88, method=6)
    return f"images/{slug}/{station_id}.webp", out_path.stat().st_size


def extract_guide_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".pdf":
        text = subprocess.check_output(["pdftotext", str(path), "-"], text=True, errors="ignore")
        if len(re.sub(r"\s+", "", text)) < 250:
            tmp = path.parent / f"ocr_{path.stem}"
            tmp.mkdir(exist_ok=True)
            subprocess.run(["pdftoppm", "-png", "-r", "120", "-l", "20", str(path), str(tmp / "p")], check=True)
            parts = [
                subprocess.check_output(["tesseract", str(p), "stdout", "--psm", "6"], text=True, stderr=subprocess.DEVNULL)
                for p in sorted(tmp.glob("p-*.png"))
            ]
            text = "\n".join(parts)
        return text
    if ext == ".pptx":
        texts = []
        with zipfile.ZipFile(path) as zf:
            slides = sorted(
                [n for n in zf.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)],
                key=lambda x: int(re.findall(r"slide(\d+)", x)[0]),
            )
            for s in slides:
                root = ET.fromstring(zf.read(s))
                lines = [t.text.strip() for t in root.iter() if t.tag.endswith("}t") and t.text and t.text.strip()]
                if lines:
                    texts.append(" ".join(lines))
        return "\n".join(texts)
    if ext == ".docx":
        with zipfile.ZipFile(path) as zf:
            root = ET.fromstring(zf.read("word/document.xml"))
            paras = []
            for p in root.iter():
                if p.tag.endswith("}p"):
                    pts = [t.text for t in p.iter() if t.tag.endswith("}t") and t.text]
                    if pts:
                        paras.append("".join(pts))
            return "\n".join(paras)
    if ext == ".ppt":
        data = path.read_bytes()
        u16 = re.findall(rb"(?:[ -~]\x00){6,}", data)
        asc = re.findall(rb"[A-Za-z0-9 ,.;:()/%+\-]{10,}", data)
        seen, lines = set(), []
        for chunk in u16:
            s = chunk.decode("utf-16le", errors="ignore").strip()
            if s and s not in seen and not s.startswith(("Arial", "Times", "Calibri", "PowerPoint", "Slide")):
                seen.add(s)
                lines.append(s)
        for chunk in asc:
            s = chunk.decode("ascii", errors="ignore").strip()
            if s and s not in seen and any(c.isspace() for c in s):
                seen.add(s)
                lines.append(s)
        return "\n".join(lines[:400])
    return ""


def run_extraction(work_dir: Path, compendium_path: Path):
    dumps_dir = work_dir / "dumps"
    dumps_dir.mkdir(parents=True, exist_ok=True)
    comp_answers = load_compendium_answers(compendium_path)

    for slug, doc_id in DOC_IDS.items():
        body_path = dumps_dir / f"{slug}_body.json"
        imgs_path = dumps_dir / f"{slug}_imgs.json"
        if not body_path.exists():
            subprocess.run(["gdocs", "readonly", "get", doc_id, "--json"], stdout=body_path.open("w"), check=True)
        if not imgs_path.exists():
            subprocess.run(["gdocs", "readonly", "list-images", doc_id, "--json"], stdout=imgs_path.open("w"), check=True)

        body = json.loads(body_path.read_text())
        imgs = json.loads(imgs_path.read_text())
        stations, used_oids = parse_doc_stations(slug, body, imgs, comp_answers)

        img_results = {}
        with ThreadPoolExecutor(max_workers=10) as pool:
            futs = {
                pool.submit(download_and_optimize_image, slug, doc_id, oid, st_id, work_dir): st_id
                for oid, st_id in used_oids
            }
            for fut in as_completed(futs):
                st_id = futs[fut]
                rel_path, _ = fut.result()
                img_results[st_id] = rel_path

        for st in stations:
            if st["imageObjectId"]:
                st["imagePath"] = img_results[st["id"]]
            st["questionPrompt"] = "\n".join(st["questionLines"]).strip()
        (work_dir / f"stations_{slug}.json").write_text(json.dumps(stations, indent=2, ensure_ascii=False))
        print(f"Extracted {slug}: {len(stations)} stations, {len(used_oids)} images")


def main():
    parser = argparse.ArgumentParser(description="Extract Kelaniya CSS OSCE stations and guide digests.")
    parser.add_argument("--work-dir", type=Path, default=Path("/tmp/mcq_work"), help="Scratch directory for dumps and texts")
    parser.add_argument("--compendium", type=Path, default=Path("/home/antigravity/CSS_Past_OSCEs_Master_Compendium.md"))
    parser.add_argument("--run", action="store_true", help="Execute station & image extraction from Google Docs")
    args = parser.parse_args()

    if args.run:
        run_extraction(args.work_dir, args.compendium)
    else:
        guides = json.loads(GUIDES_CATALOG.read_text()) if GUIDES_CATALOG.exists() else []
        print(f"Configured Docs: {list(DOC_IDS.keys())}")
        print(f"Indexed CSS Guides: {len(guides)}")
        print(f"Optimized Images Dir: {IMG_OUT_DIR}")
        print("Pass --run to re-fetch Google Docs dumps and regenerate public/images/*.webp.")


if __name__ == "__main__":
    main()
