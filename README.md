# Elemental Sandbox — Phase 10

A browser-based Three.js sandbox: a dark water arena, an animated human male in everyday clothes, **Glacial Eruption** on Q, **Tempest Break** on E, **Heaven's Verdict** on R, **MEGIDDO** on F, **ABYSSAL FLAME** on V, **WORLDREND — Sovereign Void** on X **TEMPEST CATACLYSM — Storm Dragon Ascension** on C and **SANGUINE ECLIPSE — Crimson Dominion** on B and **SPECTRAL BREAK — Prismatic Annihilation** on N. The existing architecture, world, controls, character and HUD remain in place. There are no enemies, health/damage systems, NPCs, inventory or quests. All runtime assets are local.

## Phase 10: SPECTRAL BREAK — Prismatic Annihilation

Select **N / 9** and left-click once. **Cooldown: 10 s. Maximum range: 85 m from the casting origin. Lifetime: 9 s.** The charge follows the animated Rocketbox right hand; release freezes the origin and the captured forward direction. Ground and valid sky/ray aim work. Movement, camera control and live quality switching continue during the sequence.

A white-cyan nucleus compresses before a brief release flash. The beam progressively extends through the world: a three-dimensional deformed core, cyan body, saturated blue shell, violet/magenta currents, instanced torn dark fractures, axial light packets, long ribbons and incomplete traveling pressure arcs. An irregular open curved shockfront reaches the endpoint, followed by a layered prismatic impact, narrowing/shredding collapse, spray, residual ribbons and local haze. Original procedural GLSL and geometry provide the structure; existing bloom/exposure are preserved.

Real temporary lights illuminate the player and water. The Phase 9 planar reflector sees actual spell geometry; an owned directional pressure channel and impact crests add broken highlights and bounded shared ripple sources. Expiry removes only this spell's disturbances. One pooled visual bundle retains bounded GPU resources until game disposal.

LOW/MEDIUM/MAX use **3/5/7 beam layers**, **3/7/12 long ribbons**, **240/720/1600 GPU particles**, **6/14/24 haze instances** and **1/2/3 temporary lights**. Nine HUD cards retain their desktop size and wrap at narrower widths. No new runtime asset or dependency was added; all eight earlier spells remain intact.

The attachment contained only the written specification: **no reference video was accessible**. Browser review and two actual visual refinement passes were performed. `tsc --noEmit`, production build and **56 tests** pass. [Phase 10 architecture, full file inventory, quality, validation and limitations](docs/phase10-validation.md) and [browser report](docs/phase10-browser-report.txt) contain detailed evidence. `/phase10-review.html` offers stage/range/angle/playback controls; `/phase10-smoke.html` runs browser acceptance, stress and realtime profiling. These pages are development-only.

## Phase 09: realistic dark water and SANGUINE ECLIPSE — Crimson Dominion

The persistent water now has multi-scale animated waves, fine filtered normal detail, rough Fresnel reflections, real clipped planar scene reflections on MEDIUM/MAX, and light response shared by all eight abilities. Alternating animated shoe contacts create bounded ripples and tiny droplets while walking or sprinting. Logical movement and ground targeting stay at `y=0`; the visual ocean remains dark and shallow.

Select **B / 8**, aim at water and left-click. **Cooldown: 14 s. Maximum range: 60 m. Lifetime: 16 s.** An animated-hand liquid charge precedes ascending streams and an irregular glossy crimson Eclipse suspended above the target. Rounded liquid weapons form, accelerate through a staggered barrage and create individual splashes. Compression leads into a much larger execution lance, curved splash membranes, droplets, a hollow pressure front, temporary lighting and a 22 m tidal crest. Hanging threads drain and break; residue and low mist outlast the main formation. Invalid targets reject safely; quality changes preserve the timeline.

LOW/MEDIUM/MAX use **6/10/18 streams**, **8/16/28 lances**, **240/720/1800 GPU droplets**, **8/20/36 mist instances**, and **1/2/3 temporary lights**. The central graphics budget controls geometry detail, active instances and shader complexity. Two cached visual bundles support normal cooldown overlap; each effect releases its scene root, lights, subscription and only its owned water disturbances. Complete game disposal destroys the pooled GPU resources.

