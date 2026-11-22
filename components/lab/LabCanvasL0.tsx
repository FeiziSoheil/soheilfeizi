'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { useLabStore } from '@/lib/lab/labStore';
import { labElementAnchors } from '@/lib/lab/elementAnchors';

/* ─────────────────────────────────────────────────────────────
 * PATCHED GPGPU MORPH SIMULATION (LOCAL ELEMENT SPACE ONLY!)
 * - Patch §1: Simulates ONLY local coordinates around (0,0). Scroll NEVER enters!
 * - Patch §2: dt = min(dt, 1/30), critically damped a = (target-pos)*ω² - vel*2ζω
 *             1-time ζ=0.8 overshoot in settle phase, hard snap dist<0.35 && |vel|<1.5
 *             Settled particles skip simulation (pos.w = 1.0)
 * - Patch §3: Curl-noise multiplied by (1 - settled). Zero noise once settled!
 * - Patch §4: Time-based 700-900ms assemble with max 200ms particle delay
 * ───────────────────────────────────────────────────────────── */
const MORPH_VEL_FRAG = `
  uniform sampler2D uTargetTex; // xy = local target, z = local z, w = delay_i (0..0.25s)
  uniform sampler2D uSpawnTex;  // xy = nearest-free local spawn, z = hash, w = sign
  uniform float uDt;
  uniform float uTime;
  uniform float uOmega;
  uniform float uZeta;
  uniform float uAssembleTime;  // seconds since time-based assemble triggered (< 0 = idle)
  uniform float uAssembleDur;   // 0.7 .. 0.9s
  uniform float uResetTrigger;  // > 0.5 resets particles to nearest-free spawn & unsettled
  uniform float uVortexAmp;     // subtle slow vortex when Scene 02 is active & unsettled

  // Cursor in LOCAL element coordinates (mouseWorld - uElementOrigin)
  uniform vec2 uLocalMouse;
  uniform float uMouseActive;
  uniform float uMouseHold;

  vec2 curl2D(vec3 p) {
    float a = sin(p.y * 1.4 + p.z * 0.7) + cos(p.z * 0.8 - p.x * 1.2);
    float b = cos(p.x * 1.3 + p.z * 0.75) - sin(p.y * 1.2 + p.z * 0.9);
    return vec2(a, b) * 0.5;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec4 tgtData = texture2D(uTargetTex, uv);
    vec4 spnData = texture2D(uSpawnTex, uv);

    if (uResetTrigger > 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    float settled = posData.w; // 1.0 = settled (locked to target, skip GPU update)
    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz; // px/sec
    float delaySec = tgtData.w;
    float hash = spnData.z;
    float pSign = spnData.w;

    // Wake up settled particle ONLY if user actively perturbs it with cursor nearby
    vec2 toCursor = pos.xy - uLocalMouse;
    float cursorDist = length(toCursor);
    bool cursorTouching = (uMouseActive > 0.5) && (
      (uMouseHold > 0.5 && cursorDist < 220.0) ||
      (uMouseHold < 0.5 && cursorDist < 105.0)
    );

    if (settled > 0.5 && !cursorTouching) {
      // Patch §2: Settled particles skip simulation completely
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Idle before assemble starts -> keep velocity 0
    if (uAssembleTime < delaySec) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    float activeAge = uAssembleTime - delaySec;
    float dt = min(uDt, 1.0 / 30.0);

    // Patch §2: Critically damped spring (ω = 10..14)
    // Intentional 1-time 4-6% overshoot ONLY during settle phase (ζ = 0.8), then ζ = 1.0
    float inSettlePhase = step(activeAge, uAssembleDur * 0.58);
    float zeta = mix(1.0, uZeta, inSettlePhase);
    float w = uOmega;

    // EaseOutCubic progression along spawn -> target with subtle 1-time settle overshoot (~4.5% at ζ=0.8)
    float u = clamp(activeAge / max(0.22, uAssembleDur * 0.36), 0.0, 1.0);
    float inv = 1.0 - u;
    float easeBase = 1.0 - inv * inv * inv;
    float oneTimeOvershoot = sin(u * 3.14159265) * (1.0 - u) * 0.18 * max(0.0, 1.0 - uZeta) * 2.5;
    float ease = easeBase + oneTimeOvershoot;
    vec2 guidedTarget = mix(spnData.xy, tgtData.xy, ease);

    vec2 toTarget = guidedTarget - pos.xy;
    vec2 acc = toTarget * (w * w) - vel.xy * (2.0 * zeta * w);

    // Patch §3: Curl noise ONLY for free (unsettled) particles, strictly zero when settled
    float freeWeight = (1.0 - settled) * (1.0 - easeBase);
    vec2 noise = curl2D(vec3(pos.xy * 0.004 + vec2(hash * 6.0), uTime * 0.4 + hash * 3.0));
    acc += noise * 45.0 * freeWeight;

    // Gentle swirl during free approach only
    if (uVortexAmp > 0.01 && freeWeight > 0.02) {
      vec2 tang = vec2(-toTarget.y, toTarget.x);
      float tl = length(tang);
      if (tl > 1.0) {
        acc += (tang / tl) * 140.0 * uVortexAmp * freeWeight * pSign;
      }
    }

    // Cursor interaction (in local space)
    if (cursorTouching) {
      if (uMouseHold > 0.5 && cursorDist > 12.0) {
        float f = smoothstep(220.0, 0.0, cursorDist);
        vec2 dirM = -toCursor / cursorDist;
        acc += (dirM * 680.0 + vec2(-dirM.y, dirM.x) * 220.0 * pSign) * f;
      } else if (cursorDist > 1.0) {
        float f = smoothstep(105.0, 0.0, cursorDist);
        acc += (toCursor / cursorDist) * f * f * 820.0;
      }
    }

    vel.xy += acc * dt;
    vel.z += ((tgtData.z - pos.z) * (w * w) - vel.z * (2.0 * w)) * dt;

    // Clamp max velocity in px/s
    float spd = length(vel.xy);
    if (spd > 900.0) {
      vel.xy = (vel.xy / spd) * 900.0;
    }

    // Check snap condition (Patch §2: dist < 0.35px && |vel| < 1.5 px/s)
    vec2 nextPos = pos.xy + vel.xy * dt;
    float finalDist = length(tgtData.xy - nextPos);
    float finalSpd = length(vel.xy);
    if (u >= 1.0 && !cursorTouching && finalDist < 0.35 && finalSpd < 1.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    gl_FragColor = vec4(vel, 0.0);
  }
`;

const MORPH_POS_FRAG = `
  uniform sampler2D uTargetTex;
  uniform sampler2D uSpawnTex;
  uniform float uDt;
  uniform float uResetTrigger;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);
    vec4 tgtData = texture2D(uTargetTex, uv);
    vec4 spnData = texture2D(uSpawnTex, uv);

    if (uResetTrigger > 0.5) {
      gl_FragColor = vec4(spnData.xy, tgtData.z, 0.0);
      return;
    }

    // If velocity pass marked settled (velData.w > 0.5), lock EXACTLY to local target!
    if (velData.w > 0.5) {
      gl_FragColor = vec4(tgtData.xyz, 1.0);
      return;
    }

    float dt = min(uDt, 1.0 / 30.0);
    vec3 nextPos = posData.xyz + velData.xyz * dt;
    gl_FragColor = vec4(nextPos, 0.0);
  }
`;

