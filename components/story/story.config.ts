import type { Locale } from '@/lib/content';

export type ShapeId =
  | 'introCloud'
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

export interface StoryLabel3DConfig {
  id: string;
  /** 3D world anchor relative to particle cloud origin */
  position: [number, number, number];
  /** Screen-space offset for the pill end of the leader line (px) */
  offsetPx?: [number, number];
  /** Optional local scroll window [start, end] inside the chapter (0..1) */
  visibleRange?: [number, number];
  /** Mark as highlighted accent label */
  accent?: boolean;
  text: Record<Locale, string>;
  subtext?: Record<Locale, string>;
}

export interface StoryCameraRig {
  /** Base camera position [x, y, z] in LTR (x automatically mirrors in RTL) */
  position: [number, number, number];
  /** End camera position at end of hold/travel phase */
  positionEnd: [number, number, number];
  /** Look-at target [x, y, z] */
  lookAt: [number, number, number];
  /** Base FOV in degrees */
  fov: number;
  /** Camera roll in radians at chapter peak */
  roll?: number;
}

export interface StoryChapterConfig {
  id: string;
  indexLabel: string;
  shape: ShapeId;
  /** Scroll length of this chapter in viewport heights (vh). Regular: 250, Tunnel: 480. */
  length: number;
  accentColor: string;
  /** Subtle bounded ambient oscillation amplitude of the particle cloud [x, y] */
  cloudRotation?: [number, number];
  camera: StoryCameraRig;
  labels: StoryLabel3DConfig[];
  copy: Record<
    Locale,
    {
      kicker: string;
      lines: string[];
      body: string;
      note?: string;
    }
  >;
  isClosingCta?: boolean;
}

export const STORY_ACCENT = '#5B5BF0';

/**
 * Centralized Phase & Pacing Config
 * Standard chapters: enter (0..0.15) -> hold (0.15..0.80) -> exit/morph (0.80..1.00)
 * Tunnel chapter:    enter (0..0.10) -> travel (0.10..0.88) -> exit/morph (0.90..1.00)
 */
export const STORY_PHASES = {
  enterEnd: 0.15,
  holdEnd: 0.80,
  exitStart: 0.80,
  tunnelTravelStart: 0.10,
  tunnelTravelEnd: 0.88,
  tunnelExitStart: 0.90,
  tunnelConvergeStart: 0.85,
} as const;

/**
 * Centralized Tunnel Geometry Config
 * Length is mathematically derived from camera Z travel distance so rings ALWAYS
 * extend well past zEnd and the tunnel never terminates prematurely.
 */
export const STORY_TUNNEL_CONFIG = {
  zStart: 11.5,
  zEnd: -25.5,
  ringSpacing: 0.85,
  /** ringCount = ceil((zStart - zEnd) / ringSpacing) + 12 */
  get ringCount() {
    return Math.ceil((this.zStart - this.zEnd) / this.ringSpacing) + 12;
  },
  /** Converged luminous focal star right ahead of zEnd */
  starZ: -29.2,
} as const;

/**
 * Centralized Particle Rendering, Noise & Morph Damping Parameters
 * Tuned so every shape is razor-sharp, countable (1.2–2.4px), and calm during hold.
 */
export const STORY_PARTICLE_CONFIG = {
  /** Base point size unit fed into: uSize * (0.8 + aRandom.x * 0.7) * uPixelRatio * (uScale / -mvPosition.z) */
  size: 1.55,
  /** Distance reference scale so at typical cam Z ~ 7.0, final CSS size sits strictly in 1.2..2.4px */
  scale: 6.9,
  /** Per-particle alpha range (NormalBlending prevents muddy gray/white saturation) */
  alphaMin: 0.35,
  alphaMax: 0.70,
  /** Subtle ambient dust alpha */
  dustAlpha: 0.18,
  /** Hold idle noise <= 0.4% of ~3-unit shape (~0.011 world units) */
  baseNoise: 0.011,
  /** Expressive turbulence appearing ONLY mid-morph via sin(uProgress * PI) */
  morphNoise: 0.38,
  /** Staggered particle morph wave spread (0..0.35) */
  maxDelay: 0.35,
  /** Smooth damping lambda for THREE.MathUtils.damp (between 1.8 and 3.0) */
  smoothLambda: 2.2,
  /** Strict velocity ceiling on uProgress change per second */
  maxMorphRatePerSec: 1.2,
  /** Particle distribution budgets */
  budget: {
    structure: 0.75,
    accent: 0.15,
    dust: 0.10,
  },
  /** Lenis smooth scrolling parameters (no forced scroll-snap) */
  lenis: {
    lerp: 0.07,
    wheelMultiplier: 0.8,
  },
} as const;

