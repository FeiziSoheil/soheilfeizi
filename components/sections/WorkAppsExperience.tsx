'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { OWN_APPS_CONFIG } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

gsap.registerPlugin(ScrollTrigger);

interface TrackMetrics {
  vw: number;
  cw: number;
  gap: number;
  pad: number;
}

/**
 * Pure helper computing exact horizontal track `x` so continuous card index `f`
 * sits dead-center at `vw / 2` for both LTR and RTL layouts.
 */
export function computeOwnAppsTrackX(
  f: number,
  cardCount: number,
  metrics: TrackMetrics,
  isRtl: boolean
): number {
  const { vw, cw, gap, pad } = metrics;
  const maxIdx = Math.max(0, cardCount - 1);
  const clampedF = Math.max(0, Math.min(maxIdx, f));
  const i0 = Math.floor(clampedF);
  const i1 = Math.min(maxIdx, Math.ceil(clampedF));
  const frac = clampedF - i0;
  const centerOf = (idx: number) => pad + idx * (cw + gap) + cw * 0.5;
  const targetCenter = gsap.utils.interpolate(centerOf(i0), centerOf(i1), frac);
  return isRtl ? targetCenter - vw * 0.5 : vw * 0.5 - targetCenter;
}

/* ─────────────────────────────────────────────────────────────
 * 05 OWN APPS (Dark, mathematically centered horizontal track)
 * - Uniform fixed card width `clamp(380px, 29vw, 560px)` (safe mobile cap `min(84vw, ...)`)
 *   and fixed uniform height `360px`, gap `clamp(40px, 5vw, 96px)`
 * - Symmetric track padding `calc(50vw - cardWidth / 2)`
 * - Section height `n * 90vh + 40vh` with final 40vh hold on last card dead-center
 * - Exact center interpolation via `gsap.utils.interpolate` for LTR & RTL
 * - Per-card `d = |i - f|`: opacity, blur, transform scale (zero layout shift),
 *   active (`d < 0.5`) border `rgba(91, 91, 240, 0.6)` + ACTIVE badge
 * ───────────────────────────────────────────────────────────── */
