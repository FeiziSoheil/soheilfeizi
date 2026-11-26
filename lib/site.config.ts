import type { Locale } from '@/lib/content';

export type SiteParticleShapeId =
  | 'heroPortrait'
  | 'wordInvisible'
  | 'quoteMarks'
  | 'wordSoheilStrip';

export interface ClientNoteItem {
  id: string;
  initials: string;
  name: string;
  role: string;
  company: string;
  headline: string;
  body: string;
  metric: string;
}

export interface HeroStatItem {
  value: string;
  label: string;
}

/* ─────────────────────────────────────────────────────────────
 * 0. CONTINUOUS SITE PARTICLE STAGE CONFIGURATION
 * ───────────────────────────────────────────────────────────── */
export const SITE_PARTICLE_CONFIG = {
  desktopCount: 52000,
  mobileCount: 20000,
  softwareGlCount: 22000,
  dustCountDesktop: 1600,
  dustCountMobile: 650,
  pointSizeDesktop: 1.66,
  pointSizeMobile: 1.72,
  pointMinPx: 1.2,
  pointMaxPx: 2.4,
  alphaMin: 0.4,
  alphaMax: 0.8,
  dustAlpha: 0.16,
  /** Idle hold noise <= 0.4% of shape dimensions */
  baseNoiseFrac: 0.0036,
  /** Expressive mid-morph curl displacement (px) */
  morphNoisePx: 76,
  /** Staggered per-particle morph wave delay */
  maxDelay: 0.35,
  /** Smooth damping + velocity cap for morph progress */
  dampLambda: 3.4,
  maxMorphRatePerSec: 1.25,
  /** Three-phase timing per pinned section (hold = 58% >= 55%) */
  phases: {
    enterEnd: 0.2,
    holdEnd: 0.78,
    exitStart: 0.78,
  },
  /** Contact infinite particle strip marquee kinetics */
  stripBaseSpeedPx: 44,
  stripScrollVelocityMultiplier: 5.4,
  stripRepeatCount: 4,
} as const;

/* ─────────────────────────────────────────────────────────────
 * 0A. WHAT I DO — STORY-TAB CLARITY & UNIFORM ARC-LENGTH WIREFRAMES
 * ───────────────────────────────────────────────────────────── */
export const WHAT_I_DO_PARTICLE_CONFIG = {
  /** Uniform arc-length sampling jitter (< 0.8px in 380x260 viewBox) matching Story Chapter 02 */
  subPixelJitterFrac: 0.0022,
  /** Ambient dust budget (12% of total points, matching Story Chapter 02 uiPlane) */
  ambientDustFrac: 0.12,
  /** Point sizing matching Story Chapter 02 (1.35..1.50px, countable, crystalline) */
  pointMinPx: 1.05,
  pointMaxPx: 1.65,
  pointSizeDesktop: 1.50,
  pointSizeMobile: 1.35,
  /** Transparent alpha range matching Story Chapter 02 (prevents clumping / blown-out blobs) */
  alphaMin: 0.38,
  alphaMax: 0.72,
  /** Rounded corners inside wireframe cards/frames (~3% of width) */
  cornerRadiusFrac: 0.03,
  /** Backward-compatible tube properties for process stages */
  tubeRadiusFrac: 0.0038,
  perpJitterFrac: 0.04,
  alongJitterFrac: 0.02,
  outerStrayFrac: 0.01,
  interiorDustMaxFrac: 0.012,
  accentFillDensity: 0.55,
} as const;

/* ─────────────────────────────────────────────────────────────
 * 0B. HERO PORTRAIT — PHOTO-FACE + HIGH-DENSITY PARTICLE BODY CONFIG
 * ───────────────────────────────────────────────────────────── */
export type HeroPortraitTheme = 'light' | 'dark';

