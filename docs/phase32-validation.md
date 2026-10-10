# Phase 32 — The Four Elements: Bending Arts

## Completed abilities

The actual registry now contains **36** abilities. All preceding 32 entries and shortcut assignments remain in their original order. These four original designs use the existing AbilityManager, EffectManager, Rocketbox rig, targeting, Spellbook, Favorites, Quick Wheel, renderer and ocean.

| # | ID | Name / subtitle | Element | Cooldown | Ground range | Default duration |
|---|---|---|---|---:|---:|---|
| 33 | `tidal-serpent` | TIDAL SERPENT / CURRENT LASH | WATER | 3s | 28m | about 2.3–3.0s |
| 34 | `titan-fist` | TITAN FIST / SEISMIC STRIKE | EARTH / STONE | 5s | 25m | about 2.6–3.4s |
| 35 | `skybreaker` | SKYBREAKER / VACUUM CRESCENT | AIR / WIND | 2.5s | 36m | about 2.0–2.7s |
| 36 | `dancing-inferno` | DANCING INFERNO / FLAME WEAVER | FIRE | 3.5s | 30m | about 2.8–3.6s |

Duration varies with aim distance; visual contact is tied to actual propagation/arrival, not an unrelated fixed explosion timer. Water/fire wavefront speed parameters are average propagation speeds with easing (32m/s), earth travels at approximately 25m/s, and the three air crescents travel at approximately 48m/s.

**Controls:** Tab → search “bending” or a spell name/subtitle/element → equip → left-click. Save favorites for the existing backquote Quick Wheel. No new numeric shortcuts. WASD, Shift sprint, mouse camera/aiming, F3 and telemetry controls are unchanged. Cards never cast. The existing project has no damage/combat system; no new combat manager, enemies, damage numbers or health systems were added.

## Waterbending

Two closed, elliptical swept liquid volumes rise from sampled ocean height and spiral near the real left/right hands. After a 0.48s gather, their tips advance along separate crossing curves. Radius varies along the curve and in time, with tapering, liquid bulges and organic bends. Arrival triggers spray and two owned ripples; the volumes sag below the water and fade, while ballistic droplets fall back.

`SweptVolume` creates reusable indexed topology and fixed typed arrays. Each update changes the bounded vertex/normal buffers, not the geometry object. Central differences establish a curve frame; ellipse normals include the longitudinal radius gradient. Caps close the volume, winding is outward, and bounds update with the shape. LOW/MEDIUM/MAX use 36×8 / 56×10 / 80×12 curve/section intervals. Two MAX liquid volumes total 3,888 triangles.

MeshPhysicalMaterial supplies specular/clearcoat response. Shader injection adds local moving simplex ripples, fine surface sheen, normal perturbation, dark internal color variation, restrained Fresnel brightness and view-dependent transparency. No scrolling texture or emissive blue cable substitutes for the liquid surface. Droplets use a dedicated GPU ballistic shader; flight droplets are restricted to the actual advancing front.

A two-arm circular pose uses the current upper-body arm solver. The initial browser review exposed inward winding and oversized soft droplets. Outward winding, reduced droplet size and richer liquid surface contrast were verified in the rendered game. See `water-side.png`.

## Earthbending

The fist contains **18 structural rock plates**: a palm, four large knuckles, eight folded finger plates, a two-part thumb and three wrist stones. Three deterministic beveled-rock geometry variants have closed caps, irregular corner planes and independent triangle normals. Each variant has 48 triangles. The solid fist uses three InstancedMeshes, rather than one rounded primitive or many per-piece materials.

Stone plates begin near sampled water height, orbit and converge into the fist during a 0.58s charge. A forward punch drives the recognizable fist toward the captured target; it banks only slightly and tips downward just before contact. At impact, the assembled fist disappears into three bounded instanced debris batches. Shards tumble with drag/gravity, fall below the water and fade. Dust/grit and separate pale droplets have element-specific GPU trajectories.

MeshStandardMaterial uses high roughness, local simplex grain, ridged cavity variation, sparse subdued mineral fissures and sharp physical facet lighting. The visual pass darkened its basalt palette and improved the water-to-hand assembly and downward strike. A stronger owned radial wave plus a secondary ripple and existing spray make the heavy contact distinct from water and fire. See `earth-side.png`.

## Airbending

Three genuine closed crescent volumes release at 0.24 / 0.38 / 0.52 seconds. They use the existing original knife-section BufferGeometry generator with clean pressure proportions, tiny silhouette perturbation and a narrow separate pressure edge. No torus, sprite or beam is the main weapon. Cached tiers have 16 / 28 / 40 centerline intervals; the shape retains thickness, a central spine, tapered apexes and curved cutting edges.

