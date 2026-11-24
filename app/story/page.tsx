import type { Metadata } from 'next';
import StoryExperience from '@/components/story/StoryExperience';

export const metadata: Metadata = {
  title: 'Story · Soheil Feizi — 3D Particle Narrative',
  description:
    'A scroll-driven 3D WebGL particle narrative across 11 chapters — from raw suspended noise through spatial systems, Z-axis throughput tunnel, and human craft.',
};

interface StoryPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StoryPage({ searchParams }: StoryPageProps) {
  const sp = searchParams ? await searchParams : {};
  const from = typeof sp.from === 'string' ? sp.from : undefined;
  const debug = typeof sp.debug === 'string' ? sp.debug : undefined;
  const initialEntered = from === 'tab' || debug === 'shapes';

  return <StoryExperience initialEntered={initialEntered} />;
}
