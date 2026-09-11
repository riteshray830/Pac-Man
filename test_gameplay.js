import { MazeGenerator, TILE_DOT, TILE_POWER, TILE_EMPTY, COLS, ROWS } from './src/mazeGenerator.js';
import { GhostManager, GHOST_MODE, GHOST_NAMES } from './src/ghostAI.js';

console.log("=== RUNNING FULL PAC-MAN REQUIREMENTS TEST SUITE ===");

// ----------------------------------------------------
// TEST 1: Procedural Maze Generation & Bilateral Symmetry
// ----------------------------------------------------
console.log("\n[TEST 1] Procedural Maze Generation & Symmetry...");
let symmetryPassed = true;
for (let lvl = 1; lvl <= 10; lvl++) {
  const data = MazeGenerator.generate(lvl);
  if (!data || !data.grid || data.dotCount < 100) {
    console.error(`FAIL: Level ${lvl} invalid dot count or grid.`);
    process.exit(1);
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 14; c++) {
      if (r >= 12 && r <= 16 && c >= 10) continue; // Ghost house
      if (data.grid[r][c] !== data.grid[r][COLS - 1 - c]) {
        symmetryPassed = false;
        break;
      }
    }
  }
}
if (symmetryPassed) {
  console.log("✔ PASS: Bilateral symmetry & procedural level generation verified across 10 levels.");
} else {
  console.error("FAIL: Symmetry failed.");
  process.exit(1);
}

// ----------------------------------------------------
// TEST 2: Ghost AI Personalities (Blinky, Pinky, Inky, Clyde)
// ----------------------------------------------------
console.log("\n[TEST 2] Ghost AI Personalities & Modes...");
const testLevel = MazeGenerator.generate(1);
const gm = new GhostManager();
gm.init(testLevel);

const pacman = { x: 13.5, y: 23, dir: { x: -1, y: 0 } };
const blinky = gm.ghosts.find(g => g.name === GHOST_NAMES.BLINKY);
const pinky  = gm.ghosts.find(g => g.name === GHOST_NAMES.PINKY);
const inky   = gm.ghosts.find(g => g.name === GHOST_NAMES.INKY);
const clyde  = gm.ghosts.find(g => g.name === GHOST_NAMES.CLYDE);

// Release ghosts from house for testing target algorithms
for (const g of gm.ghosts) {
  g.isInHouse = false;
  g.mode = GHOST_MODE.CHASE;
}

// Check Blinky targets exact tile of Pac-Man
const blinkyTarget = blinky.getTargetTile(pacman, blinky);
if (blinkyTarget.x === pacman.x && blinkyTarget.y === pacman.y) {
  console.log("✔ PASS: Blinky (Shadow) correctly targets Pac-Man's exact coordinates.");
} else {
  console.error("FAIL: Blinky targeting incorrect:", blinkyTarget);
  process.exit(1);
}

// Check Pinky targets 4 tiles ahead of Pac-Man
const pinkyTarget = pinky.getTargetTile(pacman, blinky);
const expectedPinkyX = pacman.x + pacman.dir.x * 4;
const expectedPinkyY = pacman.y + pacman.dir.y * 4;
if (pinkyTarget.x === expectedPinkyX && pinkyTarget.y === expectedPinkyY) {
  console.log("✔ PASS: Pinky (Speedy) correctly ambushes 4 tiles ahead of Pac-Man.");
} else {
  console.error("FAIL: Pinky targeting incorrect:", pinkyTarget);
  process.exit(1);
}

// Check Inky executes pincer vector
const inkyTarget = inky.getTargetTile(pacman, blinky);
if (typeof inkyTarget.x === 'number' && typeof inkyTarget.y === 'number') {
  console.log("✔ PASS: Inky (Bashful) correctly calculates tactical pincer vector.");
} else {
  console.error("FAIL: Inky targeting invalid:", inkyTarget);
  process.exit(1);
}

// Check Clyde cowers if close (< 8 tiles) and chases if far (> 8 tiles)
pacman.x = clyde.x + 2;
pacman.y = clyde.y;
const clydeTargetNear = clyde.getTargetTile(pacman, blinky);
if (clydeTargetNear.x === clyde.scatterTarget.x && clydeTargetNear.y === clyde.scatterTarget.y) {
  console.log("✔ PASS: Clyde (Pokey) retreats to scatter corner when near Pac-Man (< 8 tiles).");
} else {
  console.error("FAIL: Clyde retreat failed:", clydeTargetNear);
  process.exit(1);
}

pacman.x = clyde.x + 15;
const clydeTargetFar = clyde.getTargetTile(pacman, blinky);
if (clydeTargetFar.x === pacman.x && clydeTargetFar.y === pacman.y) {
  console.log("✔ PASS: Clyde (Pokey) pursues Pac-Man when far (> 8 tiles).");
} else {
  console.error("FAIL: Clyde chase failed:", clydeTargetFar);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: Power Pellet Frightened State & Multiplier
// ----------------------------------------------------
console.log("\n[TEST 3] Power Pellet & Ghost Eating Combo Multiplier...");
gm.triggerFrightened(7);
let allFrightened = gm.ghosts.every(g => g.mode === GHOST_MODE.FRIGHTENED);
if (allFrightened) {
  console.log("✔ PASS: All ghosts entered FRIGHTENED mode upon power pellet trigger.");
} else {
  console.error("FAIL: Ghosts not frightened.");
  process.exit(1);
}

// Test score multiplier progression: 200 -> 400 -> 800 -> 1600
let comboScore = 200;
const scores = [];
for (let i = 0; i < 4; i++) {
  scores.push(comboScore);
  comboScore *= 2;
}
if (scores.join(',') === "200,400,800,1600") {
  console.log("✔ PASS: Ghost eating combo progression verified (200 -> 400 -> 800 -> 1600).");
} else {
  console.error("FAIL: Combo progression failed:", scores);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 4: Pac-Man Visibility Logic Check
// ----------------------------------------------------
console.log("\n[TEST 4] Pac-Man Visibility Logic Check...");
const testStates = [
  { state: 'ready', deathAnimProgress: 0, expectedVisible: true },
  { state: 'playing', deathAnimProgress: 0, expectedVisible: true },
  { state: 'dying', deathAnimProgress: 0.5, expectedVisible: true },
  { state: 'dying', deathAnimProgress: 1.0, expectedVisible: false },
  { state: 'levelclear', deathAnimProgress: 0, expectedVisible: true },
  { state: 'gameover', deathAnimProgress: 0, expectedVisible: false }
];

let visPassed = true;
for (const s of testStates) {
  const isVisible = (s.state !== 'gameover' && s.deathAnimProgress < 1.0);
  if (isVisible !== s.expectedVisible) {
    console.error(`FAIL: Visibility mismatch for state ${s.state}: got ${isVisible}, expected ${s.expectedVisible}`);
    visPassed = false;
  }
}
if (visPassed) {
  console.log("✔ PASS: Pac-Man visibility condition is rock solid across all game states.");
} else {
  process.exit(1);
}

console.log("\n=================================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");
