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

const INTEGRATION_NODES = [
  { label: 'ERP', x: '50%', y: '10%' },
  { label: 'POS', x: '84%', y: '29%' },
  { label: 'STRIPE', x: '84%', y: '71%' },
  { label: 'WMS', x: '50%', y: '90%' },
  { label: 'CRM', x: '16%', y: '71%' },
  { label: 'EDGE', x: '16%', y: '29%' },
];

/* ─────────────────────────────────────────────────────────────
 * 02 WHAT I DO (steps = 6 -> 600svh sticky)
 * - Sticky L0 SVG->particle diagram morphing across all 6 disciplines
 * - Clip-path vertical title transitions synced to p
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
  const activeIdx = Math.min(count - 1, Math.max(0, Math.floor(scaled)));
  const localP = Math.max(0, Math.min(1, scaled - activeIdx));
  const activeTab = t.whatido.tabs[activeIdx];

  // Vertical clip-path reveal on entry of each step
  const clipTop = Math.max(0, (1 - Math.min(1, localP * 5.5)) * 100);

  return (
    <section
      id="whatido"
      data-section="whatido"
      data-theme="light"
      className={`pin-section ${hasIncomingTransition('whatido') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('whatido', '720svh')}
    >
      <div
        className="pin-sticky flex flex-col justify-between px-6 sm:px-10 lg:px-16 pt-14 pb-32 sm:pb-36"
        style={{ contain: 'layout style' }}
      >
        {/* Top Kicker & Heading */}
        <div className="flex w-full items-end justify-between gap-4 border-b border-[var(--hairline)] pb-3">
          <div>
            <span className="font-mono text-xs font-medium text-[#5B5BF0]">
              {t.whatido.kicker}
            </span>
            <h2 className="mt-1 text-xl sm:text-3xl font-extrabold tracking-tight">
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

        {/* Center Split: Left Info with clip-path title | Right Sticky Particle Diagram */}
        <div className="grid w-full flex-1 min-h-0 grid-cols-1 items-center gap-6 py-4 lg:grid-cols-12">
          <div className="lg:col-span-5 flex min-h-[240px] sm:min-h-[270px] flex-col justify-center">
            <span className="font-mono text-xs text-[#5B5BF0]">
              0{activeIdx + 1} / 0{count}
            </span>

            <div className="mt-3 overflow-hidden">
              <h3
                className="display-xl text-4xl sm:text-6xl will-change-[clip-path]"
                style={{
                  clipPath: `inset(${clipTop}% 0% 0% 0%)`,
                }}
              >
                {activeTab.title}
              </h3>
            </div>

            <p className="mt-5 text-base sm:text-lg font-light leading-relaxed opacity-85">
              {activeTab.desc}
            </p>

            <div className="mt-6 border-t border-[var(--hairline)] pt-4 font-mono text-xs text-[#5B5BF0]">
              {activeTab.metrics}
            </div>
          </div>

          {/* Sticky Diagram Slot rendered on L0 */}
          <div className="lg:col-span-7 flex h-full min-h-0 items-center justify-center">
            <div className="relative h-[320px] w-full sm:h-[420px] lg:h-[520px] max-h-[55svh]">
              <ParticleSlot
                slotId="whatido-diagram"
                descriptor={`svg:${activeTab.id}`}
                aria-label={activeTab.title}
                className="h-full w-full"
              />

              {/* Crisp radial node captions specifically for Integrations */}
              {activeTab.id === 'integrations' && (
                <div className="pointer-events-none absolute inset-0">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-[#5B5BF0]">
                    CORE
                  </span>
                  {INTEGRATION_NODES.map((node, nIdx) => {
                    const visible = localP > 0.15 + nIdx * 0.1;
                    return (
                      <span
                        key={node.label}
                        className="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] transition-opacity duration-300"
                        style={{
                          left: node.x,
                          top: node.y,
                          opacity: visible ? 0.85 : 0.15,
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

        {/* 6 Bottom Progress Bars (clickable to scrollTo exact step, clears DockBar by >= 16px) */}
        <div className="relative z-20 grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {t.whatido.tabs.map((tab, idx) => {
            const fill =
              idx < activeIdx ? 100 : idx === activeIdx ? localP * 100 : 0;
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
                className="group flex flex-col items-start gap-2 rounded-[var(--radius-sm)] p-1 text-start cursor-pointer"
              >
                <div className="h-[3px] w-full rounded-full bg-[var(--hairline)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5B5BF0]"
                    style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-[11px] transition-opacity ${
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
      className={`pin-section ${hasIncomingTransition('process') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('process', '660svh')}
    >
      <div className="pin-sticky flex flex-col justify-between px-6 sm:px-10 lg:px-16 pt-16 pb-32 sm:pb-36">
        {/* Header */}
        <div className="w-full">
          <span className="font-mono text-xs font-medium text-[#5B5BF0]">
            {t.process.kicker}
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">
            {t.process.heading}
          </h2>
        </div>

        {/* Center L0 Particle Stage Visualization (thick granular tubes matching Section 2) */}
        <div className="flex w-full flex-1 min-h-0 flex-col items-center justify-center py-4">
          <ParticleSlot
            slotId="process-stage"
            descriptor={`process:${activeIdx}`}
            aria-label={activeStage.title}
            className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] lg:h-[420px] lg:w-[420px] max-h-[46svh]"
          />

          <div className="mt-4 max-w-2xl text-center">
            <div className="font-mono text-xs text-[#5B5BF0]">
              {activeStage.step} / 0{count}
            </div>
            <h3 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">
              {activeStage.title}
            </h3>
            <p className="mt-3 text-sm sm:text-base font-light opacity-80 leading-relaxed">
              {activeStage.sentence}
            </p>
          </div>
        </div>

        {/* Horizontal Row of 6 Stages (Discover -> Support) */}
        <div className="grid w-full grid-cols-3 sm:grid-cols-6 gap-2 border-t border-[var(--hairline)] pt-5">
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
                className="flex flex-col items-start gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-start transition-transform duration-300 cursor-pointer"
                style={{
                  transform: isActive ? 'scale(1.06)' : 'scale(0.96)',
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
                  className={`text-xs sm:text-sm tracking-tight ${
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
