# Phase 10 — Spectral Break: Prismatic Annihilation

## Scope and controls

Exactly one production ability was added: **N / 9 — SPECTRAL BREAK: PRISMATIC ANNIHILATION**. Cooldown **10 s**, range **85 m from casting origin**, lifetime **9 s of simulation time**, water influence up to **22 m**. Phase 9 was verified before implementation: all eight prior abilities and the realistic water system are present. Prior spell sources, player locomotion/animations, camera, targeting, water renderer and postprocessing were preserved. No runtime dependency, external visual asset, enemies, damage or unrelated gameplay was added.

Select N or 9 and click once. Charge follows the actual Rocketbox right-hand attachment; the aim direction and finite/clamped distance are captured at cast time. Release snapshots the current hand position and moves the endpoint along the captured direction, so walking during charge does not bend the beam or exceed its range. After release, the origin and direction stay frozen. Valid ground aim is preferred; a finite forward ray supports sky casts. Invalid rays or a degenerate target reject without cooldown. Normal cooldown exceeds lifetime; a single pooled bundle rejects raw concurrent Spectral leases.

## Reference interpretation

The supplied attachment contained text only. **No anime video was accessible or analyzed.** The implementation follows the written visual language: white/cyan center, dominant turquoise/blue flow, violet depth, sparse magenta and green/yellow accents, dark jagged silhouettes, stretched forward streaks and curved energy fronts. All geometry and shaders are original procedural realtime effects; no anime frame textures are used.

## Sequence

| Time | Behavior |
| --- | --- |
| 0–0.65 s | Hand nucleus, inward motes, contracting spectral strands and restrained aura |
| 0.65–1.05 s | Nucleus and rings compress; brightness builds |
| 1.05–1.15 s | Short release flash and bounded camera impulse |
| 1.05–1.65 s | Beam grows progressively; an open curved front travels to the captured endpoint |
| 1.65–3.35 s | Sustained axial flow, dark fractures, pressure arcs and surges near 2.05/2.72 s |
| 3.35–3.72 s | Final overload and narrowing begin |
| 3.72–5.55 s | Prismatic core, expanding lobed caps, fragment burst, spray and impact waves |
| 4.15–7.2 s | Peeled ribbons, low local haze, motes and residual water light |
| 7.2–9 s | Smooth final extinction and owned disturbance removal |

Timeline envelopes use absolute effect age. Large frame steps and quality changes preserve the sequence. Game delta capping means extreme stalls can lengthen wall-clock playback; this is existing engine behavior.

## Geometry, shaders and color

The principal beam uses a shared **144 × 48 parameter grid** wrapped around a true three-dimensional cross section. Seven coordinated layers provide core, cyan body, blue shell, violet currents, magenta accents, a narrow secondary filament and a restrained atmospheric envelope. Vertex deformation combines asymmetric radial folds, axial undulation, taper and collapse. The front is an axial fragment cutoff rather than an instantly complete beam.

The flow shader translates noise domains and packets **along the beam axis**, with distinct broad-flow, streak and packet velocities. Multi-scale value noise, angular filaments and broken density fields retain saturated structure around the pale center. Collapse narrows the actual cross section, slows flow and opens forward-moving shred masks. Brightness is local; global exposure, tone mapping and bloom are unchanged.

`SpectralPalette.ts` supplies one GLSL palette shared by ribbons, caps and particles. Cyan/blue dominate; violet/magenta occupy secondary patches. Only the last four percent of the palette produces green/yellow accents. Dark contrast combines shader tearing masks with a dedicated normally blended jagged strip batch. Its depth-writing fragments are spatially bounded and disappear with the effect.

Ribbons use fixed subdivided strips and instanced seed attributes, with GPU spiral/arc paths, tapered ends and axial motion. The separate pressure batch uses incomplete elliptical arcs traveling along the beam. Neither rebuilds geometry per frame. The shockfront uses **open spherical-cap grids**, nonuniform curvature, angular lobes, a broken bright lip and internal moving bands. Layered caps at impact expand in depth; an oppositely facing echo avoids a flat disc silhouette.

Eight GPU particle categories have distinct trajectories and coverage: inward charge motes, axial streaks, curling flakes, front orbit spray, dark fragments, ballistic impact shards, water spray and slow aftermath dust. Elongated geometry conveys velocity; soft coverage prevents rectangular cards. A separate bounded instanced haze batch extends the aftermath.

Local optical response is a **procedural approximation**: deformed boundaries, chromatic separation and transparent haze. There is no scene-color refraction pass, optical raymarch or new fullscreen postprocess.

## Water and actual illumination

