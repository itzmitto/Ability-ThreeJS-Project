# Elemental Sandbox — Phase 24

A browser-based Three.js sandbox with a dark reflective water arena, an animated human male in everyday clothes, and 27 registered elemental/fantasy abilities. The existing architecture, controls, player and HUD remain in place. There are no enemies, health/damage systems, NPCs, inventory or quests. All runtime assets are local.

## Sand Reaper — Dune Cleaver

Ability **27**, **Shift+7**, or its golden crescent HUD card. Aim with the camera and left-click. Normal **7** still selects Tempest Cataclysm; **Shift+6** remains Frost Lance. Cooldown **6 seconds**, maximum range **42 metres**, flight speed **40 m/s**. Charge/assembly takes **0.62 seconds**, followed by visible quaternion-oriented flight, directional stone fracture, granular sand spray, dust, droplets and owned water ripples. Complete lifetime is roughly **3.5–4.5 seconds** depending on distance.

The weapon is an original, closed procedural BufferGeometry sweep with a six-sided asymmetric cross-section: thick spine, thin cutting edges, tapered sharp tips and deterministic chipped facets. A patched opaque MeshStandardMaterial combines local simplex/fbm stone grain, strata, erosion, sparse mineral seams and ridged detail with animated world-space sand flow. It remains readable with LOW bloom disabled. Four original angular shard geometries feed four bounded InstancedMeshes; sand/dust/droplets use GPU-driven ring buffers. Two lazily created visual bundles reuse geometry/materials between casts and are destroyed at game teardown. No new runtime dependencies.

LOW/MEDIUM/MAX: **16/28/40** arc segments, **24/48/88** impact rocks, **420/1100/2400** sand buffer slots, **24/56/100** dust slots, **28/60/110** droplet slots. The central GraphicsSettings switches LOD, noise detail, particle budgets and lighting live. Tuning is typed in `SandReaperConfig.ts`; `SandReaper.configure(patch)` applies finite, bounded scalar controls live. Shape edits explicitly rebuild cached geometry only when no cast is active. A brief additive right-arm overlay preserves locomotion; it is not a new animation rig.

With Vite running, `/audit.html?sand&only&realtime&quality=LOW` validates a normal-speed cast. Test MEDIUM then MAX; `/audit.html?sand&only&stress&quality=MAX` tests 20 casts, rapid cooldown rejection, locomotion and full disposal. `/audit.html?sand&quality=MAX` also checks Frost Lance, Glacial Eruption and Tempest Break. `/audit-review.html?slot=26` provides stage/range/angle controls. Source attribution is retained in `public/licenses/LinearAbilityExtThreeJS.txt`.

[Phase 24 file inventory, rendered screenshots, validation, measurements and limitations](docs/phase24-validation.md). The upstream simplex noise notice is retained in `public/licenses/WebGLNoise-MIT.txt`.

## Frost Lance — Original Glacial Eruption

Select **Shift+6** or its HUD card, aim at the water, and left-click. Normal **6** still selects Worldrend; **Q/1** still selects the original Glacial Eruption. WASD, Shift sprint, mouse aiming, F3 debug and P telemetry are unchanged.

The new ability ports the supplied older LinearAbilityExtThreeJS Ice snapshots: a 26 m/s fracture front, widening crystal field, progressive spring eruption, endpoint cluster, 3.6-second standing phase, 0.6-second delay and 1-second sinking withdrawal. Range is **2.5–15 m**. The default MAX field uses **190 crystals**, across three seeded instanced geometries, with a **288-instance ceiling**.

The original **0.4-second cooldown** remains. At most **two complete live casts** are allowed, including their lingering frost/particle tails. A third cast is rejected cleanly even when the cooldown reads ready. Two cached visual bundles prevent per-cast shader/geometry recreation and are destroyed at game teardown.

LOW/MEDIUM/MAX use **80/140/190 crystals**, with 32%/65%/100% particle emission density. Mist, shard and glitter buffer ceilings remain bounded at the source maxima of 3200/2400/2800 per bundle. The source spike count/density in `FrostLanceConfig.ts` can be tuned up to 288; the geometry and instance writes retain their hard bounds. Live quality changes preserve the footprint, seed assignments and cast timeline.

