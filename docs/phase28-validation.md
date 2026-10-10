# Phase 28 — The Drowned King / Thronebreaker

Implemented ability **30**, after completing [Phase 27 Moonfall verification](phase27-validation.md). The previous 29 ability implementations are preserved. This is a temporary visual summon, with no AI, NPC, combat or damage system.

## Use and configuration

**Tab → Spellbook → search “Thronebreaker” → equip → aim at the ocean → left-click.** The card is in **SHADOW / DARK**, despite its DARK WATER element wording. Favorites and Quick Wheel use the existing selection architecture. No new numeric or Shift shortcut was assigned. Existing shortcuts, WASD, Shift sprint, mouse aiming, P telemetry and F3 Ocean Editor remain available.

- Element: ABYSSAL / CURSED METAL / DARK WATER.
- Range: **70m**, measured horizontally from the cast origin to the selected impact point; finite fallback and range clamp use the existing cast context.
- Cooldown: **30s**, through AbilityManager.
- Lifetime: **17s**; maximum one active King.
- Reference king height: **85m**. The generated resting armor bounds measure **86.39m**, including the uneven crown. The lower body remains submerged during the summon.
- Closed sword geometry: **65m** from grip end to tip; its principal blade reach from the grip is 60m.

The king stands approximately 90m beyond the impact point, facing the player. This composition fits the colossal silhouette in the normal camera and lets the articulated arms and real sword reach the selected point. The impact range is 70m; the complete summon and sea-split footprint extend beyond that point.

`DrownedKing.configure(patch)` exposes 18 typed, finite, clamped controls for king/sword proportions, armor roughness, rust, oxidation, rune brightness/pulse, eyes, crown, cape, water split dimensions/lifetime, spray density and fragment count. Changes apply between casts. No large tuning GUI was added; F3 continues to edit the ocean. Geometry is reused; shape controls use transforms/uniforms rather than rebuilding it per frame.

## Geometry, articulation and material

Nine reusable closed armor geometries drive **67 instanced armor pieces**, plus two narrow eye instances. The armor has **4,292 triangles**, excluding eyes, sword, cape and fragments. Beveled polygon extrusions form shield-like chest plates, overlapping pauldrons, medieval face plates, angular crown prongs and gauntlets. Angular multi-ring lofts form cuffs, forearms and a bascinet-like helmet shell. Concave cap profiles use Three.js polygon triangulation. The meshes are non-indexed, with independent face normals, outward winding, closed caps and valid bounding volumes. Tests check edge incidence, signed volume, triangle area and unit normals.

The sword uses sampled diamond cross-sections, a thick central spine, thin double cutting edges and a tapered tip. Its closed primary mesh has **68 triangles**, plus separate volumetric crossguard and pommel. This deliberately efficient geometry is below the suggested sword triangle budgets; thickness and silhouette are real geometry rather than a billboard or particle substitute.

The transform hierarchy contains torso, helmet/crown, shoulders, elbows, wrists and three joints per finger. Analytic two-bone IK uses 21m upper arms and 21m forearms, with stable outward elbow bending and quaternion orientation. Both palms follow attachment pivots derived from the same sword frame; articulated fingers curl around the handle. Tests verify the pivot alignment throughout wind-up and execution, and actual sword-tip contact with sampled moving water, including different king/sword sizes.

Opaque MeshStandardMaterial retains Three.js physical lighting and normal handling under nonuniform instance scaling. Shader injection adds local-space simplex `snoise`, `fbm3`, ridged noise, fine directional scratches, pits, rust and blue-green oxidation. MAX adds a bounded 3×3 Voronoi corrosion neighborhood. Thin angular distance-field glyphs are engraved into the steel and receive restrained traveling/pulsing teal emission. View-dependent edge accents remain weak; the body stays dark metal. The sword reveals progressively from the grip toward the tip while physical fragments converge, with a charge front along its central fissure.

The torn cape is a 28×22 procedural grid with irregular lower edges, shader holes, bounded GPU billowing and approximate analytic normals. It remains attached near the shoulders while its length changes. It is a visual cloth approximation, without a physics solver.

Existing attributed GLSL utilities in `frostLance/FrostLanceNoise.ts` are reused; their existing MIT/Ashima notices remain intact. No external king model or new dependency was downloaded, and no donor engine or old spell was copied over.

## Timeline

