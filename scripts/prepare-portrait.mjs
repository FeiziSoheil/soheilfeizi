#!/usr/bin/env node
/**
 * Portrait Asset Preparation Script
 * Uses `sharp` (pre-installed) to generate:
 *   1. public/portrait-cutout.png  (1528x2048 RGBA, transparent background, clean hair/shoulder edge)
 *   2. public/face-mask.png        (1528x2048 RGBA, soft oval face+upper-neck mask with ~15% feather)
 *
 * Usage:
 *   node scripts/prepare-portrait.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const INPUT_PATH = path.join(
  ROOT,
  'src/assets/images/soheil_editorial_portrait_1795200948891.jpg'
);
const OUT_CUTOUT = path.join(ROOT, 'public/portrait-cutout.png');
const OUT_MASK = path.join(ROOT, 'public/face-mask.png');

const TARGET_W = 1528;
const TARGET_H = 2048;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Separable box blur on a Float32Array [0..1] alpha plane (zero channel mismatch bugs).
 */
function boxBlur(src, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const diam = radius * 2 + 1;

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      const cx = Math.max(0, Math.min(w - 1, dx));
      sum += src[row + cx];
    }
    tmp[row] = sum / diam;
    for (let x = 1; x < w; x++) {
      const addX = Math.min(w - 1, x + radius);
      const remX = Math.max(0, x - radius - 1);
      sum += src[row + addX] - src[row + remX];
      tmp[row + x] = sum / diam;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const cy = Math.max(0, Math.min(h - 1, dy));
      sum += tmp[cy * w + x];
    }
    dst[x] = sum / diam;
    for (let y = 1; y < h; y++) {
      const addY = Math.min(h - 1, y + radius);
      const remY = Math.max(0, y - radius - 1);
      sum += tmp[addY * w + x] - tmp[remY * w + x];
      dst[y * w + x] = sum / diam;
    }
  }
  return dst;
}

