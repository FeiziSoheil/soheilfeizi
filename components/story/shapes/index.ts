import type { Locale } from '@/lib/content';
import type { ShapeId } from '../story.config';
import type { ShapeBuffer } from './types';
import {
  buildAppTilesShape,
  buildArcOrbitShape,
  buildClosingRingShape,
  buildIntroCloud,
  buildOrbitSystemShape,
  buildSphereShape,
  buildTunnelShape,
} from './geometryShapes';
import {
  buildPortraitShape,
  buildUiPlaneShape,
  buildWordShape,
} from './mediaShapes';
import portraitAsset from '@/src/assets/images/soheil_editorial_portrait_1795200948891.jpg';

export type ShapeLibrary = Record<ShapeId, ShapeBuffer>;

function yieldMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      window.setTimeout(resolve, 8);
    } else {
      resolve();
    }
  });
}

/**
 * Pre-bake all 11 shape buffers incrementally with short main-thread yields so the
 * browser GC can breathe, TabTransitionOverlay stays silky at 60fps, and rapid tab
 * switches can cancel cleanly without spiking memory or freezing the renderer.
 */
export async function buildStoryShapeLibrary(
  count: number,
  locale: Locale,
  onProgress?: (pct: number) => void,
  shouldCancel?: () => boolean
): Promise<ShapeLibrary | null> {
  const report = (p: number) => onProgress?.(Math.min(100, Math.round(p)));
  const aborted = () => Boolean(shouldCancel?.());

  if (aborted()) return null;
  const introCloud = buildIntroCloud(count);
  report(16);
  await yieldMainThread();

  if (aborted()) return null;
  const sphere = buildSphereShape(count);
  report(28);
  await yieldMainThread();

  if (aborted()) return null;
  const uiPlane = await buildUiPlaneShape(count);
  report(42);
  await yieldMainThread();

  if (aborted()) return null;
  const arcOrbit = buildArcOrbitShape(count);
  report(52);
  await yieldMainThread();

  if (aborted()) return null;
  const tunnel = buildTunnelShape(count);
  report(64);
  await yieldMainThread();

  if (aborted()) return null;
  const orbitSystem = buildOrbitSystemShape(count);
  report(72);
  await yieldMainThread();

  if (aborted()) return null;
  const appTilesScattered = buildAppTilesShape(count, false);
  await yieldMainThread();

  if (aborted()) return null;
  const appTilesFocused = buildAppTilesShape(count, true);
  report(82);
  await yieldMainThread();

  if (aborted()) return null;
  const wordText = locale === 'fa' ? 'نامرئی.' : 'invisible.';
  const word = buildWordShape(count, wordText, locale === 'fa');
  report(88);
  await yieldMainThread();

  if (aborted()) return null;
  const pSrc =
    typeof portraitAsset === 'string' ? portraitAsset : portraitAsset.src;
  const portrait = await buildPortraitShape(count, pSrc);
  report(95);
  await yieldMainThread();

  if (aborted()) return null;
  const ring = buildClosingRingShape(count);
  report(100);

  return {
    introCloud,
    sphere,
    uiPlane,
    arcOrbit,
    tunnel,
    orbitSystem,
    appTilesScattered,
    appTilesFocused,
    word,
    portrait,
    ring,
  };
}

export { buildWordShape };
export type { ShapeBuffer } from './types';
