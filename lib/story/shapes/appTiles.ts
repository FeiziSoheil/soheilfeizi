import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Helper to sample a rounded-square tile with crisp border + inner graphic motif:
 *  - variant 0: Horizontal typography/cadence bars (Khatt Studio)
 *  - variant 1: Architectural crisp grid lines (PulseSync)
 *  - variant 2: Luminous indigo-dotted matrix grid (Dastgah DSP)
 */
function fillAppTile(
  positions: Float32Array,
  accents: Float32Array,
  startCursor: number,
  tileCount: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  halfSize: number,
  cornerRadius: number,
  variant: 0 | 1 | 2,
  scatterAmount: number,
  tiltY: number,
  rnd: () => number
): number {
  let cursor = startCursor;
  const borderCount = Math.floor(tileCount * 0.38);
  const innerCount = tileCount - borderCount;
  const cosY = Math.cos(tiltY);
  const sinY = Math.sin(tiltY);

  const writePoint = (lx: number, ly: number, lz: number, accent: number) => {
    const sx = lx + (rnd() - 0.5) * scatterAmount;
    const sy = ly + (rnd() - 0.5) * scatterAmount;
    const sz = lz + (rnd() - 0.5) * scatterAmount * 1.4;

    const rx = sx * cosY + sz * sinY;
    const rz = -sx * sinY + sz * cosY;

    const i3 = cursor * 3;
    positions[i3] = centerX + rx;
    positions[i3 + 1] = centerY + sy;
    positions[i3 + 2] = centerZ + rz;
    accents[cursor] = accent;
    cursor++;
  };

  // 1. Rounded-square perimeter frame
  const straightHalf = Math.max(0.05, halfSize - cornerRadius);
  for (let i = 0; i < borderCount; i++) {
    const seg = i % 8;
    let lx = 0;
    let ly = 0;
    const t = rnd();
    const thickness = (rnd() - 0.5) * 0.032;

    if (seg === 0) {
      // Top straight
      lx = -straightHalf + t * straightHalf * 2;
      ly = halfSize + thickness;
    } else if (seg === 1) {
      // Bottom straight
      lx = -straightHalf + t * straightHalf * 2;
      ly = -halfSize + thickness;
    } else if (seg === 2) {
      // Left straight
      lx = -halfSize + thickness;
      ly = -straightHalf + t * straightHalf * 2;
    } else if (seg === 3) {
      // Right straight
      lx = halfSize + thickness;
      ly = -straightHalf + t * straightHalf * 2;
    } else {
      // Rounded corners (4 quadrants)
      const q = seg - 4;
      const baseAngle = q * (Math.PI / 2);
      const a = baseAngle + t * (Math.PI / 2);
      const cx = q === 0 || q === 3 ? straightHalf : -straightHalf;
      const cy = q === 0 || q === 1 ? straightHalf : -straightHalf;
      const r = cornerRadius + thickness;
      lx = cx + Math.cos(a) * r;
      ly = cy + Math.sin(a) * r;
    }

    const isAccentEdge = variant === 2 && rnd() < 0.35;
    writePoint(lx, ly, (rnd() - 0.5) * 0.03, isAccentEdge ? 0.8 : 0.34 + rnd() * 0.14);
  }

  // 2. Interior motif unique to each tile
  const pad = halfSize * 0.68;

  if (variant === 0) {
    // Horizontal bars (5 clean cadence rows with varied lengths)
    const rows = 5;
    const lengths = [0.95, 0.72, 0.88, 0.58, 0.8];
    for (let i = 0; i < innerCount; i++) {
      const rIdx = i % rows;
      const yNorm = -0.78 + (rIdx / (rows - 1)) * 1.56;
      const barLen = lengths[rIdx] * pad * 2;
      const lx = -pad + rnd() * barLen;
      const ly = yNorm * pad + (rnd() - 0.5) * 0.055;
      const isHighlightBar = rIdx === 0 || rIdx === 2;
      writePoint(
        lx,
        ly,
        0.04 + (rnd() - 0.5) * 0.02,
        isHighlightBar && rnd() < 0.25 ? 0.78 : 0.28 + rnd() * 0.18
      );
    }
  } else if (variant === 1) {
    // Crisp architectural 4x4 grid lines
    const lines = 4;
    for (let i = 0; i < innerCount; i++) {
      const isHoriz = i % 2 === 0;
      const lineIdx = Math.floor(rnd() * lines);
      const pos = -pad + (lineIdx / (lines - 1)) * pad * 2;
      const span = -pad + rnd() * pad * 2;
      const jitter = (rnd() - 0.5) * 0.026;
      const lx = isHoriz ? span : pos + jitter;
      const ly = isHoriz ? pos + jitter : span;
      writePoint(lx, ly, 0.03 + (rnd() - 0.5) * 0.02, 0.26 + rnd() * 0.2);
    }
  } else {
    // 5x5 matrix of luminous indigo (#5B5BF0) circular nodes
    const cols = 5;
    const dotRadius = halfSize * 0.085;
    for (let i = 0; i < innerCount; i++) {
      const gx = i % cols;
      const gy = Math.floor(i / cols) % cols;
      const cx = -pad + (gx / (cols - 1)) * pad * 2;
      const cy = -pad + (gy / (cols - 1)) * pad * 2;
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * dotRadius;
      const lx = cx + Math.cos(a) * r;
      const ly = cy + Math.sin(a) * r;
      // Diagonal & center nodes glow electric indigo
      const isIndigoDot = (gx + gy) % 2 === 0 || (gx === 2 && gy === 2);
      writePoint(
        lx,
        ly,
        0.06 + (rnd() - 0.5) * 0.02,
        isIndigoDot ? 0.82 + rnd() * 0.18 : 0.34 + rnd() * 0.14
      );
    }
  }

  return cursor;
}

