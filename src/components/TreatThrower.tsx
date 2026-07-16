"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { TREATS, TREAT_ORDER, type TreatType } from "@/lib/treats";

/** Satellite offsets for the 3 alternative treats, fanned above the main button. */
const SATELLITE_POS = [
  { x: -76, y: -18 },
  { x: 0, y: -92 },
  { x: 76, y: -18 },
];

/**
 * The throw-a-treat capture gesture, shared by Meet! and Add My Pet.
 * Drag onto `zoneRef` to fire `onThrow`. Hold (without dragging) to reveal
 * the 3 other treat flavors and pick a new one — purely cosmetic, per the
 * user's decision: the thrown treat never determines species, only the
 * on-device image analysis (or the user's own entry for My Pets) does.
 */
export default function TreatThrower({
  zoneRef,
  onThrow,
}: {
  zoneRef: React.RefObject<HTMLElement | null>;
  onThrow: () => void;
}) {
  const selectedTreat = useAppStore((s) => s.selectedTreat);
  const setSelectedTreat = useAppStore((s) => s.setSelectedTreat);

  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const others = TREAT_ORDER.filter((t) => t !== selectedTreat);

  function clearLongPress() {
    if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; }
  }

  function onDown(e: React.PointerEvent) {
    if (pickerOpen) return;
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setDrag({ dx: 0, dy: 0 });
    longPress.current = setTimeout(() => {
      if (!moved.current) {
        setPickerOpen(true);
        setDrag(null);
        dragOrigin.current = null;
      }
    }, 420);
  }

  function onMove(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    if (!moved.current && Math.hypot(dx, dy) > 10) {
      moved.current = true;
      clearLongPress();
    }
    setDrag({ dx, dy });
  }

  function onUp(e: React.PointerEvent) {
    clearLongPress();
    if (pickerOpen || !dragOrigin.current) { dragOrigin.current = null; setDrag(null); return; }
    const zone = zoneRef.current?.getBoundingClientRect();
    const hit = zone && e.clientX >= zone.left && e.clientX <= zone.right &&
      e.clientY >= zone.top && e.clientY <= zone.bottom;
    dragOrigin.current = null;
    setDrag(null);
    if (hit) onThrow();
  }

  function pickTreat(t: TreatType) {
    setSelectedTreat(t);
    setPickerOpen(false);
  }

  return (
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
          {others.map((t, i) => (
            // Positioning transform lives on this wrapper; the entrance
            // animation lives on the button inside — animate-pop-in's own
            // `transform: scale(...)` keyframe would otherwise clobber a
            // positioning transform set on the same element.
            <div
              key={t}
              className="absolute left-1/2 top-1/2 z-50"
              style={{ transform: `translate(-50%, -50%) translate(${SATELLITE_POS[i].x}px, ${SATELLITE_POS[i].y}px)` }}
            >
              <button
                type="button"
                aria-label={`Use ${TREATS[t].label}`}
                onClick={() => pickTreat(t)}
                className="animate-pop-in flex h-14 w-14 items-center justify-center rounded-full border-4 border-sunny bg-tangerine text-2xl shadow-xl"
              >
                {TREATS[t].emoji}
              </button>
            </div>
          ))}
        </>
      )}

      <button
        type="button"
        aria-label={`Treat (${TREATS[selectedTreat].label}) — hold to change, drag onto the camera to capture`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className={`relative z-50 flex h-20 w-20 touch-none items-center justify-center rounded-full border-8 border-sunny bg-tangerine text-4xl shadow-xl ${drag ? "" : "transition-transform"}`}
        style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.2)` } : undefined}
      >
        {TREATS[selectedTreat].emoji}
      </button>
    </div>
  );
}
