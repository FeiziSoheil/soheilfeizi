import type { Locale } from '@/lib/content';
import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 8 — Typography Word ("invisible." / "نامرئی.")
 * Renders crisp high-resolution bold typography onto an offscreen 2D canvas,
 * extracts pixel alpha/luminance coordinates, and maps them into 3D particle space
 * with evaporating misty edge drift and an indigo terminal dot.
 */
export function generateWordShape(count: number, locale: Locale): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(8101);

  if (typeof document === 'undefined') {
    fillAmbientDust(positions, accents, 0, count, 8102);
    return { positions, accents };
  }

  const width = 1024;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    fillAmbientDust(positions, accents, 0, count, 8102);
    return { positions, accents };
  }

  const word = locale === 'fa' ? 'نامرئی.' : 'invisible.';
  const fontFamily =
    locale === 'fa'
      ? 'Vazirmatn, system-ui, sans-serif'
      : '"Inter Tight", system-ui, -apple-system, sans-serif';

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = locale === 'fa' ? `800 185px ${fontFamily}` : `800 198px ${fontFamily}`;
  ctx.fillText(word, width / 2, height / 2 + 8);

  const imgData = ctx.getImageData(0, 0, width, height).data;
  const litPixels: Array<{ x: number; y: number; edge: boolean }> = [];

  // Sample every 2 pixels for fast high-density capture
  const step = 2;
  for (let y = 2; y < height - 2; y += step) {
    for (let x = 2; x < width - 2; x += step) {
      const a = imgData[(y * width + x) * 4 + 3];
      if (a > 72) {
        // Detect edge pixels by inspecting neighboring alpha
        const aRight = imgData[(y * width + Math.min(width - 1, x + 4)) * 4 + 3];
        const aTop = imgData[(Math.max(0, y - 4) * width + x) * 4 + 3];
        const isEdge = a < 210 || aRight < 100 || aTop < 100;
        litPixels.push({ x, y, edge: isEdge });
      }
    }
  }

  if (litPixels.length === 0) {
    fillAmbientDust(positions, accents, 0, count, 8102);
    return { positions, accents };
  }

  const targetCount = Math.floor(count * 0.86);
  const worldWidth = 6.2;
  const worldHeight = (height / width) * worldWidth;
  let cursor = 0;

  for (let i = 0; i < targetCount; i++) {
    const p = litPixels[Math.floor(rnd() * litPixels.length)];
    const nx = p.x / width - 0.5;
    const ny = 0.5 - p.y / height;

    // Gentle upward/rightward evaporating mist on edge particles
    const mistDrift = p.edge && rnd() < 0.34 ? Math.pow(rnd(), 1.4) * 0.48 : 0;
    const mistAngle = -0.35 + rnd() * 1.1;

    const wx = nx * worldWidth + Math.cos(mistAngle) * mistDrift + (rnd() - 0.5) * 0.025;
    const wy = ny * worldHeight + Math.sin(mistAngle) * mistDrift + (rnd() - 0.5) * 0.025;
    const wz = (rnd() - 0.5) * (0.09 + mistDrift * 0.55);

    const i3 = cursor * 3;
    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;

    // Highlight the period dot (far right in EN, far left in FA) in luminous indigo (#5B5BF0)
    const isPeriodDot =
      locale === 'fa' ? nx < -0.25 && ny < -0.08 : nx > 0.36 && ny < -0.05;

    if (isPeriodDot) {
      accents[cursor] = 0.88 + rnd() * 0.12;
    } else if (mistDrift > 0.12) {
      accents[cursor] = rnd() < 0.35 ? 0.72 : 0.14 + rnd() * 0.12;
    } else {
      accents[cursor] = 0.28 + rnd() * 0.2;
    }
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 8102);
  return { positions, accents };
}
