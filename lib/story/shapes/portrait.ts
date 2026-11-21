import {
  createSeededRandom,
  fillAmbientDust,
  loadImageElement,
  type ShapeBuffer,
} from './types';

/**
 * Shape 9 — Portrait Point Cloud
 * Loads the local studio portrait image onto an offscreen canvas, performs
 * luminance-weighted importance sampling (bright skin/key-light contours receive
 * denser particles and elevated +Z depth relief), and softens outer silhouette
 * edges into drifting mist.
 */
export async function generatePortraitShape(
  count: number,
  portraitSrc: string
): Promise<ShapeBuffer> {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(9101);

  const img = await loadImageElement(portraitSrc);

  if (typeof document === 'undefined' || !img) {
    // Graceful procedural bust fallback if image fails to load
    const usable = Math.floor(count * 0.8);
    let cursor = 0;
    for (let i = 0; i < usable; i++) {
      const a = rnd() * Math.PI * 2;
      const b = Math.acos(2 * rnd() - 1);
      const isHead = i < usable * 0.55;
      const rx = isHead ? 0.92 : 1.7;
      const ry = isHead ? 1.18 : 0.95;
      const cy = isHead ? 0.55 : -1.25;
      const i3 = cursor * 3;
      positions[i3] = Math.sin(b) * Math.cos(a) * rx;
      positions[i3 + 1] = cy + Math.cos(b) * ry;
      positions[i3 + 2] = Math.sin(b) * Math.sin(a) * 0.65;
      accents[cursor] = rnd() < 0.18 ? 0.78 : 0.24 + rnd() * 0.24;
      cursor++;
    }
    fillAmbientDust(positions, accents, cursor, count, 9102);
    return { positions, accents };
  }

  const sampleW = 240;
  const sampleH = 300;
  const canvas = document.createElement('canvas');
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    fillAmbientDust(positions, accents, 0, count, 9102);
    return { positions, accents };
  }

  // Center-crop cover draw to match 4:5 portrait framing
  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const canvasAspect = sampleW / sampleH;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgAspect > canvasAspect) {
    sw = img.naturalHeight * canvasAspect;
    sx = (img.naturalWidth - sw) * 0.5;
  } else {
    sh = img.naturalWidth / canvasAspect;
    sy = (img.naturalHeight - sh) * 0.2; // Bias slightly upward to keep head & eyes framed
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

  // Build weighted pixel candidates using luminance + oval vignette mask
  const candidates: Array<{ x: number; y: number; lum: number; rim: number }> = [];
  let totalWeight = 0;

  for (let y = 0; y < sampleH; y++) {
    const ny = (y / (sampleH - 1)) * 2 - 1; // -1 top .. +1 bottom
    for (let x = 0; x < sampleW; x++) {
      const nx = (x / (sampleW - 1)) * 2 - 1;
      const idx = (y * sampleW + x) * 4;
      const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;

      // Soft elliptical portrait vignette fading into misty dark edges
      const radial = Math.sqrt(nx * nx * 1.15 + ny * ny * 0.92);
      const mask = Math.max(0, 1 - Math.pow(Math.max(0, (radial - 0.56) / 0.44), 1.8));
      if (mask <= 0.04) continue;

      // Contrast boost for studio chiaroscuro depth
      const boosted = Math.pow(Math.max(0, (lum - 0.08) / 0.92), 1.18);
      if (boosted < 0.06) continue;

      // Edge-gradient rim highlight detection for crisp eyes/nose/jaw contour
      const idxRight = (y * sampleW + Math.min(sampleW - 1, x + 2)) * 4;
      const lumRight =
        (0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2]) / 255;
      const rim = Math.min(1, Math.abs(lum - lumRight) * 3.4);

      const weight = (boosted * 0.8 + rim * 0.55) * mask;
      if (weight > 0.05) {
        candidates.push({ x, y, lum: boosted, rim });
        totalWeight += weight;
      }
    }
  }

  if (candidates.length === 0) {
    fillAmbientDust(positions, accents, 0, count, 9102);
    return { positions, accents };
  }

  // Prefix-sum CDF for O(log M) exact luminance-weighted sampling
  const cdf = new Float32Array(candidates.length);
  let acc = 0;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const nx = (c.x / (sampleW - 1)) * 2 - 1;
    const ny = (c.y / (sampleH - 1)) * 2 - 1;
    const radial = Math.sqrt(nx * nx * 1.15 + ny * ny * 0.92);
    const mask = Math.max(0, 1 - Math.pow(Math.max(0, (radial - 0.56) / 0.44), 1.8));
    acc += (c.lum * 0.8 + c.rim * 0.55) * mask;
    cdf[i] = acc / Math.max(1e-5, totalWeight);
  }

  const sampleCandidate = () => {
    const u = rnd();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return candidates[lo];
  };

  const portraitCount = Math.floor(count * 0.88);
  const worldW = 3.55;
  const worldH = 4.4;
  let cursor = 0;

  for (let i = 0; i < portraitCount; i++) {
    const c = sampleCandidate();
    const nx = c.x / (sampleW - 1) - 0.5;
    const ny = 0.5 - c.y / (sampleH - 1);

    const radial = Math.sqrt(nx * nx * 4.4 + ny * ny * 3.6);
    const edgeMist = radial > 0.72 ? (radial - 0.72) * 0.55 : 0;

    // 3D bas-relief depth: brighter facial planes protrude gently toward camera
    const zRelief = (c.lum - 0.35) * 0.72 + c.rim * 0.18 + (rnd() - 0.5) * (0.04 + edgeMist * 0.6);

    const i3 = cursor * 3;
    positions[i3] = nx * worldW + (rnd() - 0.5) * (0.018 + edgeMist * 0.35);
    positions[i3 + 1] = ny * worldH + (rnd() - 0.5) * (0.018 + edgeMist * 0.35);
    positions[i3 + 2] = zRelief;

    // Crisp silver/white skin tones with subtle electric indigo rim-light accents
    if (c.rim > 0.48 && nx > 0.05 && rnd() < 0.42) {
      accents[cursor] = 0.76 + rnd() * 0.22;
    } else {
      accents[cursor] = Math.min(0.49, 0.12 + c.lum * 0.36);
    }
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 9102);
  return { positions, accents };
}
