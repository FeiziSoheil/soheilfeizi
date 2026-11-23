'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { SectionId, ViewMode } from '@/lib/content';
import { HERO_PORTRAIT_CONFIG } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { particleRegistry } from '@/lib/particleRegistry';
import { PortfolioDirector } from '@/lib/portfolioDirector';
import { soundEngine } from '@/lib/soundEngine';
import { prewarmStoryShapeLibrary } from '@/components/story/shapes';
import Gateway from '@/components/Gateway';
import Chrome from '@/components/Chrome';
import DockBar from '@/components/DockBar';
import CustomCursor from '@/components/CustomCursor';
import SingularityBackdrop from '@/components/SingularityBackdrop';
import SiteParticleStage from '@/components/SiteParticleStage';
import {
  AboutSection,
  HeroSection,
  IntroSection,
} from '@/components/sections/IntroHeroAbout';
import {
  ProcessSection,
  WhatIDoSection,
} from '@/components/sections/WhatIDoAndProcess';
import {
  ExperienceSection,
  OwnAppsSection,
} from '@/components/sections/WorkAppsExperience';
import SelectedWork from '@/components/selected-work/SelectedWork';
import {
  AfterHoursSection,
  ClientNotesSection,
  StatementSection,
} from '@/components/sections/StatementTestimonialAfterHours';
import {
  AskMeSection,
  FinalContactSection,
} from '@/components/sections/AskAndContact';
import portraitAsset from '@/src/assets/images/soheil_editorial_portrait_1795200948891.jpg';
import caseStudyAsset from '@/src/assets/images/case_study_commerce_device_1795200948621.jpg';

