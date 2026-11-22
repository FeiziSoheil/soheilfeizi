'use client';

import React from 'react';
import { useScrollStore } from '@/lib/scrollStore';

/**
 * L-1 (z-0): Zero-rerender Singularity Backdrop Portal.
 * - Base layer renders the outer (or current settled) theme background.
 * - While a Black Hole or White Hole transition is active, the inner portal layer
 *   renders the incoming theme strictly inside `circle(var(--bh-r) at var(--bh-x) var(--bh-y))`.
 * - Driven exclusively by CSS custom properties updated on `:root` (zero React rerenders per scroll pixel).
 */
export default function SingularityBackdrop() {
  const active = useScrollStore((s) => s.singularity.active);
  const outerTheme = useScrollStore((s) => s.singularity.outerTheme);
  const innerTheme = useScrollStore((s) => s.singularity.innerTheme);
  const settledTheme = useScrollStore((s) => s.theme);

  const baseTheme = active ? outerTheme : settledTheme;
  const baseBg = baseTheme === 'dark' ? '#0A0A0A' : '#ECEAE6';
  const innerBg = innerTheme === 'dark' ? '#0A0A0A' : '#ECEAE6';

  return (
    <div
      aria-hidden="true"
      data-singularity-backdrop="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ backgroundColor: baseBg }}
    >
      {active && (
        <div
          data-singularity-portal="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: innerBg,
            clipPath: 'circle(var(--bh-r) at var(--bh-x) var(--bh-y))',
            willChange: 'clip-path',
          }}
        />
      )}
    </div>
  );
}
