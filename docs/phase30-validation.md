# Phase 30 — Living Adventurer

This phase improves the existing playable human and animation layer. All **31 abilities** remain registered; no spell geometry, shader, range or cooldown was changed. The ocean, camera, input, Spellbook, Favorites and Quick Wheel retain their existing implementations.

## Character audit and asset strategy

The local `public/models/casual-male.glb` is Microsoft Rocketbox **Male_Adult_04**, MIT licensed. Source commit and conversion provenance remain in [the model README](../public/models/README.md); the original notice remains in [ROCKETBOX-LICENSE.txt](../public/models/ROCKETBOX-LICENSE.txt). No external model, texture or animation was downloaded for this phase. The GLB binary is unchanged.

The asset has three original SkinnedMeshes: body **4,760 triangles / 3,135 vertices**, head **3,236 triangles / 1,789 vertices**, hair **688 triangles / 744 vertices**. Its shared skeleton has **80 bones**, including thighs/calves/feet/toes, articulated hands with finger joints, neck/head and facial bones. The imported rest pose is an A-pose. Bind-pose height is about 1.869 source units; runtime uniformly normalizes it to **1.82m**, retains the existing centered pivot/sole offset and corrects source +Z facing to gameplay −Z.

Only three compatible skeletal clips are included: **Idle 2.767s, Walk 1.1s, Run 0.8s**, each with 240 tracks. There is no separate sprint, turn, start/stop or spellcasting clip. The existing face has real nose, jaw, cheeks, ears and eye geometry; it was retained rather than replaced by a primitive head. Body proportions, face topology, hand topology and skin weights were not arbitrarily reshaped.

## Actual geometry changes

Six additional, bounded skinned garment meshes share the original skeleton:

| Addition | Triangles | Construction |
|---|---:|---|
| Fitted leather jerkin | 424 | Selected original torso faces, offset along source normals; exact source skin weights |
| Leather boots | 1,002 | Fitted shoe/lower-leg surface overlay, preserving ankle deformation |
| Forearm wraps | 140 | Source forearm-weight mask, restrained surface offset |
| Belt | 25 | Fitted waist faces with raised leather depth |
| Raised stitched seams | 48 | Two sampled chest strips ray-fitted to the bind-pose surface; barycentrically interpolated skin influences |
| Bronze clasps/buckle | 84 | Small solid fasteners with genuine thickness, fitted to chest/waist and skinned |

Total character geometry is **10,407 triangles**, up from 8,684. There are **9 SkinnedMeshes/materials**, **one shared skeleton** and **one AnimationMixer**. These are partial clothing additions, not six duplicated full characters. Geometry is created once on model load; nothing is rebuilt during animation or preset switching. There is no bulky armor, large cape or new physics simulation.

## Materials, normals and scene integration

Skin retains the embedded color/normal maps, with roughness **0.59** and reduced normal-map strength **0.65**. Fabric has roughness **0.91**, muted shirt coloration and fine weave. Leather has roughness **0.67**, local grain and restrained worn-color variation. Bronze has metalness **0.65** and roughness **0.34**. Hair keeps the existing alpha-test approach. Hand regions receive a softer skin roughness response rather than fabric roughness.

Shader injection preserves Three.js PBR lighting, skinning, normal, depth and shadow chunks. Bind-pose object coordinates are captured **before skinning**, so grain remains attached to the skin/clothes. Bounded value noise and FBM use the project's already attributed **Ashima / Stefan Gustavson simplex utility** for the additional MEDIUM/MAX octaves. Existing MIT notices remain in `public/licenses/`. No donor engine was copied. Stable material program keys and a shared quality uniform avoid recompilation just to change detail.

Garment patches retain the source normals and weights; seam normals are computed from their fitted triangles, and solid fasteners retain hard face normals. All character meshes use the existing shadow setup. Existing key/rim/hemisphere lights and nearby spell lights illuminate the new PBR surfaces naturally. No permanent player glow, new lighting engine or extra render pass was added.

## Animation and movement

The original exact integration of camera-relative acceleration/deceleration, normalized diagonals, **4.8m/s base speed**, **8.5m/s Shift sprint** and turning responsiveness are retained. Heading now uses shortest-path quaternion interpolation while preserving the controller's unwrapped yaw convention.

