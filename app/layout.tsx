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
  return 'https://soheil.studio';
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
  title: 'Soheil Feizi — Creative Systems & Full-Stack Engineer',
  description:
    'Everything is made of particles. Full-stack & creative frontend engineer building invisible, resilient commerce and enterprise web systems for clients worldwide.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Soheil Feizi — Creative Systems & Full-Stack Engineer',
    description:
      'Systems and stores you never have to think about. Interactive WebGL GPGPU particle portfolio by Soheil Feizi.',
    type: 'website',
    siteName: 'Soheil Feizi',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soheil Feizi — Creative Systems & Full-Stack Engineer',
    description:
      'Everything is made of particles. Full-stack & creative frontend engineer working with clients worldwide.',
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Soheil Feizi',
  alternateName: 'سهیل فیضی',
  jobTitle: 'Senior Full-Stack & Creative Frontend Engineer',
  url: appUrl,
  email: 'mailto:soheil@feizi.studio',
  sameAs: [
    'https://linkedin.com/in/soheilfeizi',
    'https://github.com/soheilfeizi',
  ],
  knowsAbout: [
    'Next.js',
    'TypeScript',
    'WebGL2',
    'Three.js',
    'GPGPU Shaders',
    'GLSL',
    'GSAP ScrollTrigger',
    'ERP & CRM Integrations',
    'Web Performance',
  ],
  worksFor: {
    '@type': 'Organization',
    name: 'Kaveh Engineering Studio',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fa"
      dir="rtl"
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
