# Local human character

`casual-male.glb` is converted and edited **Male_Adult_04** from the
[Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox).
Copyright (c) 2020 Microsoft. **MIT license**, included verbatim in `ROCKETBOX-LICENSE.txt`.

Upstream commit: `0943055db6ec570bcef9f2c8b41c9e5467c808f9`.

Source files at that commit:

- `Assets/Avatars/Adults/Male_Adult_04/Export/Male_Adult_04.fbx`
- `Assets/Avatars/Adults/Male_Adult_04/Textures/m006_{body,head,opacity}_color.tga`
- `Assets/Avatars/Adults/Male_Adult_04/Textures/m006_{body,head}_normal.tga`
- `Assets/Animations/all_animations_max_motextr_static/m_idle_breathe_01.max.fbx`
- `Assets/Animations/all_animations_max_motextr_xy/m_walk_neutral.max.fbx`
- `Assets/Animations/all_animations_max_motextr_xy/m_run_neutral.max.fbx`

Edits: color textures reduced to 1024² (hair alpha to 512²), normal maps to 512²,
darkened clothing pixels, rough PBR materials, retargeted locomotion clips to the
character's rest pose, removed horizontal root motion, and embedded everything
in one roughly 3.8 MB GLB. Bone-based skinning and proper hands/fingers remain.
Runtime `PlayerVisual` normalizes height to 1.82 m, aligns the feet, centers the
pivot and corrects visual forward. Hair uses alpha testing rather than blended sheets.

No textures/models are fetched from third-party hosts at runtime. Blender was used
only for preparation; it is **not** required to install or run the game.

To reproduce, download the listed source files to `.local/model-source/` as `male.fbx`,
`Idle.fbx`, `Walk.fbx`, `Run.fbx`, plus original texture names. Run
`scripts/prepare-character-textures.py` with Python/Pillow, then Blender's
`--background --python scripts/prepare-character.py`. The completed GLB is included locally.
