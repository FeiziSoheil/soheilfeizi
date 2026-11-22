import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLabStore } from '@/lib/lab/labStore';
import { labAudio } from '@/lib/lab/labAudio';
import { ScrollEngineMetrics } from '@/lib/lab/types';

gsap.registerPlugin(ScrollTrigger);

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function easeInOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

export class ScrollEngine {
  private lenis: Lenis | null = null;
  private tickerCb: ((time: number) => void) | null = null;
  private reducedMotion = false;

  // Physics state
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
  private anchorYs: number[] = [];

  // Per-layer critically damped / exponential springs
  private pParticles = 0;
  private pText = 0;
  private pTheme = 0;
  private pChrome = 0;

  // External gate hints written by TransitionDirector
  private seedRubberBandActive = false;
  private slowMoWindowActive = false;
  private lastFrameTime = 0;

  private onFrameCallback: ((metrics: ScrollEngineMetrics, dt: number) => void) | null = null;

  constructor(onFrame?: (metrics: ScrollEngineMetrics, dt: number) => void) {
    this.onFrameCallback = onFrame ?? null;
  }

  public setGateHints(inSeedWindow: boolean, inAssembleSlowMo: boolean) {
    this.seedRubberBandActive = inSeedWindow;
    this.slowMoWindowActive = inAssembleSlowMo;
  }

  public setAnchorPositions(ys: number[]) {
    this.anchorYs = ys;
  }

