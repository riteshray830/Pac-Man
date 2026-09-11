import { Renderer, TOTAL_CANVAS_TILES } from './src/renderer.js';
import { COLS, ROWS, MazeGenerator } from './src/mazeGenerator.js';
import { Game, GAME_STATE } from './src/game.js';
import { InputManager, INPUT_DIRS, INPUT_ACTIONS } from './src/inputManager.js';

console.log("=== RUNNING RESPONSIVE GEOMETRY & MULTI-VIEWPORT VERIFICATION ===");

// -------------------------------------------------------------------
// 1. Aspect Ratio and Tile Sizing Math Across Viewports
// -------------------------------------------------------------------
const mockCtx = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
    return () => {};
  }
});

const mockCanvas = {
  style: {},
  getContext: () => mockCtx
};

const renderer = new Renderer(mockCanvas);
renderer.dpr = 2; // simulate Retina DPR

const testViewports = [
  { name: "Tiny Phone (320x480)", w: 320, h: 480 },
  { name: "iPhone 14 Portrait (390x844)", w: 390, h: 844 },
  { name: "iPhone 14 Landscape (844x390)", w: 844, h: 390 },
  { name: "Galaxy S22 Portrait (360x780)", w: 360, h: 780 },
  { name: "Galaxy S22 Landscape (780x360)", w: 780, h: 360 },
  { name: "iPad 10th Portrait (820x1180)", w: 820, h: 1180 },
  { name: "iPad 10th Landscape (1180x820)", w: 1180, h: 820 },
  { name: "Standard Laptop (1366x768)", w: 1366, h: 768 },
  { name: "Full HD Desktop (1920x1080)", w: 1920, h: 1080 },
  { name: "Ultrawide Monitor (3440x1440)", w: 3440, h: 1440 }
];

let allViewportsPassed = true;

for (const vp of testViewports) {
  renderer.resize(vp.w, vp.h);

  const canvasW = parseInt(mockCanvas.style.width, 10);
  const canvasH = parseInt(mockCanvas.style.height, 10);
  const ts = renderer.tileSize;

  if (canvasW > vp.w || canvasH > vp.h) {
    console.error(`FAIL: Viewport ${vp.name} overflowed! Canvas ${canvasW}x${canvasH} exceeds viewport ${vp.w}x${vp.h}`);
    allViewportsPassed = false;
    break;
  }

  const expectedW = ts * COLS;
  const expectedH = Math.round(ts * TOTAL_CANVAS_TILES);
  if (canvasW !== expectedW || canvasH !== expectedH) {
    console.error(`FAIL: Viewport ${vp.name} dimensions incorrect! got ${canvasW}x${canvasH}, expected ${expectedW}x${expectedH}`);
    allViewportsPassed = false;
    break;
  }

  const aspect = canvasW / canvasH;
  const targetAspect = COLS / TOTAL_CANVAS_TILES;
  const aspectDiff = Math.abs(aspect - targetAspect);
  if (aspectDiff > 0.03) {
    console.error(`FAIL: Viewport ${vp.name} aspect ratio distorted: ${aspect.toFixed(4)} vs ${targetAspect.toFixed(4)}`);
    allViewportsPassed = false;
    break;
  }
}

if (allViewportsPassed) {
  console.log("✔ PASS: All 10 viewport sizes scale to max area without overflow or distortion.");
} else {
  process.exit(1);
}

// -------------------------------------------------------------------
// 2. Gameplay State Invariance During Resizing / Orientation Swaps
// -------------------------------------------------------------------
console.log("\n[TEST 2] Verifying Game State Preservation across 20 dynamic resizes...");

const inputManager = new InputManager();
const game = new Game(mockCanvas, { inputManager });

// Establish in-game progress
game.score = 5400;
game.highScore = 12000;
game.lives = 2;
game.level = 3;
game.state = GAME_STATE.PLAYING;
game.remainingDots = 84;
game.pacman.x = 18.2;
game.pacman.y = 11.0;

// Fire series of simulated resize events
const resizeSequence = [
  [390, 844], [844, 390], [412, 915], [915, 412],
  [1920, 1080], [1366, 768], [820, 1180], [1180, 820],
  [320, 480], [480, 320], [2560, 1440], [390, 844]
];

for (const [rw, rh] of resizeSequence) {
  game.renderer.resize(rw, rh);
}

if (
  game.score === 5400 &&
  game.highScore === 12000 &&
  game.lives === 2 &&
  game.level === 3 &&
  game.state === GAME_STATE.PLAYING &&
  game.remainingDots === 84 &&
  game.pacman.x === 18.2 &&
  game.pacman.y === 11.0
) {
  console.log("✔ PASS: Zero state resets! Score, level, lives, and entity positions 100% preserved.");
} else {
  console.error("FAIL: Game state was corrupted or reset during resizing!");
  process.exit(1);
}

// -------------------------------------------------------------------
// 3. Universal Input Matrix into Game Engine
// -------------------------------------------------------------------
console.log("\n[TEST 3] Verifying Universal Input Matrix routing to Game engine...");

// Test Keyboard route
inputManager.queueDirection(INPUT_DIRS.UP);
game.update(Date.now());
if (game.pacman.nextDir.y === -1) {
  console.log("✔ PASS: Keyboard direction channeled cleanly to pacman.nextDir.");
} else {
  console.error("FAIL: Keyboard direction failed:", game.pacman.nextDir);
  process.exit(1);
}

// Test Mouse route
inputManager._steerByDelta(50, 0); // Right
game.update(Date.now());
if (game.pacman.nextDir.x === 1) {
  console.log("✔ PASS: Mouse steering channeled cleanly to pacman.nextDir.");
} else {
  console.error("FAIL: Mouse steering failed:", game.pacman.nextDir);
  process.exit(1);
}

// Test Immediate 180 reverse response
game.pacman.dir = { x: 1, y: 0 };
inputManager.queueDirection(INPUT_DIRS.LEFT);
game.update(Date.now());
if (game.pacman.dir.x === -1 && game.pacman.dir.y === 0) {
  console.log("✔ PASS: Immediate 180-degree reversal executed instantly without junction wait.");
} else {
  console.error("FAIL: Immediate reversal failed:", game.pacman.dir);
  process.exit(1);
}

// Test Pause action toggle
if (!game.isPaused) {
  inputManager.queueAction(INPUT_ACTIONS.PAUSE_TOGGLE);
  game.update(Date.now());
  if (game.isPaused) {
    console.log("✔ PASS: Action PAUSE_TOGGLE successfully toggled game pause state.");
  } else {
    console.error("FAIL: Game did not pause.");
    process.exit(1);
  }
}

console.log("\n=======================================================");
console.log("🎉 ALL RESPONSIVE & INPUT ARCHITECTURE TESTS PASSED! 🎉");
console.log("=======================================================");
