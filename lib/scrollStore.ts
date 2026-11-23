import { create } from 'zustand';
import { Locale, SectionId, ViewMode } from '@/lib/content';
import {
  BloomState,
  MagnetTransitionState,
  ParticleTelemetry,
  ScrollEngineMetrics,
} from '@/lib/lab/types';
import {
  INITIAL_SINGULARITY_STATE,
  SingularityRuntimeState,
} from '@/lib/singularity.config';

export interface PortfolioParams {
  omega: number;
  settleZeta: number;
  assembleDurationMs: number;
  microVibAmp: number;
  freezeSimulation: boolean;
  shellThickness: number;
  lerp: number;
  gateLerp: number;
  springParticles: number;
  springText: number;
  springTheme: number;
  springChrome: number;
  skewMax: number;
  rgbSplitMax: number;
  snapZone: number;
  snapDuration: number;
  timeDilation: number;
  tickSpacing: number;
  velocityDecay: number;
}

export const DEFAULT_PORTFOLIO_PARAMS: PortfolioParams = {
  omega: 13.0,
  settleZeta: 0.8,
  assembleDurationMs: 800,
  microVibAmp: 0.35,
  freezeSimulation: false,
  shellThickness: 36,
  lerp: 0.06,
  gateLerp: 0.028,
  springParticles: 4.5,
  springText: 7.5,
  springTheme: 4.4,
  springChrome: 10.0,
  skewMax: 2.6,
  rgbSplitMax: 1.35,
  snapZone: 0.08,
  snapDuration: 880,
  timeDilation: 0.65,
  tickSpacing: 150,
  velocityDecay: 240,
};

export interface TabTransitionState {
  active: boolean;
  from: 'site' | 'story';
  to: 'site' | 'story';
  phase: 'idle' | 'entering' | 'loading' | 'exiting';
  progress: number;
  startedAt: number;
}

export interface ScrollStoreState {
  locale: Locale;
  mode: ViewMode;
  soundEnabled: boolean;
  tabTransition: TabTransitionState;
  activeSection: SectionId;
  theme: 'light' | 'dark';
  /** Continuous 0 (light) -> 1 (dark) scroll-lerped theme factor */
  themeLerp: number;
  /** Incremented whenever Client Notes switches quotes to trigger a particle micro-morph */
  quoteMorphTrigger: number;
  /** Active app project index in section 05 Own Apps (0..totalApps-1) */
  appsActiveIndex: number;
  totalProgress: number;
  scrollPos: number;
  scrollVelocity: number;
  speedNorm: number;
  scrollDir: 1 | -1;
  sectionProgress: Record<SectionId, number>;
  heroPortraitHovered: boolean;
  loadProgress: number;
  assetsReady: boolean;
  guiVisible: boolean;
  cursorOnLink: boolean;
  cursorMagnetHold: boolean;
  fps: number;
  degradationLevel: 0 | 1 | 2 | 3;
  scroll: ScrollEngineMetrics;
  magnet: MagnetTransitionState;
  bloom: BloomState;
  singularity: SingularityRuntimeState;
  telemetry: ParticleTelemetry;
  params: PortfolioParams;

  setLocale: (locale: Locale) => void;
  setMode: (mode: ViewMode) => void;
  setSoundEnabled: (on: boolean) => void;
  startTabTransition: (from: 'site' | 'story', to: 'site' | 'story') => void;
  setTabTransitionProgress: (progress: number) => void;
  beginTabTransitionExit: () => void;
  clearTabTransition: () => void;
  setActiveSection: (id: SectionId, theme: 'light' | 'dark') => void;
  setAppsActiveIndex: (idx: number) => void;
  triggerQuoteMorph: () => void;
  setTotalProgress: (p: number) => void;
  setScrollVelocity: (v: number) => void;
  setSectionProgress: (id: SectionId, p: number) => void;
  setHeroPortraitHovered: (hovered: boolean) => void;
  setLoadProgress: (val: number) => void;
  setAssetsReady: (ready: boolean) => void;
  toggleGuiVisible: () => void;
  setCursorOnLink: (v: boolean) => void;
  setCursorMagnetHold: (v: boolean) => void;
  setFps: (fps: number) => void;
  setDegradationLevel: (lvl: 0 | 1 | 2 | 3) => void;
  setTelemetry: (t: ParticleTelemetry) => void;
  updateParam: <K extends keyof PortfolioParams>(key: K, value: PortfolioParams[K]) => void;
  updateEngineFrame: (patch: {
    activeSection: SectionId;
    theme: 'light' | 'dark';
    themeLerp: number;
    totalProgress: number;
    scrollPos: number;
    scrollVelocity: number;
    speedNorm: number;
    scrollDir: 1 | -1;
    sectionProgress: Record<SectionId, number>;
    scroll: ScrollEngineMetrics;
    magnet: MagnetTransitionState;
    bloom: BloomState;
    singularity: SingularityRuntimeState;
  }) => void;
}

const INITIAL_PROGRESS: Record<SectionId, number> = {
  intro: 0,
  hero: 0,
  about: 0,
  whatido: 0,
  process: 0,
  work: 0,
  apps: 0,
  experience: 0,
  statement: 0,
  testimonial: 0,
  afterhours: 0,
  ask: 0,
  contact: 0,
};

const INITIAL_SCROLL: ScrollEngineMetrics = {
  pos: 0,
  target: 0,
  maxScroll: 1,
  totalProgress: 0,
  velocity: 0,
  speedNorm: 0,
  dir: 1,
  impulse: 0,
  activeLerp: DEFAULT_PORTFOLIO_PARAMS.lerp,
  inGate: false,
  inSlowMo: false,
  isScrolling: false,
  isTunneling: false,
  pParticles: 0,
  pText: 0,
  pTheme: 0,
  pChrome: 0,
};

