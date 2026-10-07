# Elemental Sandbox — Phase 01

A browser-based Three.js foundation: a dark water arena, articulated human placeholder, third-person movement and aiming, empty ability slots, and live rendering presets. **No spells, enemies, targets, combat, or other game systems are implemented.** All assets and shaders are local; no model, texture, or font downloads are needed at runtime.

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
| Q / E / R / F / V / X, or 1–6 | Select an empty ability slot |
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
    AbilitySlot.ts                Six empty slot bindings
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

The performance panel counts all render passes, including shadow and postprocessing work, using `renderer.info` with automatic resets disabled. FPS/frame time represent actual frame intervals, not the capped simulation delta. Particles include atmospheric dust plus managed effects; instances count instances reported by managed effects (zero in this foundation). It updates every 500 ms; the other UI updates at 10 Hz. Hardware and browser GPU support determine actual performance; no universal 60 FPS guarantee is made.

## Add one future ability

1. Create an implementation in `src/abilities/`, implementing `Ability` from `Ability.ts`. Use a unique `id` and define `name`, `element`, `color`, optional text-glyph `icon`, and a cooldown in seconds.
2. Register the instance through `game.abilities.registry.register(ability)` during composition in `Game.ts` (or a dedicated future registration module).
3. Assign it with `game.abilities.assignSlot(slotIndex, ability.id)`. Keyboard bindings belong to slots rather than the ability implementation, keeping remapping separate.
4. In `cast(context)`, create the ability's designed effects and add each to `context.effectManager`. Return `false` if a cast is invalid. Every managed effect returns `false` at the end of its lifetime and disposes its resources.

`AbilityCastContext` provides the player, scene, camera, elevated origin, camera aim direction, player forward, camera forward, ground target (nullable), capped target point, targeting system, elapsed simulation time, quality settings and effect manager. Cast vectors are snapshots, so effects can safely retain them. Targeting getters themselves expose reusable live vectors: copy them if retaining values outside a cast. Aim direction follows the camera crosshair; sky/out-of-range ground hits return `null`, and the fallback target point lies 180 m from the player. No scene collision targets exist yet.

`EffectManager` supports arbitrary geometry, particles and `InstancedMesh` effects without dictating their aesthetic. Report counts through `ManagedEffect.particleCount` and `instanceCount`. `ObjectPool<T>` is opt-in; it caps concurrent leases, resets items on release, and disposes both available and leased items. Pool only when useful, and follow the shared quality budget. No effects are currently instantiated.

## Technical choices

- Water is a purpose-written GLSL surface: moving multi-scale noise normals, subtle displacement, view-dependent Fresnel, analytical cold reflections/highlights, contact darkening, and distance fog. It does **not** use costly planar reflection renders or screen-space reflection. Future spell reflections would need a deliberate additional rendering strategy.
- The water plane spans 6 km and recenters around the player. Movement is bounded at ±2400 m; the 180 m casting range leaves extensive room for future effects. Cosmetic waves stay shallow; movement and targeting use a consistent `y=0` gameplay plane.
- The character is a temporary 1.82 m articulated human with smooth ellipsoidal anatomy, tapered limbs, clothing, boots, hair, walking motion and shared geometries/materials. It is not a rigged production character. Replace `PlayerVisual` with a GLTF/AnimationMixer implementation without changing movement, camera, targeting or abilities.
- Movement integrates exponential acceleration analytically and turns along the shortest angle. Camera damping is exponential. Simulation delta is capped at 50 ms after a stall; hidden tabs pause and resume without time jumps. No jumping is implemented.
- Each owning system disposes its GPU resources and subscriptions. Per-frame vector scratch space is reused; allocations for cast snapshots happen only on a real registered cast. Input clears when focus is lost, the page is hidden, or pointer lock changes.
- Three.js is the only runtime dependency. Vite, TypeScript, Three.js types, and Playwright's test runner are development dependencies. Production chunks separate the engine and postprocessing.

## Verification

```sh
npm test
npm run build
```

The six Node tests use Playwright's runner **without launching/downloading a browser**. They check movement at 30/60/144 FPS, diagonal normalization, camera-relative direction, sprint, deceleration, shortest-path turning, ray limits, sky targeting, safe empty casts, cooldowns, settings notifications, pool reuse and effect cleanup. Test-only abilities never enter the application.

With Vite running, open `/smoke.html` in a WebGL-capable browser. The development-only harness exercises the actual render loop with keyboard and mouse DOM events, camera following, all slots, safe empty casting, all rendering presets, HUD/debug toggles, targeting limits and disposal. It prints a visible pass/fail report after about 10 seconds. It is not part of the production entry point. Native pointer lock should also be checked interactively in a desktop browser; browser embedding may deny it, so dragging is supported as a fallback.

Phase 01 ends here. All six slots are intentionally empty.
