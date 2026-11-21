export interface ShapeBuffer {
  /** Flat XYZ positions (length = count * 3) */
  positions: Float32Array;
  /** Per-particle accent intensity 0..1 (#5B5BF0 indigo mask, length = count) */
  accents: Float32Array;
  /** Per-particle ambient dust flag: 0 = shape structure, 1 = dim ambient background dust */
  dustMask: Float32Array;
  /** Per-particle metadata (e.g. normalized arc progress 0..1 along Trajectory, -1 otherwise) */
  meta: Float32Array;
}

/** Fast deterministic PRNG (Mulberry32) so every particle maps consistently across chapters */
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fill remaining surplus (~10% budget) as subtle, wide-field ambient dust
 * positioned outside the focal silhouette so shape edges and negative space stay razor clear.
 */
export function fillSurplusDust(
  positions: Float32Array,
  accents: Float32Array,
  dustMask: Float32Array,
  meta: Float32Array,
  startIndex: number,
  totalCount: number,
  rand: () => number,
  spreadX = 9.2,
  spreadY = 5.8,
  spreadZ = 7.5
) {
  for (let i = startIndex; i < totalCount; i++) {
    const i3 = i * 3;
    // Push dust gently outward into a wide atmospheric perimeter so it never muddies the shape
    const angle = rand() * Math.PI * 2;
    const radial = 0.55 + Math.pow(rand(), 0.65) * 0.75;
    positions[i3] = Math.cos(angle) * radial * spreadX;
    positions[i3 + 1] = (rand() * 2 - 1) * spreadY;
    positions[i3 + 2] = Math.sin(angle) * radial * spreadZ - 2.2;
    accents[i] = rand() < 0.08 ? 0.65 : 0.0;
    dustMask[i] = 1.0;
    meta[i] = -1.0;
  }
}

/** Deterministic in-place Fisher-Yates shuffle on particle slots so morphs flow like stardust */
export function shuffleShapeBuffer(buffer: ShapeBuffer, seed: number): ShapeBuffer {
  const count = buffer.accents.length;
  const rand = createSeededRandom(seed);
  const { positions, accents, dustMask, meta } = buffer;

  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    if (i === j) continue;
    const i3 = i * 3;
    const j3 = j * 3;

    const tx = positions[i3];
    const ty = positions[i3 + 1];
    const tz = positions[i3 + 2];
    positions[i3] = positions[j3];
    positions[i3 + 1] = positions[j3 + 1];
    positions[i3 + 2] = positions[j3 + 2];
    positions[j3] = tx;
    positions[j3 + 1] = ty;
    positions[j3 + 2] = tz;

    const ta = accents[i];
    accents[i] = accents[j];
    accents[j] = ta;

    const td = dustMask[i];
    dustMask[i] = dustMask[j];
    dustMask[j] = td;

    const tm = meta[i];
    meta[i] = meta[j];
    meta[j] = tm;
  }
  return buffer;
}
