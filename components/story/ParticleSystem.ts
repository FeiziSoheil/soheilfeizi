import * as THREE from 'three';
import { STORY_PARTICLE_CONFIG, STORY_TUNNEL_CONFIG } from './story.config';
import type { ShapeBuffer } from './shapes/types';

const VERTEX_SHADER = /* glsl */ `
precision highp float;

attribute vec3 aPosTo;
attribute float aAccentFrom;
attribute float aAccentTo;
attribute float aDustFrom;
attribute float aDustTo;
attribute float aMetaFrom;
attribute float aMetaTo;
attribute vec4 aRandom;
attribute float aColorMix;
attribute float aDelay;

uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uSize;
uniform float uScale;
uniform float uAlphaMin;
uniform float uAlphaMax;
uniform float uDustAlpha;
uniform float uBaseNoise;
uniform float uMorphNoise;
uniform float uReducedMotion;
uniform float uDebugStatic;
uniform float uEntrance;

uniform float uTunnelFactor;
uniform float uTunnelEndConverge;
uniform float uTunnelStarZ;
uniform float uArcFactor;
uniform float uArcProgress;
uniform float uPortraitScan;
uniform float uPortraitPoseMix;
uniform float uWordDissolve;
uniform float uOrbitSpin;
uniform vec2 uAppTilt;
uniform float uClosingBoost;

uniform vec3 uMouse3D;
uniform float uMouseActive;

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vScanGlow;

// Compact 3D trigonometric curl-like turbulence
vec3 curlNoise(vec3 p, float t) {
  float x = sin(p.y * 1.45 + t * 0.55) * cos(p.z * 1.25 - t * 0.40);
  float y = sin(p.z * 1.35 + t * 0.48) * cos(p.x * 1.50 + t * 0.32);
  float z = sin(p.x * 1.25 - t * 0.42) * cos(p.y * 1.38 + t * 0.52);
  return vec3(x, y, z);
}

mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  // Staggered per-particle morph curve using aDelay (0..0.35) so transitions flow smoothly like a wave
  float delay = aDelay * (1.0 - 0.85 * uReducedMotion) * (1.0 - uDebugStatic);
  float localP = clamp((uProgress - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  float easedP = localP * localP * (3.0 - 2.0 * localP);

  vec3 posFrom = position;
  vec3 posTo = aPosTo;

  // When leaving the tunnel after travel > 0.85, the converged star point feeds directly into the next morph
  if (uTunnelEndConverge > 0.001) {
    float converge = uTunnelEndConverge * (1.0 - aDustFrom * 0.65);
    vec3 starPos = vec3(
      (aRandom.x - 0.5) * 0.32,
      (aRandom.y - 0.5) * 0.32,
      uTunnelStarZ + (aRandom.z - 0.5) * 0.55
    );
    posFrom = mix(posFrom, starPos, converge * converge);
  }

  vec3 pos = mix(posFrom, posTo, easedP);
  float accent = mix(aAccentFrom, aAccentTo, easedP);
  float dust = mix(aDustFrom, aDustTo, easedP);
  float meta = mix(aMetaFrom, aMetaTo, easedP);

  // Boost accent smoothly during tunnel end convergence
  if (uTunnelEndConverge > 0.001 && easedP < 0.85) {
    accent = mix(accent, 0.96, uTunnelEndConverge * (1.0 - easedP) * 0.72);
  }

  // Unified noise amplitude: calm <= 0.4% during hold, expressive 0.38 ONLY mid-morph
  float motionScale = (1.0 - uReducedMotion) * (1.0 - uDebugStatic);
  float morphMid = sin(easedP * 3.14159265);
  float noiseAmp = (uBaseNoise + morphMid * uMorphNoise) * motionScale;

  if (noiseAmp > 0.0001) {
    vec3 nDir = curlNoise(pos * 0.58 + aRandom.xyz * 5.2, uTime * 0.55);
    // Dust particles drift slightly wider than tight shape structure
    float dustMul = mix(1.0, 2.2, dust);
    // Reduce radial explosion during tunnel so corridor stays coherent
    float tunnelDamp = 1.0 - 0.55 * uTunnelFactor * morphMid;
    pos += nDir * noiseAmp * dustMul * tunnelDamp;
  }

  // Gate entrance materialization (disabled in ?debug=shapes)
  if (uEntrance < 0.999 && uDebugStatic < 0.5) {
    float eInv = 1.0 - uEntrance;
    vec3 scatter = (aRandom.xyz - 0.5) * vec3(9.5, 6.2, 8.0);
    pos = mix(pos, pos + scatter, eInv * eInv);
  }

  // Chapter 03: Arc Orbit — crisp short traveling indigo progress segment (NOT a wide blotch!)
  if (uArcFactor > 0.001 && meta >= -0.01 && dust < 0.5) {
    float distAlong = abs(meta - uArcProgress);
    float segPulse = smoothstep(0.068, 0.014, distAlong) * uArcFactor;
    accent = max(accent, segPulse * 0.98);
  }

  // Chapter 05: Orbit system subtle orbital revolution (only when not in debug static)
  if (uOrbitSpin > 0.001 && motionScale > 0.5) {
    float r = length(pos.xz);
    float speed = (0.11 / max(0.75, r)) * uOrbitSpin;
    pos.xz = rot2(uTime * speed) * pos.xz;
  }

  // Chapter 07: App tiles interactive cursor tilt & parallax
  if ((uAppTilt.x != 0.0 || uAppTilt.y != 0.0) && uDebugStatic < 0.5) {
    pos.xz = rot2(uAppTilt.x * 0.18) * pos.xz;
    pos.yz = rot2(uAppTilt.y * 0.14) * pos.yz;
  }

  // Chapter 08: Word gentle upward vapor evaporation right before morph out
  float dissolveFade = 1.0;
  if (uWordDissolve > 0.001 && uDebugStatic < 0.5) {
    float edgeMask = smoothstep(0.35, 0.95, aRandom.w) * uWordDissolve;
    pos.y += edgeMask * (0.42 + aRandom.x * 0.85);
    pos.x += (aRandom.y - 0.5) * edgeMask * 0.55;
    dissolveFade = 1.0 - edgeMask * 0.5;
  }

  // Chapter 09: Portrait top-to-bottom scan emergence + gentle sculptural turn
  float scanAlpha = 1.0;
  vScanGlow = 0.0;
  if (uPortraitScan < 0.999 && uDebugStatic < 0.5) {
    float normY = clamp((2.35 - pos.y) / 4.7, 0.0, 1.0);
    float scanEdge = uPortraitScan * 1.12 - 0.04;
    float revealed = smoothstep(scanEdge + 0.06, scanEdge - 0.04, normY);
    float crest = exp(-pow((normY - scanEdge) * 18.0, 2.0)) * (1.0 - dust);
    scanAlpha = mix(1.0, revealed, 1.0 - dust);
    vScanGlow = crest;
  }

  if (uPortraitPoseMix > 0.001 && dust < 0.5 && uDebugStatic < 0.5) {
    float turnAngle = uPortraitPoseMix * 0.20;
    vec3 turned = pos;
    turned.xz = rot2(turnAngle) * turned.xz;
    pos = mix(pos, turned, uPortraitPoseMix);
  }

  // 3D Raycasted cursor repulsion (subtle during hold, enhanced on closing ring; disabled in debug)
  if (uMouseActive > 0.001 && motionScale > 0.5) {
    vec3 toParticle = pos - uMouse3D;
    float dMouse = length(toParticle);
    float radius = mix(1.15, 2.05, uClosingBoost);
    if (dMouse < radius) {
      float falloff = 1.0 - smoothstep(0.0, radius, dMouse);
      float push = falloff * falloff * mix(0.35, 0.95, uClosingBoost) * uMouseActive;
      vec3 dir = dMouse > 0.0001 ? normalize(toParticle) : vec3(0.0, 1.0, 0.0);
      pos += dir * push;
      accent = max(accent, falloff * 0.55 * uClosingBoost);
    }
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float distToCam = max(0.35, -mvPosition.z);

  // Exact countable point size formula:
  // gl_PointSize = uSize * (0.8 + aRandom.x * 0.7) * uPixelRatio * (uScale / -mvPosition.z)
  float rawSize = uSize * (0.8 + aRandom.x * 0.7) * uPixelRatio * (uScale / distToCam);
  float dustSizeMul = mix(1.0, 0.78, dust);
  float maxPx = mix(2.4, 3.2, uTunnelFactor) * uPixelRatio;
  gl_PointSize = clamp(rawSize * dustSizeMul, 1.2 * uPixelRatio, maxPx);

  // Clean depth fog so tunnel vanishes softly into #0a0a0a and distant shapes retain clear hierarchy
  float nearFade = smoothstep(0.45, 1.85, distToCam);
  float fogNear = mix(6.5, 10.5, uTunnelFactor);
  float fogFar = mix(18.5, 34.0, uTunnelFactor);
  float farFade = 1.0 - smoothstep(fogNear, fogFar, distToCam);

  // Per-particle alpha strictly within [uAlphaMin (0.35), uAlphaMax (0.70)] for crisp NormalBlending
  float depthNorm = clamp(1.0 - (distToCam - 2.5) / 11.5, 0.0, 1.0);
  float structAlpha = mix(uAlphaMin, uAlphaMax, 0.25 + depthNorm * 0.5 + aRandom.y * 0.25);
  float accentAlpha = mix(structAlpha, min(0.86, uAlphaMax + 0.14), accent);
  float baseAlpha = mix(accentAlpha, uDustAlpha, dust);

  vAlpha = baseAlpha * nearFade * farFade * scanAlpha * dissolveFade * mix(uEntrance, 1.0, uDebugStatic);
  vAccent = clamp(accent + aColorMix * 0.04 + vScanGlow * 0.9, 0.0, 1.0);
  vDepthNorm = depthNorm;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec3 uColorBase;
uniform vec3 uColorDim;
uniform vec3 uColorAccent;

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vScanGlow;

void main() {
  if (vAlpha < 0.01) discard;

  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Sharp, clean circular point (crisp anti-aliased edge, never a bloated fuzzy halo)
  float disc = smoothstep(0.5, 0.22, dist);

  vec3 mono = mix(uColorDim, uColorBase, 0.35 + vDepthNorm * 0.65);
  vec3 accentCol = uColorAccent * 1.22;
  vec3 color = mix(mono, accentCol, smoothstep(0.25, 0.85, vAccent));
  color += vec3(0.16, 0.16, 0.34) * vScanGlow;

  gl_FragColor = vec4(color, disc * vAlpha);
}
`;