/**
 * Exact 3D anchor points for the 3 Trajectory milestone nodes (shared between
 * geometry generator and 3D labels so leader lines lock onto exact hollow node shells).
 */
export const ARC_ORBIT_NODE_TS = [0.14, 0.5, 0.86] as const;

export function evaluateArcOrbitPoint(t: number): [number, number, number] {
  const angle = (t - 0.5) * Math.PI * 1.04;
  const radiusX = 3.1;
  const radiusY = 1.85;
  const x = Math.sin(angle) * radiusX;
  const y = Math.cos(angle) * radiusY - 0.55;
  const z = Math.sin(angle * 2.0) * 0.42 - Math.cos(angle) * 0.2;
  return [x, y, z];
}

const ARC_NODE_0 = evaluateArcOrbitPoint(ARC_ORBIT_NODE_TS[0]);
const ARC_NODE_1 = evaluateArcOrbitPoint(ARC_ORBIT_NODE_TS[1]);
const ARC_NODE_2 = evaluateArcOrbitPoint(ARC_ORBIT_NODE_TS[2]);

/**
 * Declarative Story Configuration
 * Reorder chapters, adjust scroll `length`, edit bilingual copy, tweak camera rigs,
 * or swap `shape` IDs without touching any WebGL shader or timeline code.
 */
