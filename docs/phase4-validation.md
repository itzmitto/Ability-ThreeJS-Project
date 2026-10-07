# Phase 04 — Heaven's Verdict

The sandbox now contains exactly three real abilities: **Q/1 Glacial Eruption, E/2 Tempest Break, R/3 Heaven's Verdict**. F/V/X remain empty. This phase adds only lightning VFX: no enemies, combat/damage systems, NPCs, inventory, quests or additional abilities.

## Cast and sequence

| Property | Value |
| --- | --- |
| Element / accent | Lightning; electric blue-white |
| Cooldown | 4 seconds, managed by the existing AbilityManager |
| Maximum range | 45 m from the player, along the existing ground hit |
| Main channel origin | 22 m above the selected target |
| Main strike | 1.02 s after cast |
| Re-strikes | +0.081 s and +0.169 s |
| Main discharge / afterimage | 240 ms / 110 ms |
| Total managed lifetime | 6.2 s |
| Shockwave radius | Toward 13.5 m |
| Water ripples | Toward 12 m |
| Secondary impact radius | 3.1–6.9 m |
| Camera response | One distance-attenuated rotational impulse, capped at 0.0038 rad for 200 ms |

Charging follows the real animated right hand, with a small white-blue palm core, wrist ring, finger-sized arcs, restrained forearm/chest streamers and inward sparks. Ground-level electricity traces from the player toward the aimed location. Organic target veins and faint broken electromagnetic contours precede the strike.

A localized cloud mass forms above the target. Most cloud layers sit between 12.5 and 18.5 m, while lower storm fringes at roughly 8 m preserve anticipation in the existing third-person camera. Procedural turbulence, seed variation, rotating positions and irregular internal flashes make the mass unstable. There is no skybox, opaque sphere or new weather system.

Thin downward and upward leaders grow/flicker and fork. One shares the eventual trunk and connects in the last 25 ms before discharge; other leaders remain incomplete. The main return stroke fills the connected path, rapidly re-strikes with changing branches, and leaves a faint short afterimage. Smaller bolts follow asynchronously at asymmetric seeded positions.

The hit produces actual 3D illumination through an impact light and a weaker elevated backscatter light. They are shadowless and detach by 1.95 s. A bright temporary surface overlay handles the custom water's light response, including a view-aligned broken reflection, noisy white-blue impact flare, fast electric pressure ring and slower ripples. Branching veins conduct across the water instead of forming uniform spokes. Ionized mist pushes outward with drag/curl, while sparks, streaks, ballistic droplets and slow flickering motes use different motion rules. Small ion coronas mark temporary nodes; intermittent arcs link them until the field fades. The environment returns to its original darkness.

Ground targets use the existing TargetingSystem snapshot. Finite hits clamp to 45 m. Null/sky/nonfinite targets reject without consuming cooldown or falling back to the origin. No extra raycaster is added. Movement, aiming and animation continue through the effect.

## Lightning generation and rendering

`LightningPath` owns a fixed typed segment buffer and reusable vector scratch space. Each channel combines correlated macro bends, smaller controlled offsets and exact endpoints. Generation is iterative and stops at capacity; there is no uncontrolled recursive subdivision.

`LightningBranchGenerator` first generates the connected trunk. Major forks start on actual trunk segment endpoints; minor forks attach to major paths; short micro-streamers attach to existing segments. Stratified, lower-channel fork heights and jittered golden-angle azimuths preserve a broad silhouette in close gameplay views and avoid one-sided random outliers. The main trunk remains stable across re-strikes while seeded branches change. Runtime casts vary seeds; review/tests use fixed seeds.

`LightningRenderer` turns segments into camera-facing triangle ribbons. World-space widths give the trunk genuine thickness and progressively thinner forks. A screen-aware minimum core footprint keeps distant narrow arcs readable. White core, pale hot channel and deep blue halo share one shader/draw, rather than a material/mesh for every branch. Small endpoint overlaps soften joints. No WebGL line width, laser cylinder or stock lightning-example renderer is used.

