import { test, expect } from '@playwright/test';
import { Matrix3, Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three';
import { AbilityManager } from '../src/abilities/AbilityManager';
import type { InputManager } from '../src/game/InputManager';
import type { AbilityCastContext } from '../src/abilities/Ability';
import { Player } from '../src/player/Player';
import { GraphicsSettings } from '../src/quality/GraphicsSettings';
import { TargetingSystem } from '../src/targeting/TargetingSystem';
import { EffectManager } from '../src/effects/EffectManager';
import { WaterInteractionManager } from '../src/world/water/WaterInteractionManager';
import { NORMAL_TRANSFORM_GLSL } from '../src/effects/NormalTransform';
import { shardGeometry, packMaterial } from '../src/abilities/elemental/PackVisuals';
import { VisualOwner } from '../src/abilities/elemental/ElementalVisuals';
import { KrakenCrown } from '../src/abilities/kraken/KrakenCrown';
import { createKrakenMaterial } from '../src/abilities/kraken/KrakenMaterial';
import { prismBoltGeometry } from '../src/abilities/prismRavenstorm/PrismCrystalGeometry';
import { PrismProjectileSystem, prismLaunchScale } from '../src/abilities/prismRavenstorm/PrismProjectileSystem';
import { RAVENSTORM_QUALITY } from '../src/abilities/prismRavenstorm/PrismRavenstormConfig';
function context(cameraFeedback?: AbilityCastContext['cameraFeedback']): AbilityCastContext { const scene = new Scene(), player = new Player(scene), target = new Vector3(0, 0, -28); return { scene, player, camera: new PerspectiveCamera(), quality: new GraphicsSettings(), targeting: new TargetingSystem(scene), effectManager: new EffectManager(), water: new WaterInteractionManager(), origin: player.visual.getRightHandWorldPosition(), direction: new Vector3(0, 0, -1), playerForward: new Vector3(0, 0, -1), cameraForward: new Vector3(0, 0, -1), groundTarget: target, targetPoint: target, time: 0, cameraFeedback }; }
function dispose(c: AbilityCastContext) { c.effectManager.dispose(); c.player.dispose(); c.targeting.dispose(); c.quality.dispose(); c.water?.dispose(); }
test('All numeric and modifier aliases select exactly one slot and reserve P/T', () => {
    const m = new AbilityManager();
    expect(m.slots).toHaveLength(27);
    const input = (code: string, shift: boolean) => ({ wasPressed: (c: string) => c === code, wasPressedWithShift: (c: string) => shift && c === code, wantsCast: false }) as unknown as InputManager;
    for (let digit = 1; digit <= 7; digit++) {
        m.handleInput(input(`Digit${digit}`, true), () => { throw new Error('Unexpected cast'); });
        expect(m.selectedIndex).toBe(19 + digit);
        m.handleInput(input(`Digit${digit}`, false), () => { throw new Error('Unexpected cast'); });
        expect(m.selectedIndex).toBe(digit - 1);
    }
    m.handleInput(input('Digit0', false), () => { throw new Error('Unexpected cast'); });
    expect(m.selectedIndex).toBe(9);
    m.handleInput(input('KeyP', false), () => { throw new Error('Unexpected cast'); });
    expect(m.selectedIndex).toBe(9);
    m.handleInput(input('KeyT', false), () => { throw new Error('Unexpected cast'); });
    expect(m.selectedIndex).toBe(9);
    m.dispose();
});
test('Scale-compensated normals stay perpendicular to stretched facets', () => {
    const matrix = new Matrix4().makeScale(3, .2, 1), linear = new Matrix3().setFromMatrix4(matrix), n = new Vector3(1, 1, 0).normalize(), tangent = new Vector3(1, -1, 0).applyMatrix3(linear);
    expect(Math.abs(n.clone().applyMatrix3(linear).normalize().dot(tangent))).toBeGreaterThan(1);
    const corrected = n.clone().divide(new Vector3(9, .04, 1)).applyMatrix3(linear).normalize();
    expect(corrected.dot(tangent)).toBeCloseTo(0);
    expect(corrected.distanceTo(n.clone().applyMatrix3(new Matrix3().getNormalMatrix(matrix)).normalize())).toBeLessThan(1e-6);
    const material = packMaterial('#cceeff', true);
    expect(material.vertexShader).toContain(NORMAL_TRANSFORM_GLSL);
    expect(material.vertexShader).toContain('normalForTransform(instanceMatrix,n)');
    material.dispose();
});
test('Shared debris and all five Ravenstorm variants keep independent sharp facets', () => {
    const geometries = [shardGeometry(), ...Array.from({ length: 5 }, (_, i) => prismBoltGeometry(i, 100))];
    geometries.forEach((g, i) => { expect(g.getIndex()).toBeNull(); const p = g.getAttribute('position'), n = g.getAttribute('normal'); expect(Array.from(p.array).every(Number.isFinite)).toBe(true); for (let v = 0; v < n.count; v += 3) {
        for (let c = 0; c < 3; c++) {
            expect(n.array[v * 3 + c]).toBeCloseTo(n.array[(v + 1) * 3 + c]);
            expect(n.array[v * 3 + c]).toBeCloseTo(n.array[(v + 2) * 3 + c]);
        }
    } if (i) {
        g.computeBoundingBox();
        const size = g.boundingBox!.getSize(new Vector3());
        expect(size.y / Math.max(size.x, size.z)).toBeGreaterThan(6);
    } g.dispose(); });
});
test('Kraken finale emits once, live quality stays bounded, and repeated casts release sources', () => {
    let finales = 0;
    const c = context((amplitude) => { if (amplitude === .008)
        finales++; }), ability = new KrakenCrown(), baseline = c.scene.children.length;
    const material = createKrakenMaterial();
    expect(material.forceSinglePass).toBe(true);
    expect(material.uniforms.fogColor).toBeDefined();
    expect(material.fragmentShader).toContain('vEmerge <= 0.0');
    material.dispose();
    for (let cast = 0; cast < 10; cast++) {
        c.quality.setPreset('LOW');
        expect(ability.cast(c)).toBe(true);
        for (let step = 0; step < 560; step++) {
            if (step === 160)
                c.quality.setPreset('MAX');
            if (step === 350)
                c.quality.setPreset('MEDIUM');
            c.effectManager.update(.02, step * .02);
            c.water!.update(step * .02);
            expect(c.water!.activeCount).toBeLessThanOrEqual(32);
        }
        expect(c.effectManager.activeCount).toBe(0);
        expect(c.scene.children.length).toBe(baseline);
        expect(c.water!.activeCount).toBe(0);
    }
    expect(finales).toBe(10);
    dispose(c);
});
test('Ravenstorm retains 120/260/500 authored shots with one impact per projectile', () => {
    expect(prismLaunchScale(1.2, 0, 8.4) * 8.4).toBeCloseTo(.65);
    expect(prismLaunchScale(1.2, 2, 8.4) * 8.4).toBeLessThanOrEqual(2.65);
    expect(prismLaunchScale(1.2, 20, 8.4)).toBe(1.2);
    expect(Object.values(RAVENSTORM_QUALITY).map(q => q.shots)).toEqual([120, 260, 500]);
    for (const budget of Object.values(RAVENSTORM_QUALITY)) {
        const owner = new VisualOwner(), p = new PrismProjectileSystem(owner, budget), hand = new Vector3(0, 1.3, 28);
        let hits = 0;
        for (let step = 0; step < 520; step++) {
            p.update(step / 60, hand, () => hits++);
            p.meshes.forEach(m => { expect(m.count).toBeLessThanOrEqual(m.instanceMatrix.count); expect(Array.from(m.instanceMatrix.array).every(Number.isFinite)).toBe(true); });
        }
        expect(hits).toBe(budget.shots);
        expect(p.shots.every(s => s.hit && s.released)).toBe(true);
        owner.dispose();
    }
});
