/**
 * Procedural Bilateral Symmetrical Maze Generator for Pac-Man
 * Authentic Arcade Macro-Architecture: Varied L-Shapes, T-Bars, Loops, and Highways.
 * Grid Size: 28 columns x 31 rows
 *
 * Tile Codes:
 * 0: Empty space (no pellet)
 * 1: Normal Pellet (Dot)
 * 2: Power Pellet (Energizer)
 * 3: Wall
 * 4: Ghost Gate (Door)
 * 5: Ghost House Interior
 */

export const TILE_EMPTY = 0;
export const TILE_DOT = 1;
export const TILE_POWER = 2;
export const TILE_WALL = 3;
export const TILE_GATE = 4;
export const TILE_HOUSE = 5;

export const COLS = 28;
export const ROWS = 31;

const HOUSE_X = 10;
const HOUSE_Y = 12;
const HOUSE_W = 8;
const HOUSE_H = 5;

const TUNNEL_ROWS = [14];

export class MazeGenerator {
  /**
   * Generates a procedurally generated, authentic arcade symmetrical maze.
   * @param {number} level - Seed factor for architectural variation.
   */
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
    // 1. Initialize grid with solid walls
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_WALL));
    const halfCols = 14;

    // Helper to carve a horizontal corridor in left half
    const carveH = (r, c1, c2) => {
      for (let c = Math.max(1, c1); c <= Math.min(halfCols - 1, c2); c++) {
        grid[r][c] = TILE_DOT;
      }
    };

    // Helper to carve a vertical corridor in left half
    const carveV = (c, r1, r2) => {
      for (let r = Math.max(1, r1); r <= Math.min(ROWS - 2, r2); r++) {
        // Protect ghost house
        if (r >= HOUSE_Y && r < HOUSE_Y + HOUSE_H && c >= HOUSE_X && c < halfCols) continue;
        grid[r][c] = TILE_DOT;
      }
    };

    // Randomize architectural variant seeds
    const variantTop = (level + attempt) % 4;
    const variantMid = (level * 3 + attempt) % 3;
    const variantBot = (level * 7 + attempt) % 4;

    // Outer Perimeter Track (Left Half)
    carveH(1, 1, 13);
    carveV(1, 1, 29);
    carveH(29, 1, 13);

    // ==========================================
    // ZONE 1: TOP ARCHITECTURE (Rows 1 to 9)
    // ==========================================
    carveH(5, 1, 13); // Main upper cruising highway

    if (variantTop === 0) {
      // Classic: Outer L-corner block + Central T-bar
      carveV(6, 1, 5);
      carveV(12, 1, 9);
      carveH(8, 2, 10);
      carveV(8, 5, 8);
    } else if (variantTop === 1) {
      // Double Box Chambers with center avenue
      carveV(5, 1, 9);
      carveV(9, 1, 5);
      carveH(8, 1, 6);
      carveH(8, 8, 13);
      carveV(12, 5, 9);
    } else if (variantTop === 2) {
      // Long sweeping lanes with wide center loop
      carveV(7, 1, 8);
      carveH(3, 8, 13);
      carveV(12, 1, 9);
      carveH(8, 1, 9);
    } else {
      // Staggered T-chambers
      carveV(4, 1, 8);
      carveV(9, 1, 8);
      carveH(7, 4, 13);
      carveV(13, 1, 5);
    }

    // ==========================================
    // ZONE 2: MID-UPPER & GHOST PEN RING (Rows 9 to 12)
    // ==========================================
    carveH(10, 1, 8);
    carveV(6, 8, 13);

    // Track above ghost house
    carveH(11, 8, 13);
    carveV(8, 10, 18);

    // ==========================================
    // ZONE 3: GHOST HOUSE & TUNNELS (Rows 12 to 16)
    // ==========================================
    // Ghost house walls and room
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
      for (let c = 0; c < 6; c++) {
        grid[tRow][c] = TILE_EMPTY;
      }
      grid[tRow - 1][0] = TILE_WALL;
      grid[tRow + 1][0] = TILE_WALL;
      // Vertical track connecting to tunnel mouth
      carveV(5, 11, 17);
    }

    // Corridor directly below ghost house
    carveH(17, 8, 13);
    grid[17][13] = TILE_EMPTY;
    grid[17][14] = TILE_EMPTY; // Fruit spot

    // ==========================================
    // ZONE 4: MID-LOWER & PAC-MAN SPAWN (Rows 18 to 23)
    // ==========================================
    carveH(20, 1, 13); // Main middle highway

    if (variantMid === 0) {
      // Twin L-dividers
      carveV(3, 17, 23);
      carveV(9, 17, 20);
      carveV(12, 17, 23);
    } else if (variantMid === 1) {
      // Center branching junction
      carveV(6, 17, 23);
      carveV(12, 20, 26);
      carveH(22, 1, 6);
    } else {
      // Wide open racing track
      carveV(4, 18, 23);
      carveV(8, 18, 23);
      carveV(11, 17, 20);
    }

    // Pac-Man start lane (Row 23)
    carveH(23, 1, 13);
    grid[23][13] = TILE_EMPTY;
    grid[23][14] = TILE_EMPTY;

    // ==========================================
    // ZONE 5: BOTTOM MAZE (Rows 24 to 29)
    // ==========================================
    carveH(26, 1, 13); // Lower arterial highway

    if (variantBot === 0) {
      // Classic bottom T-shapes
      carveV(6, 23, 29);
      carveV(12, 23, 26);
      carveV(3, 26, 29);
    } else if (variantBot === 1) {
      // Central pedestal block
      carveV(4, 23, 29);
      carveV(9, 26, 29);
      carveV(13, 26, 29);
    } else if (variantBot === 2) {
      // Side pocket alcoves
      carveV(3, 23, 26);
      carveV(8, 23, 29);
      carveV(12, 26, 29);
    } else {
      // Wide corridor sweeps
      carveV(5, 23, 29);
      carveV(10, 23, 29);
    }

    // ==========================================
    // STEP 6: DEAD-END ELIMINATION (Loop Carving)
    // ==========================================
    for (let pass = 0; pass < 2; pass++) {
      for (let r = 2; r < ROWS - 2; r++) {
        for (let c = 2; c < halfCols; c++) {
          if (grid[r][c] === TILE_DOT) {
            let walls = 0;
            if (grid[r - 1][c] === TILE_WALL) walls++;
            if (grid[r + 1][c] === TILE_WALL) walls++;
            if (grid[r][c - 1] === TILE_WALL) walls++;
            if (grid[r][c + 1] === TILE_WALL) walls++;

            // If trapped in a cul-de-sac, carve an escape route into neighboring wall
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

    // ==========================================
    // STEP 7: BILATERAL MIRRORING
    // ==========================================
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < halfCols; c++) {
        const mirrorCol = COLS - 1 - c;
        if (c >= HOUSE_X && c < halfCols && r >= HOUSE_Y && r < HOUSE_Y + HOUSE_H) continue;
        grid[r][mirrorCol] = grid[r][c];
      }
    }

    // Reinforce outer boundary walls except tunnels
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

    // Power Pellets in 4 outer quadrant alcoves
    const powerSpots = [
      [3, 1], [3, COLS - 2],
      [23, 1], [23, COLS - 2]
    ];
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

    // ==========================================
    // STEP 8: FLOOD-FILL CONNECTIVITY CHECK
    // ==========================================
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

    // Clean any unreachable stray dots
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
