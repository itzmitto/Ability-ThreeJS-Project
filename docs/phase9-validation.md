# Phase 09 — Realistic Dark Water and Sanguine Eclipse

This phase adds exactly one spell and upgrades the persistent water. The final registry has eight abilities, Q/E/R/F/V/X/C/B. Existing spells retain their distinct implementations and overlays. No enemies, injuries, gore, AI, swimming, combat physics, ninth spell, external asset or runtime dependency was added.

## Water implementation

`DarkWater` remains the world's facade and lifetime owner. Its GLSL surface now combines broad shallow directional displacement, medium wind ripples, small normal variation and fine moving micro-detail. The broad visual wave amplitude is around 4.5 cm combined and is suppressed near the player. A warped grid concentrates vertices near contact while retaining the 6 km extent. All sampling uses world coordinates; logical movement and targeting remain at `y=0`. Distance and screen-footprint attenuation reduce far-field aliasing, with existing navy fog hiding the horizon.

The shader uses water-like base reflectance **F0=0.02**, Schlick Fresnel, roughness variation, a capped GGX-inspired specular response and dark absorption. It is physically inspired rather than a complete energy-calibrated ocean BRDF. A bounded analytic light collector reads actual visible scene PointLights without spelling out ability identities. Light color, intensity, distance and surface/view direction affect moving specular highlights. Existing authored spell overlays remain in place.

MEDIUM/MAX use the existing Three.js `Reflector` helper as a **real planar reflection render**. A single half-float target is 384²/768²; the surface is hidden during the mirrored, obliquely clipped render, and the reflector is never inserted into the scene, preventing recursion. Shadow maps are not recalculated for this pass. The mirror updates every third/second rendered frame. Its projective sample is warped by animated water normals and filtered with five taps, then weighted by Fresnel. Actual visible player and spell geometry can appear in the reflection. Analytic sky illumination and local lights provide the LOW fallback.

Reflection limitations: the underlying mirror plane is flat, cosmetic waves do not alter the reflection camera, the low-resolution cache can lag fast motion, roughness blur is a small sampling approximation, and there is no SSR or physically simulated scattering. The blood material itself uses procedural thickness/color and analytic glossy lighting; it is not a transmitted scene-color refractive fluid. Scene reflections on water are genuine, while environmental light, absorption and thin-liquid distortion remain approximations.

### Contact and disturbance API

`PlayerVisual.getFootWorldPosition(side, result)` exposes actual Rocketbox shoe bones with replaceable fallback anchors. `WaterFootstepInteraction` integrates travelled distance into an alternating locomotion contact phase and projects the shoe position onto the logical water plane. Walk/sprint contacts have different spacing, amplitude, speed and lifetime. Idle, turning and camera movement do not emit steps. Tiny GPU ballistic droplets accompany contacts, using a 64-point fixed buffer. This uses a speed-linked contact approximation, not authored animation-clip event markers.

`AbilityCastContext.water` optionally exposes the persistent `WaterInteractionManager`, preserving older contexts. `addRipple({position,strength,duration,waveSpeed,wavelength,radius}, owner)` returns a generation handle; `removeDisturbance(handle)` and `removeOwner(owner)` release only owned sources. A fixed 32-entry uniform buffer animates travelling, damped wave gradients. New emissions are bounded by the current tier; already-active sources retain their lifetime across quality changes. Slot recycling invalidates old handles. Sanguine lance and execution impacts register real shared disturbance sources; older spells keep their designed overlays and gain global reflections/light response.

| Water setting | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Grid subdivisions | 32² | 96² | 160² |
| Spectrum detail | Broad/medium | Added small ripples | Added micro waves |
| New disturbance capacity | 8 | 20 | 32 |
| Collected local PointLights | 4 | 8 | 12 |
| Planar reflection | Disabled | 384², every third frame | 768², every second frame |
| Shoe droplets per contact | 2 | 4 | 6 |

### New water module inventory — nine files

Within `src/world/water/`:

| Module | Responsibility |
| --- | --- |
| WaterQualityConfig.ts | Central quality mapping and bounded costs |
| WaterInteractionManager.ts | Fixed ripple buffer, generation handles and ownership |
| WaterWaveField.ts | Shared world-space wave/gradient GLSL |
| WaterSurfaceGeometry.ts | Near-dense, seamless warped grid |
| WaterLightingResponse.ts | Reused bounded scene-light inputs |
| WaterReflectionSystem.ts | Clipped mirror target, cadence and complete target disposal |
| WaterShader.ts | Fresnel, specular, normals, reflection filtering and fog |
| WaterFootstepInteraction.ts | Distance-linked alternating shoe contact events |
| WaterContactSpray.ts | Fixed GPU shoe-droplet buffer |

