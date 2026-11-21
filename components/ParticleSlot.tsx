'use client';

import React, { useEffect, useRef } from 'react';
import { particleRegistry } from '@/lib/particleRegistry';

interface ParticleSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  slotId: string;
  descriptor: string;
  children?: React.ReactNode;
}

/**
 * Transparent DOM placeholder registering its exact getBoundingClientRect()
 * with ParticleRegistry so System B particles assemble pixel-perfectly on L0.
 */
export function ParticleSlot({
  slotId,
  descriptor,
  className = '',
  children,
  ...rest
}: ParticleSlotProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    particleRegistry.register(slotId, el);
    return () => {
      particleRegistry.register(slotId, null);
    };
  }, [slotId]);

  return (
    <div
      ref={ref}
      data-particle={descriptor}
      data-particle-id={slotId}
      className={className}
      {...rest}
    >
      {children}
    </div>
  );
}
