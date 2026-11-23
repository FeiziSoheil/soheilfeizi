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
import { HERO_PORTRAIT_CONFIG } from '@/lib/site.config';

export type ShapeLibrary = Record<ShapeId, ShapeBuffer>;

/**
 * Module-level memory cache so all 11 shapes are ONLY baked once per session.
 * Subsequent tab switches Site <-> Story resolve instantly (0ms), with zero lag.
 */
const shapeLibraryCache = new Map<string, ShapeLibrary>();

function yieldMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    // Yield to the browser paint pipeline so TabTransitionOverlay canvas paints smoothly at 60fps
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

export function getCachedStoryShapeLibrary(
  count: number,
  locale: Locale
): ShapeLibrary | null {
  return shapeLibraryCache.get(`${count}-${locale}`) ?? null;
}

/**
 * Pre-bake story shape library during idle time on Site tab so switching to Story
 * finds all shapes already computed in memory with zero freeze.
 */
export function prewarmStoryShapeLibrary(count: number, locale: Locale): void {
  const cacheKey = `${count}-${locale}`;
  if (shapeLibraryCache.has(cacheKey)) return;

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
      () => {
        void buildStoryShapeLibrary(count, locale);
      },
      { timeout: 4000 }
    );
  } else if (typeof window !== 'undefined') {
    setTimeout(() => {
      void buildStoryShapeLibrary(count, locale);
    }, 1200);
  }
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
  const cacheKey = `${count}-${locale}`;
  const cached = shapeLibraryCache.get(cacheKey);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

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
  const portrait = await buildPortraitShape(
    count,
    HERO_PORTRAIT_CONFIG.cutoutSrc
  );
  report(95);
  await yieldMainThread();

  if (aborted()) return null;
  const ring = buildClosingRingShape(count);
  report(100);

  const library: ShapeLibrary = {
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

  shapeLibraryCache.set(cacheKey, library);
  return library;
}

export { buildWordShape };
export type { ShapeBuffer } from './types';
