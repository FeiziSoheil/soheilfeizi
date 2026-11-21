import {
  STORY_PHASES,
  STORY_TUNNEL_CONFIG,
  type StoryChapterConfig,
} from './story.config';

export type StoryPhase = 'enter' | 'hold' | 'travel' | 'exit';

export interface ResolvedScrollPosition {
  /** Single source of truth chapter index (0..N-1) */
  index: number;
  /** Local normalized progress inside the active chapter (0..1) */
  local: number;
  /** Overall normalized progress across the entire Story (0..1) */
  totalProgress: number;
}

export interface TimelineFrame {
  /** Normalized total scroll progress 0..1 */
  totalProgress: number;
  /** Single source of truth active chapter index (text, HUD, camera, labels all use this) */
  activeIndex: number;
  /** Local progress within active chapter 0..1 */
  localProgress: number;
  /** Current semantic phase inside the chapter */
  phase: StoryPhase;
  /** Morph source chapter index (always === activeIndex) */
  fromIndex: number;
  /** Morph target chapter index (activeIndex + 1, clamped to N - 1) */
  toIndex: number;
  /** Target morph progress 0..1 (0 during enter/hold/travel; eases 0->1 ONLY during exit phase) */
  targetMorph: number;
  /** Tunnel flight progress 0..1 (strictly 0.10..0.88 of Tunnel chapter) */
  tunnelTravel: number;
  /** Interpolated camera rig values (pure stateless function of index/local) */
  camPos: [number, number, number];
  camLookAt: [number, number, number];
  camFov: number;
  camRoll: number;
  /** Special chapter shader uniforms */
  tunnelFactor: number;
  tunnelEndConverge: number;
  arcProgress: number;
  portraitScan: number;
  portraitPoseMix: number;
  wordDissolve: number;
  appTiltEnabled: number;
  orbitSpinFactor: number;
  closingInteractiveFactor: number;
  /** Bounded idle oscillation amplitude [rx, ry] */
  cloudRotAmp: [number, number];
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

/** Total cumulative scroll span in vh (excluding the 100vh viewport tail) */
export function getTotalScrollLengthVh(chapters: StoryChapterConfig[]): number {
  let sum = 0;
  for (let i = 0; i < chapters.length; i++) {
    sum += chapters[i].length;
  }
  return Math.max(100, sum);
}

/** Compute exact scrollY start (in px) for jumping directly to chapter `targetIndex` */
export function getChapterStartScrollY(
  targetIndex: number,
  viewportHeight: number,
  chapters: StoryChapterConfig[]
): number {
  const vhPx = Math.max(1, viewportHeight) / 100;
  let acc = 0;
  const clamped = clamp(targetIndex, 0, chapters.length - 1);
  for (let i = 0; i < clamped; i++) {
    acc += chapters[i].length * vhPx;
  }
  // Land gently inside the start of the hold/travel zone so text & shape are immediately settled
  const isTunnel = chapters[clamped]?.shape === 'tunnel';
  const settleOffset = isTunnel ? 0.04 : 0.16;
  return acc + chapters[clamped].length * vhPx * settleOffset;
}

/**
 * SINGLE SOURCE OF TRUTH
 * Maps raw scrollY directly to `{ index, local, totalProgress }` using each chapter's
 * configured `length` in vh (never equal division!).
 * Text, shapes, camera, labels, and HUD all read ONLY from this output.
 */
export function resolveScrollPosition(
  scrollY: number,
  viewportHeight: number,
  chapters: StoryChapterConfig[]
): ResolvedScrollPosition {
  const n = chapters.length;
  if (n === 0) {
    return { index: 0, local: 0, totalProgress: 0 };
  }

  const vhPx = Math.max(1, viewportHeight) / 100;
  const totalPx = getTotalScrollLengthVh(chapters) * vhPx;
  const y = clamp(scrollY, 0, totalPx);

  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const span = Math.max(1, chapters[i].length * vhPx);
    const end = cursor + span;
    if (y < end || i === n - 1) {
      const local = clamp01((y - cursor) / span);
      return {
        index: i,
        local,
        totalProgress: clamp01(y / Math.max(1, totalPx)),
      };
    }
    cursor = end;
  }

  return { index: n - 1, local: 1, totalProgress: 1 };
}

