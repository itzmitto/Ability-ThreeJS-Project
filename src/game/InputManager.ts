export class InputManager {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private deltaX = 0;
  private deltaY = 0;
  private castRequested = false;
  aiming = false;
  pointerLocked = false;
  private controller = new AbortController();
  constructor(canvas: HTMLCanvasElement) {
    const options = { signal: this.controller.signal };
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'F3'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.held.add(event.code);
    }, options);
    window.addEventListener('keyup', event => this.held.delete(event.code), options);
    window.addEventListener('blur', this.clear, options);
    document.addEventListener('visibilitychange', this.clear, options);
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      this.clear();
    }, options);
    document.addEventListener('mousemove', event => {
      if (this.pointerLocked || ((event.buttons === 1 || event.buttons === 2) && event.target === canvas)) {
        this.deltaX += event.movementX;
        this.deltaY += event.movementY;
      }
    }, options);
    canvas.addEventListener('mousedown', event => {
      if (event.button === 0) {
        this.castRequested = true;
        if (!this.pointerLocked) {
          const request = canvas.requestPointerLock();
          if (request) request.catch(() => { /* Right-drag remains available if lock is denied. */ });
        }
      }
      if (event.button === 2) this.aiming = true;
    }, options);
    window.addEventListener('mouseup', event => { if (event.button === 2) this.aiming = false; }, options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
  }
  isHeld(code: string): boolean { return this.held.has(code); }
  wasPressed(code: string): boolean { return this.pressed.has(code); }
  get mouseX(): number { return this.deltaX; }
  get mouseY(): number { return this.deltaY; }
  get wantsCast(): boolean { return this.castRequested; }
  endFrame(): void { this.pressed.clear(); this.deltaX = 0; this.deltaY = 0; this.castRequested = false; }
  private clear = (): void => { this.held.clear(); this.pressed.clear(); this.deltaX = 0; this.deltaY = 0; this.castRequested = false; this.aiming = false; };
  dispose(): void { this.controller.abort(); if (this.pointerLocked) document.exitPointerLock(); this.clear(); }
}
