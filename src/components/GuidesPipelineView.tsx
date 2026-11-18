import React, { useState } from "react";
import { Download, ExternalLink, FileText, Play, RotateCcw, Search } from "lucide-react";
import {
  BankMetadata,
  GuideCatalogItem,
  SbaQuestion,
  SpecialtyId,
  UserProgress,
} from "../types";

interface GuidesPipelineViewProps {
  metadata: BankMetadata;
  guides: GuideCatalogItem[];
  questions: SbaQuestion[];
  progress: UserProgress;
  onPracticeGuide: (guideId: string, specialty: SpecialtyId) => void;
  onResetProgress: () => void;
}

export const GuidesPipelineView: React.FC<GuidesPipelineViewProps> = ({
  metadata,
  guides,
  questions,
  progress,
  onPracticeGuide,
  onResetProgress,
}) => {
  const [specFilter, setSpecFilter] = useState<SpecialtyId | "all">("all");
  const [search, setSearch] = useState("");

  const visibleGuides = guides.filter((g) => {
    if (specFilter !== "all" && g.specialty !== specFilter) return false;
    if (search.trim()) {
      return g.title.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const exportMissedJson = () => {
    const missed = questions.filter((q) => {
      const rec = progress.answers[q.id];
      return rec && !rec.isCorrect;
    });
    const blob = new Blob([JSON.stringify(missed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "css-osce-missed-sbas.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFullBankJson = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "css-osce-full-sba-bank.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <section className="pipeline-box">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 21 }}>
              CSS OSCE MCQ Pipeline &amp; Guide Reference Library
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
              Every Single Best Answer (SBA) question in this bank is synthesized by cross-referencing
              your <strong>{metadata.osceStationQuestions} active Past OSCE stations</strong> (Batches
              20–33 across Medicine, Surgery, Gynaecology &amp; Obstetrics, and Paediatrics, including{" "}
              <strong>{metadata.visualImageQuestions} optimized clinical images</strong>) with{" "}
              <strong>{metadata.totalGuides} CSS Guide Documents</strong> from Google Drive.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={exportFullBankJson}>
              <Download size={14} /> Export Bank JSON
            </button>
            <button type="button" className="btn" onClick={exportMissedJson}>
              <Download size={14} /> Export Missed Qs
            </button>
            <button type="button" className="btn danger" onClick={onResetProgress}>
              <RotateCcw size={14} /> Reset Progress
            </button>
          </div>
        </div>

        <div className="score-hero" style={{ marginBottom: 14 }}>
          {metadata.specialties.map((sp) => (
            <div key={sp.id} className="stat-tile">
              <div className="stat-val" style={{ color: sp.color }}>
                {sp.count}
              </div>
              <div className="stat-lbl">
                {sp.shortName} · {sp.imageCount} Figures
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 12 }}>
                <a href={sp.docUrl} target="_blank" rel="noreferrer">
                  OSCE Doc <ExternalLink size={11} />
                </a>
                <a href={sp.pdfUrl} target="_blank" rel="noreferrer">
                  PDF <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
            fontSize: 12.5,
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <strong style={{ color: "var(--text-primary)" }}>Pipeline:</strong>
            <span className="mono-badge">1. extract_osce_sources.py</span>
            <span>→</span>
            <span className="mono-badge">2. schema.json + validate_chunk.py</span>
            <span>→</span>
            <span className="mono-badge">3. build_mcq_bank.py</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Key Balance:</span>
            {Object.entries(metadata.answerDistribution).map(([letter, cnt]) => (
              <span key={letter} className="mono-badge">
                {letter}: {cnt}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17 }}>
            Indexed CSS Guide Documents ({visibleGuides.length})
          </h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="search-box" style={{ width: 230 }}>
              <Search size={14} />
              <input
                type="search"
                className="search-input"
                placeholder="Filter guide titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              style={{ width: 170 }}
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value as SpecialtyId | "all")}
            >
              <option value="all">All Specialties</option>
              <option value="med">Medicine</option>
              <option value="surg">Surgery</option>
              <option value="gynobs">Gyn &amp; Obs</option>
              <option value="paed">Paediatrics</option>
            </select>
          </div>
        </div>

        <div className="guides-grid">
          {visibleGuides.map((g) => {
            const specName =
              metadata.specialties.find((s) => s.id === g.specialty)?.shortName ?? g.specialty;
            return (
              <div key={g.id} className="guide-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`chip spec ${g.specialty}`}>{specName}</span>
                    <span className="mono-badge">{g.questionCount} SBAs</span>
                  </div>
                  <h3 className="guide-card-title">{g.title}</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <FileText size={13} />
                    <span>{Math.round(g.extractedChars / 1000)}k chars indexed</span>
                  </div>
                </div>

                <div className="guide-card-actions">
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="guide-link-btn"
                    style={{ fontSize: 12.5 }}
                  >
                    Open Drive Guide <ExternalLink size={12} />
                  </a>

                  {g.questionCount > 0 && (
                    <button
                      type="button"
                      className="btn primary"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => onPracticeGuide(g.id, g.specialty)}
                    >
                      <Play size={12} /> Practice ({g.questionCount})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
