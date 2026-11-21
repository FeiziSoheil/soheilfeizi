import type { Locale } from '@/lib/content';

export type StoryShapeKey =
  | 'intro'
  | 'sphere'
  | 'uiPlane'
  | 'arcOrbit'
  | 'tunnel'
  | 'orbitSystem'
  | 'appTilesScattered'
  | 'appTilesFocused'
  | 'word'
  | 'portrait'
  | 'ring';

export interface StoryLabel3D {
  id: string;
  text: { en: string; fa: string };
  position: [number, number, number];
  /** Optional active chapter-progress window [min, max] where this pill highlights in accent */
  highlightRange?: [number, number];
}

export interface StoryCameraKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  roll?: number;
}

export interface StoryChapterConfig {
  id: string;
  indexLabel: string;
  shape: StoryShapeKey;
  accentColor: string;
  kicker: { en: string; fa: string };
  title: { en: string[]; fa: string[] };
  body: { en: string; fa: string };
  cameraStart: StoryCameraKeyframe;
  cameraEnd: StoryCameraKeyframe;
  /** Optional scroll height multiplier in vh (default 125vh, tunnel gets 190vh) */
  heightVh?: number;
  /** Optional 3D projected annotation pills */
  labels?: StoryLabel3D[];
  /** Whether this is the final CTA chapter */
  isOutro?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW SHAPE / CHAPTER TO THE STORY:
 * 1. Add your new key to `StoryShapeKey` above.
 * 2. Create `lib/story/shapes/<yourShape>.ts` returning `ShapeBuffer`
 *    ({ positions: Float32Array(N*3), accents: Float32Array(N) }).
 *    Mark extra ambient dust particles with `accents[i] = -1`.
 * 3. Register it in `lib/story/shapes/index.ts` inside `SHAPE_GENERATORS`.
 * 4. Add a chapter object to `STORY_CHAPTERS` below with camera keyframes,
 *    bilingual title/body, accentColor, and optional 3D `labels`.
 * ─────────────────────────────────────────────────────────────────────
 */
export const STORY_CHAPTERS: StoryChapterConfig[] = [
  {
    id: 'intro',
    indexLabel: '00',
    shape: 'intro',
    accentColor: '#5B5BF0',
    kicker: { en: 'PROLOGUE · ORIGIN', fa: 'پیش‌درآمد · نقطه آغاز' },
    title: {
      en: ["I didn't start", 'with pixels.'],
      fa: ['کارم را با', 'پیکسل شروع نکردم.'],
    },
    body: {
      en: 'Scroll to see where it began — from raw floating noise condensing into resilient architecture, typography, and motion.',
      fa: 'اسکرول کن تا ببینی از کجا شروع شد — از ذرات معلق و خام تا معماری پایدار، تایپوگرافی دقیق و حرکت.',
    },
    cameraStart: { position: [0, 0.1, 7.6], lookAt: [0, 0, 0], fov: 46, roll: 0 },
    cameraEnd: { position: [0, 0.0, 6.4], lookAt: [0, 0, 0], fov: 46, roll: 0.02 },
    heightVh: 120,
  },
  {
    id: 'sphere',
    indexLabel: '01',
    shape: 'sphere',
    accentColor: '#5B5BF0',
    kicker: { en: '01 · CORE SYSTEMS', fa: '۰۱ · هسته سیستم‌ها' },
    title: {
      en: ['Everything starts', 'at the core.'],
      fa: ['همه‌چیز از', 'هسته شکل می‌گیرد.'],
    },
    body: {
      en: 'A hollow shell of 90,000 points anchored by a dense indigo gravity well and orbital rings — representing APIs, data schemas, and real-time sync.',
      fa: 'پوسته‌ای از ۹۰ هزار ذره با چگالی نیلی در نیمکره پایینی و حلقه‌های مداری — نماد APIها، مدل داده و همگام‌سازی زنده.',
    },
    cameraStart: { position: [0.2, 0.35, 6.2], lookAt: [0, 0, 0], fov: 45, roll: 0 },
    cameraEnd: { position: [0.0, 0.1, 5.1], lookAt: [0, 0, 0], fov: 44, roll: -0.04 },
    heightVh: 125,
    labels: [
      {
        id: 'sphere-core',
        text: { en: 'Luminous Core', fa: 'هسته مرکزی' },
        position: [0.0, 0.05, 0.2],
        highlightRange: [0.0, 0.48],
      },
      {
        id: 'sphere-ring',
        text: { en: 'Orbital Sync Ring', fa: 'حلقه همگام‌سازی' },
        position: [2.15, 0.85, 0.4],
        highlightRange: [0.48, 1.0],
      },
    ],
  },
  {
    id: 'ui-plane',
    indexLabel: '02',
    shape: 'uiPlane',
    accentColor: '#5B5BF0',
    kicker: { en: '02 · INTERFACE ARCHITECTURE', fa: '۰۲ · معماری رابط کاربری' },
    title: {
      en: ['Interfaces built', 'like instruments.'],
      fa: ['رابط‌هایی با', 'دقت یک ساز.'],
    },
    body: {
      en: 'Every card, grid column, and checkout panel is reconstructed from live project geometry — framed by sharp indigo rails that respond to your perspective.',
      fa: 'هر کارت، ستون شبکه و پنل داشبورد از پیکسل‌های واقعی پروژه بازسازی می‌شود — با لبه‌های نیلی در پرسپکتیو زنده.',
    },
    cameraStart: { position: [-1.1, 0.55, 6.2], lookAt: [0, 0, 0], fov: 46, roll: -0.03 },
    cameraEnd: { position: [0.95, -0.25, 4.9], lookAt: [0, 0, 0], fov: 45, roll: 0.02 },
    heightVh: 125,
    labels: [
      {
        id: 'ui-rail',
        text: { en: 'Live Telemetry Rail', fa: 'نوار وضعیت زنده' },
        position: [-1.45, 1.32, 0.3],
        highlightRange: [0.0, 0.5],
      },
      {
        id: 'ui-cards',
        text: { en: 'Modular Bento Grid', fa: 'شبکه ماژولار' },
        position: [1.35, -0.55, 0.15],
        highlightRange: [0.5, 1.0],
      },
    ],
  },
  {
    id: 'arc-orbit',
    indexLabel: '03',
    shape: 'arcOrbit',
    accentColor: '#5B5BF0',
    kicker: { en: '03 · CONNECTED GRAPH', fa: '۰۳ · گراف یکپارچه' },
    title: {
      en: ['One continuous', 'data arc.'],
      fa: ['یک مسیر پیوسته', 'برای جریان داده.'],
    },
    body: {
      en: 'Storefront, ERP ledger, warehouse stock, and edge cache linked along a luminous elliptical trajectory — zero friction, zero dropped webhooks.',
      fa: 'فروشگاه، ERP، انبار و کش لبه روی یک مدار قوسی به هم متصل می‌شوند — بدون گلوگاه و بدون سفارش گمشده.',
    },
    cameraStart: { position: [0.0, 3.6, 5.2], lookAt: [0, 0, 0], fov: 47, roll: 0 },
    cameraEnd: { position: [0.4, 1.15, 5.5], lookAt: [0, 0, 0], fov: 45, roll: 0.03 },
    heightVh: 130,
    labels: [
      {
        id: 'arc-erp',
        text: { en: 'ERP Ledger', fa: 'هسته ERP' },
        position: [-2.2, 0.35, 0.4],
        highlightRange: [0.0, 0.34],
      },
      {
        id: 'arc-edge',
        text: { en: 'Edge Runtime', fa: 'اجرای Edge' },
        position: [0.0, 1.4, -0.6],
        highlightRange: [0.34, 0.68],
      },
      {
        id: 'arc-pos',
        text: { en: 'Global Checkout', fa: 'چک‌اوت جهانی' },
        position: [2.2, 0.25, 0.5],
        highlightRange: [0.68, 1.0],
      },
    ],
  },
  {
    id: 'tunnel',
    indexLabel: '04',
    shape: 'tunnel',
    accentColor: '#5B5BF0',
    kicker: { en: '04 · THROUGHPUT TUNNEL', fa: '۰۴ · تونل سرعت و مقیاس' },
    title: {
      en: ['Built for', 'velocity.'],
      fa: ['ساخته‌شده برای', 'سرعت واقعی.'],
    },
    body: {
      en: 'Dive straight through 48 concentric particle rings — engineered for sub-second LCP, deterministic latency, and 10x launch-day spikes without flinching.',
      fa: 'عبور مستقیم از میان ۴۸ حلقه‌ی هم‌مرکز — مهندسی‌شده برای بارگذاری زیر یک ثانیه و تحمل ده برابر ترافیک بدون افت سرعت.',
    },
    cameraStart: { position: [0, 0, 8.5], lookAt: [0, 0, -40], fov: 50, roll: 0 },
    cameraEnd: { position: [0, 0, -34.0], lookAt: [0, 0, -56], fov: 62, roll: 0.36 },
    heightVh: 200,
    labels: [
      {
        id: 'tunnel-lcp',
        text: { en: '0.7s LCP', fa: '۰.۷ ثانیه LCP' },
        position: [1.55, 0.85, -4.0],
        highlightRange: [0.05, 0.38],
      },
      {
        id: 'tunnel-stream',
        text: { en: 'Edge Streams', fa: 'استریم لبه' },
        position: [-1.6, -0.7, -17.0],
        highlightRange: [0.38, 0.7],
      },
      {
        id: 'tunnel-zero',
        text: { en: '99.98% Sync', fa: '۹۹.۹۸٪ همگام' },
        position: [1.2, 0.9, -29.0],
        highlightRange: [0.7, 0.98],
      },
    ],
  },
  {
    id: 'orbit-system',
    indexLabel: '05',
    shape: 'orbitSystem',
    accentColor: '#5B5BF0',
    kicker: { en: '05 · ECOSYSTEM', fa: '۰۵ · منظومه محصول' },
    title: {
      en: ['Every discipline', 'in orbit.'],
      fa: ['هر تخصص در', 'مدار دقیق خود.'],
    },
    body: {
      en: 'Design systems, full-stack services, shaders, and observability revolving around one bright indigo focus: measurable business impact.',
      fa: 'سیستم طراحی، بک‌اند، شیدرهای WebGL و پایش زنده همگی به دور یک سیاره‌ی نیلی می‌چرخند: نتیجه‌ی واقعی کسب‌وکار.',
    },
    cameraStart: { position: [0.3, 2.3, 6.2], lookAt: [0, 0, 0], fov: 46, roll: -0.03 },
    cameraEnd: { position: [-0.2, 1.0, 5.2], lookAt: [0, 0, 0], fov: 45, roll: 0.02 },
    heightVh: 130,
    labels: [
      {
        id: 'orbit-hero',
        text: { en: 'Core Product', fa: 'محصول اصلی' },
        position: [0.0, 0.45, 0.35],
        highlightRange: [0.45, 1.0],
      },
      {
        id: 'orbit-design',
        text: { en: 'Design System', fa: 'سیستم طراحی' },
        position: [-2.15, 0.2, 0.8],
        highlightRange: [0.0, 0.45],
      },
      {
        id: 'orbit-webgl',
        text: { en: 'GLSL Engine', fa: 'موتور GLSL' },
        position: [2.25, -0.35, -0.4],
        highlightRange: [0.2, 0.7],
      },
    ],
  },
  {
    id: 'app-tiles-1',
    indexLabel: '06',
    shape: 'appTilesScattered',
    accentColor: '#5B5BF0',
    kicker: { en: '06 · INDEPENDENT TOOLS', fa: '۰۶ · ابزارهای مستقل' },
    title: {
      en: ['Small tools,', 'sharp craft.'],
      fa: ['ابزارهای کوچک،', 'دقت بالا.'],
    },
    body: {
      en: 'Three self-initiated instruments begin to coalesce out of dust — typographic samplers, webhook bridges, and generative sound engines.',
      fa: 'سه محصول مستقل از دل گردوغبار شکل می‌گیرند — نمونه‌بردار تایپوگرافی، پل وب‌هوک و سینتی‌سایزر زایشی.',
    },
    cameraStart: { position: [0, 0.4, 7.2], lookAt: [0, 0, 0], fov: 46, roll: 0 },
    cameraEnd: { position: [0, 0.1, 6.1], lookAt: [0, 0, 0], fov: 45, roll: 0 },
    heightVh: 120,
    labels: [
      {
        id: 'tile-1a',
        text: { en: 'Khatt Studio', fa: 'Khatt Studio' },
        position: [-2.1, 1.2, 0],
        highlightRange: [0, 0.35],
      },
      {
        id: 'tile-2a',
        text: { en: 'PulseSync', fa: 'PulseSync' },
        position: [0.0, 1.2, 0],
        highlightRange: [0.35, 0.7],
      },
      {
        id: 'tile-3a',
        text: { en: 'Dastgah DSP', fa: 'Dastgah DSP' },
        position: [2.1, 1.2, 0],
        highlightRange: [0.7, 1.0],
      },
    ],
  },
  {
    id: 'app-tiles-2',
    indexLabel: '07',
    shape: 'appTilesFocused',
    accentColor: '#5B5BF0',
    kicker: { en: '07 · TACTILE PRECISION', fa: '۰۷ · جزئیات لمس‌پذیر' },
    title: {
      en: ['Locked into', 'crisp geometry.'],
      fa: ['قفل‌شده روی', 'هندسه‌ی دقیق.'],
    },
    body: {
      en: 'Move your cursor across the three illuminated tiles — horizontal cadence, architectural grid lines, and indigo lattice nodes tilt smoothly with parallax.',
      fa: 'کرسر را روی سه کاشی روشن حرکت بده — نوارهای افقی، شبکه‌ی خطوط و ماتریس نقاط نیلی با پارالاکس پاسخ می‌دهند.',
    },
    cameraStart: { position: [0, 0.05, 5.7], lookAt: [0, 0, 0], fov: 45, roll: 0 },
    cameraEnd: { position: [0, -0.05, 5.2], lookAt: [0, 0, 0], fov: 44, roll: 0 },
    heightVh: 120,
    labels: [
      {
        id: 'tile-1b',
        text: { en: '01 · Bars', fa: '۰۱ · نوارها' },
        position: [-2.15, 1.35, 0.2],
        highlightRange: [0, 0.33],
      },
      {
        id: 'tile-2b',
        text: { en: '02 · Grid', fa: '۰۲ · شبکه' },
        position: [0.0, 1.35, 0.2],
        highlightRange: [0.33, 0.66],
      },
      {
        id: 'tile-3b',
        text: { en: '03 · Indigo Matrix', fa: '۰۳ · ماتریس نیلی' },
        position: [2.15, 1.35, 0.2],
        highlightRange: [0.66, 1.0],
      },
    ],
  },
  {
    id: 'word',
    indexLabel: '08',
    shape: 'word',
    accentColor: '#5B5BF0',
    kicker: { en: '08 · PHILOSOPHY', fa: '۰۸ · فلسفه ساخت' },
    title: {
      en: ['Good code is', 'invisible.'],
      fa: ['کد خوب،', 'نامرئی است.'],
    },
    body: {
      en: 'Bold letterforms condense out of 90,000 points while their edges quietly evaporate — because great engineering disappears behind effortless user flow.',
      fa: 'حروف ضخیم از ۹۰ هزار ذره شکل می‌گیرند در حالی که لبه‌هایشان آرام تبخیر می‌شود — چون مهندسی واقعی پشت تجربه‌ی روان پنهان می‌ماند.',
    },
    cameraStart: { position: [0, 0, 6.2], lookAt: [0, 0, 0], fov: 45, roll: 0 },
    cameraEnd: { position: [0.2, 0.1, 5.5], lookAt: [0, 0, 0], fov: 46, roll: 0.015 },
    heightVh: 125,
  },
  {
    id: 'portrait',
    indexLabel: '09',
    shape: 'portrait',
    accentColor: '#5B5BF0',
    kicker: { en: '09 · THE HUMAN BEHIND IT', fa: '۰۹ · انسان پشت کد' },
    title: {
      en: ['Soheil Feizi,', 'engineer & founder.'],
      fa: ['سهیل فیضی،', 'مهندس و بنیان‌گذار.'],
    },
    body: {
      en: 'Scanned top-to-bottom from real studio light and shadow — nine years turning complex commerce, ERP, and creative WebGL visions into calm reality.',
      fa: 'اسکن‌شده از بالا به پایین از نور و سایه‌ی واقعی — نه سال تجربه‌ی تبدیل چالش‌های پیچیده‌ی تجارت و WebGL به محصولی آرام و بی‌نقص.',
    },
    cameraStart: { position: [0, 0.12, 5.6], lookAt: [0, 0, 0], fov: 44, roll: 0 },
    cameraEnd: { position: [-0.25, -0.05, 5.1], lookAt: [0, 0, 0], fov: 44, roll: -0.015 },
    heightVh: 130,
  },
  {
    id: 'outro',
    indexLabel: '10',
    shape: 'ring',
    accentColor: '#5B5BF0',
    kicker: { en: '10 · NEXT CHAPTER', fa: '۱۰ · فصل بعدی' },
    title: {
      en: ["Let's build", 'yours.'],
      fa: ['بیا پروژه‌ی', 'تو را بسازیم.'],
    },
    body: {
      en: 'Whether it is an omnichannel commerce core, a bespoke WebGL showcase, or a system that must never blink under load — reach out directly.',
      fa: 'چه یک هسته‌ی فروشگاهی پرترافیک باشد، چه یک تجربه‌ی تعاملی WebGL یا سیستمی که نباید زیر فشار بلرزد — مستقیم پیام بده.',
    },
    cameraStart: { position: [0, 0.1, 6.2], lookAt: [0, 0, 0], fov: 45, roll: 0 },
    cameraEnd: { position: [0, 0, 5.4], lookAt: [0, 0, 0], fov: 45, roll: 0.04 },
    heightVh: 130,
    isOutro: true,
  },
];

export const STORY_UI_COPY: Record<
  Locale,
  {
    brandName: string;
    brandRole: string;
    contactLink: string;
    skipToSite: string;
    soundOn: string;
    soundOff: string;
    gateTitle: string;
    gateSiteNum: string;
    gateSiteTitle: string;
    gateSiteDesc: string;
    gateStoryNum: string;
    gateStoryTitle: string;
    gateStoryDesc: string;
    gateLoading: string;
    ctaStart: string;
    ctaExplore: string;
    scrollPrompt: string;
    badgeText: string;
    fallbackNotice: string;
  }
> = {
  en: {
    brandName: 'Soheil Feizi',
    brandRole: 'Creative Systems & Full-Stack Engineer',
    contactLink: 'Contact',
    skipToSite: 'Skip to the site',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    gateTitle: 'Choose your entry',
    gateSiteNum: '01',
    gateSiteTitle: 'The site',
    gateSiteDesc: 'Full portfolio, case studies, and direct overview — silent and crisp.',
    gateStoryNum: '02',
    gateStoryTitle: 'The story',
    gateStoryDesc: 'Scroll-driven 3D WebGL particle narrative across 11 chapters.',
    gateLoading: 'BAKING 3D PARTICLE BUFFERS',
    ctaStart: 'Start a project',
    ctaExplore: 'Explore the site',
    scrollPrompt: 'Scroll to begin the journey',
    badgeText: 'STORY · 3D',
    fallbackNotice: 'Static accessible mode active (WebGL disabled or reduced motion).',
  },
  fa: {
    brandName: 'سهیل فیضی',
    brandRole: 'مهندس سیستم‌های خلاق و Full-Stack',
    contactLink: 'تماس',
    skipToSite: 'رفتن به سایت اصلی',
    soundOn: 'صدا روشن',
    soundOff: 'صدا خاموش',
    gateTitle: 'مسیر ورود را انتخاب کن',
    gateSiteNum: '۰۱',
    gateSiteTitle: 'سایت اصلی',
    gateSiteDesc: 'پورتفولیوی کامل، پروژه‌های منتخب و مرور مستقیم — سریع و بی‌صدا.',
    gateStoryNum: '۰۲',
    gateStoryTitle: 'داستان سه‌بعدی',
    gateStoryDesc: 'سفر سینمایی اسکرول‌محور با ۹۰ هزار ذره WebGL در ۱۱ فصل.',
    gateLoading: 'آماده‌سازی بافرهای سه‌بعدی ذرات',
    ctaStart: 'شروع یک پروژه',
    ctaExplore: 'مشاهده سایت اصلی',
    scrollPrompt: 'برای شروع سفر اسکرول کن',
    badgeText: 'داستان · 3D',
    fallbackNotice: 'حالت دسترسی استاتیک فعال است (بدون WebGL یا کاهش حرکت).',
  },
};
