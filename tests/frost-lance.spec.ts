import { test, expect } from '@playwright/test';
import { BufferGeometry, Float32BufferAttribute, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { FrostLance, frostLanceTarget } from '../src/abilities/frostLance/FrostLance';
import { FrostLanceField } from '../src/abilities/frostLance/FrostLanceField';
import { createCrystalGeometry } from '../src/abilities/frostLance/FrostLanceGeometry';
import { FROST_LANCE as c, frostQuality } from '../src/abilities/frostLance/FrostLanceConfig';
import { createIceMaterial } from '../src/abilities/frostLance/FrostLanceMaterial';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { EffectManager } from '../src/effects/EffectManager';
import { Player } from '../src/player/Player';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import type { AbilityCastContext } from '../src/abilities/Ability';
function context(): AbilityCastContext {
    const scene = new Scene(), player = new Player(scene), p = new Vector3(0, 0, -15);
    return { scene, player, camera: new PerspectiveCamera(), quality: new GraphicsSettings(), effectManager: new EffectManager(), targeting: new TargetingSystem(scene), water: new WaterInteractionManager(), origin: new Vector3(0, 1.3, 0), direction: new Vector3(0, 0, -1), playerForward: new Vector3(0, 0, -1), cameraForward: new Vector3(0, 0, -1), groundTarget: p, targetPoint: p, time: 0 };
}
function dispose(ctx: AbilityCastContext, ability: FrostLance): void { ctx.effectManager.dispose(); ability.dispose(); ctx.player.dispose(); ctx.quality.dispose(); ctx.targeting.dispose(); ctx.water?.dispose(); }
test('All three geometry variants numerically match the supplied donor generator', () => {
    const file = readFileSync('frost-lance-donor-sources/ProceduralGeometry.js', 'utf8');
    const begin = file.indexOf('const RING_HEIGHTS'), end = file.indexOf('/* Asteroid');
    let source = file.slice(begin, end);
    source = source.slice(0, source.lastIndexOf('/* ----')).replaceAll('export function', 'function');
    const donor = runInNewContext(`const TAU=Math.PI*2;${source};createCrystalGeometry`, { BufferGeometry, Float32BufferAttribute, hash11: (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453123; return s - Math.floor(s); } }) as typeof createCrystalGeometry;
    const fingerprints: string[] = [];
    for (let v = 0; v < 3; v++) {
        const options = { seed: 7.3 + v * 21.7, sides: c.facets, taper: c.taper, roughness: c.roughness, bend: c.bend }, g = createCrystalGeometry(options), original = donor(options);
        expect(Array.from(g.getAttribute('position').array)).toEqual(Array.from(original.getAttribute('position').array));
        expect(Array.from(g.getAttribute('normal').array)).toEqual(Array.from(original.getAttribute('normal').array));
        expect(g.index).toBeNull();
        expect(g.getAttribute('position').count / 3).toBe(70);
        fingerprints.push(Array.from(g.getAttribute('position').array).join(','));
        g.dispose();
        original.dispose();
    }
    expect(new Set(fingerprints).size).toBe(3);
});
test('Donor placement, endpoint reservation, emergence and 288 instance capacity remain bounded', () => {
    const f = new FrostLanceField(new Vector3(), new Vector3(0, 0, -1), new Vector3(1, 0, 0), 15, () => .5);
    expect(f.records.slice(0, 190).filter(r => r.impact).length).toBe(42);
    expect(f.halfWidth(0)).toBe(.55);
    expect(f.halfWidth(1)).toBe(2.5);
    const near = { ...f.records[0], along: 0, impact: false, lateral: 0, scatter: 0, rubble: false, heightJitter: 0 };
    const far = { ...near, along: 1 };
    expect(f.height(near)).toBe(.5);
    expect(f.height(far)).toBeCloseTo(3.1 * 1.45);
    f.trigger(.1, .4, false);
    expect(f.records[189].eruptTime).toBe(-1);
    f.trigger(.6, 1, true);
    expect(f.records[189].eruptTime).toBeGreaterThanOrEqual(.6);
    const record = f.records[189];
    expect(f.emergence(record, record.eruptTime + .17)).toBeCloseTo(1);
    expect(f.emergence(record, record.eruptTime + .24)).toBeGreaterThan(1);
    f.update(2, 0, () => { });
    f.meshes.forEach(m => expect(m.count).toBeLessThanOrEqual(96));
    f.update(5.5, 1, () => { });
    f.meshes.forEach(m => expect(Array.from(m.instanceMatrix.array).every(Number.isFinite)).toBe(true));
    f.dispose();
    const maximum = new FrostLanceField(new Vector3(), new Vector3(0, 0, -1), new Vector3(1, 0, 0), 15, Math.random, 288);
    maximum.setQuality(288, false, true);
    maximum.trigger(.6, 1, true);
    maximum.update(2, 0, () => { });
    expect(maximum.meshes.map(m => m.count)).toEqual([96, 96, 96]);
    expect(maximum.records.filter(r => r.impact).length).toBe(63);
    maximum.dispose();
});
test('Standard ice material keeps donor tuning and quality preserves three variants', () => {
    const ice = createIceMaterial();
    expect(ice.material.flatShading).toBe(true);
    expect(ice.material.depthWrite).toBe(true);
    expect(ice.material.roughness).toBe(.16);
    expect(ice.material.opacity).toBe(.92);
    expect(ice.uniforms.uGlow.value).toBe(.85);
    expect(ice.uniforms.uBirthGlow.value).toBe(1.6);
    expect(Object.values(QUALITY_PRESETS).map(q => frostQuality(q).spikes)).toEqual([80, 140, 190]);
    ice.material.dispose();
});
test('Ground range rejects invalid/near/sky targets and clamps safely to 15 metres', () => {
    const ctx = context(), ability = new FrostLance();
    expect(frostLanceTarget(ctx)?.length).toBe(15);
    expect(frostLanceTarget({ ...ctx, groundTarget: new Vector3(0, 0, -150) })?.length).toBe(15);
    expect(frostLanceTarget({ ...ctx, groundTarget: new Vector3(0, 0, -2) })).toBeNull();
    expect(frostLanceTarget({ ...ctx, groundTarget: null })).toBeNull();
    expect(frostLanceTarget({ ...ctx, groundTarget: new Vector3(NaN, 0, -15) })).toBeNull();
    expect(frostLanceTarget({ ...ctx, groundTarget: new Vector3(1e308, 0, -1e308) })).toBeNull();
    dispose(ctx, ability);
});
test('Twenty casts reuse bounded bundles; two overlaps cap rapid casting and release sources', () => {
    const ctx = context(), ability = new FrostLance(), baseline = ctx.scene.children.length, subscriptions = ctx.quality.subscriberCount;
    const baselineMaterials = new Set<object>();
    ctx.scene.traverse(o => { if (o instanceof Mesh) { for (const m of (Array.isArray(o.material) ? o.material : [o.material])) baselineMaterials.add(m); } });
    for (let cast = 0; cast < 20; cast++) {
        expect(ability.cast(ctx)).toBe(true);
        for (let step = 0; step < 600; step++) {
            if (step === 15)
                ctx.quality.setPreset('LOW');
            if (step === 60)
                ctx.quality.setPreset('MAX');
            ctx.effectManager.update(.02, step * .02);
            ctx.water!.update(step * .02);
        }
        expect(ability.activeCount).toBe(0);
        expect(ctx.effectManager.activeCount).toBe(0);
        expect(ctx.scene.children.length).toBe(baseline);
        expect(ctx.quality.subscriberCount).toBe(subscriptions);
        expect(ctx.water!.activeCount).toBe(0);
    }
    expect(ability.cast(ctx)).toBe(true);
    expect(ability.cast(ctx)).toBe(true);
    const materials = new Set<object>();
    ctx.scene.traverse(o => { if (o instanceof Mesh) { for (const m of (Array.isArray(o.material) ? o.material : [o.material])) materials.add(m); } });
    expect(materials.size - baselineMaterials.size).toBe(14); // Seven shared/batched materials per bundle, never one per crystal.
    for (let attempt = 0; attempt < 100; attempt++)
        expect(ability.cast(ctx)).toBe(false);
    expect(ctx.effectManager.activeCount).toBe(2);
    ctx.effectManager.update(120, 120);
    expect(ability.activeCount).toBe(0);
    dispose(ctx, ability);
});
