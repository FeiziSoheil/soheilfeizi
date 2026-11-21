import type { Metadata } from 'next';
import LabShell from '@/components/lab/LabShell';

export const metadata: Metadata = {
  title: '/lab — Particle Physics, Magnet & ScrollEngine Sandbox',
  description:
    'Interactive GPGPU particle physics lab verifying Dust parallax, 4-phase Magnet transitions with dipole field lines, Seed->Bloom->Settle, Implosion, and ScrollEngine weight.',
};

export default function LabPage() {
  return <LabShell />;
}
