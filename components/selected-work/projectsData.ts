import type { StaticImageData } from 'next/image';
import type { Locale } from '@/lib/content';
import workRealEstateImg from '@/src/assets/images/work_real_estate_crm.png';
import workPromagicImg from '@/src/assets/images/work_promagic.png';
import workParakImg from '@/src/assets/images/work_parak_rag.png';
import workSepasImg from '@/src/assets/images/work_sepas_clinic.png';
import workApplyImg from '@/src/assets/images/work_apply_platform.png';

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
      id: 'real-estate-crm',
      title: 'Real Estate CRM & Portal',
      image: workRealEstateImg,
      imageSrc: workRealEstateImg.src,
      tag: 'Next.js 16 · Go Echo v4 · MongoDB & Docker · Enterprise CRM',
      description:
        'Engineered an end-to-end real estate agency operating system: lead/property management, deals, KPI reports, and strict row-level RBAC data isolation based on advisor ownership.',
      extra: 'Includes intelligent AI lead-to-property matching, interactive MapLibre spatial map, MinIO S3 object storage, and synchronized public listing portal.',
      url: 'https://amlakepaliz.ir',
      fallbackGradient: 'radial-gradient(circle at 60% 45%, #3a2b1c 0%, #111013 65%, #060608 100%)',
    },
    {
      id: 'parak-rag',
      title: 'Parak AI Assistant',
      image: workParakImg,
      imageSrc: workParakImg.src,
      tag: 'Multimodal RAG · CLIP & Qdrant · 3D Avatar & Voice · FastAPI',
      description:
        'Full-stack multimodal conversational commerce chatbot featuring text + image vector retrieval with CLIP embeddings, intent routing, and real-time streaming LLM responses.',
      extra: 'End-to-end voice pipeline (browser VAD → faster-whisper STT → RAG → Edge-TTS) paired with an interactive 3D avatar built in React Three Fiber.',
      url: 'https://github.com/FeiziSoheil/Parak-Rag',
      fallbackGradient: 'radial-gradient(circle at 45% 40%, #1d2142 0%, #0b0c14 65%, #050508 100%)',
    },
    {
      id: 'sepas-clinic',
      title: 'Sepas Clinic',
      image: workSepasImg,
      imageSrc: workSepasImg.src,
      tag: 'Healthcare OS · Go Echo & FastAPI · MongoDB Transactions · LangChain',
      description:
        'Comprehensive multi-role clinic management and smart booking platform. Guarantees zero double-booking concurrency using ACID transactions in MongoDB.',
      extra: 'Features live queue, EHR (SOAP) records, e-prescriptions, and a standalone FastAPI + LangChain microservice for AI pre-consultation interviews.',
      url: 'https://github.com/FeiziSoheil/Clinic',
      fallbackGradient: 'radial-gradient(circle at 50% 35%, #24333a 0%, #0d1215 65%, #050708 100%)',
    },
    {
      id: 'apply-platform',
      title: 'Apply Platform',
      image: workApplyImg,
      imageSrc: workApplyImg.src,
      tag: 'In Development · Educational Agency OS · Next.js App Router · CRM & CMS',
      description:
        'Unified student abroad portal: public website, comprehensive CRM/CMS back-office for dossiers and consultations, and mobile-first student self-service PWA.',
      extra: 'Strict multi-role RBAC, sanitized RichContent CMS, document workflows, optimistic concurrency (If-Match), and automated Playwright E2E suites.',
      url: 'https://github.com/FeiziSoheil/Apply',
      fallbackGradient: 'radial-gradient(circle at 55% 50%, #3d2414 0%, #120d0c 65%, #060608 100%)',
    },
    {
      id: 'promagic',
      title: 'ProMagic E-Commerce & Catalog',
      image: workPromagicImg,
      imageSrc: workPromagicImg.src,
      tag: 'Next.js 15 · Go Echo v5 · PostgreSQL & Docker · Luxury E-Commerce',
      description:
        'Engineered an end-to-end luxury e-commerce and product catalog platform for ProMagic: modular catalog engine, high-performance Go Echo API, and full i18n support.',
      extra: 'Custom TipTap v3 rich content editor, JWT dual-layer authentication, automated pgxpool PostgreSQL migrations, and instant Next.js on-demand cache revalidation.',
      url: 'https://promagic.ir',
      fallbackGradient: 'radial-gradient(circle at 55% 45%, #2a1f18 0%, #120e0d 65%, #060506 100%)',
    },
  ],
  fa: [
    {
      id: 'real-estate-crm',
      title: 'سامانه جامع املاک و CRM',
      image: workRealEstateImg,
      imageSrc: workRealEstateImg.src,
      tag: 'Next.js 16 · Go Echo v4 · MongoDB و Docker · پلتفرم سازمانی',
      description:
        'طراحی و توسعه کامل CRM املاک شامل ماژول‌های مشتریان، لید، ملک، معاملات، فعالیت‌ها و گزارش‌گیری KPI با کنترل دسترسی ردیفی داده‌ها (RBAC) بر اساس مالکیت مشاور.',
      extra: 'تطبیق هوشمند لید با ملک توسط AI، نقشه تعاملی MapLibre، ذخیره‌سازی MinIO S3 و سایت عمومی آژانس همگام با پنل مدیریت.',
      url: 'https://amlakepaliz.ir',
      fallbackGradient: 'radial-gradient(circle at 60% 45%, #3a2b1c 0%, #111013 65%, #060608 100%)',
    },
    {
      id: 'parak-rag',
      title: 'دستیار هوشمند خرید Parak',
      image: workParakImg,
      imageSrc: workParakImg.src,
      tag: 'RAG چندوجهی · CLIP و Qdrant · آواتار سه‌بعدی و صوت · FastAPI',
      description:
        'چت‌بات و دستیار هوشمند خرید چندوجهی با قابلیت جستجوی ترکیبی متن و تصویر توسط امبدینگ‌های CLIP، بازیابی برداری Qdrant و مسیریابی هوشمند پرامپت‌ها.',
      extra: 'پایپ‌لاین کامل صوتی (VAD مرورگر → Whisper STT → استنتاج RAG → صوت Edge-TTS) به‌همراه آواتار سه‌بعدی تعاملی با React Three Fiber.',
      url: 'https://github.com/FeiziSoheil/Parak-Rag',
      fallbackGradient: 'radial-gradient(circle at 45% 40%, #1d2142 0%, #0b0c14 65%, #050508 100%)',
    },
    {
      id: 'sepas-clinic',
      title: 'Sepas Clinic',
      image: workSepasImg,
      imageSrc: workSepasImg.src,
      tag: 'سامانه پزشکی · Go Echo و FastAPI · تراکنش‌های MongoDB · LangChain',
      description:
        'پلتفرم چندنقشی مدیریت کلینیک (بیمار، پزشک، منشی، ادمین) با نوبت‌دهی هوشمند و جلوگیری قطعی از رزرو مضاعف با تراکنش‌های ACID در دیتابیس MongoDB.',
      extra: 'صف پذیرش زنده، ماژول پرونده سلامت EHR (SOAP)، نسخه الکترونیک و سرویس اختصاصی پیش‌ویزیت و مصاحبه هوشمند بیمار با FastAPI و LangChain.',
      url: 'https://github.com/FeiziSoheil/Clinic',
      fallbackGradient: 'radial-gradient(circle at 50% 35%, #24333a 0%, #0d1215 65%, #050708 100%)',
    },
    {
      id: 'apply-platform',
      title: 'پلتفرم اعزام دانشجو Apply',
      image: workApplyImg,
      imageSrc: workApplyImg.src,
      tag: 'در حال توسعه · سامانه مدیریت پذیرش · Next.js App Router · CRM و CMS',
      description:
        'پلتفرم یکپارچه اعزام دانشجو شامل سایت عمومی، پنل مدیریت پیشرفته (CRM سرنخ‌ها، کانبان، پرونده و امور مالی) و پنل موبایل‌فرست اختصاصی دانشجو.',
      extra: 'کنترل دسترسی چندسطحی RBAC، سیستم CMS هیبرید امن، مدیریت مدارک با ورود OTP و تست‌های امنیتی و E2E با Playwright.',
      url: 'https://github.com/FeiziSoheil/Apply',
      fallbackGradient: 'radial-gradient(circle at 55% 50%, #3d2414 0%, #120d0c 65%, #060608 100%)',
    },
    {
      id: 'promagic',
      title: 'پلتفرم فروشگاهی و کاتالوگ پرومجیک',
      image: workPromagicImg,
      imageSrc: workPromagicImg.src,
      tag: 'Next.js 15 · Go Echo v5 · PostgreSQL و Docker · فروشگاه اختصاصی',
      description:
        'طراحی و پیاده‌سازی پلتفرم مدرن کاتالوگ و فروشگاه آنلاین برند پرومجیک (کارن بهروز کیش) با معماری ماژولار، فریم‌ورک سریع Go Echo و استانداردهای طراحی لوکس.',
      extra: 'ویرایشگر محتوای پیشرفته TipTap v3، احراز هویت دوسطحی JWT، بازتولید آنی کش (On-demand Revalidation) و دیتابیس PostgreSQL با مایگریشن‌های خودکار.',
      url: 'https://promagic.ir',
      fallbackGradient: 'radial-gradient(circle at 55% 45%, #2a1f18 0%, #120e0d 65%, #060506 100%)',
    },
  ],
};
