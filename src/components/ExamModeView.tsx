import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  ActiveExam,
  BankMetadata,
  ExamConfig,
  ImageFilterMode,
  SbaQuestion,
  SpecialtyId,
} from "../types";
import { QuestionCard } from "./QuestionCard";

interface ExamModeViewProps {
  questions: SbaQuestion[];
  filteredQuestions: SbaQuestion[];
  metadata: BankMetadata;
  activeExam: ActiveExam | null;
  onStartExam: (cfg: ExamConfig) => void;
  onUpdateExam: (updater: (prev: ActiveExam) => ActiveExam) => void;
  onExitExam: () => void;
  onOpenLightbox: (src: string, caption: string, filter: ImageFilterMode) => void;
}

const ALL_SPECIALTIES: SpecialtyId[] = ["med", "surg", "gynobs", "paed"];

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const ExamModeView: React.FC<ExamModeViewProps> = ({
  questions,
  metadata,
  activeExam,
  onStartExam,
  onUpdateExam,
  onExitExam,
  onOpenLightbox,
}) => {
  const [selectedSpecs, setSelectedSpecs] = useState<SpecialtyId[]>(ALL_SPECIALTIES);
  const [qCount, setQCount] = useState<number>(20);
  const [pacingSec, setPacingSec] = useState<number>(90);
  const [visualOnly, setVisualOnly] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "incorrect" | "flagged">("all");

  const questionMap = useMemo(() => {
    const m = new Map<string, SbaQuestion>();
    for (const q of questions) m.set(q.id, q);
    return m;
  }, [questions]);

  useEffect(() => {
    if (!activeExam || activeExam.submitted) return;
    const id = window.setInterval(() => {
      onUpdateExam((prev) => {
        if (prev.submitted) return prev;
        const nextElapsed = prev.elapsedSeconds + 1;
        if (prev.config.secondsPerQuestion === 0) {
          return { ...prev, elapsedSeconds: nextElapsed };
        }
        const nextRem = Math.max(0, prev.remainingSeconds - 1);
        return {
          ...prev,
          remainingSeconds: nextRem,
          elapsedSeconds: nextElapsed,
          submitted: nextRem === 0 ? true : prev.submitted,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeExam?.startedAt, activeExam?.submitted, onUpdateExam]);

  const toggleExamSpec = (spec: SpecialtyId) => {
    setSelectedSpecs((prev) => {
      if (prev.includes(spec)) {
        return prev.length === 1 ? prev : prev.filter((x) => x !== spec);
      }
      return [...prev, spec];
    });
  };

  if (!activeExam) {
    const eligibleCount = questions.filter((q) => {
      if (!selectedSpecs.includes(q.specialty)) return false;
      if (visualOnly && !q.imagePath) return false;
      return true;
    }).length;

    const circuitTitle =
      selectedSpecs.length === 4
        ? "Combined 4-Specialty OSCE Circuit"
        : selectedSpecs
            .map((id) => metadata.specialties.find((s) => s.id === id)?.shortName ?? id)
            .join(" + ") + " Circuit";

    return (
      <section className="exam-setup-card" aria-label="Configure Timed OSCE Circuit">
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>
          Timed OSCE Circuit Simulator
        </h1>
        <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", fontSize: 14.5 }}>
          Choose which specialties to include below. Question titles and hints stay hidden until
          after you submit the circuit.
        </p>

        <div className="filter-group" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="filter-label">1. Choose Specialties (Click to toggle 1–4)</span>
            <button
              type="button"
              className="text-link-btn"
              onClick={() => setSelectedSpecs(ALL_SPECIALTIES)}
            >
              Select All 4
            </button>
          </div>
          <div className="setup-grid">
            {metadata.specialties.map((sp) => {
              const active = selectedSpecs.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  type="button"
                  className={`preset-card ${active ? "active" : ""}`}
                  onClick={() => toggleExamSpec(sp.id)}
                  aria-pressed={active}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong>{sp.shortName}</strong>
                    <span className={`chip spec ${sp.id}`}>{sp.count} SBAs</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>
                    {active ? "Included in circuit" : "Click to include"} · {sp.imageCount} figures
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="setup-grid">
          <div className="filter-group">
            <label className="filter-label" htmlFor="exam-count">
              2. Number of Stations (Max {eligibleCount})
            </label>
            <select
              id="exam-count"
              className="filter-select"
              value={qCount}
              onChange={(e) => setQCount(Number(e.target.value))}
            >
              {[10, 20, 30, 40, 60, 120].map((n) => (
                <option key={n} value={n}>
                  {n} Questions
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="exam-pacing">
              3. Time Per Station
            </label>
            <select
              id="exam-pacing"
              className="filter-select"
              value={pacingSec}
              onChange={(e) => setPacingSec(Number(e.target.value))}
            >
              <option value={60}>60 sec / SBA (Rapid Spotter)</option>
              <option value={90}>90 sec / SBA (Recommended OSCE)</option>
              <option value={120}>120 sec / SBA (2-Min Full Station)</option>
              <option value={0}>Untimed Mock Circuit</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="exam-visual">
              4. Visual Spotter Filter
            </label>
            <select
              id="exam-visual"
              className="filter-select"
              value={visualOnly ? "visual" : "mixed"}
              onChange={(e) => setVisualOnly(e.target.value === "visual")}
            >
              <option value="mixed">Mixed Visual &amp; Scenario SBAs</option>
              <option value="visual">Clinical Image Stations Only</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            id="btn-start-exam"
            type="button"
            className="btn primary"
            disabled={eligibleCount === 0}
            onClick={() =>
              onStartExam({
                title: circuitTitle,
                count: Math.min(qCount, eligibleCount),
                secondsPerQuestion: pacingSec,
                specialties: selectedSpecs,
                visualOnly,
              })
            }
          >
            <Play size={15} />
            Begin OSCE Circuit ({Math.min(qCount, eligibleCount)} Stations)
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {pacingSec > 0
              ? `Total exam duration: ${formatTimer(Math.min(qCount, eligibleCount) * pacingSec)}`
              : "Untimed review"}
          </span>
        </div>
      </section>
    );
  }

  const examQuestions = activeExam.questionIds
    .map((id) => questionMap.get(id))
    .filter((q): q is SbaQuestion => Boolean(q));

  const answeredCount = Object.keys(activeExam.selections).length;
  const correctCount = examQuestions.reduce((acc, q) => {
    const sel = activeExam.selections[q.id];
    return acc + (sel === q.correctIndex ? 1 : 0);
  }, 0);
  const accuracy =
    examQuestions.length > 0 ? Math.round((correctCount / examQuestions.length) * 100) : 0;

  const reviewQuestions = activeExam.submitted
    ? examQuestions.filter((q) => {
        if (reviewFilter === "incorrect") return activeExam.selections[q.id] !== q.correctIndex;
        if (reviewFilter === "flagged") return activeExam.flagged.includes(q.id);
        return true;
      })
    : examQuestions;

  const currentQ = examQuestions[activeExam.currentIndex];

  return (
    <div className="study-main">
      {activeExam.submitted && (
        <section className="exam-summary-card" aria-label="OSCE Exam Results">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: 21 }}>
                {activeExam.config.title} — Diagnostic Scorecard
              </h1>
              <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                Completed in {formatTimer(activeExam.elapsedSeconds)} · Results merged into your
                local Study Progress
              </div>
            </div>
            <button type="button" className="btn primary" onClick={onExitExam}>
              <RotateCcw size={14} /> New OSCE Circuit
            </button>
          </div>

          <div className="score-hero">
            <div className="stat-tile">
              <div className="stat-val" style={{ color: "var(--accent-primary)" }}>
                {accuracy}%
              </div>
              <div className="stat-lbl">Overall Score</div>
            </div>
            <div className="stat-tile">
              <div className="stat-val" style={{ color: "var(--ok)" }}>
                {correctCount} / {examQuestions.length}
              </div>
              <div className="stat-lbl">Correct Answers</div>
            </div>
            <div className="stat-tile">
              <div className="stat-val">{answeredCount}</div>
              <div className="stat-lbl">Attempted</div>
            </div>
            <div className="stat-tile">
              <div className="stat-val">{formatTimer(activeExam.elapsedSeconds)}</div>
              <div className="stat-lbl">Elapsed Time</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="filter-label" style={{ marginBottom: 8 }}>
              Performance by Specialty
            </div>
            {metadata.specialties.map((sp) => {
              const subset = examQuestions.filter((q) => q.specialty === sp.id);
              if (subset.length === 0) return null;
              const ok = subset.filter((q) => activeExam.selections[q.id] === q.correctIndex).length;
              const pct = Math.round((ok / subset.length) * 100);
              return (
                <div key={sp.id} className="domain-bar-row">
                  <strong>{sp.shortName}</strong>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: sp.color }}
                    />
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                    {ok}/{subset.length} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="filter-label" style={{ marginRight: 6 }}>
              Inspect Questions:
            </span>
            <button
              type="button"
              className={`btn ${reviewFilter === "all" ? "primary" : ""}`}
              onClick={() => setReviewFilter("all")}
            >
              All ({examQuestions.length})
            </button>
            <button
              type="button"
              className={`btn ${reviewFilter === "incorrect" ? "primary" : ""}`}
              onClick={() => setReviewFilter("incorrect")}
            >
              Incorrect / Missed ({examQuestions.length - correctCount})
            </button>
            <button
              type="button"
              className={`btn ${reviewFilter === "flagged" ? "primary" : ""}`}
              onClick={() => setReviewFilter("flagged")}
            >
              Flagged ({activeExam.flagged.length})
            </button>
          </div>
        </section>
      )}

      {!activeExam.submitted && (
        <div className="exam-hud">
          <div className="exam-hud-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong>{activeExam.config.title}</strong>
              <span className="mono-badge">
                Station {activeExam.currentIndex + 1} / {examQuestions.length}
              </span>
              <span className="mono-badge">{answeredCount} answered</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {activeExam.config.secondsPerQuestion > 0 ? (
                <div
                  className={`timer-pill ${activeExam.remainingSeconds <= 120 ? "low" : ""}`}
                >
                  <Clock size={14} />
                  <span>{formatTimer(activeExam.remainingSeconds)}</span>
                </div>
              ) : (
                <div className="timer-pill">
                  <Clock size={14} />
                  <span>{formatTimer(activeExam.elapsedSeconds)}</span>
                </div>
              )}

              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  onUpdateExam((prev) => ({
                    ...prev,
                    submitted: true,
                  }))
                }
              >
                <CheckCircle2 size={14} /> Finish &amp; Score
              </button>
              <button type="button" className="btn danger" onClick={onExitExam}>
                Abort
              </button>
            </div>
          </div>

          <div className="nav-pills-grid">
            {examQuestions.map((q, idx) => {
              const isCur = idx === activeExam.currentIndex;
              const isAns = activeExam.selections[q.id] !== undefined;
              const isFlag = activeExam.flagged.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`nav-num-btn ${isCur ? "current" : ""} ${isAns ? "answered" : ""} ${isFlag ? "flagged" : ""}`}
                  onClick={() =>
                    onUpdateExam((prev) => ({ ...prev, currentIndex: idx }))
                  }
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!activeExam.submitted && currentQ && (
        <>
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            selectedIndex={activeExam.selections[currentQ.id]}
            lockedReveal={false}
            strikethroughIndices={activeExam.strikethroughs[currentQ.id] || []}
            isFlagged={activeExam.flagged.includes(currentQ.id)}
            onSelectOption={(optIdx) =>
              onUpdateExam((prev) => ({
                ...prev,
                selections: { ...prev.selections, [currentQ.id]: optIdx },
              }))
            }
            onToggleStrike={(optIdx) =>
              onUpdateExam((prev) => {
                const cur = prev.strikethroughs[currentQ.id] || [];
                const next = cur.includes(optIdx)
                  ? cur.filter((x) => x !== optIdx)
                  : [...cur, optIdx];
                return {
                  ...prev,
                  strikethroughs: { ...prev.strikethroughs, [currentQ.id]: next },
                };
              })
            }
            onToggleFlag={() =>
              onUpdateExam((prev) => {
                const has = prev.flagged.includes(currentQ.id);
                return {
                  ...prev,
                  flagged: has
                    ? prev.flagged.filter((x) => x !== currentQ.id)
                    : [...prev.flagged, currentQ.id],
                };
              })
            }
            onOpenLightbox={onOpenLightbox}
          />

          <div className="deck-toolbar">
            <button
              type="button"
              className="btn"
              disabled={activeExam.currentIndex === 0}
              onClick={() =>
                onUpdateExam((prev) => ({
                  ...prev,
                  currentIndex: Math.max(0, prev.currentIndex - 1),
                }))
              }
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {activeExam.currentIndex + 1} of {examQuestions.length}
            </div>
            <button
              type="button"
              className="btn primary"
              disabled={activeExam.currentIndex >= examQuestions.length - 1}
              onClick={() =>
                onUpdateExam((prev) => ({
                  ...prev,
                  currentIndex: Math.min(examQuestions.length - 1, prev.currentIndex + 1),
                }))
              }
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {activeExam.submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reviewQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selectedIndex={activeExam.selections[q.id]}
              lockedReveal={true}
              strikethroughIndices={[]}
              isFlagged={activeExam.flagged.includes(q.id)}
              onSelectOption={() => {}}
              onToggleStrike={() => {}}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
        </div>
      )}
    </div>
  );
};
