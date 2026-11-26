'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { HERO_COPY, HERO_PORTRAIT_CONFIG } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { ParticleSlot } from '@/components/ParticleSlot';
import { RotatingBadge } from '@/components/StipplePrimitives';
import { soundEngine } from '@/lib/soundEngine';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ─────────────────────────────────────────────────────────────
 * 00 INTRO (Story mode only, steps = 4 -> 400svh sticky)
 * ───────────────────────────────────────────────────────────── */
export function IntroSection({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.intro);

  const nameCueOpacity = clamp01(1 - (p - 0.24) / 0.14);
  const leadOpacity = clamp01((p - 0.56) / 0.22);
  const leadY = (1 - leadOpacity) * 32;

  return (
    <section
      id="intro"
      data-section="intro"
      data-theme="light"
      data-mobile-height=""
      className="pin-section bg-transparent"
      style={getSingularitySectionStyle('intro', '400svh', '260svh')}
    >
      <div className="pin-sticky flex flex-col items-center justify-center px-4 sm:px-12 md:px-20">
        <div className="relative flex w-full items-center justify-center">
          <ParticleSlot
            slotId="intro-name"
            descriptor={`text:${t.intro.particleWord}`}
            aria-label={t.intro.particleWord}
            className="h-[170px] w-full max-w-[680px] sm:h-[280px]"
          />

          <ParticleSlot
            slotId="intro-portrait"
            descriptor="image:portrait"
            aria-hidden="true"
            className="pointer-events-none absolute h-[280px] w-[210px] sm:h-[460px] sm:w-[345px]"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-22 sm:bottom-28 mx-auto max-w-2xl px-4 sm:px-6 text-center will-change-transform"
          style={{
            opacity: leadOpacity,
            transform: `translate3d(0, ${leadY}px, 0)`,
          }}
        >
          <p className="text-lg sm:text-3xl font-light leading-relaxed tracking-tight text-balance">
            {t.intro.lead}
          </p>
        </div>

        <div
          className="pointer-events-none absolute bottom-18 sm:bottom-20 flex flex-col items-center gap-2 font-mono text-[11px] opacity-60"
          style={{ opacity: nameCueOpacity * 0.65 }}
        >
          <span>{t.intro.scrollCue}</span>
          <ArrowDown className="h-3.5 w-3.5 text-[#5B5BF0]" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 00 HERO — PARTICLE-BY-DEFAULT PORTRAIT WITH LOCALIZED CURSOR PHOTO REVEAL (200svh sticky)
 * - Right/End: Full-height (~100svh, min-h-[720px]) transparent studio portrait:
 *     Default: 100% high-density 135,000-particle WebGL cloud (`SiteParticleStage`)
 *     Hover: Moving the cursor over any region smoothly parts/dissolves ONLY those particles
 *            and reveals the crisp underlying photograph strictly inside the circular cursor lens
 * - Entrance: 1.8s particle assembly -> interactive reveal enabled
 * - Scroll exit: Active photo lens fades out FIRST (p: 0.46..0.64), then particles disperse (p > 0.74)
 * - Theme configurable via `HERO_PORTRAIT_CONFIG.theme` ('light' | 'dark')
 * ───────────────────────────────────────────────────────────── */
export function HeroSection({
  locale,
  onOpenContact,
  heroEntered = true,
}: {
  locale: Locale;
  onOpenContact: () => void;
  heroEntered?: boolean;
}) {
  const t = CONTENT[locale];
  const hero = HERO_COPY[locale];
  const p = useScrollStore((s) => s.sectionProgress.hero);
  const isDarkHero = HERO_PORTRAIT_CONFIG.theme === 'dark';

  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const portraitBoxRef = useRef<HTMLDivElement | null>(null);
  const photoRevealRef = useRef<HTMLDivElement | null>(null);
  const [revealReady, setRevealReady] = useState(false);

  // Scroll-exit choreography: photo lens fades out FIRST (p: 0.46..0.64), BEFORE particles disperse (p > 0.74)
  const faceScrollFade = 1 - clamp01((p - 0.46) / 0.18);
  const faceScrollFadeRef = useRef(faceScrollFade);
  useEffect(() => {
    faceScrollFadeRef.current = faceScrollFade;
  }, [faceScrollFade]);

  const revealReadyRef = useRef(revealReady);
  useEffect(() => {
    revealReadyRef.current = revealReady;
  }, [revealReady]);

  // Entrance choreography: particles assemble -> localized cursor reveal becomes active
  useEffect(() => {
    if (!heroEntered) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const raf = requestAnimationFrame(() => setRevealReady(true));
      return () => cancelAnimationFrame(raf);
    }

    const delayMs = Math.round(HERO_PORTRAIT_CONFIG.enterAssembleSec * 1000);
    const timer = window.setTimeout(() => {
      setRevealReady(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [heroEntered]);

  // Zero-rerender RAF spotlight loop: smoothly follows pointer inside portrait box and reveals ONLY that area
  const lensTargetRef = useRef({ x: 0, y: 0, active: false });
  const wakeLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let rafId = 0;
    let isRunning = false;
    let sx = 0;
    let sy = 0;
    let sr = 0;
    let sAlpha = 0;
    let initialized = false;
    let isHidden = true;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const target = lensTargetRef.current;
      const el = photoRevealRef.current;
      const isAllowed = revealReadyRef.current && faceScrollFadeRef.current > 0.01;
      const maxR =
        typeof window !== 'undefined' && window.innerWidth < 768
          ? HERO_PORTRAIT_CONFIG.revealLensRadiusMobilePx
          : HERO_PORTRAIT_CONFIG.revealLensRadiusPx;

      const wantActive = target.active && isAllowed;
      const wantR = wantActive ? maxR : 0;
      const wantAlpha = wantActive ? faceScrollFadeRef.current : 0;

      if (wantActive && !initialized) {
        sx = target.x;
        sy = target.y;
        initialized = true;
      }

      const posLerp = 1 - Math.exp(-dt * 14);
      const radLerp = 1 - Math.exp(-dt * 11);
      sx += (target.x - sx) * posLerp;
      sy += (target.y - sy) * posLerp;
      sr += (wantR - sr) * radLerp;
      sAlpha += (wantAlpha - sAlpha) * radLerp;

      if (el) {
        if (sr < 0.75 || sAlpha < 0.005) {
          if (!isHidden) {
            el.style.opacity = '0';
            el.style.maskImage = 'none';
            el.style.webkitMaskImage = 'none';
            isHidden = true;
          }
          if (!wantActive) {
            initialized = false;
            isRunning = false;
            return;
          }
        } else {
          isHidden = false;
          const grad = `radial-gradient(circle ${sr.toFixed(1)}px at ${sx.toFixed(1)}px ${sy.toFixed(1)}px, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 52%, rgba(0,0,0,0.48) 78%, rgba(0,0,0,0) 100%)`;
          el.style.opacity = sAlpha.toFixed(3);
          el.style.maskImage = grad;
          el.style.webkitMaskImage = grad;
        }
      }

      rafId = requestAnimationFrame(step);
    };

    const wakeLoop = () => {
      if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(step);
      }
    };
    wakeLoopRef.current = wakeLoop;

    return () => {
      cancelAnimationFrame(rafId);
      wakeLoopRef.current = null;
    };
  }, []);

  // Masked line-by-line entrance on mount / locale switch
  useEffect(() => {
    if (!heroEntered) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll('[data-hero-line]');
        gsap.fromTo(
          lines,
          { yPercent: 112, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.08,
            ease: 'power4.out',
            delay: 0.1,
          }
        );
      }
      if (metaRef.current) {
        const items = metaRef.current.querySelectorAll('[data-hero-fade]');
        gsap.fromTo(
          items,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.72,
            stagger: 0.07,
            ease: 'power3.out',
            delay: 0.35,
          }
        );
      }
    });

    return () => ctx.revert();
  }, [locale, heroEntered]);

  // Track cursor coordinates relative to the portrait box so ONLY the hovered patch reveals the real photo
  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const box = portraitBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const margin = 28;
    const inside =
      lx >= -margin &&
      lx <= rect.width + margin &&
      ly >= -margin &&
      ly <= rect.height + margin;

    if (inside) {
      lensTargetRef.current.x = lx;
      lensTargetRef.current.y = ly;
      lensTargetRef.current.active = true;
      wakeLoopRef.current?.();
    } else {
      lensTargetRef.current.active = false;
      wakeLoopRef.current?.();
    }
  };

  const handleHeroPointerLeave = () => {
    lensTargetRef.current.active = false;
    wakeLoopRef.current?.();
  };

  const handleHeroPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') {
      lensTargetRef.current.active = false;
      wakeLoopRef.current?.();
    }
  };

  const disperseExit = clamp01((p - 0.74) / 0.24);
  const contentOpacity = 1 - disperseExit * 0.78;
  const scrollHintOpacity = clamp01(1 - p * 4.5);

  const renderLineWithHighlight = (line: string) => {
    const target = hero.highlightWord;
    const idx = line.indexOf(target);
    if (idx === -1) return line;
    const before = line.slice(0, idx);
    const after = line.slice(idx + target.length);
    return (
      <>
        {before}
        <span className="text-[#5B5BF0] underline decoration-dotted decoration-[#5B5BF0]/75 underline-offset-[0.14em] decoration-2">
          {target}
        </span>
        {after}
      </>
    );
  };

  const inkText = isDarkHero ? 'text-[#ECEAE6]' : 'text-[#111111]';
  const mutedText = isDarkHero ? 'text-[#ECEAE6]/70' : 'text-[#111111]/72';
  const subtleText = isDarkHero ? 'text-[#ECEAE6]/55' : 'text-[#111111]/58';
  const chipClasses = isDarkHero
    ? 'border-white/15 bg-white/8 text-[#ECEAE6]/85'
    : 'border-[#111111]/12 bg-white/60 text-[#111111]/82';
  const dividerBorder = isDarkHero ? 'border-white/12' : 'border-[#111111]/10';

  return (
    <section
      id="hero"
      data-section="hero"
      data-theme={HERO_PORTRAIT_CONFIG.theme}
      data-mobile-height=""
      className="pin-section bg-transparent"
      style={getSingularitySectionStyle('hero', '200svh', '145svh')}
    >
      <div
        onPointerMove={handleHeroPointerMove}
        onPointerDown={handleHeroPointerMove}
        onPointerUp={handleHeroPointerUp}
        onPointerCancel={handleHeroPointerLeave}
        onPointerLeave={handleHeroPointerLeave}
        className="pin-sticky relative flex flex-col justify-between overflow-hidden px-4 sm:px-10 lg:px-16 pt-16 sm:pt-20 pb-20 sm:pb-28"
      >
        {/* Right/End Full-Height Portrait Stage (desktop: particles + cursor reveal; mobile: static photo) */}
        <div
          aria-label={
            locale === 'fa'
              ? 'پرتره سهیل فیضی'
              : 'Portrait of Soheil Feizi'
          }
          className="pointer-events-none absolute inset-y-0 end-0 z-10 flex w-full items-end justify-center lg:w-[56vw] xl:w-[52vw] lg:justify-center lg:pe-8 xl:pe-16"
        >
          <div
            ref={portraitBoxRef}
            className="relative h-[100svh] lg:min-h-[720px] w-full max-w-[540px] sm:max-w-[600px] lg:max-w-[700px] opacity-32 sm:opacity-45 lg:opacity-100"
          >
            {/* Mobile: always-visible static photo (no particle cloud below md) */}
            <div className="pointer-events-none absolute inset-0 z-10 md:hidden">
              <Image
                src={HERO_PORTRAIT_CONFIG.cutoutSrc}
                alt={t.person.fullName}
                fill
                priority
                sizes="100vw"
                referrerPolicy="no-referrer"
                className="object-cover object-top select-none"
                style={{ filter: 'contrast(1.04)' }}
              />
            </div>

            {/* Desktop: Localized Cursor-Masked Real Photograph (hidden by default; reveals ONLY inside cursor lens) */}
            <div
              ref={photoRevealRef}
              className="pointer-events-none absolute inset-0 z-10 hidden will-change-[opacity] md:block"
              style={{ opacity: 0 }}
            >
              <Image
                src={HERO_PORTRAIT_CONFIG.cutoutSrc}
                alt={t.person.fullName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
                referrerPolicy="no-referrer"
                className="object-cover object-top select-none"
                style={{
                  filter: 'contrast(1.04)',
                }}
              />
            </div>

            {/* Desktop: Pixel-locked WebGL Particle Cloud Slot */}
            <ParticleSlot
              slotId="hero-portrait"
              descriptor="image:portrait"
              className="pointer-events-none absolute inset-0 z-0 hidden md:block"
            />

            {/* Soft bottom fade scrim so lower chest bleeds organically into viewport bottom */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[18%]"
              style={{
                background:
                  'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* Main Editorial Column (z-20 above portrait so text & CTA remain razor-sharp) */}
        <div
          className="relative z-20 my-auto grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12"
          style={{ opacity: contentOpacity }}
        >
          <div className="lg:col-span-7 flex flex-col items-start min-w-0">
            <span
              className={`font-mono text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] ${subtleText}`}
            >
              {hero.kicker}
            </span>

            <h1
              ref={headlineRef}
              className={`mt-3 sm:mt-5 w-full font-extrabold tracking-[-0.045em] leading-[0.98] sm:leading-[0.96] ${inkText} text-[clamp(2.1rem,8.6vw,6.6rem)]`}
            >
              {hero.lines.map((line, i) => (
                <span key={`${locale}-${i}`} className="block overflow-hidden py-[0.04em]">
                  <span data-hero-line className="block will-change-transform">
                    {renderLineWithHighlight(line)}
                  </span>
                </span>
              ))}
            </h1>

            <div ref={metaRef} className="mt-4 sm:mt-7 w-full max-w-xl">
              <p
                data-hero-fade
                className={`text-xs sm:text-base lg:text-lg font-normal leading-relaxed ${mutedText}`}
              >
                {hero.subline}
              </p>

              <div data-hero-fade className="mt-5 sm:mt-7 flex flex-wrap items-center gap-2.5 sm:gap-4">
                <button
                  type="button"
                  data-cursor="view"
                  onClick={() => {
                    soundEngine.playStippleTick();
                    onOpenContact();
                  }}
                  className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#5B5BF0] px-5 py-2.5 sm:px-7 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-[0_12px_32px_rgba(91,91,240,0.34)] transition-all duration-200 hover:bg-[#4949DC] hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <span>{hero.ctaLabel}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>

                {/* Booking status chip with subtle blinking green dot */}
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-medium backdrop-blur-sm ${chipClasses}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)] animate-booking-dot shrink-0"
                  />
                  <span>{hero.bookingChip}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: 3 Compact Stats (Start) + Scroll Indicator with Animated Line (Center) */}
        <div
          className={`relative z-20 flex flex-wrap items-end justify-between gap-4 sm:gap-6 pt-3 sm:pt-4 border-t ${dividerBorder}`}
          style={{ opacity: contentOpacity }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-10">
            {hero.stats.map((item) => (
              <div key={item.label} className="flex items-baseline gap-1.5 sm:gap-2">
                <span
                  className={`font-mono text-lg sm:text-2xl font-extrabold tracking-tight tabular-nums ${inkText}`}
                >
                  {item.value}
                </span>
                <span
                  className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.14em] ${subtleText}`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom-Center Animated Scroll Cue */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden md:flex flex-col items-center gap-2 absolute start-1/2 -translate-x-1/2 bottom-0 transition-opacity duration-300"
            style={{ opacity: scrollHintOpacity }}
          >
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.22em] ${subtleText}`}
            >
              {hero.scrollLabel}
            </span>
            <div
              className={`relative h-8 w-[1.5px] overflow-hidden rounded-full ${
                isDarkHero ? 'bg-white/15' : 'bg-[#111111]/15'
              }`}
            >
              <span className="block h-full w-full rounded-full bg-[#5B5BF0] animate-scroll-line" />
            </div>
          </div>

          <span className={`hidden sm:inline-block font-mono text-[11px] ${subtleText}`}>
            {t.person.location}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 01 ABOUT ME (steps = 3 -> 300svh sticky)
 * ───────────────────────────────────────────────────────────── */
export function AboutSection({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.about);

  const wordTokens = useMemo(() => {
    const out: Array<{ word: string; bold: boolean }> = [];
    for (const part of t.about.statementParts) {
      const split = part.text.trim().split(/\s+/).filter(Boolean);
      for (const w of split) {
        out.push({ word: w, bold: Boolean(part.bold) });
      }
    }
    return out;
  }, [t.about.statementParts]);

  const revealCount = Math.floor(
    clamp01((p - 0.02) / 0.52) * wordTokens.length
  );
  const statsOpacity = clamp01((p - 0.16) / 0.24);
  const countProgress = clamp01((p - 0.2) / 0.45);

  return (
    <section
      id="about"
      data-section="about"
      data-theme="light"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('about') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('about', '300svh', '210svh')}
    >
      <div className="pin-sticky flex flex-col justify-center px-4 sm:px-10 lg:px-16 pt-16 pb-20 sm:py-16">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-8">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[11px] sm:text-xs font-medium text-[#5B5BF0]">
                {t.about.kicker}
              </span>

              <p className="mt-3 sm:mt-5 text-lg sm:text-4xl lg:text-[2.65rem] leading-[1.34] sm:leading-[1.32] tracking-tight text-balance">
                {wordTokens.map((tok, idx) => {
                  const lit = idx <= revealCount;
                  return (
                    <span
                      key={`${tok.word}-${idx}`}
                      className={`inline-block me-[0.26em] transition-opacity duration-300 ${
                        tok.bold ? 'font-extrabold' : 'font-light'
                      }`}
                      style={{ opacity: lit ? 1 : 0.16 }}
                    >
                      {tok.word}
                    </span>
                  );
                })}
              </p>
            </div>

            <div className="shrink-0 self-end sm:self-start pt-0 sm:pt-3">
              <RotatingBadge
                text={t.about.badgeText}
                rotationDeg={p * 360}
                className="h-24 w-24 sm:h-40 sm:w-40 md:h-48 md:w-48"
              >
                <ParticleSlot
                  slotId="about-trophy"
                  descriptor="svg:trophy"
                  aria-label={locale === 'fa' ? 'جام ذره‌ای' : 'Particle trophy'}
                  className="pointer-events-none absolute inset-[18%]"
                />
              </RotatingBadge>
            </div>
          </div>

          <div
            className="mt-5 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
            style={{ opacity: Math.max(0.25, statsOpacity) }}
          >
            {t.about.stats.map((stat) => {
              const liveVal = Math.round(stat.value * Math.max(0.15, countProgress));
              return (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white/35 p-3.5 sm:p-6 flex flex-col justify-between backdrop-blur-[2px]"
                >
                  <div className="font-mono text-2xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-[var(--ink)]">
                    <span className="text-[#5B5BF0]">{stat.prefix ?? ''}</span>
                    <span>{liveVal}</span>
                    <span className="text-[#5B5BF0]">{stat.suffix ?? ''}</span>
                  </div>

                  <div className="mt-2 sm:mt-4">
                    <div className="text-xs sm:text-sm font-bold tracking-tight">
                      {stat.label}
                    </div>
                    <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-light opacity-65 line-clamp-2">
                      {stat.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