export const STORY_CHAPTERS: StoryChapterConfig[] = [
  {
    id: 'intro',
    indexLabel: '00',
    shape: 'introCloud',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.04, 0.09],
    camera: {
      position: [0, 0.05, 8.2],
      positionEnd: [0, 0.0, 7.5],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [],
    copy: {
      en: {
        kicker: '00 · PROLOGUE',
        lines: ["I didn't start with", 'commerce systems.'],
        body: 'Scroll to see where it began — every interface, architecture, and product starts as suspended noise before finding form.',
        note: 'Scroll down to condense the field',
      },
      fa: {
        kicker: '۰۰ · آغاز',
        lines: ['من از اول سراغ', 'سیستم‌های فروش نرفتم.'],
        body: 'اسکرول کن تا ببینی از کجا شروع شد — هر معماری و محصولی قبل از شکل گرفتن، ابری از ذرات معلق است.',
        note: 'برای متراکم شدن ذرات اسکرول کن',
      },
    },
  },
  {
    id: 'sphere',
    indexLabel: '01',
    shape: 'sphere',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.05, 0.18],
    camera: {
      position: [0.15, 0.35, 7.4],
      positionEnd: [0.05, 0.12, 6.7],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'sphere-core',
        position: [0, 0.0, 0.44],
        offsetPx: [74, -56],
        accent: true,
        text: { en: 'Core Engine', fa: 'هسته‌ی مرکزی' },
        subtext: { en: 'Deterministic state', fa: 'وضعیت قطعی' },
      },
      {
        id: 'sphere-orbit',
        position: [2.95, 0.25, 0.15],
        offsetPx: [48, -32],
        text: { en: 'Edge Layer', fa: 'لایه‌ی لبه' },
      },
    ],
    copy: {
      en: {
        kicker: '01 · FIRST PRINCIPLES',
        lines: ['A quiet core', 'under high pressure.'],
        body: 'Before visuals or frameworks, a resilient system needs an uncluttered center of gravity — hollow structural clarity, luminous core, and clean orbital boundaries.',
      },
      fa: {
        kicker: '۰۱ · اصول پایه',
        lines: ['هسته‌ای آرام', 'زیر فشار بالا.'],
        body: 'قبل از هر فریم‌ورک و ظاهر، یک سیستم ماندگار به مرکز ثقل شفاف نیاز دارد؛ پوسته‌ای منظم، هسته‌ی روشن در درون و مدارهای دقیق در پیرامون.',
      },
    },
  },
  {
    id: 'ui-plane',
    indexLabel: '02',
    shape: 'uiPlane',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.02, 0.04],
    camera: {
      position: [-0.35, 0.2, 6.8],
      positionEnd: [0.15, 0.05, 6.3],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'ui-cta',
        position: [-1.42, 0.22, 0.36],
        offsetPx: [-34, -52],
        accent: true,
        text: { en: 'Primary CTA', fa: 'دکمه‌ی اصلی' },
      },
      {
        id: 'ui-cards',
        position: [1.48, -0.45, -0.35],
        offsetPx: [52, 30],
        text: { en: '3-Card Catalog Grid', fa: 'شبکه‌ی ۳ کارتی محصول' },
      },
    ],
    copy: {
      en: {
        kicker: '02 · INTERFACE CRAFT',
        lines: ['Interfaces that feel', 'like instruments.'],
        body: 'From real production storefronts to operational dashboards — every navbar, hero CTA, product grid, and footer is drawn with deliberate rhythm and zero clutter.',
      },
      fa: {
        kicker: '۰۲ · مهندسی رابط کاربری',
        lines: ['رابط‌هایی با حس', 'یک ساز دقیق.'],
        body: 'از فروشگاه‌های عملیاتی واقعی تا داشبوردهای پرترافیک — هر نوار بالا، دکمه‌ی اصلی، کارت محصول و فوتر با نظم هندسی و خوانایی کامل طراحی می‌شود.',
      },
    },
  },
  {
    id: 'arc-orbit',
    indexLabel: '03',
    shape: 'arcOrbit',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.02, 0.05],
    camera: {
      position: [0.0, 0.85, 7.2],
      positionEnd: [0.0, 0.35, 6.8],
      lookAt: [0, 0.15, 0],
      fov: 45,
    },
    labels: [
      {
        id: 'arc-discover',
        position: ARC_NODE_0,
        offsetPx: [-30, -48],
        text: { en: 'Discover', fa: 'کشف' },
      },
      {
        id: 'arc-architect',
        position: ARC_NODE_1,
        offsetPx: [0, -54],
        accent: true,
        text: { en: 'Architect', fa: 'معماری' },
      },
      {
        id: 'arc-ship',
        position: ARC_NODE_2,
        offsetPx: [36, -48],
        text: { en: 'Launch & Scale', fa: 'لانچ و مقیاس' },
      },
    ],
    copy: {
      en: {
        kicker: '03 · TRAJECTORY',
        lines: ['Every milestone', 'connected in motion.'],
        body: 'Discovery, architecture, and launch are not isolated handoffs — they form one clean arc where a single traveling signal ties product strategy directly to scale.',
      },
      fa: {
        kicker: '۰۳ · مسیر اجرا',
        lines: ['هر مرحله متصل در', 'یک مدار یکپارچه.'],
        body: 'کشف، معماری و لانچ جزیره‌های جدا نیستند؛ سه گره روی یک قوس تمیز و پیوسته‌اند که پیشرفت پروژه را گام‌به‌گام به مقیاس می‌رسانند.',
      },
    },
  },
  {
    id: 'tunnel',
    indexLabel: '04',
    shape: 'tunnel',
    length: 480,
    accentColor: STORY_ACCENT,
    cloudRotation: [0, 0],
    camera: {
      position: [0, 0, STORY_TUNNEL_CONFIG.zStart],
      positionEnd: [0, 0, STORY_TUNNEL_CONFIG.zEnd],
      lookAt: [0, 0, STORY_TUNNEL_CONFIG.zEnd - 16],
      fov: 50,
      roll: 0.36,
    },
    labels: [
      {
        id: 'tunnel-01',
        position: [2.1, 0.85, 2.5],
        offsetPx: [44, -26],
        visibleRange: [0.12, 0.38],
        text: { en: 'Sub-30ms Search', fa: 'جست‌وجوی زیر ۳۰ms' },
      },
      {
        id: 'tunnel-02',
        position: [-2.05, -0.7, -8.0],
        offsetPx: [-34, 34],
        visibleRange: [0.34, 0.64],
        accent: true,
        text: { en: 'Zero-Downtime Sync', fa: 'همگام‌سازی بدون قطعی' },
      },
      {
        id: 'tunnel-03',
        position: [1.95, -0.55, -18.5],
        offsetPx: [42, 26],
        visibleRange: [0.58, 0.84],
        text: { en: '10× Peak Throughput', fa: 'تحمل ۱۰ برابر ترافیک' },
      },
    ],
    copy: {
      en: {
        kicker: '04 · THROUGHPUT',
        lines: ['Built to accelerate', 'when load spikes.'],
        body: 'Fly the full length of the pipeline: edge caching, idempotent queues, and live ERP synchronization keep millions of events flowing without friction until convergence.',
      },
      fa: {
        kicker: '۰۴ · تونل پردازش',
        lines: ['ساخته‌شده برای سرعت', 'در اوج ترافیک.'],
        body: 'عبور کامل از دل خط لوله: کش لبه، صف‌های مقاوم در برابر خطا و همگام‌سازی زنده که میلیون‌ها رویداد را تا نقطه‌ی همگرایی بدون افت سرعت عبور می‌دهند.',
      },
    },
  },
  {
    id: 'orbit-system',
    indexLabel: '05',
    shape: 'orbitSystem',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.05, 0.1],
    camera: {
      position: [0.35, 1.9, 8.2],
      positionEnd: [1.1, 0.5, 5.8],
      lookAt: [0.75, 0.05, 0.15],
      fov: 44,
    },
    labels: [
      {
        id: 'orbit-erp',
        position: [-2.2, 0.35, 0.6],
        offsetPx: [-26, -38],
        text: { en: 'ERP Ledger', fa: 'دفتر ERP' },
      },
      {
        id: 'orbit-hero',
        position: [1.85, 0.15, 0.45],
        offsetPx: [48, -42],
        accent: true,
        text: { en: 'Unified Commerce', fa: 'هسته‌ی یکپارچه' },
        subtext: { en: 'Single source of truth', fa: 'منبع حقیقت واحد' },
      },
      {
        id: 'orbit-wms',
        position: [0.25, -1.45, -0.75],
        offsetPx: [44, 28],
        text: { en: 'Live Inventory', fa: 'موجودی لحظه‌ای' },
      },
    ],
    copy: {
      en: {
        kicker: '05 · ECOSYSTEM',
        lines: ['One system uniting', 'every moving part.'],
        body: 'Payments, warehouses, storefronts, and analytics orbit smoothly around one clean source of truth — bringing the critical service squarely into focus.',
      },
      fa: {
        kicker: '۰۵ · منظومه‌ی یکپارچه',
        lines: ['یک منظومه برای اتصال', 'همه‌ی سرویس‌ها.'],
        body: 'پرداخت، انبار، فروشگاه و تحلیل داده در مدارهایی هماهنگ پیرامون یک منبع حقیقت واحد می‌چرخند و سرویس کلیدی دقیقاً به مرکز دید می‌آید.',
      },
    },
  },
  {
    id: 'app-tiles-scattered',
    indexLabel: '06',
    shape: 'appTilesScattered',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.02, 0.04],
    camera: {
      position: [0, 0.22, 8.0],
      positionEnd: [0, 0.1, 7.4],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'tile-1-s',
        position: [-2.35, 1.15, -0.35],
        offsetPx: [-12, -36],
        text: { en: 'Khatt Studio', fa: 'Khatt Studio' },
      },
      {
        id: 'tile-2-s',
        position: [0, 1.35, 0.25],
        offsetPx: [0, -38],
        text: { en: 'PulseSync ERP', fa: 'PulseSync ERP' },
      },
      {
        id: 'tile-3-s',
        position: [2.35, 1.15, -0.2],
        offsetPx: [20, -36],
        accent: true,
        text: { en: 'Dastgah Synth', fa: 'Dastgah Synth' },
      },
    ],
    copy: {
      en: {
        kicker: '06 · OWN PRODUCTS',
        lines: ['Small tools born', 'from real friction.'],
        body: 'Beyond client work, I craft standalone tools — from typography shader samplers to webhook bridges and browser synthesizers — testing ideas in the wild.',
      },
      fa: {
        kicker: '۰۶ · ابزارهای مستقل',
        lines: ['ابزارهایی متولدشده از', 'چالش‌های واقعی.'],
        body: 'در کنار پروژه‌های مشتریان، ابزارهای مستقلی می‌سازم — از نمونه‌بردار شیدر تایپوگرافی تا پل وب‌هوک و سینتی‌سایزر تحت وب.',
      },
    },
  },
  {
    id: 'app-tiles-focused',
    indexLabel: '07',
    shape: 'appTilesFocused',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0, 0],
    camera: {
      position: [0, 0.05, 7.1],
      positionEnd: [0, 0, 6.5],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'tile-1-f',
        position: [-2.22, 1.15, 0.05],
        offsetPx: [-8, -34],
        text: { en: '01 · Bars / Streams', fa: '۰۱ · جریان داده' },
      },
      {
        id: 'tile-2-f',
        position: [0, 1.15, 0.12],
        offsetPx: [0, -36],
        text: { en: '02 · Mesh / Grid', fa: '۰۲ · شبکه‌ی سیستم' },
      },
      {
        id: 'tile-3-f',
        position: [2.22, 1.15, 0.05],
        offsetPx: [12, -34],
        accent: true,
        text: { en: '03 · Neural / Nodes', fa: '۰۳ · گره‌های فعال' },
      },
    ],
    copy: {
      en: {
        kicker: '07 · PRECISION LOCK',
        lines: ['Sharpened into', 'tactile craft.'],
        body: 'Move your cursor across the tiles — loose prototypes lock into razor-clean modular primitives with crisp line structure and subtle spatial tilt.',
      },
      fa: {
        kicker: '۰۷ · دقت نهایی',
        lines: ['صیقل‌خورده تا مرز', 'وضوح کامل.'],
        body: 'ماوس را روی کارت‌ها حرکت بده — پروتوتایپ‌های پراکنده به بلوک‌های ماژولار دقیق با خطوط تیز و پارالاکس ظریف تبدیل می‌شوند.',
      },
    },
  },
  {
    id: 'word',
    indexLabel: '08',
    shape: 'word',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0, 0.02],
    camera: {
      position: [0, 0, 7.3],
      positionEnd: [0, 0.04, 6.7],
      lookAt: [0, 0, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'word-mark',
        position: [2.35, -0.5, 0.15],
        offsetPx: [34, 30],
        accent: true,
        text: { en: 'Zero friction', fa: 'بدون اصطکاک' },
      },
    ],
    copy: {
      en: {
        kicker: '08 · PHILOSOPHY',
        lines: ['The best code stays', 'completely invisible.'],
        body: 'Users should never stop to admire your architecture — they should simply feel effortless speed while complexity quietly evaporates behind the glass.',
      },
      fa: {
        kicker: '۰۸ · فلسفه‌ی ساخت',
        lines: ['بهترین کد همیشه', 'نامرئی می‌ماند.'],
        body: 'کاربر نباید درگیر پیچیدگی معماری شود؛ فقط باید سرعت و روانی بی‌وقفه را حس کند در حالی که پیچیدگی پشت صحنه محو می‌شود.',
      },
    },
  },
  {
    id: 'portrait',
    indexLabel: '09',
    shape: 'portrait',
    length: 250,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.01, 0.03],
    camera: {
      position: [0, 0.08, 6.9],
      positionEnd: [0.16, 0.04, 6.4],
      lookAt: [0, 0.04, 0],
      fov: 44,
    },
    labels: [
      {
        id: 'portrait-name',
        position: [1.28, 1.12, 0.1],
        offsetPx: [42, -28],
        accent: true,
        text: { en: 'Soheil Feizi', fa: 'سهیل فیضی' },
        subtext: { en: 'Engineer & Founder', fa: 'مهندس و بنیان‌گذار' },
      },
    ],
    copy: {
      en: {
        kicker: '09 · THE HUMAN',
        lines: ['Engineer first.', 'Designer when it counts.'],
        body: 'Nine years shipping resilient commerce, ERP pipelines, and WebGL experiences for teams across Europe, MENA, and North America — direct collaboration, zero agency layers.',
      },
      fa: {
        kicker: '۰۹ · پشت صحنه',
        lines: ['اول مهندس.', 'و هرجا لازم شد طراح.'],
        body: 'نُه سال تجربه‌ی ساخت فروشگاه‌های پرترافیک، همگام‌سازی ERP و رابط‌های خلاق WebGL برای تیم‌های بین‌المللی — همکاری مستقیم و بدون واسطه.',
      },
    },
  },
  {
    id: 'closing-ring',
    indexLabel: '10',
    shape: 'ring',
    length: 260,
    accentColor: STORY_ACCENT,
    cloudRotation: [0.04, 0.14],
    camera: {
      position: [0, 0.16, 7.4],
      positionEnd: [0, 0, 6.8],
      lookAt: [0, 0, 0],
      fov: 45,
    },
    labels: [
      {
        id: 'ring-open',
        position: [2.1, 1.35, 0.3],
        offsetPx: [38, -28],
        accent: true,
        text: { en: '2 Slots Open · Q2', fa: '۲ ظرفیت آزاد · فصل آینده' },
      },
    ],
    copy: {
      en: {
        kicker: '10 · NEXT CHAPTER',
        lines: ["Let's build", 'yours.'],
        body: 'Have a high-stakes storefront, a fragile integration, or an ambitious interactive product? Move your cursor through the ring or start a conversation directly.',
      },
      fa: {
        kicker: '۱۰ · فصل بعدی',
        lines: ['بیا پروژه‌ی تو را', 'بسازیم.'],
        body: 'فروشگاه پرترافیک، یکپارچه‌سازی حساس یا یک محصول تعاملی بلندپروازانه در ذهن داری؟ ماوس را در حلقه حرکت بده یا همین حالا گفتگو را شروع کن.',
      },
    },
    isClosingCta: true,
  },
];

