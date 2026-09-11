/**
 * PAC-MAN: INFINITE NEON - Universal Input Manager
 * Decouples all hardware and DOM input streams (Keyboard, Mouse, Touch Swipe, 
 * On-screen D-pad, and Gamepad) from the Game physics and rendering loops.
 */

export const INPUT_DIRS = {
  UP:    { x: 0, y: -1, name: 'UP' },
  DOWN:  { x: 0, y: 1,  name: 'DOWN' },
  LEFT:  { x: -1, y: 0, name: 'LEFT' },
  RIGHT: { x: 1, y: 0,  name: 'RIGHT' }
};

export const INPUT_ACTIONS = {
  PAUSE_TOGGLE: 'PAUSE_TOGGLE',
  RESTART: 'RESTART',
  MUTE_TOGGLE: 'MUTE_TOGGLE'
};

export class InputManager {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.dpad = options.dpad || {};
    this.onAudioResume = options.onAudioResume || null;

    // Buffered intents
    this.bufferedDirection = null;
    this.directionTimestamp = 0;
    this.bufferTimeoutMs = 350; // Cornering pre-turn forgiveness window

    // Action queue
    this.actionQueue = new Set();

    // Gamepad tracking
    this.gamepadConnected = false;
    this.prevGamepadButtons = {};
    this.gamepadDeadzone = 0.30;

    // Mouse drag / click tracking
    this.isMouseDown = false;
    this.mouseStartX = 0;
    this.mouseStartY = 0;

    // Touch swipe tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.minSwipeDist = 20;

    // Bound event handlers for cleanup
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

  peekDirection() {
    return this.bufferedDirection;
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
