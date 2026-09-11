/**
 * PAC-MAN: INFINITE NEON - Main Game Controller & Physics Engine
 */

import { MazeGenerator, TILE_EMPTY, TILE_DOT, TILE_POWER, TILE_WALL, TILE_GATE, TILE_HOUSE, COLS, ROWS } from './mazeGenerator.js';
import { GhostManager, GHOST_MODE } from './ghostAI.js';
import { sound } from './audio.js';
import { ParticleSystem } from './particles.js';
import { Renderer, FRUITS } from './renderer.js';
import { InputManager, INPUT_DIRS, INPUT_ACTIONS } from './inputManager.js';

export const GAME_STATE = {
  READY: 'ready',
  PLAYING: 'playing',
  DYING: 'dying',
  LEVEL_CLEAR: 'levelclear',
  GAME_OVER: 'gameover'
};

const DIRS = INPUT_DIRS;

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.particles = new ParticleSystem();
    this.ghostManager = new GhostManager();
    this.inputManager = options.inputManager || (canvas ? new InputManager({ canvas, onAudioResume: () => sound.resume() }) : null);

    // Game state
    this.level = 1;
    this.score = 0;
    const storedHighScore = (typeof localStorage !== 'undefined') ? localStorage.getItem('pacman_neon_highscore') : '0';
    this.highScore = parseInt(storedHighScore || '0', 10);
    this.lives = 3;
    this.extraLifeAwarded = false;

    this.state = GAME_STATE.READY;
    this.isPaused = false;
    this.hitStopTimer = 0;

    // Maze grid & items
    this.grid = [];
    this.totalDots = 0;
    this.remainingDots = 0;
    this.fruitActive = false;
    this.fruitTimer = 0;
    this.fruit = null;
    this.fruitEatenFirst = false;
    this.fruitEatenSecond = false;
    this.fruitSpot = { x: 13.5, y: 17 };

    // Pac-Man entity
    this.pacman = {
      x: 13.5,
      y: 23,
      dir: { x: -1, y: 0 },
      nextDir: { x: -1, y: 0 },
      speed: 8.0,
      isMoving: false
    };

    // Ghost combo multiplier (200, 400, 800, 1600)
    this.ghostScoreMultiplier = 200;

    // Timing & animation
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

    // Generate brand-new procedural maze
    const levelData = MazeGenerator.generate(lvl);
    this.grid = levelData.grid;
    this.totalDots = levelData.dotCount;
    this.remainingDots = levelData.dotCount;
    this.pacmanStart = levelData.pacmanStart;
    this.fruitSpot = levelData.fruitSpot;

    // Setup fruit
    this.fruit = this.renderer.getFruitForLevel(lvl);
    this.fruitActive = false;
    this.fruitEatenFirst = false;
    this.fruitEatenSecond = false;
    this.levelData = levelData;

    // Setup entities
    this.resetPositions();
    this.ghostManager.init(levelData);

    // Ready state
    this.state = 'ready';
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
    // Immediate 180 reverse response without waiting for tile alignment
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

    // Tunnel wrap rows
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

    // Handle Hit-Stop Micro Freeze
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
    // 1. Move Pac-Man with cornering buffer / junction assist
    this.updatePacman(dt);

    // 2. Fruit spawn triggers (at 70 dots eaten and 170 dots eaten)
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
      if (this.fruitTimer <= 0) {
        this.fruitActive = false;
      }
    }

    // 3. Update Ghosts
    const remainingRatio = this.remainingDots / Math.max(1, this.totalDots);
    this.ghostManager.update(dt, this.grid, this.pacman, remainingRatio, this.level);

    // 4. Update Audio Sirens
    if (this.ghostManager.hasFrightenedGhosts()) {
      sound.startFrightSiren();
    } else {
      sound.startSiren(remainingRatio);
    }

    // 5. Ghost Collisions
    this.checkGhostCollisions();

    // 6. Check Level Victory
    if (this.remainingDots <= 0) {
      this.triggerLevelClear();
    }
  }

  updatePacman(dt) {
    const p = this.pacman;
    const curCol = Math.round(p.x);
    const curRow = Math.round(p.y);
    const distToCenter = Math.hypot(p.x - curCol, p.y - curRow);

    // Cornering assist: Can we turn in the queued nextDir?
    if (p.nextDir.x !== p.dir.x || p.nextDir.y !== p.dir.y) {
      const canTurn = this.canMove(curCol, curRow, p.nextDir);
      if (canTurn && distToCenter < 0.35) {
        // Snap to center and execute turn
        p.x = curCol;
        p.y = curRow;
        p.dir = { ...p.nextDir };
      }
    }

    // Move along current direction if clear
    if (this.canMove(p.x, p.y, p.dir)) {
      p.x += p.dir.x * p.speed * dt;
      p.y += p.dir.y * p.speed * dt;
      p.isMoving = true;
    } else {
      // Stopped by wall - align cleanly to tile center
      if (p.dir.x !== 0) p.x = curCol;
      if (p.dir.y !== 0) p.y = curRow;
      p.isMoving = false;
    }

    // Tunnel wrap-around
    if (p.x < -0.5) {
      p.x = COLS - 0.5;
    } else if (p.x > COLS - 0.5) {
      p.x = -0.5;
    }

    // Pellet eating check
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
        this.ghostScoreMultiplier = 200; // Reset ghost combo
        sound.playPowerPellet();
        this.particles.spawnPowerPelletBurst(cx, cy);

        // Frightened duration scales down as level advances (7s -> 3s)
        const frightTime = Math.max(3.0, 7.5 - (this.level - 1) * 0.6);
        this.ghostManager.triggerFrightened(frightTime);
      }

      // Fruit collision
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
          // Pac-Man eats Ghost!
          ghost.mode = GHOST_MODE.EATEN;
          const points = this.ghostScoreMultiplier;
          this.ghostScoreMultiplier *= 2; // Next ghost in chain is worth double
          this.addScore(points);

          const gx = (ghost.x + 0.5) * this.renderer.tileSize;
          const gy = (ghost.y + 0.5) * this.renderer.tileSize;
          this.particles.spawnGhostEatenBurst(gx, gy, ghost.color, points);
          sound.playEatGhost();

          // Arcade Hit-Stop punch
          this.hitStopTimer = 0.08;
        } else if (ghost.mode !== GHOST_MODE.EATEN) {
          // Ghost catches Pac-Man
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

    // Extra life at 10,000 points
    if (!this.extraLifeAwarded && this.score >= 10000) {
      this.lives++;
      this.extraLifeAwarded = true;
    }
  }
}
