'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  X,
} from 'lucide-react';
import { CONTENT, type Locale } from '@/lib/content';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';
import {
  STORY_CHAPTERS,
  STORY_PARTICLE_CONFIG,
  STORY_TUNNEL_CONFIG,
  STORY_UI_COPY,
} from './story.config';
import {
  buildStoryShapeLibrary,
  buildWordShape,
  type ShapeLibrary,
} from './shapes';
import { StoryParticleSystem } from './ParticleSystem';
import {
  evaluateStoryTimeline,
  getChapterStartScrollY,
} from './Timeline';
import { StoryAudioManager } from './AudioManager';
import Labels3D, {
  type Labels3DHandle,
  type ProjectedLabelState,
} from './Labels3D';
import StoryText from './StoryText';
import StoryHud from './Hud';
import StoryGate from './Gate';
import DockBar from '@/components/DockBar';

import portraitAsset from '@/src/assets/images/soheil_editorial_portrait_1795200948891.jpg';
import dashboardAsset from '@/src/assets/images/work_verve_ledger_1795257247109.jpg';

gsap.registerPlugin(ScrollTrigger);

function detectSoftwareGl(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): boolean {
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    return /SwiftShader|llvmpipe|Software|Mesa|Microsoft Basic Render/i.test(
      renderer
    );
  } catch {
    return false;
  }
}

