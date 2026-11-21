'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';
import {
  SELECTED_PROJECTS,
  SELECTED_WORK_COPY,
  type SelectedProject,
} from './projectsData';
import ProjectBackground from './ProjectBackground';
import ParticleLayer from './ParticleLayer';
import ProjectInfo from './ProjectInfo';
import ProgressIndicator from './ProgressIndicator';

export interface SelectedWorkProps {
  locale: Locale;
  projects?: SelectedProject[];
  onSkipNext?: () => void;
  onJumpToProject?: (index: number, total: number) => void;
}

/**
 * SelectedWork
 * Zero-jank, scroll-driven sticky showcase synchronized directly with Lenis via
 * useScrollStore.subscribe (zero per-pixel React re-renders; only switches React
 * state on discrete project boundaries while GPU WebGL2 particles & background
 * parallax glide at 60/120fps).
 */
export default function SelectedWork({
  locale,
  projects: customProjects,
  onSkipNext,
  onJumpToProject,
}: SelectedWorkProps) {
  const projects = customProjects ?? SELECTED_PROJECTS[locale];
  const copy = SELECTED_WORK_COPY[locale];

  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [scrollDir, setScrollDir] = useState<1 | -1>(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const lastIndexRef = useRef(0);

  // Detect prefers-reduced-motion dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Subscribe directly to PortfolioDirector's Lenis-smoothed sectionProgress.work
  // Zero per-frame React re-renders — only triggers state update when active project index changes!
  useEffect(() => {
    const total = projects.length;
    const syncFromProgress = (p: number) => {
      const clamped = Math.max(0, Math.min(1, p));
      const idx = Math.min(total - 1, Math.floor(clamped * total));
      if (idx !== lastIndexRef.current) {
        const prev = lastIndexRef.current;
        const dir: 1 | -1 = idx > prev ? 1 : -1;
        lastIndexRef.current = idx;
        setPrevIndex(prev);
        setScrollDir(dir);
        setActiveIndex(idx);
        soundEngine.playStippleTick();
      }
    };

    syncFromProgress(useScrollStore.getState().sectionProgress.work);

    const unsub = useScrollStore.subscribe((state) => {
      syncFromProgress(state.sectionProgress.work);
    });
    return () => unsub();
  }, [projects.length]);

  const handleSelectProject = (idx: number) => {
    soundEngine.playStippleTick();
    if (onJumpToProject) {
      onJumpToProject(idx, projects.length);
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const scrollable = Math.max(0, el.offsetHeight - window.innerHeight);
    const targetP = (idx + 0.15) / Math.max(1, projects.length);
    window.scrollTo({
      top: sectionTop + scrollable * targetP,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleSkipNext = () => {
    if (onSkipNext) {
      onSkipNext();
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const nextTop = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight;
    window.scrollTo({
      top: nextTop,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      id="work"
      ref={sectionRef}
      data-section="work"
      data-theme="dark"
      aria-label={copy.sectionTitle}
      className="pin-section relative w-full bg-[#0A0A0A] text-[#ECEAE6]"
      style={{ height: `${projects.length * 100}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-[#0A0A0A]"
      >
        {/* Layer 1: GPU-promoted full-bleed crossfading + smooth parallax project imagery */}
        <ProjectBackground
          projects={projects}
          activeIndex={activeIndex}
          prevIndex={prevIndex}
          reducedMotion={reducedMotion}
        />

        {/* Layer 2: WebGL2 GPU halftone dot-matrix particle canvas */}
        <ParticleLayer
          projects={projects}
          activeIndex={activeIndex}
          containerRef={stickyRef}
          reducedMotion={reducedMotion}
        />

        {/* Layer 2.5: Dedicated Legibility Overlays ABOVE ParticleLayer & BELOW ProjectInfo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15]">
          <div className="absolute inset-0 bg-[#0A0A0A]/28" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(10, 10, 10, 0.85) 0%, rgba(10, 10, 10, 0.5) 18%, transparent 38%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(10, 10, 10, 0.92) 0%, rgba(10, 10, 10, 0.65) 30%, transparent 62%)',
            }}
          />
        </div>

        {/* Layer 3: Left-edge vertical dark Nominee tab (no backdrop-blur over WebGL) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute start-0 top-1/2 z-30 -translate-y-1/2 hidden sm:flex items-center justify-center rounded-e-[var(--radius-md)] bg-[#0A0A0D]/95 border-y border-e border-white/15 px-2.5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <span className="vertical-label font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[#ECEAE6]/90">
            {copy.nomineeLabel}
          </span>
        </div>

        {/* Layer 4: Direction-aware Dual-DOM Editorial Project UI Overlay */}
        <ProjectInfo
          projects={projects}
          activeIndex={activeIndex}
          prevIndex={prevIndex}
          scrollDir={scrollDir}
          totalProjects={projects.length}
          copy={copy}
          reducedMotion={reducedMotion}
          onSkipNext={handleSkipNext}
        />

        {/* Layer 5: Quantized vertical dotted scroll progress indicator */}
        <ProgressIndicator
          total={projects.length}
          activeIndex={activeIndex}
          ariaLabel={copy.projectListAria}
          onSelectProject={handleSelectProject}
        />
      </div>
    </section>
  );
}
