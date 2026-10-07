"""Build the local GLB from Microsoft Rocketbox Male_Adult_04 and its three motion clips.
Run with Blender --background --python scripts/prepare-character.py.
Source files live in .local/model-source (excluded from the runtime and Git).
"""
import bpy
import tempfile
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
source = root / '.local/model-source'
temp_dir = root / '.local/blender-temp'
temp_dir.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(temp_dir)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source / 'male.fbx'))
character = list(bpy.data.objects)
rig = next(obj for obj in character if obj.type == 'ARMATURE')
mesh = next(obj for obj in character if obj.type == 'MESH')
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    bone.rotation_quaternion.identity()
    bone.location = (0, 0, 0)

# Replace Max materials with portable PBR nodes and embedded, reduced-resolution textures.
for material in mesh.data.materials:
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Roughness'].default_value = 0.85
    material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    kind = 'opacity' if 'opacity' in material.name else ('head' if 'head' in material.name else 'body')
    image = bpy.data.images.load(str(source / f'{kind}.png'))
    texture = nodes.new('ShaderNodeTexImage'); texture.image = image
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    if kind == 'opacity':
        material.node_tree.links.new(texture.outputs['Alpha'], shader.inputs['Alpha'])
        material.surface_render_method = 'DITHERED'
    else:
        normal_image = bpy.data.images.load(str(source / f'{kind}-normal.png'))
        normal_image.colorspace_settings.name = 'Non-Color'
        normal_texture = nodes.new('ShaderNodeTexImage'); normal_texture.image = normal_image
        normal = nodes.new('ShaderNodeNormalMap')
        material.node_tree.links.new(normal_texture.outputs['Color'], normal.inputs['Color'])
        material.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])

actions = []
for clip in ['Idle', 'Walk', 'Run']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(source / f'{clip}.fbx'))
    imported = set(bpy.data.objects) - before
    motion = next(obj for obj in imported if obj.type == 'ARMATURE')
    source_action = motion.animation_data.action
    first, last = [int(frame) for frame in source_action.frame_range]
    print('MOTION', clip, first, last, 'FPS', bpy.context.scene.render.fps)
    action = bpy.data.actions.new(clip)
    rig.animation_data_create(); rig.animation_data.action = action
    for frame in range(first, last + 1):
        bpy.context.scene.frame_set(frame)
        desired_rotations = {}
        for bone in rig.pose.bones:
            other = motion.pose.bones.get(bone.name)
            if other:
                # Imported FBXs have different rest poses (A-pose vs first motion frame).
                # Retarget absolute bone orientation, then remove the target rest basis.
                desired = (rig.matrix_world.inverted() @ motion.matrix_world @ other.matrix).to_quaternion()
                desired_rotations[bone.name] = desired
                parent_rotation = desired_rotations.get(bone.parent.name) if bone.parent else None
                local = parent_rotation.inverted() @ desired if parent_rotation else desired
                rest = bone.bone.matrix_local.to_quaternion()
                if bone.parent:
                    rest = bone.parent.bone.matrix_local.to_quaternion().inverted() @ rest
                bone.rotation_quaternion = rest.inverted() @ local
            bone.location = (0, 0, 0)
            # Keep a little vertical pelvis motion while removing all root travel.
            if bone.name == 'Bip01 Pelvis' and other:
                delta = other.bone.matrix_local.to_3x3() @ other.location
                delta.x = 0; delta.y = 0
                bone.location = bone.bone.matrix_local.to_3x3().inverted() @ delta
            bone.keyframe_insert('rotation_quaternion', frame=frame-first+1, group=bone.name)
            if bone.name == 'Bip01 Pelvis':
                bone.keyframe_insert('location', frame=frame-first+1, group=bone.name)
    actions.append(action)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

rig.animation_data.action = None
for action in actions:
    track = rig.animation_data.nla_tracks.new(); track.name = action.name
    strip = track.strips.new(action.name, 1, action); strip.action_frame_start = 1
    strip.action_frame_end = action.frame_range[1]
    track.mute = True
for bone in rig.pose.bones:
    bone.rotation_quaternion.identity()
    bone.location = (0, 0, 0)
bpy.context.view_layer.update()
bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(root / 'public/models/casual-male.glb'), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
    export_image_format='AUTO', export_texcoords=True, export_normals=True, export_skins=True)
print('EXPORTED', (root / 'public/models/casual-male.glb').stat().st_size)
