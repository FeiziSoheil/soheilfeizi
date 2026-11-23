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
        lines: ['Every complex system', 'starts as suspended noise.'],
        body: 'Scroll to see where it began — high-performance Go microservices, reactive frontends, and multimodal AI pipelines taking shape from first principles.',
        note: 'Scroll down to condense the field',
      },
      fa: {
        kicker: '۰۰ · آغاز',
        lines: ['هر سیستم پیچیده‌ای با', 'ذراتی معلق آغاز می‌شود.'],
        body: 'اسکرول کن تا روند شکل‌گیری را ببینی — میکروسرویس‌های پرسرعت Go، فرانت‌اندهای تعاملی و پایپ‌لاین‌های هوش مصنوعی چگونه از اصول پایه متولد می‌شوند.',
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
        text: { en: 'Go Core Engine', fa: 'هسته پرسرعت Go' },
        subtext: { en: 'Deterministic state', fa: 'تراکنش‌های قطعی' },
      },
      {
        id: 'sphere-orbit',
        position: [2.95, 0.25, 0.15],
        offsetPx: [48, -32],
        text: { en: 'Distributed Services', fa: 'لایه‌ی توزیع‌شده' },
      },
    ],
    copy: {
      en: {
        kicker: '01 · FIRST PRINCIPLES',
        lines: ['A quiet core', 'under heavy pressure.'],
        body: 'Before visual polish or frontend layers, scalable software demands an uncluttered center of gravity — clean Go architecture, resilient schemas, and predictable state.',
      },
      fa: {
        kicker: '۰۱ · اصول پایه',
        lines: ['هسته‌ای آرام', 'زیر سنگین‌ترین فشار.'],
        body: 'پیش از هر فریم‌ورک و لایه ظاهری، یک سیستم ماندگار به مرکز ثقلی شفاف نیاز دارد؛ معماری تمیز با Go، اسکیمای دیتابیس مقاوم و مدیریت قطعی داده‌ها.',
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
        text: { en: 'Next.js 16 / React 19', fa: 'Next.js 16 / React 19' },
      },
      {
        id: 'ui-cards',
        position: [1.48, -0.45, -0.35],
        offsetPx: [52, 30],
        text: { en: 'Tailwind 4 & Motion', fa: 'طراحی واکنش‌گرا و سریع' },
      },
    ],
    copy: {
      en: {
        kicker: '02 · INTERFACE CRAFT',
        lines: ['Interfaces that feel', 'like instruments.'],
        body: 'From real estate platforms to clinical systems — interfaces built with Next.js 16, React 19, TypeScript, and fluid GSAP/Motion deliver 60fps precision.',
      },
      fa: {
        kicker: '۰۲ · مهندسی فرانت‌اند',
        lines: ['رابط‌هایی سریع با حس', 'یک ابزار دقیق.'],
        body: 'از پلتفرم‌های سازمانی و CRM املاک تا سامانه‌های پزشکی — رابط‌های توسعه‌یافته با Next.js 16، React 19 و انیمیشن‌های روان Framer Motion با نرخ ۶۰ فریم پایدار کار می‌کنند.',
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
        text: { en: 'Discover', fa: 'کشف و تحلیل' },
      },
      {
        id: 'arc-architect',
        position: ARC_NODE_1,
        offsetPx: [0, -54],
        accent: true,
        text: { en: 'Architect & RBAC', fa: 'معماری و امنیت' },
      },
      {
        id: 'arc-ship',
        position: ARC_NODE_2,
        offsetPx: [36, -48],
        text: { en: 'Deploy & Production', fa: 'استقرار پروداکشن' },
      },
    ],
    copy: {
      en: {
        kicker: '03 · TRAJECTORY',
        lines: ['From architecture', 'to production delivery.'],
        body: 'Discovery, schema design, security boundaries, and container deployment form a continuous arc — zero technical debt and smooth production handoffs.',
      },
      fa: {
        kicker: '۰۳ · مسیر اجرا',
        lines: ['از طراحی معماری', 'تا استقرار در عملیات.'],
        body: 'کشف نیازمندی، طراحی اسکیمای دیتابیس، امنیت ردیفی RBAC و کانتینرسازی با داکر، یک مدار به هم پیوسته‌اند؛ تحویل بدون بدهی فنی و کاملاً پایدار.',
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
        text: { en: 'Go Echo Latency <10ms', fa: 'پاسخ‌دهی Go زیر ۱۰ms' },
      },
      {
        id: 'tunnel-02',
        position: [-2.05, -0.7, -8.0],
        offsetPx: [-34, 34],
        visibleRange: [0.34, 0.64],
        accent: true,
        text: { en: 'ACID Transactions', fa: 'تراکنش‌های قطعی بدون باگ' },
      },
      {
        id: 'tunnel-03',
        position: [1.95, -0.55, -18.5],
        offsetPx: [42, 26],
        visibleRange: [0.58, 0.84],
        text: { en: 'High-Concurrency B2B', fa: 'تحمل ترافیک سنگین B2B' },
      },
    ],
    copy: {
      en: {
        kicker: '04 · THROUGHPUT',
        lines: ['Built to accelerate', 'under peak concurrency.'],
        body: 'Inside the operational engine: high-throughput Go microservices, Redis caching, and WebSocket/SSE pipelines keep high-concurrency enterprise traffic moving effortlessly.',
      },
      fa: {
        kicker: '۰۴ · تونل پردازش',
        lines: ['ساخته‌شده برای سرعت', 'در اوج ترافیک سازمانی.'],
        body: 'حرکت در دل موتور پردازش: میکروسرویس‌های پرسرعت Go Echo، کش توزیع‌شده با Redis و استریم‌های بلادرنگ که ترافیک سنگین سازمانی را بدون ذره‌ای تاخیر عبور می‌دهند.',
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
        text: { en: 'Multimodal AI / RAG', fa: 'هوش مصنوعی و RAG' },
      },
      {
        id: 'orbit-hero',
        position: [1.85, 0.15, 0.45],
        offsetPx: [48, -42],
        accent: true,
        text: { en: 'Go / Python Services', fa: 'میکروسرویس‌های Go و Python' },
        subtext: { en: 'Single source of truth', fa: 'منبع حقیقت واحد' },
      },
      {
        id: 'orbit-wms',
        position: [0.25, -1.45, -0.75],
        offsetPx: [44, 28],
        text: { en: 'Mongo, Postgres & MinIO', fa: 'دیتابیس‌ها و MinIO S3' },
      },
    ],
    copy: {
      en: {
        kicker: '05 · ECOSYSTEM',
        lines: ['An orchestrated mesh', 'of services and data.'],
        body: 'Fast relational and document databases, S3-compatible MinIO storage, and multimodal AI pipelines orbit seamlessly around a unified backend core.',
      },
      fa: {
        kicker: '۰۵ · منظومه یکپارچه',
        lines: ['هماهنگی بی‌نقص میان', 'داده‌ها و سرویس‌ها.'],
        body: 'پایگاه‌های داده MongoDB و PostgreSQL، ذخیره‌سازی ابری MinIO و خطوط لوله هوش مصنوعی در مدارهایی هماهنگ پیرامون هسته مرکزی سیستم فعالیت می‌کنند.',
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
        text: { en: 'Parakgram', fa: 'Parakgram' },
      },
      {
        id: 'tile-2-s',
        position: [0, 1.35, 0.25],
        offsetPx: [0, -38],
        text: { en: 'Parak AI RAG', fa: 'Parak AI RAG' },
      },
      {
        id: 'tile-3-s',
        position: [2.35, 1.15, -0.2],
        offsetPx: [20, -36],
        accent: true,
        text: { en: 'Sepas Clinic', fa: 'Sepas Clinic' },
      },
    ],
    copy: {
      en: {
        kicker: '06 · OWN PRODUCTS',
        lines: ['Autonomous platforms', 'built from scratch.'],
        body: 'Beyond client systems, I engineer end-to-end products: from full-stack social networks (Parakgram) to multimodal AI shopping assistants (Parak) and medical clinic platforms (Sepas Clinic).',
      },
      fa: {
        kicker: '۰۶ · محصولات مستقل',
        lines: ['پلتفرم‌های کاملی که', 'از صفر تا صد ساخته‌ام.'],
        body: 'فراتر از پروژه‌های سازمانی، محصولات مستقلی را مهندسی کرده‌ام: از پلتفرم اجتماعی Parakgram تا دستیار خرید چندوجهی هوشمند Parak و سیستم یکپارچه درمانگاه Sepas Clinic.',
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
        text: { en: '01 · Granular RBAC', fa: '۰۱ · کنترل ردیفی دسترسی' },
      },
      {
        id: 'tile-2-f',
        position: [0, 1.15, 0.12],
        offsetPx: [0, -36],
        text: { en: '02 · ACID Integrity', fa: '۰۲ · سلامت تراکنش‌ها' },
      },
      {
        id: 'tile-3-f',
        position: [2.22, 1.15, 0.05],
        offsetPx: [12, -34],
        accent: true,
        text: { en: '03 · AI Tool-Calling', fa: '۰۳ · ابزارهای AI' },
      },
    ],
    copy: {
      en: {
        kicker: '07 · PRECISION LOCK',
        lines: ['Sharpened into', 'production resilience.'],
        body: 'Hover your cursor over the modules — multi-role RBAC, row-level isolation, and intelligent AI tool-calling lock together into a rock-solid, production-grade architecture.',
      },
      fa: {
        kicker: '۰۷ · استحکام مهندسی',
        lines: ['صیقل‌خورده برای', 'پایداری در پروداکشن.'],
        body: 'ماوس را روی ماژول‌ها حرکت بده — کنترل دسترسی ردیفی RBAC، ایزولاسیون کامل داده‌ها و فراخوانی ابزارهای هوش مصنوعی به یک ساختار صنعتی و تسخیرناپذیر تبدیل می‌شوند.',
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
        text: { en: 'Pure reliability', fa: 'پایداری خالص' },
      },
    ],
    copy: {
      en: {
        kicker: '08 · PHILOSOPHY',
        lines: ['Engineered software', 'stays invisible.'],
        body: 'Users should never have to think about what is happening behind the screen — they simply feel immediate speed, continuous stability, and effortless precision.',
      },
      fa: {
        kicker: '۰۸ · فلسفه ساخت',
        lines: ['نرم‌افزار مهندسی‌شده،', 'نامرئی می‌ماند.'],
        body: 'کاربر هرگز نباید درگیر پیچیدگی‌های پشت صحنه شود؛ فقط باید سرعت فوری، پایداری مداوم و عملکرد روان سیستم را تجربه کند.',
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
        subtext: { en: 'Full-Stack & AI Engineer', fa: 'مهندس نرم‌افزار و هوش مصنوعی' },
      },
    ],
    copy: {
      en: {
        kicker: '09 · THE ENGINEER',
        lines: ['5+ Years Building Systems.', 'Instructor & Architect.'],
        body: 'Experienced in high-throughput Go microservices, multimodal AI/RAG architectures, and modern reactive frontends — with a rich background teaching ML and neural networks at 5 tech academies.',
      },
      fa: {
        kicker: '۰۹ · پشت صحنه',
        lines: ['+۵ سال مهندسی سیستم.', 'معمار نرم‌افزار و مدرس AI.'],
        body: 'تسلط عمیق بر میکروسرویس‌های پرسرعت Go، پایپ‌لاین‌های هوش مصنوعی چندوجهی و فرانت‌اندهای مدرن Next.js — همراه با سابقه تدریس تخصصی یادگیری ماشین و شبکه‌های عصبی در ۵ آموزشگاه معتبر.',
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
        text: { en: 'Open for Collaboration', fa: 'آماده همکاری و مشاوره' },
      },
    ],
    copy: {
      en: {
        kicker: '10 · NEXT CHAPTER',
        lines: ["Let's build", 'something resilient.'],
        body: 'Architecting an enterprise platform, integrating multimodal AI and RAG, or scaling your Go backend? Let us connect and engineer the next milestone.',
      },
      fa: {
        kicker: '۱۰ · فصل بعدی',
        lines: ['بیا سیستمی پایدار', 'و مقیاس‌پذیر بسازیم.'],
        body: 'در حال طراحی یک پلتفرم سازمانی، هوشمندسازی محصول با AI و RAG، یا توسعه میکروسرویس‌های پرسرعت Go هستید؟ بیایید گفتگو را برای ساخت قدم بعدی شروع کنیم.',
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
