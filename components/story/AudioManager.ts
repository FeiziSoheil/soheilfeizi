/**
 * AudioManager
 * Pure procedural Web Audio API engine for the 3D Story Experience (zero external files).
 * - Low-volume warm ambient harmonic drone with smooth fade-in / fade-out
 * - Delicate crystalline morph shimmer chime on chapter transitions
 * - Defaults to OFF until user enables audio via Gate or HUD
 */
export class StoryAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscs: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private enabled = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    if (on) {
      this.start();
    } else {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private start(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.enabled = true;
    const now = ctx.currentTime;

    if (!this.masterGain) {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      filter.Q.setValueAtTime(1.4, now);

      // Slow organic filter breathing LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08, now);
      lfoGain.gain.setValueAtTime(110, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      this.lfo = lfo;

      filter.connect(master);
      master.connect(ctx.destination);
      this.masterGain = master;

      // Subtle warm open-fifth pad (D2, A2, E3, slightly detuned)
      const freqs = [73.42, 110.0, 164.81, 110.55];
      this.oscs = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(i === 0 ? 0.24 : 0.11, now);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        return osc;
      });
    }

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.11, now + 1.2);
  }

  private stop(): void {
    this.enabled = false;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  }

  /** Delicate low-volume harmonic shimmer when morphing between story chapters */
  public playMorphChime(chapterIndex: number): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const scale = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const freq = scale[chapterIndex % scale.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.45);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.56);
  }

  public dispose(): void {
    this.stop();
    try {
      this.oscs.forEach((o) => o.stop());
      this.lfo?.stop();
      void this.ctx?.close();
    } catch {
      // ignore close errors
    }
    this.oscs = [];
    this.lfo = null;
    this.masterGain = null;
    this.ctx = null;
  }
}
