import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Vazirmatn, JetBrains_Mono } from 'next/font/google';
import TabTransitionOverlay from '@/components/TabTransitionOverlay';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

function resolveSafeAppUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).toString().replace(/\/$/, '');
    } catch {
      // Fallback if APP_URL is a placeholder string
    }
  }
  return 'https://code1sprint.vercel.app';
}

const appUrl = resolveSafeAppUrl();

export const viewport: Viewport = {
  themeColor: '#ECEBE7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'Soheil Feizi — Full-Stack & AI Systems Engineer',
  description:
    'Personal portfolio of Soheil Feizi. Full-Stack & AI Systems Engineer specializing in Go microservices, multimodal RAG, and reactive Next.js & React 19 platforms.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Soheil Feizi — Full-Stack & AI Systems Engineer',
    description:
      'Resilient systems and intelligent architectures that hold under pressure. Interactive particle portfolio by Soheil Feizi.',
    type: 'website',
    siteName: 'Soheil Feizi',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soheil Feizi — Full-Stack & AI Systems Engineer',
    description:
      'Full-Stack & AI Systems Engineer building scalable Go services, multimodal AI workflows, and tactile frontends.',
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Soheil Feizi',
  alternateName: 'سهیل فیضی',
  jobTitle: 'Full-Stack & AI Systems Engineer',
  url: appUrl,
  email: 'mailto:soheil.feizi@hotmail.com',
  sameAs: [
    'https://linkedin.com/in/soheilfeizi',
    'https://github.com/FeiziSoheil',
    'https://t.me/feizisoheil',
  ],
  knowsAbout: [
    'Go (Golang)',
    'Next.js 16',
    'React 19',
    'TypeScript',
    'FastAPI',
    'Python',
    'LangChain & LangGraph',
    'Multimodal RAG',
    'Qdrant Vector Database',
    'MongoDB & PostgreSQL',
    'Docker & Linux',
    'Three.js & WebGL',
  ],
  worksFor: {
    '@type': 'Organization',
    name: 'Ravan Ertebat Asr',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${interTight.variable} ${vazirmatn.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-[var(--bg)] text-[var(--ink)] antialiased overflow-x-clip selection:bg-[#5B5BF0] selection:text-[#ECEBE7]"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
        <TabTransitionOverlay />
      </body>
    </html>
  );
}
