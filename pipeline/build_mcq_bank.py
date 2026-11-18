#!/usr/bin/env python3
"""
Step 2 & 3 of CSS OSCE MCQ Pipeline:
Compile, balance, cross-verify, and bundle all authored SBA MCQs from
data/authored/*.json + data/guides_catalog.json into public/data/questions.json,
public/data/metadata.json, and public/data/guides.json for the web frontend.
"""

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from validate_chunk import validate_file

REPO_ROOT = Path(__file__).resolve().parent.parent
AUTHORED_DIR = REPO_ROOT / "data" / "authored"
GUIDES_PATH = REPO_ROOT / "data" / "guides_catalog.json"
PUBLIC_DATA = REPO_ROOT / "public" / "data"
PUBLIC_IMAGES = REPO_ROOT / "public" / "images"

SPECIALTY_ORDER = ["med", "surg", "gynobs", "paed"]
SPECIALTY_META = {
    "med": {
        "name": "Medicine",
        "shortName": "Medicine",
        "code": "MED",
        "color": "#1557b0",
        "docUrl": "https://docs.google.com/document/d/1xQOVblVgn0MtkaJQKI3T6UtVKfwZH4GqjWgkVQoe6Jk/edit",
        "pdfUrl": "https://drive.google.com/file/d/1Ny2fx-UVn_py60KhXbj8OZ6vlhMg9FgA/view",
    },
    "surg": {
        "name": "Surgery",
        "shortName": "Surgery",
        "code": "SURG",
        "color": "#00695c",
        "docUrl": "https://docs.google.com/document/d/1bvAysKjCqlB1Cvpg-j8KC7ZtVxGVcoYIQV-oUFaRfD4/edit",
        "pdfUrl": "https://drive.google.com/file/d/1DLCgeoeJnVvd3g_Ys2yCfzTQVA5tAg0Y/view",
    },
    "gynobs": {
        "name": "Gynaecology & Obstetrics",
        "shortName": "Gyn & Obs",
        "code": "GYN/OBS",
        "color": "#9c1458",
        "docUrl": "https://docs.google.com/document/d/181exRioGegCPHAdmxqf4Vv8jhWy82r9EInRgqR7j6Wg/edit",
        "pdfUrl": "https://drive.google.com/file/d/1Pb9qmUzTyec0Xcr-JGLItzhLtIgE1626/view",
    },
    "paed": {
        "name": "Paediatrics",
        "shortName": "Paediatrics",
        "code": "PAED",
        "color": "#283593",
        "docUrl": "https://docs.google.com/document/d/1M0EsousJkpuMwWTBmBpx-xx3guJvvO_Ciy_IEYtZ_ag/edit",
        "pdfUrl": "https://drive.google.com/file/d/1IxwiDGy870ZeN6SdeW9thwEdVjCSGQ6W/view",
    },
}


def clean_domain(domain: str) -> str:
    return re.sub(r"\s*\(\d+\s+Stations?\)\s*$", "", domain, flags=re.I).strip()


def looks_ordered(options: list) -> bool:
    """Detect numeric, dose/time, or Stage/Grade/Class progressions that should keep their order."""
    if all(re.match(r"^\s*[\d<>≤≥]", o) for o in options):
        return True
    if sum(1 for o in options if re.search(r"\b(Stage|Grade|Class|Score|Type)\s+[IVX0-9]+", o, re.I)) >= 4:
        return True
    return False


def rebalance_options_deterministically(questions: list):
    """Ensure near-uniform ~20% A/B/C/D/E distribution across the bank without breaking ordering."""
    counts = Counter(q["correctIndex"] for q in questions)
    max_pct = max(counts.values()) / max(1, len(questions))
    min_pct = min(counts.values()) / max(1, len(questions))
    if max_pct <= 0.25 and min_pct >= 0.15:
        return  # Already well balanced!

    for idx, q in enumerate(questions):
        if looks_ordered(q["options"]):
            continue
        h = int(hashlib.sha256(q["id"].encode()).hexdigest(), 16)
        target_pos = (idx + h) % 5
        cur_pos = q["correctIndex"]
        if target_pos != cur_pos:
            opts = list(q["options"])
            rats = list(q["optionRationales"])
            opts[cur_pos], opts[target_pos] = opts[target_pos], opts[cur_pos]
            rats[cur_pos], rats[target_pos] = rats[target_pos], rats[cur_pos]
            q["options"] = opts
            q["optionRationales"] = rats
            q["correctIndex"] = target_pos


