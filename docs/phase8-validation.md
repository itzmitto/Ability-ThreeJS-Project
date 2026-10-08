# Phase 08 — TEMPEST CATACLYSM: Storm Dragon Ascension

Implemented and reviewed in the existing sandbox. Exactly seven real abilities are equipped: Q Glacial Eruption, E Tempest Break, R Heaven's Verdict, F MEGIDDO, V ABYSSAL FLAME, X WORLDREND, C TEMPEST CATACLYSM. This adds one temporary dragon manifestation, with no AI, enemies, health or damage systems. No external dragon asset, runtime download, new dependency or renderer pass was introduced. The original procedural anatomy and shaders are repository-native.

## Controls and sequence

**C / 7 selects; left click casts; cooldown 25 seconds; maximum ground range 70 metres; total lifetime 18 seconds; impact influence 30 metres.** WASD, Shift sprint, mouse orbit/aim, Q/E/R/F/V/X, F3 debug, P telemetry and the graphics menu are preserved. Finite ground targets use the existing targeting system, clamp horizontally from the player and are captured at cast time. Invalid sky/nonfinite targets reject without cooldown. The player can move and aim throughout the manifestation.

| Time | Authored event |
| --- | --- |
| 0–0.7 s | Hand/body channel, ground sigil and pressure spiral |
| 1–2.8 s | Clouds rotate and gather at different heights |
| 2.2–3.8 s | Dragon silhouette emerges |
| 3.4–5 s | Ascent into the storm |
| 4.5–6.2 s | Curved flight and banking |
| 5.7–7.5 s | Hover and coordinated wing pressure strokes |
| 7–9 s | Jaw opens; throat, mouth rings and converging electricity charge |
| 8.8–10.3 s | Mouth-attached breath grows toward the target |
| 9.2–11.7 s | Hollow impact dome, water eruption and distinct shock crests |
| 10.65–12.9 s | Staggered secondary thunderfall |
| 12–14.3 s | Storm intensifies; final surge at 12.65 s |
| 13.5–15.8 s | Different body materials dissolve with spatial noise |
| 15–18 s | Rain, low mist, electricity and water settle independently |

Absolute elapsed time drives the sequence. There are no independent animation callbacks or timers per visual layer. Target/root placement is fixed; live player attachments are used for the early channel. Camera impulses are short and restrained, using the existing feedback API. The camera is never locked or forcibly repositioned.

## Geometry and animation

The dragon is approximately 35 m long, with a roughly 35 m wingspan and a segmented tail around 16 m long. A broad chest and tapered waist use custom elliptical lofts. The neck deforms continuously through a fixed vertex buffer, preserving its connection to the torso. The angular skull has a projected snout, brow ridges, two swept curved horns, cheek spines and small violet eyes. A separate jaw hinges during charge; the mouth attachment remains valid as the head and neck move.

Four limbs have upper/lower joints, tapered anatomy and three curved claws per foot. Each wing has shoulder, elbow and wrist joints, five curved finger supports, scalloped membrane panels and an inner web continuing toward the shoulder/flank. Weighted power strokes, slower recovery, joint phase delays and bank asymmetry avoid rigid synchronized flapping. A twelve-joint overlapping tapered tail bends with delayed responses. Dorsal spines and quality-aware instanced scales add detail. Static anatomy parts sharing materials are batched without removing articulated joints. Geometry topology, finite normals/indices and attachment transforms are tested.

The flight controller follows a fixed authored 3D path, banks into a quarter-profile hover and counter-turns the head. The hover was lowered for ordinary gameplay framing; the dragon remains farther beyond close targets to preserve its silhouette. Directly beneath a creature this large, the ordinary third-person camera cannot frame the entire wingspan at once. The camera remains controllable.