export interface StoryParticleUniformUpdate {
  time: number;
  morphProgress: number;
  entrance: number;
  tunnelFactor: number;
  tunnelEndConverge: number;
  arcFactor: number;
  arcProgress: number;
  portraitScan: number;
  portraitPoseMix: number;
  wordDissolve: number;
  orbitSpin: number;
  appTiltX: number;
  appTiltY: number;
  closingBoost: number;
  mouse3D: THREE.Vector3;
  mouseActive: number;
  reducedMotion: boolean;
  debugStatic: boolean;
}

/**
 * Single BufferGeometry GPU Particle Morph Engine.
 * Uses NormalBlending with strict 1.2..2.4px countable points, alpha 0.35..0.70,
 * calm hold noise (<= 0.4% of shape), and expressive mid-morph turbulence.
 */
export class StoryParticleSystem {
  public readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  public readonly geometry: THREE.BufferGeometry;
  public readonly material: THREE.ShaderMaterial;
  public readonly count: number;

  private posFromAttr: THREE.BufferAttribute;
  private posToAttr: THREE.BufferAttribute;
  private accentFromAttr: THREE.BufferAttribute;
  private accentToAttr: THREE.BufferAttribute;
  private dustFromAttr: THREE.BufferAttribute;
  private dustToAttr: THREE.BufferAttribute;
  private metaFromAttr: THREE.BufferAttribute;
  private metaToAttr: THREE.BufferAttribute;

