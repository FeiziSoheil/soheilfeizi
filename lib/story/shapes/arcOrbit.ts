import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createSeededRandom, fillAmbientDust, type ShapeBuffer } from './types';

/**
 * Shape 3 — Arc Orbit
 * Sweeping elliptical trajectory with spherical particle nodes sampled via MeshSurfaceSampler,
 * connecting quadratic arcs, and a luminous #5B5BF0 progress segment along the main arc.
 */
export function generateArcOrbitShape(count: number): ShapeBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const rnd = createSeededRandom(4101);

  let cursor = 0;

  // Main elliptical arc parameters
  const rx = 2.75;
  const ry = 1.45;
  const rz = 1.2;

  const evalArc = (t: number): [number, number, number] => {
    const angle = (t - 0.5) * Math.PI * 1.45;
    const x = Math.sin(angle) * rx;
    const y = Math.cos(angle) * ry - 0.15;
    const z = Math.sin(angle * 2) * rz * 0.48;
    return [x, y, z];
  };

  // 1. Primary sweeping elliptical arc band (44%)
  const arcCount = Math.floor(count * 0.44);
  for (let i = 0; i < arcCount; i++) {
    const t = rnd();
    const [ax, ay, az] = evalArc(t);
    const spread = 0.085;
    const i3 = cursor * 3;
    positions[i3] = ax + (rnd() - 0.5) * spread;
    positions[i3 + 1] = ay + (rnd() - 0.5) * spread;
    positions[i3 + 2] = az + (rnd() - 0.5) * spread;

    // Highlight an active glowing indigo segment along the mid-upper arc
    const inIndigoSegment = t > 0.34 && t < 0.66;
    accents[cursor] = inIndigoSegment ? 0.85 + rnd() * 0.15 : 0.18 + rnd() * 0.25;
    cursor++;
  }

  // 2. Five spherical nodes along the arc sampled via MeshSurfaceSampler (32%)
  const nodeTs = [0.08, 0.28, 0.5, 0.72, 0.92];
  const nodeRadii = [0.28, 0.24, 0.42, 0.26, 0.3];
  const nodesTotal = Math.floor(count * 0.32);
  const perNode = Math.floor(nodesTotal / nodeTs.length);

  const unitSphereGeo = new THREE.IcosahedronGeometry(1, 3);
  const unitMesh = new THREE.Mesh(unitSphereGeo);
  const sampler = new MeshSurfaceSampler(unitMesh).build();
  const sampleV = new THREE.Vector3();

  for (let n = 0; n < nodeTs.length; n++) {
    const [nx, ny, nz] = evalArc(nodeTs[n]);
    const nr = nodeRadii[n];
    const isHeroNode = n === 2;
    for (let j = 0; j < perNode; j++) {
      sampler.sample(sampleV);
      const i3 = cursor * 3;
      positions[i3] = nx + sampleV.x * nr;
      positions[i3 + 1] = ny + sampleV.y * nr;
      positions[i3 + 2] = nz + sampleV.z * nr;
      accents[cursor] = isHeroNode ? 0.82 + rnd() * 0.18 : rnd() < 0.22 ? 0.75 : 0.32;
      cursor++;
    }
  }
  unitSphereGeo.dispose();

  // 3. Secondary harmonic connector arcs bridging outer nodes (12%)
  const chordCount = Math.floor(count * 0.12);
  for (let i = 0; i < chordCount; i++) {
    const pairIdx = Math.floor(rnd() * (nodeTs.length - 1));
    const [x0, y0, z0] = evalArc(nodeTs[pairIdx]);
    const [x1, y1, z1] = evalArc(nodeTs[pairIdx + 1]);
    const u = rnd();
    const arch = Math.sin(u * Math.PI) * 0.58;
    const i3 = cursor * 3;
    positions[i3] = x0 + (x1 - x0) * u + (rnd() - 0.5) * 0.03;
    positions[i3 + 1] = y0 + (y1 - y0) * u - arch + (rnd() - 0.5) * 0.03;
    positions[i3 + 2] = z0 + (z1 - z0) * u + arch * 0.5 + (rnd() - 0.5) * 0.03;
    accents[cursor] = pairIdx === 1 || pairIdx === 2 ? 0.78 : 0.2;
    cursor++;
  }

  fillAmbientDust(positions, accents, cursor, count, 4102);
  return { positions, accents };
}