The existing Phase 9 reflection system sees the actual beam, character and impact geometry on MEDIUM/MAX. A temporary broken directional pressure channel follows the projected beam path. It contains moving highlights, V-shaped density and small visual displacement; the ground impact overlay carries differentiated leading and trailing crests. Both use noise/edge falloff instead of rectangular white plates.

Travel milestones emit a bounded number of sources through `WaterInteractionManager.addRipple`; impact adds three waves. The effect's owner is passed to every source. Disposal calls `removeOwner(this)` and never clears the global buffer. High sky casts omit ground impact overlays. Player movement and targeting remain on the existing logical plane.

One to three real PointLights follow charge/release, moving front and impact. They illuminate the player without modifying its materials. Lights detach as intensity falls and all detach by 7.7 s. No camera cut or forced movement occurs.

## Quality and resource budgets

| Configuration | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Beam layers | 3 | 5 | 7 |
| Long ribbons | 3 | 7 | 12 |
| Dark fracture strips | 4 | 10 | 18 |
| Pressure arcs | 3 | 6 | 10 |
| GPU particle budget | 240 | 720 | 1600 |
| Local haze instances | 6 | 14 | 24 |
| Temporary lights | 1 | 2 | 3 |
| Travel disturbance emissions | 4 | 7 | 10 |
| Cap layers | 1 | 2 | 3 |
| Noise detail | One scale | Two scales | Two scales plus additional visual layers |

The counts derive from existing central graphics budgets. Live changes modify uniforms, mesh visibility, instance counts and light participation; materials/topology are retained and timeline/target are not reset. LOW retains the white/cyan silhouette and blue shell with bloom disabled. Geometry is cached at maximum topology for all tiers; LOW reduces layer/instance/shader costs rather than reallocating meshes.

`SpectralResourcePool` owns one complete reusable bundle. Effects own their subscription and water sources. Expiry detaches roots and lights and returns the bundle; full game disposal destroys all owned geometry, materials and instanced meshes. Updates reuse vector/quaternion/uniform objects. Particle matrices and seed buffers are initialized once. Renderer counters describe allocated/drawn budgets, not the number of fragments actually visible after GPU shader masking.

## New production files — 19

All files are under `src/abilities/spectral/`.

| File | Responsibility |
| --- | --- |
| SpectralBreak.ts | Ability identity, safe cast, bounded acquisition |
| SpectralBreakEffect.ts | Sequence coordination, hand snapshot, lifecycle and ownership |
| SpectralBreakConfig.ts | Constants and envelope helpers |
| SpectralTimeline.ts | Absolute-time stages, surges and collapse |
| SpectralPalette.ts | Shared colors and procedural noise |
| SpectralQualityConfig.ts | Central quality mapping |
| resolveSpectralTarget.ts | Ground/ray validation and 85 m clamp |
| SpectralBeamGeometry.ts | Reusable surface and strip topology |
| SpectralFlowShader.ts | Axial flow, spectral layers, tearing and collapse |
| SpectralBeamMaterial.ts | Seven coordinated 3D beam layers |
| SpectralCharge.ts | Hand nucleus, contracting rings and charge strands |
| SpectralRibbons.ts | Instanced ribbons, fractures and pressure arcs |
| SpectralShockfront.ts | Curved open cap geometry and luminous lip shaders |
| SpectralParticleSystem.ts | Eight fixed-buffer GPU particle categories |
| SpectralAtmosphere.ts | Bounded local aftermath haze |
| SpectralImpact.ts | Expanding caps, core and residual shreds |
| SpectralWaterInteraction.ts | Directional pressure channel, crest and owned ripples |
| SpectralLightController.ts | Actual temporary scene-light behavior |
| SpectralResourcePool.ts | Bundle composition, cache, reset and GPU destruction |

Shared production changes are limited to `Game.ts` registration, `AbilitySlot.ts` ninth mapping, `HUD.ts` caption, `AbilityBar.ts` original SVG and `game.css` responsive layout. README is updated. No existing spell file or water source file was changed.

Development files: `phase10-review.html`, `tests/phase10-review.ts`, `phase10-smoke.html`, `tests/phase10-browser.ts`, `tests/spectral.spec.ts`, this document and the Phase 10 reports/screenshots. Review pages remain outside the normal production entrypoint. Preview controls include deterministic stages, ranges, camera angles, full playback, slowed motion and animation from the selected stage; they do not enter gameplay.

## Two mandatory visual refinement passes

First browser review identified four weaknesses: faceted shell contours, excessive magenta, uniform white core and ring-like front. Actual code changes increased surface subdivisions from 96 × 32 to 144 × 48, reduced angular fold frequency, added axial packets/filament lanes, introduced pale-cyan core structure, reduced magenta density and increased asymmetric cap depth/lobes. Before/after images: `phase10-pass0-sustain.jpg` and `phase10-pass1-sustain.jpg`.

