/**
 * Retro Chiptune Audio Synthesizer for Pac-Man
 * Uses Web Audio API exclusively - zero external assets needed.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.frightSirenOsc = null;
    this.frightSirenGain = null;
    this.wakaState = 0; // Alternates between 0 and 1
    this.lastWakaTime = 0;
    this.isInitialized = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSirens();
    }
    return this.isMuted;
  }

  // Plays the iconic Pac-Man "Waka Waka" chomp
  playWaka() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastWakaTime < 0.12) return; // Prevent overlapping spam
    this.lastWakaTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    const startFreq = this.wakaState === 0 ? 300 : 480;
    const endFreq = this.wakaState === 0 ? 460 : 320;
    this.wakaState = 1 - this.wakaState;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Power Pellet Eating
  playPowerPellet() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Eating a Ghost: Ascending energetic chime
  playEatGhost() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [350, 440, 523, 659, 880, 1046];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.04 + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + (idx + 1) * 0.04 + 0.04);
    });
  }

  // Eating Bonus Fruit
  playEatFruit() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [587, 740, 880, 1174];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.25, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.14);
    });
  }

  // Pac-Man Death Sound: Descending pitch disintegration whistle
  playDeath() {
    if (this.isMuted || !this.ctx) return;
    this.stopSirens();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    // Stepped pitch drop
    const stepDuration = 0.06;
    const pitches = [800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150];

    pitches.forEach((freq, idx) => {
      osc.frequency.setValueAtTime(freq, now + idx * stepDuration);
    });

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.2, now + pitches.length * stepDuration);
    gain.gain.exponentialRampToValueAtTime(0.001, now + pitches.length * stepDuration + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + pitches.length * stepDuration + 0.25);

    // Final "pop"
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const popNow = this.ctx.currentTime;
      popOsc.type = "square";
      popOsc.frequency.setValueAtTime(120, popNow);
      popOsc.frequency.exponentialRampToValueAtTime(40, popNow + 0.08);
      popGain.gain.setValueAtTime(0.3, popNow);
      popGain.gain.exponentialRampToValueAtTime(0.001, popNow + 0.08);
      popOsc.connect(popGain);
      popGain.connect(this.ctx.destination);
      popOsc.start(popNow);
      popOsc.stop(popNow + 0.08);
    }, pitches.length * stepDuration * 1000);
  }

  // Level Start Arcade Jingle
  playLevelStart() {
    if (this.isMuted || !this.ctx) return;
    this.stopSirens();
    const now = this.ctx.currentTime;
    const melody = [
      { f: 493.88, d: 0.12 }, // B4
      { f: 987.77, d: 0.12 }, // B5
      { f: 739.99, d: 0.12 }, // F#5
      { f: 622.25, d: 0.12 }, // D#5
      { f: 987.77, d: 0.12 }, // B5
      { f: 739.99, d: 0.18 }, // F#5
      { f: 622.25, d: 0.24 }, // D#5
      { f: 523.25, d: 0.12 }, // C5
      { f: 1046.5, d: 0.12 }, // C6
      { f: 783.99, d: 0.12 }, // G5
      { f: 659.25, d: 0.12 }, // E5
      { f: 1046.5, d: 0.12 }, // C6
      { f: 783.99, d: 0.18 }, // G5
      { f: 659.25, d: 0.24 }  // E5
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d - 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.d);

      t += note.d;
    });
  }

  // Level Clear Victory Jingle
  playLevelClear() {
    if (this.isMuted || !this.ctx) return;
    this.stopSirens();
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0 },
      { f: 659.25, t: 0.1 },
      { f: 783.99, t: 0.2 },
      { f: 1046.5, t: 0.3 },
      { f: 1318.5, t: 0.45 },
      { f: 1567.9, t: 0.6 }
    ];

    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.2, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + 0.26);
    });
  }

  // Ambient Siren Background Loop (Pitch & Rate scales with remaining pellets)
  startSiren(remainingRatio = 1.0) {
    if (this.isMuted || !this.ctx) return;
    if (this.sirenOsc) {
      // Adjust modulation frequency & depth
      const modRate = 2.0 + (1.0 - remainingRatio) * 4.0;
      if (this.sirenLfo) {
        this.sirenLfo.frequency.setValueAtTime(modRate, this.ctx.currentTime);
      }
      return;
    }

    try {
      const now = this.ctx.currentTime;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      // LFO for pitch modulation
      this.sirenLfo = this.ctx.createOscillator();
      this.sirenLfoGain = this.ctx.createGain();

      this.sirenOsc.type = "sawtooth";
      this.sirenOsc.frequency.setValueAtTime(320, now);

      this.sirenLfo.frequency.setValueAtTime(2.5, now);
      this.sirenLfoGain.gain.setValueAtTime(60, now);

      this.sirenLfo.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.sirenGain);

      this.sirenGain.gain.setValueAtTime(0.03, now);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start(now);
      this.sirenLfo.start(now);
    } catch (e) {
      console.warn("Siren start error", e);
    }
  }

  startFrightSiren() {
    this.stopSirens();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.frightSirenOsc = this.ctx.createOscillator();
      this.frightSirenGain = this.ctx.createGain();

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      this.frightSirenOsc.type = "triangle";
      this.frightSirenOsc.frequency.setValueAtTime(140, now);

      lfo.frequency.setValueAtTime(4.0, now);
      lfoGain.gain.setValueAtTime(40, now);

      lfo.connect(this.frightSirenOsc.frequency);
      this.frightSirenOsc.connect(this.frightSirenGain);

      this.frightSirenGain.gain.setValueAtTime(0.06, now);
      this.frightSirenGain.connect(this.ctx.destination);

      this.frightSirenOsc.start(now);
      lfo.start(now);

      this.frightLfo = lfo;
    } catch (e) {
      console.warn("Fright siren error", e);
    }
  }

  stopSirens() {
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenLfo.stop();
        this.sirenLfo.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
      this.sirenLfo = null;
    }

    if (this.frightSirenOsc) {
      try {
        this.frightSirenOsc.stop();
        this.frightSirenOsc.disconnect();
        this.frightLfo.stop();
        this.frightLfo.disconnect();
      } catch (e) {}
      this.frightSirenOsc = null;
      this.frightLfo = null;
    }
  }
}

export const sound = new SoundEngine();
