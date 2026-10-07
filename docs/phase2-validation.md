# Phase 02 delivery and verification

Only two production changes: a local animated everyday-clothed human male, and Glacial Eruption on Q. The five other slots stay empty. Existing world, movement controller, targeting raycaster, graphics presets, atmosphere, performance/debug HUDs and controls remain.

## Changed existing files

- `src/player/PlayerVisual.ts`: removes every mannequin mesh; async local GLTF loading, 1.82 m normalization, pivot/feet alignment, rough PBR materials, hair alpha testing, Idle/Walk/Run mixer blending, hand/chest attachments, late-load and resource cleanup.
- `src/game/Game.ts`: registers/assigns Q, supplies animated hand origin and decoupled camera feedback, disposes active effects before shared ability geometry.
- `src/game/CameraController.ts`: bounded 160 ms rotational feedback that resets against the ordinary look-at transform each frame.
- `src/game/InputManager.ts`: preserves a pending first click when pointer lock is acquired; clears input when lock is released.
- `src/abilities/Ability.ts`: optional camera feedback callback in the cast context.
- `src/effects/EffectManager.ts`: active-count diagnostic getter.
- `src/ui/AbilityBar.ts`: cooldown fill progress and countdown state.
- `src/ui/HUD.ts`: phase 02 status text, keeping the same layout.
- `src/styles/game.css`: wraps the two-line spell label, crystal/snow icon sizing, minimal cooldown fill.
- `README.md`: phase 02 behavior, asset/license provenance, architecture and verification updates.
- `package-lock.json`: npm install normalized existing whitespace; dependencies are unchanged.

## Added files

`src/abilities/ice/`:

- `GlacialEruption.ts`: single ability entry, cooldown and targeting validation.
- `GlacialEruptionEffect.ts`: sequenced lifecycle, quality subscription and cleanup.
- `IceResources.ts`: shared crystal and plane geometry ownership.
- `CrystalGeometry.ts`: irregular faceted prism with chisel tip and outward-facing normals.
- `IceMaterial.ts`: dense PBR ice, Fresnel, fine veins, edge accents and dithered dissolve.
- `IceSpikeField.ts`: staggered instanced eruption, overshoot, settling and melt.
- `FrostGroundEffect.ts`: spreading fractured frost overlay.
- `FrostTrail.ts`: thin ground connection and right-hand frost feedback.
- `IceShardEmitter.ts`: instanced ballistic chips with spin, fall and shrink/fade.
- `ColdMist.ts`: procedural soft instanced billboards, expanding close to ground.
- `FrostParticles.ts`: batched GPU snow with drift and finite lifetime.
- `ImpactGlow.ts`: temporary local water illumination for the existing custom shader.
- `iceConfig.ts`: timings and quality counts derived from the existing effect budget.
- `resolveGlacialTarget.ts`: finite ground validation and 32 m clamping.

Assets and reproducibility:

- `public/models/casual-male.glb`
- `public/models/ROCKETBOX-LICENSE.txt`
- `public/models/README.md`
- `scripts/prepare-character-textures.py`
- `scripts/prepare-character.py`

Tests and inspection:

- `tests/ice.spec.ts`
- `tests/phase2-browser.ts`, `phase2-smoke.html`
- `tests/phase2-review.ts`, `phase2-review.html`
- `docs/phase2-preview.png`, this report.

## Verification

- `npm install`: succeeds, no added runtime dependencies, zero reported vulnerabilities.
- `npm run build`: succeeds, TypeScript clean. Vite notes that the combined Three.js engine chunk is 544.7 kB (137.7 kB gzip); this is a size advisory, not a runtime/build error.
- `npm test`: 9/9 pass; all original movement/targeting/lifecycle tests remain passing.
- Browser console: no errors/warnings in the phase 02 acceptance and visual review.
- Browser checks verify real local model loading, Idle/Walk/Run selection and animated attachment locations; W movement, Shift sprint, deceleration, camera aiming and ground targeting; Q selection, left-click casting, cooldown rejection/progress; live LOW/MEDIUM/MAX changes; spike growth/settling; particle, shard, mist and point-light expiry; effect root removal.
- 10 and 20 completed repeated casts returned to warmed baseline: 12 scene children, 12 geometries, 20 textures, 25 programs, 25 draw calls (MEDIUM).
- 40 rapid recast requests were rejected during cooldown, leaving one effect; after expiry all counters returned to baseline.
- Repeated stress tests advance simulation/effect clocks for efficient lifecycle testing and render the eruption for each cast. The first browser cast runs its full lifetime in real time. This is not a claim that twenty simultaneous expensive effects were benchmarked.
- Static eruption review at 1280×720 sampled LOW at about 159 FPS / 6.3 ms / 14 draw calls / 12,900 triangles, and MAX at about 161 FPS / 6.2 ms / 31 calls / 73,445 triangles. These are local warm browser samples, not portable performance guarantees or frame-latency percentiles. The difference in calls includes the world's existing bloom and shadow settings.

The avatar source and motions are Microsoft Rocketbox, MIT, copyright 2020 Microsoft. The original license is included. Every runtime model/texture is local. Blender/Pillow are asset-preparation tools only, not game runtime or installation dependencies.

Controls: WASD, Shift sprint, mouse camera/aim, Q/1 selects Glacial Eruption, left click casts, right button closer aim, Esc releases mouse, P telemetry, F3 debug, T ground marker. Dragging remains a fallback when an embedded browser denies pointer lock. Range 32 m, cooldown 2.5 s, lifetime 5 s.
