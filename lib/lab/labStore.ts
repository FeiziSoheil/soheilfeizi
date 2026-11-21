import { create } from 'zustand';
import {
  BloomState,
  LabGuiParams,
  LabLocale,
  LabMode,
  MagnetTransitionState,
  ParticleTelemetry,
  ScrollEngineMetrics,
  ThemeKind,
} from '@/lib/lab/types';

export const DEFAULT_LAB_PARAMS: LabGuiParams = {
  // Stabilization Patch defaults
  omega: 13.0,
  settleZeta: 0.8,
  assembleDurationMs: 800,
  microVibAmp: 0.35,
  freezeSimulation: false,
  // Magnet & Seed->Bloom physics
  G: 0.72,
  S: 0.52,
  delaySpread: 0.2,
  shellThickness: 36,
  duration: 1.15,
  streakK: 0.09,
  // ScrollEngine feel
  lerp: 0.06,
  springParticles: 4.5,
  springText: 7.5,
  springTheme: 4.2,
  springChrome: 10.0,
  skewMax: 2.8,
  rgbSplitMax: 1.4,
  snapZone: 0.11,
  snapDuration: 960,
  gateLerp: 0.028,
  timeDilation: 0.6,
  tickSpacing: 140,
  velocityDecay: 240,
};

export interface LabStoreState {
  locale: LabLocale;
  mode: LabMode;
  soundEnabled: boolean;
  activeSceneId: string;
  activeSceneIndex: string;
  activeTheme: ThemeKind;
  localP: number;
  fps: number;
  degradationLevel: 0 | 1 | 2 | 3;
  cursorOnLink: boolean;
  cursorMagnetHold: boolean;
  reducedMotion: boolean;
  scroll: ScrollEngineMetrics;
  magnet: MagnetTransitionState;
  bloom: BloomState;
  telemetry: ParticleTelemetry;
  params: LabGuiParams;

  setLocale: (locale: LabLocale) => void;
  setMode: (mode: LabMode) => void;
  setSoundEnabled: (on: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setCursorOnLink: (v: boolean) => void;
  setCursorMagnetHold: (v: boolean) => void;
  setFps: (fps: number) => void;
  setDegradationLevel: (lvl: 0 | 1 | 2 | 3) => void;
  setTelemetry: (t: ParticleTelemetry) => void;
  updateParam: <K extends keyof LabGuiParams>(key: K, value: LabGuiParams[K]) => void;
  updateDirectorFrame: (patch: {
    activeSceneId: string;
    activeSceneIndex: string;
    activeTheme: ThemeKind;
    localP: number;
    scroll: ScrollEngineMetrics;
    magnet: MagnetTransitionState;
    bloom: BloomState;
  }) => void;
}

const INITIAL_SCROLL: ScrollEngineMetrics = {
  pos: 0,
  target: 0,
  maxScroll: 1,
  totalProgress: 0,
  velocity: 0,
  speedNorm: 0,
  dir: 1,
  impulse: 0,
  activeLerp: DEFAULT_LAB_PARAMS.lerp,
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
  G: DEFAULT_LAB_PARAMS.G,
  S: DEFAULT_LAB_PARAMS.S,
  delaySpread: DEFAULT_LAB_PARAMS.delaySpread,
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
  maxRadius: 1500,
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

export const useLabStore = create<LabStoreState>((set) => ({
  locale: 'fa',
  mode: 'story',
  soundEnabled: false,
  activeSceneId: 'lab-light-a',
  activeSceneIndex: '01',
  activeTheme: 'light',
  localP: 0,
  fps: 60,
  degradationLevel: 0,
  cursorOnLink: false,
  cursorMagnetHold: false,
  reducedMotion: false,
  scroll: INITIAL_SCROLL,
  magnet: INITIAL_MAGNET,
  bloom: INITIAL_BLOOM,
  telemetry: INITIAL_TELEMETRY,
  params: { ...DEFAULT_LAB_PARAMS },

  setLocale: (locale) => set({ locale }),
  setMode: (mode) =>
    set((s) => ({
      mode,
      params: { ...s.params, lerp: mode === 'story' ? 0.055 : 0.075 },
    })),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
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
  updateDirectorFrame: (patch) => set(patch),
}));
