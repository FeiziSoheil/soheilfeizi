'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScrollStore } from '@/lib/scrollStore';

/**
 * Physics-reactive mix-blend-mode: difference cursor synced with PortfolioDirector:
 * - Rest: 10px pure white dot
 * - Scrolling: stretches vertically into a sleek 2px line proportional to speedNorm
 * - Hovering interactive links: expands softly & notifies L0 Dust for 30-particle halo
 * - Hold click: expands into a magnetic pull ring
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFine = window.matchMedia('(pointer: fine)').matches;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFine || isReduced) return;

    const enableId = requestAnimationFrame(() => setEnabled(true));

    let tx = -100;
    let ty = -100;
    let cx = -100;
    let cy = -100;
    let visible = false;
    let hoveredLink = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest('a, button, [role="button"], [data-cursor="view"]')
      );
      if (isInteractive !== hoveredLink) {
        hoveredLink = isInteractive;
        useScrollStore.getState().setCursorOnLink(isInteractive);
      }
    };

    const onLeave = () => {
      visible = false;
      if (hoveredLink) {
        hoveredLink = false;
        useScrollStore.getState().setCursorOnLink(false);
      }
    };

    const tick = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;

      const st = useScrollStore.getState();
      const speed = st.scroll.speedNorm;
      const holding = st.cursorMagnetHold;

      const dot = dotRef.current;
      const ring = ringRef.current;

      if (dot && ring) {
        const opacity = visible ? '1' : '0';
        const isStreak = speed > 0.14 && !holding && !hoveredLink;
        const streakH = Math.round(10 + speed * 26);
        const w = isStreak ? 2 : holding ? 6 : hoveredLink ? 4 : 9;
        const h = isStreak ? streakH : holding ? 6 : hoveredLink ? 4 : 9;

        dot.style.opacity = opacity;
        dot.style.width = `${w}px`;
        dot.style.height = `${h}px`;
        dot.style.transform = `translate3d(${cx - w * 0.5}px, ${cy - h * 0.5}px, 0)`;

        const ringSize = holding ? 46 : hoveredLink ? 36 : 0;
        ring.style.opacity = visible && ringSize > 0 ? '0.9' : '0';
        ring.style.width = `${ringSize}px`;
        ring.style.height = `${ringSize}px`;
        ring.style.transform = `translate3d(${cx - ringSize * 0.5}px, ${cy - ringSize * 0.5}px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(enableId);
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] mix-blend-difference"
    >
      <div
        ref={dotRef}
        className="fixed left-0 top-0 rounded-full bg-white transition-[width,height] duration-150 ease-out will-change-transform"
        style={{ opacity: 0, width: 9, height: 9 }}
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 rounded-full border border-white transition-[width,height,opacity] duration-200 ease-out will-change-transform"
        style={{ opacity: 0, width: 0, height: 0 }}
      />
    </div>
  );
}