Analytic GLSL materials supply charcoal/navy body surfaces, procedural veins, cold rims, horn and membrane differentiation, small eyes and spatial dissolution. They are not imported photorealistic textures or a physically complete PBR skin shader. Wing membranes and horns use different dissolution thresholds; eyes retain a late glow. No decorative whole-body glow replaces the anatomy.

## Atmosphere, channel, electricity and breath

Clouds use one instanced batch of soft noise billboards distributed through multiple height bands, sizes and angular speeds. They gather inward and receive scripted local flash brightness. Rain uses a fixed GPU buffer, falling with wind tilt and intermittent glints. A separate ground-mist batch expands after impact and survives into the aftermath. These are layered volumetric-looking approximations, not raymarched volumes.

The player channel follows the existing Rocketbox right-hand/chest attachments, with compact arcs, a broken floor sigil and a body-height pressure helix. Local temporary PointLights illuminate ordinary scene materials. The dragon's custom materials, clouds and overlays use authored shader illumination; the dark water's reflections remain analytic. Body pressure ribbons and timed wingbeat ripples give the strokes environmental consequences.

`StormElectricArcs` reuses the existing lightning path/ribbon renderer. Branches attach to real parent path vertices. Separate bounded renderers handle short body arcs, wing/horn convergence into the mouth, breath branches, cloud flashes and secondary strikes. Body arcs flicker locally rather than drawing continuous neon wires over the silhouette. Five, ten or eighteen thunderfall events follow an authored stagger; surface electrical veins diminish during the aftermath.

The moving mouth drives the charge nucleus, throat brightness and three rotating compression rings. Breath begins at 8.8 s and physically reveals along its length toward the fixed ground target. Custom radial parametric geometry, rather than a CylinderGeometry, has a turbulent varying cross-section. Its six coordinated layers are: narrow cyan-white core, blue/violet channel, helical flowing ribbons, attached branching discharge, directional GPU particles, and a wider pressure shell with quality-aware chromatic/noise perturbation. The last layer approximates atmospheric distortion; it does not sample or refract rendered scene color.

Impact produces a hollow expanding hemispherical shell, procedural water plumes, ballistic spray, outward mist and a flash. Two/three/five short-lived tornadoes use GPU spiral ribbons with different height, spin, lean and taper, supported by rotating particles and low mist. They grow after impact and collapse before the final atmospheric fade. The final surge combines renewed electrical intensity, cloud illumination and a separate outward water pulse.

## Water integration

The existing `DarkWater` implementation is unchanged. A temporary 100 m local overlay uses actual vertex crest displacement, distinct shader ring identities, electrical veins and authored reflection streaks. Its fast leading crest, broad slower swell, electrical ring, residual wave and final-surge wave have different speeds and fade schedules. Wingbeats add smaller timed pressure disturbances. This is visual interaction over the gameplay plane, not a fluid solver, collision response or true planar reflection.

## Quality budgets

The existing central `effectParticleBudget` selects one shared spell implementation's tier. Live changes update instance counts, buffer draw ranges, geometry selection, shaders and lights without restarting elapsed time. All presets retain the dragon's head, four limbs, wings, jaw and tail.

| Setting | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Clouds | 24 | 48 | 80 |
| Ground-mist instances | 8 | 20 | 36 |
| Rain | 120 | 420 | 900 |
| Other GPU particles | 600 | 1600 | 3200 |
| Total spell particle budget | 720 | 2020 | 4100 |
| Scale instances | 72 | 180 | 360 |
| Total peak reported instances | 104 | 248 | 476 |
| Body arcs | 6 | 16 | 32 |
| Thunderfall events | 5 | 10 | 18 |
| Tornadoes | 2 | 3 | 5 |
| Breath helices | 2 | 4 | 7 |
| Temporary lights | 1 | 2 | 3 |
| Overlay subdivisions | 32² | 64² | 96² |
| Pressure distortion approximation | Disabled | Restrained | Enhanced |

