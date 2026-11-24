// Story-grade Normalized [0..1, 0..1] 3D point-cloud samplers for Site L0 Particle Engine.
// Mirrors the exact sampling precision of /story:
// 1. 2048px OffscreenCanvas text sampling (alpha > 128, <= 0.5px jitter, contour emphasis, RTL safe)
// 2. Sobel-edge + luminance portrait sampling (razor-sharp features, 3D relief, rim accent)
// 3. Uniform SVGPathElement.getPointAtLength() sampling (<= 0.45 jitter, 3D z-layers, storefront wireframe)
// 4. Crisp hollow 3D mathematical shells for all 6 Process stages
// Strict 75% crisp structure / 15% architectural accent / 10% quiet surround dust budget.

import {
  HERO_PORTRAIT_CONFIG,
  WHAT_I_DO_PARTICLE_CONFIG,
} from '@/lib/site.config';

export interface NormalizedPoint {
  u: number; // 0..1 within element rect width
  v: number; // 0..1 within element rect height
  z: number; // -1..1 sculptural 3D depth relief
  accent: number; // 0..1 architectural indigo highlight
  order: number; // 0..1 path/assembly progression order
  dust?: number; // 0 = crisp structure/accent, 1 = ambient surround dust
  shade?: number; // 0..1 photographic luminance tone (used by Hero portrait)
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashKey(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MAX_SAMPLE_CACHE = 48;
const sampleCache = new Map<string, NormalizedPoint[]>();
const svgPolylineCache = new Map<string, { lut: Float32Array; segs: number; totalLen: number }>();
let _reusablePathEl: SVGPathElement | null = null;

function getReusablePath(): SVGPathElement | null {
  if (typeof document === 'undefined') return null;
  if (!_reusablePathEl) {
    _reusablePathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  }
  return _reusablePathEl;
}

function cacheSample(key: string, pts: NormalizedPoint[]) {
  if (!key) return;
  if (sampleCache.has(key)) {
    sampleCache.delete(key);
  } else if (sampleCache.size >= MAX_SAMPLE_CACHE) {
    const oldest = sampleCache.keys().next().value;
    if (oldest !== undefined) sampleCache.delete(oldest);
  }
  sampleCache.set(key, pts);
}

/**
 * Pre-samples an SVG path ONCE into a compact polyline lookup table (x, y, tx, ty)
 * using ~48..160 DOM calls instead of 210,000 calls per diagram switch (~500x faster).
 * Reuses a single shared SVGPathElement to avoid DOM node thrashing.
 */
function getSvgPathPolyline(d: string): { lut: Float32Array; segs: number; totalLen: number } {
  const cached = svgPolylineCache.get(d);
  if (cached) return cached;

  const pathEl = getReusablePath();
  if (!pathEl) {
    return { lut: new Float32Array(0), segs: 0, totalLen: 0 };
  }

  pathEl.setAttribute('d', d);
  const totalLen = Math.max(1, pathEl.getTotalLength());
  // 48..160 segments is sub-pixel resolution (< 0.5px) for 380px frame without CPU stalling
  const segs = Math.max(48, Math.min(160, Math.ceil(totalLen * 0.75)));
  const lut = new Float32Array((segs + 1) * 4);

  for (let i = 0; i <= segs; i++) {
    const pt = pathEl.getPointAtLength((i / segs) * totalLen);
    lut[i * 4] = pt.x;
    lut[i * 4 + 1] = pt.y;
  }
  for (let i = 0; i <= segs; i++) {
    const prev = Math.max(0, i - 1) * 4;
    const next = Math.min(segs, i + 1) * 4;
    let tx = lut[next] - lut[prev];
    let ty = lut[next + 1] - lut[prev + 1];
    const len = Math.hypot(tx, ty);
    if (len > 1e-4) {
      tx /= len;
      ty /= len;
    } else {
      tx = 1;
      ty = 0;
    }
    lut[i * 4 + 2] = tx;
    lut[i * 4 + 3] = ty;
  }

  const entry = { lut, segs, totalLen };
  svgPolylineCache.set(d, entry);
  return entry;
}

export function clearSamplerCache() {
  sampleCache.clear();
}

function appendSurroundDust(
  result: NormalizedPoint[],
  targetCount: number,
  rand: () => number
) {
  while (result.length < targetCount) {
    const angle = rand() * Math.PI * 2;
    const rad = 0.34 + Math.sqrt(rand()) * 0.28;
    result.push({
      u: Math.max(-0.08, Math.min(1.08, 0.5 + Math.cos(angle) * rad)),
      v: Math.max(-0.08, Math.min(1.08, 0.5 + Math.sin(angle) * rad)),
      z: (rand() - 0.5) * 1.15,
      accent: rand() < 0.12 ? 0.5 : 0,
      order: rand(),
      dust: 1,
    });
  }
}

/**
 * 1. TEXT SAMPLER — 2048px high-resolution OffscreenCanvas, alpha > 128,
 *    <= 0.5px jitter, contour-weighted sampling, direction='rtl' for Persian.
 */
export async function sampleTextNormalized(
  text: string,
  count: number,
  options: {
    isRtl?: boolean;
    align?: 'center' | 'start';
    accentRatio?: number;
    mono?: boolean;
  } = {}
): Promise<NormalizedPoint[]> {
  const { isRtl = false, align = 'center', accentRatio = 0.14, mono = false } = options;
  const cacheKey = `text2k:${text}:${count}:${isRtl}:${align}:${accentRatio}:${mono}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font API edge cases
    }
  }

  const w = 2048;
  const h = 640;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(w, h);
    ctx = off.getContext('2d', { willReadFrequently: true });
  } else if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    ctx = c.getContext('2d', { willReadFrequently: true });
  }

  const rand = mulberry32(hashKey(cacheKey));
  if (!ctx) {
    const fallback: NormalizedPoint[] = [];
    appendSurroundDust(fallback, count, rand);
    return fallback;
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  ctx.direction = isRtl ? 'rtl' : 'ltr';

  const fontFamily = mono
    ? '"JetBrains Mono", "Vazirmatn", monospace'
    : isRtl
      ? '"Vazirmatn", "Inter Tight", sans-serif'
      : '"Inter Tight", "Vazirmatn", sans-serif';

  let fontSize = Math.min(410, Math.max(150, Math.floor(1940 / Math.max(3, text.length * 0.68))));
  ctx.font = `800 ${fontSize}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  if (measured > w * 0.9) {
    fontSize = Math.max(96, Math.floor(fontSize * ((w * 0.88) / measured)));
    ctx.font = `800 ${fontSize}px ${fontFamily}`;
  }

  let drawX = w / 2;
  if (align === 'center') {
    ctx.textAlign = 'center';
    drawX = w / 2;
  } else if (isRtl) {
    ctx.textAlign = 'right';
    drawX = w - 48;
  } else {
    ctx.textAlign = 'left';
    drawX = 48;
  }

  ctx.fillText(text, drawX, h * 0.52);

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const edgePts: number[] = [];
  const interiorPts: number[] = [];

  // Scan at 3px stride; separate crisp glyph outlines from interior fill
  const stride = 3;
  for (let y = stride; y < h - stride; y += stride) {
    for (let x = stride; x < w - stride; x += stride) {
      const a = imgData[(y * w + x) * 4 + 3];
      if (a <= 128) continue;

      const aL = imgData[(y * w + (x - stride)) * 4 + 3];
      const aR = imgData[(y * w + (x + stride)) * 4 + 3];
      const aU = imgData[((y - stride) * w + x) * 4 + 3];
      const aD = imgData[((y + stride) * w + x) * 4 + 3];

      if (aL <= 128 || aR <= 128 || aU <= 128 || aD <= 128) {
        edgePts.push(x, y);
      } else {
        interiorPts.push(x, y);
      }
    }
  }

  const structTarget = Math.floor(count * 0.9);
  const edgeCount = edgePts.length / 2;
  const intCount = interiorPts.length / 2;
  const result: NormalizedPoint[] = [];

  if (edgeCount === 0 && intCount === 0) {
    appendSurroundDust(result, count, rand);
    sampleCache.set(cacheKey, result);
    return result;
  }

  // 55% crisp glyph edge contour + 45% evenly distributed glyph interior -> razor-sharp legibility
  const wantEdge = edgeCount > 0 ? Math.floor(structTarget * 0.55) : 0;
  const wantInt = structTarget - wantEdge;

  for (let i = 0; i < wantEdge; i++) {
    const pick = Math.floor(rand() * edgeCount) * 2;
    const u = (edgePts[pick] + (rand() - 0.5) * 0.5) / w;
    const v = (edgePts[pick + 1] + (rand() - 0.5) * 0.5) / h;
    // Architectural indigo highlight concentrated subtly along upper/right stroke contours
    const isAccent = rand() < accentRatio * 1.45 ? 1 : 0;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (rand() - 0.5) * 0.14 + (isAccent ? 0.08 : 0),
      accent: isAccent,
      order: isRtl ? 1 - u : u,
      dust: 0,
    });
  }

  const pool = intCount > 0 ? interiorPts : edgePts;
  const poolLen = pool.length / 2;
  for (let i = 0; i < wantInt; i++) {
    const pick = Math.floor(rand() * poolLen) * 2;
    const u = (pool[pick] + (rand() - 0.5) * 0.5) / w;
    const v = (pool[pick + 1] + (rand() - 0.5) * 0.5) / h;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (rand() - 0.5) * 0.1,
      accent: rand() < accentRatio * 0.35 ? 1 : 0,
      order: isRtl ? 1 - u : u,
      dust: 0,
    });
  }

  // Remaining 10% subtle surround dust
  appendSurroundDust(result, count, rand);
  sampleCache.set(cacheKey, result);
  return result;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * 2. HERO PORTRAIT CUTOUT SAMPLER — High-density luminance-weighted sampling from
 *    transparent cutout PNG (`/portrait-cutout.png`).
 *    - Weighted probability: prob ∝ pow(luminance, 0.8) (dark theme) or pow(1-lum, 0.8) (light theme)
 *    - Seamless blend with `/face-mask.png`: ultra-dense on turtleneck/shoulders/chest/hair-rim,
 *      feathered gently into outer face rim (~15% chin/neck feather) for ZERO visible seam.
 *    - Per-particle photographic grey shade (`shade`) + subtle z-depth parallax (`±0.15`).
 *    - ZERO blue edge-detection contours! `#5B5BF0` accent strictly on 2-3% random sparks.
 *    - Faint outer halo capped at <= 4-5% particles.
 */
