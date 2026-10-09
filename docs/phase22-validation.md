# Phase 22 — existing-spell audit

## Repository

Audited on 2026-10-09 in `Ability-ThreeJS-Project 2`. The initial working tree was clean, on `main`, tracking `origin/main` at `011782a` (`feat(dragonfire): add Dragonfire ability with effects and UI integration`). A successful `git fetch origin` confirmed zero commits ahead or behind. The remote is `https://github.com/itzmitto/Ability-ThreeJS-Project.git`.

All 24 explicitly listed work-laptop abilities exist and are registered. Dragonfire also exists: **25 actual registered abilities**. Snowsquall is absent from both the synchronized implementation and registrations; it remains a proposed ability, not an invented replacement. No commit, push, merge, dependency change, or new ability was made.

## Confirmed repairs and visual changes

- **Incorrect stretched normals:** spell shaders used ordinary matrix multiplication for normals despite nonuniform instance scaling. `NormalTransform.ts` supplies scale-compensated inverse-transpose normals without a per-vertex inverse. Applied to shared debris, earth, blood, cryo, solar, clock, Cathedral, Arsenal and Deluge materials. Shader-driven blade growth is compensated too. The helper assumes rotation/scale without shear, matching these instances.
- **Material warnings:** dust and mist passed `undefined` as blending. Explicit normal blending removes repeated Three.js warnings; additive particle layers remain additive.
- **Soft shared shards:** shared indexed debris averaged normals across faces. Independent triangle vertices now retain hard facets.
- **Ravenstorm launch clipping:** tip-anchored, full-length projectiles extended behind the hand through the player and camera. Their tails now unfold as they clear the hand. Full flight size, five faceted pointed variants, colors, choreography, targets and **120/260/500 shots** remain intact.
- **Prismatic Cathedral:** lowered uniform white fill, narrowed the reflection band and restrained moving energy/vein brightness. Facets and colored edges are more legible.
- **Cryo Collapse:** thinner broken ring cross-sections and directional blue facet lighting replace thick uniformly white ring blocks. Frozen-core identity and timing remain intact.
- **Tidal Sovereign:** phase-warped flow and interrupted foam islands reduce repetitive white stripes and aggressive micro-normal patches. Only the temporary water spell material changed; the persistent dark water renderer is preserved.
- **Kraken CPU work:** cached the constant twelve-step unit reach integration instead of repeating it for every tentacle every frame. Organic meshes, motion, skin, suckers and the existing MIT attribution remain intact. Explicit `forceSinglePass` documents the intended material behavior, but Three.js already defaults ShaderMaterial to single pass: **this flag did not reduce draw calls**.
- **HUD obstruction:** retained the cards, icons, names, bindings and controls, but compacted the existing 25-slot bar into two rows at desktop widths. Bounds fit 1920×1080 and 2560×1440 without horizontal overflow. Original viewport sizing was restored after validation.
- **Stale test:** the original nine-slot regression asserted that the complete slot list still had nine entries. It now verifies the first nine bindings, with a separate 25-slot/modifier regression.

Representative before/after browser images: [Ravenstorm before](phase22-ravenstorm.png) / [after](phase22-ravenstorm-refined.png), [Cathedral before](phase22-cathedral.png) / [after](phase22-cathedral-refined.png), [Cryo before](phase22-cryo-collapse.png) / [after](phase22-cryo-refined.png), [Tidal before](phase22-tidal-sovereign.png) / [after](phase22-tidal-refined.png).

## Ability status

**PASS means actual browser functional validation, not a blanket visual-production certification.** Each entry passed keyboard selection, HUD selection, click cast through the existing input/targeting path, cooldown rejection, finite geometry and instance bounds, natural completion, scene/light/subscription/water cleanup, and WebGL error checks in LOW, MEDIUM and MAX. Representative staged MAX images were inspected; this is not an exhaustive every-angle/every-frame artistic review.

Kraken is marked PARTIAL for the overall audit because the reported native home-PC freeze remains unresolved, despite passing every available-browser check.

