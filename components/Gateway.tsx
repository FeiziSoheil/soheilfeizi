'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react';
import { CONTENT, Locale, ViewMode } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';

interface GatewayProps {
  locale: Locale;
  onToggleLocale: () => void;
  onEnter: (mode: ViewMode, soundEnabled: boolean) => void;
}

/**
 * Unified Real Preloader (000 -> 100) + Gateway Screen.
 * Tracks real font loading, portrait/work image decode, and WebGL2 shader compile
 * via useScrollStore.loadProgress before unlocking Site / Story entry.
 */
export default function Gateway({
  locale,
  onToggleLocale,
  onEnter,
}: GatewayProps) {
  const t = CONTENT[locale];
  const loadProgress = useScrollStore((s) => s.loadProgress);
  const assetsReady = useScrollStore((s) => s.assetsReady);

  const [displayCount, setDisplayCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  // Smoothly animate numeric readout toward real loadProgress (000 -> 100)
  useEffect(() => {
    let raf = 0;
    const step = () => {
      setDisplayCount((prev) => {
        const target = assetsReady ? 100 : Math.min(96, loadProgress);
        if (prev >= target) return target;
        const delta = Math.max(1, Math.ceil((target - prev) * 0.22));
        return Math.min(target, prev + delta);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loadProgress, assetsReady]);

  const ready = displayCount >= 100 && assetsReady;
  const formatted = String(displayCount).padStart(3, '0');

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#ECEBE7]/96 text-[#141414] px-6 py-8 sm:px-12 sm:py-10"
    >
      {/* Top hairline bar */}
      <div className="flex items-center justify-between border-b border-[#141414]/15 pb-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">
            {t.person.fullName}
          </span>
          <span className="hidden sm:inline text-[#141414]/50">
            · {t.person.location}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              setSoundOn((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs hover:bg-[#141414]/5 hover:text-[#5B5BF0] transition-colors cursor-pointer"
          >
            {soundOn ? (
              <Volume2 className="h-3.5 w-3.5 text-[#5B5BF0]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-[#141414]/50" />
            )}
            <span className="hidden sm:inline">
              {soundOn ? t.gateway.soundDrift : t.gateway.soundMuted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              onToggleLocale();
            }}
            className="rounded-full border border-[#141414]/25 px-3 py-1 text-[11px] font-semibold hover:border-[#5B5BF0] hover:text-[#5B5BF0] transition-colors cursor-pointer"
          >
            {locale === 'fa' ? 'EN' : 'FA'}
          </button>
        </div>
      </div>

      {/* Center: 000 -> 100 real loader transitions directly into Gateway choices */}
      <div className="w-full py-8">
        {!ready ? (
          <div className="flex flex-col items-start gap-6">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#141414]/50">
              {locale === 'fa'
                ? 'آماده‌سازی فونت، بافت و شیدر ذرات WebGL2'
                : 'INITIALIZING FONTS, ASSETS & WEBGL2 PARTICLE SHADERS'}
            </span>
            <div className="font-mono text-7xl sm:text-9xl font-extrabold tracking-[-0.05em] tabular-nums leading-none">
              {formatted}
            </div>
            <div className="h-1 w-full max-w-md rounded-full bg-[#141414]/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5B5BF0] transition-all duration-100"
                style={{ width: `${displayCount}%` }}
              />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 font-mono text-xs text-[#141414]/55 mb-5">
              <span>100</span>
              <span className="h-[1px] w-8 bg-[#141414]/25" />
              <span>{t.person.globalNote}</span>
            </div>

            <h1 className="display-xl text-4xl sm:text-6xl md:text-7xl text-balance">
              {t.gateway.question}
            </h1>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Site Mode */}
              <button
                type="button"
                data-cursor="view"
                onClick={() => {
                  soundEngine.playStippleTick();
                  onEnter('site', soundOn);
                }}
                onMouseEnter={() => soundEngine.playStippleTick()}
                className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-[#141414]/15 bg-white/40 p-7 sm:p-9 text-start transition-colors hover:bg-[#111111] hover:text-[#ECEAE6] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs opacity-50">01 / FAST</span>
                  <ArrowUpRight className="h-4 w-4 text-[#5B5BF0] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-10">
                  <span className="block text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {t.gateway.siteTitle}
                  </span>
                  <span className="mt-2 block text-sm font-light opacity-75 leading-relaxed">
                    {t.gateway.siteDesc}
                  </span>
                </div>
              </button>

              {/* Story Mode -> dedicated 3D Particle Story (/story) */}
              <Link
                href="/story"
                data-cursor="view"
                onClick={() => {
                  soundEngine.playStippleTick();
                  useScrollStore.getState().setSoundEnabled(soundOn);
                }}
                onMouseEnter={() => soundEngine.playStippleTick()}
                className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-[#5B5BF0]/25 bg-[#5B5BF0]/[0.06] p-7 sm:p-9 text-start transition-colors hover:bg-[#5B5BF0] hover:text-white cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs text-[#5B5BF0] group-hover:text-white/85">
                    02 / 3D STORY
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#5B5BF0] group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-10">
                  <span className="block text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {t.gateway.storyTitle}
                  </span>
                  <span className="mt-2 block text-sm font-light opacity-80 leading-relaxed">
                    {t.gateway.storyDesc}
                  </span>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom hairline footer links */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#141414]/15 pt-4 text-xs font-mono">
        <div className="flex items-center gap-6">
          <a
            href={`mailto:${t.person.email}`}
            data-cursor="view"
            className="inline-flex items-center gap-1 hover:text-[#5B5BF0] transition-colors"
          >
            <span>{t.gateway.emailLabel}</span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href={t.person.linkedin}
            target="_blank"
            rel="noreferrer"
            data-cursor="view"
            className="inline-flex items-center gap-1 hover:text-[#5B5BF0] transition-colors"
          >
            <span>{t.gateway.linkedinLabel}</span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <span className="text-[#141414]/50">{t.person.availability}</span>
      </div>
    </motion.div>
  );
}
