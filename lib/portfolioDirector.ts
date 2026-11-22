import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionId } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { particleRegistry } from '@/lib/particleRegistry';
import { labAudio } from '@/lib/lab/labAudio';
import {
  BloomState,
  MagnetPhase,
  MagnetTransitionState,
  ScrollEngineMetrics,
  ThemeKind,
} from '@/lib/lab/types';
import {
  computeMaxCoverRadius,
  computeSingularityRadiusNorm,
  getIncomingTransition,
  getOutgoingTransition,
  SINGULARITY_TRANSITIONS,
  SingularityRuntimeState,
  SingularityTransitionConfig,
} from '@/lib/singularity.config';

gsap.registerPlugin(ScrollTrigger);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

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

type SectionBhRole = 'none' | 'outer' | 'inner' | 'hidden';

interface MeasuredSection {
  id: SectionId;
  theme: ThemeKind;
  el: HTMLElement;
  clipTarget: HTMLElement;
  top: number;
  height: number;
  stickyHeight: number;
  isSticky: boolean;
  anchorNorm: { x: number; y: number };
  incoming?: SingularityTransitionConfig;
  outgoing?: SingularityTransitionConfig;
  contentStart: number;
  contentEnd: number;
  incomingStartY: number | null;
  outgoingEndY: number | null;
}

interface MeasuredSingularityBoundary {
  config: SingularityTransitionConfig;
  from: MeasuredSection;
  to: MeasuredSection;
  startY: number;
  endY: number;
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
 * PortfolioDirector — Unified ScrollEngine (Lenis + GSAP ticker) + Singularity Transition Engine.
 * - Zero getBoundingClientRect() inside scroll frames (sections measured strictly on mount/resize/mode change)
 * - Drives scrubbed, reversible Black Hole (light->dark) and White Hole (dark->light) transitions
 *   on real single-DOM overlapping sticky sections via CSS custom properties (`--bh-x`, `--bh-y`, `--bh-r`)
 * - Zero DOM duplication, zero color fade/bleed, zero layout jump, compatible with Lenis & prefers-reduced-motion
 */
export class PortfolioDirector {
  private lenis: Lenis | null = null;
  private tickerCb: ((time: number) => void) | null = null;
  private reducedMotion = false;
  private reducedMotionMq: MediaQueryList | null = null;

  private sections: MeasuredSection[] = [];
  private boundaries: MeasuredSingularityBoundary[] = [];
  private anchorYs: number[] = [];
  private sectionRoles = new Map<SectionId, SectionBhRole>();

  // Pointer & origin tracking
  private pointerNorm = { x: 0.5, y: 0.5 };
  private hasPointer = false;
  private lockedOrigins = new Map<string, { x: number; y: number }>();
  private lastActiveBoundaryId: string | null = null;

  // Cached last written CSS custom properties to avoid redundant style mutations
  private lastCssX = '';
  private lastCssY = '';
  private lastCssR = '';
  private lastCssRMask = '';
  private lastCssAccent = '';

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
  private soundEnabled = false;

  // Per-layer exponential springs
  private pParticles = 0;
  private pText = 0;
  private pTheme = 0;
  private pChrome = 0;
  private lastFrameTime = 0;

  public setSoundEnabled(on: boolean) {
    this.soundEnabled = on;
    labAudio.setEnabled(on);
    if (!on) {
      labAudio.stopSingularityDrone();
    }
  }

  public mount() {
    if (typeof window === 'undefined') return;
    this.reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.reducedMotionMq.matches;
    this.reducedMotionMq.addEventListener('change', this.onReducedMotionChange);

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

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);

    // Run an immediate initial frame so initial clip/hide states are applied before first paint
    this.stepFrame();
  }

  public destroy() {
    if (this.tickerCb) {
      gsap.ticker.remove(this.tickerCb);
      this.tickerCb = null;
    }
    this.lenis?.destroy();
    this.lenis = null;

    labAudio.stopSingularityDrone();

    for (const sec of this.sections) {
      sec.clipTarget.classList.remove('bh-layer-outer', 'bh-layer-inner', 'bh-layer-hidden');
    }
    this.sectionRoles.clear();

    if (typeof document !== 'undefined') {
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--bh-r', '0px');
      rootStyle.setProperty('--bh-r-mask', '0px');
    }

    if (typeof window !== 'undefined') {
      this.reducedMotionMq?.removeEventListener('change', this.onReducedMotionChange);
      window.removeEventListener('scroll', this.onNativeScroll);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('orientationchange', this.onResize);
    }
  }

