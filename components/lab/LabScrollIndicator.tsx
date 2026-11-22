'use client';

import React, { useRef } from 'react';
import { useLabStore } from '@/lib/lab/labStore';

const DOT_COUNT = 22;

/**
 * Custom 120px Particle Scrollbar (Section 12.4):
 * - Replaces standard scrollbar visually at inline-end edge
 * - Particles below current scroll point glow brighter & vibrate with velocity
 * - Supports click and drag scrubbing via ScrollEngine
 */
export default function LabScrollIndicator({
  onScrubProgress,
}: {
  onScrubProgress: (normP: number) => void;
}) {
  const scroll = useLabStore((s) => s.scroll);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const scrubFromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const norm = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    onScrubProgress(norm);
  };

  const p = scroll.pChrome;
  const vib = scroll.speedNorm;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      onPointerDown={(e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        scrubFromClientY(e.clientY);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        scrubFromClientY(e.clientY);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      className="fixed end-4 sm:end-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex h-[120px] w-7 flex-col items-center justify-between py-1 cursor-ns-resize select-none mix-blend-difference text-white"
    >
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const dotNorm = i / (DOT_COUNT - 1);
        // Spec: particles below current position are brighter and vibrate with velocity
        const isBelow = dotNorm >= p;
        const dist = Math.abs(dotNorm - p);
        const isHead = dist < 0.06;
        const jitterX =
          vib > 0.02
            ? Math.sin(i * 1.9 + scroll.pos * 0.09) * vib * (isBelow ? 4.5 : 1.5)
            : 0;

        return (
          <span
            key={i}
            className="block rounded-full bg-white will-change-transform"
            style={{
              width: isHead ? 5 : isBelow ? 3 : 2,
              height: isHead ? 5 : isBelow ? 3 : 2,
              opacity: isHead ? 1 : isBelow ? 0.85 : 0.25,
              transform: `translate3d(${jitterX.toFixed(1)}px, 0, 0)`,
            }}
          />
        );
      })}
    </div>
  );
}
