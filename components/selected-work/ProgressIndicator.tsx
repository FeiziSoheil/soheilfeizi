'use client';

import React from 'react';
import { useScrollStore } from '@/lib/scrollStore';

interface ProgressIndicatorProps {
  total: number;
  activeIndex: number;
  ariaLabel: string;
  onSelectProject: (index: number) => void;
}

const DOT_COUNT = 24;

/**
 * ProgressIndicator
 * Isolated subscriber to quantized scroll step (0..23) so parent SelectedWork
 * components never re-render per scroll pixel.
 */
export default function ProgressIndicator({
  total,
  activeIndex,
  ariaLabel,
  onSelectProject,
}: ProgressIndicatorProps) {
  const filledIndex = useScrollStore((s) =>
    Math.round(Math.max(0, Math.min(1, s.sectionProgress.work)) * (DOT_COUNT - 1))
  );
  const pct = Math.round((filledIndex / (DOT_COUNT - 1)) * 100);

  return (
    <aside
      aria-label={ariaLabel}
      className="pointer-events-auto absolute end-3.5 sm:end-6 lg:end-8 top-1/2 z-30 -translate-y-1/2 hidden sm:flex flex-col items-center gap-3"
    >
      {/* Continuous fine dotted progress track */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="flex flex-col items-center gap-[5px] py-1"
      >
        {Array.from({ length: DOT_COUNT }).map((_, idx) => {
          const isLead = idx === filledIndex;
          const isFilled = idx <= filledIndex;
          const isSegmentBoundary =
            total > 1 && idx % Math.max(1, Math.floor((DOT_COUNT - 1) / total)) === 0;

          return (
            <span
              key={idx}
              className="block rounded-full transition-[transform,background-color] duration-150"
              style={{
                width: isLead ? '5px' : isSegmentBoundary ? '3px' : '2px',
                height: isLead ? '5px' : isSegmentBoundary ? '3px' : '2px',
                backgroundColor: isLead
                  ? '#5B5BF0'
                  : isFilled
                    ? 'rgba(236, 235, 231, 0.85)'
                    : 'rgba(236, 235, 231, 0.24)',
                boxShadow: isLead ? '0 0 10px rgba(91, 91, 240, 0.85)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Quick clickable project index dots */}
      <div className="hidden sm:flex flex-col items-center gap-1.5 pt-2 border-t border-white/15">
        {Array.from({ length: total }).map((_, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectProject(idx)}
              aria-label={`Project ${String(idx + 1).padStart(2, '0')}`}
              aria-current={isActive ? 'step' : undefined}
              className="group flex h-5 w-5 items-center justify-center rounded-full cursor-pointer"
            >
              <span
                className={`block rounded-full transition-all duration-200 ${
                  isActive
                    ? 'h-2 w-2 bg-[#5B5BF0]'
                    : 'h-1 w-1 bg-white/35 group-hover:bg-white/80'
                }`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
