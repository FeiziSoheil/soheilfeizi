import type { Locale } from '@/lib/content';

export interface ShapeBuffer {
  /** Packed XYZ coordinates: length = count * 3 */
  positions: Float32Array;
  /**
   * Per-particle semantic role & color channel (length = count):
   * - `< 0.0` (e.g. -1.0): Surplus particle floating as dim ambient background dust
   * - `0.0 .. 0.49`: Silver/white structural particle (brightness varies with value)
   * - `0.55 .. 1.0`: Indigo accent (#5B5BF0) highlight particle
   */
  accents: Float32Array;
}

export interface ShapeContext {
  count: number;
  locale: Locale;
  portraitSrc: string;
  uiScreenshotSrc: string;
}

/** Deterministic PRNG (Mulberry32) so shapes stay stable across frames and reloads */
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Populates surplus particles [startIndex..count) as soft ambient floating dust
 * dispersed across a wide 3D volume so extra particles never disappear abruptly.
 */
export function fillAmbientDust(
  positions: Float32Array,
  accents: Float32Array,
  startIndex: number,
  count: number,
  seed = 101
): void {
  const rnd = createSeededRandom(seed);
  for (let i = startIndex; i < count; i++) {
    const i3 = i * 3;
    const u = rnd();
    const v = rnd();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const radius = 3.2 + Math.pow(rnd(), 0.7) * 6.8;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta) * 1.35;
    positions[i3 + 1] = radius * Math.cos(phi) * 0.95;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta) * 0.85 - 1.2;
    accents[i] = -1.0; // Strictly dim ambient dust
  }
}

/** Helper to load a local same-origin image for canvas pixel sampling */
export function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
