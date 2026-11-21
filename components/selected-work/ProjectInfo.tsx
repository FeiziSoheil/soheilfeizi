'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { SelectedProject, SelectedWorkCopy } from './projectsData';
import { SELECTED_WORK_CONFIG } from '@/lib/site.config';
import { soundEngine } from '@/lib/soundEngine';

interface ProjectInfoProps {
  projects: SelectedProject[];
  activeIndex: number;
  prevIndex: number | null;
  scrollDir: 1 | -1;
  totalProjects: number;
  copy: SelectedWorkCopy;
  reducedMotion: boolean;
  onSkipNext: () => void;
}

/** Splits a project title into 1–2 balanced display lines for line-by-line mask reveal */
function splitTitleLines(title: string): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return [title];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

/**
 * ProjectInfo
 * Direction-aware Dual-DOM GSAP mask-slide transitions:
 * - Outgoing & incoming project text blocks coexist in DOM during transitions (never blank).
 * - Outgoing title lines & metadata exit downward (yPercent: 0 -> 110) behind overflow:hidden
 *   masks with 0.06s stagger, then get visibility:hidden on complete.
 * - After 0.25s delay, incoming title lines & metadata slide up (110 -> 0) with 0.06s stagger.
 * - Scrolling upward reverses travel direction via scrollDir * SELECTED_WORK_CONFIG.directionSign.
 */
