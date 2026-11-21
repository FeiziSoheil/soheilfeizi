'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  Code2,
  Eye,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CONTENT, type Locale } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';

export interface DockBarProps {
  /** Which experience is currently active */
  activeView: 'site' | 'story';
  locale: Locale;
  theme: 'light' | 'dark';
  soundPlaying: boolean;
  onToggleLocale: () => void;
  onToggleSound: () => void;
  /** Called immediately before switching tabs (used to fade out outgoing tab audio) */
  onBeforeSwitch?: (target: 'site' | 'story') => void;
  /** Optional Site-specific action inside Code modal (lil-gui inspector) */
  onToggleGui?: () => void;
  guiVisible?: boolean;
  /** Optional debug shapes viewer trigger (works in both Site & Story) */
  onOpenDebugShapes?: () => void;
}

/**
 * Unified single bottom DockBar shared identically across Site (/) and Story (/story).
 * Fixed centered rounded-full pill with translucent backdrop-blur(12px), 1px hairline,
 * active pill highlight, smooth route fade when switching Site <-> Story, and
 * self-contained Code + Settings modals.
 */
export default function DockBar({
  activeView,
  locale,
  theme,
  soundPlaying,
  onToggleLocale,
  onToggleSound,
  onBeforeSwitch,
  onToggleGui,
  guiVisible = false,
  onOpenDebugShapes,
}: DockBarProps) {
  const router = useRouter();
  const t = CONTENT[locale];
  const isTransitioning = useScrollStore((s) => s.tabTransition.active);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [rememberAudio, setRememberAudio] = useState(true);

  const isDark = theme === 'dark';

  const pillSurface = isDark
    ? 'bg-[#0E0E12]/78 text-[#ECEAE6] border-white/14 shadow-[0_14px_40px_rgba(0,0,0,0.5)]'
    : 'bg-[#F5F3EF]/82 text-[#111111] border-[#111111]/12 shadow-[0_14px_38px_rgba(17,17,17,0.12)]';

  const dividerClass = isDark ? 'bg-white/14' : 'bg-[#111111]/12';

  const modalSurface = isDark
    ? 'bg-[#0E0E12]/96 text-[#ECEAE6] border-white/15'
    : 'bg-[#F4F2EE]/98 text-[#111111] border-[#111111]/14';

  const modalBorder = isDark ? 'border-white/12' : 'border-[#111111]/12';

  const handleSwitchView = (target: 'site' | 'story') => {
    soundEngine.playStippleTick();
    if (target === activeView || isTransitioning) return;

    // Immediately fade out outgoing tab audio while preserving shared soundEnabled intent
    onBeforeSwitch?.(target);

    // Launch persistent root-level 3D particle vortex transition loader
    useScrollStore.getState().startTabTransition(activeView, target);

    window.setTimeout(() => {
      if (target === 'story') {
        router.push('/story?from=tab');
      } else {
        router.push('/?v=site');
      }
    }, 360);
  };

  return (
    <>
      {/* Unified Fixed Bottom DockBar (exact same geometry in Site & Story) */}
      <nav
        aria-label={locale === 'fa' ? 'نوار کنترل اصلی' : 'Primary dock bar'}
        dir="ltr"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-24px)]"
      >
        <div
          className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full border px-2 py-1.5 backdrop-blur-md transition-colors duration-300 ${pillSurface}`}
        >
          {/* 1. </> Code */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              setCodeModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium opacity-80 hover:bg-current/[0.07] hover:opacity-100 hover:text-[#5B5BF0] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Code2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.chrome.codeBtn}</span>
          </button>

          <span className={`h-4 w-[1px] shrink-0 ${dividerClass}`} />

          {/* 2. Site | Story segmented pills */}
          <div className="inline-flex items-center gap-0.5 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => handleSwitchView('site')}
              aria-current={activeView === 'site' ? 'page' : undefined}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeView === 'site'
                  ? 'bg-[#5B5BF0] text-white font-semibold shadow-[0_4px_14px_rgba(91,91,240,0.4)]'
                  : 'opacity-70 hover:opacity-100 hover:bg-current/[0.06]'
              }`}
            >
              {t.chrome.siteBtn}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchView('story')}
              aria-current={activeView === 'story' ? 'page' : undefined}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeView === 'story'
                  ? 'bg-[#5B5BF0] text-white font-semibold shadow-[0_4px_14px_rgba(91,91,240,0.4)]'
                  : 'opacity-70 hover:opacity-100 hover:bg-current/[0.06]'
              }`}
            >
              {t.chrome.storyBtn}
            </button>
          </div>

          <span className={`h-4 w-[1px] shrink-0 ${dividerClass}`} />

          {/* 3. FA / EN */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              onToggleLocale();
            }}
            className="rounded-full px-2.5 py-1.5 font-mono text-[11px] font-semibold opacity-85 hover:bg-current/[0.07] hover:text-[#5B5BF0] transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Toggle language FA / EN"
          >
            {locale === 'fa' ? 'EN' : 'FA'}
          </button>

          {/* 4. Sound toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              onToggleSound();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-current/[0.07] hover:text-[#5B5BF0] transition-colors cursor-pointer"
            aria-pressed={soundPlaying}
            aria-label={soundPlaying ? t.chrome.soundOn : t.chrome.soundOff}
            title={soundPlaying ? t.chrome.soundOn : t.chrome.soundOff}
          >
            {soundPlaying ? (
              <Volume2 className="h-3.5 w-3.5 text-[#5B5BF0]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 opacity-65" />
            )}
          </button>

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playStippleTick();
              setSettingsModalOpen(true);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-current/[0.07] hover:text-[#5B5BF0] transition-colors cursor-pointer"
            aria-label={t.chrome.cookieBtn}
            title={t.chrome.cookieBtn}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 opacity-75" />
          </button>
        </div>
      </nav>

      {/* Code & Architecture Modal */}
      <AnimatePresence>
        {codeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A0A]/80 p-6 backdrop-blur-sm"
            onClick={() => setCodeModalOpen(false)}
          >
            <div
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
              className={`w-full max-w-lg rounded-[var(--radius-lg)] border p-7 shadow-2xl ${modalSurface}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t.chrome.codeModalTitle}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${modalBorder}`}>
                <h2 className="text-lg font-extrabold tracking-tight">
                  {t.chrome.codeModalTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(false)}
                  className="rounded-full p-1.5 opacity-70 hover:bg-current/10 hover:opacity-100 cursor-pointer"
                  aria-label={t.chrome.closeMenu}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed opacity-85">
                {t.chrome.codeModalBody}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 font-mono text-[11px] opacity-85">
                <div className={`rounded-[var(--radius-sm)] border p-2.5 ${modalBorder}`}>
                  Next.js 15 App Router
                </div>
                <div className={`rounded-[var(--radius-sm)] border p-2.5 ${modalBorder}`}>
                  Single BufferGeometry WebGL2
                </div>
                <div className={`rounded-[var(--radius-sm)] border p-2.5 ${modalBorder}`}>
                  Lenis + GSAP ScrollTrigger
                </div>
                <div className={`rounded-[var(--radius-sm)] border p-2.5 ${modalBorder}`}>
                  Web Audio Procedural DSP
                </div>
              </div>

              <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${modalBorder}`}>
                {onOpenDebugShapes && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playStippleTick();
                      setCodeModalOpen(false);
                      onOpenDebugShapes();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/45 px-3.5 py-1.5 font-mono text-[11px] text-[#5B5BF0] hover:bg-[#5B5BF0] hover:text-white transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>?debug=shapes</span>
                  </button>
                )}

                {onToggleGui && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playStippleTick();
                      onToggleGui();
                      setCodeModalOpen(false);
                    }}
                    className="rounded-full border border-[#5B5BF0] px-4 py-1.5 font-mono text-[11px] text-[#5B5BF0] hover:bg-[#5B5BF0] hover:text-white transition-colors cursor-pointer"
                  >
                    {guiVisible
                      ? locale === 'fa'
                        ? 'بستن lil-gui'
                        : 'Hide lil-gui'
                      : locale === 'fa'
                        ? 'باز کردن lil-gui (D)'
                        : 'Open lil-gui (D)'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings / Preferences Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A0A]/80 p-6 backdrop-blur-sm"
            onClick={() => setSettingsModalOpen(false)}
          >
            <div
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
              className={`w-full max-w-md rounded-[var(--radius-lg)] border p-7 shadow-2xl ${modalSurface}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t.chrome.cookieModalTitle}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${modalBorder}`}>
                <h2 className="text-lg font-extrabold tracking-tight">
                  {t.chrome.cookieModalTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="rounded-full p-1.5 opacity-70 hover:bg-current/10 hover:opacity-100 cursor-pointer"
                  aria-label={t.chrome.closeMenu}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-4 text-sm leading-relaxed opacity-80">
                {t.chrome.cookieModalBody}
              </p>
              <div className="mt-5 space-y-3 text-xs">
                <label className={`flex items-center justify-between rounded-[var(--radius-md)] border p-3.5 ${modalBorder}`}>
                  <span>{t.chrome.cookieEssential}</span>
                  <input type="checkbox" checked readOnly className="accent-[#5B5BF0] rounded" />
                </label>
                <label className={`flex items-center justify-between rounded-[var(--radius-md)] border p-3.5 cursor-pointer ${modalBorder}`}>
                  <span>{t.chrome.cookiePrefs}</span>
                  <input
                    type="checkbox"
                    checked={rememberAudio}
                    onChange={(e) => setRememberAudio(e.target.checked)}
                    className="accent-[#5B5BF0] rounded"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('sf_audio_pref', rememberAudio ? '1' : '0');
                  } catch {
                    // ignore storage failures
                  }
                  setSettingsModalOpen(false);
                }}
                className="mt-6 w-full rounded-full bg-[#5B5BF0] py-3 text-xs font-semibold text-white hover:bg-[#4949DC] transition-colors cursor-pointer"
              >
                {t.chrome.cookieSave}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
