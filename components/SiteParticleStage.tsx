'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CONTENT, Locale, SectionId } from '@/lib/content';
import {
  LocalSlotSpec,
  StoryTargetBuffer,
  particleRegistry,
} from '@/lib/particleRegistry';
import {
  CONTACT_CONFIG,
  HERO_PORTRAIT_CONFIG,
  SITE_DEBUG_SHAPES,
  SITE_PARTICLE_CONFIG,
  SiteParticleShapeId,
  STATEMENT_COPY,
  WHAT_I_DO_PARTICLE_CONFIG,
} from '@/lib/site.config';
import { useScrollStore } from '@/lib/scrollStore';
import { ChevronLeft, ChevronRight, Moon, Sun, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * GLOBAL CONTINUOUS PARTICLE STAGE (SiteParticleStage)
 * Single fixed WebGL2 canvas with ONE BufferGeometry:
 *   - 70,000 particles desktop / 25,000 mobile / 28,000 softwareGl
 *   - NormalBlending, 1.2..2.4px crisp dots, 0.40..0.80 alpha
 *   - Continuous theme lerp uTheme (0 light #111 -> 1 dark #d9d9d9, accent #5B5BF0)
 *   - Edge-outward Statement evaporation (uEvaporate 0 -> 1)
 *   - Client Notes micro-morph impulse on quote switch (uMicroMorph)
 *   - Contact infinite GPU-wrapped horizontal strip (SOHEIL — SOHEIL — SOHEIL)
 *   - Built-in ?debug=shapes static zero-noise inspector
 * ───────────────────────────────────────────────────────────── */

const SITE_STAGE_VERT = /* glsl */ `
precision highp float;

attribute vec3 aPosTo;
attribute float aAccentFrom;
attribute float aAccentTo;
attribute float aDustFrom;
attribute float aDustTo;
attribute float aShadeFrom;
attribute float aShadeTo;
attribute vec4 aRandom;
attribute float aDelay;

uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uSize;
uniform float uPointMin;
uniform float uPointMax;
uniform float uAlphaMin;
uniform float uAlphaMax;
uniform float uDustAlpha;
uniform float uBaseNoise;
uniform float uMorphNoise;
uniform float uReducedMotion;
uniform float uDebugStatic;

uniform vec2 uOriginFrom;
uniform vec2 uOriginTo;
uniform float uVisFrom;
uniform float uVisTo;
uniform float uSlotOpacity;
uniform vec2 uTilt;
uniform vec2 uResolution;

uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uMouseHold;
uniform float uMouseRadius;
uniform float uHoverAccentBoost;

uniform float uTheme;          // Smooth 0 (light) -> 1 (dark)
uniform float uEvaporate;      // 0..1 edge-outward evaporation (Statement exit / Hero exit)
uniform float uMicroMorph;     // 0..1 impulse scatter/re-form on Client Notes quote change
uniform float uStripMode;      // 0..1 infinite horizontal marquee strip mode (Contact)
uniform float uStripOffset;    // px continuous marquee drift offset
uniform float uStripLen;       // total repeating strip world span in px
uniform float uUseShade;       // 0..1 photographic grey shade mode (Hero portrait)
uniform float uHeroBottomFade; // 0..1 smooth bottom-edge dissolve (Hero portrait)
uniform float uHeroSlotHalfH;  // Half-height of hero portrait slot in px
uniform float uHeroGather;     // 0..1 initial 2.2s cloud-to-portrait assembly
uniform float uHeroRevealActive; // 0..1 localized cursor spotlight active over Hero portrait

// Black Hole / White Hole Singularity Transition Uniforms
uniform float uBhActive;       // 0.0 or 1.0
uniform vec2 uBhOrigin;        // Singularity center in centered WebGL viewport px
uniform float uBhRadius;       // Current event horizon radius in px
uniform float uBhMaxRadius;    // Max cover radius to farthest corner in px
uniform float uBhProgress;     // 0..1 scrubbed scroll progress
uniform float uBhOuterTheme;   // 0.0 light / 1.0 dark outside circle
uniform float uBhInnerTheme;   // 1.0 dark / 0.0 light inside circle
uniform float uBhVortex;       // Gravitational spiral pull strength (0 in reduced motion)

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vTheme;
varying float vShade;
varying float vUseShade;
varying float vBhEdge;

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
  float motionScale = (1.0 - uReducedMotion) * (1.0 - uDebugStatic);

  // Staggered per-particle morph wave (aDelay in 0..0.35)
  float delay = aDelay * (1.0 - 0.85 * uReducedMotion) * (1.0 - uDebugStatic);
  float localP = clamp((uProgress - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  float easedP = localP * localP * (3.0 - 2.0 * localP);

  vec3 posA = position;
  vec3 posB = aPosTo;

  // Infinite GPU horizontal marquee wrap on target buffer when in Contact strip mode
  if (uStripMode > 0.001 && uStripLen > 10.0) {
    float halfLen = uStripLen * 0.5;
    float wrappedX = mod(posB.x + uStripOffset + halfLen, uStripLen) - halfLen;
    posB.x = mix(posB.x, wrappedX, uStripMode);
  }

  vec3 localPos = mix(posA, posB, easedP);
  float accent = mix(aAccentFrom, aAccentTo, easedP);
  float dust = mix(aDustFrom, aDustTo, easedP);
  float shade = mix(aShadeFrom, aShadeTo, easedP);
  float visMix = mix(uVisFrom, uVisTo, easedP);

  // Initial Hero 2.2s atmospheric cloud-to-portrait assembly
  float gatherFade = 1.0;
  if (uHeroGather < 0.999 && uDebugStatic < 0.5) {
    float gDelay = aDelay * 0.65 + aRandom.w * 0.14;
    float gLocal = clamp((uHeroGather * 1.28 - gDelay) / max(0.05, 1.0 - gDelay * 0.55), 0.0, 1.0);
    float gEase = 1.0 - pow(1.0 - gLocal, 3.0);
    float scatterAmt = (1.0 - gEase) * motionScale;
    float ang = aRandom.x * 6.2831853 + aRandom.y * 2.1;
    float rad = 80.0 + aRandom.z * 260.0;
    vec3 swirl = curlNoise(localPos * 0.009 + aRandom.xyz * 4.5, uTime * 0.65);
    localPos.xy += (vec2(cos(ang), sin(ang)) * rad + swirl.xy * 95.0) * scatterAmt;
    localPos.z += (swirl.z * 140.0 + (aRandom.w - 0.5) * 180.0) * scatterAmt;
    gatherFade = smoothstep(0.0, 0.38, gLocal);
  }

  // Subtle 3D orbital breath + cursor parallax (locked tight in Hero portrait for 1:1 photo reveal alignment)
  float tiltScale = motionScale * (1.0 - uStripMode * 0.85) * (1.0 - uUseShade * 0.94);
  float yaw = (sin(uTime * 0.30) * 0.045 + uTilt.x * 0.18) * tiltScale;
  float pitch = (cos(uTime * 0.25) * 0.032 + uTilt.y * 0.13) * tiltScale;
  localPos.xz = rot2(yaw) * localPos.xz;
  localPos.yz = rot2(pitch) * localPos.yz;

  // Noise law: calm <= 0.4% in hold, expressive curl mid-morph + micro-morph pulse
  float morphMid = sin(easedP * 3.14159265);
  float microMid = sin(uMicroMorph * 3.14159265);
  float noiseAmp = (uBaseNoise + morphMid * uMorphNoise + microMid * 46.0) * motionScale;
  if (noiseAmp > 0.01) {
    vec3 nDir = curlNoise(localPos * 0.013 + aRandom.xyz * 5.2, uTime * 0.56);
    float dustMul = mix(1.0, 2.0, dust);
    localPos += nDir * noiseAmp * dustMul;
  }

  // Edge-outward evaporation (Statement exit & Hero exit)
  float evapFade = 1.0;
  if (uEvaporate > 0.001 && uDebugStatic < 0.5) {
    float radialNorm = clamp(length(localPos.xy) / 360.0, 0.0, 1.0);
    float edgeLead = (1.0 - radialNorm) * 0.34 + aRandom.z * 0.22;
    float pEvap = clamp((uEvaporate * 1.48 - edgeLead) / 0.72, 0.0, 1.0);
    float eEvap = pEvap * pEvap;
    vec3 evapCurl = curlNoise(localPos * 0.012 + aRandom.xyz * 7.1, uTime * 0.9);
    vec2 outDir = length(localPos.xy) > 0.5 ? normalize(localPos.xy) : vec2(aRandom.x - 0.5, aRandom.y - 0.5);
    localPos.xy += (outDir * 145.0 + vec2(evapCurl.x * 95.0, 115.0 + evapCurl.y * 70.0)) * eEvap * motionScale;
    localPos.z += (evapCurl.z * 110.0) * eEvap * motionScale;
    evapFade = 1.0 - smoothstep(0.18, 0.96, pEvap);
  }

  // Gentle perspective foreshortening while z=0 stays pixel-locked
  float camDist = 1150.0;
  float persp = camDist / max(380.0, camDist - localPos.z);
  vec2 origin = mix(uOriginFrom, uOriginTo, easedP);
  vec2 screenPos = origin + localPos.xy * persp;

  // Interactive cursor repulsion & Hero portrait localized spotlight reveal (parting + clearing particles under cursor)
  float heroLensAlpha = 1.0;
  if (uMouseActive > 0.001 && motionScale > 0.5 && visMix > 0.02) {
    vec2 toPt = screenPos - uMouse;
    float dMouse = length(toPt);
    float radius = mix(uMouseRadius, uMouseRadius * 1.65, uMouseHold * (1.0 - uUseShade));
    if (uUseShade > 0.5 && uHeroRevealActive > 0.001) {
      float outerR = radius * 1.28;
      if (dMouse < outerR && dMouse > 0.5) {
        float rimBand = 1.0 - smoothstep(radius * 0.25, outerR, dMouse);
        vec2 dir = toPt / dMouse;
        // Gently part particles outward around the revealed photographic spotlight rim
        screenPos += dir * 24.0 * rimBand * rimBand * uHeroRevealActive * uMouseActive;
      }
      float clearCore = smoothstep(radius * 0.44, radius * 1.04, dMouse);
      heroLensAlpha = mix(1.0, clearCore, uHeroRevealActive * uMouseActive * uUseShade);
    } else if (dMouse < radius && dMouse > 0.5) {
      float falloff = 1.0 - smoothstep(0.0, radius, dMouse);
      float f2 = falloff * falloff;
      vec2 dir = toPt / dMouse;
      if (uMouseHold > 0.5) {
        vec2 tang = vec2(-dir.y, dir.x) * (aRandom.w > 0.5 ? 1.0 : -1.0);
        screenPos += (-dir * 26.0 + tang * 22.0) * f2 * uMouseActive;
      } else {
        screenPos += dir * 32.0 * f2 * uMouseActive;
      }
      if (uHoverAccentBoost > 0.001) {
        accent = max(accent, falloff * uHoverAccentBoost * uMouseActive);
      }
    }
  }

  // Soft viewport left/right edge fade in infinite strip mode
  float stripEdgeFade = 1.0;
  if (uStripMode > 0.001) {
    float halfW = max(200.0, uResolution.x * 0.5);
    float normFromEdge = 1.0 - abs(screenPos.x) / halfW;
    float fade = smoothstep(-0.02, 0.16, normFromEdge);
    stripEdgeFade = mix(1.0, fade, uStripMode);
  }

  // Soft bottom fade in Hero portrait mode so lower torso dissolves cleanly off bottom edge
  float bottomFade = 1.0;
  if (uHeroBottomFade > 0.001) {
    float fadeBand = max(60.0, uHeroSlotHalfH * 0.36);
    float distFromBottom = localPos.y + uHeroSlotHalfH;
    float bf = smoothstep(0.0, fadeBand, distFromBottom);
    bottomFade = mix(1.0, bf, uHeroBottomFade);
  }

  // Black Hole / White Hole gravitational spiral pull, swallow/rebirth, and razor-sharp circle-edge theme inversion
  float bhEdgeGlow = 0.0;
  float bhSwallowScale = 1.0;
  float effectiveTheme = uTheme;
  if (uBhActive > 0.5 && uDebugStatic < 0.5) {
    vec2 fromBh = screenPos - uBhOrigin;
    float dBh = length(fromBh);
    float rimDist = dBh - uBhRadius;
    float envArc = smoothstep(0.0, 0.05, uBhProgress) * (1.0 - smoothstep(0.93, 1.0, uBhProgress));

    if (motionScale > 0.5 && uBhVortex > 0.001) {
      vec2 radDir = dBh > 0.5
        ? fromBh / dBh
        : vec2(cos(aRandom.x * 6.2831853), sin(aRandom.x * 6.2831853));
      float spinDir = uBhInnerTheme > 0.5 ? 1.0 : -1.0;
      vec2 tangDir = vec2(-radDir.y, radDir.x) * spinDir;

      // Gravitational spiral well pulling surrounding particles toward the event horizon
      float outerPull = exp(-max(0.0, rimDist) / 165.0) * step(-16.0, rimDist);
      float innerEject = exp(-max(0.0, -rimDist) / 95.0) * step(rimDist, 0.0);
      float swirlFactor = (outerPull * 1.0 + innerEject * 0.55) * envArc * uBhVortex * (0.62 + aRandom.z * 0.72);

      // Pull inward + spiral tangentially as particles approach & cross the event horizon
      float radialForce = outerPull * -46.0 + innerEject * 22.0;
      screenPos += (radDir * radialForce + tangDir * 58.0) * swirlFactor;

      // Swallow compression right at the horizon followed by rebirth expansion inside
      float swallowZone = exp(-(rimDist * rimDist) / (28.0 * 28.0)) * envArc;
      bhSwallowScale = mix(1.0, 1.38, swallowZone);
      bhEdgeGlow = swallowZone * (0.65 + 0.35 * aRandom.y);
    }

    // Recompute exact final distance after gravitational displacement so color swaps strictly ON the circle edge
    float finalDBh = length(screenPos - uBhOrigin);
    float insideBh = 1.0 - step(uBhRadius, finalDBh);
    effectiveTheme = mix(uBhOuterTheme, uBhInnerTheme, insideBh);
  }

  // Dynamic countable point size clamped cleanly to active mode [uPointMin..uPointMax]
  float rawSize = uSize * (0.78 + aRandom.x * 0.68) * uPixelRatio * persp * bhSwallowScale;
  float dustSizeMul = mix(1.0, 0.72, dust);
  gl_PointSize = clamp(rawSize * dustSizeMul, uPointMin * uPixelRatio, uPointMax * uPixelRatio * 1.35);

  // Clean alpha hierarchy with quiet surround dust
  float depthNorm = clamp((localPos.z + 130.0) / 260.0, 0.0, 1.0);
  float structAlpha = mix(uAlphaMin, uAlphaMax, 0.25 + depthNorm * 0.5 + aRandom.y * 0.25);
  float accentAlpha = mix(structAlpha, min(0.95, uAlphaMax + 0.06), max(accent, bhEdgeGlow));
  float baseAlpha = mix(accentAlpha, uDustAlpha, dust);

  float morphBreath = 1.0 - morphMid * 0.14 - microMid * 0.12;
  vAlpha = baseAlpha * visMix * uSlotOpacity * morphBreath * evapFade * stripEdgeFade * bottomFade * gatherFade * heroLensAlpha;
  vAccent = clamp(accent, 0.0, 1.0);
  vDepthNorm = depthNorm;
  vTheme = effectiveTheme;
  vShade = clamp(shade, 0.0, 1.0);
  vUseShade = uUseShade;
  vBhEdge = clamp(bhEdgeGlow, 0.0, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(screenPos, clamp(localPos.z * 0.08, -20.0, 20.0), 1.0);
}
`;

const SITE_STAGE_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uLightBase;
uniform vec3 uLightDim;
uniform vec3 uDarkBase;
uniform vec3 uDarkDim;
uniform vec3 uAccent;
uniform vec3 uBhAccent;

varying float vAccent;
varying float vAlpha;
varying float vDepthNorm;
varying float vTheme;
varying float vShade;
varying float vUseShade;
varying float vBhEdge;

void main() {
  if (vAlpha < 0.01) discard;

  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float disc = smoothstep(0.5, 0.20, dist);

  vec3 lightMono = mix(uLightDim, uLightBase, 0.35 + vDepthNorm * 0.65);
  vec3 darkMono = mix(uDarkDim, uDarkBase, 0.35 + vDepthNorm * 0.65);
  vec3 depthMono = mix(lightMono, darkMono, vTheme);

  // Photographic luminance grayscale ramp for Hero portrait (#111..#777 light / #8a8a8a..#f2f2f2 dark)
  vec3 lightPhoto = mix(vec3(0.067), vec3(0.467), vShade);
  vec3 darkPhoto = mix(vec3(0.541), vec3(0.949), vShade);
  vec3 photoMono = mix(lightPhoto, darkPhoto, vTheme);

  vec3 mono = mix(depthMono, photoMono, vUseShade);
  vec3 accentCol = mix(uAccent, uAccent * 1.15, vTheme);
  float accentMix = mix(smoothstep(0.25, 0.85, vAccent), step(0.5, vAccent), vUseShade);
  vec3 color = mix(mono, accentCol, accentMix);
  color = mix(color, uBhAccent * 1.18, vBhEdge * 0.88);

  gl_FragColor = vec4(color, disc * vAlpha);
}
`;

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
uniform float uTheme;
uniform float uDustBoost;
uniform float uBhActive;
uniform vec2 uBhOrigin;
uniform float uBhRadius;
uniform float uBhProgress;
uniform float uBhOuterTheme;
uniform float uBhInnerTheme;
uniform float uBhVortex;

varying float vAlpha;
varying float vAccent;
varying float vTheme;
varying float vBhEdge;

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
      pos += (toPt / dM) * fall * fall * 24.0 * uMouseActive;
    }
  }

  float effectiveTheme = uTheme;
  float bhEdgeGlow = 0.0;
  float bhAlphaBoost = 1.0;

  if (uBhActive > 0.5) {
    vec2 fromBh = pos - uBhOrigin;
    float dBh = length(fromBh);
    float rimDist = dBh - uBhRadius;
    float envArc = smoothstep(0.0, 0.05, uBhProgress) * (1.0 - smoothstep(0.93, 1.0, uBhProgress));

    if (motionScale > 0.5 && uBhVortex > 0.001) {
      vec2 radDir = dBh > 0.5 ? fromBh / dBh : vec2(1.0, 0.0);
      float spinDir = uBhInnerTheme > 0.5 ? 1.0 : -1.0;
      vec2 tangDir = vec2(-radDir.y, radDir.x) * spinDir;
      float pull = exp(-abs(rimDist) / 140.0) * envArc * uBhVortex * (0.55 + aLayer * 0.75);
      pos += (-radDir * 36.0 + tangDir * 54.0) * pull;
      bhEdgeGlow = exp(-(rimDist * rimDist) / (30.0 * 30.0)) * envArc;
      bhAlphaBoost = 1.0 + bhEdgeGlow * 2.4;
    }

    float finalDBh = length(pos - uBhOrigin);
    float insideBh = 1.0 - step(uBhRadius, finalDBh);
    effectiveTheme = mix(uBhOuterTheme, uBhInnerTheme, insideBh);
  }

  vTheme = effectiveTheme;
  vAccent = aRandom.z > 0.88 ? 1.0 : 0.0;
  vBhEdge = clamp(bhEdgeGlow, 0.0, 1.0);
  float baseA = mix(0.10, 0.22, aLayer) * uDustBoost * bhAlphaBoost;
  vAlpha = min(0.92, baseA * (0.75 + 0.25 * sin(uTime * 0.6 + aRandom.w * 6.2831)));

  gl_PointSize = clamp((1.15 + aLayer * 0.9 + bhEdgeGlow * 0.95) * uPixelRatio, 1.1 * uPixelRatio, 2.8 * uPixelRatio);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, -25.0, 1.0);
}
`;

const SITE_DUST_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uBhAccent;

varying float vAlpha;
varying float vAccent;
varying float vTheme;
varying float vBhEdge;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;
  float disc = smoothstep(0.5, 0.22, dist);

  vec3 lightCol = mix(vec3(0.22, 0.22, 0.25), vec3(0.357, 0.357, 0.941), vAccent);
  vec3 darkCol = mix(vec3(0.76, 0.76, 0.82), vec3(0.52, 0.52, 1.0), vAccent);
  vec3 col = mix(lightCol, darkCol, vTheme);
  col = mix(col, uBhAccent * 1.15, vBhEdge * 0.9);

  gl_FragColor = vec4(col, disc * vAlpha);
}
`;

/* ─────────────────────────────────────────────────────────────
 * EVENT-HORIZON ACCRETION PARTICLE RING (#5B5BF0)
 * Tight orbiting particle halo locked to the exact singularity radius
 * ───────────────────────────────────────────────────────────── */
const BH_RING_VERT = /* glsl */ `
precision highp float;

attribute vec4 aRing; // x: baseAngle, y: radialOffsetNorm (-1..1), z: speed, w: sparkRand

uniform float uTime;
uniform float uPixelRatio;
uniform float uBhActive;
uniform vec2 uBhOrigin;
uniform float uBhRadius;
uniform float uBhMaxRadius;
uniform float uBhProgress;
uniform float uBhInnerTheme;
uniform float uReducedMotion;

varying float vAlpha;
varying float vHot;

void main() {
  float ringActive = uBhActive * (1.0 - uReducedMotion);
  if (ringActive < 0.5 || uBhRadius < 1.0 || uBhRadius > uBhMaxRadius - 2.0) {
    vAlpha = 0.0;
    vHot = 0.0;
    gl_PointSize = 0.0;
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    return;
  }

  float spinDir = uBhInnerTheme > 0.5 ? 1.0 : -1.0;
  float omega = (0.35 + aRing.z * 0.95) * spinDir;
  float angle = aRing.x + uTime * omega + uBhProgress * 4.2 * spinDir;

  // Concentrate 75% of particles razor-tight on the event horizon, 25% swirling just outside
  float spreadScale = mix(6.0, 24.0, smoothstep(0.0, 0.35, uBhProgress));
  float signedOff = aRing.y;
  float radialJitter = signedOff * abs(signedOff) * spreadScale
    + sin(angle * 5.0 + uTime * 2.2 + aRing.w * 6.2831) * 2.2;
  float r = max(0.5, uBhRadius + radialJitter);

  vec2 pos = uBhOrigin + vec2(cos(angle), sin(angle)) * r;

  float edgeFadeIn = smoothstep(1.5, 22.0, uBhRadius);
  float edgeFadeOut = 1.0 - smoothstep(uBhMaxRadius - 36.0, uBhMaxRadius, uBhRadius);
  float coreProximity = 1.0 - clamp(abs(signedOff), 0.0, 1.0);

  vHot = smoothstep(0.55, 0.98, coreProximity) * (0.45 + 0.55 * aRing.w);
  vAlpha = (0.28 + 0.67 * coreProximity) * edgeFadeIn * edgeFadeOut;

  float ptSize = (1.35 + coreProximity * 1.45 + aRing.w * 0.65) * uPixelRatio;
  gl_PointSize = clamp(ptSize, 1.2 * uPixelRatio, 3.6 * uPixelRatio);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 22.0, 1.0);
}
`;

const BH_RING_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uBhAccent;

varying float vAlpha;
varying float vHot;

void main() {
  if (vAlpha < 0.01) discard;
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;
  float disc = smoothstep(0.5, 0.16, dist);

  vec3 hotCore = mix(uBhAccent, vec3(0.76, 0.76, 1.0), vHot * 0.68);
  gl_FragColor = vec4(hotCore, disc * vAlpha);
}
`;

