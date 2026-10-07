# Elemental Sandbox — Phase 04

A browser-based Three.js sandbox: a dark water arena, an animated human male in everyday clothes, **Glacial Eruption** on Q, **Tempest Break** on E and **Heaven's Verdict** on R. The existing architecture, world, controls, character and HUD remain in place. There are no enemies, health/damage systems, NPCs, inventory or quests. All runtime assets are local.

## Phase 04: Heaven's Verdict

Select **R / 3**, aim at the black water, and left-click. **Cooldown: 4 s. Maximum ground range: 45 m. Strike height: 22 m. Total lifetime: 6.2 s.** The existing nullable ground hit is validated and clamped from the player. Sky or nonfinite data reject without consuming cooldown. The player continues moving and animating while casting.

The animated right hand develops palm/wrist electricity, fine forearm/chest arcs and sparks. Electrical pulses ionize the ground target. A localized layered storm grows above it and flashes internally; downward and upward branching leaders search, then one follows the future trunk into connection. At 1.02 s the main channel strikes, with three irregular re-strikes during 240 ms and a 110 ms faint afterimage. Major forks attach to real trunk vertices; smaller forks attach to major branches. White cores, blue-white channels and deep-blue halos render in thick camera-facing ribbons, avoiding unreliable WebGL line widths.

Impact briefly illuminates the character with actual transient 3D lights. The water flares, carries a broken view-aligned reflection, grows organic electric veins, launches a 13.5 m pressure/ripple front, and emits curling ion mist, sparks, droplets and streaks. Smaller sky strikes follow at asymmetric positions. Ion coronas and intermittent node-to-node arcs keep the area electrically alive; hovering motes and storm fringes fade before cleanup. No fullscreen flash, permanent light or skybox is used.

| Lightning detail | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Trunk segments | 32 | 48 | 64 |
| Major / minor / micro branches | 4 / 10 / 8 | 8 / 22 / 18 | 12 / 42 / 36 |
| Searching leaders | 3 | 6 | 10 |
| Secondary strikes | 2 | 4 | 7 |
| Ionized ground nodes | 6 | 10 | 16 |
| Impact particle budget | 150 | 360 | 840 |
| Mist / cloud layers | 6 / 3 | 14 / 6 | 24 / 10 |
| Flash lights | 1 | 2 | 2 |
| Impact light peak | 650 | 1100 | 1700 |
| Distortion approximation | Off | Subtle pressure-edge warping | Enhanced pressure-edge warping / richer cloud noise |

These values derive from the existing shared graphics/VFX budget. Switching LOW → MAX during charge or MAX → LOW during the residual field changes active geometry, branch counts, clouds, particles, node coronas and mist. Existing bloom remains authoritative; emissive lightning also has an explicit halo so LOW does not depend on bloom. No global exposure/bloom configuration is changed.

The reusable core is `LightningPath`, `LightningBranchGenerator`, `LightningRenderer`, `LightningMaterials` and `ElectricArcRenderer` under `src/abilities/lightning/`. Bounded typed buffers and scheduled re-strikes replace per-frame reconstruction. Raw emissive shaders prevent unnecessary scene-light-count shader variants; partial buffer uploads send only active segment ranges. A two-bundle pool retains materials and GPU buffers between casts. Expiry removes all roots/lights and unsubscribes; ability/game disposal destroys the cached resources. Pooling adds fixed warmed memory, not rendering work after expiry.

`npm test` runs **17 core tests**. `/phase4-smoke.html` checks model/input/cooldown/targeting, all lightning stages and quality transitions, then 20 lightning casts, 20 and 30 alternating ice/wind/lightning casts, 60 rapid rejected requests, and real-time frame profiles. `/phase4-review.html` provides deterministic stages, ranges, camera angles, seed variation and complete-sequence playback. [Phase 04 validation](docs/phase4-validation.md) contains the full file inventory, observed performance, cleanup counters and mandatory visual-refinement results. These test pages are omitted from production.

