import {
  createSeededRandom,
  fillAmbientDust,
  loadImageElement,
  type ShapeBuffer,
} from './types';

/**
 * Shape 2 — UI Plane
 * Perspective-tilted dashboard / browser window constructed from particles:
 * - Samples luminance from a real project image inside the viewport frame
 * - Crisp bento cards, top browser bar, and glowing indigo (#5B5BF0) top & bottom rails
 */
export async function generateUiPlaneShape(
  count: number,
  screenshotSrc: string
): Promise<ShapeBuffer> {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(3101);

  const W = 4.5;
  const H = 2.85;
  const rotY = -0.34;
  const rotX = 0.14;
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);

  const placeTilted = (idx: number, lx: number, ly: number, lz: number, acc: number) => {
    // Rotate X then Y
    const y1 = ly * cosX - lz * sinX;
    const z1 = ly * sinX + lz * cosX;
    const x2 = lx * cosY + z1 * sinY;
    const z2 = -lx * sinY + z1 * cosY;

    const i3 = idx * 3;
    positions[i3] = x2;
    positions[i3 + 1] = y1;
    positions[i3 + 2] = z2;
    accents[idx] = acc;
  };

  let cursor = 0;

  // 1. Top & Bottom luminous indigo rails (12%)
  const railCount = Math.floor(count * 0.12);
  for (let i = 0; i < railCount; i++) {
    const isTop = i % 2 === 0;
    const u = rnd() - 0.5;
    const lx = u * W;
    const ly = (isTop ? H * 0.5 : -H * 0.5) + (rnd() - 0.5) * 0.045;
    const lz = (rnd() - 0.5) * 0.04;
    placeTilted(cursor++, lx, ly, lz, 0.88 + rnd() * 0.12);
  }

  // 2. Side borders + internal bento dashboard card wireframes (24%)
  const frameCount = Math.floor(count * 0.24);
  const rects: Array<[number, number, number, number, boolean]> = [
    // [cx, cy, rw, rh, isAccent]
    [0, 0, W, H, false],
    [-1.4, 0.35, 1.35, 1.45, false],
    [0.55, 0.58, 2.35, 0.98, true],
    [0.55, -0.52, 2.35, 1.0, false],
    [-1.4, -0.78, 1.35, 0.65, true],
  ];

  for (let i = 0; i < frameCount; i++) {
    const r = rects[Math.floor(rnd() * rects.length)];
    const [cx, cy, rw, rh, isAcc] = r;
    const edge = Math.floor(rnd() * 4);
    const t = rnd() - 0.5;
    let lx = cx;
    let ly = cy;
    if (edge === 0) {
      lx = cx + t * rw;
      ly = cy + rh * 0.5;
    } else if (edge === 1) {
      lx = cx + t * rw;
      ly = cy - rh * 0.5;
    } else if (edge === 2) {
      lx = cx - rw * 0.5;
      ly = cy + t * rh;
    } else {
      lx = cx + rw * 0.5;
      ly = cy + t * rh;
    }
    const lz = (isAcc ? 0.08 : 0.02) + (rnd() - 0.5) * 0.025;
    placeTilted(cursor++, lx, ly, lz, isAcc && rnd() < 0.55 ? 0.82 : 0.28 + rnd() * 0.18);
  }

  // 3. Real project screenshot luminance sampling inside the UI canvas (50%)
  const surfaceTarget = Math.floor(count * 0.5);
  const img = await loadImageElement(screenshotSrc);
  const sampledPoints: Array<[number, number, number]> = [];

  if (img && typeof document !== 'undefined') {
    const sw = 180;
    const sh = 114;
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, sw, sh);
      try {
        const data = ctx.getImageData(0, 0, sw, sh).data;
        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const idx = (y * sw + x) * 4;
            const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
            if (lum > 0.14) {
              sampledPoints.push([x / sw - 0.5, 0.5 - y / sh, lum]);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  for (let i = 0; i < surfaceTarget; i++) {
    if (sampledPoints.length > 0) {
      const pt = sampledPoints[Math.floor(rnd() * sampledPoints.length)];
      const lx = pt[0] * (W * 0.94) + (rnd() - 0.5) * 0.025;
      const ly = pt[1] * (H * 0.9) + (rnd() - 0.5) * 0.025;
      const lz = pt[2] * 0.18 - 0.04;
      const isHighlight = pt[2] > 0.72 && rnd() < 0.22;
      placeTilted(cursor++, lx, ly, lz, isHighlight ? 0.78 : 0.1 + pt[2] * 0.35);
    } else {
      const lx = (rnd() - 0.5) * W * 0.92;
      const ly = (rnd() - 0.5) * H * 0.88;
      placeTilted(cursor++, lx, ly, (rnd() - 0.5) * 0.05, 0.22);
    }
  }

  fillAmbientDust(positions, accents, cursor, count, 3102);
  return { positions, accents };
}
