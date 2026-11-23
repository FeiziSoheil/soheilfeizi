'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useScrollStore } from '@/lib/scrollStore';
import type { SelectedProject } from './projectsData';

interface ProjectBackgroundProps {
  projects: SelectedProject[];
  activeIndex: number;
  prevIndex: number | null;
  reducedMotion: boolean;
}

/**
 * ProjectBackground
 * Ultra-smooth GPU-composited crossfading project imagery:
 * - All 4 local project images load eagerly (`priority`) to eliminate mid-scroll decode hitches
 * - Zero expensive full-viewport CSS blur filters during scale/opacity animation
 * - Subtle continuous Lenis scroll parallax driven directly on a wrapper ref (zero React re-renders)
 */
export default function ProjectBackground({
  projects,
  activeIndex,
  prevIndex,
  reducedMotion,
}: ProjectBackgroundProps) {
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const parallaxRef = useRef<HTMLDivElement | null>(null);

  // Silky continuous scroll micro-parallax directly on GPU transform (zero React re-renders)
  useEffect(() => {
    if (reducedMotion) return;
    let currentY = 0;
    let targetY = 0;
    let rafId = 0;
    let running = false;

    const tick = () => {
      const diff = targetY - currentY;
      currentY += diff * 0.14;
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0) scale(1.04)`;
      }
      if (Math.abs(diff) > 0.08) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const unsub = useScrollStore.subscribe((s) => {
      const p = s.sectionProgress.work;
      const localSlot = (p * projects.length) % 1;
      targetY = (0.5 - localSlot) * 26;
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    });

    return () => {
      unsub();
      cancelAnimationFrame(rafId);
    };
  }, [projects.length, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#08080A]"
    >
      <div
        ref={parallaxRef}
        className="absolute inset-0 will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0) scale(1.04)' }}
      >
        {projects.map((project, idx) => {
          const isActive = idx === activeIndex;
          const isPrev = idx === prevIndex;
          const hasFailed = Boolean(failedIds[project.id]);
          const keepMountedVisible = isActive || isPrev;

          return (
            <div
              key={project.id}
              className="absolute inset-0 will-change-[opacity,transform]"
              style={{
                opacity: isActive ? 1 : 0,
                visibility: keepMountedVisible ? 'visible' : 'hidden',
                transform: reducedMotion
                  ? 'translate3d(0, 0, 0) scale(1)'
                  : isActive
                    ? 'translate3d(0, 0, 0) scale(1)'
                    : 'translate3d(0, 0, 0) scale(1.055)',
                transition: reducedMotion
                  ? 'opacity 220ms ease'
                  : 'opacity 680ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear ' +
                    (isActive ? '0s' : '700ms'),
                zIndex: isActive ? 2 : 1,
                background: project.fallbackGradient,
              }}
            >
              {!hasFailed && (
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  priority
                  unoptimized
                  quality={100}
                  sizes="100vw"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedIds((prev) => ({ ...prev, [project.id]: true }))
                  }
                  className="object-cover object-center select-none"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle base darkening underneath the WebGL halftone canvas */}
      <div className="absolute inset-0 z-[4] bg-black/32" />
    </div>
  );
}
