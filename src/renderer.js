/**
 * High Quality Visual Canvas Renderer
 * Neo-Retro Cyber Synthwave aesthetic with dynamic glows, vector sprites & particle effects
 */

import { TILE_EMPTY, TILE_DOT, TILE_POWER, TILE_WALL, TILE_GATE, TILE_HOUSE, COLS, ROWS } from './mazeGenerator.js';
import { GHOST_MODE } from './ghostAI.js';

export const LEVEL_THEMES = [
  { wallColor: '#00e5ff', wallGlow: 'rgba(0, 229, 255, 0.4)', bgDark: '#040b14', dotColor: '#fff9c4' }, // 1: Neon Cyan
  { wallColor: '#ff007f', wallGlow: 'rgba(255, 0, 127, 0.4)', bgDark: '#12040d', dotColor: '#ffebee' }, // 2: Synthwave Magenta
  { wallColor: '#00ff66', wallGlow: 'rgba(0, 255, 102, 0.4)', bgDark: '#031409', dotColor: '#e8f5e9' }, // 3: Matrix Green
  { wallColor: '#ffb300', wallGlow: 'rgba(255, 179, 0, 0.4)', bgDark: '#140e02', dotColor: '#fffde7' }, // 4: Sunset Amber
  { wallColor: '#b388ff', wallGlow: 'rgba(179, 136, 255, 0.4)', bgDark: '#0e0417', dotColor: '#f3e5f5' }  // 5+: Electric Violet
];

export const FRUITS = [
  { name: 'Cherry', points: 100, color: '#ff1744' },
  { name: 'Strawberry', points: 300, color: '#ff4081' },
  { name: 'Orange', points: 500, color: '#ff9100' },
  { name: 'Apple', points: 700, color: '#f44336' },
  { name: 'Melon', points: 1000, color: '#00e676' },
  { name: 'Galaxian', points: 2000, color: '#ffea00' },
  { name: 'Bell', points: 3000, color: '#ffd600' },
  { name: 'Key', points: 5000, color: '#00e5ff' }
];

export const TOP_HUD_TILES = 3.0;
export const BOTTOM_TRAY_TILES = 2.5;
export const TOTAL_CANVAS_TILES = ROWS + TOP_HUD_TILES + BOTTOM_TRAY_TILES;

export class Renderer {
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