Nine focused water modules are in `src/world/water/`; 28 spell modules are in `src/abilities/blood/`. No prior spell source was rewritten, and no new runtime dependency or asset was added. [Phase 09 architecture, full module inventory, visual refinements and validation](docs/phase9-validation.md) documents implementation and limitations. `/phase9-review.html`, `/phase9-smoke.html` and `/water-review.html` are development-only inspection and validation pages.

## Phase 08: TEMPEST CATACLYSM — Storm Dragon Ascension

Select **C / 7**, aim at the water and left-click. **Cooldown: 25 s. Maximum range: 70 m. Lifetime: 18 s. Impact influence: 30 m.** Existing ground targeting validates and clamps the destination. Invalid sky/nonfinite hits reject without consuming cooldown. This is one temporary manifestation, with no AI or persistent creature. The six previous spell implementations are preserved.

An original procedural dragon, approximately 35 m long with a 35 m wingspan, emerges from localized layered storm clouds. A continuous torso/neck, angular horned skull, hinged jaw, four jointed clawed limbs, articulated membrane wings, overlapping tail segments, spines and instanced scales provide a readable silhouette without particles. Authored flight banks into a hover; coordinated shoulder/elbow/wrist strokes, neck bending and delayed tail movement give it weight. Body shader veins, small attached electrical arcs and pressure ribbons complement the anatomy.

The animated player hand channels electricity and a rotating sigil. Clouds gather before emergence, wingbeats disturb the water, and mouth rings gather a compact charge. A six-layer turbulent breath grows from the moving mouth toward the fixed target: core, channel, helical flow, branching discharge, directional particles and a quality-aware pressure/distortion approximation. Impact creates a hollow shock dome, water plumes, distinct expanding crests, low mist, tornadoes and staggered thunderfall. A final storm surge precedes noise-based dragon dissolution; rain, mist, electrical residue and settling water outlast the body.

| Layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Cloud / ground-mist instances | 24 / 8 | 48 / 20 | 80 / 36 |
| Rain / other GPU particles | 120 / 600 | 420 / 1600 | 900 / 3200 |
| Scales / body arcs | 72 / 6 | 180 / 16 | 360 / 32 |
| Thunderfall / tornadoes | 5 / 2 | 10 / 3 | 18 / 5 |
| Breath helices / temporary lights | 2 / 1 | 4 / 2 | 7 / 3 |
| Water-overlay subdivisions | 32² | 64² | 96² |
| Optical pressure approximation | Off | Subtle | Enhanced |

Counts derive from the existing central graphics budget. Live switching changes buffers, draw ranges, overlay geometry, lighting and shader detail without restarting the sequence. A bounded one-bundle pool retains resources; expiry detaches roots/lights and unsubscribes, while game disposal destroys the cache. Normal cooldown exceeds lifetime. Temporary overlays supply local displacement and authored reflections without replacing the water or introducing fluid simulation/screen-space refraction.

**36 dedicated modules** live in `src/abilities/stormDragon/`. Registration is in `Game.ts`; slot metadata and the existing HUD provide integration. `npm test` passes **39 tests**, and `npm run build` passes. `/phase8-smoke.html` exercises all seven abilities, 20 isolated ultimate casts, 20/40 alternating casts, 100 cooldown rejections, live quality, real-time profiles and disposal during active breath. `/phase8-review.html` provides stages, ranges, camera angles, isolated anatomy and playback. Both are development-only. [Phase 08 validation and complete module inventory](docs/phase8-validation.md) records measured counters, visual refinements and limitations. [Browser test report](docs/phase8-browser-report.txt) contains raw results.

## Phase 07: WORLDREND — Sovereign Void

Select **X / 6**, aim at the water and left-click. **Cooldown: 12 s. Maximum range: 55 m. Lifetime: 11 s.** Finite ground hits use the existing targeting system and clamp from the player. Sky/nonfinite hits reject without consuming cooldown. Five previous spell implementations remain unchanged; no new dependencies, assets, Blender pipeline or renderer passes are added.

