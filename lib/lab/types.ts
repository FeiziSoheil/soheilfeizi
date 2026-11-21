export type LabLocale = 'fa' | 'en';
export type LabMode = 'site' | 'story';
export type ThemeKind = 'light' | 'dark';
export type ParticleVerb =
  | 'magnet'
  | 'gravity-drop'
  | 'morph'
  | 'vortex'
  | 'shatter'
  | 'orbit'
  | 'rain'
  | 'assemble'
  | 'collapse';

export type TransitionType = 'magnet' | 'vortex' | 'rain' | 'shatter';

export interface AnchorNorm {
  x: number;
  y: number;
}

export interface TransitionConfig {
  type: TransitionType;
  G: number;
  S: number;
  delaySpread: number;
  anchorFrom: AnchorNorm;
  anchorTo: AnchorNorm;
  settle: 'assemble' | 'orbit';
  reverse?: {
    G: number;
    S: number;
    anchorFrom: AnchorNorm;
    anchorTo: AnchorNorm;
  };
}

export interface SceneDescriptor {
  id: string;
  index: string;
  theme: ThemeKind;
  steps: number;
  start: number;
  end: number;
  anchor: AnchorNorm;
  shapes: string[];
  verb: ParticleVerb;
  label: { fa: string; en: string };
  enter: TransitionConfig;
  exit: TransitionConfig;
}

export type MagnetPhase =
  | 'idle'
  | 'anticipation'
  | 'pull'
  | 'field-lines'
  | 'settle';

export type BloomPhase =
  | 'none'
  | 'seed'
  | 'bloom'
  | 'settle'
  | 'implosion';

export interface BloomState {
  active: boolean;
  direction: 'light-to-dark' | 'dark-to-light' | 'none';
  phase: BloomPhase;
  progress: number;
  originX: number;
  originY: number;
  radius: number;
  maxRadius: number;
  darkCovered: boolean;
  grainPulse: number;
}

export interface MagnetTransitionState {
  active: boolean;
  progress: number;
  phase: MagnetPhase;
  reversed: boolean;
  anchorFromPx: { x: number; y: number };
  anchorToPx: { x: number; y: number };
  G: number;
  S: number;
  delaySpread: number;
  settle: 'assemble' | 'orbit';
  coreAlpha: number;
  ringProgress: number;
  fieldLineAlpha: number;
}

export interface ScrollEngineMetrics {
  pos: number;
  target: number;
  maxScroll: number;
  totalProgress: number;
  velocity: number;
  speedNorm: number;
  dir: 1 | -1;
  impulse: number;
  activeLerp: number;
  inGate: boolean;
  inSlowMo: boolean;
  isScrolling: boolean;
  isTunneling: boolean;
  pParticles: number;
  pText: number;
  pTheme: number;
  pChrome: number;
}

export interface ParticleTelemetry {
  settledPct: number;
  avgVelPxSec: number;
  freeCount: number;
  morphCount: number;
  dustCount: number;
  assembleState: 'idle' | 'debouncing' | 'assembling' | 'settled';
  assembleElapsedMs: number;
}

export interface LabGuiParams {
  // Stabilization Patch params
  omega: number;
  settleZeta: number;
  assembleDurationMs: number;
  microVibAmp: number;
  freezeSimulation: boolean;
  // Magnet & Bloom params
  G: number;
  S: number;
  delaySpread: number;
  shellThickness: number;
  duration: number;
  streakK: number;
  // ScrollEngine params
  lerp: number;
  springParticles: number;
  springText: number;
  springTheme: number;
  springChrome: number;
  skewMax: number;
  rgbSplitMax: number;
  snapZone: number;
  snapDuration: number;
  gateLerp: number;
  timeDilation: number;
  tickSpacing: number;
  velocityDecay: number;
}
