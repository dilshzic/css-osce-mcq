import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import {
  ActiveExam,
  AppMode,
  BankMetadata,
  ExamConfig,
  FilterState,
  GuideCatalogItem,
  ImageFilterMode,
  SbaQuestion,
  SpecialtyId,
  UserProgress,
} from "./types";
import { HeaderBar } from "./components/HeaderBar";
import { FilterSidebar } from "./components/FilterSidebar";
import { QuestionCard } from "./components/QuestionCard";
import { ImageLightbox } from "./components/ImageLightbox";
import { ExamModeView } from "./components/ExamModeView";
import { GuidesPipelineView } from "./components/GuidesPipelineView";

const STORAGE_KEY = "css_osce_sba_progress_v1";
const THEME_KEY = "css_osce_sba_theme_v1";

const DEFAULT_FILTERS: FilterState = {
  specialty: "all",
  domain: "all",
  batchGroup: "all",
  sourceFilter: "all",
  statusFilter: "all",
  guideId: "all",
  search: "",
};

function loadProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UserProgress;
  } catch {
    // ignore storage errors
  }
  return { answers: {}, bookmarks: [], strikethroughs: {} };
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const App: React.FC = () => {
  const [questions, setQuestions] = useState<SbaQuestion[]>([]);
  const [metadata, setMetadata] = useState<BankMetadata | null>(null);
  const [guides, setGuides] = useState<GuideCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<AppMode>("study");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [progress, setProgress] = useState<UserProgress>(loadProgress);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    src: string;
    caption: string;
    filter: ImageFilterMode;
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try {
      localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/questions.json`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} loading questions`);
        return r.json();
      }),
      fetch(`${base}data/metadata.json`).then((r) => r.json()),
      fetch(`${base}data/guides.json`).then((r) => r.json()),
    ])
      .then(([qs, meta, gs]: [SbaQuestion[], BankMetadata, GuideCatalogItem[]]) => {
        setQuestions(qs);
        setMetadata(meta);
        setGuides(gs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load MCQ dataset");
        setLoading(false);
      });
  }, []);

  const filteredQuestions = useMemo(() => {
    const qLower = filters.search.trim().toLowerCase();
    return questions.filter((q) => {
      if (filters.specialty !== "all" && q.specialty !== filters.specialty) return false;
      if (filters.domain !== "all" && q.domainClean !== filters.domain) return false;
      if (filters.batchGroup !== "all" && q.batchGroup !== filters.batchGroup) return false;
      if (filters.guideId !== "all" && q.guideCitation.guideId !== filters.guideId) return false;

      if (filters.sourceFilter === "visual" && !q.imagePath) return false;
      if (filters.sourceFilter === "text_osce" && (q.imagePath || q.sourceType !== "osce")) {
        return false;
      }
      if (filters.sourceFilter === "guide" && q.sourceType !== "guide") return false;

      if (filters.statusFilter === "unanswered" && progress.answers[q.id]) return false;
      if (
        filters.statusFilter === "incorrect" &&
        (!progress.answers[q.id] || progress.answers[q.id].isCorrect)
      ) {
        return false;
      }
      if (filters.statusFilter === "bookmarked" && !progress.bookmarks.includes(q.id)) {
        return false;
      }

      if (qLower) {
        const hay = `${q.topic} ${q.stem} ${q.options.join(" ")} ${q.domainClean} ${q.batch} ${
          q.sourceStation?.title ?? ""
        }`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [questions, filters, progress]);

  const safeIdx = Math.min(currentIdx, Math.max(0, filteredQuestions.length - 1));
  const currentStudyQ = filteredQuestions[safeIdx];

  const handleFilterChange = (next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentIdx(0);
  };

  const handleSelectStudyAnswer = useCallback(
    (q: SbaQuestion, optIndex: number) => {
      setProgress((prev) => {
        if (prev.answers[q.id]) return prev;
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [q.id]: {
              selectedIndex: optIndex,
              isCorrect: optIndex === q.correctIndex,
              timestamp: Date.now(),
            },
          },
        };
      });
    },
    []
  );

  const handleToggleBookmark = useCallback((qId: string) => {
    setProgress((prev) => {
      const exists = prev.bookmarks.includes(qId);
      return {
        ...prev,
        bookmarks: exists ? prev.bookmarks.filter((x) => x !== qId) : [...prev.bookmarks, qId],
      };
    });
  }, []);

  const handleToggleStudyStrike = useCallback((qId: string, optIndex: number) => {
    setProgress((prev) => {
      const cur = prev.strikethroughs[qId] || [];
      const next = cur.includes(optIndex) ? cur.filter((x) => x !== optIndex) : [...cur, optIndex];
      return {
        ...prev,
        strikethroughs: { ...prev.strikethroughs, [qId]: next },
      };
    });
  }, []);

  // Merge submitted exam results into persistent study progress
  const handleUpdateExam = useCallback(
    (updater: (prev: ActiveExam) => ActiveExam) => {
      setActiveExam((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (!prev.submitted && next.submitted) {
          const qById = new Map(questions.map((q) => [q.id, q]));
          setProgress((oldProg) => {
            const merged = { ...oldProg.answers };
            for (const [qId, sel] of Object.entries(next.selections)) {
              const qObj = qById.get(qId);
              if (qObj) {
                merged[qId] = {
                  selectedIndex: sel,
                  isCorrect: sel === qObj.correctIndex,
                  timestamp: Date.now(),
                };
              }
            }
            return { ...oldProg, answers: merged };
          });
        }
        return next;
      });
    },
    [questions]
  );

  const startExam = (cfg: ExamConfig) => {
    let chosen: SbaQuestion[] = [];
    if (cfg.specialtyMix === "balanced") {
      const perSpec = Math.max(1, Math.floor(cfg.count / 4));
      const specs: SpecialtyId[] = ["med", "surg", "gynobs", "paed"];
      for (const s of specs) {
        let pool = questions.filter((q) => q.specialty === s);
        if (cfg.visualOnly) pool = pool.filter((q) => Boolean(q.imagePath));
        chosen.push(...shuffleArray(pool).slice(0, perSpec));
      }
      if (chosen.length < cfg.count) {
        const used = new Set(chosen.map((c) => c.id));
        let rem = questions.filter((q) => !used.has(q.id));
        if (cfg.visualOnly) rem = rem.filter((q) => Boolean(q.imagePath));
        chosen.push(...shuffleArray(rem).slice(0, cfg.count - chosen.length));
      }
      chosen = shuffleArray(chosen).slice(0, cfg.count);
    } else {
      let pool = cfg.specialtyMix === "filtered" ? filteredQuestions : questions;
      if (cfg.specialtyMix !== "filtered") {
        pool = pool.filter((q) => q.specialty === cfg.specialtyMix);
      }
      if (cfg.visualOnly) pool = pool.filter((q) => Boolean(q.imagePath));
      chosen = shuffleArray(pool).slice(0, cfg.count);
    }

    setActiveExam({
      config: cfg,
      questionIds: chosen.map((q) => q.id),
      selections: {},
      flagged: [],
      strikethroughs: {},
      currentIndex: 0,
      startedAt: Date.now(),
      remainingSeconds: cfg.secondsPerQuestion > 0 ? chosen.length * cfg.secondsPerQuestion : 0,
      submitted: false,
      elapsedSeconds: 0,
    });
    setMode("exam");
  };

  // Keyboard shortcuts for Study Mode
  useEffect(() => {
    if (mode !== "study" || !currentStudyQ || lightboxState) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") {
        setCurrentIdx((i) => Math.min(filteredQuestions.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") {
        setCurrentIdx((i) => Math.max(0, i - 1));
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        handleSelectStudyAnswer(currentStudyQ, Number(e.key) - 1);
      } else if (["a", "b", "c", "d", "e"].includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() === "b" && e.shiftKey) {
          handleToggleBookmark(currentStudyQ.id);
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const mapIdx = "abcde".indexOf(e.key.toLowerCase());
          handleSelectStudyAnswer(currentStudyQ, mapIdx);
        }
      } else if (e.key.toLowerCase() === "z" && currentStudyQ.imagePath) {
        setLightboxState({
          src: `${import.meta.env.BASE_URL}${currentStudyQ.imagePath}`,
          caption: `${currentStudyQ.batch} — Clinical Figure`,
          filter: "normal",
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    mode,
    currentStudyQ,
    lightboxState,
    filteredQuestions.length,
    handleSelectStudyAnswer,
    handleToggleBookmark,
  ]);

  if (loading) {
    return (
      <div className="app-shell">
        <HeaderBar
          mode={mode}
          onModeChange={setMode}
          metadata={null}
          progress={progress}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          onToggleMobileFilters={() => {}}
        />
        <main className="workspace-grid single-col">
          <div className="pipeline-box">Loading Kelaniya CSS OSCE SBA Question Bank...</div>
        </main>
      </div>
    );
  }

  if (loadError || !metadata) {
    return (
      <div className="app-shell">
        <main className="workspace-grid single-col">
          <div className="pipeline-box">Error loading MCQ data: {loadError}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <HeaderBar
        mode={mode}
        onModeChange={setMode}
        metadata={metadata}
        progress={progress}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onToggleMobileFilters={() => setMobileFiltersOpen((o) => !o)}
      />

      <main className={`workspace-grid ${mode !== "study" ? "single-col" : ""}`}>
        {mode === "study" && (
          <FilterSidebar
            metadata={metadata}
            guides={guides}
            filters={filters}
            filteredCount={filteredQuestions.length}
            isOpenMobile={mobileFiltersOpen}
            onChange={handleFilterChange}
            onReset={() => {
              setFilters(DEFAULT_FILTERS);
              setCurrentIdx(0);
            }}
            onLaunchExamFromFiltered={() =>
              startExam({
                title: "Custom Filtered OSCE Circuit",
                count: Math.min(20, filteredQuestions.length),
                secondsPerQuestion: 90,
                specialtyMix: "filtered",
                visualOnly: filters.sourceFilter === "visual",
              })
            }
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />
        )}

        {mode === "study" && (
          <section className="study-main" aria-label="Interactive Study Bench">
            <div className="deck-toolbar">
              <div className="deck-counter">
                <span>
                  Question{" "}
                  <strong>{filteredQuestions.length > 0 ? safeIdx + 1 : 0}</strong> of{" "}
                  <strong>{filteredQuestions.length}</strong>
                </span>
                {currentStudyQ && progress.answers[currentStudyQ.id] && (
                  <span
                    className="mono-badge"
                    style={{
                      color: progress.answers[currentStudyQ.id].isCorrect
                        ? "var(--ok)"
                        : "var(--bad)",
                    }}
                  >
                    {progress.answers[currentStudyQ.id].isCorrect ? "Solved Correctly" : "Missed"}
                  </span>
                )}
              </div>

              <div className="deck-nav-btns">
                {filteredQuestions.some((q) => !progress.answers[q.id]) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const nextUnans = filteredQuestions.findIndex(
                        (q, i) => i > safeIdx && !progress.answers[q.id]
                      );
                      const fallback = filteredQuestions.findIndex((q) => !progress.answers[q.id]);
                      if (nextUnans >= 0) setCurrentIdx(nextUnans);
                      else if (fallback >= 0) setCurrentIdx(fallback);
                    }}
                    title="Jump to next unanswered station in current filter"
                  >
                    Next Unanswered
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  disabled={filteredQuestions.length <= 1}
                  onClick={() => {
                    const rnd = Math.floor(Math.random() * filteredQuestions.length);
                    setCurrentIdx(rnd);
                  }}
                  title="Jump to a random station in current filter"
                >
                  <Shuffle size={14} /> Random
                </button>
                <button
                  id="btn-prev-q"
                  type="button"
                  className="btn"
                  disabled={safeIdx <= 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <button
                  id="btn-next-q"
                  type="button"
                  className="btn primary"
                  disabled={safeIdx >= filteredQuestions.length - 1}
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(filteredQuestions.length - 1, i + 1))
                  }
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {currentStudyQ ? (
              <>
                <QuestionCard
                  key={currentStudyQ.id}
                  question={currentStudyQ}
                  selectedIndex={progress.answers[currentStudyQ.id]?.selectedIndex}
                  lockedReveal={Boolean(progress.answers[currentStudyQ.id])}
                  strikethroughIndices={progress.strikethroughs[currentStudyQ.id] || []}
                  isBookmarked={progress.bookmarks.includes(currentStudyQ.id)}
                  onSelectOption={(optIdx) => handleSelectStudyAnswer(currentStudyQ, optIdx)}
                  onToggleStrike={(optIdx) => handleToggleStudyStrike(currentStudyQ.id, optIdx)}
                  onToggleBookmark={() => handleToggleBookmark(currentStudyQ.id)}
                  onOpenLightbox={(src, caption, filter) =>
                    setLightboxState({ src, caption, filter })
                  }
                />

                <div className="kbd-hint-bar">
                  <span>
                    <kbd>A</kbd>–<kbd>E</kbd> or <kbd>1</kbd>–<kbd>5</kbd> answer
                  </span>
                  <span>
                    <kbd>←</kbd> <kbd>→</kbd> navigate
                  </span>
                  {currentStudyQ.imagePath && (
                    <span>
                      <kbd>Z</kbd> zoom clinical figure
                    </span>
                  )}
                  <span>
                    <kbd>Shift+B</kbd> bookmark
                  </span>
                </div>
              </>
            ) : (
              <div className="pipeline-box">
                <h2 style={{ margin: "0 0 8px" }}>No questions match these filters</h2>
                <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>
                  Try broadening your specialty, sub-domain, or search query.
                </p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setCurrentIdx(0);
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </section>
        )}

        {mode === "exam" && (
          <ExamModeView
            questions={questions}
            filteredQuestions={filteredQuestions}
            metadata={metadata}
            activeExam={activeExam}
            onStartExam={startExam}
            onUpdateExam={handleUpdateExam}
            onExitExam={() => setActiveExam(null)}
            onOpenLightbox={(src, caption, filter) => setLightboxState({ src, caption, filter })}
          />
        )}

        {mode === "guides" && (
          <GuidesPipelineView
            metadata={metadata}
            guides={guides}
            questions={questions}
            progress={progress}
            onPracticeGuide={(guideId, spec) => {
              setFilters({
                ...DEFAULT_FILTERS,
                specialty: spec,
                guideId,
              });
              setCurrentIdx(0);
              setMode("study");
            }}
            onResetProgress={() => {
              setProgress({ answers: {}, bookmarks: [], strikethroughs: {} });
            }}
          />
        )}
      </main>

      {lightboxState && (
        <ImageLightbox
          src={lightboxState.src}
          caption={lightboxState.caption}
          filterMode={lightboxState.filter}
          onFilterModeChange={(f) =>
            setLightboxState((prev) => (prev ? { ...prev, filter: f } : null))
          }
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};

export default App;
