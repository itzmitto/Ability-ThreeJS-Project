# Phase 07 — WORLDREND: Sovereign Void

Exactly one ability is added: **X / 6, WORLDREND**, Spatial / Void, **12-second cooldown, 55 m ground range, 11-second lifetime**. Left click activates the selected ability. Q/E/R/F/V retain their existing implementations. No Blender, external asset, dependency, physics/combat system or additional scene-render pass is introduced.

## Added files

Production modules under `src/abilities/void/`:

| Module | Responsibility |
| --- | --- |
| `Worldrend.ts` | Metadata, registration contract, target validation, bounded resource acquisition |
| `WorldrendConfig.ts` | Shared timeline, range, cooldown, central-budget detail mapping and phase curves |
| `resolveVoidTarget.ts` | Nullable finite ground validation and player-relative 55 m clamp |
| `WorldrendEffect.ts` | Managed clock, fixed orientation, live hand/camera transforms, quality subscription, lighting, feedback and expiry |
| `VoidResources.ts` | Two reusable bundles with explicit reset/disposal |
| `VoidMaterials.ts` | Shared GLSL3 emissive helpers, procedural noise and opening/collapse deformation |
| `RiftGeometry.ts` | Seeded asymmetric outline, recessed tunnel walls, curved back surface and boundary ribbons |
| `RiftOpening.ts` | Cosmic depth shader, bright structural edge, curved distortion corona, buffer ownership and repair seam |
| `RealityShards.ts` | Instanced angular 3D prisms, major/micro populations and orbital/collapse/ejection motion |
| `SpatialFilaments.ts` | Batched initial 3D seams and edge-to-fragment curved tension strands |
| `VoidParticles.ts` | Bounded GPU dust, gravitational swirl, inward acceleration and outward aftermath |
| `SpatialAtmosphere.ts` | Instanced soft gravitational haze and warped local veils |
| `VoidWaterInteraction.ts` | Surface convergence, reflection, ripple compression, geometric shockwave and aftershock |
| `SingularityCore.ts` | Short-lived faceted dark core, bright view-dependent rim and compression flash |
| `VoidCharge.ts` | Animated right-hand channel with filaments, nucleus outline and inward motes |

Verification/artifacts: `tests/void.spec.ts`, `tests/phase7-browser.ts`, `tests/phase7-review.ts`, `phase7-smoke.html`, `phase7-review.html`, this document, browser/regression reports and preview image. Test HTML entries are omitted from production.

## Existing files modified

`src/game/Game.ts` imports/registers WORLDREND and assigns slot index 5. `src/ui/HUD.ts` updates the phase caption; the existing ability bar consumes WORLDREND metadata, accent and cooldown without a redesign. README adds Phase 07, six-slot controls, configuration and lifecycle documentation.

Old acceptance harnesses update their former X-empty assertion to WORLDREND selection and six equipped slots. The foundation harness temporarily clears/restores a slot to retain the empty-casting safety check. Previous spell code, player/model, animations, movement, camera, targeting, renderer, water and quality implementation are unchanged.

## Geometry and dimensional interior

The mouth is an irregular, vertically elongated opening with independent left/right boundaries. Controlled seeded horizontal drift, pinches and protrusions preserve a readable major silhouette. Boundary positions have different depth offsets. Two recessed tunnel walls lead 7.5 m into the opening; a curved back surface reaches 8.8 m depth. This is actual world geometry rather than one noisy billboard. Nominal full dimensions are 18 m height and roughly 8 m width, with variation by seed.

At creation, yaw faces the broad opening toward the casting camera. It then remains fixed: camera movement exposes the recessed sides and changes interior parallax. Depth testing and an opaque depth-writing interior preserve player/fragment occlusion. Transparent veils, shards, corona, boundary energy and motes use explicit render order and no depth writes. Particle/billboard masks have soft circular edges.

The interior uses 3/5/8 procedural depth layers with view-direction parallax, different angular velocities, domain-warped cloud fields, curved energy currents, depth attenuation and sparse cyan/violet stars. Near currents move faster than deep structures. Collapse accelerates interior motion. It is a depth illusion on a real recessed mesh; no recursive portal or second scene is rendered.

The edge shader separates a narrow near-white violet core, flowing purple channel, soft corona and timed travelling surges. MEDIUM/MAX add a wider curved local corona with displaced contours and restrained cyan/magenta separation. The surrounding haze also warps locally. **Distortion is a shader approximation, not true refraction of the background.** No full-screen glitch, exposure change or new composer pass occurs.

## Motion and choreography

