# Phase 23 — Frost Lance: Original Glacial Eruption

## Implementation and source provenance

Ability **26**, **FROST LANCE**, subtitle **ORIGINAL GLACIAL ERUPTION**, selects with **Shift+6** or its existing-style HUD card. Left-click casts. Normal **6** remains Worldrend; **Q/1** remains Glacial Eruption. The roster contains 26 registrations. All previous ability implementations, Phase 22 fixes, movement, camera, targeting, player animations and persistent water sources are unchanged.

The initial working tree was clean on `main` at `c0988e0`. No commit, push, pull, PR or deployment was performed.

The seven older source snapshots supplied by the user were read from the named Temp files and copied into `frost-lance-donor-sources/` as references. They are restored copies, not a verified historical Git commit. Their SHA-256 hashes are recorded in `sha256.json`. Only the needed algorithms enter the TypeScript runtime; the donor engine, unrelated geometry generators, damage and minion systems are not imported.

The missing scalar hash dependency was verified against the donor's small `src/utils/math.js` helper and retained as a local reference. The [actual repository MIT license](https://raw.githubusercontent.com/achrefelouafi/LinearAbilityExtThreeJS/main/LICENSE) was verified: Copyright (c) 2026 mohamedachrefelouafi. The existing full notice in `public/licenses/LinearAbilityExtThreeJS.txt` now explicitly covers the Ice port and supplied snapshots. Adapted modules retain attribution; the supplied simplex implementation's Ashima / Stefan Gustavson credit is retained.

## Source fidelity

**Retained algorithms and defaults:**

- Ground-anchored, captured straight line with a 2.5 m minimum and 15 m maximum range. The fracture front advances at 26 m/s, with the donor's initial 0.08-second outQuad acceleration.
- Unitless per-cast records: along/lateral/scatter, radial endpoint layout, angle, rubble, height/radius/lean/pitch jitters, yaw, stagger, eruption time and breach flag. `pitchJitter` remains reserved/unused as in the supplied update path.
- Original width interpolation: 0.55→2.5 half-width, exponent 0.75; lateral clumping/scatter; front bias 0.85. Height 0.5→3.1, exponent 1.7, endpoint peak 1.45 over the last 28%, crown weighting, jitter and 42% short rubble.
- Three non-indexed faceted crystal geometries at seeds **7.3, 29.0, 50.7**. The five ring heights, radius profile, ring jitter, vertical wobble, bending, asymmetric apex, triangle assembly and closed underside are retained. Instance scale follows the donor's `(radius, height, radius)` convention; the unit base ring has radius approximately 0.5.
- Instance attributes `aSeed` and `aBirth` use the correct instance divisor and 96 slots per variant. Geometry is built once per cached bundle. Seed and variant assignments remain stable across live LOD changes.
- A 0.17-second outQuint rise, 0.09-second stagger, 0.26 overshoot and damped 14-radian/s spring with 0.55-second settle. The solid geometry slides upward rather than simply growing from nothing.
- Roughly 22% of the default field is held for the endpoint: **42 of 190 records**. Endpoint positions use uniform disk sampling via sqrt(random), with independent height/radius/lean variation.
- The field stands for 3.6 seconds after impact, waits another 0.6 seconds, then sinks with the donor's inCubic withdrawal over 1 second. At maximum range, crystals finish around 5.8 seconds after casting.
- The source **0.4-second cooldown** remains. Two complete live casts are the hard safety limit. A third rejects cleanly without starting a new cooldown, even if the HUD cooldown is ready.

The material remains **MeshStandardMaterial**, roughness **0.16**, metalness 0, flat shading, transparent, DoubleSide and depthWrite enabled. The source geometry roughness **0.09** is a separate shape control. Its onBeforeCompile patch retains thickness tint, world-space ridged fractures, local-axis feather frost/veins, base rime, facet contrast, pinpoint glints, normalized Fresnel rim, internal glow, birth flashes, opacity and emissive rolloff. Colors and shader tuning come from the supplied `settings.ice`, with neutral donor global multipliers. Only the required simplex/fbm3/ridged helpers are included. Standard scene lighting, fog, shadows and rendering conventions remain active.

