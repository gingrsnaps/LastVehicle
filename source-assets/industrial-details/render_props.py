"""Render the actual editable prop meshes, then build-sheet.py labels the views.
Run after build_props.py: blender -b Meridian_Industrial_Props.blend --python render_props.py
Rendering transforms affect this inspection scene only; no model is re-exported.
"""
from pathlib import Path
import bpy,json,math,sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
entries=json.loads((ROOT/'manifest.json').read_text())['assets'];scene=bpy.context.scene
for obj in list(scene.objects):obj.hide_render=True
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.resolution_x=448;scene.render.resolution_y=448;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.22,.255,.24,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.55
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.35
# Inspection-only studio: warm key, cool fill, large neutral ground for contact.
mat=bpy.data.materials.new('Inspection_Studio');mat.diffuse_color=(.12,.16,.15,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.12,.16,.15,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.001));floor=bpy.context.object;floor.data.materials.append(mat)
def light(name,p,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
light('Soft_key',(-3,-4,5),450,4,(1,.9,.76));light('Cool_fill',(3,-1,3),180,4,(.75,.89,1));light('Rim',(1,3,4),300,3,(.84,1,.95))
camdata=bpy.data.cameras.new('InspectionCamera');cam=bpy.data.objects.new('InspectionCamera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=2.1;camdata.lens=50
out=ROOT/'renders';out.mkdir(exist_ok=True)
if '--only' in sys.argv:entries=[a for a in entries if a['id']==sys.argv[sys.argv.index('--only')+1]]
limit=1 if '--first-only' in sys.argv else len(entries)
for idx,e in enumerate(entries[:limit]):
 ob=bpy.data.objects[e['id']];saved_loc=ob.location.copy();ob.location=(0,0,0);factor=1.45/max(e['dimensions']);ob.scale=(factor,)*3;ob.hide_render=False
 lo=e['bounds_min'];hi=e['bounds_max'];center=Vector(((lo[0]+hi[0])*.5,-(lo[2]+hi[2])*.5,(lo[1]+hi[1])*.5))*factor
 cam.location=center+Vector((2.6,-4.2,2.7));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(e['id']+'.png'));bpy.ops.render.render(write_still=True)
 ob.hide_render=True;ob.scale=(1,1,1);ob.location=saved_loc
 print('RENDERED',idx+1,e['id'],flush=True)
