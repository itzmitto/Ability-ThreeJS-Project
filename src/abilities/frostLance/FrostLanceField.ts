// Adapted from IceAbility.js. Copyright (c) 2026 mohamedachrefelouafi — MIT.
// License: public/licenses/LinearAbilityExtThreeJS.txt
import { DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import { createCrystalGeometry } from './FrostLanceGeometry';
import { createIceMaterial } from './FrostLanceMaterial';
import { FROST_LANCE as c, MAX_SPIKES, SLOTS, VARIANTS, lerp, saturate, smoothstep } from './FrostLanceConfig';
export interface SpikeRecord {
    along: number;
    lateral: number;
    scatter: number;
    angle: number;
    radial: number;
    impact: boolean;
    rubble: boolean;
    heightJitter: number;
    radiusJitter: number;
    leanJitter: number;
    pitchJitter: number;
    yaw: number;
    stagger: number;
    eruptTime: number;
    shattered: boolean;
}
export class FrostLanceField {
    readonly root = new Group();
    readonly records: SpikeRecord[] = [];
    readonly meshes: InstancedMesh[] = [];
    readonly ice = createIceMaterial();
    readonly seeds: InstancedBufferAttribute[] = [];
    readonly births: InstancedBufferAttribute[] = [];
    private readonly dummy = new Object3D();
    private readonly lean = new Vector3();
    private readonly axis = new Vector3();
    private readonly up = new Vector3(0, 1, 0);
    private readonly tilt = new Quaternion();
    private readonly spin = new Quaternion();
    private readonly used = new Uint16Array(VARIANTS);
    private readonly seedValues = new Float32Array(MAX_SPIKES);
    private active: number = c.spikeCount;
    private disposed = false;
    constructor(readonly origin: Vector3, readonly direction: Vector3, readonly side: Vector3, public length: number, random: () => number = Math.random, readonly layoutCount: number = Math.round(c.spikeCount * c.density)) {
        this.layoutCount = Number.isFinite(layoutCount) ? Math.min(MAX_SPIKES, Math.max(1, Math.round(layoutCount))) : c.spikeCount;
        for (let v = 0; v < VARIANTS; v++) {
            const geometry = createCrystalGeometry({ seed: 7.3 + v * 21.7, sides: c.facets, taper: c.taper, roughness: c.roughness, bend: c.bend });
            const seeds = new InstancedBufferAttribute(new Float32Array(SLOTS), 1), births = new InstancedBufferAttribute(new Float32Array(SLOTS), 1);
            seeds.setUsage(DynamicDrawUsage);
            births.setUsage(DynamicDrawUsage);
            for (let i = 0; i < SLOTS; i++) {
                const seed = random() * 10;
                seeds.setX(i, seed);
                this.seedValues[i * VARIANTS + v] = seed;
            }
            geometry.setAttribute('aSeed', seeds);
            geometry.setAttribute('aBirth', births);
            const mesh = new InstancedMesh(geometry, this.ice.material, SLOTS);
            mesh.instanceMatrix.setUsage(DynamicDrawUsage);
            mesh.frustumCulled = false;
            mesh.count = 0;
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.renderOrder = 2;
            this.meshes.push(mesh);
            this.seeds.push(seeds);
            this.births.push(births);
            this.root.add(mesh);
        }
        // Generate the complete 190-record distribution regardless of LOD. Live quality changes
        // reveal/hide a deterministic subset rather than moving already erupted crystals.
        const impactStart = this.layoutCount - Math.round(this.layoutCount * .22);
        for (let i = 0; i < MAX_SPIKES; i++) {
            const impact = i >= impactStart, roll = () => random() * 2 - 1;
            this.records.push({ impact, along: impact ? 1 : Math.pow((i + random()) / impactStart, c.frontBias),
                lateral: roll(), scatter: roll(), angle: random() * Math.PI * 2, radial: Math.sqrt(random()),
                rubble: random() < c.rubble, heightJitter: roll(), radiusJitter: roll(), leanJitter: roll(), pitchJitter: roll(),
                yaw: random() * Math.PI * 2, stagger: random(), eruptTime: -1, shattered: false });
        }
    }
    reset(random: () => number = Math.random): void {
        const impactStart = this.layoutCount - Math.round(this.layoutCount * .22);
        for (let i = 0; i < MAX_SPIKES; i++) {
            const r = this.records[i], roll = () => random() * 2 - 1;
            r.impact = i >= impactStart;
            r.along = r.impact ? 1 : Math.pow((i + random()) / impactStart, c.frontBias);
            r.lateral = roll();
            r.scatter = roll();
            r.angle = random() * Math.PI * 2;
            r.radial = Math.sqrt(random());
            r.rubble = random() < c.rubble;
            r.heightJitter = roll();
            r.radiusJitter = roll();
            r.leanJitter = roll();
            r.pitchJitter = roll();
            r.yaw = random() * Math.PI * 2;
            r.stagger = random();
            r.eruptTime = -1;
            r.shattered = false;
        }
        this.meshes.forEach(m => m.count = 0);
        this.root.visible = true;
    }
    setQuality(count: number, shadows: boolean, detailed: boolean): void {
        this.active = Math.min(MAX_SPIKES, this.layoutCount, Math.max(1, Math.round(count)));
        this.meshes.forEach(mesh => mesh.castShadow = shadows);
        // Uniform-only reduction keeps one compiled material program across preset changes.
        this.ice.uniforms.uFracture.value = c.fracture * (detailed ? 1 : .6);
        this.ice.uniforms.uVeins.value = c.veins * (detailed ? 1 : .65);
    }
    get activeCount(): number { return this.active; }
    halfWidth(s: number): number { return lerp(c.widthNear, c.width, Math.pow(saturate(s), c.widthCurve)); }
    lateral(r: SpikeRecord): number { return Math.sign(r.lateral) * Math.pow(Math.abs(r.lateral), c.clumping) + r.scatter * c.scatter; }
    position(r: SpikeRecord, out: Vector3): Vector3 {
        out.copy(this.origin).addScaledVector(this.direction, r.along * this.length);
        if (r.impact) {
            const reach = this.halfWidth(1) * 1.25 * r.radial;
            out.x += Math.cos(r.angle) * reach;
            out.z += Math.sin(r.angle) * reach;
        }
        else
            out.addScaledVector(this.side, this.lateral(r) * this.halfWidth(r.along));
        return out;
    }
    height(r: SpikeRecord): number {
        let h = lerp(c.heightNear, c.height, Math.pow(saturate(r.along), c.heightCurve));
        h *= 1 + (c.peak - 1) * smoothstep(1 - c.peakWidth, 1, r.along);
        const edge = r.impact ? r.radial : saturate(Math.abs(this.lateral(r)));
        h *= lerp(1, 1 - saturate(c.crown), Math.pow(edge, 1.4));
        h *= 1 + r.heightJitter * c.heightJitter;
        if (r.rubble)
            h *= c.rubbleScale;
        return Math.max(.02, h);
    }
    radius(r: SpikeRecord): number { return Math.max(.01, c.radius * lerp(.72, 1.15, Math.pow(saturate(r.along), .6)) * (1 + r.radiusJitter * c.radiusJitter) * (r.rubble ? 1.25 : 1)); }
    trigger(age: number, limit: number, impact: boolean): void {
        for (const r of this.records)
            if (r.eruptTime < 0 && (!r.impact || impact) && (r.impact || r.along <= limit))
                r.eruptTime = age + r.stagger * c.riseStagger;
    }
    emergence(r: SpikeRecord, age: number): number {
        const elapsed = age - r.eruptTime;
        if (r.eruptTime < 0 || elapsed < 0)
            return -1;
        if (elapsed <= c.riseTime)
            return 1 - Math.pow(1 - saturate(elapsed / c.riseTime), 5);
        const after = elapsed - c.riseTime;
        return 1 + c.riseOvershoot * Math.sin(after * 14) * Math.exp(-after / c.settle);
    }
    update(age: number, retract: number, onBreach: (r: SpikeRecord, radius: number) => void): void {
        this.ice.uniforms.uTime.value = age;
        this.used.fill(0);
        const d = this.dummy;
        // LOD samples the full footprint (including its endpoint) instead of chopping off the far end.
        for (let slotIndex = 0; slotIndex < this.active; slotIndex++) {
            const index = Math.min(this.layoutCount - 1, Math.floor(slotIndex * this.layoutCount / this.active));
            const r = this.records[index], v = index % VARIANTS, slot = this.used[v]++, emerge = this.emergence(r, age);
            this.seeds[v].setX(slot, this.seedValues[index]);
            if (emerge < 0) {
                d.position.set(0, -999, 0);
                d.quaternion.identity();
                d.scale.setScalar(.0001);
                this.births[v].setX(slot, 0);
            }
            else {
                const height = this.height(r), radius = this.radius(r);
                if (!r.shattered && emerge > .25) {
                    r.shattered = true;
                    onBreach(r, radius);
                }
                const outward = r.impact ? Math.sign(Math.cos(r.angle)) * r.radial : this.lateral(r);
                this.lean.copy(this.direction).multiplyScalar(.75).addScaledVector(this.side, outward * .85).normalize();
                this.axis.crossVectors(this.up, this.lean).normalize();
                const angle = c.lean * (.35 + .65 * r.along) * (1 + r.leanJitter * c.leanJitter);
                this.tilt.setFromAxisAngle(this.axis, angle);
                this.spin.setFromAxisAngle(this.up, r.yaw * c.twist);
                this.tilt.multiply(this.spin);
                this.position(r, d.position);
                d.position.y = (emerge - 1) * height * .85 - Math.pow(retract, 3) * (height + radius + .4);
                d.quaternion.copy(this.tilt);
                d.scale.set(radius, height, radius).multiplyScalar(lerp(.86, 1, Math.min(1, emerge)));
                this.births[v].setX(slot, saturate(1 - (age - r.eruptTime) / c.birthFade));
            }
            d.updateMatrix();
            this.meshes[v].setMatrixAt(slot, d.matrix);
        }
        for (let v = 0; v < VARIANTS; v++) {
            this.meshes[v].count = this.used[v];
            this.meshes[v].instanceMatrix.needsUpdate = true;
            this.births[v].needsUpdate = this.seeds[v].needsUpdate = true;
        }
    }
    dispose(): void { if (this.disposed)
        return; this.disposed = true; this.root.removeFromParent(); this.meshes.forEach(m => { m.dispose(); m.geometry.dispose(); }); this.ice.material.dispose(); }
}
