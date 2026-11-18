# CSS OSCE Single Best Answer (SBA) MCQ Bank & Pipeline

**Live Web App:** https://dilshzic.github.io/css-osce-mcq/

An interactive **Single Best Answer (5-option A–E)** clinical MCQ bank, reproducible data pipeline, and timed OSCE circuit simulator built for the **University of Kelaniya Clinical Skills Strand (CSS)** across **Medicine, Surgery, Gynaecology & Obstetrics, and Paediatrics** (Batches 20–33).

---

## Coverage & Bank Architecture

- **480 Single Best Answer (SBA) MCQs** (exact **120 per specialty**: Medicine, Surgery, Gyn & Obs, Paediatrics; 5 options `A–E`, 1 best answer per station)
  - **310 Past OSCE Station SBAs** mapped 1-to-1 from Batches 20–33 (excluding 2 blank placeholder source slides)
  - **170 Guide-Derived High-Yield Protocol SBAs** synthesizing core clinical skills guidelines across all 42 CSS guides (including GUT radiology & bronchoscopy, ECG/emergency/ABG/inhalers/fundoscopy/ORS, WHO Surgical Safety Checklist & preoperative optimization, SLCOG transfusion/partogram/perineal repair/STI protocols, paediatric dengue resuscitation, EPI/SLMA vaccines, developmental milestones, rickets, and dehydration/burns/DKA)
- **256 Optimized Clinical Figures (`public/images/`)**: Chest/abdominal/orthopaedic radiographs, ECGs, clinical photographs, fundus views, surgical/OBGYN instruments, developmental milestone charts, and Child Health Development Records compressed to border-trimmed WebP (`~2.86 MB` total)
- **42 Indexed CSS Guide Documents (`data/guides_catalog.json`)**: Every single guide has verified question coverage (`>= 1` SBA each) with direct Google Drive links and option-by-option rationales (`A–E`)

---

## Interactive Web Application Features

1. **Study Mode (Hint-Free)**
   - Choose freely between **Medicine** (`120`), **Surgery** (`120`), **Gyn & Obs** (`120`), and **Paediatrics** (`120`) individually or combined, plus filter by **Station Format** (With Clinical Figure / Text Vignette) and **Study Status** (Unanswered / Missed / Saved)
   - Question cards hide titles, sub-domains, batches, and topic hints while solving — revealing full **per-option rationales (`A–E`)**, clinical pearls, and an expandable **Source Traceability** drawer only after you answer
   - Clinical figure inspector with **High Contrast**, **X-Ray Invert**, and a full-screen zoom/pan **Lightbox** (`Z` key or click)
   - Keyboard shortcuts: `A–E` / `1–5` answer, `←` / `→` navigate, `Z` zoom figure, `Shift+B` bookmark
   - Local progress persistence (`localStorage`) + JSON export for the full bank or missed questions
   - **Light Clinical Paper** and **Dark Radiology Mode** theme toggle
2. **Timed OSCE Circuit Simulator**
   - Toggle any 1–4 specialties (**Medicine**, **Surgery**, **Gyn & Obs**, **Paediatrics**) to run custom focused or balanced mock circuits, optionally restricted to clinical-image stations only
   - Configurable station count (`10–120`) and pacing (`60s`, `90s`, `120s`, or Untimed) with a live countdown timer, flag markers, and post-exam specialty scorecard breakdown
3. **Guides & Pipeline Library**
   - Searchable catalog of all 42 indexed CSS Guide Documents with direct Drive links and one-click filtered practice per guide

---

## Reproducible MCQ Pipeline

```text
data/authored/*_part_{a,b,c_guides}.json ─┐
data/guides_catalog.json                    ─┼─► pipeline/validate_chunk.py ─► pipeline/build_mcq_bank.py
public/images/{med,surg,gynobs,paed}        ─┘                                        │
                                                                                      ▼
                                                              public/data/{questions,metadata,guides}.json
```

### Key Pipeline Scripts (`pipeline/`)
- `pipeline/schema.json` — JSON Schema enforcing 5-option SBA structure, `A–E` per-option rationales, clinical pearl, `guideCitation`, and optional `sourceStation`
- `pipeline/extract_osce_sources.py` — Extracts structured OSCE stations from the 4 master Google Docs/Compendium, maps global station IDs to prevent intra-domain numbering collisions, extracts text/OCR digests from the 42 Drive guides (`pdftotext`, XML parsing, `tesseract`), and produces border-trimmed WebP figures
- `pipeline/validate_chunk.py` — Structural & clinical linting across every authored chunk (`5` unique options, no banned "All/None of the above" stems, valid rationales, verified image paths)
- `pipeline/build_mcq_bank.py` — Validates all 12 authored chunks (`120` SBAs per specialty), checks global stem/ID uniqueness and guide citation integrity, deterministically balances the `A–E` answer key (~20% each while preserving naturally ordered numerical/stage options), and compiles `public/data/{questions,metadata,guides}.json`

---

## Local Development & Deployment

```bash
# 1. Validate authored SBAs & compile public/data/*.json
python3 pipeline/build_mcq_bank.py

# 2. Install frontend dependencies & typecheck/build
npm install
npm run build

# 3. Preview locally
npm run preview
```

Pushes to `main` trigger [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to build and deploy automatically to **GitHub Pages**.