export default function ProjectInfo({
  projects,
  activeIndex,
  prevIndex,
  scrollDir,
  totalProjects,
  copy,
  reducedMotion,
  onSkipNext,
}: ProjectInfoProps) {
  const outgoingRef = useRef<HTMLDivElement | null>(null);
  const incomingRef = useRef<HTMLDivElement | null>(null);
  const counterNumRef = useRef<HTMLSpanElement | null>(null);

  // Magnetic button refs
  const ctaBtnRef = useRef<HTMLAnchorElement | null>(null);
  const ctaTextRef = useRef<HTMLSpanElement | null>(null);

  const activeProject = projects[activeIndex] ?? projects[0];
  const prevProject =
    prevIndex !== null && prevIndex !== activeIndex ? projects[prevIndex] ?? null : null;

  const activeLines = useMemo(() => splitTitleLines(activeProject.title), [activeProject.title]);
  const prevLines = useMemo(
    () => (prevProject ? splitTitleLines(prevProject.title) : []),
    [prevProject]
  );

  // Dual-DOM GSAP directional mask slide transition (pre-paint layoutEffect = zero 1-frame flash)
  useLayoutEffect(() => {
    const incomingEl = incomingRef.current;
    const outgoingEl = outgoingRef.current;
    const dirSign = scrollDir * SELECTED_WORK_CONFIG.directionSign;

    if (reducedMotion) {
      if (outgoingEl) {
        gsap.set(outgoingEl, { autoAlpha: 0, visibility: 'hidden' });
      }
      if (incomingEl) {
        gsap.set(incomingEl.querySelectorAll('[data-mask-item]'), {
          yPercent: 0,
          opacity: 1,
          force3D: true,
        });
      }
      return;
    }

    const tl = gsap.timeline({ defaults: { force3D: true } });

    // 1. Outgoing project exits smoothly behind masks
    if (outgoingEl && prevProject) {
      const outItems = outgoingEl.querySelectorAll('[data-mask-item]');
      gsap.set(outgoingEl, { visibility: 'visible', opacity: 1 });
      gsap.set(outItems, { yPercent: 0, opacity: 1, force3D: true });

      tl.to(
        outItems,
        {
          yPercent: 108 * dirSign,
          opacity: 0,
          duration: SELECTED_WORK_CONFIG.exitDurationSec,
          stagger: SELECTED_WORK_CONFIG.staggerSec,
          ease: 'power2.in',
          onComplete: () => {
            gsap.set(outgoingEl, { visibility: 'hidden' });
          },
        },
        0
      );
    }

    // 2. Incoming project enters from behind masks with silky overlap
    if (incomingEl) {
      const inTitleLines = incomingEl.querySelectorAll('[data-mask-title]');
      const inMetaItems = incomingEl.querySelectorAll('[data-mask-meta]');
      const enterStart = prevProject ? SELECTED_WORK_CONFIG.enterDelaySec : 0;

      gsap.set([inTitleLines, inMetaItems], {
        yPercent: 108 * dirSign,
        opacity: 0,
        force3D: true,
      });

      tl.to(
        inTitleLines,
        {
          yPercent: 0,
          opacity: 1,
          duration: SELECTED_WORK_CONFIG.enterDurationSec,
          stagger: SELECTED_WORK_CONFIG.staggerSec,
          ease: 'expo.out',
          overwrite: 'auto',
        },
        enterStart
      );

      tl.to(
        inMetaItems,
        {
          yPercent: 0,
          opacity: 1,
          duration: SELECTED_WORK_CONFIG.enterDurationSec * 0.92,
          stagger: SELECTED_WORK_CONFIG.staggerSec,
          ease: 'expo.out',
          overwrite: 'auto',
        },
        enterStart + 0.04
      );
    }

    // 3. Rolling counter digit (01 / 04)
    if (counterNumRef.current) {
      tl.fromTo(
        counterNumRef.current,
        { yPercent: 100 * dirSign, opacity: 0, force3D: true },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'expo.out',
          overwrite: 'auto',
        },
        prevProject ? 0.08 : 0
      );
    }

    return () => {
      tl.kill();
    };
  }, [activeIndex, prevProject, scrollDir, reducedMotion]);

  // Magnetic hover attraction on the 100px #5B5BF0 "Visit site" circular button
  useEffect(() => {
    if (reducedMotion) return;
    const btn = ctaBtnRef.current;
    const txt = ctaTextRef.current;
    if (!btn || !txt) return;

    const btnX = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
    const btnY = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });
    const txtX = gsap.quickTo(txt, 'x', { duration: 0.4, ease: 'power3.out' });
    const txtY = gsap.quickTo(txt, 'y', { duration: 0.4, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = (e.clientX - cx) * 0.34;
      const dy = (e.clientY - cy) * 0.34;
      btnX(dx);
      btnY(dy);
      txtX(dx * 0.42);
      txtY(dy * 0.42);
    };

    const onEnter = () => {
      gsap.to(btn, {
        scale: 1.08,
        duration: 0.28,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    const onLeave = () => {
      btnX(0);
      btnY(0);
      txtX(0);
      txtY(0);
      gsap.to(btn, {
        scale: 1,
        duration: 0.45,
        ease: 'elastic.out(1, 0.45)',
        overwrite: 'auto',
      });
    };

    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('pointerleave', onLeave);

    return () => {
      btn.removeEventListener('pointermove', onMove);
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  const currentStr = String(activeIndex + 1).padStart(2, '0');
  const totalStr = String(totalProjects).padStart(2, '0');

  return (
    <div className="relative z-20 flex h-full w-full flex-col justify-between ps-11 pe-11 sm:ps-14 sm:pe-16 lg:ps-20 lg:pe-20 pt-14 sm:pt-16 pb-24 sm:pb-28 text-[#ECEAE6]">
      {/* TOP HEADER BAR: (03) SELECTED WORK + Team and freelance */}
      <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-3.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs sm:text-sm font-medium text-[#A6A6FF] tabular-nums">
            {copy.sectionIndex}
          </span>
          <h2 className="text-xs sm:text-sm md:text-[15px] font-bold uppercase tracking-[0.22em] text-[#ECEAE6] whitespace-nowrap">
            {copy.sectionTitle}
          </h2>
        </div>

        <span className="text-[11px] sm:text-xs font-medium tracking-wide text-[#ECEAE6]/80 whitespace-nowrap">
          {copy.topRightNote}
        </span>
      </div>

      {/* MIDDLE ROLLING PROJECT COUNTER (01 / 04) */}
      <div className="my-auto flex items-center justify-between py-2">
        <div
          dir="ltr"
          className="inline-flex items-baseline gap-1.5 font-mono text-sm sm:text-base tracking-tight text-[#ECEAE6] tabular-nums"
          aria-live="polite"
        >
          <span className="inline-block overflow-hidden align-bottom leading-none">
            <span ref={counterNumRef} className="inline-block font-semibold text-[#ECEAE6]">
              {currentStr}
            </span>
          </span>
          <span className="text-[#ECEAE6]/45">/</span>
          <span className="text-[#ECEAE6]/75">{totalStr}</span>
        </div>
      </div>

      {/* BOTTOM DUAL-DOM EDITORIAL STACK (Outgoing + Incoming coexist during transitions) */}
      <div className="relative">
        {/* OUTGOING LAYER (pointer-events-none, becomes visibility:hidden after mask exit) */}
        {prevProject && (
          <div
            ref={outgoingRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-12 lg:gap-10"
          >
            <div className="lg:col-span-7 flex flex-col items-start min-w-0">
              <div className="mb-2 sm:mb-3 overflow-hidden">
                <p
                  data-mask-item
                  className="text-xs sm:text-sm font-normal text-[#ECEAE6]/80 tracking-wide"
                >
                  {copy.titleSubtitle}
                </p>
              </div>

              <div className="w-full space-y-1">
                {prevLines.map((line, i) => (
                  <div key={i} className="overflow-hidden py-0.5">
                    <div
                      data-mask-item
                      className="font-extrabold tracking-[-0.045em] leading-[0.94] text-[#ECEAE6] text-[clamp(2.5rem,11vw,4.25rem)] sm:text-[clamp(3rem,8.5vw,8.5rem)] will-change-transform"
                    >
                      {line}
                    </div>
                  </div>
                ))}
              </div>

              {/* Placeholder matching skip button height so vertical alignment stays pixel-identical */}
              <div className="mt-4 sm:mt-6 h-6" />
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-row items-start sm:items-end justify-between gap-6">
              <div className="max-w-md space-y-2.5 sm:space-y-3 min-w-0">
                <div className="overflow-hidden">
                  <p
                    data-mask-item
                    className="font-mono text-[11px] sm:text-xs font-medium tracking-wide text-[#A6A6FF] leading-snug"
                  >
                    {prevProject.tag}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <p
                    data-mask-item
                    className="text-sm sm:text-[15px] leading-relaxed text-[#ECEAE6]/95 font-normal"
                  >
                    {prevProject.description}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <p
                    data-mask-item
                    className="text-xs leading-relaxed text-[#ECEAE6]/80 font-normal"
                  >
                    {prevProject.extra}
                  </p>
                </div>
              </div>
              <div className="h-[88px] w-[88px] sm:h-[100px] sm:w-[100px] shrink-0" />
            </div>
          </div>
        )}

        {/* INCOMING / ACTIVE LAYER */}
        <div
          ref={incomingRef}
          className="relative z-20 grid grid-cols-1 items-end gap-6 lg:grid-cols-12 lg:gap-10"
        >
          {/* Bottom-Start: Subtitle + Giant Masked Line-by-Line Title + Skip Link */}
          <div className="lg:col-span-7 flex flex-col items-start min-w-0">
            <div className="mb-2 sm:mb-3 overflow-hidden">
              <p
                data-mask-item
                data-mask-title
                className="text-xs sm:text-sm font-normal text-[#ECEAE6]/82 tracking-wide"
              >
                {copy.titleSubtitle}
              </p>
            </div>

            <h3 className="w-full space-y-1">
              {activeLines.map((line, i) => (
                <span key={`${activeProject.id}-${i}`} className="block overflow-hidden py-0.5">
                  <span
                    data-mask-item
                    data-mask-title
                    className="block font-extrabold tracking-[-0.045em] leading-[0.94] text-[#ECEAE6] text-[clamp(2.5rem,11vw,4.25rem)] sm:text-[clamp(3rem,8.5vw,8.5rem)] text-balance will-change-transform"
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h3>

            <button
              type="button"
              data-cursor="view"
              onClick={() => {
                soundEngine.playStippleTick();
                onSkipNext();
              }}
              className="group mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 -ms-3 text-xs sm:text-sm font-medium text-[#ECEAE6]/85 hover:bg-white/10 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{copy.skipNext}</span>
              <ArrowDownRight className="h-4 w-4 text-[#A6A6FF] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </button>
          </div>

          {/* Bottom-Center-End: High-Contrast Description Block + Circular Magnetic #5B5BF0 Visit Site CTA */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-row items-start sm:items-end justify-between gap-6">
            <div className="max-w-md space-y-2.5 sm:space-y-3 min-w-0">
              <div className="overflow-hidden">
                <p
                  data-mask-item
                  data-mask-meta
                  className="font-mono text-[11px] sm:text-xs font-medium tracking-wide text-[#A6A6FF] leading-snug"
                >
                  {activeProject.tag}
                </p>
              </div>

              <div className="overflow-hidden">
                <p
                  data-mask-item
                  data-mask-meta
                  className="text-sm sm:text-[15px] leading-relaxed text-[#ECEAE6]/95 font-normal"
                >
                  {activeProject.description}
                </p>
              </div>

              <div className="overflow-hidden">
                <p
                  data-mask-item
                  data-mask-meta
                  className="text-xs leading-relaxed text-[#ECEAE6]/82 font-normal"
                >
                  {activeProject.extra}
                </p>
              </div>
            </div>

            {/* 100px Magnetic Circular Visit Site CTA */}
            <div className="shrink-0 self-start sm:self-end overflow-hidden p-2 -m-2">
              <div data-mask-item data-mask-meta>
                <a
                  ref={ctaBtnRef}
                  href={activeProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="view"
                  onClick={() => soundEngine.playStippleTick()}
                  aria-label={`${copy.visitSite} — ${activeProject.title}`}
                  className="group relative flex h-[88px] w-[88px] sm:h-[100px] sm:w-[100px] items-center justify-center rounded-full bg-[#5B5BF0] text-white shadow-[0_14px_38px_rgba(91,91,240,0.45)] transition-colors duration-200 hover:bg-[#6A6AF8] will-change-transform"
                >
                  <span
                    ref={ctaTextRef}
                    className="inline-flex flex-col items-center justify-center gap-0.5 text-center text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap leading-tight pointer-events-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{copy.visitSite}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
