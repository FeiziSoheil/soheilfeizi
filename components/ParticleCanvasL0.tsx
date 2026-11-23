'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CONTENT, SectionId } from '@/lib/content';
import {
  LocalSlotSpec,
  StoryTargetBuffer,
  particleRegistry,
} from '@/lib/particleRegistry';
import { useScrollStore } from '@/lib/scrollStore';

/* ─────────────────────────────────────────────────────────────
 * STORY-GRADE 3D GPU PARTICLE MORPH ENGINE FOR SITE TAB (L0)
 * Mirrors /components/story/ParticleSystem.ts visual architecture:
 * - Single BufferGeometry (THREE.Points) with custom ShaderMaterial
 * - NormalBlending with exact countable 1.2..2.4px circular dots
 * - Strict 0.35..0.72 alpha range (accent up to 0.88, surround dust 0.16)
 * - Calm hold noise (<= 0.4% of shape) + expressive 3D curl ONLY mid-morph
 * - Staggered per-particle aDelay (0..0.35) smooth wave morphs
 * - Real 3D sculptural parallax tilt & perspective foreshortening locked
 *   pixel-exact to Lenis DOM <ParticleSlot> origins + Bloom theme inversion
 * ───────────────────────────────────────────────────────────── */
const SITE_MORPH_VERT = /* glsl */ `
precision highp float;

attribute vec3 aPosTo;
attribute float aAccentFrom;
attribute float aAccentTo;
attribute float aDustFrom;
attribute float aDustTo;
attribute vec4 aRandom;
attribute float aDelay;

uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uSize;
uniform float uAlphaMin;
uniform float uAlphaMax;
uniform float uDustAlpha;
uniform float uBaseNoise;
uniform float uMorphNoise;
uniform float uReducedMotion;

uniform vec2 uOriginFrom;
uniform vec2 uOriginTo;
uniform float uVisFrom;
uniform float uVisTo;
uniform float uSlotOpacity;
uniform vec2 uTilt;

uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uMouseHold;

uniform vec2 uBloomOrigin;
uniform float uBloomR;
uniform float uBloomActive;
uniform float uDarkCovered;
uniform float uShellThick;

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vDarkMix;
varying float vEdgeGlow;

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
  // Staggered per-particle morph wave matching /story ParticleSystem
  float delay = aDelay * (1.0 - 0.85 * uReducedMotion);
  float localP = clamp((uProgress - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  float easedP = localP * localP * (3.0 - 2.0 * localP);

  vec3 localPos = mix(position, aPosTo, easedP);
  float accent = mix(aAccentFrom, aAccentTo, easedP);
  float dust = mix(aDustFrom, aDustTo, easedP);
  float visMix = mix(uVisFrom, uVisTo, easedP);

  // Subtle 3D orbital breath + cursor parallax tilt around slot center
  float motionScale = 1.0 - uReducedMotion;
  float yaw = (sin(uTime * 0.32) * 0.06 + uTilt.x * 0.22) * motionScale;
  float pitch = (cos(uTime * 0.27) * 0.04 + uTilt.y * 0.16) * motionScale;
  localPos.xz = rot2(yaw) * localPos.xz;
  localPos.yz = rot2(pitch) * localPos.yz;

  // Story noise law: calm <= 0.4% in hold, expressive 3D curl ONLY mid-morph
  float morphMid = sin(easedP * 3.14159265);
  float noiseAmp = (uBaseNoise + morphMid * uMorphNoise) * motionScale;
  if (noiseAmp > 0.01) {
    vec3 nDir = curlNoise(localPos * 0.014 + aRandom.xyz * 5.2, uTime * 0.58);
    float dustMul = mix(1.0, 2.1, dust);
    localPos += nDir * noiseAmp * dustMul;
  }

  // Gentle perspective foreshortening around slot center while z=0 stays 100% pixel-exact
  float camDist = 1100.0;
  float persp = camDist / max(360.0, camDist - localPos.z);
  vec2 origin = mix(uOriginFrom, uOriginTo, easedP);
  vec2 screenPos = origin + localPos.xy * persp;

  // Smooth interactive cursor repulsion (subtle in hover, magnetic swirl on pointer hold)
  if (uMouseActive > 0.001 && motionScale > 0.5 && visMix > 0.02) {
    vec2 toPt = screenPos - uMouse;
    float dMouse = length(toPt);
    float radius = mix(98.0, 190.0, uMouseHold);
    if (dMouse < radius && dMouse > 0.5) {
      float falloff = 1.0 - smoothstep(0.0, radius, dMouse);
      float f2 = falloff * falloff;
      vec2 dir = toPt / dMouse;
      if (uMouseHold > 0.5) {
        vec2 tang = vec2(-dir.y, dir.x) * (aRandom.w > 0.5 ? 1.0 : -1.0);
        screenPos += (-dir * 26.0 + tang * 22.0) * f2 * uMouseActive;
      } else {
        screenPos += dir * 24.0 * f2 * uMouseActive;
      }
      accent = max(accent, falloff * 0.45 * uMouseActive);
    }
  }

  // Bloom / Implosion theme sweep shell
  vec2 fromBloom = screenPos - uBloomOrigin;
  float dBloom = length(fromBloom);
  float insideRaw = 1.0 - step(uBloomR, dBloom);
  float darkMix = mix(uDarkCovered, insideRaw, uBloomActive);
  float edge = smoothstep(uBloomR - uShellThick, uBloomR, dBloom)
             * (1.0 - smoothstep(uBloomR, uBloomR + uShellThick, dBloom))
             * uBloomActive;
  if (edge > 0.001) {
    vec2 pushDir = dBloom > 0.001 ? fromBloom / dBloom : vec2(1.0, 0.0);
    screenPos += pushDir * edge * 20.0;
  }

  // Exact Story countable point size: 1.2..2.4px * uPixelRatio
  float rawSize = uSize * (0.8 + aRandom.x * 0.7) * uPixelRatio * persp;
  float dustSizeMul = mix(1.0, 0.78, dust);
  gl_PointSize = clamp(rawSize * dustSizeMul, 1.2 * uPixelRatio, 2.5 * uPixelRatio);

  // Clean depth hierarchy + Story alpha budget [0.35..0.72]
  float depthNorm = clamp((localPos.z + 130.0) / 260.0, 0.0, 1.0);
  float structAlpha = mix(uAlphaMin, uAlphaMax, 0.25 + depthNorm * 0.5 + aRandom.y * 0.25);
  float accentAlpha = mix(structAlpha, min(0.88, uAlphaMax + 0.16), accent);
  float baseAlpha = mix(accentAlpha, uDustAlpha, dust);

  // Subtle fade softening at peak mid-morph dispersion so particles breathe cleanly
  float morphBreath = 1.0 - morphMid * 0.16;

  vAlpha = baseAlpha * visMix * uSlotOpacity * morphBreath;
  vAccent = clamp(accent, 0.0, 1.0);
  vDepthNorm = depthNorm;
  vDarkMix = darkMix;
  vEdgeGlow = edge;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(screenPos, clamp(localPos.z * 0.08, -20.0, 20.0), 1.0);
}
`;

