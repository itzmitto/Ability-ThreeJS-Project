# Phase 03 — Tempest Break validation

Tempest Break is the only new ability. Glacial Eruption, the local Microsoft Rocketbox character and Idle/Walk/Run clips, world, movement, camera, targeting, renderer, graphics settings and existing UI behavior are preserved. Q/1 selects ice; E/2 selects wind. R/F/V/X remain empty.

## Spell behavior

- Right-hand charge follows the animated bone for 280 ms, with continuous spirals, a compressed pressure lens, small rings and inward dust.
- Release captures the live hand position. The existing crosshair ground hit becomes a destination 0.6 m above the surface. The trajectory is straight, travels at **36 m/s**, and clamps to **40 m from the release hand**. Sky aiming uses a normalized camera direction at maximum range; invalid origins/degenerate targets reject without cooldown.
- Ribbons and pressure rings grow their tail only as far as the projectile has traveled, preventing an instant trail through the character. Three noise-masked trail sheets and helical particles form a soft wake, bounded to six metres.
- A moving V pressure disturbance, central streak and surface ripples react beneath the projectile. These temporary overlays fade and never replace the water shader.
- Arrival shrinks/brightens the core for **85 ms**. The impact launches a fast **9 m** pressure front, broader translucent skirt, a tapered **5.5 m** vortex, soft radial/vertical mist, dragged outward particles and four slower water rings toward **11 m**. Aerial fallback retains the air ring while omitting water rings.
- Release camera response is 60 ms; impact response is 140 ms, attenuated by distance. Light is small, cold and shadowless, fading within 600 ms of impact. No FOV or camera architecture changes were needed.
- **Cooldown: 2 s. Lifecycle: 3–3.53 s.** Mist ends at 1.7 s after impact, particles at 2 s, surface rings at 2.05 s. Every visible layer fades before expiry.

## Quality and rendering

| Layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Projectile ribbons | 2 | 4 | 6 |
| Ring pool slots | 8 | 12 | 20 |
| Flight particles | 60 | 140 | 260 |
| Impact particles | 90 | 240 | 480 |
| Vortex ribbons | 2 | 4 | 7 |
| Mist instances | 4 | 10 | 18 |
| Trail sheets | 1 | 3 | 3 |
| Light intensity | 0 | 3 | 5 |

`windQuality()` consumes the existing shared particle budget: 150/400/900. It does not introduce another settings manager. Active effects subscribe and respond immediately to preset changes. MEDIUM/MAX increase warped wisp detail and perturb pressure edges for an atmospheric distortion approximation. This does not sample or refract the rendered scene, and adds no screen-space render pass. LOW omits that extra detail.

Continuous ribbon vertices, ring recycling, helical dust and radial particle drag run in shaders against fixed buffers. Only transform/uniform scratch objects are reused each frame. No per-frame geometry reconstruction or unbounded trail history exists. Transparent materials use depth testing with depth writes off, soft nonrectangular masks and deliberate layer order. Wind materials are gray-blue/cyan rather than uniformly white or electric.

## Resource ownership

`TempestBreak` owns a bounded `ObjectPool<WindVisuals>` with at most three concurrent bundles. Each bundle keeps geometry, materials, instance buffers, particle buffers and its reusable light between casts. This is a deliberate GPU cache; dormant bundles have no scene parent, no render/update work and zero light intensity. Normal two-second cooldown and maximum lifetime require at most two simultaneous wind casts.

`TempestBreakEffect` owns its context, clock, quality subscription and pool lease. `EffectManager` calls update, removes complete effects and invokes disposal. Disposal unsubscribes and returns the detached/reset bundle exactly once. Game disposal first clears active effects, then destroys the ability pool and all GPU buffers/materials/lights. There are no extra RAF loops, timers, event callbacks or permanent scene lights in the spell.

## Files added

```text
src/abilities/wind/
  TempestBreak.ts          Ability metadata, validation, registration-facing cast
  TempestBreakEffect.ts    Hand, flight, compression, impact and expiry sequencing
  WindResources.ts        Bounded reusable visual bundles and ownership
  WindProjectile.ts       Pressure lens and coordinated flight layers
  WindRibbon.ts           Continuous GPU-animated helical strips
  PressureRingPool.ts     Fixed instanced ring recycling
  WindTrail.ts            Soft tapered turbulent wake
  WaterWake.ts            Moving pressure disturbance over existing water
  WindImpact.ts           Atmospheric front, water rings, vortex and mist
  WindParticleSystem.ts   Fixed charge/flight/blast particle buffers
  WindMaterials.ts        Shared material policy and procedural noise
  windConfig.ts           Timing, range, speed and central-budget mapping
  resolveWindTarget.ts    Finite ground/sky targeting and range clamp
tests/wind.spec.ts
tests/phase3-browser.ts
tests/phase3-review.ts
phase3-smoke.html
phase3-review.html
docs/phase3-validation.md
docs/phase3-preview.png   Browser capture of the impact
docs/phase3-browser-report.txt  Captured final runtime/stress result
```

