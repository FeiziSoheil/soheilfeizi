'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { CONTENT, Locale } from '@/lib/content';
import { OWN_APPS_CONFIG } from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { soundEngine } from '@/lib/soundEngine';
import { ParticleSlot } from '@/components/ParticleSlot';
import {
  getSingularitySectionStyle,
  hasIncomingTransition,
} from '@/lib/singularity.config';

gsap.registerPlugin(ScrollTrigger);

interface TrackMetrics {
  vw: number;
  cw: number;
  gap: number;
  pad: number;
}

/**
 * Legacy helper preserved for backward compatibility.
 */
export function computeOwnAppsTrackX(
  f: number,
  cardCount: number,
  metrics: TrackMetrics,
  isRtl: boolean
): number {
  const { vw, cw, gap, pad } = metrics;
  const maxIdx = Math.max(0, cardCount - 1);
  const clampedF = Math.max(0, Math.min(maxIdx, f));
  const i0 = Math.floor(clampedF);
  const i1 = Math.min(maxIdx, Math.ceil(clampedF));
  const frac = clampedF - i0;
  const centerOf = (idx: number) => pad + idx * (cw + gap) + cw * 0.5;
  const targetCenter = gsap.utils.interpolate(centerOf(i0), centerOf(i1), frac);
  return isRtl ? targetCenter - vw * 0.5 : vw * 0.5 - targetCenter;
}

/* ─────────────────────────────────────────────────────────────
 * CURATED MICRO-METRICS & STATUS BADGES FOR 10 OWN APPS
 * ───────────────────────────────────────────────────────────── */
const APP_METRICS: Record<
  string,
  Record<Locale, Array<{ label: string; value: string }>>