Reported spell particles exclude existing ambient dust (100/300/650). Particle fields have different motion: atmospheric dust, rising/ballistic water, vortex rotation, beam flow, body dissolution and low electrical residue. GPU buffers are fixed and reused, with no per-frame particle-object allocation. The existing pixel-ratio caps, bloom and shadow presets remain authoritative.

## Complete dedicated module inventory — 36 files

All paths below are within `src/abilities/stormDragon/`.

| File | Responsibility |
| --- | --- |
| TempestCataclysm.ts | Ability metadata, cast validation, one-bundle acquisition |
| TempestCataclysmEffect.ts | Managed lifecycle, stage coordination, live quality and feedback |
| StormDragonConfig.ts | Shared cooldown/range/lifetime and authored constants |
| StormDragonQuality.ts | Mapping from central budgets to visual tiers |
| StormDragonTimeline.ts | Absolute-time envelopes and stage state |
| resolveStormTarget.ts | Finite ground validation, snapshot and range clamp |
| StormResourcePool.ts | Bounded reusable bundle and complete resource ownership |
| StormShaderLibrary.ts | Shared procedural shader functions |
| StormDragon.ts | Anatomy composition, pose and mouth/anchor access |
| DragonGeometry.ts | Custom lofts, sweeps, claws and membrane geometry |
| DragonHead.ts | Skull, curved horns, eyes, jaw, throat and mouth anchor |
| DragonWings.ts | Articulated wing bones, fingers and membrane panels |
| DragonTail.ts | Overlapping tapering tail joints and fins |
| DragonLimbs.ts | Four articulated clawed limbs |
| DragonNeck.ts | Continuous bending neck buffer |
| DragonAnimationController.ts | Flight path, banking, hover and coordinated poses |
| DragonMaterials.ts | Body/wing/horn/eye shading and dissolution |
| DragonMeshBatch.ts | Static material-compatible anatomy batching |
| StormDragonAura.ts | Local flowing body pressure ribbons |
| PlayerStormChannel.ts | Live hand/chest channel, sigil and player pressure spiral |
| StormCloudField.ts | Layered moving cloud instances and local flashes |
| StormRain.ts | GPU falling rain and wind tilt |
| StormParticleSystem.ts | Six fixed GPU particle motion fields |
| StormMistField.ts | Separate ground-hugging impact/aftermath mist |
| StormWindField.ts | Curved atmospheric wind ribbons |
| StormWaterInteraction.ts | Temporary displaced water overlay and distinct waves |
| StormElectricArcs.ts | Bounded connected branching lightning batches |
| DragonLightning.ts | Anatomy-attached body electricity |
| DragonBreathDischarge.ts | Mouth convergence and branching breath electricity |
| ThunderfallSequence.ts | Staggered sky strikes, cloud forks and late surface veins |
| DragonBreathMaterials.ts | Core/channel/pressure/helical shader layers |
| DragonBreathCharge.ts | Mouth nucleus, throat and rotating charge rings |
| DragonBreathBeam.ts | Mouth-attached turbulent parametric breath mesh |
| StormImpact.ts | Hollow shock dome and water plumes |
| StormTornadoField.ts | Quality-aware distinct tapered vortex ribbons |
| StormLighting.ts | Bounded local lights, intensity curves and detachment |

Existing production files modified for Phase 08: `src/game/Game.ts` (registration/slot assignment), `src/abilities/AbilitySlot.ts` (C seventh binding), `src/ui/AbilityBar.ts` (original inline dragon SVG), `src/ui/HUD.ts` (controls/phase caption), and `README.md`. No previous spell implementation is rewritten. Earlier phases already had uncommitted repository changes, which were preserved.

New verification files: `tests/stormDragon.spec.ts`, `tests/phase8-browser.ts`, `tests/phase8-review.ts`, `phase8-smoke.html`, `phase8-review.html`, this document and Phase 08 evidence under `docs/`. Historical browser harness equipped-count assertions were extended for the seventh slot in phases 4–7; `tests/browser-smoke.ts` tests safe empty casting by temporarily clearing/restoring the selected slot instead of assuming an empty equipped slot. Historical phase 4–7 pages were not all rerun during this phase; the Phase 08 harness renders and casts each existing spell directly.

