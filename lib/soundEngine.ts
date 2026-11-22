// 100% Procedural Web Audio Ambient Synthesizer (Zero external audio files / Zero 404s)
// Supports 3 distinct Drift ambient soundscapes, real-time analyser levels, and tactile UI micro-ticks.

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private isPlaying = false;
  private currentTrack = 1;
  private freqBuffer = new Uint8Array(32);

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

  public start(trackIndex = this.currentTrack) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.clearActiveTrack();
    this.currentTrack = trackIndex;
    this.isPlaying = true;

    const trackBus = ctx.createGain();
    trackBus.gain.value = 0.45;
    trackBus.connect(this.masterGain);
    this.activeNodes.push(trackBus);

    if (trackIndex === 0) {
      this.buildWarmAnalogDrift(ctx, trackBus);
    } else if (trackIndex === 1) {
      this.buildMidnightRainRhodes(ctx, trackBus);
    } else {
      this.buildSubZeroGlass(ctx, trackBus);
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.32, now, 0.7);
  }

  public stop() {
    if (!this.ctx || !this.masterGain) {
      this.isPlaying = false;
      return;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.35);
    this.isPlaying = false;
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
    if (!this.isPlaying || !this.analyser) {
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

  // Track 0: Warm Analog Tape Drift
  private buildWarmAnalogDrift(ctx: AudioContext, dest: AudioNode) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 1.4;
    filter.connect(dest);
    this.activeNodes.push(filter);

    // Slow breathing filter LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.activeNodes.push(lfo, lfoGain);

    // Warm detuned open fifth chord (D2, A2, D3, F#3, A3)
    const freqs = [73.42, 110.0, 146.83, 185.0, 220.0];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      osc.detune.value = (idx - 2) * 5.5;
      gain.gain.value = idx === 0 ? 0.22 : 0.11;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, gain);
    });
  }

  // Track 1: Midnight Rain & Generative Rhodes
  private buildMidnightRainRhodes(ctx: AudioContext, dest: AudioNode) {
    // Filtered pink-ish rain bed
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.35;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 820;
    rainFilter.Q.value = 0.55;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.18;

    noise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(dest);
    noise.start();
    this.activeNodes.push(noise, rainFilter, rainGain);

    // Generative soft Rhodes minor-9th notes
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 493.88];
    const playPluck = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = ctx.currentTime;
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      overtone.type = 'triangle';
      overtone.frequency.value = freq * 2;
      const otGain = ctx.createGain();
      otGain.gain.value = 0.15;

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.16, now + 0.06);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(env);
      overtone.connect(otGain);
      otGain.connect(env);
      env.connect(dest);
      osc.start(now);
      overtone.start(now);
      osc.stop(now + 2.9);
      overtone.stop(now + 2.9);
    };

    playPluck();
    const interval = window.setInterval(playPluck, 2400);
    this.activeIntervals.push(interval);
  }

  // Track 2: Sub-Zero Glass
  private buildSubZeroGlass(ctx: AudioContext, dest: AudioNode) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.connect(dest);
    this.activeNodes.push(filter);

    const freqs = [65.41, 130.81, 196.0, 293.66, 392.0, 587.33];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = idx * 3 - 7;
      g.gain.value = idx < 2 ? 0.16 : 0.05;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      this.activeNodes.push(osc, g);
    });
  }
}

export const soundEngine = new AmbientSoundEngine();