## Phase 03: Tempest Break

Select **E / 2**, aim with the crosshair, and left-click. **Speed: 36 m/s. Maximum range: 40 m from the casting hand. Cooldown: 2 s. Total lifetime: 3–3.53 s**, depending on travel distance. The existing ground hit determines the destination, lifted 0.6 m to skim the surface. Out-of-range hits clamp cleanly; sky aim uses the camera direction at maximum range. Invalid origins and degenerate targets reject safely. No second raycaster or cooldown system is added.

Air ribbons and dust compress around the live animated right hand for 280 ms. Release captures the hand position, then a pressure lens, continuously spiraling ribbons, recycled pressure rings and a tapered wispy wake fly toward the target. A temporary V-shaped water disturbance follows beneath. Arrival compresses the core for 85 ms before a fast 9 m atmospheric front, a 5.5 m tapered vortex, radial mist and drag-limited pale particles burst outward. Four slower surface rings reach toward 11 m and fade. Aerial fallback impacts retain an air shockwave but omit surface rings. Camera feedback is bounded to 60 ms on release and 140 ms at impact. Light is restrained and has no extra shadows.

| Wind layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Flight ribbons | 2 | 4 | 6 |
| Recycled pressure-ring slots | 8 | 12 | 20 |
| Flight / impact particles | 60 / 90 | 140 / 240 | 260 / 480 |
| Vortex ribbons | 2 | 4 | 7 |
| Mist billboards | 4 | 10 | 18 |
| Wispy trail sheets | 1 | 3 | 3 |
| Air distortion approximation | Off | Subtle warped wisps | Stronger warped wisps / ring edges |
| Small light intensity | 0 | 3 | 5 |

All values derive from the central `GraphicsSettings` VFX budget and update active spells. Air distortion is a procedural shader approximation, not screen-space refraction: no renderer rewrite or scene-color copy is required. Water interaction uses transparent surface overlays rather than modifying the water simulation. Soft masks, disabled depth writing and deliberate render order avoid rectangular particle edges and opaque intersecting planes.

`EffectManager` owns the spell clock and expiry. The ability uses the existing `ObjectPool` to retain at most three VFX bundles: fixed particle buffers, instanced ribbons/rings/mist, materials and a reusable light. Each completed cast unsubscribes, removes its entire scene group, and resets its light before returning the bundle. Dormant bundles do not render or update. Their GPU resources are destroyed when the ability/game is disposed. This avoids allocating and recompiling the same wind layers on every cast; first use can still compile shaders.

Added modules are in `src/abilities/wind/`: `TempestBreak`, `TempestBreakEffect`, `WindResources`, `WindProjectile`, `WindRibbon`, `PressureRingPool`, `WindTrail`, `WaterWake`, `WindImpact`, `WindParticleSystem`, `WindMaterials`, `windConfig` and `resolveWindTarget`. `Game.ts` adds registration/slot assignment only; `HUD.ts` updates the phase caption. Ice, world, model, movement, camera, targeting, renderer and quality implementations are unchanged. Four remaining slots stay EMPTY.

`npm test` now runs 17 core tests. `/phase3-smoke.html` exercises actual model animations, input, casting, cooldown, targeting/range, every wind stage, presets, expiry and stress cleanup. `/phase3-review.html` supports authored stage inspection, close/medium/maximum range, camera angles and live playback; both are development-only. [Phase 03 validation and file inventory](docs/phase3-validation.md) records observed counters and test results.

## Phase 02: human and Glacial Eruption

The mannequin is replaced by Microsoft Rocketbox **Male_Adult_04**, a properly skinned adult male in a dark hoodie, trousers and trainers. The library is MIT-licensed; [provenance and conversion notes](public/models/README.md) and [the original license](public/models/ROCKETBOX-LICENSE.txt) ship locally. The roughly 3.8 MB GLB contains reduced-resolution textures and three in-place clips: **Idle**, **Walk**, **Run**. `AnimationMixer` crossfades over 220 ms. Movement works while loading; the visual exposes animated hand and chest positions for future abilities. A load failure is reported rather than silently showing the discarded mannequin.