export const STORY_UI_COPY: Record<
  Locale,
  {
    gateLoading: string;
    gateEyebrow: string;
    gateHeading: string;
    gateOptionSiteNum: string;
    gateOptionSiteTitle: string;
    gateOptionSiteDesc: string;
    gateOptionStoryNum: string;
    gateOptionStoryTitle: string;
    gateOptionStoryDesc: string;
    gateSoundPrompt: string;
    soundOn: string;
    soundOff: string;
    skipToSite: string;
    contactLink: string;
    startProject: string;
    exploreSite: string;
    badgeVertical: string;
    reducedMotionNote: string;
    webglFallbackNote: string;
    modalTitle: string;
    modalSubtitle: string;
    nameLabel: string;
    emailLabel: string;
    briefLabel: string;
    sendLabel: string;
    sentMsg: string;
    closeLabel: string;
  }
> = {
  en: {
    gateLoading: 'COMPILING PARTICLE BUFFERS & SHADERS',
    gateEyebrow: 'CHOOSE YOUR EXPERIENCE',
    gateHeading: 'How would you like to explore?',
    gateOptionSiteNum: '01',
    gateOptionSiteTitle: 'The site',
    gateOptionSiteDesc: 'Direct, crisp portfolio — projects, architecture, and contact.',
    gateOptionStoryNum: '02',
    gateOptionStoryTitle: 'The story',
    gateOptionStoryDesc: 'Scroll-driven 3D WebGL particle narrative across 11 chapters.',
    gateSoundPrompt: 'Ambient Web Audio',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    skipToSite: 'Skip to the site',
    contactLink: 'Contact',
    startProject: 'Start a project',
    exploreSite: 'Explore the site',
    badgeVertical: 'SOHEIL · STORY',
    reducedMotionNote: 'Reduced motion mode — static particle transitions active.',
    webglFallbackNote: 'Lightweight static view active (WebGL unavailable).',
    modalTitle: 'Start a project',
    modalSubtitle: 'Tell me what you are building — I reply personally within 24 hours.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    briefLabel: 'Project brief',
    sendLabel: 'Send inquiry',
    sentMsg: 'Message prepared — click below to send directly by email.',
    closeLabel: 'Close',
  },
  fa: {
    gateLoading: 'آماده‌سازی بافرهای ذره و شیدرهای GPU',
    gateEyebrow: 'انتخاب تجربه‌ی ورود',
    gateHeading: 'چطور می‌خواهی شروع کنی؟',
    gateOptionSiteNum: '01',
    gateOptionSiteTitle: 'سایت اصلی',
    gateOptionSiteDesc: 'مشاهده‌ی مستقیم و سریع پورتفولیو، پروژه‌ها و راه‌های ارتباطی.',
    gateOptionStoryNum: '02',
    gateOptionStoryTitle: 'داستان سه‌بعدی',
    gateOptionStoryDesc: 'سفر سینمایی اسکرول‌محور با ذرات WebGL در ۱۱ فصل.',
    gateSoundPrompt: 'صدای محیطی Web Audio',
    soundOn: 'صدا روشن',
    soundOff: 'صدا خاموش',
    skipToSite: 'رفتن به سایت اصلی',
    contactLink: 'تماس',
    startProject: 'شروع پروژه',
    exploreSite: 'مشاهده‌ی سایت',
    badgeVertical: 'SOHEIL · STORY',
    reducedMotionNote: 'حالت کاهش حرکت فعال است — نمایش آرام و ثابت.',
    webglFallbackNote: 'نسخه‌ی سبک بدون WebGL فعال است.',
    modalTitle: 'شروع یک پروژه',
    modalSubtitle: 'کوتاه بگو روی چه چیزی کار می‌کنی — ظرف ۲۴ ساعت مستقیم پاسخ می‌دهم.',
    nameLabel: 'نام',
    emailLabel: 'ایمیل',
    briefLabel: 'توضیح کوتاه پروژه',
    sendLabel: 'ارسال پیام',
    sentMsg: 'پیام آماده شد — برای ارسال مستقیم روی ایمیل زیر کلیک کن.',
    closeLabel: 'بستن',
  },
};