export async function sampleImageNormalized(
  imageUrl: string,
  count: number,
  options: {
    aspect?: number;
    accentRatio?: number;
    invertDark?: boolean;
    theme?: 'light' | 'dark';
    isPortraitCutout?: boolean;
  } = {}
): Promise<NormalizedPoint[]> {
  const {
    aspect = 0.786,
    accentRatio = HERO_PORTRAIT_CONFIG.accentRatio,
    theme = HERO_PORTRAIT_CONFIG.theme,
    isPortraitCutout = true,
  } = options;
  const cacheKey = `portraitCutoutV3:${imageUrl}:${count}:${aspect.toFixed(2)}:${theme}:${accentRatio}:${isPortraitCutout}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  const rand = mulberry32(hashKey(cacheKey));
  if (typeof window === 'undefined') return [];

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.crossOrigin = 'anonymous';
      el.referrerPolicy = 'no-referrer';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imageUrl;
    });

    const sampleW = 420;
    const sampleH = Math.round(sampleW / Math.max(0.45, aspect));
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    // Exact `object-cover object-top` crop matching the Hero real-photo layer 1:1
    const imgRatio = img.width / Math.max(1, img.height);
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (imgRatio > aspect) {
      sw = img.height * aspect;
      sx = (img.width - sw) * 0.5;
    } else {
      sh = img.width / aspect;
      sy = 0;
    }

    ctx.clearRect(0, 0, sampleW, sampleH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

    const totalPix = sampleW * sampleH;
    const lumBuf = new Float32Array(totalPix);
    const alphaBuf = new Float32Array(totalPix);
    const weights = new Float32Array(totalPix);
    let totalWeight = 0;

    // Pass 1: Extract luminance & alpha for all pixels
    for (let i = 0; i < totalPix; i++) {
      const i4 = i * 4;
      const a = data[i4 + 3] / 255;
      alphaBuf[i] = a;
      if (a >= 0.14) {
        lumBuf[i] =
          (0.299 * data[i4] + 0.587 * data[i4 + 1] + 0.114 * data[i4 + 2]) / 255;
      }
    }

    const isDarkTheme = theme === 'dark';

    // Pass 2: Full-portrait particle density (face + hair + beard + shirt + jacket)
    // with local Sobel feature emphasis so eyes, eyebrows, nose, beard & zipper stay razor-sharp
    for (let y = 0; y < sampleH; y++) {
      const yUp = Math.max(0, y - 1);
      const yDn = Math.min(sampleH - 1, y + 1);
      for (let x = 0; x < sampleW; x++) {
        const idx = y * sampleW + x;
        const a = alphaBuf[idx];
        if (a < 0.14) continue;

        const lum = lumBuf[idx];
        const xLt = Math.max(0, x - 1);
        const xRt = Math.min(sampleW - 1, x + 1);

        // Local contrast gradient for crisp facial & fabric detail
        const gx = lumBuf[y * sampleW + xRt] - lumBuf[y * sampleW + xLt];
        const gy = lumBuf[yDn * sampleW + x] - lumBuf[yUp * sampleW + x];
        const edgeMag = Math.min(1, Math.hypot(gx, gy) * 2.8);

        let toneWeight: number;
        if (isDarkTheme) {
          toneWeight =
            Math.pow(Math.max(0.02, lum), 0.78) * 1.05 +
            Math.pow(1 - lum, 0.78) * 0.48 +
            edgeMag * 0.75;
        } else {
          // On light bg: dark hair/beard/jacket dense, white t-shirt keeps subtle textured form + sharp folds
          toneWeight =
            Math.pow(Math.max(0.02, 1 - lum), 0.8) * 1.15 +
            0.16 +
            edgeMag * 0.85;
        }

        // Extra crispness in upper portrait face/hair zone so facial identity reads unmistakably as particles
        const v = y / sampleH;
        const faceDetailBoost = isPortraitCutout && v < 0.48 ? 1.22 : 1.0;

        const wVal = toneWeight * a * faceDetailBoost;
        weights[idx] = wVal;
        totalWeight += wVal;
      }
    }

    const result: NormalizedPoint[] = [];
    if (totalWeight <= 0.001) {
      appendSurroundDust(result, count, rand);
      sampleCache.set(cacheKey, result);
      return result;
    }

    // Build exact CDF for O(log N) high-density weighted sampling (120k-160k points in <40ms!)
    const activeIndices: number[] = [];
    const cdf: number[] = [];
    let running = 0;
    for (let i = 0; i < totalPix; i++) {
      if (weights[i] > 0.004) {
        running += weights[i];
        activeIndices.push(i);
        cdf.push(running);
      }
    }

    // >= 96% on portrait body/rim; <= 4% faint ambient halo
    const haloBudget = Math.floor(count * HERO_PORTRAIT_CONFIG.ambientHaloMaxFrac);
    const bodyBudget = count - haloBudget;

    for (let i = 0; i < bodyBudget; i++) {
      const target = rand() * running;
      let lo = 0;
      let hi = cdf.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cdf[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      const pixIdx = activeIndices[lo];
      const px = pixIdx % sampleW;
      const py = (pixIdx / sampleW) | 0;

      // Ultra-tight sub-pixel jitter (minimal noise, crisp photographic grain)
      const u = (px + (rand() - 0.5) * 0.85) / sampleW;
      const v = (py + (rand() - 0.5) * 0.85) / sampleH;
      const lum = lumBuf[pixIdx];

      // Small z-depth proportional to luminance (±0.15 normalized) for subtle 3D parallax
      const z = (lum - 0.5) * 0.3;

      // Photographic shade (0..1)
      const shade = lum;

      // ZERO blue edge-detection contours — ONLY 2..3% random scattered #5B5BF0 sparks!
      const isSpark = rand() < accentRatio ? 1 : 0;

      result.push({
        u: Math.max(0.002, Math.min(0.998, u)),
        v: Math.max(0.002, Math.min(0.998, v)),
        z,
        accent: isSpark,
        order: Math.hypot(u - 0.5, v - 0.42),
        dust: 0,
        shade,
      });
    }

    // Subtle <= 4% ambient halo softly hugging the portrait silhouette
    for (let i = 0; i < haloBudget; i++) {
      const angle = rand() * Math.PI * 2;
      const rad = 0.28 + Math.sqrt(rand()) * 0.26;
      const u = Math.max(0.01, Math.min(0.99, 0.51 + Math.cos(angle) * rad));
      const v = Math.max(0.02, Math.min(0.98, 0.52 + Math.sin(angle) * rad * 1.08));
      result.push({
        u,
        v,
        z: (rand() - 0.5) * 0.3,
        accent: rand() < accentRatio ? 1 : 0,
        order: rand(),
        dust: 1,
        shade: 0.45 + rand() * 0.25,
      });
    }

    sampleCache.set(cacheKey, result);
    return result;
  } catch {
    return [];
  }
}

/**
 * 3. WHAT I DO — THICK GRANULAR PARTICLE TUBES + HOLLOW INTERIORS SAMPLER
 *    Matches the bold editorial visual language ("حاشیه ضخیم دانه‌دار + داخل خالی"):
 *    - Circular cross-section tubes: r = R * sqrt(rand), R ≈ 0.9% width (~6..8px on 1440px)
 *    - Edge roughness: 15% perpendicular jitter + 8% along-path jitter + 4% outer stray sparks
 *    - Hollow interiors: outline-only frames with <= 4.5% sparse interior dust
 *    - Rounded corners (~3% of width) on all UI frames/cards
 *    - Dense ~60% stipple hatch ONLY on selective #5B5BF0 focal blocks + solid dark mini text bars
 *    - Isometric CRM & ERP sampled directly along 3D line segments with generous plate spacing
 */
interface GranularPathSpec {
  kind: 'path';
  d: string;
  accent?: boolean;
  weight?: number;
  zLayer?: number;
  radiusScale?: number;
  isRay?: boolean;
  rayIndex?: number;
}

interface GranularFillRectSpec {
  kind: 'fillRect';
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  accent?: boolean;
  weight?: number;
  zLayer?: number;
  /** Hatch/stipple density multiplier (default 0.6 for accent blocks, 0.9 for mini ink text bars) */
  density?: number;
}

interface GranularFillCircleSpec {
  kind: 'fillCircle';
  cx: number;
  cy: number;
  r: number;
  accent?: boolean;
  weight?: number;
  zLayer?: number;
}

type GranularPrimitive = GranularPathSpec | GranularFillRectSpec | GranularFillCircleSpec;

/** Builds an SVG rounded-rectangle path string */
function roundedRectD(x: number, y: number, w: number, h: number, r: number): string {
  const cr = Math.min(r, w * 0.5, h * 0.5);
  return [
    `M ${x + cr} ${y}`,
    `H ${x + w - cr}`,
    `A ${cr} ${cr} 0 0 1 ${x + w} ${y + cr}`,
    `V ${y + h - cr}`,
    `A ${cr} ${cr} 0 0 1 ${x + w - cr} ${y + h}`,
    `H ${x + cr}`,
    `A ${cr} ${cr} 0 0 1 ${x} ${y + h - cr}`,
    `V ${y + cr}`,
    `A ${cr} ${cr} 0 0 1 ${x + cr} ${y}`,
    'Z',
  ].join(' ');
}

const SVG_DIAGRAMS: Record<
  string,
  { viewW: number; viewH: number; primitives: GranularPrimitive[] }
> = {
  crm: {
    // 01 · CRM & Enterprise Platforms: Spacious 3-stage Kanban pipeline, AI lead match, ACID deal contract, closed-won crest, RBAC hierarchy shield
    viewW: 380,
    viewH: 260,
    primitives: [
      // Top RBAC Security Shield with keyhole & clearance ring (Center)
      { kind: 'path', d: 'M 172 18 L 190 12 L 208 18 C 208 32, 190 40, 190 40 C 190 40, 172 32, 172 18 Z', accent: true, weight: 2.6, zLayer: 0.5, radiusScale: 1.15 },
      { kind: 'fillCircle', cx: 190, cy: 25, r: 3.5, accent: true, weight: 1.2, zLayer: 0.55 },
      { kind: 'path', d: 'M 186 25 V 21 C 186 18, 194 18, 194 21 V 25', accent: true, weight: 1.6, zLayer: 0.55, radiusScale: 0.9 },

      // Stage 1 (Left): Leads Ingestion & AI Scoring
      { kind: 'path', d: roundedRectD(36, 56, 92, 164, 10), accent: false, weight: 2.2, zLayer: 0.15, radiusScale: 1.0 },
      { kind: 'fillCircle', cx: 82, cy: 96, r: 16, accent: false, weight: 1.6, zLayer: 0.22 },
      { kind: 'fillRect', x: 52, y: 126, w: 60, h: 18, rx: 9, accent: true, weight: 1.8, zLayer: 0.35, density: 0.75 },
      { kind: 'fillRect', x: 54, y: 160, w: 56, h: 8, rx: 4, accent: false, weight: 0.8, zLayer: 0.2, density: 0.95 },
      { kind: 'fillRect', x: 60, y: 176, w: 44, h: 6, rx: 3, accent: false, weight: 0.6, zLayer: 0.2, density: 0.95 },

      // Directional Flow Pipeline 1 (Stage 1 -> Stage 2)
      { kind: 'path', d: 'M 128 114 H 144 M 138 109 L 144 114 L 138 119', accent: true, weight: 2.2, zLayer: 0.35, radiusScale: 1.1 },

      // Stage 2 (Center): Active Deals & ACID Transactions (Elevated Focal Card)
      { kind: 'path', d: roundedRectD(144, 48, 92, 178, 10), accent: false, weight: 2.6, zLayer: 0.28, radiusScale: 1.05 },
      { kind: 'fillRect', x: 156, y: 80, w: 68, h: 22, rx: 11, accent: true, weight: 2.4, zLayer: 0.42, density: 0.65 },
      // ACID Lock Padlock Emblem
      { kind: 'path', d: roundedRectD(178, 122, 24, 18, 4), accent: true, weight: 2.0, zLayer: 0.45, radiusScale: 0.95 },
      { kind: 'path', d: 'M 183 122 V 114 C 183 109, 197 109, 197 114 V 122', accent: true, weight: 2.0, zLayer: 0.45, radiusScale: 0.95 },
      // Milestone Progress Bar
      { kind: 'path', d: roundedRectD(156, 162, 68, 8, 4), accent: false, weight: 1.0, zLayer: 0.3, radiusScale: 0.85 },
      { kind: 'fillRect', x: 156, y: 162, w: 48, h: 8, rx: 4, accent: true, weight: 1.4, zLayer: 0.38, density: 0.9 },

      // Directional Flow Pipeline 2 (Stage 2 -> Stage 3)
      { kind: 'path', d: 'M 236 114 H 252 M 246 109 L 252 114 L 246 119', accent: true, weight: 2.2, zLayer: 0.35, radiusScale: 1.1 },

      // Stage 3 (Right): Closed Won & Revenue KPI
      { kind: 'path', d: roundedRectD(252, 56, 92, 164, 10), accent: false, weight: 2.2, zLayer: 0.15, radiusScale: 1.0 },
      // Celebration Victory Badge with Checkmark
      { kind: 'fillCircle', cx: 298, cy: 96, r: 18, accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'path', d: 'M 288 96 L 294 102 L 308 88', accent: false, weight: 3.2, zLayer: 0.55, radiusScale: 1.15 },
      // Upward Revenue Growth Sparkline
      { kind: 'path', d: 'M 264 184 L 284 170 L 304 154 L 324 136 L 334 130', accent: true, weight: 3.0, zLayer: 0.38, radiusScale: 1.25 },
      { kind: 'fillCircle', cx: 334, cy: 130, r: 4.5, accent: true, weight: 1.4, zLayer: 0.48 },

      // Bottom Activity Stream Line
      { kind: 'path', d: 'M 48 236 H 332', accent: false, weight: 1.2, zLayer: 0.1, radiusScale: 0.85 },
      { kind: 'fillCircle', cx: 60, cy: 236, r: 3.5, accent: true, weight: 1.0, zLayer: 0.2 },
    ],
  },
  frontend: {
    // 02 · Modern & Reactive Frontend: Responsive Desktop Window + Floating Mobile Viewport, React 19 atom, shadcn/ui toggle & slider, 60fps kinetic motion wave
    viewW: 380,
    viewH: 260,
    primitives: [
      // Desktop Browser Frame
      { kind: 'path', d: roundedRectD(24, 20, 236, 220, 12), accent: false, weight: 3.0, zLayer: -0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 24 50 H 260', accent: false, weight: 1.4, zLayer: 0.0, radiusScale: 0.95 },
      // Window control dots
      { kind: 'fillCircle', cx: 40, cy: 35, r: 4, accent: true, weight: 1.0, zLayer: 0.1 },
      { kind: 'fillCircle', cx: 54, cy: 35, r: 4, accent: false, weight: 0.7, zLayer: 0.1 },
      { kind: 'fillCircle', cx: 68, cy: 35, r: 4, accent: false, weight: 0.7, zLayer: 0.1 },
      // App Router URL search pill
      { kind: 'path', d: roundedRectD(92, 28, 120, 14, 7), accent: false, weight: 1.2, zLayer: 0.1, radiusScale: 0.85 },

      // Modern UI Controls (shadcn/ui)
      // Toggle Switch
      { kind: 'path', d: roundedRectD(42, 70, 48, 24, 12), accent: true, weight: 2.0, zLayer: 0.28, radiusScale: 1.0 },
      { kind: 'fillCircle', cx: 74, cy: 82, r: 8, accent: true, weight: 2.0, zLayer: 0.38 },
      // Slider
      { kind: 'path', d: roundedRectD(104, 78, 96, 8, 4), accent: false, weight: 1.2, zLayer: 0.2, radiusScale: 0.85 },
      { kind: 'fillCircle', cx: 164, cy: 82, r: 7, accent: true, weight: 1.8, zLayer: 0.35 },

      // React 19 Atomic Symbol
      { kind: 'path', d: 'M 102 114 C 102 96, 182 96, 182 114 C 182 132, 102 132, 102 114', accent: true, weight: 2.4, zLayer: 0.35, radiusScale: 1.1 },
      { kind: 'path', d: 'M 118 90 C 134 78, 166 150, 150 138 C 134 150, 102 78, 118 90', accent: true, weight: 2.4, zLayer: 0.35, radiusScale: 1.1 },
      { kind: 'fillCircle', cx: 142, cy: 114, r: 6, accent: true, weight: 2.0, zLayer: 0.45 },

      // 60fps Kinetic Motion Sine Wave (GSAP / Framer Motion)
      { kind: 'path', d: 'M 38 184 C 74 148, 106 220, 142 184 C 178 148, 210 220, 246 184', accent: true, weight: 3.2, zLayer: 0.38, radiusScale: 1.35 },
      { kind: 'path', d: roundedRectD(188, 150, 58, 16, 8), accent: true, weight: 1.4, zLayer: 0.32, radiusScale: 0.9 },

      // Floating Responsive Mobile Viewport (Right Foreground)
      { kind: 'path', d: roundedRectD(272, 36, 84, 188, 16), accent: false, weight: 3.0, zLayer: 0.48, radiusScale: 1.05 },
      { kind: 'path', d: roundedRectD(298, 46, 32, 8, 4), accent: true, weight: 1.6, zLayer: 0.52, radiusScale: 0.85 },
      { kind: 'path', d: roundedRectD(282, 72, 64, 52, 8), accent: true, weight: 1.8, zLayer: 0.52, radiusScale: 0.95 },
      { kind: 'fillRect', x: 282, y: 148, w: 64, h: 20, rx: 10, accent: true, weight: 2.0, zLayer: 0.55, density: 0.8 },
      { kind: 'path', d: roundedRectD(300, 212, 28, 4, 2), accent: false, weight: 1.2, zLayer: 0.5, radiusScale: 0.8 },
    ],
  },
  integrations: {
    // 03 · Multimodal AI & RAG: Central Neural Core & RAG Agent with 6 Multimodal Satellites (Whisper audio, Qdrant vector cube, Vision tensor, LangGraph, Chunks, Tokens)
    viewW: 380,
    viewH: 260,
    primitives: [
      // Outer Constellation Perimeter Bus
      { kind: 'path', d: 'M 190 28 L 320 76 L 320 184 L 190 232 L 60 184 L 60 76 Z', accent: false, weight: 1.8, zLayer: -0.2, radiusScale: 0.95 },
      // Central Multimodal Neural Core & RAG Agent
      { kind: 'path', d: 'M 190 92 A 38 38 0 1 0 190 168 A 38 38 0 1 0 190 92', accent: false, weight: 2.6, zLayer: 0.35, radiusScale: 1.15 },
      { kind: 'path', d: 'M 190 110 A 20 20 0 1 0 190 150 A 20 20 0 1 0 190 110', accent: true, weight: 2.6, zLayer: 0.55, radiusScale: 1.25 },
      { kind: 'fillCircle', cx: 190, cy: 130, r: 10, accent: true, weight: 2.2, zLayer: 0.6 },

      // Satellite 1: Top (190, 28) · LLM Reasoning & Token Stream
      { kind: 'path', d: 'M 190 12 A 16 16 0 1 0 190 44 A 16 16 0 1 0 190 12', accent: false, weight: 2.0, zLayer: 0.15, radiusScale: 0.95 },
      { kind: 'fillRect', x: 182, y: 22, w: 16, h: 4, rx: 2, accent: true, weight: 0.8, zLayer: 0.22, density: 0.95 },
      { kind: 'fillRect', x: 184, y: 30, w: 12, h: 4, rx: 2, accent: true, weight: 0.7, zLayer: 0.22, density: 0.95 },

      // Satellite 2: Top-Right (320, 76) · Qdrant Vector DB & 3D Embeddings
      { kind: 'path', d: 'M 320 54 L 338 65 L 338 87 L 320 98 L 302 87 L 302 65 Z', accent: false, weight: 2.0, zLayer: 0.22, radiusScale: 0.95 },
      { kind: 'path', d: 'M 320 76 L 320 98 M 320 76 L 338 65 M 320 76 L 302 65', accent: true, weight: 1.6, zLayer: 0.28, radiusScale: 0.9 },
      { kind: 'fillCircle', cx: 320, cy: 76, r: 3.5, accent: true, weight: 1.0, zLayer: 0.35 },

      // Satellite 3: Bottom-Right (320, 184) · Vision & CLIP Multimodal
      { kind: 'path', d: 'M 320 170 A 14 14 0 1 0 320 198 A 14 14 0 1 0 320 170', accent: false, weight: 2.0, zLayer: 0.15, radiusScale: 0.95 },
      { kind: 'fillCircle', cx: 320, cy: 184, r: 6, accent: true, weight: 1.6, zLayer: 0.25 },
      { kind: 'path', d: 'M 310 174 H 306 V 178 M 330 174 H 334 V 178 M 310 194 H 306 V 190 M 330 194 H 334 V 190', accent: true, weight: 1.6, zLayer: 0.22, radiusScale: 0.9 },

      // Satellite 4: Bottom (190, 232) · LangGraph State Graph & Agent Workflow
      { kind: 'fillCircle', cx: 190, cy: 232, r: 7, accent: true, weight: 1.8, zLayer: 0.2 },
      { kind: 'fillCircle', cx: 170, cy: 242, r: 5, accent: false, weight: 1.2, zLayer: 0.15 },
      { kind: 'fillCircle', cx: 210, cy: 242, r: 5, accent: false, weight: 1.2, zLayer: 0.15 },
      { kind: 'path', d: 'M 174 240 L 185 235 M 206 240 L 195 235', accent: true, weight: 1.8, zLayer: 0.22, radiusScale: 0.9 },

      // Satellite 5: Bottom-Left (60, 184) · Document Chunks & RAG Retrieval
      { kind: 'path', d: roundedRectD(44, 170, 32, 24, 4), accent: false, weight: 1.4, zLayer: 0.08, radiusScale: 0.85 },
      { kind: 'path', d: roundedRectD(52, 176, 34, 26, 4), accent: false, weight: 2.0, zLayer: 0.2, radiusScale: 0.95 },
      { kind: 'fillRect', x: 56, y: 184, w: 22, h: 3, rx: 1.5, accent: true, weight: 0.7, zLayer: 0.25, density: 0.95 },
      { kind: 'fillRect', x: 56, y: 191, w: 16, h: 3, rx: 1.5, accent: true, weight: 0.6, zLayer: 0.25, density: 0.95 },

      // Satellite 6: Top-Left (60, 76) · Voice STT/TTS (Whisper & Edge-TTS)
      { kind: 'path', d: 'M 60 60 A 16 16 0 1 0 60 92 A 16 16 0 1 0 60 60', accent: false, weight: 1.8, zLayer: 0.15, radiusScale: 0.95 },
      { kind: 'path', d: 'M 50 72 V 80 M 55 68 V 84 M 60 64 V 88 M 65 68 V 84 M 70 72 V 80', accent: true, weight: 2.4, zLayer: 0.32, radiusScale: 1.05 },

      // 6 Radial Synaptic Conduits connecting satellites directly into central RAG core
      { kind: 'path', d: 'M 190 44 L 190 92', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 0 },
      { kind: 'path', d: 'M 302 86 L 224 116', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 1 },
      { kind: 'path', d: 'M 302 174 L 224 144', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 2 },
      { kind: 'path', d: 'M 190 216 L 190 168', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 3 },
      { kind: 'path', d: 'M 78 174 L 156 144', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 4 },
      { kind: 'path', d: 'M 78 86 L 156 116', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.15, isRay: true, rayIndex: 5 },
    ],
  },
  architecture: {
    // 04 · Backend & Distributed Services: High-throughput Go Echo API Gateway, 4 microservices (Auth/JWT, Worker, WebPush, Broker), WebSocket live sine waves, SSE event stream
    viewW: 380,
    viewH: 260,
    primitives: [
      // Central Ingress API Gateway (Go Echo)
      { kind: 'path', d: 'M 190 92 L 226 111 L 226 149 L 190 168 L 154 149 L 154 111 Z', accent: false, weight: 3.0, zLayer: 0.38, radiusScale: 1.1 },
      { kind: 'path', d: 'M 190 106 L 210 130 L 190 154 L 170 130 Z', accent: true, weight: 2.6, zLayer: 0.52, radiusScale: 1.15 },
      { kind: 'fillCircle', cx: 190, cy: 130, r: 7, accent: true, weight: 2.0, zLayer: 0.6 },

      // Service 1: Top-Left · Auth & Sessions (JWT)
      { kind: 'path', d: roundedRectD(36, 44, 84, 54, 8), accent: false, weight: 2.2, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 54 72 H 78 M 70 72 V 78 M 76 72 V 78', accent: true, weight: 2.2, zLayer: 0.28, radiusScale: 0.95 },
      { kind: 'fillCircle', cx: 104, cy: 58, r: 4, accent: true, weight: 1.0, zLayer: 0.25 },

      // Service 2: Top-Right · FastAPI AI Worker & Task Queue
      { kind: 'path', d: roundedRectD(260, 44, 84, 54, 8), accent: false, weight: 2.2, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'fillRect', x: 272, y: 68, w: 60, h: 6, rx: 3, accent: true, weight: 1.2, zLayer: 0.25, density: 0.85 },
      { kind: 'fillCircle', cx: 328, cy: 58, r: 4, accent: true, weight: 1.0, zLayer: 0.25 },

      // Service 3: Bottom-Right · Notification & WebPush Daemon
      { kind: 'path', d: roundedRectD(260, 162, 84, 54, 8), accent: false, weight: 2.2, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 276 194 A 12 12 0 0 1 276 206 M 284 190 A 20 20 0 0 1 284 210', accent: true, weight: 2.2, zLayer: 0.28, radiusScale: 1.0 },
      { kind: 'fillCircle', cx: 328, cy: 176, r: 4, accent: true, weight: 1.0, zLayer: 0.25 },

      // Service 4: Bottom-Left · Database Broker & Event Store
      { kind: 'path', d: roundedRectD(36, 162, 84, 54, 8), accent: false, weight: 2.2, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'fillRect', x: 48, y: 186, w: 60, h: 6, rx: 3, accent: true, weight: 1.2, zLayer: 0.25, density: 0.85 },
      { kind: 'fillCircle', cx: 104, cy: 176, r: 4, accent: true, weight: 1.0, zLayer: 0.25 },

      // WebSocket Real-Time Bidirectional Full-Duplex Sine Waves (Left to Gateway)
      { kind: 'path', d: 'M 120 124 C 130 112, 144 136, 154 124', accent: true, weight: 3.0, zLayer: 0.42, radiusScale: 1.25 },
      { kind: 'path', d: 'M 120 136 C 130 148, 144 124, 154 136', accent: true, weight: 3.0, zLayer: 0.42, radiusScale: 1.25 },

      // Server-Sent Events (SSE) Stream Beam (Gateway to Right)
      { kind: 'path', d: 'M 226 130 H 260 M 254 124 L 260 130 L 254 136', accent: true, weight: 2.6, zLayer: 0.42, radiusScale: 1.15 },
      { kind: 'fillCircle', cx: 242, cy: 130, r: 3.5, accent: true, weight: 1.0, zLayer: 0.45 },

      // Microservice Mesh Interconnects
      { kind: 'path', d: 'M 162 114 L 116 88', accent: false, weight: 1.8, zLayer: 0.1, radiusScale: 0.9 },
      { kind: 'path', d: 'M 218 114 L 264 88', accent: false, weight: 1.8, zLayer: 0.1, radiusScale: 0.9 },
      { kind: 'path', d: 'M 218 146 L 264 172', accent: false, weight: 1.8, zLayer: 0.1, radiusScale: 0.9 },
      { kind: 'path', d: 'M 162 146 L 116 172', accent: false, weight: 1.8, zLayer: 0.1, radiusScale: 0.9 },
    ],
  },
  performance: {
    // 05 · Databases & Cloud Storage: 3-tier Cylinder Stack (PostgreSQL/MySQL tabular disk, MongoDB document store, ACID storage), hovering Redis lightning cache ring, MinIO S3 object buckets
    viewW: 380,
    viewH: 260,
    primitives: [
      // Hovering In-Memory Redis Distributed Cache Tier (Top)
      { kind: 'path', d: 'M 190 42 A 56 18 0 1 0 190 78 A 56 18 0 1 0 190 42', accent: true, weight: 2.8, zLayer: 0.52, radiusScale: 1.2 },
      { kind: 'path', d: 'M 193 32 L 183 48 L 191 48 L 186 64 L 198 46 L 190 46 Z', accent: true, weight: 2.6, zLayer: 0.62, radiusScale: 1.25 },
      { kind: 'path', d: 'M 190 78 V 94', accent: true, weight: 2.2, zLayer: 0.45, radiusScale: 1.05 },

      // Database Cylinder Tier 1: Relational Schema (PostgreSQL / MySQL)
      { kind: 'path', d: 'M 190 74 A 68 24 0 1 0 190 122 A 68 24 0 1 0 190 74', accent: false, weight: 2.6, zLayer: 0.25, radiusScale: 1.05 },
      { kind: 'path', d: 'M 148 98 H 232 M 174 86 V 110 M 206 86 V 110', accent: false, weight: 1.4, zLayer: 0.28, radiusScale: 0.85 },
      { kind: 'path', d: 'M 122 98 V 126 M 258 98 V 126 M 122 126 C 122 144, 258 144, 258 126', accent: false, weight: 2.6, zLayer: 0.2, radiusScale: 1.05 },

      // Database Cylinder Tier 2: Document Store (MongoDB)
      { kind: 'path', d: 'M 122 126 V 154 M 258 126 V 154 M 122 154 C 122 172, 258 172, 258 154', accent: false, weight: 2.6, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 166 134 C 160 134, 160 140, 154 140 C 160 140, 160 146, 166 146 M 214 134 C 220 134, 220 140, 226 140 C 220 140, 220 146, 214 146', accent: true, weight: 2.4, zLayer: 0.35, radiusScale: 1.05 },

      // Database Cylinder Tier 3: ACID Transactions & Persistent Storage Base
      { kind: 'path', d: 'M 122 154 V 182 M 258 154 V 182 M 122 182 C 122 200, 258 200, 258 182', accent: false, weight: 2.8, zLayer: 0.1, radiusScale: 1.08 },
      // Central ACID Lock Badge
      { kind: 'path', d: 'M 180 132 L 190 126 L 200 132 C 200 144, 190 152, 190 152 C 190 152, 180 144, 180 132 Z', accent: true, weight: 2.4, zLayer: 0.45, radiusScale: 1.15 },

      // Left MinIO S3 Object Storage Bucket
      { kind: 'path', d: 'M 54 94 L 76 82 L 98 94 L 76 106 Z', accent: false, weight: 2.0, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 54 94 V 130 L 76 142 V 106 Z M 98 94 V 130 L 76 142', accent: false, weight: 2.0, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 62 86 C 62 76, 90 76, 90 86', accent: true, weight: 1.8, zLayer: 0.25, radiusScale: 0.9 },
      { kind: 'path', d: 'M 98 116 H 122 M 116 111 L 122 116 L 116 121', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.05 },

      // Right MinIO Cluster Replica Node
      { kind: 'path', d: 'M 282 94 L 304 82 L 326 94 L 304 106 Z', accent: false, weight: 2.0, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 282 94 V 130 L 304 142 V 106 Z M 326 94 V 130 L 304 142', accent: false, weight: 2.0, zLayer: 0.18, radiusScale: 0.95 },
      { kind: 'path', d: 'M 258 116 H 282 M 276 111 L 282 116 L 276 121', accent: true, weight: 2.0, zLayer: 0.25, radiusScale: 1.05 },

      // High-Availability Base Pedestal & Cluster Status
      { kind: 'path', d: 'M 104 216 H 276', accent: false, weight: 1.4, zLayer: -0.1, radiusScale: 0.9 },
      { kind: 'fillCircle', cx: 130, cy: 216, r: 4, accent: true, weight: 1.0, zLayer: -0.05 },
      { kind: 'fillCircle', cx: 190, cy: 216, r: 4, accent: true, weight: 1.0, zLayer: -0.05 },
      { kind: 'fillCircle', cx: 250, cy: 216, r: 4, accent: true, weight: 1.0, zLayer: -0.05 },
    ],
  },
  design: {
    // 06 · DevOps, Containerization & Linux: 3D isometric Docker container pod with corrugated ribs, Nginx SSL security shield, Drone CI automated pipeline loop, Linux terminal & server blades
    viewW: 380,
    viewH: 260,
    primitives: [
      // 3D Isometric Docker Container Pod
      { kind: 'path', d: 'M 190 68 L 246 96 L 190 124 L 134 96 Z', accent: false, weight: 2.6, zLayer: 0.35, radiusScale: 1.05 },
      { kind: 'path', d: 'M 134 96 V 164 L 190 192 V 124 Z', accent: false, weight: 2.8, zLayer: 0.35, radiusScale: 1.05 },
      { kind: 'path', d: 'M 246 96 V 164 L 190 192', accent: false, weight: 2.8, zLayer: 0.35, radiusScale: 1.05 },
      // Corrugated Container Ribs (Left face)
      { kind: 'path', d: 'M 148 103 V 171', accent: true, weight: 2.2, zLayer: 0.4, radiusScale: 0.95 },
      { kind: 'path', d: 'M 162 110 V 178', accent: true, weight: 2.2, zLayer: 0.4, radiusScale: 0.95 },
      { kind: 'path', d: 'M 176 117 V 185', accent: true, weight: 2.2, zLayer: 0.4, radiusScale: 0.95 },
      // Corrugated Container Ribs (Right face)
      { kind: 'path', d: 'M 204 117 V 185 M 218 110 V 178 M 232 103 V 171', accent: false, weight: 1.8, zLayer: 0.32, radiusScale: 0.9 },
      // Corner Lift Castings
      { kind: 'fillCircle', cx: 134, cy: 96, r: 4, accent: true, weight: 1.0, zLayer: 0.4 },
      { kind: 'fillCircle', cx: 246, cy: 96, r: 4, accent: true, weight: 1.0, zLayer: 0.4 },
      { kind: 'fillCircle', cx: 190, cy: 124, r: 4, accent: true, weight: 1.2, zLayer: 0.42 },
      { kind: 'fillCircle', cx: 190, cy: 192, r: 4, accent: true, weight: 1.2, zLayer: 0.42 },

      // Nginx Ingress Reverse Proxy & SSL/TLS Cryptographic Security Shield
      { kind: 'path', d: 'M 40 96 L 62 86 L 84 96 C 84 120, 62 134, 62 134 C 62 134, 40 120, 40 96 Z', accent: true, weight: 2.8, zLayer: 0.48, radiusScale: 1.15 },
      { kind: 'path', d: roundedRectD(52, 108, 20, 14, 3), accent: true, weight: 1.8, zLayer: 0.55, radiusScale: 0.9 },
      { kind: 'path', d: 'M 57 108 V 103 C 57 99, 67 99, 67 103 V 108', accent: true, weight: 1.8, zLayer: 0.55, radiusScale: 0.9 },
      { kind: 'path', d: 'M 86 114 H 124 M 118 109 L 124 114 L 118 119', accent: true, weight: 2.4, zLayer: 0.42, radiusScale: 1.1 },

      // CI/CD Automated Continuous Deployment Pipeline Loop (Drone CI)
      { kind: 'path', d: 'M 78 68 C 124 28, 256 28, 302 68', accent: true, weight: 2.6, zLayer: 0.28, radiusScale: 1.15 },
      { kind: 'path', d: 'M 302 192 C 256 232, 124 232, 78 192', accent: false, weight: 1.8, zLayer: 0.2, radiusScale: 0.95 },
      { kind: 'fillCircle', cx: 120, cy: 44, r: 5, accent: true, weight: 1.2, zLayer: 0.32 },
      { kind: 'fillCircle', cx: 190, cy: 32, r: 6, accent: true, weight: 1.4, zLayer: 0.35 },
      { kind: 'fillCircle', cx: 260, cy: 44, r: 5, accent: true, weight: 1.2, zLayer: 0.32 },
      { kind: 'fillCircle', cx: 302, cy: 130, r: 7, accent: true, weight: 1.6, zLayer: 0.48 },
      { kind: 'path', d: 'M 297 130 L 301 134 L 308 126', accent: false, weight: 2.4, zLayer: 0.55, radiusScale: 0.95 },

      // Linux Terminal Console & Server Blade Base
      { kind: 'path', d: roundedRectD(270, 68, 86, 48, 6), accent: false, weight: 1.8, zLayer: 0.22, radiusScale: 0.92 },
      { kind: 'path', d: 'M 278 92 L 286 96 L 278 100', accent: true, weight: 2.0, zLayer: 0.28, radiusScale: 0.9 },
      { kind: 'fillRect', x: 290, y: 92, w: 6, h: 9, rx: 1, accent: true, weight: 1.0, zLayer: 0.3, density: 0.9 },

      // Server Blade Chassis
      { kind: 'path', d: roundedRectD(40, 226, 300, 12, 4), accent: false, weight: 1.6, zLayer: -0.15, radiusScale: 0.9 },
      { kind: 'fillCircle', cx: 56, cy: 232, r: 2.5, accent: true, weight: 0.7, zLayer: -0.05 },
      { kind: 'fillCircle', cx: 66, cy: 232, r: 2.5, accent: true, weight: 0.7, zLayer: -0.05 },
    ],
  },
  testimonial: {
    viewW: 300,
    viewH: 340,
    primitives: [
      { kind: 'path', d: 'M 150 56 A 48 56 0 1 0 150 168 A 48 56 0 1 0 150 56', accent: false, weight: 3.0, zLayer: 0.35, radiusScale: 1.0 },
      { kind: 'path', d: 'M 54 294 C 58 214, 102 184, 150 184 C 198 184, 242 214, 246 294', accent: false, weight: 3.2, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 150 24 A 108 108 0 1 0 150 240', accent: true, weight: 1.6, zLayer: -0.25, radiusScale: 1.0 },
    ],
  },
  trophy: {
    // Sculptural 3D Trophy / Cup (جام) designed to read crisply inside the circular About RotatingBadge SVG
    viewW: 240,
    viewH: 240,
    primitives: [
      // Top chalice elliptical rim (front + back depth arc)
      { kind: 'path', d: 'M 64 46 Q 120 58 176 46', accent: false, weight: 2.3, zLayer: 0.28, radiusScale: 0.84 },
      { kind: 'path', d: 'M 64 46 Q 120 35 176 46', accent: false, weight: 1.6, zLayer: -0.22, radiusScale: 0.72 },
      // Outer chalice bowl silhouette tapering cleanly to stem waist
      { kind: 'path', d: 'M 64 46 C 64 102, 86 132, 108 140', accent: false, weight: 2.6, zLayer: 0.12, radiusScale: 0.92 },
      { kind: 'path', d: 'M 176 46 C 176 102, 154 132, 132 140', accent: false, weight: 2.6, zLayer: 0.12, radiusScale: 0.92 },
      { kind: 'path', d: 'M 106 140 Q 120 147 134 140', accent: false, weight: 1.4, zLayer: 0.18, radiusScale: 0.82 },
      // Inner sculptural bowl rib + indigo sheen curve for 3D volume
      { kind: 'path', d: 'M 82 56 C 84 96, 98 120, 114 131', accent: true, weight: 1.25, zLayer: 0.24, radiusScale: 0.68 },
      // Twin curved trophy handles (left & right ears)
      { kind: 'path', d: 'M 66 58 C 30 58, 28 106, 78 112', accent: true, weight: 2.2, zLayer: 0.04, radiusScale: 0.85 },
      { kind: 'path', d: 'M 174 58 C 210 58, 212 106, 162 112', accent: true, weight: 2.2, zLayer: 0.04, radiusScale: 0.85 },
      // Central 4-point crest star suspended inside the cup bowl
      { kind: 'path', d: 'M 120 68 L 125 83 L 140 88 L 125 93 L 120 108 L 115 93 L 100 88 L 115 83 Z', accent: true, weight: 2.1, zLayer: 0.36, radiusScale: 0.72 },
      // Decorative indigo stem collar + tapered neck
      { kind: 'path', d: 'M 103 148 H 137', accent: true, weight: 1.35, zLayer: 0.22, radiusScale: 0.95 },
      { kind: 'path', d: 'M 111 146 L 106 178 M 129 146 L 134 178', accent: false, weight: 1.9, zLayer: 0.08, radiusScale: 0.84 },
      // Two-tier stepped pedestal base + indigo nameplate bar
      { kind: 'path', d: roundedRectD(84, 178, 72, 15, 5), accent: false, weight: 2.1, zLayer: 0.14, radiusScale: 0.86 },
      { kind: 'path', d: roundedRectD(66, 195, 108, 18, 6), accent: false, weight: 2.6, zLayer: 0.2, radiusScale: 0.92 },
      { kind: 'fillRect', x: 96, y: 201, w: 48, h: 6, rx: 3, accent: true, weight: 1.15, zLayer: 0.28, density: 0.85 },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * 05 OWN APPS — 10 ARCHITECTURAL PARTICLE EMBLEMS
   * Strict What I Do / uiPlane design standard:
   * Thick granular stroke paths, hollow interiors, 3D Z layers,
   * selective #5B5BF0 accent highlights.
   * ───────────────────────────────────────────────────────────── */
  'app-parakgram': {
    // 01 · Parakgram: Constellation social network graph, concentric 24h story aura ring & chat bubbles
    viewW: 380,
    viewH: 260,
    primitives: [
      // Outer 24h Story Aura Ring
      { kind: 'path', d: 'M 190 38 A 88 88 0 1 0 190 214 A 88 88 0 1 0 190 38', accent: true, weight: 2.2, zLayer: -0.15 },
      // Central Profile Node (User Core)
      { kind: 'fillCircle', cx: 190, cy: 126, r: 18, accent: true, weight: 2.5, zLayer: 0.4 },
      { kind: 'path', d: 'M 190 46 A 80 80 0 0 1 270 126', accent: false, weight: 1.2, zLayer: -0.05 },
      // Surrounding Community Nodes
      { kind: 'fillCircle', cx: 104, cy: 76, r: 12, accent: false, weight: 1.6, zLayer: 0.2 },
      { kind: 'fillCircle', cx: 276, cy: 76, r: 12, accent: false, weight: 1.6, zLayer: 0.2 },
      { kind: 'fillCircle', cx: 104, cy: 176, r: 13, accent: false, weight: 1.6, zLayer: 0.2 },
      { kind: 'fillCircle', cx: 276, cy: 176, r: 14, accent: true, weight: 2.0, zLayer: 0.3 },
      // Curved Connection Links (Social Graph Edges)
      { kind: 'path', d: 'M 190 126 Q 140 92 104 76', accent: false, weight: 2.2, zLayer: 0.15 },
      { kind: 'path', d: 'M 190 126 Q 240 92 276 76', accent: false, weight: 2.2, zLayer: 0.15 },
      { kind: 'path', d: 'M 190 126 Q 140 160 104 176', accent: false, weight: 2.2, zLayer: 0.15 },
      { kind: 'path', d: 'M 190 126 Q 240 160 276 176', accent: true, weight: 2.4, zLayer: 0.25 },
      { kind: 'path', d: 'M 104 76 C 130 46, 250 46, 276 76', accent: false, weight: 1.4, zLayer: 0.05 },
      { kind: 'path', d: 'M 104 176 C 130 206, 250 206, 276 176', accent: true, weight: 1.6, zLayer: 0.1 },
      // Real-Time Chat Speech Bubble Overlay
      { kind: 'path', d: roundedRectD(224, 102, 54, 28, 8), accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'path', d: 'M 234 130 L 226 138 L 230 130', accent: true, weight: 2.0, zLayer: 0.45 },
      { kind: 'fillCircle', cx: 242, cy: 116, r: 2.5, accent: true, weight: 1.0, zLayer: 0.5 },
      { kind: 'fillCircle', cx: 251, cy: 116, r: 2.5, accent: true, weight: 1.0, zLayer: 0.5 },
      { kind: 'fillCircle', cx: 260, cy: 116, r: 2.5, accent: true, weight: 1.0, zLayer: 0.5 },
      // 24h Story Orbit Active Dot
      { kind: 'fillCircle', cx: 190, cy: 38, r: 5.5, accent: true, weight: 2.2, zLayer: 0.35 },
    ],
  },

  'app-parak-rag': {
    // 02 · PARAK AI Assistant: 3D wireframe neural orb, voice soundwave ripples, vector search nodes
    viewW: 380,
    viewH: 260,
    primitives: [
      // 3D Neural Sphere Wireframe (Outer ring + latitude & longitude ellipses)
      { kind: 'path', d: 'M 190 48 A 78 78 0 1 0 190 204 A 78 78 0 1 0 190 48', accent: false, weight: 2.4, zLayer: 0.0 },
      // Equator ellipse
      { kind: 'path', d: 'M 112 126 A 78 26 0 1 0 268 126 A 78 26 0 1 0 112 126', accent: true, weight: 2.2, zLayer: 0.25 },
      // Latitude arcs
      { kind: 'path', d: 'M 130 94 A 60 18 0 0 1 250 94', accent: false, weight: 1.3, zLayer: 0.1 },
      { kind: 'path', d: 'M 130 158 A 60 18 0 0 0 250 158', accent: false, weight: 1.3, zLayer: 0.1 },
      // Central meridian ellipse
      { kind: 'path', d: 'M 190 48 A 28 78 0 1 0 190 204 A 28 78 0 1 0 190 48', accent: true, weight: 2.0, zLayer: 0.3 },
      // Floating AI Core Nucleus
      { kind: 'fillCircle', cx: 190, cy: 126, r: 16, accent: true, weight: 3.0, zLayer: 0.5 },
      // Live Audio STT/TTS Soundwave Spectrum (Left)
      { kind: 'path', d: 'M 84 116 V 136', accent: true, weight: 2.4, zLayer: 0.2 },
      { kind: 'path', d: 'M 72 104 V 148', accent: true, weight: 2.8, zLayer: 0.25 },
      { kind: 'path', d: 'M 60 118 V 134', accent: true, weight: 2.2, zLayer: 0.2 },
      { kind: 'path', d: 'M 48 122 V 130', accent: false, weight: 1.6, zLayer: 0.15 },
      // Qdrant Vector Search Cluster Rays & Embeddings (Right)
      { kind: 'path', d: 'M 268 126 L 310 96', accent: true, weight: 1.8, zLayer: 0.3 },
      { kind: 'path', d: 'M 268 126 L 324 126', accent: true, weight: 2.2, zLayer: 0.35 },
      { kind: 'path', d: 'M 268 126 L 306 156', accent: true, weight: 1.8, zLayer: 0.3 },
      { kind: 'fillCircle', cx: 310, cy: 96, r: 6.5, accent: true, weight: 1.8, zLayer: 0.4 },
      { kind: 'fillCircle', cx: 324, cy: 126, r: 7.5, accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'fillCircle', cx: 306, cy: 156, r: 6.5, accent: true, weight: 1.8, zLayer: 0.4 },
    ],
  },

  'app-parak-task-manager': {
    // 03 · Parak Task Manager: Kanban 3-column OS, active card drag handle & status pills
    viewW: 380,
    viewH: 260,
    primitives: [
      // Main OS Window Board Frame
      { kind: 'path', d: roundedRectD(44, 34, 292, 192, 14), accent: false, weight: 2.2, zLayer: -0.1 },
      // Header dividing rule & search/filter pill
      { kind: 'path', d: 'M 44 64 H 336', accent: false, weight: 1.3, zLayer: 0.0 },
      { kind: 'path', d: roundedRectD(58, 44, 46, 12, 6), accent: false, weight: 1.2, zLayer: 0.1 },
      { kind: 'path', d: roundedRectD(284, 44, 40, 12, 6), accent: true, weight: 1.4, zLayer: 0.15 },
      // Column 1: Backlog / To Do
      { kind: 'path', d: roundedRectD(58, 76, 76, 136, 8), accent: false, weight: 1.5, zLayer: 0.1 },
      { kind: 'path', d: roundedRectD(66, 90, 60, 32, 6), accent: false, weight: 1.6, zLayer: 0.2 },
      { kind: 'path', d: roundedRectD(66, 132, 60, 26, 6), accent: false, weight: 1.2, zLayer: 0.2 },
      // Column 2: In Progress (Elevated Active Column)
      { kind: 'path', d: roundedRectD(152, 68, 76, 152, 8), accent: true, weight: 2.4, zLayer: 0.3 },
      // Active Dragging Card with Priority Pill & Gripper
      { kind: 'path', d: roundedRectD(160, 84, 60, 48, 7), accent: true, weight: 2.4, zLayer: 0.45 },
      { kind: 'path', d: 'M 170 96 H 210 M 170 102 H 210', accent: true, weight: 1.8, zLayer: 0.5 },
      { kind: 'fillRect', x: 170, y: 112, w: 40, h: 8, rx: 4, accent: true, weight: 1.4, zLayer: 0.5, density: 0.7 },
      { kind: 'path', d: roundedRectD(160, 142, 60, 30, 6), accent: false, weight: 1.4, zLayer: 0.25 },
      // Column 3: Done (Completed with checkmark)
      { kind: 'path', d: roundedRectD(246, 76, 76, 136, 8), accent: false, weight: 1.5, zLayer: 0.1 },
      { kind: 'path', d: roundedRectD(254, 90, 60, 38, 6), accent: true, weight: 1.8, zLayer: 0.35 },
      // Checkmark icon
      { kind: 'path', d: 'M 274 108 L 280 114 L 294 100', accent: true, weight: 2.8, zLayer: 0.5 },
      { kind: 'path', d: roundedRectD(254, 138, 60, 24, 6), accent: false, weight: 1.2, zLayer: 0.2 },
    ],
  },

  'app-harime-mehr': {
    // 04 · HarimeMehr: Preschool Management OS — Student ID Badge, Attendance Roll-Call Calendar & Tuition Ledger
    viewW: 380,
    viewH: 260,
    primitives: [
      // ── CENTER: Preschool Student Profile ID Card (مدیریت پرونده نوآموز) ──
      // Card Frame
      { kind: 'path', d: roundedRectD(140, 38, 100, 162, 12), accent: true, weight: 2.5, zLayer: 0.35 },
      // Top Hanging Clip / Lanyard Slot
      { kind: 'path', d: roundedRectD(174, 28, 32, 12, 5), accent: false, weight: 1.6, zLayer: 0.25 },
      { kind: 'path', d: 'M 183 28 V 22 M 197 28 V 22', accent: false, weight: 1.5, zLayer: 0.2 },
      // Student Portrait Ring
      { kind: 'path', d: 'M 190 56 A 22 22 0 1 0 190 100 A 22 22 0 1 0 190 56', accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'fillCircle', cx: 190, cy: 74, r: 10, accent: true, weight: 1.8, zLayer: 0.5 },
      // Child Torso / Kindergarten Uniform Outline
      { kind: 'path', d: 'M 172 108 C 172 96, 208 96, 208 108 Z', accent: false, weight: 1.8, zLayer: 0.4 },
      // Student Information Lines
      { kind: 'fillRect', x: 156, y: 120, w: 68, h: 6, rx: 3, accent: false, weight: 1.0, zLayer: 0.4, density: 0.8 },
      { kind: 'fillRect', x: 164, y: 132, w: 52, h: 5, rx: 2.5, accent: false, weight: 0.8, zLayer: 0.4, density: 0.8 },
      // Kindergarten Excellence Star Badge
      { kind: 'path', d: 'M 190 152 L 193 160 L 202 160 L 195 165 L 198 173 L 190 168 L 182 173 L 185 165 L 178 160 L 187 160 Z', accent: true, weight: 2.0, zLayer: 0.55 },

      // ── LEFT: Attendance & Roll-Call Calendar (حضور و غیاب هوشمند) ──
      // Calendar Board Frame
      { kind: 'path', d: roundedRectD(38, 54, 88, 138, 10), accent: false, weight: 1.8, zLayer: 0.1 },
      // Calendar Header with Spiral Binder Rings
      { kind: 'path', d: roundedRectD(38, 54, 88, 24, 8), accent: true, weight: 1.6, zLayer: 0.2 },
      { kind: 'path', d: 'M 56 46 V 58 M 82 46 V 58 M 108 46 V 58', accent: true, weight: 2.2, zLayer: 0.3 },
      // Attendance Row 1 (Checked Present ✓)
      { kind: 'path', d: 'M 50 96 L 56 102 L 67 90', accent: true, weight: 2.6, zLayer: 0.4 },
      { kind: 'fillRect', x: 74, y: 94, w: 40, h: 5, rx: 2.5, accent: false, weight: 0.8, zLayer: 0.2, density: 0.85 },
      // Attendance Row 2 (Checked Present ✓)
      { kind: 'path', d: 'M 50 122 L 56 128 L 67 116', accent: true, weight: 2.6, zLayer: 0.4 },
      { kind: 'fillRect', x: 74, y: 120, w: 40, h: 5, rx: 2.5, accent: false, weight: 0.8, zLayer: 0.2, density: 0.85 },
      // Attendance Row 3 (Checked Present ✓)
      { kind: 'path', d: 'M 50 148 L 56 154 L 67 142', accent: true, weight: 2.6, zLayer: 0.4 },
      { kind: 'fillRect', x: 74, y: 146, w: 40, h: 5, rx: 2.5, accent: false, weight: 0.8, zLayer: 0.2, density: 0.85 },
      // Status Summary Dot & Label
      { kind: 'fillCircle', cx: 56, cy: 172, r: 4, accent: true, weight: 1.4, zLayer: 0.3 },
      { kind: 'fillRect', x: 68, y: 170, w: 44, h: 5, rx: 2.5, accent: false, weight: 0.7, zLayer: 0.2, density: 0.8 },

      // ── RIGHT: Tuition & Financial Ledger (شهریه و پایش اقساط) ──
      // Ledger Card Frame
      { kind: 'path', d: roundedRectD(254, 54, 88, 138, 10), accent: false, weight: 1.8, zLayer: 0.1 },
      // Ledger Header Bar
      { kind: 'path', d: roundedRectD(254, 54, 88, 24, 8), accent: false, weight: 1.4, zLayer: 0.18 },
      // Tuition Payment Coin / Vault Badge
      { kind: 'path', d: 'M 298 84 A 16 16 0 1 0 298 116 A 16 16 0 1 0 298 84', accent: true, weight: 2.2, zLayer: 0.4 },
      { kind: 'path', d: 'M 291 100 L 296 105 L 305 95', accent: true, weight: 2.4, zLayer: 0.5 },
      // Installment Progress Track & Filled Value
      { kind: 'path', d: roundedRectD(264, 126, 68, 10, 5), accent: false, weight: 1.2, zLayer: 0.2 },
      { kind: 'fillRect', x: 264, y: 126, w: 50, h: 10, rx: 5, accent: true, weight: 1.5, zLayer: 0.35, density: 0.85 },
      // Financial Receipt Lines
      { kind: 'fillRect', x: 266, y: 148, w: 64, h: 5, rx: 2.5, accent: false, weight: 0.8, zLayer: 0.2, density: 0.85 },
      { kind: 'fillRect', x: 266, y: 160, w: 44, h: 5, rx: 2.5, accent: true, weight: 1.0, zLayer: 0.25, density: 0.85 },

      // ── BUS CONNECTORS & SYSTEM DOCK (اتصال یکپارچه سیستم) ──
      // Data Bridges between Left & Right Modules to Central Student ID
      { kind: 'path', d: 'M 126 122 H 140', accent: true, weight: 2.0, zLayer: 0.25 },
      { kind: 'path', d: 'M 240 122 H 254', accent: true, weight: 2.0, zLayer: 0.25 },
      // Elevated Base Pedestal / System Dock
      { kind: 'path', d: roundedRectD(54, 212, 272, 14, 7), accent: false, weight: 1.6, zLayer: -0.1 },
      { kind: 'path', d: 'M 74 219 H 306', accent: true, weight: 1.8, zLayer: 0.05 },
    ],
  },

  'app-mana-amlak': {
    // 05 · Mana Amlak: Modern architectural villa wireframe, glass curtain pillars, floating map pin
    viewW: 380,
    viewH: 260,
    primitives: [
      // Modern Villa Cantilever Roofline
      { kind: 'path', d: 'M 190 56 L 282 102 L 190 148 L 98 102 Z', accent: true, weight: 2.8, zLayer: 0.35 },
      // Glass Facade Pillars & Foundation Frame
      { kind: 'path', d: 'M 98 102 V 176 L 190 222 V 148', accent: false, weight: 2.4, zLayer: 0.2 },
      { kind: 'path', d: 'M 282 102 V 176 L 190 222', accent: false, weight: 2.4, zLayer: 0.2 },
      // Architectural Glass Mullions
      { kind: 'path', d: 'M 144 125 V 199', accent: false, weight: 1.4, zLayer: 0.25 },
      { kind: 'path', d: 'M 236 125 V 199', accent: false, weight: 1.4, zLayer: 0.25 },
      { kind: 'path', d: 'M 98 139 L 190 185 L 282 139', accent: false, weight: 1.2, zLayer: 0.15 },
      // Base Terrace Platform
      { kind: 'path', d: 'M 72 188 L 190 240 L 308 188', accent: false, weight: 1.8, zLayer: -0.1 },
      // Floating Map Coordinate Pin
      { kind: 'path', d: 'M 190 24 C 176 24, 164 36, 164 50 C 164 70, 190 92, 190 92 C 190 92, 216 70, 216 50 C 216 36, 204 24, 190 24 Z', accent: true, weight: 2.6, zLayer: 0.55 },
      { kind: 'fillCircle', cx: 190, cy: 48, r: 5.5, accent: true, weight: 1.8, zLayer: 0.6 },
    ],
  },

  'app-artam-amlak': {
    // 06 · Artam Amlak: Commercial city high-rise skyline perspective, beacon spire, agency key
    viewW: 380,
    viewH: 260,
    primitives: [
      // Left Residential Tower
      { kind: 'path', d: roundedRectD(70, 94, 66, 126, 4), accent: false, weight: 1.8, zLayer: 0.05 },
      { kind: 'path', d: 'M 80 118 H 126 M 80 144 H 126 M 80 170 H 126 M 80 196 H 126', accent: false, weight: 1.1, zLayer: 0.1 },
      // Center Tower: Modern Commercial Skyscraper with Spire
      { kind: 'path', d: roundedRectD(148, 52, 84, 168, 6), accent: true, weight: 2.6, zLayer: 0.3 },
      { kind: 'path', d: 'M 190 16 V 52', accent: true, weight: 2.6, zLayer: 0.4 },
      { kind: 'fillCircle', cx: 190, cy: 14, r: 4.5, accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'path', d: 'M 190 52 V 220', accent: true, weight: 2.0, zLayer: 0.38 },
      { kind: 'path', d: 'M 158 90 H 222 M 158 128 H 222 M 158 166 H 222', accent: false, weight: 1.3, zLayer: 0.25 },
      // Right Commercial Tower
      { kind: 'path', d: roundedRectD(244, 110, 66, 110, 4), accent: false, weight: 1.8, zLayer: 0.05 },
      { kind: 'path', d: 'M 254 136 H 300 M 254 164 H 300 M 254 192 H 300', accent: false, weight: 1.1, zLayer: 0.1 },
      // Plaza Base Line
      { kind: 'path', d: 'M 44 220 H 336', accent: false, weight: 2.2, zLayer: -0.1 },
      // Real Estate Ownership Key Emblem
      { kind: 'path', d: 'M 306 48 A 13 13 0 1 0 306 74 A 13 13 0 1 0 306 48', accent: true, weight: 2.2, zLayer: 0.45 },
      { kind: 'path', d: 'M 306 74 V 104 M 306 90 H 318 M 306 100 H 316', accent: true, weight: 2.2, zLayer: 0.45 },
    ],
  },

  'app-dimplomat-amlak': {
    // 07 · Dimplomat Amlak: Classical luxury portico, Ionic fluted columns, prestige star crest
    viewW: 380,
    viewH: 260,
    primitives: [
      // Classical Triangular Pediment
      { kind: 'path', d: 'M 82 78 L 190 32 L 298 78 Z', accent: true, weight: 2.8, zLayer: 0.35 },
      // Prestige Medallion Star in Tympanum
      { kind: 'path', d: 'M 190 44 L 194 54 L 204 56 L 196 63 L 198 73 L 190 67 L 182 73 L 184 63 L 176 56 L 186 54 Z', accent: true, weight: 2.0, zLayer: 0.5 },
      // Architrave / Entablature Beam
      { kind: 'path', d: roundedRectD(72, 78, 236, 15, 3), accent: false, weight: 2.2, zLayer: 0.2 },
      // 4 Grand Fluted Columns
      { kind: 'path', d: 'M 98 93 V 196 M 110 93 V 196', accent: false, weight: 2.0, zLayer: 0.15 },
      { kind: 'path', d: 'M 152 93 V 196 M 164 93 V 196', accent: true, weight: 2.4, zLayer: 0.3 },
      { kind: 'path', d: 'M 216 93 V 196 M 228 93 V 196', accent: true, weight: 2.4, zLayer: 0.3 },
      { kind: 'path', d: 'M 270 93 V 196 M 282 93 V 196', accent: false, weight: 2.0, zLayer: 0.15 },
      // Column capitals
      { kind: 'path', d: 'M 92 93 H 116 M 146 93 H 170 M 210 93 H 234 M 264 93 H 288', accent: true, weight: 1.8, zLayer: 0.25 },
      // Central Archway Grand Portal
      { kind: 'path', d: 'M 174 196 V 138 C 174 122, 206 122, 206 138 V 196', accent: true, weight: 2.2, zLayer: 0.4 },
      // Stepped Foundation Plinth
      { kind: 'path', d: roundedRectD(64, 196, 252, 12, 3), accent: false, weight: 2.2, zLayer: 0.1 },
      { kind: 'path', d: roundedRectD(50, 208, 280, 14, 3), accent: false, weight: 2.6, zLayer: 0.05 },
    ],
  },

  'app-zara-elite': {
    // 08 · Zara Elite: Haute-couture brilliant-cut diamond gem prism & fashion hanger silhouette
    viewW: 380,
    viewH: 260,
    primitives: [
      // Fashion Hanger Hook & Shoulder Line
      { kind: 'path', d: 'M 190 28 C 198 28, 206 36, 202 46 C 198 54, 190 56, 190 64', accent: true, weight: 2.4, zLayer: 0.4 },
      { kind: 'path', d: 'M 124 82 L 190 64 L 256 82', accent: true, weight: 2.2, zLayer: 0.3 },
      // Diamond Table & Crown Bevels
      { kind: 'path', d: 'M 132 82 H 248', accent: true, weight: 2.2, zLayer: 0.25 },
      { kind: 'path', d: 'M 132 82 L 86 126 H 294 L 248 82', accent: false, weight: 2.6, zLayer: 0.2 },
      // Star & Kite Facets
      { kind: 'path', d: 'M 132 82 L 162 126 L 190 82 L 218 126 L 248 82', accent: true, weight: 1.8, zLayer: 0.35 },
      // Diamond Pavilion Lines converging to lower culet point
      { kind: 'path', d: 'M 86 126 L 190 224 L 294 126', accent: false, weight: 2.8, zLayer: 0.15 },
      { kind: 'path', d: 'M 162 126 L 190 224 L 218 126', accent: true, weight: 2.4, zLayer: 0.4 },
      // Mannequin Silhouette Aura Curves
      { kind: 'path', d: 'M 64 140 C 56 172, 108 200, 144 232', accent: false, weight: 1.2, zLayer: -0.1 },
      { kind: 'path', d: 'M 316 140 C 324 172, 272 200, 236 232', accent: false, weight: 1.2, zLayer: -0.1 },
    ],
  },

  'app-noir': {
    // 09 · NOIR Studio: Camera iris aperture blades, focus crosshair and cinematic framing
    viewW: 380,
    viewH: 260,
    primitives: [
      // Outer Camera Lens Barrel
      { kind: 'path', d: 'M 190 42 A 86 86 0 1 0 190 214 A 86 86 0 1 0 190 42', accent: false, weight: 2.6, zLayer: 0.05 },
      // Inner Precision Bezel
      { kind: 'path', d: 'M 190 56 A 72 72 0 1 0 190 200 A 72 72 0 1 0 190 56', accent: false, weight: 1.6, zLayer: 0.15 },
      // 6 Interlocking Curved Aperture Blades
      { kind: 'path', d: 'M 124 128 C 136 154, 170 158, 182 142', accent: true, weight: 2.5, zLayer: 0.32 },
      { kind: 'path', d: 'M 157 70 C 180 74, 196 104, 186 118', accent: true, weight: 2.5, zLayer: 0.32 },
      { kind: 'path', d: 'M 223 70 C 234 94, 218 126, 198 126', accent: true, weight: 2.5, zLayer: 0.32 },
      { kind: 'path', d: 'M 256 128 C 244 154, 210 158, 198 142', accent: true, weight: 2.5, zLayer: 0.32 },
      { kind: 'path', d: 'M 223 186 C 200 182, 184 152, 194 138', accent: true, weight: 2.5, zLayer: 0.32 },
      { kind: 'path', d: 'M 157 186 C 146 162, 162 130, 182 130', accent: true, weight: 2.5, zLayer: 0.32 },
      // Center Hexagonal Iris Opening
      { kind: 'path', d: 'M 182 142 L 186 118 L 198 126 L 198 142 L 194 138 Z', accent: true, weight: 2.2, zLayer: 0.45 },
      // Studio Crosshairs & Millimeter Ticks
      { kind: 'path', d: 'M 72 128 H 94 M 286 128 H 308', accent: true, weight: 2.2, zLayer: 0.2 },
      { kind: 'path', d: 'M 190 24 V 46 M 190 210 V 232', accent: true, weight: 2.2, zLayer: 0.2 },
      // Cinema Viewfinder Corner Crop Marks
      { kind: 'path', d: 'M 54 48 H 76 M 54 48 V 70', accent: false, weight: 1.5, zLayer: -0.05 },
      { kind: 'path', d: 'M 326 48 H 304 M 326 48 V 70', accent: false, weight: 1.5, zLayer: -0.05 },
      { kind: 'path', d: 'M 54 208 H 76 M 54 208 V 186', accent: false, weight: 1.5, zLayer: -0.05 },
      { kind: 'path', d: 'M 326 208 H 304 M 326 208 V 186', accent: false, weight: 1.5, zLayer: -0.05 },
    ],
  },

  'app-sepas-clinic': {
    // 10 · Sepas Clinic: Medical clipboard tablet, stethoscope bell & loop, vital ECG pulse wave
    viewW: 380,
    viewH: 260,
    primitives: [
      // Medical Tablet / Clipboard Outline
      { kind: 'path', d: roundedRectD(112, 32, 156, 192, 14), accent: false, weight: 2.5, zLayer: 0.05 },
      // Top Clip Clamp Mechanism
      { kind: 'path', d: roundedRectD(158, 22, 64, 20, 6), accent: true, weight: 2.2, zLayer: 0.28 },
      { kind: 'fillCircle', cx: 190, cy: 32, r: 3.5, accent: true, weight: 1.4, zLayer: 0.35 },
      // Medical Cross Relief on Clipboard
      { kind: 'path', d: roundedRectD(176, 68, 28, 9, 3), accent: true, weight: 2.2, zLayer: 0.35 },
      { kind: 'path', d: roundedRectD(185.5, 58.5, 9, 28, 3), accent: true, weight: 2.2, zLayer: 0.35 },
      // Patient Vital Sign Live Pulse Stream
      { kind: 'path', d: 'M 126 138 H 152 L 162 122 L 172 160 L 188 98 L 204 168 L 214 126 L 224 144 L 254 138', accent: true, weight: 3.0, zLayer: 0.5 },
      // Stethoscope Chest Piece Bell (Left)
      { kind: 'fillCircle', cx: 72, cy: 154, r: 17, accent: true, weight: 2.4, zLayer: 0.45 },
      { kind: 'fillCircle', cx: 72, cy: 154, r: 8, accent: false, weight: 1.4, zLayer: 0.5 },
      // Stethoscope Flexible Binaural Tube
      { kind: 'path', d: 'M 72 137 C 72 82, 126 82, 130 114 C 136 156, 88 188, 114 214 C 136 230, 182 230, 246 210', accent: true, weight: 2.8, zLayer: 0.38 },
      // Structured EHR Data Entries
      { kind: 'path', d: roundedRectD(134, 174, 68, 6, 3), accent: false, weight: 1.2, zLayer: 0.15 },
      { kind: 'path', d: roundedRectD(134, 188, 48, 6, 3), accent: false, weight: 1.0, zLayer: 0.15 },
    ],
  },
};

/**
 * 3. WHAT I DO / SVG WIREFRAME SAMPLER — Story Tab Chapter 02 (uiPlane) Methodology!
 *    - Converts all primitives into clean architectural vector stroke paths (no dense clumpy solid fills!)
 *    - Points distributed strictly proportional to geometric arc length (len * weight) -> uniform dot density!
 *    - Uniform arc-length sampling with sub-pixel jitter (<= 0.8px in 380x260 frame) -> countable, razor-sharp lines
 *    - 88% structure wireframes + 12% ambient stardust dust
 *    - Subtle Z-depth parallax without radial tube blur
 */
export function sampleSvgNormalized(
  svgKey: string,
  count: number,
  options: { drawProgress?: number } = {}
): NormalizedPoint[] {
  const { drawProgress = 1 } = options;
  const isAnimatedIntegrations = svgKey === 'integrations' && drawProgress < 0.99;
  const cacheKey = isAnimatedIntegrations ? '' : `svgStoryWireframeV1:${svgKey}:${count}`;

  if (cacheKey) {
    const cached = sampleCache.get(cacheKey);
    if (cached) return cached;
  }

  const rand = mulberry32(hashKey(`svgStoryWireframeV1:${svgKey}:${count}`));
  const spec = SVG_DIAGRAMS[svgKey] ?? SVG_DIAGRAMS.integrations;
  const result: NormalizedPoint[] = [];

  if (typeof document === 'undefined') return result;

  // 1. Convert all primitives into clean architectural vector stroke paths (no solid blocks!)
  interface StrokeSpec {
    d: string;
    weight: number;
    accent: boolean;
    zLayer: number;
    isRay?: boolean;
    rayIndex?: number;
  }

  const strokes: StrokeSpec[] = [];
  for (const prim of spec.primitives) {
    const zLayer = prim.zLayer ?? 0;
    const accent = Boolean(prim.accent);
    const weight = prim.weight ?? 1.0;

    if (prim.kind === 'path') {
      strokes.push({
        d: prim.d,
        weight,
        accent,
        zLayer,
        isRay: prim.isRay,
        rayIndex: prim.rayIndex,
      });
    } else if (prim.kind === 'fillRect') {
      const rx = prim.rx ?? Math.min(prim.w, prim.h) * 0.25;
      // Outer rounded rect wireframe contour
      strokes.push({
        d: roundedRectD(prim.x, prim.y, prim.w, prim.h, rx),
        weight,
        accent,
        zLayer,
      });
      // For wider accent interactive pills, add a crisp inner rule (matches Story uiPlane hero CTA button)
      if (accent && prim.w >= 28 && prim.h >= 14) {
        const inset = Math.max(4, rx);
        strokes.push({
          d: `M ${prim.x + inset} ${prim.y + prim.h * 0.5} H ${prim.x + prim.w - inset}`,
          weight: Math.max(0.7, weight * 0.65),
          accent: true,
          zLayer: zLayer + 0.02,
        });
      }
    } else if (prim.kind === 'fillCircle') {
      // Crisp perimeter circular stroke
      const circleD = `M ${prim.cx - prim.r} ${prim.cy} A ${prim.r} ${prim.r} 0 1 0 ${prim.cx + prim.r} ${prim.cy} A ${prim.r} ${prim.r} 0 1 0 ${prim.cx - prim.r} ${prim.cy}`;
      strokes.push({
        d: circleD,
        weight,
        accent,
        zLayer,
      });
      // Concentric inner ring for larger focal cores (e.g. victory badge, central neural core)
      if (prim.r >= 9) {
        const rInner = prim.r * 0.52;
        const innerCircleD = `M ${prim.cx - rInner} ${prim.cy} A ${rInner} ${rInner} 0 1 0 ${prim.cx + rInner} ${prim.cy} A ${rInner} ${rInner} 0 1 0 ${prim.cx - rInner} ${prim.cy}`;
        strokes.push({
          d: innerCircleD,
          weight: Math.max(0.7, weight * 0.7),
          accent,
          zLayer: zLayer + 0.03,
        });
      }
    }
  }

  // 2. Budget: 88% uniform wireframe structure + 12% ambient dust (exact Story Chapter 02 proportion)
  const structBudget = Math.floor(count * 0.88);

  interface MeasuredStroke {
    d: string;
    lut: Float32Array;
    segs: number;
    totalLen: number;
    weightedLen: number;
    accent: boolean;
    zLayer: number;
    isRay?: boolean;
    rayIndex?: number;
  }

  const measured: MeasuredStroke[] = [];
  let totalWeightedLen = 0;

  for (const s of strokes) {
    const { lut, segs, totalLen } = getSvgPathPolyline(s.d);
    if (totalLen <= 0.01) continue;
    const weightedLen = totalLen * Math.max(0.2, s.weight);
    totalWeightedLen += weightedLen;
    measured.push({
      ...s,
      lut,
      segs,
      totalLen,
      weightedLen,
    });
  }

  if (totalWeightedLen <= 0 || measured.length === 0) return result;

  // 3. Uniform arc-length proportional point distribution (exact Story Chapter 02 formula)
  let allocated = 0;
  for (let s = 0; s < measured.length; s++) {
    const item = measured[s];
    const countForStroke =
      s === measured.length - 1
        ? Math.max(0, structBudget - allocated)
        : Math.max(1, Math.round((item.weightedLen / totalWeightedLen) * structBudget));
    allocated += countForStroke;

    let maxRatio = 1;
    if (svgKey === 'integrations' && item.isRay && drawProgress < 0.99) {
      const rayIdx = item.rayIndex ?? 0;
      const rayStart = rayIdx * 0.12;
      const rayEnd = rayStart + 0.28;
      maxRatio = Math.max(0.04, Math.min(1, (drawProgress - rayStart) / (rayEnd - rayStart)));
    }

    for (let k = 0; k < countForStroke; k++) {
      // Uniform spacing along exact stroke arc length + tiny sub-pixel jitter (< 0.8px)
      const uFrac = (k + 0.5 + (rand() - 0.5) * 0.40) / Math.max(1, countForStroke);
      const clampedT = Math.max(0, Math.min(1, uFrac * maxRatio));

      // Fast O(1) linear interpolation on pre-computed arc-length LUT
      const fIdx = clampedT * item.segs;
      const idx0 = Math.min(item.segs, fIdx | 0);
      const idx1 = Math.min(item.segs, idx0 + 1);
      const frac = fIdx - idx0;
      const o0 = idx0 * 4;
      const o1 = idx1 * 4;

      const px = item.lut[o0] + (item.lut[o1] - item.lut[o0]) * frac;
      const py = item.lut[o0 + 1] + (item.lut[o1 + 1] - item.lut[o0 + 1]) * frac;

      // Exact sub-pixel jitter: <= 0.0022 of viewBox (< 0.8px in 380x260 frame)
      const jitterU = (rand() - 0.5) * 0.0022;
      const jitterV = (rand() - 0.5) * 0.0022;
      const u = Math.max(0.01, Math.min(0.99, px / spec.viewW + jitterU));
      const v = Math.max(0.01, Math.min(0.99, py / spec.viewH + jitterV));
      // Subtle Z-depth parallax without blurring
      const z = item.zLayer * 0.35 + (rand() - 0.5) * 0.015;

      result.push({
        u,
        v,
        z,
        accent: item.accent ? 1 : 0,
        order: clampedT,
        dust: 0,
      });
    }
  }

  // Pad structure if rounding fell slightly short
  while (result.length < structBudget && result.length > 0) {
    const src = result[Math.floor(rand() * result.length)];
    result.push({ ...src });
  }

  // 4. Subtle ambient dust (airy stardust keeping whole frame alive like Story uiPlane)
  while (result.length < count) {
    const angle = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 0.46;
    result.push({
      u: Math.max(0.02, Math.min(0.98, 0.5 + Math.cos(angle) * rad)),
      v: Math.max(0.02, Math.min(0.98, 0.5 + Math.sin(angle) * rad * 0.7)),
      z: (rand() - 0.5) * 0.3,
      accent: rand() < 0.1 ? 0.5 : 0,
      order: rand(),
      dust: 1,
    });
  }

  if (cacheKey) cacheSample(cacheKey, result);
  return result;
}

/**
 * 4. PROCESS STAGE SAMPLER — Matches Section 2 (What I Do) thick granular particle tubes!
 *    Uses the exact same visual language ("حاشیه ضخیم دانه‌دار + داخل خالی"):
 *    - Circular cross-section tubes: r = R * sqrt(rand), R ≈ 0.95% width
 *    - 15% perpendicular edge roughness + 8% along-path jitter + 4% outer stray sparks
 *    - Hollow interiors with <= 4.5% sparse dust + bold #5B5BF0 focal accents
 *    0: Discover (Thick granular radar rings + tilted 3D meridian + indigo sweeping needle)
 *    1: Design   (Thick granular Bauhaus ring + rounded square frame + indigo diagonal axis)
 *    2: Architect(Thick granular 3D (2,3) torus knot tube with indigo crest highlights)
 *    3: Build    (Thick granular 3D isometric wireframe cube + bold indigo inner core cube)
 *    4: Launch   (Thick granular 3D stacked ascending orbital rings + 8 radial rails)
 *    5: Support  (Thick granular 3D continuous infinity lemniscate tube)
 */
export function sampleProcessNormalized(
  stageIdx: number,
  count: number
): NormalizedPoint[] {
  const idx = Math.max(0, Math.min(5, Math.floor(stageIdx)));
  const cacheKey = `processGranularV2:${idx}:${count}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  const rand = mulberry32(hashKey(cacheKey));
  const cfg = WHAT_I_DO_PARTICLE_CONFIG;
  const baseR = cfg.tubeRadiusFrac * 1.08;
  const pts: NormalizedPoint[] = [];
  const interiorDustBudget = Math.floor(count * cfg.interiorDustMaxFrac);
  const structBudget = count - interiorDustBudget;

  // Helper: scatter a point inside a circular granular tube around (cx, cy, cz) with unit normal (nx, ny)
  const pushTubePoint = (
    cx: number,
    cy: number,
    cz: number,
    nx: number,
    ny: number,
    radiusScale: number,
    accent: number,
    order: number
  ) => {
    const R = baseR * radiusScale;
    const isStray = rand() < cfg.outerStrayFrac;
    let perpOff = 0;
    let alongOff = 0;
    let zOff = 0;
    if (isStray) {
      const ang = rand() * Math.PI * 2;
      const rad = R * (1.25 + rand() * 1.45);
      perpOff = Math.cos(ang) * rad;
      alongOff = Math.sin(ang) * rad * 0.6;
      zOff = (rand() - 0.5) * 0.14;
    } else {
      const r = R * Math.sqrt(rand());
      const theta = rand() * Math.PI * 2;
      const perpRough = (rand() - 0.5) * 2 * cfg.perpJitterFrac * R;
      const alongRough = (rand() - 0.5) * 2 * cfg.alongJitterFrac * R;
      perpOff = Math.cos(theta) * r + perpRough;
      alongOff = alongRough;
      zOff = Math.sin(theta) * r * 2.1;
    }
    const tx = -ny;
    const ty = nx;
    pts.push({
      u: Math.max(0.02, Math.min(0.98, cx + nx * perpOff + tx * alongOff)),
      v: Math.max(0.02, Math.min(0.98, cy + ny * perpOff + ty * alongOff)),
      z: cz + zOff,
      accent,
      order,
      dust: isStray ? 0.32 : 0,
    });
  };

  // Helper: sample a 3D line segment with thick granular circular tube
  const sampleSegmentTube = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    share: number,
    radiusScale: number,
    accent: number
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len = Math.max(1e-4, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 0; i < share && pts.length < structBudget; i++) {
      const t = i / Math.max(1, share - 1);
      pushTubePoint(x0 + dx * t, y0 + dy * t, z0 + dz * t, nx, ny, radiusScale, accent, t);
    }
  };

  if (idx === 0) {
    // 0 · Discover: Thick granular concentric radar rings + 3D tilted meridian + bold indigo sweeping needle
    const rings = [
      { r: 0.12, accent: 0, scale: 0.95, share: 0.12 },
      { r: 0.24, accent: 0, scale: 1.05, share: 0.18 },
      { r: 0.37, accent: 1, scale: 1.25, share: 0.26 },
    ];
    for (const ring of rings) {
      const n = Math.floor(structBudget * ring.share);
      for (let i = 0; i < n && pts.length < structBudget; i++) {
        const a = (i / n) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        pushTubePoint(
          0.5 + ca * ring.r,
          0.5 + sa * ring.r,
          Math.sin(a * 2) * 0.18,
          ca,
          sa,
          ring.scale,
          ring.accent,
          i / n
        );
      }
    }
    // 3D tilted meridian ellipse
    const merN = Math.floor(structBudget * 0.22);
    const tilt = 0.56;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    for (let i = 0; i < merN && pts.length < structBudget; i++) {
      const a = (i / merN) * Math.PI * 2;
      const rx = 0.38;
      const ry = 0.16;
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      const tx0 = -Math.sin(a) * rx;
      const ty0 = Math.cos(a) * ry;
      const tx = tx0 * ct - ty0 * st;
      const ty = tx0 * st + ty0 * ct;
      const tLen = Math.max(1e-4, Math.hypot(tx, ty));
      pushTubePoint(
        0.5 + lx * ct - ly * st,
        0.5 + lx * st + ly * ct,
        Math.sin(a) * 0.72,
        -ty / tLen,
        tx / tLen,
        1.05,
        0,
        i / merN
      );
    }
    // Crosshair + bold indigo sweeping radar needle + center focal dot
    sampleSegmentTube(0.12, 0.5, 0, 0.88, 0.5, 0, Math.floor(structBudget * 0.1), 0.9, 0);
    sampleSegmentTube(
      0.5,
      0.5,
      0.08,
      0.5 + Math.cos(-0.68) * 0.37,
      0.5 + Math.sin(-0.68) * 0.37,
      0.42,
      Math.floor(structBudget * 0.12),
      1.4,
      1
    );
  } else if (idx === 1) {
    // 1 · Design: Thick granular Bauhaus circle + hollow rounded square frame + bold indigo diagonal axis
    const circleN = Math.floor(structBudget * 0.42);
    for (let i = 0; i < circleN && pts.length < structBudget; i++) {
      const a = (i / circleN) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const isIndigo = a > 0.25 && a < 1.95 ? 1 : 0;
      pushTubePoint(
        0.43 + ca * 0.3,
        0.5 + sa * 0.3,
        0.3 + ca * 0.16,
        ca,
        sa,
        isIndigo ? 1.25 : 1.08,
        isIndigo,
        i / circleN
      );
    }
    // Rounded hollow architectural square (4 thick tube edges)
    const sqShare = Math.floor(structBudget * 0.1);
    const x0 = 0.36;
    const y0 = 0.22;
    const s = 0.5;
    sampleSegmentTube(x0, y0, -0.28, x0 + s, y0, -0.28, sqShare, 1.08, 0);
    sampleSegmentTube(x0 + s, y0, -0.28, x0 + s, y0 + s, -0.28, sqShare, 1.08, 0);
    sampleSegmentTube(x0 + s, y0 + s, -0.28, x0, y0 + s, -0.28, sqShare, 1.08, 0);
    sampleSegmentTube(x0, y0 + s, -0.28, x0, y0, -0.28, sqShare, 1.08, 0);
    // Bold indigo diagonal drafting axis
    sampleSegmentTube(0.18, 0.82, -0.25, 0.82, 0.18, 0.45, Math.floor(structBudget * 0.18), 1.35, 1);
  } else if (idx === 2) {
    // 2 · Architect: Thick granular 3D (2,3) torus knot hollow tube
    const p = 2;
    const q = 3;
    const eps = 0.004;
    for (let i = 0; i < structBudget; i++) {
      const t = (i / structBudget) * Math.PI * 2;
      const r0 = Math.cos(q * t) + 2.15;
      const x0 = 0.5 + r0 * Math.cos(p * t) * 0.122;
      const y0 = 0.5 + r0 * Math.sin(p * t) * 0.122;
      const z0 = -Math.sin(q * t) * 0.65;

      const t1 = t + eps;
      const r1 = Math.cos(q * t1) + 2.15;
      const dx = (r1 * Math.cos(p * t1) - r0 * Math.cos(p * t)) * 0.122;
      const dy = (r1 * Math.sin(p * t1) - r0 * Math.sin(p * t)) * 0.122;
      const len = Math.max(1e-5, Math.hypot(dx, dy));
      const isIndigo = Math.sin(q * t) > 0.48 ? 1 : 0;
      pushTubePoint(
        x0,
        y0,
        z0,
        -dy / len,
        dx / len,
        isIndigo ? 1.45 : 1.25,
        isIndigo,
        i / structBudget
      );
    }
  } else if (idx === 3) {
    // 3 · Build: Thick granular 3D isometric wireframe cube lattice + bold indigo inner core cube
    const rotY = 0.62;
    const rotX = 0.42;
    const project3D = (x: number, y: number, z3: number) => {
      const x1 = x * Math.cos(rotY) - z3 * Math.sin(rotY);
      const z1 = x * Math.sin(rotY) + z3 * Math.cos(rotY);
      const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
      const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
      return { u: 0.5 + x1, v: 0.5 + y2, z: z2 * 1.9 };
    };
    const emitCube = (half: number, totalShare: number, radiusScale: number, accent: number) => {
      const perEdge = Math.max(24, Math.floor(totalShare / 12));
      const edges: Array<[[number, number, number], [number, number, number]]> = [
        [[-half, -half, -half], [half, -half, -half]],
        [[-half, half, -half], [half, half, -half]],
        [[-half, -half, half], [half, -half, half]],
        [[-half, half, half], [half, half, half]],
        [[-half, -half, -half], [-half, half, -half]],
        [[half, -half, -half], [half, half, -half]],
        [[-half, -half, half], [-half, half, half]],
        [[half, -half, half], [half, half, half]],
        [[-half, -half, -half], [-half, -half, half]],
        [[half, -half, -half], [half, -half, half]],
        [[-half, half, -half], [-half, half, half]],
        [[half, half, -half], [half, half, half]],
      ];
      for (const [a, b] of edges) {
        const pa = project3D(a[0], a[1], a[2]);
        const pb = project3D(b[0], b[1], b[2]);
        sampleSegmentTube(pa.u, pa.v, pa.z, pb.u, pb.v, pb.z, perEdge, radiusScale, accent);
      }
    };
    emitCube(0.265, Math.floor(structBudget * 0.64), 1.15, 0);
    emitCube(0.125, Math.floor(structBudget * 0.36), 1.38, 1);
  } else if (idx === 4) {
    // 4 · Launch: Thick granular 3D stacked ascending orbital rings + 8 bold radial launch struts
    const ringBudget = Math.floor(structBudget * 0.66);
    const numRings = 5;
    const perRing = Math.floor(ringBudget / numRings);
    for (let rIdx = 0; rIdx < numRings; rIdx++) {
      const frac = rIdx / (numRings - 1);
      const rad = 0.08 + frac * 0.31;
      const isIndigo = rIdx >= 3 ? 1 : 0;
      for (let i = 0; i < perRing && pts.length < structBudget; i++) {
        const a = (i / perRing) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const tx = -sa * rad;
        const ty = ca * rad * 0.28;
        const len = Math.max(1e-4, Math.hypot(tx, ty));
        pushTubePoint(
          0.5 + ca * rad,
          0.81 - frac * 0.62 + sa * rad * 0.28,
          sa * rad * 1.9,
          -ty / len,
          tx / len,
          isIndigo ? 1.28 : 1.05,
          isIndigo,
          i / perRing
        );
      }
    }
    const railShare = Math.floor((structBudget - ringBudget) / 8);
    for (let rail = 0; rail < 8; rail++) {
      const a = (rail / 8) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const r0 = 0.08;
      const r1 = 0.39;
      sampleSegmentTube(
        0.5 + ca * r0,
        0.81 + sa * r0 * 0.28,
        sa * r0 * 1.9,
        0.5 + ca * r1,
        0.19 + sa * r1 * 0.28,
        sa * r1 * 1.9,
        railShare,
        rail % 2 === 0 ? 1.12 : 0.95,
        rail % 2 === 0 ? 1 : 0
      );
    }
  } else {
    // 5 · Support: Thick granular 3D continuous infinity lemniscate tube
    const eps = 0.005;
    for (let i = 0; i < structBudget; i++) {
      const t = (i / structBudget) * Math.PI * 2;
      const d0 = 1 + Math.sin(t) * Math.sin(t);
      const x0 = 0.5 + (0.39 * Math.cos(t)) / d0;
      const y0 = 0.5 + ((0.39 * Math.sin(t) * Math.cos(t)) / d0) * 1.5;
      const z0 = Math.sin(t) * 0.65;

      const t1 = t + eps;
      const d1 = 1 + Math.sin(t1) * Math.sin(t1);
      const dx = (0.39 * Math.cos(t1)) / d1 - (0.39 * Math.cos(t)) / d0;
      const dy = (((0.39 * Math.sin(t1) * Math.cos(t1)) / d1) - ((0.39 * Math.sin(t) * Math.cos(t)) / d0)) * 1.5;
      const len = Math.max(1e-5, Math.hypot(dx, dy));
      const isIndigo = Math.cos(t) > 0.52 ? 1 : 0;

      pushTubePoint(
        x0,
        y0,
        z0,
        -dy / len,
        dx / len,
        isIndigo ? 1.5 : 1.28,
        isIndigo,
        i / structBudget
      );
    }
  }

  // Pad structure if rounding fell slightly short
  while (pts.length < structBudget && pts.length > 0) {
    const src = pts[Math.floor(rand() * pts.length)];
    pts.push({ ...src });
  }

  // <= 4.5% sparse interior/surround dust matching What I Do
  while (pts.length < count) {
    const angle = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 0.44;
    pts.push({
      u: Math.max(0.03, Math.min(0.97, 0.5 + Math.cos(angle) * rad)),
      v: Math.max(0.03, Math.min(0.97, 0.5 + Math.sin(angle) * rad * 0.85)),
      z: (rand() - 0.5) * 0.8,
      accent: rand() < 0.14 ? 0.6 : 0,
      order: rand(),
      dust: 1,
    });
  }

  cacheSample(cacheKey, pts);
  return pts;
}