const SITE_MORPH_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uLightBase;
uniform vec3 uLightDim;
uniform vec3 uLightAccent;
uniform vec3 uDarkBase;
uniform vec3 uDarkDim;
uniform vec3 uDarkAccent;

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vDarkMix;
varying float vEdgeGlow;

void main() {
  if (vAlpha < 0.01) discard;

  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  // Exact Story sharp anti-aliased circular dot (never a fuzzy halo)
  float disc = smoothstep(0.5, 0.22, dist);

  vec3 lightMono = mix(uLightDim, uLightBase, 0.35 + vDepthNorm * 0.65);
  vec3 darkMono = mix(uDarkDim, uDarkBase, 0.35 + vDepthNorm * 0.65);
  vec3 mono = mix(lightMono, darkMono, vDarkMix);

  vec3 accentCol = mix(uLightAccent, uDarkAccent * 1.18, vDarkMix);
  vec3 color = mix(mono, accentCol, smoothstep(0.25, 0.85, vAccent));
  color = mix(color, vec3(0.56, 0.56, 1.0), vEdgeGlow * 0.65);

  gl_FragColor = vec4(color, disc * vAlpha);
}
`;

/* ─────────────────────────────────────────────────────────────
 * MATCHING STORY-STYLE AMBIENT DUST LAYER (THREE.Points)
 * Quiet full-viewport floating depth stardust in exact 1.2..2.1px dot grammar
 * ───────────────────────────────────────────────────────────── */
const SITE_DUST_VERT = /* glsl */ `
precision highp float;

attribute vec4 aRandom;
attribute float aLayer;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uResolution;
uniform float uScrollPos;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uReducedMotion;

uniform vec2 uBloomOrigin;
uniform float uBloomR;
uniform float uBloomActive;
uniform float uDarkCovered;

varying float vAlpha;
varying float vAccent;
varying float vDarkMix;

