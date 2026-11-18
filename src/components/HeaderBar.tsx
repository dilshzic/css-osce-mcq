import React from "react";
import {
  BookOpen,
  Clock,
  Layers,
  Moon,
  SlidersHorizontal,
  Stethoscope,
  Sun,
} from "lucide-react";
import { AppMode, BankMetadata, UserProgress } from "../types";

interface HeaderBarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  metadata: BankMetadata | null;
  progress: UserProgress;
  darkMode: boolean;
  onToggleDark: () => void;
  onToggleMobileFilters: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  mode,
  onModeChange,
  metadata,
  progress,
  darkMode,
  onToggleDark,
  onToggleMobileFilters,
}) => {
  const answeredList = Object.values(progress.answers);
  const totalAnswered = answeredList.length;
  const totalCorrect = answeredList.filter((a) => a.isCorrect).length;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <header className="top-header">
      <div className="top-header-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Stethoscope size={19} />
          </div>
          <div className="brand-text">
            <span className="brand-title">CSS OSCE SBA Bank</span>
            <span className="brand-sub">
              Kelaniya Clinical Skills Strand · {metadata ? `${metadata.totalQuestions} SBAs` : "Loading..."}
            </span>
          </div>
        </div>

        <nav className="mode-tabs" aria-label="Workspace mode">
          <button
            id="tab-study-mode"
            type="button"
            className={`mode-tab ${mode === "study" ? "active" : ""}`}
            onClick={() => onModeChange("study")}
          >
            <BookOpen size={15} />
            <span>Study Mode</span>
          </button>
          <button
            id="tab-exam-mode"
            type="button"
            className={`mode-tab ${mode === "exam" ? "active" : ""}`}
            onClick={() => onModeChange("exam")}
          >
            <Clock size={15} />
            <span>Timed OSCE Exam</span>
          </button>
          <button
            id="tab-guides-mode"
            type="button"
            className={`mode-tab ${mode === "guides" ? "active" : ""}`}
            onClick={() => onModeChange("guides")}
          >
            <Layers size={15} />
            <span>Guides &amp; Pipeline</span>
          </button>
        </nav>

        <div className="header-actions">
          {metadata && (
            <div className="mastery-pill" title="Overall Study Mode progress saved locally">
              <span>
                {totalAnswered}/{metadata.totalQuestions} solved
              </span>
              {totalAnswered > 0 && <span className="mastery-acc">{accuracy}%</span>}
            </div>
          )}

          {mode === "study" && (
            <button
              type="button"
              className="icon-btn mobile-filter-btn"
              onClick={onToggleMobileFilters}
              aria-label="Toggle question filters"
              title="Filter Questions"
            >
              <SlidersHorizontal size={17} />
            </button>
          )}

          <button
            id="btn-theme-toggle"
            type="button"
            className="icon-btn"
            onClick={onToggleDark}
            aria-label={darkMode ? "Switch to light clinical mode" : "Switch to dark radiology mode"}
            title={darkMode ? "Light Clinical Mode" : "Dark Radiology Mode"}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
};