> = {
  parakgram: {
    en: [
      { label: 'Stream', value: 'SSE Realtime' },
      { label: 'Security', value: 'RBAC / JWT' },
      { label: 'Caching', value: 'TanStack Query' },
    ],
    fa: [
      { label: 'جریان داده', value: 'بلادرنگ SSE' },
      { label: 'امنیت', value: 'RBAC / JWT' },
      { label: 'کشینگ', value: 'TanStack' },
    ],
  },
  'parak-rag': {
    en: [
      { label: 'Vector DB', value: 'Qdrant' },
      { label: 'Speech AI', value: 'Whisper + VAD' },
      { label: '3D Interface', value: 'React Three Fiber' },
    ],
    fa: [
      { label: 'پایگاه برداری', value: 'Qdrant' },
      { label: 'پردازش صوت', value: 'Whisper + VAD' },
      { label: 'رابط سه‌بعدی', value: 'Three Fiber' },
    ],
  },
  'parak-task-manager': {
    en: [
      { label: 'Engine', value: 'Fluid DnD Kit' },
      { label: 'Pattern', value: 'Kanban OS' },
      { label: 'State', value: 'Zustand Store' },
    ],
    fa: [
      { label: 'موتور تعامل', value: 'DnD Kit روان' },
      { label: 'الگو', value: 'کانبان هوشمند' },
      { label: 'مدیریت وضعیت', value: 'Zustand' },
    ],
  },
  'harime-mehr': {
    en: [
      { label: 'Management', value: 'Students & Tuition' },
      { label: 'Attendance', value: 'Daily Smart Logs' },
      { label: 'Architecture', value: 'Modular TS' },
    ],
    fa: [
      { label: 'مدیریت', value: 'نوآموزان و شهریه' },
      { label: 'حضور و غیاب', value: 'ثبت و پایش روزانه' },
      { label: 'هسته', value: 'ماژولار TS' },
    ],
  },
  'mana-amlak': {
    en: [
      { label: 'Filters', value: 'Multi-criteria' },
      { label: 'Deploy', value: 'GitHub Pages' },
      { label: 'Showcase', value: 'Interactive' },
    ],
    fa: [
      { label: 'جستجو', value: 'فیلتر چندمعیاره' },
      { label: 'استقرار', value: 'گیت‌هاب پیج' },
      { label: 'کاتالوگ', value: 'تعاملی' },
    ],
  },
  'artam-amlak': {
    en: [
      { label: 'Motion', value: 'Framer 60fps' },
      { label: 'Workflows', value: 'Rent / Sale' },
      { label: 'Design', value: 'Mobile-first' },
    ],
    fa: [
      { label: 'انیمیشن', value: 'Framer Motion' },
      { label: 'معاملات', value: 'رهن / خرید' },
      { label: 'طراحی', value: 'موبایل‌فرست' },
    ],
  },
  'dimplomat-amlak': {
    en: [
      { label: 'Tier', value: 'Luxury Estates' },
      { label: 'Layout', value: 'Editorial Grid' },
      { label: 'Assets', value: 'Optimized Media' },
    ],
    fa: [
      { label: 'کاربری', value: 'املاک لوکس' },
      { label: 'چیدمان', value: 'مینیمال شیک' },
      { label: 'کیفیت رسانه', value: 'بهینه‌سازی‌شده' },
    ],
  },
  'zara-elite': {
    en: [
      { label: 'Lookbook', value: 'Fashion Runway' },
      { label: 'Aesthetic', value: 'Minimal Luxury' },
      { label: 'Bundler', value: 'React + Vite' },
    ],
    fa: [
      { label: 'کاتالوگ', value: 'کالکشن فشن' },
      { label: 'رابط کاربری', value: 'مینیمال لوکس' },
      { label: 'سرعت لود', value: 'React + Vite' },
    ],
  },
  noir: {
    en: [
      { label: 'Aesthetic', value: 'Dark Minimal' },
      { label: 'Typography', value: 'Editorial Bold' },
      { label: 'Performance', value: 'Zero Bloat' },
    ],
    fa: [
      { label: 'زیبایی‌شناسی', value: 'دارک مینیمال' },
      { label: 'تایپوگرافی', value: 'برجسته و بولد' },
      { label: 'عملکرد', value: 'فوق‌العاده سریع' },
    ],
  },
  'sepas-clinic': {
    en: [
      { label: 'Transactions', value: 'ACID No-Double' },
      { label: 'AI Intake', value: 'FastAPI Stream' },
      { label: 'Backend', value: 'Go Echo v4' },
    ],
    fa: [
      { label: 'رزرو نوبت', value: 'تراکنش بدون تداخل' },
      { label: 'مصاحبه هوشمند', value: 'FastAPI' },
      { label: 'بک‌اند سازمانی', value: 'Go Echo v4' },
    ],
  },
};

const APP_BADGES: Record<string, Record<Locale, string>> = {
  parakgram: { en: 'FULL STACK', fa: 'فول‌استک' },
  'parak-rag': { en: 'MULTIMODAL AI', fa: 'هوش مصنوعی' },
  'parak-task-manager': { en: 'WORKSPACE OS', fa: 'سیستم تسک' },
  'harime-mehr': { en: 'PRESCHOOL OS', fa: 'پیش‌دبستانی' },
  'mana-amlak': { en: 'LIVE DEMO', fa: 'دموی آنلاین' },
  'artam-amlak': { en: 'LIVE DEMO', fa: 'دموی آنلاین' },
  'dimplomat-amlak': { en: 'PRESTIGE', fa: 'ویترین لوکس' },
  'zara-elite': { en: 'FASHION', fa: 'فروشگاهی' },
  noir: { en: 'STUDIO', fa: 'استودیو دارک' },
  'sepas-clinic': { en: 'HEALTHCARE EHR', fa: 'سامانه درمانی' },
};

/* ─────────────────────────────────────────────────────────────
 * MAGNETIC PILL BUTTON (Desktop fine pointer attraction)
 * ───────────────────────────────────────────────────────────── */
