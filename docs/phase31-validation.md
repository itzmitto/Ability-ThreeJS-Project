# Phase 31 — Riftreaver: Scar of Reality

## Ability and preserved baseline

**Ability 32**, stable ID `riftreaver`, element **VOID / DIMENSIONAL**, cooldown **10 seconds**, ground range **55 metres**, incision speed **55m/s**. Select with Tab → Spellbook, search Riftreaver, equip, and left-click. Favorites and the existing Quick Wheel work without a new numeric binding. All 31 preceding registry entries, slots and shortcuts remain unchanged.

Default duration is approximately **5.85–6.7 seconds** at 8–55m, including 0.3s hand incision, distance-dependent travel and 5.4s after arrival. Default tear is **18m high / nominally 8m wide**, with a **2.8m recessed interior** and protruding faceted edges. Maximum simultaneous direct effect leases: **two**. Normal cooldown exceeds the effect lifetime.

Before implementation, outstanding Phase 30 regression checks passed on LOW and MAX for Ember Comet, Frost Lance, Sand Reaper, Astral Chainstorm, Abyssal Moonfall and The Drowned King. The final MAX character acceptance result was already present and passed. Original 80-bone Rocketbox rig, Idle/Walk/Run, garment improvements, quaternion restoration, foot correction and bone attachments were retained. Evidence is in `docs/phase30/`, including the completed `regression-low.txt` and `regression-max.txt`.

## Procedural geometry and depth

`RiftGeometry.ts` generates deterministic left/right jagged boundary paths. Each path is swept through variable-width diamond cross-sections into a **closed, solid BufferGeometry**, including end caps. Geometry is nonindexed; computed triangle normals preserve sharp facets. A narrower, separately generated luminous boundary sits forward of the dark border. The two boundaries separate in the vertex shader rather than following the camera.

The curved interior has seven cross-section samples per row and recesses toward the center; it is not a flat rectangle or disk. There are front borders, recessed membrane, branching volumes and shards at differing depths. The frame is fixed from the cast approach direction, stays upright and does not continuously face the camera or retarget.

Three reusable solid shard variants use different deterministic spine perturbations and tapering. Three bounded InstancedMeshes hold at most 35 instances each. The incision and outgoing slashes reuse a closed, curved, jagged, tapered volume with a central spine and thin cutting edges. Their luminous surfaces are separate geometry draws, not billboard weapons. Bounds are computed once; tests verify finite positions, unit normals, positive volume, two-manifold closed edges and nondegenerate triangles.

Boundary and shard samples are cached in typed arrays. No geometry is rebuilt during animation. Configuration changes validate all numbers, clamp ranges and explicitly rebuild resources between casts.

## GLSL, noise and lighting

`RiftMaterials.ts` injects local-coordinate simplex FBM, ridged fissures, travelling edge pulses and restrained Fresnel into MeshStandardMaterial. Obsidian remains physically lit, dark, rough and moderately metallic. Vertex separation applies the corresponding inverse scale to object normals. Tiny depth twitch is bounded at 0.014m.

The void shader combines near-black depth gradients, slowly moving indigo noise, sparse cell-hashed stars, thin ridged filaments and subtle procedural coordinate warping. LOW/MEDIUM/MAX use one/two/three bounded simplex octaves. This is **procedural distortion/depth illusion**, not scene-color refraction, a second rendered world or a recursive portal. The existing ocean reflection system naturally reflects the geometry on supported presets. No new post-process pass or global exposure/bloom change was introduced.

The existing attributed `FrostLanceNoise.ts` utility is reused; its Ashima / Stefan Gustavson credits and donor MIT notice remain intact in `public/licenses/LinearAbilityExtThreeJS.txt`. The new geometry, choreography and integration are original. The donor project's procedural/GLSL/instancing approach informed the design: https://github.com/sandaoliu1234/threejs-ability-sandbox . No donor engine or unrelated ability was copied.

A visual test caught a black bloom artifact despite a clean console/WebGL status. Clamping the Fresnel and ridged-power inputs to valid ranges fixed it. Subsequent actual MEDIUM/MAX screenshots were inspected. This is why shader compilation and finite CPU uniforms alone are insufficient visual acceptance.

A single temporary, non-shadow-casting violet PointLight is shared across charge, opening and collapse. LOW hides it; MEDIUM/MAX enable it. Most brightness comes from restrained emissive edges. The new spell uses the existing bounded camera feedback and short renewable sky-framing API; it never changes the camera controller or targeting rules.

## Choreography and character

