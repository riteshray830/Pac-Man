/**
 * PAC-MAN: INFINITE NEON - Unified Engine
 * Self-contained without external dependencies or module CORS issues.
 * Works flawlessly on both file:// and http:// protocols.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. MAZE CONSTANTS & PROCEDURAL MACRO-GENERATOR
  // ==========================================
  const TILE_EMPTY = 0;
  const TILE_DOT = 1;
  const TILE_POWER = 2;
  const TILE_WALL = 3;
  const TILE_GATE = 4;
  const TILE_HOUSE = 5;

  const COLS = 28;
  const ROWS = 31;

  const HOUSE_X = 10;
  const HOUSE_Y = 12;
  const HOUSE_W = 8;
  const HOUSE_H = 5;
  const TUNNEL_ROWS = [14];

  class MazeGenerator {
    static generate(level = 1) {
      let attempts = 0;
      while (attempts < 60) {
        attempts++;
        const result = this._tryGenerate(level, attempts);
        if (result) return result;
      }
      return this._createFallbackMaze();
    }

    static _tryGenerate(level, attempt) {
      const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_WALL));
      const halfCols = 14;

      const carveH = (r, c1, c2) => {
        for (let c = Math.max(1, c1); c <= Math.min(halfCols - 1, c2); c++) {
          grid[r][c] = TILE_DOT;
        }
      };

      const carveV = (c, r1, r2) => {
        for (let r = Math.max(1, r1); r <= Math.min(ROWS - 2, r2); r++) {
          if (r >= HOUSE_Y && r < HOUSE_Y + HOUSE_H && c >= HOUSE_X && c < halfCols) continue;
          grid[r][c] = TILE_DOT;
        }
      };

      const variantTop = (level + attempt) % 4;
      const variantMid = (level * 3 + attempt) % 3;
      const variantBot = (level * 7 + attempt) % 4;

      // Outer Perimeter Track
      carveH(1, 1, 13);
      carveV(1, 1, 29);
      carveH(29, 1, 13);

      // ZONE 1: TOP ARCHITECTURE (Rows 1 to 9)
      carveH(5, 1, 13); // Upper Highway

      if (variantTop === 0) {
        carveV(6, 1, 5);
        carveV(12, 1, 9);
        carveH(8, 2, 10);
        carveV(8, 5, 8);
      } else if (variantTop === 1) {
        carveV(5, 1, 9);
        carveV(9, 1, 5);
        carveH(8, 1, 6);
        carveH(8, 8, 13);
        carveV(12, 5, 9);
      } else if (variantTop === 2) {
        carveV(7, 1, 8);
        carveH(3, 8, 13);
        carveV(12, 1, 9);
        carveH(8, 1, 9);
      } else {
        carveV(4, 1, 8);
        carveV(9, 1, 8);
        carveH(7, 4, 13);
        carveV(13, 1, 5);
      }

      // ZONE 2: MID-UPPER & GHOST RING (Rows 9 to 12)
      carveH(10, 1, 8);
      carveV(6, 8, 13);
      carveH(11, 8, 13);
      carveV(8, 10, 18);

      // ZONE 3: GHOST HOUSE & TUNNELS (Rows 12 to 16)
      for (let r = HOUSE_Y; r < HOUSE_Y + HOUSE_H; r++) {
        for (let c = HOUSE_X; c < HOUSE_X + HOUSE_W; c++) {
          if (r === HOUSE_Y || r === HOUSE_Y + HOUSE_H - 1 || c === HOUSE_X || c === HOUSE_X + HOUSE_W - 1) {
            grid[r][c] = TILE_WALL;
          } else {
            grid[r][c] = TILE_HOUSE;
          }
        }
      }
      grid[HOUSE_Y][13] = TILE_GATE;
      grid[HOUSE_Y][14] = TILE_GATE;
      grid[HOUSE_Y - 1][13] = TILE_EMPTY;
      grid[HOUSE_Y - 1][14] = TILE_EMPTY;

      // Warp Tunnels
      for (const tRow of TUNNEL_ROWS) {
        for (let c = 0; c < 6; c++) grid[tRow][c] = TILE_EMPTY;
        grid[tRow - 1][0] = TILE_WALL;
        grid[tRow + 1][0] = TILE_WALL;
        carveV(5, 11, 17);
      }

      carveH(17, 8, 13);
      grid[17][13] = TILE_EMPTY;
      grid[17][14] = TILE_EMPTY;

      // ZONE 4: MID-LOWER & PAC-MAN SPAWN (Rows 18 to 23)
      carveH(20, 1, 13); // Middle Highway

      if (variantMid === 0) {
        carveV(3, 17, 23);
        carveV(9, 17, 20);
        carveV(12, 17, 23);
      } else if (variantMid === 1) {
        carveV(6, 17, 23);
        carveV(12, 20, 26);
        carveH(22, 1, 6);
      } else {
        carveV(4, 18, 23);
        carveV(8, 18, 23);
        carveV(11, 17, 20);
      }

      carveH(23, 1, 13);
      grid[23][13] = TILE_EMPTY;
      grid[23][14] = TILE_EMPTY;

      // ZONE 5: BOTTOM MAZE (Rows 24 to 29)
      carveH(26, 1, 13); // Lower Highway

      if (variantBot === 0) {
        carveV(6, 23, 29);
        carveV(12, 23, 26);
        carveV(3, 26, 29);
      } else if (variantBot === 1) {
        carveV(4, 23, 29);
        carveV(9, 26, 29);
        carveV(13, 26, 29);
      } else if (variantBot === 2) {
        carveV(3, 23, 26);
        carveV(8, 23, 29);
        carveV(12, 26, 29);
      } else {
        carveV(5, 23, 29);
        carveV(10, 23, 29);
      }

      // Loop Carving / Dead-end resolution
      for (let pass = 0; pass < 2; pass++) {
        for (let r = 2; r < ROWS - 2; r++) {
          for (let c = 2; c < halfCols; c++) {
            if (grid[r][c] === TILE_DOT) {
              let walls = 0;
              if (grid[r - 1][c] === TILE_WALL) walls++;
              if (grid[r + 1][c] === TILE_WALL) walls++;
              if (grid[r][c - 1] === TILE_WALL) walls++;
              if (grid[r][c + 1] === TILE_WALL) walls++;

              if (walls >= 3) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                  const nr = r + dr;
                  const nc = c + dc;
                  if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < halfCols) {
                    if (nr >= HOUSE_Y && nr < HOUSE_Y + HOUSE_H && nc >= HOUSE_X) continue;
                    grid[nr][nc] = TILE_DOT;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Mirror left half to right half
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < halfCols; c++) {
          const mirrorCol = COLS - 1 - c;
          if (c >= HOUSE_X && c < halfCols && r >= HOUSE_Y && r < HOUSE_Y + HOUSE_H) continue;
          grid[r][mirrorCol] = grid[r][c];
        }
      }

      for (let c = 0; c < COLS; c++) {
        grid[0][c] = TILE_WALL;
        grid[ROWS - 1][c] = TILE_WALL;
      }
      for (let r = 0; r < ROWS; r++) {
        if (!TUNNEL_ROWS.includes(r)) {
          grid[r][0] = TILE_WALL;
          grid[r][COLS - 1] = TILE_WALL;
        } else {
          grid[r][0] = TILE_EMPTY;
          grid[r][COLS - 1] = TILE_EMPTY;
        }
      }

      // Power Pellets in 4 outer alcoves
      const powerSpots = [[3, 1], [3, COLS - 2], [23, 1], [23, COLS - 2]];
      for (const [pr, pc] of powerSpots) {
        if (grid[pr][pc] !== TILE_WALL) {
          grid[pr][pc] = TILE_POWER;
        } else {
          let found = false;
          for (let dr = -2; dr <= 2 && !found; dr++) {
            for (let dc = -2; dc <= 2 && !found; dc++) {
              const tr = pr + dr;
              const tc = pc + dc;
              if (tr > 0 && tr < ROWS - 1 && tc > 0 && tc < COLS - 1 && grid[tr][tc] === TILE_DOT) {
                grid[tr][tc] = TILE_POWER;
                found = true;
              }
            }
          }
        }
      }

      // Flood-fill connectivity check
      const reachable = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      const queue = [[23, 13]];
      reachable[23][13] = true;

      let totalDotsAndPower = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === TILE_DOT || grid[r][c] === TILE_POWER) totalDotsAndPower++;
        }
      }

      let reachedDots = 0;
      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          let nr = cr + dr;
          let nc = cc + dc;

          if (TUNNEL_ROWS.includes(cr)) {
            if (nc < 0) nc = COLS - 1;
            if (nc >= COLS) nc = 0;
          }

          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (!reachable[nr][nc] && grid[nr][nc] !== TILE_WALL && grid[nr][nc] !== TILE_GATE && grid[nr][nc] !== TILE_HOUSE) {
              reachable[nr][nc] = true;
              queue.push([nr, nc]);
              if (grid[nr][nc] === TILE_DOT || grid[nr][nc] === TILE_POWER) reachedDots++;
            }
          }
        }
      }

      if (reachedDots < totalDotsAndPower * 0.96 || reachedDots < 140) return null;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((grid[r][c] === TILE_DOT || grid[r][c] === TILE_POWER) && !reachable[r][c]) {
            grid[r][c] = TILE_WALL;
          }
        }
      }

      let dotCount = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === TILE_DOT || grid[r][c] === TILE_POWER) dotCount++;
        }
      }

      const ghostStarts = {
        blinky: { x: 13.5, y: 11, dir: { x: -1, y: 0 } },
        pinky:  { x: 13.5, y: 14, dir: { x: 0, y: -1 } },
        inky:   { x: 11.5, y: 14, dir: { x: 0, y: -1 } },
        clyde:  { x: 15.5, y: 14, dir: { x: 0, y: -1 } }
      };

      const scatterTargets = {
        blinky: { x: COLS - 3, y: 0 },
        pinky:  { x: 2, y: 0 },
        inky:   { x: COLS - 1, y: ROWS - 1 },
        clyde:  { x: 0, y: ROWS - 1 }
      };

      return {
        grid,
        dotCount,
        pacmanStart: { x: 13.5, y: 23 },
        ghostStarts,
        scatterTargets,
        fruitSpot: { x: 13.5, y: 17 }
      };
    }

    static _createFallbackMaze() {
      const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_WALL));
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) grid[r][c] = TILE_DOT;
      }
      for (let r = HOUSE_Y; r < HOUSE_Y + HOUSE_H; r++) {
        for (let c = HOUSE_X; c < HOUSE_X + HOUSE_W; c++) {
          if (r === HOUSE_Y || r === HOUSE_Y + HOUSE_H - 1 || c === HOUSE_X || c === HOUSE_X + HOUSE_W - 1) {
            grid[r][c] = TILE_WALL;
          } else {
            grid[r][c] = TILE_HOUSE;
          }
        }
      }
      grid[HOUSE_Y][13] = TILE_GATE;
      grid[HOUSE_Y][14] = TILE_GATE;
      grid[HOUSE_Y - 1][13] = TILE_EMPTY;
      grid[HOUSE_Y - 1][14] = TILE_EMPTY;
      grid[3][1] = TILE_POWER;
      grid[3][COLS - 2] = TILE_POWER;
      grid[23][1] = TILE_POWER;
      grid[23][COLS - 2] = TILE_POWER;
      grid[14][0] = TILE_EMPTY;
      grid[14][COLS - 1] = TILE_EMPTY;

      let dotCount = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === TILE_DOT || grid[r][c] === TILE_POWER) dotCount++;
        }
      }

      return {
        grid,
        dotCount,
        pacmanStart: { x: 13.5, y: 23 },
        ghostStarts: {
          blinky: { x: 13.5, y: 11, dir: { x: -1, y: 0 } },
          pinky:  { x: 13.5, y: 14, dir: { x: 0, y: -1 } },
          inky:   { x: 11.5, y: 14, dir: { x: 0, y: -1 } },
          clyde:  { x: 15.5, y: 14, dir: { x: 0, y: -1 } }
        },
        scatterTargets: {
          blinky: { x: COLS - 3, y: 0 },
          pinky:  { x: 2, y: 0 },
          inky:   { x: COLS - 1, y: ROWS - 1 },
          clyde:  { x: 0, y: ROWS - 1 }
        },
        fruitSpot: { x: 13.5, y: 17 }
      };
    }
  }

  // ==========================================
  // 2. SYNTHESIZED WEB AUDIO ENGINE
  // ==========================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.sirenOsc = null;
      this.sirenGain = null;
      this.frightSirenOsc = null;
      this.frightSirenGain = null;
      this.wakaState = 0;
      this.lastWakaTime = 0;
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {
        console.warn('Audio not available', e);
      }
    }

    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted) this.stopSirens();
      return this.isMuted;
    }

    playWaka() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastWakaTime < 0.12) return;
      this.lastWakaTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
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

    playPowerPellet() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    playEatGhost() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [350, 440, 523, 659, 880, 1046];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.18, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.04 + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + (idx + 1) * 0.04 + 0.04);
      });
    }

    playEatFruit() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [587, 740, 880, 1174];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.25, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.14);
      });
    }

    playDeath() {
      if (this.isMuted || !this.ctx) return;
      this.stopSirens();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
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
    }

    playLevelStart() {
      if (this.isMuted || !this.ctx) return;
      this.stopSirens();
      const now = this.ctx.currentTime;
      const melody = [
        { f: 493.88, d: 0.12 }, { f: 987.77, d: 0.12 }, { f: 739.99, d: 0.12 },
        { f: 622.25, d: 0.12 }, { f: 987.77, d: 0.12 }, { f: 739.99, d: 0.18 },
        { f: 622.25, d: 0.24 }, { f: 523.25, d: 0.12 }, { f: 1046.5, d: 0.12 },
        { f: 783.99, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 1046.5, d: 0.12 },
        { f: 783.99, d: 0.18 }, { f: 659.25, d: 0.24 }
      ];

      let t = now;
      melody.forEach((note) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
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

    playLevelClear() {
      if (this.isMuted || !this.ctx) return;
      this.stopSirens();
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0.0 }, { f: 659.25, t: 0.1 }, { f: 783.99, t: 0.2 },
        { f: 1046.5, t: 0.3 }, { f: 1318.5, t: 0.45 }, { f: 1567.9, t: 0.6 }
      ];
      notes.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.2, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + 0.26);
      });
    }

    startSiren(remainingRatio = 1.0) {
      if (this.isMuted || !this.ctx) return;
      if (this.sirenOsc) {
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
        this.sirenLfo = this.ctx.createOscillator();
        this.sirenLfoGain = this.ctx.createGain();

        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(320, now);
        this.sirenLfo.frequency.setValueAtTime(2.5, now);
        this.sirenLfoGain.gain.setValueAtTime(60, now);

        this.sirenLfo.connect(this.sirenOsc.frequency);
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.gain.setValueAtTime(0.03, now);
        this.sirenGain.connect(this.ctx.destination);

        this.sirenOsc.start(now);
        this.sirenLfo.start(now);
      } catch (e) {}
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

        this.frightSirenOsc.type = 'triangle';
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
      } catch (e) {}
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

  const sound = new SoundEngine();

  // ==========================================
  // 3. PARTICLE & SCREEN JUICE SYSTEM
  // ==========================================
  class Particle {
    constructor(x, y, vx, vy, color, size, life, decay = 0.95, shape = 'circle') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.size = size;
      this.initialSize = size;
      this.life = life;
      this.decay = decay;
      this.shape = shape;
    }

    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= this.decay;
      this.vy *= this.decay;
      this.life -= dt * 1.5;
      this.size = this.initialSize * Math.max(0, this.life);
      return this.life > 0;
    }

    draw(ctx) {
      if (this.size <= 0.1) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.life));
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;

      if (this.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
      }
      ctx.restore();
    }
  }

  class RingShockwave {
    constructor(x, y, maxRadius, color, duration = 0.4) {
      this.x = x;
      this.y = y;
      this.radius = 2;
      this.maxRadius = maxRadius;
      this.color = color;
      this.duration = duration;
      this.elapsed = 0;
    }

    update(dt) {
      this.elapsed += dt;
      const progress = this.elapsed / this.duration;
      this.radius = 2 + (this.maxRadius - 2) * progress;
      return this.elapsed < this.duration;
    }

    draw(ctx) {
      const alpha = Math.max(0, 1 - (this.elapsed / this.duration));
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3 * alpha;
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color, duration = 0.8) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.duration = duration;
      this.elapsed = 0;
    }

    update(dt) {
      this.elapsed += dt;
      this.y -= 25 * dt;
      return this.elapsed < this.duration;
    }

    draw(ctx) {
      const alpha = Math.max(0, 1 - Math.pow(this.elapsed / this.duration, 2));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.shockwaves = [];
      this.floatingTexts = [];
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
    }

    screenShake(intensity = 6, duration = 0.2) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
    }

    getShakeOffset() {
      if (this.shakeDuration <= 0) return { x: 0, y: 0 };
      const dx = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      return { x: dx, y: dy };
    }

    spawnDotSparks(x, y, color = '#ffeb3b') {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 1.5 + Math.random() * 1.5, 0.3 + Math.random() * 0.2));
      }
    }

    spawnPowerPelletBurst(x, y) {
      this.screenShake(4, 0.25);
      this.shockwaves.push(new RingShockwave(x, y, 45, '#00e5ff', 0.45));
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.2);
        const speed = 1.5 + Math.random() * 3.0;
        const color = i % 2 === 0 ? '#00e5ff' : '#ffffff';
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 0.6, 0.94, 'star'));
      }
    }

    spawnGhostEatenBurst(x, y, ghostColor, score) {
      this.screenShake(8, 0.3);
      this.shockwaves.push(new RingShockwave(x, y, 35, ghostColor, 0.35));
      this.floatingTexts.push(new FloatingText(x, y - 5, `${score}`, '#00ffff', 0.9));
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 4.0;
        const color = Math.random() < 0.6 ? ghostColor : '#ffffff';
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 2.5 + Math.random() * 2, 0.7, 0.93));
      }
    }

    spawnFruitBurst(x, y, points) {
      this.floatingTexts.push(new FloatingText(x, y - 8, `${points}`, '#ff4081', 1.0));
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.5;
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ff4081', 2, 0.5));
      }
    }

    spawnPacmanDeathBurst(x, y) {
      this.screenShake(10, 0.5);
      this.shockwaves.push(new RingShockwave(x, y, 50, '#ffea00', 0.6));
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 3.5;
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ffea00', 2.5, 0.9, 0.92));
      }
    }

    spawnLevelClearStars(canvasWidth, canvasHeight) {
      const colors = ['#00e5ff', '#ffea00', '#ff007f', '#00ff66', '#ffffff'];
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * canvasWidth;
        const y = Math.random() * (canvasHeight * 0.7);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 4.0;
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 3, 1.2, 0.95, 'star'));
      }
    }

    update(dt) {
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
        if (this.shakeDuration <= 0) this.shakeIntensity = 0;
      }
      this.particles = this.particles.filter((p) => p.update(dt));
      this.shockwaves = this.shockwaves.filter((s) => s.update(dt));
      this.floatingTexts = this.floatingTexts.filter((t) => t.update(dt));
    }

    draw(ctx) {
      for (const sw of this.shockwaves) sw.draw(ctx);
      for (const p of this.particles) p.draw(ctx);
      for (const ft of this.floatingTexts) ft.draw(ctx);
    }

    clear() {
      this.particles = [];
      this.shockwaves = [];
      this.floatingTexts = [];
      this.shakeDuration = 0;
    }
  }

  // ==========================================
  // 4. GHOST AI SYSTEM
  // ==========================================
  const GHOST_MODE = {
    SCATTER: 'scatter',
    CHASE: 'chase',
    FRIGHTENED: 'frightened',
    EATEN: 'eaten'
  };

  const GHOST_NAMES = {
    BLINKY: 'blinky',
    PINKY: 'pinky',
    INKY: 'inky',
    CLYDE: 'clyde'
  };

  const GHOST_COLORS = {
    blinky: '#ff1744',
    pinky:  '#ff4081',
    inky:   '#00e5ff',
    clyde:  '#ff9100'
  };

  const DIRS_LIST = [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 }
  ];

  class Ghost {
    constructor(name, startX, startY, scatterX, scatterY, initialDir = { x: 0, y: -1 }) {
      this.name = name;
      this.startX = startX;
      this.startY = startY;
      this.x = startX;
      this.y = startY;
      this.dir = { ...initialDir };
      this.nextDir = { ...initialDir };
      this.scatterTarget = { x: scatterX, y: scatterY };
      this.color = GHOST_COLORS[name];
      this.mode = GHOST_MODE.SCATTER;
      this.previousMode = GHOST_MODE.SCATTER;
      this.baseSpeed = 7.5;
      this.speed = this.baseSpeed;
      this.frightTimer = 0;
      this.frightDuration = 7;
      this.isInHouse = name !== GHOST_NAMES.BLINKY;
      this.houseTimer = name === GHOST_NAMES.PINKY ? 1.0 : name === GHOST_NAMES.INKY ? 3.0 : 5.0;
      this.animTimer = 0;
    }

    reset(startConfig) {
      this.x = startConfig.x;
      this.y = startConfig.y;
      this.startX = startConfig.x;
      this.startY = startConfig.y;
      this.dir = { ...startConfig.dir };
      this.nextDir = { ...startConfig.dir };
      this.mode = GHOST_MODE.SCATTER;
      this.previousMode = GHOST_MODE.SCATTER;
      this.isInHouse = this.name !== GHOST_NAMES.BLINKY;
      this.houseTimer = this.name === GHOST_NAMES.PINKY ? 1.0 : this.name === GHOST_NAMES.INKY ? 3.0 : 5.0;
      this.speed = this.baseSpeed;
      this.frightTimer = 0;
    }

    makeFrightened(duration) {
      if (this.mode === GHOST_MODE.EATEN) return;
      if (this.mode !== GHOST_MODE.FRIGHTENED) {
        this.previousMode = this.mode;
        this.reverseDirection();
      }
      this.mode = GHOST_MODE.FRIGHTENED;
      this.frightDuration = duration;
      this.frightTimer = duration;
    }

    reverseDirection() {
      this.dir = { x: -this.dir.x, y: -this.dir.y };
    }

    getSpeed(grid, level, remainingDotsRatio) {
      if (this.mode === GHOST_MODE.EATEN) return 15.0;
      if (this.mode === GHOST_MODE.FRIGHTENED) return this.baseSpeed * 0.55;

      const curR = Math.floor(this.y);
      if (curR === 14 && (this.x < 5 || this.x > COLS - 6)) {
        return this.baseSpeed * 0.5;
      }

      let spd = this.baseSpeed + (level - 1) * 0.3;
      if (this.name === GHOST_NAMES.BLINKY && this.mode === GHOST_MODE.CHASE) {
        if (remainingDotsRatio < 0.1) spd *= 1.25;
        else if (remainingDotsRatio < 0.25) spd *= 1.15;
      }
      return spd;
    }

    update(dt, grid, pacman, blinky, remainingDotsRatio, globalMode, level) {
      this.animTimer += dt;

      if (this.isInHouse) {
        this.houseTimer -= dt;
        this.y += this.dir.y * 2.0 * dt;
        if (this.y > 14.5) {
          this.y = 14.5;
          this.dir.y = -1;
        } else if (this.y < 13.5) {
          this.y = 13.5;
          this.dir.y = 1;
        }
        if (this.houseTimer <= 0) {
          this.x = 13.5;
          this.y = 11;
          this.isInHouse = false;
          this.dir = { x: -1, y: 0 };
        }
        return;
      }

      if (this.mode === GHOST_MODE.FRIGHTENED) {
        this.frightTimer -= dt;
        if (this.frightTimer <= 0) {
          this.mode = this.previousMode || globalMode;
        }
      } else if (this.mode !== GHOST_MODE.EATEN) {
        this.mode = globalMode;
      }

      this.speed = this.getSpeed(grid, level, remainingDotsRatio);

      if (this.x < -0.5) this.x = COLS - 0.5;
      else if (this.x > COLS - 0.5) this.x = -0.5;

      const moveStep = this.speed * dt;
      this.moveWithGridAlign(moveStep, grid, pacman, blinky);

      if (this.mode === GHOST_MODE.EATEN) {
        const distToGate = Math.hypot(this.x - 13.5, this.y - 11);
        if (distToGate < 0.6) {
          this.mode = globalMode;
          this.dir = { x: 0, y: -1 };
        }
      }
    }

    moveWithGridAlign(step, grid, pacman, blinky) {
      const targetTile = this.getTargetTile(pacman, blinky);
      const curCol = Math.round(this.x);
      const curRow = Math.round(this.y);
      const distToCenter = Math.hypot(this.x - curCol, this.y - curRow);

      if (distToCenter <= step * 0.8 || this.isAtJunction(curCol, curRow, grid)) {
        if (this.dir.x !== 0) this.y = curRow;
        if (this.dir.y !== 0) this.x = curCol;

        const nextDir = this.chooseNextDirection(curCol, curRow, grid, targetTile);
        if (nextDir) this.dir = nextDir;
      }

      this.x += this.dir.x * step;
      this.y += this.dir.y * step;
    }

    isAtJunction(col, row, grid) {
      if (col < 1 || col >= COLS - 1 || row < 1 || row >= ROWS - 1) return false;
      let openings = 0;
      for (const d of DIRS_LIST) {
        const nc = col + d.x;
        const nr = row + d.y;
        if (this.canPass(nr, nc, grid)) openings++;
      }
      return openings > 2;
    }

    canPass(row, col, grid) {
      if (row === 14 && (col < 0 || col >= COLS)) return true;
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;

      const tile = grid[row][col];
      if (tile === TILE_WALL) return false;
      if (tile === TILE_GATE) return this.mode === GHOST_MODE.EATEN;
      if (tile === TILE_HOUSE && this.mode !== GHOST_MODE.EATEN) return false;
      return true;
    }

    chooseNextDirection(col, row, grid, target) {
      const validDirs = [];
      const reverseDir = { x: -this.dir.x, y: -this.dir.y };

      for (const d of DIRS_LIST) {
        if (d.x === reverseDir.x && d.y === reverseDir.y) continue;
        const nr = row + d.y;
        const nc = col + d.x;
        if (this.canPass(nr, nc, grid)) validDirs.push(d);
      }

      if (validDirs.length === 0) return reverseDir;
      if (this.mode === GHOST_MODE.FRIGHTENED) {
        return validDirs[Math.floor(Math.random() * validDirs.length)];
      }

      let bestDir = validDirs[0];
      let bestDist = Infinity;
      for (const d of validDirs) {
        const nextX = col + d.x;
        const nextY = row + d.y;
        const dist = Math.pow(nextX - target.x, 2) + Math.pow(nextY - target.y, 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestDir = d;
        }
      }
      return bestDir;
    }

    getTargetTile(pacman, blinky) {
      if (this.mode === GHOST_MODE.EATEN) return { x: 13.5, y: 11 };
      if (this.mode === GHOST_MODE.SCATTER) return this.scatterTarget;

      switch (this.name) {
        case GHOST_NAMES.BLINKY:
          return { x: pacman.x, y: pacman.y };
        case GHOST_NAMES.PINKY:
          return { x: pacman.x + pacman.dir.x * 4, y: pacman.y + pacman.dir.y * 4 };
        case GHOST_NAMES.INKY: {
          const spotX = pacman.x + pacman.dir.x * 2;
          const spotY = pacman.y + pacman.dir.y * 2;
          const vx = spotX - (blinky ? blinky.x : pacman.x);
          const vy = spotY - (blinky ? blinky.y : pacman.y);
          return { x: spotX + vx, y: spotY + vy };
        }
        case GHOST_NAMES.CLYDE: {
          const distToPacman = Math.hypot(this.x - pacman.x, this.y - pacman.y);
          return distToPacman > 8 ? { x: pacman.x, y: pacman.y } : this.scatterTarget;
        }
        default:
          return { x: pacman.x, y: pacman.y };
      }
    }
  }

  class GhostManager {
    constructor() {
      this.ghosts = [];
      this.modeTimer = 0;
      this.waveIndex = 0;
      this.currentGlobalMode = GHOST_MODE.SCATTER;
      this.waves = [
        { mode: GHOST_MODE.SCATTER, duration: 7 },
        { mode: GHOST_MODE.CHASE,   duration: 20 },
        { mode: GHOST_MODE.SCATTER, duration: 7 },
        { mode: GHOST_MODE.CHASE,   duration: 20 },
        { mode: GHOST_MODE.SCATTER, duration: 5 },
        { mode: GHOST_MODE.CHASE,   duration: 20 },
        { mode: GHOST_MODE.SCATTER, duration: 5 },
        { mode: GHOST_MODE.CHASE,   duration: Infinity }
      ];
    }

    init(levelData) {
      const starts = levelData.ghostStarts;
      const targets = levelData.scatterTargets;
      this.ghosts = [
        new Ghost(GHOST_NAMES.BLINKY, starts.blinky.x, starts.blinky.y, targets.blinky.x, targets.blinky.y, starts.blinky.dir),
        new Ghost(GHOST_NAMES.PINKY,  starts.pinky.x,  starts.pinky.y,  targets.pinky.x,  targets.pinky.y,  starts.pinky.dir),
        new Ghost(GHOST_NAMES.INKY,   starts.inky.x,   starts.inky.y,   targets.inky.x,   targets.inky.y,   starts.inky.dir),
        new Ghost(GHOST_NAMES.CLYDE,  starts.clyde.x,  starts.clyde.y,  targets.clyde.x,  targets.clyde.y,  starts.clyde.dir)
      ];
      this.modeTimer = 0;
      this.waveIndex = 0;
      this.currentGlobalMode = GHOST_MODE.SCATTER;
    }

    resetPositions(starts) {
      for (const ghost of this.ghosts) {
        if (starts[ghost.name]) ghost.reset(starts[ghost.name]);
      }
      this.modeTimer = 0;
      this.waveIndex = 0;
      this.currentGlobalMode = GHOST_MODE.SCATTER;
    }

    triggerFrightened(duration = 7) {
      for (const ghost of this.ghosts) {
        ghost.makeFrightened(duration);
      }
    }

    update(dt, grid, pacman, remainingDotsRatio, level) {
      const currentWave = this.waves[this.waveIndex];
      if (currentWave && currentWave.duration !== Infinity) {
        this.modeTimer += dt;
        if (this.modeTimer >= currentWave.duration) {
          this.modeTimer = 0;
          this.waveIndex = Math.min(this.waves.length - 1, this.waveIndex + 1);
          this.currentGlobalMode = this.waves[this.waveIndex].mode;
          for (const ghost of this.ghosts) {
            if (ghost.mode !== GHOST_MODE.FRIGHTENED && ghost.mode !== GHOST_MODE.EATEN) {
              ghost.reverseDirection();
            }
          }
        }
      }

      const blinky = this.ghosts.find((g) => g.name === GHOST_NAMES.BLINKY);
      for (const ghost of this.ghosts) {
        ghost.update(dt, grid, pacman, blinky, remainingDotsRatio, this.currentGlobalMode, level);
      }
    }

    hasFrightenedGhosts() {
      return this.ghosts.some((g) => g.mode === GHOST_MODE.FRIGHTENED);
    }
  }

  // ==========================================
  // 5. VISUAL CANVAS RENDERER & PROPORTIONAL HUD
  // ==========================================
  const LEVEL_THEMES = [
    { wallColor: '#00e5ff', wallGlow: 'rgba(0, 229, 255, 0.4)', bgDark: '#040b14', dotColor: '#fff9c4' },
    { wallColor: '#ff007f', wallGlow: 'rgba(255, 0, 127, 0.4)', bgDark: '#12040d', dotColor: '#ffebee' },
    { wallColor: '#00ff66', wallGlow: 'rgba(0, 255, 102, 0.4)', bgDark: '#031409', dotColor: '#e8f5e9' },
    { wallColor: '#ffb300', wallGlow: 'rgba(255, 179, 0, 0.4)', bgDark: '#140e02', dotColor: '#fffde7' },
    { wallColor: '#b388ff', wallGlow: 'rgba(179, 136, 255, 0.4)', bgDark: '#0e0417', dotColor: '#f3e5f5' }
  ];

  const FRUITS = [
    { name: 'Cherry', points: 100, color: '#ff1744' },
    { name: 'Strawberry', points: 300, color: '#ff4081' },
    { name: 'Orange', points: 500, color: '#ff9100' },
    { name: 'Apple', points: 700, color: '#f44336' },
    { name: 'Melon', points: 1000, color: '#00e676' },
    { name: 'Galaxian', points: 2000, color: '#ffea00' },
    { name: 'Bell', points: 3000, color: '#ffd600' },
    { name: 'Key', points: 5000, color: '#00e5ff' }
  ];

  const TOP_HUD_TILES = 3.0;
  const BOTTOM_TRAY_TILES = 2.5;
  const TOTAL_CANVAS_TILES = ROWS + TOP_HUD_TILES + BOTTOM_TRAY_TILES; // 36.5

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.tileSize = 20;
      this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      this.globalTime = 0;
    }

    resize(containerWidth, containerHeight) {
      const maxTsByW = Math.floor(containerWidth / COLS);
      const maxTsByH = Math.floor(containerHeight / TOTAL_CANVAS_TILES);
      this.tileSize = Math.max(6, Math.min(maxTsByW, maxTsByH));

      const canvasW = this.tileSize * COLS;
      const canvasH = Math.round(this.tileSize * TOTAL_CANVAS_TILES);

      this.canvas.style.width = `${canvasW}px`;
      this.canvas.style.height = `${canvasH}px`;
      this.canvas.width = canvasW * this.dpr;
      this.canvas.height = canvasH * this.dpr;

      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    getTheme(level) {
      const idx = (level - 1) % LEVEL_THEMES.length;
      return LEVEL_THEMES[idx];
    }

    getFruitForLevel(level) {
      const idx = Math.min(level - 1, FRUITS.length - 1);
      return FRUITS[idx];
    }

    render(gameState, dt) {
      this.globalTime += dt;
      const ctx = this.ctx;
      const ts = this.tileSize;
      const theme = this.getTheme(gameState.level);

      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, 0, TOTAL_CANVAS_TILES * ts);
      grad.addColorStop(0, '#020208');
      grad.addColorStop(0.5, theme.bgDark);
      grad.addColorStop(1, '#020208');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, COLS * ts, TOTAL_CANVAS_TILES * ts);

      const shake = gameState.particles.getShakeOffset();
      ctx.translate(shake.x, shake.y);

      // Offset maze cleanly below top HUD
      ctx.save();
      ctx.translate(0, TOP_HUD_TILES * ts);

      this.drawMaze(ctx, gameState.grid, theme, ts);
      this.drawPellets(ctx, gameState.grid, theme, ts);

      if (gameState.fruitActive && gameState.fruit) {
        this.drawFruit(ctx, gameState.fruitSpot.x * ts, gameState.fruitSpot.y * ts, gameState.fruit, ts);
      }

      gameState.particles.draw(ctx);

      // Draw Pac-Man whenever alive
      if (gameState.state !== 'gameover' && gameState.deathAnimProgress < 1.0) {
        this.drawPacman(ctx, gameState.pacman, ts, gameState.deathAnimProgress);
      }

      for (const ghost of gameState.ghostManager.ghosts) {
        this.drawGhost(ctx, ghost, ts);
      }

      ctx.restore();

      this.drawHUD(ctx, gameState, ts);
      this.drawOverlays(ctx, gameState, ts);
      ctx.restore();
    }

    drawMaze(ctx, grid, theme, ts) {
      ctx.save();
      ctx.strokeStyle = theme.wallColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = theme.wallGlow;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = grid[r][c];
          const x = c * ts;
          const y = r * ts;

          if (tile === TILE_WALL) {
            const isTop = r > 0 && grid[r - 1][c] === TILE_WALL;
            const isBottom = r < ROWS - 1 && grid[r + 1][c] === TILE_WALL;
            const isLeft = c > 0 && grid[r][c - 1] === TILE_WALL;
            const isRight = c < COLS - 1 && grid[r][c + 1] === TILE_WALL;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);

            ctx.beginPath();
            if (!isTop) { ctx.moveTo(x, y + 1); ctx.lineTo(x + ts, y + 1); }
            if (!isBottom) { ctx.moveTo(x, y + ts - 1); ctx.lineTo(x + ts, y + ts - 1); }
            if (!isLeft) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + ts); }
            if (!isRight) { ctx.moveTo(x + ts - 1, y); ctx.lineTo(x + ts - 1, y + ts); }
            ctx.stroke();
          } else if (tile === TILE_GATE) {
            ctx.save();
            ctx.strokeStyle = '#ff80ab';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff4081';
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.moveTo(x, y + ts * 0.5);
            ctx.lineTo(x + ts, y + ts * 0.5);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }

    drawPellets(ctx, grid, theme, ts) {
      const pulse = 0.5 + 0.5 * Math.sin(this.globalTime * 8);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = grid[r][c];
          const cx = (c + 0.5) * ts;
          const cy = (r + 0.5) * ts;

          if (tile === TILE_DOT) {
            ctx.save();
            ctx.fillStyle = theme.dotColor;
            ctx.shadowBlur = 4;
            ctx.shadowColor = theme.dotColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (tile === TILE_POWER) {
            ctx.save();
            const pRadius = 5.5 + pulse * 2.0;
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 14 + pulse * 6;
            ctx.shadowColor = '#00e5ff';

            ctx.beginPath();
            ctx.arc(cx, cy, pRadius + 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 255, ${0.3 * pulse})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, pRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    drawPacman(ctx, pacman, ts, deathAnimProgress) {
      const cx = (pacman.x + 0.5) * ts;
      const cy = (pacman.y + 0.5) * ts;
      const radius = ts * 0.46;

      ctx.save();
      ctx.translate(cx, cy);

      if (deathAnimProgress > 0) {
        const progress = Math.min(1.0, deathAnimProgress);
        const startAngle = -Math.PI / 2 + progress * Math.PI;
        const endAngle = -Math.PI / 2 - progress * Math.PI;

        ctx.fillStyle = '#ffea00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffea00';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius * (1 - progress * 0.4), startAngle, endAngle, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      let angle = 0;
      if (pacman.dir.x === 1)  angle = 0;
      if (pacman.dir.x === -1) angle = Math.PI;
      if (pacman.dir.y === 1)  angle = Math.PI / 2;
      if (pacman.dir.y === -1) angle = -Math.PI / 2;

      ctx.rotate(angle);

      const chompSpeed = pacman.isMoving ? 16 : 0;
      const bite = pacman.isMoving ? Math.abs(Math.sin(this.globalTime * chompSpeed)) * 0.28 * Math.PI : 0.05;

      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffea00';
      ctx.fillStyle = '#ffea00';

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, bite, Math.PI * 2 - bite);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-radius * 0.2, -radius * 0.3, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(radius * 0.1, -radius * 0.45, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawGhost(ctx, ghost, ts) {
      const cx = (ghost.x + 0.5) * ts;
      const cy = (ghost.y + 0.5) * ts;
      const r = ts * 0.45;

      ctx.save();
      ctx.translate(cx, cy);

      if (ghost.mode === GHOST_MODE.EATEN) {
        this.drawGhostEyes(ctx, ghost.dir, r);
        ctx.restore();
        return;
      }

      let bodyColor = ghost.color;
      let glowColor = ghost.color;

      if (ghost.mode === GHOST_MODE.FRIGHTENED) {
        const isEnding = ghost.frightTimer < 2.0;
        const flash = isEnding && Math.sin(this.globalTime * 14) > 0;
        bodyColor = flash ? '#ffffff' : '#1a237e';
        glowColor = flash ? '#ffffff' : '#283593';
      }

      ctx.shadowBlur = 10;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = bodyColor;

      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r, Math.PI, 0, false);
      ctx.lineTo(r, r * 0.7);

      const wave = Math.sin(ghost.animTimer * 12);
      const numTentacles = 3;
      const tentacleW = (r * 2) / numTentacles;

      for (let i = numTentacles; i > 0; i--) {
        const xEnd = -r + (i - 1) * tentacleW;
        const xMid = -r + (i - 0.5) * tentacleW;
        const offset = (i % 2 === 0 ? wave : -wave) * 2.0;
        ctx.quadraticCurveTo(xMid, r * 0.7 + 3 + offset, xEnd, r * 0.7);
      }

      ctx.lineTo(-r, -r * 0.2);
      ctx.closePath();
      ctx.fill();

      if (ghost.mode === GHOST_MODE.FRIGHTENED) {
        ctx.fillStyle = '#ff80ab';
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.2, 2.5, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff80ab';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, r * 0.25);
        ctx.lineTo(-r * 0.25, r * 0.15);
        ctx.lineTo(0, r * 0.25);
        ctx.lineTo(r * 0.25, r * 0.15);
        ctx.lineTo(r * 0.5, r * 0.25);
        ctx.stroke();
      } else {
        this.drawGhostEyes(ctx, ghost.dir, r);
      }

      ctx.restore();
    }

    drawGhostEyes(ctx, dir, r) {
      const lookX = dir.x * 2.0;
      const lookY = dir.y * 2.0;

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#ffffff';

      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.25, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(r * 0.35, -r * 0.25, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0000aa';
      ctx.beginPath();
      ctx.arc(-r * 0.35 + lookX, -r * 0.25 + lookY, r * 0.16, 0, Math.PI * 2);
      ctx.arc(r * 0.35 + lookX, -r * 0.25 + lookY, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    drawFruit(ctx, x, y, fruit, ts) {
      ctx.save();
      ctx.translate(x + ts * 0.5, y + ts * 0.5);
      ctx.shadowBlur = 10;
      ctx.shadowColor = fruit.color;

      const r = ts * 0.55;
      switch (fruit.name) {
        case 'Cherry':
          ctx.fillStyle = '#d50000';
          ctx.beginPath();
          ctx.arc(-r * 0.3, r * 0.2, r * 0.45, 0, Math.PI * 2);
          ctx.arc(r * 0.35, r * 0.3, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#76ff03';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-r * 0.3, -r * 0.1);
          ctx.quadraticCurveTo(0, -r * 0.7, r * 0.2, -r * 0.7);
          ctx.moveTo(r * 0.35, 0);
          ctx.quadraticCurveTo(0, -r * 0.7, r * 0.2, -r * 0.7);
          ctx.stroke();
          break;

        case 'Strawberry':
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.moveTo(0, r * 0.7);
          ctx.lineTo(-r * 0.5, -r * 0.2);
          ctx.quadraticCurveTo(0, -r * 0.5, r * 0.5, -r * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#00e676';
          ctx.fillRect(-r * 0.3, -r * 0.5, r * 0.6, r * 0.25);
          break;

        case 'Orange':
        case 'Peach':
          ctx.fillStyle = '#ff9100';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#76ff03';
          ctx.beginPath();
          ctx.ellipse(r * 0.2, -r * 0.55, r * 0.25, r * 0.12, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'Apple':
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.arc(-r * 0.2, 0, r * 0.45, 0, Math.PI * 2);
          ctx.arc(r * 0.2, 0, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#8d6e63';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.3);
          ctx.lineTo(r * 0.1, -r * 0.7);
          ctx.stroke();
          break;

        case 'Melon':
          ctx.fillStyle = '#00e676';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.65, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff1744';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.5, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();
          break;

        case 'Galaxian':
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.6);
          ctx.lineTo(r * 0.6, r * 0.5);
          ctx.lineTo(0, r * 0.2);
          ctx.lineTo(-r * 0.6, r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#00e5ff';
          ctx.fillRect(-r * 0.2, -r * 0.1, r * 0.4, r * 0.3);
          break;

        case 'Bell':
          ctx.fillStyle = '#ffd600';
          ctx.beginPath();
          ctx.arc(0, -r * 0.2, r * 0.4, Math.PI, 0, false);
          ctx.lineTo(r * 0.55, r * 0.4);
          ctx.lineTo(-r * 0.55, r * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, r * 0.45, r * 0.15, 0, Math.PI * 2);
          ctx.fill();
          break;

        default:
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(0, -r * 0.3, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-r * 0.1, -r * 0.1, r * 0.2, r * 0.8);
          ctx.fillRect(0, r * 0.2, r * 0.3, r * 0.15);
          ctx.fillRect(0, r * 0.45, r * 0.25, r * 0.15);
          break;
      }
      ctx.restore();
    }

    drawHUD(ctx, gameState, ts) {
      ctx.save();
      ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
      ctx.textBaseline = 'top';

      const labelY = ts * 0.4;
      const scoreY = ts * 1.4;

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00e5ff';
      ctx.fillText('1UP', 16, labelY);
      ctx.fillText('HIGH SCORE', COLS * ts * 0.5, labelY);

      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`${gameState.score.toString().padStart(6, '0')}`, 16, scoreY);
      ctx.fillText(`${gameState.highScore.toString().padStart(6, '0')}`, COLS * ts * 0.5, scoreY);

      const bottomBaseY = (TOP_HUD_TILES + ROWS + 0.3) * ts;

      for (let i = 0; i < gameState.lives; i++) {
        const lx = 16 + i * (ts * 1.3);
        ctx.save();
        ctx.translate(lx, bottomBaseY + ts * 0.55);
        ctx.fillStyle = '#ffea00';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffea00';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, ts * 0.42, 0.25 * Math.PI, 1.75 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P", monospace, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`LVL ${gameState.level}`, COLS * ts - 16, bottomBaseY + ts * 0.35);

      const curFruit = this.getFruitForLevel(gameState.level);
      this.drawFruit(ctx, COLS * ts - 64, bottomBaseY + ts * 0.1, curFruit, ts * 0.85);

      ctx.restore();
    }

    drawOverlays(ctx, gameState, ts) {
      const centerX = (COLS * ts) * 0.5;
      const centerY = (TOP_HUD_TILES + ROWS * 0.5) * ts;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (gameState.state === 'ready') {
        ctx.font = 'bold 20px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffea00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffea00';
        ctx.fillText('READY!', centerX, centerY + ts * 2.5);
      } else if (gameState.state === 'gameover') {
        ctx.font = 'bold 24px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ff1744';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff1744';
        ctx.fillText('GAME OVER', centerX, centerY + ts * 2);

        ctx.font = '11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fillText('PRESS ANY KEY TO RESTART', centerX, centerY + ts * 4.5);
      } else if (gameState.state === 'levelclear') {
        ctx.font = 'bold 20px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#00e5ff';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#00e5ff';
        ctx.fillText('LEVEL CLEARED!', centerX, centerY + ts * 2);

        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('GENERATING NEXT MAZE...', centerX, centerY + ts * 3.8);
      } else if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, COLS * ts, TOTAL_CANVAS_TILES * ts);

        ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00ffff';
        ctx.fillText('PAUSED', centerX, centerY);
      }
      ctx.restore();
    }
  }

  // ==========================================
  // 6. UNIVERSAL INPUT MANAGER
  // ==========================================
  const INPUT_DIRS = {
    UP:    { x: 0, y: -1, name: 'UP' },
    DOWN:  { x: 0, y: 1,  name: 'DOWN' },
    LEFT:  { x: -1, y: 0, name: 'LEFT' },
    RIGHT: { x: 1, y: 0,  name: 'RIGHT' }
  };

  const INPUT_ACTIONS = {
    PAUSE_TOGGLE: 'PAUSE_TOGGLE',
    RESTART: 'RESTART',
    MUTE_TOGGLE: 'MUTE_TOGGLE'
  };

  class InputManager {
    constructor(options = {}) {
      this.canvas = options.canvas || null;
      this.dpad = options.dpad || {};
      this.onAudioResume = options.onAudioResume || null;

      this.bufferedDirection = null;
      this.directionTimestamp = 0;
      this.bufferTimeoutMs = 350; // Cornering pre-turn forgiveness

      this.actionQueue = new Set();
      this.gamepadConnected = false;
      this.prevGamepadButtons = {};
      this.gamepadDeadzone = 0.30;

      this.isMouseDown = false;
      this.mouseStartX = 0;
      this.mouseStartY = 0;

      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchStartTime = 0;
      this.minSwipeDist = 20;

      this._handlers = [];

      if (typeof window !== 'undefined') {
        this._initKeyboard();
        this._initMouse();
        this._initTouchSwipe();
        this._initDpad();
        this._initGamepadEvents();
      }
    }

    queueDirection(dir) {
      if (!dir) return;
      this.bufferedDirection = dir;
      this.directionTimestamp = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (this.onAudioResume) this.onAudioResume();
    }

    queueAction(action) {
      if (!action) return;
      this.actionQueue.add(action);
      if (this.onAudioResume) this.onAudioResume();
    }

    consumeDirection() {
      if (!this.bufferedDirection) return null;
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (now - this.directionTimestamp > this.bufferTimeoutMs) {
        this.bufferedDirection = null;
        return null;
      }
      const dir = this.bufferedDirection;
      this.bufferedDirection = null;
      return dir;
    }

    consumeAction(action) {
      if (this.actionQueue.has(action)) {
        this.actionQueue.delete(action);
        return true;
      }
      return false;
    }

    update() {
      this._pollGamepad();
    }

    _initKeyboard() {
      const handleKeyDown = (e) => {
        if (this.onAudioResume) this.onAudioResume();

        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
          this.queueAction(INPUT_ACTIONS.PAUSE_TOGGLE);
          e.preventDefault();
          return;
        }

        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          this.queueAction(INPUT_ACTIONS.RESTART);
          if (e.key === ' ') e.preventDefault();
          return;
        }

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            this.queueDirection(INPUT_DIRS.UP);
            e.preventDefault();
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            this.queueDirection(INPUT_DIRS.DOWN);
            e.preventDefault();
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            this.queueDirection(INPUT_DIRS.LEFT);
            e.preventDefault();
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            this.queueDirection(INPUT_DIRS.RIGHT);
            e.preventDefault();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      this._handlers.push({ target: window, event: 'keydown', fn: handleKeyDown });
    }

    _initMouse() {
      if (!this.canvas) return;

      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        this.isMouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.mouseStartX = e.clientX - rect.left;
        this.mouseStartY = e.clientY - rect.top;
        this._steerByPoint(this.mouseStartX, this.mouseStartY, rect);
      };

      const onMouseMove = (e) => {
        if (!this.isMouseDown) return;
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const dx = currentX - this.mouseStartX;
        const dy = currentY - this.mouseStartY;
        if (Math.hypot(dx, dy) > 15) {
          this._steerByDelta(dx, dy);
        }
      };

      const onMouseUp = () => {
        this.isMouseDown = false;
      };

      this.canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      this._handlers.push({ target: this.canvas, event: 'mousedown', fn: onMouseDown });
      this._handlers.push({ target: window, event: 'mousemove', fn: onMouseMove });
      this._handlers.push({ target: window, event: 'mouseup', fn: onMouseUp });
    }

    _steerByPoint(x, y, rect) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      this._steerByDelta(dx, dy);
    }

    _steerByDelta(dx, dy) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 12) return;

      if (absX > absY) {
        this.queueDirection(dx > 0 ? INPUT_DIRS.RIGHT : INPUT_DIRS.LEFT);
      } else {
        this.queueDirection(dy > 0 ? INPUT_DIRS.DOWN : INPUT_DIRS.UP);
      }
    }

    _initTouchSwipe() {
      const target = this.canvas || window;

      const onTouchStart = (e) => {
        if (this.onAudioResume) this.onAudioResume();
        if (e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
          this.touchStartTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        }
      };

      const onTouchMove = (e) => {
        if (e.touches.length > 0) {
          const dx = e.touches[0].clientX - this.touchStartX;
          const dy = e.touches[0].clientY - this.touchStartY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          if (Math.max(absX, absY) > this.minSwipeDist) {
            if (absX > absY) {
              this.queueDirection(dx > 0 ? INPUT_DIRS.RIGHT : INPUT_DIRS.LEFT);
            } else {
              this.queueDirection(dy > 0 ? INPUT_DIRS.DOWN : INPUT_DIRS.UP);
            }
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
          }
        }
      };

      const onTouchEnd = (e) => {
        if (e.changedTouches.length > 0) {
          const dx = e.changedTouches[0].clientX - this.touchStartX;
          const dy = e.changedTouches[0].clientY - this.touchStartY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          if (Math.max(absX, absY) > 15) {
            if (absX > absY) {
              this.queueDirection(dx > 0 ? INPUT_DIRS.RIGHT : INPUT_DIRS.LEFT);
            } else {
              this.queueDirection(dy > 0 ? INPUT_DIRS.DOWN : INPUT_DIRS.UP);
            }
          } else {
            this.queueAction(INPUT_ACTIONS.RESTART);
          }
        }
      };

      target.addEventListener('touchstart', onTouchStart, { passive: true });
      target.addEventListener('touchmove', onTouchMove, { passive: true });
      target.addEventListener('touchend', onTouchEnd, { passive: true });

      this._handlers.push({ target, event: 'touchstart', fn: onTouchStart });
      this._handlers.push({ target, event: 'touchmove', fn: onTouchMove });
      this._handlers.push({ target, event: 'touchend', fn: onTouchEnd });
    }

    _initDpad() {
      const bindBtn = (el, dir) => {
        if (!el) return;
        const trigger = (e) => {
          if (e.cancelable) e.preventDefault();
          this.queueDirection(dir);
        };
        el.addEventListener('touchstart', trigger, { passive: false });
        el.addEventListener('mousedown', trigger);
        this._handlers.push({ target: el, event: 'touchstart', fn: trigger });
        this._handlers.push({ target: el, event: 'mousedown', fn: trigger });
      };

      if (this.dpad.up) bindBtn(this.dpad.up, INPUT_DIRS.UP);
      if (this.dpad.down) bindBtn(this.dpad.down, INPUT_DIRS.DOWN);
      if (this.dpad.left) bindBtn(this.dpad.left, INPUT_DIRS.LEFT);
      if (this.dpad.right) bindBtn(this.dpad.right, INPUT_DIRS.RIGHT);
    }

    _initGamepadEvents() {
      const onConnected = (e) => {
        this.gamepadConnected = true;
        console.log('[InputManager] Gamepad connected:', e.gamepad && e.gamepad.id);
      };
      const onDisconnected = (e) => {
        this.gamepadConnected = false;
        this.prevGamepadButtons = {};
        console.log('[InputManager] Gamepad disconnected:', e.gamepad && e.gamepad.id);
      };

      window.addEventListener('gamepadconnected', onConnected);
      window.addEventListener('gamepaddisconnected', onDisconnected);

      this._handlers.push({ target: window, event: 'gamepadconnected', fn: onConnected });
      this._handlers.push({ target: window, event: 'gamepaddisconnected', fn: onDisconnected });
    }

    _pollGamepad() {
      if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;

      const gamepads = navigator.getGamepads();
      if (!gamepads) return;

      let pad = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
          pad = gamepads[i];
          break;
        }
      }
      if (!pad) return;

      this.gamepadConnected = true;

      // 1. Digital D-Pad Buttons (12=Up, 13=Down, 14=Left, 15=Right)
      const btnUp = pad.buttons[12] && pad.buttons[12].pressed;
      const btnDown = pad.buttons[13] && pad.buttons[13].pressed;
      const btnLeft = pad.buttons[14] && pad.buttons[14].pressed;
      const btnRight = pad.buttons[15] && pad.buttons[15].pressed;

      if (btnUp) this.queueDirection(INPUT_DIRS.UP);
      else if (btnDown) this.queueDirection(INPUT_DIRS.DOWN);
      else if (btnLeft) this.queueDirection(INPUT_DIRS.LEFT);
      else if (btnRight) this.queueDirection(INPUT_DIRS.RIGHT);

      // 2. Analog Left Stick (Axes 0 = X, 1 = Y)
      if (pad.axes && pad.axes.length >= 2) {
        const stickX = pad.axes[0];
        const stickY = pad.axes[1];
        const absX = Math.abs(stickX);
        const absY = Math.abs(stickY);

        if (Math.max(absX, absY) > this.gamepadDeadzone) {
          if (absX > absY) {
            this.queueDirection(stickX > 0 ? INPUT_DIRS.RIGHT : INPUT_DIRS.LEFT);
          } else {
            this.queueDirection(stickY > 0 ? INPUT_DIRS.DOWN : INPUT_DIRS.UP);
          }
        }
      }

      // 3. Action Buttons with Edge Detection (Just Pressed)
      const isJustPressed = (btnIndex) => {
        const isDown = pad.buttons[btnIndex] && pad.buttons[btnIndex].pressed;
        const wasDown = !!this.prevGamepadButtons[btnIndex];
        this.prevGamepadButtons[btnIndex] = isDown;
        return isDown && !wasDown;
      };

      if (isJustPressed(9) || isJustPressed(8)) {
        this.queueAction(INPUT_ACTIONS.PAUSE_TOGGLE);
      }
      if (isJustPressed(0) || isJustPressed(1)) {
        this.queueAction(INPUT_ACTIONS.RESTART);
      }
    }

    destroy() {
      for (const h of this._handlers) {
        h.target.removeEventListener(h.event, h.fn);
      }
      this._handlers = [];
    }
  }

  // ==========================================
  // 7. MAIN GAME ENGINE
  // ==========================================
  const GAME_STATE = {
    READY: 'ready',
    PLAYING: 'playing',
    DYING: 'dying',
    LEVEL_CLEAR: 'levelclear',
    GAME_OVER: 'gameover'
  };

  const DIRS = INPUT_DIRS;

  class Game {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.renderer = new Renderer(canvas);
      this.particles = new ParticleSystem();
      this.ghostManager = new GhostManager();
      this.inputManager = options.inputManager || (canvas ? new InputManager({ canvas, onAudioResume: () => sound.resume() }) : null);

      this.level = 1;
      this.score = 0;
      const storedHighScore = (typeof localStorage !== 'undefined') ? localStorage.getItem('pacman_neon_highscore') : '0';
      this.highScore = parseInt(storedHighScore || '0', 10);
      this.lives = 3;
      this.extraLifeAwarded = false;

      this.state = GAME_STATE.READY;
      this.isPaused = false;
      this.hitStopTimer = 0;

      this.grid = [];
      this.totalDots = 0;
      this.remainingDots = 0;
      this.fruitActive = false;
      this.fruitTimer = 0;
      this.fruit = null;
      this.fruitEatenFirst = false;
      this.fruitEatenSecond = false;
      this.fruitSpot = { x: 13.5, y: 17 };

      this.pacman = {
        x: 13.5,
        y: 23,
        dir: { x: -1, y: 0 },
        nextDir: { x: -1, y: 0 },
        speed: 8.0,
        isMoving: false
      };

      this.ghostScoreMultiplier = 200;
      this.readyTimer = 2.0;
      this.deathAnimProgress = 0;
      this.deathTimer = 0;
      this.levelClearTimer = 0;
      this.lastTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

      this.startNewGame();
    }

    startNewGame() {
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.extraLifeAwarded = false;
      this.loadLevel(this.level);
    }

    loadLevel(lvl) {
      this.level = lvl;
      this.particles.clear();

      const levelData = MazeGenerator.generate(lvl);
      this.grid = levelData.grid;
      this.totalDots = levelData.dotCount;
      this.remainingDots = levelData.dotCount;
      this.pacmanStart = levelData.pacmanStart;
      this.fruitSpot = levelData.fruitSpot;
      this.levelData = levelData;

      this.fruit = this.renderer.getFruitForLevel(lvl);
      this.fruitActive = false;
      this.fruitEatenFirst = false;
      this.fruitEatenSecond = false;

      this.resetPositions();
      this.ghostManager.init(levelData);

      this.state = GAME_STATE.READY;
      this.readyTimer = 2.2;
      sound.stopSirens();
      sound.playLevelStart();
    }

    resetPositions() {
      this.pacman.x = this.pacmanStart.x;
      this.pacman.y = this.pacmanStart.y;
      this.pacman.dir = { x: -1, y: 0 };
      this.pacman.nextDir = { x: -1, y: 0 };
      this.pacman.isMoving = false;
      this.pacman.speed = 8.0 + (this.level - 1) * 0.25;
      this.deathAnimProgress = 0;
      this.deathTimer = 0;

      if (this.levelData) {
        this.ghostManager.resetPositions(this.levelData.ghostStarts);
      }
    }

    queueDirection(dir) {
      this.pacman.nextDir = dir;
      if (this.pacman.dir.x === -dir.x && this.pacman.dir.y === -dir.y) {
        this.pacman.dir = dir;
      }
    }

    canMove(x, y, dir) {
      let targetCol, targetRow;
      if (dir.x !== 0) {
        targetRow = Math.round(y);
        targetCol = Math.round(x + dir.x * 0.55);
      } else if (dir.y !== 0) {
        targetCol = Math.round(x);
        targetRow = Math.round(y + dir.y * 0.55);
      } else {
        return false;
      }

      if (targetRow === 14 && (targetCol < 0 || targetCol >= COLS)) return true;
      if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS) return false;

      const tile = this.grid[targetRow][targetCol];
      return tile !== TILE_WALL && tile !== TILE_GATE && tile !== TILE_HOUSE;
    }

    update(currentTime) {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      // Process Decoupled Hardware & Virtual Inputs
      if (this.inputManager) {
        this.inputManager.update();

        if (this.inputManager.consumeAction(INPUT_ACTIONS.PAUSE_TOGGLE)) {
          if (this.state === GAME_STATE.PLAYING) {
            this.isPaused = !this.isPaused;
          }
        }

        if (this.inputManager.consumeAction(INPUT_ACTIONS.RESTART)) {
          if (this.state === GAME_STATE.GAME_OVER) {
            this.startNewGame();
            return;
          }
        }

        const nextDir = this.inputManager.consumeDirection();
        if (nextDir) {
          this.queueDirection(nextDir);
        }
      }

      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
        if (this.renderer) this.renderer.render(this, dt);
        return;
      }

      if (this.particles) this.particles.update(dt);

      if (this.isPaused) {
        if (this.renderer) this.renderer.render(this, dt);
        return;
      }

      if (this.state === GAME_STATE.READY) {
        this.readyTimer -= dt;
        if (this.readyTimer <= 0) {
          this.state = GAME_STATE.PLAYING;
        }
      } else if (this.state === GAME_STATE.PLAYING) {
        this.updatePlaying(dt);
      } else if (this.state === GAME_STATE.DYING) {
        this.updateDying(dt);
      } else if (this.state === GAME_STATE.LEVEL_CLEAR) {
        this.updateLevelClear(dt);
      }

      if (this.renderer) this.renderer.render(this, dt);
    }

    updatePlaying(dt) {
      this.updatePacman(dt);

      const eatenDots = this.totalDots - this.remainingDots;
      if (!this.fruitEatenFirst && eatenDots >= 70) {
        this.fruitActive = true;
        this.fruitTimer = 10.0;
        this.fruitEatenFirst = true;
      }
      if (!this.fruitEatenSecond && eatenDots >= 170) {
        this.fruitActive = true;
        this.fruitTimer = 10.0;
        this.fruitEatenSecond = true;
      }

      if (this.fruitActive) {
        this.fruitTimer -= dt;
        if (this.fruitTimer <= 0) this.fruitActive = false;
      }

      const remainingRatio = this.remainingDots / Math.max(1, this.totalDots);
      this.ghostManager.update(dt, this.grid, this.pacman, remainingRatio, this.level);

      if (this.ghostManager.hasFrightenedGhosts()) {
        sound.startFrightSiren();
      } else {
        sound.startSiren(remainingRatio);
      }

      this.checkGhostCollisions();

      if (this.remainingDots <= 0) {
        this.triggerLevelClear();
      }
    }

    updatePacman(dt) {
      const p = this.pacman;
      const curCol = Math.round(p.x);
      const curRow = Math.round(p.y);
      const distToCenter = Math.hypot(p.x - curCol, p.y - curRow);

      if (p.nextDir.x !== p.dir.x || p.nextDir.y !== p.dir.y) {
        const canTurn = this.canMove(curCol, curRow, p.nextDir);
        if (canTurn && distToCenter < 0.4) {
          p.x = curCol;
          p.y = curRow;
          p.dir = { ...p.nextDir };
        }
      }

      if (this.canMove(p.x, p.y, p.dir)) {
        p.x += p.dir.x * p.speed * dt;
        p.y += p.dir.y * p.speed * dt;
        p.isMoving = true;
      } else {
        if (p.dir.x !== 0) p.x = curCol;
        if (p.dir.y !== 0) p.y = curRow;
        p.isMoving = false;
      }

      if (p.x < -0.5) {
        p.x = COLS - 0.5;
      } else if (p.x > COLS - 0.5) {
        p.x = -0.5;
      }

      const checkCol = Math.round(p.x);
      const checkRow = Math.round(p.y);

      if (checkRow >= 0 && checkRow < ROWS && checkCol >= 0 && checkCol < COLS) {
        const tile = this.grid[checkRow][checkCol];
        const cx = (checkCol + 0.5) * this.renderer.tileSize;
        const cy = (checkRow + 0.5) * this.renderer.tileSize;

        if (tile === TILE_DOT) {
          this.grid[checkRow][checkCol] = TILE_EMPTY;
          this.addScore(10);
          this.remainingDots--;
          sound.playWaka();
          this.particles.spawnDotSparks(cx, cy);
        } else if (tile === TILE_POWER) {
          this.grid[checkRow][checkCol] = TILE_EMPTY;
          this.addScore(50);
          this.remainingDots--;
          this.ghostScoreMultiplier = 200;
          sound.playPowerPellet();
          this.particles.spawnPowerPelletBurst(cx, cy);

          const frightTime = Math.max(3.0, 7.5 - (this.level - 1) * 0.6);
          this.ghostManager.triggerFrightened(frightTime);
        }

        if (this.fruitActive && checkRow === this.fruitSpot.y && Math.abs(checkCol - this.fruitSpot.x) < 1.0) {
          this.fruitActive = false;
          this.addScore(this.fruit.points);
          sound.playEatFruit();
          this.particles.spawnFruitBurst(cx, cy, this.fruit.points);
        }
      }
    }

    checkGhostCollisions() {
      for (const ghost of this.ghostManager.ghosts) {
        const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);
        if (dist < 0.75) {
          if (ghost.mode === GHOST_MODE.FRIGHTENED) {
            ghost.mode = GHOST_MODE.EATEN;
            const points = this.ghostScoreMultiplier;
            this.ghostScoreMultiplier *= 2;
            this.addScore(points);

            const gx = (ghost.x + 0.5) * this.renderer.tileSize;
            const gy = (ghost.y + 0.5) * this.renderer.tileSize;
            this.particles.spawnGhostEatenBurst(gx, gy, ghost.color, points);
            sound.playEatGhost();
            this.hitStopTimer = 0.08;
          } else if (ghost.mode !== GHOST_MODE.EATEN) {
            this.triggerDeath();
            break;
          }
        }
      }
    }

    triggerDeath() {
      this.state = 'dying';
      this.deathAnimProgress = 0;
      this.deathTimer = 1.8;
      sound.stopSirens();
      sound.playDeath();

      const px = (this.pacman.x + 0.5) * this.renderer.tileSize;
      const py = (this.pacman.y + 0.5) * this.renderer.tileSize;
      this.particles.spawnPacmanDeathBurst(px, py);
    }

    updateDying(dt) {
      this.deathTimer -= dt;
      this.deathAnimProgress += dt * 0.7;

      if (this.deathTimer <= 0) {
        this.lives--;
        if (this.lives > 0) {
          this.resetPositions();
          this.state = 'ready';
          this.readyTimer = 1.8;
        } else {
          this.state = 'gameover';
        }
      }
    }

    triggerLevelClear() {
      this.state = 'levelclear';
      this.levelClearTimer = 2.8;
      sound.stopSirens();
      sound.playLevelClear();
      this.particles.spawnLevelClearStars(this.canvas.width / this.renderer.dpr, this.canvas.height / this.renderer.dpr);
    }

    updateLevelClear(dt) {
      this.levelClearTimer -= dt;
      if (this.levelClearTimer <= 0) {
        this.loadLevel(this.level + 1);
      }
    }

    addScore(points) {
      this.score += points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('pacman_neon_highscore', this.highScore.toString());
      }

      if (!this.extraLifeAwarded && this.score >= 10000) {
        this.lives++;
        this.extraLifeAwarded = true;
      }
    }
  }

  // ==========================================
  // 8. RESPONSIVE CONTROLLER & BOOTSTRAPPER
  // ==========================================
  function initGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // D-Pad Element References
    const dpad = {
      up: document.getElementById('dpadUp'),
      down: document.getElementById('dpadDown'),
      left: document.getElementById('dpadLeft'),
      right: document.getElementById('dpadRight')
    };

    // Instantiate Unified Input Manager
    const inputManager = new InputManager({
      canvas,
      dpad,
      onAudioResume: () => sound.resume()
    });

    // Instantiate Game Engine with Input Manager
    const game = new Game(canvas, { inputManager });

    const headerEl = document.querySelector('.arcade-header');
    const footerEl = document.querySelector('.ghost-legend');
    const dpadEl = document.querySelector('.mobile-dpad');
    const bezelEl = document.querySelector('.screen-bezel');
    const btnPause = document.getElementById('btnPause');
    const btnSound = document.getElementById('btnSound');
    const helpModal = document.getElementById('helpModal');
    const btnHelp = document.getElementById('btnHelp');
    const btnCloseHelp = document.getElementById('btnCloseHelp');

    function handleResize() {
      const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 560;

      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let availWidth, availHeight;

      if (isLandscape) {
        // Landscape mobile: D-pad is flanked to the side
        const sideControlsW = (dpadEl && window.getComputedStyle(dpadEl).display !== 'none') ? 140 : 0;
        const headerH = headerEl ? headerEl.offsetHeight : 30;
        const footerH = footerEl ? footerEl.offsetHeight : 18;

        availWidth = Math.max(200, winW - sideControlsW - 36);
        availHeight = Math.max(200, winH - headerH - footerH - 16);
      } else {
        // Portrait or desktop: Stacked layout
        const headerH = headerEl ? headerEl.offsetHeight : 36;
        const footerH = footerEl ? footerEl.offsetHeight : 22;
        const isMobileDpad = dpadEl && window.getComputedStyle(dpadEl).display !== 'none';
        const dpadH = isMobileDpad ? (dpadEl.offsetHeight + 10) : 0;

        availWidth = Math.max(220, winW - 32);
        availHeight = Math.max(260, winH - headerH - footerH - dpadH - 22);
      }
 
      game.renderer.resize(availWidth, availHeight);

      // Lock marquee and footer width to screen bezel width for unified cabinet presentation
      if (bezelEl && headerEl) {
        const bezelWidth = bezelEl.offsetWidth;
        if (bezelWidth > 0) {
          headerEl.style.maxWidth = `${bezelWidth}px`;
          headerEl.style.width = '100%';
          if (footerEl) {
            footerEl.style.maxWidth = `${bezelWidth}px`;
            footerEl.style.width = '100%';
          }
        }
      }
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 60);
      setTimeout(handleResize, 250);
    });

    handleResize();
    setTimeout(handleResize, 80);
    setTimeout(handleResize, 300);

    function setButtonState(btn, icon, label) {
      if (!btn) return;
      const iconEl = btn.querySelector('.btn-icon');
      const labelEl = btn.querySelector('.btn-label');
      if (iconEl) iconEl.textContent = icon;
      if (labelEl) labelEl.textContent = ' ' + label;
    }

    if (btnSound) {
      btnSound.addEventListener('click', () => {
        sound.resume();
        const muted = sound.toggleMute();
        setButtonState(btnSound, muted ? '🔇' : '🔊', muted ? 'MUTED' : 'SOUND');
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        sound.resume();
        if (game.state === GAME_STATE.PLAYING) {
          game.isPaused = !game.isPaused;
          setButtonState(btnPause, game.isPaused ? '▶' : '⏸', game.isPaused ? 'RESUME' : 'PAUSE');
        }
      });
    }

    if (btnHelp && helpModal) {
      btnHelp.addEventListener('click', () => {
        helpModal.style.display = 'flex';
        if (game.state === GAME_STATE.PLAYING) {
          game.isPaused = true;
          setButtonState(btnPause, '▶', 'RESUME');
        }
      });
    }

    if (btnCloseHelp && helpModal) {
      btnCloseHelp.addEventListener('click', () => {
        helpModal.style.display = 'none';
        sound.resume();
      });
    }

    let lastPausedState = false;

    function loop(time) {
      game.update(time);

      // Keep Pause UI button synced with gamepad/keyboard pause triggers
      if (btnPause && game.isPaused !== lastPausedState) {
        lastPausedState = game.isPaused;
        setButtonState(btnPause, game.isPaused ? '▶' : '⏸', game.isPaused ? 'RESUME' : 'PAUSE');
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
