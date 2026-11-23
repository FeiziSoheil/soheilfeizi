'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { ParticleSlot } from '@/components/ParticleSlot';
import { soundEngine } from '@/lib/soundEngine';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

const AI_RAG_NODES = [
  { label: 'LLM TOKENS', x: '50%', y: '10%' },
  { label: 'QDRANT (VECTOR)', x: '84%', y: '29%' },
  { label: 'CLIP (VISION)', x: '84%', y: '71%' },
  { label: 'LANGGRAPH', x: '50%', y: '90%' },
  { label: 'RAG CHUNKS', x: '16%', y: '71%' },
  { label: 'WHISPER (VOICE)', x: '16%', y: '29%' },
];

function getWhatIDoTabMotion(idx: number, scaled: number, count: number) {
  const isFirst = idx === 0;
  const isLast = idx === count - 1;

  // Transition window centered around step boundary (idx + 1)
  // Transition window is 0.36 total (runs from boundary - 0.18 to boundary + 0.18)
  // Exactly synchronized with the 3D WebGL particle morph trigger
  const halfWindow = 0.18;
  const exitStart = idx + 1 - halfWindow; // e.g. 0.82 for idx=0
  const exitEnd = idx + 1 + halfWindow;   // e.g. 1.18 for idx=0
  const enterStart = idx - halfWindow;    // e.g. 0.82 for idx=1
  const enterEnd = idx + halfWindow;      // e.g. 1.18 for idx=1

  if (scaled < enterStart) {
    if (isFirst) {
      return { y: 0, opacity: 1, pointerEvents: 'auto' as const, visible: true };
    }
    return { y: 44, opacity: 0, pointerEvents: 'none' as const, visible: false };
  }

  if (scaled < enterEnd) {
    if (isFirst) {
      return { y: 0, opacity: 1, pointerEvents: 'auto' as const, visible: true };
    }
    const t = (scaled - enterStart) / (halfWindow * 2);
    const ease = t * t * (3 - 2 * t);
    return {
      y: (1 - ease) * 44,
      opacity: ease,
      pointerEvents: (ease > 0.5 ? 'auto' : 'none') as 'auto' | 'none',
      visible: ease > 0.005,
    };
  }

  if (scaled <= exitStart) {
    return { y: 0, opacity: 1, pointerEvents: 'auto' as const, visible: true };
  }

  if (scaled < exitEnd) {
    if (isLast) {
      return { y: 0, opacity: 1, pointerEvents: 'auto' as const, visible: true };
    }
    const t = (scaled - exitStart) / (halfWindow * 2);
    const ease = t * t * (3 - 2 * t);
    return {
      y: -ease * 44,
      opacity: 1 - ease,
      pointerEvents: (ease < 0.5 ? 'auto' : 'none') as 'auto' | 'none',
      visible: 1 - ease > 0.005,
    };
  }

  // scaled >= exitEnd
  if (isLast) {
    return { y: 0, opacity: 1, pointerEvents: 'auto' as const, visible: true };
  }
  return { y: -44, opacity: 0, pointerEvents: 'none' as const, visible: false };
}

/* ─────────────────────────────────────────────────────────────
 * 02 WHAT I DO (steps = 6 -> 600svh sticky)
 * - Sticky L0 SVG->particle diagram morphing across all 6 disciplines
 * - Smooth vertical ticker transitions on scroll (current text moves up, next rises in)
 * - 6 bottom progress bars filled by p, clickable to scrollTo exact step
 * - Integrations tab draws rays center->outer progressively
 * ───────────────────────────────────────────────────────────── */