The standard-material ice shader retains source thickness tint, fractures, local frost veins, base rime, Fresnel, glints and birth flashes. Particle/decal helper calls use local GPU buffers and temporary water overlays; mist is kept low over the water. Residual rime lasts roughly 10 seconds at maximum range, after the crystals have withdrawn. The persistent water renderer is unchanged.

[Source fidelity, files, browser evidence, measurements and limitations](docs/phase23-validation.md). The supplied reference snapshots are in `frost-lance-donor-sources/`; they are not imported by the game. Attribution and the verified MIT notice are in [the existing donor license](public/licenses/LinearAbilityExtThreeJS.txt). No additional runtime dependency was added; `@types/node` is a development dependency for strict donor-comparison test types.

```sh
npm install
npm run dev
npm run build
npm test
```

With Vite running, `/audit.html?quality=LOW&frost&realtime` tests Frost Lance and Glacial Eruption at actual playback speed. Substitute MEDIUM/MAX for other presets; `/audit.html?quality=MAX&frost&stress` runs bounded repeated-cast checks. `/audit-review.html?slot=25` provides stage/range/angle controls. These review pages are development-only.
# Phase 25 — Spellbook and cinematic ocean

**Tab** or the compact HUD's **Spellbook** button opens the registry-driven catalog. Search names, subtitles, elements and tags; filter by element; click to equip (selection never casts). Stars persist ordered favorites locally. Hold **Backquote (`)**, move into a favorite wedge and release to equip, or use the **Quick Wheel** button and click. Arrow keys + Enter also select; Escape cancels. The first eight favorites occupy the wheel. Existing numeric/modifier shortcuts, WASD, Shift sprint, mouse aiming and world left-click casting remain available.

The existing water mesh now uses a coherent GPU Gerstner spectrum with analytic normals, filtered simplex/fbm detail, bounded displaced ripple wavelets, Fresnel/specular response, and the existing clipped planar reflections. Impacts using the existing water API also feed one bounded GPU droplet pool. LOW/MEDIUM/MAX limit waves, mesh density, normals, reflections, lights and disturbances. In development, **F3** exposes the live Ocean VFX editor; production builds omit it.

[Phase 25 complete file inventory, browser evidence, measurements and limitations](docs/phase25-validation.md). No new spell, renderer, dependency, or gameplay system was added.

## Phase 26 — Astral Chainstorm / Runebreaker

Ability **28**, **ARCANE / METAL**, **8s cooldown**, **38m range**. Open **Tab → Spellbook**, search **Runebreaker**, click to equip, aim, then left-click. Favorites and Quick Wheel work normally; no new keyboard shortcut is required or assigned.

Three to five chains assemble at the animated right hand, launch at 34m/s after acceleration, wrap the target, constrict, and strike the sampled ocean surface. The real closed 3D links use alternating instanced orientations, opaque forged-steel shading, engraved procedural glyphs and traveling cyan pulses. LOW/MEDIUM/MAX cap links at 78/136/200 and steel debris at 24/48/80. Bounded GPU sparks, dissolving rune fragments, angular discharge, source-owned water impulses and existing spray complete the impact. Approximate lifetime is 3.6–4.7s depending on distance.

Live typed controls are available through `AstralChainstorm.configure()`; link shape rebuilds require idle effects. Timing changes apply to the next cast. The existing F3 Ocean editor is preserved. No new dependency, enemy, damage system or renderer was added.

[Phase 26 modules, rendered screenshots, browser profiles, cleanup tests and limitations](docs/phase26-validation.md).

## Phase 27 — Abyssal Moonfall / Shattered Heaven

Ability **29**, **65m range**, **25s cooldown**, **14s lifetime**. Equip through Tab → Spellbook, search Shattered Heaven, aim and left-click. A 70m-diameter cratered moon assembles overhead, descends, fractures into closed solid sections and strikes the ocean with bounded storm, debris and water effects. No new shortcut is assigned. [Full implementation and actual LOW/MEDIUM/MAX verification](docs/phase27-validation.md).