**Necessary adapters:**

- Existing Ability/EffectManager composition replaces the donor base engine and global phase manager. Existing ground targeting supplies the line; no second raycaster is created. Invalid, sky, too-close and overflowed targets reject safely.
- The donor environment registration wrapper becomes a minimal ice-specific standard-material patch and stable program cache key. Reverse-edge GLSL smoothstep for base rime is written in its defined equivalent form. The donor HDR stage/probe and cast3 character clip are not copied; current scene lighting and Idle/Walk/Run remain in place.
- Particle calls use three bounded local instanced GPU ring buffers, following the sandbox's existing GPU-buffer approach. Source rates, capacities, palettes, breach probability and endpoint burst composition are retained/scaled. Their analytic drag, turbulence, billboards and real angular shard meshes replace the absent donor particle engine; these trajectories are not claimed to be a byte-identical port of that engine. Mist is kept low over the water, avoiding a large hovering cloud after withdrawal.
- Donor frost/decal/burst calls become an owned 80-slot temporary rime/ring overlay, vapor shell and short pale impact flash. The shockwave keeps the 5.5 m radius/.75 s tuning and draws after rime for legibility. Existing water ripple handles are source-owned and removed on release. The persistent water simulation/renderer is unchanged.
- The original global camera shake gains are mapped to this camera's restrained feedback units. No locomotion or player rotation override is introduced.
- Residual particles and rime remain managed until they finish, roughly 10 seconds at maximum range. The donor instead lets its global particle/decal systems outlive the crystal ability. This ownership adaptation preserves the lingering composition while ensuring teardown.

## Quality and capacity

| Preset | Main crystals | Particle emission factor | Mist / shard / glitter buffer ceilings | Ice / shadows / light |
|---|---:|---:|---|---|
| LOW | 80 | 32% | 500 / 500 / 600 | Reduced fracture/vein strength; no crystal shadows or dynamic light |
| MEDIUM | 140 | 65% | 1600 / 1300 / 1600 | Full source shader detail; preset shadows and temporary light |
| MAX | 190 | 100% | 3200 / 2400 / 2800 | Full source tuning; preset shadows and temporary light |

All presets retain three variants, the complete widening footprint, endpoint reservation and identical timing. LOD samples the whole source layout rather than truncating its far end. Source spikeCount/density can be configured up to **288**; the layout, quality result and instance writes remain clamped. The 288-record configuration was exercised by an automated geometry/instance test; normal browser playback uses the source default 190 on MAX.

Two visual bundles are cached lazily. Each has nine owned geometries and seven materials (one ice material shared by all three main meshes, three particle materials, three water/burst/flash materials). The overlap test verified 14 added scene materials for two casts. Normal expiry removes scene roots, lights, quality subscriptions and owned water handles. Cached GPU resources intentionally remain bounded; ability/Game disposal destroys them all. No emitter callbacks or animation intervals are created.

## Actual browser verification

The final [LOW](phase23-low-realtime.txt), [MEDIUM](phase23-medium-realtime.txt) and [MAX](phase23-max-realtime.txt) reports exercise **Frost Lance and Glacial Eruption at real playback speed** through the actual Game input, targeting and render loop. All pass: Shift+6/Q selection, HUD selection, click cast, cooldown rejection, finite transforms/geometry, instance bounds, natural completion, scene/light/subscription/water cleanup and WebGL error checks. Final warning/error logs were empty.

Manual normal-gameplay actions also selected Frost Lance with Shift+6 and cast with a canvas click. A subsequent normal 6 press selected Worldrend, verified from its aria-pressed state. The local human model stayed visible and animated. Staged normal/side review inspected early progression, full formation, endpoint shell/ring, standing ice and withdrawal; these are generated source-layout samples rather than footage of the inaccessible donor build.

