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
 * - Fixes double-rendered word: DOM word is strictly sr-only;
 *   only SiteParticleStage renders particle word with indigo accent
 * - Enter (0..0.20), crisp hold (0.20..0.75), caption fade-out (0.75..0.95),
 *   particle word holds until White Hole singularity swallows/morphs it into Quote Marks
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

          {/* Caption holds cleanly then fades out before singularity transition */}
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
 * - Particle “ ”: lg+ side column only (hidden on mobile); micro-morph on swap
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
        className="pin-sticky flex flex-col justify-between px-4 sm:px-8 md:px-10 lg:px-16 pt-10 sm:pt-14 md:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-24 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Header Row: (06) WHAT THEY SAID + People I have worked with + Hairline */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-4 border-b border-[#111111]/15 pb-2.5 sm:pb-3.5 shrink-0">
          <div className="flex items-baseline gap-2 sm:gap-3">
            <span className="font-mono text-base sm:text-lg font-medium text-[#5B5BF0] tabular-nums">
              {copy.index}
            </span>
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-[0.16em] sm:tracking-[0.22em] text-[#111111]">
              {copy.title}
            </h2>
          </div>
          <span className="text-sm sm:text-base md:text-lg font-normal text-[#111111]/60">
            {copy.subtitle}
          </span>
        </div>

        {/* Main grid: avatars | quote | particle quotes (lg+ only) */}
        <div className="my-auto grid w-full grid-cols-1 md:grid-cols-12 items-center gap-3 sm:gap-5 md:gap-6 lg:gap-8 py-2 sm:py-3 md:py-4 lg:py-6 flex-1 min-h-0">
          {/* Narrow Left Column: Circular Initials Avatars */}
          <div
            role="tablist"
            aria-label={copy.title}
            className="md:col-span-2 lg:col-span-1 flex flex-row md:flex-col items-center justify-start md:justify-center gap-2 sm:gap-2.5 md:gap-3 shrink-0"
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
                  className="group relative flex items-center gap-2 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5BF0]"
                >
                  <span
                    className={`flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 md:h-11 md:w-11 lg:h-12 lg:w-12 items-center justify-center rounded-full font-mono text-[10.5px] sm:text-xs font-bold tracking-wider transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5B5BF0] text-white shadow-[0_6px_16px_rgba(91,91,240,0.36)] scale-105'
                        : 'bg-[#111111]/8 text-[#111111]/55 hover:bg-[#111111]/14 hover:text-[#111111]'
                    }`}
                  >
                    {item.initials}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`hidden md:inline-block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5B5BF0] scale-100 opacity-100'
                        : 'bg-transparent scale-0 opacity-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Dual-DOM Masked Quote Stack */}
          <div className="md:col-span-10 lg:col-span-7 relative min-h-[170px] sm:min-h-[200px] md:min-h-[250px] lg:min-h-[300px] flex flex-col justify-center min-w-0">
              {/* Outgoing Quote Layer */}
              {prevQuote && (
                <div
                  ref={outgoingRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 space-y-2 sm:space-y-3.5 md:space-y-4 lg:space-y-5"
                >
                  <div className="overflow-hidden py-1 sm:py-1.5">
                    <div
                      data-q-item
                      className="font-extrabold tracking-[-0.035em] leading-[1.18] sm:leading-[1.12] lg:leading-[1.06] text-[#111111] text-[clamp(1.85rem,7vw,2.6rem)] sm:text-[clamp(2.25rem,5vw,3.4rem)] lg:text-[clamp(2.85rem,4vw,4.5rem)] text-balance"
                    >
                      <span className="text-[#5B5BF0] me-1 sm:me-1.5" aria-hidden="true">
                        {locale === 'fa' ? '«' : '“'}
                      </span>
                      {prevQuote.headline}
                      <span className="text-[#5B5BF0] ms-1" aria-hidden="true">
                        {locale === 'fa' ? '»' : '”'}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p
                      data-q-item
                      className="max-w-3xl text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] font-normal leading-relaxed text-[#111111]/75"
                    >
                      {prevQuote.body}
                    </p>
                  </div>
                  <div className="overflow-hidden pt-1 sm:pt-2">
                    <div
                      data-q-item
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 border-t border-[#111111]/12 pt-2.5 sm:pt-3.5"
                    >
                      <div className="min-w-0">
                        <div className="text-base sm:text-lg lg:text-xl font-extrabold text-[#111111]">
                          {prevQuote.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[13px] sm:text-base text-[#111111]/60 truncate">
                          {prevQuote.role} · {prevQuote.company}
                        </div>
                      </div>
                      <span className="inline-flex self-start sm:self-auto items-center rounded-lg sm:rounded-full border border-[#5B5BF0]/25 bg-[#5B5BF0]/10 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-xs sm:text-sm font-medium text-[#3B3BC8] max-w-full">
                        {prevQuote.metric}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Incoming / Active Quote Layer */}
              <div ref={incomingRef} className="relative z-20 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
                <div className="overflow-hidden py-1 sm:py-1.5">
                  <blockquote
                    data-q-item
                    className="font-extrabold tracking-[-0.035em] leading-[1.18] sm:leading-[1.12] lg:leading-[1.06] text-[#111111] text-[clamp(1.85rem,7vw,2.6rem)] sm:text-[clamp(2.25rem,5vw,3.4rem)] lg:text-[clamp(2.85rem,4vw,4.5rem)] text-balance will-change-transform"
                  >
                    <span className="text-[#5B5BF0] me-1 sm:me-1.5" aria-hidden="true">
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
                    className="max-w-3xl text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] font-normal leading-relaxed text-[#111111]/76"
                  >
                    {activeQuote.body}
                  </p>
                </div>

                <div className="overflow-hidden pt-1 sm:pt-2">
                  <div
                    data-q-item
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 border-t border-[#111111]/12 pt-2.5 sm:pt-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg lg:text-xl font-extrabold text-[#111111]">
                        {activeQuote.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[13px] sm:text-base text-[#111111]/60 truncate">
                        {activeQuote.role} · {activeQuote.company}
                      </div>
                    </div>

                    {/* Rounded metric chip */}
                    <span className="inline-flex self-start sm:self-auto items-center rounded-lg sm:rounded-full border border-[#5B5BF0]/25 bg-[#5B5BF0]/10 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-xs sm:text-sm font-medium text-[#3B3BC8] max-w-full">
                      {activeQuote.metric}
                    </span>
                  </div>
                </div>
              </div>
          </div>

          {/* Desktop-only: giant expanded particle quotation marks “ ” */}
          <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
            <ParticleSlot
              slotId="testimonial-figure"
              descriptor="quotes:xl"
              aria-hidden="true"
              className="h-[min(58vh,620px)] w-full max-w-[620px]"
            />
          </div>
        </div>

        {/* Bottom 7-Second Thin Rounded-Full Progress Bar (Pauses on Hover / Touch) */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 shrink-0 pt-2 mb-1 sm:mb-2">
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
          <span className="font-mono text-[10px] sm:text-[11px] text-[#111111]/55 tabular-nums shrink-0">
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
  onSoundCloudSlot,
}: {
  locale: Locale;
  soundPlaying: boolean;
  activeTrack: number;
  onSelectTrack: (idx: number) => void;
  onToggleSound: () => void;
  onSoundCloudSlot?: (el: HTMLElement | null) => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.afterhours);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [liveBars, setLiveBars] = useState<number[]>(IDLE_BARS);
  const [mobileTab, setMobileTab] = useState<'player' | 'hobbies'>('player');
  const userInteractedTabRef = useRef(false);

  // Sync mobile tab with scroll progress unless user explicitly clicked a tab
  useEffect(() => {
    if (!userInteractedTabRef.current) {
      if (p >= 0.48 && mobileTab !== 'hobbies') {
        setMobileTab('hobbies');
      } else if (p < 0.45 && mobileTab !== 'player') {
        setMobileTab('player');
      }
    }
  }, [p, mobileTab]);

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
      <div className="pin-sticky flex items-center justify-center px-4 sm:px-8 md:px-10 lg:px-16 overflow-hidden">
        <div className="w-full max-w-6xl mx-auto py-10 sm:py-12 md:py-16">
          {/* Mobile Segmented Tab Switcher (< md) */}
          <div className="flex md:hidden items-center justify-center p-1 rounded-full border border-[var(--hairline)] bg-white/[0.04] backdrop-blur-md mb-4 max-w-[280px] mx-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playStippleTick();
                userInteractedTabRef.current = true;
                setMobileTab('player');
              }}
              className={`flex-1 py-1 px-3 rounded-full text-[11px] font-mono font-medium transition-all ${
                mobileTab === 'player'
                  ? 'bg-[#5B5BF0] text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {locale === 'fa' ? '♫ پلیر صوتی' : '♫ Ambient Sound'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playStippleTick();
                userInteractedTabRef.current = true;
                setMobileTab('hobbies');
              }}
              className={`flex-1 py-1 px-3 rounded-full text-[11px] font-mono font-medium transition-all ${
                mobileTab === 'hobbies'
                  ? 'bg-[#5B5BF0] text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {locale === 'fa' ? '✦ پس از کار' : '✦ After Hours'}
            </button>
          </div>

          <div className="grid w-full grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 md:gap-8 lg:gap-10 items-center">
            {/* Live Procedural Web Audio Player (Rounded Card) */}
            <div
              className={`md:col-span-6 flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white/[0.02] p-4 sm:p-5 md:p-6 lg:p-8 ${
                mobileTab === 'player' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div>
                <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
                  {t.afterhours.kicker}
                </span>
                <h2 className="display-xl mt-1.5 sm:mt-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                  {t.afterhours.heading}
                </h2>
                <p className="mt-1 sm:mt-2 font-mono text-[10.5px] sm:text-xs opacity-55">
                  {t.afterhours.playerTitle}
                </p>

                {/* Frequency Bars */}
                <div
                  aria-hidden="true"
                  className="mt-4 sm:mt-5 md:mt-6 flex h-8 sm:h-10 md:h-12 items-end gap-1.5 border-b border-[var(--hairline)] pb-2.5 sm:pb-3"
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

                {/* Drift Tracks */}
                <div className="mt-3.5 sm:mt-4 md:mt-5 space-y-1 sm:space-y-1.5">
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
                        className={`flex w-full items-center justify-between gap-2.5 sm:gap-4 rounded-[var(--radius-md)] px-2.5 sm:px-3 py-2 sm:py-2.5 md:py-3 text-start transition-colors hover:bg-white/[0.05] hover:text-[#8F8FFF] cursor-pointer ${
                          isCurrent && soundPlaying ? 'bg-white/[0.06]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <span
                            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border shrink-0 ${
                              isCurrent && soundPlaying
                                ? 'border-[#5B5BF0] bg-[#5B5BF0] text-white'
                                : 'border-[var(--hairline)]'
                            }`}
                          >
                            {isCurrent && soundPlaying ? (
                              <Pause className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            ) : (
                              <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-xs sm:text-sm font-bold truncate">
                                {track.title}
                              </span>
                              <span className="font-mono text-[8.5px] sm:text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-[var(--hairline)] opacity-60 shrink-0">
                                {track.type === 'soundcloud' ? 'SoundCloud' : 'Web Audio'}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs font-light opacity-60 truncate mt-0.5">
                              {track.mood}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] sm:text-[11px] opacity-55 shrink-0 ms-2">
                          {track.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* SoundCloud iframe is owned by SoundCloudPlayerHost; this slot receives the portal */}
                {(() => {
                  const activeTrackData = t.afterhours.tracks.find((tr) => tr.id === activeTrack);
                  const isSoundCloud = activeTrackData?.type === 'soundcloud';
                  return (
                    <div
                      ref={(el) => onSoundCloudSlot?.(el)}
                      className={`mt-3 sm:mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--hairline)] bg-black/40 transition-all duration-300 ${
                        isSoundCloud ? 'block' : 'hidden'
                      }`}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Hobbies entering horizontally with p */}
            <div
              className={`md:col-span-6 flex flex-col justify-center ${
                mobileTab === 'hobbies' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <span className="font-mono text-[11px] sm:text-xs opacity-55 mb-3 sm:mb-4 md:mb-5">
                {t.afterhours.hobbiesHeading}
              </span>
              <div className="space-y-3 sm:space-y-4">
                {t.afterhours.hobbies.map((hobby, idx) => {
                  const entry = clamp01((p - idx * 0.1) / 0.35);
                  const slidePx = (1 - entry) * (isRtl ? -24 : 24);
                  return (
                    <div
                      key={hobby.title}
                      className="border-b border-[var(--hairline)] pb-2.5 sm:pb-3.5 md:pb-4 will-change-transform"
                      style={{
                        opacity: Math.max(0.55, entry),
                        transform: `translate3d(${slidePx}px, 0, 0)`,
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold tracking-tight">
                          {hobby.title}
                        </h3>
                        <span className="font-mono text-[11px] sm:text-xs text-[#5B5BF0]">
                          0{idx + 1}
                        </span>
                      </div>
                      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs md:text-sm font-light opacity-75 leading-relaxed">
                        {hobby.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