Hand channel lasts roughly one second and follows the actual animated hand bone. Initial 3D cracks precede the opening at 0.7–1.4 s. Vertical stretching and boundary separation have independent easing from 0.72–2.65 s. Stable phase lasts to 5.5 s with breathing edges, flowing interior, independent shard orbits, filaments and water rings.

Collapse begins at 5.5 s: the mouth narrows, shards and haze accelerate inward along curved paths, particles spiral faster and water rings compress. From 6.6 s the gravitational focus descends toward 2.6 m above the water, keeping the climax visible without moving the gameplay camera. Vertical height contracts after 6.7 s. The main interior finishes by 7.4 s. A short faceted singularity peaks at 7.55 s, then shrinks away by 7.95 s.

The 18 m shock front starts at 7.55 s. It contains a narrow bright polygon-modulated leading edge, broken angular gaps, a wider displaced-air band, surface highlights and a delayed aftershock. Micro fragments and motes are expelled; large shards have already converged. Residual spatial strands close individually using seeded times; the central seam shortens vertically and survives until about 10.3 s. Dust shifts toward muted indigo and water settles through 11 s. Feedback uses the existing bounded camera impulses at five authored events, with no sustained stable-phase shaking.

## Water and atmosphere

A temporary subdivided surface overlay produces a dark depression-like convergence field, subtle local wave motion, irregular inward/outward violet rings, radial fissures and camera-aligned broken specular reflection. Reflection strength responds to opening/collapse. A faint normal-blended dark layer sits beneath the additive highlights. The existing water geometry/material are never replaced; gameplay/targeting remain on y=0. Overlay displacement is cosmetic and shallow.

The atmospheric veil batch has independent radius, height, seed and orbit. During collapse it bends toward the descending center; after implosion it spreads outward and fades. Tiny upward/curved motes suggest lifted water and dust without adding a separate simulation. Temporary violet lights illuminate ordinary 3D materials; shader water receives its dedicated reflection overlay. Lights detach by 9 s and do not cast extra shadows.

## Quality configuration

The existing central `effectParticleBudget` selects one of three tiers. The ability uses one implementation; active quality changes do not restart its clock.

| Layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Outline levels | 18 | 28 | 40 |
| Physical/procedural depth layers | 3 | 5 | 8 |
| Major / micro shards | 14 / 80 | 34 / 200 | 64 / 420 |
| Dust/mote points | 150 | 480 | 1100 |
| Filament strips | 6 | 14 | 28 |
| Atmospheric veils | 6 | 14 | 28 |
| Maximum reported instances | 106 | 262 | 540 |
| Transient lights | 1 | 2 | 2 |
| Wider chromatic corona | Off | Restrained | Enhanced |

MAX improves silhouette resolution, physical recess subdivisions, apparent cosmic depth, major fragment composition, boundary corona, filament density, water ring layers and atmospheric volume; the difference is more than particle count. LOW retains the same primary outline and full sequence.

## Ownership and optimization

`EffectManager` owns the clock and completion. No spell timers, independent animation callbacks or global event listeners are added. Vector/quaternion scratch values are reused. Shards, haze and filaments use instanced buffer geometry; particles use a fixed 1100-point buffer. Motion/deformation occurs in shaders rather than rebuilding geometry every frame.

Two cached resource bundles bound memory. Seed changes update the existing position buffers in place; topology changes replace and dispose the affected owned geometry at quality changes. Materials/programs remain stable. Dormant bundles are detached and do not render/update. Expiry unsubscribes once, removes the root and lights, zeroes lighting and returns the bundle. Full disposal destroys every geometry, material and light; shared surface geometry is disposed only once. Shader materials are independent of dynamic scene-light counts, while ordinary character materials may compile finite light-count variants on first use.

Baseline measurement restores the normal gameplay camera/world before warming, ensuring cullable model geometry and shadow programs are represented. Buffer reuse also keeps interrupted early casts from dropping previously warmed rift geometry only to upload new buffers on the next full opening.

## Mandatory visual refinement

Actual browser review covered close, medium and maximum distances, normal camera, side/angled/low views, all quality presets, stage freezes and playback. Changes made after the first review:

1. Darkened bright tunnel walls and strengthened subtle internal currents, preserving a dark cosmic opening rather than glowing purple facets.
2. Reduced excessive serration in the major outline while retaining asymmetric tears and depth offsets.
3. Reduced most dust brightness/size and separated dim micro-shards from stronger major-shard rims so the boundary remains the focal structure.
4. Widened thin spatial strand geometry and softened its sharp core to reduce dotted aliasing; added derivative smoothing to shard rims.
5. Added the curved distortion corona and retained a visible contracting central repair seam.
6. Lowered the implosion focus from the upper rift toward the water, making the short singularity visible from close/medium gameplay views.
7. Retained seeded geometry buffers between same-quality casts, reducing uploads and stabilizing interrupted-cast resource counts.