export function OwnAppsSection({
  locale,
  onPlaySynth,
}: {
  locale: Locale;
  onPlaySynth: () => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.apps);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstCardRef = useRef<HTMLElement | null>(null);

  const cards = useMemo(() => {
    const base = t.apps.items.map((item) => ({ kind: 'app' as const, item }));
    if (OWN_APPS_CONFIG.showEndCard) {
      return [...base, { kind: 'github-end' as const }];
    }
    return base;
  }, [t.apps.items]);

  const cardCount = cards.length;
  const isRtl = locale === 'fa';

  const [metrics, setMetrics] = useState<TrackMetrics>({
    vw: 1440,
    cw: 420,
    gap: 72,
    pad: 510,
  });

  useEffect(() => {
    const measure = () => {
      if (typeof window === 'undefined') return;
      const vw = window.innerWidth;
      const cardEl = firstCardRef.current;
      const trackEl = trackRef.current;

      // Exact CSS formula fallback if DOM hasn't painted yet
      const cssCardW = Math.min(vw * 0.84, Math.max(380, Math.min(vw * 0.29, 560)));
      const cssGap = Math.max(20, Math.min(vw * 0.05, 96));

      const cw = cardEl ? cardEl.offsetWidth : cssCardW;
      let gap = cssGap;
      if (trackEl) {
        const style = window.getComputedStyle(trackEl);
        const parsedGap = parseFloat(style.columnGap || style.gap || '');
        if (Number.isFinite(parsedGap) && parsedGap > 0) {
          gap = parsedGap;
        }
      }
      const pad = Math.max(0, vw * 0.5 - cw * 0.5);

      setMetrics({ vw, cw, gap, pad });
      ScrollTrigger.refresh();
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    let active = true;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (active) measure();
      });
    }

    return () => {
      active = false;
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [locale, cardCount]);

  // Total section height = n * 90vh + 40vh on desktop, shorter touch-friendly span on mobile
  const totalHeightVh =
    cardCount * OWN_APPS_CONFIG.scrollPerCardVh + OWN_APPS_CONFIG.endHoldVh;
  const mobileTotalHeightVh = cardCount * 65 + 30;
  const scrollableSpanVh = Math.max(1, totalHeightVh - 100);
  const holdFrac = Math.min(0.45, OWN_APPS_CONFIG.endHoldVh / scrollableSpanVh);
  const pEff = Math.max(0, Math.min(1, p / Math.max(0.01, 1 - holdFrac)));

  const f = pEff * Math.max(0, cardCount - 1);
  const trackX = computeOwnAppsTrackX(f, cardCount, metrics, isRtl);

  useEffect(() => {
    if (trackRef.current) {
      gsap.set(trackRef.current, { x: trackX });
    }
  }, [trackX]);

  const activeDisplayIdx = Math.min(cardCount, Math.max(1, Math.round(f) + 1));

  return (
    <section
      id="apps"
      data-section="apps"
      data-theme="dark"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('apps') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('apps', `${totalHeightVh}svh`, `${mobileTotalHeightVh}svh`)}
    >
      <div className="pin-sticky flex flex-col justify-center overflow-hidden pt-14 sm:pt-16 pb-20 sm:pb-32">
        {/* Section Header + Live Counter (01 / 04) */}
        <div className="w-full px-4 sm:px-10 lg:px-16 mb-5 sm:mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
              {t.apps.kicker}
            </span>
            <h2 className="mt-1 sm:mt-2 text-xl sm:text-4xl font-extrabold tracking-tight">
              {t.apps.heading}
            </h2>
          </div>
          <span className="font-mono text-xs sm:text-sm opacity-60 tabular-nums shrink-0">
            {String(activeDisplayIdx).padStart(2, '0')} / {String(cardCount).padStart(2, '0')}
          </span>
        </div>

        {/* Mathematically Centered Horizontal Track */}
        <div className="w-full overflow-visible">
          <div
            ref={trackRef}
            className="flex w-max items-center will-change-transform"
            style={{
              gap: 'clamp(20px, 5vw, 96px)',
              paddingInlineStart: `${metrics.pad}px`,
              paddingInlineEnd: `${metrics.pad}px`,
            }}
          >
            {cards.map((entry, idx) => {
              const d = Math.abs(idx - f);
              const isActive = d < 0.5;
              const opacity = Math.max(0.2, Math.min(1, 1 - 0.45 * d));
              const blurPx = Math.min(3.5 * d, 8);
              const scale = OWN_APPS_CONFIG.activeScale - 0.06 * Math.min(d, 1.5);

              const cardStyle: React.CSSProperties = {
                width: 'min(84vw, clamp(300px, 29vw, 560px))',
                height: `clamp(275px, 46svh, ${OWN_APPS_CONFIG.cardHeightPx}px)`,
                transform: `scale(${scale.toFixed(4)})`,
                opacity,
                filter: blurPx > 0.15 ? `blur(${blurPx.toFixed(2)}px)` : 'none',
                borderColor: isActive ? 'rgba(91, 91, 240, 0.6)' : 'var(--hairline)',
                boxShadow: isActive
                  ? '0 24px 60px -24px rgba(91, 91, 240, 0.28)'
                  : 'none',
              };

              if (entry.kind === 'github-end') {
                return (
                  <a
                    key="github-end-card"
                    ref={idx === 0 ? (el) => { firstCardRef.current = el; } : undefined}
                    href={OWN_APPS_CONFIG.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="view"
                    className="flex shrink-0 flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed bg-white/[0.02] p-8 text-center transition-colors duration-300 will-change-transform"
                    style={cardStyle}
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#5B5BF0]">
                      GITHUB
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {locale === 'fa' ? 'همه پروژه‌ها در گیت‌هاب' : 'All projects on GitHub'}
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-[#5B5BF0]" />
                  </a>
                );
              }

              const app = entry.item;

              return (
                <article
                  key={app.id}
                  ref={idx === 0 ? (el) => { firstCardRef.current = el; } : undefined}
                  data-cursor="view"
                  className="flex shrink-0 flex-col justify-between rounded-[var(--radius-lg)] border bg-white/[0.025] p-5 sm:p-9 transition-colors duration-300 will-change-transform"
                  style={cardStyle}
                >
                  <div className="min-h-0">
                    <div className="flex items-center justify-between gap-3 font-mono text-[11px] sm:text-xs">
                      <span className={isActive ? 'text-[#5B5BF0] font-semibold' : 'opacity-50'}>
                        {String(idx + 1).padStart(2, '0')} · {app.year}
                      </span>
                      {isActive ? (
                        <span className="rounded-full border border-[#5B5BF0]/45 bg-[#5B5BF0]/12 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#8F8FFF]">
                          {locale === 'fa' ? 'فعال' : 'ACTIVE'}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="h-5" />
                      )}
                    </div>

                    <h3 className="display-xl mt-3.5 sm:mt-5 text-xl sm:text-4xl truncate">
                      {app.name}
                    </h3>

                    <p className="mt-2 sm:mt-3 text-xs sm:text-base font-medium leading-snug line-clamp-2">
                      {app.tagline}
                    </p>
                    <p className="mt-1.5 sm:mt-2.5 text-xs sm:text-sm font-light opacity-72 leading-relaxed line-clamp-3">
                      {app.detail}
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-t border-[var(--hairline)] pt-3 sm:pt-4">
                    <span className="font-mono text-[10px] sm:text-[11px] opacity-65 truncate max-w-[58%]">
                      {app.stack.join(' · ')}
                    </span>

                    {app.id === 'dastgah' ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playStippleTick();
                          onPlaySynth();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/35 px-3.5 py-1.5 font-mono text-xs font-semibold text-[#5B5BF0] hover:bg-[#5B5BF0] hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{app.urlLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#5B5BF0]">
                        <span>{app.urlLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 06 EXPERIENCE (Light, steps = 5 -> 500svh sticky)
 * - Sticky giant year with vertical DIGIT ROLL cylinder driven by p
 * - Scrolling roles highlighting centered active role
 * - Infinite tech marquee whose velocity reacts to Lenis scrollVelocity
 * ───────────────────────────────────────────────────────────── */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DigitRollYear({ yearFloat }: { yearFloat: number }) {
  const clamped = Math.max(0, Math.min(9999, yearFloat));
  const floorYear = Math.floor(clamped);
  const frac = clamped - floorYear;

  const nextYear = Math.min(9999, floorYear + 1);
  const sCur = String(floorYear).padStart(4, '0');
  const sNext = String(nextYear).padStart(4, '0');

  // Smoothly roll every digit that changes between floorYear and nextYear
  const cols = [0, 1, 2, 3].map((idx) => {
    const a = Number(sCur[idx]);
    const b = Number(sNext[idx]);
    if (a === b) return a;
    if (idx === 3) {
      // Smooth continuous roll on ones digit (handles 9 -> 0 cleanly)
      return a === 9 && b === 0 ? 9 + frac : a + (b - a) * frac;
    }
    // Smooth roll on tens/hundreds only in the final 35% of the transition
    const t = Math.max(0, Math.min(1, (frac - 0.65) / 0.35));
    const smoothT = t * t * (3 - 2 * t);
    return a + (b - a) * smoothT;
  });

  const roundedStr = String(Math.round(clamped)).padStart(4, '0');
  const reelDigits = [...DIGITS, 0];

  return (
    <div
      dir="ltr"
      aria-label={roundedStr}
      className="grid w-full grid-cols-4 items-center font-mono text-[clamp(3rem,min(17vw,22svh),14.5rem)] sm:text-[clamp(3.75rem,min(13.2vw,30svh),14.5rem)] font-black leading-[0.88] tracking-[-0.06em] select-none"
    >
      {cols.map((val, cIdx) => (
        <span
          key={cIdx}
          className="relative flex h-[0.94em] w-full items-start justify-center overflow-hidden"
        >
          <span
            className="flex w-full flex-col will-change-transform transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(0, -${(val / reelDigits.length) * 100}%, 0)`,
            }}
          >
            {reelDigits.map((d, rIdx) => (
              <span
                key={rIdx}
                className="flex h-[0.94em] w-full items-center justify-center leading-none"
              >
                {d}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

function VelocityTechMarquee({ items }: { items: string[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let offset = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const vel = Math.abs(useScrollStore.getState().scrollVelocity);
      // Base speed + proportional acceleration from Lenis scroll velocity
      const speed = 38 + Math.min(340, vel * 5.2);
      offset += speed * dt;

      const el = trackRef.current;
      if (el) {
        const halfW = el.scrollWidth * 0.5;
        if (halfW > 0 && offset >= halfW) {
          offset -= halfW;
        }
        el.style.transform = `translate3d(-${offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const repeated = [...items, ...items];

  return (
    <div
      dir="ltr"
      className="w-full overflow-hidden border-y border-[var(--hairline)] py-3"
    >
      <div
        ref={trackRef}
        className="flex w-max items-center gap-10 whitespace-nowrap font-mono text-xs sm:text-sm tracking-tight opacity-80 will-change-transform"
      >
        {repeated.map((tech, idx) => (
          <span key={`${tech}-${idx}`} className="inline-flex items-center gap-10">
            <span>{tech}</span>
            <span className="h-1 w-1 rounded-full bg-[#5B5BF0]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ExperienceSection({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.experience);

  const roles = t.experience.roles;
  // Smooth continuous interpolation across role years (e.g. 2023 -> 2021 -> 2019 -> 2017)
  const floatIdx = p * (roles.length - 1);
  const lowIdx = Math.floor(floatIdx);
  const highIdx = Math.min(roles.length - 1, lowIdx + 1);
  const frac = floatIdx - lowIdx;
  const yearFloat =
    roles[lowIdx].year + (roles[highIdx].year - roles[lowIdx].year) * frac;
  const activeIdx = Math.round(floatIdx);
  const activeRole = roles[activeIdx] ?? roles[0];

  return (
    <section
      id="experience"
      data-section="experience"
      data-theme="light"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('experience') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('experience', '500svh', '320svh')}
    >
      <div className="pin-sticky flex flex-col justify-between px-4 sm:px-8 lg:px-14 pt-14 sm:pt-20 pb-20 sm:pb-24">
        {/* Top Metadata Strip */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--hairline)] pb-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-xs font-medium text-[#5B5BF0]">
              {t.experience.kicker}
            </span>
            <span className="font-mono text-xs opacity-55">
              {t.experience.sinceLabel}
            </span>
          </div>
          <div className="font-mono text-xs opacity-65 tabular-nums">
            {activeRole?.period} · {activeRole?.location}
          </div>
        </div>

        {/* Main Side-by-Side Split: Giant Rolling Year | Role Descriptions Beside It */}
        <div className="grid w-full flex-1 min-h-0 grid-cols-1 sm:grid-cols-12 items-center gap-6 md:gap-8 lg:gap-12 py-3">
          {/* Side A: Monumental Digit-Roll Year spanning full column width */}
          <div className="sm:col-span-6 lg:col-span-7 flex flex-col justify-center min-w-0">
            <DigitRollYear yearFloat={yearFloat} />

            {/* Subtle 4-chapter progress bar anchored under the year */}
            <div className="mt-4 flex items-center gap-2">
              {roles.map((r, idx) => (
                <span
                  key={r.year}
                  className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                    idx === activeIdx
                      ? 'bg-[#5B5BF0]'
                      : idx < activeIdx
                        ? 'bg-current opacity-40'
                        : 'bg-[var(--hairline)]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Side B: Role Descriptions right beside the year */}
          <div className="sm:col-span-6 lg:col-span-5 flex flex-col justify-center min-w-0">
            {/* Compact Mobile (< sm) active role card */}
            <div className="sm:hidden border-s-2 border-[#5B5BF0] ps-3.5 py-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  {activeRole.role}
                </h3>
                <span className="font-mono text-[11px] text-[#5B5BF0] shrink-0">
                  {activeRole.period}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] opacity-65">
                {activeRole.company} · {activeRole.location}
              </div>
              <p className="mt-2 text-xs font-light leading-relaxed opacity-85 line-clamp-3">
                {activeRole.note}
              </p>
            </div>

            {/* Side-by-Side Roles Stack (sm+) */}
            <div className="hidden sm:flex flex-col gap-3 lg:gap-3.5">
              {roles.map((role, idx) => {
                const dist = Math.abs(idx - floatIdx);
                const isActive = idx === activeIdx;
                const opacity = Math.max(0.28, 1 - dist * 0.42);
                return (
                  <div
                    key={`${role.company}-${role.year}`}
                    className={`border-s-2 ps-4 py-1.5 transition-all duration-300 ${
                      isActive
                        ? 'border-[#5B5BF0]'
                        : 'border-[var(--hairline)]'
                    }`}
                    style={{ opacity }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm lg:text-base font-extrabold tracking-tight leading-snug">
                        {role.role}
                      </h3>
                      <span className="font-mono text-[11px] font-semibold text-[#5B5BF0] tabular-nums shrink-0">
                        {role.period}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] opacity-65 truncate">
                      {role.company} · {role.location}
                    </div>
                    <p
                      className={`mt-1.5 text-xs lg:text-[13px] font-light leading-relaxed opacity-82 ${
                        isActive ? 'line-clamp-3' : 'line-clamp-1'
                      }`}
                    >
                      {role.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Velocity-Reactive Infinite Tech Marquee */}
        <div className="w-full pt-2">
          <VelocityTechMarquee items={t.experience.techStack} />
        </div>
      </div>
    </section>
  );
}
