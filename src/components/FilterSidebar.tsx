import React from "react";
import { Play, X } from "lucide-react";
import { BankMetadata, FilterState, GuideCatalogItem, SpecialtyId } from "../types";

interface FilterSidebarProps {
  metadata: BankMetadata;
  guides: GuideCatalogItem[];
  filters: FilterState;
  filteredCount: number;
  isOpenMobile: boolean;
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
  onLaunchExamFromFiltered: () => void;
  onCloseMobile: () => void;
}

const SPEC_COLORS: Record<SpecialtyId, { color: string; soft: string }> = {
  med: { color: "var(--med-color)", soft: "var(--med-soft)" },
  surg: { color: "var(--surg-color)", soft: "var(--surg-soft)" },
  gynobs: { color: "var(--gynobs-color)", soft: "var(--gynobs-soft)" },
  paed: { color: "var(--paed-color)", soft: "var(--paed-soft)" },
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  metadata,
  guides,
  filters,
  filteredCount,
  isOpenMobile,
  onChange,
  onReset,
  onLaunchExamFromFiltered,
  onCloseMobile,
}) => {
  const isAllSelected = filters.specialties.length === 0 || filters.specialties.length === 4;

  const toggleSpecialty = (id: SpecialtyId) => {
    const active = isAllSelected ? [] : [...filters.specialties];
    const next = active.includes(id)
      ? active.filter((x) => x !== id)
      : [...active, id];
    // If all 4 checked individually or none left unchecked, treat empty as All
    if (next.length === 4 || next.length === 0) {
      onChange({ specialties: [], guideId: "all" });
    } else {
      onChange({ specialties: next, guideId: "all" });
    }
  };

  const activeGuide =
    filters.guideId !== "all" ? guides.find((g) => g.id === filters.guideId) : null;

  return (
    <aside className={`sidebar-panel ${isOpenMobile ? "open" : ""}`} aria-label="Question filters">
      <div className="sidebar-head">
        <span>Filters ({filteredCount})</span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" className="text-link-btn" onClick={onReset}>
            Reset
          </button>
          {isOpenMobile && (
            <button
              type="button"
              className="text-link-btn"
              onClick={onCloseMobile}
              aria-label="Close filters"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Choose Specialties</span>
        <div className="spec-pills">
          <button
            type="button"
            className={`spec-pill-btn ${isAllSelected ? "active" : ""}`}
            onClick={() => onChange({ specialties: [], guideId: "all" })}
          >
            <span>All 4 Specialties</span>
            <span className="spec-count">{metadata.totalQuestions}</span>
          </button>

          {metadata.specialties.map((sp) => {
            const theme = SPEC_COLORS[sp.id];
            const checked = !isAllSelected && filters.specialties.includes(sp.id);
            return (
              <label
                key={sp.id}
                className={`spec-pill-btn spec-check-row ${checked ? "active" : ""}`}
                style={
                  {
                    "--pill-color": theme.color,
                    "--pill-soft": theme.soft,
                  } as React.CSSProperties
                }
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSpecialty(sp.id)}
                    aria-label={`Include ${sp.shortName}`}
                  />
                  <span className="spec-dot" style={{ background: theme.color, marginRight: 2 }} />
                  <span>{sp.shortName}</span>
                </span>
                <span className="spec-count">{sp.count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {activeGuide && (
        <div className="active-guide-chip">
          <span style={{ fontSize: 12, lineHeight: 1.35 }}>
            Guide filter: <strong>{activeGuide.title}</strong>
          </span>
          <button
            type="button"
            className="text-link-btn"
            onClick={() => onChange({ guideId: "all" })}
          >
            Clear
          </button>
        </div>
      )}

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-source">
          Station Format
        </label>
        <select
          id="filter-source"
          className="filter-select"
          value={filters.sourceFilter}
          onChange={(e) => onChange({ sourceFilter: e.target.value as FilterState["sourceFilter"] })}
        >
          <option value="all">All Questions ({metadata.totalQuestions})</option>
          <option value="visual">With Clinical Figure ({metadata.visualImageQuestions})</option>
          <option value="text">
            Text Vignettes Only ({metadata.totalQuestions - metadata.visualImageQuestions})
          </option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-status">
          Study Status
        </label>
        <select
          id="filter-status"
          className="filter-select"
          value={filters.statusFilter}
          onChange={(e) => onChange({ statusFilter: e.target.value as FilterState["statusFilter"] })}
        >
          <option value="all">All Questions</option>
          <option value="unanswered">Unanswered Only</option>
          <option value="incorrect">Missed / Incorrect</option>
          <option value="bookmarked">Saved</option>
        </select>
      </div>

      <button
        type="button"
        className="sidebar-cta-btn"
        disabled={filteredCount === 0}
        onClick={onLaunchExamFromFiltered}
      >
        <Play size={14} />
        Timed OSCE From Selection ({Math.min(filteredCount, 20)})
      </button>
    </aside>
  );
};
