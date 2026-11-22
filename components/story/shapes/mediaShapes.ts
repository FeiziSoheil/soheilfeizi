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

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * 02 UI PLANE (INTERFACE CRAFT) — COMPLETELY REDESIGNED SVG WIREFRAME STOREFRONT
 * Sampled uniformly via SVGPathElement.getPointAtLength in 5 distinct architectural groups
 * with >= 4% width whitespace separation between blocks and uniform 1-unit stroke clarity:
 *   1) Outer browser frame
 *   2) Top navbar (logo mark + 4 nav links + bottom rule)
 *   3) Hero block (2-line headline, subline, preview frame, and ONLY the CTA button in #5B5BF0 purple)
 *   4) Row of 3 rounded product cards (each with square image frame + 2 short text lines)
 *   5) Crisp footer bar
 * Gentle perspective tilt: rotateY = -14° (-0.244 rad), rotateX = +5° (+0.087 rad).
 * Budget: 75% wireframe structure, 15% purple CTA button highlight, 10% ambient dust.
 */
export async function buildUiPlaneShape(count: number): Promise<ShapeBuffer> {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(252);

  const viewW = 1000;
  const viewH = 640;
  const worldW = 4.65;
  const worldH = 2.98;

  // Gentle studio tilt: rotateY = -14 deg, rotateX = +5 deg (prevents line overlap)
  const rotY = (-14 * Math.PI) / 180;
  const rotX = (5 * Math.PI) / 180;
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);

  const projectTilted = (lx: number, ly: number, lz: number) => {
    const x1 = lx * cosY + lz * sinY;
    const z1 = -lx * sinY + lz * cosY;
    const y2 = ly * cosX - z1 * sinX;
    const z2 = ly * sinX + z1 * cosX;
    return [x1, y2, z2] as const;
  };

  // --- Structure strokes (75% budget, accent = 0) ---
  const structureSpecs: SvgStrokeSpec[] = [
    // Group 1: Outer browser window frame (inset 16px, rounded corners r=16)
    { d: svgRoundedRectPath(16, 16, 968, 608, 16), weight: 1.35 },

    // Group 2: Top Navbar (y=16..88) — Logo mark + 4 clean links + divider
    { d: 'M 16 88 H 984', weight: 1.0 },
    // Logo geometric mark on left
    { d: svgRoundedRectPath(56, 38, 28, 28, 6), weight: 1.2 },
    { d: 'M 98 52 H 176', weight: 1.0 },
    // 4 navigation links spaced >= 4% width (44px) apart on right
    { d: 'M 556 52 H 620', weight: 1.0 },
    { d: 'M 664 52 H 728', weight: 1.0 },
    { d: 'M 772 52 H 836', weight: 1.0 },
    { d: 'M 880 52 H 944', weight: 1.0 },

    // Group 3: Hero Section (y=124..284, >= 4% gap from navbar and cards)
    // Headline line 1 & line 2
    { d: 'M 56 144 H 460', weight: 1.25 },
    { d: 'M 56 176 H 388', weight: 1.25 },
    // Subtitle hairline
    { d: 'M 56 206 H 424', weight: 0.9 },
    // Right-side clean hero editorial frame (leaving >= 4% gap from left column)
    { d: svgRoundedRectPath(564, 124, 380, 156, 12), weight: 1.1 },
    // Minimal diagonal / inner focal mark inside hero preview
    { d: svgEllipsePath(754, 202, 42, 42), weight: 0.95 },

    // Group 4: Row of 3 Product Cards (y=324..536, each 264w, 48px = 4.8% gap between cards!)
    // Card 1 (x=56..320)
    { d: svgRoundedRectPath(56, 324, 264, 212, 12), weight: 1.1 },
    { d: svgRoundedRectPath(74, 342, 228, 122, 6), weight: 1.0 },
    { d: 'M 74 490 H 236', weight: 0.95 },
    { d: 'M 74 512 H 184', weight: 0.9 },

    // Card 2 (x=368..632)
    { d: svgRoundedRectPath(368, 324, 264, 212, 12), weight: 1.1 },
    { d: svgRoundedRectPath(386, 342, 228, 122, 6), weight: 1.0 },
    { d: 'M 386 490 H 548', weight: 0.95 },
    { d: 'M 386 512 H 496', weight: 0.9 },

    // Card 3 (x=680..944)
    { d: svgRoundedRectPath(680, 324, 264, 212, 12), weight: 1.1 },
    { d: svgRoundedRectPath(698, 342, 228, 122, 6), weight: 1.0 },
    { d: 'M 698 490 H 860', weight: 0.95 },
    { d: 'M 698 512 H 808', weight: 0.9 },

    // Group 5: Footer bar (y=572..624, 36px+ separation from cards)
    { d: 'M 16 572 H 984', weight: 0.95 },
    { d: 'M 56 598 H 188', weight: 0.9 },
    { d: 'M 724 598 H 780', weight: 0.85 },
    { d: 'M 812 598 H 868', weight: 0.85 },
    { d: 'M 900 598 H 944', weight: 0.85 },
  ];

  // --- Accent strokes (15% budget — ONLY the Hero CTA Button is purple!) ---
  const ctaSpecs: SvgStrokeSpec[] = [
    { d: svgRoundedRectPath(56, 236, 192, 44, 8), weight: 1.8, accent: 1.0, z: 0.04 },
    { d: svgRoundedRectPath(60, 240, 184, 36, 6), weight: 1.1, accent: 0.95, z: 0.04 },
    { d: 'M 98 258 H 206', weight: 1.0, accent: 1.0, z: 0.05 },
  ];

  const structureN = Math.floor(count * 0.75);
  const accentN = Math.floor(count * 0.15);
  let idx = 0;

  const sampledStructure = sampleSvgPaths(
    structureSpecs,
    structureN,
    viewW,
    viewH,
    worldW,
    worldH,
    rand,
    0.004
  );

  const sampledCta = sampleSvgPaths(
    ctaSpecs,
    accentN,
    viewW,
    viewH,
    worldW,
    worldH,
    rand,
    0.004
  );

  for (let i = 0; i < sampledStructure.length && idx < count; i++, idx++) {
    const pt = sampledStructure[i];
    const [wx, wy, wz] = projectTilted(pt.x, pt.y, pt.z);
    const i3 = idx * 3;
    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  for (let i = 0; i < sampledCta.length && idx < count; i++, idx++) {
    const pt = sampledCta[i];
    const [wx, wy, wz] = projectTilted(pt.x, pt.y, pt.z);
    const i3 = idx * 3;
    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;
    accents[idx] = pt.accent;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 10% Ambient background dust
  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 2525);
}

