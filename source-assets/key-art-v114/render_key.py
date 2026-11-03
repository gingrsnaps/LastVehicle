"""Render the actual exported GLB in Blender, without re-exporting it.
Run: blender --background --python source-assets/key-art-v114/render_key.py
"""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT.parents[1]/'dist/assets/models/maintenance-key-v114.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.resolution_x=1000;scene.render.resolution_y=560;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.21,.19,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.2
mat=bpy.data.materials.new('Inspection_Only_Table');mat.use_nodes=True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.11,.145,.13,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.92
bpy.ops.mesh.primitive_plane_add(size=5,location=(0,0,-.0006));bpy.context.object.data.materials.append(mat)
for name,pos,energy,size,color in [('Softbox',(.0,-.1,1),55,1,(1,.94,.80)),('Fill',(.35,.5,.8),27,.8,(.75,.9,1))]:
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;data.color=color
 ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=pos;ob.rotation_euler=(Vector((.04,0,0))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Inspection_Camera');cam=bpy.data.objects.new('Inspection_Camera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=.49
center=Vector((.0415,-.005,.005))
for name,pos in [('top',(.0415,-.005,.7)),('desk',(.0415,-.33,.45))]:
 cam.location=pos;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(ROOT/('key-'+name+'.png'));bpy.ops.render.render(write_still=True)