Glacial Eruption remains the first registered spell. Select Q/1 and left-click while aiming at water. **Cooldown: 2.5 seconds. Range: 32 m. Lifetime: 5 seconds.** Valid ground targets outside spell range clamp along the player-to-target direction. Null/sky/nonfinite targets reject without consuming cooldown. The existing crosshair raycaster is used.

Sequence: restrained frost gathers at the right hand; a thin ground trail reaches the target; branching/cellular frost cracks spread; a 6.1 m irregular central crystal and staggered neighbors shoot up, overshoot and settle; instanced chips fly and fall; soft low mist expands; tiny snow drifts and fades. A temporary cyan point light flashes, a local glow overlay illuminates the custom water, and a bounded camera response lasts 160 ms. The formation stays, then sinks/dithers away from 3.5 s. Shards, mist and the light stop before the formation expires. Effects release their materials, unique buffers, instance buffers, subscriptions and root groups. The ability owns shared crystal/plane geometries.

Ice uses dense PBR surfaces, deep cyan variation, pale facets, Fresnel rims, internal veins and restrained bright edges. It avoids expensive transmission/refraction passes and transparent-instance sorting. The mesh is a custom irregular prism, not cones/cylinders. Ground frost is a temporary additive overlay; the water stays intact.

| Spell layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Main crystals | 6 | 10 | 16 |
| Flying shards | 20 | 42 | 84 |
| Snow particles | 80 | 210 | 420 |
| Soft mist billboards | 5 | 12 | 20 |
| Ice shading | Basic facets/rims | Internal veins | Enhanced interior highlights |
| Light peak | 28 | 60 | 90 |

Settings derive from the shared VFX budget and update active spells when switched live. Each effect uses one instanced draw per crystal, debris and mist field, plus GPU snow points. There are no per-particle meshes or extra animation callbacks. The temporary light does not cast expensive additional shadows.

The new spell modules are under `src/abilities/ice/`: `GlacialEruption`, `GlacialEruptionEffect`, `IceResources`, `CrystalGeometry`, `IceMaterial`, `IceSpikeField`, `FrostGroundEffect`, `FrostTrail`, `IceShardEmitter`, `ColdMist`, `FrostParticles`, `ImpactGlow`, `iceConfig`, and `resolveGlacialTarget`. `Game.ts` only registers/assigns the ability and supplies the hand origin/camera feedback. Camera, visual, HUD and effect-manager modules have small extensions; movement/world systems are preserved.

`npm test` runs 17 core tests. `/phase2-smoke.html` checks model loading, animation states, bone attachments, movement/sprint, aiming, mouse casting, cooldown/HUD, live spell presets, eruption growth, expiry and repeated-cast cleanup. After 10 and 20 completed stress casts, and 40 rapid rejected requests, warmed MEDIUM counters returned to **12 scene children, 12 geometries, 20 textures, 25 programs, 25 draw calls**. These include composer buffers, shadow maps and character textures. Stress casts advance the lifecycle clock for fast deterministic cleanup checks; a separate first cast expires in real time. This shows resource stability, not a hardware-independent FPS guarantee.

`/phase2-review.html` is a development-only static timeline viewer for visual inspection at 0.15, 0.38, 0.65, 1.15, 2.8 and 4.1 seconds across all qualities. Neither test page is part of the production entry point. Four remaining slots stay EMPTY in Phase 03.

## Run

Node.js 20.19+ or 22.12+ is required by Vite (tested with Node 24).

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. `npm run build` checks TypeScript and creates `dist/`. `npm run preview` serves that production build. `npm run typecheck` checks types separately.

## Controls