/**
 * Pure, stateless evaluation of the entire Story Timeline from `{ scrollY, viewportHeight }`.
 * Scrolling backwards restores every camera and shader value identically with zero drift.
 */
export function evaluateStoryTimeline(
  scrollY: number,
  viewportHeight: number,
  chapters: StoryChapterConfig[],
  scrollSpeedNorm: number,
  isRtl: boolean
): TimelineFrame {
  const n = Math.max(1, chapters.length);
  const { index, local, totalProgress } = resolveScrollPosition(
    scrollY,
    viewportHeight,
    chapters
  );

  const nextIdx = Math.min(n - 1, index + 1);
  const chFrom = chapters[index];
  const chTo = chapters[nextIdx];
  const isLast = index === n - 1;
  const isTunnel = chFrom.shape === 'tunnel';
  const mirrorX = isRtl ? -1 : 1;

  // Determine phase & targetMorph strictly from `local`
  let phase: StoryPhase = 'hold';
  let targetMorph = 0;
  let tunnelTravel = 0;

  if (isTunnel) {
    // Tunnel exact equations:
    // travel: 0.10 -> 0.88; exitMorph: strictly AFTER local >= 0.90!
    tunnelTravel = clamp01(
      (local - STORY_PHASES.tunnelTravelStart) /
        (STORY_PHASES.tunnelTravelEnd - STORY_PHASES.tunnelTravelStart)
    );
    const exitMorphRaw = isLast
      ? 0
      : clamp01(
          (local - STORY_PHASES.tunnelExitStart) /
            (1.0 - STORY_PHASES.tunnelExitStart)
        );
    targetMorph = easeInOutCubic(exitMorphRaw);

    if (local < STORY_PHASES.tunnelTravelStart) phase = 'enter';
    else if (local < STORY_PHASES.tunnelExitStart) phase = 'travel';
    else phase = 'exit';
  } else {
    // Standard 3-phase rhythm: enter (0..0.15), hold (0.15..0.80), exit/morph (0.80..1.00)
    const exitRaw = isLast
      ? 0
      : clamp01(
          (local - STORY_PHASES.exitStart) / (1.0 - STORY_PHASES.exitStart)
        );
    targetMorph = easeInOutCubic(exitRaw);

    if (local < STORY_PHASES.enterEnd) phase = 'enter';
    else if (local < STORY_PHASES.holdEnd) phase = 'hold';
    else phase = 'exit';
  }

  // Camera position evaluated purely from `local` (zero accumulated state!)
  let fromCamX: number;
  let fromCamY: number;
  let fromCamZ: number;

  if (isTunnel) {
    const travelEase = easeInOutSine(tunnelTravel);
    fromCamX = lerp(chFrom.camera.position[0], chFrom.camera.positionEnd[0], travelEase) * mirrorX;
    fromCamY = lerp(chFrom.camera.position[1], chFrom.camera.positionEnd[1], travelEase);
    fromCamZ = lerp(
      STORY_TUNNEL_CONFIG.zStart,
      STORY_TUNNEL_CONFIG.zEnd,
      travelEase
    );
  } else {
    // Gentle linear-eased drift during hold (0.15 -> 0.80) so camera breathes smoothly
    const holdT = clamp01(
      (local - STORY_PHASES.enterEnd) /
        Math.max(0.01, STORY_PHASES.holdEnd - STORY_PHASES.enterEnd)
    );
    const holdEase = easeInOutSine(holdT);
    fromCamX = lerp(chFrom.camera.position[0], chFrom.camera.positionEnd[0], holdEase) * mirrorX;
    fromCamY = lerp(chFrom.camera.position[1], chFrom.camera.positionEnd[1], holdEase);
    fromCamZ = lerp(chFrom.camera.position[2], chFrom.camera.positionEnd[2], holdEase);
  }

  const toCamX = chTo.camera.position[0] * mirrorX;
  const toCamY = chTo.camera.position[1];
  const toCamZ = chTo.camera.position[2];

  const camPos: [number, number, number] = [
    lerp(fromCamX, toCamX, targetMorph),
    lerp(fromCamY, toCamY, targetMorph),
    lerp(fromCamZ, toCamZ, targetMorph),
  ];

  const camLookAt: [number, number, number] = [
    lerp(chFrom.camera.lookAt[0] * mirrorX, chTo.camera.lookAt[0] * mirrorX, targetMorph),
    lerp(chFrom.camera.lookAt[1], chTo.camera.lookAt[1], targetMorph),
    lerp(chFrom.camera.lookAt[2], chTo.camera.lookAt[2], targetMorph),
  ];

  // Tunnel dynamics: active throughout Tunnel and fades cleanly out ONLY during exit (local >= 0.90)
  const isToTunnel = !isLast && chTo.shape === 'tunnel';
  const tunnelFactor = isTunnel
    ? 1 - targetMorph
    : isToTunnel
      ? targetMorph
      : 0;

  // At travel > 0.85, converge tunnel rings into luminous center star (feeding directly into next morph)
  const tunnelEndConverge = isTunnel
    ? smoothstep(STORY_PHASES.tunnelConvergeStart, 1.0, tunnelTravel)
    : 0;

  const baseFov = lerp(chFrom.camera.fov, chTo.camera.fov, targetMorph);
  const tunnelSpeedBoost = tunnelFactor * Math.min(14, scrollSpeedNorm * 16);
  const camFov = baseFov + tunnelSpeedBoost;

  const fromRoll = isTunnel
    ? (chFrom.camera.roll ?? 0) * Math.sin(tunnelTravel * Math.PI)
    : 0;
  const camRoll = lerp(fromRoll, 0, targetMorph);

  // Arc Orbit traveling short purple progress indicator (moves smoothly during hold 0.15..0.80)
  const arcProgress =
    chFrom.shape === 'arcOrbit'
      ? clamp01(
          (local - STORY_PHASES.enterEnd) /
            Math.max(0.01, STORY_PHASES.holdEnd - STORY_PHASES.enterEnd)
        )
      : chTo.shape === 'arcOrbit'
        ? 0.02
        : 0.5;

  // Portrait top-to-bottom scan during enter + subtle second pose turn mid-hold
  let portraitScan = 1.0;
  let portraitPoseMix = 0.0;
  if (chFrom.shape === 'portrait') {
    portraitScan = smoothstep(0.0, STORY_PHASES.enterEnd, local);
    portraitPoseMix = smoothstep(0.38, 0.72, local);
  } else if (chTo.shape === 'portrait' && targetMorph > 0.01) {
    portraitScan = smoothstep(0.05, 0.95, targetMorph);
  }

  // Word gentle upward edge mist right as exit begins
  const wordDissolve =
    chFrom.shape === 'word'
      ? smoothstep(STORY_PHASES.holdEnd - 0.08, 0.98, local)
      : 0;

  // App tiles interactive mouse tilt on chapter 07
  const appTiltEnabled =
    chFrom.shape === 'appTilesFocused'
      ? 1 - targetMorph
      : chTo.shape === 'appTilesFocused'
        ? targetMorph
        : 0;

  // Orbit system gentle orbital revolution
  const orbitSpinFactor =
    chFrom.shape === 'orbitSystem'
      ? 1 - targetMorph
      : chTo.shape === 'orbitSystem'
        ? targetMorph
        : 0;

  // Closing ring heightened cursor interaction
  const closingInteractiveFactor =
    chFrom.shape === 'ring'
      ? 1
      : chTo.shape === 'ring'
        ? targetMorph
        : 0;

  const rFrom = chFrom.cloudRotation ?? [0.02, 0.05];
  const rTo = chTo.cloudRotation ?? [0.02, 0.05];
  const cloudRotAmp: [number, number] = [
    lerp(rFrom[0], rTo[0], targetMorph),
    lerp(rFrom[1], rTo[1], targetMorph),
  ];

  return {
    totalProgress,
    activeIndex: index,
    localProgress: local,
    phase,
    fromIndex: index,
    toIndex: nextIdx,
    targetMorph,
    tunnelTravel,
    camPos,
    camLookAt,
    camFov,
    camRoll,
    tunnelFactor,
    tunnelEndConverge,
    arcProgress,
    portraitScan,
    portraitPoseMix,
    wordDissolve,
    appTiltEnabled,
    orbitSpinFactor,
    closingInteractiveFactor,
    cloudRotAmp,
  };
}