/**
 * Shape 6 — Three App Tiles (Scattered / Emerging)
 * Smaller, gently dispersed tiles drifting into alignment.
 */
export function generateAppTilesScatteredShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(7101);

  const usable = Math.floor(count * 0.84);
  const perTile = Math.floor(usable / 3);
  let cursor = 0;

  cursor = fillAppTile(positions, accents, cursor, perTile, -2.05, 0.26, -0.45, 0.62, 0.14, 0, 0.22, 0.22, rnd);
  cursor = fillAppTile(positions, accents, cursor, perTile, 0.05, -0.22, 0.15, 0.64, 0.14, 1, 0.2, -0.08, rnd);
  cursor = fillAppTile(positions, accents, cursor, perTile, 2.12, 0.18, -0.3, 0.62, 0.14, 2, 0.22, -0.24, rnd);

  fillAmbientDust(positions, accents, cursor, count, 7102);
  return { positions, accents };
}

/**
 * Shape 7 — Three App Tiles (Focused / Locked-in)
 * Larger, razor-sharp, aligned tiles ready for interactive cursor parallax.
 */
export function generateAppTilesFocusedShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(7201);

  const usable = Math.floor(count * 0.88);
  const perTile = Math.floor(usable / 3);
  let cursor = 0;

  cursor = fillAppTile(positions, accents, cursor, perTile, -2.1, 0.0, 0.0, 0.82, 0.18, 0, 0.015, 0.08, rnd);
  cursor = fillAppTile(positions, accents, cursor, perTile, 0.0, 0.0, 0.12, 0.84, 0.18, 1, 0.012, 0.0, rnd);
  cursor = fillAppTile(positions, accents, cursor, perTile, 2.1, 0.0, 0.0, 0.82, 0.18, 2, 0.015, -0.08, rnd);

  fillAmbientDust(positions, accents, cursor, count, 7202);
  return { positions, accents };
}
