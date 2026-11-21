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

/**
 * Pre-bake all 11 shape buffers for the Story Experience and report incremental
 * progress (0..100) to the Gate loader.
 */
export async function buildStoryShapeLibrary(
  count: number,
  locale: Locale,
  onProgress?: (pct: number) => void
): Promise<ShapeLibrary> {
  const report = (p: number) => onProgress?.(Math.min(100, Math.round(p)));

  const introCloud = buildIntroCloud(count);
  report(16);

  const sphere = buildSphereShape(count);
  report(28);

  const uiPlane = await buildUiPlaneShape(count);
  report(42);

  const arcOrbit = buildArcOrbitShape(count);
  report(52);

  const tunnel = buildTunnelShape(count);
  report(64);

  const orbitSystem = buildOrbitSystemShape(count);
  report(72);

  const appTilesScattered = buildAppTilesShape(count, false);
  const appTilesFocused = buildAppTilesShape(count, true);
  report(82);

  const wordText = locale === 'fa' ? 'نامرئی.' : 'invisible.';
  const word = buildWordShape(count, wordText, locale === 'fa');
  report(88);

  const pSrc =
    typeof portraitAsset === 'string' ? portraitAsset : portraitAsset.src;
  const portrait = await buildPortraitShape(count, pSrc);
  report(95);

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
