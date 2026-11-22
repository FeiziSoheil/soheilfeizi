'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Pause, Play } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { CLIENT_NOTES_CONFIG, STATEMENT_COPY } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { ParticleSlot } from '@/components/ParticleSlot';
import { soundEngine } from '@/lib/soundEngine';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ─────────────────────────────────────────────────────────────
 * 07 STATEMENT (Dark #0A0A0A, pinned 300svh)
 * - Fixes double-rendered "invisible.": DOM word is strictly sr-only;
 *   only SiteParticleStage renders "invisible." with indigo accent on "."
 * - 3 phases: enter (0..0.20), crisp hold (0.20..0.76 >= 55%),
 *   edge-outward evaporation (0.76..1.0) synced with caption fade-out
 * ───────────────────────────────────────────────────────────── */
export function StatementSection({ locale }: { locale: Locale }) {
  const copy = STATEMENT_COPY[locale];
  const p = useScrollStore((s) => s.sectionProgress.statement);

  const enterFade = clamp01(p / 0.18);
  const exitFade = 1 - clamp01((p - 0.75) / 0.2);
  const leadOpacity = Math.max(0.08, Math.min(enterFade, exitFade));
  const captionEnter = clamp01((p - 0.16) / 0.14);
  const captionOpacity = Math.min(captionEnter, exitFade) * 0.78;
  const captionY = (1 - captionEnter) * 16 - (1 - exitFade) * 14;

  return (
    <section
      id="statement"
      data-section="statement"
      data-theme="dark"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('statement') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('statement', '300svh', '200svh')}
    >
      <div className="pin-sticky flex flex-col items-center justify-center px-4 sm:px-10 lg:px-16 text-center">
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
          <span
            className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#8F8FFF] transition-opacity duration-200"
            style={{ opacity: leadOpacity }}
          >
            {copy.eyebrow}
          </span>

          {/* Smaller grey lead phrase above */}
          <p
            className="mt-4 sm:mt-5 text-xl sm:text-4xl lg:text-5xl font-light tracking-[-0.02em] text-[#D9D9D9]/58 transition-opacity duration-200"
            style={{ opacity: leadOpacity }}
          >
            {copy.lead}
          </p>

          {/* Giant particle-only word slot ("invisible." / "نامرئی است.") — zero double DOM text */}
          <h2 className="sr-only">
            {copy.lead} {copy.particleWord}
          </h2>
          <ParticleSlot
            slotId="statement-title"
            descriptor={`statement:${copy.particleWord}`}
            aria-hidden="true"
            className="relative mx-auto mt-2 w-full max-w-[1160px] h-[clamp(4.5rem,20vw,17.5rem)]"
          />

          {/* Caption holds cleanly then fades out synchronously with evaporation */}
          <p
            className="mx-auto mt-4 sm:mt-6 max-w-2xl text-xs sm:text-lg font-light leading-relaxed text-[#D9D9D9] will-change-transform"
            style={{
              opacity: captionOpacity,
              transform: `translate3d(0, ${captionY}px, 0)`,
            }}
          >
            {copy.caption}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 08 CLIENT NOTES / WHAT THEY SAID (Light #ECEAE6, 200svh sticky)
 * - Header: (06) WHAT THEY SAID | People I have worked with + hairline
 * - Left rail: circular initials avatars (AM, SR, MK), active #5B5BF0 + dot
 * - Center-left: dual-DOM GSAP mask-slide quote headline + body + author + metric chip
 * - Bottom: thin rounded-full 7s auto-advance bar (pauses on hover)
 * - Right/End: borderless giant particle « » quotation marks triggering micro-morph on swap
 * ───────────────────────────────────────────────────────────── */
export function ClientNotesSection({ locale }: { locale: Locale }) {
  const copy = CLIENT_NOTES_CONFIG.header[locale];
  const quotes = CLIENT_NOTES_CONFIG.items[locale];
  const triggerQuoteMorph = useScrollStore((s) => s.triggerQuoteMorph);

  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [switchDir, setSwitchDir] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const incomingRef = useRef<HTMLDivElement | null>(null);
  const outgoingRef = useRef<HTMLDivElement | null>(null);
  const activeIdxRef = useRef(0);
  const elapsedRef = useRef(0);

  const switchTo = useCallback(
    (nextIndex: number) => {
      const normalized = ((nextIndex % quotes.length) + quotes.length) % quotes.length;
      if (normalized === activeIdxRef.current) return;
      const prev = activeIdxRef.current;
      const dir: 1 | -1 = normalized > prev ? 1 : -1;
      activeIdxRef.current = normalized;
      elapsedRef.current = 0;
      setProgress(0);
      setPrevIdx(prev);
      setSwitchDir(dir);
      setActiveIdx(normalized);
      soundEngine.playStippleTick();
      triggerQuoteMorph();
    },
    [quotes.length, triggerQuoteMorph]
  );

  // 7-second smooth auto-advance progress bar that pauses on hover/focus
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const duration = CLIENT_NOTES_CONFIG.autoAdvanceMs;

    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!isPaused) {
        elapsedRef.current += dt;
        const ratio = Math.min(1, elapsedRef.current / duration);
        setProgress(ratio);
        if (elapsedRef.current >= duration) {
          switchTo(activeIdxRef.current + 1);
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isPaused, switchTo]);

  // Dual-DOM mask-slide transition matching Selected Work grammar
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const incomingEl = incomingRef.current;
    const outgoingEl = outgoingRef.current;

    if (reduced) {
      if (outgoingEl) gsap.set(outgoingEl, { visibility: 'hidden', opacity: 0 });
      if (incomingEl) {
        gsap.set(incomingEl.querySelectorAll('[data-q-item]'), { yPercent: 0, opacity: 1 });
      }
      return;
    }

    const tl = gsap.timeline();

    if (outgoingEl && prevIdx !== null && prevIdx !== activeIdx) {
      const outItems = outgoingEl.querySelectorAll('[data-q-item]');
      gsap.set(outgoingEl, { visibility: 'visible', opacity: 1 });
      gsap.set(outItems, { yPercent: 0, opacity: 1 });
      tl.to(
        outItems,
        {
          yPercent: -105 * switchDir,
          opacity: 0,
          duration: 0.36,
          stagger: 0.045,
          ease: 'power3.in',
          onComplete: () => {
            gsap.set(outgoingEl, { visibility: 'hidden' });
          },
        },
        0
      );
    }

    if (incomingEl) {
      const inItems = incomingEl.querySelectorAll('[data-q-item]');
      const startAt = prevIdx !== null && prevIdx !== activeIdx ? 0.18 : 0;
      gsap.set(inItems, { yPercent: 105 * switchDir, opacity: 0 });
      tl.to(
        inItems,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.62,
          stagger: 0.055,
          ease: 'power4.out',
          overwrite: 'auto',
        },
        startAt
      );
    }

    return () => {
      tl.kill();
    };
  }, [activeIdx, prevIdx, switchDir]);

  const activeQuote = quotes[activeIdx] ?? quotes[0];
  const prevQuote =
    prevIdx !== null && prevIdx !== activeIdx ? quotes[prevIdx] ?? null : null;

  return (
    <section
      id="testimonial"
      data-section="testimonial"
      data-theme="light"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('testimonial') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('testimonial', '200svh', '165svh')}
    >
      <div
        className="pin-sticky flex flex-col justify-between px-4 sm:px-10 lg:px-16 pt-16 sm:pt-20 pb-20 sm:pb-28"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Top Header Row: (06) WHAT THEY SAID + People I have worked with + Hairline */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-4 border-b border-[#111111]/15 pb-3 sm:pb-4">
          <div className="flex items-baseline gap-2.5 sm:gap-3">
            <span className="font-mono text-xs sm:text-sm font-medium text-[#5B5BF0] tabular-nums">
              {copy.index}
            </span>
            <h2 className="text-xs sm:text-sm md:text-[15px] font-extrabold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#111111]">
              {copy.title}
            </h2>
          </div>
          <span className="text-[11px] sm:text-sm font-normal text-[#111111]/60">
            {copy.subtitle}
          </span>
        </div>

        {/* Main 3-Zone Editorial Grid: Avatar Rail | Dual-DOM Quote Stack | Particle Quote Marks */}
        <div className="my-auto grid w-full grid-cols-1 items-center gap-5 sm:gap-8 lg:grid-cols-12 lg:gap-10 py-3 sm:py-6">
          {/* Narrow Left Column: Circular Initials Avatars */}
          <div
            role="tablist"
            aria-label={copy.title}
            className="lg:col-span-1 flex lg:flex-col items-center gap-3 sm:gap-3.5"
          >
            {quotes.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${item.name} — ${item.role}`}
                  data-cursor="view"
                  onClick={() => switchTo(idx)}
                  className="group relative flex items-center gap-2 cursor-pointer rounded-full"
                >
                  <span
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full font-mono text-xs font-bold tracking-wider transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5B5BF0] text-white shadow-[0_10px_24px_rgba(91,91,240,0.36)] scale-105'
                        : 'bg-[#111111]/8 text-[#111111]/55 hover:bg-[#111111]/14 hover:text-[#111111]'
                    }`}
                  >
                    {item.initials}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`hidden sm:inline-block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5B5BF0] scale-100 opacity-100'
                        : 'bg-transparent scale-0 opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Center-Left Column: Dual-DOM Masked Quote Stack */}
          <div className="lg:col-span-7 relative min-h-[230px] sm:min-h-[340px] flex flex-col justify-center">
            {/* Outgoing Quote Layer */}
            {prevQuote && (
              <div
                ref={outgoingRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 space-y-3.5 sm:space-y-5"
              >
                <div className="overflow-hidden">
                  <div
                    data-q-item
                    className="font-extrabold tracking-[-0.035em] leading-[1.1] sm:leading-[1.06] text-[#111111] text-[clamp(1.45rem,5.8vw,4.5rem)] text-balance"
                  >
                    <span className="text-[#5B5BF0] me-2">“</span>
                    {prevQuote.headline}
                    <span className="text-[#5B5BF0] ms-1">”</span>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <p
                    data-q-item
                    className="max-w-2xl text-xs sm:text-base lg:text-lg font-normal leading-relaxed text-[#111111]/75"
                  >
                    {prevQuote.body}
                  </p>
                </div>
                <div className="overflow-hidden pt-2">
                  <div data-q-item className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-extrabold text-[#111111]">{prevQuote.name}</span>
                    <span className="font-mono text-xs text-[#111111]/55">
                      {prevQuote.role} · {prevQuote.company}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Incoming / Active Quote Layer */}
            <div ref={incomingRef} className="relative z-20 space-y-3.5 sm:space-y-5">
              <div className="overflow-hidden py-1">
                <blockquote
                  data-q-item
                  className="font-extrabold tracking-[-0.035em] leading-[1.1] sm:leading-[1.06] text-[#111111] text-[clamp(1.45rem,5.8vw,4.5rem)] text-balance will-change-transform"
                >
                  <span className="text-[#5B5BF0] me-2" aria-hidden="true">
                    {locale === 'fa' ? '«' : '“'}
                  </span>
                  {activeQuote.headline}
                  <span className="text-[#5B5BF0] ms-1" aria-hidden="true">
                    {locale === 'fa' ? '»' : '”'}
                  </span>
                </blockquote>
              </div>

              <div className="overflow-hidden">
                <p
                  data-q-item
                  className="max-w-2xl text-xs sm:text-base lg:text-lg font-normal leading-relaxed text-[#111111]/76"
                >
                  {activeQuote.body}
                </p>
              </div>

              <div className="overflow-hidden pt-1 sm:pt-2">
                <div
                  data-q-item
                  className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-t border-[#111111]/12 pt-3 sm:pt-4"
                >
                  <div>
                    <div className="text-sm sm:text-base font-extrabold text-[#111111]">
                      {activeQuote.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] sm:text-xs text-[#111111]/60">
                      {activeQuote.role} · {activeQuote.company}
                    </div>
                  </div>

                  {/* Rounded metric chip */}
                  <span className="inline-flex items-center rounded-full border border-[#5B5BF0]/25 bg-[#5B5BF0]/10 px-3 sm:px-4 py-1 sm:py-1.5 font-mono text-[10px] sm:text-[11px] font-medium text-[#3B3BC8]">
                    {activeQuote.metric}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right/End Column: Giant Borderless Particle Quotation Marks « » (hidden on < sm so quotes never clip) */}
          <div className="hidden sm:flex lg:col-span-4 items-center justify-center">
            <ParticleSlot
              slotId="testimonial-figure"
              descriptor="quotes:marks"
              aria-hidden="true"
              className="h-[200px] w-full max-w-[380px] md:h-[280px] lg:h-[380px]"
            />
          </div>
        </div>

        {/* Bottom 7-Second Thin Rounded-Full Progress Bar (Pauses on Hover) */}
        <div className="flex items-center justify-between gap-4">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[#111111]/12"
          >
            <div
              className="h-full rounded-full bg-[#5B5BF0] transition-[width] duration-75 ease-linear"
              style={{ width: `${(progress * 100).toFixed(2)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-[#111111]/55 tabular-nums shrink-0">
            {String(activeIdx + 1).padStart(2, '0')} / {String(quotes.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  );
}

// Backwards-compatible alias
export const TestimonialSection = ClientNotesSection;

/* ─────────────────────────────────────────────────────────────
 * 09 AFTER HOURS (Dark, steps = 2 -> 200svh sticky)
 * ───────────────────────────────────────────────────────────── */
const IDLE_BARS = [16, 28, 20, 38, 22, 32, 18, 26, 36, 20, 28, 16];

export function AfterHoursSection({
  locale,
  soundPlaying,
  activeTrack,
  onSelectTrack,
  onToggleSound,
}: {
  locale: Locale;
  soundPlaying: boolean;
  activeTrack: number;
  onSelectTrack: (idx: number) => void;
  onToggleSound: () => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.afterhours);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [liveBars, setLiveBars] = useState<number[]>(IDLE_BARS);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const stickyEl = stickyRef.current;
    const contentEl = contentRef.current;
    if (!stickyEl || !contentEl) return;

    const measure = () => {
      const nextOverflow = Math.max(0, contentEl.scrollHeight - stickyEl.clientHeight);
      setOverflowPx(nextOverflow);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stickyEl);
    ro.observe(contentEl);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [locale]);

  useEffect(() => {
    if (!soundPlaying) return;
    const el = sectionRef.current;
    let isVisible = true;
    const io = el
      ? new IntersectionObserver(
          (entries) => {
            isVisible = Boolean(entries[0]?.isIntersecting);
          },
          { rootMargin: '120px' }
        )
      : null;
    if (el && io) io.observe(el);

    let raf = 0;
    let lastUpdate = 0;
    const poll = (now: number) => {
      if (isVisible && !document.hidden && now - lastUpdate >= 85) {
        lastUpdate = now;
        const levels = soundEngine.getLevels(12);
        setLiveBars(levels.map((v) => Math.max(12, Math.round(v * 100))));
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [soundPlaying]);

  const bars = soundPlaying ? liveBars : IDLE_BARS;
  const isRtl = locale === 'fa';
  const panY = overflowPx > 0 ? -(p * overflowPx) : 0;

  return (
    <section
      ref={sectionRef}
      id="afterhours"
      data-section="afterhours"
      data-theme="dark"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('afterhours') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('afterhours', '200svh', '210svh')}
    >
      <div
        ref={stickyRef}
        className={`pin-sticky flex ${
          overflowPx > 0 ? 'items-start' : 'items-center'
        } px-4 sm:px-10 lg:px-16`}
      >
        <div
          ref={contentRef}
          className="grid w-full grid-cols-1 gap-7 lg:gap-10 lg:grid-cols-12 pt-16 pb-28 lg:py-16 will-change-transform"
          style={
            overflowPx > 0
              ? { transform: `translate3d(0, ${panY.toFixed(1)}px, 0)` }
              : undefined
          }
        >
          {/* Live Procedural Web Audio Player (Rounded Card) */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white/[0.02] p-5 sm:p-8">
            <div>
              <span className="font-mono text-xs font-medium text-[#5B5BF0]">
                {t.afterhours.kicker}
              </span>
              <h2 className="display-xl mt-2 text-2xl sm:text-4xl">
                {t.afterhours.heading}
              </h2>
              <p className="mt-2 font-mono text-xs opacity-55">
                {t.afterhours.playerTitle}
              </p>

              {/* Frequency Bars */}
              <div
                aria-hidden="true"
                className="mt-6 flex h-12 items-end gap-1.5 border-b border-[var(--hairline)] pb-3"
              >
                {bars.map((val, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-full bg-[#5B5BF0] transition-[height] duration-75"
                    style={{
                      height: `${val}%`,
                      opacity: soundPlaying ? 0.9 : 0.28,
                    }}
                  />
                ))}
              </div>

              {/* 3 Drift Tracks */}
              <div className="mt-5 space-y-1.5">
                {t.afterhours.tracks.map((track) => {
                  const isCurrent = activeTrack === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      data-cursor="view"
                      onClick={() => {
                        soundEngine.playStippleTick();
                        if (isCurrent && soundPlaying) {
                          onToggleSound();
                        } else {
                          onSelectTrack(track.id);
                        }
                      }}
                      className={`flex w-full items-center justify-between gap-4 rounded-[var(--radius-md)] px-3 py-3 text-start transition-colors hover:bg-white/[0.05] hover:text-[#8F8FFF] cursor-pointer ${
                        isCurrent && soundPlaying ? 'bg-white/[0.06]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                            isCurrent && soundPlaying
                              ? 'border-[#5B5BF0] bg-[#5B5BF0] text-white'
                              : 'border-[var(--hairline)]'
                          }`}
                        >
                          {isCurrent && soundPlaying ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div>
                          <div className="text-sm font-bold">{track.title}</div>
                          <div className="text-xs font-light opacity-60">
                            {track.mood}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] opacity-55 shrink-0">
                        {track.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hobbies entering horizontally with p */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <span className="font-mono text-xs opacity-55 mb-5">
              {t.afterhours.hobbiesHeading}
            </span>
            <div className="space-y-4">
              {t.afterhours.hobbies.map((hobby, idx) => {
                const entry = clamp01((p - idx * 0.1) / 0.35);
                const slidePx = (1 - entry) * (isRtl ? -24 : 24);
                return (
                  <div
                    key={hobby.title}
                    className="border-b border-[var(--hairline)] pb-3.5 sm:pb-4 will-change-transform"
                    style={{
                      opacity: Math.max(0.55, entry),
                      transform: `translate3d(${slidePx}px, 0, 0)`,
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base sm:text-xl font-extrabold tracking-tight">
                        {hobby.title}
                      </h3>
                      <span className="font-mono text-xs text-[#5B5BF0]">
                        0{idx + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm font-light opacity-75">
                      {hobby.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
