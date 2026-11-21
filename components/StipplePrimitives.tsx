'use client';

import React, { useRef, useState } from 'react';
import { soundEngine } from '@/lib/soundEngine';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────
 * StippleButton — Hand-drawn / dotted SVG perimeter frame (Zero <canvas>)
 * ───────────────────────────────────────────────────────────── */
interface StippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  variant?: 'default' | 'accent';
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function StippleButton({
  children,
  onClick,
  href,
  className = '',
  variant = 'default',
  type = 'button',
  disabled = false,
}: StippleButtonProps) {
  const strokeColor = variant === 'accent' ? '#5B5BF0' : 'currentColor';
  const fillClass =
    variant === 'accent'
      ? 'bg-[#5B5BF0] text-[#ECEBE7] hover:bg-[#4B4BE0]'
      : 'bg-transparent text-current hover:bg-[#5B5BF0] hover:text-[#ECEBE7]';

  const inner = (
    <span
      className={`stipple-btn-frame group relative inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight transition-colors duration-200 ${fillClass} ${className}`}
    >
      {/* Stippled/hand-drawn dashed rounded hairline SVG frame */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 220 56"
      >
        <rect
          x="2"
          y="2"
          width="216"
          height="52"
          rx="26"
          ry="26"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeDasharray="1.8 4.2 3.2 2.8 1.2 4.6"
          strokeLinecap="round"
          className="opacity-70 transition-opacity duration-200 group-hover:opacity-100"
        />
      </svg>
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {children}
      </span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        data-cursor="view"
        onMouseEnter={() => soundEngine.playStippleTick()}
        onClick={onClick}
        className="inline-block rounded-full cursor-pointer"
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      data-cursor="view"
      onMouseEnter={() => soundEngine.playStippleTick()}
      onClick={() => {
        soundEngine.playStippleTick();
        onClick?.();
      }}
      className="inline-block rounded-full cursor-pointer disabled:opacity-40"
    >
      {inner}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
 * MagneticButton — Pointer-attracted CTA button with stipple frame
 * ───────────────────────────────────────────────────────────── */
export function MagneticButton({
  children,
  onClick,
  className = '',
  variant = 'accent',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'accent';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width * 0.5)) * 0.24;
    const dy = (e.clientY - (r.top + r.height * 0.5)) * 0.24;
    setOffset({
      x: Math.max(-18, Math.min(18, dx)),
      y: Math.max(-14, Math.min(14, dy)),
    });
  };

  const handleLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block"
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition:
          offset.x === 0 && offset.y === 0
            ? 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 90ms linear',
      }}
    >
      <StippleButton variant={variant} onClick={onClick} className={className}>
        {children}
      </StippleButton>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * RotatingBadge — Circular SVG textPath rotated strictly by scroll p (p * 360deg)
 * ───────────────────────────────────────────────────────────── */
export function RotatingBadge({
  text,
  rotationDeg = 0,
  className = '',
  children,
}: {
  text: string;
  rotationDeg?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center select-none',
        className
      )}
      aria-label={text}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full will-change-transform"
        style={{ transform: `rotate(${rotationDeg}deg)` }}
      >
        <defs>
          <path
            id="badgeCirclePath"
            d="M 60, 60 m -44, 0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
          />
        </defs>
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeDasharray="1.5 3.5"
          className="opacity-45"
        />
        <text
          fill="currentColor"
          className="text-[8.2px] font-mono font-semibold uppercase tracking-[0.14em]"
        >
          <textPath href="#badgeCirclePath" startOffset="0%">
            {text}
          </textPath>
        </text>
      </svg>
      {children ?? <span className="absolute h-2 w-2 rounded-full bg-[#5B5BF0]" />}
    </div>
  );
}