/**
 * 08 TYPOGRAPHY WORD ("invisible." or "نامرئی.")
 * High-resolution 2048px canvas sampling (alpha > 0.5, jitter <= 0.5px in canvas space)
 * so every letter contour is unmistakably sharp and readable during hold.
 */
export function buildWordShape(
  count: number,
  word: string,
  isRtl = false
): ShapeBuffer {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(808);

  const cw = 1280;
  const ch = 400;
  const worldW = 5.6;
  const worldH = (ch / cw) * worldW;
  const halfPxWorldX = (0.5 / cw) * worldW;
  const halfPxWorldY = (0.5 / ch) * worldH;

  const coreX: number[] = [];
  const coreY: number[] = [];
  const accentX: number[] = [];
  const accentY: number[] = [];

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.clearRect(0, 0, cw, ch);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      const fontFamily = isRtl
        ? 'Vazirmatn, sans-serif'
        : '"Inter Tight", system-ui, sans-serif';
      const fontSize = isRtl ? 194 : 210;
      ctx.font = `700 ${fontSize}px ${fontFamily}`;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(word, cw * 0.5, ch * 0.52);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeText(word, cw * 0.5, ch * 0.52);

      const data = ctx.getImageData(0, 0, cw, ch).data;
      const step = 2;
      for (let y = 0; y < ch; y += step) {
        for (let x = 0; x < cw; x += step) {
          const alpha = data[(y * cw + x) * 4 + 3];
          if (alpha > 128) {
            const leftA = x >= step ? data[(y * cw + (x - step)) * 4 + 3] : 0;
            const rightA = x + step < cw ? data[(y * cw + (x + step)) * 4 + 3] : 0;
            const topA = y >= step ? data[((y - step) * cw + x) * 4 + 3] : 0;
            const botA = y + step < ch ? data[((y + step) * cw + x) * 4 + 3] : 0;
            const isEdge = leftA <= 128 || rightA <= 128 || topA <= 128 || botA <= 128;

            const nx = (x / cw - 0.5) * worldW;
            const ny = (0.5 - y / ch) * worldH;

            const isPeriod = isRtl ? nx < -1.55 : nx > 1.88;
            if (isPeriod) {
              accentX.push(nx);
              accentY.push(ny);
            } else {
              coreX.push(nx);
              coreY.push(ny);
              if (isEdge) {
                coreX.push(nx);
                coreY.push(ny);
              }
            }
          }
        }
      }
    }
    canvas.width = 0;
    canvas.height = 0;
  }

  const structureN = Math.floor(count * 0.75);
  const accentN = Math.floor(count * 0.15);
  const coreLen = coreX.length;
  const accentLen = accentX.length;
  let idx = 0;

  for (let i = 0; i < structureN && idx < count; i++, idx++) {
    let x = (rand() - 0.5) * 4.6;
    let y = (rand() - 0.5) * 1.0;
    if (coreLen > 0) {
      const k = Math.floor(rand() * coreLen);
      x = coreX[k] + (rand() - 0.5) * halfPxWorldX * 2;
      y = coreY[k] + (rand() - 0.5) * halfPxWorldY * 2;
    }
    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = (rand() - 0.5) * 0.03;
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  for (let i = 0; i < accentN && idx < count; i++, idx++) {
    let x = 0;
    let y = 0;
    if (accentLen > 0 && rand() < 0.55) {
      const k = Math.floor(rand() * accentLen);
      x = accentX[k] + (rand() - 0.5) * halfPxWorldX * 2;
      y = accentY[k] + (rand() - 0.5) * halfPxWorldY * 2;
    } else if (coreLen > 0) {
      const k = Math.floor(rand() * coreLen);
      x = coreX[k] + (rand() - 0.5) * halfPxWorldX * 2;
      y = coreY[k] + (rand() - 0.5) * halfPxWorldY * 2;
    }
    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = 0.02 + (rand() - 0.5) * 0.02;
    accents[idx] = 0.96;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 10% Ambient background dust
  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 8008);
}