## Files modified

- `src/game/Game.ts`: register Tempest Break and assign slot 2; four added composition lines.
- `src/ui/HUD.ts`: update the phase caption while preserving layout and HUD behavior.
- `tests/phase2-browser.ts`: use R instead of newly equipped E for the empty-slot check; rename the Q assertion.
- `README.md`: document both abilities, controls, quality, lifetime and pool ownership.

No ice implementation, character asset, movement/camera/targeting system, renderer, world, graphics configuration, package dependency or production entry point was replaced.

## Tests and observed performance

- `npm install`: succeeds with existing dependencies.
- `npm run dev`: Vite serves the application on localhost, exercised in the browser.
- `npm run build`: TypeScript and production build pass. The existing 544.72 kB Three.js engine chunk still triggers Vite's advisory size warning.
- `npm test`: **12 tests pass** — foundation invariants, ice target/topology/budget checks, wind ground/sky/nonfinite/range handling, quality limits and pool reuse/capacity/disposal.
- `/smoke.html`: all foundation browser checks pass, including actual WASD/diagonals, camera follow/aiming, slot selection, safe empty cast, real graphics changes, telemetry/debug, range/pitch limits and disposal.
- `/phase2-smoke.html`: all ice regression checks pass — local character load, Idle/Walk/Run, bone attachments, input, targeting, Q casting, cooldown, quality changes, growing crystals, particles/mist/light expiry, 20 casts and rapid cooldown attempts.
- `/phase3-smoke.html`: actual hand-origin casting, 36 m/s travel, compression before detonation, wake/trail, shockwave/vortex/mist/water rings, all preset counts, live quality switching, close/medium/far/sky targets, cooldown/HUD, real-time expiry and stress checks pass. No browser console errors or shader warnings were observed.

The stress suite renders intermediate stages while advancing the effect clock, then lets everything expire. It compares warmed counters after **10 and 20 wind casts**, **20 alternating ice/wind casts**, and **40 rejected rapid requests**. Two overlapping wind bundles are warmed first, including shared-light shader variants.

| Warmed MEDIUM counter | Before stress | After stress |
| --- | --- | --- |
| Top-level scene objects | 12 | 12 |
| GPU geometries | 30 | 30 |
| Textures | 20 | 20 |
| Shader programs | 46 | 46 |
| Draw calls after expiry | 25 | 25 |
| Active effects | 0 | 0 |

The 30 geometries include 18 intentionally cached across two dormant wind bundles; they do not grow per cast. The ice-only regression returns to its existing baseline of 12 geometries, 20 textures, 25 programs and 25 draw calls. A representative wind impact costs 15 calls on LOW and 32 on MEDIUM/MAX, including world, character, shadows and composer work. The visible impact particle ceiling is 150/380/740 per wind effect. Fixed resource counts demonstrate stable cleanup, rather than a hardware-independent FPS claim.

The final full-disposal assertion also passes: `renderer.info.memory` returns to **0 geometries / 0 textures**, including all pooled wind bundles. The complete visible acceptance report is saved in `phase3-browser-report.txt` beside this document.

Visual inspection used the normal gameplay camera at 5, 14 and 40 m, straight-on and oblique angles, each preset, and charge/flight/compression/impact/vortex/residual stages. Live playback caught and resolved the initial oversized trail near the player. Soft masks and depth ordering showed no obvious square edges or opaque intersecting planes. The browser review at 1280×720 typically reported approximately 150–165 FPS after shader warm-up; this is an observation from this machine and static stage review, not a desktop hardware benchmark or a 1920/2560 performance guarantee.

## Reproduce

Run `npm install`, `npm run dev`, then open the application. Select E/2 and left-click while aiming at water. For deterministic acceptance, open `/phase3-smoke.html` and wait for the final visible report. `/phase3-review.html` allows stage, range, quality and angle selection plus full-sequence playback. These pages are omitted from the production build's entry graph. Native pointer lock is browser-dependent; the existing drag-to-orbit fallback remains available.
