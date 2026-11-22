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
 * 0A. WHAT I DO — THICK GRANULAR TUBES & HOLLOW INTERIORS CONFIG
 * ───────────────────────────────────────────────────────────── */
export const WHAT_I_DO_PARTICLE_CONFIG = {
  /** Tube cross-section radius ~0.9% of shape width (~6..8px on 1440px desktop) */
  tubeRadiusFrac: 0.009,
  /** 15% perpendicular edge roughness jitter */
  perpJitterFrac: 0.15,
  /** 8% along-path jitter */
  alongJitterFrac: 0.08,
  /** 3..5% stray particles just outside lines for granular stipple feel */
  outerStrayFrac: 0.04,
  /** Hollow interior sparse dust cap (<= 5%) */
  interiorDustMaxFrac: 0.045,
  /** Dense countable point size & high core opacity */
  pointMinPx: 1.6,
  pointMaxPx: 2.6,
  alphaMin: 0.85,
  alphaMax: 0.95,
  /** ~60% dense hatch density on selective #5B5BF0 accent blocks */
  accentFillDensity: 0.6,
  /** Rounded corners inside wireframe cards/frames (~3% of width) */
  cornerRadiusFrac: 0.03,
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
 * 0C. OWN APPS — MATHEMATICALLY CENTERED HORIZONTAL TRACK CONFIG
 * ───────────────────────────────────────────────────────────── */
export const OWN_APPS_CONFIG = {
  cardHeightPx: 360,
  scrollPerCardVh: 90,
  endHoldVh: 40,
  activeScale: 1.03,
  /** Optional ghost end card ("All projects on GitHub ↗") */
  showEndCard: false,
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
      en: 'Sculptural twin quotation marks formed from evaporated Statement particles',
      fa: 'علامت‌های نقل‌قول ذره‌ای شکل‌گرفته از ذرات تبخیرشده‌ی بخش بیانیه',
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
    kicker: 'SOHEIL FEIZI · PRINCIPAL COMMERCE ARCHITECT',
    lines: ['Systems and stores', 'you never have to', 'think about.'],
    highlightWord: 'never',
    subline:
      'High-throughput storefronts, resilient ERP/POS synchronization, and calm interfaces engineered to disappear under pressure.',
    ctaLabel: "Let's talk",
    bookingChip: 'Booking 2 projects for next quarter',
    scrollLabel: 'Scroll',
    stats: [
      { value: '10+', label: 'Years shipping systems' },
      { value: '48+', label: 'Production launches' },
      { value: '06', label: 'Countries served' },
    ],
  },
  fa: {
    kicker: 'سهیل فیضی · معمار ارشد سیستم‌های تجارت الکترونیک',
    lines: ['سیستم‌ها و فروشگاه‌هایی که', 'هرگز مجبور نیستی', 'نگرانشان باشی.'],
    highlightWord: 'هرگز',
    subline:
      'فروشگاه‌های پرترافیک، همگام‌سازی بی‌نقص ERP/POS و رابط‌های کاربری آرام که زیر بیشترین فشار هم بدون خطا کار می‌کنند.',
    ctaLabel: 'گفتگو کنیم',
    bookingChip: 'ظرفیت ۲ پروژه برای فصل آینده',
    scrollLabel: 'اسکرول',
    stats: [
      { value: '+۱۰', label: 'سال تجربه مهندسی' },
      { value: '+۴۸', label: 'پروژه‌ی تحویل‌شده' },
      { value: '۰۶', label: 'کشور همکار' },
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
    lead: 'Good code is',
    particleWord: 'invisible.',
    caption:
      'Users should never notice your architecture — only that everything responds effortlessly.',
  },
  fa: {
    eyebrow: '۰۷ · فلسفه مهندسی',
    lead: 'کد خوب،',
    particleWord: 'نامرئی است.',
    caption:
      'کاربر هرگز نباید معماری پشت‌صحنه را حس کند — فقط اینکه همه‌چیز بی‌دردسر و فوری پاسخ می‌دهد.',
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
      subtitle: 'People I have worked with',
    },
    fa: {
      index: '(۰۶)',
      title: 'آنچه گفتند',
      subtitle: 'افرادی که با هم کار کرده‌ایم',
    },
  },
  items: {
    en: [
      {
        id: 'arash-mehrabi',
        initials: 'AM',
        name: 'Arash Mehrabi',
        role: 'Co-Founder & COO',
        company: 'Noor Atelier Commerce',
        headline: 'Our launch night stayed completely quiet.',
        body: 'Soheil rebuilt our storefront, warehouse sync, and checkout pipeline before our biggest seasonal drop. Instead of firefighting oversold SKUs at 2 AM, the entire team watched orders clear in real time.',
        metric: 'Zero oversold SKUs across 12,000 orders in 24 hours',
      },
      {
        id: 'sara-rahimi',
        initials: 'SR',
        name: 'Sara Rahimi',
        role: 'VP of Engineering',
        company: 'KianPay Systems',
        headline: 'Architecture that scales without drama.',
        body: 'He untangled four legacy payment webhooks into a deterministic, observable ledger in six weeks. Latency dropped across every region and onboarding new engineers became effortless.',
        metric: '99.98% checkout reliability during peak campaign spikes',
      },
      {
        id: 'marcus-klein',
        initials: 'MK',
        name: 'Marcus Klein',
        role: 'Head of Digital',
        company: 'NordHaus Retail',
        headline: 'Rare blend of taste and deep systems rigor.',
        body: 'Most engineers treat design polish as an afterthought or sacrifice backend resilience for motion. Soheil delivered a tactile, sub-second storefront backed by rock-solid inventory integrity.',
        metric: 'Sub-180ms TTFB across 14 European storefronts',
      },
    ],
    fa: [
      {
        id: 'arash-mehrabi',
        initials: 'AM',
        name: 'آرش مهرابی',
        role: 'هم‌بنیان‌گذار و مدیر عملیات',
        company: 'Noor Atelier Commerce',
        headline: 'شب لانچ ما کاملاً آرام و بی‌دردسر گذشت.',
        body: 'سهیل پیش از بزرگ‌ترین کمپین فصلی ما، کل فروشگاه، همگام‌سازی انبار و مسیر پرداخت را بازطراحی کرد. به‌جای خاموش‌کردن آتش خطاهای موجودی، فقط با آرامش ثبت سفارش‌ها را تماشا می‌کردیم.',
        metric: 'صفر خطای موجودی در ۱۲,۰۰۰ سفارش طی ۲۴ ساعت',
      },
      {
        id: 'sara-rahimi',
        initials: 'SR',
        name: 'سارا رحیمی',
        role: 'معاون مهندسی',
        company: 'KianPay Systems',
        headline: 'معماری مقیاس‌پذیر بدون پیچیدگی اضافه.',
        body: 'چهار وب‌هوک پرداخت قدیمی را ظرف شش هفته به یک لایه‌ی یکپارچه و قابل رصد تبدیل کرد. زمان پاسخ در تمام مناطق کاهش یافت و توسعه‌ی فیچرهای جدید به‌طرز محسوسی سریع‌تر شد.',
        metric: 'پایداری ۹۹.۹۸٪ پرداخت در اوج ترافیک کمپین‌ها',
      },
      {
        id: 'marcus-klein',
        initials: 'MK',
        name: 'مارکوس کلاین',
        role: 'مدیر محصول دیجیتال',
        company: 'NordHaus Retail',
        headline: 'ترکیب کم‌نظیر سلیقه‌ی بصری و دقت سیستمی.',
        body: 'کمتر مهندسی پیدا می‌شود که همزمان به ظرافت انیمیشن و استحکام لایه‌ی بک‌اند اهمیت بدهد. خروجی کار، فروشگاهی فوق‌العاده سریع با دقت کامل در همگام‌سازی موجودی بود.',
        metric: 'پاسخ‌دهی زیر ۱۸۰ میلی‌ثانیه در ۱۴ فروشگاه اروپایی',
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
    headingPrefix: 'What needs to stop breaking?',
    typewriterLines: [
      'A checkout that leaks mobile revenue.',
      'A plan that stalls after every release.',
      'An ERP sync that oversells your best SKUs.',
      'A storefront that drags under campaign load.',
    ],
    subline:
      'Tell me where your product, storefront, or commerce stack feels fragile — I reply within one business day.',
    ctaLabel: 'Start a conversation',
  },
  fa: {
    marqueeWord: 'SOHEIL',
    eyebrow: '۱۱ · شروع گفتگو',
    headingPrefix: 'کدام بخش دیگر نباید بشکند؟',
    typewriterLines: [
      'فرآیند پرداختی که خریداران موبایل را از دست می‌دهد.',
      'برنامه‌ای که بعد از هر انتشار متوقف می‌شود.',
      'همگام‌سازی انباری که موجودی را اشتباه ثبت می‌کند.',
      'فروشگاهی که زیر فشار کمپین کند می‌شود.',
    ],
    subline:
      'بگو کجای محصول یا زیرساخت فروشگاهت شکننده است — ظرف یک روز کاری پاسخ می‌دهم.',
    ctaLabel: 'شروع گفتگو',
  },
};