## Resource ownership and cleanup

The ability owns one cached resource bundle. The managed effect temporarily borrows it and owns its scene root and quality subscription. Normal cooldown exceeds effect lifetime; raw extra acquisitions reject while occupied. Animation uses fixed buffers, uniforms and reused vector/quaternion scratch values. The three overlay geometry tiers are cached and selected live. Lightning capacities, particle buffers, instance buffers and draw ranges are bounded. Materials/geometry are retained between casts, avoiding per-cast shader/geometry churn; they are destroyed on ability/game disposal.

Expiry detaches all spell objects and lights, resets pooled visual state and unsubscribes exactly once. `Game.dispose()` disposes active effects before cached abilities. There is no separate RAF loop, persistent event callback or global renderer setting introduced by the spell. The neck recomputes normals on a small fixed mesh; Three.js may allocate internal temporaries there, so this is not a claim of literally zero allocation throughout the engine.

## Actual verification results

- `npm install`: succeeded; no new runtime dependency.
- `npm run build`: succeeded, strict TypeScript clean. Vite retains its nonfatal engine-chunk size advisory.
- `npm test`: **39 passed**, including six new geometry/animation/target/quality/lifecycle tests. No test-only ability enters the app.
- Fresh final Phase 08 browser console: **no errors or warnings**.
- [Full browser report](phase8-browser-report.txt): every printed Phase 08 assertion passed.
- [Foundation regression](phase8-regression-foundation.txt): every assertion passed, including movement, mouse aim, camera follow/clamp, all seven selection keys, empty cast, real quality effects, P/F3 and disposal.
- Local Rocketbox load and Idle/Walk/Run passed; all six previous spells selected, cast and rendered their layers in the Phase 08 harness.
- Live LOW/MEDIUM/MAX switching during emergence, charge and active breath retained elapsed time, finite geometry and normalized mouth direction. The real graphics menu remains functional.
- **20 isolated dragon casts**, **20 alternating all-seven casts**, **40 alternating all-seven casts**, **100 cooldown-rejected requests**, movement/camera changes during casts and final expiry passed.
- Full disposal was explicitly invoked during an active dragon breath, not just after expiry.

The settled MEDIUM baseline and final counters were exactly equal: scene children **12**, traversed objects **103**, temporary lights **0**, graphics subscribers **5**, active effects **0**, renderer geometries **206**, textures **20**, programs **174**, draw calls **25**. These include bounded caches for all seven abilities and postprocessing. Full game disposal left **0 geometries**, **0 textures** and **0 subscriptions**. Counters are not byte-level GPU memory measurements.

Warm-up renders all spells/qualities and both complete and overlapping cast patterns before comparison. An initial long-only warm-up showed a two-geometry decrease when switching to the short overlapping pattern; counters then settled. This was a decrease rather than unbounded growth, but the final strict test still required exact equality after representative warm-up. It passed at 10/20 isolated and 20/40 alternating boundaries. No unsupported diagnosis of which cached geometry caused the initial difference is relied on.

## Measured real-time profiles

Actual browser viewport **1280×720**, device DPR **1**, one full 18-second real-time cast per preset after warm-up. An attempted 1920×1080 browser override did not change the actual viewport; no 1080p/1440p performance claim is made. Renderer counters include the existing world, character, shadows and postprocessing. Particle/instance peaks here describe the spell's reported budget.

| Preset | Peak draw calls | Peak triangles | Spell particles | Instances |
| --- | --- | --- | --- | --- |
| LOW | 80 | 51,026 | 720 | 104 |
| MEDIUM | 98 | 94,521 | 2,020 | 248 |
| MAX | 98 | 149,373 | 4,100 | 476 |