The shader is deliberately the least opaque: low-alpha gray surfaces, faint Fresnel edges, traveling pressure bands and moving directional simplex noise. LOW disables geometric shimmer; MEDIUM/MAX add restrained procedural distortion. This is a refraction approximation, not screen-color sampling. Each crescent travels along its own small fan angle and contacts independently; the third is larger and creates a stronger wave/camera response.

Three small temporary water-wake overlays follow the projectile locations at sampled surface height. Each contact adds one bounded directional water split and one ripple. The existing split API has a 3m minimum width; narrow visible streaks are supplied by the surface overlay. Fine droplets/streaks originate from each moving blade and blast outward at that blade’s own contact. Air adds no light.

An initial cold LOW cast had a 185.8ms maximum RAF interval. Cancellable idle shader preparation and softened pressure outlines were added. Later warmed LOW/MEDIUM/MAX runs showed maxima of 10.7 / 12.3 / 11.1ms. Browser/driver caching also contributes; zero first-use stalls are not promised. See `air-side.png`.

## Firebending

Two hand-linked streams use two/three closed, thin elliptical shell layers each. They coil near both hands during a 0.52s gather, then advance as broad intertwined ribbons. The two centerlines have different phases and opposing vertical swirl, giving a flowing asymmetrical silhouette. They are neither Ember Comet projectiles nor Dragonfire behavior.

Custom GLSL uses flow-aligned simplex FBM, ridged filaments, domain perturbation, moving torn contours and temperature gradients from dark red through orange to sparse yellow-hot regions. Geometry keeps real thickness even where the combustion shader breaks its edges apart. Fixed buffers provide 32×6 / 48×8 / 64×10 intervals. Hidden flame layers are not updated; the impact volumes do not update before contact.

At arrival, the foreground ribbons withdraw quickly so they do not obscure the target. Two/three separate curved flame volumes coil into a compact bloom, then roll outward just above the ocean. GPU embers, thin sparks, dark ash and a separate pale steam category decay after impact. Two owned ripples, a localized warm surface cue, the existing ocean reflection and one bounded non-shadow-casting light (MEDIUM/MAX) supply the fire-on-water response. No sphere explosion or permanent burning surface.

The rendered refinement reduced mirror symmetry and shortened foreground fade. See `fire-normal-low.png`, `fire-impact-low.png` and `fire-side-max.png`.

## Shared architecture and resource ownership

- `BendingSupport`: finite target snapshot, range clamp, ocean sampling, deterministic seed, easing and central quality-tier lookup.
- `SweptVolume`: persistent closed sweep buffers/topology and curve-frame normals, used for liquid volumes and thin flame shells with different paths/profiles.
- `BendingNoise`: the existing attributed Ashima/Gustavson simplex source plus bounded one/two/three-octave FBM and ridged helpers. Original MIT notices remain in `public/licenses/`.
- `SeedParticles`: seed/position buffers and common projection/lifecycle uniforms only. Each element supplies its own motion, drag/gravity, shape, alpha and color shader logic; this is not one recolored particle attack.
- `BendingWarmup`: detached compilation prototypes, one program per cancellable idle callback, without a new render pass or playable world. Air/fire use it; water/earth retain their normal lazy cache path.