The animated right hand channels a compact violet fracture. Small 3D seams gather above the ground before a giant irregular tear stretches vertically and pulls apart. Its nominal dimensions are 18 m tall, roughly 8 m wide and up to 8.8 m physically recessed. The opening faces the camera at creation and remains fixed in world space. Curved tunnel walls, a recessed back surface, depth-offset shards, sharp boundary ribbons and a local distortion corona give it actual depth. Independent view-dependent procedural layers create drifting cosmic clouds, curved currents and sparse distant stars.

| Stage | Time |
| --- | --- |
| Animated hand channel / unstable target | 0–1 s |
| Small spatial fractures | 0.7–1.4 s |
| Vertical seam stretches and jagged boundaries separate | 1.2–2.7 s |
| Open Sovereign Void, hovering shards, energy surges | 2.7–5.5 s |
| Accelerating gravitational collapse | 5.5–7.4 s |
| Concentrated singularity / implosion | 7.0–7.95 s |
| Broken geometric shock front, outward water displacement | From 7.55 s |
| Independently sealing cracks and contracting central seam | 8–10.3 s |
| Indigo dust and settling water fade | Until 11 s |

The compression focus descends toward the water during collapse, keeping the climax visible at ordinary casting distances. Actual geometry narrows and contracts; it is not just an opacity fade. Angular prisms hover and spin before being pulled inward; tiny fragments and dust are expelled after implosion. Water overlays add a dark convergence field, inward/outward broken rings, moving violet reflection streaks, a segmented 18 m shock front and a slower aftershock. All are temporary; the water engine is preserved. Local atmospheric veils and the edge corona approximate optical distortion without sampling scene color.

| WORLDREND detail | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Outline levels | 18 | 28 | 40 |
| Physical/procedural depth layers | 3 | 5 | 8 |
| Major 3D shards | 14 | 34 | 64 |
| Micro fragments | 80 | 200 | 420 |
| GPU dust/motes | 150 | 480 | 1100 |
| Fracture/filament strips | 6 | 14 | 28 |
| Haze instances | 6 | 14 | 28 |
| Temporary lights | 1 | 2 | 2 |
| Distortion corona | Off | Restrained | Enhanced |

The central graphics budget selects the shared detail tier. Live quality changes adjust geometry, depth shader loops, shards, particles, filaments, haze, lighting and water detail without restarting the effect. Geometry changes only at creation or quality changes; animation uses uniforms/GPU deformation. Fixed buffers and two cached bundles bound memory. Expiry removes roots/lights and subscriptions; full game disposal destroys cached resources.

New modules live in `src/abilities/void/`. Shared production changes remain `Game.ts` registration and the HUD caption. `npm test` passes **33 tests**. `/phase7-smoke.html` checks input, stages, live quality, 20 WORLDREND casts, 20/40 casts alternating all six abilities, cooldown rejection, resource stabilization, active disposal and real-time profiles. `/phase7-review.html` offers stages, close/medium/maximum range, genuine side views and playback. Both are development-only. [Phase 07 validation](docs/phase7-validation.md) contains the file inventory, visual refinement and measured results.

## Phase 06: ABYSSAL FLAME

Select **V / 5**, aim at the water and left-click. **Cooldown: 6 s. Maximum range: 42 m. Lifetime: 8.6 s.** Existing ground targeting validates and clamps the destination. Null/nonfinite hits reject without consuming cooldown. The four existing spell implementations are unchanged.

A small black/crimson charge follows the animated right hand. At 0.18 s an ignition trace captures its starting position and runs over the water; fissures and leaking smoke kindle at the destination. The central eruption starts at 0.62 s, with asymmetric secondary pillars staggered through 1.34 s. Curling ground pockets remain alive beneath the pillars. Noise-advection, moving flame tongues and pulsing fuel create continuous motion rather than a stationary cylinder.

Instanced curved subdivided strips render an opaque-looking charcoal body and a separate soft scarlet/violet rim. Small hot base pockets and four GPU point emitters provide burst embers, rising embers, drifting ash and late ground embers. Soft noisy smoke billboards provide eruption thrust, rolling plumes and low residual wisps. Temporary red lights illuminate real scene materials; separate view-aligned broken reflections, fissures, dark residue and boiling heat overlays integrate with the existing water.

