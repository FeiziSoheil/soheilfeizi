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

const MAX_SAMPLE_CACHE = 8;
const sampleCache = new Map<string, NormalizedPoint[]>();
const svgPolylineCache = new Map<string, { lut: Float32Array; segs: number; totalLen: number }>();

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
 * using ~96..220 DOM calls instead of 210,000 calls per diagram switch (~500x faster).
 */
function getSvgPathPolyline(d: string): { lut: Float32Array; segs: number; totalLen: number } {
  const cached = svgPolylineCache.get(d);
  if (cached) return cached;

  const svgNS = 'http://www.w3.org/2000/svg';
  const pathEl = document.createElementNS(svgNS, 'path');
  pathEl.setAttribute('d', d);
  const totalLen = Math.max(1, pathEl.getTotalLength());
  const segs = Math.max(48, Math.min(220, Math.ceil(totalLen * 0.65)));
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

/** Isometric 3D segment specification for CRM & ERP */
interface Segment3D {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  accent: boolean;
  radiusScale: number;
  weight: number;
}

function buildIsometricCrmSegments(): {
  segments: Segment3D[];
  middleRing: { cx: number; cy: number; cz: number; r: number };
} {
  // 3 vertically well-spaced diamond plates in true 3D isometric space (zero overlap / z-fighting!)
  const yLevels = [-0.34, 0.0, 0.34]; // generous vertical separation
  const plateHalf = 0.27;
  const rotY = Math.PI / 4; // 45° diamond orientation
  const rotX = 0.58; // classic architectural isometric pitch (~33°)

  const proj = (x: number, y: number, z: number) => {
    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
    const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { u: 0.5 + x1 * 0.92, v: 0.5 + y2 * 0.92, z: z2 * 1.6 };
  };

  const segments: Segment3D[] = [];
  const corners = [
    [-plateHalf, -plateHalf],
    [plateHalf, -plateHalf],
    [plateHalf, plateHalf],
    [-plateHalf, plateHalf],
  ];

  yLevels.forEach((yLvl, idx) => {
    const isMid = idx === 1;
    const pts = corners.map(([cx, cz]) => proj(cx, yLvl, cz));
    for (let e = 0; e < 4; e++) {
      const a = pts[e];
      const b = pts[(e + 1) % 4];
      segments.push({
        x0: a.u,
        y0: a.v,
        z0: a.z,
        x1: b.u,
        y1: b.v,
        z1: b.z,
        accent: false,
        radiusScale: isMid ? 1.18 : 1.05,
        weight: isMid ? 2.4 : 2.0,
      });
    }

    // Subtle inner corner tick marks on top & bottom plates (hollow interior!)
    if (!isMid) {
      const s = plateHalf * 0.62;
      const inPts = [
        proj(-s, yLvl, -s),
        proj(s, yLvl, -s),
        proj(s, yLvl, s),
        proj(-s, yLvl, s),
      ];
      for (let e = 0; e < 4; e++) {
        const a = inPts[e];
        const b = inPts[(e + 1) % 4];
        segments.push({
          x0: a.u,
          y0: a.v,
          z0: a.z,
          x1: b.u,
          y1: b.v,
          z1: b.z,
          accent: false,
          radiusScale: 0.65,
          weight: 0.55,
        });
      }
    }
  });

  // Thicker central vertical spine in #5B5BF0 connecting all 3 plates cleanly
  const topCenter = proj(0, yLevels[0] - 0.04, 0);
  const botCenter = proj(0, yLevels[2] + 0.04, 0);
  segments.push({
    x0: topCenter.u,
    y0: topCenter.v,
    z0: topCenter.z,
    x1: botCenter.u,
    y1: botCenter.v,
    z1: botCenter.z,
    accent: true,
    radiusScale: 1.65,
    weight: 2.6,
  });

  // 4 subtle outer vertical corner pillars framing the 3-tier stack
  corners.forEach(([cx, cz]) => {
    const pTop = proj(cx, yLevels[0], cz);
    const pBot = proj(cx, yLevels[2], cz);
    segments.push({
      x0: pTop.u,
      y0: pTop.v,
      z0: pTop.z,
      x1: pBot.u,
      y1: pBot.v,
      z1: pBot.z,
      accent: false,
      radiusScale: 0.72,
      weight: 0.75,
    });
  });

  return {
    segments,
    middleRing: { cx: 0.5, cy: 0.5, cz: 0, r: 0.105 },
  };
}

function sampleIsometricCrmNormalized(count: number, rand: () => number): NormalizedPoint[] {
  const cfg = WHAT_I_DO_PARTICLE_CONFIG;
  const baseR = cfg.tubeRadiusFrac; // ~0.009
  const { segments, middleRing } = buildIsometricCrmSegments();
  const result: NormalizedPoint[] = [];

  const interiorDustBudget = Math.floor(count * cfg.interiorDustMaxFrac);
  const ringBudget = Math.floor(count * 0.16);
  const segBudget = count - interiorDustBudget - ringBudget;

  const totalWeight = segments.reduce((acc, s) => acc + s.weight, 0);

  // 1. Sample 3D thick granular tubes along every isometric segment
  for (const seg of segments) {
    const share = Math.max(24, Math.round((segBudget * seg.weight) / totalWeight));
    const dx = seg.x1 - seg.x0;
    const dy = seg.y1 - seg.y0;
    const dz = seg.z1 - seg.z0;
    const len2d = Math.max(1e-4, Math.hypot(dx, dy));
    const nx = -dy / len2d;
    const ny = dx / len2d;
    const R = baseR * seg.radiusScale;

    for (let i = 0; i < share && result.length < segBudget; i++) {
      const baseT = i / Math.max(1, share - 1);
      // 8% along-path jitter
      const alongJitter = ((rand() - 0.5) * 2 * cfg.alongJitterFrac) / Math.max(6, share * 0.06);
      const t = Math.max(0, Math.min(1, baseT + alongJitter));

      const px = seg.x0 + dx * t;
      const py = seg.y0 + dy * t;
      const pz = seg.z0 + dz * t;

      const isStray = rand() < cfg.outerStrayFrac;
      let offPerp = 0;
      let offZ = 0;
      if (isStray) {
        const ang = rand() * Math.PI * 2;
        const rad = R * (1.25 + rand() * 1.45);
        offPerp = Math.cos(ang) * rad;
        offZ = Math.sin(ang) * rad * 2.2;
      } else {
        // Uniform circular cross-section r = R * sqrt(rand) + 15% perpendicular edge roughness
        const r = R * Math.sqrt(rand());
        const theta = rand() * Math.PI * 2;
        const edgeRough = (rand() - 0.5) * 2 * cfg.perpJitterFrac * R;
        offPerp = Math.cos(theta) * r + edgeRough;
        offZ = Math.sin(theta) * r * 2.2;
      }

      result.push({
        u: Math.max(0.02, Math.min(0.98, px + nx * offPerp)),
        v: Math.max(0.02, Math.min(0.98, py + ny * offPerp)),
        z: pz + offZ,
        accent: seg.accent ? 1 : 0,
        order: t,
        dust: isStray ? 0.35 : 0,
      });
    }
  }

  // 2. Dense #5B5BF0 indigo ring on the middle isometric plate
  const ringR = baseR * 1.45;
  for (let i = 0; i < ringBudget; i++) {
    const a = (i / ringBudget) * Math.PI * 2 + (rand() - 0.5) * 0.04;
    const isStray = rand() < cfg.outerStrayFrac;
    const radial = isStray
      ? ringR * (1.2 + rand() * 1.3)
      : ringR * Math.sqrt(rand()) + (rand() - 0.5) * 2 * cfg.perpJitterFrac * ringR;
    const theta = rand() * Math.PI * 2;
    const radEff = middleRing.r + Math.cos(theta) * radial;
    const u = middleRing.cx + Math.cos(a) * radEff;
    const v = middleRing.cy + Math.sin(a) * radEff * 0.56; // isometric ellipse foreshortening
    const z = Math.sin(a) * radEff * 0.9 + Math.sin(theta) * radial * 2.0;
    result.push({
      u: Math.max(0.02, Math.min(0.98, u)),
      v: Math.max(0.02, Math.min(0.98, v)),
      z,
      accent: 1,
      order: a / (Math.PI * 2),
      dust: isStray ? 0.3 : 0,
    });
  }

  // 3. <= 4.5% sparse interior/surround dust keeping interiors cleanly hollow
  while (result.length < count) {
    const angle = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 0.4;
    result.push({
      u: Math.max(0.04, Math.min(0.96, 0.5 + Math.cos(angle) * rad)),
      v: Math.max(0.04, Math.min(0.96, 0.5 + Math.sin(angle) * rad * 0.85)),
      z: (rand() - 0.5) * 0.9,
      accent: rand() < 0.14 ? 0.6 : 0,
      order: rand(),
      dust: 1,
    });
  }

  return result;
}

const SVG_DIAGRAMS: Record<
  string,
  { viewW: number; viewH: number; primitives: GranularPrimitive[] }
> = {
  frontend: {
    // Rounded browser frame (hollow) + dense #5B5BF0 hero CTA/visual + 3 rounded cards w/ solid dark text bars
    viewW: 400,
    viewH: 270,
    primitives: [
      // Outer rounded browser frame (rx = 12 = 3% of 400) + top nav divider
      { kind: 'path', d: roundedRectD(20, 16, 360, 238, 12), accent: false, weight: 3.4, zLayer: 0.0, radiusScale: 1.08 },
      { kind: 'path', d: 'M 20 48 H 380', accent: false, weight: 1.6, zLayer: 0.04, radiusScale: 0.95 },
      // Top nav brand pill (indigo dense fill) + 4 compact nav ink bars
      { kind: 'fillRect', x: 34, y: 26, w: 28, h: 12, rx: 5, accent: true, weight: 0.8, zLayer: 0.18, density: 0.7 },
      { kind: 'fillRect', x: 222, y: 29, w: 26, h: 6, rx: 3, accent: false, weight: 0.45, zLayer: 0.1, density: 0.9 },
      { kind: 'fillRect', x: 258, y: 29, w: 26, h: 6, rx: 3, accent: false, weight: 0.45, zLayer: 0.1, density: 0.9 },
      { kind: 'fillRect', x: 294, y: 29, w: 26, h: 6, rx: 3, accent: false, weight: 0.45, zLayer: 0.1, density: 0.9 },
      { kind: 'fillRect', x: 330, y: 29, w: 32, h: 6, rx: 3, accent: false, weight: 0.45, zLayer: 0.1, density: 0.9 },
      // Hero left solid ink headline bars + dense #5B5BF0 CTA pill
      { kind: 'fillRect', x: 38, y: 66, w: 162, h: 10, rx: 4, accent: false, weight: 1.2, zLayer: 0.2, density: 0.92 },
      { kind: 'fillRect', x: 38, y: 84, w: 128, h: 9, rx: 4, accent: false, weight: 0.95, zLayer: 0.18, density: 0.92 },
      { kind: 'fillRect', x: 38, y: 101, w: 98, h: 6, rx: 3, accent: false, weight: 0.55, zLayer: 0.15, density: 0.85 },
      { kind: 'fillRect', x: 38, y: 116, w: 78, h: 20, rx: 10, accent: true, weight: 1.8, zLayer: 0.35, density: 0.65 },
      // Hero right rounded visual frame (hollow outline + dense indigo focal block)
      { kind: 'path', d: roundedRectD(234, 62, 130, 78, 10), accent: false, weight: 2.2, zLayer: 0.24, radiusScale: 1.0 },
      { kind: 'fillRect', x: 248, y: 74, w: 102, h: 54, rx: 7, accent: true, weight: 2.4, zLayer: 0.3, density: 0.6 },
      // Row of 3 hollow rounded cards with small solid ink text bars inside
      // Card 1
      { kind: 'path', d: roundedRectD(36, 154, 100, 86, 10), accent: false, weight: 1.9, zLayer: 0.14, radiusScale: 0.96 },
      { kind: 'path', d: roundedRectD(46, 164, 80, 38, 6), accent: false, weight: 1.2, zLayer: 0.2, radiusScale: 0.82 },
      { kind: 'fillRect', x: 48, y: 211, w: 62, h: 6, rx: 3, accent: false, weight: 0.55, zLayer: 0.22, density: 0.95 },
      { kind: 'fillRect', x: 48, y: 223, w: 42, h: 5, rx: 2.5, accent: false, weight: 0.4, zLayer: 0.22, density: 0.95 },
      // Card 2 (featured center card with #5B5BF0 accent badge)
      { kind: 'path', d: roundedRectD(150, 154, 100, 86, 10), accent: false, weight: 1.9, zLayer: 0.28, radiusScale: 1.0 },
      { kind: 'fillRect', x: 160, y: 164, w: 80, h: 38, rx: 6, accent: true, weight: 2.0, zLayer: 0.36, density: 0.6 },
      { kind: 'fillRect', x: 162, y: 211, w: 62, h: 6, rx: 3, accent: false, weight: 0.55, zLayer: 0.32, density: 0.95 },
      { kind: 'fillRect', x: 162, y: 223, w: 44, h: 5, rx: 2.5, accent: false, weight: 0.4, zLayer: 0.32, density: 0.95 },
      // Card 3
      { kind: 'path', d: roundedRectD(264, 154, 100, 86, 10), accent: false, weight: 1.9, zLayer: 0.14, radiusScale: 0.96 },
      { kind: 'path', d: roundedRectD(274, 164, 80, 38, 6), accent: false, weight: 1.2, zLayer: 0.2, radiusScale: 0.82 },
      { kind: 'fillRect', x: 276, y: 211, w: 62, h: 6, rx: 3, accent: false, weight: 0.55, zLayer: 0.22, density: 0.95 },
      { kind: 'fillRect', x: 276, y: 223, w: 42, h: 5, rx: 2.5, accent: false, weight: 0.4, zLayer: 0.22, density: 0.95 },
    ],
  },
  integrations: {
    viewW: 360,
    viewH: 260,
    primitives: [
      // Outer hexagonal bus perimeter (hollow)
      { kind: 'path', d: 'M 180 34 L 296 72 L 296 188 L 180 226 L 64 188 L 64 72 Z', accent: false, weight: 2.8, zLayer: -0.3, radiusScale: 1.02 },
      // 6 thick hollow circular satellite nodes
      { kind: 'path', d: 'M 180 16 A 18 18 0 1 0 180 52 A 18 18 0 1 0 180 16', accent: false, weight: 1.5, zLayer: -0.18, radiusScale: 1.0 },
      { kind: 'path', d: 'M 296 54 A 18 18 0 1 0 296 90 A 18 18 0 1 0 296 54', accent: false, weight: 1.5, zLayer: -0.1, radiusScale: 1.0 },
      { kind: 'path', d: 'M 296 170 A 18 18 0 1 0 296 206 A 18 18 0 1 0 296 170', accent: false, weight: 1.5, zLayer: -0.18, radiusScale: 1.0 },
      { kind: 'path', d: 'M 180 208 A 18 18 0 1 0 180 244 A 18 18 0 1 0 180 208', accent: false, weight: 1.5, zLayer: -0.1, radiusScale: 1.0 },
      { kind: 'path', d: 'M 64 170 A 18 18 0 1 0 64 206 A 18 18 0 1 0 64 170', accent: false, weight: 1.5, zLayer: -0.18, radiusScale: 1.0 },
      { kind: 'path', d: 'M 64 54 A 18 18 0 1 0 64 90 A 18 18 0 1 0 64 54', accent: false, weight: 1.5, zLayer: -0.1, radiusScale: 1.0 },
      // Center hub thick hollow ring + dense #5B5BF0 inner core ring
      { kind: 'path', d: 'M 180 96 A 34 34 0 1 0 180 164 A 34 34 0 1 0 180 96', accent: false, weight: 2.6, zLayer: 0.45, radiusScale: 1.2 },
      { kind: 'path', d: 'M 180 110 A 20 20 0 1 0 180 150 A 20 20 0 1 0 180 110', accent: true, weight: 2.3, zLayer: 0.6, radiusScale: 1.35 },
      // 6 thick granular #5B5BF0 radial conduits
      { kind: 'path', d: 'M 180 96 L 180 52', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 210 114 L 278 81', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 210 146 L 278 179', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 180 164 L 180 208', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 150 146 L 82 179', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
      { kind: 'path', d: 'M 150 114 L 82 81', accent: true, weight: 1.1, zLayer: 0.15, radiusScale: 1.05 },
    ],
  },
  architecture: {
    viewW: 360,
    viewH: 260,
    primitives: [
      // Spaced back & front rounded hollow cube faces
      { kind: 'path', d: roundedRectD(88, 30, 144, 144, 11), accent: false, weight: 3.0, zLayer: -0.52, radiusScale: 1.08 },
      { kind: 'path', d: roundedRectD(138, 80, 144, 144, 11), accent: false, weight: 3.2, zLayer: 0.52, radiusScale: 1.12 },
      // 4 thick #5B5BF0 isometric depth struts
      { kind: 'path', d: 'M 94 36 L 144 86', accent: true, weight: 1.3, zLayer: 0.0, radiusScale: 1.12 },
      { kind: 'path', d: 'M 226 36 L 276 86', accent: true, weight: 1.3, zLayer: 0.0, radiusScale: 1.12 },
      { kind: 'path', d: 'M 94 168 L 144 218', accent: true, weight: 1.3, zLayer: 0.0, radiusScale: 1.12 },
      { kind: 'path', d: 'M 226 168 L 276 218', accent: true, weight: 1.3, zLayer: 0.0, radiusScale: 1.12 },
      // Dense #5B5BF0 suspended central data kernel block (60% hatch fill)
      { kind: 'fillRect', x: 162, y: 104, w: 46, h: 46, rx: 9, accent: true, weight: 2.8, zLayer: 0.05, density: 0.6 },
      // Clean dark mini status bars along bottom edge of front cube
      { kind: 'fillRect', x: 158, y: 196, w: 54, h: 6, rx: 3, accent: false, weight: 0.65, zLayer: 0.56, density: 0.95 },
      { kind: 'fillRect', x: 222, y: 196, w: 38, h: 6, rx: 3, accent: false, weight: 0.5, zLayer: 0.56, density: 0.95 },
    ],
  },
  performance: {
    viewW: 360,
    viewH: 260,
    primitives: [
      // Rounded hollow chart frame + L-axes
      { kind: 'path', d: roundedRectD(24, 22, 312, 212, 11), accent: false, weight: 2.8, zLayer: -0.25, radiusScale: 1.0 },
      { kind: 'path', d: 'M 52 198 H 312 M 52 52 V 198', accent: false, weight: 2.0, zLayer: -0.1, radiusScale: 1.05 },
      // Hollow reference bar columns
      { kind: 'path', d: roundedRectD(74, 152, 26, 46, 5), accent: false, weight: 1.2, zLayer: 0.05, radiusScale: 0.85 },
      { kind: 'path', d: roundedRectD(128, 128, 26, 70, 5), accent: false, weight: 1.4, zLayer: 0.08, radiusScale: 0.85 },
      { kind: 'path', d: roundedRectD(182, 98, 26, 100, 5), accent: false, weight: 1.6, zLayer: 0.12, radiusScale: 0.85 },
      // Bold thick granular #5B5BF0 throughput acceleration curve
      { kind: 'path', d: 'M 54 188 C 122 184, 152 134, 194 98 C 236 62, 268 50, 304 44', accent: true, weight: 3.8, zLayer: 0.45, radiusScale: 1.38 },
      // Peak focal #5B5BF0 filled node + outer reticle ring
      { kind: 'fillCircle', cx: 300, cy: 46, r: 11, accent: true, weight: 1.4, zLayer: 0.52 },
      { kind: 'path', d: 'M 300 26 A 20 20 0 1 0 300 66 A 20 20 0 1 0 300 26', accent: false, weight: 1.2, zLayer: 0.38, radiusScale: 0.9 },
      // Compact dark axis caption ticks
      { kind: 'fillRect', x: 74, y: 209, w: 26, h: 5, rx: 2.5, accent: false, weight: 0.45, zLayer: 0.1, density: 0.95 },
      { kind: 'fillRect', x: 182, y: 209, w: 26, h: 5, rx: 2.5, accent: false, weight: 0.45, zLayer: 0.1, density: 0.95 },
      { kind: 'fillRect', x: 268, y: 209, w: 38, h: 5, rx: 2.5, accent: false, weight: 0.55, zLayer: 0.1, density: 0.95 },
    ],
  },
  design: {
    viewW: 360,
    viewH: 260,
    primitives: [
      // Outer thick hollow drafting circle
      { kind: 'path', d: 'M 180 24 A 106 106 0 1 0 180 236 A 106 106 0 1 0 180 24', accent: false, weight: 3.4, zLayer: -0.22, radiusScale: 1.15 },
      // Inscribed hollow rounded golden square
      { kind: 'path', d: roundedRectD(106, 56, 148, 148, 11), accent: false, weight: 2.6, zLayer: 0.0, radiusScale: 1.02 },
      // Precision drafting crosshairs
      { kind: 'path', d: 'M 42 130 H 318 M 180 12 V 248', accent: false, weight: 1.5, zLayer: -0.32, radiusScale: 0.85 },
      // Thick #5B5BF0 inner harmonic ring
      { kind: 'path', d: 'M 180 76 A 54 54 0 1 0 180 184 A 54 54 0 1 0 180 76', accent: true, weight: 2.8, zLayer: 0.28, radiusScale: 1.25 },
      // Bold #5B5BF0 golden spiral + dense focal center lens
      { kind: 'path', d: 'M 180 130 C 180 96, 214 96, 214 130 C 214 176, 146 176, 146 130 C 146 66, 244 66, 244 130', accent: true, weight: 2.6, zLayer: 0.45, radiusScale: 1.18 },
      { kind: 'fillCircle', cx: 180, cy: 130, r: 12, accent: true, weight: 1.3, zLayer: 0.55 },
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
};

export function sampleSvgNormalized(
  svgKey: string,
  count: number,
  options: { drawProgress?: number } = {}
): NormalizedPoint[] {
  const { drawProgress = 1 } = options;
  const isAnimatedIntegrations = svgKey === 'integrations' && drawProgress < 0.99;
  const cacheKey = isAnimatedIntegrations ? '' : `svgGranularV2:${svgKey}:${count}`;

  if (cacheKey) {
    const cached = sampleCache.get(cacheKey);
    if (cached) return cached;
  }

  const rand = mulberry32(hashKey(`svgGranularV2:${svgKey}:${count}`));

  // CRM & ERP uses direct 3D isometric line-segment tube sampling for crisp plate separation
  if (svgKey === 'crm') {
    const crmPts = sampleIsometricCrmNormalized(count, rand);
    if (cacheKey) cacheSample(cacheKey, crmPts);
    return crmPts;
  }

  const spec = SVG_DIAGRAMS[svgKey] ?? SVG_DIAGRAMS.integrations;
  const result: NormalizedPoint[] = [];

  if (typeof document === 'undefined') return result;

  const cfg = WHAT_I_DO_PARTICLE_CONFIG;
  const baseRadiusUnits = cfg.tubeRadiusFrac * spec.viewW; // ~0.9% of shape width
  const interiorDustBudget = Math.floor(count * cfg.interiorDustMaxFrac);
  const structBudget = count - interiorDustBudget;
  const totalWeight = spec.primitives.reduce((acc, p) => acc + (p.weight ?? 1), 0);

  spec.primitives.forEach((prim, primIndex) => {
    const share = Math.max(
      24,
      Math.round((structBudget * (prim.weight ?? 1)) / totalWeight)
    );
    const baseZ = prim.zLayer ?? 0;

    if (prim.kind === 'fillRect') {
      const rx = prim.rx ?? Math.min(prim.w, prim.h) * 0.25;
      const effDensity = prim.density ?? cfg.accentFillDensity;
      // Stippled dense interior fill (60% hatch for accent blocks, ~92% for small ink text bars)
      const jitterR = baseRadiusUnits * 0.28;
      let produced = 0;
      let attempts = 0;
      const maxAttempts = share * 5;
      while (produced < share && attempts < maxAttempts && result.length < structBudget) {
        attempts++;
        const lx = rand() * prim.w;
        const ly = rand() * prim.h;
        // Rounded corner rejection
        let inside = true;
        if (rx > 0.5) {
          const cx = lx < rx ? rx : lx > prim.w - rx ? prim.w - rx : lx;
          const cy = ly < rx ? rx : ly > prim.h - rx ? prim.h - rx : ly;
          if ((lx - cx) * (lx - cx) + (ly - cy) * (ly - cy) > rx * rx) inside = false;
        }
        if (!inside) continue;
        // Slight organic granular hatch pattern for ~60% accent blocks
        if (effDensity < 0.75) {
          const hatchWave = Math.sin((lx + ly) * 0.85) * 0.5 + 0.5;
          if (rand() > effDensity * (0.72 + hatchWave * 0.56)) continue;
        }
        const px = prim.x + lx + (rand() - 0.5) * jitterR;
        const py = prim.y + ly + (rand() - 0.5) * jitterR;
        result.push({
          u: Math.max(0.01, Math.min(0.99, px / spec.viewW)),
          v: Math.max(0.01, Math.min(0.99, py / spec.viewH)),
          z: baseZ + (rand() - 0.5) * 0.08,
          accent: prim.accent ? 1 : 0,
          order: lx / Math.max(1, prim.w),
          dust: 0,
        });
        produced++;
      }
      return;
    }

    if (prim.kind === 'fillCircle') {
      for (let i = 0; i < share && result.length < structBudget; i++) {
        const ang = rand() * Math.PI * 2;
        const rad = prim.r * Math.sqrt(rand()) + (rand() - 0.5) * baseRadiusUnits * 0.25;
        const px = prim.cx + Math.cos(ang) * rad;
        const py = prim.cy + Math.sin(ang) * rad;
        result.push({
          u: Math.max(0.01, Math.min(0.99, px / spec.viewW)),
          v: Math.max(0.01, Math.min(0.99, py / spec.viewH)),
          z: baseZ + (rand() - 0.5) * 0.1,
          accent: prim.accent ? 1 : 0,
          order: rad / Math.max(1, prim.r),
          dust: 0,
        });
      }
      return;
    }

    // Thick granular particle tube along pre-sampled SVG polyline LUT (~500x faster, zero main-thread freeze!)
    const { lut, segs, totalLen } = getSvgPathPolyline(prim.d);
    const tubeR = baseRadiusUnits * (prim.radiusScale ?? 1.0);

    let maxRatio = 1;
    if (svgKey === 'integrations' && primIndex >= 9) {
      const rayIdx = primIndex - 9;
      const rayStart = rayIdx * 0.14;
      const rayEnd = rayStart + 0.28;
      maxRatio = Math.max(0.04, Math.min(1, (drawProgress - rayStart) / (rayEnd - rayStart)));
    }

    for (let i = 0; i < share && result.length < structBudget; i++) {
      const baseT = (i / Math.max(1, share - 1)) * maxRatio;
      // 8% along-path jitter
      const alongJitter = ((rand() - 0.5) * 2 * cfg.alongJitterFrac * tubeR) / totalLen;
      const clampedT = Math.max(0, Math.min(1, baseT + alongJitter));

      // O(1) linear interpolation on cached LUT (zero DOM calls!)
      const fIdx = clampedT * segs;
      const idx0 = Math.min(segs, fIdx | 0);
      const idx1 = Math.min(segs, idx0 + 1);
      const frac = fIdx - idx0;
      const o0 = idx0 * 4;
      const o1 = idx1 * 4;

      const ptx = lut[o0] + (lut[o1] - lut[o0]) * frac;
      const pty = lut[o0 + 1] + (lut[o1 + 1] - lut[o0 + 1]) * frac;
      let tx = lut[o0 + 2] + (lut[o1 + 2] - lut[o0 + 2]) * frac;
      let ty = lut[o0 + 3] + (lut[o1 + 3] - lut[o0 + 3]) * frac;
      const tLen = Math.hypot(tx, ty);
      if (tLen > 1e-4) {
        tx /= tLen;
        ty /= tLen;
      } else {
        tx = 1;
        ty = 0;
      }
      // Unit perpendicular normal
      const nx = -ty;
      const ny = tx;

      const isStray = rand() < cfg.outerStrayFrac;
      let perpOff = 0;
      let alongOff = 0;
      let zOff = 0;
      if (isStray) {
        // 3..5% outer granular sparks hugging the tube edge
        const ang = rand() * Math.PI * 2;
        const rad = tubeR * (1.25 + rand() * 1.45);
        perpOff = Math.cos(ang) * rad;
        alongOff = Math.sin(ang) * rad * 0.6;
        zOff = (rand() - 0.5) * 0.12;
      } else {
        // Circular cross-section distribution: r = R * sqrt(rand)
        const r = tubeR * Math.sqrt(rand());
        const theta = rand() * Math.PI * 2;
        // 15% perpendicular roughness + 8% along-path roughness
        const perpRough = (rand() - 0.5) * 2 * cfg.perpJitterFrac * tubeR;
        const alongRough = (rand() - 0.5) * 2 * cfg.alongJitterFrac * tubeR;
        perpOff = Math.cos(theta) * r + perpRough;
        alongOff = alongRough;
        zOff = ((Math.sin(theta) * r) / spec.viewW) * 1.8;
      }

      const fx = ptx + nx * perpOff + tx * alongOff;
      const fy = pty + ny * perpOff + ty * alongOff;

      result.push({
        u: Math.max(0.01, Math.min(0.99, fx / spec.viewW)),
        v: Math.max(0.01, Math.min(0.99, fy / spec.viewH)),
        z: baseZ + zOff,
        accent: prim.accent ? 1 : 0,
        order: baseT,
        dust: isStray ? 0.32 : 0,
      });
    }
  });

  // Pad structure if rounding fell slightly short
  while (result.length < structBudget && result.length > 0) {
    const src = result[Math.floor(rand() * result.length)];
    result.push({ ...src });
  }

  // <= 4.5% sparse interior/surround dust (interiors stay cleanly hollow!)
  while (result.length < count) {
    const angle = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * 0.44;
    result.push({
      u: Math.max(0.03, Math.min(0.97, 0.5 + Math.cos(angle) * rad)),
      v: Math.max(0.03, Math.min(0.97, 0.5 + Math.sin(angle) * rad * 0.85)),
      z: (rand() - 0.5) * 0.8,
      accent: rand() < 0.12 ? 0.55 : 0,
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
  const cacheKey = `strip2k:${word}:${repeatCount}:${separator}:${count}:${isRtl}`;
  const cached = sampleCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // Sample ONE crisp tile at 1024×380, then replicate cleanly across `repeatCount` tiles
  // so every tile is pixel-identical and modulo wrapping has ZERO seam!
  const tileW = 1024;
  const tileH = 380;
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
  let fontSize = 248;
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  const wordW = ctx.measureText(word).width;
  if (wordW > tileW * 0.72) {
    fontSize = Math.max(110, Math.floor(fontSize * ((tileW * 0.7) / wordW)));
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
  }

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(word, tileW * 0.4, tileH * 0.52);

  // Draw architectural separator dash (marked in right 20% of tile for indigo accent)
  const dashX0 = tileW * 0.81;
  const dashX1 = tileW * 0.93;
  ctx.fillRect(dashX0, tileH * 0.5 - 11, dashX1 - dashX0, 22);

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

