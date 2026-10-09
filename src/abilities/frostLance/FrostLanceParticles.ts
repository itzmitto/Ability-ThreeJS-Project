// Source-inspired IceAbility emission events; adapted to this sandbox's GPU-buffer pattern.
// Copyright (c) 2026 mohamedachrefelouafi — MIT; public/licenses/LinearAbilityExtThreeJS.txt.
import { AdditiveBlending, Color, DoubleSide, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { createShardGeometry } from './FrostLanceGeometry';
import { FROST_LANCE as c } from './FrostLanceConfig';
interface Emission {
    radius: number;
    speed: number;
    size: number;
    life: number;
    spin: number;
}
class FrostEmitter {
    readonly mesh: InstancedMesh;
    readonly material: ShaderMaterial;
    private readonly spawn: InstancedBufferAttribute;
    private readonly motion: InstancedBufferAttribute;
    private readonly shape: InstancedBufferAttribute;
    private cursor = 0;
    private budget: number;
    private highWater = 0;
    active = 0;
    constructor(root: Group, readonly maximum: number, readonly kind: 'mist' | 'shard' | 'glitter') {
        this.budget = maximum;
        const geometry = kind === 'shard' ? createShardGeometry() : new PlaneGeometry(1, 1);
        this.spawn = new InstancedBufferAttribute(new Float32Array(maximum * 4).fill(-999), 4);
        this.motion = new InstancedBufferAttribute(new Float32Array(maximum * 4), 4);
        this.shape = new InstancedBufferAttribute(new Float32Array(maximum * 4), 4);
        for (const a of [this.spawn, this.motion, this.shape])
            a.setUsage(DynamicDrawUsage);
        geometry.setAttribute('aSpawn', this.spawn);
        geometry.setAttribute('aMotion', this.motion);
        geometry.setAttribute('aShape', this.shape);
        const colors = kind === 'mist' ? [c.colorMistA, c.colorMistB, c.colorMistC, c.colorMistD] : kind === 'shard' ? [c.colorShardA, c.colorShardB, c.colorShardC, c.colorShardD] : [c.colorSparkleA, c.colorSparkleB, c.colorSparkleC, c.colorSparkleD];
        this.material = new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, blending: kind === 'glitter' ? AdditiveBlending : NormalBlending,
            uniforms: { uTime: { value: 0 }, uKind: { value: kind === 'mist' ? 0 : kind === 'shard' ? 1 : 2 }, uA: { value: new Color(colors[0]) }, uB: { value: new Color(colors[1]) }, uC: { value: new Color(colors[2]) }, uD: { value: new Color(colors[3]) } },
            vertexShader: `attribute vec4 aSpawn,aMotion,aShape;uniform float uTime,uKind;varying vec2 vUv;varying float vLife,vAlpha,vLight;
      void main(){float age=uTime-aSpawn.w;float life=max(.01,aMotion.w);vLife=clamp(age/life,0.,1.);vAlpha=step(0.,age)*(1.-step(life,age));
        float drag=uKind<.5?1.9:uKind<1.5?.22:1.1;float travel=(1.-exp(-max(0.,age)*drag))/drag;
        vec3 p=aSpawn.xyz+aMotion.xyz*travel;float seed=aShape.z;
        if(uKind>.5&&uKind<1.5)p.y+=.5*${c.shardGravity.toFixed(1)}*age*age;
        else {p.y+=age*(uKind<.5?.35:1.6);p.x+=sin(age*1.7+seed*8.)*age*.25;p.z+=cos(age*1.9+seed*11.)*age*.25;}
        float size=aShape.x*(uKind<.5?mix(.1,3.4,smoothstep(0.,.75,vLife)):uKind<1.5?mix(1.,.85,vLife):mix(1.,.18,vLife));
        vec3 local=position*size;float angle=aShape.y*age+seed*6.283;float co=cos(angle),si=sin(angle);
        // Water adapter: rolling, shallow fog rather than a rising billboard cloud.
        if(uKind<.5){p.y=aSpawn.y+travel*.18+age*.12;local.y*=.38;}
        vec2 xy=mat2(co,-si,si,co)*local.xy;vUv=position.xy+vec2(.5);vLight=.55+.45*abs(dot(normal,normalize(vec3(-.5,.8,.3))));
        if(uKind>.5&&uKind<1.5){local.xy=xy;p+=local;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}
        else{vec4 mv=viewMatrix*vec4(p,1.);mv.xy+=xy;gl_Position=projectionMatrix*mv;}
        if(vAlpha<.01)gl_Position=vec4(2.,2.,2.,1.);
        vAlpha*=smoothstep(0.,uKind<.5?.14:.06,vLife)*(1.-smoothstep(uKind<1.5?.7:.65,1.,vLife));}`,
            fragmentShader: `uniform float uKind;uniform vec3 uA,uB,uC,uD;varying vec2 vUv;varying float vLife,vAlpha,vLight;
      void main(){vec3 col=vLife<.33?mix(uA,uB,vLife*3.):vLife<.66?mix(uB,uC,(vLife-.33)*3.):mix(uC,uD,(vLife-.66)*3.);
        float a=vAlpha;vec2 p=vUv*2.-1.;float r=dot(p,p);
        if(uKind<.5){a*=exp(-r*3.5)*(1.-smoothstep(.55,1.,r))*${c.mistOpacity.toFixed(2)};}
        else if(uKind>1.5){a*=exp(-r*6.)*(1.-smoothstep(.6,1.,r));col*=.9;}
        else col*=vLight;
        if(a<.001)discard;gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
        this.mesh = new InstancedMesh(geometry, this.material, maximum);
        this.mesh.count = 0;
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 4;
        root.add(this.mesh);
    }
    setBudget(count: number): void { this.budget = Math.min(this.maximum, Math.max(1, count)); this.cursor %= this.budget; }
    emit(time: number, count: number, position: Vector3, o: Emission): void {
        for (let n = 0; n < Math.min(count, this.budget); n++) {
            const i = this.cursor;
            this.cursor = (i + 1) % this.budget;
            this.highWater = Math.max(this.highWater, i + 1);
            const angle = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * o.radius, speed = o.speed * (.3 + Math.random() * 1.4);
            this.spawn.setXYZW(i, position.x + Math.cos(angle) * r, position.y, position.z + Math.sin(angle) * r, time);
            this.motion.setXYZW(i, Math.cos(angle) * speed * .75, speed * (.5 + Math.random() * .8), Math.sin(angle) * speed * .75, o.life * (.6 + Math.random() * .8));
            this.shape.setXYZW(i, o.size * (.3 + Math.random() * 1.4), o.spin, Math.random(), 0);
        }
        this.spawn.needsUpdate = this.motion.needsUpdate = this.shape.needsUpdate = true;
    }
    update(time: number): void {
        this.material.uniforms.uTime.value = time;
        this.mesh.count = Math.min(this.highWater, this.budget);
        this.active = 0;
        for (let i = 0; i < this.mesh.count; i++)
            if (time - this.spawn.getW(i) < this.motion.getW(i))
                this.active++;
        this.mesh.visible = this.active > 0;
    }
    reset(): void { this.cursor = this.highWater = this.active = 0; this.mesh.count = 0; this.mesh.visible = false; this.spawn.array.fill(-999); this.spawn.needsUpdate = true; }
    dispose(): void { this.mesh.removeFromParent(); this.mesh.dispose(); this.mesh.geometry.dispose(); this.material.dispose(); }
}
/** Three bounded ring-buffer emitters, no independent mesh or callback per particle. */
export class FrostLanceParticles {
    readonly root = new Group();
    private readonly mist = new FrostEmitter(this.root, 3200, 'mist');
    private readonly shards = new FrostEmitter(this.root, 2400, 'shard');
    private readonly glitter = new FrostEmitter(this.root, 2800, 'glitter');
    private factor = 1;
    private mistRemainder = 0;
    private glitterRemainder = 0;
    setQuality(q: {
        mist: number;
        shards: number;
        glitter: number;
        particles: number;
    }): void { this.factor = q.particles; this.mist.setBudget(q.mist); this.shards.setBudget(q.shards); this.glitter.setBudget(q.glitter); }
    breach(t: number, p: Vector3, radius: number): void {
        this.shards.emit(t, Math.round(3 * this.factor), p, { radius: radius * .8, speed: c.shardSpeed, size: .1 * c.shardSize * 7, life: c.shardLifetime, spin: 7 });
        if (Math.random() < .4)
            this.mist.emit(t, Math.round(2 * this.factor), p, { radius: radius * .8, speed: .7 * c.mistSpeed, size: .6 * c.mistSize, life: c.mistLifetime * .7 * 1.4, spin: .5 });
    }
    front(t: number, dt: number, p: Vector3, width: number): void {
        this.mistRemainder += dt * c.mistRate * this.factor;
        this.glitterRemainder += dt * c.sparkleRate * this.factor;
        const m = Math.floor(this.mistRemainder), g = Math.floor(this.glitterRemainder);
        this.mistRemainder -= m;
        this.glitterRemainder -= g;
        this.mist.emit(t, m, p, { radius: width * .9, speed: c.mistSpeed * c.mistSpeed, size: .9 * c.mistSize, life: c.mistLifetime * 1.4, spin: .5 });
        this.glitter.emit(t, g, p, { radius: width, speed: c.sparkleSpeed, size: .09 * c.sparkleSize * 7, life: c.sparkleLifetime * 1.3, spin: 0 });
    }
    standing(t: number, dt: number, p: Vector3, width: number): void {
        this.glitterRemainder += dt * c.sparkleRate * .35 * this.factor;
        const g = Math.floor(this.glitterRemainder);
        this.glitterRemainder -= g;
        this.glitter.emit(t, g, p, { radius: width, speed: c.sparkleSpeed * .7, size: .08 * c.sparkleSize * 7, life: c.sparkleLifetime * 1.3, spin: 0 });
    }
    impact(t: number, p: Vector3, width: number): void {
        this.shards.emit(t, Math.round(c.burstShards * this.factor), p, { radius: width * .8, speed: c.shardSpeed * 1.8, size: .16 * c.shardSize * 7, life: c.shardLifetime * 1.4, spin: 9 });
        this.mist.emit(t, Math.round(90 * this.factor), p, { radius: width * .8, speed: c.mistSpeed * 2.4 * c.mistSpeed, size: 1.6 * c.mistSize, life: c.mistLifetime * 1.5 * 1.4, spin: .6 });
        this.glitter.emit(t, Math.round(150 * this.factor), p, { radius: width * .8, speed: c.sparkleSpeed * 1.6, size: .1 * c.sparkleSize * 7, life: c.sparkleLifetime * 1.3 * 1.3, spin: 0 });
    }
    update(t: number): void { this.mist.update(t); this.shards.update(t); this.glitter.update(t); }
    reset(): void { this.mistRemainder = this.glitterRemainder = 0; this.mist.reset(); this.shards.reset(); this.glitter.reset(); }
    get count(): number { return this.mist.active + this.shards.active + this.glitter.active; }
    dispose(): void { this.root.removeFromParent(); this.mist.dispose(); this.shards.dispose(); this.glitter.dispose(); }
}
