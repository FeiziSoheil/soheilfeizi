import * as THREE from 'three';
import {
  ARC_ORBIT_NODE_TS,
  STORY_TUNNEL_CONFIG,
  evaluateArcOrbitPoint,
} from '../story.config';
import {
  type ShapeBuffer,
  createSeededRandom,
  fillSurplusDust,
  shuffleShapeBuffer,
} from './types';
import {
  type SvgStrokeSpec,
  sampleSvgPaths,
  svgEllipsePath,
  svgRoundedRectPath,
} from './svgSampler';

function createEmptyBuffer(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const dustMask = new Float32Array(count);
  const meta = new Float32Array(count);
  meta.fill(-1.0);
  return { positions, accents, dustMask, meta };
}

/**
 * 00 INTRO CLOUD
 * Airy, structured hollow constellation shell with clear open interior void,
 * 75% crisp outer shell & meridian filaments, 15% indigo star cluster, 10% wide dust.
 */
export function buildIntroCloud(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(101);

  const structureN = Math.floor(count * 0.75);
  const accentN = Math.floor(count * 0.15);
  let idx = 0;

  // 75% Crisp open ellipsoidal shell + equatorial constellation band (empty inside)
  for (let i = 0; i < structureN && idx < count; i++, idx++) {
    const u = rand() * Math.PI * 2;
    const isBand = rand() < 0.35;
    let x = 0;
    let y = 0;
    let z = 0;

    if (isBand) {
      const r = 2.6 + (rand() - 0.5) * 0.18;
      x = Math.cos(u) * r * 1.2;
      y = (rand() - 0.5) * 0.24 + Math.sin(u * 2) * 0.18;
      z = Math.sin(u) * r * 0.85;
    } else {
      const cosPhi = 2 * rand() - 1;
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
      // Strictly hollow shell around r = 0.92..1.05 (clear dark interior)
      const r = 0.92 + rand() * 0.13;
      x = r * sinPhi * Math.cos(u) * 3.1;
      y = r * cosPhi * 1.95;
      z = r * sinPhi * Math.sin(u) * 2.05;
    }

    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 15% Delicate indigo focal orbital filament
  for (let i = 0; i < accentN && idx < count; i++, idx++) {
    const a = rand() * Math.PI * 2;
    const r = 1.65 + (rand() - 0.5) * 0.08;
    const x0 = Math.cos(a) * r * 1.3;
    const z0 = Math.sin(a) * r * 0.9;
    const y0 = (rand() - 0.5) * 0.05;
    const tilt = 0.48;
    const i3 = idx * 3;
    positions[i3] = x0;
    positions[i3 + 1] = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    positions[i3 + 2] = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    accents[idx] = 0.95;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 10% Ambient background dust
  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 1001);
}

/**
 * 01 SPHERE
 * Strictly hollow outer sphere surface (uniform spherical coordinate sampling, empty inside),
 * crisp hollow inner core shell, and two razor-thin tilted orbital rings.
 * Budget: 75% structure, 15% accent, 10% ambient dust.
 */
export function buildSphereShape(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(202);

  const shellN = Math.floor(count * 0.61);
  const coreN = Math.floor(count * 0.11);
  const ring1N = Math.floor(count * 0.10);
  const ring2N = Math.floor(count * 0.08);
  let idx = 0;

  // Strictly hollow outer shell (thin surface, zero volume fill — pure analytical 0.5ms sampling)
  for (let i = 0; i < shellN && idx < count; i++, idx++) {
    const theta = rand() * Math.PI * 2;
    const cosPhi = 2 * rand() - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const r = 2.15 + (rand() - 0.5) * 0.014;
    const x = r * sinPhi * Math.cos(theta);
    const y = r * cosPhi;
    const z = r * sinPhi * Math.sin(theta);

    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    // Lower rim highlight ~8% of shell
    const lowerFactor = Math.max(0, Math.min(1, (-y - 0.65) / 1.5));
    accents[idx] = rand() < lowerFactor * 0.45 ? 0.92 : 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // Hollow inner core shell (strictly surface-sampled at r = 0.44)
  for (let i = 0; i < coreN && idx < count; i++, idx++) {
    const theta = rand() * Math.PI * 2;
    const cosPhi = 2 * rand() - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const r = 0.44 + (rand() - 0.5) * 0.01;
    const i3 = idx * 3;
    positions[i3] = r * sinPhi * Math.cos(theta);
    positions[i3 + 1] = r * cosPhi;
    positions[i3 + 2] = r * sinPhi * Math.sin(theta);
    accents[idx] = 0.96;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // Razor-thin tilted orbital ring 1
  const tilt1 = 0.42;
  for (let i = 0; i < ring1N && idx < count; i++, idx++) {
    const a = (i / ring1N) * Math.PI * 2 + (rand() - 0.5) * 0.004;
    const r = 2.95 + (rand() - 0.5) * 0.018;
    const rx = Math.cos(a) * r;
    const rz = Math.sin(a) * r;
    const ry = (rand() - 0.5) * 0.014;
    const i3 = idx * 3;
    positions[i3] = rx;
    positions[i3 + 1] = ry * Math.cos(tilt1) - rz * Math.sin(tilt1);
    positions[i3 + 2] = ry * Math.sin(tilt1) + rz * Math.cos(tilt1);
    accents[idx] = Math.sin(a * 2) > 0.65 ? 0.88 : 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // Razor-thin tilted orbital ring 2
  const tilt2 = -0.56;
  for (let i = 0; i < ring2N && idx < count; i++, idx++) {
    const a = (i / ring2N) * Math.PI * 2 + (rand() - 0.5) * 0.004;
    const r = 3.45 + (rand() - 0.5) * 0.018;
    const rx = Math.cos(a) * r;
    const rz = Math.sin(a) * r;
    const ry = (rand() - 0.5) * 0.014;
    const i3 = idx * 3;
    positions[i3] = rx * Math.cos(0.32) - rz * Math.sin(0.32);
    positions[i3 + 1] = ry * Math.cos(tilt2) - rz * Math.sin(tilt2);
    positions[i3 + 2] = rx * Math.sin(0.32) + rz * Math.cos(0.32);
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 2002);
}

/**
 * 03 ARC ORBIT (TRAJECTORY) — REDESIGNED FOR RAZOR CLARITY
 * - Single clean thin tubular arc (tube radius ~2.6% of arc radius = 0.08, strictly hollow surface)
 * - Exactly 3 hollow spherical shell milestone nodes (radius ~7% of arc = 0.22):
 *   Discover (t=0.14), Architect (t=0.50), Launch & Scale (t=0.86)
 * - Encodes exact arc parameter t in `meta[idx]` so the shader renders a crisp,
 *   short traveling indigo progress segment along the path (never a wide blotch).
 */
export function buildArcOrbitShape(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(303);

  const arcN = Math.floor(count * 0.54);
  const nodesN = Math.floor(count * 0.36);
  const nodeRadius = 0.22; // ~7% of 3.1 arc radius
  const tubeRadius = 0.068; // ~2.2% of 3.1 arc radius (strictly <= 3%)
  let idx = 0;

  // Build uniform arc-length lookup table along evaluateArcOrbitPoint so sampling is 100% even
  const LUT_STEPS = 400;
  const lutPts: Array<[number, number, number]> = [];
  const lutCumLen: number[] = [0];
  let totalArcLen = 0;
  for (let s = 0; s <= LUT_STEPS; s++) {
    const t = s / LUT_STEPS;
    const pt = evaluateArcOrbitPoint(t);
    lutPts.push(pt);
    if (s > 0) {
      const prev = lutPts[s - 1];
      totalArcLen += Math.hypot(pt[0] - prev[0], pt[1] - prev[1], pt[2] - prev[2]);
      lutCumLen.push(totalArcLen);
    }
  }

  const sampleUniformArc = (uDist: number) => {
    const target = uDist * totalArcLen;
    let lo = 0;
    let hi = LUT_STEPS;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (lutCumLen[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const i1 = Math.max(1, lo);
    const i0 = i1 - 1;
    const segLen = Math.max(1e-6, lutCumLen[i1] - lutCumLen[i0]);
    const frac = (target - lutCumLen[i0]) / segLen;
    const t = (i0 + frac) / LUT_STEPS;
    const p0 = lutPts[i0];
    const p1 = lutPts[i1];
    return {
      t,
      x: p0[0] + (p1[0] - p0[0]) * frac,
      y: p0[1] + (p1[1] - p0[1]) * frac,
      z: p0[2] + (p1[2] - p0[2]) * frac,
      tx: p1[0] - p0[0],
      ty: p1[1] - p0[1],
      tz: p1[2] - p0[2],
    };
  };

  // Precompute exact 3 node positions so the arc stays cleanly trimmed outside the hollow node shells
  const nodeCenters = ARC_ORBIT_NODE_TS.map((nt) => evaluateArcOrbitPoint(nt));

  // 1. Uniformly sampled thin hollow tubular arc (54%)
  for (let i = 0; i < arcN && idx < count; i++) {
    const u = (i + 0.5) / arcN;
    const s = sampleUniformArc(u);

    // Keep interior of the 3 hollow milestone spheres completely clear
    let insideNode = false;
    for (let n = 0; n < nodeCenters.length; n++) {
      const nc = nodeCenters[n];
      const d = Math.hypot(s.x - nc[0], s.y - nc[1], s.z - nc[2]);
      if (d < nodeRadius * 0.98) {
        insideNode = true;
        break;
      }
    }
    if (insideNode) continue;

    // Orthonormal frame (N, B) perpendicular to tangent T for clean hollow tube surface
    const tLen = Math.hypot(s.tx, s.ty, s.tz) || 1;
    const tx = s.tx / tLen;
    const ty = s.ty / tLen;
    const tz = s.tz / tLen;

    // Cross T with world Z (or Y if parallel)
    let bx = ty;
    let by = -tx;
    let bz = 0;
    const bLen = Math.hypot(bx, by, bz) || 1;
    bx /= bLen;
    by /= bLen;
    const nx = ty * bz - tz * by;
    const ny = tz * bx - tx * bz;
    const nz = tx * by - ty * bx;

    const theta = rand() * Math.PI * 2;
    const r = tubeRadius * (0.85 + rand() * 0.15);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const i3 = idx * 3;
    positions[i3] = s.x + (nx * cosT + bx * sinT) * r;
    positions[i3 + 1] = s.y + (ny * cosT + by * sinT) * r;
    positions[i3 + 2] = s.z + (nz * cosT + bz * sinT) * r;
    accents[idx] = 0.0; // Accent driven dynamically by crisp moving progress pulse in shader
    dustMask[idx] = 0.0;
    meta[idx] = s.t;
    idx++;
  }

  // 2. Three hollow spherical milestone nodes (Discover, Architect, Launch & Scale) + crisp equatorial rings
  const perNode = Math.floor(nodesN / nodeCenters.length);
  for (let n = 0; n < nodeCenters.length; n++) {
    const [nx, ny, nz] = nodeCenters[n];
    const nt = ARC_ORBIT_NODE_TS[n];
    const isMiddle = n === 1;
    const rad = isMiddle ? nodeRadius * 1.15 : nodeRadius;
    const ringCountN = Math.floor(perNode * 0.24);
    const shellCountN = perNode - ringCountN;

    // Strictly hollow sphere surface
    for (let k = 0; k < shellCountN && idx < count; k++, idx++) {
      const th = rand() * Math.PI * 2;
      const cp = 2 * rand() - 1;
      const sp = Math.sqrt(Math.max(0, 1 - cp * cp));
      const r = rad + (rand() - 0.5) * 0.008;
      const i3 = idx * 3;
      positions[i3] = nx + r * sp * Math.cos(th);
      positions[i3 + 1] = ny + r * cp;
      positions[i3 + 2] = nz + r * sp * Math.sin(th);
      accents[idx] = isMiddle ? 0.45 : 0.0;
      dustMask[idx] = 0.0;
      meta[idx] = nt;
    }

    // Thin outer halo ring around each node so silhouette pops immediately
    for (let k = 0; k < ringCountN && idx < count; k++, idx++) {
      const a = (k / ringCountN) * Math.PI * 2;
      const r = rad * 1.48 + (rand() - 0.5) * 0.006;
      const i3 = idx * 3;
      positions[i3] = nx + Math.cos(a) * r;
      positions[i3 + 1] = ny + Math.sin(a) * r * 0.92;
      positions[i3 + 2] = nz + Math.sin(a) * r * 0.35;
      accents[idx] = isMiddle ? 0.92 : 0.22;
      dustMask[idx] = 0.0;
      meta[idx] = nt;
    }
  }

  // 10% Ambient background dust
  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 3003);
}

/**
 * 04 TUNNEL / CYLINDER — DERIVED FROM CAMERA FLIGHT DISTANCE
 * ringCount = ceil((zStart - zEnd) / ringSpacing) + 12 so rings extend well past zEnd.
 * Crisp hollow concentric circles (empty center corridor) + periodic indigo accent rings + distant star.
 */
export function buildTunnelShape(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(404);

  const { zStart, zEnd, ringSpacing, ringCount, starZ } = STORY_TUNNEL_CONFIG;
  const ringParticles = Math.floor(count * 0.84);
  const starParticles = Math.floor(count * 0.06);
  const perRing = Math.floor(ringParticles / ringCount);

  let idx = 0;
  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const zBase = zStart + 1.0 - rIdx * ringSpacing;
    // Clean breathing variation while preserving sharp hollow corridor silhouette
    const radiusBase =
      2.6 + Math.sin(rIdx * 0.28) * 0.24 + Math.cos(rIdx * 0.14) * 0.12;
    // Roughly 15% of rings highlighted in crisp #5B5BF0 indigo
    const isPurple = rIdx % 7 === 3;

    for (let k = 0; k < perRing && idx < count; k++, idx++) {
      const angle = (k / perRing) * Math.PI * 2 + (rand() - 0.5) * 0.008;
      const jitterR = (rand() - 0.5) * 0.042;
      const jitterZ = (rand() - 0.5) * 0.028;
      const r = radiusBase + jitterR;

      const i3 = idx * 3;
      positions[i3] = Math.cos(angle) * r;
      positions[i3 + 1] = Math.sin(angle) * r;
      positions[i3 + 2] = zBase + jitterZ;

      accents[idx] = isPurple ? 0.96 : 0.0;
      dustMask[idx] = 0.0;
      meta[idx] = rIdx / Math.max(1, ringCount - 1);
    }
  }

  // Crisp luminous vanishing-point focal star right beyond zEnd
  for (let i = 0; i < starParticles && idx < count; i++, idx++) {
    const a = rand() * Math.PI * 2;
    const cp = 2 * rand() - 1;
    const sp = Math.sqrt(Math.max(0, 1 - cp * cp));
    const rad = 0.18 + Math.pow(rand(), 1.6) * 0.22;
    const i3 = idx * 3;
    positions[i3] = Math.cos(a) * sp * rad;
    positions[i3 + 1] = cp * rad;
    positions[i3 + 2] = starZ + Math.sin(a) * sp * rad;
    accents[idx] = 1.0;
    dustMask[idx] = 0.0;
    meta[idx] = 1.0;
  }

  // 10% subtle outer corridor ambient dust (kept outside inner r > 3.1 so tunnel stays sharp)
  const zSpan = zStart + 2.0 - (zEnd - 12.0);
  for (; idx < count; idx++) {
    const i3 = idx * 3;
    const a = rand() * Math.PI * 2;
    const rad = 3.25 + rand() * 3.0;
    positions[i3] = Math.cos(a) * rad;
    positions[i3 + 1] = Math.sin(a) * rad;
    positions[i3 + 2] = zStart + 2.0 - rand() * zSpan;
    accents[idx] = rand() < 0.12 ? 0.65 : 0.0;
    dustMask[idx] = 1.0;
    meta[idx] = -1.0;
  }

  return shuffleShapeBuffer(buf, 4004);
}

/**
 * 05 ORBIT SYSTEM
 * Three razor-thin elliptical orbit tracks sampled uniformly via SVG `getPointAtLength`,
 * paired with strictly hollow spherical shell planets (15% indigo hero planet).
 */
export function buildOrbitSystemShape(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(505);

  const orbits = [
    { rx: 1.55, rz: 1.15, tiltX: 0.28, tiltZ: 0.1, accent: 0.0 },
    { rx: 2.35, rz: 1.75, tiltX: 0.24, tiltZ: -0.08, accent: 0.25 },
    { rx: 3.15, rz: 2.35, tiltX: 0.2, tiltZ: 0.06, accent: 0.0 },
  ];

  const planets = [
    { cx: 0, cy: 0, cz: 0, r: 0.36, accent: 0.0, weight: 0.15 },
    { cx: 1.85, cy: 0.15, cz: 0.45, r: 0.56, accent: 1.0, weight: 0.33 }, // Hero indigo planet
    { cx: -2.2, cy: 0.35, cz: 0.6, r: 0.30, accent: 0.0, weight: 0.14 },
    { cx: 0.25, cy: -1.45, cz: -0.75, r: 0.32, accent: 0.0, weight: 0.14 },
    { cx: -1.4, cy: -0.92, cz: -1.42, r: 0.24, accent: 0.0, weight: 0.12 },
    { cx: 2.65, cy: -0.52, cz: -1.2, r: 0.25, accent: 0.0, weight: 0.12 },
  ];

  const orbitTotalN = Math.floor(count * 0.42);
  const planetTotalN = Math.floor(count * 0.48);
  const perOrbit = Math.floor(orbitTotalN / orbits.length);
  let idx = 0;

  // Sample each elliptical orbit cleanly via SVG path getPointAtLength (fallback to analytic ellipse in SSR)
  for (const orb of orbits) {
    const svgPts = sampleSvgPaths(
      [{ d: svgEllipsePath(500, 500, orb.rx * 120, orb.rz * 120), accent: orb.accent }],
      perOrbit,
      1000,
      1000,
      1000 / 120,
      1000 / 120,
      rand,
      0.004
    );

    const nPts = svgPts.length > 0 ? svgPts.length : perOrbit;
    for (let k = 0; k < nPts && idx < count; k++, idx++) {
      let x0 = 0;
      let z0 = 0;
      if (svgPts.length > 0) {
        x0 = svgPts[k].x;
        z0 = svgPts[k].y;
      } else {
        const a = (k / perOrbit) * Math.PI * 2;
        x0 = Math.cos(a) * orb.rx;
        z0 = Math.sin(a) * orb.rz;
      }
      const y0 = (rand() - 0.5) * 0.01;
      const y1 = y0 * Math.cos(orb.tiltX) - z0 * Math.sin(orb.tiltX);
      const z1 = y0 * Math.sin(orb.tiltX) + z0 * Math.cos(orb.tiltX);
      const x2 = x0 * Math.cos(orb.tiltZ) - y1 * Math.sin(orb.tiltZ);
      const y2 = x0 * Math.sin(orb.tiltZ) + y1 * Math.cos(orb.tiltZ);

      const i3 = idx * 3;
      positions[i3] = x2;
      positions[i3 + 1] = y2;
      positions[i3 + 2] = z1;
      accents[idx] = orb.accent;
      dustMask[idx] = 0.0;
      meta[idx] = -1.0;
    }
  }

  // Strictly hollow spherical shell planets (empty interior!)
  for (let p = 0; p < planets.length; p++) {
    const pl = planets[p];
    const pCount = Math.floor(planetTotalN * pl.weight);
    for (let k = 0; k < pCount && idx < count; k++, idx++) {
      const th = rand() * Math.PI * 2;
      const cp = 2 * rand() - 1;
      const sp = Math.sqrt(Math.max(0, 1 - cp * cp));
      const r = pl.r + (rand() - 0.5) * 0.008;
      const i3 = idx * 3;
      positions[i3] = pl.cx + r * sp * Math.cos(th);
      positions[i3 + 1] = pl.cy + r * cp;
      positions[i3 + 2] = pl.cz + r * sp * Math.sin(th);
      accents[idx] = pl.accent;
      dustMask[idx] = 0.0;
      meta[idx] = -1.0;
    }
  }

  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 5005);
}

/**
 * 06 & 07 APP TILES (Scattered vs Focused)
 * Uniform SVG `getPointAtLength` sampled rounded squares with crisp 1-unit strokes:
 * - Tile 1: Horizontal precision bars
 * - Tile 2: Clean orthogonal grid lines
 * - Tile 3: Grid + hollow indigo circular nodes
 */
export function buildAppTilesShape(count: number, focused: boolean): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(focused ? 707 : 606);

  const tileWorld = focused ? 1.72 : 1.38;
  const spread = focused ? 2.22 : 2.38;
  const jitter = focused ? 0.005 : 0.022;

  const centers = focused
    ? [
        [-spread, 0, 0.05],
        [0, 0, 0.12],
        [spread, 0, 0.05],
      ]
    : [
        [-spread, -0.22, -0.45],
        [0, 0.24, 0.28],
        [spread, -0.16, -0.30],
      ];

  const activeTotal = Math.floor(count * 0.90);
  const perTile = Math.floor(activeTotal / 3);
  let idx = 0;

  for (let tIdx = 0; tIdx < 3; tIdx++) {
    const [cx, cy, cz] = centers[tIdx];
    const specs: SvgStrokeSpec[] = [
      // Outer crisp rounded-square frame (100x100 viewBox)
      {
        d: svgRoundedRectPath(6, 6, 88, 88, 16),
        weight: 1.5,
        accent: tIdx === 2 ? 0.3 : 0.0,
      },
    ];

    if (tIdx === 0) {
      // Tile 1: 5 crisp horizontal bar lines with distinct lengths
      const widths = [60, 48, 60, 52, 34];
      widths.forEach((w, r) => {
        const y = 24 + r * 13;
        specs.push({
          d: `M 20 ${y} H ${20 + w}`,
          weight: 1.15,
          accent: r === 0 ? 0.95 : 0.0,
        });
      });
    } else if (tIdx === 1) {
      // Tile 2: Clean 4x4 orthogonal mesh lines
      const coords = [24, 41, 59, 76];
      coords.forEach((c) => {
        specs.push({ d: `M 20 ${c} H 80`, weight: 0.95, accent: 0.0 });
        specs.push({ d: `M ${c} 20 V 80`, weight: 0.95, accent: 0.0 });
      });
    } else {
      // Tile 3: Subtle mesh + 9 crisp hollow indigo circular nodes at intersections
      const coords = [28, 50, 72];
      coords.forEach((c) => {
        specs.push({ d: `M 22 ${c} H 78`, weight: 0.65, accent: 0.0 });
        specs.push({ d: `M ${c} 22 V 78`, weight: 0.65, accent: 0.0 });
      });
      for (const gx of coords) {
        for (const gy of coords) {
          specs.push({
            d: svgEllipsePath(gx, gy, 4.4, 4.4),
            weight: 1.4,
            accent: 1.0,
            z: 0.03,
          });
        }
      }
    }

    const sampled = sampleSvgPaths(
      specs,
      perTile,
      100,
      100,
      tileWorld,
      tileWorld,
      rand,
      jitter
    );

    if (sampled.length > 0) {
      for (let k = 0; k < sampled.length && idx < count; k++, idx++) {
        const pt = sampled[k];
        const i3 = idx * 3;
        positions[i3] = cx + pt.x;
        positions[i3 + 1] = cy + pt.y;
        positions[i3 + 2] = cz + pt.z;
        accents[idx] = pt.accent;
        dustMask[idx] = 0.0;
        meta[idx] = -1.0;
      }
    } else {
      // SSR fallback perimeter
      for (let k = 0; k < perTile && idx < count; k++, idx++) {
        const a = (k / perTile) * Math.PI * 2;
        const i3 = idx * 3;
        positions[i3] = cx + Math.cos(a) * tileWorld * 0.45;
        positions[i3 + 1] = cy + Math.sin(a) * tileWorld * 0.45;
        positions[i3 + 2] = cz;
        accents[idx] = tIdx === 2 ? 0.9 : 0.0;
        dustMask[idx] = 0.0;
        meta[idx] = -1.0;
      }
    }
  }

  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, focused ? 7007 : 6006);
}

/**
 * 10 CLOSING LUMINOUS RING / ARC
 * Strictly hollow torus surface shell (empty center, sharp edge) + crisp indigo highlight filament.
 * Budget: 75% hollow shell, 15% indigo accent arc, 10% ambient dust.
 */
export function buildClosingRingShape(count: number): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(1010);

  const structureN = Math.floor(count * 0.75);
  const accentN = Math.floor(count * 0.15);
  const R = 2.52;
  const tiltX = 0.30;
  const tiltY = -0.20;

  const projectRing = (x0: number, y0: number, z0: number) => {
    const y1 = y0 * Math.cos(tiltX) - z0 * Math.sin(tiltX);
    const z1 = y0 * Math.sin(tiltX) + z0 * Math.cos(tiltX);
    const x2 = x0 * Math.cos(tiltY) + z1 * Math.sin(tiltY);
    const z2 = -x0 * Math.sin(tiltY) + z1 * Math.cos(tiltY);
    return [x2, y1, z2] as const;
  };

  let idx = 0;

  // 75% Strictly hollow torus surface (tubeR = 0.14, empty interior!)
  for (let i = 0; i < structureN && idx < count; i++, idx++) {
    const u = rand() * Math.PI * 2;
    const v = rand() * Math.PI * 2;
    const tubeR = 0.14 + (rand() - 0.5) * 0.01;
    const r = R + Math.cos(v) * tubeR;
    const [wx, wy, wz] = projectRing(
      Math.cos(u) * r,
      Math.sin(u) * r,
      Math.sin(v) * tubeR
    );
    const i3 = idx * 3;
    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 15% Razor-crisp outer indigo orbital filament arc
  for (let i = 0; i < accentN && idx < count; i++, idx++) {
    const u = (i / accentN) * Math.PI * 1.45 - 0.25;
    const v = rand() * Math.PI * 2;
    const tubeR = 0.042;
    const r = R + 0.24 + Math.cos(v) * tubeR;
    const [wx, wy, wz] = projectRing(
      Math.cos(u) * r,
      Math.sin(u) * r,
      Math.sin(v) * tubeR
    );
    const i3 = idx * 3;
    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;
    accents[idx] = 0.98;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 10010);
}