function MagneticPill({
  children,
  className = '',
  href,
  onClick,
  target,
  rel,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const el = ref.current;
    if (!el) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.28, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.28, ease: 'power3.out' });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = (e.clientX - cx) * 0.32;
      const dy = (e.clientY - cy) * 0.32;
      xTo(dx);
      yTo(dy);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        aria-label={ariaLabel}
        data-cursor="view"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-cursor="view"
      className={className}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 05 OWN APPS — INDEX + STAGE ARCHITECTURE
 * - Pinned sticky section driven by scrollProgress.apps
 * - Left column: Section header + vertical index of 10 projects
 *   with active indicators, click-to-scroll & Arrow key navigation
 * - Right column: Dedicated emblem stage slot (seamlessly morphs
 *   via the global L0 WebGL2 particle engine) + minimal glass info card
 * - Staggered direction-aware mask reveals, micro-metrics, tech pills & magnetic actions
 * ───────────────────────────────────────────────────────────── */
export function OwnAppsSection({
  locale,
  onPlaySynth,
  onJumpToApp,
}: {
  locale: Locale;
  onPlaySynth: () => void;
  onJumpToApp?: (appIdx: number) => void;
}) {
  const t = CONTENT[locale];
  const isRtl = locale === 'fa';

  const apps = t.apps.items;
  const totalApps = apps.length;

  // Total height: 80vh per app + 40vh final hold on desktop
  const totalHeightVh = totalApps * OWN_APPS_CONFIG.scrollPerAppVh + OWN_APPS_CONFIG.endHoldVh;
  const mobileTotalHeightVh = totalApps * 55 + 30;

  // Smooth hold on final project
  const scrollableSpanVh = Math.max(1, totalHeightVh - 100);
  const holdFrac = Math.min(0.35, OWN_APPS_CONFIG.endHoldVh / scrollableSpanVh);

  // Compute discrete active app index driven by scroll — zero per-frame React re-renders!
  const scrollActiveIdx = useScrollStore((s) => {
    const p = s.sectionProgress.apps;
    const pEff = Math.max(0, Math.min(0.9999, p / Math.max(0.01, 1 - holdFrac)));
    return Math.min(totalApps - 1, Math.max(0, Math.floor(pEff * totalApps)));
  });

  // Interactive selection state for 0ms instant response on click
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [prevScrollActiveIdx, setPrevScrollActiveIdx] = useState(scrollActiveIdx);

  if (prevScrollActiveIdx !== scrollActiveIdx) {
    setPrevScrollActiveIdx(scrollActiveIdx);
    setSelectedIdx(null);
  }

  const activeIdx = selectedIdx !== null ? selectedIdx : scrollActiveIdx;
  const activeApp = apps[activeIdx] ?? apps[0];

  const setAppsActiveIndex = useScrollStore((s) => s.setAppsActiveIndex);

  // Keep scrollStore updated so SiteParticleStage morphs immediately
  useEffect(() => {
    setAppsActiveIndex(activeIdx);
  }, [activeIdx, setAppsActiveIndex]);

  const handleSelectApp = (idx: number) => {
    soundEngine.playStippleTick();
    setSelectedIdx(idx);
    setAppsActiveIndex(idx);
    onJumpToApp?.(idx);
  };

  // Sound feedback on active app transition
  const lastActiveRef = useRef(activeIdx);
  useEffect(() => {
    if (lastActiveRef.current !== activeIdx) {
      lastActiveRef.current = activeIdx;
      soundEngine.playStippleTick();
    }
  }, [activeIdx]);

  // Direction-aware stagger slide-up mask animation for the glass card content
  const cardRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const items = card.querySelectorAll('[data-stagger-item]');
    if (items.length === 0) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });
    tl.fromTo(
      items,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.36, stagger: 0.035 }
    );

    return () => {
      tl.kill();
    };
  }, [activeIdx]);

  // Keyboard navigation handler (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'ArrowDown' ||
      (isRtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight')
    ) {
      e.preventDefault();
      const nextIdx = Math.min(totalApps - 1, activeIdx + 1);
      if (nextIdx !== activeIdx) {
        handleSelectApp(nextIdx);
      }
    } else if (
      e.key === 'ArrowUp' ||
      (isRtl ? e.key === 'ArrowRight' : e.key === 'ArrowLeft')
    ) {
      e.preventDefault();
      const prevIdx = Math.max(0, activeIdx - 1);
      if (prevIdx !== activeIdx) {
        handleSelectApp(prevIdx);
      }
    }
  };

  const activeMetrics =
    APP_METRICS[activeApp.id]?.[locale] ?? [
      { label: 'Architecture', value: 'Production' },
      { label: 'Quality', value: 'Full-Stack' },
      { label: 'Status', value: 'Active' },
    ];

  const activeBadge =
    APP_BADGES[activeApp.id]?.[locale] ?? (isRtl ? 'پروژه فعال' : 'ACTIVE');

  return (
    <section
      id="apps"
      data-section="apps"
      data-theme="dark"
      data-mobile-height=""
      className={`pin-section ${
        hasIncomingTransition('apps') ? '' : 'border-t border-[var(--hairline)]'
      } bg-transparent text-[#ECEBE7]`}
      style={getSingularitySectionStyle(
        'apps',
        `${totalHeightVh}svh`,
        `${mobileTotalHeightVh}svh`
      )}
    >
      <div
        className="pin-sticky relative z-10 flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-16 pt-12 sm:pt-14 pb-18 sm:pb-22 select-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={t.apps.heading}
      >
        {/* Top Header Row: Section Kicker & Live Project Counter */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs sm:text-sm font-semibold tracking-[0.16em] text-[#5B5BF0]">
              {t.apps.kicker}
            </span>
            <span className="hidden sm:inline-block h-3.5 w-[1px] bg-white/20" />
            <span className="hidden sm:inline-block font-mono text-xs opacity-60">
              {locale === 'fa' ? 'فهرست و صحنه پروژه‌ها' : 'Index & Stage'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm tabular-nums text-white/80">
            <span className="font-bold text-[#5B5BF0]">
              {String(activeIdx + 1).padStart(2, '0')}
            </span>
            <span className="opacity-40">/</span>
            <span className="opacity-60">{String(totalApps).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Mobile Horizontal Pill Selector (< lg screens) */}
        <div className="flex lg:hidden w-full overflow-x-auto no-scrollbar py-2.5 gap-2 border-b border-white/5">
          {apps.map((app, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleSelectApp(idx)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5B5BF0] text-white font-bold shadow-[0_0_16px_rgba(91,91,240,0.5)]'
                    : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>{String(idx + 1).padStart(2, '0')}</span>
                <span className="truncate max-w-[100px]">{app.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Center Split: Left Column (Index) | Right Column (Stage) */}
        <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center py-2 sm:py-4">
          {/* ─────────────────────────────────────────────────────────────
           * LEFT COLUMN: THE INDEX (Desktop Only, lg+)
           * Section Heading + Vertical List of 10 Projects with Progress Rail
           * ───────────────────────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:col-span-5 h-full max-h-[72svh] flex-col justify-between pe-4">
            <div>
              <h2 className="display-xl text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-[1.08] text-white">
                {t.apps.heading}
              </h2>
              <p className="mt-2 text-xs font-mono text-white/50 tracking-wider">
                {locale === 'fa'
                  ? 'برای جابه‌جایی کلیک کنید یا کلیدهای جهت‌نما را بفشارید'
                  : 'Click or use arrow keys ↑ ↓ to navigate projects'}
              </p>
            </div>

            {/* Vertical Project Index with Thin Progress Rail */}
            <div className="relative flex items-stretch gap-4 my-auto py-2">
              {/* Thin Vertical Progress Rail */}
              <div className="relative w-[2px] bg-white/10 rounded-full my-1 overflow-hidden shrink-0">
                <div
                  className="w-full bg-[#5B5BF0] rounded-full transition-all duration-200"
                  style={{
                    height: `${Math.min(
                      100,
                      Math.max(8, ((activeIdx + 1) / totalApps) * 100)
                    )}%`,
                  }}
                />
              </div>

              {/* 10-Item Vertical List */}
              <nav
                className="flex flex-col gap-1.5 w-full"
                aria-label={locale === 'fa' ? 'فهرست پروژه‌ها' : 'Projects index'}
              >
                {apps.map((app, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleSelectApp(idx)}
                      className={`group flex items-center justify-between w-full rounded-xl px-3 py-2 text-start transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-white/[0.06] border border-[#5B5BF0]/40 text-white shadow-[0_4px_20px_rgba(91,91,240,0.15)]'
                          : 'border border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`font-mono text-xs tabular-nums transition-colors ${
                            isActive
                              ? 'text-[#5B5BF0] font-bold'
                              : 'text-white/40 group-hover:text-white/60'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-sm tracking-tight truncate transition-all ${
                            isActive
                              ? 'font-bold text-white scale-[1.02] origin-start'
                              : 'font-normal'
                          }`}
                        >
                          {app.name}
                        </span>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-[#8F8FFF] uppercase tracking-wider">
                            {app.year}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-[#5B5BF0] shadow-[0_0_8px_#5B5BF0]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Subtle GitHub Direct Link */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/50">
              <span>{locale === 'fa' ? 'کد منبع آزاد' : 'Open Source Repos'}</span>
              <a
                href={OWN_APPS_CONFIG.githubUrl}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                className="inline-flex items-center gap-1 text-[#8F8FFF] hover:text-[#5B5BF0] transition-colors"
              >
                <span>github.com/soheilfeizi</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
           * RIGHT COLUMN: THE STAGE (Top Emblem + Minimalist Glass Info Card)
           * ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 h-full flex flex-col justify-center gap-2 xs:gap-2.5 sm:gap-4 max-h-[82svh] sm:max-h-[78svh]">
            {/* 1. TOP: ARCHITECTURAL PARTICLE EMBLEM STAGE SLOT */}
            <div className="relative w-full h-[115px] xs:h-[135px] sm:h-[200px] lg:h-[220px] flex items-center justify-center shrink-0">
              {/* Subtle Ambient Radial Glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(91,91,240,0.18) 0%, rgba(91,91,240,0.04) 45%, transparent 72%)',
                }}
              />

              {/* Global Element-Locked Particle Slot on L0 WebGL2 Stage */}
              <ParticleSlot
                slotId="app-emblem"
                descriptor={`svg:app-${activeApp.id}`}
                aria-label={`${activeApp.name} emblem`}
                className="w-full h-full"
              />

              {/* Decorative Corner Framing Crosshairs */}
              <div className="pointer-events-none absolute inset-x-2 inset-y-1 flex flex-col justify-between opacity-25">
                <div className="flex justify-between font-mono text-[9px] text-[#5B5BF0]">
                  <span>+</span>
                  <span>+</span>
                </div>
                <div className="flex justify-between font-mono text-[9px] text-[#5B5BF0]">
                  <span>+</span>
                  <span>+</span>
                </div>
              </div>
            </div>

            {/* 2. BOTTOM: MINIMALIST GLASS INFORMATION CARD */}
            <article
              ref={cardRef}
              className="relative w-full rounded-[var(--radius-lg)] border border-white/10 bg-[#0B0B10]/90 p-3.5 xs:p-4 sm:p-7 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7),0_0_40px_rgba(91,91,240,0.06)] flex flex-col justify-between overflow-hidden mt-3 xs:mt-4 sm:mt-0"
            >
              {/* Row 1: Metadata + Status Chip */}
              <div
                data-stagger-item=""
                className="flex items-center justify-between gap-3 font-mono text-[11px] sm:text-xs"
              >
                <div className="flex items-center gap-2 text-[#8F8FFF] font-semibold">
                  <span className="text-[#5B5BF0]">
                    {String(activeIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{activeApp.year}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/40 bg-[#5B5BF0]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#8F8FFF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5B5BF0] animate-pulse" />
                  <span>{activeBadge}</span>
                </div>
              </div>

              {/* Row 2: Big Bold Title with Overflow Mask Container */}
              <div className="overflow-hidden mt-2 sm:mt-3">
                <h3
                  data-stagger-item=""
                  className="display-xl text-xl sm:text-3xl lg:text-4xl text-white font-extrabold tracking-tight truncate leading-tight"
                >
                  {activeApp.name}
                </h3>
              </div>

              {/* Row 3: Tagline */}
              <p
                data-stagger-item=""
                className="mt-1 sm:mt-2 text-xs sm:text-base font-medium text-white/90 leading-snug line-clamp-2"
              >
                {activeApp.tagline}
              </p>

              {/* Row 4: Detailed Description */}
              <p
                data-stagger-item=""
                className="mt-1 sm:mt-2 text-[11px] sm:text-xs font-light text-white/70 leading-relaxed line-clamp-3"
              >
                {activeApp.detail}
              </p>

              {/* Row 5: 3 Micro-Metrics Grid */}
              <div
                data-stagger-item=""
                className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-2 sm:py-2.5 font-mono"
              >
                {activeMetrics.map((m, mIdx) => (
                  <div key={mIdx} className="flex flex-col min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-white/45 truncate uppercase tracking-wider">
                      {m.label}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-white/90 truncate">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Row 6: Tech Stack Chips */}
              <div
                data-stagger-item=""
                className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2"
              >
                {activeApp.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-white/75"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Row 7: Action Buttons with Magnetic Hover Effect */}
              <div
                data-stagger-item=""
                className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-3 pt-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Primary Action Button (GitHub or Live Demo) */}
                  <MagneticPill
                    href={activeApp.url || OWN_APPS_CONFIG.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => soundEngine.playStippleTick()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/50 bg-[#5B5BF0] px-3.5 sm:px-4 py-1.5 font-mono text-xs font-semibold text-white shadow-[0_4px_16px_rgba(91,91,240,0.35)] hover:bg-[#4848D6] hover:shadow-[0_6px_22px_rgba(91,91,240,0.5)] transition-all cursor-pointer"
                  >
                    <span>{activeApp.urlLabel || (locale === 'fa' ? 'مشاهده در گیت‌هاب' : 'View on GitHub')}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </MagneticPill>

                  {/* Special Synth trigger for dastgah if present */}
                  {activeApp.id === 'dastgah' && (
                    <MagneticPill
                      onClick={() => {
                        soundEngine.playStippleTick();
                        onPlaySynth();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#5B5BF0]/40 bg-[#5B5BF0]/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-[#8F8FFF] hover:bg-[#5B5BF0] hover:text-white transition-all cursor-pointer"
                    >
                      <span>{locale === 'fa' ? 'اجرای سینت' : 'Play Synth'}</span>
                      <Sparkles className="h-3.5 w-3.5" />
                    </MagneticPill>
                  )}
                </div>

                {/* Subtitle Counter in Card Footer */}
                <span className="font-mono text-[10px] sm:text-[11px] text-white/40">
                  {locale === 'fa'
                    ? `پروژه ${activeIdx + 1} از ${totalApps}`
                    : `Project ${activeIdx + 1} of ${totalApps}`}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
 * 06 EXPERIENCE (Light, steps = 5 -> 500svh sticky)
 * - Sticky giant year with vertical DIGIT ROLL cylinder driven by p
 * - Scrolling roles highlighting centered active role
 * - Infinite tech marquee whose velocity reacts to Lenis scrollVelocity
 * ───────────────────────────────────────────────────────────── */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DigitRollYear({ yearFloat }: { yearFloat: number }) {
  const clamped = Math.max(0, Math.min(9999, yearFloat));
  const floorYear = Math.floor(clamped);
  const frac = clamped - floorYear;

  const nextYear = Math.min(9999, floorYear + 1);
  const sCur = String(floorYear).padStart(4, '0');
  const sNext = String(nextYear).padStart(4, '0');

  // Smoothly roll every digit that changes between floorYear and nextYear
  const cols = [0, 1, 2, 3].map((idx) => {
    const a = Number(sCur[idx]);
    const b = Number(sNext[idx]);
    if (a === b) return a;
    if (idx === 3) {
      // Smooth continuous roll on ones digit (handles 9 -> 0 cleanly)
      return a === 9 && b === 0 ? 9 + frac : a + (b - a) * frac;
    }
    // Smooth roll on tens/hundreds only in the final 35% of the transition
    const t = Math.max(0, Math.min(1, (frac - 0.65) / 0.35));
    const smoothT = t * t * (3 - 2 * t);
    return a + (b - a) * smoothT;
  });

  const roundedStr = String(Math.round(clamped)).padStart(4, '0');
  const reelDigits = [...DIGITS, 0];

  return (
    <div
      dir="ltr"
      aria-label={roundedStr}
      className="grid w-full grid-cols-4 items-center font-mono text-[clamp(3rem,min(17vw,22svh),14.5rem)] sm:text-[clamp(3.75rem,min(13.2vw,30svh),14.5rem)] font-black leading-[0.88] tracking-[-0.06em] select-none"
    >
      {cols.map((val, cIdx) => (
        <span
          key={cIdx}
          className="relative flex h-[0.94em] w-full items-start justify-center overflow-hidden"
        >
          <span
            className="flex w-full flex-col will-change-transform transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(0, -${(val / reelDigits.length) * 100}%, 0)`,
            }}
          >
            {reelDigits.map((d, rIdx) => (
              <span
                key={rIdx}
                className="flex h-[0.94em] w-full items-center justify-center leading-none"
              >
                {d}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

function VelocityTechMarquee({ items }: { items: string[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let offset = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const vel = Math.abs(useScrollStore.getState().scrollVelocity);
      // Base speed + proportional acceleration from Lenis scroll velocity
      const speed = 38 + Math.min(340, vel * 5.2);
      offset += speed * dt;

      const el = trackRef.current;
      if (el) {
        const halfW = el.scrollWidth * 0.5;
        if (halfW > 0 && offset >= halfW) {
          offset -= halfW;
        }
        el.style.transform = `translate3d(-${offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const repeated = [...items, ...items];

  return (
    <div
      dir="ltr"
      className="w-full overflow-hidden border-y border-[var(--hairline)] py-3"
    >
      <div
        ref={trackRef}
        className="flex w-max items-center gap-10 whitespace-nowrap font-mono text-xs sm:text-sm tracking-tight opacity-80 will-change-transform"
      >
        {repeated.map((tech, idx) => (
          <span key={`${tech}-${idx}`} className="inline-flex items-center gap-10">
            <span>{tech}</span>
            <span className="h-1 w-1 rounded-full bg-[#5B5BF0]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ExperienceSection({
  locale,
  onJumpToRole,
}: {
  locale: Locale;
  onJumpToRole?: (roleIdx: number) => void;
}) {
  const t = CONTENT[locale];
  const p = useScrollStore((s) => s.sectionProgress.experience);

  const roles = t.experience.roles;
  // Smooth continuous interpolation across role years (e.g. 2023 -> 2021 -> 2019 -> 2017)
  const floatIdx = p * (roles.length - 1);
  const lowIdx = Math.floor(floatIdx);
  const highIdx = Math.min(roles.length - 1, lowIdx + 1);
  const frac = floatIdx - lowIdx;
  const yearFloat =
    roles[lowIdx].year + (roles[highIdx].year - roles[lowIdx].year) * frac;
  const activeIdx = Math.round(floatIdx);
  const activeRole = roles[activeIdx] ?? roles[0];

  return (
    <section
      id="experience"
      data-section="experience"
      data-theme="light"
      data-mobile-height=""
      className={`pin-section ${hasIncomingTransition('experience') ? '' : 'border-t border-[var(--hairline)]'} bg-transparent`}
      style={getSingularitySectionStyle('experience', '500svh', '320svh')}
    >
      <div className="pin-sticky relative z-10 flex flex-col justify-between px-4 sm:px-8 lg:px-14 pt-14 sm:pt-20 pb-20 sm:pb-24">
        {/* Top Metadata Strip */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--hairline)] pb-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-xs font-medium text-[#5B5BF0]">
              {t.experience.kicker}
            </span>
            <span className="font-mono text-xs opacity-55">
              {t.experience.sinceLabel}
            </span>
          </div>
          <div className="font-mono text-xs opacity-65 tabular-nums">
            {activeRole?.period} · {activeRole?.location}
          </div>
        </div>

        {/* Main Side-by-Side Split: Giant Rolling Year | Interactive Career Timeline */}
        <div className="flex flex-col justify-center sm:grid sm:grid-cols-12 sm:items-center gap-4 sm:gap-8 lg:gap-12 flex-1 min-h-0 py-2 sm:py-3">
          {/* Side A: Monumental Digit-Roll Year with interactive chapter indicators */}
          <div className="sm:col-span-6 lg:col-span-7 flex flex-col justify-center min-w-0">
            <DigitRollYear yearFloat={yearFloat} />

            {/* Interactive 4-chapter timeline bar anchored under the year */}
            <div className="mt-3 sm:mt-4 flex items-center gap-2">
              {roles.map((r, idx) => (
                <button
                  key={r.year}
                  type="button"
                  onClick={() => {
                    soundEngine.playStippleTick();
                    onJumpToRole?.(idx);
                  }}
                  className="group flex-1 py-1 cursor-pointer text-start min-w-0"
                  aria-label={`Role ${r.year}`}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={`font-mono text-[10px] sm:text-xs transition-colors truncate ${
                        idx === activeIdx
                          ? 'font-bold text-[#5B5BF0]'
                          : 'opacity-40 group-hover:opacity-75'
                      }`}
                    >
                      {r.period.split('—')[0].trim()}
                    </span>
                  </div>
                  <div
                    className={`h-[3px] w-full rounded-full transition-colors duration-300 ${
                      idx === activeIdx
                        ? 'bg-[#5B5BF0]'
                        : idx < activeIdx
                          ? 'bg-current opacity-40'
                          : 'bg-[var(--hairline)]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Side B: Career Roles Timeline (harmonious across mobile & desktop) */}
          <div className="sm:col-span-6 lg:col-span-5 flex flex-col justify-center min-w-0 mt-4 sm:mt-0">
            <div className="flex flex-col gap-3.5 sm:gap-4 lg:gap-4.5">
              {roles.map((role, idx) => {
                const dist = Math.abs(idx - floatIdx);
                const isActive = idx === activeIdx;
                const opacity = Math.max(0.32, 1 - dist * 0.42);
                return (
                  <button
                    key={`${role.company}-${role.year}`}
                    type="button"
                    onClick={() => {
                      soundEngine.playStippleTick();
                      onJumpToRole?.(idx);
                    }}
                    className={`text-start border-s-2 ps-4 pe-2.5 py-2.5 sm:py-3 rounded-e-md transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'border-[#5B5BF0] bg-[rgba(91,91,240,0.04)]'
                        : 'border-[var(--hairline)] hover:border-[rgba(91,91,240,0.4)]'
                    }`}
                    style={{ opacity }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xs sm:text-sm lg:text-base font-extrabold tracking-tight leading-snug">
                        {role.role}
                      </h3>
                      <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[#5B5BF0] tabular-nums shrink-0">
                        {role.period}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] sm:text-[11px] opacity-65 truncate">
                      {role.company} · {role.location}
                    </div>
                    <p
                      className={`mt-1.5 text-[11px] sm:text-xs lg:text-[13px] font-light leading-relaxed opacity-85 transition-all ${
                        isActive
                          ? 'line-clamp-2 sm:line-clamp-3'
                          : 'line-clamp-1 opacity-55'
                      }`}
                    >
                      {role.note}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Velocity-Reactive Infinite Tech Marquee */}
        <div className="w-full pt-2">
          <VelocityTechMarquee items={t.experience.techStack} />
        </div>
      </div>
    </section>
  );
}