/**
 * 5. STATEMENT WORD SAMPLER ("invisible." / "نامرئی است.") — 2048px OffscreenCanvas,
 *    alpha > 128, <= 0.5px jitter, contour-weighted crispness,
 *    with `#5B5BF0` accent concentrated STRICTLY on the trailing period "." + a few sparse sparks.
 */
export async function sampleStatementWordNormalized(
  text: string,
  count: number,
  options: { isRtl?: boolean } = {}
): Promise<NormalizedPoint[]> {
  const { isRtl = false } = options;
  const cacheKey = `stmt2k:${text}:${count}:${isRtl}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const w = 2048;
  const h = 640;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(w, h);
    ctx = off.getContext('2d', { willReadFrequently: true });
  } else if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    ctx = c.getContext('2d', { willReadFrequently: true });
  }

  const rand = mulberry32(hashKey(cacheKey));
  if (!ctx) {
    const fallback: NormalizedPoint[] = [];
    appendSurroundDust(fallback, count, rand);
    return fallback;
  }

  const hasDot = text.endsWith('.');
  const wordBody = hasDot ? text.slice(0, -1) : text;

  const fontFamily = isRtl
    ? '"Vazirmatn", "Inter Tight", sans-serif'
    : '"Inter Tight", "Vazirmatn", sans-serif';

  let fontSize = Math.min(390, Math.max(180, Math.floor(1960 / Math.max(4, text.length * 0.58))));
  ctx.font = `800 ${fontSize}px ${fontFamily}`;
  const totalMeasured = ctx.measureText(text).width;
  if (totalMeasured > w * 0.9) {
    fontSize = Math.max(120, Math.floor(fontSize * ((w * 0.88) / totalMeasured)));
    ctx.font = `800 ${fontSize}px ${fontFamily}`;
  }

  ctx.textBaseline = 'middle';
  ctx.direction = isRtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';

  // Render full word into red channel & isolate the trailing dot in green channel
  // Step A: draw full text in pure black to capture exact glyph alpha
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000000';
  ctx.fillText(text, w * 0.5, h * 0.52);
  const fullData = ctx.getImageData(0, 0, w, h).data;

  // Compute exact dot bounding region from measured metrics
  const fullWidth = ctx.measureText(text).width;
  const bodyWidth = ctx.measureText(wordBody).width;
  const dotWidth = Math.max(24, fullWidth - bodyWidth + 14);
  const dotMinX = isRtl ? w * 0.5 - fullWidth * 0.5 - 12 : w * 0.5 + fullWidth * 0.5 - dotWidth;
  const dotMaxX = isRtl ? w * 0.5 - fullWidth * 0.5 + dotWidth : w * 0.5 + fullWidth * 0.5 + 12;

  const edgePts: number[] = [];
  const interiorPts: number[] = [];
  const dotPts: number[] = [];

  const stride = 3;
  for (let y = stride; y < h - stride; y += stride) {
    for (let x = stride; x < w - stride; x += stride) {
      const a = fullData[(y * w + x) * 4 + 3];
      if (a <= 128) continue;

      const isDotRegion = hasDot && x >= dotMinX && x <= dotMaxX && y >= h * 0.44;
      if (isDotRegion) {
        dotPts.push(x, y);
        continue;
      }

      const aL = fullData[(y * w + (x - stride)) * 4 + 3];
      const aR = fullData[(y * w + (x + stride)) * 4 + 3];
      const aU = fullData[((y - stride) * w + x) * 4 + 3];
      const aD = fullData[((y + stride) * w + x) * 4 + 3];

      if (aL <= 128 || aR <= 128 || aU <= 128 || aD <= 128) {
        edgePts.push(x, y);
      } else {
        interiorPts.push(x, y);
      }
    }
  }

  const result: NormalizedPoint[] = [];
  const structTarget = Math.floor(count * 0.92);
  const edgeCount = edgePts.length / 2;
  const intCount = interiorPts.length / 2;
  const dotCount = dotPts.length / 2;

  if (edgeCount === 0 && intCount === 0) {
    appendSurroundDust(result, count, rand);
    sampleCache.set(cacheKey, result);
    return result;
  }

  // Reserve dedicated crisp budget (~7%) for the trailing indigo period "."
  const wantDot = dotCount > 0 ? Math.floor(structTarget * 0.075) : 0;
  const remaining = structTarget - wantDot;
  const wantEdge = edgeCount > 0 ? Math.floor(remaining * 0.58) : 0;
  const wantInt = remaining - wantEdge;

  for (let i = 0; i < wantDot; i++) {
    const pick = Math.floor(rand() * dotCount) * 2;
    const u = (dotPts[pick] + (rand() - 0.5) * 0.45) / w;
    const v = (dotPts[pick + 1] + (rand() - 0.5) * 0.45) / h;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: 0.16 + (rand() - 0.5) * 0.12,
      accent: 1,
      order: Math.hypot(u - 0.5, v - 0.5),
      dust: 0,
    });
  }

  for (let i = 0; i < wantEdge; i++) {
    const pick = Math.floor(rand() * edgeCount) * 2;
    const u = (edgePts[pick] + (rand() - 0.5) * 0.45) / w;
    const v = (edgePts[pick + 1] + (rand() - 0.5) * 0.45) / h;
    // Sparse accent sparks (~1.8%) on letter edges; main accent stays strictly on "."
    const isSpark = rand() < 0.018 ? 1 : 0;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (rand() - 0.5) * 0.12 + (isSpark ? 0.1 : 0),
      accent: isSpark,
      order: Math.hypot((u - 0.5) * 1.4, v - 0.5),
      dust: 0,
    });
  }

  const pool = intCount > 0 ? interiorPts : edgePts;
  const poolLen = pool.length / 2;
  for (let i = 0; i < wantInt; i++) {
    const pick = Math.floor(rand() * poolLen) * 2;
    const u = (pool[pick] + (rand() - 0.5) * 0.45) / w;
    const v = (pool[pick + 1] + (rand() - 0.5) * 0.45) / h;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (rand() - 0.5) * 0.08,
      accent: rand() < 0.008 ? 1 : 0,
      order: Math.hypot((u - 0.5) * 1.4, v - 0.5),
      dust: 0,
    });
  }

  appendSurroundDust(result, count, rand);
  sampleCache.set(cacheKey, result);
  return result;
}

/**
 * 6. QUOTE MARKS SAMPLER ("« »") — Giant sculptural typographic guillemets/quotes
 *    sampled at 2048×1280 with crisp hollow contour emphasis, subtle 3D tilt relief,
 *    and indigo architectural edge accent.
 */
export async function sampleQuoteMarksNormalized(
  count: number
): Promise<NormalizedPoint[]> {
  const cacheKey = `quoteMarks2k:${count}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  const w = 2048;
  const h = 1280;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(w, h);
    ctx = off.getContext('2d', { willReadFrequently: true });
  } else if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    ctx = c.getContext('2d', { willReadFrequently: true });
  }

  const rand = mulberry32(hashKey(cacheKey));
  if (!ctx) {
    const fallback: NormalizedPoint[] = [];
    appendSurroundDust(fallback, count, rand);
    return fallback;
  }

  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Draw large, iconic sculptural double-chevron quote marks « » with architectural balance
  // Left opening guillemets « (upper-left focal)
  const drawChevron = (cx: number, cy: number, scale: number, dir: 1 | -1) => {
    ctx!.save();
    ctx!.translate(cx, cy);
    ctx!.scale(dir * scale, scale);
    ctx!.beginPath();
    ctx!.moveTo(115, -245);
    ctx!.lineTo(-105, 0);
    ctx!.lineTo(115, 245);
    ctx!.lineTo(18, 245);
    ctx!.lineTo(-200, 0);
    ctx!.lineTo(18, -245);
    ctx!.closePath();
    ctx!.fillStyle = '#000000';
    ctx!.fill();
    ctx!.restore();
  };

  // Opening « (slightly higher)
  drawChevron(540, 520, 1.05, 1);
  drawChevron(780, 520, 1.05, 1);

  // Closing » (slightly lower, counterbalanced sculptural composition)
  drawChevron(1268, 760, 1.05, -1);
  drawChevron(1508, 760, 1.05, -1);

  // Thin architectural diagonal hairline frame accent connecting the two marks
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(960, 920);
  ctx.lineTo(1090, 360);
  ctx.stroke();

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const edgePts: number[] = [];
  const interiorPts: number[] = [];
  const stride = 4;

  for (let y = stride; y < h - stride; y += stride) {
    for (let x = stride; x < w - stride; x += stride) {
      const a = imgData[(y * w + x) * 4 + 3];
      if (a <= 128) continue;

      const aL = imgData[(y * w + (x - stride)) * 4 + 3];
      const aR = imgData[(y * w + (x + stride)) * 4 + 3];
      const aU = imgData[((y - stride) * w + x) * 4 + 3];
      const aD = imgData[((y + stride) * w + x) * 4 + 3];

      if (aL <= 128 || aR <= 128 || aU <= 128 || aD <= 128) {
        edgePts.push(x, y);
      } else {
        interiorPts.push(x, y);
      }
    }
  }

  const result: NormalizedPoint[] = [];
  const structTarget = Math.floor(count * 0.9);
  const edgeCount = edgePts.length / 2;
  const intCount = interiorPts.length / 2;

  if (edgeCount === 0 && intCount === 0) {
    appendSurroundDust(result, count, rand);
    sampleCache.set(cacheKey, result);
    return result;
  }

  // 64% razor-sharp contours + 36% lighter structural fill
  const wantEdge = Math.floor(structTarget * 0.64);
  const wantInt = structTarget - wantEdge;

  for (let i = 0; i < wantEdge; i++) {
    const pick = Math.floor(rand() * edgeCount) * 2;
    const u = (edgePts[pick] + (rand() - 0.5) * 0.45) / w;
    const v = (edgePts[pick + 1] + (rand() - 0.5) * 0.45) / h;
    // Indigo accent on the inner chevron contours + central bridge
    const nearCenter = Math.abs(u - 0.5) < 0.16;
    const isAccent = nearCenter || rand() < 0.22 ? 1 : 0;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (u - 0.5) * 0.42 + (isAccent ? 0.14 : 0) + (rand() - 0.5) * 0.08,
      accent: isAccent,
      order: u,
      dust: 0,
    });
  }

  const pool = intCount > 0 ? interiorPts : edgePts;
  const poolLen = pool.length / 2;
  for (let i = 0; i < wantInt; i++) {
    const pick = Math.floor(rand() * poolLen) * 2;
    const u = (pool[pick] + (rand() - 0.5) * 0.45) / w;
    const v = (pool[pick + 1] + (rand() - 0.5) * 0.45) / h;
    result.push({
      u: Math.max(0.01, Math.min(0.99, u)),
      v: Math.max(0.01, Math.min(0.99, v)),
      z: (u - 0.5) * 0.35 + (rand() - 0.5) * 0.08,
      accent: rand() < 0.08 ? 1 : 0,
      order: u,
      dust: 0,
    });
  }

  appendSurroundDust(result, count, rand);
  sampleCache.set(cacheKey, result);
  return result;
}