The [reference project](https://github.com/sandaoliu1234/threejs-ability-sandbox) informed the procedural/GLSL/instancing approach. No copyrighted Avatar characters, models, animation files or assets were introduced. No donor engine was imported. Existing authored geometry utilities and attributed noise are reused without modifying their owning spells.

Each ability owns at most **two reusable visual bundles**. Across the four new abilities, a WeakMap admission counter allows at most **three concurrent bending effects**. It does not change the existing EffectManager or impose new behavior on the old spells. Rejection starts no cooldown.

On natural or forced completion, an effect removes its root/light, unsubscribes quality, removes its water owner and releases its admission lease exactly once. Inactive bundles keep their owned buffers/materials for reuse. Ability/game teardown cancels idle work, disposes instance buffers, geometries/materials/particles/lights and releases everything. No timers or permanent animation callbacks are used in effect timelines. No per-frame Vector3/Quaternion allocations or per-particle Mesh/material objects occur in the new animation loops.

Four conservative upper-body gestures use real Rocketbox hand attachments: circular dual arms, heavy punch, fast sweep and flowing dual thrust. The existing restore → mixer → capture → additive pose sequence is retained. Actual-GLB tests verify both locomotion legs remain unchanged, hand positions stay finite, quaternion lengths stay normalized, dual casts move both arms and every gesture returns to Run/READY. The original 80-bone rig, clothing, model binary and Idle/Walk/Run clips are untouched.

Typed `*Config.ts` modules expose thickness, curvature, scale, speed, noise/turbulence, material brightness, fragment velocity, pressure and bounded tier budgets as appropriate. The current F3 editor is ocean/character tooling, not a general ability editor, so no new GUI system was added. Shape/topology changes require controlled construction/HMR between casts; runtime preset switching only selects cached topology and adjusts uniforms/capacities.

## Graphics limits

| Spell | LOW particles | MEDIUM particles | MAX particles | Other geometry/instance limits |
|---|---:|---:|---:|---|
| Tidal Serpent | 180 | 430 | 900 | Two liquid volumes; 36×8 / 56×10 / 80×12 intervals |
| Titan Fist | 160 | 380 | 780 | 18 structural plates; 24 / 45 / 75 impact shards; six instanced draws |
| Skybreaker | 140 | 300 | 650 | Three blades; 16 / 28 / 40 intervals; three temporary wake overlays |
| Dancing Inferno | 210 | 520 | 1,050 | 2 / 2 / 3 layers per hand and impact; 32×6 / 48×8 / 64×10 intervals |

Noise detail and illumination follow the existing GraphicsSettings. LOW retains every primary silhouette and contact event. Capacities are bounded allocations/telemetry, not an assertion that every allocated seed is visible simultaneously. No renderer, exposure, bloom preset, ocean simulation, reflection pass or old spell was rewritten.

## Validation and performance

Implementation and acceptance proceeded **water → earth → air → fire**. Each had TypeScript/build/focused tests and LOW playback before MEDIUM/MAX and before the next spell was registered. The actual game/browser harness uses Game, the local GLB, input handling, AbilityManager, Spellbook, Favorites, Quick Wheel, water and WebGL renderer.

Acceptance records in `docs/phase32/` cover actual left-click casting, equip without casting, subtitle search, favorites/wheel, cooldown rejection, distinct realtime stages, near and clamped-far inputs, live presets, moving/sprinting casts, pose recovery, natural completion, ocean-owner cleanup, finite geometry and WebGL status. Final records additionally measure the real animated casting-hand origin. Original favorites storage is restored exactly after testing and navigation.

Ten warmed browser casts per spell returned to identical scene/light/GPU-geometry/texture/program/subscription counts. Fire was also stress-tested for ten casts on MAX: before/after **112 scene objects, zero temporary lights, 26 GPU geometries, 21 textures, 45 programs and six subscriptions**, with zero active effects/ripples after expiry. Complete game teardown released GPU geometries/textures and subscriptions. Focused automated tests separately run 20 lifecycles per spell and test mixed admission, forced cleanup and warmup cancellation.

Twenty additional alternating MAX casts across all four abilities also returned to the same warmed baseline: **112 objects, zero temporary lights, 39 GPU geometries, 21 textures, 53 programs and six subscriptions**, with no active effects or water disturbances. Evidence: `mixed-max.txt`. This warms each spell first, so retained GPU cache ownership is distinguished from a leak.

The final ocean alignment refinement gives the liquid droplets, stone splash and fire steam a sampled surface-height birth uniform at actual contact. A focused test changes ocean height from 0.8m during casting to 1.2m before contact and verifies the later height is captured. It avoids assuming a flat Y=0 emission plane while preserving gravity/updraft trajectories after birth.

The production TypeScript validation/build pass; the suite contains **133 passing tests**, including the preceding spell suites and new geometry, metadata, lifecycle, concurrency and actual-rig tests. The build retains its existing large-chunk advisory. `git diff --check` passes.

Representative old-spell and shared UI/ocean browser records are saved alongside the acceptance evidence. Whole-scene draw calls include the character, ocean, reflections and composer. RAF intervals are browser observations at 1920×1080, not independent GPU timing or a guaranteed desktop FPS benchmark. Warm caches intentionally retain resources between casts.

`existing-spells-max.txt` passes Ember Comet, Riftreaver, Frost Lance, Astral Chainstorm and Tidal Sovereign: selection, actual click/cooldown, finite geometry/instances, natural completion, scene/light/subscription/water cleanup and WebGL status. `ui-ocean-regression.txt` passes overlay input blocking/focus, search/filter/equip, wheel mouse/keyboard/dead-zone/cancel behavior, cooldown cards, WASD/Shift, finite targeting, F3 editor updates and 15 ocean quality/parameter changes with stable counts. Browser console warning/error logs were empty.

Observed per-spell whole-scene peaks and RAF intervals (milliseconds):

| Spell | Preset | Draw calls | Triangles | RAF median / p95 / maximum |
|---|---|---:|---:|---|
| Water | LOW | 18 | 14,857 | 6.1 / 6.4 / 6.8 |
| Water | MEDIUM | 57 | 56,664 | 6.1 / 6.7 / 11.0 |
| Water | MAX | 57 | 92,648 | 6.1 / 6.5 / 7.4 |
| Earth | LOW | 19 | 14,825 | 6.1 / 6.4 / 6.8 |
| Earth | MEDIUM | 59 | 56,424 | 6.1 / 6.5 / 6.8 |
| Earth | MAX | 59 | 92,072 | 6.1 / 6.7 / 10.5 |
| Air | LOW (prepared) | 25 | 14,759 | 6.1 / 6.6 / 10.7 |
| Air | MEDIUM (prepared) | 71 | 56,004 | 6.0 / 6.7 / 12.3 |
| Air | MAX (prepared) | 71 | 90,500 | 6.1 / 6.7 / 11.1 |
| Fire | LOW | 23 | 16,051 | 6.1 / 6.4 / 10.7 |
| Fire | MEDIUM | 67 | 61,516 | 6.1 / 6.4 / 14.2 |
| Fire | MAX | 73 | 108,276 | 6.1 / 6.5 / 8.9 |

Raw `*-low.txt` records retain incremental registration counts (33, then 34, then 35, then 36) from the required implementation order. `*-low-final.txt` records cover the completed 36-spell build and final hand/filter/card checks. The cold air record is intentionally retained rather than replaced with only a warmed performance claim. Source changes after each visual review were followed by focused checks; the final production build transformed 463 modules, and all 133 tests passed again.

## Files created

Production files:

| Directory | New modules |
|---|---|
| `src/abilities/bending/` | `BendingSupport.ts`, `SweptVolume.ts`, `BendingNoise.ts`, `SeedParticles.ts`, `BendingWarmup.ts` |
| `src/abilities/tidalSerpent/` | `TidalSerpent.ts`, `TidalSerpentConfig.ts`, `TidalSerpentEffect.ts`, `TidalWaterMaterial.ts`, `TidalDroplets.ts` |
| `src/abilities/titanFist/` | `TitanFist.ts`, `TitanFistConfig.ts`, `TitanFistEffect.ts`, `TitanRockGeometry.ts`, `TitanRockMaterial.ts`, `TitanDust.ts` |
| `src/abilities/skybreaker/` | `Skybreaker.ts`, `SkybreakerConfig.ts`, `SkybreakerEffect.ts`, `PressureBladeGeometry.ts`, `PressureMaterial.ts`, `AirDroplets.ts`, `AirWaterWake.ts` |
| `src/abilities/dancingInferno/` | `DancingInferno.ts`, `DancingInfernoConfig.ts`, `DancingInfernoEffect.ts`, `FlowingFlameMaterial.ts`, `InfernoParticles.ts`, `InfernoImpact.ts` |

Validation/documentation: `bending-browser.html`, `tests/bending-browser.ts`, `tests/bending.spec.ts`, this report and `docs/phase32/` records/screenshots.

## Files modified

Shared production changes are limited to `src/game/Game.ts` (four appended registrations and air/fire warmup), `src/player/CharacterMotion.ts` (the four scoped upper-body gestures) and `src/ui/SpellIcon.ts` (four original static SVG icons), plus `README.md` documentation. Existing ability source bodies, ocean, renderer, camera, input, registry, manager, cooldown system and model assets were not changed.

`tests/character.spec.ts` adds actual-rig bending regression coverage. `tests/audit-browser.ts` adds the five requested regression indices and expects 36 registrations. The `character`, `phase25`, `chainstorm`, `moonfall`, `drowned-king`, `ember-comet` and `riftreaver` browser harnesses update their expected registry/card counts to 36 while retaining their old ability assertions. Existing Phase 30/31 local work was preserved.

## Remaining limitations and Git history

- Water and air use shader approximations for translucency/distortion; there is no scene-color refraction, fluid solver or fullscreen distortion pass.
- The gestures are conservative procedural overlays on the original rig, not new motion-capture clips or full-body martial-arts animation.
- Steam/dust/droplets use bounded soft/streak point sprites. Main elemental shapes and stone debris are real three-dimensional geometry.
- First-use shader/driver work can still pause; idle preparation reduces it but does not guarantee zero cold stalls, especially across lighting/preset combinations.
- Existing-spell regression coverage is representative, not a claim that all 32 previous spells were visually reviewed anew.
- All four spells are complete; no damage was added because the project has no existing damage API.

No commit, push, reset, clean, PR, deployment or publication command was issued by this agent. Git history nevertheless changed during the session: observed new local commits included `d7243a4`, `46d486b` and `158a72d`. Their source was outside this command workflow; that history and subsequent local refinements were preserved rather than reset.
