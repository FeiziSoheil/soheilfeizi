'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLabStore } from '@/lib/lab/labStore';

/**
 * Physics-Reactive Cursor (Sections 6 & 12.4):
 * - At rest: 8px crisp dot (mix-blend-mode: difference, white)
 * - During active scroll: stretches into a vertical line in scroll direction
 * - On link hover: pairs with the 30-particle WebGL orbiting ring
 * - On hold-click: expands into magnet attractor crosshair ring
 */
export default function LabCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const speedNorm = useLabStore((s) => s.scroll.speedNorm);
  const scrollDir = useLabStore((s) => s.scroll.dir);
  const cursorOnLink = useLabStore((s) => s.cursorOnLink);
  const cursorMagnetHold = useLabStore((s) => s.cursorMagnetHold);
  const reducedMotion = useLabStore((s) => s.reducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let mx = -100;
    let my = -100;
    let cx = -100;
    let cy = -100;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      setVisible(true);
      const target = e.target as HTMLElement | null;
      const isLink = Boolean(target?.closest('a, button, [data-cursor="link"]'));
      if (useLabStore.getState().cursorOnLink !== isLink) {
        useLabStore.getState().setCursorOnLink(isLink);
      }
    };

    const onLeave = () => {
      setVisible(false);
      useLabStore.getState().setCursorOnLink(false);
    };

    const tick = () => {
      cx += (mx - cx) * 0.24;
      cy += (my - cy) * 0.24;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [reducedMotion]);

  if (!visible || reducedMotion) return null;

  const isScrollingFast = speedNorm > 0.04 && !cursorMagnetHold && !cursorOnLink;
  const width = cursorMagnetHold
    ? 38
    : cursorOnLink
      ? 22
      : isScrollingFast
        ? 2.5
        : 8;
  const height = cursorMagnetHold
    ? 38
    : cursorOnLink
      ? 22
      : isScrollingFast
        ? 8 + speedNorm * 36
        : 8;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[70] hidden md:flex items-center justify-center rounded-full mix-blend-difference transition-[width,height,border-radius] duration-150 ease-out"
      style={{
        width,
        height,
        backgroundColor: cursorMagnetHold || cursorOnLink ? 'transparent' : '#FFFFFF',
        border: cursorMagnetHold
          ? '1.5px dashed #FFFFFF'
          : cursorOnLink
            ? '1px solid #FFFFFF'
            : 'none',
        transformOrigin: scrollDir > 0 ? 'top center' : 'bottom center',
      }}
    >
      {cursorMagnetHold && (
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      )}
    </div>
  );
}
