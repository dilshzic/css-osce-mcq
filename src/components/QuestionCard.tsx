import React, { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Contrast,
  ExternalLink,
  Flag,
  Lightbulb,
  Maximize2,
  Strikethrough,
  SunMoon,
} from "lucide-react";
import { ImageFilterMode, SbaQuestion, SpecialtyId } from "../types";

interface QuestionCardProps {
  question: SbaQuestion;
  selectedIndex: number | undefined;
  lockedReveal: boolean;
  strikethroughIndices: number[];
  isBookmarked?: boolean;
  isFlagged?: boolean;
  onSelectOption: (optIndex: number) => void;
  onToggleStrike: (optIndex: number) => void;
  onToggleBookmark?: () => void;
  onToggleFlag?: () => void;
  onOpenLightbox: (src: string, caption: string, filter: ImageFilterMode) => void;
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;

const SPEC_LABELS: Record<SpecialtyId, string> = {
  med: "Medicine",
  surg: "Surgery",
  gynobs: "Gyn & Obs",
  paed: "Paediatrics",
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedIndex,
  lockedReveal,
  strikethroughIndices,
  isBookmarked,
  isFlagged,
  onSelectOption,
  onToggleStrike,
  onToggleBookmark,
  onToggleFlag,
  onOpenLightbox,
}) => {
  const [imgFilter, setImgFilter] = useState<ImageFilterMode>("normal");
  const [traceOpen, setTraceOpen] = useState(false);

  const imgSrc = question.imagePath
    ? `${import.meta.env.BASE_URL}${question.imagePath}`
    : null;
  const specLabel = SPEC_LABELS[question.specialty] ?? question.specialtyName;

  return (
    <article className="question-card">
      <div className="q-header-bar">
        <div className="q-chips">
          <span className="mono-badge">#{question.number}</span>
          <span className={`chip spec ${question.specialty}`}>{specLabel}</span>
          {lockedReveal && selectedIndex === undefined && (
            <span className="chip" style={{ color: "var(--bad)", borderColor: "var(--bad-border)" }}>
              Not Attempted
            </span>
          )}
        </div>

        <div className="q-tools">
          {onToggleFlag && (
            <button
              type="button"
              className={`tool-toggle ${isFlagged ? "active" : ""}`}
              onClick={onToggleFlag}
              title="Flag question for review"
            >
              <Flag size={13} /> {isFlagged ? "Flagged" : "Flag"}
            </button>
          )}
          {onToggleBookmark && (
            <button
              type="button"
              className={`tool-toggle ${isBookmarked ? "active" : ""}`}
              onClick={onToggleBookmark}
              title="Bookmark question (Shift+B)"
            >
              <Bookmark size={13} /> {isBookmarked ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>

      <div className={`q-body ${imgSrc ? "with-image" : "text-only"}`}>
        <div className="q-content-col">
          <p className="q-stem">{question.stem}</p>

          <div className="options-list" role="radiogroup" aria-label="Answer choices">
            {question.options.map((optText, idx) => {
              const isSelected = selectedIndex === idx;
              const isCorrectOption = idx === question.correctIndex;
              const isStruck = strikethroughIndices.includes(idx);

              let stateClass = "";
              if (lockedReveal) {
                if (isCorrectOption) stateClass = "correct locked";
                else if (isSelected) stateClass = "wrong locked";
                else stateClass = "locked";
              } else if (isSelected) {
                stateClass = "selected";
              }

              return (
                <div key={idx} className={`option-wrap ${stateClass}`}>
                  <div className="option-row">
                    <button
                      type="button"
                      className="option-main-btn"
                      disabled={lockedReveal}
                      onClick={() => onSelectOption(idx)}
                      aria-checked={isSelected}
                      role="radio"
                    >
                      <span className="option-key">{LETTERS[idx]}</span>
                      <span className={`option-text ${isStruck && !lockedReveal ? "struck" : ""}`}>
                        {optText}
                      </span>
                    </button>

                    {!lockedReveal && (
                      <button
                        type="button"
                        className="strike-btn"
                        title={`Strike out option ${LETTERS[idx]}`}
                        aria-label={`Strike out option ${LETTERS[idx]}`}
                        onClick={() => onToggleStrike(idx)}
                      >
                        <Strikethrough size={14} />
                      </button>
                    )}
                  </div>

                  {lockedReveal && (
                    <div className="option-rationale">{question.optionRationales[idx]}</div>
                  )}
                </div>
              );
            })}
          </div>

          {lockedReveal && (
            <div className="answer-insights">
              <div className="pearl-card">
                <div className="pearl-title">
                  <Lightbulb size={14} /> High-Yield Clinical Pearl
                </div>
                <p className="pearl-text">{question.clinicalPearl}</p>
              </div>

              <div className="trace-accordion">
                <button
                  type="button"
                  className="trace-summary"
                  onClick={() => setTraceOpen((v) => !v)}
                  aria-expanded={traceOpen}
                >
                  <span>
                    Source Traceability: {question.guideCitation.guideTitle}
                    {question.sourceStation ? ` · ${question.sourceStation.provenance}` : " · CSS Guide Curriculum"}
                  </span>
                  {traceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {traceOpen && (
                  <div className="trace-body">
                    <div className="trace-row">
                      <span className="trace-kicker">Topic &amp; Classification</span>
                      <div>
                        <strong>{question.topic}</strong>
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        {question.specialtyName} · {question.domainClean} · {question.batch} · {question.difficulty}
                      </div>
                    </div>

                    <div className="trace-row">
                      <span className="trace-kicker">Referenced CSS Guide Document</span>
                      <div>
                        {question.guideCitation.guideUrl ? (
                          <a
                            href={question.guideCitation.guideUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="guide-link-btn"
                          >
                            {question.guideCitation.guideTitle} <ExternalLink size={13} />
                          </a>
                        ) : (
                          <strong>{question.guideCitation.guideTitle}</strong>
                        )}
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        {question.guideCitation.keyPoint}
                      </div>
                    </div>

                    {question.sourceStation && (
                      <>
                        <div className="trace-row">
                          <span className="trace-kicker">
                            Original Past OSCE Station ({question.sourceStation.id})
                          </span>
                          <div>
                            <strong>{question.sourceStation.title}</strong>
                          </div>
                          <div style={{ color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
                            {question.sourceStation.originalPrompt}
                          </div>
                        </div>

                        <div className="trace-row">
                          <span className="trace-kicker">
                            Verified OSCE Key {question.sourceStation.provenance}
                          </span>
                          <div style={{ color: "var(--text-secondary)" }}>
                            {question.sourceStation.verifiedAnswer}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {imgSrc && (
          <div className="figure-pane">
            <div className="figure-toolbar">
              <span className="figure-title">Clinical Figure</span>
              <div className="figure-controls">
                <button
                  type="button"
                  className={`mini-ctrl-btn ${imgFilter === "contrast" ? "active" : ""}`}
                  onClick={() => setImgFilter((f) => (f === "contrast" ? "normal" : "contrast"))}
                  title="Enhance image contrast"
                >
                  <Contrast size={12} /> Contrast
                </button>
                <button
                  type="button"
                  className={`mini-ctrl-btn ${imgFilter === "invert" ? "active" : ""}`}
                  onClick={() => setImgFilter((f) => (f === "invert" ? "normal" : "invert"))}
                  title="Invert radiograph colors"
                >
                  <SunMoon size={12} /> Invert
                </button>
                <button
                  type="button"
                  className="mini-ctrl-btn"
                  onClick={() =>
                    onOpenLightbox(
                      imgSrc,
                      `${specLabel} — Clinical Figure`,
                      imgFilter
                    )
                  }
                  title="Open zoomable lightbox (Z)"
                >
                  <Maximize2 size={12} /> Zoom
                </button>
              </div>
            </div>

            <div
              className="figure-frame"
              onClick={() =>
                onOpenLightbox(imgSrc, `${specLabel} — Clinical Figure`, imgFilter)
              }
            >
              <img
                src={imgSrc}
                alt="Clinical OSCE figure"
                className={
                  imgFilter === "contrast"
                    ? "filter-contrast"
                    : imgFilter === "invert"
                      ? "filter-invert"
                      : ""
                }
              />
            </div>

            <div className="figure-caption">
              <span>{specLabel}</span>
              <span>Click figure or press Z to zoom</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
