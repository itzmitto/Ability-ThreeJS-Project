import '../src/styles/game.css';
import { Mesh, InstancedMesh, PointLight, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
import type { QualityPreset } from '../src/quality/QualityPreset';
const root = document.querySelector<HTMLElement>('#app')!, game = new Game(root);
const query = new URLSearchParams(location.search), renderer = game.renderer.renderer;
const report = document.createElement('pre');
report.id = 'audit-report';
report.style.cssText = 'position:fixed;top:115px;left:24px;max-width:94vw;max-height:60vh;overflow:auto;font:11px monospace;color:#ced9e8;background:#06101ae8;padding:12px;z-index:40';
root.append(report);
const lines: string[] = [], records: unknown[] = [];
let errors = 0, disposed = false;
const check = (ok: boolean, label: string) => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok)
    errors++; report.textContent = lines.join('\n') + '\nDATA ' + JSON.stringify(records); };
window.addEventListener('error', e => check(false, e.message));
window.addEventListener('unhandledrejection', e => check(false, String(e.reason)));
renderer.debug.onShaderError = (_gl, _program, vertex, fragment) => { check(false, `GLSL ${_gl.getShaderInfoLog(vertex)} ${_gl.getShaderInfoLog(fragment)}`); };
renderer.domElement.addEventListener('webglcontextlost', () => check(false, 'WebGL context lost'));
const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
const frames = async (n: number) => { for (let i = 0; i < n; i++)
    await frame(); };
const key = (code: string, shift = false) => { window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: shift, bubbles: true })); };
const release = (code: string) => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
const context = (): AbilityCastContext => {
    const target = new Vector3(game.player.position.x, 0, game.player.position.z - 28);
    return { player: game.player, scene: game.sceneManager.scene, camera: game.camera.camera, origin: game.player.visual.getRightHandWorldPosition(), direction: target.clone().sub(game.player.position).normalize(), targetPoint: target, groundTarget: target, playerForward: game.player.getForward().clone(), cameraForward: game.targeting.aimDirection.clone(), targeting: game.targeting, effectManager: game.effects, quality: game.settings, time: 0, water: game.world.water.interactions, cameraFeedback: game.camera.addFeedback };
};
const counts = () => { let objects = 0, lights = 0; game.sceneManager.scene.traverse(o => { objects++; if (o instanceof PointLight)
    lights++; }); return { objects, lights, subscriptions: game.settings.subscriberCount, active: game.effects.activeCount, ripples: game.world.water.interactions.activeCount, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 }; };
const clean = () => { game.effects.update(120, 120); game.world.water.interactions.update(120); game.renderer.render(); };
const samples = (a: number[]) => { if (!a.length)
    return null; a.sort((x, y) => x - y); return { medianMs: a[Math.floor(a.length * .5)], p95Ms: a[Math.floor(a.length * .95)], maxMs: a[a.length - 1] }; };