void main() {
  float parallax = mix(0.08, 0.26, aLayer);
  float motionScale = 1.0 - uReducedMotion;
  float t = uTime * 0.22 * motionScale;

  float wrapW = uResolution.x + 120.0;
  float wrapH = uResolution.y + 120.0;

  float bx = position.x * wrapW - wrapW * 0.5;
  float by = mod(position.y * wrapH + uScrollPos * parallax, wrapH) - wrapH * 0.5;

  bx += sin(t + aRandom.x * 6.2831) * (10.0 + aLayer * 14.0) * motionScale;
  by += cos(t * 0.85 + aRandom.y * 6.2831) * (8.0 + aLayer * 12.0) * motionScale;

  vec2 pos = vec2(bx, by);

  if (uMouseActive > 0.001 && motionScale > 0.5) {
    vec2 toPt = pos - uMouse;
    float dM = length(toPt);
    if (dM < 130.0 && dM > 0.5) {
      float fall = 1.0 - smoothstep(0.0, 130.0, dM);
      pos += (toPt / dM) * fall * fall * 26.0 * uMouseActive;
    }
  }

  float dBloom = length(pos - uBloomOrigin);
  float insideRaw = 1.0 - step(uBloomR, dBloom);
  vDarkMix = mix(uDarkCovered, insideRaw, uBloomActive);

  vAccent = aRandom.z > 0.88 ? 1.0 : 0.0;
  vAlpha = mix(0.11, 0.24, aLayer) * (0.75 + 0.25 * sin(uTime * 0.6 + aRandom.w * 6.2831));

  gl_PointSize = clamp((1.15 + aLayer * 0.95) * uPixelRatio, 1.1 * uPixelRatio, 2.2 * uPixelRatio);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, -25.0, 1.0);
}
`;

const SITE_DUST_FRAG = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vAccent;
varying float vDarkMix;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;
  float disc = smoothstep(0.5, 0.22, dist);

  vec3 lightCol = mix(vec3(0.24, 0.24, 0.27), vec3(0.357, 0.357, 0.941), vAccent);
  vec3 darkCol = mix(vec3(0.76, 0.76, 0.82), vec3(0.52, 0.52, 1.0), vAccent);
  vec3 col = mix(lightCol, darkCol, vDarkMix);

  gl_FragColor = vec4(col, disc * vAlpha);
}
`;

/* ─────────────────────────────────────────────────────────────
 * MAJOR ELEMENT SLOT RESOLVER
 * Maps active section + progress to the sculptural L0 particle slot.
 * ───────────────────────────────────────────────────────────── */
interface ResolvedSlot {
  key: string;
  spec: LocalSlotSpec | null;
  opacity: number;
}

function resolveActiveMajorSlot(
  section: SectionId,
  p: number,
  locale: 'fa' | 'en',
  heroPortraitHovered: boolean
): ResolvedSlot {
  const t = CONTENT[locale];
  const isRtl = locale === 'fa';

  if (section === 'intro') {
    if (p < 0.34) {
      return {
        key: `intro-name:${locale}`,
        spec: {
          id: 'intro-name',
          descriptor: `text:${t.intro.particleWord}`,
          isRtl,
          align: 'center',
        },
        opacity: 1,
      };
    }
    const fadeOut = p > 0.75 ? Math.max(0, 1 - (p - 0.75) / 0.22) : 1;
    return {
      key: 'intro-portrait',
      spec: {
        id: 'intro-portrait',
        descriptor: 'image:portrait',
      },
      opacity: fadeOut,
    };
  }

  if (section === 'hero') {
    const exitFade = p > 0.78 ? Math.max(0, 1 - (p - 0.78) / 0.2) : 1;
    return {
      key: 'hero-portrait',
      spec: {
        id: 'hero-portrait',
        descriptor: 'image:portrait',
      },
      opacity: heroPortraitHovered ? 0.14 : exitFade,
    };
  }

  if (section === 'whatido') {
    const count = t.whatido.tabs.length;
    const idx = Math.min(count - 1, Math.max(0, Math.floor(p * count + 0.18)));
    const tab = t.whatido.tabs[idx];
    return {
      key: `whatido:${tab.id}`,
      spec: {
        id: 'whatido-diagram',
        descriptor: `svg:${tab.id}`,
        drawProgress: 1,
      },
      opacity: 1,
    };
  }

  if (section === 'process') {
    const count = t.process.stages.length;
    const idx = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
    return {
      key: `process:${idx}`,
      spec: {
        id: 'process-stage',
        descriptor: `process:${idx}`,
      },
      opacity: 1,
    };
  }

  if (section === 'statement') {
    return {
      key: `statement:${locale}`,
      spec: {
        id: 'statement-title',
        descriptor: `text:${t.statement.accentWord}`,
        isRtl,
        align: 'center',
      },
      opacity: 1,
    };
  }

  if (section === 'testimonial') {
    return {
      key: 'testimonial-figure',
      spec: {
        id: 'testimonial-figure',
        descriptor: 'svg:testimonial',
      },
      opacity: 1,
    };
  }

  if (section === 'contact') {
    return {
      key: `cta-logo:${locale}`,
      spec: {
        id: 'cta-logo',
        descriptor: `text:${t.intro.particleWord}`,
        isRtl,
        align: 'center',
      },
      opacity: 1,
    };
  }

  return {
    key: 'none',
    spec: null,
    opacity: 0,
  };
}

