/**
 * Intelligent Ghost Personalities and AI State Machine
 * Faithful implementation of Blinky, Pinky, Inky, and Clyde with arcade nuances
 */

import { TILE_WALL, TILE_GATE, TILE_HOUSE, COLS, ROWS } from './mazeGenerator.js';

export const GHOST_MODE = {
  SCATTER: 'scatter',
  CHASE: 'chase',
  FRIGHTENED: 'frightened',
  EATEN: 'eaten'
};

export const GHOST_NAMES = {
  BLINKY: 'blinky',
  PINKY: 'pinky',
  INKY: 'inky',
  CLYDE: 'clyde'
};

export const GHOST_COLORS = {
  blinky: '#ff1744', // Red
  pinky:  '#ff4081', // Pink
  inky:   '#00e5ff', // Cyan
  clyde:  '#ff9100'  // Orange
};

const DIRS = [
  { x: 0, y: -1 }, // UP
  { x: -1, y: 0 }, // LEFT
  { x: 0, y: 1 },  // DOWN
  { x: 1, y: 0 }   // RIGHT
];

export class Ghost {
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

    // Movement speeds (tiles per second)
    this.baseSpeed = 7.5;
    this.speed = this.baseSpeed;

    // Frightened state
    this.frightTimer = 0;
    this.frightDuration = 7;

    // House state
    this.isInHouse = name !== GHOST_NAMES.BLINKY;
    this.houseTimer = name === GHOST_NAMES.PINKY ? 1.0 : name === GHOST_NAMES.INKY ? 3.0 : 5.0;

    // Cruise Elroy speed boost for Blinky
    this.elroyStage = 0;

