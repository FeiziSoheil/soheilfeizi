/**
 * Uniform SVG Path Sampler using browser native SVGPathElement.getPointAtLength
 * for razor-sharp, evenly spaced particle lines (UI wireframes, arcs, orbits, app tiles).
 */

export interface SvgStrokeSpec {
  /** Standard SVG path `d` string in the viewBox coordinate system */
  d: string;
  /** Relative sampling weight multiplier (default 1.0) */
  weight?: number;
  /** Accent intensity 0..1 (#5B5BF0 indigo highlight) */
  accent?: number;
  /** Optional Z-depth offset in world units */
  z?: number;
}

export interface SampledSvgPoint {
  x: number;
  y: number;
  z: number;
  accent: number;
  /** Normalized progress along its stroke 0..1 */
  t: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Sample `totalPoints` uniformly across a list of SVG paths using `getPointAtLength`,
 * mapped from `[0..viewW, 0..viewH]` into centered 3D world space `[-worldW/2..worldW/2, -worldH/2..worldH/2]`.
 */
export function sampleSvgPaths(
  specs: SvgStrokeSpec[],
  totalPoints: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
  rand: () => number,
  jitterWorld = 0.005
): SampledSvgPoint[] {
  const out: SampledSvgPoint[] = [];
  if (totalPoints <= 0 || specs.length === 0) return out;

  if (typeof document === 'undefined') {
    return out;
  }

  const measured: Array<{
    el: SVGPathElement;
    len: number;
    weightedLen: number;
    accent: number;
    z: number;
  }> = [];

  let totalWeighted = 0;
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', spec.d);
    const len = el.getTotalLength();
    if (!Number.isFinite(len) || len <= 0.0001) continue;
    const weightedLen = len * (spec.weight ?? 1.0);
    totalWeighted += weightedLen;
    measured.push({
      el,
      len,
      weightedLen,
      accent: spec.accent ?? 0,
      z: spec.z ?? 0,
    });
  }

  if (totalWeighted <= 0 || measured.length === 0) return out;

  let allocated = 0;
  for (let s = 0; s < measured.length; s++) {
    const item = measured[s];
    const countForStroke =
      s === measured.length - 1
        ? Math.max(0, totalPoints - allocated)
        : Math.max(1, Math.round((item.weightedLen / totalWeighted) * totalPoints));
    allocated += countForStroke;

    for (let k = 0; k < countForStroke; k++) {
      // Uniform spacing along exact arc length + tiny sub-pixel jitter so lines stay countable
      const u = (k + 0.5 + (rand() - 0.5) * 0.45) / Math.max(1, countForStroke);
      const t = Math.max(0, Math.min(1, u));
      const pt = item.el.getPointAtLength(t * item.len);

      const wx = (pt.x / viewW - 0.5) * worldW + (rand() - 0.5) * jitterWorld;
      const wy = (0.5 - pt.y / viewH) * worldH + (rand() - 0.5) * jitterWorld;
      const wz = item.z + (rand() - 0.5) * (jitterWorld * 0.6);

      out.push({
        x: wx,
        y: wy,
        z: wz,
        accent: item.accent,
        t,
      });
    }
  }

  return out;
}

/** Helper to generate a clean SVG rounded-rectangle path string */
export function svgRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
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

/** Helper to generate a clean SVG circle/ellipse path string */
export function svgEllipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number
): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}
