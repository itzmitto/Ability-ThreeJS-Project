import { AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, InstancedMesh, Object3D, Points, ShaderMaterial, Vector3 } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import { cometSeed, type CometConfig, type CometQuality } from './EmberCometConfig';
import type { CometResources } from './EmberCometGeometry';
import { createCometRockMaterial } from './EmberCometMaterials';

/** Fixed GPU-motion ring buffer. Separate blend layers distinguish heat grains from ash and steam. */
class CometEmitter {
  readonly geometry = new BufferGeometry(); readonly material: ShaderMaterial; readonly mesh: Points;
  readonly spawn: BufferAttribute; readonly velocity: BufferAttribute; readonly shape: BufferAttribute;
  private cursor = 0; private highWater = 0; private budget: number; active = 0;
  constructor(readonly maximum: number, readonly vapor: boolean) {
    this.budget = maximum;
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(maximum * 3), 3));
    this.spawn = new BufferAttribute(new Float32Array(maximum * 4).fill(-999), 4).setUsage(DynamicDrawUsage);
    this.velocity = new BufferAttribute(new Float32Array(maximum * 4), 4).setUsage(DynamicDrawUsage);
    this.shape = new BufferAttribute(new Float32Array(maximum * 4), 4).setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('aSpawn', this.spawn); this.geometry.setAttribute('aVelocity', this.velocity); this.geometry.setAttribute('aShape', this.shape);
    this.material = new ShaderMaterial({ transparent: true, depthWrite: false, ...(vapor ? {} : { blending: AdditiveBlending }),
      uniforms: { uTime: { value: 0 }, uPixelScale: { value: 450 } },
      vertexShader: `attribute vec4 aSpawn,aVelocity,aShape;uniform float uTime,uPixelScale;varying float vAlpha,vSeed,vKind;varying vec3 vWorld;
        void main(){float age=uTime-aSpawn.w,life=max(.01,aVelocity.w),f=clamp(age/life,0.,1.);float drag=${vapor ? '2.1' : '1.2'};
        float travel=(1.-exp(-max(0.,age)*drag))/drag;vec3 p=aSpawn.xyz+aVelocity.xyz*travel;
        p.y+=${vapor ? '.23' : '-.8'}*age*age;
        p.xz+=vec2(sin(age*7.+aShape.z*34.),cos(age*5.+aShape.z*21.))*max(0.,age)*${vapor ? '.15' : '.05'};
        vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aShape.x*uPixelScale/max(1.,-mv.z)*${vapor ? '(1.+f*1.8)' : '(1.-f*.5)'},1.,${vapor ? '100.' : '28.'});
        vAlpha=step(0.,age)*(1.-step(life,age))*smoothstep(0.,.05,f)*(1.-smoothstep(.5,1.,f));
        if(vAlpha<.001)gl_Position=vec4(2.,2.,2.,1.);vSeed=aShape.z;vKind=aShape.y;vWorld=p;}`,
      fragmentShader: `uniform float uTime;varying float vAlpha,vSeed,vKind;varying vec3 vWorld;${vapor ? frostNoise : ''}
        void main(){vec2 p=gl_PointCoord*2.-1.;float alpha;vec3 color;
        ${vapor ? `float n=snoise(vec3(p*3.+vSeed*15.,uTime*.7));
          float flow=snoise(vWorld*.8+vec3(0.,uTime*.4,0.));
          alpha=exp(-dot(p,p)*3.)*(1.-smoothstep(.55,1.,dot(p,p)))*smoothstep(-.65,.5,n+flow*.2);
          color=mix(vec3(.12,.09,.075),vec3(.40,.43,.42),vKind);alpha*=mix(.16,.14,vKind);`
        : `float streak=abs(p.x+p.y*.24)*mix(1.,4.,vKind)+abs(p.y)*.65;
          alpha=1.-smoothstep(.3,.85,streak);color=mix(vec3(1.1,.11,.003),vec3(1.6,1.,.28),vSeed);`}
        alpha*=vAlpha;if(alpha<.003)discard;gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
    this.mesh = new Points(this.geometry, this.material); this.mesh.frustumCulled = false; this.mesh.renderOrder = vapor ? 5 : 4;
  }
  setBudget(n: number): void { this.budget = Math.min(this.maximum, n); this.cursor %= this.budget; }
  emit(t: number, p: Vector3, v: Vector3, size: number, life: number, kind: number, seed: number): void {
    const i = this.cursor; this.cursor = (i + 1) % this.budget; this.highWater = Math.max(this.highWater, i + 1);
    this.spawn.setXYZW(i, p.x, p.y, p.z, t); this.velocity.setXYZW(i, v.x, v.y, v.z, life); this.shape.setXYZW(i, size, kind, seed, 0);
    this.spawn.needsUpdate = this.velocity.needsUpdate = this.shape.needsUpdate = true;
  }
  update(t: number, pixels: number): void {
    const count = Math.min(this.highWater, this.budget); this.geometry.setDrawRange(0, count); this.active = 0;
    for (let i = 0; i < count; i++) if (t >= this.spawn.getW(i) && t < this.spawn.getW(i) + this.velocity.getW(i)) this.active++;
    this.mesh.visible = this.active > 0; this.material.uniforms.uTime.value = t; this.material.uniforms.uPixelScale.value = pixels;
  }
  reset(): void { this.cursor = this.highWater = this.active = 0; this.spawn.array.fill(-999); this.spawn.needsUpdate = true; this.mesh.visible = false; }
  dispose(): void { this.geometry.dispose(); this.material.dispose(); this.mesh.removeFromParent(); }
}
type Fragment = { p: Vector3; v: Vector3; size: number; seed: number };
export class EmberCometParticles {
  readonly root = new Group(); readonly rocks: InstancedMesh[];
  private readonly glow = new CometEmitter(520, false); private readonly vapor = new CometEmitter(180, true);
  private readonly rockMaterial = createCometRockMaterial();
  private readonly fragments: Fragment[] = Array.from({ length: 60 }, (_, i) => ({ p: new Vector3(), v: new Vector3(), size: 0, seed: cometSeed(i + 73) }));
  private readonly dummy = new Object3D(); private readonly p = new Vector3(); private readonly v = new Vector3();
  private emission = 0; private vaporEmission = 0; private serial = 0; private hitTime = -1; private rockCount = 0;
  constructor(resources: CometResources) {
    this.rocks = resources.fragments.map(g => { const m = new InstancedMesh(g, this.rockMaterial.material, 20); m.instanceMatrix.setUsage(DynamicDrawUsage); m.frustumCulled = false; m.count = 0; this.root.add(m); return m; });
    this.root.add(this.glow.mesh, this.vapor.mesh);
  }
  setQuality(q: CometQuality): void { this.glow.setBudget(q.glowParticles); this.vapor.setBudget(q.vaporParticles); }
  emitFlight(t: number, dt: number, position: Vector3, previous: Vector3, direction: Vector3, q: CometQuality, c: Readonly<CometConfig>, charge = false): void {
    const ratio = q.glowParticles / 520; this.emission += Math.min(dt, .05) * (c.emberRate + c.sparkRate) * ratio;
    const count = Math.min(24, Math.floor(this.emission)); this.emission -= count;
    for (let i = 0; i < count; i++) {
      const seed = cometSeed(this.serial++), angle = seed * Math.PI * 2;
      this.p.copy(previous).lerp(position, (i + .5) / Math.max(1, count));
      this.p.x += Math.cos(angle) * (charge ? .3 : .24); this.p.y += Math.sin(angle) * .24;
      this.v.copy(direction).multiplyScalar(charge ? 0 : -3 - seed * 4); this.v.x += Math.cos(angle) * 1.3; this.v.y += 1 + Math.sin(angle) * 1.1;
      if (charge) this.v.set((position.x - this.p.x) * 5, (position.y - this.p.y) * 5, (position.z - this.p.z) * 5);
      const spark = seed < c.sparkRate / (c.emberRate + c.sparkRate);
      this.glow.emit(t, this.p, this.v, spark ? .10 : .065, .35 + seed * .7, Number(spark), seed);
    }
    this.vaporEmission += Math.min(dt, .05) * (charge ? 10 : 32) * q.vaporParticles / 180;
    const ashCount = Math.min(4, Math.floor(this.vaporEmission)); this.vaporEmission -= ashCount;
    for (let i = 0; i < ashCount; i++) { const seed = cometSeed(this.serial++); this.v.copy(direction).multiplyScalar(-2).addScaledVector(this.p.set(0, 1, 0), .5); this.vapor.emit(t, position, this.v, .25 + seed * .2, 1.2, 0, seed); }
  }
  impact(t: number, p: Vector3, direction: Vector3, q: CometQuality, c: Readonly<CometConfig>): void {
    this.hitTime = t; this.rockCount = q.fragments;
    for (let i = 0; i < this.rockCount; i++) {
      const f = this.fragments[i], a = i * 2.39996, seed = f.seed;
      f.p.copy(p); f.p.y += .4; f.v.copy(direction).multiplyScalar(2 + seed * 4);
      f.v.x += Math.cos(a) * (3 + seed * 6); f.v.z += Math.sin(a) * (3 + seed * 6); f.v.y = 3 + seed * 5;
      f.size = (.14 + seed * .32) * c.projectileRadius / .82;
    }
    for (let i = 0; i < Math.floor(q.glowParticles * .8); i++) {
      const seed = cometSeed(this.serial++), a = i * 2.39996;
      this.v.set(Math.cos(a) * (3 + seed * 10), 1 + seed * 7, Math.sin(a) * (3 + seed * 10)).addScaledVector(direction, seed * 3);
      this.glow.emit(t, p, this.v, seed > .6 ? .13 : .08, .35 + seed * 1.8, Number(seed > .6), seed);
    }
    const steam = Math.min(q.vaporParticles, Math.round(q.vaporParticles * .75 * c.steamAmount));
    for (let i = 0; i < steam; i++) {
      const seed = cometSeed(this.serial++), a = i * 2.39996; this.p.copy(p); this.p.y += .15;
      this.p.x += Math.cos(a) * (.25 + seed * .9); this.p.z += Math.sin(a) * (.25 + seed * .9);
      this.v.set(Math.cos(a) * (1 + seed * 3), 1 + seed * 2, Math.sin(a) * (1 + seed * 3));
      this.vapor.emit(t + seed * .12, this.p, this.v, .65 + seed * .65, 1 + seed * 1.5, i % 4 ? 1 : 0, seed);
    }
  }
  update(t: number, pixels: number, q: CometQuality, c: Readonly<CometConfig>): void {
    this.glow.update(t, pixels); this.vapor.update(t, pixels);
    for (const m of this.rocks) m.count = 0;
    const age = t - this.hitTime;
    if (this.hitTime >= 0 && age < 2.4) for (let i = 0; i < Math.min(this.rockCount, q.fragments); i++) {
      const f = this.fragments[i], drag = (1 - Math.exp(-age * .7)) / .7;
      this.dummy.position.copy(f.p).addScaledVector(f.v, drag); this.dummy.position.y -= 4.9 * age * age;
      if (this.dummy.position.y < f.p.y - .7) continue;
      this.dummy.rotation.set(age * (3 + f.seed * 4), age * 3 + f.seed * 6, age * (2 + f.seed * 5));
      this.dummy.scale.setScalar(f.size * (1 - Math.max(0, (age - 1.4) / 1)));
      this.dummy.updateMatrix(); const mesh = this.rocks[i % 3]; mesh.setMatrixAt(mesh.count++, this.dummy.matrix);
    }
    this.rockMaterial.uniforms.uCometTime.value = t; this.rockMaterial.uniforms.uCrackGlow.value = c.shellCrackGlow;
    this.rockMaterial.uniforms.uHeat.value = Math.max(0, 1 - Math.max(0, age) / 1.3); this.rockMaterial.uniforms.uDetail.value = q.detail;
    this.rocks.forEach(m => { m.visible = m.count > 0; m.instanceMatrix.needsUpdate = true; });
  }
  get particleCount(): number { return this.glow.active + this.vapor.active; }
  get instanceCount(): number { return this.rocks.reduce((n, m) => n + m.count, 0); }
  reset(): void { this.glow.reset(); this.vapor.reset(); this.emission = this.vaporEmission = this.serial = this.rockCount = 0; this.hitTime = -1; this.rocks.forEach(m => { m.count = 0; m.visible = false; }); }
  dispose(): void { this.glow.dispose(); this.vapor.dispose(); this.rocks.forEach(m => m.dispose()); this.rockMaterial.material.dispose(); this.root.clear(); }
}