| Stage | LOW median / p95 ms | MEDIUM median / p95 ms | MAX median / p95 ms |
| --- | --- | --- | --- |
| Gathering | 6.1 / 6.1 | 6.1 / 6.2 | 6.1 / 6.2 |
| Emergence | 6.1 / 6.2 | 6.1 / 6.2 | 6.1 / 6.2 |
| Flight | 6.1 / 6.2 | 6.1 / 6.1 | 6.1 / 6.2 |
| Charge | 6.1 / 6.1 | 6.1 / 6.2 | 6.1 / 6.1 |
| Breath | 6.1 / 6.2 | 6.1 / 6.2 | 6.1 / 6.1 |
| Cataclysm | 6.1 / 6.1 | 6.1 / 6.2 | 6.1 / 6.2 |
| Aftermath | 6.1 / 6.2 | 6.1 / 6.2 | 6.1 / 6.2 |

These are browser RAF frame intervals (roughly 164 FPS median), **not GPU timer results or a guarantee for other hardware/resolutions**. Raw stage sample counts and final resources are in the browser report. No exact GPU memory bytes or cold-start compile-latency benchmark was collected. Existing light-count shader variants were warmed before stress comparison.

## Two actual visual refinement passes

First review found the dragon too high for normal gameplay framing, noisy scale/rim highlights, distracting long body arcs and pressure ribbons, narrow wing presentation and excessive individual anatomy draws. Refinement lowered the hover/flight framing, softened wingstroke pose, reduced high-frequency surface detail, dimmed/clamped particles and wind, shortened/flickered body electricity, and batched static anatomy. The initial showcase draw count dropped from about 124 to 79 before subsequent meaningful visual layers were added. The anatomy was inspected in isolation, with no particles or charge glow hiding its shape.

Second review refined the continuous neck deformation, added the inner wing web toward the flank, darkened the body to charcoal/navy, reduced mouth/core white wash and provided actual horn/wing-to-mouth convergence. The six breath layers, ground mist, water crests and final surge were inspected from ordinary, side and angled cameras. LOW/MEDIUM water tessellation and ribbon draw ranges were reduced for real preset cost differences. Close (5 m), medium (25/45 m), maximum (70 m), charge, breath, impact, thunderfall, dissolution and 16–17.8 s aftermath views were captured. The test browser also ran full real-time sequences in all presets. At very close range the brief impact peak can fill much of the frame; it does not lock the camera or persist through the whole spell.

Evidence: [finished gameplay preview](phase8-preview.png), [isolated anatomy](phase8-anatomy.png), [side breath](phase8-side.png), [maximum range](phase8-max-range.png), [close impact](phase8-close.png), [thunderfall](phase8-thunderfall.png), [final surge](phase8-surge.png), [directly underneath](phase8-under-dragon.png), [dissolution](phase8-dissolve.png), [aftermath](phase8-aftermath.png), [final fade](phase8-fade.png), and the same breath stage at [LOW](phase8-low.png), [MEDIUM](phase8-medium.png) and [MAX](phase8-max.png). Earlier stage captures preserve the actual intermediate review; the finished preview and later aftermath captures show the final implementation. Native C selection and left-click casting were additionally verified in the normal index page, with a visible cooldown and no console errors.

## Remaining technical limitations

This is an original procedural VFX dragon, not a film-quality sculpted/retopologized asset. Cloud/mist depth, atmospheric distortion, material illumination and water reflections use controlled shader approximations. There is no true volumetric raymarching, scene-color refraction, fluid simulation or audio system. The spell deliberately does not force a cinematic camera; the entire huge creature may leave the frame at close/underneath angles. Only the actual 1280×720 test viewport was performance-profiled. Cold-cache stalls, dedicated GPU timings, byte-level memory and broad hardware coverage remain unmeasured. There are no enemies, damage systems or additional new spells.
