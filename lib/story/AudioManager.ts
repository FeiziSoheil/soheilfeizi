/**
 * AudioManager — Procedural Web Audio API soundscape for the 3D Story experience.
 * - Muted by default until the user explicitly enables Sound On.
 * - Dark, warm low-pass ambient harmonic drone with smooth fade-in / fade-out.
 * - Subtle crystalline/air morph whoosh when transitioning between chapters.
 */
class StoryAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private enabled = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  public start(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (!this.masterGain) {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      filter.connect(master);
      master.connect(ctx.destination);

      // Deep cinematic fifth + octave pad (D2, A2, E3, F#3 detuned)
      const freqs = [73.42, 110.0, 146.83, 164.81];
      const types: OscillatorType[] = ['sine', 'triangle', 'sine', 'sine'];
      const gains = [0.42, 0.24, 0.16, 0.1];

      this.oscs = freqs.map((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = types[idx];
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.detune.setValueAtTime((idx - 1.5) * 4.5, ctx.currentTime);
        g.gain.setValueAtTime(gains[idx], ctx.currentTime);
        osc.connect(g);
        g.connect(filter);
        osc.start();
        return osc;
      });

      // Slow breathing LFO on lowpass cutoff
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.09, ctx.currentTime);
      lfoGain.gain.setValueAtTime(110, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      this.lfo = lfo;
      this.filter = filter;
      this.masterGain = master;
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.11, now + 1.1);
    this.enabled = true;
  }

  public stop(): void {
    this.enabled = false;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  }

  public toggle(): boolean {
    if (this.enabled) {
      this.stop();
    } else {
      this.start();
    }
    return this.enabled;
  }

  /** Soft filtered air/harmonic tick when morphing into a new chapter */
  public playMorphChime(chapterIndex: number): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const pentatonic = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33];
    const freq = pentatonic[chapterIndex % pentatonic.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const bp = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.35);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq * 1.2, now);
    bp.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  public dispose(): void {
    this.stop();
    this.oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore
      }
    });
    this.oscs = [];
    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch {
        // ignore
      }
      this.lfo = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.filter = null;
  }
}

export const storyAudio = new StoryAudioManager();