The reusable small-arc API, `ElectricArcRenderer`, serves hand arcs, player-to-target traces, water veins and residual node connections. Main discharge regenerates only at three scheduled revisions. Hand arcs update at 22 Hz; residual links at 14 Hz; secondary buffers change only when their active mask changes. Typed geometry arrays persist and uploads cover only active ranges.

Custom emissive materials use `RawShaderMaterial` with explicit declarations. Unlike standard material cache keys, these shaders do not acquire redundant variants as temporary scene lights appear/disappear. The character and existing world retain their ordinary rendering and lighting. Existing bloom, tone mapping, exposure and graphics presets remain authoritative. LOW's explicit bolt halo works with bloom disabled.

The storm and mist use soft procedural billboard masks. Shockwave-edge warping approximates atmospheric distortion on MEDIUM/MAX, with additional cloud noise on MAX. This is not screen-space refraction or a new compositor pass. Transparent layers have depth testing, depth writes disabled and deliberate render order. The water reflection overlay fades before its finite boundary, preventing a visible rectangular edge.

## Central quality scaling

All values derive from the existing shared VFX budget through `lightningQuality()`. Active spells subscribe to GraphicsSettings; quality changes rebuild bounded paths and adjust counts without restarting the effect or adding another settings system.

| Detail | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Trunk segments | 32 | 48 | 64 |
| Major forks | 4 | 8 | 12 |
| Minor forks | 10 | 22 | 42 |
| Micro-streamers | 8 | 18 | 36 |
| Main lightning segments submitted | 226 | 464 | 814 |
| Searching leaders, with forks | 3 | 6 | 10 |
| Secondary strikes | 2 | 4 | 7 |
| Ground ion nodes | 6 | 10 | 16 |
| Impact points | 150 | 360 | 840 |
| Ion mist instances | 6 | 14 | 24 |
| Cloud layers | 3 | 6 | 10 |
| Transient lights | 1 | 2 | 2 |
| Impact light peak | 650 | 1100 | 1700 |
| Distortion/detail | Off | Subtle | Enhanced |

MAX also has more surface branches, residual links, node coronas and subordinate strikes; it does not merely increase the particle count. Tested LOW → MAX during charge and MAX → LOW during the lingering field.

`ElectricParticleSystem` batches four fixed buffers: hand charge, fast ion sparks/streaks, ballistic water droplets, and slow blue electrical motes. Those contain five visual categories through spark/streak masks and distinct color/motion. GPU motion uses analytic drag, gravity, curl or hover/flicker, without individual particle meshes or new vectors each frame. The maximum submitted lightning particle count is 840; the 650 MAX ambient particles bring total telemetry to 1490. Cloud/mist/node coronas are instances and reported separately (50 at MAX impact).

## Resource lifecycle and optimization

`HeavensVerdict` owns `VerdictResources`, using the existing ObjectPool with at most two bundles. Four-second cooldown and 6.2-second lifetime allow two overlapping verdicts. A bundle retains its geometry, materials, typed buffers and reusable lights between casts. A cached bundle has no scene parent, zero light intensity and no render/update work.

`HeavensVerdictEffect` owns the clock, target/context snapshot, quality subscription and pool lease. EffectManager removes expired instances and calls disposal. Disposal unsubscribes once, detaches all lights and the complete root, resets intensity and releases the lease. Game disposal clears active effects before destroying ability pools. No spell RAF, timeout, event handler or permanently active emitter exists.

Optimization passes retained the visual layers while reducing cost:

- One batched lightning draw per role rather than meshes/materials per fork.
- Stable raw emissive shader programs across transient light counts.
- Fixed buffers and partial active-range uploads; no per-frame geometry recreation.
- Scheduled path revisions rather than continuously rebuilding the full bolt.
- Instanced storm, mist and node coronas.
- Separate GPU particle buffers with bounded budgets.
- Reused vectors/matrices and hand-position work limited to the charge window.
- Two pooled bundles and explicit light removal; no added dynamic shadows.

