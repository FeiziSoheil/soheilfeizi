import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionId } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { labAudio } from '@/lib/lab/labAudio';
import {
  BloomPhase,
  BloomState,
  MagnetPhase,
  MagnetTransitionState,
  ScrollEngineMetrics,
  ThemeKind,
} from '@/lib/lab/types';

gsap.registerPlugin(ScrollTrigger);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeInOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

interface MeasuredSection {
  id: SectionId;
  theme: ThemeKind;
  top: number;
  height: number;
  isSticky: boolean;
  anchorNorm: { x: number; y: number };
}

interface ThemeBoundary {
  boundaryY: number;
  direction: 'light-to-dark' | 'dark-to-light';
  fromAnchor: { x: number; y: number };
  toAnchor: { x: number; y: number };
}

const SECTION_ANCHORS: Record<SectionId, { x: number; y: number }> = {
  intro: { x: 0.5, y: 0.5 },
  hero: { x: 0.72, y: 0.5 },
  about: { x: 0.5, y: 0.5 },
  whatido: { x: 0.66, y: 0.5 },
  process: { x: 0.5, y: 0.48 },
  work: { x: 0.3, y: 0.5 },
  apps: { x: 0.5, y: 0.52 },
  experience: { x: 0.28, y: 0.5 },
  statement: { x: 0.5, y: 0.5 },
  testimonial: { x: 0.72, y: 0.5 },
  afterhours: { x: 0.5, y: 0.5 },
  ask: { x: 0.5, y: 0.5 },
  contact: { x: 0.5, y: 0.62 },
};

/**
 * PortfolioDirector — Unified ScrollEngine (Lenis + GSAP ticker) + TransitionDirector
 * for the full 13-section bilingual portfolio.
 * - Zero getBoundingClientRect() inside scroll frames (sections measured strictly on mount/resize/mode change)
 * - Drives Seed -> Bloom -> Settle (Light->Dark) and Implosion (Dark->Light) across EVERY theme boundary
 * - Drives 4-phase Magnet field lines, per-layer springs, impulse decay, and haptic-like audio ticks
 */
export class PortfolioDirector {
  private lenis: Lenis | null = null;
  private tickerCb: ((time: number) => void) | null = null;
  private reducedMotion = false;

  private sections: MeasuredSection[] = [];
  private boundaries: ThemeBoundary[] = [];
  private anchorYs: number[] = [];

  // Physics scroll state
  private pos = 0;
  private target = 0;
  private maxScroll = 1;
  private velocity = 0;
  private speedNorm = 0;
  private dir: 1 | -1 = 1;
  private impulse = 0;
  private lastTickPos = 0;
  private lastSnapCheckPos = 0;
  private idleMs = 0;
  private isUserTouching = false;
  private isSnapping = false;
  private isTunneling = false;
  private lastBoundaryIndex = -1;
  private lastBloomPhase: BloomPhase = 'none';
  private soundEnabled = false;

  // Per-layer exponential springs
  private pParticles = 0;
  private pText = 0;
  private pTheme = 0;
  private pChrome = 0;
  private lastFrameTime = 0;
  private seedRubberBandActive = false;

  public setSoundEnabled(on: boolean) {
    this.soundEnabled = on;
  }

  public mount() {
    if (typeof window === 'undefined') return;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.measureSections();

    this.pos = window.scrollY;
    this.target = window.scrollY;
    this.lastTickPos = this.pos;
    const initP = this.maxScroll > 0 ? this.pos / this.maxScroll : 0;
    this.pParticles = initP;
    this.pText = initP;
    this.pTheme = initP;
    this.pChrome = initP;
    this.lastFrameTime = performance.now();

    if (!this.reducedMotion) {
      const { params } = useScrollStore.getState();
      this.lenis = new Lenis({
        lerp: params.lerp,
        wheelMultiplier: 0.62,
        smoothWheel: true,
        syncTouch: true,
        touchInertiaExponent: 1.65,
        touchMultiplier: 1.25,
      });

      this.lenis.on('scroll', () => {
        ScrollTrigger.update();
      });

      this.tickerCb = (timeSec: number) => {
        this.lenis?.raf(timeSec * 1000);
        this.stepFrame();
      };
      gsap.ticker.add(this.tickerCb);
      gsap.ticker.lagSmoothing(0);
    } else {
      window.addEventListener('scroll', this.onNativeScroll, { passive: true });
      this.tickerCb = () => this.stepFrame();
      gsap.ticker.add(this.tickerCb);
    }

    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
  }

