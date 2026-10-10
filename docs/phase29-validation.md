# Phase 29 — Ember Comet / Infernal Core

## Ability and controls

Added exactly one spell, **ability 31**, after the existing 30 registrations. No previous spell implementation, ocean renderer, movement, targeting, camera or selection architecture was replaced.

- Name: **EMBER COMET**; subtitle: **INFERNAL CORE**.
- ID: `ember-comet`; element: **FIRE / MAGMA**; Spellbook category: **FIRE**.
- Cooldown: **4 seconds**, enforced by the existing AbilityManager.
- Maximum projectile range: **48m** from the actual release hand; speed: **44m/s** by default.
- Charge/release: **0.4s**; flight depends on distance; residual lifetime: **2.6s**. Typical 8–48m casts last approximately **3.2–4.1s**. The major flash/flame burst fades within 0.75s, with sparse steam/embers lingering afterward.
- Select with **Tab → Spellbook**, search Ember/Comet/Fire/Infernal, click to equip, aim and **left-click**. Favorites and Quick Wheel use the existing system. No new numeric or Shift shortcut.
- WASD, Shift sprint, mouse camera/aim, P telemetry, F3 Ocean Editor and live LOW/MEDIUM/MAX remain available.

`EmberComet.configure()` exposes fourteen finite typed controls: radius, shell count, core glow, crack glow, tail length/width, ember/spark rates, fragment count, impact flash/radius, ripple strength, steam amount and flight speed. Values are clamped predictably; nonfinite inputs are rejected. Edits apply between active casts. Geometry quality variants are created once and reused; no new tuning GUI or renderer was added.

## Visual construction

The projectile combines an opaque lobed molten core with three instanced batches of separate closed curved rock plates. The plates converge inward during the hand charge rather than merely fading in. Two narrow volumetric spiral strands wind inward near the animated hand. At release, a quaternion aligns the shared projectile root to the snapshotted target, while its shell rotates slowly. The core remains visible through irregular gaps.

Flight uses an actual distance/speed timeline, not an instant impact teleport. Four cached tapered 3D flame volumes provide the tail; LOW draws two, MEDIUM three, MAX four. Their cross-sections twist and wobble through a GLSL vertex shader, while fragment noise breaks their surface into moving flame tongues. Ember grains, short sparks and dark ash peel into the wake. The trail never uses a flat rectangular plane as its principal volume.

On water contact, the core/shell projectile is replaced by a small contact flash, several outward flame volumes, three batches of angular glowing rock fragments, a directional spark/ember burst, ash and pale steam. Fragments have analytic drag, gravity, deterministic rotation and cooling emissive seams; they disappear as they enter the water region. A localized warm pressure/reflection overlay and ocean ripples provide the contact reaction. Main flames disappear quickly, followed by steam/ash and residual embers.

## Procedural geometry and normals

`EmberCometGeometry.ts` builds all geometry with BufferGeometry:

- The core uses a custom closed latitude-ring surface with deliberate low-frequency asymmetrical lobes; it is not Three.js SphereGeometry. Pole triangles avoid degenerate quads. Indexed smooth normals support the molten surface.
- Each shell variant has two unequal radial rings on its outer and inner skins, deterministic facet perturbations and a real approximately 0.17m normalized rock thickness. Closed side triangles connect the skins. Three seeds provide different silhouettes; Fibonacci directions distribute the plates around the core with visible openings.
- Rock fragments are closed irregular angular bipyramidal wedges, with three deterministic variants, rather than rounded spheres.
- The flame tail is a 24×10 longitudinal circular cross-section mesh tapering backward. It has genuine volume and noise-driven curvature; it is intentionally open-ended transparent flame geometry, not a watertight solid weapon.

Shell and fragment triangles are non-indexed. Winding is oriented away from the local centroid before computing independent face normals. Every geometry has finite bounds and a bounding sphere. Tests verify triangle area, finite data, unit normals, signed volume and closed edge incidence for the physical solids.

Default primary projectile triangles (excluding tail/impact/particles/ocean):

| Preset | Core | Instanced shell | Combined |
| --- | ---: | ---: | ---: |
| LOW | 120 | 240 | 360 |
| MEDIUM | 360 | 448 | 808 |
| MAX | 728 | 720 | 1,448 |

## Materials and GLSL

The core's opaque GLSL shader uses animated local simplex/fbm turbulence, view-dependent hot color, orange/red edges, a yellow body and a smaller white-hot region. Small vertex pulsation preserves its coherent silhouette. Exposure remains controlled rather than hiding the object under bloom.

The shell uses MeshStandardMaterial with roughness approximately 0.88 and metalness 0.08. Shader injection adds geometry-attached charred grain, roughness variation, thresholded branching lava fissures and restrained hot edge emission. LOW uses cheaper simplex detail; MEDIUM adds fbm; MAX also uses ridged detail. The physical crust remains dark and opaque, with heated cracks as accents. Rock fragment heat decays after impact. Three.js retains its lighting and correct instance normal transforms.