- **0–0.3s:** a solid diagonal incision forms at the real animated right hand, with tiny angular fragments and motes.
- **Travel:** release snapshots the actual hand and a safe aim target. Distance / 55m/s determines arrival. The opening is hidden until the visible incision arrives.
- **Arrival + 0–0.65s:** the central cut lengthens quickly, borders separate nonuniformly, recessed darkness becomes visible, branches appear and shards detach.
- **+0.65–1.5s:** void clouds/filaments and sparse motes move while solid fragments orbit.
- **+1.5 / +2.05 / +2.6s:** three distinct banked blades launch sequentially in an approach-side fan so they remain visible in front of the void. Their travel is bounded by distance to the caster; none crosses back through the caster. Each contacts water only after its own visible travel completes. The third is larger and causes stronger water displacement.
- **+3.05–3.8s:** edges close, darkness deepens, shards/motes accelerate toward the central seam.
- **+3.8s:** a short, sharp three-dimensional white-violet flash, localized compression pulse, debris release, droplets and expanding ocean shockwaves.
- **+3.8–5.4s:** fragments fall under gravity, mist/energy rings decay and motes disappear.

A narrowly scoped `riftreaver` branch in CharacterMotion adds a conservative diagonal upper-body cutting gesture, torso follow-through and smooth recovery. It uses the existing two-bone arm solver and real hand/finger bones. Other ability poses and leg locomotion are unchanged. A new actual-GLB test verifies finite moving hand positions, unchanged thigh/calf rotations and return to Run/READY.

## Ocean interaction

Each slash submits an owned directional `addSplit` and an owned small `addRipple`; the third split/ripple is stronger. Final collapse submits three expanding ripples with bounded displacement and attenuation. Exactly six ripples are emitted over one complete cast, plus three directional splits. Ocean surface height is sampled through the existing API for placement and overlays. Existing ripple notifications produce compatible water spray.

The temporary ground shader adds a thin leading ring, secondary pressure ring, dark noisy mist/compression and localized violet reflection cue. GPU droplet trajectories are distinct from stars and fracture streaks. No permanent terrain, global amplitude changes or new water renderer is used. Natural completion or forced disposal calls `removeOwner(this)` for all spell disturbances.

## Quality and resource ownership

| Preset | Boundary intervals | Major shards | Particle capacity | Branch volumes | Noise octaves | Temporary light |
|---|---:|---:|---:|---:|---:|---|
| LOW | 24 | 30 | 280 | 4 | 1 | Off |
| MEDIUM | 40 | 60 | 680 | 7 | 2 | On |
| MAX | 60 | 105 | 1,300 | 10 | 3 | On |

Every preset uses the same scale, phase logic, solid borders and three slashes. The existing central GraphicsSettings updates tier geometry, bounded instance/particle counts, shader detail and light visibility live without resetting the cast. The particle buffer is fixed at 1,300 seeds; GPU analytic trajectories handle orbit, convergence, outward burst, gravity, fading, small streaks and surface droplets in one draw. Three instanced shard draws share one material. No per-particle material or per-frame geometry allocation occurs.

The ability owns shared tier geometries and at most two reusable effect bundles. Expiry removes the scene root, light, quality subscription and all water owners; the inactive bundle keeps reusable GPU resources for subsequent casts. Final ability/game disposal destroys owned materials, buffers and lights, then shared geometry. Shared geometry is never disposed by an individual active effect.

`RiftWarmup.ts` uses detached tiny mesh/point/instancing prototypes, one synchronous compile call per cancellable idle callback. It compiles against the existing scene lighting; it does not render a second scene or instantiate a complete attack. There is no uncancellable compileAsync polling that can outlive renderer teardown. Cached programs remain owned until ability disposal. Current quality is warmed; switching shadow/light modes can still require another variant. Browser/driver caching and idle availability affect first-use pauses, so zero stalls are not promised.

## Validation and measurements

Actual browser evidence and final production checks are recorded in `docs/phase31/`. The browser harness uses the actual Game, GLB, renderer, input manager, UI and ocean. Authored input events exercise Spellbook search/filter/equip, favorites, Quick Wheel, left-click, 100 cooldown attempts, all eight realtime phases, real hand attachment, three slash contacts, near/medium/clamped far input, movement/sprint, cast recovery, camera/targeting, F3 and full teardown.

Twenty sequential casts were tested on LOW and MAX. Each returned to identical warmed scene, light, geometry, texture, program, subscription, effect and water counts. Automated lifecycle tests separately exercise 20 casts, live presets and the two-lease concurrency limit. Final MAX browser acceptance also switches LOW/MEDIUM/MAX during one active cast, with finite geometry and no WebGL errors.

Final checks: TypeScript validation passed; production build passed (434 modules, with the existing large-chunk advisory); **all 118 automated tests passed**; `git diff --check` passed. Final browser records are `browser-low-final.txt`, `browser-medium-final.txt` and `browser-max-final.txt`. Console warning/error logs were empty.

| Preset | Peak whole-scene draw calls | Peak triangles | Particle capacity | Shard instances | RAF median / p95 / maximum (ms) |
|---|---:|---:|---:|---:|---|
| LOW | 30 | 16,377 | 280 | 30 | 6.1 / 6.3 / 34.0 |
| MEDIUM | 85 | 60,864 | 680 | 60 | 6.1 / 6.4 / 8.8 |
| MAX | 91 | 98,704 | 1,300 | 105 | 6.1 / 6.4 / 9.4 |