Outer pockets lose fuel first from 4.5 s; the central flame begins later and survives until 7.7 s. Height shrinks, upper tongues break apart, small relapse pulses occur, and smoke grows as the field burns down. Lights detach at 7.75 s. Smoke, ash and faint hot residue outlast the flame until final cleanup at 8.6 s. MEDIUM/MAX use a local procedural heat-shimmer approximation; it does not sample/refract scene color or add a composer pass.

| Black fire layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Central / secondary pillars | 1 / 3 | 1 / 6 | 1 / 9 |
| Ground flame pockets | 10 | 22 | 38 |
| Curved layers per flame | 2 | 3 | 4 |
| Body + rim instances | 56 | 174 | 384 |
| Smoke billboards | 12 | 28 | 48 |
| Total ember/ash allocation | 150 | 400 | 900 |
| Peak visible emitter points | 127 | 340 | 765 |
| Temporary lights | 1 | 2 | 2 |
| Heat shimmer / water warping | Off | Subtle | Enhanced |

Counts derive from the existing central graphics budget. Live switches change active flame geometry, smoke, emitters, lighting and shimmer. Two pooled bundles retain bounded buffers/materials between casts; expiry removes roots/lights and unsubscribes, while game disposal releases GPU resources. The cooldown allows at most two normal overlapping fire casts.

The modules live in `src/abilities/fire/`. Shared production edits are only ability registration/slot assignment in `Game.ts` and the HUD phase caption. `npm test` passes **27 tests**. `/phase6-smoke.html` verifies real input, quality transitions, stages, 20 fire casts, 20/40 alternating casts of all five spells, 80 cooldown rejections and full disposal. `/phase6-review.html` supplies deterministic stages, ranges, angles and playback. These pages are development-only. [Phase 06 validation and file inventory](docs/phase6-validation.md) records visual refinements, browser evidence and measured performance.

## Phase 05: MEGIDDO

Select **F / 4**, aim at the dark water and left-click. **Cooldown: 8 s. Maximum range: 50 m. Lifetime: 6.8 s.** The existing ground target is validated and clamped from the player. Sky/nonfinite hits reject without consuming cooldown. No additional raycaster or renderer pipeline is added.

A geometric palm channel follows the animated right hand. A 6.6 m sacred ground sigil reveals concentric lines, intersecting hexagons, radial optical guides and glyph strokes. At 0.42–1.1 s rotating faceted prisms and thin lenses gather 23–25.8 m above the field. Lower optical echoes keep the convergence visible from the normal camera when the highest array lies outside the frame. Subtle blue-gold atmospheric shafts build anticipation.

The strongest center strike lands at **1.30 s**, followed by a side pair, a heavier rear accent and a rapid triple cadence. MAX adds asymmetric outer echoes. A thin center seal ends the score at **2.46 s**. Individual strikes last 0.19–0.34 s: anticipation, 22 ms descent, focused sustain, rapid fade and brief afterimage. Batched camera-facing strips carry a near-white core, champagne body, diffraction filaments, downward optical packets and soft halo.

Every strike creates a water flash, fast leading ripple, slower broad disturbance and broken view-aligned reflection. Temporary overlays preserve the water engine. Rising holy dust, ballistic pale motes, soft ground mist and drifting prismatic fragments use different motion. Real transient lights detach by 2.95 s. The sigil, optical echoes and motes fade until 6.8 s.

| MEGIDDO layer | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Strikes, including center/finisher | 5 | 8 | 12 |
| High prism/lens pairs | 5 | 8 | 12 |
| Lower optical echoes | 3 | 5 | 9 |
| GPU points, including mist | 150 | 400 | 900 |
| Soft mist points | 8 | 16 | 28 |
| Instanced prismatic fragments | 12 | 28 | 48 |
| Transient lights | 1 | 2 | 2 |
| Water optical warping | Off | Subtle | Enhanced |
| Mark/shaft detail | Essential lines / simpler haze | Glyphs / richer atmosphere | Full array / stronger optical layers |

Counts derive from the central graphics budget and update live. GLSL 3 emissive shaders support derivative antialiasing and avoid unnecessary light-count program variants. A bounded two-bundle pool retains buffers/materials between casts; the normal cooldown exceeds the effect lifetime. Expiry removes roots/lights and unsubscribes; game disposal destroys cached resources. Existing bloom remains authoritative.