/* ─────────────────────────────────────────────────────────────
 * MORPH INSTANCED VERTEX & FRAGMENT SHADER
 * - Patch §1: screenPos = localPos + uElementOrigin (EXACT Lenis lock!)
 * - Patch §3: Micro-vibration <= 0.4px in vertex shader only
 * - Patch §5: stretch = (1 - settled) * clamp(|vel| / 600, 0, 1) * 6px
 * - Patch §6: Hidden (alpha 0) when idle before assemble; 6% accent same size
 * ───────────────────────────────────────────────────────────── */
const MORPH_QUAD_VERT = `
  attribute vec2 aRefUv;
  attribute float aAccent;
  attribute float aHash;
  attribute float aDelaySec;

  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform vec2 uElementOrigin;
  uniform float uAssembleTime;
  uniform float uTime;
  uniform float uMicroVibAmp;
  uniform float uBaseSize;

  // Bloom / Implosion uniforms (Section 5)
  uniform vec2 uBloomOrigin;
  uniform float uBloomR;
  uniform float uBloomActive;
  uniform float uDarkCovered;
  uniform float uShellThick;

  varying vec2 vQuadUv;
  varying float vInside;
  varying float vEdge;
  varying float vAccent;
  varying float vAlpha;

  void main() {
    vec4 posData = texture2D(uPosTex, aRefUv);
    vec4 velData = texture2D(uVelTex, aRefUv);

    float settled = posData.w;
    vec3 localPos = posData.xyz;
    vec2 vel = velData.xy; // px/s

    // Patch §6: Morph particles in idle (before assemble delay) are invisible (alpha 0)
    float activeT = uAssembleTime - aDelaySec;
    float revealAlpha = smoothstep(0.0, 0.14, activeT);

    // Patch §1: Lock directly to DOM element origin computed from Lenis smoothed scroll
    vec2 screenPos = localPos.xy + uElementOrigin;

    // Patch §3: Subtle alive micro-vibration <= 0.4px in vertex shader ONLY (never in sim)
    float vibAmp = min(0.4, uMicroVibAmp);
    screenPos.x += sin(uTime * 1.05 + aHash * 6.2831) * vibAmp * settled;
    screenPos.y += cos(uTime * 0.92 + aHash * 6.2831) * vibAmp * settled;

    // Bloom / Implosion shell color & subtle edge lift
    vec2 fromOrigin = screenPos - uBloomOrigin;
    float d = length(fromOrigin);
    float insideRaw = 1.0 - step(uBloomR, d);
    float inside = mix(uDarkCovered, insideRaw, uBloomActive);
    float edge = smoothstep(uBloomR - uShellThick, uBloomR, d)
               * (1.0 - smoothstep(uBloomR, uBloomR + uShellThick, d))
               * uBloomActive;
    vec2 pushDir = d > 0.001 ? fromOrigin / d : vec2(1.0, 0.0);
    screenPos += pushDir * edge * 28.0;

    // Patch §5: Velocity stretch ONLY for moving particles, max 6px, 0 when settled!
    float speed = length(vel);
    float stretchPx = (1.0 - settled) * clamp(speed / 600.0, 0.0, 1.0) * 6.0;
    vec2 dir = speed > 1.0 ? vel / speed : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);

    // Patch §6: Same crisp uniform size for accent & ink particles
    float size = uBaseSize + edge * 2.0;
    float len = size + stretchPx;

    vec2 quadOffset = dir * (position.x * len) + perp * (position.y * size);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(screenPos + quadOffset, localPos.z, 1.0);

    vQuadUv = position.xy * 2.0;
    vInside = inside;
    vEdge = edge;
    vAccent = aAccent;
    vAlpha = revealAlpha * mix(0.72, 0.88, settled);
  }
`;

const MORPH_QUAD_FRAG = `
  uniform vec3 uInkLight;
  uniform vec3 uInkDark;
  uniform vec3 uAccentLight;
  uniform vec3 uAccentDark;

  varying vec2 vQuadUv;
  varying float vInside;
  varying float vEdge;
  varying float vAccent;
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.01) discard;
    float r = length(vQuadUv);
    if (r > 1.0) discard;

    float soft = smoothstep(1.0, 0.28, r);
    float alpha = clamp(soft * (vAlpha + vEdge * 0.35), 0.0, 0.95);

    vec3 inkCol = mix(uInkLight, uInkDark, vInside);
    vec3 accCol = mix(uAccentLight, uAccentDark, vInside);
    vec3 col = mix(inkCol, accCol, vAccent);
    col = mix(col, vec3(0.97, 0.98, 1.0), vEdge * 0.75);

    float additive = clamp(vInside + vEdge * 0.7, 0.0, 1.0);
    float premul = mix(alpha, alpha * 0.72, additive);
    gl_FragColor = vec4(col * premul, alpha * (1.0 - additive));
  }
`;

/* ─────────────────────────────────────────────────────────────
 * AMBIENT DUST SHADER (1800 Desktop / 700 Mobile, Max Drift 8 px/s)
 * - Patch §3: Noise reduced 40%, drift <= 8 px/s
 * - Patch §5: Scroll stretch applies ONLY to Dust (capped at 6px)
 * - Patch §6: 6% accent, same size
 * ───────────────────────────────────────────────────────────── */