export const HERO_PORTRAIT_CONFIG = {
  /** Default 'light' (#ECEAE6 + dark particles); switch to 'dark' for #0A0A0A + light particles */
  theme: 'light' as HeroPortraitTheme,
  /** High-density WebGL portrait cloud (82k desktop, 28k mobile) */
  particleCount: 82000,
  mobileParticleCount: 28000,
  softwareGlCount: 26000,
  /** Soft chin/neck feather band as fraction of portrait height (~15%) */
  faceMaskFeather: 0.15,
  /** Sparse random #5B5BF0 sparks (2..3%); ZERO contour edge-detection accent */
  accentRatio: 0.025,
  /** Particle pixel size & opacity range */
  pointMinPx: 1.6,
  pointMaxPx: 2.8,
  alphaMin: 0.7,
  alphaMax: 0.95,
  /** Faint outer halo around portrait (<= 5%) */
  ambientHaloMaxFrac: 0.04,
  /** Cursor reveal spotlight radius in px (shared between WebGL parting & real photo lens) */
  mouseRepelRadiusPx: 135,
  revealLensRadiusPx: 135,
  revealLensRadiusMobilePx: 95,
  /** Entrance choreography: particle assembly (2.2s) -> interactive reveal ready */
  enterAssembleSec: 1.8,
  faceFadeInSec: 0.45,
  /** Subtle 3D perspective tilt disabled on portrait for 1:1 pixel-locked particle-to-photo reveal */
  faceTiltMaxDeg: 0,
  /** User-provided transparent studio portrait cutout */
  cutoutSrc: '/assets/aistudio/Picsart_26-11-22_00-12-50-492_9adc2c5b.png',
  faceMaskSrc: '/face-mask.png',
} as const;

/** Structured alias `hero.portrait` for direct config access */
export const hero = {
  portrait: HERO_PORTRAIT_CONFIG,
} as const;

/* ─────────────────────────────────────────────────────────────
 * 0C. OWN APPS — INDEX + STAGE (Pinned Scroll & Morph Stage)
 * ───────────────────────────────────────────────────────────── */
export const OWN_APPS_CONFIG = {
  scrollPerAppVh: 80,
  endHoldVh: 40,
  totalApps: 10,
  githubUrl: 'https://github.com/soheilfeizi',
} as const;

export const SITE_DEBUG_SHAPES: Array<{
  id: SiteParticleShapeId;
  label: string;
  defaultTheme: 'light' | 'dark';
  description: Record<Locale, string>;
}> = [
  {
    id: 'heroPortrait',
    label: '01 · heroPortrait',
    defaultTheme: HERO_PORTRAIT_CONFIG.theme,
    description: {
      en: 'High-density luminance-weighted cutout portrait cloud with 2.5% scattered indigo sparks',
      fa: 'پرتره ذره‌ای پرتراکم با نمونه‌برداری وزنی روشنایی و ۲.۵٪ جرقه‌ی پراکنده بنفش',
    },
  },
  {
    id: 'wordInvisible',
    label: '02 · wordInvisible',
    defaultTheme: 'dark',
    description: {
      en: '2048px typography contour sampling with indigo accent on trailing period',
      fa: 'تایپوگرافی ذره‌ای ۲۰۴۸ پیکسلی با آکسنت بنفش روی نقطه پایانی',
    },
  },
  {
    id: 'quoteMarks',
    label: '03 · quoteMarks',
    defaultTheme: 'light',
    description: {
      en: 'Sculptural curly double quotation marks “ ” formed from evaporated Statement particles',
      fa: 'دو علامت نقل‌قول خمیده “ ” شکل‌گرفته از ذرات تبخیرشده‌ی بخش بیانیه',
    },
  },
  {
    id: 'wordSoheilStrip',
    label: '04 · wordSoheilStrip',
    defaultTheme: 'dark',
    description: {
      en: 'Seamless GPU-wrapped infinite horizontal strip reacting to scroll velocity',
      fa: 'نوار افقی بی‌نهایت در شیدر با واکنش به سرعت و جهت اسکرول',
    },
  },
];

/* ─────────────────────────────────────────────────────────────
 * 1. SELECTED WORK TRANSITION CONFIGURATION
 * ───────────────────────────────────────────────────────────── */
export const SELECTED_WORK_CONFIG = {
  /** Flip to -1 to invert scroll-driven text entrance/exit direction */
  directionSign: 1 as 1 | -1,
  staggerSec: 0.04,
  enterDelaySec: 0.1,
  exitDurationSec: 0.32,
  enterDurationSec: 0.52,
} as const;

