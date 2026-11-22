import type React from 'react';
import type { SectionId } from '@/lib/content';
import type { ThemeKind } from '@/lib/lab/types';

export type SingularityDirection = 'black-hole' | 'white-hole';

export type SingularityOriginMode =
  | 'particle-center'
  | 'pointer'
  | 'anchor';

export interface SingularityTransitionConfig {
  /** Unique identifier for this boundary transition */
  id: string;
  /** Outgoing section id (must have opposite theme from `to`) */
  from: SectionId;
  /** Incoming section id (must have opposite theme from `from`) */
  to: SectionId;
  /** 'black-hole' = light -> dark, 'white-hole' = dark -> light */
  direction: SingularityDirection;
  /** Scrubbed scroll span in viewport heights (e.g. 1.0 = 100svh) */
  scrollLengthVh: number;
  /** Event-horizon particle ring accent color */
  accentColor: string;
  /** How the singularity origin is selected */
  originMode: SingularityOriginMode;
  /** Normalized viewport fallback / anchor coordinates (0..1, 0..1) */
  originAnchor: { x: number; y: number };
  /** Optional ParticleSlot id to track when originMode === 'particle-center' */
  particleSlotId?: string;
  /** Gravitational spiral pull intensity (default 1.0) */
  vortexStrength?: number;
}

/**
 * Declarative registry of ALL light <-> dark theme transitions across the portfolio.
 * To add a new Black Hole / White Hole transition between any two contrasting sections,
 * simply append an item here — layout overlap, scroll scrubbing, backdrops, particle
 * vortex/inversion, and fixed-UI edge clipping adapt automatically.
 */
export const SINGULARITY_TRANSITIONS: SingularityTransitionConfig[] = [
  {
    id: 'whatido-to-process',
    from: 'whatido',
    to: 'process',
    direction: 'black-hole',
    scrollLengthVh: 1.0,
    accentColor: '#5B5BF0',
    originMode: 'particle-center',
    particleSlotId: 'whatido-diagram',
    originAnchor: { x: 0.64, y: 0.48 },
    vortexStrength: 1.0,
  },
  {
    id: 'apps-to-experience',
    from: 'apps',
    to: 'experience',
    direction: 'white-hole',
    scrollLengthVh: 1.0,
    accentColor: '#5B5BF0',
    originMode: 'pointer',
    originAnchor: { x: 0.5, y: 0.5 },
    vortexStrength: 0.92,
  },
  {
    id: 'experience-to-statement',
    from: 'experience',
    to: 'statement',
    direction: 'black-hole',
    scrollLengthVh: 1.0,
    accentColor: '#5B5BF0',
    originMode: 'anchor',
    originAnchor: { x: 0.5, y: 0.5 },
    vortexStrength: 1.05,
  },
  {
    id: 'statement-to-testimonial',
    from: 'statement',
    to: 'testimonial',
    direction: 'white-hole',
    scrollLengthVh: 1.0,
    accentColor: '#5B5BF0',
    originMode: 'particle-center',
    particleSlotId: 'statement-title',
    originAnchor: { x: 0.5, y: 0.5 },
    vortexStrength: 1.0,
  },
  {
    id: 'testimonial-to-afterhours',
    from: 'testimonial',
    to: 'afterhours',
    direction: 'black-hole',
    scrollLengthVh: 1.0,
    accentColor: '#5B5BF0',
    originMode: 'particle-center',
    particleSlotId: 'testimonial-figure',
    originAnchor: { x: 0.78, y: 0.5 },
    vortexStrength: 0.96,
  },
];

export interface SingularityRuntimeState {
  /** True strictly while 0 < radius < maxRadius inside a configured boundary */
  active: boolean;
  /** Active transition config id, or null when settled */
  id: string | null;
  fromSection: SectionId | null;
  toSection: SectionId | null;
  direction: SingularityDirection | 'none';
  outerTheme: ThemeKind;
  innerTheme: ThemeKind;
  /** Raw scrubbed scroll progress 0..1 */
  progress: number;
  /** Singularity origin in viewport CSS px */
  originX: number;
  originY: number;
  /** Current circle radius in CSS px */
  radius: number;
  /** Distance from origin to farthest viewport corner + margin */
  maxRadius: number;
  /** Normalized radius 0..1 */
  radiusNorm: number;
  accentColor: string;
  vortexStrength: number;
  reducedMotion: boolean;
}

export const INITIAL_SINGULARITY_STATE: SingularityRuntimeState = {
  active: false,
  id: null,
  fromSection: null,
  toSection: null,
  direction: 'none',
  outerTheme: 'light',
  innerTheme: 'dark',
  progress: 0,
  originX: 720,
  originY: 450,
  radius: 0,
  maxRadius: 1600,
  radiusNorm: 0,
  accentColor: '#5B5BF0',
  vortexStrength: 0,
  reducedMotion: false,
};

export function getIncomingTransition(
  sectionId: SectionId
): SingularityTransitionConfig | undefined {
  return SINGULARITY_TRANSITIONS.find((t) => t.to === sectionId);
}

export function getOutgoingTransition(
  sectionId: SectionId
): SingularityTransitionConfig | undefined {
  return SINGULARITY_TRANSITIONS.find((t) => t.from === sectionId);
}

export function hasIncomingTransition(sectionId: SectionId): boolean {
  return Boolean(getIncomingTransition(sectionId));
}

/**
 * Computes the exact CSS height + negative marginTop so two real sticky sections
 * overlap cleanly during their scrubbed singularity window without duplicating DOM,
 * shortening content scroll spans, or changing total document height.
 */
export function getSingularitySectionStyle(
  sectionId: SectionId,
  baseHeightCss: string
): React.CSSProperties {
  const incoming = getIncomingTransition(sectionId);
  const outgoing = getOutgoingTransition(sectionId);
  const inVh = incoming ? incoming.scrollLengthVh * 100 : 0;
  const outVh = outgoing ? outgoing.scrollLengthVh * 100 : 0;
  const extraVh = inVh + outVh;

  const style: React.CSSProperties = {
    height: extraVh > 0 ? `calc(${baseHeightCss} + ${extraVh}svh)` : baseHeightCss,
  };

  if (inVh > 0) {
    style.marginTop = `calc(-100svh - ${inVh}svh)`;
  }

  return style;
}

/**
 * Computes exact radius required to cover the farthest corner of the viewport
 * from (originX, originY), with a small subpixel safety margin.
 */
export function computeMaxCoverRadius(
  originX: number,
  originY: number,
  vw: number,
  vh: number
): number {
  const dTL = Math.hypot(originX, originY);
  const dTR = Math.hypot(vw - originX, originY);
  const dBL = Math.hypot(originX, vh - originY);
  const dBR = Math.hypot(vw - originX, vh - originY);
  return Math.ceil(Math.max(dTL, dTR, dBL, dBR)) + 8;
}

/**
 * Accelerating gravitational radius curve (strictly monotonic & reversible with scroll).
 * - Starts as a tight singularity dot and accelerates cleanly across the viewport.
 * - Under prefers-reduced-motion, uses a calm linear radius curve with zero pulse.
 */
export function computeSingularityRadiusNorm(
  progress: number,
  reducedMotion: boolean
): number {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (reducedMotion) return p;
  return Math.pow(p, 1.65);
}
