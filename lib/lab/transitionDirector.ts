import { LAB_TIMELINE } from '@/lib/lab/timeline';
import { labAudio } from '@/lib/lab/labAudio';
import { useLabStore } from '@/lib/lab/labStore';
import {
  BloomPhase,
  BloomState,
  MagnetPhase,
  MagnetTransitionState,
  SceneDescriptor,
  ScrollEngineMetrics,
  ThemeKind,
} from '@/lib/lab/types';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/**
 * TransitionDirector — Single central choreographer for particles, theme Bloom/Implosion,
 * and section transitions. Reads strictly from timeline.ts + ScrollEngine spring layers.
 */
export class TransitionDirector {
  private scenes: SceneDescriptor[];
  private lastBloomPhase: BloomPhase = 'none';

  constructor(scenes: SceneDescriptor[] = LAB_TIMELINE) {
    this.scenes = scenes;
  }

  public evaluate(
    scroll: ScrollEngineMetrics,
    vw: number,
    vh: number
  ): {
    activeSceneId: string;
    activeSceneIndex: string;
    activeTheme: ThemeKind;
    localP: number;
    magnet: MagnetTransitionState;
    bloom: BloomState;
    inSeedWindow: boolean;
    inAssembleSlowMo: boolean;
  } {
    const state = useLabStore.getState();
    const { params, soundEnabled, degradationLevel } = state;

    const pPart = clamp01(scroll.pParticles);
    const pTheme = clamp01(scroll.pTheme);
    const dir = scroll.dir;

    // 1. Identify active scene from pTheme / pPart
    let sceneIdx = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      if (pPart >= this.scenes[i].start) {
        sceneIdx = i;
      }
    }
    const scene = this.scenes[sceneIdx];
    const span = Math.max(0.001, scene.end - scene.start);
    const localP = clamp01((pPart - scene.start) / span);

    // 2. Define the two cinematic transition windows in /lab:
    //    Window 1 (Light 01 -> Dark 02): centered on boundary 0.30 -> [0.18 .. 0.44]
    //    Window 2 (Dark 02 -> Light 03): centered on boundary 0.72 -> [0.60 .. 0.86]
    const durScale = Math.max(0.6, Math.min(1.6, params.duration));
    const halfWin = 0.13 * durScale;

    const w1Start = Math.max(0.05, 0.3 - halfWin);
    const w1End = Math.min(0.56, 0.3 + halfWin);

    const w2Start = Math.max(0.56, 0.72 - halfWin);
    const w2End = Math.min(0.95, 0.72 + halfWin);

    const maxRadius = Math.hypot(vw, vh) * 1.04;

    let bloom: BloomState = {
      active: false,
      direction: 'none',
      phase: 'none',
      progress: 0,
      originX: vw * 0.5,
      originY: vh * 0.5,
      radius: 0,
      maxRadius,
      darkCovered: false,
      grainPulse: 0,
    };

    let magnet: MagnetTransitionState = {
      active: false,
      progress: 0,
      phase: 'idle',
      reversed: dir < 0,
      anchorFromPx: { x: vw * scene.anchor.x, y: vh * scene.anchor.y },
      anchorToPx: { x: vw * scene.anchor.x, y: vh * scene.anchor.y },
      G: params.G,
      S: params.S,
      delaySpread: params.delaySpread,
      settle: scene.enter.settle,
      coreAlpha: 0,
      ringProgress: 0,
      fieldLineAlpha: 0,
    };

    let inSeedWindow = false;
    let inAssembleSlowMo = false;

    const isWindow1 = pTheme >= w1Start && pTheme <= w1End;
    const isWindow2 = pTheme >= w2Start && pTheme <= w2End;