An initial shader reserved identifier was corrected during development. Fresh final console checks and measured test results are recorded below.

## Technical limits

The apparent portal depth is procedural and bounded by real recessed geometry; no alternate rendered world exists. Optical distortion/reflection/depression are convincing local approximations, not scene-color refraction, planar reflection or a fluid simulation. The enormous top tip can leave the viewport at close range; the camera stays under player control. Metrics count active draw ranges/instances, not individual visible GPU fragments. No GPU timer query or hardware-specific FPS guarantee is provided.

## Final build and browser results

`npm install` succeeds. `npm run build` succeeds with strict TypeScript and the existing nonfatal engine chunk-size advisory. **33 unit tests pass**, including six new void tests: geometry-buffer reuse/ownership; X/6 registration and shared cooldown; safe target/range; authored phases; finite deterministic geometry/configuration bounds; fixed world orientation, live quality, lifecycle and active disposal.

The final Phase 07 browser acceptance suite passes with **no error/warning console entries**. It verifies actual X/6 keyboard selection, click casting, cooldown HUD, Rocketbox Idle/Walk/Run, camera-relative movement/aiming, all five old spells, exactly six equipped slots, debug, charge, 3D fractures, recessed opening, stable phase, compression/singularity, water shockwave and repair. Quality tests cover LOW→MAX during opening, MAX→MEDIUM while stable, MAX→LOW during collapse and MEDIUM→MAX during aftermath without restarting time.

Stress tests pass: **20 WORLDREND casts** (counter comparisons at 10 and 20), **20 and 40 alternating casts across all six abilities**, **100 rapid cooldown rejections**, effect completion during movement/quality changes, camera movement, and disposal while open after moving player/camera. [Raw browser evidence](phase7-browser-report.txt) records all checks and counters.

Every existing suite was rerun and passed with clean error/warning consoles: [foundation](phase7-regression-foundation.txt), [human/ice](phase7-regression-ice.txt), [wind](phase7-regression-wind.txt), [lightning](phase7-regression-lightning.txt), [MEGIDDO](phase7-regression-holy.txt), [Abyssal Flame](phase7-regression-fire.txt). These regression suites were started after the dedicated WORLDREND profiles; their performance is not used in the table below. Native X selection and canvas click were also verified in the normal application entry point, including hand charge and the twelve-second cooldown display.

| Real-time full-cast peak | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Draw calls, including world/postprocessing | 17 | 35 | 35 |
| Triangles | 23,214 | 50,793 | 87,829 |
| Spell points | 150 | 480 | 1100 |
| Spell instances | 106 | 262 | 540 |
| Full-cast median / p95 interval | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 6.1 / 6.2 ms |
| Stable-phase median / p95 | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 6.1 / 6.2 ms |
| Implosion median / p95 | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 6.1 / 6.2 ms |
| Approximate observed FPS | 164 | 164 | 164 |

Each profile is an 11.5-second real-time cast, measured using requestAnimationFrame intervals in the connected browser at **1280×720**. Stable intervals use the 3–5.5 s window and implosion uses 7.25–8.2 s. No GPU timing, byte-level GPU memory, material count, event-listener count or 1080p/1440p hardware benchmark is claimed. Points exclude ambient dust; the MAX HUD adds 650 environmental points. Haze and shards contribute to instances. Geometry/texture/program counts are actual renderer diagnostics.

| Warmed MEDIUM baseline | Before stress | After stress/profiles |
| --- | --- | --- |
| Scene children | 12 | 12 |
| Attached lights | 0 | 0 |
| Quality subscriptions | 5 | 5 |
| Active effects | 0 | 0 |
| Geometries | 134 | 134 |
| Textures | 20 | 20 |
| Shader programs | 143 | 143 |
| Draw calls | 25 | 25 |

This deliberately warmed test cache includes both resource bundles and standard material light-count variants from 0–24 PointLights. It is broader than the usual empty production game's first-use cache. Cached buffers/programs are bounded reuse, not active rendering work. Counts remain stable through repeated casts. Complete Game/resource disposal returns renderer memory to **zero geometries, zero textures and zero quality subscriptions**.

The final review found no important transparency or player-occlusion errors. [Final preview](phase7-preview.png) shows the refined effect from the normal gameplay camera. The playable browser is left on WORLDREND with MAX quality; no seventh spell is added.