    // Clear with dark atmospheric gradient
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, TOTAL_CANVAS_TILES * ts);
    grad.addColorStop(0, '#020208');
    grad.addColorStop(0.5, theme.bgDark);
    grad.addColorStop(1, '#020208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, COLS * ts, TOTAL_CANVAS_TILES * ts);

    // Apply Screen Shake
    const shake = gameState.particles.getShakeOffset();
    ctx.translate(shake.x, shake.y);

    // Offset for top HUD (3.0 tiles height gives clear breathing space)
    ctx.save();
    ctx.translate(0, TOP_HUD_TILES * ts);

    // 1. Draw Maze Walls & Environment
    this.drawMaze(ctx, gameState.grid, theme, ts);

    // 2. Draw Pellets & Energizers
    this.drawPellets(ctx, gameState.grid, theme, ts);

    // 3. Draw Bonus Fruit (if active)
    if (gameState.fruitActive && gameState.fruit) {
      this.drawFruit(ctx, gameState.fruitSpot.x * ts, gameState.fruitSpot.y * ts, gameState.fruit, ts);
    }

    // 4. Draw Particles & Shockwaves
    gameState.particles.draw(ctx);

    // 5. Draw Pac-Man (always visible during active gameplay)
    if (gameState.state !== 'gameover' && gameState.deathAnimProgress < 1.0) {
      this.drawPacman(ctx, gameState.pacman, ts, gameState.deathAnimProgress);
    }

    // 6. Draw Ghosts
    for (const ghost of gameState.ghostManager.ghosts) {
      this.drawGhost(ctx, ghost, ts);
    }

    ctx.restore(); // Undo maze translate

    // 7. Draw Top HUD (Scores) & Bottom Tray (Lives + Fruits)
    this.drawHUD(ctx, gameState, ts);

    // 8. Draw Overlays (Ready, Game Over, Level Clear, Pause)
    this.drawOverlays(ctx, gameState, ts);

    ctx.restore(); // Undo shake translate
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
          // Check neighbors to draw connected smooth pipeline borders
          const isTop = r > 0 && grid[r - 1][c] === TILE_WALL;
          const isBottom = r < ROWS - 1 && grid[r + 1][c] === TILE_WALL;
          const isLeft = c > 0 && grid[r][c - 1] === TILE_WALL;
          const isRight = c < COLS - 1 && grid[r][c + 1] === TILE_WALL;

          // Fill interior subtly
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);

          // Draw outward facing borders
          ctx.beginPath();
          if (!isTop) {
            ctx.moveTo(x, y + 1);
            ctx.lineTo(x + ts, y + 1);
          }
          if (!isBottom) {
            ctx.moveTo(x, y + ts - 1);
            ctx.lineTo(x + ts, y + ts - 1);
          }
          if (!isLeft) {
            ctx.moveTo(x + 1, y);
            ctx.lineTo(x + 1, y + ts);
          }
          if (!isRight) {
            ctx.moveTo(x + ts - 1, y);
            ctx.lineTo(x + ts - 1, y + ts);
          }
          ctx.stroke();
        } else if (tile === TILE_GATE) {
          // Ghost Gate: Translucent shimmering barrier
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
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (tile === TILE_POWER) {
          ctx.save();
          const pRadius = 6.0 + pulse * 2.5;
          ctx.fillStyle = '#00ffff';
          ctx.shadowBlur = 14 + pulse * 6;
          ctx.shadowColor = '#00e5ff';

          // Outer glowing ring
          ctx.beginPath();
          ctx.arc(cx, cy, pRadius + 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 229, 255, ${0.3 * pulse})`;
          ctx.fill();

          // Solid core
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
      // Death Dissolution Animation
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

    // Facing Angle
    let angle = 0;
    if (pacman.dir.x === 1)  angle = 0;
    if (pacman.dir.x === -1) angle = Math.PI;
    if (pacman.dir.y === 1)  angle = Math.PI / 2;
    if (pacman.dir.y === -1) angle = -Math.PI / 2;

    ctx.rotate(angle);

    // Mouth Chomp Cycle
    const chompSpeed = pacman.isMoving ? 16 : 0;
    const bite = pacman.isMoving ? Math.abs(Math.sin(this.globalTime * chompSpeed)) * 0.28 * Math.PI : 0.05;

    // Glowing Neon Yellow Pac-Man Body
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffea00';
    ctx.fillStyle = '#ffea00';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, bite, Math.PI * 2 - bite);
    ctx.closePath();
    ctx.fill();

    // Subtle glossy highlight
    ctx.beginPath();
    ctx.arc(-radius * 0.2, -radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // Pac-Man eye
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

    // EATEN MODE: Draw only eyes returning to base
    if (ghost.mode === GHOST_MODE.EATEN) {
      this.drawGhostEyes(ctx, ghost.dir, r);
      ctx.restore();
      return;
    }

    // Determine Ghost Color
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

    // Head Dome & Straight Sides
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r, Math.PI, 0, false);
    ctx.lineTo(r, r * 0.7);

    // Animated Undulating Skirt Tentacles (3 ripples)
    const wave = Math.sin(ghost.animTimer * 12);
    const numTentacles = 3;
    const tentacleW = (r * 2) / numTentacles;

    for (let i = numTentacles; i > 0; i--) {
      const xEnd = -r + (i - 1) * tentacleW;
      const xMid = -r + (i - 0.5) * tentacleW;
      const offset = (i % 2 === 0 ? wave : -wave) * 2.5;
      ctx.quadraticCurveTo(xMid, r * 0.7 + 4 + offset, xEnd, r * 0.7);
    }

    ctx.lineTo(-r, -r * 0.2);
    ctx.closePath();
    ctx.fill();

    // Eyes & Expression
    if (ghost.mode === GHOST_MODE.FRIGHTENED) {
      // Frightened face: small dot eyes and wavy mouth
      ctx.fillStyle = '#ff80ab';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.2, 2.5, 0, Math.PI * 2);
      ctx.arc(r * 0.35, -r * 0.2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Wavy terrified mouth
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
    // Eye Whites
    const lookX = dir.x * 2.5;
    const lookY = dir.y * 2.5;

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#ffffff';

    // Left Eye White
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.25, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye White
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 0.25, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Colored Pupils Looking in Movement Direction
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

    const r = ts * 0.6;
    // Distinct vector drawing per fruit
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

      default: // Key
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

    // Top Header: 1UP Score & HIGH SCORE (Row 0.4 and Row 1.4)
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

    // Bottom Tray: Starts below the maze at (TOP_HUD_TILES + ROWS + 0.3) * ts
    const bottomBaseY = (TOP_HUD_TILES + ROWS + 0.3) * ts;

    // Remaining Lives Icons (Mini Pac-Mans)
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

    // Level Badge & Fruit Shelf
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
      ctx.fillRect(0, 0, COLS * ts, (ROWS + 3) * ts);

      ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
      ctx.fillStyle = '#00ffff';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00ffff';
      ctx.fillText('PAUSED', centerX, centerY);
    }

    ctx.restore();
  }
}
