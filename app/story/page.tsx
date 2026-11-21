import type { Metadata } from 'next';
import StoryExperience from '@/components/story/StoryExperience';

export const metadata: Metadata = {
  title: 'Story · Soheil Feizi — 3D Particle Narrative',
  description:
    'A scroll-driven 3D WebGL particle narrative across 11 chapters — from raw suspended noise through spatial systems, Z-axis throughput tunnel, and human craft.',
};

export default function StoryPage() {
  return <StoryExperience />;
}