| Time | Visible phase |
| --- | --- |
| 0–1.5s | Ocean awakening around the summon and aimed impact point |
| 1.5–4s | Hands and armored torso emerge; crown, eyes and cape become readable |
| 4–6s | Angular metal fragments converge; runeblade assembles progressively |
| 6–8s | Two-handed wind-up across the upper frame; sparse runes charge |
| 8–9s | Weighted downward execution, both hands following the sword |
| 9–11.5s | Tip strikes sampled water; directional spray, fragments and two water walls |
| 11.5–14.5s | Armor pieces loosen, rotate, separate and sink; cape withdraws |
| 14.5–17s | Residual particles, foam and disturbances fade; complete removal |

One short impact camera impulse remains restrained. An optional smoothly expiring framing request adds up to approximately 8° upward framing and 8° FOV for the colossal silhouette. Mouse controls remain active and both offsets return to their normal values. The existing two-argument Moonfall framing request remains compatible.

## Ocean interaction

The original Gerstner ocean, reflection renderer, material and quality controls are preserved. The existing water interaction API now accepts **four bounded source-owned line-split slots**. A signed-distance field depresses the center of the strike corridor and raises its shoulders, with end taper and lifetime decay. CPU height sampling and GPU displacement share the same calculation; the shader also contributes the analytic cross-corridor gradient to existing normals/foam/reflection shading.

Default corridor length is **105m**, width parameter **9m**, surface depression **2m**, duration **3.7s**. Two separate closed, six-point cross-section water-wall volumes provide the larger **18m** visual surge, with longitudinal curvature, tapered ends, irregular crests and procedural foam. They are not a replacement ocean simulation or a solid filled blue explosion. Target-localized whirlpool detail, awakening/hand/impact ripples, GPU spray and the existing droplet infrastructure complete the reaction. All disturbances are removed by owner at completion.

## Quality and measured runtime

| Default preset | GPU particle budget | Metal fragments | Wall segments | Temporary light | Peak draw calls | Peak triangles | Peak instances |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| LOW | 900 | 48 | 48 | Disabled | 34 | 23,040 | 117 |
| MEDIUM | 2,400 | 120 | 80 | One | 81 | 77,011 | 189 |
| MAX | 5,400 | 240 | 120 | One | 81 | 122,259 | 309 |

These are actual complete-scene browser peaks, including ocean and reflection passes, not isolated spell mesh counts. Armor and sword silhouettes are preserved on every preset. Shader noise, spray, fragments, wall detail, temporary lighting and existing ocean/reflection quality change centrally. Two fixed GPU particle layers use at most 6,000 slots; no per-grain Mesh or per-frame buffer growth occurs. Four instanced fragment variants share geometry/materials and animate through bounded arrays.

Latest full real-time browser RAF interval samples:

| Preset | Median | 95th percentile | Maximum |
| --- | ---: | ---: | ---: |
| LOW | 6.1ms | 6.4ms | 721.5ms |
| MEDIUM | 6.1ms | 6.4ms | 25.9ms |
| MAX | 6.1ms | 6.7ms | 910ms |

The large LOW/MAX maximum intervals occurred in fresh shader runs following material refinement. **Cold first-use compilation can visibly pause playback.** These RAF intervals are browser scheduling observations, not GPU timings or a guaranteed gameplay FPS. Prior warmed runs had maximum intervals of 28–50ms. This implementation does not add an asynchronous prewarming system; cold shader startup remains a limitation.

## Lifecycle and verification

Each cast leases one cached EffectManager bundle. Completion removes its root, temporary light, quality subscription, particle activity and every owned ripple/split. Geometries/materials remain in the bounded detached cache for reuse; ability/game disposal destroys them. There are no timeline timers, permanent lights or per-cast event callbacks. Shared geometry is not disposed while an active instance uses it.

Actual browser checks passed LOW, MEDIUM and MAX: all eight phases played naturally at real time, finite buffers, Spellbook search/equip, favorites/wheel, world left-click, 30s cooldown, 100 rejected rapid attempts, natural expiry, WebGL NO_ERROR, Walk/Run/Idle, live targeting/camera, F3 and all quality buttons. MAX additionally passed **three sequential controlled casts**, each finishing before the next. These extra casts used accelerated controlled timeline stepping, rather than three full 17-second real-time runs. All returned exactly to the warmed baseline:

```json
{"objects":106,"lights":0,"materials":7,"geometries":29,"textures":21,"programs":32,"subscriptions":5,"particles":0,"effects":0,"ripples":0}
```