| Binding | Ability | Runtime status | Visual evidence |
|---|---|---|---|
| Q / 1 | Glacial Eruption | PASS | [Crystals](phase22-glacial-eruption.png) |
| E / 2 | Tempest Break | PASS | [Wind flight](phase22-tempest-break.png) |
| R / 3 | Heaven's Verdict | PASS | [Strike](phase22-heavens-verdict.png) |
| F / 4 | MEGIDDO | PASS | [Light sequence](phase22-megiddo.png) |
| V / 5 | Abyssal Flame | PASS | [Flame](phase22-abyssal-flame.png) |
| X / 6 | Worldrend | PASS | [Rift](phase22-worldrend.png) |
| C / 7 | Tempest Cataclysm | PASS | [Dragon](phase22-tempest-cataclysm.png) |
| B / 8 | Sanguine Eclipse | PASS | [Blood](phase22-sanguine-eclipse.png) |
| N / 9 | Spectral Break | PASS | [Beam side view](phase22-spectral-side.png) |
| G / 0 | Earthbreaker | PASS | [Rock](phase22-earthbreaker.png) |
| H | Tidal Sovereign | PASS | [Refined foam](phase22-tidal-refined.png) |
| J | Glass Tempest | PASS | [Glass](phase22-glass-tempest.png) |
| K | Gravity Crush | PASS | [Gravity](phase22-gravity-crush.png) |
| L | Worldroot | PASS | [Roots](phase22-worldroot.png) |
| M | Cryo Collapse | PASS | [Refined core](phase22-cryo-refined.png) |
| U | Thunderlance | PASS | [Spear side view](phase22-thunderlance-side.png) |
| I | Solar Nova | PASS | [Solar core](phase22-solar-nova.png) |
| O | Heavenly Arsenal | PASS | [Sword array](phase22-arsenal.png) |
| Y | Prismatic Cathedral | PASS | [Refined facets](phase22-cathedral-refined.png) |
| Z | Seraphic Deluge | PASS | [Sword rain](phase22-deluge.png) |
| Shift+1 | Shadow Colossus | PASS | [Hands](phase22-shadow-colossus.png) |
| Shift+2 | Chrono Fracture | PASS | [Clock](phase22-chrono-fracture.png) |
| Shift+3 | Kraken Crown | PARTIAL — browser passes; reported native freeze unconfirmed | [Tentacles](phase22-kraken-crown.png) |
| Shift+4 | Prism Ravenstorm | PASS | [Refined launch](phase22-ravenstorm-refined.png) |
| Shift+5 | Dragonfire | PASS | [Flame stream](phase22-dragonfire.png) |

## Browser tests and cleanup

The final [LOW report](phase22-all-low-final.txt), [MEDIUM report](phase22-all-medium-final.txt), and [MAX/stress report](phase22-all-max-final-stress.txt) each contain all 25 spell results and raw measurements. Final browser warning/error logs were empty. No GLSL compile failure, WebGL error, context loss, or freeze was observed. There was no reproduced runtime shader compile bug to claim as fixed.

The browser harness runs real Game input/rendering, with controlled effect timeline stepping for the all-spell regression. Kraken additionally ran through its full real-time lifetime in each preset: [LOW](phase22-kraken-low-before.txt), [MEDIUM](phase22-kraken-medium-before.txt), [MAX](phase22-kraken-max-before.txt). Those pre-repair runs also did not freeze.

MAX stress warmed renderer caches, then cast Kraken ten times and Ravenstorm ten times, followed by controlled overlap and 100 rejected cooldown attempts. After each repeated-cast series, counts returned exactly to **106 scene objects, zero temporary lights, five persistent settings subscriptions, zero active effects/ripples, 171 geometries, 21 textures and 116 programs**. Bounded caches intentionally survive normal effect expiry. Full Game disposal returned geometries, textures and settings subscriptions to zero. This establishes stable counts over these runs, not a byte-level heap/VRAM leak proof or an hours-long soak test.

The overlap run also passed Walk, Run, return to Idle, camera orbit/aim changes, P telemetry, T ground marker, F3 debug updates, and live LOW/MEDIUM/MAX menu switching. The normal settings panel and sensitivity slider were checked interactively. Existing unit tests cover movement/range validation and several live spell-quality transitions.

## Measurements

Final browser regressions used **1280×720**, not the 1920×1080 screenshot viewport. These figures belong to the available in-app browser; no GPU model, GPU timer query, or native home-PC graphics-driver trace was captured. CPU render-submission timings are not GPU timings. The harness performs an extra controlled render/update, so these numbers should not be advertised as normal gameplay benchmarks.