The focused modules live in `src/abilities/light/`. Shared production changes are limited to `Game.ts` registration and the HUD phase caption. The three previous spells, player, renderer, camera, world, targeting and quality implementations are preserved.

`npm test` now passes **22 tests**. `/phase5-smoke.html` checks actual input/model/cooldown/quality behavior, **20 MEGIDDO casts**, **20 and 40 alternating casts of all four spells**, **80 rapid cooldown rejections**, and real-time LOW/MEDIUM/MAX profiles. `/phase5-review.html` provides deterministic stages, ranges, angles and playback. Both pages are development-only. [Phase 05 validation](docs/phase5-validation.md) contains the full file inventory, visual refinements, measured counters and performance limits.

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
| Q / E / R / F / V / X / C / B, or 1–8 | Q/1 Glacial Eruption; E/2 Tempest Break; R/3 Heaven's Verdict; F/4 MEGIDDO; V/5 Abyssal Flame; X/6 WORLDREND; C/7 TEMPEST CATACLYSM; B/8 SANGUINE ECLIPSE |
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
    DarkWater.ts                  Water facade and resource lifetime owner
    water/                        Waves, reflections, source-owned ripples and shoe spray
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
    AbilitySlot.ts                Eight equipped slot bindings
    blood/                        SANGUINE ECLIPSE liquid sequence and pooled resources
    stormDragon/                  TEMPEST CATACLYSM anatomy and storm sequence
    void/                         WORLDREND dimensional geometry and collapse
    fire/                         ABYSSAL FLAME and uneven after-burn
    light/                        MEGIDDO optical field and sequenced strikes
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

`AbilityCastContext` provides the player, scene, camera, right-hand origin, camera aim direction, player forward, camera forward, nullable ground target, target point, targeting system, simulation time, quality settings, effect manager optional bounded camera feedback callback and shared source-owned water disturbances. Cast vectors are snapshots. Targeting getters expose reusable live vectors; copy retained values. The shared targeting system supports 180 m world rays and nullable sky/out-of-range ground hits. Glacial Eruption applies its own shorter 32 m range to valid ground targets. No scene collision targets exist.

`EffectManager` owns effect updates, expiry and cleanup. Report visible counts through `ManagedEffect.particleCount` and `instanceCount`; `activeCount` supports lifecycle diagnostics. `ObjectPool<T>` remains opt-in. Glacial Eruption shares immutable crystal/plane geometry while owning per-cast materials and particle/instance buffers.

## Technical choices

- Water combines world-space shallow waves, procedural moving micro-normals, Schlick Fresnel (F0=0.02), rough glossy highlights, distance fog and actual scene-light response. MEDIUM/MAX add one bounded clipped planar reflection target (384²/768², updated every third/second frame). LOW uses analytical environment shading. Shoe contacts and new spell sources use a fixed, ownership-aware ripple buffer; tiny shoe spray uses one persistent GPU buffer.
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

The 50 Node tests use Playwright's runner **without launching/downloading a browser**. They cover movement at 30/60/144 FPS, diagonals, camera-relative direction, sprint, deceleration, turning, ray/range limits, nonfinite input rejection, empty casting, cooldowns, quality notifications, crystal topology, pooling, authored spell timing and effect cleanup. Test-only dummy abilities never enter the application.

With Vite running, open `/smoke.html` in a WebGL-capable browser. The development-only harness exercises the actual render loop with keyboard and mouse DOM events, camera following, all slots, safe empty casting, all rendering presets, HUD/debug toggles, targeting limits and disposal. It prints a visible pass/fail report after about 10 seconds. It is not part of the production entry point. Native pointer lock should also be checked interactively in a desktop browser; browser embedding may deny it, so dragging is supported as a fallback.

Phase 09 ends with exactly eight spells: Glacial Eruption on Q, Tempest Break on E, Heaven's Verdict on R, MEGIDDO on F, ABYSSAL FLAME on V, WORLDREND on X, TEMPEST CATACLYSM on C, and SANGUINE ECLIPSE on B.

