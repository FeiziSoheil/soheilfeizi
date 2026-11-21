// Zero-layout-thrash Element-Locked Particle Registry.
// Measures [data-particle-id] DOM boxes ONLY on mount, ResizeObserver, resize, and locale/font change.
// NEVER calls getBoundingClientRect() inside scroll frames!
// Computes live screen center & top purely arithmetically from Lenis smoothed `scrollPos`
// and builds Story-grade 3D target buffers (positions, architectural accents, dustMask)
// with deterministic Fisher-Yates shuffling for silky stardust morphs.

import {
  NormalizedPoint,
  sampleImageNormalized,
  sampleProcessNormalized,
  sampleQuoteMarksNormalized,
  sampleStatementWordNormalized,
  sampleStripWordNormalized,
  sampleSvgNormalized,
  sampleTextNormalized,
} from '@/lib/particleSamplers';
import { HERO_PORTRAIT_CONFIG } from '@/lib/site.config';
import caseStudyAsset from '@/src/assets/images/case_study_commerce_device_1795200948621.jpg';

export interface LocalSlotSpec {
  id: string;
  descriptor: string;
  isRtl?: boolean;
  align?: 'center' | 'start';
  mono?: boolean;
  drawProgress?: number;
}

export interface StoryTargetBuffer {
  positions: Float32Array; // count * 3 (local lx, ly, lz in px centered on slot)
  accents: Float32Array;   // count (0..1 architectural indigo highlight)
  dustMask: Float32Array;  // count (0 = crisp structure/accent, 1 = surround dust)
  shades: Float32Array;    // count (0..1 photographic luminance tone)
  width: number;
  height: number;
  /** Non-zero only for infinite horizontal marquee strip targets (world px wrap length) */
  stripSpan?: number;
}

export interface CachedSlotLayout {
  id: string;
  isSticky: boolean;
  sectionTopDoc: number;
  sectionHeight: number;
  /** Element center X in viewport px */
  localCenterX: number;
  /** Element center Y relative to sticky container (if sticky) or document top (if static) */
  localCenterY: number;
  width: number;
  height: number;
}

class ParticleRegistryManager {
  private elements = new Map<string, HTMLElement>();
  private layouts = new Map<string, CachedSlotLayout>();
  private resizeObserver: ResizeObserver | null = null;
  private listeners = new Set<() => void>();

