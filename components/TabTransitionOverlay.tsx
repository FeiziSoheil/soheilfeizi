'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useScrollStore } from '@/lib/scrollStore';

interface VortexParticle {
  /** Base orbital angle around primary ring */
  angle: number;
  /** Secondary cross-section / inclination angle */
  phi: number;
  /** Orbital band radius ratio */
  band: number;
  /** Angular velocity */
  speed: number;
  /** Outer scatter polar angle for enter/exit trails */
  scatterAngle: number;
  /** Outer scatter distance multiplier */
  scatterDist: number;
  /** Particle size */
  size: number;
  /** 0 = pearl white, 1 = electric indigo #5B5BF0 */
  accent: number;
  /** Role: 0 = primary gyroscopic ring, 1 = counter-tilted ring, 2 = inner Fibonacci core */
  ringKind: 0 | 1 | 2;
  /** Individual timing stagger 0..1 */
  delay: number;
  /** Last projected screen coords for silky comet trails */
  prevX: number;
  prevY: number;
  hasPrev: boolean;
}

function createVortexParticles(count: number): VortexParticle[] {
  let seed = 918273;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const out: VortexParticle[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    const ringKind: 0 | 1 | 2 = r < 0.44 ? 0 : r < 0.78 ? 1 : 2;
    const isAccent = ringKind === 2 ? (rand() < 0.52 ? 1 : 0) : rand() < 0.28 ? 1 : 0;
    out.push({
      angle: rand() * Math.PI * 2,
      phi: (rand() - 0.5) * Math.PI,
      band: 0.76 + rand() * 0.48,
      speed: (ringKind === 1 ? -1 : 1) * (0.65 + rand() * 1.15),
      scatterAngle: rand() * Math.PI * 2,
      scatterDist: 0.75 + rand() * 0.85,
      size: 1.05 + rand() * 1.65,
      accent: isAccent,
      ringKind,
      delay: rand() * 0.28,
      prevX: 0,
      prevY: 0,
      hasPrev: false,
    });
  }
  return out;
}

/**
 * Persistent root-level Particle Vortex Transition Loader.
 * Lives in app/layout.tsx so it stays mounted across `/` <-> `/story` App Router switches
 * with zero blink or cut:
 *  - Entering: Particles spiral inward from the viewport edges into a 3D spinning dual-ring portal
 *  - Loading: Gyroscopic 3D particle constellation orbits smoothly around live percentage & target label
 *  - Exiting: Radial stardust bloom bursts outward as the veil dissolves to reveal the destination tab
 */