export default function StoryExperience() {
  const router = useRouter();
  const locale = useScrollStore((s) => s.locale);
  const setLocale = useScrollStore((s) => s.setLocale);
  const soundEnabled = useScrollStore((s) => s.soundEnabled);
  const setSoundEnabled = useScrollStore((s) => s.setSoundEnabled);
  const tabTransition = useScrollStore((s) => s.tabTransition);

  const [entered, setEntered] = useState(
    () => tabTransition.active && tabTransition.to === 'story'
  );
  const [loadProgress, setLoadProgress] = useState(4);
  const [isReady, setIsReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hudProgress, setHudProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);

  // ?debug=shapes inspector state (zero noise, zero scroll, ArrowLeft / ArrowRight cycling)
  const [debugShapes, setDebugShapes] = useState(false);
  const [debugIndex, setDebugIndex] = useState(0);

  // Contact modal state
  const [contactOpen, setContactOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [briefInput, setBriefInput] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [submittedMailto, setSubmittedMailto] = useState<string | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<Labels3DHandle | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const audioRef = useRef<StoryAudioManager | null>(null);
  const libraryRef = useRef<ShapeLibrary | null>(null);
  const particleSysRef = useRef<StoryParticleSystem | null>(null);
  const particleCountRef = useRef<number>(85_000);

  // Live mutable refs accessed inside RAF without re-triggering React effects
  const localeRef = useRef<Locale>(locale);
  const enteredRef = useRef<boolean>(entered);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const debugShapesRef = useRef<boolean>(debugShapes);
  const debugIndexRef = useRef<number>(debugIndex);

  const scrollYRef = useRef<number>(0);
  const prevScrollYRef = useRef<number>(0);
  const scrollSpeedRef = useRef<number>(0);
  const activeIndexRef = useRef<number>(0);
  const entranceRef = useRef<number>(0);
  const smoothStageRef = useRef<number>(0);
  const pointerTargetRef = useRef<{ x: number; y: number; active: number }>({
    x: 0,
    y: 0,
    active: 0,
  });

  // Ensure Site ambient synth is stopped on Story mount, sync persisted locale, and handle `?debug=shapes` / `?from=tab`
  useEffect(() => {
    soundEngine.stop();

    try {
      const savedLocale = localStorage.getItem('sf_locale');
      if (savedLocale === 'en' || savedLocale === 'fa') {
        setLocale(savedLocale);
        localeRef.current = savedLocale;
      }
    } catch {
      // ignore storage errors
    }

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const isDbg = params.get('debug') === 'shapes';
      const fromTab = params.get('from') === 'tab';
      setDebugShapes(isDbg);
      if (isDbg || fromTab) setEntered(true);
    };
    queueMicrotask(syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [setLocale]);

  const toggleDebugShapes = useCallback((enable: boolean) => {
    const url = new URL(window.location.href);
    if (enable) {
      url.searchParams.set('debug', 'shapes');
      setEntered(true);
    } else {
      url.searchParams.delete('debug');
    }
    window.history.pushState({}, '', url.toString());
    setDebugShapes(enable);
  }, []);

  useEffect(() => {
    debugShapesRef.current = debugShapes;
  }, [debugShapes]);

  useEffect(() => {
    debugIndexRef.current = debugIndex;
  }, [debugIndex]);

  // ArrowLeft / ArrowRight keyboard controls in `?debug=shapes`
  useEffect(() => {
    if (!debugShapes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDebugIndex((prev) => (prev + 1) % STORY_CHAPTERS.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDebugIndex(
          (prev) => (prev - 1 + STORY_CHAPTERS.length) % STORY_CHAPTERS.length
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [debugShapes]);

  useEffect(() => {
    localeRef.current = locale;
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;

    // Rebuild typography word shape cleanly whenever locale toggles
    if (libraryRef.current && particleSysRef.current) {
      const nextWord = buildWordShape(
        particleCountRef.current,
        locale === 'fa' ? 'نامرئی.' : 'invisible.',
        locale === 'fa'
      );
      libraryRef.current.word = nextWord;

      const curIdx = debugShapesRef.current
        ? debugIndexRef.current
        : activeIndexRef.current;
      const fromShape = STORY_CHAPTERS[curIdx]?.shape ?? 'introCloud';
      const toShape =
        STORY_CHAPTERS[Math.min(STORY_CHAPTERS.length - 1, curIdx + 1)]?.shape ??
        fromShape;
      if (fromShape === 'word' || toShape === 'word') {
        particleSysRef.current.setMorphPair(
          `${fromShape}-${locale}`,
          libraryRef.current[fromShape],
          `${toShape}-${locale}`,
          libraryRef.current[toShape],
          true
        );
      }
    }
  }, [locale]);

  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReducedMotion(mq.matches);
      reducedMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Initialize AudioManager & automatically hand off music if Site music was playing before switching
  useEffect(() => {
    const mgr = new StoryAudioManager();
    audioRef.current = mgr;
    if (enteredRef.current && useScrollStore.getState().soundEnabled) {
      mgr.setEnabled(true);
    }
    return () => {
      mgr.dispose();
      audioRef.current = null;
    };
  }, []);

  // Complete particle vortex transition & ensure audio handoff once Story shapes are baked
  useEffect(() => {
    if (!isReady) return;
    if (entered && useScrollStore.getState().soundEnabled) {
      audioRef.current?.setEnabled(true);
    }
    if (tabTransition.active && tabTransition.to === 'story') {
      const elapsed = performance.now() - tabTransition.startedAt;
      const remaining = Math.max(0, 780 - elapsed);
      const timer = window.setTimeout(() => {
        useScrollStore.getState().beginTabTransitionExit();
      }, remaining);
      return () => window.clearTimeout(timer);
    }
  }, [isReady, entered, tabTransition.active, tabTransition.to, tabTransition.startedAt]);

  // Lock page scroll while Gate or `?debug=shapes` is active
  useEffect(() => {
    if (!entered || debugShapes) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [entered, debugShapes]);

  // Lenis (lerp: 0.07, wheelMultiplier: 0.8, NO forced scroll-snap) + GSAP ticker sync
  useEffect(() => {
    if (debugShapes) return;
    const track = scrollTrackRef.current;
    if (!track) return;

    const lenis = new Lenis({
      lerp: STORY_PARTICLE_CONFIG.lenis.lerp,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: STORY_PARTICLE_CONFIG.lenis.wheelMultiplier,
      touchMultiplier: 1.25,
    });
    lenisRef.current = lenis;
    if (!enteredRef.current) {
      lenis.stop();
    }

    const onLenisScroll = () => {
      scrollYRef.current = lenis.scroll;
      ScrollTrigger.update();
    };
    lenis.on('scroll', onLenisScroll);

    const tickerFn = (time: number) => {
      lenis.raf(time * 1000);
      // Keep scrollYRef continuously synced with Lenis's smoothed position
      scrollYRef.current = lenis.scroll;
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerFn);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [debugShapes]);

  useEffect(() => {
    if (debugShapes) return;
    if (entered) {
      lenisRef.current?.start();
      ScrollTrigger.refresh();
    } else {
      lenisRef.current?.stop();
    }
  }, [entered, debugShapes]);

  // Main Three.js WebGL2 Particle Story Engine
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let paused = false;

    const isMobile = window.innerWidth < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed) {
          setWebglFallback(true);
          setLoadProgress(100);
          setIsReady(true);
        }
      });
      return;
    }

    const gl = renderer.getContext();
    const isSoftwareGl = detectSoftwareGl(gl);
    const count = isSoftwareGl ? 22_000 : isMobile ? 20_000 : 48_000;
    particleCountRef.current = count;
    const getTargetDpr = () => {
      if (isSoftwareGl) return 1;
      const mobileNow = window.innerWidth < 768;
      return Math.min(window.devicePixelRatio || 1, mobileNow ? 1.5 : 1.75);
    };

    const initialDpr = getTargetDpr();
    renderer.setPixelRatio(initialDpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      44,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      140
    );
    camera.position.set(0, 0.05, 8.2);

    // Asymmetric composition offset: right in LTR, left in RTL, upper-centered on mobile, centered in ?debug=shapes
    let currentViewOffsetX = 0;
    let currentViewOffsetY = 0;
    const applyViewOffset = (w: number, h: number, tunnelFactor: number, centered: boolean) => {
      const mobileNow = w < 768;
      const targetOffsetX =
        mobileNow || centered
          ? 0
          : (localeRef.current === 'fa' ? 1 : -1) * w * 0.165 * (1 - tunnelFactor * 0.9);
      const targetOffsetY =
        mobileNow && !centered
          ? h * 0.14 * (1 - tunnelFactor * 0.85)
          : 0;
      currentViewOffsetX += (targetOffsetX - currentViewOffsetX) * 0.12;
      currentViewOffsetY += (targetOffsetY - currentViewOffsetY) * 0.12;
      if (Math.abs(currentViewOffsetX) < 0.25 && Math.abs(currentViewOffsetY) < 0.25) {
        camera.clearViewOffset();
      } else {
        camera.setViewOffset(w, h, currentViewOffsetX, currentViewOffsetY, w, h);
      }
    };

    // Pre-allocated math objects (zero GC per frame)
    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();
    const pointerSmooth = { x: 0, y: 0, active: 0 };
    const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeNormal = new THREE.Vector3();
    const cloudOrigin = new THREE.Vector3(0, 0, 0);
    const mouseWorld = new THREE.Vector3(0, 0, 0);
    const mouseLocal = new THREE.Vector3(0, 0, 0);
    const invMatrix = new THREE.Matrix4();
    const camPosSmooth = new THREE.Vector3(0, 0.05, 8.2);
    const camLookSmooth = new THREE.Vector3(0, 0, 0);
    const camTargetPos = new THREE.Vector3();
    const camTargetLook = new THREE.Vector3();
    const labelWorldVec = new THREE.Vector3();
    const projectedScratch: ProjectedLabelState[] = [];

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
      pointerTargetRef.current.x = nx;
      pointerTargetRef.current.y = ny;
      pointerTargetRef.current.active = 1;
    };
    const onPointerDown = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
      pointerTargetRef.current.x = nx;
      pointerTargetRef.current.y = ny;
      pointerTargetRef.current.active = 1;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        pointerTargetRef.current.active = 0;
      }
    };
    const onPointerLeave = () => {
      pointerTargetRef.current.active = 0;
    };
    const onResize = () => {
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      const dpr = getTargetDpr();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      particleSysRef.current?.setPixelRatio(dpr);
    };
    const onVisibilityChange = () => {
      paused = document.hidden;
      if (!paused && !disposed) {
        scheduleNext();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerLeave, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    let lastTime = performance.now();
    let elapsed = 0;
    let lastHudSync = 0;

    const scheduleNext = () => {
      if (disposed || paused) return;
      if (isSoftwareGl) {
        timerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, 0);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      if (disposed || paused) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const sys = particleSysRef.current;
      const lib = libraryRef.current;
      const tabTrans = useScrollStore.getState().tabTransition;
      if (!sys || !lib || (tabTrans.active && tabTrans.from === 'story')) {
        scheduleNext();
        return;
      }

      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      const isRtl = localeRef.current === 'fa';

      // ================================================================
      // MODE A: `?debug=shapes` — Static, zero-noise shape readability viewer
      // ================================================================
      if (debugShapesRef.current) {
        const dIdx = debugIndexRef.current;
        const ch = STORY_CHAPTERS[dIdx] ?? STORY_CHAPTERS[0];
        const shapeId = ch.shape;
        sys.setMorphPair(
          `${shapeId}-${localeRef.current}`,
          lib[shapeId],
          `${shapeId}-${localeRef.current}`,
          lib[shapeId]
        );

        const isTun = shapeId === 'tunnel';
        const dbgAspect = w / h;
        const dbgPullback =
          !isTun && dbgAspect < 0.75
            ? Math.min(1.55, 0.78 / Math.max(0.45, dbgAspect))
            : 1;
        camTargetPos.set(
          ch.camera.position[0],
          ch.camera.position[1],
          isTun
            ? STORY_TUNNEL_CONFIG.zStart
            : Math.min(7.2, ch.camera.position[2]) * dbgPullback
        );
        camTargetLook.set(ch.camera.lookAt[0], ch.camera.lookAt[1], ch.camera.lookAt[2]);
        camPosSmooth.lerp(camTargetPos, Math.min(1, dt * 8));
        camLookSmooth.lerp(camTargetLook, Math.min(1, dt * 8));

        camera.position.copy(camPosSmooth);
        camera.lookAt(camLookSmooth);
        camera.fov = ch.camera.fov;
        applyViewOffset(w, h, 0, true);
        camera.updateProjectionMatrix();

        sys.points.rotation.set(0, 0, 0);
        sys.points.updateMatrixWorld();

        sys.updateUniforms({
          time: 0,
          morphProgress: 0,
          entrance: 1,
          tunnelFactor: isTun ? 1 : 0,
          tunnelEndConverge: 0,
          arcFactor: shapeId === 'arcOrbit' ? 1 : 0,
          arcProgress: 0.5,
          portraitScan: 1,
          portraitPoseMix: 0,
          wordDissolve: 0,
          orbitSpin: 0,
          appTiltX: 0,
          appTiltY: 0,
          closingBoost: 0,
          mouse3D: mouseLocal,
          mouseActive: 0,
          reducedMotion: true,
          debugStatic: true,
        });

        renderer.render(scene, camera);
        if (isSoftwareGl) gl.finish();
        scheduleNext();
        return;
      }

      // ================================================================
      // MODE B: Full Scroll-Driven Story Experience (Single Source of Truth)
      // ================================================================
      const targetEntrance = enteredRef.current ? 1 : 0.25;
      entranceRef.current +=
        (targetEntrance - entranceRef.current) * Math.min(1, dt * 2.6);

      // Compute normalized scroll velocity for tunnel FOV speed kick
      const currentScrollY = scrollYRef.current;
      const deltaPx = Math.abs(currentScrollY - prevScrollYRef.current);
      prevScrollYRef.current = currentScrollY;
      const speedPxPerSec = deltaPx / Math.max(0.008, dt);
      const speedNorm = Math.min(1.5, speedPxPerSec / Math.max(1, h * 3.0));
      scrollSpeedRef.current +=
        (speedNorm - scrollSpeedRef.current) * Math.min(1, dt * 7);

      // SINGLE SOURCE OF TRUTH: map scrollY -> { index, local, ... } via chapter lengths
      const lengthScale = w < 768 ? 0.68 : 1;
      const frame = evaluateStoryTimeline(
        currentScrollY,
        h,
        STORY_CHAPTERS,
        scrollSpeedRef.current,
        isRtl,
        lengthScale
      );

      // Smooth damped morph stage with strict max rate <= 1.2 / sec (never snaps/rushes)
      const targetStage = frame.fromIndex + frame.targetMorph;
      const dampedStage = THREE.MathUtils.damp(
        smoothStageRef.current,
        targetStage,
        STORY_PARTICLE_CONFIG.smoothLambda,
        dt
      );
      const maxDelta = STORY_PARTICLE_CONFIG.maxMorphRatePerSec * dt;
      const clampedStep = THREE.MathUtils.clamp(
        dampedStage - smoothStageRef.current,
        -maxDelta,
        maxDelta
      );
      smoothStageRef.current = THREE.MathUtils.clamp(
        smoothStageRef.current + clampedStep,
        0,
        STORY_CHAPTERS.length - 1
      );

      const renderFromIdx = Math.min(
        STORY_CHAPTERS.length - 1,
        Math.floor(smoothStageRef.current + 1e-6)
      );
      const renderToIdx = Math.min(STORY_CHAPTERS.length - 1, renderFromIdx + 1);
      const renderMorph =
        renderFromIdx === renderToIdx
          ? 0
          : THREE.MathUtils.clamp(smoothStageRef.current - renderFromIdx, 0, 1);

      // Sync active chapter index (STRICTLY from unified resolveScrollPosition!)
      if (frame.activeIndex !== activeIndexRef.current) {
        activeIndexRef.current = frame.activeIndex;
        setActiveIndex(frame.activeIndex);
        audioRef.current?.playMorphChime(frame.activeIndex);
      }
      if (now - lastHudSync > 45) {
        lastHudSync = now;
        setHudProgress(frame.totalProgress);
      }

      // Bind GPU morph buffer pair for damped stage
      const fromShapeId = STORY_CHAPTERS[renderFromIdx].shape;
      const toShapeId = STORY_CHAPTERS[renderToIdx].shape;
      sys.setMorphPair(
        `${fromShapeId}-${localeRef.current}`,
        lib[fromShapeId],
        `${toShapeId}-${localeRef.current}`,
        lib[toShapeId]
      );

      // Smooth pointer state
      const pLerp = Math.min(1, dt * 7.0);
      pointerSmooth.x += (pointerTargetRef.current.x - pointerSmooth.x) * pLerp;
      pointerSmooth.y += (pointerTargetRef.current.y - pointerSmooth.y) * pLerp;
      pointerSmooth.active +=
        (pointerTargetRef.current.active - pointerSmooth.active) * pLerp;

      // Stateless camera interpolation driven directly from unified frame (reverse-scroll identical!)
      const parallaxAmp = reducedMotionRef.current
        ? 0
        : 0.22 * (1 - frame.tunnelFactor * 0.78);
      const aspect = w / h;
      const aspectPullback =
        aspect < 0.75 ? Math.min(1.55, 0.78 / Math.max(0.45, aspect)) : 1;
      const zScale = 1 + (aspectPullback - 1) * (1 - frame.tunnelFactor);
      camTargetPos.set(
        frame.camPos[0] + pointerSmooth.x * parallaxAmp,
        frame.camPos[1] + pointerSmooth.y * parallaxAmp * 0.75,
        frame.camPos[2] * zScale
      );
      camTargetLook.set(frame.camLookAt[0], frame.camLookAt[1], frame.camLookAt[2]);

      const camLambda = frame.tunnelFactor > 0.5 ? 7.5 : 5.5;
      camPosSmooth.x = THREE.MathUtils.damp(camPosSmooth.x, camTargetPos.x, camLambda, dt);
      camPosSmooth.y = THREE.MathUtils.damp(camPosSmooth.y, camTargetPos.y, camLambda, dt);
      camPosSmooth.z = THREE.MathUtils.damp(camPosSmooth.z, camTargetPos.z, camLambda, dt);
      camLookSmooth.x = THREE.MathUtils.damp(camLookSmooth.x, camTargetLook.x, camLambda, dt);
      camLookSmooth.y = THREE.MathUtils.damp(camLookSmooth.y, camTargetLook.y, camLambda, dt);
      camLookSmooth.z = THREE.MathUtils.damp(camLookSmooth.z, camTargetLook.z, camLambda, dt);

      camera.position.copy(camPosSmooth);
      camera.lookAt(camLookSmooth);
      if (Math.abs(frame.camRoll) > 0.0001 && !reducedMotionRef.current) {
        camera.rotateZ(frame.camRoll);
      }

      camera.fov = THREE.MathUtils.damp(camera.fov, frame.camFov, 5.5, dt);
      applyViewOffset(w, h, frame.tunnelFactor, false);
      camera.updateProjectionMatrix();

      // Strictly bounded, non-accumulating subtle cloud oscillation (so reverse scroll matches 100%)
      if (
        reducedMotionRef.current ||
        frame.tunnelFactor > 0.25 ||
        fromShapeId === 'word' ||
        fromShapeId === 'portrait' ||
        fromShapeId === 'appTilesFocused' ||
        fromShapeId === 'uiPlane'
      ) {
        sys.points.rotation.x = THREE.MathUtils.damp(sys.points.rotation.x, 0, 6, dt);
        sys.points.rotation.y = THREE.MathUtils.damp(sys.points.rotation.y, 0, 6, dt);
      } else {
        const targetRx = Math.sin(elapsed * 0.24) * frame.cloudRotAmp[0];
        const targetRy = Math.sin(elapsed * 0.19) * frame.cloudRotAmp[1];
        sys.points.rotation.x = THREE.MathUtils.damp(sys.points.rotation.x, targetRx, 4, dt);
        sys.points.rotation.y = THREE.MathUtils.damp(sys.points.rotation.y, targetRy, 4, dt);
      }
      sys.points.updateMatrixWorld();

      // Raycast pointer onto camera-facing virtual plane passing through cloud center
      camera.getWorldDirection(planeNormal);
      hitPlane.setFromNormalAndCoplanarPoint(planeNormal, cloudOrigin);
      mouseNdc.set(pointerSmooth.x, pointerSmooth.y);
      raycaster.setFromCamera(mouseNdc, camera);
      const hit = raycaster.ray.intersectPlane(hitPlane, mouseWorld);
      if (hit) {
        invMatrix.copy(sys.points.matrixWorld).invert();
        mouseLocal.copy(mouseWorld).applyMatrix4(invMatrix);
      }

      const isArcFrom = fromShapeId === 'arcOrbit';
      const isArcTo = toShapeId === 'arcOrbit';
      const arcFactor = isArcFrom
        ? 1 - renderMorph
        : isArcTo
          ? renderMorph
          : 0;

      // Keep tunnelEndConverge latched during the tunnel -> orbitSystem exit morph
      const isLeavingTunnel = fromShapeId === 'tunnel' && renderMorph > 0.001;
      const effectiveTunnelConverge = isLeavingTunnel
        ? 1.0
        : frame.tunnelEndConverge;

      sys.updateUniforms({
        time: elapsed,
        morphProgress: renderMorph,
        entrance: entranceRef.current,
        tunnelFactor: frame.tunnelFactor,
        tunnelEndConverge: effectiveTunnelConverge,
        arcFactor,
        arcProgress: frame.arcProgress,
        portraitScan: frame.portraitScan,
        portraitPoseMix: frame.portraitPoseMix,
        wordDissolve: frame.wordDissolve,
        orbitSpin: frame.orbitSpinFactor,
        appTiltX: pointerSmooth.x * frame.appTiltEnabled,
        appTiltY: pointerSmooth.y * frame.appTiltEnabled,
        closingBoost: frame.closingInteractiveFactor,
        mouse3D: mouseLocal,
        mouseActive: hit ? pointerSmooth.active : 0,
        reducedMotion: reducedMotionRef.current,
        debugStatic: false,
      });

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        gl.finish();
      }

      // Project active chapter 3D labels onto exact 2D screen anchors
      const activeChapter = STORY_CHAPTERS[frame.activeIndex];
      if (labelsRef.current && activeChapter && activeChapter.labels.length > 0) {
        projectedScratch.length = 0;
        const morphFade = 1 - Math.min(1, renderMorph * 1.8);

        for (let i = 0; i < activeChapter.labels.length; i++) {
          const lbl = activeChapter.labels[i];
          labelWorldVec.set(lbl.position[0], lbl.position[1], lbl.position[2]);
          labelWorldVec.applyMatrix4(sys.points.matrixWorld);
          labelWorldVec.project(camera);

          let rangeAlpha = 1;
          if (lbl.visibleRange) {
            const [rStart, rEnd] = lbl.visibleRange;
            const p = frame.localProgress;
            const fadeIn = Math.min(1, Math.max(0, (p - rStart) / 0.06));
            const fadeOut = Math.min(1, Math.max(0, (rEnd - p) / 0.06));
            rangeAlpha = Math.min(fadeIn, fadeOut);
          }

          const inFront = labelWorldVec.z >= -1 && labelWorldVec.z <= 1;
          const anchorX = (labelWorldVec.x * 0.5 + 0.5) * w;
          const anchorY = (-labelWorldVec.y * 0.5 + 0.5) * h;

          const offX = (lbl.offsetPx?.[0] ?? 42) * (isRtl ? -1 : 1);
          const offY = lbl.offsetPx?.[1] ?? -34;
          const pillX = Math.max(96, Math.min(w - 96, anchorX + offX));
          const pillY = Math.max(76, Math.min(h - 90, anchorY + offY));

          projectedScratch.push({
            id: lbl.id,
            anchorX,
            anchorY,
            pillX,
            pillY,
            opacity:
              enteredRef.current && inFront
                ? morphFade * rangeAlpha * entranceRef.current
                : 0,
          });
        }
        labelsRef.current.updateProjections(projectedScratch);
      }

      scheduleNext();
    };

    // Pre-bake all 11 shape buffers asynchronously and attach the single Points object
    let initialLocale: Locale = useScrollStore.getState().locale;
    try {
      const savedLocale = localStorage.getItem('sf_locale');
      if (savedLocale === 'en' || savedLocale === 'fa') {
        initialLocale = savedLocale;
      }
    } catch {
      // ignore storage errors
    }
    localeRef.current = initialLocale;

    void buildStoryShapeLibrary(
      count,
      initialLocale,
      (pct) => {
        if (!disposed) {
          setLoadProgress(pct);
          useScrollStore.getState().setTabTransitionProgress(pct);
        }
      },
      () => disposed
    ).then((lib) => {
      if (disposed || !lib) return;
      libraryRef.current = lib;
      const sys = new StoryParticleSystem(count, lib.introCloud, initialDpr);
      particleSysRef.current = sys;
      scene.add(sys.points);
      setIsReady(true);
      useScrollStore.getState().setTabTransitionProgress(98);
      scheduleNext();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerLeave);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      particleSysRef.current?.dispose();
      particleSysRef.current = null;
      libraryRef.current = null;
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.width = 1;
      renderer.domElement.height = 1;
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleEnterStory = useCallback(
    (withSound: boolean) => {
      setEntered(true);
      soundEngine.stop();
      setSoundEnabled(withSound);
      audioRef.current?.setEnabled(withSound);
    },
    [setSoundEnabled]
  );

  const handleToggleSound = useCallback(() => {
    if (!audioRef.current) return;
    const next = audioRef.current.toggle();
    setSoundEnabled(next);
  }, [setSoundEnabled]);

  const handleToggleLocale = useCallback(() => {
    const next: Locale = locale === 'fa' ? 'en' : 'fa';
    setLocale(next);
  }, [locale, setLocale]);

  // Silence Story audio cleanly before switching back to Site (preserving shared soundEnabled intent)
  const handleBeforeTabSwitch = useCallback(() => {
    audioRef.current?.setEnabled(false);
  }, []);

  const handleSwitchToSite = useCallback(() => {
    if (useScrollStore.getState().tabTransition.active) return;
    audioRef.current?.setEnabled(false);
    useScrollStore.getState().startTabTransition('story', 'site');
    window.setTimeout(() => {
      router.push('/?v=site');
    }, 260);
  }, [router]);

  const handleJumpToChapter = useCallback((index: number) => {
    const lengthScale = window.innerWidth < 768 ? 0.68 : 1;
    const targetY = getChapterStartScrollY(
      index,
      window.innerHeight,
      STORY_CHAPTERS,
      lengthScale
    );
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.4 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

  const activeChapter = STORY_CHAPTERS[activeIndex] ?? STORY_CHAPTERS[0];
  const debugChapter = STORY_CHAPTERS[debugIndex] ?? STORY_CHAPTERS[0];
  const ui = STORY_UI_COPY[locale];
  const person = CONTENT[locale].person;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Project Inquiry — ${nameInput.trim() || 'From 3D Story'}`
    );
    const body = encodeURIComponent(
      `Name: ${nameInput.trim()}\nEmail: ${emailInput.trim()}\n\nBrief:\n${briefInput.trim()}`
    );
    setSubmittedMailto(`mailto:${person.email}?subject=${subject}&body=${body}`);
  };

  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(person.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <div
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
      className="relative w-full bg-[#0A0A0A] text-[#ECEBE7] selection:bg-[#5B5BF0] selection:text-[#ECEBE7]"
    >
      {/* 1. Fixed full-screen WebGL2 Canvas Layer (isolated from React children) */}
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-[#0A0A0A]"
      />

      {/* 1b. Static Fallback when WebGL is unavailable */}
      {webglFallback && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 overflow-hidden bg-[#0A0A0A]"
        >
          <div className="absolute inset-0 flex items-center justify-end opacity-40 px-10">
            <div className="relative h-[62vh] w-[48vw] max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-[#ECEAE6]/12">
              <Image
                src={activeIndex === 9 ? portraitAsset : dashboardAsset}
                alt=""
                fill
                referrerPolicy="no-referrer"
                className="object-cover grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/60" />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DEBUG SHAPES VIEWER (`?debug=shapes`) — Static, zero noise       */}
      {/* ================================================================ */}
      {debugShapes ? (
        <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3.5 sm:p-10">
          {/* Top bar */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 border-b border-[#ECEAE6]/12 pb-3 sm:pb-4 font-mono text-xs">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full bg-[#5B5BF0] px-2.5 sm:px-3 py-1 text-[10px] font-bold text-white">
                DEBUG · SHAPES
              </span>
              <span className="text-[#ECEAE6] font-semibold">
                {debugChapter.indexLabel} / {debugChapter.shape}
              </span>
              <span className="text-[#ECEAE6]/50 hidden sm:inline">
                ({debugChapter.copy[locale].kicker})
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleToggleLocale}
                className="rounded-full border border-[#ECEAE6]/22 bg-[#0C0C10]/90 px-3 py-1 text-[11px] hover:border-[#5B5BF0] cursor-pointer"
              >
                {locale === 'fa' ? 'EN' : 'FA'}
              </button>
              <button
                type="button"
                onClick={() => toggleDebugShapes(false)}
                className="rounded-full border border-[#ECEAE6]/22 bg-[#0C0C10]/90 px-3 sm:px-3.5 py-1 text-[11px] hover:border-[#5B5BF0] cursor-pointer"
              >
                Exit Debug → /story
              </button>
            </div>
          </div>

          {/* Bottom controls & particle diagnostics */}
          <div className="pointer-events-auto flex flex-col gap-2.5 sm:gap-3">
            {/* Shape quick selector pills */}
            <div className="flex flex-nowrap sm:flex-wrap items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 font-mono text-[11px]">
              {STORY_CHAPTERS.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setDebugIndex(idx)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 transition-colors cursor-pointer ${
                    idx === debugIndex
                      ? 'border-[#5B5BF0] bg-[#5B5BF0] text-white'
                      : 'border-[#ECEAE6]/15 bg-[#0C0C10]/90 text-[#ECEAE6]/65 hover:border-[#ECEAE6]/45'
                  }`}
                >
                  {ch.indexLabel} {ch.shape}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ECEAE6]/12 pt-3 font-mono text-[11px] text-[#ECEAE6]/65">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDebugIndex(
                      (prev) =>
                        (prev - 1 + STORY_CHAPTERS.length) % STORY_CHAPTERS.length
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ECEAE6]/20 bg-[#0D0D12]/90 px-3.5 py-1.5 text-[#ECEAE6] hover:border-[#5B5BF0] cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Prev (←)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDebugIndex((prev) => (prev + 1) % STORY_CHAPTERS.length)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ECEAE6]/20 bg-[#0D0D12]/90 px-3.5 py-1.5 text-[#ECEAE6] hover:border-[#5B5BF0] cursor-pointer"
                >
                  <span>Next (→)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#ECEAE6]/55">
                <span>noise: 0.000 (STATIC)</span>
                <span>blend: NormalBlending</span>
                <span>
                  px: 1.2–2.4 · alpha: {STORY_PARTICLE_CONFIG.alphaMin}–
                  {STORY_PARTICLE_CONFIG.alphaMax}
                </span>
                <span>budget: 75% struct / 15% accent / 10% dust</span>
                {debugChapter.shape === 'tunnel' && (
                  <span>rings: {STORY_TUNNEL_CONFIG.ringCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Subtle directional vignette behind narrative copy (bottom scrim on mobile, side scrim on md+) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-0 z-[5] bg-gradient-to-t from-[#0A0A0A]/92 via-[#0A0A0A]/45 to-transparent ${
              locale === 'fa'
                ? 'md:bg-gradient-to-l md:from-[#0A0A0A]/80 md:via-[#0A0A0A]/28 md:to-transparent'
                : 'md:bg-gradient-to-r md:from-[#0A0A0A]/80 md:via-[#0A0A0A]/28 md:to-transparent'
            }`}
          />

          {/* 2. Projected 3D Labels & Leader Lines Layer */}
          {!webglFallback && (
            <Labels3D
              ref={labelsRef}
              key={activeChapter.id}
              labels={activeChapter.labels}
              locale={locale}
            />
          )}

          {/* 3. Foreground Semantic Editorial Copy */}
          <StoryText
            activeIndex={activeIndex}
            locale={locale}
            reducedMotion={reducedMotion}
            webglFallback={webglFallback}
            onOpenContact={() => {
              setSubmittedMailto(null);
              setContactOpen(true);
            }}
          />

          {/* 4. Minimal Fixed HUD + Unified Shared Bottom DockBar */}
          <StoryHud
            locale={locale}
            activeIndex={activeIndex}
            totalProgress={hudProgress}
            onJumpToChapter={handleJumpToChapter}
            onSwitchToSite={handleSwitchToSite}
            onOpenContact={() => {
              setSubmittedMailto(null);
              setContactOpen(true);
            }}
          />

          {entered && (
            <DockBar
              activeView="story"
              locale={locale}
              theme="dark"
              soundPlaying={soundEnabled}
              onToggleLocale={handleToggleLocale}
              onToggleSound={handleToggleSound}
              onBeforeSwitch={handleBeforeTabSwitch}
              onOpenDebugShapes={() => toggleDebugShapes(true)}
            />
          )}

          {/* 5. Semantic Scroll Track */}
          <main
            ref={scrollTrackRef}
            aria-label={
              locale === 'fa' ? 'داستان سه‌بعدی سهیل' : 'Soheil 3D Particle Story'
            }
            className="relative z-0 w-full"
          >
            {STORY_CHAPTERS.map((ch) => (
              <article
                key={ch.id}
                id={`story-${ch.id}`}
                style={{ height: `calc(${ch.length}vh * var(--story-ch-scale, 1))` }}
                className="w-full"
                aria-label={ch.copy[locale].kicker}
              >
                <div className="sr-only">
                  <h2>{ch.copy[locale].lines.join(' ')}</h2>
                  <p>{ch.copy[locale].body}</p>
                </div>
              </article>
            ))}
            <div aria-hidden="true" className="h-[100svh] w-full" />
          </main>

          {/* 6. Full-screen Dark Entry Gate (000 -> 100 + 01 Site / 02 Story) */}
          <AnimatePresence>
            {!entered && (
              <StoryGate
                locale={locale}
                loadProgress={loadProgress}
                isReady={isReady}
                onToggleLocale={handleToggleLocale}
                onEnterStory={handleEnterStory}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {/* 7. Direct Contact Modal (Rounded) */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A0A]/86 p-4 sm:p-6 backdrop-blur-sm"
            onClick={() => setContactOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={ui.modalTitle}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[88svh] overflow-y-auto rounded-[var(--radius-lg)] border border-[#ECEAE6]/16 bg-[#0E0E12] p-5 sm:p-9 text-[#ECEAE6] shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#ECEAE6]/12 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {ui.modalTitle}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#ECEAE6]/60">
                    {ui.modalSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  aria-label={ui.closeLabel}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ECEAE6]/65 hover:bg-white/10 hover:text-[#ECEAE6] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {submittedMailto ? (
                <div className="mt-6 space-y-5">
                  <p className="text-sm leading-relaxed text-[#ECEAE6]/80">
                    {ui.sentMsg}
                  </p>
                  <a
                    href={submittedMailto}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B5BF0] py-3.5 text-sm font-semibold text-white hover:bg-[#4949DE] transition-colors"
                  >
                    <span>{person.email}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="mt-5 sm:mt-6 space-y-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#ECEAE6]/55 mb-1.5">
                      {ui.nameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/18 bg-[#0A0A0D] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] outline-none focus:border-[#5B5BF0]"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#ECEAE6]/55 mb-1.5">
                      {ui.emailLabel}
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/18 bg-[#0A0A0D] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] outline-none focus:border-[#5B5BF0]"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#ECEAE6]/55 mb-1.5">
                      {ui.briefLabel}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={briefInput}
                      onChange={(e) => setBriefInput(e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[#ECEAE6]/18 bg-[#0A0A0D] px-4 py-2.5 text-base sm:text-sm text-[#ECEAE6] outline-none focus:border-[#5B5BF0] resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[44px] w-full rounded-full bg-[#5B5BF0] py-3 text-sm font-semibold text-white hover:bg-[#4949DE] transition-colors cursor-pointer"
                  >
                    {ui.sendLabel}
                  </button>
                </form>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-[#ECEAE6]/12 pt-4 font-mono text-xs text-[#ECEAE6]/55">
                <span>{person.email}</span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#ECEAE6]/80 hover:bg-white/10 hover:text-[#8F8FFF] transition-colors cursor-pointer"
                >
                  {copiedEmail ? (
                    <Check className="h-3.5 w-3.5 text-[#5B5BF0]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