  private ensureObserver() {
    if (typeof window === 'undefined' || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.refreshAllRects();
    });
    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    this.refreshAllRects();
  };

  public register(id: string, el: HTMLElement | null) {
    if (!el) {
      const prev = this.elements.get(id);
      if (prev && this.resizeObserver) {
        this.resizeObserver.unobserve(prev);
      }
      this.elements.delete(id);
      this.layouts.delete(id);
      return;
    }
    this.ensureObserver();
    this.elements.set(id, el);
    this.resizeObserver?.observe(el);
    this.measureOne(id, el);
    this.emitChange();
  }

  public refreshAllRects() {
    let sizeChanged = false;
    for (const [id, el] of this.elements.entries()) {
      if (!el.isConnected) {
        this.elements.delete(id);
        this.layouts.delete(id);
        sizeChanged = true;
      } else {
        const prev = this.layouts.get(id);
        this.measureOne(id, el);
        const next = this.layouts.get(id);
        if (
          !prev ||
          !next ||
          Math.abs(prev.width - next.width) > 4 ||
          Math.abs(prev.height - next.height) > 4
        ) {
          sizeChanged = true;
        }
      }
    }
    if (sizeChanged) {
      this.emitChange();
    }
  }

  private measureOne(id: string, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;

    const stickyParent = el.closest('.pin-sticky') as HTMLElement | null;
    const sectionParent = el.closest('.pin-section') as HTMLElement | null;
    const scrollY = window.scrollY;

    if (stickyParent && sectionParent) {
      const stickyRect = stickyParent.getBoundingClientRect();
      const sectionRect = sectionParent.getBoundingClientRect();

      this.layouts.set(id, {
        id,
        isSticky: true,
        sectionTopDoc: sectionRect.top + scrollY,
        sectionHeight: sectionRect.height,
        localCenterX: r.left + r.width * 0.5,
        localCenterY: r.top - stickyRect.top + r.height * 0.5,
        width: r.width,
        height: r.height,
      });
    } else {
      this.layouts.set(id, {
        id,
        isSticky: false,
        sectionTopDoc: r.top + scrollY,
        sectionHeight: r.height,
        localCenterX: r.left + r.width * 0.5,
        localCenterY: r.top + scrollY + r.height * 0.5,
        width: r.width,
        height: r.height,
      });
    }
  }

  public getLayout(id: string): CachedSlotLayout | null {
    return this.layouts.get(id) ?? null;
  }

  /**
   * Pure arithmetic live screen rectangle computed strictly from Lenis smoothed `scrollPos`.
   * Zero DOM layout reads per frame!
   */
  public getLiveScreenRect(
    id: string,
    scrollPos: number,
    vh: number
  ): {
    centerX: number;
    centerY: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const layout = this.layouts.get(id);
    if (!layout) return null;

    if (layout.isSticky) {
      const rawTop = layout.sectionTopDoc - scrollPos;
      const stickyTop =
        rawTop > 0
          ? rawTop
          : Math.min(0, layout.sectionTopDoc + layout.sectionHeight - vh - scrollPos);
      const centerY = stickyTop + layout.localCenterY;
      return {
        centerX: layout.localCenterX,
        centerY,
        top: centerY - layout.height * 0.5,
        width: layout.width,
        height: layout.height,
      };
    }

    const centerY = layout.localCenterY - scrollPos;
    return {
      centerX: layout.localCenterX,
      centerY,
      top: centerY - layout.height * 0.5,
      width: layout.width,
      height: layout.height,
    };
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emitChange() {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * Builds a Story-grade element-local 3D target buffer (`positions`, `accents`, `dustMask`).
   * Preserves TRUE architectural accents from the sampler and applies a deterministic
   * Fisher-Yates shuffle so GPU morphs between any two shapes flow organically like stardust.
   */
  public async buildStoryTargetBuffer(
    spec: LocalSlotSpec,
    count: number,
    fallbackW = 380,
    fallbackH = 380
  ): Promise<StoryTargetBuffer | null> {
    const layout = this.layouts.get(spec.id);
    const boxW = layout?.width ?? fallbackW;
    const boxH = layout?.height ?? fallbackH;
    const pts = await this.sampleDescriptor(spec, boxW, boxH, count);
    if (!pts.length) return null;

    const isStrip = spec.descriptor.startsWith('strip:');
    // For infinite marquee strip, make the sampled span 1.85× viewport width (3 full tiles)
    // so modulo wrapping fills edge-to-edge seamlessly with zero gaps!
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const effectiveW = isStrip ? Math.max(boxW * 1.65, vw * 1.95) : boxW;

    const positions = new Float32Array(count * 3);
    const accents = new Float32Array(count);
    const dustMask = new Float32Array(count);
    const shades = new Float32Array(count);
    const depthScale = Math.min(boxW, boxH) * 0.28;

    for (let i = 0; i < count; i++) {
      const p = pts[i % pts.length];
      const i3 = i * 3;
      positions[i3] = (p.u - 0.5) * effectiveW;
      positions[i3 + 1] = -(p.v - 0.5) * boxH;
      positions[i3 + 2] = p.z * depthScale;
      accents[i] = p.accent;
      dustMask[i] = p.dust ?? 0;
      shades[i] = p.shade ?? 0.5;
    }

    // Deterministic Fisher-Yates shuffle so indices map smoothly across different shapes
    let seed = 133791;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      if (i === j) continue;
      const i3 = i * 3;
      const j3 = j * 3;
      const tx = positions[i3];
      const ty = positions[i3 + 1];
      const tz = positions[i3 + 2];
      positions[i3] = positions[j3];
      positions[i3 + 1] = positions[j3 + 1];
      positions[i3 + 2] = positions[j3 + 2];
      positions[j3] = tx;
      positions[j3 + 1] = ty;
      positions[j3 + 2] = tz;

      const ta = accents[i];
      accents[i] = accents[j];
      accents[j] = ta;

      const td = dustMask[i];
      dustMask[i] = dustMask[j];
      dustMask[j] = td;

      const ts = shades[i];
      shades[i] = shades[j];
      shades[j] = ts;
    }

    return {
      positions,
      accents,
      dustMask,
      shades,
      width: effectiveW,
      height: boxH,
      stripSpan: isStrip ? effectiveW : undefined,
    };
  }

  /**
   * Legacy helper preserved for compatibility.
   */
  public async buildLocalTargetBuffers(
    spec: LocalSlotSpec,
    targetOut: Float32Array,
    spawnOut: Float32Array,
    delaysOut: Float32Array,
    accentsOut: Float32Array,
    count: number,
    fallbackW = 340,
    fallbackH = 340
  ): Promise<boolean> {
    const layout = this.layouts.get(spec.id);
    const boxW = layout?.width ?? fallbackW;
    const boxH = layout?.height ?? fallbackH;
    const pts = await this.sampleDescriptor(spec, boxW, boxH, count);
    if (!pts.length) return false;

    const maxR = Math.max(1, Math.hypot(boxW * 0.5, boxH * 0.5));

    for (let i = 0; i < count; i++) {
      const i4 = i * 4;
      const p = pts[i % pts.length];
      const h1 = (((i * 2654435761) >>> 0) % 10000) / 10000;
      const h2 = (((i * 2246822519 + 137) >>> 0) % 10000) / 10000;
      const pSign = i % 2 === 0 ? 1.0 : -1.0;

      const lx = (p.u - 0.5) * boxW;
      const ly = -(p.v - 0.5) * boxH;
      const lz = p.z * 26;

      const normDist = Math.min(1, Math.hypot(lx, ly) / maxR);
      const delaySec = normDist * 0.16 + h1 * 0.04;

      targetOut[i4] = lx;
      targetOut[i4 + 1] = ly;
      targetOut[i4 + 2] = lz;
      targetOut[i4 + 3] = delaySec;
      delaysOut[i] = delaySec;

      const spawnAngle = h2 * Math.PI * 2;
      const spawnRadius = 55 + h1 * 115;
      spawnOut[i4] = lx + Math.cos(spawnAngle) * spawnRadius;
      spawnOut[i4 + 1] = ly + Math.sin(spawnAngle) * spawnRadius;
      spawnOut[i4 + 2] = h1;
      spawnOut[i4 + 3] = pSign;

      accentsOut[i] = p.accent;
    }

    return true;
  }

  private async sampleDescriptor(
    spec: LocalSlotSpec,
    width: number,
    height: number,
    count: number
  ): Promise<NormalizedPoint[]> {
    const colonIdx = spec.descriptor.indexOf(':');
    const kind = colonIdx >= 0 ? spec.descriptor.slice(0, colonIdx) : 'text';
    const payload = colonIdx >= 0 ? spec.descriptor.slice(colonIdx + 1) : spec.descriptor;

    if (kind === 'image') {
      const isPortrait = payload === 'portrait';
      const url = isPortrait
        ? HERO_PORTRAIT_CONFIG.cutoutSrc
        : payload === 'work'
          ? typeof caseStudyAsset === 'string'
            ? caseStudyAsset
            : caseStudyAsset.src
          : payload;
      return sampleImageNormalized(url, count, {
        aspect: width / Math.max(1, height),
        accentRatio: isPortrait ? HERO_PORTRAIT_CONFIG.accentRatio : 0.08,
        theme: HERO_PORTRAIT_CONFIG.theme,
        isPortraitCutout: isPortrait,
      });
    }

    if (kind === 'svg') {
      return sampleSvgNormalized(payload, count, {
        drawProgress: spec.drawProgress ?? 1,
      });
    }

    if (kind === 'process') {
      return sampleProcessNormalized(parseInt(payload, 10) || 0, count);
    }

    if (kind === 'statement') {
      return sampleStatementWordNormalized(payload, count, {
        isRtl: spec.isRtl,
      });
    }

    if (kind === 'quotes') {
      return sampleQuoteMarksNormalized(count);
    }

    if (kind === 'strip') {
      return sampleStripWordNormalized(payload, count, {
        repeatCount: 3,
        isRtl: spec.isRtl,
      });
    }

    return sampleTextNormalized(payload, count, {
      isRtl: spec.isRtl,
      align: spec.align,
      accentRatio: 0.14,
      mono: spec.mono,
    });
  }
}

export const particleRegistry = new ParticleRegistryManager();