Three actions remain active with continuously smoothed, normalized weights. A shared locomotion phase aligns Walk and Run foot-contact timing; clips are not reset on every state transition. Source stance travel is sampled from the real clips after scale normalization, producing approximately **1.34m/s Walk** and **2.53m/s Run** reference speeds. Cadence responds to current velocity and is bounded. Slower acceleration blends through Walk; sustained 4.8m/s motion appropriately reaches Run. Sprint uses the compatible Run clip with faster bounded cadence and a stronger conservative torso lean. No nonexistent sprint clip is advertised.

Debug states include IDLE, START, WALK, RUN, SPRINT and DECELERATE. Existing Idle breathing is complemented by at most 0.4% chest expansion. Acceleration/deceleration lean, small turning anticipation and clamped smooth head look add restrained weight; head yaw is limited to 0.42 radians and pitch to 0.15 radians.

Every frame follows **restore previous base pose → update mixer → normalize/capture base pose → apply bounded body/cast corrections → foot correction**. Bone adjustments never accumulate into the next mixer pose. World/local quaternion conversions are normalized, including when they inherit scaled transforms.

## Feet, water and casting

The visual root smoothly samples the existing analytic ocean API; gameplay position and camera targeting stay stable. MEDIUM/MAX use an analytic two-bone leg solver during low stance, limited to **10cm vertical** and **7cm horizontal plant** corrections, with reach clamped below full extension and smooth contact weights. LOW retains the same clips/core animation and surface following, with optional foot IK disabled. This reduces sliding and improves sole contact without a fragile full-body IK/physics system. Existing water footsteps and ripples are preserved.

The existing `beginRightHandCast(duration, elevation)` API remains compatible. A single accepted-cast hook in AbilityManager selects projectile/strike/heavy/summon styles centrally; existing explicit hand-pose timing wins over defaults. New accepted casts restart their own gesture while a previous slot is recovering. Only upper-body bones are affected: two-bone arm reach, finger relaxation toward the real rest pose, and smooth attack/recovery. Summons can raise both arms. Locomotion legs continue while casting; no new mixer or action is created per spell. Cooldowns, VFX timelines and target solutions are unchanged.

Right hand, left hand, chest and feet still resolve to the original real bones and update world matrices before attachment queries. There is no invented hand offset or separate projectile targeting system.

F3 now includes state, active clip, speed/cadence, blend weights, measured stride reference, cast/recovery, heading and foot-contact/IK diagnostics alongside the existing Ocean Editor. `CharacterConfig.ts` centralizes visual tuning; there is no separate editor framework.

## Quality and performance

LOW uses one cheap grain octave and no foot IK. MEDIUM adds one simplex-detail octave and restrained IK. MAX adds a third bounded detail octave and the same stable corrections. Skeleton, clips, garment geometry and core animation remain consistent across presets. There are no extra character textures, dynamic shadow systems or transparent material passes.

Final LOW/MEDIUM/MAX acceptance records are in phase30/browser-low.txt, browser-medium.txt and browser-max.txt. Median character update CPU time was approximately 0.1ms LOW/MEDIUM and 0.2ms MAX, with p95 approximately 0.2ms. All tiers passed motion, six moving casts, fifteen stable preset changes and teardown. Full-lifetime six-spell LOW/MAX regressions were completed before Phase 31, as recorded below. These are complete-scene draw counts and CPU animation-update timings, not isolated GPU timings or a universal FPS guarantee. First-load texture/shader preparation can still pause briefly; this phase does not introduce shader variants per cast or per uniform change.

## Verification and evidence

`npm run typecheck` and `npm run build` pass. All **110 automated tests** pass, including six new tests using the actual GLB skeleton/geometry/clips with image decoding omitted in Node. They cover source rig/garment validity, normalized blend weights, measured cadence, heading wraps, 600-frame finite/no-drift posing, lower-body independence during casting, explicit-cast timing/recovery, hand transforms, bounded IK and idempotent teardown. Existing spell/config/geometry/lifecycle tests remain intact.