  private lastFromKey = '';
  private lastToKey = '';

  constructor(count: number, initialBuffer: ShapeBuffer, pixelRatio: number) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();

    const posFrom = new Float32Array(initialBuffer.positions);
    const posTo = new Float32Array(initialBuffer.positions);
    const accentFrom = new Float32Array(initialBuffer.accents);
    const accentTo = new Float32Array(initialBuffer.accents);
    const dustFrom = new Float32Array(initialBuffer.dustMask);
    const dustTo = new Float32Array(initialBuffer.dustMask);
    const metaFrom = new Float32Array(initialBuffer.meta);
    const metaTo = new Float32Array(initialBuffer.meta);

    const aRandom = new Float32Array(count * 4);
    const aColorMix = new Float32Array(count);
    const aDelay = new Float32Array(count);

    let seed = 42071;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const maxDelay = STORY_PARTICLE_CONFIG.maxDelay;
    for (let i = 0; i < count; i++) {
      const r4 = i * 4;
      aRandom[r4] = rand();
      aRandom[r4 + 1] = rand();
      aRandom[r4 + 2] = rand();
      aRandom[r4 + 3] = rand();

      aColorMix[i] = rand() > 0.96 ? 0.5 : 0.0;
      aDelay[i] = rand() * maxDelay;
    }