## Files added

```text
src/abilities/lightning/
  HeavensVerdict.ts            Metadata, safe targeting, pool acquisition and cast
  HeavensVerdictEffect.ts      Authored stages, light/camera response and expiry
  VerdictResources.ts         Two-bundle resource ownership and reuse
  verdictConfig.ts            Timing, range, budgets, seed and pulse helpers
  resolveVerdictTarget.ts      Finite ground validation and 45 m clamp
  LightningPath.ts            Bounded channel/segment storage
  LightningBranchGenerator.ts Parent-attached hierarchical forks
  LightningRenderer.ts        Thick ribbon batching and partial buffer uploads
  LightningMaterials.ts       Layered core/channel/halo and raw shader policy
  ElectricArcRenderer.ts      Shared small-arc API
  PlayerCharge.ts             Animated palm/wrist/forearm/chest feedback
  StormVolume.ts              Local turbulent mass and internal flashes
  MainDischarge.ts            Searching leaders, re-strikes, afterimage, secondary bolts
  WaterDischarge.ts           Organic veins, trace, node coronas and residual network
  ElectricalShockwave.ts      Flare, broken reflection, pressure ring and ripples
  IonMist.ts                  Soft outward/curling vapor
  ElectricParticleSystem.ts   Charge, sparks/streaks, droplets and lingering motes
tests/lightning.spec.ts
tests/phase4-browser.ts
tests/phase4-review.ts
phase4-smoke.html
phase4-review.html
docs/phase4-validation.md
docs/phase4-browser-report.txt
docs/phase4-preview.png
```

## Shared files modified

- `src/game/Game.ts`: import, register and assign Heaven's Verdict to slot 3 only.
- `src/ui/HUD.ts`: Phase 04 caption; the HUD layout/cooldown mechanism is unchanged.
- `src/quality/GraphicsSettings.ts`: read-only `subscriberCount` lifecycle diagnostic.
- `tests/phase2-browser.ts`: test empty F rather than newly equipped R.
- `tests/phase3-browser.ts`: test empty slot 4 rather than newly equipped slot 3.
- `README.md`: third ability, controls, configuration, modules and lifecycle documentation.

No ice/wind implementation, player model or animation asset, camera/movement/targeting implementation, renderer/post-processing, water engine, production entry point or dependency was replaced.

## Seven-pass work and mandatory refinement

1. Architecture/prototype: reusable bounded paths, renderer and managed resource bundle.
2. Main lightning: real forks, variable thickness, layered hot channels, connected leaders, re-strikes/afterimage.
3. Secondary/world VFX: hand/body feedback, conduction, mist, particle categories, subordinate strikes and transient lights.
4. Materials/integration: turbulent clouds, procedural surface response, existing bloom, explicit raw shaders and soft masks.
5. Optimization: batching, pooling, active-range uploads and scheduled updates.
6. Browser review: actual gameplay camera and deterministic stages, checking timing, branching, range, light, water and transparency.
7. Refinement and re-profiling: the first review found three weaknesses — storm mass mostly above the view, small pre-ionization and a flat-looking water flash. Lower storm fringes, wider organic pre-ionization and a rippled view-aligned reflection corrected them. After the first complete technical/stress suite passed, a further mandatory pass added visible precursor forks/late connection, ion-node coronas, stronger residual arcs and a distance-aware core footprint. Full MAX water veins received sufficient bounded capacity, and the reflection boundary now fades. The complete browser suite and performance profiles were rerun after these refinements.

The existing camera is never zoomed away or given a cinematic takeover. The 22 m channel can extend above the frame at close targets, while its impact, lower forks, storm fringes and ground field remain readable. Review includes rear gameplay, side and front-ish character angles, near/normal/far targets and all presets. No obvious square particle edges or opaque intersecting cloud cards were observed. Actual mouse/key casting is checked separately from frozen authored stages.

## Build and tests