  public mount() {
    if (typeof window === 'undefined') return;
    this.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    useLabStore.getState().setReducedMotion(this.reducedMotion);

    this.measureBounds();
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
      const { params } = useLabStore.getState();
      this.lenis = new Lenis({
        lerp: params.lerp,
        wheelMultiplier: 0.62,
        smoothWheel: true,
        syncTouch: false,
        touchMultiplier: 1.15,
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

  public measureBounds() {
    if (typeof document === 'undefined') return;
    this.maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
  }

  /**
   * Distance-scaled smooth programmatic navigation (1.2s .. 2.4s, easeInOutExpo)
   * Activates high-speed particle tunnel streak mode along the trajectory.
   */
  public scrollToY(destY: number, opts?: { instant?: boolean; duration?: number }) {
    const clampedY = Math.max(0, Math.min(this.maxScroll, destY));
    if (this.reducedMotion || !this.lenis || opts?.instant) {
      window.scrollTo({ top: clampedY, behavior: 'auto' });
      return;
    }

    const dist = Math.abs(clampedY - this.pos);
    const ratio = Math.min(1, dist / Math.max(1, this.maxScroll));
    const duration = opts?.duration ?? 1.2 + ratio * 1.2;

    this.isSnapping = false;
    this.isTunneling = dist > window.innerHeight * 0.45;
    this.impulse = Math.min(1, this.impulse + 0.55);

    this.lenis.scrollTo(clampedY, {
      duration,
      easing: easeInOutExpo,
      onComplete: () => {
        this.isTunneling = false;
      },
    });
  }

  public scrollToProgress(normProgress: number, instant = false) {
    this.measureBounds();
    this.scrollToY(Math.max(0, Math.min(1, normProgress)) * this.maxScroll, {
      instant,
    });
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
    this.measureBounds();
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
    // Never hijack browser shortcuts (Ctrl+F, Cmd+R, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const vh = window.innerHeight;
    let delta = 0;
    if (e.code === 'Space') {
      delta = (e.shiftKey ? -1 : 1) * vh * 0.78;
    } else if (e.code === 'PageDown') {
      delta = vh * 0.88;
    } else if (e.code === 'PageUp') {
      delta = -vh * 0.88;
    } else if (e.code === 'ArrowDown') {
      delta = vh * 0.28;
    } else if (e.code === 'ArrowUp') {
      delta = -vh * 0.28;
    } else {
      return;
    }

    e.preventDefault();
    this.impulse = Math.min(1, this.impulse + 0.45);
    this.idleMs = 0;
    this.lenis.scrollTo(
      Math.max(0, Math.min(this.maxScroll, this.target + delta)),
      { duration: 0.72, easing: easeOutQuint }
    );
  };

  private stepFrame() {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    const state = useLabStore.getState();
    const params = state.params;

    // 1. Decay impulse with configurable half-life (default 220ms)
    const halfLifeSec = Math.max(0.04, params.velocityDecay / 1000);
    this.impulse *= Math.pow(0.5, dt / halfLifeSec);
    if (this.impulse < 0.001) this.impulse = 0;

    // 2. Rubber-band gate lerp during Seed window (never traps resolute high-impulse scroll)
    const inGate = !this.reducedMotion && this.seedRubberBandActive && this.impulse < 0.72;
    const inSlowMo = !this.reducedMotion && this.slowMoWindowActive && this.impulse < 0.65;
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

    // Clamp normalized speed (0..1)
    const rawSpeed = Math.min(1, Math.abs(this.velocity) / 42);
    this.speedNorm += (rawSpeed - this.speedNorm) * (1 - Math.exp(-dt * 12));
    if (this.speedNorm < 0.0005) this.speedNorm = 0;

    const isScrolling = Math.abs(this.velocity) > 0.35 || this.impulse > 0.05;
    if (isScrolling) {
      this.idleMs = 0;
    } else {
      this.idleMs += dt * 1000;
    }

    // 3. Per-layer critically damped / exponential springs with optional slow-mo dilation
    const totalProgress = Math.max(
      0,
      Math.min(1, this.maxScroll > 0 ? this.pos / this.maxScroll : 0)
    );

    if (this.reducedMotion) {
      this.pParticles = totalProgress;
      this.pText = totalProgress;
      this.pTheme = totalProgress;
      this.pChrome = totalProgress;
    } else {
      const dilation = inSlowMo ? params.timeDilation : 1.0;
      const dtEff = dt * dilation;
      this.pParticles +=
        (totalProgress - this.pParticles) *
        (1 - Math.exp(-dtEff * params.springParticles));
      this.pText +=
        (totalProgress - this.pText) *
        (1 - Math.exp(-dtEff * params.springText));
      this.pTheme +=
        (totalProgress - this.pTheme) *
        (1 - Math.exp(-dtEff * params.springTheme));
      this.pChrome +=
        (totalProgress - this.pChrome) *
        (1 - Math.exp(-dt * params.springChrome));
    }

    // 4. Haptic-like audio ticks every tickSpacing px (if audio enabled & degradation < 2)
    if (
      state.soundEnabled &&
      state.degradationLevel < 2 &&
      !this.reducedMotion &&
      Math.abs(this.pos - this.lastTickPos) >= Math.max(40, params.tickSpacing)
    ) {
      this.lastTickPos = this.pos;
      labAudio.playScrollTick(this.speedNorm);
    }

    // 5. Section boundary thump & light mobile vibration (8ms)
    if (this.anchorYs.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < this.anchorYs.length; i++) {
        const d = Math.abs(this.pos - this.anchorYs[i]);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      if (this.lastBoundaryIndex !== -1 && nearestIdx !== this.lastBoundaryIndex) {
        if (state.soundEnabled && state.degradationLevel < 2) {
          labAudio.playBoundaryThump(this.speedNorm);
        }
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.vibrate === 'function' &&
          !this.reducedMotion
        ) {
          try {
            navigator.vibrate(8);
          } catch {
            // ignore unsupported vibration context
          }
        }
      }
      this.lastBoundaryIndex = nearestIdx;
    }

    // 6. Soft-snap near scene anchors (±snapZone * vh) when user releases scroll gently
    if (
      !this.reducedMotion &&
      this.lenis &&
      !this.isUserTouching &&
      !this.isSnapping &&
      !this.isTunneling &&
      this.idleMs > 150 &&
      Math.abs(this.velocity) < 1.1 &&
      this.impulse < 0.04 &&
      Math.abs(this.pos - this.lastSnapCheckPos) > 12 &&
      this.anchorYs.length > 0
    ) {
      const snapRadius = window.innerHeight * params.snapZone;
      for (const ay of this.anchorYs) {
        const delta = Math.abs(this.pos - ay);
        if (delta > 6 && delta <= snapRadius) {
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
      inSlowMo,
      isScrolling,
      isTunneling: this.isTunneling,
      pParticles: this.pParticles,
      pText: this.pText,
      pTheme: this.pTheme,
      pChrome: this.pChrome,
    };

    this.onFrameCallback?.(metrics, dt);
  }
}
