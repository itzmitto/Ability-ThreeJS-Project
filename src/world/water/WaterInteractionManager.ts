import type { Vector3 } from "three";
export interface WaterRipple {
  position: Readonly<Vector3>;
  strength: number;
  duration: number;
  waveSpeed: number;
  wavelength?: number;
  radius?: number;
}
export type WaterHandle = number;
/** Fixed uniform buffer. Generation handles prevent old owners removing recycled slots. */
export class WaterInteractionManager {
  readonly data = new Float32Array(32 * 4);
  readonly shape = new Float32Array(32 * 4);
  private readonly handles = new Int32Array(32);
  private readonly owners: (object | undefined)[] = new Array(32);
  private serial = 0;
  private clock = 0;
  capacity = 32;
  emitted = 0;
  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < 32; i++) if (this.handles[i]) n++;
    return n;
  }
  addRipple(r: WaterRipple, owner?: object): WaterHandle {
    if (
      ![r.position.x, r.position.z, r.strength, r.duration, r.waveSpeed].every(
        Number.isFinite,
      ) ||
      r.duration <= 0
    )
      return 0;
    let slot = -1,
      oldest = Infinity;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.handles[i]) {
        slot = i;
        break;
      }
      if (this.data[i * 4 + 2] < oldest) {
        oldest = this.data[i * 4 + 2];
        slot = i;
      }
    }
    if (slot < 0) return 0;
    const k = slot * 4;
    this.data[k] = r.position.x;
    this.data[k + 1] = r.position.z;
    this.data[k + 2] = this.clock;
    this.data[k + 3] = r.strength;
    this.shape[k] = r.waveSpeed;
    this.shape[k + 1] = r.wavelength ?? 0.4;
    this.shape[k + 2] = r.duration;
    this.shape[k + 3] = r.radius ?? 0.15;
    this.handles[slot] = ++this.serial;
    this.owners[slot] = owner;
    this.emitted++;
    return this.serial;
  }
  removeDisturbance(handle: WaterHandle): void {
    for (let i = 0; i < 32; i++) if (this.handles[i] === handle) this.clear(i);
  }
  removeOwner(owner: object): void {
    for (let i = 0; i < 32; i++) if (this.owners[i] === owner) this.clear(i);
  }
  update(time: number): void {
    this.clock = time;
    for (let i = 0; i < 32; i++)
      if (
        this.handles[i] &&
        time - this.data[i * 4 + 2] >= this.shape[i * 4 + 2]
      )
        this.clear(i);
  }
  setCapacity(n: number): void {
    this.capacity = Math.max(
      1,
      Math.min(32, n),
    ); /* Existing disturbances keep their natural lifetime across tier changes. */
  }
  private clear(i: number): void {
    this.handles[i] = 0;
    this.data[i * 4 + 3] = 0;
    this.owners[i] = undefined;
  }
  dispose(): void {
    for (let i = 0; i < 32; i++) this.clear(i);
  }
}