    // Animation frames
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
    this.elroyStage = 0;
    this.speed = this.baseSpeed;
    this.frightTimer = 0;
  }

  makeFrightened(duration) {
    if (this.mode === GHOST_MODE.EATEN) return;
    if (this.mode !== GHOST_MODE.FRIGHTENED) {
      this.previousMode = this.mode;
      // Reverse direction on entering frightened
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
    if (this.mode === GHOST_MODE.EATEN) {
      return 15.0; // Rapid return to base
    }
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      return this.baseSpeed * 0.55;
    }

    // Tunnel speed check
    const curR = Math.floor(this.y);
    if (curR === 14 && (this.x < 5 || this.x > COLS - 6)) {
      return this.baseSpeed * 0.5; // Tunnel slowdown
    }

    let spd = this.baseSpeed + (level - 1) * 0.3;

    // Blinky Cruise Elroy boost
    if (this.name === GHOST_NAMES.BLINKY && this.mode === GHOST_MODE.CHASE) {
      if (remainingDotsRatio < 0.1) {
        spd *= 1.25;
      } else if (remainingDotsRatio < 0.25) {
        spd *= 1.15;
      }
    }

    return spd;
  }

  update(dt, grid, pacman, blinky, remainingDotsRatio, globalMode, level) {
    this.animTimer += dt;

    // If waiting inside ghost house
    if (this.isInHouse) {
      this.houseTimer -= dt;
      // Gentle bounce inside house
      this.y += this.dir.y * 2.0 * dt;
      if (this.y > 14.5) {
        this.y = 14.5;
        this.dir.y = -1;
      } else if (this.y < 13.5) {
        this.y = 13.5;
        this.dir.y = 1;
      }

      if (this.houseTimer <= 0) {
        // Move towards house gate (13.5, 11)
        this.x = 13.5;
        this.y = 11;
        this.isInHouse = false;
        this.dir = { x: -1, y: 0 };
      }
      return;
    }

    // Handle Frightened mode countdown
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      this.frightTimer -= dt;
      if (this.frightTimer <= 0) {
        this.mode = this.previousMode || globalMode;
      }
    } else if (this.mode !== GHOST_MODE.EATEN) {
      this.mode = globalMode;
    }

    this.speed = this.getSpeed(grid, level, remainingDotsRatio);

    // Tunnel wrap check
    if (this.x < -0.5) {
      this.x = COLS - 0.5;
    } else if (this.x > COLS - 0.5) {
      this.x = -0.5;
    }

    // Move along current direction
    const moveStep = this.speed * dt;
    this.moveWithGridAlign(moveStep, grid, pacman, blinky);

    // If eaten and arrived at ghost house door, revive
    if (this.mode === GHOST_MODE.EATEN) {
      const distToGate = Math.hypot(this.x - 13.5, this.y - 11);
      if (distToGate < 0.6) {
        this.mode = globalMode;
        this.dir = { x: 0, y: -1 };
      }
    }
  }

  moveWithGridAlign(step, grid, pacman, blinky) {
    // Current tile center
    const targetTile = this.getTargetTile(pacman, blinky);
    const curCol = Math.round(this.x);
    const curRow = Math.round(this.y);

    // Distance to center of current cell
    const distToCenter = Math.hypot(this.x - curCol, this.y - curRow);

    // When near center of a tile, make directional decision
    if (distToCenter <= step * 0.8 || this.isAtJunction(curCol, curRow, grid)) {
      // Snap to tile axis
      if (this.dir.x !== 0) this.y = curRow;
      if (this.dir.y !== 0) this.x = curCol;

      const nextDir = this.chooseNextDirection(curCol, curRow, grid, targetTile);
      if (nextDir) {
        this.dir = nextDir;
      }
    }

    this.x += this.dir.x * step;
    this.y += this.dir.y * step;
  }

  isAtJunction(col, row, grid) {
    if (col < 1 || col >= COLS - 1 || row < 1 || row >= ROWS - 1) return false;
    let openings = 0;
    for (const d of DIRS) {
      const nc = col + d.x;
      const nr = row + d.y;
      if (this.canPass(nr, nc, grid)) openings++;
    }
    return openings > 2;
  }

  canPass(row, col, grid) {
    // Wrap tunnel rows
    if (row === 14 && (col < 0 || col >= COLS)) return true;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;

    const tile = grid[row][col];
    if (tile === TILE_WALL) return false;
    if (tile === TILE_GATE) {
      // Only eaten ghosts or ghosts exiting house can pass through gate
      return this.mode === GHOST_MODE.EATEN;
    }
    if (tile === TILE_HOUSE && this.mode !== GHOST_MODE.EATEN) return false;

    return true;
  }

  chooseNextDirection(col, row, grid, target) {
    const validDirs = [];
    const reverseDir = { x: -this.dir.x, y: -this.dir.y };

    for (const d of DIRS) {
      // Ghosts cannot reverse 180 degrees at intersections
      if (d.x === reverseDir.x && d.y === reverseDir.y) continue;

      const nr = row + d.y;
      const nc = col + d.x;

      if (this.canPass(nr, nc, grid)) {
        validDirs.push(d);
      }
    }

    if (validDirs.length === 0) {
      // Dead end fallback - must reverse
      return reverseDir;
    }

    // In frightened mode, pick a random valid direction
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      return validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    // Minimize Euclidean distance squared to target tile
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
    if (this.mode === GHOST_MODE.EATEN) {
      // Target ghost house entrance
      return { x: 13.5, y: 11 };
    }

    if (this.mode === GHOST_MODE.SCATTER) {
      return this.scatterTarget;
    }

    // CHASE MODE PERSONALITIES:
    switch (this.name) {
      case GHOST_NAMES.BLINKY:
        // Direct Chaser: Targets Pac-Man's exact tile
        return { x: pacman.x, y: pacman.y };

      case GHOST_NAMES.PINKY:
        // Ambusher: Targets 4 tiles ahead in Pac-Man's current direction
        return {
          x: pacman.x + pacman.dir.x * 4,
          y: pacman.y + pacman.dir.y * 4
        };

      case GHOST_NAMES.INKY: {
        // Flanker: Pincer maneuver with Blinky
        // Intermediate spot: 2 tiles ahead of Pac-Man
        const spotX = pacman.x + pacman.dir.x * 2;
        const spotY = pacman.y + pacman.dir.y * 2;
        // Vector from Blinky to spot, doubled
        const vx = spotX - (blinky ? blinky.x : pacman.x);
        const vy = spotY - (blinky ? blinky.y : pacman.y);
        return {
          x: spotX + vx,
          y: spotY + vy
        };
      }

      case GHOST_NAMES.CLYDE: {
        // Pokey / Coward: Chases when far (> 8 tiles), retreats to scatter corner when close
        const distToPacman = Math.hypot(this.x - pacman.x, this.y - pacman.y);
        if (distToPacman > 8) {
          return { x: pacman.x, y: pacman.y };
        } else {
          return this.scatterTarget;
        }
      }

      default:
        return { x: pacman.x, y: pacman.y };
    }
  }
}

export class GhostManager {
  constructor() {
    this.ghosts = [];
    this.modeTimer = 0;
    this.waveIndex = 0;
    this.currentGlobalMode = GHOST_MODE.SCATTER;

    // Classic wave timing (seconds): Scatter, Chase, Scatter, Chase...
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
      if (starts[ghost.name]) {
        ghost.reset(starts[ghost.name]);
      }
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
    // Advance global wave timer
    const currentWave = this.waves[this.waveIndex];
    if (currentWave && currentWave.duration !== Infinity) {
      this.modeTimer += dt;
      if (this.modeTimer >= currentWave.duration) {
        this.modeTimer = 0;
        this.waveIndex = Math.min(this.waves.length - 1, this.waveIndex + 1);
        this.currentGlobalMode = this.waves[this.waveIndex].mode;

        // Reverse ghost directions on wave transition
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