## Phase 28 — The Drowned King / Thronebreaker

Ability **30**, **SHADOW / DARK**, **70m impact range**, **30s cooldown**, **17s lifetime**. Equip through Tab → Spellbook, search Thronebreaker, aim and left-click; favorites and Quick Wheel also work. No new numeric/Shift shortcut is assigned.

An approximately 85m procedural armored king emerges, assembles a closed 65m runeblade, grips it with articulated two-handed IK, executes a weighted strike, parts the ocean with two temporary water walls, then separates and sinks. LOW/MEDIUM/MAX bound particles at 900/2,400/5,400 and fragments at 48/120/240. One cached effect lease reuses GPU resources; all scene attachments, lights, subscriptions and water disturbances expire. `DrownedKing.configure()` exposes finite typed tuning between casts. Cold first-use shader compilation can still cause a pause.

[Complete file inventory, geometry/material details, rendered evidence, runtime measurements and limitations](docs/phase28-validation.md). With Vite running, `/drowned-king-review.html?quality=LOW` validates real-time playback; substitute MEDIUM/MAX, and add `&stress` for controlled sequential resource checks. `/audit-review.html?slot=29` provides stage/angle review. These are development review pages, not new gameplay systems.

## Phase 29 — Ember Comet / Infernal Core

Ability **31**, **FIRE / MAGMA**, **4s cooldown**, **48m range**, **44m/s** flight. Equip through Tab → Spellbook (search Ember, Comet or Infernal), aim and left-click. Favorites and Quick Wheel use the existing system; no new numeric/Shift shortcut is assigned.

A hand-charged lobed molten core assembles inside closed faceted volcanic plates, launches with a volumetric turbulent flame tail, then sheds cooling rock shards, embers and steam into three source-owned ocean ripples. The localized warm light/reflection and hot surface overlay fade with the aftermath. Lifetime is roughly **3.2–4.1s**, depending on distance; the first visible impact layers last under a second, while sparse steam/embers linger. LOW/MEDIUM/MAX cap particles at **150/340/700**, shell pieces at **6/8/10** and default impact fragments at **16/30/48**. At most two pooled leases exist; no dynamic shadows, fullscreen distortion or new renderer is introduced.

`EmberComet.configure()` exposes fourteen finite typed controls between casts. [Full geometry, material, file inventory, browser evidence and validation report](docs/phase29-validation.md). With Vite running, `/ember-comet-review.html?quality=LOW` tests real-time casting; substitute MEDIUM/MAX and add `&stress` for twenty controlled sequential cleanup checks. `/audit-review.html?slot=30&age=0.68&range=28` reviews flight stages/angles. Review pages are development-only.
# Phase 30 — Living Adventurer

The same locally licensed Rocketbox male, 80-bone skeleton and Idle/Walk/Run clips are retained. Fitted skinned leather clothing, boots, wraps, raised seams and bronze fasteners add an adventurer silhouette without replacing the human rig. Skin, fabric, leather and metal use separate PBR responses with bounded bind-space procedural detail.

Locomotion now blends continuously using actual velocity and measured stance travel. Existing 4.8m/s movement naturally reaches Run; Walk remains the slower acceleration blend. Shift retains 8.5m/s sprint with stronger conservative lean and cadence. Upper-body cast styles, open-hand blending, restrained head look and MEDIUM/MAX two-bone water contact run after the mixer without accumulating offsets. LOW keeps the same clips and core animation with simpler shading and no foot IK.

F3 includes character state, weights, calibrated stride, casting recovery and contact diagnostics alongside the existing Ocean Editor. Tuning is centralized in `src/player/CharacterConfig.ts`. No new ability or gameplay shortcut was added; all 31 abilities remain registered.

See [the character audit and validation report](docs/phase30-validation.md) for model limitations, before/after images, performance measurements, tests and the complete file inventory.
