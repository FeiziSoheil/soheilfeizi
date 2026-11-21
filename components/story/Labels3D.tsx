'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Locale } from '@/lib/content';
import type { StoryLabel3DConfig } from './story.config';

export interface ProjectedLabelState {
  id: string;
  anchorX: number;
  anchorY: number;
  pillX: number;
  pillY: number;
  opacity: number;
}

export interface Labels3DHandle {
  updateProjections: (items: ProjectedLabelState[]) => void;
}

interface Labels3DProps {
  labels: StoryLabel3DConfig[];
  locale: Locale;
}

/**
 * Projects 3D world callouts onto the 2D overlay with crisp leader lines and
 * translucent bordered pills. Updated imperatively from the WebGL RAF loop so
 * React never re-renders per frame.
 */
const Labels3D = forwardRef<Labels3DHandle, Labels3DProps>(function Labels3D(
  { labels, locale },
  ref
) {
  const pillRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lineRefs = useRef<Record<string, SVGLineElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});

  useImperativeHandle(
    ref,
    () => ({
      updateProjections(items: ProjectedLabelState[]) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const pill = pillRefs.current[item.id];
          const line = lineRefs.current[item.id];
          const dot = dotRefs.current[item.id];

          const vis = item.opacity > 0.01;
          const opStr = item.opacity.toFixed(3);

          if (pill) {
            pill.style.opacity = opStr;
            pill.style.transform = `translate3d(${item.pillX.toFixed(1)}px, ${item.pillY.toFixed(1)}px, 0) translate(-50%, -50%)`;
            pill.style.visibility = vis ? 'visible' : 'hidden';
          }
          if (line) {
            line.setAttribute('x1', item.anchorX.toFixed(1));
            line.setAttribute('y1', item.anchorY.toFixed(1));
            line.setAttribute('x2', item.pillX.toFixed(1));
            line.setAttribute('y2', item.pillY.toFixed(1));
            line.style.opacity = opStr;
          }
          if (dot) {
            dot.setAttribute('cx', item.anchorX.toFixed(1));
            dot.setAttribute('cy', item.anchorY.toFixed(1));
            dot.style.opacity = opStr;
          }
        }
      },
    }),
    []
  );

  if (!labels.length) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 hidden md:block overflow-hidden"
    >
      {/* Crisp vector leader lines & 4px anchor dots */}
      <svg className="absolute inset-0 h-full w-full">
        {labels.map((lbl) => (
          <g key={lbl.id}>
            <line
              ref={(el) => {
                lineRefs.current[lbl.id] = el;
              }}
              x1={0}
              y1={0}
              x2={0}
              y2={0}
              stroke={lbl.accent ? 'rgba(91, 91, 240, 0.72)' : 'rgba(236, 235, 231, 0.28)'}
              strokeWidth={1}
              strokeDasharray={lbl.accent ? undefined : '2 3'}
              style={{ opacity: 0 }}
            />
            <circle
              ref={(el) => {
                dotRefs.current[lbl.id] = el;
              }}
              cx={0}
              cy={0}
              r={lbl.accent ? 3.2 : 2.2}
              fill={lbl.accent ? '#5B5BF0' : '#ECEBE7'}
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {/* Bordered translucent pills (zero backdrop-blur over WebGL) */}
      {labels.map((lbl) => (
        <div
          key={lbl.id}
          ref={(el) => {
            pillRefs.current[lbl.id] = el;
          }}
          style={{ opacity: 0, visibility: 'hidden' }}
          className={`absolute top-0 left-0 will-change-transform rounded-[var(--radius-md)] border px-3.5 py-2 whitespace-nowrap ${
            lbl.accent
              ? 'border-[#5B5BF0]/75 bg-[#0D0D16]/92 text-[#ECEBE7]'
              : 'border-[#ECEBE7]/22 bg-[#0B0B0E]/88 text-[#ECEBE7]/90'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                lbl.accent ? 'bg-[#5B5BF0]' : 'bg-[#ECEBE7]/65'
              }`}
            />
            <span className="font-mono text-[11px] font-medium tracking-wide">
              {lbl.text[locale]}
            </span>
          </div>
          {lbl.subtext && (
            <span className="mt-0.5 block ps-3.5 text-[10px] font-mono text-[#ECEBE7]/55">
              {lbl.subtext[locale]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

export default Labels3D;
