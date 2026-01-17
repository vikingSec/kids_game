// Tracks which keys are currently pressed
export class Input {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;

  // Mouse button tracking
  private mouseButtons: Set<number> = new Set();
  private mouseButtonsJustPressed: Set<number> = new Set();
  private mouseButtonsJustReleased: Set<number> = new Set();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.keys.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement !== null;
  };

  private onMouseDown = (e: MouseEvent) => {
    this.mouseButtons.add(e.button);
    this.mouseButtonsJustPressed.add(e.button);
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseButtons.delete(e.button);
    this.mouseButtonsJustReleased.add(e.button);
  };

  // Request pointer lock (call on click)
  requestPointerLock(element: HTMLElement) {
    element.requestPointerLock();
  }

  // Check if a key is currently pressed
  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  // Movement helpers
  get forward(): boolean {
    return this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp');
  }

  get backward(): boolean {
    return this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown');
  }

  get left(): boolean {
    return this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft');
  }

  get right(): boolean {
    return this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight');
  }

  get jump(): boolean {
    return this.isKeyDown('Space');
  }

  get jumpJustPressed(): boolean {
    return this.keysJustPressed.has('Space');
  }

  get sprint(): boolean {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
  }

  // Mouse button helpers (0 = left, 1 = middle, 2 = right)
  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  isMouseButtonJustPressed(button: number): boolean {
    return this.mouseButtonsJustPressed.has(button);
  }

  isMouseButtonJustReleased(button: number): boolean {
    return this.mouseButtonsJustReleased.has(button);
  }

  // Web swing with left click
  get webShoot(): boolean {
    return this.isMouseButtonDown(0);
  }

  get webShootJustPressed(): boolean {
    return this.isMouseButtonJustPressed(0);
  }

  get webShootJustReleased(): boolean {
    return this.isMouseButtonJustReleased(0);
  }

  // Call at end of frame to clear just-pressed/released states
  endFrame() {
    this.keysJustPressed.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseButtonsJustReleased.clear();
  }

  // Get and reset mouse delta (call once per frame)
  getMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  get pointerLocked(): boolean {
    return this.isPointerLocked;
  }

  // Clean up event listeners
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
