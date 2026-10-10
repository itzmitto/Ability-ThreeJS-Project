import type { Vector3 } from "three";
export interface WaterRipple {
  position: Readonly<Vector3>;
  strength: number;
  duration: number;
  waveSpeed: number;
  wavelength?: number;
  radius?: number;
  /** Optional bounded large-impact amplitude and spatial falloff; ordinary ripples retain their defaults. */
  displacementScale?: number;
  attenuation?: number;
}
export type WaterHandle = number;
export interface WaterSplit {start:Readonly<Vector3>;end:Readonly<Vector3>;width:number;depth:number;duration:number;}
/** Fixed uniform buffer. Generation handles prevent old owners removing recycled slots. */
export class WaterInteractionManager {
  readonly data = new Float32Array(32 * 4);
  readonly shape = new Float32Array(32 * 4);
  readonly extent = new Float32Array(32 * 2);
  readonly splits=new Float32Array(4*4);
  readonly splitShape=new Float32Array(4*4);
  private readonly splitHandles=new Int32Array(4);
  private readonly splitOwners:(object|undefined)[]=new Array(4);
  private readonly handles = new Int32Array(32);
  private readonly owners: (object | undefined)[] = new Array(32);
  private serial = 0;
  private clock = 0;
  capacity = 32;
  emitted = 0;
  private heightSampler?: (x:number,z:number)=>number;
  setHeightSampler(sampler:((x:number,z:number)=>number)|undefined):void{this.heightSampler=sampler;}
  getSurfaceHeight(x:number,z:number):number{const y=this.heightSampler?.(x,z)??0;return Number.isFinite(y)?y:0;}
  private readonly listeners = new Set<(r: WaterRipple) => void>();
  subscribe(listener: (r: WaterRipple) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < 32; i++) if (this.handles[i]) n++;
    for(let i=0;i<4;i++)if(this.splitHandles[i])n++;
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
    this.extent[slot*2] = Number.isFinite(r.displacementScale) ? Math.max(.18,Math.min(2.4,r.displacementScale!)) : .18;
    this.extent[slot*2+1] = Number.isFinite(r.attenuation) ? Math.max(.012,Math.min(.1,r.attenuation!)) : .075;
    this.handles[slot] = ++this.serial;
    this.owners[slot] = owner;
    this.emitted++;
    for (const listener of this.listeners) listener(r);
    return this.serial;
  }
  removeDisturbance(handle: WaterHandle): void {
    for (let i = 0; i < 32; i++) if (this.handles[i] === handle) this.clear(i);
    for(let i=0;i<4;i++)if(this.splitHandles[i]===handle)this.clearSplit(i);
  }
  removeOwner(owner: object): void {
    for (let i = 0; i < 32; i++) if (this.owners[i] === owner) this.clear(i);
    for(let i=0;i<4;i++)if(this.splitOwners[i]===owner)this.clearSplit(i);
  }
  update(time: number): void {
    this.clock = time;
    for(let i=0;i<4;i++)if(this.splitHandles[i]&&time-this.splitShape[i*4]>=this.splitShape[i*4+1])this.clearSplit(i);
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
  addSplit(s:WaterSplit,owner?:object):WaterHandle{
    if(![s.start.x,s.start.z,s.end.x,s.end.z,s.width,s.depth,s.duration].every(Number.isFinite)||s.duration<=0||Math.hypot(s.end.x-s.start.x,s.end.z-s.start.z)<1)return 0;
    let slot=this.splitHandles.findIndex(h=>h===0);if(slot<0){slot=0;for(let i=1;i<4;i++)if(this.splitShape[i*4]<this.splitShape[slot*4])slot=i;}
    const k=slot*4;this.splits[k]=s.start.x;this.splits[k+1]=s.start.z;this.splits[k+2]=s.end.x;this.splits[k+3]=s.end.z;
    this.splitShape[k]=this.clock;this.splitShape[k+1]=Math.min(5,s.duration);this.splitShape[k+2]=Math.max(3,Math.min(14,s.width));this.splitShape[k+3]=Math.max(.1,Math.min(2.5,s.depth));
    this.splitHandles[slot]=++this.serial;this.splitOwners[slot]=owner;return this.serial;
  }
  private clearSplit(i:number):void{this.splitHandles[i]=0;this.splitOwners[i]=undefined;this.splitShape[i*4+3]=0;}
  private clear(i: number): void {
    this.handles[i] = 0;
    this.data[i * 4 + 3] = 0;
    this.extent[i*2]=this.extent[i*2+1]=0;
    this.owners[i] = undefined;
  }
  dispose(): void {
    this.heightSampler=undefined;
    this.listeners.clear();
    for (let i = 0; i < 32; i++) this.clear(i);
    for(let i=0;i<4;i++)this.clearSplit(i);
  }
}