const DUST_QUAD_VERT = `
  attribute vec3 aInitPos;
  attribute float aDepth;
  attribute float aHash;
  attribute float aAccent;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uScrollPos;
  uniform float uScrollVelPxSec;
  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uMouseHold;
  uniform float uCursorLink;

  uniform vec2 uBloomOrigin;
  uniform float uBloomR;
  uniform float uBloomActive;
  uniform float uDarkCovered;
  uniform float uShellThick;

  varying vec2 vQuadUv;
  varying float vInside;
  varying float vEdge;
  varying float vAccent;
  varying float vAlpha;

  void main() {
    vec2 halfR = uResolution * 0.52;

    // Slow drift <= 8 px/s (Patch §3: 40% lower noise)
    float driftX = sin(uTime * 0.14 + aHash * 31.4) * 38.0 + uTime * (aHash - 0.5) * 6.0;
    float driftY = cos(uTime * 0.12 + aHash * 27.1) * 32.0;

    // Multi-layer scroll parallax driven cleanly by Lenis smoothed scrollPos
    float parallaxY = uScrollPos * (0.08 + aDepth * 0.24);
    float x = mod(aInitPos.x + driftX + halfR.x, halfR.x * 2.0) - halfR.x;
    float y = mod(aInitPos.y + driftY + parallaxY + halfR.y, halfR.y * 2.0) - halfR.y;
    vec2 pos = vec2(x, y);

    // First 30 dust particles form orbiting halo around cursor on links
    float idx = float(gl_InstanceID);
    if (uCursorLink > 0.5 && idx < 30.0 && uMouseActive > 0.5) {
      float ang = (idx / 30.0) * 6.283185 + uTime * 1.8;
      pos = uMouse + vec2(cos(ang), sin(ang)) * 22.0;
    } else if (uMouseActive > 0.5) {
      vec2 toP = pos - uMouse;
      float mDist = length(toP);
      if (uMouseHold > 0.5 && mDist < 240.0 && mDist > 8.0) {
        float f = smoothstep(240.0, 0.0, mDist);
        pos -= (toP / mDist) * f * 58.0;
      } else if (mDist < 120.0 && mDist > 1.0) {
        float f = smoothstep(120.0, 0.0, mDist);
        pos += (toP / mDist) * f * f * 32.0 * aDepth;
      }
    }

    // Bloom shell push & inside mask
    vec2 fromO = pos - uBloomOrigin;
    float d = length(fromO);
    float insideRaw = 1.0 - step(uBloomR, d);
    float inside = mix(uDarkCovered, insideRaw, uBloomActive);
    float edge = smoothstep(uBloomR - uShellThick, uBloomR, d)
               * (1.0 - smoothstep(uBloomR, uBloomR + uShellThick, d))
               * uBloomActive;
    vec2 pushDir = d > 0.001 ? fromO / d : vec2(1.0, 0.0);
    pos += pushDir * edge * 36.0;

    // Patch §5: Scroll velocity stretch ONLY on Dust, max 6px!
    float dustSpeedY = uScrollVelPxSec * (0.18 + aDepth * 0.42);
    float stretchPx = clamp(abs(dustSpeedY) / 600.0, 0.0, 1.0) * 6.0;
    vec2 dir = vec2(0.0, dustSpeedY >= 0.0 ? 1.0 : -1.0);
    vec2 perp = vec2(1.0, 0.0);

    float size = mix(1.3, 2.2, aDepth) + edge * 2.2;
    float len = size + stretchPx;
    vec2 offset = dir * (position.x * len) + perp * (position.y * size);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + offset, aInitPos.z, 1.0);

    vQuadUv = position.xy * 2.0;
    vInside = inside;
    vEdge = edge;
    vAccent = aAccent;
    vAlpha = mix(0.22, 0.54, aDepth);
  }
`;

/* ─────────────────────────────────────────────────────────────
 * DIPOLE FIELD LINES SHADER (20 curves bridging Anchor A <-> Anchor B)
 * ───────────────────────────────────────────────────────────── */
const FIELD_LINE_VERT = `
  attribute float aCurveId;
  attribute float aBeadT;

  uniform vec2 uAnchorFrom;
  uniform vec2 uAnchorTo;
  uniform float uTime;
  uniform float uAlpha;

  varying float vHead;
  varying float vAlpha;

  vec2 cubicBezier(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t) {
    float u = 1.0 - t;
    return u*u*u*p0 + 3.0*u*u*t*p1 + 3.0*u*t*t*p2 + t*t*t*p3;
  }

  void main() {
    float flowT = fract(aBeadT + uTime * (0.24 + abs(aCurveId) * 0.012));
    vec2 diff = uAnchorTo - uAnchorFrom;
    float dist = max(60.0, length(diff));
    vec2 dir = diff / dist;
    vec2 perp = vec2(-dir.y, dir.x);

    float h_k = aCurveId * (dist * 0.052);
    vec2 cp1 = uAnchorFrom + diff * 0.30 + perp * h_k;
    vec2 cp2 = uAnchorFrom + diff * 0.70 + perp * h_k;

    vec2 p = cubicBezier(uAnchorFrom, cp1, cp2, uAnchorTo, flowT);
    vec2 pNext = cubicBezier(uAnchorFrom, cp1, cp2, uAnchorTo, min(1.0, flowT + 0.02));
    vec2 tang = normalize(pNext - p + vec2(0.0001));
    vec2 nrm = vec2(-tang.y, tang.x);

    float head = smoothstep(0.68, 1.0, flowT);
    float len = mix(4.5, 9.0, head);
    float thick = mix(1.1, 2.0, head);

    vec2 pos = p + tang * (position.x * len) + nrm * (position.y * thick);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 15.0, 1.0);

    float endsFade = smoothstep(0.0, 0.14, flowT) * (1.0 - smoothstep(0.86, 1.0, flowT));
    vHead = head;
    vAlpha = uAlpha * endsFade;
  }
`;

const FIELD_LINE_FRAG = `
  uniform vec3 uAccentLight;
  uniform vec3 uAccentDark;
  uniform float uDark;

  varying float vHead;
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.01) discard;
    vec3 baseCol = mix(uAccentLight, uAccentDark, uDark);
    vec3 col = mix(baseCol, vec3(1.0), vHead * 0.65);
    float a = vAlpha * mix(0.28, 0.78, vHead);
    gl_FragColor = vec4(col * a, a * (1.0 - uDark * 0.75));
  }
`;

/* ─────────────────────────────────────────────────────────────
 * POST-PROCESSING SHADER (Velocity RGB-Split + Grain)
 * ───────────────────────────────────────────────────────────── */
const POST_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const POST_FRAG = `
  uniform sampler2D uSceneTex;
  uniform vec2 uResolution;
  uniform float uRgbSplitPx;
  uniform float uScrollDir;
  uniform float uGrainAmp;
  uniform float uTime;

  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 shift = vec2(0.0, (uRgbSplitPx / max(1.0, uResolution.y)) * uScrollDir);
    vec4 cR = texture2D(uSceneTex, clamp(vUv + shift, 0.0, 1.0));
    vec4 cG = texture2D(uSceneTex, vUv);
    vec4 cB = texture2D(uSceneTex, clamp(vUv - shift, 0.0, 1.0));

    vec3 col = vec3(cR.r, cG.g, cB.b);
    float a = max(cG.a, max(cR.a, cB.a));
    float n = (hash12(gl_FragCoord.xy + fract(uTime * 17.3) * 100.0) - 0.5) * uGrainAmp;
    col += n * step(0.02, a);

    gl_FragColor = vec4(col, a);
  }
`;

/* ─────────────────────────────────────────────────────────────
 * LOCAL ELEMENT TARGET + NEAREST-FREE SPAWN BUILDER
 * Coordinates are strictly LOCAL around (0, 0) inside element rect (w x h)!
 * ───────────────────────────────────────────────────────────── */
