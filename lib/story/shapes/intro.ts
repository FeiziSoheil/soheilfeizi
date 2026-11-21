import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 0 — Intro
 * Soft, breathing ellipsoidal particle cloud like suspended cosmic dust.
 */
export function generateIntroShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(1101);

  const cloudCount = Math.floor(count * 0.78);

  for (let i = 0; i < cloudCount; i++) {
    const i3 = i * 3;
    const u = rnd();
    const v = rnd();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    // Denser near core, wispy at outer edges
    const r = Math.pow(rnd(), 0.55) * 2.7;

    const x = r * Math.sin(phi) * Math.cos(theta) * 1.45;
    const y = r * Math.cos(phi) * 0.88;
    const z = r * Math.sin(phi) * Math.sin(theta) * 0.95;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Gentle indigo whisper at inner heart, soft silver elsewhere
    const distNorm = r / 2.7;
    if (distNorm < 0.28 && rnd() < 0.45) {
      accents[i] = 0.72 + rnd() * 0.22;
    } else {
      accents[i] = 0.08 + (1 - distNorm) * 0.32;
    }
  }

  fillAmbientDust(positions, accents, cloudCount, count, 1102);
  return { positions, accents };
}
