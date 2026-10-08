# Phase 06 — ABYSSAL FLAME validation

Exactly one spell added: V/5, BLACK FIRE, cooldown 6 seconds, ground range 42 metres, lifetime 8.6 seconds. Q/E/R/F implementations, model, animations, world, camera, targeting, renderer, quality system and controls are preserved. No new dependency or external asset is introduced.

## File inventory

New production modules under `src/abilities/fire/`:

| Module | Responsibility |
| --- | --- |
| `AbyssalFlame.ts` | Ability metadata, validation, bounded resource acquisition, managed-effect creation |
| `AbyssalFlameConfig.ts` | Timeline/range/cooldown, central-budget quality mapping, radial fuel curve |
| `resolveFireTarget.ts` | Finite nullable ground validation and player-relative range clamp |
| `AbyssalFlameEffect.ts` | Clock, live hand origin, quality subscription, stages, temporary lighting, camera feedback, expiry |
| `FireResources.ts` | Two reusable bundles and complete reset/disposal |
| `BlackFireMaterials.ts` | GLSL 3 emissive material helpers, shared procedural noise and fuel functions |
| `FlamePillarField.ts` | Instanced curved flame bodies/rims, staggered pillars, persistent ground pockets, uneven burn-down |
| `BlackFireCharge.ts` | Small animated hand charge |
| `IgnitionTrail.ts` | Moving ground ignition connection |
| `ScorchResidue.ts` | Kindling fissures, boiling heat, dark overlay and broken water reflection |
| `SmokeSystem.ts` | Batched thrust, rolling plumes, low wisps and final smoke |
| `EmberSystem.ts` | Four bounded GPU point emitters with distinct motion and lifetimes |
| `HeatDistortion.ts` | Local procedural heat shimmer, MEDIUM/MAX only |

Shared production changes: `src/game/Game.ts` imports/registers the ability and assigns slot 4; `src/ui/HUD.ts` updates the phase caption. README documents the fifth spell. Old browser acceptance tests move their empty-slot assertion to X/6 and update equipped-count assertions. No existing spell rendering code is changed.

New verification files: `tests/fire.spec.ts`, `tests/phase6-browser.ts`, `tests/phase6-review.ts`, `phase6-smoke.html`, `phase6-review.html`, this document, browser report, regression reports and preview image. Test HTML entries are not included in the production build.

## Rendering and sequence

Black flame has two passes over shared curved subdivided geometry: normal-blended charcoal masses and additive soft crimson rims, with minor violet and tiny amber accents. Animated noise advects upward, strips curl in three dimensions, and differing tongue heights break uniform tips. Instance attributes hold position, height, start, role and deterministic seed. No per-frame geometry rebuild occurs. Depth testing stays enabled, depth writing is disabled, and layers have explicit render order.

The hand charge is a small noisy billboard following the actual Rocketbox right-hand bone. The ground ignition starts at 0.18 s; kindling precedes the main eruption at 0.62 s. Secondary pillars start at asymmetric times from 0.80 to 1.34 s. The tall eruption relaxes into a continually moving inferno of shorter pillars and scattered flame pockets.

Radial fuel curves extinguish outer pockets from 4.5–6.1 s and the core from 5.7–7.7 s. Flame height contracts, upper tongues break up, bounded last flare pulses occur and smoke thickens. This changes geometry and structure instead of applying a uniform opacity fade. Smoke, ash and residual water heat survive the visible flames; lights leave at 7.75 s and the managed effect completes at 8.6 s.

Smoke is a single instanced soft-quad system with noisy round masks: fast eruption thrust, slow rolling plumes and low wisps. Four point buffers separate ballistic burst embers, curling rising embers, slow ash and late ground glow. GPU shaders perform motion; fixed typed buffers are reused. Heat distortion is an approximate local warped haze plus procedural water/flame UV motion, **not true scene-color refraction**. It adds no screen-copy pass or renderer change.

Temporary ground overlays contain fissures, hot irregular pools, a subtle darkened residue and camera-aligned broken reflection streaks with heat wobble. They never replace or modify the water plane. Actual transient PointLights illuminate the character and PBR materials; the shader water uses its dedicated reflection overlay. Lights have no shadow maps.

## Quality and measured performance

The existing central budgets 150/400/900 select detail tiers; settings are not duplicated globally. Changes apply to active effects. LOW uses one central/three secondary pillars, ten ground pockets, two layers, twelve smoke instances and one light. MEDIUM uses one/six, twenty-two pockets, three layers, twenty-eight smoke instances and two lights. MAX uses one/nine, thirty-eight pockets, four layers, forty-eight smoke instances and two lights. Approximate shimmer is off/subtle/enhanced.