| Spell / preset | Peak draw calls | Peak triangles | p95 RAF interval | p95 explicit effect update |
|---|---:|---:|---:|---:|
| Kraken LOW | 21 | 33,642 | 6.3 ms | 0.2 ms |
| Kraken MEDIUM | 57 | 135,139 | 6.3 ms | 0.3 ms |
| Kraken MAX | 57 | 254,387 | 6.3 ms | 0.4 ms |
| Ravenstorm LOW | 16 | 18,328 | 6.3 ms | 0.2 ms |
| Ravenstorm MEDIUM | 49 | 72,479 | 6.4 ms | 0.2 ms |
| Ravenstorm MAX | 35 | 91,241 | 6.4 ms | 0.3 ms |

Draw calls include shadow/reflection passes and depend on visibility and update cadence, so they need not rise monotonically with quality. Before/after Kraken MEDIUM peak calls/triangles remained 57/135,139. No unsupported FPS uplift or GPU-time reduction is claimed from the small CPU cache repair. Per-spell CPU/submission/RAF maxima and resource counts are retained in the raw reports.

## Files and reproduction

- Shared helper: `src/effects/NormalTransform.ts`.
- Materials: `elemental/PackVisuals.ts`, `elemental/ElementalVisuals.ts`, `elemental/AstralVisuals.ts`, `earth/EarthMaterials.ts`, `blood/BloodMaterialSystem.ts`, `cryo/CryoMaterials.ts`, `solar/SolarMaterials.ts`, `chrono/ClockMaterials.ts`, `heavenlyArsenal/CelestialSwordMaterial.ts`, `seraphicDeluge/SwordRainMaterials.ts`, `prismaticCathedral/CrystalMaterials.ts`, `water/WaterMagicMaterials.ts` (under `src/abilities/`).
- Animation/geometry: `cryo/FrozenSphere.ts`, `prismRavenstorm/PrismProjectileSystem.ts`, `kraken/KrakenTentacleRig.ts`; explicit Kraken material single-pass safeguard in `kraken/KrakenMaterial.ts`.
- UI: `src/ui/HUD.ts`, `src/styles/game.css`. Existing AbilityManager, Game composition, player, camera, targeting and persistent water sources remain unchanged.
- Validation: `audit.html`, `audit-review.html`, `tests/audit-browser.ts`, `tests/audit-review.ts`, `tests/audit.spec.ts`, and the narrow assertion repair in `tests/spectral.spec.ts`; evidence files in this directory and README audit summary.

`npm test`: **61 passed**. `npm run build`: passed, including production TypeScript. Independent strict TypeScript checking of the new development harnesses also passed with Vite client types. Vite's existing >500 kB chunk warning remains; it is a size warning, not a runtime/compiler failure.

Run `npm run dev`, then open `/audit.html?quality=LOW`, `/audit.html?quality=MEDIUM`, or `/audit.html?quality=MAX&stress`. For unaccelerated Kraken playback use `/audit.html?quality=MAX&kraken&realtime`. `/audit-review.html` exposes stage, range, angle and playback controls for manual review. These pages are excluded from the production build entry.

## Remaining work

1. **Reported home-GPU Kraken freeze remains unconfirmed.** Reproduce in the user's normal desktop browser at the exact failing preset/resolution; capture GPU/driver/context-loss information and the failing stage before changing shader or animation behavior. The available-browser results cannot certify every driver or hardware path.
2. Longer native-browser soak tests and GPU timing at 1080p/1440p are still needed before making hardware performance guarantees. Repeated-cast browser stress here concentrated on Kraken and Ravenstorm, not ten or twenty casts of every spell.
3. Large close-range ultimates can still extend outside the normal camera frame. Tidal Sovereign remains a stylized procedural wave rather than a fluid simulation. Strong light spells retain deliberate bloom. Representative visual review does not establish final art approval for every stage/angle; further refinement should be based on concrete gameplay captures, preserving spell identities.
4. The existing production bundle size warning can be addressed separately with measured lazy-loading needs; no unrelated loader/architecture rewrite was introduced in this audit.