export default function PortfolioShell() {
  const router = useRouter();
  const locale = useScrollStore((s) => s.locale);
  const mode = useScrollStore((s) => s.mode);
  const soundPlaying = useScrollStore((s) => s.soundEnabled);
  const assetsReady = useScrollStore((s) => s.assetsReady);
  const tabTransition = useScrollStore((s) => s.tabTransition);
  const activeSection = useScrollStore((s) => s.activeSection);
  const theme = useScrollStore((s) => s.theme);
  const totalProgress = useScrollStore((s) => s.totalProgress);
  const guiVisible = useScrollStore((s) => s.guiVisible);
  const singularityActive = useScrollStore((s) => s.singularity.active);
  const singularityOuterTheme = useScrollStore((s) => s.singularity.outerTheme);
  const singularityInnerTheme = useScrollStore((s) => s.singularity.innerTheme);

  const setLocale = useScrollStore((s) => s.setLocale);
  const setMode = useScrollStore((s) => s.setMode);
  const setSoundPlaying = useScrollStore((s) => s.setSoundEnabled);
  const setActiveSection = useScrollStore((s) => s.setActiveSection);
  const setLoadProgress = useScrollStore((s) => s.setLoadProgress);
  const setAssetsReady = useScrollStore((s) => s.setAssetsReady);
  const toggleGuiVisible = useScrollStore((s) => s.toggleGuiVisible);

  const [gatewayDone, setGatewayDone] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('v') === 'site' || params.get('debug') === 'shapes') {
        return true;
      }
    }
    return tabTransition.active && tabTransition.to === 'site';
  });
  const [activeTrack, setActiveTrack] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [debugShapes, setDebugShapes] = useState(false);

  const directorRef = useRef<PortfolioDirector | null>(null);
  const arrivalAudioHandledRef = useRef(false);

  // 1. Real Asset Preloader (Fonts + Portrait & Work Images -> 000..100)
  useEffect(() => {
    let cancelled = false;
    setLoadProgress(22);

    const preloadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    const pUrl = typeof portraitAsset === 'string' ? portraitAsset : portraitAsset.src;
    const wUrl = typeof caseStudyAsset === 'string' ? caseStudyAsset : caseStudyAsset.src;

    const run = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // fallback if fonts API unavailable
      }
      if (!cancelled) {
        setLoadProgress(54);
        useScrollStore.getState().setTabTransitionProgress(58);
      }

      await Promise.all([
        preloadImage(pUrl),
        preloadImage(HERO_PORTRAIT_CONFIG.cutoutSrc),
        preloadImage(wUrl),
      ]);
      if (!cancelled) {
        setLoadProgress(100);
        setAssetsReady(true);
        useScrollStore.getState().setTabTransitionProgress(95);
      }
    };

    void run();

    const failsafe = window.setTimeout(() => {
      if (!cancelled) {
        setLoadProgress(100);
        setAssetsReady(true);
        useScrollStore.getState().setTabTransitionProgress(95);
      }
    }, 2800);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [setLoadProgress, setAssetsReady]);

  // Prewarm Story 3D shape library in background idle time so tab switch to Story is 100% instant
  useEffect(() => {
    if (!assetsReady) return;
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 20_000 : 48_000;
    prewarmStoryShapeLibrary(count, locale);
  }, [assetsReady, locale]);

  // 2. Restore URL query (?v=site | ?debug=shapes) & localStorage preferences
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vParam = params.get('v');
      const isDbg = params.get('debug') === 'shapes';
      const savedLocale = localStorage.getItem('sf_locale');
      const savedMode = localStorage.getItem('sf_mode');

      if (savedLocale === 'en' || savedLocale === 'fa') {
        setLocale(savedLocale);
      }
      if (isDbg) {
        queueMicrotask(() => {
          setDebugShapes(true);
          setGatewayDone(true);
        });
      }
      if (vParam === 'story') {
        router.replace('/story?from=tab');
        return;
      }
      if (vParam === 'site') {
        setMode('site');
        setActiveSection('hero', HERO_PORTRAIT_CONFIG.theme);
        queueMicrotask(() => setGatewayDone(true));
      } else if (savedMode === 'site') {
        setMode('site');
      }
    } catch {
      // ignore storage access issues
    }
  }, [router, setLocale, setMode, setActiveSection]);

  const handleToggleDebugShapes = useCallback((enable: boolean) => {
    try {
      const url = new URL(window.location.href);
      if (enable) url.searchParams.set('debug', 'shapes');
      else url.searchParams.delete('debug');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
    setDebugShapes(enable);
    if (enable) setGatewayDone(true);
  }, []);

  // 3. Apply dir="rtl" / dir="ltr" + lang instantly & remeasure element-locked slots
  useEffect(() => {
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    const raf = requestAnimationFrame(() => {
      particleRegistry.refreshAllRects();
      directorRef.current?.measureSections();
    });
    return () => cancelAnimationFrame(raf);
  }, [locale]);

  // 4. Dev Inspector hotkey ("D") for lil-gui + Freeze simulation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleGuiVisible();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleGuiVisible]);

  // 5. Crisp binary root theme tokens (no smooth fade; spatial split is driven by SingularityBackdrop & scoped [data-theme])
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--theme-t', '1');
      root.style.setProperty('--bg', '#0A0A0A');
      root.style.setProperty('--ink', '#ECEBE7');
      root.style.setProperty('--hairline', 'rgba(236, 235, 231, 0.16)');
    } else {
      root.style.setProperty('--theme-t', '0');
      root.style.setProperty('--bg', '#ECEAE6');
      root.style.setProperty('--ink', '#141414');
      root.style.setProperty('--hairline', 'rgba(20, 20, 20, 0.14)');
    }
  }, [theme]);

  // 6. Mount Unified PortfolioDirector (Lenis + GSAP ticker + continuous themeLerp)
  useEffect(() => {
    const director = new PortfolioDirector();
    directorRef.current = director;
    director.setSoundEnabled(soundPlaying);
    director.mount();

    const raf = requestAnimationFrame(() => {
      director.measureSections();
      particleRegistry.refreshAllRects();
    });

    return () => {
      cancelAnimationFrame(raf);
      director.destroy();
      directorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gatewayDone]);

  useEffect(() => {
    directorRef.current?.setSoundEnabled(soundPlaying);
  }, [soundPlaying]);

  // Always silence Site Web Audio synthesizer when leaving `/` so audio never overlaps with `/story`
  useEffect(() => {
    return () => {
      soundEngine.stop();
    };
  }, []);

  // Default Track 0 (Interstellar) autoplay + audio handoff + particle vortex reveal when on Site
  useEffect(() => {
    if (!gatewayDone) return;
    const st = useScrollStore.getState();

    // Auto-start Track 0 when soundEnabled is true (initial default or handoff from Story)
    if (!arrivalAudioHandledRef.current && st.soundEnabled && !soundEngine.getState().isPlaying) {
      arrivalAudioHandledRef.current = true;
      soundEngine.start(activeTrack);
    }

    // If browser autoplay policy kept AudioContext suspended, unlock cleanly on first user gesture
    let unlockCleanup: (() => void) | undefined;
    if (st.soundEnabled && !soundEngine.isContextRunning()) {
      const unlockAudio = () => {
        if (!useScrollStore.getState().soundEnabled) {
          cleanupListeners();
          return;
        }
        if (!soundEngine.getState().isPlaying) {
          soundEngine.start(activeTrack);
        } else {
          soundEngine.resumeIfNeeded();
        }
        cleanupListeners();
      };
      const cleanupListeners = () => {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      unlockCleanup = cleanupListeners;
    }

    let exitTimer: number | undefined;
    if (tabTransition.active && tabTransition.to === 'site' && assetsReady) {
      const elapsed = performance.now() - tabTransition.startedAt;
      const remaining = Math.max(0, 620 - elapsed);
      exitTimer = window.setTimeout(() => {
        useScrollStore.getState().beginTabTransitionExit();
      }, remaining);
    }

    return () => {
      unlockCleanup?.();
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [gatewayDone, assetsReady, tabTransition.active, tabTransition.to, tabTransition.startedAt, activeTrack]);

  const handleToggleLocale = useCallback(() => {
    setLocale(locale === 'fa' ? 'en' : 'fa');
  }, [locale, setLocale]);

  const handleEnterGateway = useCallback(
    (chosenMode: ViewMode, enableSound: boolean) => {
      if (chosenMode === 'story') {
        soundEngine.stop();
        useScrollStore.getState().setSoundEnabled(enableSound);
        useScrollStore.getState().startTabTransition('site', 'story');
        setGatewayDone(true);
        window.setTimeout(() => {
          router.push('/story?from=tab');
        }, 260);
        return;
      }

      setMode('site');
      setActiveSection('hero', HERO_PORTRAIT_CONFIG.theme);
      try {
        localStorage.setItem('sf_mode', 'site');
        const url = new URL(window.location.href);
        url.searchParams.set('v', 'site');
        window.history.replaceState({}, '', url.toString());
      } catch {
        // ignore
      }

      if (enableSound) {
        arrivalAudioHandledRef.current = true;
        soundEngine.start(activeTrack);
        setSoundPlaying(true);
      } else {
        soundEngine.stop();
        setSoundPlaying(false);
      }

      setGatewayDone(true);
      window.scrollTo({ top: 0 });
    },
    [activeTrack, router, setMode, setActiveSection, setSoundPlaying]
  );

  const handleToggleSound = useCallback(() => {
    if (soundPlaying) {
      soundEngine.stop();
      setSoundPlaying(false);
    } else {
      soundEngine.start(activeTrack);
      setSoundPlaying(true);
    }
  }, [soundPlaying, activeTrack, setSoundPlaying]);

  const handleSelectTrack = useCallback(
    (idx: number) => {
      setActiveTrack(idx);
      soundEngine.start(idx);
      setSoundPlaying(true);
    },
    [setSoundPlaying]
  );

  // Silence Site music immediately before switching to Story (preserving shared soundEnabled intent)
  const handleBeforeTabSwitch = useCallback(() => {
    soundEngine.stop();
  }, []);

  const handleSwitchToStory = useCallback(() => {
    if (useScrollStore.getState().tabTransition.active) return;
    soundEngine.playStippleTick();
    soundEngine.stop();
    useScrollStore.getState().startTabTransition('site', 'story');
    window.setTimeout(() => {
      router.push('/story?from=tab');
    }, 260);
  }, [router]);

  const handleNavigateSection = useCallback((id: SectionId) => {
    directorRef.current?.scrollToSection(id);
  }, []);

  const handleJumpToSectionStep = useCallback(
    (sectionId: SectionId, stepIdx: number, totalSteps: number) => {
      directorRef.current?.scrollToSectionStep(sectionId, stepIdx, totalSteps);
    },
    []
  );

  return (
    <div className="relative min-h-screen bg-transparent text-[var(--ink)]">
      {/* L-1 (z-0): Singularity Backdrop Portal (splits outer & inner theme strictly at circle edge) */}
      <SingularityBackdrop />

      {/* L0 (z-10): Single Fixed Continuous Global WebGL2 Particle Stage (135k Hero / 70k sections desktop) */}
      <SiteParticleStage
        debugShapes={debugShapes}
        heroEntered={gatewayDone}
        onExitDebug={() => handleToggleDebugShapes(false)}
      />

      {/* Subtle Full-Screen Film Grain Overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* L2: Physics-Reactive Difference Cursor */}
      <CustomCursor />

      {/* Unified Preloader (000 -> 100) + Gateway */}
      <AnimatePresence>
        {!gatewayDone && (
          <Gateway
            locale={locale}
            onToggleLocale={handleToggleLocale}
            onEnter={handleEnterGateway}
          />
        )}
      </AnimatePresence>

      {/* L2: Fixed Navigation Chrome + Unified Single DockBar */}
      {gatewayDone && !debugShapes && (
        <>
          <Chrome
            locale={locale}
            mode={mode}
            activeSection={activeSection}
            theme={theme}
            totalProgress={totalProgress}
            singularityActive={singularityActive}
            outerTheme={singularityOuterTheme}
            innerTheme={singularityInnerTheme}
            onNavigateSection={handleNavigateSection}
            onSwitchToStory={handleSwitchToStory}
          />
          <DockBar
            activeView="site"
            locale={locale}
            theme={theme}
            soundPlaying={soundPlaying}
            singularityActive={singularityActive}
            outerTheme={singularityOuterTheme}
            innerTheme={singularityInnerTheme}
            onToggleLocale={handleToggleLocale}
            onToggleSound={handleToggleSound}
            onBeforeSwitch={handleBeforeTabSwitch}
            onToggleGui={toggleGuiVisible}
            guiVisible={guiVisible}
            onOpenDebugShapes={() => handleToggleDebugShapes(true)}
          />
        </>
      )}

      {/* L1: Full-Width Scroll Sections */}
      <main id="main-content" className="relative z-20 bg-transparent">
        {mode === 'story' && <IntroSection locale={locale} />}

        <HeroSection
          locale={locale}
          heroEntered={gatewayDone}
          onOpenContact={() => setContactModalOpen(true)}
        />

        <AboutSection locale={locale} />

        <WhatIDoSection
          locale={locale}
          onJumpToStep={(idx) => handleJumpToSectionStep('whatido', idx, 6)}
          onNextSection={() => handleNavigateSection('process')}
        />

        <ProcessSection
          locale={locale}
          onJumpToStage={(idx) => handleJumpToSectionStep('process', idx, 6)}
        />

        <SelectedWork
          locale={locale}
          onSkipNext={() => handleNavigateSection('apps')}
          onJumpToProject={(idx, total) => handleJumpToSectionStep('work', idx, total)}
        />

        <OwnAppsSection
          locale={locale}
          onJumpToApp={(idx) => handleJumpToSectionStep('apps', idx, 10)}
          onPlaySynth={() => {
            handleSelectTrack(0);
            handleNavigateSection('afterhours');
          }}
        />

        <ExperienceSection
          locale={locale}
          onJumpToRole={(idx) => handleJumpToSectionStep('experience', idx, 4)}
        />

        <StatementSection locale={locale} />

        <ClientNotesSection locale={locale} />

        <AfterHoursSection
          locale={locale}
          soundPlaying={soundPlaying}
          activeTrack={activeTrack}
          onSelectTrack={handleSelectTrack}
          onToggleSound={handleToggleSound}
        />

        <AskMeSection locale={locale} />

        <FinalContactSection
          locale={locale}
          contactModalOpen={contactModalOpen}
          onOpenContact={() => setContactModalOpen(true)}
          onCloseContact={() => setContactModalOpen(false)}
        />
      </main>
    </div>
  );
}
