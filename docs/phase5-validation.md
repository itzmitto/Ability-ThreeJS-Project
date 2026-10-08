# Phase 05 — MEGIDDO validation

Exactly one ability was added: **MEGIDDO**, LIGHT, F/4. Q Glacial Eruption, E Tempest Break and R Heaven's Verdict retain their implementations. V/X remain empty. No other gameplay systems or runtime dependencies were added.

## Numerical behavior and choreography

- Cooldown 8 seconds; range 50 metres from the player; lifetime 6.8 seconds.
- Invalid/null ground hits reject without consuming cooldown; finite hits clamp through the existing cast context. No second raycaster.
- 0–1.15 s: animated right-hand channel, small geometric rings, spiral strokes and orbiting motes. Bone location is refreshed only during this stage.
- 0.16–0.60 s: sacred mark reveals to 6.6 m, with nested polygons, optical guides, glyph strokes and interrupted outer ticks.
- 0.42–1.10 s: faceted high prism/lens array gathers at 23–25.8 m. Lower echoes at 5.8–8.8 m show convergence within the ordinary gameplay camera. Local blue/gold shafts provide atmospheric buildup.
- 1.30 s: strongest central strike. 1.53/1.59 s: side pair. 1.83 s: rear accent. 2.06/2.13/2.20 s: rapid triple. MAX includes outer accents at 1.69/1.97/2.25/2.30 s. The center finisher is 2.46 s. LOW retains central, side pair, rear and finisher; MEDIUM retains the triple too.
- Beams have 22 ms descent and 0.19–0.34 s durations, separate anticipation/sustain/fade/afterimage phases. Bright white inner core, champagne body, narrow diffraction filaments, downward optical packets, pale blue halo and wider atmospheric shaft use batched custom strips.
- Each impact adds a surface flash, thin fast ripple reaching 10 m, slower broad disturbance, broken camera-aligned reflection, ballistic motes and soft mist.
- Transient 3D impact and camera-side fill lights detach by 2.95 s. Camera impulse is at most .0028 radians for .16 s, distance-attenuated and triggered once.
- Holy dust rises slowly; impact particles travel outward under drag and fall; mist expands softly; tiny faceted fragments spin and drift separately. Residual marks/optical echoes fade from 4.4 to 6.8 s.

Water interaction uses temporary transparent overlays. The existing dark-water shader, world lights, composer, exposure and bloom remain intact. Optical warping is a shader approximation, not a scene-color refraction pass. Additive surfaces use depth testing, disable depth writing and have bounded render order and soft analytic edges.

## Quality and batching

| Layer | LOW | MEDIUM | MAX |
| --- | ---: | ---: | ---: |
| Strikes | 5 | 8 | 12 |
| High prism/lens pairs | 5 | 8 | 12 |
| Lower echoes | 3 | 5 | 9 |
| GPU dust/burst/mist points | 150 | 400 | 900 |
| Mist subset | 8 | 16 | 28 |
| Faceted fragments | 12 | 28 | 48 |
| Lights | 1 | 2 | 2 |
| Optical warping | off | subtle | enhanced |

The existing GraphicsSettings effect budget selects one shared implementation. Fixed typed arrays hold at most 12 strikes and 48 fragments. Three particle buffers plus instanced geometry replace per-particle meshes. Shader programs are GLSL 3 raw emissive programs: their cache keys do not vary with transient scene lights. Per-frame work updates uniforms and reused vectors, not geometry or timers.

A two-bundle pool permits bounded development overlap; normal gameplay requires only one because cooldown exceeds lifetime. Expiry detaches the entire root, removes lights, resets intensity and unsubscribes exactly once. Cached resources remain fixed between casts, with no rendering or updates while dormant. EffectManager disposes active instances before ability pool disposal destroys geometry/materials/lights. No textures are created for this spell.

## Mandatory visual refinement

The first browser render was inspected before refinement. Three weakest aspects were identified and improved:

1. Thin ground lines disappeared at distance. Derivative-aware line widths now keep polygons and glyphs readable. Browser testing caught the initial GLSL 1 derivative incompatibility; the new shader helper was explicitly migrated to GLSL 3 and retested with clean console output.
2. The 23 m lens array often fell outside the ordinary ground-aiming camera. Lower optical echoes now communicate the convergence without changing camera framing or removing the high array.
3. The initial beam read as one stripe. Taper, diffraction side filaments and descending optical packets now separate the core/body/halo. Faceted instanced fragments add another motion layer without adding per-fragment draw calls.

