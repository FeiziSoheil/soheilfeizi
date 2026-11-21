import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 1 — Sphere
 * Hollow particle sphere sampled via THREE.MeshSurfaceSampler:
 * - Denser & indigo-accented (#5B5BF0) lower hemisphere
 * - Bright luminous inner core
 * - Two tilted fine orbital particle rings
 */
export function generateSphereShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(2101);

  const shellCount = Math.floor(count * 0.62);
  const coreCount = Math.floor(count * 0.1);
  const ring1Count = Math.floor(count * 0.1);
  const ring2Count = Math.floor(count * 0.06);

  // 1. Hollow sphere shell using MeshSurfaceSampler
  const geo = new THREE.IcosahedronGeometry(1.78, 5);
  const mesh = new THREE.Mesh(geo);
  const sampler = new MeshSurfaceSampler(mesh).build();
  const samplePos = new THREE.Vector3();

  let cursor = 0;
  for (let i = 0; i < shellCount; i++) {
    sampler.sample(samplePos);
    // Subtle bias toward lower hemisphere for heavier gravity presence
    if (samplePos.y > 0.2 && rnd() < 0.32) {
      samplePos.y = -Math.abs(samplePos.y);
    }
    // Delicate surface thickness jitter
    const jitter = 1 + (rnd() - 0.5) * 0.045;
    const i3 = cursor * 3;
    positions[i3] = samplePos.x * jitter;
    positions[i3 + 1] = samplePos.y * jitter;
    positions[i3 + 2] = samplePos.z * jitter;

    // Lower hemisphere gets rich #5B5BF0 accent density
    const lowerBias = Math.max(0, Math.min(1, (-samplePos.y + 0.45) / 2.1));
    if (rnd() < lowerBias * 0.62) {
      accents[cursor] = 0.72 + rnd() * 0.28;
    } else {
      accents[cursor] = 0.14 + (1 - lowerBias) * 0.3;
    }
    cursor++;
  }
  geo.dispose();

  // 2. Bright inner core
  for (let i = 0; i < coreCount; i++) {
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(2 * rnd() - 1);
    const r = Math.pow(rnd(), 0.7) * 0.46;
    const i3 = cursor * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.cos(phi);
    positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    accents[cursor] = rnd() < 0.35 ? 0.92 : 0.48;
    cursor++;
  }

  // 3. Tilted orbital ring 1 (primary)
  const tilt1 = 0.42;
  const cos1 = Math.cos(tilt1);
  const sin1 = Math.sin(tilt1);
  for (let i = 0; i < ring1Count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 2.48 + (rnd() - 0.5) * 0.08;
    const rx = Math.cos(a) * r;
    const ry = (rnd() - 0.5) * 0.04;
    const rz = Math.sin(a) * r;

    const i3 = cursor * 3;
    positions[i3] = rx;
    positions[i3 + 1] = ry * cos1 - rz * sin1;
    positions[i3 + 2] = ry * sin1 + rz * cos1;
    accents[cursor] = Math.sin(a * 2) > 0.6 ? 0.85 : 0.3;
    cursor++;
  }

  // 4. Counter-tilted orbital ring 2 (fine)
  const tilt2 = -0.68;
  const cos2 = Math.cos(tilt2);
  const sin2 = Math.sin(tilt2);
  for (let i = 0; i < ring2Count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 2.86 + (rnd() - 0.5) * 0.06;
    const rx = Math.cos(a) * r;
    const ry = (rnd() - 0.5) * 0.03;
    const rz = Math.sin(a) * r;

    const i3 = cursor * 3;
    positions[i3] = rx * cos2 + ry * sin2;
    positions[i3 + 1] = -rx * sin2 + ry * cos2;
    positions[i3 + 2] = rz;
    accents[cursor] = rnd() < 0.25 ? 0.8 : 0.2;
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 2102);
  return { positions, accents };
}