    // ── Transition Window 1: Light (01) <-> Dark (02) via Magnet + Seed->Bloom->Settle
    if (isWindow1) {
      const tp = clamp01((pTheme - w1Start) / (w1End - w1Start));
      const mp = clamp01((pPart - w1Start) / (w1End - w1Start));
      const sceneA = this.scenes[0];
      const sceneB = this.scenes[1];

      // Direction-aware anchors: scrolling upward pulls magnetically back to Scene A!
      const isUp = dir < 0;
      const fromAnchor = isUp ? sceneB.anchor : sceneA.anchor;
      const toAnchor = isUp ? sceneA.anchor : sceneB.anchor;
      const effMp = isUp ? 1 - mp : mp;

      magnet = this.buildMagnetState(
        effMp,
        isUp,
        { x: vw * fromAnchor.x, y: vh * fromAnchor.y },
        { x: vw * toAnchor.x, y: vh * toAnchor.y },
        params.G,
        isUp ? -params.S : params.S,
        params.delaySpread,
        sceneB.enter.settle
      );

      // Seed (0..0.25) -> Bloom (0.25..0.80) -> Settle (0.80..1.00)
      let phase: BloomPhase = 'seed';
      let radius = 0;
      let grainPulse = 0;

      if (tp < 0.25) {
        phase = 'seed';
        inSeedWindow = true;
        // Dense black seed dot breathes subtly from 0 -> 14px
        radius = (tp / 0.25) * 14;
      } else if (tp < 0.8) {
        phase = 'bloom';
        const bp = clamp01((tp - 0.25) / 0.55);
        radius = 14 + easeInOutQuart(bp) * (maxRadius - 14);
      } else {
        phase = 'settle';
        const sp = clamp01((tp - 0.8) / 0.2);
        radius = maxRadius;
        grainPulse = Math.sin(sp * Math.PI);
      }

      bloom = {
        active: true,
        direction: 'light-to-dark',
        phase,
        progress: tp,
        originX: vw * sceneB.anchor.x,
        originY: vh * sceneB.anchor.y,
        radius,
        maxRadius,
        darkCovered: tp >= 0.8,
        grainPulse,
      };
    } else if (isWindow2) {
      // ── Transition Window 2: Dark (02) <-> Light (03) via Implosion + Magnet
      const tp = clamp01((pTheme - w2Start) / (w2End - w2Start));
      const mp = clamp01((pPart - w2Start) / (w2End - w2Start));
      const sceneB = this.scenes[1];
      const sceneC = this.scenes[2];

      const isUp = dir < 0;
      const fromAnchor = isUp ? sceneC.anchor : sceneB.anchor;
      const toAnchor = isUp ? sceneB.anchor : sceneC.anchor;
      const effMp = isUp ? 1 - mp : mp;

      magnet = this.buildMagnetState(
        effMp,
        isUp,
        { x: vw * fromAnchor.x, y: vh * fromAnchor.y },
        { x: vw * toAnchor.x, y: vh * toAnchor.y },
        params.G,
        isUp ? -params.S : params.S,
        params.delaySpread,
        sceneC.enter.settle
      );

      // Dark -> Light Implosion: dark circle contracts like a black hole into Scene C's anchor!
      // tp 0..0.72: radius contracts maxRadius -> 0 with easeInOutQuart
      // tp 0.72..1.0: light particles burst outward and assemble at Scene C anchor
      let phase: BloomPhase = 'implosion';
      let radius = 0;
      let grainPulse = 0;

      if (tp < 0.75) {
        phase = 'implosion';
        const ip = clamp01(tp / 0.75);
        radius = (1 - easeInOutQuart(ip)) * maxRadius;
        if (ip > 0.62) {
          inSeedWindow = true;
        }
      } else {
        phase = 'settle';
        const sp = clamp01((tp - 0.75) / 0.25);
        radius = 0;
        grainPulse = Math.sin(sp * Math.PI);
      }

      bloom = {
        active: true,
        direction: 'dark-to-light',
        phase,
        progress: tp,
        originX: vw * sceneC.anchor.x,
        originY: vh * sceneC.anchor.y,
        radius,
        maxRadius,
        darkCovered: false,
        grainPulse,
      };
    } else if (pTheme > w1End && pTheme < w2Start) {
      // Fully inside Dark Scene 02
      bloom = {
        active: false,
        direction: 'none',
        phase: 'none',
        progress: 1,
        originX: vw * 0.5,
        originY: vh * 0.5,
        radius: maxRadius,
        maxRadius,
        darkCovered: true,
        grainPulse: 0,
      };
    } else {
      // Fully inside Light Scene 01 or Scene 03
      // Trigger subtle Slow-Mo Time Dilation in final 5% of Scene 01 / Scene 03 title assemble
      if ((sceneIdx === 0 && localP > 0.25 && localP < 0.34) || (sceneIdx === 2 && localP > 0.68 && localP < 0.78)) {
        inAssembleSlowMo = true;
      }
    }

    // Trigger procedural audio on Seed / Bloom phase transitions
    if (soundEnabled && degradationLevel < 2) {
      if (bloom.phase === 'seed' && this.lastBloomPhase !== 'seed') {
        labAudio.playSeedWhoosh(scroll.speedNorm);
      } else if (
        (bloom.phase === 'bloom' && this.lastBloomPhase !== 'bloom') ||
        (bloom.phase === 'implosion' && this.lastBloomPhase !== 'implosion')
      ) {
        labAudio.playBloomPulse(scroll.speedNorm);
      }
    }
    this.lastBloomPhase = bloom.phase;

    const activeTheme: ThemeKind =
      bloom.darkCovered || (bloom.active && bloom.radius > maxRadius * 0.48)
        ? 'dark'
        : 'light';

    return {
      activeSceneId: scene.id,
      activeSceneIndex: scene.index,
      activeTheme,
      localP,
      magnet,
      bloom,
      inSeedWindow,
      inAssembleSlowMo,
    };
  }

  private buildMagnetState(
    P: number,
    reversed: boolean,
    anchorFromPx: { x: number; y: number },
    anchorToPx: { x: number; y: number },
    G: number,
    S: number,
    delaySpread: number,
    settle: 'assemble' | 'orbit'
  ): MagnetTransitionState {
    let phase: MagnetPhase = 'idle';
    let coreAlpha = 0;
    let ringProgress = 0;
    let fieldLineAlpha = 0;

    if (P <= 0.15) {
      phase = 'anticipation';
      coreAlpha = clamp01(P / 0.15);
    } else if (P < 0.7) {
      phase = P >= 0.3 ? 'field-lines' : 'pull';
      coreAlpha = 1.0;
    } else {
      phase = 'settle';
      const sp = clamp01((P - 0.7) / 0.3);
      coreAlpha = 1 - sp;
      ringProgress = sp;
    }

    if (P >= 0.3 && P <= 0.8) {
      const fp = (P - 0.3) / 0.5;
      fieldLineAlpha = Math.sin(fp * Math.PI);
    }

    return {
      active: true,
      progress: P,
      phase,
      reversed,
      anchorFromPx,
      anchorToPx,
      G,
      S,
      delaySpread,
      settle,
      coreAlpha,
      ringProgress,
      fieldLineAlpha,
    };
  }
}