export default function TabTransitionOverlay() {
  const transition = useScrollStore((s) => s.tabTransition);
  const locale = useScrollStore((s) => s.locale);
  const soundEnabled = useScrollStore((s) => s.soundEnabled);
  const beginExit = useScrollStore((s) => s.beginTabTransitionExit);
  const clearTransition = useScrollStore((s) => s.clearTabTransition);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayPct, setDisplayPct] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const phaseRef = useRef(transition.phase);
  const progressRef = useRef(transition.progress);

  useEffect(() => {
    phaseRef.current = transition.phase;
    progressRef.current = transition.progress;
  }, [transition.phase, transition.progress]);

  // Safety failsafe so a transition can never remain stuck
  useEffect(() => {
    if (!transition.active) return;
    const failsafe = window.setTimeout(() => {
      beginExit();
    }, 4500);
    return () => window.clearTimeout(failsafe);
  }, [transition.active, transition.startedAt, beginExit]);

  // Main high-DPI 3D particle vortex canvas loop
  useEffect(() => {
    if (!transition.active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const isMobile = width < 768;
    const particles = createVortexParticles(isMobile ? 720 : 1450);

    let elapsed = 0;
    let exitElapsed = 0;
    let smoothPct = 0;
    let lastTime = performance.now();
    let lastPctSync = 0;
    let completed = false;

    const enterDur = 0.42;
    const exitDur = 0.56;

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const curPhase = phaseRef.current;
      const targetPct = curPhase === 'exiting' ? 100 : Math.max(progressRef.current, Math.min(92, elapsed * 58));
      smoothPct += (targetPct - smoothPct) * Math.min(1, dt * 8.5);

      if (now - lastPctSync > 32) {
        lastPctSync = now;
        setDisplayPct(Math.min(100, Math.round(smoothPct)));
      }

      // Compute enter/exit envelope
      const enterT = Math.min(1, elapsed / enterDur);
      const enterEase = 1 - Math.pow(1 - enterT, 3);

      let exitT = 0;
      if (curPhase === 'exiting') {
        exitElapsed += dt;
        exitT = Math.min(1, exitElapsed / exitDur);
      }
      const exitEase = exitT * exitT * (3 - 2 * exitT);

      const veilAlpha = curPhase === 'exiting' ? 1 - exitEase : enterEase;
      setOverlayOpacity(veilAlpha);

      // Clear with deep obsidian backdrop (slightly translucent in loading for faint kinetic motion trails)
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgba(10, 10, 10, ${(0.96 * veilAlpha).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);
      const baseRadius = Math.max(108, Math.min(220, minDim * 0.24));
      const maxDiag = Math.hypot(width, height) * 0.62;

      // Subtle central indigo atmospheric halo
      const haloGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.15, cx, cy, baseRadius * 1.9);
      haloGrad.addColorStop(0, `rgba(91, 91, 240, ${(0.18 * veilAlpha).toFixed(3)})`);
      haloGrad.addColorStop(0.5, `rgba(91, 91, 240, ${(0.05 * veilAlpha).toFixed(3)})`);
      haloGrad.addColorStop(1, 'rgba(10, 10, 10, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, width, height);

      // Dynamic tightening as progress climbs 0 -> 100
      const tighten = 1.12 - (smoothPct / 100) * 0.14;
      const spinBoost = 1 + (smoothPct / 100) * 0.65 + exitEase * 2.2;

      const tiltA = 0.58 + Math.sin(elapsed * 0.7) * 0.18;
      const tiltB = -0.62 + Math.cos(elapsed * 0.62) * 0.2;
      const cosA = Math.cos(tiltA);
      const sinA = Math.sin(tiltA);
      const cosB = Math.cos(tiltB);
      const sinB = Math.sin(tiltB);
      const yaw = elapsed * 0.55;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        pt.angle += pt.speed * spinBoost * dt;

        // 1. Compute 3D orbital target coordinates
        let lx = 0;
        let ly = 0;
        let lz = 0;

        if (pt.ringKind === 0) {
          // Primary tilted gyroscopic halo ring
          const R = baseRadius * pt.band * tighten;
          const tubeR = baseRadius * 0.11 * Math.sin(pt.phi * 2 + elapsed * 1.2);
          const rx = Math.cos(pt.angle) * (R + tubeR);
          const ry = Math.sin(pt.angle) * (R + tubeR);
          const rz = Math.sin(pt.phi) * baseRadius * 0.18;
          // Tilt around X
          lx = rx;
          ly = ry * cosA - rz * sinA;
          lz = ry * sinA + rz * cosA;
        } else if (pt.ringKind === 1) {
          // Counter-rotating orthogonal orbital ring
          const R = baseRadius * 0.86 * pt.band * tighten;
          const rx = Math.cos(pt.angle) * R;
          const ry = Math.sin(pt.angle) * R;
          const rz = Math.cos(pt.phi) * baseRadius * 0.16;
          // Tilt opposite axis + yaw
          const ty = ry * cosB - rz * sinB;
          const tz = ry * sinB + rz * cosB;
          lx = rx * cosY - tz * sinY;
          ly = ty;
          lz = rx * sinY + tz * cosY;
        } else {
          // Inner pulsing Fibonacci core shell
          const coreR = baseRadius * (0.48 + 0.14 * Math.sin(elapsed * 2.1 + pt.angle)) * tighten;
          const cosP = Math.cos(pt.phi);
          const sx = Math.cos(pt.angle) * cosP * coreR;
          const sy = Math.sin(pt.phi) * coreR;
          const sz = Math.sin(pt.angle) * cosP * coreR;
          lx = sx * cosY - sz * sinY;
          ly = sy;
          lz = sx * sinY + sz * cosY;
        }

        // Perspective projection
        const camZ = 680;
        const persp = camZ / Math.max(220, camZ - lz);
        let px = cx + lx * persp;
        let py = cy + ly * persp;

        // 2. Apply inward spiral assembly during Entering
        const localEnter = Math.max(0, Math.min(1, (enterT - pt.delay * 0.55) / Math.max(0.2, 1 - pt.delay * 0.55)));
        const eIn = 1 - Math.pow(1 - localEnter, 3);
        if (eIn < 0.999) {
          const inv = 1 - eIn;
          const spiralAng = pt.scatterAngle + inv * 1.45;
          const dist = maxDiag * pt.scatterDist * inv;
          px += Math.cos(spiralAng) * dist;
          py += Math.sin(spiralAng) * dist;
        }

        // 3. Apply outward radial stardust supernova during Exiting
        if (exitEase > 0.001) {
          const localExit = Math.max(0, Math.min(1, (exitT - pt.delay * 0.35) / Math.max(0.25, 1 - pt.delay * 0.35)));
          const eOut = localExit * localExit;
          const dx = px - cx;
          const dy = py - cy;
          const len = Math.max(1, Math.hypot(dx, dy));
          const burstDist = maxDiag * (0.55 + pt.scatterDist * 0.75) * eOut;
          px += (dx / len) * burstDist + Math.cos(pt.scatterAngle) * 40 * eOut;
          py += (dy / len) * burstDist + Math.sin(pt.scatterAngle) * 40 * eOut;
        }

        const depthFactor = Math.max(0.25, Math.min(1, (lz + baseRadius) / (baseRadius * 2)));
        const dotAlpha = (0.28 + depthFactor * 0.66) * veilAlpha;

        if (dotAlpha > 0.015) {
          const radius = pt.size * (0.65 + depthFactor * 0.55) * persp;
          const color = pt.accent > 0.5
            ? `rgba(116, 116, 255, ${dotAlpha.toFixed(3)})`
            : `rgba(236, 234, 230, ${dotAlpha.toFixed(3)})`;

          // Draw subtle velocity comet streak during inward/outward motion
          if (pt.hasPrev && (eIn < 0.96 || exitEase > 0.04)) {
            const dMove = Math.hypot(px - pt.prevX, py - pt.prevY);
            if (dMove > 1.5 && dMove < 120) {
              ctx.strokeStyle = pt.accent > 0.5
                ? `rgba(91, 91, 240, ${(dotAlpha * 0.45).toFixed(3)})`
                : `rgba(236, 234, 230, ${(dotAlpha * 0.32).toFixed(3)})`;
              ctx.lineWidth = Math.max(0.7, radius * 0.7);
              ctx.beginPath();
              ctx.moveTo(pt.prevX, pt.prevY);
              ctx.lineTo(px, py);
              ctx.stroke();
            }
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        pt.prevX = px;
        pt.prevY = py;
        pt.hasPrev = true;
      }

      if (curPhase === 'exiting' && exitT >= 1 && !completed) {
        completed = true;
        clearTransition();
        return;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [transition.active, clearTransition]);

  if (!transition.active) return null;

  const isFa = locale === 'fa';
  const targetTitle =
    transition.to === 'story'
      ? isFa
        ? 'داستان سه‌بعدی'
        : '3D STORY'
      : isFa
        ? 'سایت پورتفولیو'
        : 'PORTFOLIO SITE';

  const kickerText = isFa ? 'در حال شکل‌گیری ذرات' : 'ASSEMBLING PARTICLES';
  const audioHint = soundEnabled
    ? transition.to === 'story'
      ? isFa
        ? 'انتقال موسیقی به فضای داستان'
        : 'HANDING OFF AUDIO → STORY'
      : isFa
        ? 'انتقال موسیقی به فضای سایت'
        : 'HANDING OFF AUDIO → SITE'
    : null;

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const dashOffset = ringCircumference * (1 - Math.min(100, Math.max(0, displayPct)) / 100);

  return (
    <div
      dir={isFa ? 'rtl' : 'ltr'}
      role="status"
      aria-live="polite"
      aria-label={targetTitle}
      className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-auto select-none"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      {/* Centered Editorial Core Readout floating cleanly inside the 3D particle portal */}
      <div
        className="relative z-10 flex flex-col items-center text-center text-[#ECEAE6] transition-opacity duration-150"
        style={{ opacity: Math.max(0, Math.min(1, overlayOpacity * 1.15)) }}
      >
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg
            viewBox="0 0 128 128"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="64"
              cy="64"
              r={ringRadius}
              fill="none"
              stroke="rgba(236, 234, 230, 0.14)"
              strokeWidth="1.25"
            />
            <circle
              cx="64"
              cy="64"
              r={ringRadius}
              fill="none"
              stroke="#5B5BF0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 80ms linear' }}
            />
          </svg>

          <span
            dir="ltr"
            className="font-mono text-2xl sm:text-3xl font-bold tracking-[-0.04em] tabular-nums text-[#ECEAE6]"
          >
            {String(displayPct).padStart(3, '0')}
          </span>
        </div>

        <span className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-[#8F8FFF]">
          {kickerText}
        </span>

        <div className="mt-1.5 text-lg sm:text-xl font-extrabold tracking-tight text-[#ECEAE6]">
          {targetTitle}
        </div>

        {audioHint && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/35 bg-[#5B5BF0]/12 px-3 py-1 font-mono text-[10px] text-[#C2C2FF]">
            <Volume2 className="h-3 w-3 text-[#8F8FFF]" />
            <span>{audioHint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
