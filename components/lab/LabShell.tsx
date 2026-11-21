'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Volume2, VolumeX, ArrowUpRight, Compass } from 'lucide-react';
import { LAB_TIMELINE } from '@/lib/lab/timeline';
import { ScrollEngine } from '@/lib/lab/scrollEngine';
import { TransitionDirector } from '@/lib/lab/transitionDirector';
import { useLabStore } from '@/lib/lab/labStore';
import { labAudio } from '@/lib/lab/labAudio';
import { labElementAnchors } from '@/lib/lab/elementAnchors';
import LabScrollIndicator from '@/components/lab/LabScrollIndicator';
import LabCursor from '@/components/lab/LabCursor';
import portraitAsset from '@/src/assets/images/soheil_editorial_portrait_1795200948891.jpg';

const LabCanvasL0 = dynamic(() => import('@/components/lab/LabCanvasL0'), {
  ssr: false,
});

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function useBloomReveal(
  elRef: React.RefObject<HTMLElement | null>,
  bloomRadius: number,
  bloomOriginX: number,
  bloomOriginY: number,
  darkCovered: boolean,
  reducedMotion: boolean
): number {
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = elRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const stickyParent = el.closest('.pin-sticky');
      const parentTop = stickyParent ? stickyParent.getBoundingClientRect().top : 0;
      setCenter({
        x: r.left + r.width * 0.5,
        y: r.top - parentTop + r.height * 0.5,
      });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [elRef]);

  if (reducedMotion || darkCovered) return 1;
  if (!center) return 0;
  const dist = Math.hypot(center.x - bloomOriginX, center.y - bloomOriginY);
  return clamp01((bloomRadius - dist + 35) / 140);
}

/**
 * Registers an element box with labElementAnchors ONLY via ResizeObserver/resize
 * (zero per-frame getBoundingClientRect!) so Morph particles lock 1:1 to DOM.
 */
function LabAnchorBox({
  anchorId,
  className = '',
  children,
}: {
  anchorId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    labElementAnchors.register(anchorId, el);
    return () => {
      labElementAnchors.register(anchorId, null);
    };
  }, [anchorId]);

  return (
    <div ref={ref} data-lab-anchor={anchorId} className={className}>
      {children}
    </div>
  );
}

