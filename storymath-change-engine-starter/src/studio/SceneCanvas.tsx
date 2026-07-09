/**
 * The editable ProjectSpace canvas. The room fills a fixed 4:3 frame; recruited
 * stickers are placed on top and can be moved (drag the body), resized (drag the
 * corner handle), and removed (× button) — going beyond the reference game's
 * immutable placement. Coordinates are percentages of the canvas, anchored at the
 * sticker's centre, so a saved project renders identically at any size.
 */

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { TEAM_BY_ID } from "./assets";
import type { Placement } from "./types";

const MIN_WIDTH_PCT = 5;
const MAX_WIDTH_PCT = 55;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Drag {
  mode: "move" | "resize";
  key: string;
  pointerId: number;
  // move: pointer→center offset in pct; resize: canvas centre in px
  offXPct?: number;
  offYPct?: number;
  cxPx?: number;
  cyPx?: number;
}

export function SceneCanvas({
  roomUrl,
  placements,
  selectedKey,
  onSelect,
  onChange,
}: {
  roomUrl: string;
  placements: Placement[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onChange: (placements: Placement[]) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const rect = () => canvasRef.current!.getBoundingClientRect();
  const toPct = (clientX: number, clientY: number) => {
    const r = rect();
    return {
      xPct: clamp(((clientX - r.left) / r.width) * 100, 0, 100),
      yPct: clamp(((clientY - r.top) / r.height) * 100, 0, 100),
    };
  };
  const patch = (key: string, next: Partial<Placement>) =>
    onChange(placements.map((p) => (p.key === key ? { ...p, ...next } : p)));

  const startMove = (e: ReactPointerEvent, p: Placement) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    onSelect(p.key);
    const { xPct, yPct } = toPct(e.clientX, e.clientY);
    drag.current = { mode: "move", key: p.key, pointerId: e.pointerId, offXPct: xPct - p.xPct, offYPct: yPct - p.yPct };
  };

  const startResize = (e: ReactPointerEvent, p: Placement) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    onSelect(p.key);
    const r = rect();
    drag.current = {
      mode: "resize",
      key: p.key,
      pointerId: e.pointerId,
      cxPx: r.left + (p.xPct / 100) * r.width,
      cyPx: r.top + (p.yPct / 100) * r.height,
    };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.mode === "move") {
      const { xPct, yPct } = toPct(e.clientX, e.clientY);
      patch(d.key, { xPct: clamp(xPct - (d.offXPct ?? 0), 0, 100), yPct: clamp(yPct - (d.offYPct ?? 0), 0, 100) });
    } else {
      // Width follows the pointer's horizontal distance from the sticker centre.
      const halfWidthPx = Math.abs(e.clientX - (d.cxPx ?? 0));
      const widthPct = clamp(((halfWidthPx * 2) / rect().width) * 100, MIN_WIDTH_PCT, MAX_WIDTH_PCT);
      patch(d.key, { widthPct });
    }
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (drag.current && e.pointerId === drag.current.pointerId) drag.current = null;
  };

  const remove = (key: string) => {
    onChange(placements.filter((p) => p.key !== key));
    if (selectedKey === key) onSelect(null);
  };

  return (
    <div
      ref={canvasRef}
      className="scene-canvas"
      style={{ backgroundImage: `url(${roomUrl})` }}
      onPointerDown={() => onSelect(null)}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {placements.map((p) => {
        const asset = TEAM_BY_ID.get(p.stickerId);
        if (!asset) return null;
        const selected = p.key === selectedKey;
        return (
          <div
            key={p.key}
            className={`scene-item${selected ? " scene-item--selected" : ""}`}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, width: `${p.widthPct}%` }}
            onPointerDown={(e) => startMove(e, p)}
          >
            <img src={asset.url} alt={asset.name} draggable={false} />
            {selected && (
              <>
                <button
                  type="button"
                  className="scene-del"
                  aria-label={`Remove ${asset.name}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => remove(p.key)}
                >
                  ×
                </button>
                <span
                  className="scene-handle"
                  role="slider"
                  aria-label={`Resize ${asset.name}`}
                  aria-valuenow={Math.round(p.widthPct)}
                  onPointerDown={(e) => startResize(e, p)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