The material count describes scene-referenced materials, excluding the detached reusable cache. Full game disposal returned GPU geometries/textures and quality subscriptions to zero. Browser console/shader inspection was clean. Raw evidence: [LOW](phase28/browser-low.txt), [MEDIUM](phase28/browser-medium.txt), [MAX and sequential cleanup](phase28/browser-max-stress.txt).

The [Spellbook/ocean regression](phase28/ui-ocean-regression.txt) also passes: overlay input isolation, search/equip without casting, wheel dead zone and cancellation, keyboard/mouse confirmation, cooldown display, preserved running effects, movement/sprint, F3 uniform editing, all presets and 15 live parameter/quality switches with stable scene/GPU/subscription counts. Original Glacial/Tempest favorites were restored after testing. The playable browser is left with Thronebreaker equipped.

`npm install`, strict TypeScript and production build pass. The full automated suite passes **98 tests**, including nine new King tests. The production build retains the existing large-bundle advisory; it is not a build failure. `git diff --check` passes. Representative browser regressions passed on both [LOW](phase28/regression-low.txt) and [MAX](phase28/regression-max.txt): Glacial Eruption, Tidal Sovereign, Kraken Crown, Prism Ravenstorm, Frost Lance, Sand Reaper, Dragonfire, Astral Chainstorm and Abyssal Moonfall. These cover selection, casting/cooldown, finite geometry, natural completion, scene/light/subscription/water cleanup and WebGL state. Runtime coverage does not mean every old spell was individually visually inspected.

## Rendered evidence

Actual browser-rendered stage views were inspected in addition to full real-time playback:

- [LOW hands-first emergence](phase28/low-emergence.png)
- [MEDIUM forging from a second angle](phase28/medium-forging-side.png)
- [MAX normal-camera wind-up](phase28/max-windup.png)
- [MAX normal-camera execution impact](phase28/max-impact.png)
- [MAX sea split from the side](phase28/max-sea-split-side.png)
- [MAX sinking armor collapse](phase28/max-collapse.png)
- [Spellbook subtitle search and SHADOW / DARK category](phase28/spellbook-thronebreaker.png)

Stage screenshots freeze authored effect time for inspection; they are not frame-time benchmarks. The cape is intentionally very dark and partially occluded from the front. Physical armor remains deliberately angular and procedural rather than an externally authored AAA character asset. Water walls are bounded VFX volumes, not fluid simulation. Close camera angles can still crop a colossal sword; the player retains camera control.

## Files

New ability modules in `src/abilities/drownedKing/`:

- `DrownedKing.ts` — metadata, targeting, tuning, one active lease.
- `DrownedKingConfig.ts` — controls, bounds, phases, central quality mapping.
- `DrownedKingGeometry.ts` — closed armor/helmet/sword/shard construction.
- `DrownedKingMaterial.ts` — physically lit steel, corrosion, glyphs, reveal.
- `DrownedKingRig.ts` — articulated hierarchy, fingers, two-bone IK, instanced armor.
- `DrownedKingCape.ts` — torn procedural cloth and GPU billow.
- `DrownedKingSword.ts` — assembly, shared hand pivots, quaternion execution, fragments.
- `DrownedKingOcean.ts` — closed water walls and localized whirlpool detail.
- `DrownedKingParticles.ts` — bounded analytic GPU spray/rust/rune layers.
- `DrownedKingEffect.ts` — phase coordination, water ownership, framing and cleanup.

New validation files: `tests/drowned-king.spec.ts`, `tests/drowned-king-browser.ts`, `drowned-king-review.html`, this report and `docs/phase28/` evidence. Phase 27 evidence/report was also completed before implementation.

Shared files modified: `src/abilities/Ability.ts`, `src/game/CameraController.ts`, `src/game/Game.ts`, `src/ui/SpellCatalog.ts`, `src/ui/SpellIcon.ts`, `src/world/DarkWater.ts`, `src/world/water/WaterInteractionManager.ts`, `src/world/water/WaterWaveField.ts`, `README.md`. Existing browser harness counts were updated in `tests/audit-browser.ts`, `tests/chainstorm-browser.ts`, `tests/moonfall-browser.ts` and `tests/phase25-browser.ts`; the ocean audit additionally includes Chainstorm/Moonfall regressions.

No agent commit, push, PR, deployment or history mutation was performed. External commits appeared while validation was underway, including Phase 27 and `ce0fa9d` (Drowned King); they were preserved. Documentation/evidence changes remain local unless that separate process records them.