    this.posFromAttr = new THREE.BufferAttribute(posFrom, 3);
    this.posToAttr = new THREE.BufferAttribute(posTo, 3);
    this.accentFromAttr = new THREE.BufferAttribute(accentFrom, 1);
    this.accentToAttr = new THREE.BufferAttribute(accentTo, 1);
    this.dustFromAttr = new THREE.BufferAttribute(dustFrom, 1);
    this.dustToAttr = new THREE.BufferAttribute(dustTo, 1);
    this.metaFromAttr = new THREE.BufferAttribute(metaFrom, 1);
    this.metaToAttr = new THREE.BufferAttribute(metaTo, 1);

    this.geometry.setAttribute('position', this.posFromAttr);
    this.geometry.setAttribute('aPosTo', this.posToAttr);
    this.geometry.setAttribute('aAccentFrom', this.accentFromAttr);
    this.geometry.setAttribute('aAccentTo', this.accentToAttr);
    this.geometry.setAttribute('aDustFrom', this.dustFromAttr);
    this.geometry.setAttribute('aDustTo', this.dustToAttr);
    this.geometry.setAttribute('aMetaFrom', this.metaFromAttr);
    this.geometry.setAttribute('aMetaTo', this.metaToAttr);
    this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 4));
    this.geometry.setAttribute('aColorMix', new THREE.BufferAttribute(aColorMix, 1));
    this.geometry.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      // NormalBlending ensures dense outlines remain sharp & countable without saturating into gray blobs
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: STORY_PARTICLE_CONFIG.size },
        uScale: { value: STORY_PARTICLE_CONFIG.scale },
        uAlphaMin: { value: STORY_PARTICLE_CONFIG.alphaMin },
        uAlphaMax: { value: STORY_PARTICLE_CONFIG.alphaMax },
        uDustAlpha: { value: STORY_PARTICLE_CONFIG.dustAlpha },
        uBaseNoise: { value: STORY_PARTICLE_CONFIG.baseNoise },
        uMorphNoise: { value: STORY_PARTICLE_CONFIG.morphNoise },
        uReducedMotion: { value: 0 },
        uDebugStatic: { value: 0 },
        uEntrance: { value: 0 },
        uTunnelFactor: { value: 0 },
        uTunnelEndConverge: { value: 0 },
        uTunnelStarZ: { value: STORY_TUNNEL_CONFIG.starZ },
        uArcFactor: { value: 0 },
        uArcProgress: { value: 0.5 },
        uPortraitScan: { value: 1 },
        uPortraitPoseMix: { value: 0 },
        uWordDissolve: { value: 0 },
        uOrbitSpin: { value: 0 },
        uAppTilt: { value: new THREE.Vector2(0, 0) },
        uClosingBoost: { value: 0 },
        uMouse3D: { value: new THREE.Vector3(0, 0, 0) },
        uMouseActive: { value: 0 },
        uColorBase: { value: new THREE.Color('#EAEAF0') },
        uColorDim: { value: new THREE.Color('#7A7A86') },
        uColorAccent: { value: new THREE.Color('#5B5BF0') },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public setPixelRatio(dpr: number): void {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public setMorphPair(
    fromKey: string,
    fromBuf: ShapeBuffer,
    toKey: string,
    toBuf: ShapeBuffer,
    force = false
  ): void {
    if (force || fromKey !== this.lastFromKey) {
      (this.posFromAttr.array as Float32Array).set(fromBuf.positions);
      (this.accentFromAttr.array as Float32Array).set(fromBuf.accents);
      (this.dustFromAttr.array as Float32Array).set(fromBuf.dustMask);
      (this.metaFromAttr.array as Float32Array).set(fromBuf.meta);
      this.posFromAttr.needsUpdate = true;
      this.accentFromAttr.needsUpdate = true;
      this.dustFromAttr.needsUpdate = true;
      this.metaFromAttr.needsUpdate = true;
      this.lastFromKey = fromKey;
    }

    if (force || toKey !== this.lastToKey) {
      (this.posToAttr.array as Float32Array).set(toBuf.positions);
      (this.accentToAttr.array as Float32Array).set(toBuf.accents);
      (this.dustToAttr.array as Float32Array).set(toBuf.dustMask);
      (this.metaToAttr.array as Float32Array).set(toBuf.meta);
      this.posToAttr.needsUpdate = true;
      this.accentToAttr.needsUpdate = true;
      this.dustToAttr.needsUpdate = true;
      this.metaToAttr.needsUpdate = true;
      this.lastToKey = toKey;
    }
  }

  public updateUniforms(u: StoryParticleUniformUpdate): void {
    const uniforms = this.material.uniforms;
    uniforms.uTime.value = u.time;
    uniforms.uProgress.value = u.morphProgress;
    uniforms.uEntrance.value = u.entrance;
    uniforms.uTunnelFactor.value = u.tunnelFactor;
    uniforms.uTunnelEndConverge.value = u.tunnelEndConverge;
    uniforms.uArcFactor.value = u.arcFactor;
    uniforms.uArcProgress.value = u.arcProgress;
    uniforms.uPortraitScan.value = u.portraitScan;
    uniforms.uPortraitPoseMix.value = u.portraitPoseMix;
    uniforms.uWordDissolve.value = u.wordDissolve;
    uniforms.uOrbitSpin.value = u.orbitSpin;
    (uniforms.uAppTilt.value as THREE.Vector2).set(u.appTiltX, u.appTiltY);
    uniforms.uClosingBoost.value = u.closingBoost;
    (uniforms.uMouse3D.value as THREE.Vector3).copy(u.mouse3D);
    uniforms.uMouseActive.value = u.mouseActive;
    uniforms.uReducedMotion.value = u.reducedMotion ? 1.0 : 0.0;
    uniforms.uDebugStatic.value = u.debugStatic ? 1.0 : 0.0;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