Tail noise advects in local trail space; geometry curvature and holes provide the heat-shimmer approximation. Steam combines particle-local edge breakup with world-space noise, while sparks use narrow streak masks and embers use compact angular masks. Smoke/steam and glowing heat particles use separate blend layers, with depth testing enabled and depth writing disabled. There is no fullscreen distortion, volumetric raymarching or refraction pass.

The existing attributed `frostLance/FrostLanceNoise.ts` supplies `snoise`, `fbm3` and `ridged`. Existing Ashima/MIT notices remain intact. No external asset or new package dependency was introduced.

## Ocean and lighting

Horizontal aim coordinates are snapshotted through the existing AbilityCastContext. The charge follows the animated right-hand attachment; the range is rechecked from the actual release position. The water API samples the current wave height at release, during flight contact checks and throughout impact display. The spell never assumes a flat Y=0 ocean.

Impact creates exactly **three source-owned ripples**, with default initial strength 0.19, wave speeds 4/6/8m/s, increasing wavelengths/radii and a 1.8s duration. Existing ocean displacement, normals, foam and bounded droplets respond through the established API. A small procedural surface overlay supplies a hot central reflection and expanding pressure edge without changing permanent terrain or the water renderer.

One cached warm PointLight follows charge, flight and impact on MEDIUM/MAX; LOW disables it. It has no dynamic shadow. The projectile/impact meshes also participate in the existing planar reflection where quality enables it. All warm illumination is localized; the whole ocean is not recolored. Completion removes every owned disturbance and zeroes/removes the light.

## Budgets and lifecycle

| Default preset | Shell pieces | Fragment instances | Glow slots | Vapor slots | Total particle cap | Tail volumes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 6 | 16 | 108 | 42 | 150 | 2 |
| MEDIUM | 8 | 30 | 260 | 80 | 340 | 3 |
| MAX | 10 | 48 | 520 | 180 | 700 | 4 |

Typed tuning can raise MAX fragments to 60 and shell pieces to 12; fixed buffers already cover those limits. Particle slots cannot grow beyond 700 per lease. Two GPU point buffers store spawn, velocity, lifetime, size, kind and seed; drag/gravity/turbulence/fades run in the vertex shader. The CPU only emits into fixed ring buffers and counts live slots. Three InstancedMeshes render repeated fragments; there is no Mesh or material per grain/shard.

At most **two pooled effect leases** exist, allowing a short overlap at the end of a maximum-range cast. The normal four-second cooldown still limits casting. Geometry is shared between leases and owned by the ability. Each completed lease detaches its root, stops particle activity, removes owner ripples, releases its quality subscription and disables its light. Ability/game disposal destroys materials, geometries and buffers; instance meshes are disposed without prematurely destroying shared geometry. There are no timers or per-cast DOM listeners.

## Validation and visual iteration

`npm install` succeeds without new dependencies. Strict TypeScript and production build pass; the existing >500kB bundle advisory remains. The complete automated suite passes **104 tests**, including six focused Ember Comet tests covering closed/nondegenerate geometry, bounds/normals, config limits, quality counts, metadata/selection/cooldown, target safety, hand tracking, 44m/s travel, sampled water contact, twenty sequential casts, bounded overlap and cleanup. The six focused tests also passed again after the final steam refinement.

Actual browser validation ran LOW first, then MEDIUM, then MAX. The first cast in each harness uses the real Game RAF clock, with no accelerated stepping. Checks cover all five visible phases, hand origin, Spellbook search/filter/equip, favorites/wheel, left-click, 100 rejected cooldown attempts, finite meshes, natural expiry, three ocean impulses, water cleanup, controls/animations, camera/targeting, F3, quality switching and complete GPU teardown. Near/medium/out-of-range inputs of 8/28/100m also exercise safe impact handling. Unit tests verify the exact 48m clamp and speed.

MAX additionally performs **20 controlled sequential browser casts** with accelerated timeline stepping, finishing each before the next. This is a resource-reuse check, not a benchmark of twenty overlapping effects. Counts return exactly to the warmed baseline. Raw browser results and final measurements are linked below.

| Final real-time preset | Peak live particles | Peak fragment/projectile instances | Peak complete-scene calls | Peak complete-scene triangles | RAF median / p95 / max |
| --- | ---: | ---: | ---: | ---: | --- |
| LOW | 141 | 16 | 21 | 14,872 | 6.1 / 6.4 / 53.0ms |
| MEDIUM | 322 | 30 | 61 | 54,979 | 6.1 / 6.5 / 11.9ms |
| MAX | 664 | 48 | 65 | 90,027 | 6.1 / 6.5 / 9.7ms |

These are actual 1280×720 browser observations including arena/ocean/reflection passes, not isolated spell draw counts. RAF intervals are browser scheduling measurements, not GPU timings or a universal FPS guarantee. The first MEDIUM run before the last vapor refinement had a 55.7ms maximum; warmed runs were steadier. No persistent performance degradation or context loss was observed.

