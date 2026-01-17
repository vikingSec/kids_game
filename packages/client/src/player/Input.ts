// Tracks which keys are currently pressed
export class Input {
  private keys: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onKeyDown = (e: KeyboardEvent) => {
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

  get sprint(): boolean {
    return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
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
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
