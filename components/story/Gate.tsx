'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react';
import { CONTENT, type Locale } from '@/lib/content';
import { STORY_UI_COPY } from './story.config';

interface StoryGateProps {
  locale: Locale;
  loadProgress: number;
  isReady: boolean;
  onToggleLocale: () => void;
  onEnterStory: (withSound: boolean) => void;
}

/**
 * Full-screen dark entry gate for `/story`.
 * - Tracks real particle geometry/shader pre-baking (000 -> 100)
 * - Sound defaults to OFF unless user explicitly enables it
 * - Two numbered entry choices: `01 The site` (/) and `02 The story` (dissolves gate)
 */
export default function StoryGate({
  locale,
  loadProgress,
  isReady,
  onToggleLocale,
  onEnterStory,
}: StoryGateProps) {
  const person = CONTENT[locale].person;
  const ui = STORY_UI_COPY[locale];

  const [displayPct, setDisplayPct] = useState(0);
  const [soundChoice, setSoundChoice] = useState(false);

  useEffect(() => {
    let raf = 0;
    const step = () => {
      setDisplayPct((prev) => {
        const target = isReady ? 100 : Math.min(96, loadProgress);
        if (prev >= target) return target;
        const delta = Math.max(1, Math.ceil((target - prev) * 0.24));
        return Math.min(target, prev + delta);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loadProgress, isReady]);

  const unlocked = isReady && displayPct >= 100;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
      }}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0A0A0A] text-[#ECEBE7] px-6 py-7 sm:px-12 sm:py-10"
    >
      {/* Top identity strip */}
      <div className="flex items-center justify-between border-b border-[#ECEBE7]/12 pb-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#ECEBE7]">{person.fullName}</span>
          <span className="hidden sm:inline text-[#ECEBE7]/45">
            · {person.role}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundChoice((prev) => !prev)}
            aria-pressed={soundChoice}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ECEBE7]/18 px-3 py-1 text-[11px] text-[#ECEBE7]/75 hover:border-[#ECEBE7]/45 hover:text-[#ECEBE7] transition-colors cursor-pointer"
          >
            {soundChoice ? (
              <Volume2 className="h-3.5 w-3.5 text-[#5B5BF0]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-[#ECEBE7]/45" />
            )}
            <span className="hidden sm:inline">
              {soundChoice ? ui.soundOn : ui.soundOff}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleLocale}
            className="rounded-full border border-[#ECEBE7]/22 px-3 py-1 text-[11px] font-semibold hover:border-[#5B5BF0] hover:text-[#5B5BF0] transition-colors cursor-pointer"
          >
            {locale === 'fa' ? 'EN' : 'FA'}
          </button>
        </div>
      </div>

      {/* Center: numeric 000 -> 100 preloader -> 01 / 02 choice */}
      <div className="w-full py-8">
        {!unlocked ? (
          <div className="flex flex-col items-start gap-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ECEBE7]/45">
              {ui.gateLoading}
            </span>
            <div className="font-mono text-7xl sm:text-9xl font-bold tracking-[-0.05em] tabular-nums leading-none text-[#ECEBE7]">
              {String(displayPct).padStart(3, '0')}
            </div>
            <div className="h-1 w-full max-w-md rounded-full bg-[#ECEBE7]/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5B5BF0] transition-all duration-100"
                style={{ width: `${displayPct}%` }}
              />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#ECEBE7]/50">
              <span>100</span>
              <span className="h-[1px] w-8 bg-[#5B5BF0]" />
              <span>{ui.gateEyebrow}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] text-balance text-[#ECEBE7]">
              {ui.gateHeading}
            </h1>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 01 The site */}
              <Link
                href="/?v=site"
                className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-[#ECEBE7]/14 bg-white/[0.02] p-7 sm:p-10 text-start transition-colors hover:bg-[#ECEBE7] hover:text-[#0A0A0A]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#ECEBE7]/45 group-hover:text-[#0A0A0A]/55">
                    {ui.gateOptionSiteNum}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#5B5BF0] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-12">
                  <span className="block text-2xl sm:text-3xl font-bold tracking-tight">
                    {ui.gateOptionSiteTitle}
                  </span>
                  <span className="mt-2.5 block text-sm font-light opacity-70 leading-relaxed">
                    {ui.gateOptionSiteDesc}
                  </span>
                </div>
              </Link>

              {/* 02 The story */}
              <button
                type="button"
                onClick={() => onEnterStory(soundChoice)}
                className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-[#5B5BF0]/35 bg-[#5B5BF0]/10 p-7 sm:p-10 text-start transition-colors hover:bg-[#5B5BF0] hover:text-[#ECEBE7] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs text-[#5B5BF0] group-hover:text-[#ECEBE7]/85">
                    {ui.gateOptionStoryNum}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#5B5BF0] group-hover:text-[#ECEBE7] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-12">
                  <span className="block text-2xl sm:text-3xl font-bold tracking-tight">
                    {ui.gateOptionStoryTitle}
                  </span>
                  <span className="mt-2.5 block text-sm font-light opacity-78 leading-relaxed">
                    {ui.gateOptionStoryDesc}
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom ambient audio hint & availability */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECEBE7]/12 pt-4 font-mono text-[11px] text-[#ECEBE7]/45">
        <span>
          {ui.gateSoundPrompt}: {soundChoice ? ui.soundOn : ui.soundOff}
        </span>
        <span>{person.availability}</span>
      </div>
    </motion.div>
  );
}