MAX warmed baseline and after all twenty casts were identical:

```json
{"objects":106,"lights":0,"geometries":21,"textures":21,"programs":28,"subscriptions":5,"particles":0,"effects":0,"ripples":0}
```

Full game teardown releases all GPU geometries/textures and quality subscriptions. Raw acceptance evidence: [LOW](phase29/browser-low.txt), [MEDIUM](phase29/browser-medium.txt), [MAX plus twenty sequential casts](phase29/browser-max-stress.txt). Browser console and WebGL checks were clean after the final refinement.

Two actual visual refinement passes were completed:

1. The initial frontal render exposed too much uniformly bright core. Wider rock plates, a smaller exposed core, a narrower white-hot region and external warm light placement improved crust/seam contrast. Inward charge strands were also added.
2. The initial MAX vapor accumulated into an overly opaque bright center. Lower-opacity gray steam and distributed spawn positions separate the plume from the flame flash and preserve ember/fragment visibility.

Actual rendered views inspected and saved:

- [LOW flight from the side](phase29/low-flight-side.png)
- [MEDIUM hand shell formation](phase29/medium-hand-formation.png)
- [MAX normal-camera flight](phase29/max-flight-normal.png)
- [MAX side flight and ocean reflection](phase29/max-flight-side.png)
- [MAX layered impact](phase29/max-impact-normal.png)
- [MAX refined steam aftermath](phase29/max-steam-side.png)

These stage screenshots freeze effect time for inspection. They are not performance measurements. Real-time playback and cleanup are independently exercised by the browser harness.

Representative existing-spell regressions passed on both [LOW](phase29/regression-low.txt) and [MAX](phase29/regression-max.txt): Glacial Eruption, Tidal, Kraken Crown, Prism Ravenstorm, Frost Lance, Sand Reaper, Dragonfire, Astral Chainstorm, Abyssal Moonfall and The Drowned King. These checks exercised casting, cooldown, finite buffers, bounded instances, completion, lights, subscriptions and water cleanup using accelerated effect timelines; they are not a claim that all thirty older spells were visually inspected again.

The [shared UI/ocean regression](phase29/ui-ocean-regression.txt) also passed: all 31 roster entries, Spellbook input isolation/search/filter/equip, Favorites, Quick Wheel intent/cancellation, live cooldowns, movement/sprint, targeting, F3 and fifteen quality/parameter changes with stable resource counts. The [normal Spellbook capture](phase29/spellbook-infernal-core.png) shows Infernal Core search metadata, range and cooldown. The temporary favorite was restored afterward.

Finally, a trusted left-click in the normal running game cast Ember Comet from the hand and displayed its cooldown. The effect expired and returned to READY; the final browser warning/error log was empty. The playable tab remains open with Ember Comet equipped. `git diff --check` passed; Git only reported line-ending conversion advisories.

## Files

Eight new modules in `src/abilities/emberComet/`:

- `EmberComet.ts` — metadata, safe targeting, typed tuning and bounded leases.
- `EmberCometConfig.ts` — cast constants, finite limits and central quality mapping.
- `EmberCometGeometry.ts` — core, thick plates, angular fragments and volumetric tail.
- `EmberCometMaterials.ts` — molten core, lit volcanic crust and turbulent flame shaders.
- `EmberCometTrail.ts` — cached flame volumes and inward hand strands.
- `EmberCometParticles.ts` — two GPU ring buffers and instanced cooling shards.
- `EmberCometImpact.ts` — contact flare, outward flame tongues and hot water overlay.
- `EmberCometEffect.ts` — charge, release, travel, sampled contact, aftermath and cleanup.

New validation files: `tests/ember-comet.spec.ts`, `tests/ember-comet-browser.ts`, `ember-comet-review.html`, this report and `docs/phase29/` evidence.

Shared production changes are limited to `src/game/Game.ts` (append #31), `src/ui/SpellIcon.ts` (original compact cracked-comet SVG) and `README.md`. Existing test harness roster counts were updated in `tests/audit-browser.ts`, `tests/chainstorm-browser.ts`, `tests/drowned-king-browser.ts`, `tests/moonfall-browser.ts` and `tests/phase25-browser.ts`. The representative ocean audit now also includes Drowned King. No old spell body was edited.

## Limitations

- Heat distortion is a local shader approximation, not true screen-space refraction.
- Steam/ash use bounded GPU points with soft procedural masks; they are not fluid simulation.
- An exactly rear-aligned view foreshortens the trail and emphasizes the core. The side view reveals its physical length and volume.
- First-use shader compilation may still create a brief pause; shader variants and geometry are cached afterward.
- Residual steam/embers last longer than the main sub-second explosion to keep total lifetime around 3–4s.
- Resource diagnostics use Three.js scene/GPU counters, not a platform VRAM profiler. RAF intervals do not guarantee a specific GPU frame rate.

No agent commit, push, PR, deployment, publication or history reset was performed. Local changes present at the start were preserved. A separate process recorded Ember Comet commits during development; those external commits were left intact.