`npm install`, the existing `npm run dev` server and `npm run build` succeed. TypeScript is clean. The unchanged 544.72 kB Three.js engine chunk still produces Vite's advisory bundle-size warning. No dependency was added.

`npm test`: **17 tests pass**. New tests cover R/3 registration, shared four-second cooldown, invalid targets, range, deterministic finite bounded paths, parent attachment, stable trunk across re-strikes, increasing quality detail, 6.2 s lifetime, live switching, light removal, subscription cleanup and pool reuse. Existing movement, targeting, ice geometry/budgets and wind tests continue to pass.

`/phase4-smoke.html` exercises the actual loaded human model, Idle/Walk/Run, WASD/sprint, mouse camera, R/3 selection, left-click casting, cooldown HUD, existing Q/E effects, all lightning stages/presets, range/rejection, complete real-time expiry, light/subscription cleanup and quality transitions. No browser console/shader errors were observed. The complete visible report is saved beside this document.

Both dedicated browser regression suites also pass after integration: `/phase2-smoke.html` returns ice to 12 geometries / 20 textures / 25 programs / 25 calls; `/phase3-smoke.html` returns wind to its warmed 30 geometries / 20 textures / 46 programs / 25 calls. Both include their existing repeated-cast and cooldown checks. Native browser keyboard R followed by an ordinary canvas left-click was also exercised on the production entry, showing hand charge and cooldown; the scene returned to darkness without console errors.

## Final stress and frame observations

After warming two lightning and two wind bundles, including standard scene light-count variants, the final refined suite tests:

- 20 Heaven's Verdict casts, with checks after 10 and 20.
- 20 alternating Ice → Wind → Lightning casts.
- A separate 30 alternating casts.
- 60 rapid rejected requests during cooldown.
- LOW → MAX while charging and MAX → LOW while the field lingers.

Accelerated stress advances the lifecycle clock and renders intermediate stages. Separate complete casts run in real time for frame observations and natural expiry.

| Warmed MEDIUM counter | Before | After all stress/profiles |
| --- | --- | --- |
| Top-level scene objects | 12 | 12 |
| Temporary point lights | 0 | 0 |
| Quality subscriptions | 5 | 5 |
| Active effects | 0 | 0 |
| GPU geometries | 64 | 64 |
| Textures | 20 | 20 |
| Shader programs | 60 | 60 |
| Draw calls after expiry | 25 | 25 |

The fixed geometry total includes two dormant lightning bundles and two dormant wind bundles; it does not grow per cast. Final game disposal returns to **0 GPU geometries, 0 textures and 0 quality subscriptions**. No temporary light or effect root remains.

After refinement, complete-cast observations at **1280×720**, following warm-up:

| Preset | Peak calls, including world/shadows/composer | Peak lightning points | Peak triangles | Median frame | 95th percentile |
| --- | --- | --- | --- | --- | --- |
| LOW | 21 | 150 | 13,114 | 6.1 ms (~164 FPS) | 6.2 ms |
| MEDIUM | 38 | 360 | 39,349 | 6.1 ms (~164 FPS) | 6.2 ms |
| MAX | 38 | 840 | 73,865 | 6.1 ms (~164 FPS) | 6.2 ms |

These are browser frame-interval observations on this machine, not GPU timer-query measurements or a promise for other hardware/resolutions. MAX static impact telemetry includes 1490 ambient + lightning points, 50 VFX instances and 38 calls. The transient strike is heavier than the empty world but no lasting frame/resource degradation was observed.

## Reproduce

Run `npm install` and `npm run dev`. Select R/3 and left-click while aiming at water; Q/1 and E/2 remain available. WASD, Shift, mouse aim, right-button aim framing, Esc, P, F3, T and the graphics menu retain their controls. `/phase4-review.html` exposes stage/range/angle/quality/seed controls and full-sequence playback. `/phase4-smoke.html` prints acceptance, stress and profile results after roughly half a minute. Both pages are development-only and omitted from the production entry graph.
