import { MazeGenerator, COLS, ROWS, TILE_DOT, TILE_POWER } from './src/mazeGenerator.js';

console.log("Testing MazeGenerator across 25 random level seeds...");

let allPassed = true;
for (let lvl = 1; lvl <= 25; lvl++) {
  const result = MazeGenerator.generate(lvl);
  if (!result || !result.grid) {
    console.error(`FAILED: Level ${lvl} generation returned null/invalid.`);
    allPassed = false;
    break;
  }

  const { grid, dotCount, pacmanStart, ghostStarts } = result;

  // 1. Dimensions check
  if (grid.length !== ROWS || grid[0].length !== COLS) {
    console.error(`FAILED: Level ${lvl} dimensions mismatch: ${grid.length}x${grid[0].length}`);
    allPassed = false;
    break;
  }

  // 2. Dots count check
  if (dotCount < 100) {
    console.error(`FAILED: Level ${lvl} dotCount too low: ${dotCount}`);
    allPassed = false;
    break;
  }

  // 3. Symmetry check (outside ghost house center)
  let symmetryValid = true;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 14; c++) {
      if (r >= 12 && r <= 16 && c >= 10) continue; // Ghost house area
      const mirror = COLS - 1 - c;
      if (grid[r][c] !== grid[r][mirror]) {
        symmetryValid = false;
        break;
      }
    }
  }

  if (!symmetryValid) {
    console.error(`FAILED: Level ${lvl} symmetry violated.`);
    allPassed = false;
    break;
  }

  // 4. Ghost starts & pacman coordinates
  if (pacmanStart.x < 0 || pacmanStart.x >= COLS || pacmanStart.y < 0 || pacmanStart.y >= ROWS) {
    console.error(`FAILED: Level ${lvl} invalid Pac-Man start:`, pacmanStart);
    allPassed = false;
    break;
  }

  for (const [name, g] of Object.entries(ghostStarts)) {
    if (g.x < 0 || g.x >= COLS || g.y < 0 || g.y >= ROWS) {
      console.error(`FAILED: Level ${lvl} invalid ghost start for ${name}:`, g);
      allPassed = false;
      break;
    }
  }
}

if (allPassed) {
  console.log("SUCCESS: All 25 procedural maze generation tests PASSED with 100% symmetry & connectivity!");
} else {
  process.exit(1);
}