Reviewed charge, mark, alignment, first strike, side pair, finishing cadence, residue and fade. Checked 5/12/25/50 m, rear/side/front-facing character angles, LOW/MEDIUM/MAX and full playback. Checked transparency from normal gameplay camera and real F + left-click casting. The saved preview shows the refined MAX sequence; deterministic review pages freeze stages only for inspection, while the production game uses the live EffectManager clock.

## Tests and measurements

- `npm install`: succeeds, dependencies up to date.
- `npm run dev`: Vite serves localhost:5173; the in-app browser connects successfully.
- `npm run build`: TypeScript and production bundle succeed. The existing Three.js engine chunk-size advisory remains.
- `npm test`: 22 tests pass (foundation 6, ice 3, wind 3, lightning 5, light 5).
- Phase 05 browser suite passes: local model Idle/Walk/Run, movement/sprint, mouse camera/targeting, F/4, LMB, cooldown mask/rejection, max range/invalid hits, all new layers, live preset transitions, light removal, lifetime and cleanup.
- Existing foundation, Phase 02, Phase 03 and Phase 04 browser suites pass with no console errors/warnings. Their empty-slot assertions were updated from F to V where necessary.
- Stress: 20 completed MEGIDDO casts; 20 and 40 completed casts alternating all four spells; 80 rapid requests rejected while one cast remained active. Stress advances lifecycle clocks to exercise rendered stages quickly; separate complete casts expire in real time.

Observed final full-cast profiles at the browser's actual **1280×720** viewport:

| Metric | LOW | MEDIUM | MAX |
| --- | ---: | ---: | ---: |
| Peak draw calls, entire composed scene | 19 | 36 | 36 |
| Peak triangles | 12,134 | 37,397 | 70,397 |
| Spell GPU points | 150 | 400 | 900 |
| Spell instances including fragments/optical batches | 40 | 73 | 117 |
| Peak transient point lights | 1 | 2 | 2 |
| Median observed frame interval | 6.1 ms | 6.1 ms | 6.1 ms |
| p95 observed frame interval | 6.2 ms | 6.2 ms | 6.2 ms |

These are requestAnimationFrame observations in this browser session, approximately 164 FPS after warm-up, not GPU timings or a performance guarantee for other hardware. An attempted 1920×1080 browser override did not change the document's actual viewport, so no 1920×1080 or 2560×1440 benchmark is claimed. The override was reset.

Warmed MEDIUM baseline and final counters match exactly: **12 scene children, 0 point lights, 5 subscriptions, 0 active effects, 86 geometries, 20 textures, 81 programs, 25 draw calls**. This includes bounded caches for all four abilities, composer, model and shadows. Full game disposal returns **0 geometries, 0 textures and 0 subscriptions**. See `phase5-browser-report.txt` for the complete checks/profile JSON; regression reports are `phase5-regression-foundation.txt`, `phase5-regression-ice.txt`, `phase5-regression-wind.txt`, `phase5-regression-lightning.txt`.

## File inventory

Added production modules in `src/abilities/light/`:

- `Megiddo.ts`: ability metadata, validation, pooled cast.
- `MegiddoEffect.ts`: sequence clock, attachments, quality subscription, lights, feedback, expiry.
- `MegiddoResources.ts`: bounded visual-bundle pool and resource disposal.
- `MegiddoConfig.ts`: numerical limits and central-quality mapping.
- `resolveMegiddoTarget.ts`: finite ground validation and range clamp.
- `BeamStrikeSequence.ts`: deterministic authored strike score and instance attributes.
- `LightBeam.ts`: batched focused optical columns and atmospheric shafts.
- `TargetMark.ts`: geometric ground sigil.
- `CelestialArray.ts`: high rotating faceted prisms and lenses.
- `RadiantLensField.ts`: lower optical echoes.
- `HolyRipple.ts`: individual water flashes, rings, warping and reflections.
- `HandChannel.ts`: small live-hand sacred channel.
- `LuminousParticles.ts`: bounded dust, ballistic burst and mist buffers.
- `PrismaticFragments.ts`: batched spinning/drifting facets.
- `RadiantMaterials.ts`: GLSL 3 emissive helper and procedural shader functions.

Added verification/artifacts: `tests/light.spec.ts`, `tests/phase5-browser.ts`, `tests/phase5-review.ts`, `phase5-smoke.html`, `phase5-review.html`, this document, five browser report files and `docs/phase5-preview.png`.

Modified: `src/game/Game.ts` (F registration only), `src/ui/HUD.ts` (phase caption only), `tests/phase2-browser.ts`, `tests/phase3-browser.ts`, `tests/phase4-browser.ts` (empty/equipped assertions), `README.md` (Phase 05 documentation/controls).
