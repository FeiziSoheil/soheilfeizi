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
      url?: string;
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
      type?: 'synth' | 'soundcloud';
      soundcloudUrl?: string;
      startTimeMs?: number;
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
      globalNote: 'مهندس نرم‌افزار و سیستم‌های هوش مصنوعی',
      role: 'مهندس Full-Stack و توسعه‌دهنده سیستم‌های AI',
      company: 'شرکت روان ارتباط عصر & توسعه مستقل',
      email: 'soheil.feizi@hotmail.com',
      linkedin: 'https://linkedin.com/in/soheilfeizi',
      github: 'https://github.com/FeiziSoheil',
      availability: 'آماده همکاری در پروژه‌های پیشرفته و مشاوره معماری',
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
      lead: 'از مهندسی میکروسرویس‌های توزیع‌شده Go تا پایپ‌لاین‌های هوش مصنوعی و فرانت‌اندهای مدرن؛ اسکرول کن تا نحوه ساخت سیستم‌ها را ببینی.',
      scrollCue: 'برای شکل‌گیری پرتره اسکرول کن',
    },
    hero: {
      tagline: 'سامانه‌های یکپارچه و سیستم‌های هوشمندی که زیر فشار نمی‌شکنند.',
      subline: 'معماری مقیاس‌پذیر با Go، هوش مصنوعی چندوجهی، پایپ‌لاین‌های بلادرنگ و فرانت‌اندهای مدرن با Next.js و React 19.',
      cta: 'بیا گفتگو کنیم',
      profileLine: 'سهیل فیضی · مهندس Full-Stack و AI · تهران & ریموت',
      scrollHint: 'اسکرول',
    },
    about: {
      kicker: '۰۱ درباره‌ی من',
      statementParts: [
        { text: 'مهندسی نرم‌افزار برای من یعنی ' },
        { text: 'قابلیت اطمینان بالا و کارایی پایدار.', bold: true },
        { text: ' چه یک ' },
        { text: 'CRM سازمانی با دسترسی‌های چندنقشی RBAC', bold: true },
        { text: ' باشد، چه ' },
        { text: 'دستیار هوشمند RAG با جستجوی برداری و صوت زنده،', bold: true },
        { text: ' و چه ' },
        { text: 'سرویس‌های پرسرعت Go و پردازش‌های بلادرنگ،', bold: true },
        { text: ' هدف همیشه یکی است: سیستم‌هایی بدون بدهی فنی، سریع و بی‌نقص زیر بار سنگین پروداکشن.' },
      ],
      badgeText: 'مهندسی نرم‌افزار · هوش مصنوعی · فول‌استک و میکروسرویس · ',
      stats: [
        { value: 5, suffix: '+', label: 'سال تجربه مهندسی', detail: 'معماری سیستم، فول‌استک و یادگیری ماشین' },
        { value: 20, suffix: '+', label: 'پروژه و سامانه عملیاتی', detail: 'CRM، سامانه‌های درمانی، پلتفرم‌های اجتماعی و ابری' },
        { value: 5, suffix: '', label: 'آموزشگاه تخصصی', detail: 'تدریس مبانی یادگیری ماشین، شبکه‌های عصبی و پایتون' },
        { value: 99.9, prefix: '', suffix: '٪', label: 'آپ‌تایم و قابلیت اطمینان', detail: 'پایداری سیستم‌های توزیع‌شده و درگاه‌های B2B' },
      ],
    },
    whatido: {
      kicker: '۰۲ چه می‌کنم',
      heading: 'شش ستون اصلی برای ساخت سیستم‌های مدرن و مقیاس‌پذیر.',
      nextSectionBtn: 'برو سکشن بعد',
      tabs: [
        {
          id: 'crm',
          title: 'CRM و سامانه‌های سازمانی',
          desc: 'طراحی جامع ماژول‌های لید، معامله، فعالیت و گزارش‌گیری KPI با کنترل دسترسی ردیفی RBAC، ایزولاسیون داده و تراکنش‌های ACID.',
          metrics: 'RBAC چندسطحی · تطبیق هوشمند لید با AI · نوتیفیکیشن زنده',
        },
        {
          id: 'frontend',
          title: 'فرانت‌اند مدرن و واکنش‌گرا',
          desc: 'توسعه رابط‌های کاربری فوق‌سریع با Next.js 16، React 19، TypeScript، Tailwind CSS 4، shadcn/ui و انیمیشن‌های روان Framer Motion و GSAP.',
          metrics: 'Next.js App Router · TanStack Query · Zod · ۶۰ فریم پایدار',
        },
        {
          id: 'integrations',
          title: 'هوش مصنوعی چندوجهی و RAG',
          desc: 'پیاده‌سازی دستیاران هوشمند سازمانی، پایپ‌لاین‌های صوتی STT/TTS (Whisper و Edge-TTS)، بازیابی برداری با Qdrant و مدل‌های زبانی با LangChain و LangGraph.',
          metrics: 'CLIP Embeddings · Qdrant Vector DB · Voice VAD',
        },
        {
          id: 'architecture',
          title: 'بک‌اند، میکروسرویس و ارتباطات زنده',
          desc: 'توسعه میکروسرویس‌های بهینه با Go (Echo v4)، Node.js و FastAPI، طراحی OpenAPI/REST، و ارسال بلادرنگ داده با WebSocket و SSE.',
          metrics: 'Go Echo v4 · JWT / Session · SSE & WebSocket',
        },
        {
          id: 'performance',
          title: 'پایگاه‌های داده و ذخیره‌سازی ابری',
          desc: 'طراحی اسکیمای بهینه روی MongoDB، PostgreSQL و MySQL، کشینگ توزیع‌شده با Redis و ذخیره‌سازی پایدار تصاویر و اسناد با MinIO S3.',
          metrics: 'MongoDB Transactions · PostgreSQL · Redis · MinIO',
        },
        {
          id: 'design',
          title: 'دوآپس، کانتینرسازی و لینوکس',
          desc: 'کانتینرسازی با Docker و Docker Compose، مدیریت سرورهای لینوکس (Ubuntu/Debian)، راه‌اندازی Nginx با SSL/TLS و استقرار خودکار با Drone CI.',
          metrics: 'Docker Compose · Nginx SSL/TLS · Drone CI · Linux',
        },
      ],
    },
    process: {
      kicker: '۰۳ فرآیند',
      heading: 'از کشف نیازمندی تا استقرار پایدار در محیط عملیاتی.',
      stages: [
        { step: '۰۱', title: 'کشف و تحلیل (Discover)', sentence: 'بررسی دقیق مدل داده، نقش‌های دسترسی، الزامات امنیت و گلوگاه‌های سیستمی قبل از نوشتن کد.' },
        { step: '۰۲', title: 'معماری و اسکیمای داده (Architect)', sentence: 'طراحی اسکیمای دیتابیس، مرزهای میکروسرویس‌ها، قراردادهای API و استراتژی کشینگ.' },
        { step: '۰۳', title: 'پیاده‌سازی هسته بک‌اند (Core Backend)', sentence: 'توسعه میکروسرویس‌های پرسرعت Go و پایتون، منطق بیزینس، کنترل دسترسی RBAC و احراز هویت امن.' },
        { step: '۰۴', title: 'توسعه فرانت‌اند و تعاملات (Modern UX)', sentence: 'پیاده‌سازی رابط‌های کاربری واکنش‌گرا و سریع با Next.js، اعتبارسنجی فرم‌ها با Zod و سیستم‌های طراحی مدرن.' },
        { step: '۰۵', title: 'هوشمندسازی و اتصال سرویس‌ها (AI & Integrations)', sentence: 'یکپارچه‌سازی پایگاه برداری Qdrant، دستیاران هوشمند، پایپ‌لاین‌های صوتی، پیامک و نوتیفیکیشن‌های زنده.' },
        { step: '۰۶', title: 'کانتینرسازی و استقرار پروداکشن (Deploy & Support)', sentence: 'استقرار با Docker Compose، Nginx با TLS، مانیتورینگ سلامت سرویس‌ها و پشتیبانی بدون قطعی.' },
      ],
    },
    work: {
      kicker: '۰۴ کار برگزیده',
      client: 'Real Estate CRM & Agency Platform',
      year: '۱۴۰۴ / ۲۰۲۵',
      headline: 'طراحی و توسعه کامل CRM املاک با تطبیق هوشمند لید، معماری ماژولار و کانتینرسازی پروداکشن.',
      briefLabel: 'بریف پروژه',
      brief:
        'پلتفرم جامع مدیریت مشاوران، مشتریان، املاک و معاملات همراه با کنترل دقیق دسترسی ردیفی داده‌ها (RBAC)، نقشه تعاملی MapLibre و سایت عمومی آژانس همگام با پنل مدیریت.',
      roleLabel: 'نقش من',
      role: 'معمار سیستم و توسعه‌دهنده فول‌استک (Next.js 16 + Go Echo + Python AI Service)',
      stackLabel: 'استک فنی',
      stack: ['Next.js 16', 'React 19', 'Go Echo v4', 'MongoDB', 'Redis', 'MinIO', 'Python AI', 'Docker Compose', 'MapLibre GL'],
      outcomesLabel: 'نتایج کلیدی',
      outcomes: [
        { metric: '۱۰۰٪', label: 'تفکیک دسترسی ردیفی داده‌ها بر اساس مشاور' },
        { metric: 'زیر ۰.۵ ثانیه', label: 'تطبیق هوشمند لید با ملک توسط AI' },
        { metric: 'Real-time', label: 'اعلان‌های آنی کارکنان با Web Push و SMS' },
      ],
      toggleParticles: 'نمای ذره‌ای',
      togglePhoto: 'نمای گرافیک',
    },
    apps: {
      kicker: '۰۵ اپ‌های خودم',
      heading: 'محصولات و پلتفرم‌های مستقلی که از صفر تا صد توسعه داده‌ام.',
      dragHint: 'بکش یا با دکمه‌ها جابه‌جا کن',
      items: [
        {
          id: 'parakgram',
          name: 'Parakgram',
          year: '۲۰۲۵',
          tagline: 'پلتفرم اجتماعی مدرن و کامل با فید هوشمند، استوری و چت زنده.',
          detail: 'شامل فید الگوریتمی For You / Following، استوری ۲۴ ساعته با آمار بازدید، پیام‌رسانی بلادرنگ با SSE و سیستم فالو و اکانت خصوصی.',
          stack: ['Next.js 15', 'React 19', 'MongoDB', 'SSE', 'TanStack Query', 'Tailwind 4'],
          accentTint: '#5B5BF0',
          urlLabel: 'مشاهده در گیت‌هاب',
          url: 'https://github.com/FeiziSoheil/Parakgram',
        },
        {
          id: 'parak-rag',
          name: 'PARAK AI Assistant',
          year: '۲۰۲۵',
          tagline: 'دستیار خرید هوشمند چندوجهی RAG با جستجوی متن و تصویر و آواتار سه‌بعدی.',
          detail: 'مجهز به جستجوی برداری Qdrant و امبدینگ‌های CLIP، پایپ‌لاین صوتی زنده (VAD + Whisper STT + Edge-TTS) و رابط سه‌بعدی با React Three Fiber.',
          stack: ['FastAPI', 'Qdrant', 'LangChain', 'CLIP', 'Whisper', 'React Three Fiber'],
          accentTint: '#7C7CF8',
          urlLabel: 'مشاهده در گیت‌هاب',
          url: 'https://github.com/FeiziSoheil/Parak-Rag',
        },
        {
          id: 'parak-task-manager',
          name: 'Parak Task Manager',
          year: '۲۰۲۵',
          tagline: 'سامانه مدیریت وظایف و بورد هوشمند پروژه‌ها با رابط کاربری تعاملی.',
          detail: 'توسعه‌یافته با تایپ‌اسکریپت و ری‌اکت، قابلیت دسته‌بندی ستون‌های کانبان، فیلتر آنی وظایف، درگ اند دراپ روان و مدیریت وضعیت پیشرفت.',
          stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'DnD Kit', 'Zustand'],
          accentTint: '#38BDF8',
          urlLabel: 'مشاهده در گیت‌هاب',
          url: 'https://github.com/FeiziSoheil/Parak-Task-Manager',
        },
        {
          id: 'harime-mehr',
          name: 'HarimeMehr',
          year: '۲۰۲۵',
          tagline: 'سامانه جامع مدیریت هوشمند پیش‌دبستانی حریم مهر.',
          detail: 'سیستم یکپارچه مدیریت پرونده نوآموزان، پایش و ثبت اقساط شهریه، حضور و غیاب روزانه و گزارش‌گیری اداری با رابط کاربری روان و بهینه‌سازی‌شده.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
          accentTint: '#EC4899',
          urlLabel: 'مشاهده در گیت‌هاب',
          url: 'https://github.com/FeiziSoheil/HarimeMehr',
        },
        {
          id: 'mana-amlak',
          name: 'Mana Amlak',
          year: '۲۰۲۵',
          tagline: 'پورتال هوشمند مشاورین املاک مانا با کاتالوگ فایل‌ها و جستجوی پیشرفته.',
          detail: 'دموی آنلاین فعال روی گیت‌هاب پیج با فیلترهای چندمعیاره ملک، کارت‌های اطلاعاتی، گالری تصاویر تعاملی و طراحی استاندارد املاک.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'GitHub Pages'],
          accentTint: '#10B981',
          urlLabel: 'مشاهده دمو آنلاین',
          url: 'https://code1sprint.github.io/Mana-Amlak/',
        },
        {
          id: 'artam-amlak',
          name: 'Artam Amlak',
          year: '۲۰۲۵',
          tagline: 'وب‌سایت اختصاصی آژانس املاک آرتام با نمایش مدرن و دسته‌بندی فایل‌ها.',
          detail: 'پیاده‌سازی زنده روی گیت‌هاب پیج با انیمیشن‌های روان، دسته‌بندی انواع معاملات (رهن، اجاره، خرید) و تجربه کاربری بهینه موبایل.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
          accentTint: '#F59E0B',
          urlLabel: 'مشاهده دمو آنلاین',
          url: 'https://code1sprint.github.io/Artam-Amlak/',
        },
        {
          id: 'dimplomat-amlak',
          name: 'Dimplomat Amlak',
          year: '۲۰۲۵',
          tagline: 'ویترین آنلاین و صفحه اختصاصی معرفی املاک لوکس دیپلمات.',
          detail: 'طراحی شیک با استانداردهای وب، معرفی پروژه‌های کلیدی مسکونی و تجاری، تصاویر باکیفیت و دمو آنلاین فعال روی گیت‌هاب پیج.',
          stack: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Web'],
          accentTint: '#EAB308',
          urlLabel: 'مشاهده دمو آنلاین',
          url: 'https://code1sprint.github.io/Dimplomat-Amlak/',
        },
        {
          id: 'zara-elite',
          name: 'Zara Elite',
          year: '۲۰۲۵',
          tagline: 'پلتفرم ویترین و معرفی محصولات برند مد و پوشاک زارا الیت.',
          detail: 'دمو آنلاین روی گیت‌هاب پیج با استایل مینیمال، اسلایدر محصولات، کاتالوگ کالکشن‌ها و طراحی لوکس مطابق ترندهای روز.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
          accentTint: '#A855F7',
          urlLabel: 'مشاهده دمو آنلاین',
          url: 'https://code1sprint.github.io/Zara-Elite/',
        },
        {
          id: 'noir',
          name: 'NOIR Studio',
          year: '۲۰۲۵',
          tagline: 'تجربه وب خلاقانه با تم دارک، تایپوگرافی برجسته و انیمیشن‌های استودیو نوآر.',
          detail: 'پیاده‌سازی زنده روی گیت‌هاب پیج با تم تاریک مینیمال، هاورافکت‌های بصری جذاب و عملکرد بسیار سریع و سبک.',
          stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
          accentTint: '#94A3B8',
          urlLabel: 'مشاهده دمو آنلاین',
          url: 'https://code1sprint.github.io/NOIR/',
        },
        {
          id: 'sepas-clinic',
          name: 'Sepas Clinic',
          year: '۲۰۲۵',
          tagline: 'سامانه نوبت‌دهی هوشمند، پرونده الکترونیک سلامت (EHR) و مصاحبه پیش‌ویزیت AI.',
          detail: 'پلتفرم چندنقشی با نوبت‌دهی آنلاین بدون امکان رزرو مضاعف در تراکنش‌های MongoDB، صف پذیرش زنده و سرویس جداگانه مصاحبه هوشمند FastAPI.',
          stack: ['Go Echo', 'FastAPI', 'MongoDB', 'Next.js', 'LangChain', 'Redis'],
          accentTint: '#4848D6',
          urlLabel: 'مشاهده در گیت‌هاب',
          url: 'https://github.com/FeiziSoheil',
        },
      ],
    },
    experience: {
      kicker: '۰۶ تجربه',
      sinceLabel: 'سال شروع فعالیت حرفه‌ای',
      roles: [
        {
          year: 2026,
          period: '۲۰۲۶ — اکنون',
          role: 'مهندس نرم‌افزار / فول‌استک',
          company: 'شرکت روان ارتباط عصر',
          location: 'تهران، ایران',
          note: 'توسعه پروژه‌های مخابراتی سازمانی و B2B مبین‌نت، معماری درگاه‌های پرداخت امن IPG، میکروسرویس‌های پرترافیک و سیستم‌های حساس به تاخیر.',
        },
        {
          year: 2024,
          period: '۲۰۲۴ — ۲۰۲۵',
          role: 'دانشمند داده و مهندس فول‌استک',
          company: 'شرکت توسعه نرم‌افزاری ورتم',
          location: 'تهران، ایران',
          note: 'طراحی و پیاده‌سازی مدل‌های یادگیری ماشین، سیستم‌های داده‌محور، خطوط لوله پردازش داده و سرویس‌های بک‌اند با Go و Python.',
        },
        {
          year: 2023,
          period: '۲۰۲۳ — ۲۰۲۴',
          role: 'مدرس هوش مصنوعی و یادگیری ماشین',
          company: 'مراکز آموزش تخصصی (۵ آموزشگاه معتبر)',
          location: 'تهران، ایران',
          note: 'تدریس دوره‌های تخصصی یادگیری ماشین، یادگیری عمیق، پایتون پیشرفته، Scikit-learn و پیاده‌سازی الگوریتم‌های هوش مصنوعی برای ده‌ها دانش‌پذیر.',
        },
        {
          year: 2022,
          period: '۲۰۲۲ — ۲۰۲۳',
          role: 'توسعه‌دهنده فرانت‌اند',
          company: 'شرکت توسعه نرم‌افزاری آی پارا',
          location: 'تهران، ایران',
          note: 'توسعه وب‌اپلیکیشن‌های واکنش‌گرا و مدرن، سیستم‌های طراحی مبتنی بر کامپوننت با Next.js، React، TypeScript و استایل‌دهی Tailwind.',
        },
      ],
      techStack: [
        'Go (Golang)',
        'TypeScript',
        'Python',
        'Next.js 16',
        'React 19',
        'Echo v4',
        'FastAPI',
        'LangChain',
        'LangGraph',
        'Qdrant',
        'MongoDB',
        'PostgreSQL',
        'Redis',
        'Docker Compose',
        'Tailwind CSS 4',
        'MinIO S3',
        'Three.js',
        'Linux / Nginx',
      ],
    },
    statement: {
      before: 'نرم‌افزار مهندسی‌شده،',
      accentWord: 'پایدار و مطمئن است.',
      caption: 'زیبایی واقعی سیستم زمانی آشکار می‌شود که زیر ترافیک و فشار سنگین، بدون ذره‌ای وقفه پاسخ می‌دهد.',
    },
    testimonial: {
      kicker: '۰۸ دیدگاه همکاران',
      quote:
        '«سهیل تسلط کم‌نظیری بر تمام لایه‌ها از معماری بک‌اند Go و دیتابیس تا فرانت‌اند مدرن و هوش مصنوعی دارد. در پروژه‌های حساس ما، تحویل به موقع و پایداری سیستم همواره تضمین‌شده بود.»',
      author: 'مدیر فنی سیستم‌های سازمانی',
      role: 'تیم زیرساخت و پروژه‌های B2B',
      company: 'روان ارتباط عصر',
      outcome: 'پایداری ۹۹.۹٪ در سرویس‌های مخابراتی سازمانی و تراکنش‌های امن',
    },
    afterhours: {
      kicker: '۰۹ پس از کار',
      heading: 'وقتی ترمینال را می‌بندم.',
      playerTitle: 'پلیر صوتی و امبینت (SoundCloud & Web Audio)',
      tracks: [
        {
          id: 0,
          title: 'Tick-Tock — Hans Zimmer',
          mood: 'موسیقی متن اصلی میان‌ستاره‌ای · شروع از ۱:۵۰ (اوج ارگ و ثانیه‌شمار)',
          duration: '۰۸:۱۸ (۱:۵۰+)',
          type: 'soundcloud',
          startTimeMs: 110000,
          soundcloudUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1420290673%23t%3D1%3A50&color=%235b5bf0&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
        },
        {
          id: 1,
          title: 'Day One — Hans Zimmer',
          mood: 'موسیقی متن اصلی فیلم میان‌ستاره‌ای · پیانو و تم کیهانی',
          duration: '۰۳:۱۹',
          type: 'soundcloud',
          startTimeMs: 0,
          soundcloudUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A306470963&color=%235b5bf0&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
        },
        {
          id: 2,
          title: 'Drift — میان‌ستاره‌ای (Web Audio)',
          mood: 'ارگ کیهانی سنتزشده · پالس گذر زمان و نوسان ابدی ماورای سیاه‌چاله',
          duration: '∞ زنده',
          type: 'synth',
        },
      ],
      hobbiesHeading: 'علاقه‌مندی‌ها و پژوهش‌های شخصی',
      hobbies: [
        { title: 'مدل‌های زبانی متن‌باز (Open LLMs)', note: 'بررسی معماری ترنسفورمرها، فاین‌تیون و ارزیابی استنتاج محلی.' },
        { title: 'گرافیک سه‌بعدی تعاملی و شیدرها', note: 'خلق تجربیات بصری با Three.js، WebGL و انیمیشن‌های مبتنی بر محاسبات ریاضی.' },
        { title: 'طراحی صدای دیجیتال و سینتی‌سایزر', note: 'آزمایش با سنتز صدا، فیلترهای آنالوگ و بافت‌های امبینت برای تمرکز عمیق.' },
        { title: 'چالش‌های الگوریتمی و سیستم‌های همزمانی', note: 'حل مسائل ساختار داده، بهینه‌سازی کوئری‌ها و معماری‌های رویدادمحور.' },
      ],
    },
    ask: {
      kicker: '۱۰ از من بپرس',
      heading: 'درباره‌ی تجربه، معماری یا پروژه‌هایم بپرس.',
      subline: 'این دستیار فقط بر اساس سابقه‌ی واقعی، مهارت‌ها و پروژه‌های سهیل فیضی پاسخ می‌دهد — مستقیم و دقیق.',
      placeholder: 'مثلاً: چطور میکروسرویس Go را به سیستم هوش مصنوعی وصل می‌کنی؟',
      send: 'ارسال',
      thinking: 'در حال نوشتن پاسخ...',
      rateLimitMsg: 'تعداد درخواست‌ها در این دقیقه به سقف مجاز رسید. چند ثانیه دیگر دوباره تلاش کن.',
      errorMsg: 'ارتباط با سرور چت برقرار نشد. دوباره تلاش کن یا مستقیم ایمیل بزن.',
      starters: [
        'چطور میکروسرویس Go را با سرویس AI پایتون یکپارچه می‌کنی؟',
        'معماری سامانه نوبت‌دهی Sepas Clinic و جلوگیری از رزرو مضاعف چطور کار می‌کند؟',
        'پایپ‌لاین چندوجهی RAG با صوت و تصویر در پروژه Parak چطور پیاده شده است؟',
      ],
    },
    contact: {
      prefix: 'کدام چالش فنی نیاز به راه‌حل اساسی دارد؟',
      painPoints: [
        'معماری کُند یا مقیاس‌ناپذیر سیستم؟',
        'نیاز به هوشمندسازی محصول با LLM و RAG؟',
        'ناهماهنگی بین فرانت‌اند و میکروسرویس‌های بک‌اند؟',
        'چالش‌های استقرار پروداکشن، داکر و امنیت داده‌ها؟',
      ],
      subline: 'می‌توانی از طریق ایمیل، تلگرام یا تماس تلفنی مستقیماً با من در ارتباط باشی — در کوتاه‌ترین زمان پاسخ می‌دهم.',
      cta: 'شروع گفتگو',
      modalTitle: 'درباره پروژه یا چالش فنی خود بنویسید',
      modalSub: 'ایده، ابعاد پروژه یا نیاز سازمانی‌تان را مطرح کنید.',
      nameLabel: 'نام شما',
      emailLabel: 'ایمیل شما',
      messageLabel: 'چالش یا پروژه شما چیست؟',
      submitLabel: 'ارسال پیام',
      sentSuccess: 'پیام شما آماده شد. می‌توانید مستقیم به ایمیل من پیام ارسال کنید یا در تلگرام در ارتباط باشید.',
      closeLabel: 'بستن',
      footer: {
        col1Title: 'ایمیل و تماس مستقیم',
        col2Title: 'شبکه‌ها و گیت‌هاب',
        col3Title: 'همکاری و استقرار',
        scheduleCta: 'پیام مستقیم در تلگرام',
        scheduleNote: 'تلفن: ۰۹۱۴۲۸۹۵۸۲۵ · ایمیل: soheil.feizi@hotmail.com · تهران / ریموت',
        copyright: '© ۲۰۲۶ سهیل فیضی. طراحی و مهندسی سیستم‌های مدرن.',
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
      globalNote: 'Full-Stack & AI Systems Engineer',
      role: 'Full-Stack & AI Systems Engineer',
      company: 'Ravan Ertebat Asr & Independent Systems',
      email: 'soheil.feizi@hotmail.com',
      linkedin: 'https://linkedin.com/in/soheilfeizi',
      github: 'https://github.com/FeiziSoheil',
      availability: 'Available for complex software & AI systems architecture',
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
      lead: 'From high-performance Go microservices to multimodal AI workflows and reactive frontends. Scroll down to see how the architecture comes together.',
      scrollCue: 'Scroll to assemble portrait',
    },
    hero: {
      tagline: 'Resilient web platforms and intelligent AI pipelines that never break under load.',
      subline: 'Engineered with Go, multimodal RAG, real-time queues, and fluid interfaces built in Next.js & React 19.',
      cta: "Let's talk",
      profileLine: 'Soheil Feizi · Full-Stack & AI Systems Engineer · Tehran & Remote',
      scrollHint: 'Scroll',
    },
    about: {
      kicker: '01 About Me',
      statementParts: [
        { text: 'To me, engineering is about ' },
        { text: 'uncompromising reliability and precision.', bold: true },
        { text: ' Whether building ' },
        { text: 'enterprise CRMs with granular RBAC,', bold: true },
        { text: ' multimodal ' },
        { text: 'RAG assistants with vector search & live audio,', bold: true },
        { text: ' or ' },
        { text: 'high-throughput Go services under heavy load,', bold: true },
        { text: ' the mission stays clear: zero technical debt, sub-second latency, and calm execution under pressure.' },
      ],
      badgeText: 'SOFTWARE ARCHITECTURE · MACHINE LEARNING · FULL-STACK SYSTEMS · ',
      stats: [
        { value: 5, suffix: '+', label: 'Years Experience', detail: 'Systems architecture, full-stack & machine learning' },
        { value: 20, suffix: '+', label: 'Production Launches', detail: 'Enterprise CRM, healthcare, social & B2B infrastructure' },
        { value: 5, suffix: '', label: 'Tech Academies', detail: 'Taught machine learning, neural networks & Python' },
        { value: 99.9, prefix: '', suffix: '%', label: 'System Reliability', detail: 'High-availability services and transactional uptime' },
      ],
    },
    whatido: {
      kicker: '02 What I Do',
      heading: 'Six core pillars that power high-concurrency modern software.',
      nextSectionBtn: 'Next section',
      tabs: [
        {
          id: 'crm',
          title: 'Enterprise Platforms & CRM',
          desc: 'Architecting lead, deal, staff, and KPI modules with fine-grained RBAC, row-level data isolation, and ACID transactions.',
          metrics: 'Granular RBAC · AI Lead Matching · Real-time Web Push',
        },
        {
          id: 'frontend',
          title: 'Modern & Reactive Frontend',
          desc: 'Tactile, high-speed interfaces built with Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, and GSAP/Framer Motion.',
          metrics: 'Next.js App Router · TanStack Query · Zod · 60fps',
        },
        {
          id: 'integrations',
          title: 'Multimodal AI & RAG',
          desc: 'End-to-end multimodal chatbots, voice STT/TTS (Whisper & Edge-TTS), Qdrant vector retrieval, and LangChain/LangGraph orchestration.',
          metrics: 'CLIP Embeddings · Qdrant Vector DB · Voice VAD',
        },
        {
          id: 'architecture',
          title: 'Backend & Distributed Services',
          desc: 'High-throughput backend services engineered with Go (Echo v4), Node.js, and FastAPI, using OpenAPI, WebSockets, and SSE streams.',
          metrics: 'Go Echo v4 · JWT / Session · SSE & WebSocket',
        },
        {
          id: 'performance',
          title: 'Databases & Cloud Storage',
          desc: 'Production schemas across MongoDB, PostgreSQL, and MySQL, distributed caching with Redis, and S3-compatible MinIO object storage.',
          metrics: 'MongoDB Transactions · PostgreSQL · Redis · MinIO',
        },
        {
          id: 'design',
          title: 'DevOps, Containers & Linux',
          desc: 'Containerization with Docker Compose, Linux server administration (Ubuntu/Debian), Nginx reverse proxy with TLS, and Drone CI pipelines.',
          metrics: 'Docker Compose · Nginx SSL/TLS · Drone CI · Linux',
        },
      ],
    },
    process: {
      kicker: '03 Process',
      heading: 'From architectural discovery to zero-downtime production delivery.',
      stages: [
        { step: '01', title: 'Discover & Analyze', sentence: 'Pinpointing data models, security boundaries, and concurrency constraints before writing code.' },
        { step: '02', title: 'Architect & Model', sentence: 'Designing clean database schemas, service boundaries, OpenAPI contracts, and caching strategies.' },
        { step: '03', title: 'Core Backend Engineering', sentence: 'Building high-throughput Go and Python services with strict RBAC, data integrity, and session security.' },
        { step: '04', title: 'Modern Frontend UX', sentence: 'Crafting responsive Next.js interfaces with Zod validation, optimistic UI updates, and smooth animations.' },
        { step: '05', title: 'AI & External Integrations', sentence: 'Plugging in Qdrant vector search, live audio STT/TTS, automated webhooks, and push notifications.' },
        { step: '06', title: 'Deploy & Continuous Support', sentence: 'Automating builds with Docker Compose, Nginx TLS proxying, monitoring, and zero-downtime scaling.' },
      ],
    },
    work: {
      kicker: '04 Selected Work',
      client: 'Real Estate CRM & Agency Platform',
      year: '2025 — 2026',
      headline: 'Full-stack Real Estate CRM & Agency Platform with AI Lead Matching and Production Docker Deployment.',
      briefLabel: 'Brief',
      brief:
        'An end-to-end agency management solution featuring advisor-specific row-level RBAC, real-time staff push alerts, interactive MapLibre property map, and synced public listing portal.',
      roleLabel: 'My Role',
      role: 'Principal Systems Architect & Full-Stack Engineer (Next.js 16 + Go Echo + Python AI)',
      stackLabel: 'Stack',
      stack: ['Next.js 16', 'React 19', 'Go Echo v4', 'MongoDB', 'Redis', 'MinIO', 'Python AI', 'Docker Compose', 'MapLibre GL'],
      outcomesLabel: 'Measured Impact',
      outcomes: [
        { metric: '100%', label: 'Row-level advisor data isolation' },
        { metric: '<0.5s', label: 'AI lead-to-property matching latency' },
        { metric: 'Real-time', label: 'Instant staff alerts via Web Push & SMS' },
      ],
      toggleParticles: 'Particle view',
      togglePhoto: 'Graphic view',
    },
    apps: {
      kicker: '05 Own Apps',
      heading: 'Production applications and autonomous platforms built from scratch.',
      dragHint: 'Drag horizontally or use controls',
      items: [
        {
          id: 'parakgram',
          name: 'Parakgram',
          year: '2025',
          tagline: 'Modern full-stack social platform with algorithmic feeds, 24h stories, and SSE messaging.',
          detail: 'Next.js 15, React 19, MongoDB, and TanStack Query featuring real-time SSE messaging, typing indicators, stories with viewer tracking, and private accounts.',
          stack: ['Next.js 15', 'React 19', 'MongoDB', 'SSE', 'TanStack Query', 'Tailwind 4'],
          accentTint: '#5B5BF0',
          urlLabel: 'View on GitHub',
          url: 'https://github.com/FeiziSoheil/Parakgram',
        },
        {
          id: 'parak-rag',
          name: 'PARAK AI Assistant',
          year: '2025',
          tagline: 'Multimodal RAG shopping assistant with image search, voice STT/TTS, and 3D avatar.',
          detail: 'Powered by CLIP embeddings, Qdrant vector retrieval, voice pipeline (VAD + Whisper + Edge-TTS), and interactive 3D avatar via React Three Fiber.',
          stack: ['FastAPI', 'Qdrant', 'LangChain', 'CLIP', 'Whisper', 'React Three Fiber'],
          accentTint: '#7C7CF8',
          urlLabel: 'View on GitHub',
          url: 'https://github.com/FeiziSoheil/Parak-Rag',
        },
        {
          id: 'parak-task-manager',
          name: 'Parak Task Manager',
          year: '2025',
          tagline: 'Modern Kanban task management OS with drag-and-drop & status tracking.',
          detail: 'Built with TypeScript and Next.js, featuring real-time column sorting, task priorities, status workflows, and fluid DnD interactions.',
          stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'DnD Kit', 'Zustand'],
          accentTint: '#38BDF8',
          urlLabel: 'View on GitHub',
          url: 'https://github.com/FeiziSoheil/Parak-Task-Manager',
        },
        {
          id: 'harime-mehr',
          name: 'HarimeMehr',
          year: '2025',
          tagline: 'Preschool Management Platform for student records, tuition & attendance tracking.',
          detail: 'All-in-one preschool administrative system featuring toddler profile management, tuition installment tracking, daily attendance logging, and clear reporting dashboards.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
          accentTint: '#EC4899',
          urlLabel: 'View on GitHub',
          url: 'https://github.com/FeiziSoheil/HarimeMehr',
        },
        {
          id: 'mana-amlak',
          name: 'Mana Amlak',
          year: '2025',
          tagline: 'Interactive real estate portal with advanced property filtering & showcase.',
          detail: 'Live GitHub Pages deployment featuring multi-parameter property filters, interactive gallery modals, and responsive layout.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'GitHub Pages'],
          accentTint: '#10B981',
          urlLabel: 'Live Demo',
          url: 'https://code1sprint.github.io/Mana-Amlak/',
        },
        {
          id: 'artam-amlak',
          name: 'Artam Amlak',
          year: '2025',
          tagline: 'Artam real estate agency portal featuring category filters & property cards.',
          detail: 'Live GitHub Pages interactive showcase with sleek cards, rent/buy filtering, and responsive mobile-first architecture.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
          accentTint: '#F59E0B',
          urlLabel: 'Live Demo',
          url: 'https://code1sprint.github.io/Artam-Amlak/',
        },
        {
          id: 'dimplomat-amlak',
          name: 'Dimplomat Amlak',
          year: '2025',
          tagline: 'Diplomat luxury real estate showcase & property portfolio landing.',
          detail: 'Clean responsive landing showcasing luxury estates, curated photo galleries, and deployed directly on GitHub Pages.',
          stack: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Web'],
          accentTint: '#EAB308',
          urlLabel: 'Live Demo',
          url: 'https://code1sprint.github.io/Dimplomat-Amlak/',
        },
        {
          id: 'zara-elite',
          name: 'Zara Elite',
          year: '2025',
          tagline: 'Modern fashion & lifestyle product showcase for Zara Elite.',
          detail: 'Live fashion lookbook on GitHub Pages featuring curated collections, fluid transitions, and a premium editorial aesthetic.',
          stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
          accentTint: '#A855F7',
          urlLabel: 'Live Demo',
          url: 'https://code1sprint.github.io/Zara-Elite/',
        },
        {
          id: 'noir',
          name: 'NOIR Studio',
          year: '2025',
          tagline: 'Dark-aesthetic creative studio web experience with bold typography & micro-interactions.',
          detail: 'Live deployment on GitHub Pages highlighting high-contrast dark design, smooth hover states, and refined motion details.',
          stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
          accentTint: '#94A3B8',
          urlLabel: 'Live Demo',
          url: 'https://code1sprint.github.io/NOIR/',
        },
        {
          id: 'sepas-clinic',
          name: 'Sepas Clinic',
          year: '2025',
          tagline: 'Smart clinic scheduling, electronic health records (EHR), and AI pre-consultation engine.',
          detail: 'Multi-role clinic platform with zero double-booking concurrency guarantees in MongoDB transactions, EHR modules, and separate FastAPI AI pre-consultation microservice.',
          stack: ['Go Echo', 'FastAPI', 'MongoDB', 'Next.js', 'LangChain', 'Redis'],
          accentTint: '#4848D6',
          urlLabel: 'View on GitHub',
          url: 'https://github.com/FeiziSoheil',
        },
      ],
    },
    experience: {
      kicker: '06 Experience',
      sinceLabel: 'Building production software since',
      roles: [
        {
          year: 2026,
          period: '2026 — Present',
          role: 'Full-Stack & Systems Engineer',
          company: 'Ravan Ertebat Asr',
          location: 'Tehran, Iran',
          note: 'Engineering enterprise B2B telecom solutions for MobinNet, secure IPG payment gateways, and resilient high-throughput microservices.',
        },
        {
          year: 2024,
          period: '2024 — 2025',
          role: 'Data Scientist & Full-Stack Engineer',
          company: 'Vartam Software Development',
          location: 'Tehran, Iran',
          note: 'Developed machine learning pipelines, predictive models, data-driven backends in Go and Python, and scalable distributed storage systems.',
        },
        {
          year: 2023,
          period: '2023 — 2024',
          role: 'Machine Learning & AI Instructor',
          company: 'Tech Training Academies (5 Institutes)',
          location: 'Tehran, Iran',
          note: 'Instructed professional courses in Machine Learning, Deep Learning, advanced Python, Scikit-learn, and hands-on algorithm deployment.',
        },
        {
          year: 2022,
          period: '2022 — 2023',
          role: 'Frontend Developer',
          company: 'I-Para Software Development',
          location: 'Tehran, Iran',
          note: 'Crafted responsive, high-fidelity web applications and modular design systems using Next.js, React, TypeScript, and modern CSS frameworks.',
        },
      ],
      techStack: [
        'Go (Golang)',
        'TypeScript',
        'Python',
        'Next.js 16',
        'React 19',
        'Echo v4',
        'FastAPI',
        'LangChain',
        'LangGraph',
        'Qdrant',
        'MongoDB',
        'PostgreSQL',
        'Redis',
        'Docker Compose',
        'Tailwind CSS 4',
        'MinIO S3',
        'Three.js',
        'Linux / Nginx',
      ],
    },
    statement: {
      before: 'Engineered software',
      accentWord: 'never stumbles.',
      caption: 'True engineering is felt when everything runs silently, reliably, and without friction under heavy pressure.',
    },
    testimonial: {
      kicker: '08 Collaborator Note',
      quote:
        '"Soheil possesses a rare mastery across all layers — from Go backend architecture and databases to modern frontends and AI. In our critical infrastructure projects, delivery speed and rock-solid reliability were always guaranteed."',
      author: 'Technical Director',
      role: 'Enterprise & B2B Systems',
      company: 'Ravan Ertebat Asr',
      outcome: '99.9% uptime across enterprise telecom services and secure transactions',
    },
    afterhours: {
      kicker: '09 After Hours',
      heading: 'When the terminal closes.',
      playerTitle: 'Audio & Ambient Player (SoundCloud & Web Audio)',
      tracks: [
        {
          id: 0,
          title: 'Tick-Tock — Hans Zimmer',
          mood: 'Original Interstellar OST · Starts at 01:50 (Peak organ & ticking clock)',
          duration: '08:18 (01:50+)',
          type: 'soundcloud',
          startTimeMs: 110000,
          soundcloudUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1420290673%23t%3D1%3A50&color=%235b5bf0&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
        },
        {
          id: 1,
          title: 'Day One — Hans Zimmer',
          mood: 'Original Interstellar OST · Piano & cosmic theme',
          duration: '03:19',
          type: 'soundcloud',
          startTimeMs: 0,
          soundcloudUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A306470963&color=%235b5bf0&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
        },
        {
          id: 2,
          title: 'Drift — Interstellar Cosmos (Web Audio)',
          mood: 'Synthesized cosmic pipe organ · time dilation pulse & event horizon',
          duration: '∞ Live',
          type: 'synth',
        },
      ],
      hobbiesHeading: 'Analog Pursuits & Engineering Curiosities',
      hobbies: [
        { title: 'Open-Source LLMs & Transformers', note: 'Researching transformer architectures, fine-tuning, and local inference.' },
        { title: '3D Creative Coding & Shaders', note: 'Crafting interactive WebGL graphics and math-driven animations in Three.js.' },
        { title: 'Digital Sound Synthesis', note: 'Experimenting with procedural audio, analog-modeled filters, and focus drones.' },
        { title: 'Algorithmic Optimization', note: 'Solving graph problems, concurrency patterns, and data structure challenges.' },
      ],
    },
    ask: {
      kicker: '10 Ask Me',
      heading: 'Ask about my experience, architecture, or work.',
      subline: 'Scoped strictly to my real background, stack, and projects — streamed live from the server.',
      placeholder: 'e.g. How do you integrate Go microservices with Python AI services?',
      send: 'Send',
      thinking: 'Streaming answer...',
      rateLimitMsg: 'Rate limit reached for this minute. Please wait a few seconds and try again.',
      errorMsg: 'Could not reach the chat server. Please try again or email me directly.',
      starters: [
        'How do you integrate Go microservices with Python AI models?',
        'How does Sepas Clinic prevent double-booking during concurrent appointments?',
        'How was the multimodal RAG voice pipeline designed in Parak?',
      ],
    },
    contact: {
      prefix: 'What technical bottleneck needs a solid solution?',
      painPoints: [
        'A sluggish or non-scalable system architecture?',
        'Integrating multimodal AI, LLMs, or RAG into your product?',
        'Friction between frontend apps and backend microservices?',
        'Production deployment, Docker orchestration, or data security?',
      ],
      subline: 'Send a message via email, Telegram, or phone — I reply personally in the shortest time.',
      cta: 'Start a conversation',
      modalTitle: 'Tell me what you are building',
      modalSub: 'Share your vision, project scale, or technical challenge.',
      nameLabel: 'Your name',
      emailLabel: 'Your email',
      messageLabel: 'What problem should we solve?',
      submitLabel: 'Send note',
      sentSuccess: 'Your message is prepared. You can reach out directly via email or Telegram — I reply quickly.',
      closeLabel: 'Close',
      footer: {
        col1Title: 'Direct Email & Phone',
        col2Title: 'Social & GitHub',
        col3Title: 'Collaboration',
        scheduleCta: 'Message on Telegram',
        scheduleNote: 'Phone: +989142895825 · Email: soheil.feizi@hotmail.com · Tehran / Remote',
        copyright: '© 2026 Soheil Feizi. Modern systems engineered with precision.',
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
