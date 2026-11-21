import { STORY_CHAPTERS, type StoryShapeKey } from '../story.config';
import { generateAppTilesFocusedShape, generateAppTilesScatteredShape } from './appTiles';
import { generateArcOrbitShape } from './arcOrbit';
import { generateIntroShape } from './intro';
import { generateOrbitSystemShape } from './orbitSystem';
import { generatePortraitShape } from './portrait';
import { generateRingShape } from './ring';
import { generateSphereShape } from './sphere';
import { generateTunnelShape } from './tunnel';
import type { ShapeBuffer, ShapeContext } from './types';
import { generateUiPlaneShape } from './uiPlane';
import { generateWordShape } from './word';

export type ShapeGeneratorFn = (ctx: ShapeContext) => ShapeBuffer | Promise<ShapeBuffer>;

/**
 * Central registry mapping each `StoryShapeKey` in `story.config.ts`
 * to its deterministic particle buffer generator.
 */
export const SHAPE_GENERATORS: Record<StoryShapeKey, ShapeGeneratorFn> = {
  intro: (ctx) => generateIntroShape(ctx.count),
  sphere: (ctx) => generateSphereShape(ctx.count),
  uiPlane: (ctx) => generateUiPlaneShape(ctx.count, ctx.uiScreenshotSrc),
  arcOrbit: (ctx) => generateArcOrbitShape(ctx.count),
  tunnel: (ctx) => generateTunnelShape(ctx.count),
  orbitSystem: (ctx) => generateOrbitSystemShape(ctx.count),
  appTilesScattered: (ctx) => generateAppTilesScatteredShape(ctx.count),
  appTilesFocused: (ctx) => generateAppTilesFocusedShape(ctx.count),
  word: (ctx) => generateWordShape(ctx.count, ctx.locale),
  portrait: (ctx) => generatePortraitShape(ctx.count, ctx.portraitSrc),
  ring: (ctx) => generateRingShape(ctx.count),
};

function nextFrameYield(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Pre-bakes all 11 chapter `ShapeBuffer`s sequentially, yielding one rAF between
 * shapes so the Gate `000 -> 100` loader updates smoothly without blocking the main thread.
 */
export async function bakeAllStoryShapes(
  ctx: ShapeContext,
  onProgress?: (percent: number, shapeKey: StoryShapeKey) => void
): Promise<ShapeBuffer[]> {
  const buffers: ShapeBuffer[] = [];
  const total = STORY_CHAPTERS.length;

  for (let i = 0; i < total; i++) {
    const key = STORY_CHAPTERS[i].shape;
    const generator = SHAPE_GENERATORS[key];
    const buffer = await generator(ctx);
    buffers.push(buffer);
    onProgress?.(Math.round(((i + 1) / total) * 100), key);
    await nextFrameYield();
  }

  return buffers;
}

export type { ShapeBuffer, ShapeContext };