Visual evidence: [advancing front](phase23-front.png), [MAX field](phase23-frost-lance-max.png), [endpoint shockwave](phase23-impact.png), [withdrawal](phase23-withdrawal.png), [finished water](phase23-expired.png). The final [26-ability regression](phase23-all-max-regression.txt) covers all previous registrations plus Frost Lance. The original Glacial Eruption source directory has no diff.

The final [MAX stress report](phase23-max-stress.txt) warms two bundles, performs **20 Frost Lance casts**, tests two-field overlap, rejects a third ready-cooldown cast, checks 100 rapid cooldown attempts, Walk/Run/Idle, camera/aim, debug/telemetry and live graphics changes. After twenty casts, the warmed counts return exactly to **106 scene objects, zero temporary lights, five persistent subscriptions, zero active effects/ripples, 29 geometries, 21 textures and 42 programs**. These counts include the small set of other spells used to warm the harness. Full Game disposal returns geometries, textures and subscriptions to zero.

## Performance observations

Measured in the available in-app browser at **1280×720**, without GPU timer queries or a native desktop-driver profile. Renderer draw calls/triangles include reflection, shadow and postprocessing passes. No hardware FPS guarantee or VRAM-byte measurement is claimed.

| Preset | Peak crystals | Peak live FX particles | Peak draw calls | Peak triangles | p95 RAF interval |
|---|---:|---:|---:|---:|---:|
| LOW | 80 | 278 | 20 | 29,736 | 6.3 ms |
| MEDIUM | 140 | 673 | 58 | 132,783 | 6.6 ms |
| MAX | 190 | 1,231 | 58 | 216,111 | 6.4 ms |

Numbers reflect these stochastic casts, not fixed worst-case particle occupancy. Buffer ceilings are not all drawn at once. Initial cache creation increases renderer counts once; the warmed repeated-cast comparison is the meaningful leak check. No freeze, shader compile failure or WebGL context loss was observed. This does not resolve the previously reported native Kraken issue or replace a long hardware soak test.

## Files and checks

New runtime modules in `src/abilities/frostLance/`: `FrostLance.ts`, `FrostLanceEffect.ts`, `FrostLanceConfig.ts`, `FrostLanceField.ts`, `FrostLanceGeometry.ts`, `FrostLanceMaterial.ts`, `FrostLanceNoise.ts`, `FrostLanceParticles.ts`, `FrostLanceWater.ts`.

Shared integration changes: `Game.ts` registration, `AbilitySlot.ts` Shift+6 data, optional `Ability.subtitle` metadata, `AbilityBar.ts` local ice icon/title, `HUD.ts` controls/caption/subtitle. The Phase 22 audit fixture now expects 26 slots and checks Shift+6 versus normal 6; its browser runner adds Frost-specific realtime/stress paths. No renderer, player, camera, targeting, graphics-system or persistent-water source was rewritten.

New `tests/frost-lance.spec.ts` verifies exact donor geometry positions/normals for all three variants, source formulas, endpoint counts, spring emergence, 288 capacity, material tuning, quality limits, target rejection/clamping, twenty-cast reuse and the two-cast ceiling. Node built-in fs/vm comparison tests required development-only `@types/node` (plus its transitive types); no new runtime dependency was added.

- `npm run build`: PASS, including production TypeScript. The existing >500 kB bundle warning remains nonfatal.
- Independent strict TypeScript for new tests/browser harness: PASS.
- `npm test`: **66 passed**.
- `git diff --check`: PASS.
- Actual browser casts/GLSL/cleanup/controls: PASS in the available browser, with the limits above.

Run `npm run dev`, then `/audit.html?quality=LOW&frost&realtime` (or MEDIUM/MAX). `/audit.html?quality=MAX&frost&stress` runs stress acceptance. `/audit.html?quality=MAX` runs the complete roster. `/audit-review.html?slot=25` provides stage/range/angle controls. These pages remain excluded from the production entry.