| Full-cast peak | LOW | MEDIUM | MAX |
| --- | --- | --- | --- |
| Allocated ember/ash points | 150 | 400 | 900 |
| Visible emitter points | 127 | 340 | 765 |
| Body/rim + smoke instances | 68 | 202 | 432 |
| Draw calls, including world/postprocessing | 18 | 36 | 36 |
| Rendered triangles | 20,988 | 65,303 | 131,711 |
| Attached transient lights | 1 | 2 | 2 |
| Median / p95 frame interval | 6.1 / 6.2 ms | 6.1 / 6.2 ms | 6.1 / 6.2 ms |
| Approximate measured FPS | 164 | 164 | 164 |

Measured using real-time requestAnimationFrame intervals over three nine-second casts in the connected browser at **1280×720**. This is a machine/browser observation, not a gaming-hardware guarantee, GPU timing or 1080p/1440p benchmark. The dedicated fire profile was completed before starting old regression suites. Particle values exclude ambient dust; at MAX the HUD includes another 650 environmental points. Smoke is reported under instances. Emitter counts represent active draw ranges, not a readback count of every visible fragment.

## Stress tests and cleanup

The browser suite checks actual V and 5 selection, actual click casting, six-second cooldown mask, Idle/Walk/Run, camera/movement/targeting, all four previous ability selections/casts, X empty, exactly five equipped slots and F3. It verifies hand origin, travelling ignition, pre-eruption smoke, layered pillars, real light, water glow, restrained feedback, lingering inferno, LOW→MAX while lingering, MAX→LOW while extinguishing, lights removed before final residue and smoke/embers outlasting flames. Null/sky targets reject without cooldown and finite ground range clamps to 42 m.

Stress sequences: 20 fire casts with baseline comparisons at 10/20; 20 and 40 alternating Ice→Wind→Lightning→Megiddo→Abyssal casts; 80 rapid rejected attempts. All passed. Both cached bundles of all five abilities and applicable light-count shader variants were warmed before measuring stabilization.

| Warmed MEDIUM counters | Before | After all stress/profiles |
| --- | --- | --- |
| Scene children | 12 | 12 |
| Lights | 0 | 0 |
| Graphics subscriptions | 5 | 5 |
| Active effects | 0 | 0 |
| Geometries | 106 | 106 |
| Textures | 20 | 20 |
| Shader programs | 97 | 97 |
| Draw calls | 25 | 25 |

Cached GPU buffers remain deliberately allocated for reuse between casts. They have no attached root, lights or active updates. On complete Game/resource disposal, renderer memory returns to **zero geometries, zero textures**, with **zero quality subscriptions**. The raw emissive shaders avoid light-count recompilation for new fire materials; standard world/model material variants can compile on first encounters with new light counts.

Full raw evidence: [browser acceptance report](phase6-browser-report.txt). Unit tests: **27 passed** including five fire tests for metadata/cooldown, safe range, quality/capacity, radial extinction and complete lifecycle/subscription reuse. `npm install`, `npm run build` and TypeScript validation succeed. The existing engine chunk size advisory remains a nonfatal build warning.

All previous browser suites were rerun against the five-spell application and passed with empty error/warning console logs: [foundation](phase6-regression-foundation.txt), [human/ice](phase6-regression-ice.txt), [wind](phase6-regression-wind.txt), [lightning](phase6-regression-lightning.txt), [MEGIDDO](phase6-regression-holy.txt). These regression profiles are not used for the isolated fire performance table. A native V keypress and canvas click were also checked in the normal application entry point: V selected correctly, the charge appeared at the hand, ground kindling appeared at the aimed location, and the cooldown counted down.

## Mandatory visual refinement

Reviewed the actual running scene at close, medium and maximum range, multiple camera angles, LOW/MEDIUM/MAX, authored stage freezes and live playback. Four weaknesses were corrected after browser inspection:

1. Initial pillars were too narrow and had uniform tapered tips. Widened black flame masses, softened geometric taper, varied tongue heights and increased upper breakup.
2. Thin internal noise lines read as red wires; accumulating rim layers became too neon. Replaced lines with broad soft heat pockets, softened the edge and normalized brightness by layer count.
3. The first water reflection pointed away from the camera and was too faint. Corrected floor UV orientation, strengthened broken reflection streaks, added heat wobble and a faint temporary charcoal residue.
4. Burn-down needed a more readable aftermath. Retained radial staggered fuel loss and inspected final smoke/embers after all flames and lights leave; rolling smoke becomes stronger during extinction and fades into darkness afterward.

An initial GLSL reserved identifier in the ground material was corrected during development. Fresh final browser tabs have no error/warning console entries. [Preview](phase6-preview.png) shows the refined eruption from the normal gameplay camera.
