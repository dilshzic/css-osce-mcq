import React, { useEffect, useState } from "react";
import { Contrast, RotateCcw, SunMoon, X, ZoomIn, ZoomOut } from "lucide-react";
import { ImageFilterMode } from "../types";

interface ImageLightboxProps {
  src: string;
  caption: string;
  filterMode: ImageFilterMode;
  onFilterModeChange: (m: ImageFilterMode) => void;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  src,
  caption,
  filterMode,
  onFilterModeChange,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPt, setStartPt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(3.5, +(s + 0.35).toFixed(2)));
      if (e.key === "-") setScale((s) => Math.max(1, +(s - 0.35).toFixed(2)));
      if (e.key === "0") {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(3.5, Math.max(1, +(prev + delta).toFixed(2)));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    onFilterModeChange("normal");
  };

  const filterClass =
    filterMode === "contrast"
      ? "filter-contrast"
      : filterMode === "invert"
        ? "filter-invert"
        : "";

  return (
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Clinical image inspector"
      onClick={onClose}
    >
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 600, fontSize: 13.5, maxWidth: "46vw" }}>{caption}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="mini-ctrl-btn"
            style={{ background: "#1e293b", color: "#f8fafc", borderColor: "#334155" }}
            onClick={() => setScale((s) => Math.max(1, +(s - 0.35).toFixed(2)))}
          >
            <ZoomOut size={14} />
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, minWidth: 46, textAlign: "center" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="mini-ctrl-btn"
            style={{ background: "#1e293b", color: "#f8fafc", borderColor: "#334155" }}
            onClick={() => setScale((s) => Math.min(3.5, +(s + 0.35).toFixed(2)))}
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            className={`mini-ctrl-btn ${filterMode === "contrast" ? "active" : ""}`}
            style={
              filterMode !== "contrast"
                ? { background: "#1e293b", color: "#f8fafc", borderColor: "#334155" }
                : undefined
            }
            onClick={() => onFilterModeChange(filterMode === "contrast" ? "normal" : "contrast")}
          >
            <Contrast size={13} /> High Contrast
          </button>
          <button
            type="button"
            className={`mini-ctrl-btn ${filterMode === "invert" ? "active" : ""}`}
            style={
              filterMode !== "invert"
                ? { background: "#1e293b", color: "#f8fafc", borderColor: "#334155" }
                : undefined
            }
            onClick={() => onFilterModeChange(filterMode === "invert" ? "normal" : "invert")}
          >
            <SunMoon size={13} /> Invert X-Ray
          </button>
          <button
            type="button"
            className="mini-ctrl-btn"
            style={{ background: "#1e293b", color: "#f8fafc", borderColor: "#334155" }}
            onClick={resetView}
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="button"
            className="mini-ctrl-btn"
            style={{ background: "#334155", color: "#ffffff", borderColor: "#475569" }}
            onClick={onClose}
            aria-label="Close image viewer"
          >
            <X size={15} /> Close (Esc)
          </button>
        </div>
      </div>

      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          if (scale <= 1) return;
          setDragging(true);
          setStartPt({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          setOffset({ x: e.clientX - startPt.x, y: e.clientY - startPt.y });
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={src}
          alt={caption}
          className={filterClass}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.12s ease, filter 0.15s ease",
            filter:
              filterMode === "contrast"
                ? "contrast(1.3) brightness(1.04)"
                : filterMode === "invert"
                  ? "invert(1) contrast(1.15)"
                  : undefined,
          }}
        />
      </div>
    </div>
  );
};
