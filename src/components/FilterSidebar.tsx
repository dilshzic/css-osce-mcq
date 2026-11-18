import React from "react";
import { Play, Search, X } from "lucide-react";
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
  const activeSpecMeta = metadata.specialties.find((s) => s.id === filters.specialty);
  const availableDomains = React.useMemo(() => {
    if (activeSpecMeta) return activeSpecMeta.domains;
    const map = new Map<string, number>();
    for (const sp of metadata.specialties) {
      for (const d of sp.domains) {
        map.set(d.name, (map.get(d.name) ?? 0) + d.count);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeSpecMeta, metadata.specialties]);

  const availableGuides = guides.filter(
    (g) => g.questionCount > 0 && (filters.specialty === "all" || g.specialty === filters.specialty)
  );

  return (
    <aside className={`sidebar-panel ${isOpenMobile ? "open" : ""}`} aria-label="Question filters">
      <div className="sidebar-head">
        <span>Filter Bank ({filteredCount})</span>
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

      <div className="search-box">
        <Search size={15} />
        <input
          id="filter-search"
          type="search"
          className="search-input"
          placeholder="Search diagnosis, drug, sign..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Specialty</span>
        <div className="spec-pills">
          <button
            type="button"
            className={`spec-pill-btn ${filters.specialty === "all" ? "active" : ""}`}
            onClick={() => onChange({ specialty: "all", domain: "all", guideId: "all" })}
          >
            <span>All Specialties</span>
            <span className="spec-count">{metadata.totalQuestions}</span>
          </button>
          {metadata.specialties.map((sp) => {
            const theme = SPEC_COLORS[sp.id];
            return (
              <button
                key={sp.id}
                type="button"
                className={`spec-pill-btn ${filters.specialty === sp.id ? "active" : ""}`}
                style={
                  {
                    "--pill-color": theme.color,
                    "--pill-soft": theme.soft,
                  } as React.CSSProperties
                }
                onClick={() => onChange({ specialty: sp.id, domain: "all", guideId: "all" })}
              >
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <span className="spec-dot" style={{ background: theme.color }} />
                  {sp.shortName}
                </span>
                <span className="spec-count">{sp.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-domain">
          Clinical Sub-Domain
        </label>
        <select
          id="filter-domain"
          className="filter-select"
          value={filters.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
        >
          <option value="all">All Sub-Domains ({availableDomains.length})</option>
          {availableDomains.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.count})
            </option>
          ))}
        </select>
      </div>

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
          <option value="all">All Sources ({metadata.totalQuestions})</option>
          <option value="visual">Visual / Clinical Image OSCEs ({metadata.visualImageQuestions})</option>
          <option value="text_osce">Text &amp; Scenario OSCEs ({metadata.osceStationQuestions - metadata.visualImageQuestions})</option>
          <option value="guide">CSS Guide Protocol SBAs ({metadata.guideProtocolQuestions})</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-batch">
          OSCE Batch / Source
        </label>
        <select
          id="filter-batch"
          className="filter-select"
          value={filters.batchGroup}
          onChange={(e) => onChange({ batchGroup: e.target.value })}
        >
          <option value="all">All Batches (20–33) &amp; Guides</option>
          {metadata.batchGroups.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} ({b.count})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-guide">
          CSS Guide Reference
        </label>
        <select
          id="filter-guide"
          className="filter-select"
          value={filters.guideId}
          onChange={(e) => onChange({ guideId: e.target.value })}
        >
          <option value="all">All CSS Guides ({availableGuides.length})</option>
          {availableGuides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title} ({g.questionCount})
            </option>
          ))}
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
          <option value="bookmarked">Bookmarked</option>
        </select>
      </div>

      <button
        type="button"
        className="sidebar-cta-btn"
        disabled={filteredCount === 0}
        onClick={onLaunchExamFromFiltered}
      >
        <Play size={14} />
        Timed OSCE From Filter ({Math.min(filteredCount, 20)})
      </button>
    </aside>
  );
};
