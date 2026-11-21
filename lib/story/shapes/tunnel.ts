import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 4 — Tunnel / Concentric Cylinder (KEY SHOWPIECE)
 * 48 concentric jittered rings stacked along the -Z axis (z from +6 to -48),
 * forming a deep hollow vortex tunnel the camera flies directly through on scroll:
 * - Slightly varying radii & radial jitter per ring
 * - Interspersed luminous indigo (#5B5BF0) accent rings among crisp white/silver rings
 * - Bright converging focal core at the far exit of the tunnel
 */
export function generateTunnelShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(5101);

  const ringCount = 48;
  const tunnelTotal = Math.floor(count * 0.84);
  const perRing = Math.floor(tunnelTotal / ringCount);
  const exitCoreCount = Math.floor(count * 0.06);

  const zStart = 5.5;
  const zStep = 1.08;

  let cursor = 0;

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const zBase = zStart - rIdx * zStep;
    const progress = rIdx / (ringCount - 1);
    // Gentle sinusoidal breathing + slight narrowing near the far exit
    const baseRadius = 2.35 + Math.sin(rIdx * 0.45) * 0.28 - progress * 0.48;
    // Every 5th/7th ring glows electric indigo (#5B5BF0)
    const isIndigoRing = rIdx % 6 === 2 || rIdx % 11 === 5;
    // Slight subtle tunnel curve so flight feels organic
    const curveX = Math.sin(progress * Math.PI * 1.3) * 0.22;
    const curveY = Math.cos(progress * Math.PI * 1.1) * 0.14;

    for (let j = 0; j < perRing; j++) {
      const angle = (j / perRing) * Math.PI * 2 + (rnd() - 0.5) * 0.09;
      const radialJitter = (rnd() - 0.5) * 0.24 + (rnd() < 0.08 ? (rnd() - 0.5) * 0.55 : 0);
      const r = Math.max(0.4, baseRadius + radialJitter);
      const zJitter = (rnd() - 0.5) * 0.16;

      const i3 = cursor * 3;
      positions[i3] = curveX + Math.cos(angle) * r;
      positions[i3 + 1] = curveY + Math.sin(angle) * r;
      positions[i3 + 2] = zBase + zJitter;

      if (isIndigoRing) {
        accents[cursor] = 0.78 + rnd() * 0.22;
      } else {
        accents[cursor] = 0.18 + rnd() * 0.3;
      }
      cursor++;
    }
  }

  // Far exit luminous convergence star at z = -49
  const exitZ = zStart - ringCount * zStep - 1.5;
  for (let i = 0; i < exitCoreCount; i++) {
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(2 * rnd() - 1);
    const rad = Math.pow(rnd(), 1.6) * 1.15;
    const i3 = cursor * 3;
    positions[i3] = Math.sin(phi) * Math.cos(theta) * rad;
    positions[i3 + 1] = Math.cos(phi) * rad;
    positions[i3 + 2] = exitZ + Math.sin(phi) * Math.sin(theta) * rad * 0.6;
    accents[cursor] = rnd() < 0.55 ? 0.94 : 0.48;
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 5102);
  return { positions, accents };
}