/**
 * 09 PORTRAIT
 * Crisp high-contrast luminance + Sobel edge importance sampling from the real
 * editorial portrait photograph (jitter <= 0.5px equivalent, alpha > 0.5, clean 75/15/10 budget).
 */
export async function buildPortraitShape(
  count: number,
  imageSrc: string
): Promise<ShapeBuffer> {
  const buf = createEmptyBuffer(count);
  const { positions, accents, dustMask, meta } = buf;
  const rand = createSeededRandom(909);

  const img = await loadImageElement(imageSrc);
  const facePoints: Array<[number, number, number]> = [];
  const rimPoints: Array<[number, number, number]> = [];

  const worldW = 3.45;
  const worldH = 4.55;

  if (img && img.naturalWidth > 0 && typeof document !== 'undefined') {
    const sw = 320;
    const sh = 420;
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      try {
        ctx.drawImage(img, 0, 0, sw, sh);
        const data = ctx.getImageData(0, 0, sw, sh).data;
        const lumGrid = new Float32Array(sw * sh);
        for (let i = 0; i < sw * sh; i++) {
          const p4 = i * 4;
          const a = data[p4 + 3] / 255;
          lumGrid[i] =
            a > 0.5
              ? (data[p4] * 0.299 + data[p4 + 1] * 0.587 + data[p4 + 2] * 0.114) / 255
              : 0;
        }

        for (let y = 1; y < sh - 1; y++) {
          for (let x = 1; x < sw - 1; x++) {
            const idxPx = y * sw + x;
            const lum = lumGrid[idxPx];
            if (lum < 0.08) continue;

            // Elliptical vignette cleanly isolating head & shoulders
            const ex = (x / (sw - 1) - 0.5) * 2.0;
            const ey = (y / (sh - 1) - 0.48) * 2.0;
            const rEll = Math.hypot(ex * 1.06, ey * 0.96);
            const vig = Math.max(0, 1 - Math.max(0, (rEll - 0.65) / 0.36));
            if (vig <= 0.02) continue;

            // Crisp Sobel gradient for unmistakable facial contour & eyes/jawline sharpness
            const gx =
              -lumGrid[(y - 1) * sw + (x - 1)] +
              lumGrid[(y - 1) * sw + (x + 1)] -
              2 * lumGrid[y * sw + (x - 1)] +
              2 * lumGrid[y * sw + (x + 1)] -
              lumGrid[(y + 1) * sw + (x - 1)] +
              lumGrid[(y + 1) * sw + (x + 1)];
            const gy =
              -lumGrid[(y - 1) * sw + (x - 1)] -
              2 * lumGrid[(y - 1) * sw + x] -
              lumGrid[(y - 1) * sw + (x + 1)] +
              lumGrid[(y + 1) * sw + (x - 1)] +
              2 * lumGrid[(y + 1) * sw + x] +
              lumGrid[(y + 1) * sw + (x + 1)];
            const edge = Math.min(1, Math.hypot(gx, gy) * 1.15);

            const px = (x / (sw - 1) - 0.5) * worldW;
            const py = (0.5 - y / (sh - 1)) * worldH;

            if (edge > 0.24 && lum > 0.18) {
              rimPoints.push([px, py, lum]);
            }

            const prob = (Math.pow(lum, 1.1) * 0.65 + edge * 0.85) * vig;
            if (prob > 0.14 && rand() < prob) {
              facePoints.push([px, py, lum]);
            }
          }
        }
      } catch {
        // fallback handled below
      }
    }
    canvas.width = 0;
    canvas.height = 0;
  }

  const structureN = Math.floor(count * 0.75);
  const accentN = Math.floor(count * 0.15);
  const jitterX = (0.5 / 320) * worldW;
  const jitterY = (0.5 / 420) * worldH;
  let idx = 0;

  // 75% Crisp portrait features
  for (let i = 0; i < structureN && idx < count; i++, idx++) {
    let x = 0;
    let y = 0;
    let z = 0;
    if (facePoints.length > 0) {
      const c = facePoints[Math.floor(rand() * facePoints.length)];
      x = c[0] + (rand() - 0.5) * jitterX * 2;
      y = c[1] + (rand() - 0.5) * jitterY * 2;
      z = (c[2] - 0.4) * 0.36 + (rand() - 0.5) * 0.015;
    } else {
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * 1.15;
      y = Math.sin(a) * 1.45;
      z = 0;
    }
    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    accents[idx] = 0.0;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 15% Crisp high-contrast indigo edge contours
  for (let i = 0; i < accentN && idx < count; i++, idx++) {
    let x = 0;
    let y = 0;
    let z = 0.05;
    const pool = rimPoints.length > 0 ? rimPoints : facePoints;
    if (pool.length > 0) {
      const c = pool[Math.floor(rand() * pool.length)];
      x = c[0] + (rand() - 0.5) * jitterX * 2;
      y = c[1] + (rand() - 0.5) * jitterY * 2;
      z = (c[2] - 0.35) * 0.38 + 0.02;
    }
    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    accents[idx] = 0.85;
    dustMask[idx] = 0.0;
    meta[idx] = -1.0;
  }

  // 10% Ambient background dust
  fillSurplusDust(positions, accents, dustMask, meta, idx, count, rand);
  return shuffleShapeBuffer(buf, 9009);
}
