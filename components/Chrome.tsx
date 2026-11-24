'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import {
  CONTENT,
  Locale,
  SECTIONS,
  SectionId,
  ViewMode,
} from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChromeProps {
  locale: Locale;
  mode: ViewMode;
  activeSection: SectionId;
  theme: 'light' | 'dark';
  totalProgress?: number;
  singularityActive?: boolean;
  outerTheme?: 'light' | 'dark';
  innerTheme?: 'light' | 'dark';
  onNavigateSection: (id: SectionId) => void;
  onSwitchToStory?: () => void;
}

/**
 * Top identity bar, hairline progress, edge section ticks, vertical label,
 * and circular accent hamburger menu for Site mode.
 * On mobile (< md), the menu button lives cleanly in the top header so it never
 * collides with the centered bottom <DockBar />.
 */
export default function Chrome({
  locale,
  mode,
  activeSection,
  theme,
  totalProgress,
  singularityActive = false,
  outerTheme,
  innerTheme,
  onNavigateSection,
  onSwitchToStory,
}: ChromeProps) {
  const t = CONTENT[locale];
  const sectionProgress = useScrollStore((s) => s.sectionProgress);
  const storeTotalProgress = useScrollStore((s) => s.totalProgress);
  const isMobile = useIsMobile();

  const [menuOpen, setMenuOpen] = useState(false);

  const visibleSections = SECTIONS.filter((s) =>
    mode === 'story' ? true : !s.storyOnly
  );
  const currentMeta =
    visibleSections.find((s) => s.id === activeSection) ?? visibleSections[0];
  const activeLocalP = sectionProgress[activeSection] ?? 0;

  const primaryTheme = singularityActive ? (outerTheme ?? theme) : theme;
  const secondaryTheme = innerTheme ?? (primaryTheme === 'dark' ? 'light' : 'dark');
  const activeProgress = totalProgress ?? storeTotalProgress;
  const progressPct = `${Math.min(100, Math.max(0, activeProgress * 100))}%`;
  const isRtl = locale === 'fa';
  const menuClipOrigin = isMobile
    ? isRtl
      ? '2rem 2rem'
      : 'calc(100% - 2rem) 2rem'
    : isRtl
      ? '3rem calc(100% - 3rem)'
      : 'calc(100% - 3rem) calc(100% - 3rem)';

  const renderProgressBar = (skin: 'light' | 'dark') => {
    const skinDark = skin === 'dark';
    return (
      <div
        className={`absolute top-0 inset-x-0 h-[2px] ${
          skinDark ? 'bg-[#ECEAE6]/10' : 'bg-[#111111]/10'
        }`}
      >
        <div
          className="h-full rounded-e-full bg-[#5B5BF0]"
          style={{ width: progressPct }}
        />
      </div>
    );
  };

  const renderEdgeTicks = (skin: 'light' | 'dark', isMirror: boolean) => {
    const skinDark = skin === 'dark';
    const hiddenForWork = activeSection === 'work';
    const sharedClass = `absolute end-3 sm:end-5 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-2.5 transition-opacity duration-200 ${
      hiddenForWork ? 'opacity-0 pointer-events-none' : 'opacity-100'
    } ${isMirror ? 'pointer-events-none' : 'pointer-events-auto'}`;

    const items = visibleSections.map((sec) => {
      const active = sec.id === activeSection;
      const localP = sectionProgress[sec.id] ?? 0;
      const barClass = `block rounded-full transition-[width,height] duration-200 ${
        active
          ? 'h-5 w-1.5 bg-[#5B5BF0]/30 relative overflow-hidden'
          : skinDark
            ? 'h-[2px] w-2.5 bg-[#ECEAE6]/30 group-hover:w-4 group-hover:bg-[#ECEAE6]'
            : 'h-[2px] w-2.5 bg-[#111111]/30 group-hover:w-4 group-hover:bg-[#111111]'
      }`;

      const barContent = (
        <span className={barClass}>
          {active && (
            <span
              className="block w-full rounded-full bg-[#5B5BF0]"
              style={{ height: `${Math.max(22, localP * 100)}%` }}
            />
          )}
        </span>
      );

      if (isMirror) {
        return (
          <span
            key={sec.id}
            className="relative flex items-center justify-end rounded-full p-1"
          >
            {barContent}
          </span>
        );
      }

      return (
        <button
          key={sec.id}
          type="button"
          onClick={() => {
            soundEngine.playStippleTick();
            onNavigateSection(sec.id);
          }}
          title={`${sec.index} · ${sec.label[locale]}`}
          aria-label={`${sec.index} ${sec.label[locale]}`}
          className="group relative flex items-center justify-end rounded-full p-1 cursor-pointer"
        >
          {barContent}
        </button>
      );
    });

    if (isMirror) {
      return <div className={sharedClass}>{items}</div>;
    }

    return (
      <nav
        aria-label={locale === 'fa' ? 'ناوبری بخش‌ها' : 'Section index'}
        className={sharedClass}
      >
        {items}
      </nav>
    );
  };

  return (
    <>
      {/* 1. Top hairline progress bar (mutually exclusive outer/inner split on circle edge) */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 pointer-events-none ${
          singularityActive ? 'bh-layer-outer' : ''
        }`}
      >
        {renderProgressBar(primaryTheme)}
      </div>
      {singularityActive && (
        <div
          aria-hidden="true"
          inert={true}
          className="fixed inset-0 z-40 pointer-events-none bh-layer-inner"
        >
          {renderProgressBar(secondaryTheme)}
        </div>
      )}

      {/* 2. Top minimal identity strip (mix-blend-difference swaps per-pixel strictly at circle edge) */}
      <header className="fixed top-2.5 sm:top-3 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-10 min-h-[44px] pointer-events-none text-white mix-blend-difference">
        <a
          href="#hero"
          data-cursor="view"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('hero');
          }}
          className="pointer-events-auto inline-flex items-center min-h-[40px] rounded-full px-2 py-0.5 text-xs font-mono font-semibold tracking-tight whitespace-nowrap shrink-0 hover:opacity-75 transition-opacity"
        >
          <span>{t.person.fullName}</span>
        </a>
        <div className="pointer-events-auto hidden md:flex items-center gap-3 text-[11px] font-mono opacity-85 whitespace-nowrap">
          <span>{currentMeta?.index}</span>
          <span>/</span>
          <span>{currentMeta?.label[locale]}</span>
          <span className="tabular-nums">
            {String(Math.round(activeLocalP * 100)).padStart(2, '0')}%
          </span>
        </div>
      </header>

      {/* 3. Edge section index ticks (inline-end) — exact circle-edge color split */}
      <div
        className={`fixed inset-0 z-30 pointer-events-none ${
          singularityActive ? 'bh-layer-outer' : ''
        }`}
      >
        {renderEdgeTicks(primaryTheme, false)}
      </div>
      {singularityActive && (
        <div
          aria-hidden="true"
          inert={true}
          data-singularity-ui-mirror="ticks"
          className="fixed inset-0 z-30 pointer-events-none bh-layer-inner"
        >
          {renderEdgeTicks(secondaryTheme, true)}
        </div>
      )}

      {/* 4. Vertical 90-degree active section label (mix-blend-difference swaps per-pixel at circle edge) */}
      <div
        aria-hidden="true"
        className={`fixed bottom-24 start-4 sm:start-6 z-40 hidden lg:flex flex-col items-center gap-3 pointer-events-none text-white mix-blend-difference transition-opacity duration-200 ${
          activeSection === 'work' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="vertical-label font-mono text-[10px] uppercase tracking-[0.22em] opacity-75">
          {currentMeta?.index} — {currentMeta?.label[locale]}
        </span>
        <span className="h-8 w-[1px] rounded-full bg-current opacity-35" />
      </div>

      {/* 5. Circular Accent Menu Button: Top-end in header on Mobile (< md), Bottom-end FAB on Desktop (md+) */}
      <button
        type="button"
        data-cursor="view"
        onClick={() => {
          soundEngine.playStippleTick();
          setMenuOpen((prev) => !prev);
        }}
        aria-label={menuOpen ? t.chrome.closeMenu : t.chrome.menuLabel}
        aria-expanded={menuOpen}
        className="fixed top-2.5 end-3.5 md:top-auto md:bottom-6 md:end-8 z-50 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-[#5B5BF0] text-white shadow-[0_8px_24px_rgba(91,91,240,0.4)] transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
      >
        {menuOpen ? <X className="h-4 w-4 md:h-5 md:w-5" /> : <Menu className="h-4 w-4 md:h-5 md:w-5" />}
      </button>

      {/* 6. Fullscreen Menu Overlay with Circular Clip-Path Reveal */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ clipPath: `circle(0% at ${menuClipOrigin})`, opacity: 0.9 }}
            animate={{ clipPath: `circle(155% at ${menuClipOrigin})`, opacity: 1 }}
            exit={{ clipPath: `circle(0% at ${menuClipOrigin})`, opacity: 0.85 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-[#0A0A0A] text-[#ECEAE6] px-5 pt-16 pb-24 sm:px-14 sm:py-12 overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#ECEAE6]/15 pb-3.5 text-xs font-mono">
              <span className="truncate">{t.person.fullName}</span>
              <span className="text-[#ECEAE6]/50 shrink-0">{t.person.location}</span>
            </div>

            <div className="my-5 sm:my-8 grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 sm:gap-y-2">
              {visibleSections.map((sec) => {
                const isActive = sec.id === activeSection;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    data-cursor="view"
                    onClick={() => {
                      soundEngine.playStippleTick();
                      setMenuOpen(false);
                      onNavigateSection(sec.id);
                    }}
                    className={`group flex items-baseline justify-between rounded-[var(--radius-md)] border-b border-[#ECEAE6]/15 px-3 py-3 sm:py-4 min-h-[48px] text-start transition-colors hover:bg-white/[0.04] hover:border-[#5B5BF0] cursor-pointer ${
                      isActive ? 'text-[#5B5BF0]' : 'text-[#ECEAE6]'
                    }`}
                  >
                    <span className="text-xl sm:text-3xl font-extrabold tracking-tight group-hover:text-[#5B5BF0] transition-colors">
                      {sec.label[locale]}
                    </span>
                    <span className="font-mono text-xs opacity-50">
                      {sec.index}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECEAE6]/15 pt-4 text-xs font-mono text-[#ECEAE6]/60">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <a
                  href={`mailto:${t.person.email}`}
                  className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-[#8F8FFF] transition-colors"
                >
                  {t.person.email}
                </a>
                {onSwitchToStory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSwitchToStory();
                    }}
                    className="rounded-full bg-[#5B5BF0]/15 px-3.5 py-1 text-[#8F8FFF] hover:bg-[#5B5BF0] hover:text-white transition-colors cursor-pointer"
                  >
                    {locale === 'fa' ? 'داستان سه‌بعدی (/story)' : '3D Particle Story (/story)'}
                  </button>
                ) : (
                  <Link
                    href="/story"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full bg-[#5B5BF0]/15 px-3.5 py-1 text-[#8F8FFF] hover:bg-[#5B5BF0] hover:text-white transition-colors"
                  >
                    {locale === 'fa' ? 'داستان سه‌بعدی (/story)' : '3D Particle Story (/story)'}
                  </Link>
                )}
                <a
                  href="/lab"
                  className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-[#8F8FFF] transition-colors"
                >
                  {locale === 'fa' ? 'آزمایشگاه فیزیک (/lab)' : 'Physics Lab (/lab)'}
                </a>
              </div>
              <span>{t.person.availability}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