  public destroy() {
    if (this.tickerCb) {
      gsap.ticker.remove(this.tickerCb);
      this.tickerCb = null;
    }
    this.lenis?.destroy();
    this.lenis = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onNativeScroll);
      window.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('resize', this.onResize);
    }
  }

  public measureSections() {
    if (typeof document === 'undefined') return;
    const vh = window.innerHeight;
    this.maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const scrollY = window.scrollY;

    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    this.sections = els.map((el) => {
      const id = el.dataset.section as SectionId;
      const theme = (el.dataset.theme as ThemeKind) || 'light';
      const r = el.getBoundingClientRect();
      return {
        id,
        theme,
        top: r.top + scrollY,
        height: r.height,
        isSticky: el.classList.contains('pin-section'),
        anchorNorm: SECTION_ANCHORS[id] ?? { x: 0.5, y: 0.5 },
      };
    });

    this.anchorYs = this.sections.map((s) => Math.max(0, Math.min(this.maxScroll, s.top)));

    this.boundaries = [];
    for (let i = 1; i < this.sections.length; i++) {
      const prev = this.sections[i - 1];
      const curr = this.sections[i];
      if (prev.theme !== curr.theme) {
        this.boundaries.push({
          boundaryY: curr.top,
          direction: curr.theme === 'dark' ? 'light-to-dark' : 'dark-to-light',
          fromAnchor: prev.anchorNorm,
          toAnchor: curr.anchorNorm,
        });
      }
    }
    ScrollTrigger.refresh();
  }

  public scrollToY(destY: number, opts?: { instant?: boolean; duration?: number }) {
    const clampedY = Math.max(0, Math.min(this.maxScroll, destY));
    if (this.reducedMotion || !this.lenis || opts?.instant) {
      window.scrollTo({ top: clampedY, behavior: 'auto' });
      return;
    }
    const dist = Math.abs(clampedY - this.pos);
    const ratio = Math.min(1, dist / Math.max(1, this.maxScroll));
    const duration = opts?.duration ?? 1.05 + ratio * 1.15;

    this.isSnapping = false;
    this.isTunneling = dist > window.innerHeight * 0.6;
    this.impulse = Math.min(1, this.impulse + 0.5);

    this.lenis.scrollTo(clampedY, {
      duration,
      easing: easeInOutExpo,
      onComplete: () => {
        this.isTunneling = false;
      },
    });
  }

  public scrollToSection(id: SectionId) {
    const sec = this.sections.find((s) => s.id === id);
    if (sec) {
      this.scrollToY(sec.top);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      this.scrollToY(el.getBoundingClientRect().top + window.scrollY);
    }
  }

  public scrollToSectionStep(id: SectionId, stepIdx: number, totalSteps: number) {
    const sec = this.sections.find((s) => s.id === id);
    if (!sec) return;
    const vh = window.innerHeight;
    const scrollableSpan = Math.max(0, sec.height - vh);
    const targetP = (stepIdx + 0.12) / Math.max(1, totalSteps);
    this.scrollToY(sec.top + scrollableSpan * targetP, { duration: 0.95 });
  }

  private onNativeScroll = () => {
    const prev = this.pos;
    this.pos = window.scrollY;
    this.target = this.pos;
    this.velocity = this.pos - prev;
    if (Math.abs(this.velocity) > 0.1) {
      this.dir = this.velocity >= 0 ? 1 : -1;
    }
  };

  private onWheel = (e: WheelEvent) => {
    const mag = Math.min(1, Math.abs(e.deltaY) / 140);
    this.impulse = Math.min(1, this.impulse + mag * 0.55);
    this.idleMs = 0;
    this.isSnapping = false;
    this.isTunneling = false;
  };

  private onTouchStart = () => {
    this.isUserTouching = true;
    this.idleMs = 0;
    this.isSnapping = false;
    this.isTunneling = false;
  };

  private onTouchEnd = () => {
    this.isUserTouching = false;
    this.impulse = Math.min(1, this.impulse + 0.3);
  };

  private onResize = () => {
    this.measureSections();
    ScrollTrigger.refresh();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.reducedMotion || !this.lenis) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    ) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const vh = window.innerHeight;
    let delta = 0;
    if (e.code === 'Space') delta = (e.shiftKey ? -1 : 1) * vh * 0.78;
    else if (e.code === 'PageDown') delta = vh * 0.88;
    else if (e.code === 'PageUp') delta = -vh * 0.88;
    else if (e.code === 'ArrowDown') delta = vh * 0.28;
    else if (e.code === 'ArrowUp') delta = -vh * 0.28;
    else return;

    e.preventDefault();
    this.impulse = Math.min(1, this.impulse + 0.45);
    this.idleMs = 0;
    this.lenis.scrollTo(Math.max(0, Math.min(this.maxScroll, this.target + delta)), {
      duration: 0.72,
      easing: easeOutQuint,
    });
  };

  private stepFrame() {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    const st = useScrollStore.getState();
    const params = st.params;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. Impulse half-life decay
    const halfLifeSec = Math.max(0.04, params.velocityDecay / 1000);
    this.impulse *= Math.pow(0.5, dt / halfLifeSec);
    if (this.impulse < 0.001) this.impulse = 0;

    // 2. Rubber-band gate lerp during Seed window (never traps strong scroll)
    const inGate = !this.reducedMotion && this.seedRubberBandActive && this.impulse < 0.72;
    const activeLerp = inGate ? params.gateLerp : params.lerp;

    if (this.lenis) {
      this.lenis.options.lerp = activeLerp;
      this.pos = this.lenis.scroll;
      this.target = this.lenis.targetScroll;
      this.velocity = this.lenis.velocity;
      if (Math.abs(this.velocity) > 0.08) {
        this.dir = this.velocity >= 0 ? 1 : -1;
      }
    }

    const rawSpeed = Math.min(1, Math.abs(this.velocity) / 42);
    this.speedNorm += (rawSpeed - this.speedNorm) * (1 - Math.exp(-dt * 12));
    if (this.speedNorm < 0.0005) this.speedNorm = 0;

    const isScrolling = Math.abs(this.velocity) > 0.35 || this.impulse > 0.05;
    if (isScrolling) this.idleMs = 0;
    else this.idleMs += dt * 1000;

    const totalProgress = clamp01(this.maxScroll > 0 ? this.pos / this.maxScroll : 0);

    if (this.reducedMotion) {
      this.pParticles = totalProgress;
      this.pText = totalProgress;
      this.pTheme = totalProgress;
      this.pChrome = totalProgress;
    } else {
      this.pParticles += (totalProgress - this.pParticles) * (1 - Math.exp(-dt * params.springParticles));
      this.pText += (totalProgress - this.pText) * (1 - Math.exp(-dt * params.springText));
      this.pTheme += (totalProgress - this.pTheme) * (1 - Math.exp(-dt * params.springTheme));
      this.pChrome += (totalProgress - this.pChrome) * (1 - Math.exp(-dt * params.springChrome));
    }

    // 3. Haptic-like subtle scroll ticks when audio is active
    if (
      this.soundEnabled &&
      st.degradationLevel < 2 &&
      !this.reducedMotion &&
      Math.abs(this.pos - this.lastTickPos) >= Math.max(50, params.tickSpacing)
    ) {
      this.lastTickPos = this.pos;
      labAudio.playScrollTick(this.speedNorm);
    }

    // 4. Compute exact progress for every section purely from Lenis smoothed `this.pos`
    const sectionProgress: Record<SectionId, number> = { ...st.sectionProgress };
    let activeSection: SectionId = this.sections[0]?.id ?? 'hero';
    let activeSectionTheme: ThemeKind = this.sections[0]?.theme ?? 'light';
    let activeSecIdx = 0;
    const probeY = this.pos + vh * 0.42;

    for (let i = 0; i < this.sections.length; i++) {
      const sec = this.sections[i];
      if (sec.isSticky) {
        const span = Math.max(1, sec.height - vh);
        sectionProgress[sec.id] = clamp01((this.pos - sec.top) / span);
      } else {
        const startY = sec.top - vh * 0.65;
        const endY = sec.top + sec.height - vh * 0.35;
        sectionProgress[sec.id] = clamp01((this.pos - startY) / Math.max(1, endY - startY));
      }

      if (probeY >= sec.top) {
        activeSection = sec.id;
        activeSectionTheme = sec.theme;
        activeSecIdx = i;
      }
    }

    if (this.lastBoundaryIndex !== -1 && activeSecIdx !== this.lastBoundaryIndex) {
      if (this.soundEnabled && st.degradationLevel < 2) {
        labAudio.playBoundaryThump(this.speedNorm);
      }
    }
    this.lastBoundaryIndex = activeSecIdx;

    // 5. Evaluate Seed -> Bloom -> Settle (Light->Dark) & Implosion (Dark->Light) across ALL theme boundaries
    const maxRadius = Math.hypot(vw, vh) * 1.04;
    const themeScrollY = this.pTheme * this.maxScroll;
    const halfWinPx = vh * 0.58;

    let bloom: BloomState = {
      active: false,
      direction: 'none',
      phase: 'none',
      progress: 0,
      originX: vw * 0.5,
      originY: vh * 0.5,
      radius: activeSectionTheme === 'dark' ? maxRadius : 0,
      maxRadius,
      darkCovered: activeSectionTheme === 'dark',
      grainPulse: 0,
    };

    const activeSecObj = this.sections[activeSecIdx];
    const activeAnchorPx = {
      x: vw * (activeSecObj?.anchorNorm.x ?? 0.5),
      y: vh * (activeSecObj?.anchorNorm.y ?? 0.5),
    };

    let magnet: MagnetTransitionState = {
      active: false,
      progress: 0,
      phase: 'idle',
      reversed: this.dir < 0,
      anchorFromPx: activeAnchorPx,
      anchorToPx: activeAnchorPx,
      G: 0.72,
      S: 0.52,
      delaySpread: 0.2,
      settle: 'assemble',
      coreAlpha: 0,
      ringProgress: 0,
      fieldLineAlpha: 0,
    };

    let inSeed = false;
    let themeLerp = activeSectionTheme === 'dark' ? 1 : 0;

    for (const b of this.boundaries) {
      const startY = b.boundaryY - halfWinPx;
      const endY = b.boundaryY + halfWinPx * 0.75;
      if (themeScrollY >= startY && themeScrollY <= endY) {
        const tp = clamp01((themeScrollY - startY) / Math.max(1, endY - startY));
        const smoothTp = tp * tp * (3 - 2 * tp);
        themeLerp = b.direction === 'light-to-dark' ? smoothTp : 1 - smoothTp;
        const isUp = this.dir < 0;
        const fromA = isUp ? b.toAnchor : b.fromAnchor;
        const toA = isUp ? b.fromAnchor : b.toAnchor;
        const effP = isUp ? 1 - tp : tp;

        magnet = this.buildMagnetState(
          effP,
          isUp,
          { x: vw * fromA.x, y: vh * fromA.y },
          { x: vw * toA.x, y: vh * toA.y }
        );

        if (b.direction === 'light-to-dark') {
          let phase: BloomPhase = 'seed';
          let radius = 0;
          let grainPulse = 0;
          if (tp < 0.24) {
            phase = 'seed';
            inSeed = true;
            radius = (tp / 0.24) * 14;
          } else if (tp < 0.82) {
            phase = 'bloom';
            const bp = clamp01((tp - 0.24) / 0.58);
            radius = 14 + easeInOutQuart(bp) * (maxRadius - 14);
          } else {
            phase = 'settle';
            const sp = clamp01((tp - 0.82) / 0.18);
            radius = maxRadius;
            grainPulse = Math.sin(sp * Math.PI);
          }

          bloom = {
            active: true,
            direction: 'light-to-dark',
            phase,
            progress: tp,
            originX: vw * b.toAnchor.x,
            originY: vh * b.toAnchor.y,
            radius,
            maxRadius,
            darkCovered: tp >= 0.82,
            grainPulse,
          };
        } else {
          let phase: BloomPhase = 'implosion';
          let radius = 0;
          let grainPulse = 0;
          if (tp < 0.78) {
            phase = 'implosion';
            const ip = clamp01(tp / 0.78);
            radius = (1 - easeInOutQuart(ip)) * maxRadius;
            if (ip > 0.65) inSeed = true;
          } else {
            phase = 'settle';
            const sp = clamp01((tp - 0.78) / 0.22);
            radius = 0;
            grainPulse = Math.sin(sp * Math.PI);
          }

          bloom = {
            active: true,
            direction: 'dark-to-light',
            phase,
            progress: tp,
            originX: vw * b.toAnchor.x,
            originY: vh * b.toAnchor.y,
            radius,
            maxRadius,
            darkCovered: false,
            grainPulse,
          };
        }
        break;
      }
    }

    this.seedRubberBandActive = inSeed;

    if (this.soundEnabled && st.degradationLevel < 2) {
      if (bloom.phase === 'seed' && this.lastBloomPhase !== 'seed') {
        labAudio.playSeedWhoosh(this.speedNorm);
      } else if (
        (bloom.phase === 'bloom' && this.lastBloomPhase !== 'bloom') ||
        (bloom.phase === 'implosion' && this.lastBloomPhase !== 'implosion')
      ) {
        labAudio.playBloomPulse(this.speedNorm);
      }
    }
    this.lastBloomPhase = bloom.phase;

    // Soft-snap gently near section tops when user releases scroll
    if (
      !this.reducedMotion &&
      this.lenis &&
      !this.isUserTouching &&
      !this.isSnapping &&
      !this.isTunneling &&
      this.idleMs > 180 &&
      Math.abs(this.velocity) < 0.9 &&
      this.impulse < 0.04 &&
      Math.abs(this.pos - this.lastSnapCheckPos) > 16 &&
      this.anchorYs.length > 0
    ) {
      const snapRadius = vh * params.snapZone;
      for (const ay of this.anchorYs) {
        const delta = Math.abs(this.pos - ay);
        if (delta > 8 && delta <= snapRadius) {
          this.isSnapping = true;
          this.lastSnapCheckPos = ay;
          this.lenis.scrollTo(ay, {
            duration: Math.max(0.5, params.snapDuration / 1000),
            easing: easeOutQuint,
            onComplete: () => {
              this.isSnapping = false;
            },
          });
          break;
        }
      }
    }

    const resolvedTheme: ThemeKind = themeLerp >= 0.5 ? 'dark' : 'light';

    const metrics: ScrollEngineMetrics = {
      pos: this.pos,
      target: this.target,
      maxScroll: this.maxScroll,
      totalProgress,
      velocity: this.velocity,
      speedNorm: this.speedNorm,
      dir: this.dir,
      impulse: this.impulse,
      activeLerp,
      inGate,
      inSlowMo: false,
      isScrolling,
      isTunneling: this.isTunneling,
      pParticles: this.pParticles,
      pText: this.pText,
      pTheme: this.pTheme,
      pChrome: this.pChrome,
    };

    st.updateEngineFrame({
      activeSection,
      theme: resolvedTheme,
      themeLerp,
      totalProgress,
      scrollPos: this.pos,
      scrollVelocity: this.velocity,
      speedNorm: this.speedNorm,
      scrollDir: this.dir,
      sectionProgress,
      scroll: metrics,
      magnet,
      bloom,
    });
  }

  private buildMagnetState(
    P: number,
    reversed: boolean,
    anchorFromPx: { x: number; y: number },
    anchorToPx: { x: number; y: number }
  ): MagnetTransitionState {
    let phase: MagnetPhase = 'idle';
    let coreAlpha = 0;
    let ringProgress = 0;
    let fieldLineAlpha = 0;

    if (P <= 0.15) {
      phase = 'anticipation';
      coreAlpha = clamp01(P / 0.15);
    } else if (P < 0.7) {
      phase = P >= 0.3 ? 'field-lines' : 'pull';
      coreAlpha = 1.0;
    } else {
      phase = 'settle';
      const sp = clamp01((P - 0.7) / 0.3);
      coreAlpha = 1 - sp;
      ringProgress = sp;
    }

    if (P >= 0.3 && P <= 0.8) {
      const fp = (P - 0.3) / 0.5;
      fieldLineAlpha = Math.sin(fp * Math.PI);
    }

    return {
      active: true,
      progress: P,
      phase,
      reversed,
      anchorFromPx,
      anchorToPx,
      G: 0.72,
      S: reversed ? -0.52 : 0.52,
      delaySpread: 0.2,
      settle: 'assemble',
      coreAlpha,
      ringProgress,
      fieldLineAlpha,
    };
  }
}
