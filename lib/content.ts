export type Locale = 'fa' | 'en';
export type ViewMode = 'site' | 'story';

export type SectionId =
  | 'intro'
  | 'hero'
  | 'about'
  | 'whatido'
  | 'process'
  | 'work'
  | 'apps'
  | 'experience'
  | 'statement'
  | 'testimonial'
  | 'afterhours'
  | 'ask'
  | 'contact';

export interface SectionMeta {
  id: SectionId;
  theme: 'light' | 'dark';
  storyOnly?: boolean;
  label: { fa: string; en: string };
  index: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: 'intro', theme: 'light', storyOnly: true, label: { fa: 'آغاز', en: 'Intro' }, index: '00' },
  { id: 'hero', theme: 'light', label: { fa: 'خانه', en: 'Hero' }, index: '00' },
  { id: 'about', theme: 'light', label: { fa: 'درباره‌ی من', en: 'About' }, index: '01' },
  { id: 'whatido', theme: 'light', label: { fa: 'چه می‌کنم', en: 'What I Do' }, index: '02' },
  { id: 'process', theme: 'dark', label: { fa: 'فرآیند', en: 'Process' }, index: '03' },
  { id: 'work', theme: 'dark', label: { fa: 'پروژه‌های منتخب', en: 'Selected Work' }, index: '04' },
  { id: 'apps', theme: 'dark', label: { fa: 'اپ‌های خودم', en: 'Own Apps' }, index: '05' },
  { id: 'experience', theme: 'light', label: { fa: 'تجربه', en: 'Experience' }, index: '06' },
  { id: 'statement', theme: 'dark', label: { fa: 'بیانیه', en: 'Statement' }, index: '07' },
  { id: 'testimonial', theme: 'light', label: { fa: 'نقل‌قول', en: 'Client Note' }, index: '08' },
  { id: 'afterhours', theme: 'dark', label: { fa: 'پس از کار', en: 'After Hours' }, index: '09' },
  { id: 'ask', theme: 'dark', label: { fa: 'از من بپرس', en: 'Ask Me' }, index: '10' },
  { id: 'contact', theme: 'dark', label: { fa: 'تماس', en: 'Contact' }, index: '11' },
];

export interface LocalizedContent {
  person: {
    firstName: string;
    lastName: string;
    fullName: string;
    location: string;
    globalNote: string;
    role: string;
    company: string;
    email: string;
    linkedin: string;
    github: string;
    availability: string;
  };
  gateway: {
    question: string;
    siteTitle: string;
    siteDesc: string;
    storyTitle: string;
    storyDesc: string;
    soundLabel: string;
    soundDrift: string;
    soundMuted: string;
    emailLabel: string;
    linkedinLabel: string;
  };
  intro: {
    particleWord: string;
    lead: string;
    scrollCue: string;
  };
  hero: {
    tagline: string;
    subline: string;
    cta: string;
    profileLine: string;
    scrollHint: string;
  };
  about: {
    kicker: string;
    statementParts: Array<{ text: string; bold?: boolean }>;
    badgeText: string;
    stats: Array<{
      value: number;
      prefix?: string;
      suffix?: string;
      label: string;
      detail: string;
    }>;
  };
  whatido: {
    kicker: string;
    heading: string;
    nextSectionBtn: string;
    tabs: Array<{
      id: 'crm' | 'frontend' | 'integrations' | 'architecture' | 'performance' | 'design';
      title: string;
      desc: string;
      metrics: string;
    }>;
  };
  process: {
    kicker: string;
    heading: string;
    stages: Array<{
      step: string;
      title: string;
      sentence: string;
    }>;
  };
  work: {
    kicker: string;
    client: string;
    year: string;
    headline: string;
    briefLabel: string;
    brief: string;
    roleLabel: string;
    role: string;
    stackLabel: string;
    stack: string[];
    outcomesLabel: string;
    outcomes: Array<{ metric: string; label: string }>;
    toggleParticles: string;
    togglePhoto: string;
  };
  apps: {
    kicker: string;
    heading: string;
    dragHint: string;
    items: Array<{
      id: string;
      name: string;
      year: string;
      tagline: string;
      detail: string;
      stack: string[];
      accentTint: string;
      urlLabel: string;
    }>;
  };
  experience: {
    kicker: string;
    sinceLabel: string;
    roles: Array<{
      year: number;
      period: string;
      role: string;
      company: string;
      location: string;
      note: string;
    }>;
    techStack: string[];
  };
  statement: {
    before: string;
    accentWord: string;
    caption: string;
  };
  testimonial: {
    kicker: string;
    quote: string;
    author: string;
    role: string;
    company: string;
    outcome: string;
  };
  afterhours: {
    kicker: string;
    heading: string;
    playerTitle: string;
    tracks: Array<{
      id: number;
      title: string;
      mood: string;
      duration: string;
    }>;
    hobbiesHeading: string;
    hobbies: Array<{
      title: string;
      note: string;
    }>;
  };
  ask: {
    kicker: string;
    heading: string;
    subline: string;
    placeholder: string;
    send: string;
    thinking: string;
    rateLimitMsg: string;
    errorMsg: string;
    starters: string[];
  };
  contact: {
    prefix: string;
    painPoints: string[];
    subline: string;
    cta: string;
    modalTitle: string;
    modalSub: string;
    nameLabel: string;
    emailLabel: string;
    messageLabel: string;
    submitLabel: string;
    sentSuccess: string;
    closeLabel: string;
    footer: {
      col1Title: string;
      col2Title: string;
      col3Title: string;
      scheduleCta: string;
      scheduleNote: string;
      copyright: string;
    };
  };
  chrome: {
    codeBtn: string;
    siteBtn: string;
    storyBtn: string;
    cookieBtn: string;
    menuLabel: string;
    closeMenu: string;
    codeModalTitle: string;
    codeModalBody: string;
    cookieModalTitle: string;
    cookieModalBody: string;
    cookieEssential: string;
    cookiePrefs: string;
    cookieSave: string;
    soundOn: string;
    soundOff: string;
  };
}

