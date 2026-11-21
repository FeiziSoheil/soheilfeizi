'use client';

import React from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { CONTENT, type Locale } from '@/lib/content';
import { STORY_CHAPTERS, STORY_UI_COPY } from './story.config';

interface StoryHudProps {
  locale: Locale;
  activeIndex: number;
  totalProgress: number;
  onJumpToChapter: (index: number) => void;
  onOpenContact: () => void;
  onSwitchToSite: () => void;
}

/**
 * Minimal fixed HUD for the 3D Story Experience.
 * Chapter counter (03 / 11) lives cleanly in top-end header;
 * bottom floating controls are rendered by the unified shared <DockBar />.
 */
export default function StoryHud({
  locale,
  activeIndex,
  totalProgress,
  onJumpToChapter,
  onOpenContact,
  onSwitchToSite,
}: StoryHudProps) {
  const person = CONTENT[locale].person;
  const ui = STORY_UI_COPY[locale];

  return (
    <>
      {/* Top 2px indigo progress hairline */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-40 h-[2px] bg-[#ECEAE6]/10"
      >
        <div
          className="h-full rounded-e-full bg-[#5B5BF0] transition-[width] duration-75"
          style={{ width: `${Math.min(100, Math.max(0, totalProgress * 100))}%` }}
        />
      </div>

      {/* Top minimal identity & navigation bar with chapter counter (03 / 11) */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10 md:px-14 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onSwitchToSite}
            className="rounded-full px-2 py-0.5 text-xs sm:text-sm font-semibold tracking-tight text-[#ECEAE6] hover:text-[#8F8FFF] transition-colors whitespace-nowrap cursor-pointer"
          >
            {person.fullName}
          </button>
          <span className="hidden lg:inline text-[#ECEAE6]/25">·</span>
          <span className="hidden lg:inline font-mono text-[11px] text-[#ECEAE6]/55 truncate">
            {person.role}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3 sm:gap-4 font-mono text-[11px]">
          {/* Chapter counter preserved cleanly in top-right */}
          <span
            dir="ltr"
            className="rounded-full border border-[#ECEAE6]/15 bg-[#0D0D10]/85 px-3 py-1 tabular-nums text-[#ECEAE6]/80"
          >
            {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(STORY_CHAPTERS.length).padStart(2, '0')}
          </span>

          <button
            type="button"
            onClick={onOpenContact}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#ECEAE6]/80 hover:bg-white/10 hover:text-[#ECEAE6] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Mail className="h-3.5 w-3.5 text-[#5B5BF0]" />
            <span className="hidden sm:inline">{ui.contactLink}</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToSite}
            className="inline-flex items-center gap-1 rounded-full border border-[#ECEAE6]/20 bg-[#0D0D10]/90 px-3.5 py-1.5 text-[#ECEAE6]/90 hover:border-[#5B5BF0] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>{ui.skipToSite}</span>
            <ArrowUpRight className="h-3 w-3 text-[#8F8FFF]" />
          </button>
        </div>
      </header>

      {/* End-edge vertical dotted chapter scroll progress rail */}
      <nav
        aria-label={locale === 'fa' ? 'فصل‌های داستان' : 'Story chapters'}
        className="fixed end-4 sm:end-7 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-2.5"
      >
        {STORY_CHAPTERS.map((ch, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onJumpToChapter(idx)}
              title={`${ch.indexLabel} · ${ch.copy[locale].kicker}`}
              aria-label={`${ch.indexLabel} ${ch.copy[locale].lines.join(' ')}`}
              aria-current={isActive ? 'step' : undefined}
              className="group relative flex items-center justify-center rounded-full p-1 cursor-pointer"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'h-5 w-1.5 bg-[#5B5BF0]'
                    : isPassed
                      ? 'h-1.5 w-1.5 bg-[#ECEAE6]/55 group-hover:bg-[#ECEAE6]'
                      : 'h-1.5 w-1.5 bg-[#ECEAE6]/22 group-hover:bg-[#ECEAE6]/65'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}
