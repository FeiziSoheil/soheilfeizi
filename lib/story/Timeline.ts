import { STORY_CHAPTERS, type StoryChapterConfig, type StoryLabel3D } from './story.config';

export interface StoryTimelineFrame {
  totalProgress: number;
  fromIndex: number;
  toIndex: number;
  morphProgress: number;
  activeChapterIndex: number;
  chapterProgress: number;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  cameraFov: number;
  cameraRoll: number;
  /** Live progress [0..1] strictly within the Tunnel chapter (for near-lens speed flare) */
  tunnelProgress: number;
  /** Live progress [0..1] strictly within the Portrait chapter (for top-to-bottom scan) */
  portraitScan: number;
  /** Live progress [0..1] strictly within the Word chapter (for evaporation dissolve) */
  wordDissolve: number;
  /** Live progress [0..1] strictly within the Arc Orbit chapter (for moving indigo arc) */
  arcPulse: number;
  /** Active chapter 3D labels with highlight intensity */
  activeLabels: Array<StoryLabel3D & { opacity: number; highlighted: boolean }>;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Computes weighted chapter boundaries from each chapter's `heightVh`
 * so the Timeline stays 100% aligned with the DOM scroll tracks.
 */
export function buildChapterSegments(chapters: StoryChapterConfig[] = STORY_CHAPTERS) {
  const weights = chapters.map((c) => c.heightVh ?? 125);
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  const segments: Array<{ start: number; end: number; span: number }> = [];
  let cursor = 0;
  for (let i = 0; i < chapters.length; i++) {
    const span = weights[i] / totalWeight;
    segments.push({ start: cursor, end: cursor + span, span });
    cursor += span;
  }
  return segments;
}

const DEFAULT_SEGMENTS = buildChapterSegments(STORY_CHAPTERS);

/**
 * Pure Timeline evaluator mapping continuous scroll progress (0..1) + scrollSpeedNorm (0..1)
 * to particle morph uniforms (`fromIndex`, `toIndex`, `morphProgress`), camera choreography,
 * dynamic FOV speed stretch, and 3D label visibility.
 *
 * Each chapter follows a cinematic 3-beat rhythm:
 *  - 0.00 -> 0.22 : Arrive & hold settled sculpture (morphProgress = 0)
 *  - 0.22 -> 0.68 : Hold & gentle camera parallax / chapter-specific motion
 *  - 0.68 -> 1.00 : Morph smoothly into next chapter's shape (morphProgress 0 -> 1)
 */
export function evaluateStoryTimeline(
  rawTotalProgress: number,
  scrollSpeedNorm: number,
  chapters: StoryChapterConfig[] = STORY_CHAPTERS
): StoryTimelineFrame {
  const totalProgress = clamp01(rawTotalProgress);
  const segments = chapters === STORY_CHAPTERS ? DEFAULT_SEGMENTS : buildChapterSegments(chapters);
  const count = chapters.length;

  let activeIdx = count - 1;
  let localP = 1;

  for (let i = 0; i < count; i++) {
    const seg = segments[i];
    if (totalProgress <= seg.end || i === count - 1) {
      activeIdx = i;
      localP = clamp01((totalProgress - seg.start) / Math.max(1e-5, seg.span));
      break;
    }
  }

  const curr = chapters[activeIdx];
  const next = chapters[Math.min(count - 1, activeIdx + 1)];
  const isLast = activeIdx >= count - 1;

  // Morph begins in the final 32% of each chapter (except the final CTA chapter)
  const MORPH_START = 0.68;
  const fromIndex = activeIdx;
  const toIndex = isLast ? activeIdx : activeIdx + 1;
  const morphProgress = isLast ? 0 : smoothstep(MORPH_START, 1.0, localP);

  // Camera glides smoothly from curr.cameraStart -> curr.cameraEnd,
  // then blends seamlessly into next.cameraStart during the morph window!
  const inChapterCamP = smoothstep(0.0, MORPH_START, localP);
  const currPos = lerp3(curr.cameraStart.position, curr.cameraEnd.position, inChapterCamP);
  const currLook = lerp3(curr.cameraStart.lookAt, curr.cameraEnd.lookAt, inChapterCamP);
  const currFov = lerp(curr.cameraStart.fov, curr.cameraEnd.fov, inChapterCamP);
  const currRoll = lerp(curr.cameraStart.roll ?? 0, curr.cameraEnd.roll ?? 0, inChapterCamP);

  const cameraPosition = isLast
    ? currPos
    : lerp3(currPos, next.cameraStart.position, morphProgress);
  const cameraLookAt = isLast
    ? currLook
    : lerp3(currLook, next.cameraStart.lookAt, morphProgress);
  const baseFov = isLast ? currFov : lerp(currFov, next.cameraStart.fov, morphProgress);
  const cameraRoll = isLast
    ? currRoll
    : lerp(currRoll, next.cameraStart.roll ?? 0, morphProgress);

  // Extra kinetic FOV boost inside the Tunnel chapter (index 4) on fast scroll
  const isTunnel = curr.shape === 'tunnel' || (next.shape === 'tunnel' && morphProgress > 0.3);
  const fovSpeedBoost = (isTunnel ? 10.5 : 3.0) * clamp01(scrollSpeedNorm);
  const cameraFov = baseFov + fovSpeedBoost;

  // Chapter-specific GPU shader drivers
  const tunnelProgress = curr.shape === 'tunnel' ? localP : 0;
  const portraitScan =
    curr.shape === 'portrait'
      ? smoothstep(0.0, 0.55, localP)
      : next.shape === 'portrait'
        ? morphProgress * 0.35
        : 1;
  const wordDissolve = curr.shape === 'word' ? smoothstep(0.55, 0.98, localP) : 0;
  const arcPulse = curr.shape === 'arcOrbit' ? localP : 0;

  // Active 3D projected labels fade in smoothly after entry and fade out before morph
  const labelWindowOpacity =
    smoothstep(0.06, 0.18, localP) * (isLast ? 1 : 1 - smoothstep(0.7, 0.86, localP));

  const activeLabels = (curr.labels ?? []).map((lbl) => {
    const [hMin, hMax] = lbl.highlightRange ?? [0, 1];
    const highlighted = localP >= hMin && localP <= hMax;
    return {
      ...lbl,
      opacity: labelWindowOpacity,
      highlighted,
    };
  });

  return {
    totalProgress,
    fromIndex,
    toIndex,
    morphProgress,
    activeChapterIndex: activeIdx,
    chapterProgress: localP,
    cameraPosition,
    cameraLookAt,
    cameraFov,
    cameraRoll,
    tunnelProgress,
    portraitScan,
    wordDissolve,
    arcPulse,
    activeLabels,
  };
}