export function WhatIDoSection({
  locale,
  onJumpToStep,
  onNextSection,
}: {
  locale: Locale;
  onJumpToStep: (stepIdx: number) => void;
  onNextSection: () => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.whatido);

  const count = t.whatido.tabs.length;
  const scaled = p * count;
  // Shift by 0.18 so active tab and particles switch in perfect lockstep at scaled = idx - 0.18
  const activeIdx = Math.min(count - 1, Math.max(0, Math.floor(scaled + 0.18)));
  const baseStep = Math.min(count - 1, Math.max(0, Math.floor(scaled)));
  const localP = Math.max(0, Math.min(1, scaled - baseStep));
  const activeTab = t.whatido.tabs[activeIdx];

  return (
    <section
      id="whatido"
      data-section="whatido"
      data-theme="light"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('whatido') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('whatido', '720svh', '420svh')}
    >
      <div
        className="pin-sticky flex flex-col justify-between px-4 sm:px-10 lg:px-16 pt-14 pb-20 sm:pb-36"
        style={{ contain: 'layout style' }}
      >
        {/* Top Kicker & Heading */}
        <div className="flex w-full shrink-0 items-end justify-between gap-4 border-b border-[var(--hairline)] pb-2 sm:pb-3">
          <div>
            <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
              {t.whatido.kicker}
            </span>
            <h2 className="mt-0.5 sm:mt-1 text-base sm:text-3xl font-extrabold tracking-tight leading-tight">
              {t.whatido.heading}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              onNextSection();
            }}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] px-3.5 py-1.5 font-mono text-xs opacity-75 hover:border-[#5B5BF0] hover:text-[#5B5BF0] hover:opacity-100 transition-colors cursor-pointer"
          >
            <span>{t.whatido.nextSectionBtn}</span>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Center Split: Left Info with vertical ticker scroll transition | Right Sticky Particle Diagram */}
        <div className="flex w-full flex-1 min-h-0 flex-col lg:grid lg:grid-cols-12 lg:items-center gap-2 sm:gap-6 py-1.5 sm:py-4">
          <div className="shrink-0 lg:col-span-5 flex min-h-0 sm:min-h-[280px] lg:min-h-[320px] flex-col justify-center">
            <div className="relative grid grid-cols-1 grid-rows-1 w-full overflow-hidden py-1">
              {t.whatido.tabs.map((tab, idx) => {
                const motion = getWhatIDoTabMotion(idx, scaled, count);
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={tab.id}
                    className="col-start-1 row-start-1 flex flex-col justify-center will-change-[transform,opacity]"
                    style={{
                      transform: `translate3d(0, ${motion.y.toFixed(2)}px, 0)`,
                      opacity: motion.opacity.toFixed(3),
                      pointerEvents: motion.pointerEvents,
                      visibility: motion.visible ? 'visible' : 'hidden',
                    }}
                    aria-hidden={!isActive}
                  >
                    <span className="font-mono text-[11px] sm:text-xs text-[#5B5BF0]">
                      0{idx + 1} / 0{count}
                    </span>

                    <div className="mt-1 sm:mt-3">
                      <h3 className="display-xl text-xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                        {tab.title}
                      </h3>
                    </div>

                    <p className="mt-1.5 sm:mt-5 text-xs sm:text-lg font-light leading-snug sm:leading-relaxed opacity-85 line-clamp-2 sm:line-clamp-none">
                      {tab.desc}
                    </p>

                    <div className="mt-2 sm:mt-6 border-t border-[var(--hairline)] pt-2 sm:pt-4 font-mono text-[10px] sm:text-xs text-[#5B5BF0] truncate">
                      {tab.metrics}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Diagram Slot rendered on L0 */}
          <div className="flex flex-1 min-h-[200px] xs:min-h-[240px] lg:col-span-7 lg:h-full items-center justify-center py-1">
            <div className="relative h-full w-full max-w-[360px] xs:max-w-[400px] max-h-[44svh] sm:max-w-none sm:h-[400px] lg:h-[520px] sm:max-h-[55svh] mx-auto">
              <ParticleSlot
                slotId="whatido-diagram"
                descriptor={`svg:${activeTab.id}`}
                aria-label={activeTab.title}
                className="h-full w-full"
              />

              {/* Crisp radial node captions specifically for Multimodal AI & RAG */}
              {activeTab.id === 'integrations' && (
                <div className="pointer-events-none absolute inset-0">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] sm:text-[10px] font-bold text-[#5B5BF0] tracking-wider whitespace-nowrap">
                    AI · RAG CORE
                  </span>
                  {AI_RAG_NODES.map((node, nIdx) => {
                    const visible = localP > 0.15 + nIdx * 0.1;
                    return (
                      <span
                        key={node.label}
                        className="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] sm:text-[10px] font-medium transition-opacity duration-300 whitespace-nowrap"
                        style={{
                          left: node.x,
                          top: node.y,
                          opacity: visible ? 0.9 : 0.2,
                        }}
                      >
                        {node.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6 Bottom Progress Bars (clickable to scrollTo exact step, clears DockBar) */}
        <div className="relative z-20 grid w-full shrink-0 grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-3 pt-1 sm:pt-2">
          {t.whatido.tabs.map((tab, idx) => {
            const fill =
              idx < baseStep ? 100 : idx === baseStep ? localP * 100 : 0;
            const isActive = idx === activeIdx;
            return (
              <button
                key={tab.id}
                type="button"
                data-cursor="view"
                onClick={() => {
                  soundEngine.playStippleTick();
                  onJumpToStep(idx);
                }}
                className="group flex min-h-[36px] flex-col items-start justify-center gap-1.5 sm:gap-2 rounded-[var(--radius-sm)] p-1 text-start cursor-pointer min-w-0"
              >
                <div className="h-[3px] w-full rounded-full bg-[var(--hairline)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5B5BF0]"
                    style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                  />
                </div>
                <span
                  className={`w-full truncate font-mono text-[10px] sm:text-[11px] transition-opacity ${
                    isActive
                      ? 'text-[#5B5BF0] font-semibold opacity-100'
                      : 'opacity-50 group-hover:opacity-90'
                  }`}
                >
                  0{idx + 1} · {tab.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 03 PROCESS (Dark, steps = 6 -> 600svh sticky)
 * - Smooth dark theme transition driven by ScrollTrigger
 * - 6 stages in a horizontal row (Discover -> Support), active scales up
 * - Center L0 ParticleSlot morphing through 6 distinct geometric shapes
 * ───────────────────────────────────────────────────────────── */
export function ProcessSection({
  locale,
  onJumpToStage,
}: {
  locale: Locale;
  onJumpToStage: (stageIdx: number) => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.process);

  const count = t.process.stages.length;
  const activeIdx = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
  const activeStage = t.process.stages[activeIdx];

  return (
    <section
      id="process"
      data-section="process"
      data-theme="dark"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('process') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('process', '660svh', '390svh')}
    >
      <div className="pin-sticky flex flex-col justify-between px-4 sm:px-10 lg:px-16 pt-14 sm:pt-16 pb-20 sm:pb-36">
        {/* Header */}
        <div className="w-full">
          <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
            {t.process.kicker}
          </span>
          <h2 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-extrabold tracking-tight">
            {t.process.heading}
          </h2>
        </div>

        {/* Center L0 Particle Stage Visualization (thick granular tubes matching Section 2) */}
        <div className="flex w-full flex-1 min-h-0 flex-col items-center justify-center py-1.5 sm:py-4">
          <ParticleSlot
            slotId="process-stage"
            descriptor={`process:${activeIdx}`}
            aria-label={activeStage.title}
            className="h-[220px] w-[220px] xs:h-[260px] xs:w-[260px] sm:h-[340px] sm:w-[340px] lg:h-[420px] lg:w-[420px] max-h-[32svh] sm:max-h-[46svh]"
          />

          <div className="mt-2.5 sm:mt-4 max-w-2xl text-center">
            <div className="font-mono text-[11px] sm:text-xs text-[#5B5BF0]">
              {activeStage.step} / 0{count}
            </div>
            <h3 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-extrabold tracking-tight">
              {activeStage.title}
            </h3>
            <p className="mt-1.5 sm:mt-3 text-xs sm:text-base font-light opacity-80 leading-relaxed line-clamp-3 sm:line-clamp-none">
              {activeStage.sentence}
            </p>
          </div>
        </div>

        {/* Horizontal Row of 6 Stages (Discover -> Support) */}
        <div className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 border-t border-[var(--hairline)] pt-3 sm:pt-5">
          {t.process.stages.map((stage, idx) => {
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            return (
              <button
                key={stage.step}
                type="button"
                data-cursor="view"
                onClick={() => {
                  soundEngine.playStippleTick();
                  onJumpToStage(idx);
                }}
                className="flex min-h-[40px] flex-col items-start justify-center gap-0.5 sm:gap-1 rounded-[var(--radius-sm)] px-1.5 sm:px-2 py-1 text-start transition-transform duration-300 cursor-pointer min-w-0"
                style={{
                  transform: isActive ? 'scale(1.04)' : 'scale(0.96)',
                  opacity: isActive ? 1 : isPast ? 0.65 : 0.35,
                }}
              >
                <span
                  className={`font-mono text-[10px] ${
                    isActive ? 'text-[#5B5BF0]' : 'opacity-60'
                  }`}
                >
                  {stage.step}
                </span>
                <span
                  className={`w-full truncate text-[11px] sm:text-sm tracking-tight ${
                    isActive ? 'font-extrabold text-[#5B5BF0]' : 'font-medium'
                  }`}
                >
                  {stage.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