Second review focused on framing and cinematic recovery. Actual changes reduced the charge strand scale, made collapse ribbons peel outward and lose bright saturation, slowed shader flow during collapse, reduced secondary violet cap opacity, increased primary cyan/blue fill and added an instanced local haze layer for aftermath. The side-view preview camera was widened to show the complete path. Final normal-view stage, quality and angle screenshots accompany this document. Browser inspection covered normal, side, diagonal, low and near-target angles, the 85 m range, full playback and changing flow/fracture patterns in slowed stage animation. The responsive HUD was checked at 380 × 760: all nine cards fit in a five-plus-four arrangement without horizontal overflow.

## Validation

- TypeScript strict `tsc --noEmit`: passed.
- Production Vite build: passed; existing Three.js vendor chunk remains above the 500 kB warning threshold.
- Playwright Node suite: **56 passed**, including all 50 prior tests and six Spectral targeting/control/timeline/attachment/quality/ownership tests.
- Browser harness verifies real engine input handling for N, 9, left click, movement, sprint, rapid camera changes, F3 and telemetry.
- Every spell renders through charge, active stages and expiry at each tier.
- Live LOW → MAX charge, MAX → MEDIUM sustain, MEDIUM → LOW impact and LOW → MAX aftermath preserve age and target.
- 20 isolated Spectral casts, 20 alternating all-nine casts, 40 additional alternating all-nine casts and 100 rejected cooldown requests are measured against warmed GPU/scene counters.
- Blood + Fire + Spectral coexist; water ownership survives independent disposal.
- Full disposal during charge, beam, impact and aftermath explicitly requires a loaded character before checking geometry/texture/subscription release. The persistent shoe-spray geometry/program is also warmed before the GPU baseline.

Alternating stress casts advance deterministic stages and render sampled frames; they are **not 80 realtime nine-second recordings**. Realtime profiling separately runs one full cast at each tier. The initial report is retained as `phase10-browser-first-report.txt`; the final repeat, with representative concurrent caches warmed before its baseline, is `phase10-browser-report.txt`.

## Measured performance

| Tier | Render buffers | Peak calls | Peak triangles | Spell particle budget | Peak instances | Sustain median / p95 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| LOW | 1088 × 612 | 23 | 95,162 | 240 | 267 | 20 / 20.7 ms |
| MEDIUM | 1280 × 720 | 69 | 296,655 | 720 | 764 | 20.4 / 30.3 ms |
| MAX | 1280 × 720 | 79 | 426,423 | 1600 | 1676 | 19 / 22.8 ms |

Actual browser viewport: **1280 × 720**, DPR 1. The LOW pixel-ratio cap reduces the render buffers to 1088 × 612. Idle medians were 20 / 19.1 / 19 ms for LOW/MEDIUM/MAX. The sampled sustained interval corresponds to roughly 50 / 49 / 53 browser frames per second; it is not a GPU throughput measurement. MEDIUM showed more scheduling variation in this run, including a release-stage p95 of 48.1 ms. All stage sample counts/medians/p95 values are retained in the raw report. These figures do not establish that MAX is faster than MEDIUM.

The final warmed baseline and post-profile comparison agree: **13 scene children, 106 objects, zero temporary PointLights, five persistent subscriptions, zero active effects, zero active ripples, 167 retained geometries, 21 textures and 120 cached shader programs**. Draw-call snapshots vary with the existing reflection cadence (25 versus 31) and are excluded from the resource equality assertion. Every isolated/alternating/cooldown/concurrent stress boundary and the final realtime boundary passed the equality check. Full game disposal and disposal at all four active stages returned geometry count, texture count and subscription count to **zero**, with each character confirmed loaded.

The final browser console warning/error capture is empty (`phase10-console.json`). The earlier local-server interruption was resolved and the entire browser run repeated; the final report has no failed assertions.
 They are browser RAF intervals and renderer counters, **not GPU timer results**. No GPU byte allocation or cross-hardware benchmark was measured. Counts include scene, character, water reflection, shadows and postprocessing. Spell particle budgets exclude persistent atmospheric particles and shoe spray.

## Limitations

No reference video was available. Procedural haze/optical boundaries approximate distortion; there is no fluid simulation, volumetric raymarch or transmitted scene-color refraction. Existing planar reflections remain flat-plane, cached and resolution limited. Very close casts and large impact caps can extend outside the ordinary camera frame. Transparent layers can show sorting/overlap artifacts, especially at grazing angles. The particle counter is a GPU draw budget, not an exact visible-particle count. Fixed maximum topology remains allocated on LOW. Ordinary shader/light warm-up can create retained cache entries; game disposal is the definitive zero-resource check. No claim is made about performance on other GPUs or at untested resolutions.