Modified water integration: `src/world/DarkWater.ts`, `src/world/World.ts`, `src/game/RendererManager.ts` (one optional before-render hook), `src/game/Game.ts` (world/player/reflection connection and telemetry), `src/player/PlayerVisual.ts` (shoe attachments), and `src/abilities/Ability.ts` (optional shared water interface).

## Sanguine Eclipse — Crimson Dominion

**B / 8; cooldown 14 s; maximum ground range 60 m; lifetime 16 s; tidal radius up to 22 m.** Finite ground hits are snapshotted and clamped from the player. Sky/nonfinite targets reject without cooldown. The player can walk, sprint, aim and switch quality while casting. One two-bundle pool supports the brief overlap permitted by the cooldown/lifetime; raw casts beyond its capacity reject safely.

| Timeline | Event |
| --- | --- |
| 0–2 s | Animated-hand liquid nucleus, curved forearm thread and orbiting droplets |
| 0.8–1.8 s | Broken runic target field |
| 1.3–6.7 s | Volumetric curved streams ascend toward the Eclipse |
| 2.4–4 s | Irregular glossy Eclipse grows |
| 4.5–5.8 s | Suspended liquid lances stretch into sharp forms |
| 6–8.6 s | Staggered accelerating barrage and individual water splashes |
| 8.1–9.4 s | Eclipse/orbit compression |
| 9.2–10.65 s | Large descending execution weapon and intertwined streams |
| 10.1–12.9 s | Curved splash sheets, strands, droplets and breaking shock membrane |
| 10.1–16 s | Expanding tidal crest, slower crimson residue and water disturbance |
| 11.5–15.4 s | Hanging fluid threads drain, narrow, snap and dissolve |
| 14.5–16 s | Final mist/droplet extinction and return to ordinary animated water |

The Eclipse is about 13 m across, centered 12.5 m above the surface with a far-side formation offset for framing. Its main high-detail mesh deforms continuously; connected asymmetric lobes, flowing partial orbital bands, bulges and orbiting droplets change the silhouette. LOW/MEDIUM/MAX select cached core geometry with different detail. Large structures are predominantly opaque glossy burgundy/crimson, while splash sheets and mist use controlled transparency. Surface shaders combine absorptive dark interiors, flow/noise variation, wet highlights, subtle scarlet rims and restrained magical glow.

Streams use fixed parametric tube buffers with GPU curved paths, varying thickness and tapered ends. Orbital bands are incomplete, inclined and irregular; they compress and speed up before execution. The lances have rounded tapering fluid ridges and sharp tips, not crystalline prisms. Shared instanced geometry reorients toward deterministic destinations and accelerates over a visible 0.52-second flight. Primary cadence is two warning shots, a pause, three rapid accents, a central accent and late cluster; higher tiers add interleaved attacks. Trails, three-arm liquid splashes and separate shared ripple events follow each impact.

Execution grows into a much larger tapered weapon, stretches downward, and converges with intertwining streams before impact at 10.1 s. Impact combines curved liquid membranes with differentiated normals, cohesive thick strands, a perforating hollow dome, gravity-driven droplets, temporary crimson lights and a displaced tidal overlay. The underlying water remains animated and reflects the scene. A slow opaque-looking residue impression, hanging threads, drips and several mist categories outlast the large mass; water disturbances fade independently.

Nine GPU droplet categories share one instanced glossy draw: hand orbit, ascension flow, Eclipse orbit, lance trails, lance splashes, execution blast, low suspended spray, draining hanging drops and late dark motes. Their trajectories, sizes and lifetimes differ. Four mist fields cover ascension, individual barrage splashes, execution expansion and low residual drift. Camera feedback uses only the existing bounded impulse API; no forced cutscene is introduced.

| Blood detail | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Ascension/impact streams | 6 | 10 | 18 |
| Suspended/fired lances | 8 | 16 | 28 |
| Orbital/execution/draining ribbons | 4 | 8 | 14 |
| Droplet instances | 240 | 720 | 1800 |
| Mist billboards | 8 | 20 | 36 |
| Connected surface lobes | 4 | 8 | 12 |
| Curved impact sheets | 3 | 6 | 10 |
| Temporary lights | 1 | 2 | 3 |
| Blood surface detail | Basic glossy | Moving micro normals | Richer fine specular |

### Complete blood module inventory — 28 files

Within `src/abilities/blood/`:

| Module | Responsibility |
| --- | --- |
| SanguineEclipse.ts | Ability identity, validated cast, bounded acquisition |
| SanguineEclipseEffect.ts | Managed sequence, live quality, hand/water integration and cleanup |
| SanguineEclipseConfig.ts | Shared constants and easing/seed utilities |
| SanguineTimeline.ts | Absolute-time envelopes and named stages |
| SanguineQuality.ts | One shared tier mapping from central budgets |
| resolveBloodTarget.ts | Finite snapshots and 60 m ground clamp |
| BloodSurfaceShader.ts | Wet absorptive crimson shading and noise dissolution |
| BloodMaterialSystem.ts | Shared material factory, ordinary/instanced transforms |
| BloodFluidGeometry.ts | Reusable parametric tubes and rounded tapered lance topology |
| BloodRibbonSystem.ts | Ascension, orbital, execution and impact paths |
| BloodEclipseCore.ts | Deforming irregular core and cached geometry LOD |
| BloodEclipseSurface.ts | Connected asymmetric moving surface lobes |
| BloodCastingAura.ts | Animated hand-bound nucleus and fluid thread |
| BloodLanceScore.ts | Shared launch cadence, origin/destination and GPU path functions |
| BloodLanceBarrage.ts | Instanced growth, reorientation, visible flight and impact events |
| BloodLanceTrails.ts | Coherent tapered liquid travel strands |
| BloodLanceImpact.ts | Individual curved three-arm splash batches |
| CrimsonTargetField.ts | Broken liquid runes, streams and rotating ground marks |
| CrimsonExecution.ts | Large accelerating descending liquid weapon |
| CrimsonImpact.ts | Expanding perforating hollow pressure membrane |
| BloodSplashSheets.ts | Curved liquid membranes with geometry-derived normals |
| BloodTidalWave.ts | Temporary displaced crimson crest and slower residue |
| BloodWaterInteraction.ts | Owned shared water-source registration and release |
| BloodLightController.ts | Bounded hand/Eclipse/impact lights with distinct extinction |
| BloodDropletSystem.ts | Nine fixed GPU liquid-motion categories |
| BloodMistSystem.ts | Four different low-opacity mist trajectories |
| BloodAftermath.ts | Hanging viscous threads, drain, snap and dissolution |
| BloodResourceManager.ts | Two-bundle cache, reset and complete disposal |

Other shared integration edits: `src/abilities/AbilitySlot.ts` (B), `src/ui/AbilityBar.ts` (original blood SVG), `src/ui/HUD.ts` (eighth-key/phase captions), `Game.ts` (registration), and README. The eight cards remain data-driven, using the existing dimensions and cooldown treatment. Historical harness equipped-slot assertions were extended for eight; old spell source files remain unchanged.

## Resource ownership

The world owns the water material, geometry, reflection target, contact buffer and disturbance manager once. Spells never dispose those resources. Every blood instance owns a timeline, target snapshot and water source owner, and borrows one cached visual bundle. Fixed buffers, instance counts, uniform updates and reused scratch vectors avoid rebuilding geometry each frame. Core LOD geometry and shared materials remain cached between casts. Quality changes do not recreate the effect or restart cooldown/time. Expiry detaches its root/lights, releases only its water sources, unsubscribes once and returns the bundle. Game disposal releases active effects before ability caches, then persistent water and renderer resources.

## Actual visual review and refinement

Original-water screenshots and profiles were captured before changes. Identical camera/player/time/preset comparisons are available through `/water-review.html?legacy&capture` and `/water-review.html?capture`; legacy rendering is a development-only copy of the original shader. `/phase9-review.html` exposes stages, 5/25/40/60 m, ordinary/side/low views, preset comparisons and actual playback. Production builds contain neither harness.

The first browser pass identified four weaknesses: overly uniform orbital bands, tube-dominated impacts, repetitive water highlights and a high mass clipping the ordinary camera. Actual fixes introduced inclined irregular orbital paths, curved splash membranes, multidirectional phase-warped waves and a farther-side formation offset. Droplet/mist shader float-literal errors discovered in the browser were corrected before final validation.

The second pass added connected moving Eclipse lobes, cached core LOD, geometry-derived splash normals, reduced sheet height and actual shoe droplets. An instancing transform omission discovered while reviewing the lance formation was fixed in the shared blood vertex shader. Reflections were given stronger normal-driven breakup. The camera remains freely controllable; close casts can still put the huge overhead mass partly outside the default downward-looking frame, so low-angle review is also provided.

## Validation and profiling results

Final measured reports and screenshots are recorded alongside this document. Build/test commands, individual stage timings, water before/after measurements, resource baselines, stress outcomes and remaining profiling limitations are summarized below after the final browser pass.

GPU byte usage and true GPU timing are not measured by `renderer.info` or browser RAF intervals. Reflection submission timing is CPU-side wall time around the mirror render command; it is not a GPU duration. High-resolution benchmarks explicitly resize render buffers while the embedded browser viewport remains 1280×720, and must be read as render-resolution benchmarks, not native desktop-viewport coverage.