| Input | Action |
| --- | --- |
| WASD | Camera-relative movement, including normalized diagonals |
| Shift | Sprint |
| Click the world | Capture the mouse; left button requests casting |
| Mouse | Orbit camera while captured |
| Left/right drag | Orbit fallback when pointer lock is unavailable |
| Right button | Closer aim framing while held |
| Esc | Release mouse to interact with UI |
| Q / E / R / F / V / X, or 1–6 | Q/1 selects Glacial Eruption; E/2 selects Tempest Break; R/3 selects Heaven's Verdict; F/V/X are empty |
| P | Toggle performance HUD |
| F3 | Toggle development diagnostics |
| T | Toggle the optional ground target marker |
| LOW / MED / MAX | Change graphics live |
| Gear | Sensitivity, target marker, and telemetry settings |

Empty casting safely does nothing. The tiny crosshair is the source of the aim ray; there is no mouse cursor targeting mode. Graphics preference persists locally when browser storage is available. The desktop UI scales for 1920×1080 and 2560×1440, with compact layouts for smaller windows.

## Structure

```text
src/
  main.ts                         Boot and HMR cleanup
  game/
    Game.ts                       Composition and frame order
    config.ts                     Shared world/movement/camera limits
    SceneManager.ts               Scene, background and fog
    RendererManager.ts            WebGL, composer, bloom, vignette, output
    CameraController.ts           Damped orbit/follow camera
    InputManager.ts               Keyboard, pointer lock and drag input
    PerformanceManager.ts         Half-second performance sampling
  world/
    World.ts                      World lifecycle
    DarkWater.ts                  Animated procedural water shader
    Environment.ts                Haze, character lights and shadows
    Atmosphere.ts                 GPU animated sparse dust
  player/
    Player.ts                     Transform and velocity
    PlayerController.ts           Movement/turning and gait driver
    PlayerVisual.ts               Replaceable articulated human visual
  abilities/
    Ability.ts                    Ability contract and cast context
    AbilityManager.ts             Selection, assignment, casting, cooldowns
    AbilityRegistry.ts            Registration and ability lifecycle
    AbilitySlot.ts                Six slot bindings (Q, E and R equipped)
  targeting/
    GroundRaycaster.ts            Stable analytic surface intersection
    TargetingSystem.ts            Crosshair ray, target point and marker
  effects/
    EffectManager.ts              Future effect lifetimes and counters
    ObjectPool.ts                 Optional bounded reusable effect storage
  quality/
    GraphicsSettings.ts           Shared settings and subscriptions
    QualityPreset.ts              Rendering and future VFX budgets
  ui/
    HUD.ts                        Branding, crosshair, selection, diagnostics
    AbilityBar.ts                 Ability metadata/cooldown presentation
    GraphicsMenu.ts               Live presets and controls
    PerformanceHUD.ts             Renderer and effect counters
  styles/game.css
tests/
  foundation.spec.ts              Core invariant tests
  browser-smoke.ts                Actual browser render/input acceptance
smoke.html                        Development acceptance harness
```

## Graphics presets

| Setting | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Pixel ratio cap | 0.85 | 1.25 | 1.75 |
| Ambient dust | 100 | 300 | 650 |
| Water subdivisions | 32² | 96² | 160² |
| Water noise detail | 1 | 2 | 3 |
| Bloom strength | Disabled | 0.18 | 0.27 |
| Character shadows | Off | 1024² | 2048² |
| Future per-effect particle budget | 150 | 400 | 900 |

Pixel ratio never exceeds device DPR. `GraphicsSettings.subscribe()` immediately applies the current configuration and returns an unsubscribe function. Systems read `settings.config`; future spells read `context.quality.config.effectParticleBudget` or `context.quality.preset`. MAX improves surface detail, atmosphere density and shadows without introducing additional world content. The vignette stays inexpensive on every preset.

The performance panel counts all render passes, including shadow and postprocessing work, using `renderer.info` with automatic resets disabled. FPS/frame time represent actual frame intervals, not the capped simulation delta. Particles include atmospheric dust plus visible effect snow; instances include visible crystals, shards and mist. It updates every 500 ms; other UI updates at 10 Hz. Hardware/browser GPU support determine actual performance.