interface ResolvedSlot {
  key: string;
  spec: LocalSlotSpec | null;
  opacity: number;
  evaporate: number;
  isStrip: boolean;
}

function resolveActiveSiteSlot(
  section: SectionId,
  p: number,
  locale: Locale,
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
        evaporate: 0,
        isStrip: false,
      };
    }
    const evap = p > 0.78 ? Math.min(1, (p - 0.78) / 0.2) : 0;
    return {
      key: 'intro-portrait',
      spec: {
        id: 'intro-portrait',
        descriptor: 'image:portrait',
      },
      opacity: 1,
      evaporate: evap,
      isStrip: false,
    };
  }

  if (section === 'hero') {
    // Keep particles intact on scroll-exit so they visibly travel & morph into the About SVG badge trophy
    return {
      key: 'hero-portrait',
      spec: {
        id: 'hero-portrait',
        descriptor: 'image:portrait',
      },
      opacity: heroPortraitHovered ? 1 : 1,
      evaporate: 0,
      isStrip: false,
    };
  }

  if (section === 'about') {
    return {
      key: 'about-trophy',
      spec: {
        id: 'about-trophy',
        descriptor: 'svg:trophy',
      },
      opacity: 1,
      evaporate: 0,
      isStrip: false,
    };
  }

  if (section === 'whatido') {
    const count = t.whatido.tabs.length;
    const idx = Math.min(count - 1, Math.max(0, Math.floor(p * count)));
    const tab = t.whatido.tabs[idx];
    return {
      key: `whatido:${tab.id}`,
      spec: {
        id: 'whatido-diagram',
        descriptor: `svg:${tab.id}`,
        drawProgress: 1,
      },
      opacity: 1,
      evaporate: 0,
      isStrip: false,
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
      evaporate: 0,
      isStrip: false,
    };
  }

  if (section === 'statement') {
    // 3 phases: enter (0..0.20), crisp hold (0.20..0.76 -> >= 56%), edge-outward evaporation (0.76..1.0)
    const evap = p > 0.76 ? Math.min(1, (p - 0.76) / 0.21) : 0;
    return {
      key: `statement:${locale}`,
      spec: {
        id: 'statement-title',
        descriptor: `statement:${STATEMENT_COPY[locale].particleWord}`,
        isRtl,
        align: 'center',
      },
      opacity: 1,
      evaporate: evap,
      isStrip: false,
    };
  }

  if (section === 'testimonial') {
    return {
      key: 'quoteMarks',
      spec: {
        id: 'testimonial-figure',
        descriptor: 'quotes:marks',
      },
      opacity: 1,
      evaporate: 0,
      isStrip: false,
    };
  }

  if (section === 'contact') {
    const stripWord = CONTACT_CONFIG[locale].marqueeWord;
    return {
      key: `wordSoheilStrip:${locale}`,
      spec: {
        id: 'cta-logo',
        descriptor: `strip:${stripWord}`,
        isRtl,
        align: 'center',
      },
      opacity: 1,
      evaporate: 0,
      isStrip: true,
    };
  }

  // Non-shape sections: particles softly relax into low-alpha floating background dust
  return {
    key: 'none',
    spec: null,
    opacity: 0,
    evaporate: 0,
    isStrip: false,
  };
}

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
    const rad = 110 + Math.sqrt(rand()) * 290;
    positions[i3] = Math.cos(angle) * rad;
    positions[i3 + 1] = Math.sin(angle) * rad * 0.78;
    positions[i3 + 2] = (rand() - 0.5) * 260;
    accents[i] = rand() < 0.14 ? 1 : 0;
    dustMask[i] = 1;
    shades[i] = 0.5;
  }

  return { positions, accents, dustMask, shades, width: 540, height: 420 };
}