async function buildCutoutAndMask() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input portrait not found: ${INPUT_PATH}`);
  }
  fs.mkdirSync(path.dirname(OUT_CUTOUT), { recursive: true });

  // 1. Upscale portrait to exact 1528x2048 RGB buffer
  const { data: rgbBuf, info } = await sharp(INPUT_PATH)
    .resize(TARGET_W, TARGET_H, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const C = info.channels;
  console.log(`[prepare-portrait] Loaded ${W}x${H} (${C}ch)`);

  // Compute luminance plane
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const ic = i * C;
    lum[i] = (0.299 * rgbBuf[ic] + 0.587 * rgbBuf[ic + 1] + 0.114 * rgbBuf[ic + 2]) / 255;
  }

  // Slight smoothing before gradient so studio film grain doesn't block background flood-fill
  const smoothLum = boxBlur(lum, W, H, 2);

  // Sobel gradient magnitude on smoothed luminance
  const grad = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    const row = y * W;
    for (let x = 1; x < W - 1; x++) {
      const idx = row + x;
      const gx =
        -smoothLum[idx - W - 1] +
        smoothLum[idx - W + 1] -
        2 * smoothLum[idx - 1] +
        2 * smoothLum[idx + 1] -
        smoothLum[idx + W - 1] +
        smoothLum[idx + W + 1];
      const gy =
        -smoothLum[idx - W - 1] -
        2 * smoothLum[idx - W] -
        smoothLum[idx - W + 1] +
        smoothLum[idx + W - 1] +
        2 * smoothLum[idx + W] +
        smoothLum[idx + W + 1];
      grad[idx] = Math.hypot(gx, gy);
    }
  }

  // Background flood-fill seeded from top, left, and upper-right studio edges
  const bg = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qHead = 0;
  let qTail = 0;

  const seed = (x, y) => {
    const idx = y * W + x;
    if (!bg[idx]) {
      bg[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < W; x++) seed(x, 0);
  for (let y = 0; y < Math.round(H * 0.96); y++) {
    if (smoothLum[y * W + 4] > 0.78) seed(0, y);
  }
  for (let y = 0; y < Math.round(H * 0.54); y++) {
    seed(W - 1, y);
  }

  // Right studio wall region strictly outside ear, neck, and above right sweater shoulder
  const isRightWallZone = (u, v) => {
    // Above ear/hair right margin
    if (v < 0.25) return u > 0.72;
    // Beside ear (ear ends around u=0.728 at v=0.26..0.375)
    if (v < 0.375) return u > 0.732;
    // Beside neck (neck right edge at u=0.668 at v=0.375..0.46)
    if (v < 0.46) return u > 0.672;
    // Above sloping right sweater shoulder: (0.672, 0.46) -> (1.0, 0.642)
    const shoulderY = 0.46 + ((u - 0.672) / (1.0 - 0.672)) * 0.182;
    return u > 0.672 && v < shoulderY;
  };

  const dx4 = [1, -1, 0, 0];
  const dy4 = [0, 0, 1, -1];

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % W;
    const y = (idx / W) | 0;

    for (let k = 0; k < 4; k++) {
      const nx = x + dx4[k];
      const ny = y + dy4[k];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const nIdx = ny * W + nx;
      if (bg[nIdx]) continue;

      const u = nx / W;
      const v = ny / H;
      const l = smoothLum[nIdx];
      const g = grad[nIdx];

      // 1. Clean bright studio backdrop (left & top)
      const isStudioWhite = l > 0.885 && g < 0.13;
      // 2. Slightly lower bright studio backdrop well outside the face silhouette
      const isOuterBackdrop =
        l > 0.83 &&
        g < 0.15 &&
        (u < 0.305 || v < 0.055 || (u < 0.355 && v > 0.445));
      // 3. Smooth cast shadow on right studio wall right down to the black sweater boundary
      const isRightWallShadow = isRightWallZone(u, v) && l > 0.08 && g < 0.24;

      if (isStudioWhite || isOuterBackdrop || isRightWallShadow) {
        bg[nIdx] = 1;
        queue[qTail++] = nIdx;
      }
    }
  }

  // Keep ONLY the main connected foreground subject (removes any isolated speck below ear or edge)
  const visitedFg = new Uint8Array(W * H);
  const fgQueue = new Int32Array(W * H);
  const seedFg = Math.round(H * 0.72) * W + Math.round(W * 0.5);
  let fgHead = 0;
  let fgTail = 0;
  if (!bg[seedFg]) {
    visitedFg[seedFg] = 1;
    fgQueue[fgTail++] = seedFg;
  }
  while (fgHead < fgTail) {
    const idx = fgQueue[fgHead++];
    const x = idx % W;
    const y = (idx / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + dx4[k];
      const ny = y + dy4[k];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const nIdx = ny * W + nx;
      if (bg[nIdx] || visitedFg[nIdx]) continue;
      visitedFg[nIdx] = 1;
      fgQueue[fgTail++] = nIdx;
    }
  }

  // Convert to float foreground alpha [0..1]
  const rawAlpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    rawAlpha[i] = visitedFg[i] ? 1 : 0;
  }

  // Subtle 2-pass blur (radius 2 + 2) for smooth studio-grade anti-aliased hair & shoulder edges
  let softAlpha = boxBlur(rawAlpha, W, H, 2);
  softAlpha = boxBlur(softAlpha, W, H, 2);

  // Refine semi-transparent edge fringe: pull down residual studio white spill on outer boundary
  const finalAlpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    let a = softAlpha[i];
    if (a > 0 && a < 0.99) {
      const l = lum[i];
      // Bright studio spill pixels at partial alpha gently fade to 0 so zero white halo shows on dark bg
      const spill = smoothstep(0.76, 0.94, l);
      a = a * (1 - spill * 0.72);
    }
    // Slight contrast curve on alpha edge for crisp yet feathered hair
    finalAlpha[i] = smoothstep(0.06, 0.92, a);
  }

  // Write public/portrait-cutout.png (monochrome B&W with clean transparent background)
  const cutoutRgba = Buffer.allocUnsafe(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const i4 = i * 4;
    let g = lum[i] * 255;
    const a = finalAlpha[i];
    // Decontaminate outer semi-transparent bright fringe
    if (a > 0.01 && a < 0.9 && g > 175) {
      g = g * (0.55 + 0.45 * a);
    }
    const v = Math.max(0, Math.min(255, Math.round(g)));
    cutoutRgba[i4] = v;
    cutoutRgba[i4 + 1] = v;
    cutoutRgba[i4 + 2] = v;
    cutoutRgba[i4 + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }

  await sharp(cutoutRgba, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toFile(OUT_CUTOUT);

  console.log(`[prepare-portrait] Wrote ${OUT_CUTOUT}`);

  // 2. Generate public/face-mask.png (1528x2048 RGBA)
  // Covers head, hair, face & upper neck cleanly, fading smoothly to 0 from the chin down (~15% feather)
  const maskRgba = Buffer.allocUnsafe(W * H * 4);
  const cx = 0.51;
  const cy = 0.275;
  const rx = 0.255;
  const ryTop = 0.23;
  const ryBot = 0.235;
  // Chin bottom sits at ~0.495; neck collar at ~0.55 -> feather across 15% of image height (0.43..0.58)
  const chinFadeStart = 0.43;
  const chinFadeEnd = 0.58;

  for (let y = 0; y < H; y++) {
    const ny = y / H;
    const verticalCut = 1 - smoothstep(chinFadeStart, chinFadeEnd, ny);

    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const dx = (nx - cx) / rx;
      const ry = ny < cy ? ryTop : ryBot;
      const dy = (ny - cy) / ry;
      const r = Math.hypot(dx, dy);

      const ovalAlpha = 1 - smoothstep(0.84, 1.15, r);
      const a = Math.round(Math.max(0, Math.min(1, ovalAlpha * verticalCut)) * 255);

      const i4 = (y * W + x) * 4;
      maskRgba[i4] = 255;
      maskRgba[i4 + 1] = 255;
      maskRgba[i4 + 2] = 255;
      maskRgba[i4 + 3] = a;
    }
  }

  await sharp(maskRgba, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toFile(OUT_MASK);

  console.log(`[prepare-portrait] Wrote ${OUT_MASK}`);
}

buildCutoutAndMask().catch((err) => {
  console.error('[prepare-portrait] Failed:', err);
  process.exit(1);
});
