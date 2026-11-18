#!/usr/bin/env python3
"""
Validate one or more authored SBA MCQ JSON files for clinical & structural quality.
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path("/home/antigravity/dilshzic/css-osce-mcq")
PUBLIC_DIR = REPO_ROOT / "public"
VALID_SPECIALTIES = {"med", "surg", "gynobs", "paed"}
VALID_DIFFICULTIES = {"Core", "Moderate", "Advanced"}
BANNED_OPTION_RE = re.compile(
    r"\b(all of the above|none of the above|both [a-e] and [a-e]|all of these|none of these)\b",
    re.I,
)


def validate_file(path: Path, expected_count=None):
    data = json.loads(path.read_text())
    assert isinstance(data, list), f"{path}: top level must be list"
    if expected_count is not None:
        assert len(data) >= expected_count, f"{path}: expected >= {expected_count} items, got {len(data)}"

    seen_ids = set()
    seen_stems = set()
    letter_counts = [0, 0, 0, 0, 0]

    for idx, q in enumerate(data):
        ctx = f"{path.name}[{idx}] ({q.get('id', '?')})"
        for req in [
            "id", "specialty", "specialtyName", "domain", "batch",
            "sourceType", "difficulty", "topic", "stem", "options",
            "correctIndex", "optionRationales", "clinicalPearl", "guideCitation"
        ]:
            assert req in q, f"{ctx}: missing {req}"

        assert q["id"] not in seen_ids, f"{ctx}: duplicate id"
        seen_ids.add(q["id"])
        assert q["specialty"] in VALID_SPECIALTIES, f"{ctx}: bad specialty {q['specialty']}"
        assert q["sourceType"] in {"osce", "guide"}, f"{ctx}: bad sourceType"
        assert q["difficulty"] in VALID_DIFFICULTIES, f"{ctx}: bad difficulty {q['difficulty']}"

        stem = q["stem"].strip()
        assert len(stem) >= 25, f"{ctx}: stem too short ({len(stem)} chars)"
        norm_stem = stem.lower()
        assert norm_stem not in seen_stems, f"{ctx}: duplicate stem"
        seen_stems.add(norm_stem)

        opts = q["options"]
        assert isinstance(opts, list) and len(opts) == 5, f"{ctx}: options must have 5 strings"
        clean_opts = [o.strip() for o in opts]
        assert all(len(o) >= 2 for o in clean_opts), f"{ctx}: empty option"
        assert len(set(o.lower() for o in clean_opts)) == 5, f"{ctx}: duplicate option in {clean_opts}"
        for o in clean_opts:
            assert not BANNED_OPTION_RE.search(o), f"{ctx}: banned option wording '{o}'"
            assert not re.match(r"^[A-Ea-e][\).:]\s+", o), f"{ctx}: option should not bake letter prefix '{o}'"

        ci = q["correctIndex"]
        assert isinstance(ci, int) and 0 <= ci <= 4, f"{ctx}: bad correctIndex {ci}"
        letter_counts[ci] += 1

        rats = q["optionRationales"]
        assert isinstance(rats, list) and len(rats) == 5, f"{ctx}: optionRationales must have 5 strings"
        for r_i, r in enumerate(rats):
            assert len(r.strip()) >= 15, f"{ctx}: rationale {r_i} too short"
            if r_i == ci:
                assert r.strip().lower().startswith("correct"), f"{ctx}: rationale[{r_i}] should start with 'Correct:'"
            else:
                assert r.strip().lower().startswith("incorrect"), f"{ctx}: rationale[{r_i}] should start with 'Incorrect:'"

        gc = q["guideCitation"]
        assert isinstance(gc, dict) and gc.get("guideId") and gc.get("guideTitle") and gc.get("keyPoint"), f"{ctx}: bad guideCitation"

        img = q.get("imagePath")
        if img:
            assert (PUBLIC_DIR / img).exists(), f"{ctx}: missing image file {PUBLIC_DIR / img}"

        if q["sourceType"] == "osce":
            ss = q.get("sourceStation")
            assert isinstance(ss, dict) and ss.get("id") and ss.get("title") and ss.get("verifiedAnswer"), f"{ctx}: bad sourceStation"

    print(f"VALIDATED {path.name}: {len(data)} MCQs OK | answer distribution A..E = {letter_counts}")
    return len(data), letter_counts


if __name__ == "__main__":
    files = [Path(p) for p in sys.argv[1:]]
    if not files:
        print("Usage: validate_chunk.py <file1.json> ...")
        sys.exit(1)
    for f in files:
        validate_file(f)
