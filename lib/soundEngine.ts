// Hybrid Procedural Web Audio Ambient Synthesizer & SoundCloud Controller
// Supports SoundCloud external streams + Procedural DSP with real-time level analytics.

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private isPlaying = false;
  private currentTrack = 0;
  private freqBuffer = new Uint8Array(32);
  private singularityOsc: OscillatorNode | null = null;
  private singularityGain: GainNode | null = null;
  private scWidget: any = null;
  private scIframe: HTMLIFrameElement | null = null;
  private pendingSeekMs: number = 110000;

  public registerSoundCloudWidget(iframe: HTMLIFrameElement | null) {
    this.scIframe = iframe;
    if (!iframe || typeof window === 'undefined') return;

    const attach = () => {
      const SC = (window as unknown as { SC?: { Widget?: (el: HTMLElement) => any } }).SC;
      if (SC && SC.Widget) {
        try {
          this.scWidget = SC.Widget(iframe);
          this.scWidget.bind('ready', () => {
            if (this.pendingSeekMs > 0) {
              try {
                this.scWidget.seekTo(this.pendingSeekMs);
              } catch {
                // ignore
              }
            }
            if (this.isPlaying && (this.currentTrack === 0 || this.currentTrack === 1)) {
              this.scWidget.play();
            }
          });
          this.scWidget.bind('play', () => {
            if (this.pendingSeekMs > 0) {
              try {
                this.scWidget.seekTo(this.pendingSeekMs);
              } catch {
                // ignore
              }
            }
          });
          this.scWidget.bind('playProgress', (data?: { currentPosition?: number }) => {
            if (this.pendingSeekMs > 0) {
              const pos = data?.currentPosition ?? 0;
              if (pos < this.pendingSeekMs - 2000) {
                try {
                  this.scWidget.seekTo(this.pendingSeekMs);
                } catch {
                  // ignore
                }
              } else {
                this.pendingSeekMs = 0;
              }
            }
          });
        } catch {
          // ignore widget init error
        }
      }
    };

    if ((window as unknown as { SC?: { Widget?: unknown } }).SC?.Widget) {
      attach();
    } else {
      const existing = document.getElementById('sc-widget-api');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'sc-widget-api';
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.async = true;
        script.onload = attach;
        document.body.appendChild(script);
      } else {
        existing.addEventListener('load', attach);
      }
    }
  }

  public playSoundCloud(seekMs?: number) {
    if (seekMs !== undefined) {
      this.pendingSeekMs = seekMs;
    }
    if (this.scWidget) {
      try {
        if (this.pendingSeekMs > 0) {
          this.scWidget.seekTo(this.pendingSeekMs);
        }
        this.scWidget.play();
      } catch {
        // ignore
      }
    }
  }

  public loadSoundCloudTrack(url: string, seekMs?: number) {
    if (seekMs !== undefined) {
      this.pendingSeekMs = seekMs;
    }
    if (this.scWidget) {
      try {
        this.scWidget.load(url, {
          auto_play: this.isPlaying,
          callback: () => {
            if (this.pendingSeekMs > 0) {
              this.scWidget.seekTo(this.pendingSeekMs);
              this.pendingSeekMs = 0;
            }
          },
        });
      } catch {
        // ignore
      }
    }
  }

  public pauseSoundCloud() {
    if (this.scWidget) {
      try {
        this.scWidget.pause();
      } catch {
        // ignore
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.82;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private clearActiveTrack() {
    this.activeIntervals.forEach((id) => window.clearInterval(id));
    this.activeIntervals = [];
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    });
    this.activeNodes = [];
  }

  public start(trackIndex = this.currentTrack, seekMs?: number) {
    this.currentTrack = trackIndex;
    this.isPlaying = true;

    if (trackIndex === 0) {
      // Track 0: SoundCloud (Hans Zimmer — Tick-Tock, starts at 1:50 = 110,000ms)
      this.clearActiveTrack();
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      this.playSoundCloud(seekMs ?? 110000);
      return;
    }

    if (trackIndex === 1) {
      // Track 1: SoundCloud (Hans Zimmer — Day One, starts at 0ms)
      this.clearActiveTrack();
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      this.playSoundCloud(seekMs ?? 0);
      return;
    }

    // Track 2: Procedural Web Audio (Interstellar)
    this.pauseSoundCloud();

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.clearActiveTrack();

    const trackBus = ctx.createGain();
    trackBus.gain.value = 0.45;
    trackBus.connect(this.masterGain);
    this.activeNodes.push(trackBus);

    this.buildInterstellarCosmic(ctx, trackBus);

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.32, now, 0.7);
  }

  public stop() {
    this.isPlaying = false;
    this.pauseSoundCloud();
    if (!this.ctx || !this.masterGain) {
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.35);
    this.silenceSingularityHum();
    window.setTimeout(() => {
      if (!this.isPlaying) {
        this.clearActiveTrack();
      }
    }, 900);
  }

  public toggle(trackIndex?: number): boolean {
    if (this.isPlaying && (trackIndex === undefined || trackIndex === this.currentTrack)) {
      this.stop();
      return false;
    }
    this.start(trackIndex ?? this.currentTrack);
    return true;
  }

  public switchTrack(trackIndex: number) {
    this.currentTrack = trackIndex;
    if (this.isPlaying) {
      this.start(trackIndex);
    }
  }

  public getState() {
    return { isPlaying: this.isPlaying, currentTrack: this.currentTrack };
  }

  public isContextRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  public resumeIfNeeded(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public getLevels(bars = 12): number[] {
    if (!this.isPlaying) {
      return Array.from({ length: bars }, () => 0.08);
    }

    if (this.currentTrack === 0 || this.currentTrack === 1) {
      // Procedural animated equalizer levels for SoundCloud playback
      const t = typeof performance !== 'undefined' ? performance.now() * 0.0035 : 0;
      const out: number[] = [];
      for (let i = 0; i < bars; i++) {
        const wave = 0.22 + 0.65 * Math.abs(Math.sin(t * (1.2 + i * 0.18) + i * 0.45));
        out.push(Math.max(0.12, Math.min(0.95, wave)));
      }
      return out;
    }

    if (!this.analyser) {
      return Array.from({ length: bars }, () => 0.08);
    }
    this.analyser.getByteFrequencyData(this.freqBuffer);
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      const idx = Math.min(this.freqBuffer.length - 1, Math.floor((i / bars) * 14));
      out.push(Math.max(0.1, this.freqBuffer[idx] / 255));
    }
    return out;
  }

  public playStippleTick() {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640 + Math.random() * 140, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Procedural Singularity Sub-Bass Hum (40Hz..90Hz pure sine).
   * Active ONLY when user sound is ON; ramps volume 0 -> 0.25 with r/R and fades cleanly to 0 at edges.
   */
  public updateSingularityHum(ratio: number, active: boolean, soundEnabled: boolean) {
    if (!active || !soundEnabled || !this.isPlaying || !this.ctx || this.ctx.state !== 'running') {
      this.silenceSingularityHum();
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, ratio));

    if (!this.singularityOsc || !this.singularityGain) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(42, now);
      gain.gain.setValueAtTime(0.0001, now);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      this.singularityOsc = osc;
      this.singularityGain = gain;
    }

    // Frequency sweeps smoothly from 40Hz to 90Hz as r/R expands
    const targetFreq = 40 + clamped * 50;
    // Envelope rises 0 -> 0.25 across active swallow and fades out smoothly near r/R = 1
    const fadeOut = clamped > 0.82 ? Math.max(0, (1 - clamped) / 0.18) : 1;
    const fadeIn = clamped < 0.06 ? clamped / 0.06 : 1;
    const targetGain = Math.max(0.0001, Math.min(0.25, Math.sin(clamped * Math.PI * 0.88 + 0.12) * 0.25 * fadeIn * fadeOut));

    this.singularityOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
    this.singularityGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  public silenceSingularityHum() {
    if (!this.ctx || !this.singularityGain) return;
    const now = this.ctx.currentTime;
    this.singularityGain.gain.setTargetAtTime(0.0001, now, 0.12);
  }

  // Track 1: Procedural Web Audio — Interstellar Cosmos (Cathedral Pipe Organ, Time Ostinato & Void Resonance)
  private buildInterstellarCosmic(ctx: AudioContext, dest: AudioNode) {
    // 1. Cathedral Acoustic Space & Delay Network
    const reverbBus = ctx.createGain();
    reverbBus.gain.value = 0.38;
    reverbBus.connect(dest);
    this.activeNodes.push(reverbBus);

    const delayL = ctx.createDelay();
    delayL.delayTime.value = 0.375;
    const delayR = ctx.createDelay();
    delayR.delayTime.value = 0.500;

    const filterL = ctx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterL.frequency.value = 2200;
    const filterR = ctx.createBiquadFilter();
    filterR.type = 'lowpass';
    filterR.frequency.value = 1800;

    const feedL = ctx.createGain();
    feedL.gain.value = 0.36;
    const feedR = ctx.createGain();
    feedR.gain.value = 0.34;

    // Cross-feed delay lines for vast, spatial cathedral diffusion
    delayL.connect(filterL);
    filterL.connect(feedL);
    feedL.connect(delayR);
    filterL.connect(reverbBus);

    delayR.connect(filterR);
    filterR.connect(feedR);
    feedR.connect(delayL);
    filterR.connect(reverbBus);

    this.activeNodes.push(delayL, delayR, filterL, filterR, feedL, feedR);

    // 2. Majestic Church Pipe Organ Engine
    // Chords: Am -> Fmaj7 -> Dm9 -> Em7 (The signature Zimmer emotional progression)
    const organBus = ctx.createGain();
    organBus.gain.value = 0.28;
    organBus.connect(dest);
    organBus.connect(delayL);
    this.activeNodes.push(organBus);

    const organFilter = ctx.createBiquadFilter();
    organFilter.type = 'lowpass';
    organFilter.frequency.value = 1600;
    organFilter.Q.value = 1.1;
    organFilter.connect(organBus);
    this.activeNodes.push(organFilter);

    // Organ Swell LFO (simulating cathedral swell shutters / air bellows breathing)
    const swellLfo = ctx.createOscillator();
    const swellGain = ctx.createGain();
    swellLfo.frequency.value = 0.08;
    swellGain.gain.value = 420;
    swellLfo.connect(swellGain);
    swellGain.connect(organFilter.frequency);
    swellLfo.start();
    this.activeNodes.push(swellLfo, swellGain);

    // 4 Chords: [Pedal Sub-bass, Tenor, Alto, Soprano, Lead]
    const chords = [
      // Am: A1, E3, A3, C4, E4
      [55.00, 164.81, 220.00, 261.63, 329.63],
      // Fmaj7: F1, C3, F3, A3, E4
      [43.65, 130.81, 174.61, 220.00, 329.63],
      // Dm9: D1, A2, F3, C4, E4
      [36.71, 110.00, 174.61, 261.63, 329.63],
      // Em7: E1, B2, E3, G3, D4
      [41.20, 123.47, 164.81, 196.00, 293.66],
    ];

    let chordIdx = 0;
    const initialChord = chords[0];

    interface OrganVoice {
      fundOsc: OscillatorNode;
      octaveOsc: OscillatorNode;
      quintOsc: OscillatorNode;
    }

    const organVoices: OrganVoice[] = [];

    initialChord.forEach((freq, vIdx) => {
      // 8' fundamental stop (warm triangle)
      const fundOsc = ctx.createOscillator();
      fundOsc.type = vIdx === 0 ? 'sine' : 'triangle';
      fundOsc.frequency.value = freq;

      // 4' octave stop (+3.5 cents for cathedral chorusing)
      const octaveOsc = ctx.createOscillator();
      octaveOsc.type = 'triangle';
      octaveOsc.frequency.value = freq * 2;
      octaveOsc.detune.value = 3.5;

      // 2 2/3' quint / twelfth stop (gives the pipe organ its sacred, liturgical timbre)
      const quintOsc = ctx.createOscillator();
      quintOsc.type = 'sine';
      quintOsc.frequency.value = freq * 3;
      quintOsc.detune.value = -4.0;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = vIdx === 0 ? 0.30 : 0.11;

      const octGain = ctx.createGain();
      octGain.gain.value = 0.35;
      const quintGain = ctx.createGain();
      quintGain.gain.value = 0.16;

      fundOsc.connect(voiceGain);
      octaveOsc.connect(octGain);
      octGain.connect(voiceGain);
      quintOsc.connect(quintGain);
      quintGain.connect(voiceGain);

      voiceGain.connect(organFilter);

      fundOsc.start();
      octaveOsc.start();
      quintOsc.start();

      this.activeNodes.push(fundOsc, octaveOsc, quintOsc, voiceGain, octGain, quintGain);
      organVoices.push({ fundOsc, octaveOsc, quintOsc });
    });

    // Chord transition interval (every 7 seconds, smoothly gliding like air through organ pipes)
    const chordInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      chordIdx = (chordIdx + 1) % chords.length;
      const chord = chords[chordIdx];
      const now = this.ctx.currentTime;
      organVoices.forEach((voice, vIdx) => {
        const targetFreq = chord[vIdx];
        voice.fundOsc.frequency.setTargetAtTime(targetFreq, now, 0.95);
        voice.octaveOsc.frequency.setTargetAtTime(targetFreq * 2, now, 0.95);
        voice.quintOsc.frequency.setTargetAtTime(targetFreq * 3, now, 0.95);
      });
    }, 7000);
    this.activeIntervals.push(chordInterval);

    // 3. Hypnotic "Cornfield Chase" Arpeggiator / Celestial Ostinato
    // Rapid, cycling cosmic arpeggio notes reflecting the current chord
    const arpeggioChords = [
      // Am
      [220.00, 329.63, 440.00, 523.25, 659.25, 523.25, 440.00, 329.63],
      // Fmaj7
      [174.61, 261.63, 349.23, 440.00, 523.25, 440.00, 349.23, 261.63],
      // Dm9
      [146.83, 220.00, 293.66, 349.23, 440.00, 523.25, 440.00, 293.66],
      // Em7
      [164.81, 246.94, 329.63, 392.00, 493.88, 392.00, 329.63, 246.94],
    ];

    let arpStep = 0;
    const playArpNote = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const currentArp = arpeggioChords[chordIdx];
      const freq = currentArp[arpStep % currentArp.length];
      arpStep++;

      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const noteEnv = this.ctx.createGain();
      const noteFilter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      overtone.type = 'sine';
      overtone.frequency.value = freq * 2;
      overtone.detune.value = 4.5;

      noteFilter.type = 'lowpass';
      noteFilter.frequency.value = 2400;

      // Pipe organ key touch: swift attack, ringing cathedral tail
      noteEnv.gain.setValueAtTime(0.0001, now);
      noteEnv.gain.linearRampToValueAtTime(0.07, now + 0.02);
      noteEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(noteEnv);
      overtone.connect(noteEnv);
      noteEnv.connect(noteFilter);
      noteFilter.connect(dest);
      noteFilter.connect(delayL);

      osc.start(now);
      overtone.start(now);
      osc.stop(now + 0.48);
      overtone.stop(now + 0.48);
    };

    const arpInterval = window.setInterval(playArpNote, 220);
    this.activeIntervals.push(arpInterval);

    // 4. "Miller's Planet" Cosmic Time Tick (Relativity clock pulse)
    // Subtle, muted high-pass click every 1.25s
    const playTimeTick = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;

      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      const clickFilter = this.ctx.createBiquadFilter();

      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(1400, now);
      clickOsc.frequency.exponentialRampToValueAtTime(180, now + 0.022);

      clickFilter.type = 'bandpass';
      clickFilter.frequency.value = 2800;
      clickFilter.Q.value = 2.0;

      clickGain.gain.setValueAtTime(0.035, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(dest);
      clickGain.connect(delayR);

      clickOsc.start(now);
      clickOsc.stop(now + 0.04);
    };

    const tickInterval = window.setInterval(playTimeTick, 1250);
    this.activeIntervals.push(tickInterval);

    // 5. Celestial High Shimmer (Otherworldly Starlight Horizon)
    const shimmerOsc1 = ctx.createOscillator();
    const shimmerOsc2 = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const shimmerFilter = ctx.createBiquadFilter();

    shimmerOsc1.type = 'sine';
    shimmerOsc1.frequency.value = 1046.5; // C6
    shimmerOsc1.detune.value = -3;

    shimmerOsc2.type = 'sine';
    shimmerOsc2.frequency.value = 1318.5; // E6
    shimmerOsc2.detune.value = 4;

    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.value = 1180;
    shimmerFilter.Q.value = 3.0;

    shimmerGain.gain.value = 0.025;

    shimmerOsc1.connect(shimmerFilter);
    shimmerOsc2.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(dest);
    shimmerGain.connect(delayR);

    shimmerOsc1.start();
    shimmerOsc2.start();

    this.activeNodes.push(shimmerOsc1, shimmerOsc2, shimmerGain, shimmerFilter);
  }
}

export const soundEngine = new AmbientSoundEngine();
