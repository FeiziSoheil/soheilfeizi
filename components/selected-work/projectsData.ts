import type { StaticImageData } from 'next/image';
import type { Locale } from '@/lib/content';
import workNoorImg from '@/src/assets/images/work_noor_atelier_1795257246882.jpg';
import workVerveImg from '@/src/assets/images/work_verve_ledger_1795257247109.jpg';
import workKavehImg from '@/src/assets/images/work_kaveh_spatial_1795257249411.jpg';
import workDastgahImg from '@/src/assets/images/work_dastgah_audio_1795257264115.jpg';

export interface SelectedProject {
  id: string;
  title: string;
  image: StaticImageData;
  imageSrc: string;
  tag: string;
  description: string;
  extra: string;
  url: string;
  fallbackGradient: string;
}

export interface SelectedWorkCopy {
  sectionIndex: string;
  sectionTitle: string;
  topRightNote: string;
  titleSubtitle: string;
  skipNext: string;
  visitSite: string;
  nomineeLabel: string;
  projectListAria: string;
}

export const SELECTED_WORK_COPY: Record<Locale, SelectedWorkCopy> = {
  en: {
    sectionIndex: '(03)',
    sectionTitle: 'SELECTED WORK',
    topRightNote: 'Team and freelance',
    titleSubtitle: "Work I've had a hand in",
    skipNext: 'Skip to the next section',
    visitSite: 'Visit site',
    nomineeLabel: 'Nominee',
    projectListAria: 'Selected work scroll progress',
  },
  fa: {
    sectionIndex: '(۰۳)',
    sectionTitle: 'پروژه‌های منتخب',
    topRightNote: 'تیمی و فریلنس',
    titleSubtitle: 'پروژه‌هایی که در ساخت آن‌ها نقش داشته‌ام',
    skipNext: 'پرش به بخش بعدی',
    visitSite: 'مشاهده سایت',
    nomineeLabel: 'Nominee',
    projectListAria: 'پیشرفت اسکرول پروژه‌های منتخب',
  },
};