At 1920×1080, final MAX stress counts after warming all three presets were identical before/after 20 casts: **112 scene objects, 0 temporary lights, 36 GPU geometries, 21 textures, 49 programs and 6 subscriptions**, with zero active effects, particles, instances or water ripples after expiry. Higher retained geometry/program counts than single-preset acceptance are expected from explicitly warming every quality tier. Complete Game teardown freed GPU geometries/textures and subscriptions.

Post-integration MAX browser regressions passed for Ember Comet, Frost Lance, Sand Reaper, Astral Chainstorm, Abyssal Moonfall and The Drowned King: actual casting, cooldown rejection, finite geometry/instances, natural completion, scene/light/subscription/water cleanup and WebGL status. The raw record is `existing-spells-max.txt`. First-use spell caches intentionally retain resources; this regression does not assert that all GPU memory disappears between unrelated spells.

Shared UI/ocean acceptance passed: overlay input blocking and focus recovery, search/category/equip, mouse and keyboard Quick Wheel, dead zone, bounded eight favorites, actual cooldown display, movement/sprint/targeting, F3 editor uniforms, all three ocean presets and 15 repeated quality/parameter changes with stable scene/light/GPU/subscription counts. Evidence: `ui-ocean-regression.txt`. The legacy wheel fixture initially failed against pre-existing user favorites; isolating the test favorites and restoring their exact original storage resolved it without changing production UI behavior.

Counters are **whole-scene** Three.js counts, including the character, ocean, reflections and post-processing. Browser RAF timing is observed in this in-app test surface and is not a standalone hardware FPS/GPU benchmark. Cold MEDIUM initially showed a 97.5ms maximum interval before idle warmup was added.

Visual evidence: `normal-slash.png`, `side-open.png`, `elevated-open.png`, `low-ocean-view.png`, `hand-incision.png`, `collapse.png`, `implosion.png`, `aftermath.png`. These are actual rendered stage captures, not concept art. Frozen review captures inspect shape/materials; the separate realtime harness verifies normal temporal playback. The initial border contrast, excessive bright motes, hidden slash trajectories, invalid shader power inputs, flash material coupling and debris transition were refined during actual browser review.

## Files

New production modules, all in `src/abilities/riftreaver/`:

- `Riftreaver.ts` — metadata, safe target, config, bounded pool and shared ownership.
- `RiftreaverConfig.ts` — typed tuning, validation, quality and phase classification.
- `RiftGeometry.ts` — boundary sweeps, recessed membrane, shards, slash and shared tiers.
- `RiftMaterials.ts` — lit obsidian, procedural void and energy shaders.
- `RiftShards.ts` — deterministic instanced opening/orbit/convergence/burst.
- `RiftParticles.ts` — fixed GPU seed trajectories and particle categories.
- `DimensionalSlashes.ts` — three sequential solid blades and contact timing.
- `RiftImpact.ts` — owned directional water cuts, ripples and localized overlay.
- `RiftreaverEffect.ts` — one coordinated lifecycle and cleanup.
- `RiftWarmup.ts` — cancellable idle prototype shader preparation.

Shared production changes: `src/game/Game.ts` (registration + warmup), `src/ui/SpellIcon.ts` (original static SVG), `src/player/CharacterMotion.ts` (only Riftreaver gesture), `README.md`. No existing spell body, camera, renderer, input, ocean shader, model binary or ability/cooldown framework changed for Phase 31.

New validation: `tests/riftreaver.spec.ts`, `tests/riftreaver-browser.ts`, `riftreaver-browser.html`, this report and evidence directory. `tests/character.spec.ts` adds the specific moving slash test. `tests/audit-browser.ts` adds the Riftreaver selector and updates roster counts; `tests/audit-review.ts` adds an elevated QA view. Earlier browser harnesses (`character`, `phase25`, `chainstorm`, `moonfall`, `drowned-king`, `ember-comet`) update expected roster/card counts to 32. The Phase 25 UI harness additionally isolates its wheel fixture and restores the exact original favorites storage after testing, including on navigation. Prior Phase 30 local changes remain intact.

## Remaining limitations

- The void and spatial shimmer are procedural approximations; there is no actual view into another world or scene-color refraction.
- Very close casts of an 18m tear can extend above the camera frame. Existing restrained framing helps without locking user input.
- Sparse GPU dust uses soft point sprites; the fracture, borders, shards, incision and slash weapons are real geometry. No opaque billboard weapon is used.
- First-use shader/driver preparation is reduced, not guaranteed absent. Warmup does not precompile every possible shadow, light and graphics combination.
- The retained human rig has no dedicated spatial-cut motion-capture clip. The upper-body pose is conservative and locomotion-compatible.
- All 31 preceding abilities are preserved; representative browser regressions do not claim that every ability was visually reviewed anew.

No agent commit, push, reset, clean, PR, deployment or publication was performed. All existing local changes and externally recorded prior commits were preserved.