def main():
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    part_files = [
        AUTHORED_DIR / "med_part_a.json",
        AUTHORED_DIR / "med_part_b.json",
        AUTHORED_DIR / "med_part_c_guides.json",
        AUTHORED_DIR / "surg_part_a.json",
        AUTHORED_DIR / "surg_part_b.json",
        AUTHORED_DIR / "surg_part_c_guides.json",
        AUTHORED_DIR / "gynobs_part_a.json",
        AUTHORED_DIR / "gynobs_part_b.json",
        AUTHORED_DIR / "gynobs_part_c_guides.json",
        AUTHORED_DIR / "paed_part_a.json",
        AUTHORED_DIR / "paed_part_b.json",
        AUTHORED_DIR / "paed_part_c_guides.json",
    ]
    missing = [str(p) for p in part_files if not p.exists()]
    if missing:
        raise SystemExit(f"Missing authored MCQ chunks: {missing}")

    all_questions = []
    seen_ids = set()
    seen_stems = set()
    seen_stations = set()

    for pf in part_files:
        validate_file(pf)
        chunk = json.loads(pf.read_text())
        for q in chunk:
            assert q["id"] not in seen_ids, f"Global duplicate id: {q['id']}"
            seen_ids.add(q["id"])
            norm_stem = " ".join(q["stem"].strip().lower().split())
            assert norm_stem not in seen_stems, f"Global duplicate stem in {q['id']}"
            seen_stems.add(norm_stem)
            q["domainClean"] = clean_domain(q["domain"])
            # Extract compact batch group ("Batch 20", ..., "CSS Guide")
            bm = re.match(r"^(Batch\s+\d+|B32/33)", q["batch"])
            q["batchGroup"] = bm.group(1) if bm else ("CSS Guide" if q["sourceType"] == "guide" else q["batch"])
            if "4th Year" in q["batch"]:
                q["yearLevel"] = "4th Year"
            elif "3rd Year" in q["batch"]:
                q["yearLevel"] = "3rd Year"
            elif q["sourceType"] == "guide":
                q["yearLevel"] = "CSS Guides"
            else:
                q["yearLevel"] = "Combined"
            if q["sourceType"] == "osce":
                st_id = q["sourceStation"]["id"]
                assert st_id not in seen_stations, f"Duplicate sourceStation {st_id}"
                seen_stations.add(st_id)
            all_questions.append(q)

    rebalance_options_deterministically(all_questions)

    # Sort deterministically by specialty order, sourceType (osce first), id
    all_questions.sort(
        key=lambda q: (
            SPECIALTY_ORDER.index(q["specialty"]),
            0 if q["sourceType"] == "osce" else 1,
            q["id"],
        )
    )

    guides = json.loads(GUIDES_PATH.read_text())
    guide_map = {g["id"]: g for g in guides}
    guide_counts = Counter()

    domains_by_spec = defaultdict(Counter)
    batch_counts = Counter()
    spec_counts = Counter()
    image_q_count = 0
    letter_dist = Counter()

    for idx, q in enumerate(all_questions, 1):
        q["number"] = idx
        gc = q["guideCitation"]
        ginfo = guide_map.get(gc["guideId"])
        assert ginfo is not None, f"Unknown guideId {gc['guideId']} in {q['id']}"
        assert gc["guideTitle"] == ginfo["title"], (
            f"Guide title mismatch in {q['id']}: {gc['guideTitle']!r} != {ginfo['title']!r}"
        )
        gc["guideUrl"] = ginfo["url"]
        guide_counts[gc["guideId"]] += 1
        domains_by_spec[q["specialty"]][q["domainClean"]] += 1
        batch_counts[q["batchGroup"]] += 1
        spec_counts[q["specialty"]] += 1
        if q.get("imagePath"):
            image_q_count += 1
            assert (REPO_ROOT / "public" / q["imagePath"]).exists(), f"Missing {q['imagePath']}"
        letter_dist[q["correctIndex"]] += 1

    for s in SPECIALTY_ORDER:
        assert spec_counts[s] == 120, f"Expected 120 SBAs for {s}, got {spec_counts[s]}"

    for g in guides:
        g["questionCount"] = guide_counts[g["id"]]
        assert g["questionCount"] >= 1, f"Guide {g['id']} has 0 questions"

    metadata = {
        "totalQuestions": len(all_questions),
        "osceStationQuestions": sum(1 for q in all_questions if q["sourceType"] == "osce"),
        "guideProtocolQuestions": sum(1 for q in all_questions if q["sourceType"] == "guide"),
        "visualImageQuestions": image_q_count,
        "totalGuides": len(guides),
        "answerDistribution": {chr(65 + k): letter_dist[k] for k in range(5)},
        "specialties": [
            {
                "id": slug,
                **SPECIALTY_META[slug],
                "count": spec_counts[slug],
                "imageCount": sum(1 for q in all_questions if q["specialty"] == slug and q.get("imagePath")),
                "domains": [
                    {"name": dom, "count": cnt}
                    for dom, cnt in sorted(domains_by_spec[slug].items())
                ],
            }
            for slug in SPECIALTY_ORDER
        ],
        "batchGroups": sorted(
            [{"name": k, "count": v} for k, v in batch_counts.items()],
            key=lambda x: (999 if "Guide" in x["name"] else 0, x["name"]),
        ),
    }

    (PUBLIC_DATA / "questions.json").write_text(json.dumps(all_questions, ensure_ascii=False))
    (PUBLIC_DATA / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
    (PUBLIC_DATA / "guides.json").write_text(json.dumps(guides, indent=2, ensure_ascii=False))

    print("=== BUILD MCQ BANK COMPLETE ===")
    print(f"Total Questions : {metadata['totalQuestions']}")
    print(f"  OSCE Stations : {metadata['osceStationQuestions']} (Visual Images: {metadata['visualImageQuestions']})")
    print(f"  CSS Guides    : {metadata['guideProtocolQuestions']}")
    print(f"  By Specialty  : {dict(spec_counts)}")
    print(f"  Answer A..E   : {metadata['answerDistribution']}")


if __name__ == "__main__":
    main()
