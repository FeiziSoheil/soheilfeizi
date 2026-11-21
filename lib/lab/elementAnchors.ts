/**
 * Zero-layout-thrash Element Anchor Registry (Patch Section 1).
 * Measures DOM geometry ONLY on mount, window.resize, and ResizeObserver.
 * NEVER calls getBoundingClientRect() during scroll frames!
 * Computes exact live screen coordinates from Lenis smoothed `scrollPos`
 * in the exact same frame tick so DOM and WebGL uElementOrigin stay locked 1:1.
 */

export interface CachedElementLayout {
  id: string;
  sectionTopDoc: number;
  sectionHeight: number;
  /** Element center relative to its sticky viewport container */
  localCenterX: number;
  localCenterY: number;
  width: number;
  height: number;
}

class LabElementAnchors {
  private elements = new Map<string, HTMLElement>();
  private layouts = new Map<string, CachedElementLayout>();
  private observer: ResizeObserver | null = null;
  private listeners = new Set<() => void>();

  private ensureObserver() {
    if (typeof window === 'undefined' || this.observer) return;
    this.observer = new ResizeObserver(() => {
      this.remeasureAll();
    });
    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    this.remeasureAll();
  };

  public register(id: string, el: HTMLElement | null) {
    if (!el) {
      const prev = this.elements.get(id);
      if (prev && this.observer) {
        this.observer.unobserve(prev);
      }
      this.elements.delete(id);
      this.layouts.delete(id);
      return;
    }
    this.ensureObserver();
    this.elements.set(id, el);
    this.observer?.observe(el);
    this.measureOne(id, el);
    this.emit();
  }

  public remeasureAll() {
    for (const [id, el] of this.elements.entries()) {
      if (!el.isConnected) {
        this.elements.delete(id);
        this.layouts.delete(id);
      } else {
        this.measureOne(id, el);
      }
    }
    this.emit();
  }

  private measureOne(id: string, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const stickyParent = el.closest('.pin-sticky') as HTMLElement | null;
    const sectionParent = el.closest('.pin-section') as HTMLElement | null;

    const scrollY = window.scrollY;
    const stickyRect = stickyParent ? stickyParent.getBoundingClientRect() : null;
    const sectionRect = sectionParent ? sectionParent.getBoundingClientRect() : r;

    const sectionTopDoc = sectionRect.top + scrollY;
    const sectionHeight = sectionRect.height;

    const localCenterX = r.left + r.width * 0.5;
    const localCenterY = stickyRect
      ? r.top - stickyRect.top + r.height * 0.5
      : r.height * 0.5;

    this.layouts.set(id, {
      id,
      sectionTopDoc,
      sectionHeight,
      localCenterX,
      localCenterY,
      width: r.width,
      height: r.height,
    });
  }

  /**
   * Pure arithmetic screen position computed strictly from Lenis smoothed `scrollPos`
   * (ZERO DOM reads!). Returns top-left pixel coordinates + element dimensions.
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

  public getLayout(id: string): CachedElementLayout | null {
    return this.layouts.get(id) ?? null;
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const labElementAnchors = new LabElementAnchors();