## Add one future ability

1. Create an implementation in `src/abilities/`, implementing `Ability` from `Ability.ts`. Use a unique `id` and define `name`, `element`, `color`, optional text-glyph `icon`, and a cooldown in seconds.
2. Register the instance through `game.abilities.registry.register(ability)` during composition in `Game.ts` (or a dedicated future registration module).
3. Assign it with `game.abilities.assignSlot(slotIndex, ability.id)`. Keyboard bindings belong to slots rather than the ability implementation, keeping remapping separate.
4. In `cast(context)`, create the ability's designed effects and add each to `context.effectManager`. Return `false` if a cast is invalid. Every managed effect returns `false` at the end of its lifetime and disposes its resources.

`AbilityCastContext` provides the player, scene, camera, right-hand origin, camera aim direction, player forward, camera forward, nullable ground target, target point, targeting system, simulation time, quality settings, effect manager and optional bounded camera feedback callback. Cast vectors are snapshots. Targeting getters expose reusable live vectors; copy retained values. The shared targeting system supports 180 m world rays and nullable sky/out-of-range ground hits. Glacial Eruption applies its own shorter 32 m range to valid ground targets. No scene collision targets exist.

`EffectManager` owns effect updates, expiry and cleanup. Report visible counts through `ManagedEffect.particleCount` and `instanceCount`; `activeCount` supports lifecycle diagnostics. `ObjectPool<T>` remains opt-in. Glacial Eruption shares immutable crystal/plane geometry while owning per-cast materials and particle/instance buffers.

## Technical choices

- Water is a purpose-written GLSL surface: moving multi-scale noise normals, subtle displacement, view-dependent Fresnel, analytical cold reflections/highlights, contact darkening, and distance fog. It does **not** use costly planar reflection renders or screen-space reflection. Future spell reflections would need a deliberate additional rendering strategy.
- The water plane spans 6 km and recenters around the player. Movement is bounded at ±2400 m; the 180 m casting range leaves extensive room for future effects. Cosmetic waves stay shallow; movement and targeting use a consistent `y=0` gameplay plane.
- The character is a local rigged GLB normalized to 1.82 m. `PlayerVisual` owns GLTF loading, animation blending, attachments and disposal. No mannequin geometry remains. It stays replaceable without changing movement, targeting or abilities.
- Movement integrates exponential acceleration analytically and turns along the shortest angle. Camera damping is exponential. Simulation delta is capped at 50 ms after a stall; hidden tabs pause and resume without time jumps. No jumping is implemented.
- Each owning system disposes its GPU resources and subscriptions. Per-frame vector scratch space is reused; allocations for cast snapshots happen only on a real registered cast. Input clears when focus is lost, the page is hidden, or pointer lock changes.
- Three.js is the only runtime dependency. Vite, TypeScript, Three.js types, and Playwright's test runner are development dependencies. Production chunks separate the engine and postprocessing.

## Verification

```sh
npm test
npm run build
```

The 17 Node tests use Playwright's runner **without launching/downloading a browser**. They cover movement at 30/60/144 FPS, diagonals, camera-relative direction, sprint, deceleration, turning, ray/range limits, nonfinite input rejection, empty casting, cooldowns, quality notifications, crystal topology, pooling and effect cleanup. Test-only dummy abilities never enter the application.

With Vite running, open `/smoke.html` in a WebGL-capable browser. The development-only harness exercises the actual render loop with keyboard and mouse DOM events, camera following, all slots, safe empty casting, all rendering presets, HUD/debug toggles, targeting limits and disposal. It prints a visible pass/fail report after about 10 seconds. It is not part of the production entry point. Native pointer lock should also be checked interactively in a desktop browser; browser embedding may deny it, so dragging is supported as a fallback.

Phase 04 ends with Glacial Eruption on Q, Tempest Break on E, Heaven's Verdict on R, and three empty slots.