function buildLocalElementBuffers(
  targetOut: Float32Array,
  spawnOut: Float32Array,
  delaysOut: Float32Array,
  count: number,
  sceneId: string,
  boxW: number,
  boxH: number
) {
  const rx = Math.max(90, boxW * 0.44);
  const ry = Math.max(90, boxH * 0.44);
  const maxR = Math.hypot(rx, ry);

  for (let i = 0; i < count; i++) {
    const i4 = i * 4;
    const h1 = (((i * 2654435761) >>> 0) % 10000) / 10000;
    const h2 = (((i * 2246822519 + 137) >>> 0) % 10000) / 10000;
    const pSign = i % 2 === 0 ? 1.0 : -1.0;

    let lx = 0;
    let ly = 0;
    let lz = 0;

    if (sceneId === 'lab-light-a') {
      // Crisp sculptural concentric stipple diagram locked to Element A
      const ring = i % 5;
      const a = (i * 2.399963) % (Math.PI * 2);
      const rFrac = 0.22 + ring * 0.175 + (h1 - 0.5) * 0.04;
      lx = Math.cos(a) * rx * rFrac;
      ly = Math.sin(a) * ry * rFrac;
      lz = Math.cos(a * 2.0) * 18;
    } else if (sceneId === 'lab-dark-b') {
      // 3D Torus Knot diagram locked to Element B
      const theta = (i / count) * Math.PI * 2 * 13;
      const r = (Math.cos(3 * theta) + 2.2) / 3.2;
      lx = Math.cos(2 * theta) * rx * r + (h1 - 0.5) * 12;
      ly = Math.sin(2 * theta) * ry * r + (h2 - 0.5) * 12;
      lz = -Math.sin(3 * theta) * 24;
    } else {
      // Precision architectural lattice locked to Element C
      const side = Math.ceil(Math.sqrt(count));
      const gx = ((i % side) / Math.max(1, side - 1)) - 0.5;
      const gy = (Math.floor(i / side) / Math.max(1, side - 1)) - 0.5;
      const rad = Math.hypot(gx, gy);
      const warp = 1.0 + Math.sin(rad * 6.0) * 0.08;
      lx = gx * rx * 1.9 * warp;
      ly = gy * ry * 1.9 * warp;
      lz = (0.5 - rad) * 16;
    }

    // Patch §4: Particle delay <= ~200ms: normDist * 0.16 + hash * 0.04
    const normDist = Math.min(1, Math.hypot(lx, ly) / Math.max(1, maxR));
    const delaySec = normDist * 0.16 + h1 * 0.04;

    targetOut[i4] = lx;
    targetOut[i4 + 1] = ly;
    targetOut[i4 + 2] = lz;
    targetOut[i4 + 3] = delaySec;
    delaysOut[i] = delaySec;

    // Patch §4: Spawn from nearest free neighborhood (55..170px around local target)
    // so travel distance is minimal & convergence < 1s is guaranteed!
    const spawnAngle = h2 * Math.PI * 2;
    const spawnRadius = 55 + h1 * 115;
    spawnOut[i4] = lx + Math.cos(spawnAngle) * spawnRadius;
    spawnOut[i4 + 1] = ly + Math.sin(spawnAngle) * spawnRadius;
    spawnOut[i4 + 2] = h1;
    spawnOut[i4 + 3] = pSign;
  }
}

/* ─────────────────────────────────────────────────────────────
 * LIGHTWEIGHT CPU MIRROR FOR ACCURATE LIVE TELEMETRY (ZERO GPU STALL!)
 * Runs the EXACT same critically-damped ODE + snap rule on 512 sample particles
 * to report exact settled %, avg |vel| px/s, and free particle count.
 * ───────────────────────────────────────────────────────────── */
const SAMPLE_N = 512;
class TelemetryMirror {
  px = new Float32Array(SAMPLE_N);
  py = new Float32Array(SAMPLE_N);
  vx = new Float32Array(SAMPLE_N);
  vy = new Float32Array(SAMPLE_N);
  tx = new Float32Array(SAMPLE_N);
  ty = new Float32Array(SAMPLE_N);
  sx = new Float32Array(SAMPLE_N);
  sy = new Float32Array(SAMPLE_N);
  delay = new Float32Array(SAMPLE_N);
  settled = new Uint8Array(SAMPLE_N);

  reset(targetBuf: Float32Array, spawnBuf: Float32Array, totalCount: number) {
    const step = Math.max(1, Math.floor(totalCount / SAMPLE_N));
    for (let i = 0; i < SAMPLE_N; i++) {
      const src = Math.min(totalCount - 1, i * step) * 4;
      this.tx[i] = targetBuf[src];
      this.ty[i] = targetBuf[src + 1];
      this.delay[i] = targetBuf[src + 3];
      this.sx[i] = spawnBuf[src];
      this.sy[i] = spawnBuf[src + 1];
      this.px[i] = this.sx[i];
      this.py[i] = this.sy[i];
      this.vx[i] = 0;
      this.vy[i] = 0;
      this.settled[i] = 0;
    }
  }

  step(
    dtRaw: number,
    assembleTime: number,
    assembleDur: number,
    omega: number,
    settleZeta: number,
    localMouseX: number,
    localMouseY: number,
    mouseActive: boolean,
    mouseHold: boolean
  ): { settledPct: number; avgVelPxSec: number; activeMovingRatio: number } {
    const dt = Math.min(dtRaw, 1 / 30);
    let settledCount = 0;
    let velSum = 0;

    for (let i = 0; i < SAMPLE_N; i++) {
      const dxM = this.px[i] - localMouseX;
      const dyM = this.py[i] - localMouseY;
      const mDist = Math.hypot(dxM, dyM);
      const cursorTouching =
        mouseActive &&
        ((mouseHold && mDist < 220) || (!mouseHold && mDist < 105));

      if (this.settled[i] === 1 && !cursorTouching) {
        settledCount++;
        continue;
      }

      if (assembleTime < this.delay[i]) {
        continue;
      }

      const activeAge = assembleTime - this.delay[i];
      const u = Math.min(1, activeAge / Math.max(0.22, assembleDur * 0.36));
      const inv = 1 - u;
      const easeBase = 1 - inv * inv * inv;
      const oneTimeOvershoot =
        Math.sin(u * Math.PI) * (1 - u) * 0.18 * Math.max(0, 1 - settleZeta) * 2.5;
      const ease = easeBase + oneTimeOvershoot;
      const gx = this.sx[i] + (this.tx[i] - this.sx[i]) * ease;
      const gy = this.sy[i] + (this.ty[i] - this.sy[i]) * ease;

      const inSettle = activeAge <= assembleDur * 0.58 ? 1 : 0;
      const zeta = 1 + (settleZeta - 1) * inSettle;

      let ax = (gx - this.px[i]) * (omega * omega) - this.vx[i] * (2 * zeta * omega);
      let ay = (gy - this.py[i]) * (omega * omega) - this.vy[i] * (2 * zeta * omega);

      if (cursorTouching) {
        this.settled[i] = 0;
        if (mouseHold && mDist > 12) {
          const f = 1 - mDist / 220;
          ax += (-dxM / mDist) * 680 * f;
          ay += (-dyM / mDist) * 680 * f;
        } else if (mDist > 1) {
          const f = 1 - mDist / 105;
          ax += (dxM / mDist) * f * f * 820;
          ay += (dyM / mDist) * f * f * 820;
        }
      }

      this.vx[i] += ax * dt;
      this.vy[i] += ay * dt;
      const spd = Math.hypot(this.vx[i], this.vy[i]);
      if (spd > 900) {
        this.vx[i] = (this.vx[i] / spd) * 900;
        this.vy[i] = (this.vy[i] / spd) * 900;
      }
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;

      const finalDist = Math.hypot(this.tx[i] - this.px[i], this.ty[i] - this.py[i]);
      const finalSpd = Math.hypot(this.vx[i], this.vy[i]);

      if (u >= 1 && !cursorTouching && finalDist < 0.35 && finalSpd < 1.5) {
        this.px[i] = this.tx[i];
        this.py[i] = this.ty[i];
        this.vx[i] = 0;
        this.vy[i] = 0;
        this.settled[i] = 1;
        settledCount++;
      } else {
        velSum += finalSpd;
      }
    }

    return {
      settledPct: (settledCount / SAMPLE_N) * 100,
      avgVelPxSec: velSum / SAMPLE_N,
      activeMovingRatio: 1 - settledCount / SAMPLE_N,
    };
  }
}

