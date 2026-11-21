import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 5 — Orbit / Solar System
 * - 4 tilted concentric elliptical orbit tracks
 * - Central glowing indigo (#5B5BF0) hero sphere sampled with MeshSurfaceSampler
 * - 4 orbiting secondary particle planets with delicate satellite halos
 */
export function generateOrbitSystemShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(6101);

  const heroPlanetCount = Math.floor(count * 0.28);
  const orbitTracksCount = Math.floor(count * 0.34);
  const satPlanetsCount = Math.floor(count * 0.24);

  let cursor = 0;

  // 1. Glowing indigo hero planet at center (subtle magnetic core + halo)
  const heroGeo = new THREE.IcosahedronGeometry(0.76, 4);
  const heroMesh = new THREE.Mesh(heroGeo);
  const heroSampler = new MeshSurfaceSampler(heroMesh).build();
  const samplePos = new THREE.Vector3();

  for (let i = 0; i < heroPlanetCount; i++) {
    heroSampler.sample(samplePos);
    const isHalo = i > heroPlanetCount * 0.82;
    const scale = isHalo ? 1.12 + rnd() * 0.34 : 0.96 + rnd() * 0.08;
    const i3 = cursor * 3;
    positions[i3] = samplePos.x * scale;
    positions[i3 + 1] = samplePos.y * scale;
    positions[i3 + 2] = samplePos.z * scale;
    accents[cursor] = isHalo ? 0.72 + rnd() * 0.2 : 0.84 + rnd() * 0.16;
    cursor++;
  }
  heroGeo.dispose();

  // 2. Four concentric tilted elliptical orbit paths
  const orbits = [
    { rx: 1.48, rz: 1.16, tiltX: 0.32, tiltZ: 0.14, indigo: true },
    { rx: 2.15, rz: 1.64, tiltX: 0.44, tiltZ: -0.18, indigo: false },
    { rx: 2.86, rz: 2.12, tiltX: 0.26, tiltZ: 0.22, indigo: false },
    { rx: 3.45, rz: 2.52, tiltX: 0.52, tiltZ: -0.1, indigo: true },
  ];
  const perOrbit = Math.floor(orbitTracksCount / orbits.length);

  for (let oIdx = 0; oIdx < orbits.length; oIdx++) {
    const o = orbits[oIdx];
    const cosX = Math.cos(o.tiltX);
    const sinX = Math.sin(o.tiltX);
    const cosZ = Math.cos(o.tiltZ);
    const sinZ = Math.sin(o.tiltZ);

    for (let j = 0; j < perOrbit; j++) {
      const a = (j / perOrbit) * Math.PI * 2 + (rnd() - 0.5) * 0.04;
      const spread = (rnd() - 0.5) * 0.06;
      const lx = Math.cos(a) * (o.rx + spread);
      const ly = (rnd() - 0.5) * 0.035;
      const lz = Math.sin(a) * (o.rz + spread);

      // Rotate around X then Z
      const y1 = ly * cosX - lz * sinX;
      const z1 = ly * sinX + lz * cosX;
      const x2 = lx * cosZ - y1 * sinZ;
      const y2 = lx * sinZ + y1 * cosZ;

      const i3 = cursor * 3;
      positions[i3] = x2;
      positions[i3 + 1] = y2;
      positions[i3 + 2] = z1;

      if (o.indigo && Math.sin(a * 2 + oIdx) > 0.25) {
        accents[cursor] = 0.72 + rnd() * 0.24;
      } else {
        accents[cursor] = 0.16 + rnd() * 0.26;
      }
      cursor++;
    }
  }

  // 3. Four orbiting secondary planets placed accurately on their orbit rings
  const planets = [
    { orbitIdx: 0, angle: 0.72, radius: 0.22, isIndigo: false },
    { orbitIdx: 1, angle: 2.65, radius: 0.36, isIndigo: false },
    { orbitIdx: 2, angle: 5.55, radius: 0.3, isIndigo: true },
    { orbitIdx: 3, angle: 3.95, radius: 0.26, isIndigo: false },
  ];
  const perPlanet = Math.floor(satPlanetsCount / planets.length);
  const satGeo = new THREE.IcosahedronGeometry(1, 3);
  const satMesh = new THREE.Mesh(satGeo);
  const satSampler = new MeshSurfaceSampler(satMesh).build();

  for (let pIdx = 0; pIdx < planets.length; pIdx++) {
    const p = planets[pIdx];
    const o = orbits[p.orbitIdx];
    const cosX = Math.cos(o.tiltX);
    const sinX = Math.sin(o.tiltX);
    const cosZ = Math.cos(o.tiltZ);
    const sinZ = Math.sin(o.tiltZ);

    const lx = Math.cos(p.angle) * o.rx;
    const lz = Math.sin(p.angle) * o.rz;
    const y1 = -lz * sinX;
    const z1 = lz * cosX;
    const cx = lx * cosZ - y1 * sinZ;
    const cy = lx * sinZ + y1 * cosZ;
    const cz = z1;

    for (let j = 0; j < perPlanet; j++) {
      satSampler.sample(samplePos);
      const rScale = p.radius * (0.94 + rnd() * 0.12);
      const i3 = cursor * 3;
      positions[i3] = cx + samplePos.x * rScale;
      positions[i3 + 1] = cy + samplePos.y * rScale;
      positions[i3 + 2] = cz + samplePos.z * rScale;
      accents[cursor] = p.isIndigo ? 0.78 + rnd() * 0.2 : 0.25 + rnd() * 0.24;
      cursor++;
    }
  }
  satGeo.dispose();

  fillAmbientDust(positions, accents, cursor, count, 6102);
  return { positions, accents };
}