function padTargetBuffer(buf: StoryTargetBuffer, targetCount: number): StoryTargetBuffer {
  const srcCount = buf.accents.length;
  if (srcCount === targetCount) return buf;
  const positions = new Float32Array(targetCount * 3);
  const accents = new Float32Array(targetCount);
  const dustMask = new Float32Array(targetCount);
  const shades = new Float32Array(targetCount);
  for (let i = 0; i < targetCount; i++) {
    const s = i % srcCount;
    const i3 = i * 3;
    const s3 = s * 3;
    positions[i3] = buf.positions[s3];
    positions[i3 + 1] = buf.positions[s3 + 1];
    positions[i3 + 2] = buf.positions[s3 + 2];
    accents[i] = buf.accents[s];
    dustMask[i] = buf.dustMask[s];
    shades[i] = buf.shades[s];
  }
  return {
    positions,
    accents,
    dustMask,
    shades,
    width: buf.width,
    height: buf.height,
    stripSpan: buf.stripSpan,
  };
}

function resolveDebugSpec(shapeKey: SiteParticleShapeId, locale: Locale): LocalSlotSpec {
  const isRtl = locale === 'fa';
  if (shapeKey === 'heroPortrait') {
    return { id: 'debug-slot', descriptor: 'image:portrait' };
  }
  if (shapeKey === 'wordInvisible') {
    return {
      id: 'debug-slot',
      descriptor: `statement:${STATEMENT_COPY[locale].particleWord}`,
      isRtl,
      align: 'center',
    };
  }
  if (shapeKey === 'quoteMarks') {
    return { id: 'debug-slot', descriptor: 'quotes:marks' };
  }
  return {
    id: 'debug-slot',
    descriptor: `strip:${CONTACT_CONFIG[locale].marqueeWord}`,
    isRtl,
    align: 'center',
  };
}