export default function LabShell() {
  const locale = useLabStore((s) => s.locale);
  const mode = useLabStore((s) => s.mode);
  const soundEnabled = useLabStore((s) => s.soundEnabled);
  const activeSceneId = useLabStore((s) => s.activeSceneId);
  const activeSceneIndex = useLabStore((s) => s.activeSceneIndex);
  const activeTheme = useLabStore((s) => s.activeTheme);
  const fps = useLabStore((s) => s.fps);
  const degradationLevel = useLabStore((s) => s.degradationLevel);
  const scroll = useLabStore((s) => s.scroll);
  const magnet = useLabStore((s) => s.magnet);
  const bloom = useLabStore((s) => s.bloom);
  const telemetry = useLabStore((s) => s.telemetry);
  const params = useLabStore((s) => s.params);
  const reducedMotion = useLabStore((s) => s.reducedMotion);

  const setLocale = useLabStore((s) => s.setLocale);
  const setMode = useLabStore((s) => s.setMode);
  const setSoundEnabled = useLabStore((s) => s.setSoundEnabled);
  const updateParam = useLabStore((s) => s.updateParam);

  const engineRef = useRef<ScrollEngine | null>(null);
  const darkHeadRef = useRef<HTMLHeadingElement | null>(null);
  const darkCard1Ref = useRef<HTMLDivElement | null>(null);
  const darkCard2Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    const raf = requestAnimationFrame(() => labElementAnchors.remeasureAll());
    return () => cancelAnimationFrame(raf);
  }, [locale]);

  useEffect(() => {
    const director = new TransitionDirector(LAB_TIMELINE);
    const engine = new ScrollEngine((metrics) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const res = director.evaluate(metrics, vw, vh);
      engine.setGateHints(res.inSeedWindow, res.inAssembleSlowMo);

      useLabStore.getState().updateDirectorFrame({
        activeSceneId: res.activeSceneId,
        activeSceneIndex: res.activeSceneIndex,
        activeTheme: res.activeTheme,
        localP: res.localP,
        scroll: metrics,
        magnet: res.magnet,
        bloom: res.bloom,
      });
    });

    engineRef.current = engine;
    engine.mount();

    const computeAnchors = () => {
      engine.measureBounds();
      labElementAnchors.remeasureAll();
      const maxS = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      engine.setAnchorPositions([0, maxS * 0.48, maxS * 0.92]);
    };

    computeAnchors();
    window.addEventListener('resize', computeAnchors);

    return () => {
      window.removeEventListener('resize', computeAnchors);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // lil-gui with Stabilization Patch controls + "Freeze simulation" + ScrollEngine controls
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let guiInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    void import('lil-gui').then(({ default: GUI }) => {
      if (cancelled) return;
      const gui = new GUI({ title: '/lab Stabilization & Physics' });
      gui.domElement.style.zIndex = '60';
      gui.domElement.style.top = '54px';

      const proxy = { ...useLabStore.getState().params };

      const fStab = gui.addFolder('Stabilization Patch');
      fStab
        .add(proxy, 'freezeSimulation')
        .name('Freeze simulation')
        .onChange((v: boolean) => updateParam('freezeSimulation', v));
      fStab
        .add(proxy, 'omega', 10, 14, 0.25)
        .name('Spring ω (10-14)')
        .onChange((v: number) => updateParam('omega', v));
      fStab
        .add(proxy, 'settleZeta', 0.7, 1.0, 0.02)
        .name('Settle ζ (0.8)')
        .onChange((v: number) => updateParam('settleZeta', v));
      fStab
        .add(proxy, 'assembleDurationMs', 700, 900, 20)
        .name('Assemble (ms)')
        .onChange((v: number) => updateParam('assembleDurationMs', v));
      fStab
        .add(proxy, 'microVibAmp', 0, 0.4, 0.05)
        .name('Micro-vib (px)')
        .onChange((v: number) => updateParam('microVibAmp', v));
      fStab.open();

      const fMag = gui.addFolder('Magnet & Bloom');
      fMag.add(proxy, 'G', 0.1, 2.5, 0.05).name('Gravity G').onChange((v: number) => updateParam('G', v));
      fMag.add(proxy, 'S', 0.0, 2.0, 0.05).name('Swirl S').onChange((v: number) => updateParam('S', v));
      fMag.add(proxy, 'shellThickness', 12, 90, 2).name('shell thickness').onChange((v: number) => updateParam('shellThickness', v));
      fMag.add(proxy, 'duration', 0.6, 1.8, 0.05).name('duration').onChange((v: number) => updateParam('duration', v));
      fMag.close();

      const fScroll = gui.addFolder('ScrollEngine Feel');
      fScroll.add(proxy, 'lerp', 0.02, 0.2, 0.005).name('lerp').onChange((v: number) => updateParam('lerp', v));
      fScroll.add(proxy, 'gateLerp', 0.01, 0.07, 0.005).name('gateLerp (Seed)').onChange((v: number) => updateParam('gateLerp', v));
      fScroll.add(proxy, 'springParticles', 2, 16, 0.5).name('spring: particles').onChange((v: number) => updateParam('springParticles', v));
      fScroll.add(proxy, 'springText', 2, 20, 0.5).name('spring: text').onChange((v: number) => updateParam('springText', v));
      fScroll.add(proxy, 'springTheme', 2, 14, 0.5).name('spring: theme').onChange((v: number) => updateParam('springTheme', v));
      fScroll.add(proxy, 'springChrome', 4, 24, 0.5).name('spring: chrome').onChange((v: number) => updateParam('springChrome', v));
      fScroll.add(proxy, 'skewMax', 0, 6, 0.2).name('skewMax (deg)').onChange((v: number) => updateParam('skewMax', v));
      fScroll.add(proxy, 'rgbSplitMax', 0, 4, 0.1).name('rgbSplitMax (px)').onChange((v: number) => updateParam('rgbSplitMax', v));
      fScroll.add(proxy, 'snapZone', 0.04, 0.22, 0.01).name('snapZone').onChange((v: number) => updateParam('snapZone', v));
      fScroll.add(proxy, 'snapDuration', 500, 1400, 20).name('snapDuration (ms)').onChange((v: number) => updateParam('snapDuration', v));
      fScroll.add(proxy, 'timeDilation', 0.3, 1.0, 0.05).name('timeDilation').onChange((v: number) => updateParam('timeDilation', v));
      fScroll.add(proxy, 'tickSpacing', 50, 240, 10).name('tickSpacing (px)').onChange((v: number) => updateParam('tickSpacing', v));
      fScroll.add(proxy, 'velocityDecay', 80, 500, 10).name('velocityDecay (ms)').onChange((v: number) => updateParam('velocityDecay', v));
      fScroll.close();

      guiInstance = gui;
    });

    return () => {
      cancelled = true;
      guiInstance?.destroy();
    };
  }, [updateParam]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    labAudio.setEnabled(next);
  };

  const velSigned = reducedMotion
    ? 0
    : Math.max(-1, Math.min(1, scroll.velocity / 34));
  const headingSkewY = velSigned * params.skewMax;
  const headingScaleY = 1 + scroll.speedNorm * 0.06;
  const headingWeight = Math.round(800 - scroll.speedNorm * 200);

  const imgParallaxY = reducedMotion ? 0 : (scroll.pText - 0.15) * -16;
  const imgScale = reducedMotion ? 1 : 1 + scroll.speedNorm * 0.04;

  const darkHeadReveal = useBloomReveal(
    darkHeadRef,
    bloom.radius,
    bloom.originX,
    bloom.originY,
    bloom.darkCovered,
    reducedMotion
  );
  const darkCard1Reveal = useBloomReveal(
    darkCard1Ref,
    bloom.radius,
    bloom.originX,
    bloom.originY,
    bloom.darkCovered,
    reducedMotion
  );
  const darkCard2Reveal = useBloomReveal(
    darkCard2Ref,
    bloom.radius,
    bloom.originX,
    bloom.originY,
    bloom.darkCovered,
    reducedMotion
  );

  const darkClipPath = reducedMotion
    ? activeTheme === 'dark'
      ? 'circle(150% at 50% 50%)'
      : 'circle(0px at 50% 50%)'
    : bloom.darkCovered
      ? 'circle(150% at 50% 50%)'
      : bloom.active
        ? `circle(${bloom.radius.toFixed(1)}px at ${bloom.originX.toFixed(1)}px ${bloom.originY.toFixed(1)}px)`
        : 'circle(0px at 50% 50%)';

  const pillCompact = scroll.isScrolling && scroll.dir > 0 && !reducedMotion;

  const currentPhaseLabel = bloom.active
    ? `${bloom.direction === 'dark-to-light' ? 'IMPLOSION' : 'BLOOM'} · ${bloom.phase.toUpperCase()}`
    : magnet.active
      ? `MAGNET · ${magnet.phase.toUpperCase()}`
      : telemetry.assembleState.toUpperCase();

  const settledPass = telemetry.settledPct >= 95 && telemetry.avgVelPxSec < 2.0;

  return (
    <div
      className="relative min-h-screen w-full text-[#141414]"
      style={
        {
          '--x': `${bloom.originX}px`,
          '--y': `${bloom.originY}px`,
          '--r': `${bloom.radius}px`,
        } as React.CSSProperties
      }
    >
      {/* LAYER 0a: Warm Light Paper Base */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#ECEBE7]"
      />

      {/* LAYER 0b: Independent Dark Layer revealed strictly by Seed->Bloom / Implosion clip-path */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] bg-[#0A0A0A] will-change-[clip-path]"
        style={{ clipPath: darkClipPath }}
      />

      {/* LAYER 0c: Single Fixed WebGL2 Canvas */}
      <LabCanvasL0 />

      {/* Subtle Grain Overlay */}
      <div
        aria-hidden="true"
        className="grain-overlay"
        style={{
          opacity: 0.06 + scroll.speedNorm * 0.04 + bloom.grainPulse * 0.12,
        }}
      />

      {/* LAYER 2: Custom Physics Cursor + 120px Particle Scrollbar */}
      <LabCursor />
      <LabScrollIndicator
        onScrubProgress={(p) => engineRef.current?.scrollToProgress(p)}
      />

      {/* LAYER 2: Top Hairline Progress + Mandatory Stabilization Debug HUD (mix-blend-mode: difference) */}
      <div className="pointer-events-none fixed top-0 inset-x-0 z-40 mix-blend-difference text-white">
        <div className="h-[2px] w-full bg-white/15">
          <div
            className="h-full bg-white"
            style={{ width: `${(scroll.pChrome * 100).toFixed(2)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 font-mono text-[11px]">
          <div className="pointer-events-auto flex items-center gap-3">
            <span className="font-bold tracking-wider">/LAB · STABILIZED</span>
            <span className="opacity-50">|</span>
            <Link
              href="/"
              data-cursor="link"
              className="inline-flex items-center gap-1 opacity-80 hover:opacity-100 underline underline-offset-4"
            >
              <span>{locale === 'fa' ? 'پورتفولیو' : 'Main Site'}</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mandatory Patch §7 Telemetry: FPS, settled %, avg |vel| px/s, free particles */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 tabular-nums">
            <span>
              FPS:{' '}
              <strong>
                {fps}
                {degradationLevel > 0 ? ` (L${degradationLevel})` : ''}
              </strong>
            </span>
            <span className="border border-white/40 px-1.5 py-0.5">
              SETTLED:{' '}
              <strong>{telemetry.settledPct.toFixed(1)}%</strong>
              {settledPass ? ' ✓' : ''}
            </span>
            <span>
              AVG |VEL|: <strong>{telemetry.avgVelPxSec.toFixed(2)} px/s</strong>
            </span>
            <span>
              FREE: <strong>{telemetry.freeCount}</strong>
            </span>
            <span className="hidden md:inline">
              T: <strong>{telemetry.assembleElapsedMs}ms</strong>
            </span>
            <span className="hidden lg:inline">
              P: <strong>{scroll.pParticles.toFixed(3)}</strong>
            </span>
            <span className="border border-white/40 px-2 py-0.5 text-[10px]">
              {params.freezeSimulation ? 'FROZEN' : currentPhaseLabel}
            </span>
          </div>
        </div>
      </div>

      {/* LAYER 2: Vertical 90-degree active label */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-24 start-5 z-40 hidden lg:flex flex-col items-center gap-3 mix-blend-difference text-white"
      >
        <span className="vertical-label font-mono text-[10px] uppercase tracking-[0.22em] opacity-80">
          {activeSceneIndex} — {currentPhaseLabel}
        </span>
        <span className="h-8 w-[1px] bg-white/40" />
      </div>

      {/* LAYER 2: Bottom Interactive Pill */}
      <div className="pointer-events-none fixed bottom-5 inset-x-0 z-40 flex items-center justify-center px-4">
        <div
          className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1 border border-white/30 bg-black/20 px-2.5 py-1.5 backdrop-blur-md mix-blend-difference text-white font-mono text-[11px] transition-all duration-300"
          style={{
            transform: pillCompact ? 'scale(0.92) translateY(4px)' : 'scale(1)',
            opacity: pillCompact ? 0.52 : 1,
          }}
        >
          <button
            type="button"
            data-cursor="link"
            onClick={() => engineRef.current?.scrollToProgress(0.02)}
            className={`px-2 py-1 cursor-pointer transition-opacity ${
              activeSceneId === 'lab-light-a' ? 'underline underline-offset-4 font-bold' : 'opacity-70 hover:opacity-100'
            }`}
          >
            01 Light
          </button>
          <button
            type="button"
            data-cursor="link"
            onClick={() => engineRef.current?.scrollToProgress(0.31)}
            className="px-2 py-1 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Seed→Bloom
          </button>
          <button
            type="button"
            data-cursor="link"
            onClick={() => engineRef.current?.scrollToProgress(0.5)}
            className={`px-2 py-1 cursor-pointer transition-opacity ${
              activeSceneId === 'lab-dark-b' ? 'underline underline-offset-4 font-bold' : 'opacity-70 hover:opacity-100'
            }`}
          >
            02 Dark
          </button>
          <button
            type="button"
            data-cursor="link"
            onClick={() => engineRef.current?.scrollToProgress(0.73)}
            className="px-2 py-1 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Implosion
          </button>
          <button
            type="button"
            data-cursor="link"
            onClick={() => engineRef.current?.scrollToProgress(0.95)}
            className={`px-2 py-1 cursor-pointer transition-opacity ${
              activeSceneId === 'lab-light-c' ? 'underline underline-offset-4 font-bold' : 'opacity-70 hover:opacity-100'
            }`}
          >
            03 Settle
          </button>

          <span className="h-3.5 w-[1px] bg-white/30 mx-1" />

          <button
            type="button"
            data-cursor="link"
            onClick={() => updateParam('freezeSimulation', !params.freezeSimulation)}
            className={`px-2 py-1 cursor-pointer ${
              params.freezeSimulation ? 'bg-white text-black font-bold' : 'opacity-85 hover:opacity-100'
            }`}
          >
            {params.freezeSimulation ? 'Unfreeze' : 'Freeze'}
          </button>

          <button
            type="button"
            data-cursor="link"
            onClick={() => setMode(mode === 'story' ? 'site' : 'story')}
            className="px-2 py-1 opacity-85 hover:opacity-100 cursor-pointer"
          >
            {mode === 'story' ? 'Story' : 'Site'}
          </button>

          <button
            type="button"
            data-cursor="link"
            onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
            className="px-2 py-1 font-bold cursor-pointer"
          >
            {locale === 'fa' ? 'EN' : 'FA'}
          </button>

          <button
            type="button"
            data-cursor="link"
            onClick={toggleSound}
            aria-label="Toggle physics audio"
            className="inline-flex items-center gap-1 px-2 py-1 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 opacity-60" />}
            <span className="hidden sm:inline">{soundEnabled ? 'SFX ON' : 'SFX'}</span>
          </button>
        </div>
      </div>

      {/* LAYER 1: Sticky Sections with Element-Locked Anchor Boxes */}
      <main className="relative z-20">
        {/* SCENE 01 — LIGHT (#ECEBE7) */}
        <section
          id="lab-light-a"
          className="pin-section"
          style={{ height: '300svh' }}
        >
          <div className="pin-sticky flex items-center px-6 sm:px-10 lg:px-16 pt-20 pb-24">
            <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <span className="font-mono text-xs text-[#5B5BF0]">
                  {locale === 'fa'
                    ? '۰۱ · قفل مختصات محلی و فنر بحرانی میرا'
                    : '01 · ELEMENT-LOCKED LOCAL SPACE & CRITICALLY DAMPED SPRING'}
                </span>

                <h1
                  className="mt-4 tracking-[-0.04em] leading-[0.98] text-balance will-change-transform text-[#141414]"
                  style={{
                    fontSize: 'clamp(48px, 7.6vw, 120px)',
                    fontWeight: headingWeight,
                    transform: `skewY(${headingSkewY.toFixed(2)}deg) scaleY(${headingScaleY.toFixed(3)})`,
                  }}
                >
                  {locale === 'fa' ? 'آرام، قفل و پایدار.' : 'Still, Locked & Crisp.'}
                </h1>

                <p className="mt-6 max-w-xl text-sm sm:text-base font-light leading-relaxed text-[#141414]/80">
                  {locale === 'fa'
                    ? 'ذرات دیاگرام سمت مقابل در مختصات محلی ذخیره و از همان مقدار اسکرول Lenis قفل شده‌اند. پس از حدود ۸۰۰ میلی‌ثانیه روی ۱۰۰٪ Settled قفل می‌شوند و با اسکرول آهسته بدون یک پیکسل لرزش همراه المان حرکت می‌کنند.'
                    : 'Particles in the diagram box live strictly in element-local coordinates driven by the exact Lenis scroll value. Within ~800ms they snap to 100% Settled with zero drift on slow scroll.'}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs text-[#141414]/75">
                  <button
                    type="button"
                    data-cursor="link"
                    onClick={() => engineRef.current?.scrollToProgress(0.35)}
                    className="inline-flex items-center gap-2 border border-[#141414]/25 px-4 py-2.5 hover:border-[#5B5BF0] hover:text-[#5B5BF0] transition-colors cursor-pointer"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>
                      {locale === 'fa'
                        ? 'تست Seed → Bloom (۰۲ تیره)'
                        : 'Test Seed → Bloom (02 Dark)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Dedicated Element-Locked Diagram Anchor + Separate Opaque Portrait */}
              <div className="lg:col-span-6 flex items-center justify-center gap-6">
                <LabAnchorBox
                  anchorId="lab-light-a"
                  className="relative h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] border border-[#141414]/15"
                >
                  <span className="absolute bottom-2.5 start-3 font-mono text-[10px] text-[#141414]/45">
                    LOCAL ELEMENT A · uElementOrigin
                  </span>
                </LabAnchorBox>

                <div className="hidden xl:block relative aspect-[3/4] w-[170px] border border-[#141414]/15 overflow-hidden shrink-0">
                  <div
                    className="relative h-[116%] w-full -top-[8%] will-change-transform"
                    style={{
                      transform: `translate3d(0, ${imgParallaxY.toFixed(1)}%, 0) scale(${imgScale.toFixed(3)})`,
                    }}
                  >
                    <Image
                      src={portraitAsset}
                      alt="Parallax test portrait"
                      fill
                      priority
                      sizes="180px"
                      referrerPolicy="no-referrer"
                      className="object-cover object-top opacity-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 02 — DARK (#0A0A0A) */}
        <section
          id="lab-dark-b"
          className="pin-section"
          style={{ height: '450svh' }}
        >
          <div className="pin-sticky flex flex-col justify-center px-6 sm:px-10 lg:px-16 pt-20 pb-24 text-[#ECEBE7]">
            <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span
                  className="font-mono text-xs text-[#8F8FFF] transition-opacity duration-200"
                  style={{ opacity: darkHeadReveal }}
                >
                  {locale === 'fa'
                    ? '۰۲ · شکوفایی تیره (Seed → Bloom → Settle)'
                    : '02 · SEED → BLOOM → SETTLE'}
                </span>

                <h2
                  ref={darkHeadRef}
                  className="mt-4 tracking-[-0.04em] leading-[0.98] text-balance will-change-transform"
                  style={{
                    fontSize: 'clamp(48px, 8vw, 130px)',
                    fontWeight: headingWeight,
                    opacity: darkHeadReveal,
                    transform: `translate3d(0, ${((1 - darkHeadReveal) * 24).toFixed(1)}px, 0) skewY(${headingSkewY.toFixed(2)}deg) scaleY(${headingScaleY.toFixed(3)})`,
                  }}
                >
                  {locale === 'fa' ? 'نور از دل تاریکی.' : 'Light Inside Dark.'}
                </h2>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div
                    ref={darkCard1Ref}
                    className="border border-[#ECEBE7]/15 p-5"
                    style={{
                      opacity: darkCard1Reveal,
                      transform: `translate3d(0, ${((1 - darkCard1Reveal) * 20).toFixed(1)}px, 0)`,
                    }}
                  >
                    <div className="font-mono text-[11px] text-[#8F8FFF]">
                      01 / TIME-BASED ASSEMBLE
                    </div>
                    <p className="mt-2 text-xs sm:text-sm font-light leading-relaxed text-[#ECEBE7]/80">
                      {locale === 'fa'
                        ? 'شکل‌گیری المان بر اساس تایملاین ۸۰۰ms و پس از ۱۲۰ms debounce سرعت اسکرول شروع می‌شود؛ ذرات قبل از assemble با alpha=0 پنهان‌اند.'
                        : 'Element assembly triggers on an 800ms easeOutCubic timeline after a 120ms low-speed debounce; idle Morph particles stay hidden (alpha 0).'}
                    </p>
                  </div>

                  <div
                    ref={darkCard2Ref}
                    className="border border-[#ECEBE7]/15 p-5"
                    style={{
                      opacity: darkCard2Reveal,
                      transform: `translate3d(0, ${((1 - darkCard2Reveal) * 20).toFixed(1)}px, 0)`,
                    }}
                  >
                    <div className="font-mono text-[11px] text-[#8F8FFF]">
                      02 / MAX 6PX STRETCH & 6% ACCENT
                    </div>
                    <p className="mt-2 text-xs sm:text-sm font-light leading-relaxed text-[#ECEBE7]/80">
                      {locale === 'fa'
                        ? 'کشیدگی سرعتی برای ذرات settled دقیقاً صفر و برای متحرک‌ها حداکثر ۶px است؛ اثر سرعت اسکرول فقط روی ۱۸۰۰ ذره‌ی Dust اعمال می‌شود.'
                        : 'Velocity stretch is strictly 0 for settled particles and capped at 6px for moving ones; scroll velocity stretches Dust only.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <LabAnchorBox
                  anchorId="lab-dark-b"
                  className="relative h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] border border-[#ECEBE7]/15"
                >
                  <span className="absolute bottom-2.5 start-3 font-mono text-[10px] text-[#ECEBE7]/45">
                    LOCAL ELEMENT B · TORUS
                  </span>
                </LabAnchorBox>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 03 — LIGHT (#ECEBE7) */}
        <section
          id="lab-light-c"
          className="pin-section"
          style={{ height: '350svh' }}
        >
          <div className="pin-sticky flex items-center px-6 sm:px-10 lg:px-16 pt-20 pb-24 text-[#141414]">
            <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
                <LabAnchorBox
                  anchorId="lab-light-c"
                  className="relative h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] border border-[#141414]/15"
                >
                  <span className="absolute bottom-2.5 start-3 font-mono text-[10px] text-[#141414]/45">
                    LOCAL ELEMENT C · LATTICE
                  </span>
                </LabAnchorBox>
              </div>

              <div className="lg:col-span-7 order-1 lg:order-2">
                <span className="font-mono text-xs text-[#5B5BF0]">
                  {locale === 'fa'
                    ? '۰۳ · درون‌پاشی (Implosion) و تثبیت دقیق'
                    : '03 · DARK → LIGHT IMPLOSION & SETTLE'}
                </span>

                <h2
                  className="mt-4 tracking-[-0.04em] leading-[0.98] text-balance will-change-transform"
                  style={{
                    fontSize: 'clamp(48px, 7.6vw, 120px)',
                    fontWeight: headingWeight,
                    transform: `skewY(${headingSkewY.toFixed(2)}deg) scaleY(${headingScaleY.toFixed(3)})`,
                  }}
                >
                  {locale === 'fa' ? 'بازگشت به کاغذ.' : 'Return to Paper.'}
                </h2>

                <p className="mt-6 max-w-xl text-sm sm:text-base font-light leading-relaxed text-[#141414]/80">
                  {locale === 'fa'
                    ? 'برای عیب‌یابی ایزوله، دکمه‌ی Freeze را در نوار پایین یا پنل lil-gui بزن و آهسته اسکرول کن: می‌بینی ذرات بدون یک پیکسل لغزش روی قاب المان قفل می‌مانند.'
                    : 'Toggle Freeze simulation in lil-gui or the bottom bar and scroll gently: particles stay pixel-locked to the element frame with zero jitter.'}
                </p>

                <div className="mt-8">
                  <button
                    type="button"
                    data-cursor="link"
                    onClick={() => engineRef.current?.scrollToProgress(0)}
                    className="border border-[#141414]/25 px-5 py-2.5 font-mono text-xs hover:border-[#5B5BF0] hover:text-[#5B5BF0] transition-colors cursor-pointer"
                  >
                    {locale === 'fa' ? 'بازگشت نرم به ابتدا ↑' : 'Smooth Scroll to Top ↑'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