export const SELECTED_PROJECTS: Record<Locale, SelectedProject[]> = {
  en: [
    {
      id: 'noor-atelier',
      title: 'Noor Atelier',
      image: workNoorImg,
      imageSrc: workNoorImg.src,
      tag: 'Luxury Commerce · Next.js & ERP Sync · Kaveh Studio',
      description:
        'Re-architected omnichannel storefront and real-time POS inventory engine across 14 flagship boutiques — cutting product page LCP to 0.7s while absorbing peak seasonal drops with zero oversold stock.',
      extra: 'Also delivered custom checkout telemetry, Stripe orchestration, and store associate iPad tools.',
      url: 'https://nooratelier.example.com',
      fallbackGradient: 'radial-gradient(circle at 60% 45%, #3a2b1c 0%, #111013 65%, #060608 100%)',
    },
    {
      id: 'verve-ledger',
      title: 'Verve Ledger',
      image: workVerveImg,
      imageSrc: workVerveImg.src,
      tag: 'FinTech Infrastructure · TypeScript & Edge · Verve Berlin',
      description:
        'High-throughput multi-currency settlement dashboard and webhook inspector serving 4M+ monthly commerce sessions with deterministic event replay and sub-30ms indexed search.',
      extra: 'Built alongside the Berlin platform team — paired with an open internal design system.',
      url: 'https://verveledger.example.com',
      fallbackGradient: 'radial-gradient(circle at 45% 40%, #1d2142 0%, #0b0c14 65%, #050508 100%)',
    },
    {
      id: 'kaveh-spatial',
      title: 'Kaveh Spatial',
      image: workKavehImg,
      imageSrc: workKavehImg.src,
      tag: 'Architectural Exhibition · Three.js & GLSL · Freelance',
      description:
        'Interactive digital monograph and spatial wayfinding experience for a contemporary architectural pavilion — pairing raw concrete photography with custom shader lighting and zero-jitter smooth scroll.',
      extra: 'Featured in curated creative web showcases with full RTL/LTR bilingual typography.',
      url: 'https://kavehspatial.example.com',
      fallbackGradient: 'radial-gradient(circle at 50% 35%, #24333a 0%, #0d1215 65%, #050708 100%)',
    },
    {
      id: 'dastgah-audio',
      title: 'Dastgah Synth',
      image: workDastgahImg,
      imageSrc: workDastgahImg.src,
      tag: 'Generative Audio · Web Audio DSP & React · Independent',
      description:
        'Browser-native microtonal modular synthesizer and interactive hardware showcase built with pure Web Audio oscillators, analog-modeled ladder filters, and tactile canvas metering.',
      extra: 'Includes preset sharing, MIDI controller binding, and live ambient performance mode.',
      url: 'https://dastgah.example.com',
      fallbackGradient: 'radial-gradient(circle at 55% 50%, #3d2414 0%, #120d0c 65%, #060608 100%)',
    },
  ],
  fa: [
    {
      id: 'noor-atelier',
      title: 'Noor Atelier',
      image: workNoorImg,
      imageSrc: workNoorImg.src,
      tag: 'تجارت الکترونیک لوکس · Next.js و همگام‌سازی ERP · استودیو کاوه',
      description:
        'بازسازی کامل هسته‌ی فروش آنلاین و موتور همگام‌سازی موجودی لحظه‌ای برای ۱۴ شعبه‌ی طراحی — کاهش زمان LCP صفحه‌ی محصول به ۰.۷ ثانیه و ثبت صفر خطای موجودی در کمپین‌های فروش.',
      extra: 'به‌همراه داشبورد پایش چک‌اوت، اتصال درگاه پرداخت و ابزار تبلت فروشندگان شعبه.',
      url: 'https://nooratelier.example.com',
      fallbackGradient: 'radial-gradient(circle at 60% 45%, #3a2b1c 0%, #111013 65%, #060608 100%)',
    },
    {
      id: 'verve-ledger',
      title: 'Verve Ledger',
      image: workVerveImg,
      imageSrc: workVerveImg.src,
      tag: 'زیرساخت فین‌تک · TypeScript و Edge · Verve برلین',
      description:
        'داشبورد تسویه‌ی چندارزی و بازرس وب‌هوک با توان پردازش بیش از ۴ میلیون نشست ماهانه، قابلیت بازپخش قطعی رویدادها و جست‌وجوی ایندکس‌شده زیر ۳۰ میلی‌ثانیه.',
      extra: 'اجراشده با تیم پلتفرم برلین به‌همراه سیستم طراحی اختصاصی و کتابخانه‌ی کامپوننت.',
      url: 'https://verveledger.example.com',
      fallbackGradient: 'radial-gradient(circle at 45% 40%, #1d2142 0%, #0b0c14 65%, #050508 100%)',
    },
    {
      id: 'kaveh-spatial',
      title: 'Kaveh Spatial',
      image: workKavehImg,
      imageSrc: workKavehImg.src,
      tag: 'نمایشگاه معماری · Three.js و GLSL · فریلنس',
      description:
        'مونوگراف دیجیتال تعاملی و تجربه‌ی مسیریابی فضایی برای یک پاویون معماری معاصر — ترکیب عکاسی بتن خام با نورپردازی شیدر سفارشی و اسکرول نرم بدون لرزش.',
      extra: 'پشتیبانی کامل دوزبانه (RTL و LTR) با تایپوگرافی دقیق و انیمیشن‌های فیزیک‌محور.',
      url: 'https://kavehspatial.example.com',
      fallbackGradient: 'radial-gradient(circle at 50% 35%, #24333a 0%, #0d1215 65%, #050708 100%)',
    },
    {
      id: 'dastgah-audio',
      title: 'Dastgah Synth',
      image: workDastgahImg,
      imageSrc: workDastgahImg.src,
      tag: 'صدای زایشی · Web Audio DSP و React · مستقل',
      description:
        'سینتی‌سایزر ماژولار ربع‌پرده تحت مرورگر و ویترین تعاملی سخت‌افزار با نوسان‌سازهای خالص Web Audio، فیلترهای آنالوگ مدل‌سازی‌شده و سطح‌سنج زنده‌ی Canvas.',
      extra: 'شامل اشتراک‌گذاری پریست، اتصال کنترلر MIDI و حالت اجرای امبینت زنده.',
      url: 'https://dastgah.example.com',
      fallbackGradient: 'radial-gradient(circle at 55% 50%, #3d2414 0%, #120d0c 65%, #060608 100%)',
    },
  ],
};