export interface SiteParticleStageProps {
  debugShapes?: boolean;
  onExitDebug?: () => void;
  heroEntered?: boolean;
}

export default function SiteParticleStage({
  debugShapes = false,
  onExitDebug,
  heroEntered = true,
}: SiteParticleStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const guiVisible = useScrollStore((s) => s.guiVisible);
  const fps = useScrollStore((s) => s.fps);
  const telemetry = useScrollStore((s) => s.telemetry);
  const freezeSimulation = useScrollStore((s) => s.params.freezeSimulation);
  const locale = useScrollStore((s) => s.locale);
  const setLocale = useScrollStore((s) => s.setLocale);
  const [fallbackStatic, setFallbackStatic] = useState(false);

  const heroEnteredRef = useRef(heroEntered);
  useEffect(() => {
    heroEnteredRef.current = heroEntered;
  }, [heroEntered]);

  // ?debug=shapes interactive state
  const [debugIdx, setDebugIdx] = useState(0);
  const [debugDark, setDebugDark] = useState(HERO_PORTRAIT_CONFIG.theme === 'dark');
  const debugStateRef = useRef({ idx: 0, dark: HERO_PORTRAIT_CONFIG.theme === 'dark', locale });

  useEffect(() => {
    debugStateRef.current = { idx: debugIdx, dark: debugDark, locale };
  }, [debugIdx, debugDark, locale]);

  useEffect(() => {
    if (!debugShapes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setDebugIdx((i) => (i + 1) % SITE_DEBUG_SHAPES.length);
      } else if (e.key === 'ArrowLeft') {
        setDebugIdx((i) => (i - 1 + SITE_DEBUG_SHAPES.length) % SITE_DEBUG_SHAPES.length);
      } else if (e.key === 'Escape' && onExitDebug) {
        onExitDebug();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [debugShapes, onExitDebug]);

  // Optional lil-gui inspector toggled with 'D' or DockBar </> Code button
  useEffect(() => {
    if (!guiVisible) return;
    let guiInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    const mountGui = async () => {
      try {
        const mod = await import('lil-gui');
        if (cancelled) return;
        const GUI = mod.default;
        const gui = new GUI({ title: 'SiteParticleStage', width: 256 });
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
          .add(proxy, 'lerp', 0.03, 0.14, 0.005)
          .name('Scroll lerp')
          .onChange((v: number) => update('lerp', v));
      } catch {
        // ignore dynamic import errors
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
    if (reduced && !debugShapes) {
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

    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
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

    // 1. SINGLE GLOBAL MORPH BUFFER GEOMETRY (135k Hero / 70k sections desktop; 40k/25k mobile)
    const morphCount = isSoftwareGl
      ? HERO_PORTRAIT_CONFIG.softwareGlCount
      : isMobile
        ? HERO_PORTRAIT_CONFIG.mobileParticleCount
        : HERO_PORTRAIT_CONFIG.particleCount;
    const nonHeroCount = isSoftwareGl
      ? SITE_PARTICLE_CONFIG.softwareGlCount
      : isMobile
        ? SITE_PARTICLE_CONFIG.mobileCount
        : SITE_PARTICLE_CONFIG.desktopCount;
    const trophyCount = isSoftwareGl ? 6500 : isMobile ? 7500 : 16500;

    const cloudBuffer = createOpenCloudBuffer(morphCount);
    const posFromArr = new Float32Array(cloudBuffer.positions);
    const posToArr = new Float32Array(cloudBuffer.positions);
    const accentFromArr = new Float32Array(cloudBuffer.accents);
    const accentToArr = new Float32Array(cloudBuffer.accents);
    const dustFromArr = new Float32Array(cloudBuffer.dustMask);
    const dustToArr = new Float32Array(cloudBuffer.dustMask);
    const shadeFromArr = new Float32Array(cloudBuffer.shades);
    const shadeToArr = new Float32Array(cloudBuffer.shades);

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
      aDelay[i] = nextRand() * SITE_PARTICLE_CONFIG.maxDelay;
    }

    const posFromAttr = new THREE.BufferAttribute(posFromArr, 3);
    const posToAttr = new THREE.BufferAttribute(posToArr, 3);
    const accentFromAttr = new THREE.BufferAttribute(accentFromArr, 1);
    const accentToAttr = new THREE.BufferAttribute(accentToArr, 1);
    const dustFromAttr = new THREE.BufferAttribute(dustFromArr, 1);
    const dustToAttr = new THREE.BufferAttribute(dustToArr, 1);
    const shadeFromAttr = new THREE.BufferAttribute(shadeFromArr, 1);
    const shadeToAttr = new THREE.BufferAttribute(shadeToArr, 1);

    const morphGeo = new THREE.BufferGeometry();
    morphGeo.setAttribute('position', posFromAttr);
    morphGeo.setAttribute('aPosTo', posToAttr);
    morphGeo.setAttribute('aAccentFrom', accentFromAttr);
    morphGeo.setAttribute('aAccentTo', accentToAttr);
    morphGeo.setAttribute('aDustFrom', dustFromAttr);
    morphGeo.setAttribute('aDustTo', dustToAttr);
    morphGeo.setAttribute('aShadeFrom', shadeFromAttr);
    morphGeo.setAttribute('aShadeTo', shadeToAttr);
    morphGeo.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 4));
    morphGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
    morphGeo.setDrawRange(0, morphCount);

    const morphMat = new THREE.ShaderMaterial({
      vertexShader: SITE_STAGE_VERT,
      fragmentShader: SITE_STAGE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 1 },
        uPixelRatio: { value: dpr },
        uSize: {
          value: isMobile
            ? SITE_PARTICLE_CONFIG.pointSizeMobile
            : SITE_PARTICLE_CONFIG.pointSizeDesktop,
        },
        uPointMin: { value: SITE_PARTICLE_CONFIG.pointMinPx },
        uPointMax: { value: SITE_PARTICLE_CONFIG.pointMaxPx },
        uAlphaMin: { value: SITE_PARTICLE_CONFIG.alphaMin },
        uAlphaMax: { value: SITE_PARTICLE_CONFIG.alphaMax },
        uDustAlpha: { value: SITE_PARTICLE_CONFIG.dustAlpha },
        uBaseNoise: { value: 1.0 },
        uMorphNoise: { value: 70.0 },
        uReducedMotion: { value: reduced ? 1 : 0 },
        uDebugStatic: { value: debugShapes ? 1 : 0 },
        uOriginFrom: { value: new THREE.Vector2(0, 0) },
        uOriginTo: { value: new THREE.Vector2(0, 0) },
        uVisFrom: { value: 0 },
        uVisTo: { value: 0 },
        uSlotOpacity: { value: 1 },
        uTilt: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(width, height) },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0 },
        uMouseHold: { value: 0 },
        uMouseRadius: { value: 108.0 },
        uHoverAccentBoost: { value: 0.42 },
        uTheme: { value: HERO_PORTRAIT_CONFIG.theme === 'dark' ? 1 : 0 },
        uEvaporate: { value: 0 },
        uMicroMorph: { value: 0 },
        uStripMode: { value: 0 },
        uStripOffset: { value: 0 },
        uStripLen: { value: width * 1.95 },
        uUseShade: { value: 0 },
        uHeroBottomFade: { value: 0 },
        uHeroSlotHalfH: { value: height * 0.5 },
        uHeroGather: { value: reduced || debugShapes ? 1 : 0 },
        uHeroRevealActive: { value: 0 },
        uLightBase: { value: new THREE.Color('#111111') },
        uLightDim: { value: new THREE.Color('#5A5A62') },
        uDarkBase: { value: new THREE.Color('#D9D9D9') },
        uDarkDim: { value: new THREE.Color('#7A7A84') },
        uAccent: { value: new THREE.Color('#5B5BF0') },
        uBhActive: { value: 0 },
        uBhOrigin: { value: new THREE.Vector2(0, 0) },
        uBhRadius: { value: 0 },
        uBhMaxRadius: { value: 1600 },
        uBhProgress: { value: 0 },
        uBhOuterTheme: { value: 0 },
        uBhInnerTheme: { value: 1 },
        uBhVortex: { value: 0 },
        uBhAccent: { value: new THREE.Color('#5B5BF0') },
      },
    });

    const morphPoints = new THREE.Points(morphGeo, morphMat);
    morphPoints.frustumCulled = false;
    scene.add(morphPoints);

    // 2. AMBIENT FLOATING DUST LAYER (remains softly alive on non-shape sections)
    const dustCount = isSoftwareGl ? 650 : isMobile ? 750 : 1650;
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
        uReducedMotion: { value: reduced || debugShapes ? 1 : 0 },
        uTheme: { value: 0 },
        uDustBoost: { value: debugShapes ? 0 : 1 },
        uBhActive: { value: 0 },
        uBhOrigin: { value: new THREE.Vector2(0, 0) },
        uBhRadius: { value: 0 },
        uBhProgress: { value: 0 },
        uBhOuterTheme: { value: 0 },
        uBhInnerTheme: { value: 1 },
        uBhVortex: { value: 0 },
        uBhAccent: { value: new THREE.Color('#5B5BF0') },
      },
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.frustumCulled = false;
    scene.add(dustPoints);

    // 2B. EVENT-HORIZON ACCRETION PARTICLE RING (#5B5BF0)
    const ringCount = isSoftwareGl ? 500 : isMobile ? 420 : 1200;
    const ringPos = new Float32Array(ringCount * 3);
    const ringAttrArr = new Float32Array(ringCount * 4);
    for (let i = 0; i < ringCount; i++) {
      ringPos[i * 3] = 0;
      ringPos[i * 3 + 1] = 0;
      ringPos[i * 3 + 2] = 0;
      ringAttrArr[i * 4] = (i / ringCount) * Math.PI * 2 + (nextRand() - 0.5) * 0.08;
      ringAttrArr[i * 4 + 1] = (nextRand() * 2 - 1);
      ringAttrArr[i * 4 + 2] = nextRand();
      ringAttrArr[i * 4 + 3] = nextRand();
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    ringGeo.setAttribute('aRing', new THREE.BufferAttribute(ringAttrArr, 4));

    const ringMat = new THREE.ShaderMaterial({
      vertexShader: BH_RING_VERT,
      fragmentShader: BH_RING_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uBhActive: { value: 0 },
        uBhOrigin: { value: new THREE.Vector2(0, 0) },
        uBhRadius: { value: 0 },
        uBhMaxRadius: { value: 1600 },
        uBhProgress: { value: 0 },
        uBhInnerTheme: { value: 1 },
        uReducedMotion: { value: reduced || debugShapes ? 1 : 0 },
        uBhAccent: { value: new THREE.Color('#5B5BF0') },
      },
    });
    const ringPoints = new THREE.Points(ringGeo, ringMat);
    ringPoints.frustumCulled = false;
    scene.add(ringPoints);

    // 3. CONTINUOUS MORPH CONTROLLER + BUFFER CACHE
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
    let smoothEvaporate = 0;
    let desiredEvaporate = 0;
    let smoothTheme = HERO_PORTRAIT_CONFIG.theme === 'dark' ? 1 : 0;
    let smoothStripMode = 0;
    let desiredStripMode = 0;
    let smoothUseShade = 0;
    let smoothHeroBottom = 0;
    let smoothPointMin: number = SITE_PARTICLE_CONFIG.pointMinPx;
    let smoothPointMax: number = SITE_PARTICLE_CONFIG.pointMaxPx;
    let smoothPointSize: number = isMobile
      ? SITE_PARTICLE_CONFIG.pointSizeMobile
      : SITE_PARTICLE_CONFIG.pointSizeDesktop;
    let smoothAlphaMin: number = SITE_PARTICLE_CONFIG.alphaMin;
    let smoothAlphaMax: number = SITE_PARTICLE_CONFIG.alphaMax;
    let smoothMouseRadius = 108;
    let smoothHoverBoost = 0.42;
    let smoothDrawCount: number = morphCount;
    let heroGatherElapsed = 0;
    let heroGatherDone = reduced || debugShapes;
    let heroSlotHalfH = height * 0.5;
    let smoothHeroRevealActive = 0;
    let activeStripLen = width * 1.95;
    let stripOffset = 0;
    let microMorph = 0;
    let lastQuoteTrigger = useScrollStore.getState().quoteMorphTrigger;
    let buildToken = 0;
    let layoutDirty = false;

    const lastFromOrigin = new THREE.Vector2(0, 0);
    const lastToOrigin = new THREE.Vector2(0, 0);

    const toWebgl = (cx: number, cy: number) => ({
      x: cx - width * 0.5,
      y: -(cy - height * 0.5),
    });

    let activeBakeLimit: number = morphCount;

    const bakeCurrentToFrom = (limit: number) => {
      const p = morphProgress;
      const n = Math.min(morphCount, Math.max(1, limit));
      for (let i = 0; i < n; i++) {
        const delay = aDelay[i];
        const localP = Math.max(0, Math.min(1, (p - delay) / Math.max(0.001, 1 - delay)));
        const e = localP * localP * (3 - 2 * localP);
        const i3 = i * 3;
        posFromArr[i3] = posFromArr[i3] + (posToArr[i3] - posFromArr[i3]) * e;
        posFromArr[i3 + 1] = posFromArr[i3 + 1] + (posToArr[i3 + 1] - posFromArr[i3 + 1]) * e;
        posFromArr[i3 + 2] = posFromArr[i3 + 2] + (posToArr[i3 + 2] - posFromArr[i3 + 2]) * e;
        accentFromArr[i] = accentFromArr[i] + (accentToArr[i] - accentFromArr[i]) * e;
        dustFromArr[i] = dustFromArr[i] + (dustToArr[i] - dustFromArr[i]) * e;
        shadeFromArr[i] = shadeFromArr[i] + (shadeToArr[i] - shadeFromArr[i]) * e;
      }
      posFromAttr.needsUpdate = true;
      accentFromAttr.needsUpdate = true;
      dustFromAttr.needsUpdate = true;
      shadeFromAttr.needsUpdate = true;

      const avgE = p * p * (3 - 2 * p);
      visFrom = visFrom + (visTo - visFrom) * avgE;
      lastFromOrigin.lerp(lastToOrigin, avgE);
      fromSlotId = avgE > 0.5 ? toSlotId : fromSlotId;
    };

    const setCachedBuffer = (key: string, buf: StoryTargetBuffer) => {
      if (bufferCache.has(key)) {
        bufferCache.delete(key);
      } else if (bufferCache.size >= 14) {
        const oldest = bufferCache.keys().next().value;
        if (oldest !== undefined) bufferCache.delete(oldest);
      }
      bufferCache.set(key, buf);
    };

    const applyNextTarget = (
      rawBuf: StoryTargetBuffer,
      nextSlotId: string | null,
      nextVisible: boolean,
      instant = false,
      targetLimit: number = morphCount
    ) => {
      const nextBuf = padTargetBuffer(rawBuf, morphCount);
      const copyLimit = Math.min(morphCount, Math.max(activeBakeLimit, targetLimit));
      if (instant) {
        posFromArr.set(nextBuf.positions);
        posToArr.set(nextBuf.positions);
        accentFromArr.set(nextBuf.accents);
        accentToArr.set(nextBuf.accents);
        dustFromArr.set(nextBuf.dustMask);
        dustToArr.set(nextBuf.dustMask);
        shadeFromArr.set(nextBuf.shades);
        shadeToArr.set(nextBuf.shades);
        posFromAttr.needsUpdate = true;
        posToAttr.needsUpdate = true;
        accentFromAttr.needsUpdate = true;
        accentToAttr.needsUpdate = true;
        dustFromAttr.needsUpdate = true;
        dustToAttr.needsUpdate = true;
        shadeFromAttr.needsUpdate = true;
        shadeToAttr.needsUpdate = true;
        fromSlotId = nextSlotId;
        toSlotId = nextSlotId;
        visFrom = nextVisible ? 1 : 0;
        visTo = nextVisible ? 1 : 0;
        lastFromOrigin.set(0, 0);
        lastToOrigin.set(0, 0);
        morphProgress = 1;
        activeBakeLimit = targetLimit;
        if (nextBuf.stripSpan) activeStripLen = nextBuf.stripSpan;
        return;
      }

      bakeCurrentToFrom(copyLimit);
      activeBakeLimit = targetLimit;

      posToArr.set(nextBuf.positions);
      accentToArr.set(nextBuf.accents);
      dustToArr.set(nextBuf.dustMask);
      shadeToArr.set(nextBuf.shades);
      posToAttr.needsUpdate = true;
      accentToAttr.needsUpdate = true;
      dustToAttr.needsUpdate = true;
      shadeToAttr.needsUpdate = true;

      if (nextBuf.stripSpan) {
        activeStripLen = nextBuf.stripSpan;
      }

      toSlotId = nextSlotId;
      visTo = nextVisible ? 1 : 0;

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

      if (!nextVisible && fromSlotId) {
        lastToOrigin.copy(lastFromOrigin);
        toSlotId = fromSlotId;
      }

      morphProgress = 0;
      morphElapsedSec = 0;
    };

    // Lazy background pre-warmer for the next adjacent diagram/emblem (0ms scroll transitions)
    let prewarmTimer = 0;
    const schedulePrewarmNext = (resolvedKey: string, localeNow: Locale) => {
      window.clearTimeout(prewarmTimer);
      let nextKey: string | null = null;
      let nextSpec: LocalSlotSpec | null = null;
      let nextCount: number = nonHeroCount;
      const isMobileNow = width < 768;
      let nextW = isMobileNow ? Math.min(width * 0.65, 220) : 460;
      let nextH = isMobileNow ? Math.min(height * 0.24, 170) : 420;
      if (resolvedKey === 'hero-portrait') {
        nextKey = 'about-trophy';
        nextSpec = { id: 'about-trophy', descriptor: 'svg:trophy' };
        nextCount = trophyCount;
        nextW = isMobileNow ? 96 : 132;
        nextH = isMobileNow ? 96 : 132;
      } else if (resolvedKey === 'about-trophy') {
        const firstTab = CONTENT[localeNow].whatido.tabs[0];
        if (firstTab) {
          nextKey = `whatido:${firstTab.id}`;
          nextSpec = { id: 'whatido-diagram', descriptor: `svg:${firstTab.id}`, drawProgress: 1 };
        }
      } else if (resolvedKey.startsWith('whatido:')) {
        const tabs = CONTENT[localeNow].whatido.tabs;
        const curId = resolvedKey.slice('whatido:'.length);
        const curIdx = tabs.findIndex((tb) => tb.id === curId);
        if (curIdx >= 0 && curIdx + 1 < tabs.length) {
          const nextTab = tabs[curIdx + 1];
          nextKey = `whatido:${nextTab.id}`;
          nextSpec = { id: 'whatido-diagram', descriptor: `svg:${nextTab.id}`, drawProgress: 1 };
        }
      } else if (resolvedKey.startsWith('process:')) {
        const curIdx = parseInt(resolvedKey.slice('process:'.length), 10) || 0;
        if (curIdx + 1 < 6) {
          nextKey = `process:${curIdx + 1}`;
          nextSpec = { id: 'process-stage', descriptor: `process:${curIdx + 1}` };
        }
      }
      if (!nextKey || !nextSpec || bufferCache.has(nextKey)) return;
      const keyToWarm = nextKey;
      const specToWarm = nextSpec;
      const countToWarm = nextCount;
      const warmW = nextW;
      const warmH = nextH;
      prewarmTimer = window.setTimeout(() => {
        if (disposed || bufferCache.has(keyToWarm)) return;
        void particleRegistry
          .buildStoryTargetBuffer(specToWarm, countToWarm, warmW, warmH)
          .then((buf) => {
            if (!buf || disposed) return;
            setCachedBuffer(keyToWarm, padTargetBuffer(buf, morphCount));
          });
      }, 90);
    };

    const requestSlotMorph = (resolved: ResolvedSlot, localeNow: Locale) => {
      currentKey = resolved.key;

      if (!resolved.spec) {
        buildToken++;
        applyNextTarget(cloudBuffer, null, false, false, nonHeroCount);
        return;
      }

      const isHeroPortrait = resolved.spec.descriptor === 'image:portrait';
      const isTrophySlot = resolved.key === 'about-trophy';
      const targetSampleCount = isHeroPortrait
        ? morphCount
        : isTrophySlot
          ? trophyCount
          : nonHeroCount;

      const cached = bufferCache.get(resolved.key);
      if (cached) {
        applyNextTarget(cached, resolved.spec.id, true, false, targetSampleCount);
        schedulePrewarmNext(resolved.key, localeNow);
        return;
      }

      const token = ++buildToken;
      const spec = resolved.spec;
      const isMobileNow = width < 768;
      const fallbackW = isHeroPortrait
        ? Math.min(width * (isMobileNow ? 0.78 : 0.5), 680)
        : isTrophySlot
          ? isMobileNow
            ? 96
            : 132
          : isMobileNow
            ? Math.min(width * 0.65, 220)
            : 460;
      const fallbackH = isHeroPortrait
        ? isMobileNow
          ? Math.min(height * 0.42, 340)
          : Math.max(height, 720)
        : isTrophySlot
          ? isMobileNow
            ? 96
            : 132
          : isMobileNow
            ? Math.min(height * 0.24, 170)
            : 420;
      void particleRegistry
        .buildStoryTargetBuffer(spec, targetSampleCount, fallbackW, fallbackH)
        .then((buf) => {
          if (!buf || disposed || token !== buildToken) return;
          const padded = padTargetBuffer(buf, morphCount);
          setCachedBuffer(resolved.key, padded);
          const isInitialHero = isHeroPortrait && !heroGatherDone && visFrom < 0.05;
          applyNextTarget(padded, spec.id, true, isInitialHero, targetSampleCount);
          if (isInitialHero && spec.id) {
            const scrollPos = useScrollStore.getState().scroll.pos;
            const rect = particleRegistry.getLiveScreenRect(spec.id, scrollPos, height);
            if (rect) {
              const wOrigin = toWebgl(rect.centerX, rect.centerY);
              lastFromOrigin.set(wOrigin.x, wOrigin.y);
              lastToOrigin.set(wOrigin.x, wOrigin.y);
              heroSlotHalfH = rect.height * 0.5;
            }
          }
          schedulePrewarmNext(resolved.key, localeNow);
        });
    };

    const unsubRegistry = particleRegistry.subscribe(() => {
      bufferCache.clear();
      layoutDirty = true;
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
      const p = toWebgl(e.clientX, e.clientY);
      mouseTarget.set(p.x, p.y);
      mouseActive = 1;
      mouseHold = 1;
      useScrollStore.getState().setCursorMagnetHold(true);
    };
    const onPointerUp = (e: PointerEvent) => {
      mouseHold = 0;
      if (e.pointerType !== 'mouse') {
        mouseActive = 0;
        tiltTarget.set(0, 0);
      }
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
      const nextDpr = isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      renderer.setPixelRatio(nextDpr);
      morphMat.uniforms.uPixelRatio.value = nextDpr;
      morphMat.uniforms.uResolution.value.set(width, height);
      dustMat.uniforms.uPixelRatio.value = nextDpr;
      dustMat.uniforms.uResolution.value.set(width, height);
      ringMat.uniforms.uPixelRatio.value = nextDpr;
      bufferCache.clear();
      layoutDirty = true;
    };

    let tabVisible = !document.hidden;
    const onVis = () => {
      tabVisible = !document.hidden;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerLeave, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
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
      const { scroll, params } = st;

      fpsFrames++;
      const now = performance.now();
      if (now - fpsStart >= 1000) {
        st.setFps(Math.round((fpsFrames * 1000) / (now - fpsStart)));
        fpsFrames = 0;
        fpsStart = now;
      }

      if (debugShapes) {
        const dbgState = debugStateRef.current;
        const shapeMeta = SITE_DEBUG_SHAPES[dbgState.idx];
        const debugKey = `debug:${shapeMeta.id}:${dbgState.locale}`;
        const dbgIsHero = shapeMeta.id === 'heroPortrait';
        if (debugKey !== currentKey || layoutDirty) {
          layoutDirty = false;
          currentKey = debugKey;
          const spec = resolveDebugSpec(shapeMeta.id, dbgState.locale);
          const boxW = dbgIsHero ? Math.min(width * 0.46, 540) : Math.min(width * 0.84, 1180);
          const boxH = dbgIsHero ? Math.min(height * 0.78, 700) : shapeMeta.id === 'quoteMarks' ? Math.min(height * 0.56, 480) : Math.min(height * 0.36, 320);
          const token = ++buildToken;
          void particleRegistry
            .buildStoryTargetBuffer(spec, dbgIsHero ? morphCount : nonHeroCount, boxW, boxH)
            .then((buf) => {
              if (!buf || disposed || token !== buildToken) return;
              applyNextTarget(buf, null, true, true);
              morphGeo.setDrawRange(0, dbgIsHero ? morphCount : nonHeroCount);
            });
        }

        const mu = morphMat.uniforms;
        mu.uDebugStatic.value = 1;
        mu.uTime.value = 0;
        mu.uProgress.value = 1;
        mu.uBaseNoise.value = 0;
        mu.uOriginFrom.value.set(0, 0);
        mu.uOriginTo.value.set(0, 0);
        mu.uVisFrom.value = 1;
        mu.uVisTo.value = 1;
        mu.uSlotOpacity.value = 1;
        mu.uEvaporate.value = 0;
        mu.uMicroMorph.value = 0;
        mu.uStripMode.value = 0;
        mu.uTheme.value = dbgState.dark ? 1 : 0;
        mu.uUseShade.value = dbgIsHero ? 1 : 0;
        mu.uHeroBottomFade.value = 0;
        mu.uHeroGather.value = 1;
        mu.uHeroRevealActive.value = 0;
        mu.uPointMin.value = dbgIsHero ? HERO_PORTRAIT_CONFIG.pointMinPx : SITE_PARTICLE_CONFIG.pointMinPx;
        mu.uPointMax.value = dbgIsHero ? HERO_PORTRAIT_CONFIG.pointMaxPx : SITE_PARTICLE_CONFIG.pointMaxPx;
        mu.uAlphaMin.value = dbgIsHero ? HERO_PORTRAIT_CONFIG.alphaMin : SITE_PARTICLE_CONFIG.alphaMin;
        mu.uAlphaMax.value = dbgIsHero ? HERO_PORTRAIT_CONFIG.alphaMax : SITE_PARTICLE_CONFIG.alphaMax;

        renderer.render(scene, camera);
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
        return;
      }

      // Normal continuous Site scroll mode
      const { singularity } = st;
      let resolved: ResolvedSlot;
      if (singularity.active && singularity.fromSection && singularity.toSection) {
        // Swallow outgoing shape as event horizon opens, then rebirth into incoming section shape
        const useIncoming = singularity.progress >= 0.22;
        const targetSec = useIncoming ? singularity.toSection : singularity.fromSection;
        const targetP = useIncoming ? 0.02 : 0.96;
        resolved = resolveActiveSiteSlot(targetSec, targetP, st.locale, false);
        // Never evaporate Statement out before the White Hole swallows it into Quote Marks
        if (singularity.fromSection === 'statement' && !useIncoming) {
          resolved = { ...resolved, evaporate: 0 };
        }
      } else {
        const secP = st.sectionProgress[st.activeSection] ?? 0;
        resolved = resolveActiveSiteSlot(
          st.activeSection,
          secP,
          st.locale,
          st.heroPortraitHovered
        );
      }
      const secP = st.sectionProgress[st.activeSection] ?? 0;

      if (resolved.key !== currentKey || layoutDirty) {
        layoutDirty = false;
        requestSlotMorph(resolved, st.locale);
      }

      desiredOpacity = resolved.spec ? resolved.opacity : 1;
      desiredEvaporate = resolved.evaporate;
      desiredStripMode = resolved.isStrip ? 1 : 0;

      // Trigger micro-morph scatter/re-form whenever Client Notes switches quote
      if (st.quoteMorphTrigger !== lastQuoteTrigger) {
        lastQuoteTrigger = st.quoteMorphTrigger;
        if (st.activeSection === 'testimonial') {
          microMorph = 0.001;
        }
      }
      if (microMorph > 0) {
        microMorph = Math.min(1, microMorph + dt * 1.45);
        if (microMorph >= 1) microMorph = 0;
      }

      // Advance damped morph with velocity cap (<= 1.25/sec)
      if (!params.freezeSimulation && morphProgress < 1) {
        const durSec = Math.max(0.58, params.assembleDurationMs / 1000);
        const maxRate = Math.min(SITE_PARTICLE_CONFIG.maxMorphRatePerSec, 1.1 / durSec);
        const damped = THREE.MathUtils.damp(morphProgress, 1, 3.6 / durSec, dt);
        const step = Math.min(damped - morphProgress, maxRate * dt);
        morphProgress = Math.min(1, morphProgress + Math.max(step, dt / (durSec * 1.35)));
        morphElapsedSec += dt;
        if (morphProgress > 0.998) morphProgress = 1;
      }

      // Resolve live Lenis-locked screen origins
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
          if (toSlotId === 'hero-portrait') {
            heroSlotHalfH = rTo.height * 0.5;
          }
        }
      }

      // Mode-specific particle physics & styling (Hero 135k / About Trophy 16.5k / What I Do + Process thick tubes / Global 70k)
      const isHeroMode = resolved.key === 'hero-portrait' || resolved.key === 'intro-portrait';
      const isTrophyMode = resolved.key === 'about-trophy';
      const isDiagramTubeMode =
        resolved.key.startsWith('whatido:') || resolved.key.startsWith('process:');

      const targetDrawCount = isHeroMode
        ? morphCount
        : isTrophyMode
          ? trophyCount
          : nonHeroCount;
      const targetUseShade = isHeroMode ? 1 : 0;
      const targetHeroBottom = resolved.key === 'hero-portrait' ? 1 : 0;
      const targetPointMin = isHeroMode
        ? HERO_PORTRAIT_CONFIG.pointMinPx
        : isTrophyMode
          ? 1.05
          : isDiagramTubeMode
            ? WHAT_I_DO_PARTICLE_CONFIG.pointMinPx
            : SITE_PARTICLE_CONFIG.pointMinPx;
      const targetPointMax = isHeroMode
        ? HERO_PORTRAIT_CONFIG.pointMaxPx
        : isTrophyMode
          ? 1.85
          : isDiagramTubeMode
            ? WHAT_I_DO_PARTICLE_CONFIG.pointMaxPx
            : SITE_PARTICLE_CONFIG.pointMaxPx;
      const targetPointSize = isHeroMode
        ? isMobile
          ? 2.0
          : 2.15
        : isTrophyMode
          ? isMobile
            ? 1.25
            : 1.42
          : isDiagramTubeMode
            ? isMobile
              ? 1.95
              : 2.05
            : isMobile
              ? SITE_PARTICLE_CONFIG.pointSizeMobile
              : SITE_PARTICLE_CONFIG.pointSizeDesktop;
      const targetAlphaMin = isHeroMode
        ? HERO_PORTRAIT_CONFIG.alphaMin
        : isTrophyMode
          ? 0.56
          : isDiagramTubeMode
            ? WHAT_I_DO_PARTICLE_CONFIG.alphaMin
            : SITE_PARTICLE_CONFIG.alphaMin;
      const targetAlphaMax = isHeroMode
        ? HERO_PORTRAIT_CONFIG.alphaMax
        : isTrophyMode
          ? 0.92
          : isDiagramTubeMode
            ? WHAT_I_DO_PARTICLE_CONFIG.alphaMax
            : SITE_PARTICLE_CONFIG.alphaMax;
      const targetMouseRadius = isHeroMode
        ? isMobile
          ? HERO_PORTRAIT_CONFIG.revealLensRadiusMobilePx
          : HERO_PORTRAIT_CONFIG.revealLensRadiusPx
        : isTrophyMode
          ? 74
          : isDiagramTubeMode
            ? 115
            : 108;
      // ZERO artificial blue hover aura on Hero portrait
      const targetHoverBoost = isHeroMode ? 0 : 0.42;

      // Determine whether cursor is actively inside Hero portrait slot for localized photo reveal
      let targetHeroReveal = 0;
      if (resolved.key === 'hero-portrait' && heroGatherDone && mouseActive > 0.5 && secP < 0.56) {
        const heroRect = particleRegistry.getLiveScreenRect('hero-portrait', scroll.pos, height);
        if (heroRect) {
          const mxScreen = mouseTarget.x + width * 0.5;
          const myScreen = height * 0.5 - mouseTarget.y;
          const margin = 28;
          const halfW = heroRect.width * 0.5 + margin;
          const halfH = heroRect.height * 0.5 + margin;
          if (
            Math.abs(mxScreen - heroRect.centerX) <= halfW &&
            Math.abs(myScreen - heroRect.centerY) <= halfH
          ) {
            targetHeroReveal = 1;
          }
        }
      }

      // Advance initial 2.2s Hero particle assembly once Gateway exits
      if (!heroGatherDone && heroEnteredRef.current) {
        if (isHeroMode) {
          heroGatherElapsed += dt;
          if (heroGatherElapsed >= HERO_PORTRAIT_CONFIG.enterAssembleSec) {
            heroGatherDone = true;
          }
        } else {
          heroGatherDone = true;
        }
      }
      const heroGatherVal = heroGatherDone
        ? 1
        : Math.min(1, heroGatherElapsed / Math.max(0.1, HERO_PORTRAIT_CONFIG.enterAssembleSec));

      // Smoothly damp opacity, evaporation, strip mode, and per-mode style uniforms
      // Note: theme swaps razor-sharply on the circle edge (zero separate color transition lag!)
      smoothOpacity = THREE.MathUtils.damp(smoothOpacity, desiredOpacity, 8.5, dt);
      smoothEvaporate = THREE.MathUtils.damp(smoothEvaporate, desiredEvaporate, 10, dt);
      smoothStripMode = THREE.MathUtils.damp(smoothStripMode, desiredStripMode, 6.5, dt);
      smoothTheme = st.theme === 'dark' ? 1 : 0;
      smoothUseShade = THREE.MathUtils.damp(smoothUseShade, targetUseShade, 7, dt);
      smoothHeroBottom = THREE.MathUtils.damp(smoothHeroBottom, targetHeroBottom, 7, dt);
      smoothPointMin = THREE.MathUtils.damp(smoothPointMin, targetPointMin, 8, dt);
      smoothPointMax = THREE.MathUtils.damp(smoothPointMax, targetPointMax, 8, dt);
      smoothPointSize = THREE.MathUtils.damp(smoothPointSize, targetPointSize, 8, dt);
      smoothAlphaMin = THREE.MathUtils.damp(smoothAlphaMin, targetAlphaMin, 8, dt);
      smoothAlphaMax = THREE.MathUtils.damp(smoothAlphaMax, targetAlphaMax, 8, dt);
      smoothMouseRadius = THREE.MathUtils.damp(smoothMouseRadius, targetMouseRadius, 8, dt);
      smoothHoverBoost = THREE.MathUtils.damp(smoothHoverBoost, targetHoverBoost, 8, dt);
      smoothDrawCount = THREE.MathUtils.damp(smoothDrawCount, targetDrawCount, 6, dt);
      const activeDrawCount = Math.max(1, Math.min(morphCount, Math.round(smoothDrawCount)));
      morphGeo.setDrawRange(0, activeDrawCount);

      // Infinite horizontal Contact strip offset: base speed + scroll velocity sign & boost
      if (smoothStripMode > 0.01 && !params.freezeSimulation) {
        const scrollSign = scroll.velocity < -0.5 ? -1 : 1;
        const speed =
          SITE_PARTICLE_CONFIG.stripBaseSpeedPx * scrollSign +
          scroll.velocity * SITE_PARTICLE_CONFIG.stripScrollVelocityMultiplier;
        stripOffset += speed * dt;
        // Keep offset bounded cleanly to avoid float precision drift
        if (activeStripLen > 10) {
          stripOffset = ((stripOffset % activeStripLen) + activeStripLen) % activeStripLen;
        }
      }

      mouseCurrent.lerp(mouseTarget, 1 - Math.exp(-12 * dt));
      tiltCurrent.lerp(tiltTarget, 1 - Math.exp(-6 * dt));

      const bhOriginW = toWebgl(singularity.originX, singularity.originY);
      const bhActiveNum = singularity.active ? 1 : 0;
      const bhOuterNum = singularity.outerTheme === 'dark' ? 1 : 0;
      const bhInnerNum = singularity.innerTheme === 'dark' ? 1 : 0;

      const mu = morphMat.uniforms;
      mu.uDebugStatic.value = 0;
      mu.uTime.value = params.freezeSimulation ? 0 : elapsed;
      mu.uProgress.value = morphProgress;
      mu.uSize.value = smoothPointSize;
      mu.uPointMin.value = smoothPointMin;
      mu.uPointMax.value = smoothPointMax;
      mu.uAlphaMin.value = smoothAlphaMin;
      mu.uAlphaMax.value = smoothAlphaMax;
      const heroScrollWake =
        resolved.key === 'hero-portrait' && secP > 0.62
          ? ((secP - 0.62) / 0.38) * 5.0
          : 0;
      mu.uBaseNoise.value = params.freezeSimulation
        ? 0
        : isHeroMode
          ? 0.55 + heroScrollWake
          : isTrophyMode
            ? 0.36
            : Math.min(1.4, params.microVibAmp * 3.8);
      mu.uOriginFrom.value.copy(lastFromOrigin);
      mu.uOriginTo.value.copy(lastToOrigin);
      mu.uVisFrom.value = visFrom;
      mu.uVisTo.value = visTo;
      mu.uSlotOpacity.value = smoothOpacity;
      mu.uTilt.value.copy(tiltCurrent);
      mu.uMouse.value.copy(mouseCurrent);
      mu.uMouseActive.value = mouseActive;
      mu.uMouseHold.value = mouseHold;
      mu.uMouseRadius.value = smoothMouseRadius;
      mu.uHoverAccentBoost.value = smoothHoverBoost;
      mu.uTheme.value = smoothTheme;
      mu.uEvaporate.value = smoothEvaporate;
      mu.uMicroMorph.value = microMorph;
      mu.uStripMode.value = smoothStripMode;
      mu.uStripOffset.value = stripOffset;
      mu.uStripLen.value = activeStripLen;
      mu.uUseShade.value = smoothUseShade;
      smoothHeroRevealActive = THREE.MathUtils.damp(
        smoothHeroRevealActive,
        targetHeroReveal,
        10,
        dt
      );
      mu.uHeroBottomFade.value = smoothHeroBottom;
      mu.uHeroSlotHalfH.value = heroSlotHalfH;
      mu.uHeroGather.value = heroGatherVal;
      mu.uHeroRevealActive.value = smoothHeroRevealActive;
      mu.uBhActive.value = bhActiveNum;
      mu.uBhOrigin.value.set(bhOriginW.x, bhOriginW.y);
      mu.uBhRadius.value = singularity.radius;
      mu.uBhMaxRadius.value = singularity.maxRadius;
      mu.uBhProgress.value = singularity.progress;
      mu.uBhOuterTheme.value = bhOuterNum;
      mu.uBhInnerTheme.value = bhInnerNum;
      mu.uBhVortex.value = singularity.vortexStrength;
      mu.uBhAccent.value.set(singularity.accentColor);

      const du = dustMat.uniforms;
      du.uTime.value = params.freezeSimulation ? 0 : elapsed;
      du.uScrollPos.value = scroll.pos;
      du.uMouse.value.copy(mouseCurrent);
      du.uMouseActive.value = mouseActive;
      du.uTheme.value = smoothTheme;
      du.uDustBoost.value = resolved.spec ? 0.92 : 1.25;
      du.uBhActive.value = bhActiveNum;
      du.uBhOrigin.value.set(bhOriginW.x, bhOriginW.y);
      du.uBhRadius.value = singularity.radius;
      du.uBhProgress.value = singularity.progress;
      du.uBhOuterTheme.value = bhOuterNum;
      du.uBhInnerTheme.value = bhInnerNum;
      du.uBhVortex.value = singularity.vortexStrength;
      du.uBhAccent.value.set(singularity.accentColor);

      const ru = ringMat.uniforms;
      ru.uTime.value = params.freezeSimulation ? 0 : elapsed;
      ru.uBhActive.value = bhActiveNum;
      ru.uBhOrigin.value.set(bhOriginW.x, bhOriginW.y);
      ru.uBhRadius.value = singularity.radius;
      ru.uBhMaxRadius.value = singularity.maxRadius;
      ru.uBhProgress.value = singularity.progress;
      ru.uBhInnerTheme.value = bhInnerNum;
      ru.uReducedMotion.value = singularity.reducedMotion ? 1 : 0;
      ru.uBhAccent.value.set(singularity.accentColor);

      telemetryTimer += dt;
      if (telemetryTimer >= 0.14) {
        telemetryTimer = 0;
        const settledPct = Math.round(morphProgress * 100);
        const moving = morphProgress < 0.99 ? Math.round(activeDrawCount * (1 - morphProgress)) : 0;
        st.setTelemetry({
          settledPct,
          avgVelPxSec: moving > 0 ? Math.round((1 - morphProgress) * 140) : 0,
          freeCount: dustCount + moving,
          morphCount: activeDrawCount,
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

      // Pause WebGL drawing while transitioning between tabs or occluded behind opaque Selected Work canvas
      const occludedByWork =
        st.tabTransition.active ||
        (st.activeSection === 'work' &&
          !resolved.spec &&
          visFrom < 0.02 &&
          visTo < 0.02);

      if (!occludedByWork) {
        renderer.render(scene, camera);
      }

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
      window.clearTimeout(prewarmTimer);
      unsubRegistry();
      bufferCache.clear();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerLeave);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      morphGeo.dispose();
      morphMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.width = 1;
      renderer.domElement.height = 1;
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [debugShapes]);

  if (fallbackStatic && !debugShapes) {
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
      {debugShapes && (
        <div
          className={`fixed inset-0 z-[55] transition-colors duration-300 ${
            debugDark ? 'bg-[#0A0A0A] text-[#ECEAE6]' : 'bg-[#ECEAE6] text-[#111111]'
          }`}
        />
      )}

      <div
        ref={mountRef}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 overflow-hidden ${
          debugShapes ? 'z-[60]' : 'z-10'
        }`}
      />

      {/* ?debug=shapes Static Shape Inspector Overlay */}
      {debugShapes && (
        <div
          dir="ltr"
          className="fixed inset-x-0 top-0 z-[65] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3.5 py-3 sm:px-6 sm:py-4"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 rounded-full border border-current/15 bg-black/25 px-3 sm:px-4 py-1.5 sm:py-2 font-mono text-[10px] sm:text-xs backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#5B5BF0] shrink-0" />
            <span className="truncate">SITE SHAPES DEBUG</span>
            <span className="opacity-60 shrink-0">
              {String(debugIdx + 1).padStart(2, '0')} / {String(SITE_DEBUG_SHAPES.length).padStart(2, '0')}
            </span>
          </div>

          <div className="flex w-full sm:w-auto flex-nowrap sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {SITE_DEBUG_SHAPES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDebugIdx(idx)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 sm:px-3.5 py-1.5 font-mono text-[11px] transition-colors ${
                  idx === debugIdx
                    ? 'bg-[#5B5BF0] text-white'
                    : 'border border-current/20 opacity-75 hover:opacity-100'
                }`}
              >
                {s.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setDebugIdx((i) => (i - 1 + SITE_DEBUG_SHAPES.length) % SITE_DEBUG_SHAPES.length)}
              className="shrink-0 rounded-full border border-current/20 p-2 hover:border-[#5B5BF0]"
              aria-label="Previous shape"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDebugIdx((i) => (i + 1) % SITE_DEBUG_SHAPES.length)}
              className="shrink-0 rounded-full border border-current/20 p-2 hover:border-[#5B5BF0]"
              aria-label="Next shape"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setDebugDark((d) => !d)}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1.5 font-mono text-[11px]"
            >
              {debugDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {debugDark ? 'Dark' : 'Light'}
            </button>

            <button
              type="button"
              onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
              className="shrink-0 rounded-full border border-current/20 px-3 py-1.5 font-mono text-[11px] uppercase"
            >
              {locale}
            </button>

            {onExitDebug && (
              <button
                type="button"
                onClick={onExitDebug}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-current/10 px-3 py-1.5 font-mono text-[11px] hover:bg-[#5B5BF0] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Exit
              </button>
            )}
          </div>
        </div>
      )}

      {guiVisible && !debugShapes && (
        <div
          dir="ltr"
          className="fixed start-4 top-16 z-50 flex flex-wrap items-center gap-3 rounded-full border border-white/20 bg-[#0A0A0A]/90 px-4 py-1.5 font-mono text-[10px] text-[#ECEAE6] backdrop-blur-md"
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