const INITIAL_MAGNET: MagnetTransitionState = {
  active: false,
  progress: 0,
  phase: 'idle',
  reversed: false,
  anchorFromPx: { x: 0, y: 0 },
  anchorToPx: { x: 0, y: 0 },
  G: 0.72,
  S: 0.52,
  delaySpread: 0.2,
  settle: 'assemble',
  coreAlpha: 0,
  ringProgress: 0,
  fieldLineAlpha: 0,
};

const INITIAL_BLOOM: BloomState = {
  active: false,
  direction: 'none',
  phase: 'none',
  progress: 0,
  originX: 600,
  originY: 400,
  radius: 0,
  maxRadius: 1600,
  darkCovered: false,
  grainPulse: 0,
};

const INITIAL_TELEMETRY: ParticleTelemetry = {
  settledPct: 0,
  avgVelPxSec: 0,
  freeCount: 1800,
  morphCount: 0,
  dustCount: 1800,
  assembleState: 'idle',
  assembleElapsedMs: 0,
};

const INITIAL_TAB_TRANSITION: TabTransitionState = {
  active: false,
  from: 'site',
  to: 'story',
  phase: 'idle',
  progress: 0,
  startedAt: 0,
};

export const useScrollStore = create<ScrollStoreState>((set) => ({
  locale: 'en',
  mode: 'site',
  soundEnabled: true,
  tabTransition: { ...INITIAL_TAB_TRANSITION },
  activeSection: 'hero',
  theme: 'light',
  themeLerp: 0,
  quoteMorphTrigger: 0,
  appsActiveIndex: 0,
  totalProgress: 0,
  scrollPos: 0,
  scrollVelocity: 0,
  speedNorm: 0,
  scrollDir: 1,
  sectionProgress: { ...INITIAL_PROGRESS },
  heroPortraitHovered: false,
  loadProgress: 0,
  assetsReady: false,
  guiVisible: false,
  cursorOnLink: false,
  cursorMagnetHold: false,
  fps: 60,
  degradationLevel: 0,
  scroll: INITIAL_SCROLL,
  magnet: INITIAL_MAGNET,
  bloom: INITIAL_BLOOM,
  singularity: INITIAL_SINGULARITY_STATE,
  telemetry: INITIAL_TELEMETRY,
  params: { ...DEFAULT_PORTFOLIO_PARAMS },

  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('sf_locale', locale);
      } catch {
        // ignore storage errors
      }
    }
    set({ locale });
  },
  setMode: (mode) =>
    set((s) => ({
      mode,
      params: { ...s.params, lerp: mode === 'story' ? 0.058 : 0.085 },
    })),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  startTabTransition: (from, to) =>
    set({
      tabTransition: {
        active: true,
        from,
        to,
        phase: 'entering',
        progress: 8,
        startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      },
    }),
  setTabTransitionProgress: (progress) =>
    set((s) => {
      if (!s.tabTransition.active || s.tabTransition.phase === 'exiting') return s;
      const nextP = Math.max(s.tabTransition.progress, Math.min(100, progress));
      return {
        tabTransition: {
          ...s.tabTransition,
          phase: nextP > 12 ? 'loading' : s.tabTransition.phase,
          progress: nextP,
        },
      };
    }),
  beginTabTransitionExit: () =>
    set((s) => {
      if (!s.tabTransition.active || s.tabTransition.phase === 'exiting') return s;
      return {
        tabTransition: {
          ...s.tabTransition,
          phase: 'exiting',
          progress: 100,
        },
      };
    }),
  clearTabTransition: () =>
    set({
      tabTransition: { ...INITIAL_TAB_TRANSITION },
    }),
  setActiveSection: (activeSection, theme) =>
    set({ activeSection, theme, themeLerp: theme === 'dark' ? 1 : 0 }),
  setAppsActiveIndex: (appsActiveIndex) => {
    set((state) => {
      if (state.appsActiveIndex === appsActiveIndex) return state;
      return { appsActiveIndex };
    });
  },
  triggerQuoteMorph: () => set((s) => ({ quoteMorphTrigger: s.quoteMorphTrigger + 1 })),
  setTotalProgress: (totalProgress) => set({ totalProgress }),
  setScrollVelocity: (scrollVelocity) => set({ scrollVelocity }),
  setSectionProgress: (id, p) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(1, p));
      if (Math.abs(state.sectionProgress[id] - clamped) < 0.0005) {
        return state;
      }
      return {
        sectionProgress: {
          ...state.sectionProgress,
          [id]: clamped,
        },
      };
    }),
  setHeroPortraitHovered: (heroPortraitHovered) => set({ heroPortraitHovered }),
  setLoadProgress: (loadProgress) =>
    set((s) => ({ loadProgress: Math.max(s.loadProgress, Math.min(100, loadProgress)) })),
  setAssetsReady: (assetsReady) => set({ assetsReady }),
  toggleGuiVisible: () => set((s) => ({ guiVisible: !s.guiVisible })),
  setCursorOnLink: (cursorOnLink) => set({ cursorOnLink }),
  setCursorMagnetHold: (cursorMagnetHold) => set({ cursorMagnetHold }),
  setFps: (fps) => set({ fps }),
  setDegradationLevel: (degradationLevel) => set({ degradationLevel }),
  setTelemetry: (telemetry) => set({ telemetry }),
  updateParam: (key, value) =>
    set((s) => ({
      params: {
        ...s.params,
        [key]: value,
      },
    })),
  updateEngineFrame: (patch) => set(patch),
}));
