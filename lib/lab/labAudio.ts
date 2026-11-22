/**
 * Procedural Web Audio synthesizer for ScrollEngine & Seed/Bloom physics (Zero external files).
 * - Scroll tick every 120px with pitch proportional to scroll speed
 * - Deeper boundary thump when crossing section gates
 * - Short airy whoosh on Seed, sub-bass pulse on Bloom (volume scaled by scroll speed)
 */
class LabAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private lastWhooshAt = 0;
  private lastBloomAt = 0;
  private droneOsc: OscillatorNode | null = null;
  private droneSubOsc: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.ensureContext();
    } else {
      this.stopSingularityDrone();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subtle deep gravitational resonance that rises smoothly as the black/white hole grows.
   * Strictly silent unless Sound is ON, AudioContext is running, and user is actively scrubbing.
   */
  public updateSingularityDrone(
    active: boolean,
    radiusNorm: number,
    direction: 'black-hole' | 'white-hole' | 'none',
    speedNorm: number
  ) {
    if (!this.enabled || !active || direction === 'none') {
      this.fadeSingularityDrone();
      return;
    }

    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    if (!this.droneOsc || !this.droneGain || !this.droneFilter || !this.droneSubOsc) {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      subOsc.type = 'triangle';
      osc.frequency.value = 46;
      subOsc.frequency.value = 92;

      filter.type = 'lowpass';
      filter.frequency.value = 140;
      filter.Q.value = 2.2;

      gain.gain.value = 0.0001;

      const subGain = ctx.createGain();
      subGain.gain.value = 0.28;

      osc.connect(filter);
      subOsc.connect(subGain);
      subGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      subOsc.start();

      this.droneOsc = osc;
      this.droneSubOsc = subOsc;
      this.droneFilter = filter;
      this.droneGain = gain;
    }

    const now = ctx.currentTime;
    const r = Math.max(0, Math.min(1, radiusNorm));
    const isWhite = direction === 'white-hole';

    // Gentle pitch rise as the circle expands (black hole: deeper sub, white hole: slightly brighter)
    const baseFreq = isWhite ? 56 + r * 54 : 42 + r * 44;
    const cutoff = isWhite ? 160 + r * 260 : 110 + r * 190;
    const arc = Math.sin(r * Math.PI);
    const motionGate = Math.min(1, 0.12 + speedNorm * 1.4);
    const targetGain = Math.max(0.0001, arc * motionGate * 0.048);

    this.droneOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.droneSubOsc.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.08);
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, 0.09);
    this.droneGain.gain.setTargetAtTime(targetGain, now, 0.09);
  }

  private fadeSingularityDrone() {
    if (!this.ctx || !this.droneGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.0001, now, 0.08);
  }

  public stopSingularityDrone() {
    if (this.droneGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.droneGain.gain.setTargetAtTime(0.0001, now, 0.04);
    }
    try {
      this.droneOsc?.stop();
      this.droneSubOsc?.stop();
      this.droneOsc?.disconnect();
      this.droneSubOsc?.disconnect();
      this.droneFilter?.disconnect();
      this.droneGain?.disconnect();
    } catch {
      // ignore already-stopped nodes
    }
    this.droneOsc = null;
    this.droneSubOsc = null;
    this.droneFilter = null;
    this.droneGain = null;
  }

  public playScrollTick(speedNorm: number) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 260 + Math.min(1, speedNorm) * 420;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.62, now + 0.022);

    const vol = 0.012 + Math.min(1, speedNorm) * 0.016;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playBoundaryThump(speedNorm: number) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(44, now + 0.14);

    const vol = 0.035 + Math.min(1, speedNorm) * 0.035;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSeedWhoosh(speedNorm: number) {
    if (!this.enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWhooshAt < 500) return;
    this.lastWhooshAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.28;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + dur);

    const gain = ctx.createGain();
    const vol = 0.04 + Math.min(1, speedNorm) * 0.06;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.02);
  }

  public playBloomPulse(speedNorm: number) {
    if (!this.enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastBloomAt < 550) return;
    this.lastBloomAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(76, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.42);

    const vol = 0.05 + Math.min(1, speedNorm) * 0.07;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.48);
  }
}

export const labAudio = new LabAudioEngine();