/**
 * Generates an open, wide 3D floating stardust cloud centered at (0,0,0)
 * used whenever particles gently open outward on exit or condense inward on entry.
 */
function createOpenCloudBuffer(count: number): StoryTargetBuffer {
  const positions = new Float32Array(count * 3);
  const accents = new Float32Array(count);
  const dustMask = new Float32Array(count);
  const shades = new Float32Array(count);

  let seed = 88213;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const angle = rand() * Math.PI * 2;
    const rad = 110 + Math.sqrt(rand()) * 270;
    positions[i3] = Math.cos(angle) * rad;
    positions[i3 + 1] = Math.sin(angle) * rad * 0.78;
    positions[i3 + 2] = (rand() - 0.5) * 260;
    accents[i] = rand() < 0.14 ? 1 : 0;
    dustMask[i] = 1;
    shades[i] = 0.5;
  }

  return { positions, accents, dustMask, shades, width: 520, height: 420 };
}

export default function ParticleCanvasL0() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const guiVisible = useScrollStore((s) => s.guiVisible);
  const fps = useScrollStore((s) => s.fps);
  const telemetry = useScrollStore((s) => s.telemetry);
  const freezeSimulation = useScrollStore((s) => s.params.freezeSimulation);
  const [fallbackStatic, setFallbackStatic] = useState(false);

  // Optional lil-gui inspector toggled with 'D'
  useEffect(() => {
    if (!guiVisible) return;
    let guiInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    const mountGui = async () => {
      try {
        const mod = await import('lil-gui');
        if (cancelled) return;
        const GUI = mod.default;
        const gui = new GUI({ title: 'L0 Story-Grade Particles', width: 256 });
        guiInstance = gui;
        const proxy = { ...useScrollStore.getState().params };
        const update = useScrollStore.getState().updateParam;

        gui
          .add(proxy, 'freezeSimulation')
          .name('Freeze morph')
          .onChange((v: boolean) => update('freezeSimulation', v));
        gui
          .add(proxy, 'assembleDurationMs', 500, 1400, 20)
          .name('Morph ms')
          .onChange((v: number) => update('assembleDurationMs', v));
        gui
          .add(proxy, 'microVibAmp', 0, 0.4, 0.05)
          .name('Hold noise')
          .onChange((v: number) => update('microVibAmp', v));
        gui
          .add(proxy, 'shellThickness', 16, 70, 2)
          .name('Bloom shell px')
          .onChange((v: number) => update('shellThickness', v));
        gui
          .add(proxy, 'lerp', 0.03, 0.14, 0.005)
          .name('Scroll lerp')
          .onChange((v: number) => update('lerp', v));
      } catch {
        // ignore dynamic import failures
      }
    };

    void mountGui();
    return () => {
      cancelled = true;
      guiInstance?.destroy();
    };
  }, [guiVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const id = requestAnimationFrame(() => setFallbackStatic(true));
      return () => cancelAnimationFrame(id);
    }

    const host = mountRef.current;
    if (!host) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = width < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      const id = requestAnimationFrame(() => setFallbackStatic(true));
      return () => cancelAnimationFrame(id);
    }

    const gl2 = renderer.getContext() as WebGL2RenderingContext;
    const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
    const gpuStr = dbg ? String(gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(gpuStr);

    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1000,
      1000
    );
    camera.position.z = 100;

    // ─────────────────────────────────────────────────────────
    // 1. STORY-GRADE MORPH PARTICLE SYSTEM (THREE.Points)
    // ─────────────────────────────────────────────────────────
    const morphCount = isSoftwareGl ? 20000 : isMobile ? 18000 : 40000;
    const cloudBuffer = createOpenCloudBuffer(morphCount);

    const posFromArr = new Float32Array(cloudBuffer.positions);
    const posToArr = new Float32Array(cloudBuffer.positions);
    const accentFromArr = new Float32Array(cloudBuffer.accents);
    const accentToArr = new Float32Array(cloudBuffer.accents);
    const dustFromArr = new Float32Array(cloudBuffer.dustMask);
    const dustToArr = new Float32Array(cloudBuffer.dustMask);

    const aRandom = new Float32Array(morphCount * 4);
    const aDelay = new Float32Array(morphCount);

    let rSeed = 42071;
    const nextRand = () => {
      rSeed = (rSeed * 1664525 + 1013904223) >>> 0;
      return rSeed / 0xffffffff;
    };
    for (let i = 0; i < morphCount; i++) {
      const r4 = i * 4;
      aRandom[r4] = nextRand();
      aRandom[r4 + 1] = nextRand();
      aRandom[r4 + 2] = nextRand();
      aRandom[r4 + 3] = nextRand();
      aDelay[i] = nextRand() * 0.35; // Exact Story maxDelay = 0.35
    }

    const posFromAttr = new THREE.BufferAttribute(posFromArr, 3);
    const posToAttr = new THREE.BufferAttribute(posToArr, 3);
    const accentFromAttr = new THREE.BufferAttribute(accentFromArr, 1);
    const accentToAttr = new THREE.BufferAttribute(accentToArr, 1);
    const dustFromAttr = new THREE.BufferAttribute(dustFromArr, 1);
    const dustToAttr = new THREE.BufferAttribute(dustToArr, 1);

    const morphGeo = new THREE.BufferGeometry();
    morphGeo.setAttribute('position', posFromAttr);
    morphGeo.setAttribute('aPosTo', posToAttr);
    morphGeo.setAttribute('aAccentFrom', accentFromAttr);
    morphGeo.setAttribute('aAccentTo', accentToAttr);
    morphGeo.setAttribute('aDustFrom', dustFromAttr);
    morphGeo.setAttribute('aDustTo', dustToAttr);
    morphGeo.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 4));
    morphGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));

    const morphMat = new THREE.ShaderMaterial({
      vertexShader: SITE_MORPH_VERT,
      fragmentShader: SITE_MORPH_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      // NormalBlending: exact Story clarity, zero washed-out gray/white accumulation!
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 1 },
        uPixelRatio: { value: dpr },
        uSize: { value: isMobile ? 1.7 : 1.62 },
        uAlphaMin: { value: 0.36 },
        uAlphaMax: { value: 0.72 },
        uDustAlpha: { value: 0.16 },
        uBaseNoise: { value: 1.25 },
        uMorphNoise: { value: 72.0 },
        uReducedMotion: { value: 0 },
        uOriginFrom: { value: new THREE.Vector2(0, 0) },
        uOriginTo: { value: new THREE.Vector2(0, 0) },
        uVisFrom: { value: 0 },
        uVisTo: { value: 0 },
        uSlotOpacity: { value: 1 },
        uTilt: { value: new THREE.Vector2(0, 0) },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0 },
        uMouseHold: { value: 0 },
        uBloomOrigin: { value: new THREE.Vector2(0, 0) },
        uBloomR: { value: 0 },
        uBloomActive: { value: 0 },
        uDarkCovered: { value: 0 },
        uShellThick: { value: 32 },
        uLightBase: { value: new THREE.Color('#141414') },
        uLightDim: { value: new THREE.Color('#64646E') },
        uLightAccent: { value: new THREE.Color('#5B5BF0') },
        uDarkBase: { value: new THREE.Color('#EAEAF0') },
        uDarkDim: { value: new THREE.Color('#7A7A86') },
        uDarkAccent: { value: new THREE.Color('#5B5BF0') },
      },
    });

    const morphPoints = new THREE.Points(morphGeo, morphMat);
    morphPoints.frustumCulled = false;
    scene.add(morphPoints);

    // ─────────────────────────────────────────────────────────
    // 2. MATCHING STORY-STYLE AMBIENT DUST (THREE.Points)
    // ─────────────────────────────────────────────────────────
    const dustCount = isSoftwareGl ? 700 : isMobile ? 750 : 1600;
    const dustPos = new Float32Array(dustCount * 3);
    const dustRand = new Float32Array(dustCount * 4);
    const dustLayer = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = nextRand();
      dustPos[i * 3 + 1] = nextRand();
      dustPos[i * 3 + 2] = 0;
      dustRand[i * 4] = nextRand();
      dustRand[i * 4 + 1] = nextRand();
      dustRand[i * 4 + 2] = nextRand();
      dustRand[i * 4 + 3] = nextRand();
      dustLayer[i] = nextRand();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('aRandom', new THREE.BufferAttribute(dustRand, 4));
    dustGeo.setAttribute('aLayer', new THREE.BufferAttribute(dustLayer, 1));

    const dustMat = new THREE.ShaderMaterial({
      vertexShader: SITE_DUST_VERT,
      fragmentShader: SITE_DUST_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uResolution: { value: new THREE.Vector2(width, height) },
        uScrollPos: { value: 0 },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0 },
        uReducedMotion: { value: 0 },
        uBloomOrigin: { value: new THREE.Vector2(0, 0) },
        uBloomR: { value: 0 },
        uBloomActive: { value: 0 },
        uDarkCovered: { value: 0 },
      },
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.frustumCulled = false;
    scene.add(dustPoints);

    // Subtle Bloom transition ring
    const bloomRingMat = new THREE.MeshBasicMaterial({
      color: '#ECEBE7',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bloomRing = new THREE.Mesh(
      new THREE.RingGeometry(0.997, 1.0, 96),
      bloomRingMat
    );
    bloomRing.position.z = 26;
    scene.add(bloomRing);

    // ─────────────────────────────────────────────────────────
    // 3. CONTINUOUS STORY-STYLE MORPH CONTROLLER & BUFFER CACHE
    // ─────────────────────────────────────────────────────────
    const bufferCache = new Map<string, StoryTargetBuffer>();
    let currentKey = 'none';
    let fromSlotId: string | null = null;
    let toSlotId: string | null = null;
    let visFrom = 0;
    let visTo = 0;
    let morphProgress = 1;
    let morphElapsedSec = 0;
    let smoothOpacity = 1;
    let desiredOpacity = 0;
    let buildToken = 0;

    // Remember last known live origins so morphs from/to 'none' always stay anchored
    const lastFromOrigin = new THREE.Vector2(0, 0);
    const lastToOrigin = new THREE.Vector2(0, 0);

    const toWebgl = (cx: number, cy: number) => ({
      x: cx - width * 0.5,
      y: -(cy - height * 0.5),
    });

    /**
     * Bakes the exact current interpolated GPU state into the `From` buffers
     * so interrupting a morph mid-flight NEVER pops or snaps!
     */
    const bakeCurrentToFrom = () => {
      const p = morphProgress;
      for (let i = 0; i < morphCount; i++) {
        const delay = aDelay[i];
        const localP = Math.max(0, Math.min(1, (p - delay) / Math.max(0.001, 1 - delay)));
        const e = localP * localP * (3 - 2 * localP);
        const i3 = i * 3;
        posFromArr[i3] = posFromArr[i3] + (posToArr[i3] - posFromArr[i3]) * e;
        posFromArr[i3 + 1] = posFromArr[i3 + 1] + (posToArr[i3 + 1] - posFromArr[i3 + 1]) * e;
        posFromArr[i3 + 2] = posFromArr[i3 + 2] + (posToArr[i3 + 2] - posFromArr[i3 + 2]) * e;
        accentFromArr[i] = accentFromArr[i] + (accentToArr[i] - accentFromArr[i]) * e;
        dustFromArr[i] = dustFromArr[i] + (dustToArr[i] - dustFromArr[i]) * e;
      }
      posFromAttr.needsUpdate = true;
      accentFromAttr.needsUpdate = true;
      dustFromAttr.needsUpdate = true;

      const avgE = p * p * (3 - 2 * p);
      visFrom = visFrom + (visTo - visFrom) * avgE;
      lastFromOrigin.lerp(lastToOrigin, avgE);
      fromSlotId = avgE > 0.5 ? toSlotId : fromSlotId;
    };

    const applyNextTarget = (
      nextBuf: StoryTargetBuffer,
      nextSlotId: string | null,
      nextVisible: boolean
    ) => {
      bakeCurrentToFrom();

      posToArr.set(nextBuf.positions);
      accentToArr.set(nextBuf.accents);
      dustToArr.set(nextBuf.dustMask);
      posToAttr.needsUpdate = true;
      accentToAttr.needsUpdate = true;
      dustToAttr.needsUpdate = true;

      toSlotId = nextSlotId;
      visTo = nextVisible ? 1 : 0;

      // If coming FROM 'none' (invisible cloud) INTO a visible slot, anchor the cloud around the destination slot
      if (visFrom < 0.05 && nextVisible && nextSlotId) {
        const scrollPos = useScrollStore.getState().scroll.pos;
        const rect = particleRegistry.getLiveScreenRect(nextSlotId, scrollPos, height);
        if (rect) {
          const wOrigin = toWebgl(rect.centerX, rect.centerY);
          lastFromOrigin.set(wOrigin.x, wOrigin.y);
          lastToOrigin.set(wOrigin.x, wOrigin.y);
          fromSlotId = nextSlotId;
        }
      }

      // If going TO 'none' (dispersing outward), keep cloud anchored over the departing slot!
      if (!nextVisible && fromSlotId) {
        lastToOrigin.copy(lastFromOrigin);
        toSlotId = fromSlotId;
      }

      morphProgress = 0;
      morphElapsedSec = 0;
    };

    const requestSlotMorph = (resolved: ResolvedSlot) => {
      currentKey = resolved.key;

      if (!resolved.spec) {
        buildToken++;
        applyNextTarget(cloudBuffer, null, false);
        return;
      }

      const cached = bufferCache.get(resolved.key);
      if (cached) {
        applyNextTarget(cached, resolved.spec.id, true);
        return;
      }

      const token = ++buildToken;
      const spec = resolved.spec;
      void particleRegistry
        .buildStoryTargetBuffer(spec, morphCount, 420, 420)
        .then((buf) => {
          if (!buf || disposed || token !== buildToken) return;
          bufferCache.set(resolved.key, buf);
          applyNextTarget(buf, spec.id, true);
        });
    };

    const unsubRegistry = particleRegistry.subscribe(() => {
      // Clear cached buffers if layout box changed significantly on resize/locale
      bufferCache.clear();
    });

    // Pointer tracking
    const mouseTarget = new THREE.Vector2(9999, 9999);
    const mouseCurrent = new THREE.Vector2(9999, 9999);
    const tiltTarget = new THREE.Vector2(0, 0);
    const tiltCurrent = new THREE.Vector2(0, 0);
    let mouseActive = 0;
    let mouseHold = 0;

    const onPointerMove = (e: PointerEvent) => {
      const p = toWebgl(e.clientX, e.clientY);
      mouseTarget.set(p.x, p.y);
      mouseActive = 1;
      tiltTarget.set(
        (e.clientX / Math.max(1, width) - 0.5) * 2,
        -(e.clientY / Math.max(1, height) - 0.5) * 2
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button, a, input, textarea, .lil-gui')) {
        return;
      }
      mouseHold = 1;
      useScrollStore.getState().setCursorMagnetHold(true);
    };
    const onPointerUp = () => {
      mouseHold = 0;
      useScrollStore.getState().setCursorMagnetHold(false);
    };
    const onPointerLeave = () => {
      mouseActive = 0;
      mouseHold = 0;
      tiltTarget.set(0, 0);
      useScrollStore.getState().setCursorMagnetHold(false);
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      const nextDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(nextDpr);
      morphMat.uniforms.uPixelRatio.value = nextDpr;
      dustMat.uniforms.uPixelRatio.value = nextDpr;
      dustMat.uniforms.uResolution.value.set(width, height);
      bufferCache.clear();
    };

    let tabVisible = !document.hidden;
    const onVis = () => {
      tabVisible = !document.hidden;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);

    let fpsFrames = 0;
    let fpsStart = performance.now();
    let telemetryTimer = 0;
    let disposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
        if (status === gl2.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl2.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      if (!tabVisible) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(clock.getDelta(), 1 / 30);
      const elapsed = clock.getElapsedTime();
      const st = useScrollStore.getState();
      const { scroll, bloom, params } = st;

      fpsFrames++;
      const now = performance.now();
      if (now - fpsStart >= 1000) {
        st.setFps(Math.round((fpsFrames * 1000) / (now - fpsStart)));
        fpsFrames = 0;
        fpsStart = now;
      }

      const secP = st.sectionProgress[st.activeSection] ?? 0;
      const resolved = resolveActiveMajorSlot(
        st.activeSection,
        secP,
        st.locale,
        st.heroPortraitHovered
      );

      if (resolved.key !== currentKey) {
        requestSlotMorph(resolved);
      }
      desiredOpacity = resolved.spec ? resolved.opacity : 1;

      // Advance Story-style smooth damped morph with velocity cap (<= 1.25/sec)
      if (!params.freezeSimulation && morphProgress < 1) {
        const durSec = Math.max(0.55, params.assembleDurationMs / 1000);
        const maxRate = 1.05 / durSec;
        const damped = THREE.MathUtils.damp(morphProgress, 1, 3.6 / durSec, dt);
        const step = Math.min(damped - morphProgress, maxRate * dt);
        morphProgress = Math.min(1, morphProgress + Math.max(step, dt / (durSec * 1.35)));
        morphElapsedSec += dt;
        if (morphProgress > 0.998) {
          morphProgress = 1;
        }
      }

      // Resolve live Lenis-locked screen origins for both From and To slots
      if (fromSlotId) {
        const rFrom = particleRegistry.getLiveScreenRect(fromSlotId, scroll.pos, height);
        if (rFrom) {
          const wFrom = toWebgl(rFrom.centerX, rFrom.centerY);
          lastFromOrigin.set(wFrom.x, wFrom.y);
        }
      }
      if (toSlotId) {
        const rTo = particleRegistry.getLiveScreenRect(toSlotId, scroll.pos, height);
        if (rTo) {
          const wTo = toWebgl(rTo.centerX, rTo.centerY);
          lastToOrigin.set(wTo.x, wTo.y);
        }
      }

      smoothOpacity = THREE.MathUtils.damp(smoothOpacity, desiredOpacity, 8, dt);
      mouseCurrent.lerp(mouseTarget, 1 - Math.exp(-12 * dt));
      tiltCurrent.lerp(tiltTarget, 1 - Math.exp(-6 * dt));

      const bloomOriginW = toWebgl(bloom.originX, bloom.originY);

      // Update Morph shader uniforms
      const mu = morphMat.uniforms;
      mu.uTime.value = params.freezeSimulation ? 0 : elapsed;
      mu.uProgress.value = morphProgress;
      mu.uBaseNoise.value = params.freezeSimulation ? 0 : Math.max(0.4, params.microVibAmp * 4.5);
      mu.uOriginFrom.value.copy(lastFromOrigin);
      mu.uOriginTo.value.copy(lastToOrigin);
      mu.uVisFrom.value = visFrom;
      mu.uVisTo.value = visTo;
      mu.uSlotOpacity.value = smoothOpacity;
      mu.uTilt.value.copy(tiltCurrent);
      mu.uMouse.value.copy(mouseCurrent);
      mu.uMouseActive.value = mouseActive;
      mu.uMouseHold.value = mouseHold;
      mu.uBloomOrigin.value.set(bloomOriginW.x, bloomOriginW.y);
      mu.uBloomR.value = bloom.radius;
      mu.uBloomActive.value = bloom.active ? 1.0 : 0.0;
      mu.uDarkCovered.value = bloom.darkCovered ? 1.0 : 0.0;
      mu.uShellThick.value = params.shellThickness;

      // Update Dust shader uniforms
      const du = dustMat.uniforms;
      du.uTime.value = params.freezeSimulation ? 0 : elapsed;
      du.uScrollPos.value = scroll.pos;
      du.uMouse.value.copy(mouseCurrent);
      du.uMouseActive.value = mouseActive;
      du.uBloomOrigin.value.set(bloomOriginW.x, bloomOriginW.y);
      du.uBloomR.value = bloom.radius;
      du.uBloomActive.value = bloom.active ? 1.0 : 0.0;
      du.uDarkCovered.value = bloom.darkCovered ? 1.0 : 0.0;

      // Bloom sweep ring
      bloomRing.position.set(bloomOriginW.x, bloomOriginW.y, 26);
      const showBloomRing =
        bloom.active && bloom.radius > 4 && bloom.radius < bloom.maxRadius * 0.98;
      if (showBloomRing) {
        bloomRing.scale.set(bloom.radius, bloom.radius, 1);
        bloomRingMat.opacity = 0.45;
      } else {
        bloomRingMat.opacity = 0;
      }

      // Telemetry update for optional Dev Inspector (Key D)
      telemetryTimer += dt;
      if (telemetryTimer >= 0.14) {
        telemetryTimer = 0;
        const settledPct = Math.round(morphProgress * 100);
        const moving = morphProgress < 0.99 ? Math.round(morphCount * (1 - morphProgress)) : 0;
        st.setTelemetry({
          settledPct,
          avgVelPxSec: moving > 0 ? Math.round((1 - morphProgress) * 140) : 0,
          freeCount: dustCount + moving,
          morphCount,
          dustCount,
          assembleState:
            visTo < 0.5 && morphProgress >= 0.99
              ? 'idle'
              : morphProgress >= 0.99
                ? 'settled'
                : 'assembling',
          assembleElapsedMs: Math.round(morphElapsedSec * 1000),
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      unsubRegistry();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      morphGeo.dispose();
      morphMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      bloomRing.geometry.dispose();
      bloomRingMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (fallbackStatic) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    );
  }

  return (
    <>
      <div
        ref={mountRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      />
      {guiVisible && (
        <div
          dir="ltr"
          className="fixed top-14 start-4 z-50 flex flex-wrap items-center gap-3 border border-white/20 bg-[#0A0A0A]/90 px-3 py-1.5 font-mono text-[10px] text-[#ECEBE7]"
        >
          <span>FPS {fps}</span>
          <span>MORPH {telemetry.settledPct.toFixed(0)}%</span>
          <span>PTS {telemetry.morphCount.toLocaleString()}</span>
          <span>DUST {telemetry.dustCount}</span>
          {freezeSimulation && <span className="text-[#8F8FFF]">FROZEN</span>}
        </div>
      )}
    </>
  );
}
