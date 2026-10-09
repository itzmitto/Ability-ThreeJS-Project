# Elemental Sandbox — Phase 23

A browser-based Three.js sandbox with a dark reflective water arena, an animated human male in everyday clothes, and 26 registered elemental/fantasy abilities. The existing architecture, controls, player and HUD remain in place. There are no enemies, health/damage systems, NPCs, inventory or quests. All runtime assets are local.

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