  private onReducedMotionChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
    if (this.reducedMotion) {
      labAudio.stopSingularityDrone();
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    this.pointerNorm = {
      x: Math.max(0.16, Math.min(0.84, e.clientX / vw)),
      y: Math.max(0.2, Math.min(0.8, e.clientY / vh)),
    };
    this.hasPointer = true;
  };

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
      const stickyEl = el.querySelector<HTMLElement>('.pin-sticky');
      const isSticky = Boolean(
        el.classList.contains('pin-section') &&
          stickyEl &&
          window.getComputedStyle(stickyEl).position === 'sticky'
      );
      const stickyHeight = stickyEl && isSticky ? Math.max(1, stickyEl.getBoundingClientRect().height) : vh;
      const incoming = getIncomingTransition(id);
      const outgoing = getOutgoingTransition(id);

      const top = r.top + scrollY;
      const height = r.height;
      const inSpan = incoming ? incoming.scrollLengthVh * stickyHeight : 0;
      const outSpan = outgoing ? outgoing.scrollLengthVh * stickyHeight : 0;
      const contentStart = top + inSpan;
      const contentEnd = isSticky
        ? Math.max(contentStart + 1, top + height - stickyHeight - outSpan)
        : top + height;

      return {
        id,
        theme,
        el,
        clipTarget: stickyEl ?? el,
        top,
        height,
        stickyHeight,
        isSticky,
        anchorNorm: SECTION_ANCHORS[id] ?? { x: 0.5, y: 0.5 },
        incoming,
        outgoing,
        contentStart,
        contentEnd,
        incomingStartY: null,
        outgoingEndY: null,
      };
    });

    const byId = new Map<SectionId, MeasuredSection>();
    for (const s of this.sections) {
      byId.set(s.id, s);
    }

    // Build exact transition windows directly from measured overlapping real sections
    this.boundaries = [];
    for (const cfg of SINGULARITY_TRANSITIONS) {
      const fromSec = byId.get(cfg.from);
      const toSec = byId.get(cfg.to);
      if (!fromSec || !toSec) continue;

      const startY = toSec.top;
      const rawEndY = fromSec.isSticky
        ? fromSec.top + fromSec.height - fromSec.stickyHeight
        : startY + cfg.scrollLengthVh * vh;
      const endY = Math.max(startY + 40, rawEndY);

      // Keep contentStart/contentEnd strictly synchronized with exact measured boundary edges
      fromSec.contentEnd = Math.max(fromSec.contentStart + 1, startY);
      toSec.contentStart = endY;
      if (toSec.isSticky) {
        const toOutSpan = toSec.outgoing ? toSec.outgoing.scrollLengthVh * toSec.stickyHeight : 0;
        toSec.contentEnd = Math.max(
          toSec.contentStart + 1,
          toSec.top + toSec.height - toSec.stickyHeight - toOutSpan
        );
      }

      fromSec.outgoingEndY = endY;
      toSec.incomingStartY = startY;

      this.boundaries.push({
        config: cfg,
        from: fromSec,
        to: toSec,
        startY,
        endY,
      });
    }

    // Section navigation snap anchors land cleanly at contentStart (fully revealed)
    this.anchorYs = this.sections.map((s) =>
      Math.max(0, Math.min(this.maxScroll, s.contentStart))
    );

    ScrollTrigger.refresh();
  }

  public scrollToY(destY: number, opts?: { instant?: boolean; duration?: number }) {
    const clampedY = Math.max(0, Math.min(this.maxScroll, destY));
    if (this.reducedMotion || !this.lenis || opts?.instant) {
      window.scrollTo({ top: clampedY, behavior: 'auto' });
      this.pos = clampedY;
      this.target = clampedY;
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
      this.scrollToY(sec.contentStart);
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
    const scrollableSpan = Math.max(0, sec.contentEnd - sec.contentStart);
    const targetP = (stepIdx + 0.12) / Math.max(1, totalSteps);
    this.scrollToY(sec.contentStart + scrollableSpan * targetP, { duration: 0.95 });
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
    particleRegistry.refreshAllRects();
    ScrollTrigger.refresh();
    this.stepFrame();
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

  private resolveBoundaryOrigin(
    boundary: MeasuredSingularityBoundary,
    vw: number,
    vh: number
  ): { x: number; y: number } {
    const { config } = boundary;

    if (config.originMode === 'particle-center' && config.particleSlotId) {
      const liveRect = particleRegistry.getLiveScreenRect(
        config.particleSlotId,
        this.pos,
        vh
      );
      if (
        liveRect &&
        liveRect.centerX > vw * 0.05 &&
        liveRect.centerX < vw * 0.95 &&
        liveRect.centerY > vh * 0.05 &&
        liveRect.centerY < vh * 0.95
      ) {
        return { x: liveRect.centerX, y: liveRect.centerY };
      }
    }

    if (config.originMode === 'pointer') {
      let norm = this.lockedOrigins.get(config.id);
      if (!norm) {
        norm = this.hasPointer ? { ...this.pointerNorm } : { ...config.originAnchor };
        this.lockedOrigins.set(config.id, norm);
      }
      return { x: norm.x * vw, y: norm.y * vh };
    }

    return {
      x: config.originAnchor.x * vw,
      y: config.originAnchor.y * vh,
    };
  }

  private setRootSingularityVars(
    originX: number,
    originY: number,
    radius: number,
    accentColor: string
  ) {
    if (typeof document === 'undefined') return;
    const style = document.documentElement.style;

    const sx = `${originX.toFixed(1)}px`;
    const sy = `${originY.toFixed(1)}px`;
    const sr = `${radius.toFixed(1)}px`;
    // 0.75px overlap eliminates any subpixel hairline seam between outer radial-mask and inner clip-path
    const srMask = `${Math.max(0, radius - 0.75).toFixed(1)}px`;

    if (sx !== this.lastCssX) {
      style.setProperty('--bh-x', sx);
      this.lastCssX = sx;
    }
    if (sy !== this.lastCssY) {
      style.setProperty('--bh-y', sy);
      this.lastCssY = sy;
    }
    if (sr !== this.lastCssR) {
      style.setProperty('--bh-r', sr);
      this.lastCssR = sr;
    }
    if (srMask !== this.lastCssRMask) {
      style.setProperty('--bh-r-mask', srMask);
      this.lastCssRMask = srMask;
    }
    if (accentColor !== this.lastCssAccent) {
      style.setProperty('--bh-accent', accentColor);
      this.lastCssAccent = accentColor;
    }
  }

  private applySectionRole(sec: MeasuredSection, nextRole: SectionBhRole) {
    const prev = this.sectionRoles.get(sec.id);
    if (prev === nextRole) return;
    this.sectionRoles.set(sec.id, nextRole);

    const cl = sec.clipTarget.classList;
    cl.remove('bh-layer-outer', 'bh-layer-inner', 'bh-layer-hidden');
    if (nextRole === 'outer') {
      cl.add('bh-layer-outer');
    } else if (nextRole === 'inner') {
      cl.add('bh-layer-inner');
    } else if (nextRole === 'hidden') {
      cl.add('bh-layer-hidden');
    }
  }

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

    // 2. Read Lenis smoothed scroll (zero rubber-band trapping during singularity scrub)
    const activeLerp = params.lerp;
    if (this.lenis) {
      this.lenis.options.lerp = activeLerp;
      this.pos = this.lenis.scroll;
      this.target = this.lenis.targetScroll;
      this.velocity = this.lenis.velocity;
      if (Math.abs(this.velocity) > 0.08) {
        this.dir = this.velocity >= 0 ? 1 : -1;
      }
    } else {
      this.pos = window.scrollY;
      this.target = this.pos;
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

    // 3. Subtle scroll ticks when audio is active
    if (
      this.soundEnabled &&
      st.degradationLevel < 2 &&
      !this.reducedMotion &&
      Math.abs(this.pos - this.lastTickPos) >= Math.max(50, params.tickSpacing)
    ) {
      this.lastTickPos = this.pos;
      labAudio.playScrollTick(this.speedNorm);
    }

    // 4. Evaluate active Black Hole / White Hole singularity STRICTLY from Lenis `this.pos`
    let activeBoundary: MeasuredSingularityBoundary | null = null;
    let boundaryProgress = 0;

    for (const b of this.boundaries) {
      if (this.pos > b.startY && this.pos < b.endY) {
        activeBoundary = b;
        boundaryProgress = clamp01((this.pos - b.startY) / Math.max(1, b.endY - b.startY));
        break;
      }
    }

    // Clear pointer origin lock once we fully leave a boundary so next entry locks fresh pointer
    if (this.lastActiveBoundaryId && this.lastActiveBoundaryId !== (activeBoundary?.config.id ?? null)) {
      this.lockedOrigins.delete(this.lastActiveBoundaryId);
    }
    this.lastActiveBoundaryId = activeBoundary?.config.id ?? null;

    // 5. Compute exact per-section content progress (0..1 across contentStart..contentEnd)
    const sectionProgress: Record<SectionId, number> = { ...st.sectionProgress };
    let activeSection: SectionId = this.sections[0]?.id ?? 'hero';
    let activeSectionTheme: ThemeKind = this.sections[0]?.theme ?? 'light';
    let activeSecIdx = 0;
    const probeY = this.pos + vh * 0.42;

    for (let i = 0; i < this.sections.length; i++) {
      const sec = this.sections[i];
      if (sec.isSticky) {
        const span = Math.max(1, sec.contentEnd - sec.contentStart);
        sectionProgress[sec.id] = clamp01((this.pos - sec.contentStart) / span);
      } else {
        const startY = sec.top - vh * 0.65;
        const endY = sec.top + sec.height - vh * 0.35;
        sectionProgress[sec.id] = clamp01((this.pos - startY) / Math.max(1, endY - startY));
      }

      const triggerTop = sec.incomingStartY !== null ? sec.contentStart : sec.top;
      if (probeY >= triggerTop) {
        activeSection = sec.id;
        activeSectionTheme = sec.theme;
        activeSecIdx = i;
      }
    }

    // Build SingularityRuntimeState + apply zero-reflow CSS variables & real section clip/mask roles
    let singularity: SingularityRuntimeState;

    if (activeBoundary) {
      const origin = this.resolveBoundaryOrigin(activeBoundary, vw, vh);
      const maxRadius = computeMaxCoverRadius(origin.x, origin.y, vw, vh);
      const radiusNorm = computeSingularityRadiusNorm(boundaryProgress, this.reducedMotion);
      const radius = radiusNorm * maxRadius;

      const outerTheme = activeBoundary.from.theme;
      const innerTheme = activeBoundary.to.theme;

      // Switch activeSection cleanly at portal midpoint (50% radius)
      activeSection = radiusNorm >= 0.5 ? activeBoundary.to.id : activeBoundary.from.id;
      activeSectionTheme = radiusNorm >= 0.5 ? innerTheme : outerTheme;
      activeSecIdx = this.sections.findIndex((s) => s.id === activeSection);

      singularity = {
        active: true,
        id: activeBoundary.config.id,
        fromSection: activeBoundary.from.id,
        toSection: activeBoundary.to.id,
        direction: activeBoundary.config.direction,
        outerTheme,
        innerTheme,
        progress: boundaryProgress,
        originX: origin.x,
        originY: origin.y,
        radius,
        maxRadius,
        radiusNorm,
        accentColor: activeBoundary.config.accentColor,
        vortexStrength: this.reducedMotion ? 0 : (activeBoundary.config.vortexStrength ?? 1.0),
        reducedMotion: this.reducedMotion,
      };

      this.setRootSingularityVars(
        origin.x,
        origin.y,
        radius,
        activeBoundary.config.accentColor
      );
    } else {
      const fallbackMaxR = computeMaxCoverRadius(vw * 0.5, vh * 0.5, vw, vh);
      singularity = {
        active: false,
        id: null,
        fromSection: null,
        toSection: null,
        direction: 'none',
        outerTheme: activeSectionTheme,
        innerTheme: activeSectionTheme,
        progress: 0,
        originX: vw * 0.5,
        originY: vh * 0.5,
        radius: 0,
        maxRadius: fallbackMaxR,
        radiusNorm: 0,
        accentColor: '#5B5BF0',
        vortexStrength: 0,
        reducedMotion: this.reducedMotion,
      };

      this.setRootSingularityVars(vw * 0.5, vh * 0.5, 0, '#5B5BF0');
    }

    // Apply mutually-exclusive clip/mask/hidden roles directly to the real single-DOM sections
    for (const sec of this.sections) {
      let role: SectionBhRole = 'none';
      if (activeBoundary && sec.id === activeBoundary.from.id) {
        role = 'outer';
      } else if (activeBoundary && sec.id === activeBoundary.to.id) {
        role = 'inner';
      } else if (sec.incomingStartY !== null && this.pos <= sec.incomingStartY) {
        role = 'hidden';
      } else if (sec.outgoingEndY !== null && this.pos >= sec.outgoingEndY) {
        role = 'hidden';
      }
      this.applySectionRole(sec, role);
    }

    // 6. Optional subtle audio (only when Sound is ON and not reduced motion)
    if (this.lastBoundaryIndex !== -1 && activeSecIdx !== this.lastBoundaryIndex) {
      if (this.soundEnabled && st.degradationLevel < 2 && !this.reducedMotion) {
        labAudio.playBoundaryThump(this.speedNorm);
      }
    }
    this.lastBoundaryIndex = activeSecIdx;

    if (this.soundEnabled && st.degradationLevel < 2 && !this.reducedMotion) {
      labAudio.updateSingularityDrone(
        singularity.active,
        singularity.radiusNorm,
        singularity.direction,
        this.speedNorm
      );
    } else {
      labAudio.updateSingularityDrone(false, 0, 'none', 0);
    }

    // Keep BloomState & MagnetTransitionState populated for backwards compatibility with dev telemetry
    const bloom: BloomState = {
      active: singularity.active,
      direction:
        singularity.direction === 'black-hole'
          ? 'light-to-dark'
          : singularity.direction === 'white-hole'
            ? 'dark-to-light'
            : 'none',
      phase: singularity.active
        ? singularity.direction === 'black-hole'
          ? singularity.progress < 0.14
            ? 'seed'
            : 'bloom'
          : 'implosion'
        : 'none',
      progress: singularity.progress,
      originX: singularity.originX,
      originY: singularity.originY,
      radius: singularity.radius,
      maxRadius: singularity.maxRadius,
      darkCovered: activeSectionTheme === 'dark',
      grainPulse: 0,
    };

    const activeSecObj = this.sections[Math.max(0, activeSecIdx)];
    const activeAnchorPx = {
      x: vw * (activeSecObj?.anchorNorm.x ?? 0.5),
      y: vh * (activeSecObj?.anchorNorm.y ?? 0.5),
    };

    const magnet: MagnetTransitionState = activeBoundary
      ? this.buildMagnetState(
          boundaryProgress,
          this.dir < 0,
          { x: vw * activeBoundary.from.anchorNorm.x, y: vh * activeBoundary.from.anchorNorm.y },
          { x: vw * activeBoundary.to.anchorNorm.x, y: vh * activeBoundary.to.anchorNorm.y }
        )
      : {
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

    // 7. Gentle soft-snap near section starts ONLY when NOT inside an active singularity transition
    //    so users can freely pause and inspect any scrub radius (25%, 50%, 75%) without snapping away.
    if (
      !singularity.active &&
      !this.reducedMotion &&
      this.lenis &&
      !this.isUserTouching &&
      !this.isSnapping &&
      !this.isTunneling &&
      this.idleMs > 220 &&
      Math.abs(this.velocity) < 0.85 &&
      this.impulse < 0.04 &&
      Math.abs(this.pos - this.lastSnapCheckPos) > 16 &&
      this.anchorYs.length > 0
    ) {
      const snapRadius = vh * Math.min(0.05, params.snapZone);
      for (const ay of this.anchorYs) {
        const delta = Math.abs(this.pos - ay);
        if (delta > 8 && delta <= snapRadius) {
          // Never snap across a singularity boundary
          const wouldEnterBoundary = this.boundaries.some(
            (b) => this.pos > b.startY - 24 && this.pos < b.endY + 24
          );
          if (wouldEnterBoundary) break;
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

    // Crisp binary theme (zero fade!) — spatial color split happens strictly on the circle edge
    const themeLerp = activeSectionTheme === 'dark' ? 1 : 0;

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
      inGate: false,
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
      theme: activeSectionTheme,
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
      singularity,
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