const finite = () => { let valid = true; game.sceneManager.scene.traverse(o => { if (![...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].every(Number.isFinite))
    valid = false; if (o instanceof InstancedMesh) {
    valid &&= o.count <= o.instanceMatrix.count && o.count >= 0;
    for (const v of o.instanceMatrix.array)
        if (!Number.isFinite(v))
            valid = false;
} if (o instanceof Mesh) {
    const p = o.geometry.getAttribute('position');
    if (p)
        for (const v of p.array)
            if (!Number.isFinite(v))
                valid = false;
} }); return valid; };
try {
    await game.player.visual.ready;
    game.settings.setPreset((query.get('quality') ?? 'LOW') as QualityPreset);
    game.start();
    await frames(12);
    check(game.player.visual.loaded, 'Local human model loaded');
    check(game.abilities.registry.all.length === 30 && game.abilities.slots.filter(s => s.abilityId).length === 30, 'All 29 previous abilities plus Drowned King');
    const targets = query.has('chain') ? [27] : query.has('ocean') ? [0, 10, 22, 23, 25, 26, 24, 27, 28] : query.has('sand') ? (query.has('only') ? [26] : [26, 25, 0, 1]) : query.has('frost') ? [25, 0] : query.has('kraken') ? [22] : query.has('raven') ? [23] : game.abilities.slots.map((_, i) => i);
    for (const index of targets) {
        clean();
        game.abilities.update(120);
        const baseline = counts(), slot = game.abilities.slots[index], ability = game.abilities.registry.get(slot.abilityId)!;
        if(slot.code)key(slot.code, !!slot.shift);else game.abilities.selectAbility(ability.id);
        await frames(3);
        release(slot.code);
        check(game.abilities.selectedIndex === index, `${ability.name}: shortcut ${slot.key}`);
        game.abilities.select((index + 1) % game.abilities.slots.length);
        root.querySelectorAll<HTMLButtonElement>('.ability-slot')[index].click();
        await frames(3);
        check(game.abilities.selectedIndex === index, `${ability.name}: HUD selection`);
        // Synthetic click travels through the real input/targeting/frame path, then lifecycle stepping is controlled.
        renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
        await frames(3);
        renderer.domElement.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
        check(game.effects.activeCount === 1 && game.abilities.getCooldown(index) > 0, `${ability.name}: click cast / cooldown`);
        const blocked = game.abilities.cast(context());
        check(!blocked, `${ability.name}: cooldown rejects another cast`);
        let calls = 0, triangles = 0, peakInstances = 0, peakParticles = 0, valid = true, previous = performance.now();
        const updateMs: number[] = [], renderMs: number[] = [], rafMs: number[] = [];
        const realtime = query.has('realtime');
        for (let i = 0; i < (realtime ? 4000 : 250) && game.effects.activeCount; i++) {
            await frame();
            const now = performance.now(), interval = now - previous;
            rafMs.push(interval);
            previous = now;
            if (!realtime) {
                const a = performance.now();
                game.effects.update(.1, i * .1);
                updateMs.push(performance.now() - a);
            }
            const a = performance.now();
            game.renderer.render();
            renderMs.push(performance.now() - a);
            calls = Math.max(calls, renderer.info.render.calls);
            triangles = Math.max(triangles, renderer.info.render.triangles);
            peakInstances = Math.max(peakInstances, game.effects.instanceCount);
            peakParticles = Math.max(peakParticles, game.effects.particleCount);
            if (i % 10 === 0)
                valid &&= finite();
            if (interval > 5000)
                throw new Error('Severe frame stall; stop before another cast');
        }
        check(valid, `${ability.name}: finite geometry / bounded instances`);
        check(game.effects.activeCount === 0, `${ability.name}: natural completion`);
        clean();
        const after = counts();
        check(after.objects === baseline.objects && after.lights === baseline.lights && after.subscriptions === baseline.subscriptions && after.ripples === 0, `${ability.name}: scene/light/subscription/water cleanup`);
        check(renderer.getContext().getError() === renderer.getContext().NO_ERROR, `${ability.name}: WebGL error state`);
        records.push({ id: ability.id, quality: game.settings.preset, viewport: [innerWidth, innerHeight], calls, triangles, peakInstances, peakParticles, raf: samples(rafMs), update: samples(updateMs), renderSubmit: samples(renderMs), baseline, after });
        check(true, `${ability.name}: measurement recorded`);
    }
    if (query.has('stress') && query.has('sand')) {
        const sand = game.abilities.registry.get('sand-reaper')!;
        // Warm both bounded leases deliberately, after the sequential preset acceptance passes.
        sand.cast(context()); sand.cast(context());
        clean();
        const runSand = async () => {
            game.abilities.update(120); game.abilities.select(26);
            check(game.abilities.cast(context()), 'Sand Reaper stress cast');
            for (let step = 0; step < 150 && game.effects.activeCount; step++) {
                game.effects.update(.04, step * .04); game.renderer.render(); await frame();
            }
            clean();
        };
        await runSand();
        const baseline = counts();
        for (let cast = 0; cast < 20; cast++) await runSand();
        const after = counts();
        check(Object.keys(baseline).every(k => baseline[k as keyof typeof baseline] === after[k as keyof typeof after]), '20 Sand Reaper casts restore warmed scene/GPU/subscription baseline');
        records.push({ stress: 'sand-reaper', baseline, after });
        game.abilities.update(120); game.abilities.select(26); game.abilities.cast(context());
        let blocked = 0;
        for (let i = 0; i < 100; i++) if (!game.abilities.cast(context())) blocked++;
        check(blocked === 100 && game.effects.activeCount === 1, '100 Sand Reaper cooldown attempts create no extra effects');
        key('KeyW'); await frames(45); check(game.player.visual.animationState === 'Walk', 'Cast arm overlay preserves Walk');
        key('ShiftLeft'); await frames(45); check(game.player.visual.animationState === 'Run', 'Cast arm overlay preserves sprint');
        release('KeyW'); release('ShiftLeft'); clean(); await frames(150);
        check(game.player.visual.animationState === 'Idle', 'Idle resumes after cast and locomotion');
        for (const preset of ['LOW', 'MEDIUM', 'MAX'] as const) {
            root.querySelector<HTMLButtonElement>(`[data-quality="${preset}"]`)!.click(); await frames(3);
            check(game.settings.preset === preset, `Graphics menu switches to ${preset}`);
        }
        clean(); game.dispose(); disposed = true;
        check(renderer.info.memory.geometries === 0 && renderer.info.memory.textures === 0 && game.settings.subscriberCount === 0, 'Full Sand Reaper game disposal releases GPU resources');
    } else if (query.has('stress')) {
        // Warm the same two problematic spells before comparing deliberate renderer caches.
        const run = async (index: number) => { game.abilities.select(index); game.abilities.update(120); check(game.abilities.cast(context()), `Stress cast ${game.abilities.selectedAbility?.name}`); for (let step = 0; step < 180 && game.effects.activeCount; step++) {
            game.effects.update(.1, step * .1);
            game.renderer.render();
            await frame();
        } clean(); };
        await run(22);
        await run(23);
        if (query.has('frost')) {
            game.abilities.select(25); game.abilities.update(120); game.abilities.cast(context());
            game.abilities.update(.4); game.abilities.cast(context());
            for (let step = 0; step < 180 && game.effects.activeCount; step++) {
                game.effects.update(.1, step * .1); game.renderer.render(); await frame();
            }
            clean();
        }
        const baseline = counts();
        for (const index of (query.has('frost') ? [25] : [22, 23])) {
            const attempts = query.has('frost') ? 20 : 10;
            for (let cast = 0; cast < attempts; cast++)
                await run(index);
            const after = counts();
            check(['objects', 'lights', 'subscriptions', 'active', 'ripples', 'geometries', 'textures', 'programs'].every(k => baseline[k as keyof typeof baseline] === after[k as keyof typeof after]), `${attempts} ${game.abilities.selectedAbility?.name} casts restore warmed GPU/scene baseline`);
            records.push({ stress: game.abilities.selectedAbility?.id, baseline, after });
        }
        game.abilities.update(120);
        game.abilities.select(query.has('frost') ? 25 : 22);
        game.abilities.cast(context());
        if (query.has('frost')) game.abilities.update(.4);
        game.abilities.select(query.has('frost') ? 25 : 23);
        game.abilities.cast(context());
        check(game.effects.activeCount === 2, query.has('frost') ? 'Controlled two-field Frost Lance overlap' : 'Controlled Kraken + Ravenstorm overlap');
        if (query.has('frost')) {game.abilities.update(120); check(!game.abilities.cast(context()), 'Ready cooldown still rejects a third live Frost Lance field');}
        key('KeyW');
        await frames(60);
        check(game.player.visual.animationState === 'Walk', 'Walk remains active during two effects');
        key('ShiftLeft');
        await frames(60);
        check(game.player.visual.animationState === 'Run', 'Sprint remains active during two effects');
        release('KeyW');
        release('ShiftLeft');
        for (let step = 0; step < 150 && game.effects.activeCount; step++) {
            game.effects.update(.1, step * .1);
            game.renderer.render();
            await frame();
        }
        clean();
        await frames(180);
        check(game.player.visual.animationState === 'Idle', 'Idle resumes after movement');
        check(game.effects.activeCount === 0 && game.world.water.interactions.activeCount === 0, 'Overlapping effects and shoe ripples expire');
        game.abilities.update(120);
        game.abilities.select(query.has('frost') ? 25 : 22);
        game.abilities.cast(context());
        let blocked = 0;
        for (let i = 0; i < 100; i++)
            if (!game.abilities.cast(context()))
                blocked++;
        check(blocked === 100 && game.effects.activeCount === 1, '100 rapid cooldown requests allocate no effects');
        clean();
        const telemetry = game.hud.performance.visible;
        key('KeyP');
        await frames(3);
        release('KeyP');
        check(game.hud.performance.visible !== telemetry, 'P toggles telemetry');
        key('KeyP');
        await frames(3);
        release('KeyP');
        const marker = game.targeting.markerEnabled;
        key('KeyT');
        await frames(3);
        release('KeyT');
        check(game.targeting.markerEnabled !== marker, 'T toggles ground marker');
        const aim = game.targeting.aimDirection.clone();
        renderer.domElement.dispatchEvent(new MouseEvent('mousemove', { buttons: 2, movementX: 35, movementY: 8, bubbles: true }));
        await frames(12);
        check(!aim.equals(game.targeting.aimDirection), 'Camera orbit and targeting remain controllable');
        key('F3');
        await frames(20);
        release('F3');
        const debug = root.querySelector<HTMLElement>('.debug-panel')!;
        check(!debug.hidden && !!debug.textContent?.includes('Player'), 'F3 debug overlay updates');
        key('F3');
        await frames(3);
        release('F3');
        for (const preset of ['LOW', 'MEDIUM', 'MAX'] as const) {
            root.querySelector<HTMLButtonElement>(`[data-quality="${preset}"]`)!.click();
            await frames(3);
            check(game.settings.preset === preset, `Graphics menu switches live to ${preset}`);
        }
        clean();
        game.dispose();
        disposed = true;
        check(renderer.info.memory.geometries === 0 && renderer.info.memory.textures === 0 && game.settings.subscriberCount === 0, 'Full disposal releases all GPU resources and subscriptions');
    }
    if (!disposed)
        clean();
    check(true, errors ? `AUDIT FINISHED WITH ${errors} FAILURES` : 'AUDIT ALL CHECKS PASSED');
}
catch (error) {
    check(false, String(error));
}
window.addEventListener('pagehide', () => { if (!disposed)
    game.dispose(); });
