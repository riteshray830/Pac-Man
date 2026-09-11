import { InputManager, INPUT_DIRS, INPUT_ACTIONS } from './src/inputManager.js';

console.log("=== RUNNING INPUT MANAGER VERIFICATION SUITE ===");

// Test 1: Instantiation without DOM (Node environment safe)
const input = new InputManager();
if (input) {
  console.log("✔ PASS: InputManager instantiated safely in headless/Node environment.");
} else {
  console.error("FAIL: Could not instantiate InputManager.");
  process.exit(1);
}

// Test 2: Direction queuing and buffering
input.queueDirection(INPUT_DIRS.UP);
const queued = input.consumeDirection();
if (queued && queued.name === 'UP' && queued.y === -1) {
  console.log("✔ PASS: Direction buffering and consumption works as expected.");
} else {
  console.error("FAIL: Direction buffering failed:", queued);
  process.exit(1);
}

// Test 3: Buffer expiration (pre-turn window)
input.queueDirection(INPUT_DIRS.RIGHT);
const nowTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
input.directionTimestamp = nowTime - 500;
const expired = input.consumeDirection();
if (expired === null) {
  console.log("✔ PASS: Stale buffered direction gracefully expired beyond pre-turn threshold.");
} else {
  console.error("FAIL: Stale buffered direction did not expire.");
  process.exit(1);
}

// Test 4: Action queuing and consumption
input.queueAction(INPUT_ACTIONS.PAUSE_TOGGLE);
if (input.consumeAction(INPUT_ACTIONS.PAUSE_TOGGLE)) {
  console.log("✔ PASS: Action PAUSE_TOGGLE consumed correctly.");
} else {
  console.error("FAIL: Action PAUSE_TOGGLE was not consumed.");
  process.exit(1);
}

if (!input.consumeAction(INPUT_ACTIONS.PAUSE_TOGGLE)) {
  console.log("✔ PASS: Action queue correctly flushed after consumption (no duplicate triggers).");
} else {
  console.error("FAIL: Action queue repeated consumption.");
  process.exit(1);
}

// Test 5: Mouse delta steering calculation
input._steerByDelta(40, 5); // Right
let d = input.consumeDirection();
if (d && d.name === 'RIGHT') {
  console.log("✔ PASS: Mouse right-vector steering calculated correctly.");
} else {
  console.error("FAIL: Mouse right steering:", d);
  process.exit(1);
}

input._steerByDelta(-5, -60); // Up
d = input.consumeDirection();
if (d && d.name === 'UP') {
  console.log("✔ PASS: Mouse up-vector steering calculated correctly.");
} else {
  console.error("FAIL: Mouse up steering:", d);
  process.exit(1);
}

// Test 6: Mock Gamepad polling
let mockGamepad = {
  connected: true,
  axes: [0.8, 0.05], // X deflected right > deadzone 0.30
  buttons: Array.from({ length: 16 }, () => ({ pressed: false }))
};

Object.defineProperty(globalThis.navigator, 'getGamepads', {
  value: () => [mockGamepad],
  configurable: true,
  writable: true
});

input.update(); // Polls gamepad
d = input.consumeDirection();
if (d && d.name === 'RIGHT') {
  console.log("✔ PASS: Gamepad analog stick deflection registered above deadzone.");
} else {
  console.error("FAIL: Gamepad analog stick polling failed:", d);
  process.exit(1);
}

// Test 7: Gamepad button edge detection (Pause toggle)
mockGamepad.axes = [0, 0];
mockGamepad.buttons[9] = { pressed: true }; // Start button pressed
input.update();
if (input.consumeAction(INPUT_ACTIONS.PAUSE_TOGGLE)) {
  console.log("✔ PASS: Gamepad Start button triggered PAUSE_TOGGLE on leading edge.");
} else {
  console.error("FAIL: Gamepad Start button did not trigger PAUSE_TOGGLE.");
  process.exit(1);
}

// Held button on next frame should NOT trigger again
input.update();
if (!input.consumeAction(INPUT_ACTIONS.PAUSE_TOGGLE)) {
  console.log("✔ PASS: Gamepad Start button edge detection prevented repeat trigger while held.");
} else {
  console.error("FAIL: Gamepad Start button re-triggered while held (edge detection failed).");
  process.exit(1);
}

console.log("\nALL INPUT TESTS PASSED PERFECTLY!");