Browser acceptance uses the actual running Game, model, WebGL renderer and existing input manager. It exercises forward/back/left/right/diagonal movement, start/stop, sprint, reversal, camera/targeting, F3, and six spells cast while moving: Ember Comet, Frost Lance, Sand Reaper, Astral Chainstorm, Abyssal Moonfall and The Drowned King. It also warms quality variants, checks fifteen live preset switches for identical resource counts, and verifies zero GPU resources/subscriptions after full teardown. No giant ultimates are run simultaneously. Input sequences are authored synthetic test events; normal live gameplay is checked separately.

The visual review compares [the original front view](phase30/before-front.png) with [the adventurer front view](phase30/after-front.png). Review-page pose captures freeze animation time for close inspection; they do not measure runtime performance. Live successive running/sprinting frames were also inspected.

## Files

New production modules in `src/player/`:

- `CharacterConfig.ts` — visual limits, cast-style mapping and heading helper.
- `CharacterRig.ts` — bone discovery, rest/base poses and normalized world rotations.
- `CharacterAnimationController.ts` — real clip calibration, continuous weights and phase synchronization.
- `CharacterMaterials.ts` — skin/fabric/leather/metal PBR and bind-space noise.
- `CharacterGeometry.ts` — fitted skinned garments, surface seams and solid fasteners.
- `CharacterMotion.ts` — head/body secondary motion, upper-body cast styles and recovery.
- `CharacterFootIK.ts` — bounded two-bone solver and stance correction.

Modified production/shared files: `PlayerVisual.ts`, `PlayerController.ts`, `Game.ts`, `AbilityManager.ts`, `HUD.ts`, `README.md`, `public/models/README.md`. No existing spell implementation, renderer, camera, ocean shader or GLB asset was changed.

New test/review files: `tests/character.spec.ts`, `tests/character-fixture.ts`, `tests/character-browser.ts`, `tests/character-review.ts`, `character-browser.html`, `character-review.html`, this report and `docs/phase30/` evidence. Old Phase 2 and Ember Comet browser locomotion assertions now expect the correct velocity-blended Run clip at 4.8m/s.

## Remaining limitations

- This is a rig-compatible improvement of the existing Rocketbox avatar, not a newly sculpted AAA head/body. Facial and finger topology/proportions are retained; material detail cannot add anatomical geometry.
- Boot overlays retain the original shoe/toe form. No new facial-expression rig, hair simulation or cloth physics was introduced.
- Sprint and casting use conservative corrections over compatible clips. Dedicated motion-capture sprint/start/stop/turn/cast clips are absent.
- Small residual foot sliding can remain at high sprint speed, sharp reversals and abrupt large water disturbances. IK is deliberately limited rather than forcing unnatural leg stretches.
- There is no measured before/after isolated GPU benchmark. Browser CPU timings and Three.js counters establish bounded cost and cleanup, not hardware-independent frame-rate guarantees.
- First-use shader/texture preparation is not eliminated. The renderer has no added asynchronous prewarm lifecycle that could outlive character teardown.

No agent commit, push, reset, clean, PR, deployment or publication was performed. Separate external processes recorded commits during development; those were preserved along with prior work.

## Phase 31 baseline completion

The outstanding full-lifetime regression was completed before adding Riftreaver. Actual WebGL runs on LOW and MAX passed Ember Comet, Frost Lance, Sand Reaper, Astral Chainstorm, Abyssal Moonfall and The Drowned King, including normal input casting, cooldown rejection, finite geometry/matrices, natural completion and owner cleanup. Console warnings/errors were empty and WebGL returned NO_ERROR. Evidence: `phase30/regression-low.txt` and `phase30/regression-max.txt`.

The previously saved final MAX character acceptance (`phase30/browser-max.txt`) also passed six moving casts, Idle/Walk/Run/Sprint, camera/targeting, all quality tiers, fifteen resource-stable preset changes and full teardown. Median character update CPU time was approximately 0.1ms LOW/MEDIUM and 0.2ms MAX, with p95 approximately 0.2ms; these are measured CPU timings, not isolated GPU timings or guaranteed FPS. Total character triangles remain 10,407. Scene render counts depend on culling, shadows and ocean reflections.