/* ─────────────────────────────────────────────────────────────
 * 2. HERO SECTION COPY & STATS
 * ───────────────────────────────────────────────────────────── */
export const HERO_COPY: Record<
  Locale,
  {
    kicker: string;
    lines: string[];
    highlightWord: string;
    subline: string;
    ctaLabel: string;
    bookingChip: string;
    scrollLabel: string;
    stats: HeroStatItem[];
  }
> = {
  en: {
    kicker: 'SOHEIL FEIZI · FULL-STACK & AI SYSTEMS ENGINEER',
    lines: ['Systems and architectures', 'engineered to hold', 'under heavy load.'],
    highlightWord: 'engineered',
    subline:
      'High-throughput Go services, multimodal RAG pipelines, and tactile Next.js & React 19 interfaces built to execute without friction.',
    ctaLabel: "Let's talk",
    bookingChip: 'Available for systems engineering & advisory',
    scrollLabel: 'Scroll',
    stats: [
      { value: '5+', label: 'Years systems engineering' },
      { value: '20+', label: 'Production deployments' },
      { value: '05', label: 'Tech training institutes' },
    ],
  },
  fa: {
    kicker: 'سهیل فیضی · مهندس نرم‌افزار FULL-STACK و سیستم‌های هوش مصنوعی',
    lines: ['سیستم‌ها و معماری‌هایی که', 'برای پایداری زیر فشار', 'طراحی شده‌اند.'],
    highlightWord: 'پایداری',
    subline:
      'میکروسرویس‌های پرسرعت Go، پایپ‌لاین‌های هوش مصنوعی چندوجهی و رابط‌های کاربری روان Next.js و React 19 که بدون خطا کار می‌کنند.',
    ctaLabel: 'شروع گفتگو',
    bookingChip: 'آماده همکاری در پروژه‌ها و مشاوره معماری',
    scrollLabel: 'اسکرول',
    stats: [
      { value: '+۵', label: 'سال تجربه مهندسی' },
      { value: '+۲۰', label: 'پروژه و سامانه عملیاتی' },
      { value: '۰۵', label: 'آموزشگاه تخصصی تدریس' },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────
 * 3. STATEMENT SECTION COPY (300vh PINNED, SINGLE PARTICLE WORD)
 * ───────────────────────────────────────────────────────────── */
export const STATEMENT_COPY: Record<
  Locale,
  {
    eyebrow: string;
    lead: string;
    particleWord: string;
    caption: string;
  }
> = {
  en: {
    eyebrow: '07 · PHILOSOPHY',
    lead: 'Resilient software',
    particleWord: 'never stumbles.',
    caption:
      'True engineering is felt when everything runs silently, reliably, and without friction under pressure.',
  },
  fa: {
    eyebrow: '۰۷ · فلسفه مهندسی',
    lead: 'نرم‌افزار مهندسی‌شده،',
    particleWord: 'پایدار و مطمئن است.',
    caption:
      'زیبایی واقعی سیستم زمانی آشکار می‌شود که زیر ترافیک و فشار سنگین، بدون ذره‌ای وقفه پاسخ می‌دهد.',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 4. CLIENT NOTES (WHAT THEY SAID) — 3 TESTIMONIALS + 7s AUTO-CYCLE
 * ───────────────────────────────────────────────────────────── */
export const CLIENT_NOTES_CONFIG = {
  autoAdvanceMs: 7000,
  header: {
    en: {
      index: '(06)',
      title: 'WHAT THEY SAID',
      subtitle: 'Colleagues and engineering partners',
    },
    fa: {
      index: '(۰۶)',
      title: 'دیدگاه همکاران',
      subtitle: 'همکاران و مدیران فنی پروژه‌ها',
    },
  },
  items: {
    en: [
      {
        id: 'telecom-lead',
        initials: 'RE',
        name: 'Technical Director',
        role: 'Infrastructure & B2B Systems',
        company: 'Ravan Ertebat Asr',
        headline: 'Critical enterprise telecom gateways running without a glitch.',
        body: 'Soheil handled high-throughput MobinNet B2B integrations and secure IPG transactions with utmost rigor. The services delivered sub-second response times and zero downtime during peak loads.',
        metric: '99.9% uptime across high-concurrency B2B microservices',
      },
      {
        id: 'healthtech-co',
        initials: 'SC',
        name: 'Product Lead',
        role: 'Healthcare Solutions',
        company: 'Sepas Clinic',
        headline: 'Smart scheduling without double-booking concurrency bugs.',
        body: 'He architected Sepas Clinic from the ground up: MongoDB ACID transactions completely eliminated double-bookings, and the FastAPI LangChain pre-consultation engine dramatically cut patient intake overhead.',
        metric: 'Zero booking conflicts across thousands of concurrent slots',
      },
      {
        id: 'ai-partner',
        initials: 'VT',
        name: 'Lead Architect',
        role: 'Data Science & Systems',
        company: 'Vartam Software',
        headline: 'Rare synthesis of machine learning and deep backend engineering.',
        body: 'Finding an engineer who can train and evaluate ML models while architecting high-performance Go services and responsive Next.js frontends is exceedingly rare. Soheil delivers across the entire spectrum.',
        metric: 'Sub-30ms vector search retrieval with Qdrant and CLIP',
      },
    ],
    fa: [
      {
        id: 'telecom-lead',
        initials: 'RE',
        name: 'مدیر فنی زیرساخت',
        role: 'پروژه‌های سازمانی و B2B',
        company: 'روان ارتباط عصر',
        headline: 'درگاه‌های حساس مخابراتی بدون کوچک‌ترین قطعی اجرا شدند.',
        body: 'سهیل توسعه پروژه‌های حساس مخابراتی مبین‌نت و درگاه‌های تراکنش IPG را با بالاترین دقت سیستمی پیاده‌سازی کرد. پایداری میکروسرویس‌ها زیر بار ترافیک سازمانی کاملاً چشمگیر بود.',
        metric: 'پایداری ۹۹.۹٪ در میکروسرویس‌های پرترافیک سازمانی',
      },
      {
        id: 'healthtech-co',
        initials: 'SC',
        name: 'مدیر محصول',
        role: 'سامانه‌های درمانی و کلینیک',
        company: 'Sepas Clinic',
        headline: 'نوبت‌دهی هوشمند بدون حتی یک خطای همزمانی و رزرو مضاعف.',
        body: 'سهیل معماری Sepas Clinic را از صفر پیاده کرد: تراکنش‌های امن دیتابیس خطای رزرو تکراری را به صفر رساند و ماژول پیش‌ویزیت هوشمند بیمار، فرآیند پذیرش کلینیک را متحول کرد.',
        metric: 'صفر خطای رزرو مضاعف در هزاران نوبت همزمان',
      },
      {
        id: 'ai-partner',
        initials: 'VT',
        name: 'معمار داده',
        role: 'دیتاساینس و سیستم‌های هوشمند',
        company: 'توسعه نرم‌افزاری ورتم',
        headline: 'ترکیب کم‌نظیر دانش یادگیری ماشین و مهندسی عمیق بک‌اند.',
        body: 'مهندسانی که بتوانند الگوریتم‌های هوش مصنوعی و یادگیری ماشین را با قدرت معماری بک‌اند Go و رابط‌های مدرن فرانت‌اند ترکیب کنند بسیار انگشت‌شمارند. کار با سهیل همیشه اطمینان‌بخش است.',
        metric: 'بازیابی برداری زیر ۳۰ میلی‌ثانیه با Qdrant و CLIP',
      },
    ],
  } as Record<Locale, ClientNoteItem[]>,
};

/* ─────────────────────────────────────────────────────────────
 * 5. CONTACT SECTION TYPEWRITER & MARQUEE CONFIG
 * ───────────────────────────────────────────────────────────── */
export const CONTACT_CONFIG: Record<
  Locale,
  {
    marqueeWord: string;
    eyebrow: string;
    headingPrefix: string;
    typewriterLines: string[];
    subline: string;
    ctaLabel: string;
  }
> = {
  en: {
    marqueeWord: 'SOHEIL',
    eyebrow: '11 · START A CONVERSATION',
    headingPrefix: 'What technical bottleneck needs a solution?',
    typewriterLines: [
      'Sluggish backend services failing under peak concurrency.',
      'Complex multi-role RBAC and data isolation bottlenecks.',
      'Integrating multimodal AI, LLMs & RAG into your product.',
      'Production deployment, Docker orchestration, or data security.',
    ],
    subline:
      'Tell me where your product, systems, or architecture needs reinforcement — I reply personally in the shortest time.',
    ctaLabel: 'Start a conversation',
  },
  fa: {
    marqueeWord: 'SOHEIL',
    eyebrow: '۱۱ · شروع گفتگو',
    headingPrefix: 'کدام چالش فنی نیاز به راه‌حل اساسی دارد؟',
    typewriterLines: [
      'سیستم‌های کند و معماری‌های شکننده زیر بار ترافیک.',
      'پیاده‌سازی پیچیده دسترسی‌های چندنقشی RBAC و ایزولاسیون داده.',
      'یکپارچه‌سازی مدل‌های هوش مصنوعی چندوجهی، LLM و RAG.',
      'چالش‌های استقرار پروداکشن، داکر و امنیت داده‌ها.',
    ],
    subline:
      'بگو کجای سیستم یا معماری محصولت نیاز به بازطراحی یا تقویت دارد — مستقیماً و در کوتاه‌ترین زمان پاسخ می‌دهم.',
    ctaLabel: 'شروع گفتگو',
  },
};

/* ─────────────────────────────────────────────────────────────
 * 6. SINGULARITY & WHITEHOLE THEME TRANSITIONS CONFIG
 *    Add any light <-> dark transition here; PortfolioShell mounts
 *    a scrubbed ThemeTransition stage automatically between sections.
 * ───────────────────────────────────────────────────────────── */
export type ThemeTransitionOrigin = 'cursor' | 'shape' | { x: number; y: number };
export type ThemeTransitionDirection = 'darkFromLight' | 'lightFromDark';

export interface ThemeTransitionConfig {
  id: string;
  from: import('@/lib/content').SectionId;
  to: import('@/lib/content').SectionId;
  direction: ThemeTransitionDirection;
  origin: ThemeTransitionOrigin;
  /** Scroll scrub span added on top of 100svh sticky stage (default '160vh') */
  length: string;
  accent: string;
  /** Optional ParticleSlot id used when origin === 'shape' (or mobile fallback) */
  fromSlotId?: string;
  toSlotId?: string;
}

export const themeTransitions: ThemeTransitionConfig[] = [
  {
    id: 'whatido-to-process',
    from: 'whatido',
    to: 'process',
    direction: 'darkFromLight',
    origin: 'cursor',
    length: '160vh',
    accent: '#5B5BF0',
    fromSlotId: 'whatido-diagram',
    toSlotId: 'process-stage',
  },
  {
    id: 'apps-to-experience',
    from: 'apps',
    to: 'experience',
    direction: 'lightFromDark',
    origin: 'shape',
    length: '150vh',
    accent: '#5B5BF0',
  },
  {
    id: 'experience-to-statement',
    from: 'experience',
    to: 'statement',
    direction: 'darkFromLight',
    origin: 'cursor',
    length: '160vh',
    accent: '#5B5BF0',
    toSlotId: 'statement-title',
  },
  {
    id: 'statement-to-clientnote',
    from: 'statement',
    to: 'testimonial',
    direction: 'lightFromDark',
    origin: 'shape',
    length: '160vh',
    accent: '#5B5BF0',
    fromSlotId: 'statement-title',
    toSlotId: 'testimonial-figure',
  },
  {
    id: 'clientnote-to-afterhours',
    from: 'testimonial',
    to: 'afterhours',
    direction: 'darkFromLight',
    origin: 'shape',
    length: '160vh',
    accent: '#5B5BF0',
    fromSlotId: 'testimonial-figure',
  },
];

export const THEME_TRANSITIONS = themeTransitions;

