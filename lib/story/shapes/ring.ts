import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 10 — Outro Ring / Luminous Horizon Arc
 * Grand, calm, continuously rotating torus-ring with a sweeping luminous indigo
 * (#5B5BF0) energy band and subtle inner halo for the final CTA chapter.
 */
export function generateRingShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(10101);

  const mainRingCount = Math.floor(count * 0.66);
  const outerArcCount = Math.floor(count * 0.16);
  const innerDustCount = Math.floor(count * 0.08);

  const majorR = 2.15;
  const minorR = 0.19;
  const tiltX = 0.28;
  const tiltY = -0.18;
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const cosY = Math.cos(tiltY);
  const sinY = Math.sin(tiltY);

  let cursor = 0;

  // 1. Primary sculpted luminous torus ring
  for (let i = 0; i < mainRingCount; i++) {
    const u = rnd() * Math.PI * 2;
    const v = rnd() * Math.PI * 2;
    // Slight breathing pinch along the ring for organic grace
    const rTube = minorR * (0.65 + 0.55 * Math.pow(rnd(), 1.3)) * (0.85 + 0.2 * Math.sin(u * 3));
    const lx = (majorR + rTube * Math.cos(v)) * Math.cos(u);
    const ly = (majorR + rTube * Math.cos(v)) * Math.sin(u);
    const lz = rTube * Math.sin(v);

    // Subtle 3D tilt
    const y1 = ly * cosX - lz * sinX;
    const z1 = ly * sinX + lz * cosX;
    const x2 = lx * cosY + z1 * sinY;
    const z2 = -lx * sinY + z1 * cosY;

    const i3 = cursor * 3;
    positions[i3] = x2;
    positions[i3 + 1] = y1;
    positions[i3 + 2] = z2;

    // Sweeping indigo crescent along ~42% of the ring
    const indigoSweep = Math.sin(u - 0.6);
    if (indigoSweep > 0.15) {
      accents[cursor] = 0.74 + Math.min(0.26, indigoSweep * 0.28);
    } else {
      accents[cursor] = 0.24 + rnd() * 0.24;
    }
    cursor++;
  }

  // 2. Fine outer counter-arc halo
  for (let i = 0; i < outerArcCount; i++) {
    const u = -0.9 + rnd() * (Math.PI * 1.45);
    const r = 2.72 + (rnd() - 0.5) * 0.08;
    const lx = Math.cos(u) * r;
    const ly = Math.sin(u) * r;
    const lz = (rnd() - 0.5) * 0.08;

    const y1 = ly * cosX - lz * sinX;
    const z1 = ly * sinX + lz * cosX;
    const x2 = lx * cosY + z1 * sinY;
    const z2 = -lx * sinY + z1 * cosY;

    const i3 = cursor * 3;
    positions[i3] = x2;
    positions[i3 + 1] = y1;
    positions[i3 + 2] = z2;
    accents[cursor] = rnd() < 0.5 ? 0.8 : 0.22 + rnd() * 0.18;
    cursor++;
  }

  // 3. Delicate concentric inner whisper filaments
  for (let i = 0; i < innerDustCount; i++) {
    const u = rnd() * Math.PI * 2;
    const r = 1.45 + rnd() * 0.58;
    const lx = Math.cos(u) * r;
    const ly = Math.sin(u) * r;
    const lz = (rnd() - 0.5) * 0.24;

    const i3 = cursor * 3;
    positions[i3] = lx * cosY + lz * sinY;
    positions[i3 + 1] = ly * cosX - lz * sinX;
    positions[i3 + 2] = -lx * sinY + lz * cosY;
    accents[cursor] = rnd() < 0.35 ? 0.75 : 0.16 + rnd() * 0.15;
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 10102);
  return { positions, accents };
}