/**
 * 7. INFINITE STRIP WORD SAMPLER ("SOHEIL — SOHEIL — SOHEIL") —
 *    Samples `repeatCount` identical tiles evenly across u in [0, 1] so the
 *    GPU vertex shader can wrap seamlessly via:
 *      x = mod(x + uStripOffset + halfLen, stripLen) - halfLen
 *    with zero seam and crisp typography.
 */
export async function sampleStripWordNormalized(
  word: string,
  count: number,
  options: { repeatCount?: number; separator?: string; isRtl?: boolean } = {}
): Promise<NormalizedPoint[]> {
  const { repeatCount = 3, separator = '—', isRtl = false } = options;
  const cacheKey = `strip3k:${word}:${repeatCount}:${separator}:${count}:${isRtl}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // Sample ONE crisp tile at 1024×280, then replicate cleanly across `repeatCount` tiles
  // so every tile is pixel-identical and modulo wrapping has ZERO seam!
  const tileW = 1024;
  const tileH = 280;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(tileW, tileH);
    ctx = off.getContext('2d', { willReadFrequently: true });
  } else if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = tileW;
    c.height = tileH;
    ctx = c.getContext('2d', { willReadFrequently: true });
  }

  const rand = mulberry32(hashKey(cacheKey));
  if (!ctx) {
    const fallback: NormalizedPoint[] = [];
    appendSurroundDust(fallback, count, rand);
    return fallback;
  }

  ctx.clearRect(0, 0, tileW, tileH);
  ctx.textBaseline = 'middle';
  ctx.direction = isRtl ? 'rtl' : 'ltr';

  const fontFamily = isRtl
    ? '"Vazirmatn", "Inter Tight", sans-serif'
    : '"Inter Tight", "Vazirmatn", sans-serif';

  // Measure word to fit cleanly inside left 76% of the tile, leaving 24% for the separator dash
  let fontSize = 236;
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  const wordW = ctx.measureText(word).width;
  if (wordW > tileW * 0.72) {
    fontSize = Math.max(110, Math.floor(fontSize * ((tileW * 0.7) / wordW)));
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(word, tileW * 0.4, tileH * 0.5);

  // Draw architectural separator dash (marked in right 20% of tile for indigo accent)
  const dashX0 = tileW * 0.81;
  const dashX1 = tileW * 0.93;
  ctx.fillRect(dashX0, tileH * 0.5 - 12, dashX1 - dashX0, 24);

  const imgData = ctx.getImageData(0, 0, tileW, tileH).data;
  const edgePts: number[] = [];
  const interiorPts: number[] = [];
  const dashPts: number[] = [];
  const stride = 3;

  for (let y = stride; y < tileH - stride; y += stride) {
    for (let x = stride; x < tileW - stride; x += stride) {
      const a = imgData[(y * tileW + x) * 4 + 3];
      if (a <= 128) continue;

      if (x >= dashX0 - 4 && x <= dashX1 + 4) {
        dashPts.push(x, y);
        continue;
      }

      const aL = imgData[(y * tileW + (x - stride)) * 4 + 3];
      const aR = imgData[(y * tileW + (x + stride)) * 4 + 3];
      const aU = imgData[((y - stride) * tileW + x) * 4 + 3];
      const aD = imgData[((y + stride) * tileW + x) * 4 + 3];

      if (aL <= 128 || aR <= 128 || aU <= 128 || aD <= 128) {
        edgePts.push(x, y);
      } else {
        interiorPts.push(x, y);
      }
    }
  }

  const result: NormalizedPoint[] = [];
  const structTarget = Math.floor(count * 0.94);
  const perTile = Math.floor(structTarget / repeatCount);
  const edgeCount = edgePts.length / 2;
  const intCount = interiorPts.length / 2;
  const dashCount = dashPts.length / 2;

  if (edgeCount === 0 && intCount === 0) {
    appendSurroundDust(result, count, rand);
    sampleCache.set(cacheKey, result);
    return result;
  }

  for (let tileIdx = 0; tileIdx < repeatCount; tileIdx++) {
    const wantDash = dashCount > 0 ? Math.floor(perTile * 0.08) : 0;
    const rem = perTile - wantDash;
    const wantEdge = Math.floor(rem * 0.56);
    const wantInt = rem - wantEdge;

    for (let i = 0; i < wantDash; i++) {
      const pick = Math.floor(rand() * dashCount) * 2;
      const localU = (dashPts[pick] + (rand() - 0.5) * 0.45) / tileW;
      const u = (tileIdx + localU) / repeatCount;
      const v = (dashPts[pick + 1] + (rand() - 0.5) * 0.45) / tileH;
      result.push({
        u,
        v: Math.max(0.02, Math.min(0.98, v)),
        z: 0.14 + (rand() - 0.5) * 0.06,
        accent: 1,
        order: u,
        dust: 0,
      });
    }

    for (let i = 0; i < wantEdge; i++) {
      const pick = Math.floor(rand() * edgeCount) * 2;
      const localU = (edgePts[pick] + (rand() - 0.5) * 0.45) / tileW;
      const u = (tileIdx + localU) / repeatCount;
      const v = (edgePts[pick + 1] + (rand() - 0.5) * 0.45) / tileH;
      result.push({
        u,
        v: Math.max(0.02, Math.min(0.98, v)),
        z: (rand() - 0.5) * 0.1,
        accent: rand() < 0.06 ? 1 : 0,
        order: u,
        dust: 0,
      });
    }

    const pool = intCount > 0 ? interiorPts : edgePts;
    const poolLen = pool.length / 2;
    for (let i = 0; i < wantInt; i++) {
      const pick = Math.floor(rand() * poolLen) * 2;
      const localU = (pool[pick] + (rand() - 0.5) * 0.45) / tileW;
      const u = (tileIdx + localU) / repeatCount;
      const v = (pool[pick + 1] + (rand() - 0.5) * 0.45) / tileH;
      result.push({
        u,
        v: Math.max(0.02, Math.min(0.98, v)),
        z: (rand() - 0.5) * 0.08,
        accent: rand() < 0.02 ? 1 : 0,
        order: u,
        dust: 0,
      });
    }
  }

  // Remaining 6% quiet dust distributed evenly across the strip span
  while (result.length < count) {
    result.push({
      u: rand(),
      v: rand(),
      z: (rand() - 0.5) * 0.8,
      accent: rand() < 0.1 ? 0.5 : 0,
      order: rand(),
      dust: 1,
    });
  }

  sampleCache.set(cacheKey, result);
  return result;
}