export const CONTENT: Record<Locale, LocalizedContent> = {
  fa: {
    person: {
      firstName: 'سهیل',
      lastName: 'فیضی',
      fullName: 'سهیل فیضی',
      location: 'تهران، ایران',
      globalNote: 'کار برای مشتریان سراسر جهان',
      role: 'مهندس نرم‌افزار Full-Stack و بنیان‌گذار استودیو کاوه',
      company: 'استودیو مهندسی کاوه',
      email: 'soheil@feizi.studio',
      linkedin: 'https://linkedin.com/in/soheilfeizi',
      github: 'https://github.com/soheilfeizi',
      availability: 'پذیرش ۲ پروژه در فصل آینده',
    },
    gateway: {
      question: 'چطور می‌خواهی با من آشنا شوی؟',
      siteTitle: 'سایت',
      siteDesc: 'بدون صدا، اسکرول سریع و مستقیم به اصل مطلب.',
      storyTitle: 'داستان',
      storyDesc: 'تجربه‌ی سه‌بعدی ذره‌ای و مورف با اسکرول — بهتر با صدا.',
      soundLabel: 'صدا',
      soundDrift: 'حالت Drift فعال',
      soundMuted: 'بی‌صدا',
      emailLabel: 'ایمیل مستقیم',
      linkedinLabel: 'لینکدین',
    },
    intro: {
      particleWord: 'سهیل',
      lead: 'من از اول سراغ مهندسی سیستم‌های فروش و وب نرفتم. اسکرول کن تا ببینی از کجا شروع کردم.',
      scrollCue: 'برای شکل‌گیری پرتره اسکرول کن',
    },
    hero: {
      tagline: 'فروشگاه‌ها و سامانه‌هایی که هرگز لازم نیست نگرانشان باشی.',
      subline: 'بیشتر چیزی که می‌سازم را هرگز نمی‌بینی — و دقیقاً همین یعنی درست کار می‌کند.',
      cta: 'بیا حرف بزنیم',
      profileLine: 'سهیل فیضی · مهندس Full-Stack و بنیان‌گذار · کار برای مشتریان سراسر جهان',
      scrollHint: 'اسکرول',
    },
    about: {
      kicker: '۰۱ درباره‌ی من',
      statementParts: [
        { text: 'بیشتر چیزی که می‌سازم را ' },
        { text: 'هرگز نمی‌بینی.', bold: true },
        { text: ' جست‌وجویی که در ۳۰ میلی‌ثانیه جواب می‌دهد، ' },
        { text: 'پرداختی که زیر فشار نمی‌شکند،', bold: true },
        { text: ' و موجودی انباری که بین پنج کانال فروش ' },
        { text: 'بی‌صدا همگام می‌ماند.', bold: true },
        { text: ' روی کاغذ مهندسم، اما وقتی لازم باشد ' },
        { text: 'طراحی هم می‌کنم', bold: true },
        { text: ' تا فاصله‌ی بین ایده و محصول نهایی صفر شود.' },
      ],
      badgeText: 'برگزیده‌ی طراحی وب · ۱۴۰۴ · مهندسی و طراحی · ',
      stats: [
        { value: 9, suffix: '', label: 'سال تجربه', detail: 'معماری وب و سیستم‌های تجاری' },
        { value: 42, suffix: '+', label: 'پروژه‌ی تحویلی', detail: 'در اروپا، خاورمیانه و آمریکای شمالی' },
        { value: 38, prefix: '+', suffix: '٪', label: 'رشد نرخ تبدیل', detail: 'میانگین پس از بازطراحی چک‌اوت' },
        { value: 64, prefix: '−', suffix: '٪', label: 'کاهش زمان بارگذاری', detail: 'بهبود LCP در فروشگاه‌های پرترافیک' },
      ],
    },
    whatido: {
      kicker: '۰۲ چه می‌کنم',
      heading: 'شش لایه‌ای که محصول را زنده نگه می‌دارند.',
      nextSectionBtn: 'برو سکشن بعد',
      tabs: [
        {
          id: 'crm',
          title: 'CRM و ERP',
          desc: 'اتصال بی‌دردسر سفارش‌ها، حسابداری و انبارداری به یک منبع حقیقت واحد. بدون اکسل‌های دستی و خطای انسانی.',
          metrics: 'همگام‌سازی لحظه‌ای · صف‌های مقاوم در برابر قطعی',
        },
        {
          id: 'frontend',
          title: 'Frontend',
          desc: 'رابط‌های سریع با Next.js، TypeScript و گرافیک WebGL که مثل اپلیکیشن بومی زیر دست کاربر پاسخ می‌دهند.',
          metrics: 'React 19 · Next.js App Router · ۶۰ فریم پایدار',
        },
        {
          id: 'integrations',
          title: 'Integrations',
          desc: 'پیوند درگاه‌های پرداخت، سرویس‌های لجستیک، انبار و وب‌هوک‌ها در یک گراف تمیز با لاگ دقیق و بازیابی خودکار.',
          metrics: 'REST / GraphQL · وب‌هوک‌های Idempotent',
        },
        {
          id: 'architecture',
          title: 'Architecture',
          desc: 'طراحی زیرساخت ماژولار که در کمپین‌های فروش ده برابر ترافیک را بدون افت سرعت تحمل می‌کند.',
          metrics: 'Edge Caching · طراحی Event-Driven',
        },
        {
          id: 'performance',
          title: 'Performance',
          desc: 'حذف کدهای اضافه، بهینه‌سازی کوئری‌ها و رساندن Core Web Vitals به محدوده‌ی سبز روی موبایل‌های معمولی.',
          metrics: 'Lighthouse ۹۵+ · زیر ۰.۸ ثانیه LCP',
        },
        {
          id: 'design',
          title: 'Design',
          desc: 'تایپوگرافی دقیق، سیستم طراحی بدون شلوغی و ریزتعامل‌هایی که حس کیفیت برند را در اولین ثانیه منتقل می‌کنند.',
          metrics: 'سیستم طراحی · تعاملات ظریف و قابل دسترس',
        },
      ],
    },
    process: {
      kicker: '۰۳ فرآیند',
      heading: 'از اولین تماس تا مدت‌ها بعد از لانچ.',
      stages: [
        { step: '۰۱', title: 'کشف (Discover)', sentence: 'قبل از یک خط کد، گلوگاه واقعی کسب‌وکار و داده‌هایت را روی میز می‌گذاریم.' },
        { step: '۰۲', title: 'طراحی (Design)', sentence: 'جریان کاربر، سلسله‌مراتب اطلاعات و پروتوتایپ تعاملی را شفاف و بی‌ابهام می‌بندیم.' },
        { step: '۰۳', title: 'معماری (Architect)', sentence: 'مدل داده، مرز سرویس‌ها و نقشه‌ی یکپارچه‌سازی را برای رشد دو سال آینده طراحی می‌کنم.' },
        { step: '۰۴', title: 'ساخت (Build)', sentence: 'تحویل هفتگی قابل لمس روی محیط تست؛ کد خوانا، تایپ‌شده و بدون بدهی پنهان.' },
        { step: '۰۵', title: 'لانچ (Launch)', sentence: 'انتقال بدون قطعی، مانیتورینگ زنده و اطمینان از این‌که اولین موج کاربران بی‌نقص عبور کند.' },
        { step: '۰۶', title: 'همراهی (Support)', sentence: 'بعد از انتشار ناپدید نمی‌شوم؛ پایش عملکرد و تکامل تدریجی سیستم ادامه دارد.' },
      ],
    },
    work: {
      kicker: '۰۴ کار برگزیده',
      client: 'Noor Atelier Commerce',
      year: '۱۴۰۴ / ۲۰۲۵',
      headline: 'بازسازی هسته‌ی فروش و انبار برای یک برند طراحی با ۱۴ شعبه.',
      briefLabel: 'بریف',
      brief:
        'فروشگاه آنلاین و سیستم صندوق شعبه‌ها از هم جدا بودند؛ موجودی با تاخیر ۳ ساعته به‌روز می‌شد و چک‌اوت موبایل در روزهای حراج از کار می‌افتاد.',
      roleLabel: 'نقش من',
      role: 'معمار اصلی سیستم، توسعه‌ی کامل فرانت‌اند و لایه‌ی همگام‌سازی ERP',
      stackLabel: 'استک فنی',
      stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Redis Streams', 'Stripe', 'WebGL'],
      outcomesLabel: 'نتایج عددی',
      outcomes: [
        { metric: '+۴۴٪', label: 'سرعت تکمیل خرید موبایل' },
        { metric: '۹۹.۹۸٪', label: 'دقت همگام‌سازی موجودی' },
        { metric: '۰.۷ ثانیه', label: 'زمان بارگذاری صفحه محصول' },
      ],
      toggleParticles: 'نمای ذره‌ای',
      togglePhoto: 'نمای عکاسی',
    },
    apps: {
      kicker: '۰۵ اپ‌های خودم',
      heading: 'محصولاتی که برای حل دردسرهای روزمره‌ی خودم ساختم.',
      dragHint: 'بکش یا با دکمه‌ها جابه‌جا کن',
      items: [
        {
          id: 'khatt',
          name: 'Khatt Studio',
          year: '۲۰۲۵',
          tagline: 'تبدیل تایپوگرافی فارسی و لاتین به نقشه نقاط برداری و شیدر GLSL.',
          detail: 'ابزار تحت وب برای طراحان خلاق جهت نمونه‌برداری دقیق حروف و خروجی مستقیم برای Three.js و SVG.',
          stack: ['Three.js', 'GLSL', 'WebAssembly', 'TypeScript'],
          accentTint: '#5B5BF0',
          urlLabel: 'پیش‌نمایش زنده',
        },
        {
          id: 'pulsesync',
          name: 'PulseSync ERP',
          year: '۲۰۲۴',
          tagline: 'موتور سبک همگام‌سازی وب‌هوک بین فروشگاه‌ها و نرم‌افزارهای مالی.',
          detail: 'مدیریت صف، تلاش مجدد هوشمند و دید لحظه‌ای روی هر رویداد سفارش بدون نیاز به سرور سنگین.',
          stack: ['Node.js', 'PostgreSQL', 'Redis', 'Next.js'],
          accentTint: '#7C7CF8',
          urlLabel: 'مستندات معماری',
        },
        {
          id: 'dastgah',
          name: 'Dastgah Synth',
          year: '۲۰۲۴',
          tagline: 'سینتی‌سایزر امبینت تحت مرورگر با کوک ربع‌پرده و موتور Web Audio.',
          detail: 'طراحی‌شده برای تمرکز عمیق هنگام کدنویسی؛ تولید بافت‌های صوتی زنده بدون فایل صوتی ثابت.',
          stack: ['Web Audio API', 'Canvas 2D', 'React', 'DSP'],
          accentTint: '#4848D6',
          urlLabel: 'اجرای صدا در سایت',
        },
      ],
    },
    experience: {
      kicker: '۰۶ تجربه',
      sinceLabel: 'سال شروع فعالیت حرفه‌ای',
      roles: [
        {
          year: 2023,
          period: '۲۰۲۳ — اکنون',
          role: 'بنیان‌گذار و مهندس ارشد سیستم‌ها',
          company: 'استودیو مهندسی کاوه',
          location: 'تهران / بین‌المللی',
          note: 'هدایت پروژه‌های تجارت الکترونیک، یکپارچه‌سازی ERP و رابط‌های خلاق برای تیم‌های اروپایی و منطقه‌ای.',
        },
        {
          year: 2021,
          period: '۲۰۲۱ — ۲۰۲۳',
          role: 'Lead Frontend & Architecture Engineer',
          company: 'Verve Commerce Studio',
          location: 'ریموت (برلین)',
          note: 'بازطراحی هسته‌ی فرانت‌اند برای ۶ برند خرده‌فروشی با ترافیک ماهانه بیش از ۴ میلیون نشست.',
        },
        {
          year: 2019,
          period: '۲۰۱۹ — ۲۰۲۱',
          role: 'Senior Full-Stack Engineer',
          company: 'پارس‌تک سیستمز',
          location: 'تهران',
          note: 'ساخت داشبوردهای لجستیک بلادرنگ، درگاه‌های پرداخت و سرویس‌های همگام‌سازی انبار.',
        },
        {
          year: 2017,
          period: '۲۰۱۷ — ۲۰۱۹',
          role: 'Creative Frontend Developer',
          company: 'استودیو تعاملی سایه',
          location: 'تهران',
          note: 'شروع مسیر حرفه‌ای با انیمیشن‌های تعاملی، تایپوگرافی وب و پیاده‌سازی وب‌سایت‌های نمایشگاهی.',
        },
      ],
      techStack: [
        'Next.js',
        'TypeScript',
        'React 19',
        'Three.js',
        'GLSL Shaders',
        'GSAP',
        'PostgreSQL',
        'Redis',
        'Node.js',
        'GraphQL',
        'Web Audio',
        'Tailwind CSS',
        'Docker',
        'Vercel Edge',
      ],
    },
    statement: {
      before: 'کد خوب،',
      accentWord: 'نامرئی است.',
      caption: 'کاربر نباید معماری تو را تحسین کند؛ فقط باید کارش بی‌وقفه و لذت‌بخش انجام شود.',
    },
    testimonial: {
      kicker: '۰۸ نقل‌قول مشتری',
      quote:
        '«سهیل در شش هفته سیستم انبار و چک‌اوتی را که دو تیم قبلی نتوانسته بودند پایدار کنند، از پایه مرتب کرد. در بزرگ‌ترین فروش سالانه‌مان حتی یک سفارش گم نشد.»',
      author: 'آرش مهرابی',
      role: 'هم‌بنیان‌گذار و مدیر عملیات',
      company: 'Noor Atelier Commerce',
      outcome: 'صفر خطای موجودی در کمپین فروش ۱۲٬۰۰۰ سفارش در ۲۴ ساعت',
    },
    afterhours: {
      kicker: '۰۹ پس از کار',
      heading: 'وقتی ترمینال را می‌بندم.',
      playerTitle: 'پلیر امبینت زنده (Web Audio)',
      tracks: [
        { id: 0, title: 'Drift 01 — نوار آنالوگ گرم', mood: 'آکورد پنجم ملایم · فیلتر پایین‌گذر', duration: '∞ زنده' },
        { id: 1, title: 'Drift 02 — باران نیمه‌شب و رودز', mood: 'بافت باران فیلترشده · نت‌های زایشی', duration: '∞ زنده' },
        { id: 2, title: 'Drift 03 — شیشه‌ی زیر صفر', mood: 'پد هارمونیک شفاف · بیس عمیق', duration: '∞ زنده' },
      ],
      hobbiesHeading: 'بازی‌ها و علاقه‌مندی‌ها',
      hobbies: [
        { title: 'شطرنج سریع (Rapid)', note: 'ریتینگ ۱۹۲۰ در Lichess — دفاع سیسیلی.' },
        { title: 'سینتی‌سایزرهای ماژولار', note: 'طراحی صدا و بافت‌های امبینت در آخر هفته‌ها.' },
        { title: 'عکاسی فیلم ۳۵ میلی‌متری', note: 'سیاه‌وسفید Ilford HP5 با لنز ۵۰mm.' },
        { title: 'Hollow Knight و Factorio', note: 'دقت در طراحی مرحله و بهینه‌سازی سیستم‌ها.' },
      ],
    },
    ask: {
      kicker: '۱۰ از من بپرس',
      heading: 'درباره‌ی تجربه، معماری یا پروژه‌هایم بپرس.',
      subline: 'این دستیار فقط بر اساس سابقه‌ی واقعی، مهارت‌ها و روش کار من پاسخ می‌دهد — مستقیم و بدون حاشیه.',
      placeholder: 'مثلاً: چطور ERP را به Next.js وصل می‌کنی؟',
      send: 'ارسال',
      thinking: 'در حال نوشتن پاسخ...',
      rateLimitMsg: 'تعداد درخواست‌ها در این دقیقه به سقف مجاز رسید. چند ثانیه دیگر دوباره تلاش کن.',
      errorMsg: 'ارتباط با سرور چت برقرار نشد. دوباره تلاش کن یا مستقیم ایمیل بزن.',
      starters: [
        'چطور سیستم موجودی و ERP را همگام می‌کنی؟',
        'استک فنی اصلی تو برای پروژه‌های فروشگاهی چیست؟',
        'فرآیند کار و زمان‌بندی یک پروژه چطور است؟',
      ],
    },
    contact: {
      prefix: 'واقعاً چی اذیتت می‌کند؟',
      painPoints: [
        'سایت کند و سنگین؟',
        'موجودی ناهماهنگ بین شعبه‌ها؟',
        'چک‌اوتی که مشتری را فراری می‌دهد؟',
        'کدی که کسی جرئت دست زدن به آن را ندارد؟',
      ],
      subline: 'یک پیام کوتاه بفرست؛ ظرف ۲۴ ساعت مستقیم خودم جواب می‌دهم.',
      cta: 'شروع گفتگو',
      modalTitle: 'بگو روی چه چیزی کار می‌کنی',
      modalSub: 'بدون فرم‌های طولانی — فقط اصل موضوع.',
      nameLabel: 'نام تو',
      emailLabel: 'ایمیل',
      messageLabel: 'چالش یا پروژه‌ات چیست؟',
      submitLabel: 'ارسال پیام',
      sentSuccess: 'پیامت آماده شد. لینک ارسال مستقیم به ایمیل من هم در دسترس است — خیلی زود پاسخ می‌دهم.',
      closeLabel: 'بستن',
      footer: {
        col1Title: 'ایمیل مستقیم',
        col2Title: 'شبکه‌ها',
        col3Title: 'زمان‌بندی و همکاری',
        scheduleCta: 'رزرو تماس ۲۰ دقیقه‌ای',
        scheduleNote: 'تهران (UTC+3:30) · همکاری ریموت با سراسر جهان',
        copyright: '© ۱۴۰۵ سهیل فیضی. همه‌چیز از ذره ساخته می‌شود.',
      },
    },
    chrome: {
      codeBtn: 'کد',
      siteBtn: 'Site',
      storyBtn: 'Story',
      cookieBtn: 'تنظیمات',
      menuLabel: 'منو',
      closeMenu: 'بستن',
      codeModalTitle: 'معماری این سایت',
      codeModalBody:
        'این پورتفولیو با Next.js App Router، شیدرهای GLSL سفارشی روی Three.js (تا ۸۰ هزار ذره با نمونه‌برداری پیکسل و دفع ماوس)، موتور صوتی Web Audio بدون فایل خارجی و چت استریم سروری ساخته شده است.',
      cookieModalTitle: 'حریم خصوصی و ذخیره‌سازی محلی',
      cookieModalBody: 'هیچ ردیاب تبلیغاتی یا کوکی شخص ثالثی در این سایت وجود ندارد. فقط ترجیحات رابط کاربری شما در مرورگر ذخیره می‌شود.',
      cookieEssential: 'ذخیره‌ی زبان (FA/EN) و حالت نمایش (Site/Story)',
      cookiePrefs: 'ذخیره‌ی تنظیمات صدای امبینت',
      cookieSave: 'ذخیره و بستن',
      soundOn: 'صدا روشن',
      soundOff: 'صدا خاموش',
    },
  },
  en: {
    person: {
      firstName: 'Soheil',
      lastName: 'Feizi',
      fullName: 'Soheil Feizi',
      location: 'Tehran, Iran',
      globalNote: 'Working with clients worldwide',
      role: 'Full-Stack & Creative Systems Engineer · Founder at Kaveh Studio',
      company: 'Kaveh Engineering Studio',
      email: 'soheil@feizi.studio',
      linkedin: 'https://linkedin.com/in/soheilfeizi',
      github: 'https://github.com/soheilfeizi',
      availability: 'Booking 2 projects for next quarter',
    },
    gateway: {
      question: 'How would you like to meet me?',
      siteTitle: 'Site',
      siteDesc: 'No audio, crisp scrolling straight to the work.',
      storyTitle: 'Story',
      storyDesc: '3D particle morphing experience — best with ambient sound.',
      soundLabel: 'Sound',
      soundDrift: 'Drift mode on',
      soundMuted: 'Muted',
      emailLabel: 'Direct email',
      linkedinLabel: 'LinkedIn',
    },
    intro: {
      particleWord: 'SOHEIL',
      lead: 'I did not start out building commerce infrastructure. Scroll down to see where it all began.',
      scrollCue: 'Scroll to assemble portrait',
    },
    hero: {
      tagline: 'Systems and stores you never have to think about.',
      subline: 'Most of what I build, you will never see — which means it is working.',
      cta: "Let's talk",
      profileLine: 'Soheil Feizi · Full-Stack Engineer & Founder · Working with clients worldwide',
      scrollHint: 'Scroll',
    },
    about: {
      kicker: '01 About Me',
      statementParts: [
        { text: 'Most of what I build, ' },
        { text: 'you will never see.', bold: true },
        { text: ' Search that responds in 30ms, ' },
        { text: 'checkouts that hold under peak load,', bold: true },
        { text: ' and warehouse inventory that stays ' },
        { text: 'quietly synchronized across five channels.', bold: true },
        { text: ' I am an engineer first, and ' },
        { text: 'I design too', bold: true },
        { text: ' — so nothing gets lost between architecture and pixels.' },
      ],
      badgeText: 'AWWWARDS NOMINEE · 2026 · ENGINEERING & DESIGN · ',
      stats: [
        { value: 9, suffix: '', label: 'Years Experience', detail: 'Web architecture & commerce systems' },
        { value: 42, suffix: '+', label: 'Shipped Projects', detail: 'Across Europe, MENA & North America' },
        { value: 38, prefix: '+', suffix: '%', label: 'Conversion Lift', detail: 'Average post-checkout rebuild' },
        { value: 64, prefix: '−', suffix: '%', label: 'Load Time Cut', detail: 'LCP reduction on high-traffic stores' },
      ],
    },
    whatido: {
      kicker: '02 What I Do',
      heading: 'Six layers that keep a product effortless.',
      nextSectionBtn: 'Next section',
      tabs: [
        {
          id: 'crm',
          title: 'CRM & ERP',
          desc: 'Connecting orders, accounting, and warehouse stock into a single source of truth — zero manual spreadsheets.',
          metrics: 'Real-time sync · Fault-tolerant queues',
        },
        {
          id: 'frontend',
          title: 'Frontend',
          desc: 'Tactile interfaces built with Next.js, TypeScript, and WebGL that respond like native instruments.',
          metrics: 'React 19 · Next.js App Router · 60fps',
        },
        {
          id: 'integrations',
          title: 'Integrations',
          desc: 'Stitching payment gateways, fulfillment APIs, and webhooks into an observable graph with automatic retries.',
          metrics: 'REST / GraphQL · Idempotent webhooks',
        },
        {
          id: 'architecture',
          title: 'Architecture',
          desc: 'Modular foundations designed to absorb 10x launch-day traffic spikes without breaking a sweat.',
          metrics: 'Edge caching · Event-driven pipelines',
        },
        {
          id: 'performance',
          title: 'Performance',
          desc: 'Trimming runtime bloat, tuning database queries, and hitting green Core Web Vitals on mid-tier phones.',
          metrics: '95+ Lighthouse · Sub-0.8s LCP',
        },
        {
          id: 'design',
          title: 'Design',
          desc: 'Disciplined typography, restraint, and purposeful micro-interactions that earn trust on the first viewport.',
          metrics: 'Design systems · Accessible motion',
        },
      ],
    },
    process: {
      kicker: '03 Process',
      heading: 'From the first call to long after launch.',
      stages: [
        { step: '01', title: 'Discover', sentence: 'Before a single line of code, we put the real business bottleneck and data model on the table.' },
        { step: '02', title: 'Design', sentence: 'Clear user flows, typographic hierarchy, and interactive prototypes with zero guesswork.' },
        { step: '03', title: 'Architect', sentence: 'Schemas, service boundaries, and integration contracts built for two years of growth.' },
        { step: '04', title: 'Build', sentence: 'Weekly shippable previews on staging — strictly typed, readable code with no hidden debt.' },
        { step: '05', title: 'Launch', sentence: 'Zero-downtime cutover, live telemetry, and smooth handling of the very first wave of traffic.' },
        { step: '06', title: 'Support', sentence: 'I do not vanish after release — continuous tuning and quiet iteration keep the system sharp.' },
      ],
    },
    work: {
      kicker: '04 Selected Work',
      client: 'Noor Atelier Commerce',
      year: '2025',
      headline: 'Rebuilding commerce & live inventory for a 14-store design brand.',
      briefLabel: 'Brief',
      brief:
        'Online storefront and retail POS were disconnected: inventory lagged by three hours and mobile checkout buckled during seasonal drops.',
      roleLabel: 'My Role',
      role: 'Principal Architect, Full-Stack Frontend & ERP Synchronization Engine',
      stackLabel: 'Stack',
      stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Redis Streams', 'Stripe', 'WebGL'],
      outcomesLabel: 'Measured Impact',
      outcomes: [
        { metric: '+44%', label: 'Faster mobile checkout' },
        { metric: '99.98%', label: 'Live stock accuracy' },
        { metric: '0.7s', label: 'Product page LCP' },
      ],
      toggleParticles: 'Particle view',
      togglePhoto: 'Photo view',
    },
    apps: {
      kicker: '05 Own Apps',
      heading: 'Small tools I built to scratch my own engineering itches.',
      dragHint: 'Drag horizontally or use controls',
      items: [
        {
          id: 'khatt',
          name: 'Khatt Studio',
          year: '2025',
          tagline: 'Converts Persian and Latin typography into sampled point clouds & GLSL uniforms.',
          detail: 'Browser tool for creative engineers to sample crisp glyph silhouettes directly into Three.js buffer attributes.',
          stack: ['Three.js', 'GLSL', 'WebAssembly', 'TypeScript'],
          accentTint: '#5B5BF0',
          urlLabel: 'Interactive spec',
        },
        {
          id: 'pulsesync',
          name: 'PulseSync ERP',
          year: '2024',
          tagline: 'Lightweight idempotent webhook bridge between storefronts and ERP ledgers.',
          detail: 'Dead-letter queues, replay inspector, and deterministic event ordering without enterprise overhead.',
          stack: ['Node.js', 'PostgreSQL', 'Redis', 'Next.js'],
          accentTint: '#7C7CF8',
          urlLabel: 'Architecture notes',
        },
        {
          id: 'dastgah',
          name: 'Dastgah Synth',
          year: '2024',
          tagline: 'Microtonal ambient synthesizer in the browser using pure Web Audio DSP.',
          detail: 'Built for deep coding sessions — generative harmonic textures with zero external audio files.',
          stack: ['Web Audio API', 'Canvas 2D', 'React', 'DSP'],
          accentTint: '#4848D6',
          urlLabel: 'Play audio in site',
        },
      ],
    },
    experience: {
      kicker: '06 Experience',
      sinceLabel: 'Building production software since',
      roles: [
        {
          year: 2023,
          period: '2023 — Present',
          role: 'Founder & Principal Systems Engineer',
          company: 'Kaveh Engineering Studio',
          location: 'Tehran / Worldwide',
          note: 'Leading commerce architecture, ERP integrations, and bespoke creative frontends for global teams.',
        },
        {
          year: 2021,
          period: '2021 — 2023',
          role: 'Lead Frontend & Architecture Engineer',
          company: 'Verve Commerce Studio',
          location: 'Remote (Berlin)',
          note: 'Re-architected storefront platforms for 6 retail brands serving 4M+ monthly sessions.',
        },
        {
          year: 2019,
          period: '2019 — 2021',
          role: 'Senior Full-Stack Engineer',
          company: 'ParsTech Systems',
          location: 'Tehran',
          note: 'Engineered real-time fulfillment dashboards, payment orchestration, and inventory sync workers.',
        },
        {
          year: 2017,
          period: '2017 — 2019',
          role: 'Creative Frontend Developer',
          company: 'Sayeh Interactive',
          location: 'Tehran',
          note: 'Started with editorial typography, WebGL experiments, and high-craft exhibition websites.',
        },
      ],
      techStack: [
        'Next.js',
        'TypeScript',
        'React 19',
        'Three.js',
        'GLSL Shaders',
        'GSAP',
        'PostgreSQL',
        'Redis',
        'Node.js',
        'GraphQL',
        'Web Audio',
        'Tailwind CSS',
        'Docker',
        'Vercel Edge',
      ],
    },
    statement: {
      before: 'Good code is',
      accentWord: 'invisible.',
      caption: 'Users should never notice your architecture — only that everything responds effortlessly.',
    },
    testimonial: {
      kicker: '08 Client Note',
      quote:
        '"In six weeks, Soheil untangled an inventory and checkout pipeline two prior teams failed to stabilize. During our biggest annual drop, not a single order slipped."',
      author: 'Arash Mehrabi',
      role: 'Co-Founder & COO',
      company: 'Noor Atelier Commerce',
      outcome: 'Zero oversold SKUs across 12,000 orders in 24 hours',
    },
    afterhours: {
      kicker: '09 After Hours',
      heading: 'When the terminal closes.',
      playerTitle: 'Live Ambient Player (Web Audio)',
      tracks: [
        { id: 0, title: 'Drift 01 — Warm Analog Tape', mood: 'Detuned fifths · slow lowpass sweep', duration: '∞ Live' },
        { id: 1, title: 'Drift 02 — Midnight Rain & Rhodes', mood: 'Filtered rain noise · generative plucks', duration: '∞ Live' },
        { id: 2, title: 'Drift 03 — Sub-Zero Glass', mood: 'Crystalline harmonic pad · deep sub', duration: '∞ Live' },
      ],
      hobbiesHeading: 'Games & Analog Obsessions',
      hobbies: [
        { title: 'Rapid Chess', note: '1920 Lichess rating — Sicilian Najdorf.' },
        { title: 'Modular Synthesizers', note: 'Patching generative ambient textures on weekends.' },
        { title: '35mm Film Photography', note: 'Ilford HP5 monochrome on a manual 50mm lens.' },
        { title: 'Hollow Knight & Factorio', note: 'Crafted level design and throughput optimization.' },
      ],
    },
    ask: {
      kicker: '10 Ask Me',
      heading: 'Ask about my experience, architecture, or work.',
      subline: 'Scoped strictly to my real background, stack, and projects — streamed live from the server.',
      placeholder: 'e.g. How do you sync ERP stock with Next.js?',
      send: 'Send',
      thinking: 'Streaming answer...',
      rateLimitMsg: 'Rate limit reached for this minute. Please wait a few seconds and try again.',
      errorMsg: 'Could not reach the chat server. Please try again or email me directly.',
      starters: [
        'How do you synchronize ERP inventory with Next.js?',
        'What is your core stack for high-traffic commerce?',
        'How does your discovery-to-launch process work?',
      ],
    },
    contact: {
      prefix: 'What is actually slowing you down?',
      painPoints: [
        'A sluggish storefront?',
        'Inventory out of sync?',
        'A checkout losing buyers?',
        'Legacy code no one dares touch?',
      ],
      subline: 'Send a short note — I reply personally within 24 hours.',
      cta: 'Start a conversation',
      modalTitle: 'Tell me what you are building',
      modalSub: 'No lengthy questionnaires — just the essentials.',
      nameLabel: 'Your name',
      emailLabel: 'Email',
      messageLabel: 'What problem should we solve?',
      submitLabel: 'Send note',
      sentSuccess: 'Your message is prepared. You can also reach me directly by email — I reply quickly.',
      closeLabel: 'Close',
      footer: {
        col1Title: 'Direct Email',
        col2Title: 'Social',
        col3Title: 'Scheduling',
        scheduleCta: 'Book a 20-min call',
        scheduleNote: 'Tehran (UTC+3:30) · Remote worldwide',
        copyright: '© 2026 Soheil Feizi. Everything is made of particles.',
      },
    },
    chrome: {
      codeBtn: 'Code',
      siteBtn: 'Site',
      storyBtn: 'Story',
      cookieBtn: 'Prefs',
      menuLabel: 'Menu',
      closeMenu: 'Close',
      codeModalTitle: 'How this site is built',
      codeModalBody:
        'Built with Next.js App Router, custom GLSL shaders on Three.js (up to 80k luminance-sampled particles with mouse repulsion), procedural Web Audio synthesis with zero external audio assets, and a streaming server-side AI chat route.',
      cookieModalTitle: 'Privacy & Local Storage',
      cookieModalBody: 'Zero third-party trackers or ad cookies. Only your interface preferences are stored locally in your browser.',
      cookieEssential: 'Store language (FA/EN) & experience mode (Site/Story)',
      cookiePrefs: 'Remember ambient sound preference',
      cookieSave: 'Save & close',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
    },
  },
};