export default function LabCanvasL0() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackStatic, setFallbackStatic] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const id = requestAnimationFrame(() => setFallbackStatic(true));
      return () => cancelAnimationFrame(id);
    }

    const container = mountRef.current;
    if (!container) return;

    let isSoftwareGl = false;
    let hasWebgl2 = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (gl) {
        hasWebgl2 = true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }
    } catch {
      hasWebgl2 = false;
    }

    if (!hasWebgl2) {
      const id = requestAnimationFrame(() => setFallbackStatic(true));
      return () => cancelAnimationFrame(id);
    }

    const isMobile = window.innerWidth < 768;
    // Patch §6: Exact Dust count 1800 desktop / 700 mobile
    const dustCount = isMobile ? 700 : 1800;
    // Refined Morph pool: 128x128 = 16,384 desktop / 96x96 = 9,216 mobile
    const texSize = isSoftwareGl ? 96 : isMobile ? 96 : 128;
    const morphCount = texSize * texSize;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1000,
      1000
    );
    camera.position.z = 500;

    // Post-processing RenderTarget + Quad (same single <canvas>)
    const renderTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(width * dpr)),
      Math.max(1, Math.floor(height * dpr)),
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    );
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new THREE.ShaderMaterial({
      uniforms: {
        uSceneTex: { value: renderTarget.texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uRgbSplitPx: { value: 0 },
        uScrollDir: { value: 1 },
        uGrainAmp: { value: 0.01 },
        uTime: { value: 0 },
      },
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

    const baseQuad = new THREE.PlaneGeometry(1, 1);

    // ─────────────────────────────────────────────────────────
    // 1. AMBIENT DUST MESH (1800 desktop / 700 mobile, 6% accent)
    // ─────────────────────────────────────────────────────────
    const dustGeo = new THREE.InstancedBufferGeometry();
    dustGeo.index = baseQuad.index;
    dustGeo.attributes.position = baseQuad.attributes.position;

    const dustInitPos = new Float32Array(dustCount * 3);
    const dustDepth = new Float32Array(dustCount);
    const dustHash = new Float32Array(dustCount);
    const dustAccent = new Float32Array(dustCount);
    const depthLayers = [0.33, 0.66, 1.0];

    for (let i = 0; i < dustCount; i++) {
      dustInitPos[i * 3] = (Math.random() - 0.5) * width * 1.04;
      dustInitPos[i * 3 + 1] = (Math.random() - 0.5) * height * 1.04;
      dustInitPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      dustDepth[i] = depthLayers[i % 3];
      dustHash[i] = Math.random();
      // Patch §6: Strictly 6% accent particles
      dustAccent[i] = Math.random() < 0.06 ? 1.0 : 0.0;
    }

    dustGeo.setAttribute('aInitPos', new THREE.InstancedBufferAttribute(dustInitPos, 3));
    dustGeo.setAttribute('aDepth', new THREE.InstancedBufferAttribute(dustDepth, 1));
    dustGeo.setAttribute('aHash', new THREE.InstancedBufferAttribute(dustHash, 1));
    dustGeo.setAttribute('aAccent', new THREE.InstancedBufferAttribute(dustAccent, 1));
    dustGeo.instanceCount = dustCount;

    const dustMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uScrollPos: { value: 0 },
        uScrollVelPxSec: { value: 0 },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0 },
        uMouseHold: { value: 0 },
        uCursorLink: { value: 0 },
        uBloomOrigin: { value: new THREE.Vector2(0, 0) },
        uBloomR: { value: 0 },
        uBloomActive: { value: 0 },
        uDarkCovered: { value: 0 },
        uShellThick: { value: 36 },
        uInkLight: { value: new THREE.Color('#141414') },
        uInkDark: { value: new THREE.Color('#ECEBE7') },
        uAccentLight: { value: new THREE.Color('#5B5BF0') },
        uAccentDark: { value: new THREE.Color('#8F8FFF') },
      },
      vertexShader: DUST_QUAD_VERT,
      fragmentShader: MORPH_QUAD_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const dustMesh = new THREE.Mesh(dustGeo, dustMat);
    dustMesh.frustumCulled = false;
    scene.add(dustMesh);

    // ─────────────────────────────────────────────────────────
    // 2. ELEMENT-LOCKED MORPH GPGPU SYSTEM (Local Space!)
    // ─────────────────────────────────────────────────────────
    const targetData = new Float32Array(morphCount * 4);
    const spawnData = new Float32Array(morphCount * 4);
    const delayArr = new Float32Array(morphCount);

    const initLayout = labElementAnchors.getLayout('lab-light-a');
    buildLocalElementBuffers(
      targetData,
      spawnData,
      delayArr,
      morphCount,
      'lab-light-a',
      initLayout?.width ?? 380,
      initLayout?.height ?? 380
    );

    const targetTex = new THREE.DataTexture(targetData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    targetTex.needsUpdate = true;
    const spawnTex = new THREE.DataTexture(spawnData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    spawnTex.needsUpdate = true;

    const mirror = new TelemetryMirror();
    mirror.reset(targetData, spawnData, morphCount);

    const gl2 = renderer.getContext() as WebGL2RenderingContext;
    const supportsFloatRT = Boolean(gl2.getExtension('EXT_color_buffer_float'));

    let gpuCompute: GPUComputationRenderer | null = null;
    let posVar: ReturnType<GPUComputationRenderer['addVariable']> | null = null;
    let velVar: ReturnType<GPUComputationRenderer['addVariable']> | null = null;
    let useGpgpu = false;

    // CPU fallback buffers (if float RT is unsupported)
    const cpuPos = new Float32Array(morphCount * 4);
    const cpuVel = new Float32Array(morphCount * 4);
    for (let i = 0; i < morphCount; i++) {
      cpuPos[i * 4] = spawnData[i * 4];
      cpuPos[i * 4 + 1] = spawnData[i * 4 + 1];
      cpuPos[i * 4 + 2] = targetData[i * 4 + 2];
      cpuPos[i * 4 + 3] = 0;
    }
    const cpuPosTex = new THREE.DataTexture(cpuPos, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const cpuVelTex = new THREE.DataTexture(cpuVel, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    cpuPosTex.needsUpdate = true;
    cpuVelTex.needsUpdate = true;

    if (supportsFloatRT) {
      try {
        const compute = new GPUComputationRenderer(texSize, texSize, renderer);
        const dtPos = compute.createTexture();
        const dtVel = compute.createTexture();
        (dtPos.image.data as Float32Array).set(cpuPos);
        (dtVel.image.data as Float32Array).fill(0);

        velVar = compute.addVariable('textureVelocity', MORPH_VEL_FRAG, dtVel);
        posVar = compute.addVariable('texturePosition', MORPH_POS_FRAG, dtPos);

        compute.setVariableDependencies(velVar, [posVar, velVar]);
        compute.setVariableDependencies(posVar, [posVar, velVar]);

        const initP = useLabStore.getState().params;
        velVar.material.uniforms.uTargetTex = { value: targetTex };
        velVar.material.uniforms.uSpawnTex = { value: spawnTex };
        velVar.material.uniforms.uDt = { value: 1 / 60 };
        velVar.material.uniforms.uTime = { value: 0 };
        velVar.material.uniforms.uOmega = { value: initP.omega };
        velVar.material.uniforms.uZeta = { value: initP.settleZeta };
        velVar.material.uniforms.uAssembleTime = { value: -1 };
        velVar.material.uniforms.uAssembleDur = { value: initP.assembleDurationMs / 1000 };
        velVar.material.uniforms.uResetTrigger = { value: 0 };
        velVar.material.uniforms.uVortexAmp = { value: 0 };
        velVar.material.uniforms.uLocalMouse = { value: new THREE.Vector2(9999, 9999) };
        velVar.material.uniforms.uMouseActive = { value: 0 };
        velVar.material.uniforms.uMouseHold = { value: 0 };

        posVar.material.uniforms.uTargetTex = { value: targetTex };
        posVar.material.uniforms.uSpawnTex = { value: spawnTex };
        posVar.material.uniforms.uDt = { value: 1 / 60 };
        posVar.material.uniforms.uResetTrigger = { value: 0 };

        const err = compute.init();
        if (!err) {
          gpuCompute = compute;
          useGpgpu = true;
        }
      } catch {
        useGpgpu = false;
      }
    }

    const morphGeo = new THREE.InstancedBufferGeometry();
    morphGeo.index = baseQuad.index;
    morphGeo.attributes.position = baseQuad.attributes.position;

    const refUvs = new Float32Array(morphCount * 2);
    const morphAccents = new Float32Array(morphCount);
    const morphHashes = new Float32Array(morphCount);
    for (let i = 0; i < morphCount; i++) {
      refUvs[i * 2] = ((i % texSize) + 0.5) / texSize;
      refUvs[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
      const h = spawnData[i * 4 + 2];
      morphHashes[i] = h;
      // Patch §6: Strictly 6% accent particles, identical size
      morphAccents[i] = h < 0.06 ? 1.0 : 0.0;
    }

    const delayAttr = new THREE.InstancedBufferAttribute(delayArr, 1);
    morphGeo.setAttribute('aRefUv', new THREE.InstancedBufferAttribute(refUvs, 2));
    morphGeo.setAttribute('aAccent', new THREE.InstancedBufferAttribute(morphAccents, 1));
    morphGeo.setAttribute('aHash', new THREE.InstancedBufferAttribute(morphHashes, 1));
    morphGeo.setAttribute('aDelaySec', delayAttr);
    morphGeo.instanceCount = morphCount;

    const morphMat = new THREE.ShaderMaterial({
      uniforms: {
        uPosTex: { value: cpuPosTex },
        uVelTex: { value: cpuVelTex },
        uElementOrigin: { value: new THREE.Vector2(0, 0) },
        uAssembleTime: { value: -1 },
        uTime: { value: 0 },
        uMicroVibAmp: { value: 0.35 },
        uBaseSize: { value: 1.7 },
        uBloomOrigin: { value: new THREE.Vector2(0, 0) },
        uBloomR: { value: 0 },
        uBloomActive: { value: 0 },
        uDarkCovered: { value: 0 },
        uShellThick: { value: 36 },
        uInkLight: { value: new THREE.Color('#141414') },
        uInkDark: { value: new THREE.Color('#ECEBE7') },
        uAccentLight: { value: new THREE.Color('#5B5BF0') },
        uAccentDark: { value: new THREE.Color('#8F8FFF') },
      },
      vertexShader: MORPH_QUAD_VERT,
      fragmentShader: MORPH_QUAD_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const morphMesh = new THREE.Mesh(morphGeo, morphMat);
    morphMesh.frustumCulled = false;
    scene.add(morphMesh);

    // ─────────────────────────────────────────────────────────
    // 3. DIPOLE FIELD LINES + MAGNETIC CORE + BLOOM 1PX RING
    // ─────────────────────────────────────────────────────────
    const curveCount = 20;
    const beadsPerCurve = 20;
    const fieldTotal = curveCount * beadsPerCurve;
    const fieldGeo = new THREE.InstancedBufferGeometry();
    fieldGeo.index = baseQuad.index;
    fieldGeo.attributes.position = baseQuad.attributes.position;
    const curveIds = new Float32Array(fieldTotal);
    const beadTs = new Float32Array(fieldTotal);
    let fIdx = 0;
    for (let c = 0; c < curveCount; c++) {
      const k = c < 10 ? -(c + 1) : c - 9;
      for (let b = 0; b < beadsPerCurve; b++) {
        curveIds[fIdx] = k;
        beadTs[fIdx] = b / beadsPerCurve;
        fIdx++;
      }
    }
    fieldGeo.setAttribute('aCurveId', new THREE.InstancedBufferAttribute(curveIds, 1));
    fieldGeo.setAttribute('aBeadT', new THREE.InstancedBufferAttribute(beadTs, 1));
    fieldGeo.instanceCount = fieldTotal;

    const fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uAnchorFrom: { value: new THREE.Vector2(0, 0) },
        uAnchorTo: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uAlpha: { value: 0 },
        uDark: { value: 0 },
        uAccentLight: { value: new THREE.Color('#5B5BF0') },
        uAccentDark: { value: new THREE.Color('#8F8FFF') },
      },
      vertexShader: FIELD_LINE_VERT,
      fragmentShader: FIELD_LINE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
    fieldMesh.frustumCulled = false;
    scene.add(fieldMesh);

    const coreMesh = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 24),
      new THREE.MeshBasicMaterial({ color: '#5B5BF0', transparent: true, opacity: 0, depthWrite: false })
    );
    coreMesh.position.z = 25;
    scene.add(coreMesh);

    const bloomRingMat = new THREE.MeshBasicMaterial({
      color: '#ECEBE7',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bloomRing = new THREE.Mesh(new THREE.RingGeometry(0.997, 1.0, 96), bloomRingMat);
    bloomRing.position.z = 26;
    scene.add(bloomRing);

    // ─────────────────────────────────────────────────────────
    // TIME-BASED ASSEMBLE STATE MACHINE (Patch §4)
    // ─────────────────────────────────────────────────────────
    let currentSceneId = 'lab-light-a';
    let assembleState: 'idle' | 'debouncing' | 'assembling' | 'settled' = 'debouncing';
    let debounceMs = 0;
    let assembleTimeSec = -1;
    let pendingGpuReset = true;

    const rebuildForScene = (sceneId: string) => {
      currentSceneId = sceneId;
      const layout = labElementAnchors.getLayout(sceneId);
      buildLocalElementBuffers(
        targetData,
        spawnData,
        delayArr,
        morphCount,
        sceneId,
        layout?.width ?? 360,
        layout?.height ?? 360
      );
      targetTex.needsUpdate = true;
      spawnTex.needsUpdate = true;
      delayAttr.needsUpdate = true;
      mirror.reset(targetData, spawnData, morphCount);

      if (!useGpgpu) {
        for (let i = 0; i < morphCount; i++) {
          cpuPos[i * 4] = spawnData[i * 4];
          cpuPos[i * 4 + 1] = spawnData[i * 4 + 1];
          cpuPos[i * 4 + 2] = targetData[i * 4 + 2];
          cpuPos[i * 4 + 3] = 0;
          cpuVel[i * 4] = 0;
          cpuVel[i * 4 + 1] = 0;
          cpuVel[i * 4 + 2] = 0;
          cpuVel[i * 4 + 3] = 0;
        }
        cpuPosTex.needsUpdate = true;
        cpuVelTex.needsUpdate = true;
      }

      assembleState = 'debouncing';
      debounceMs = 0;
      assembleTimeSec = -1;
      pendingGpuReset = true;
    };

    // Rebuild local targets ONLY on ResizeObserver / resize (Patch §1)
    const unsubAnchors = labElementAnchors.subscribe(() => {
      const layout = labElementAnchors.getLayout(currentSceneId);
      if (!layout) return;
      buildLocalElementBuffers(
        targetData,
        spawnData,
        delayArr,
        morphCount,
        currentSceneId,
        layout.width,
        layout.height
      );
      targetTex.needsUpdate = true;
      spawnTex.needsUpdate = true;
      delayAttr.needsUpdate = true;
    });

    // Pointer & Resize & Visibility
    const mouseTarget = new THREE.Vector2(9999, 9999);
    const mouseCurrent = new THREE.Vector2(9999, 9999);
    let mouseActive = 0;
    let mouseHold = 0;

    const toWebgl = (cx: number, cy: number) => ({
      x: cx - width * 0.5,
      y: -(cy - height * 0.5),
    });

    const onPointerMove = (e: PointerEvent) => {
      const p = toWebgl(e.clientX, e.clientY);
      mouseTarget.set(p.x, p.y);
      mouseActive = 1;
    };
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button, a, input, .lil-gui')) return;
      const p = toWebgl(e.clientX, e.clientY);
      mouseTarget.set(p.x, p.y);
      mouseActive = 1;
      mouseHold = 1;
      useLabStore.getState().setCursorMagnetHold(true);
    };
    const onPointerUp = (e: PointerEvent) => {
      mouseHold = 0;
      if (e.pointerType !== 'mouse') {
        mouseActive = 0;
      }
      useLabStore.getState().setCursorMagnetHold(false);
    };
    const onPointerLeave = () => {
      mouseActive = 0;
      mouseHold = 0;
      useLabStore.getState().setCursorMagnetHold(false);
    };
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      renderTarget.setSize(Math.max(1, Math.floor(width * dpr)), Math.max(1, Math.floor(height * dpr)));
      dustMat.uniforms.uResolution.value.set(width, height);
      postMat.uniforms.uResolution.value.set(width, height);
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
    let lowFpsStreak = 0;
    let telemetryTimer = 0;
    let disposed = false;
    let rafId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;
      if (!tabVisible) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Patch §2: Strictly clamp dt <= 1/30
      const dt = Math.min(clock.getDelta(), 1 / 30);
      const elapsed = clock.getElapsedTime();
      const st = useLabStore.getState();
      const { scroll, magnet, bloom, params, degradationLevel, cursorOnLink } = st;

      // Rolling FPS & 3-stage protection
      fpsFrames++;
      const now = performance.now();
      if (now - fpsStart >= 1000) {
        const curFps = Math.round((fpsFrames * 1000) / (now - fpsStart));
        st.setFps(curFps);
        if (!isSoftwareGl && curFps < 45) {
          lowFpsStreak++;
          if (lowFpsStreak >= 2 && degradationLevel < 3) {
            st.setDegradationLevel((degradationLevel + 1) as 0 | 1 | 2 | 3);
            lowFpsStreak = 0;
          }
        } else {
          lowFpsStreak = 0;
        }
        fpsFrames = 0;
        fpsStart = now;
      }

      morphGeo.instanceCount =
        degradationLevel >= 3 ? Math.floor(morphCount * 0.7) : morphCount;

      // Detect active scene change -> rebuild local targets & enter 120ms debounce
      if (st.activeSceneId !== currentSceneId) {
        rebuildForScene(st.activeSceneId);
      }

      // Patch §1: Compute uElementOrigin strictly from cached ResizeObserver rect + Lenis scroll.pos!
      const liveRect = labElementAnchors.getLiveScreenRect(currentSceneId, scroll.pos, height);
      const originPxX = liveRect ? liveRect.centerX : magnet.anchorToPx.x;
      const originPxY = liveRect ? liveRect.centerY : magnet.anchorToPx.y;
      const elemTopPx = liveRect ? liveRect.top : 0;
      const elemOriginW = toWebgl(originPxX, originPxY);

      // Patch §4: Time-based assemble trigger (element reaches bottom 25% of viewport & speedNorm < 0.15 for 120ms)
      const enteredViewport = elemTopPx <= height * 0.75;
      if (!params.freezeSimulation) {
        if (assembleState === 'idle' || assembleState === 'debouncing') {
          if (enteredViewport && scroll.speedNorm < 0.15) {
            assembleState = 'debouncing';
            debounceMs += dt * 1000;
            if (debounceMs >= 120) {
              assembleState = 'assembling';
              assembleTimeSec = 0;
            }
          } else {
            // Fast scroll cancels/resets debounce cleanly
            debounceMs = 0;
            assembleState = 'idle';
          }
        } else if (assembleState === 'assembling' || assembleState === 'settled') {
          assembleTimeSec += dt;
        }
      }

      mouseCurrent.lerp(mouseTarget, 1 - Math.exp(-12 * dt));
      const localMouseX = mouseCurrent.x - elemOriginW.x;
      const localMouseY = mouseCurrent.y - elemOriginW.y;

      const assembleDurSec = Math.max(0.5, params.assembleDurationMs / 1000);
      const bloomOriginW = toWebgl(bloom.originX, bloom.originY);
      const scrollVelPxSec = scroll.velocity * 60;

      // ── Step GPGPU Morph Simulation (unless Freeze simulation is toggled!) ──
      if (!params.freezeSimulation) {
        if (useGpgpu && gpuCompute && velVar && posVar) {
          const vu = velVar.material.uniforms;
          const pu = posVar.material.uniforms;

          vu.uDt.value = dt;
          vu.uTime.value = elapsed;
          vu.uOmega.value = params.omega;
          vu.uZeta.value = params.settleZeta;
          vu.uAssembleTime.value = assembleTimeSec;
          vu.uAssembleDur.value = assembleDurSec;
          vu.uResetTrigger.value = pendingGpuReset ? 1.0 : 0.0;
          vu.uVortexAmp.value = currentSceneId === 'lab-dark-b' ? 0.85 : 0.0;
          vu.uLocalMouse.value.set(localMouseX, localMouseY);
          vu.uMouseActive.value = mouseActive;
          vu.uMouseHold.value = mouseHold;

          pu.uDt.value = dt;
          pu.uResetTrigger.value = pendingGpuReset ? 1.0 : 0.0;

          gpuCompute.compute();
          pendingGpuReset = false;

          morphMat.uniforms.uPosTex.value = gpuCompute.getCurrentRenderTarget(posVar).texture;
          morphMat.uniforms.uVelTex.value = gpuCompute.getCurrentRenderTarget(velVar).texture;
        } else {
          // Matching critically-damped CPU fallback
          for (let i = 0; i < morphCount; i++) {
            const i4 = i * 4;
            if (cpuPos[i4 + 3] > 0.5) continue;
            const dSec = targetData[i4 + 3];
            if (assembleTimeSec < dSec) continue;
            const age = assembleTimeSec - dSec;
            const u = Math.min(1, age / Math.max(0.22, assembleDurSec * 0.36));
            const inv = 1 - u;
            const easeBase = 1 - inv * inv * inv;
            const oneTimeOvershoot =
              Math.sin(u * Math.PI) * (1 - u) * 0.18 * Math.max(0, 1 - params.settleZeta) * 2.5;
            const ease = easeBase + oneTimeOvershoot;
            const gx = spawnData[i4] + (targetData[i4] - spawnData[i4]) * ease;
            const gy = spawnData[i4 + 1] + (targetData[i4 + 1] - spawnData[i4 + 1]) * ease;
            const w = params.omega;
            const zeta = age <= assembleDurSec * 0.58 ? params.settleZeta : 1;
            const ax = (gx - cpuPos[i4]) * w * w - cpuVel[i4] * 2 * zeta * w;
            const ay = (gy - cpuPos[i4 + 1]) * w * w - cpuVel[i4 + 1] * 2 * zeta * w;
            cpuVel[i4] += ax * dt;
            cpuVel[i4 + 1] += ay * dt;
            cpuPos[i4] += cpuVel[i4] * dt;
            cpuPos[i4 + 1] += cpuVel[i4 + 1] * dt;
            const fd = Math.hypot(targetData[i4] - cpuPos[i4], targetData[i4 + 1] - cpuPos[i4 + 1]);
            const fs = Math.hypot(cpuVel[i4], cpuVel[i4 + 1]);
            if (u >= 1 && fd < 0.35 && fs < 1.5) {
              cpuPos[i4] = targetData[i4];
              cpuPos[i4 + 1] = targetData[i4 + 1];
              cpuVel[i4] = 0;
              cpuVel[i4 + 1] = 0;
              cpuPos[i4 + 3] = 1;
            }
          }
          cpuPosTex.needsUpdate = true;
          cpuVelTex.needsUpdate = true;
          pendingGpuReset = false;
        }

        // Advance CPU mirror for exact live telemetry (settled %, avg |vel| px/s, freeCount)
        const snap = mirror.step(
          dt,
          assembleTimeSec,
          assembleDurSec,
          params.omega,
          params.settleZeta,
          localMouseX,
          localMouseY,
          mouseActive > 0.5,
          mouseHold > 0.5
        );

        if (assembleState === 'assembling' && snap.settledPct >= 95) {
          assembleState = 'settled';
        }

        telemetryTimer += dt;
        if (telemetryTimer >= 0.08) {
          telemetryTimer = 0;
          const movingMorph = Math.round(morphCount * snap.activeMovingRatio);
          st.setTelemetry({
            settledPct: snap.settledPct,
            avgVelPxSec: snap.avgVelPxSec,
            freeCount: dustCount + movingMorph,
            morphCount,
            dustCount,
            assembleState,
            assembleElapsedMs: Math.max(0, Math.round(assembleTimeSec * 1000)),
          });
        }
      }

      // ── Update Render Uniforms (Always update uElementOrigin even when sim is frozen!) ──
      morphMat.uniforms.uElementOrigin.value.set(elemOriginW.x, elemOriginW.y);
      morphMat.uniforms.uAssembleTime.value = assembleTimeSec;
      morphMat.uniforms.uTime.value = elapsed;
      morphMat.uniforms.uMicroVibAmp.value = params.freezeSimulation ? 0 : params.microVibAmp;
      morphMat.uniforms.uBloomOrigin.value.set(bloomOriginW.x, bloomOriginW.y);
      morphMat.uniforms.uBloomR.value = bloom.radius;
      morphMat.uniforms.uBloomActive.value = bloom.active ? 1.0 : 0.0;
      morphMat.uniforms.uDarkCovered.value = bloom.darkCovered ? 1.0 : 0.0;
      morphMat.uniforms.uShellThick.value = params.shellThickness;

      dustMat.uniforms.uTime.value = params.freezeSimulation ? 0 : elapsed;
      dustMat.uniforms.uScrollPos.value = scroll.pos;
      dustMat.uniforms.uScrollVelPxSec.value = scrollVelPxSec;
      dustMat.uniforms.uMouse.value.copy(mouseCurrent);
      dustMat.uniforms.uMouseActive.value = mouseActive;
      dustMat.uniforms.uMouseHold.value = mouseHold;
      dustMat.uniforms.uCursorLink.value = cursorOnLink ? 1.0 : 0.0;
      dustMat.uniforms.uBloomOrigin.value.set(bloomOriginW.x, bloomOriginW.y);
      dustMat.uniforms.uBloomR.value = bloom.radius;
      dustMat.uniforms.uBloomActive.value = bloom.active ? 1.0 : 0.0;
      dustMat.uniforms.uDarkCovered.value = bloom.darkCovered ? 1.0 : 0.0;
      dustMat.uniforms.uShellThick.value = params.shellThickness;

      // Dipole Field Lines & Magnetic Core & Bloom 1px Ring
      const anchorFromW = toWebgl(magnet.anchorFromPx.x, magnet.anchorFromPx.y);
      const anchorToW = toWebgl(magnet.anchorToPx.x, magnet.anchorToPx.y);
      fieldMat.uniforms.uAnchorFrom.value.set(anchorFromW.x, anchorFromW.y);
      fieldMat.uniforms.uAnchorTo.value.set(anchorToW.x, anchorToW.y);
      fieldMat.uniforms.uTime.value = elapsed;
      fieldMat.uniforms.uAlpha.value = magnet.active ? magnet.fieldLineAlpha : 0;
      fieldMat.uniforms.uDark.value = st.activeTheme === 'dark' ? 1.0 : 0.0;

      coreMesh.position.set(anchorToW.x, anchorToW.y, 25);
      (coreMesh.material as THREE.MeshBasicMaterial).opacity = magnet.active
        ? magnet.coreAlpha * 0.85
        : 0;

      bloomRing.position.set(bloomOriginW.x, bloomOriginW.y, 26);
      const showBloomRing =
        bloom.active && bloom.radius > 4 && bloom.radius < bloom.maxRadius * 0.98;
      if (showBloomRing) {
        bloomRing.scale.set(bloom.radius, bloom.radius, 1);
        bloomRingMat.opacity = 0.5;
      } else {
        bloomRingMat.opacity = 0;
      }

      if (degradationLevel === 0 && !isSoftwareGl) {
        renderer.setRenderTarget(renderTarget);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        postMat.uniforms.uRgbSplitPx.value = scroll.speedNorm * params.rgbSplitMax;
        postMat.uniforms.uScrollDir.value = scroll.dir;
        postMat.uniforms.uGrainAmp.value =
          0.01 + scroll.speedNorm * 0.03 + bloom.grainPulse * 0.09;
        postMat.uniforms.uTime.value = elapsed;
        renderer.render(postScene, postCamera);
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }

      rafId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      unsubAnchors();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerLeave);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      baseQuad.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      morphGeo.dispose();
      morphMat.dispose();
      fieldGeo.dispose();
      fieldMat.dispose();
      postMat.dispose();
      renderTarget.dispose();
      targetTex.dispose();
      spawnTex.dispose();
      cpuPosTex.dispose();
      cpuVelTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (fallbackStatic) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    />
  );
}
