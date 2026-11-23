'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { HERO_PORTRAIT_CONFIG } from '@/lib/site.config';
import {
  STORY_CHAPTERS,
  STORY_UI_COPY,
  type StoryChapterConfig,
} from './story.config';

interface StoryTextProps {
  activeIndex: number;
  locale: Locale;
  reducedMotion: boolean;
  webglFallback: boolean;
  onOpenContact: () => void;
}

/**
 * Foreground editorial narrative layer.
 * - Positioned on the start side (~36% width on desktop, bottom-anchored on mobile)
 * - Automatically mirrors to right-aligned in RTL (FA)
 * - Line-by-line GSAP mask slide-up entrance & crisp upward exit
 * - Includes semantic sr-only chapter outline + aria-live announcement for screen readers
 */
export default function StoryText({
  activeIndex,
  locale,
  reducedMotion,
  webglFallback,
  onOpenContact,
}: StoryTextProps) {
  const chapter: StoryChapterConfig =
    STORY_CHAPTERS[activeIndex] ?? STORY_CHAPTERS[0];
  const copy = chapter.copy[locale];
  const ui = STORY_UI_COPY[locale];

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const lines = el.querySelectorAll<HTMLElement>('[data-story-line]');
    const fadeNodes = el.querySelectorAll<HTMLElement>('[data-story-fade]');

    gsap.killTweensOf(lines);
    gsap.killTweensOf(fadeNodes);

    if (reducedMotion) {
      gsap.set(lines, { yPercent: 0, opacity: 1 });
      gsap.set(fadeNodes, { y: 0, opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(
      lines,
      { yPercent: 108, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.72,
        stagger: 0.08,
        ease: 'power3.out',
      },
      0
    ).fromTo(
      fadeNodes,
      { y: 18, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.62,
        stagger: 0.07,
        ease: 'power2.out',
      },
      0.14
    );

    return () => {
      tl.kill();
    };
  }, [activeIndex, locale, reducedMotion]);

  return (
    <>
      {/* Semantic screen-reader announcement for active chapter */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${copy.kicker}: ${copy.lines.join(' ')} ${copy.body}`}
      </div>

      {/* Fixed editorial narrative column (start-side on desktop, bottom on mobile) */}
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-end md:justify-center px-4 pb-20 pt-16 sm:px-10 sm:pb-24 sm:pt-20 md:px-14 lg:px-20">
        <div
          ref={containerRef}
          key={`${chapter.id}-${locale}`}
          className="pointer-events-auto w-full md:w-[38%] lg:w-[35%] max-w-xl"
        >
          {/* Kicker */}
          <div
            data-story-fade
            className="mb-2.5 sm:mb-4 inline-flex items-center gap-2 sm:gap-2.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[#ECEBE7]/60"
          >
            <span className="h-[1px] w-5 sm:w-6 bg-[#5B5BF0]" />
            <span>{copy.kicker}</span>
          </div>

          {/* Masked line-by-line display headline */}
          <h1
            className={`font-bold text-[#ECEBE7] leading-[1.06] sm:leading-[1.03] ${
              locale === 'fa'
                ? 'tracking-[-0.01em] text-[clamp(1.65rem,7vw,4.35rem)]'
                : 'tracking-[-0.038em] text-[clamp(1.85rem,7.4vw,4.85rem)]'
            }`}
          >
            {copy.lines.map((line, idx) => (
              <span key={idx} className="block overflow-hidden pb-0.5 sm:pb-1">
                <span data-story-line className="block will-change-transform">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/* Supporting paragraph */}
          <p
            data-story-fade
            className="mt-3 sm:mt-5 text-[13px] sm:text-base font-light leading-relaxed text-[#ECEBE7]/76 max-w-md"
          >
            {copy.body}
          </p>

          {/* Chapter 09: Author portrait badge featuring Soheil's photo */}
          {chapter.id === 'portrait' && (
            <div
              data-story-fade
              className="mt-4 sm:mt-6 flex items-center gap-3.5 sm:gap-4 rounded-2xl border border-[#ECEAE6]/12 bg-[#ECEAE6]/[0.05] p-2.5 sm:p-3 backdrop-blur-md max-w-md"
            >
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-[#5B5BF0]/40 bg-[#0E0E14]">
                <Image
                  src={HERO_PORTRAIT_CONFIG.cutoutSrc}
                  alt={locale === 'fa' ? 'سهیل فیضی' : 'Soheil Feizi'}
                  fill
                  sizes="64px"
                  className="object-cover object-top"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base text-[#ECEBE7] truncate">
                    {locale === 'fa' ? 'سهیل فیضی' : 'Soheil Feizi'}
                  </span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                </div>
                <p className="font-mono text-[11px] sm:text-xs text-[#ECEBE7]/60 truncate mt-0.5">
                  {locale === 'fa'
                    ? 'مهندس نرم‌افزار و هوش مصنوعی'
                    : 'Full-Stack & AI Engineer'}
                </p>
              </div>
            </div>
          )}

          {/* Intro scroll cue */}
          {copy.note && (
            <div
              data-story-fade
              className="mt-4 sm:mt-7 inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] text-[#ECEBE7]/55"
            >
              <ArrowDown className="h-3.5 w-3.5 text-[#5B5BF0] animate-bounce" />
              <span>{copy.note}</span>
            </div>
          )}

          {/* Closing chapter CTA buttons */}
          {chapter.isClosingCta && (
            <div
              data-story-fade
              className="mt-5 sm:mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3.5"
            >
              <button
                type="button"
                onClick={onOpenContact}
                className="group min-h-[44px] inline-flex items-center gap-2 rounded-full bg-[#5B5BF0] px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-semibold text-[#ECEBE7] transition-colors hover:bg-[#4B4BE0] cursor-pointer"
              >
                <span>{ui.startProject}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <Link
                href="/?v=site"
                className="group min-h-[44px] inline-flex items-center gap-2 rounded-full border border-[#ECEBE7]/28 bg-[#0A0A0C]/80 px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-medium text-[#ECEBE7] transition-colors hover:border-[#ECEBE7] hover:bg-[#ECEBE7] hover:text-[#0A0A0A]"
              >
                <span>{ui.exploreSite}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          )}

          {/* Accessibility / WebGL fallback indicator (minimal, unobtrusive) */}
          {(reducedMotion || webglFallback) && activeIndex === 0 && (
            <p
              data-story-fade
              className="mt-5 font-mono text-[10px] text-[#ECEBE7]/42"
            >
              {webglFallback ? ui.webglFallbackNote : ui.reducedMotionNote}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
