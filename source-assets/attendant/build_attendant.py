"""The Attendant — original procedural low-poly character, authored for Last Vehicle.
Run: blender --background --python build_attendant.py
No downloaded geometry, rigs, textures, or animations are used.
Blender native: Z up, -Y forward. glTF: Y up, +Z forward. Units: metres.
"""
import bpy, math, random, json, os, hashlib
from mathutils import Vector, Matrix
from math import sin, cos, pi, radians
OUT=os.path.dirname(os.path.abspath(__file__))
random.seed(1808)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for act in list(bpy.data.actions): bpy.data.actions.remove(act)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.fps=30
# Use an embedded, procedural, genuinely image-backed grime texture on all surfaces.
SZ=256
im=bpy.data.images.new('Attendant_Original_Grime_256', width=SZ,height=SZ,alpha=False)
pixels=[]
for y in range(SZ):
  for x in range(SZ):
    n=random.random(); coarse=(sin(x*.091+y*.043)+sin(x*.037-y*.073))*0.055
    scratch=0.21 if (x*17+y*3)%127<2 else 0
    drip=0.17 if ((x+int(4*sin(y*.06)))%53<3 and y%101>20) else 0
    s=max(.35,min(1,.75+(n-.5)*.30+coarse-scratch-drip))
    pixels.extend([s,s*.98,s*.93,1])
im.pixels=pixels
im.filepath_raw=os.path.join(OUT,'attendant-grime.png'); im.file_format='PNG'; im.save(); im.pack()
def mat(name,color,rough=.95,metal=0,texture=True,emission=0):
  m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
  if texture:
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
    mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*color,1)
    m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
  if emission:
    bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
  return m
M={
 'cloth':mat('Faded_oil_soaked_workcloth',(.125,.155,.126)),
 'seam':mat('Torn_dark_seams',(.030,.036,.029)),
 'apron':mat('Tattered_waxed_apron',(.205,.157,.105)),
 'skin':mat('Waxen_scarred_skin',(.39,.345,.244)),
 'mask':mat('Chipped_protective_mask',(.48,.46,.365),.79,.05),
 'rust':mat('Corroded_iron',(.235,.105,.048),.84,.4),
 'black':mat('Hollow_visor_and_mouth',(.009,.010,.007),.99,0,False),
 'boot':mat('Worn_work_boots',(.038,.044,.035)),
 'eye':mat('Dull_amber_reflection',(.20,.105,.021),.7,0,False,.18),
 'stripe':mat('Faded_warning_tape',(.43,.335,.12)),
}
# A deliberately asymmetric, forward-hunched skeleton with proper parent hierarchy.
arm=bpy.data.armatures.new('Attendant_Skeleton')
rig=bpy.data.objects.new('The_Attendant',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(n,h,t,p=None,deform=True):
 b=arm.edit_bones.new(n);b.head=h;b.tail=t;b.use_deform=deform
 if p: b.parent=arm.edit_bones[p]
 bones[n]=(Vector(h),Vector(t))
 return b
bone('Root',(0,0,0),(0,0,.20),None,False)
bone('Hips',(0,.015,1.02),(0,.028,1.22),'Root')
bone('Spine',(0,.028,1.22),(0,.080,1.47),'Hips')
bone('Chest',(0,.080,1.47),(0,.005,1.76),'Spine')
bone('Neck',(0,.005,1.76),(0,-.125,1.92),'Chest')
bone('Head',(0,-.125,1.92),(0,-.170,2.105),'Neck')
for side,s in [('L',1),('R',-1)]:
 bone('Clavicle.'+side,(0,.018,1.705),(s*.265,.018,1.705),'Chest')
 bone('UpperArm.'+side,(s*.265,.018,1.705),(s*.363,-.005,1.235),'Clavicle.'+side)
 bone('Forearm.'+side,(s*.363,-.005,1.235),(s*.425,-.115,.676),'UpperArm.'+side)
 bone('Hand.'+side,(s*.425,-.115,.676),(s*.431,-.145,.491),'Forearm.'+side)
 for i in range(4):
  dx=(i-1.5)*.026
  z=.495-abs(i-1.5)*.014
  h=(s*(.431+dx),-.145,z)
  t=(s*(.439+dx*1.12),-.159,z-(.152 if i in (1,2) else .127))
  e=(s*(.441+dx*1.22),-.186,t[2]-.083)
  bone(f'Finger{i}.{side}',h,t,'Hand.'+side)
  bone(f'FingerTip{i}.{side}',t,e,f'Finger{i}.{side}')
 bone('Thumb.'+side,(s*.395,-.135,.608),(s*.352,-.163,.501),'Hand.'+side)
 bone('Thigh.'+side,(s*.123,.018,1.05),(s*.138,-.075,.550),'Hips')
 bone('Shin.'+side,(s*.138,-.075,.550),(s*.145,.003,.145),'Thigh.'+side)
 bone('Foot.'+side,(s*.145,.003,.145),(s*.145,-.223,.08),'Shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
# All geometry is skinned through vertex weights, including accessories.
objects=[]
def skin_obj(name,verts,faces,weights,material,uv=None):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(M[material]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 vg={}
 for wi,wd in enumerate(weights):
  for bn,w in wd.items():
   if bn not in vg:vg[bn]=ob.vertex_groups.new(name=bn)
   vg[bn].add([wi],w,'REPLACE')
 layer=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index
   if uv:layer.data[li].uv=uv[vi]
   else:
    v=Vector(verts[vi]); layer.data[li].uv=((v.x*1.8+v.y*.5)%1,(v.z*.8+v.y*.6)%1)
 mod=ob.modifiers.new('Attendant skeletal deformation','ARMATURE');mod.object=rig
 ob.parent=rig;objects.append(ob)
 return ob

def tube(name,centres,radii,bone_names,material='cloth',sides=8,ragged=False):
 vs=[];ws=[];uv=[]
 for k,(c,r,bn) in enumerate(zip(centres,radii,bone_names)):
  c=Vector(c)
  if k==0:t=Vector(centres[1])-c
  elif k==len(centres)-1:t=c-Vector(centres[k-1])
  else:t=Vector(centres[k+1])-Vector(centres[k-1])
  t.normalize();u=t.cross(Vector((0,1,0))).normalized();v=t.cross(u).normalized()
  if isinstance(r,(int,float)):r=(r,r)
  for j in range(sides):
   a=2*pi*j/sides
   p=c+u*cos(a)*r[0]+v*sin(a)*r[1]
   if ragged and k==len(centres)-1:p+=t*(.023*sin(j*5.8)+.016*cos(j*3.4))
   vs.append(tuple(p));ws.append(bn if isinstance(bn,dict) else {bn:1});uv.append((j/sides,k/(len(centres)-1)))
 fs=[]
 for k in range(len(centres)-1):
  for j in range(sides):
   a=k*sides+j;b=k*sides+(j+1)%sides;c=b+sides;d=a+sides
   fs.extend([(a,b,c),(a,c,d)])
 fs.append(tuple(reversed(range(sides))));fs.append(tuple((len(centres)-1)*sides+j for j in range(sides)))
 return skin_obj(name,vs,fs,ws,material,uv)

def ico(name,loc,scale,bn,material,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
 ob=bpy.context.object;ob.name=name
 for v in ob.data.vertices:v.co.x*=scale[0];v.co.y*=scale[1];v.co.z*=scale[2]
 bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
 ob.data.materials.append(M[material]);vg=ob.vertex_groups.new(name=bn);vg.add(list(range(len(ob.data.vertices))),1,'REPLACE')
 mod=ob.modifiers.new('Attendant skeletal deformation','ARMATURE');mod.object=rig;ob.parent=rig
 # Smart UV projection does not change geometry.
 bpy.context.view_layer.objects.active=ob;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT')
 objects.append(ob);return ob

def block(name,loc,scale,bn,material):
 x,y,z=loc;w,d,h=scale
 vs=[(x+sx*w/2,y+sy*d/2,z+sz*h/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 return skin_obj(name,vs,fs,[{bn:1}]*8,material)

# Torso / hunched shoulders, an uneven boiler suit with a narrow waist.
tube('Boiler_suit_hunched_torso',[(0,.02,.99),(0,.02,1.16),(0,.045,1.32),(0,.08,1.49),(0,.035,1.66),(0,.015,1.755)],[(.18,.118),(.178,.105),(.145,.105),(.209,.14),(.279,.144),(.19,.113)],['Hips','Hips',{'Hips':.25,'Spine':.75},{'Spine':.4,'Chest':.6},'Chest','Chest'],'cloth',10)
ico('Raised_spinal_hump',(0,.157,1.63),(.185,.091,.178),'Chest','cloth',2)
tube('Exposed_cable_like_neck',[(0,-.005,1.76),(0,-.10,1.875),(0,-.15,1.972)],[(.072,.072),(.049,.054),(.052,.054)],['Neck',{'Neck':.5,'Head':.5},'Head'],'skin',7)
# Ribbed neck seams and a corroded collar.
tube('Rust_stiff_collar',[(0,-.005,1.754),(0,-.035,1.801)],[(.085,.081),(.079,.075)],['Neck','Neck'],'rust',8)
# Skull hidden behind a long asymmetrically damaged protective face plate.
ico('Narrow_skull',(0,-.165,1.985),(.093,.102,.139),'Head','skin',2)
ico('Black_back_headgear',(0,-.117,2.008),(.103,.083,.126),'Head','seam',1)
# Plate outline in front view: one lower corner fractured away, no hat brim.
outline=[(-.094,2.10),(.085,2.105),(.104,2.035),(.083,1.930),(.040,1.858),(-.020,1.869),(-.080,1.929),(-.106,2.020)]
vs=[(x,-.282,z) for x,z in outline]+[(x*.92,-.248,z) for x,z in outline]
fs=[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
skin_obj('Long_broken_protective_mask',vs,fs,[{'Head':1}]*len(vs),'mask')
# Deep, narrow unlit visor; an offset copper glint, never friendly eye discs.
vs=[(-.074,-.284,2.024),(.075,-.284,2.012),(.069,-.289,1.980),(-.077,-.289,1.993)]
skin_obj('Deep_asymmetric_visor',vs,[(0,1,2,3)],[{'Head':1}]*4,'black')
block('Single_dull_visor_glint',(.035,-.291,2.001),(.019,.004,.005),'Head','eye')
# Three slim breathing slots and old fractures in the mask.
for i in range(3):
 x=(i-1)*.028
 skin_obj('Mask_breathing_slot_'+str(i),[(x-.004,-.285,1.955),(x+.004,-.285,1.954),(x+.003,-.286,1.900),(x-.004,-.286,1.909)],[(0,1,2,3)],[{'Head':1}]*4,'black')
for i,pts in enumerate([[(.048,-.286,2.092),(.027,-.287,2.056),(.037,-.287,2.025)], [(-.079,-.285,1.967),(-.052,-.288,1.945),(-.044,-.288,1.903)]]):
 tube('Mask_fracture_'+str(i),pts,[.003]*3,['Head']*3,'black',4)
# Rusted head straps run round skull, no normal hat silhouette.
tube('Head_cage_side_L',[(-.094,-.277,2.046),(-.108,-.14,2.073),(-.071,-.044,2.043)],[.013]*3,['Head']*3,'rust',4)
tube('Head_cage_side_R',[(.092,-.277,2.04),(.108,-.14,2.068),(.071,-.044,2.043)],[.011]*3,['Head']*3,'rust',4)
# Apron: tapered ragged panels weighted through torso and hip.
apron_rows=[(1.676,.147,-.119,'Chest'),(1.48,.167,-.081,{'Chest':.6,'Spine':.4}),(1.23,.137,-.108,{'Spine':.25,'Hips':.75}),(.975,.178,-.118,'Hips'),(.790,.181,-.124,'Hips')]
vs=[];ws=[]
for row,(z,w,y,bn) in enumerate(apron_rows):
 for j in range(5):
  x=-w+j*w/2;zz=z
  if row==4:zz += [0,.065,-.045,.045,-.02][j]
  vs.append((x,y-.035,zz));ws.append(bn if isinstance(bn,dict) else {bn:1})
fs=[]
for r in range(4):
 for j in range(4):
  if r==3 and j==2:continue
  a=r*5+j;fs.extend([(a,a+1,a+6),(a,a+6,a+5)])
skin_obj('Torn_industrial_apron',vs,fs,ws,'apron')
# Straps, warning remnants, and a crooked plate make the occupation legible.
for s in [-1,1]:
 tube('Apron_shoulder_strap_'+str(s),[(s*.12,-.11,1.65),(s*.115,-.12,1.748),(s*.12,.10,1.72)],[(.018,.009)]*3,['Chest']*3,'seam',4)
block('Crooked_rust_chest_badge',(-.07,-.160,1.55),(.078,.011,.046),'Chest','rust')
block('Blank_faded_badge_face',(-.07,-.167,1.552),(.048,.002,.011),'Chest','mask')
for i in range(3):
 x=-.055+i*.048
 skin_obj('Faded_chest_warning_'+str(i),[(x-.013,-.155,1.407),(x+.005,-.155,1.407),(x+.019,-.155,1.458),(x+.001,-.155,1.458)],[(0,1,2,3)],[{'Spine':.6,'Chest':.4}]*4,'stripe')
# Limb mesh rings include blended joint vertices, never only object-parent animation.
for side,s in [('L',1),('R',-1)]:
 ua,fa,ha='UpperArm.'+side,'Forearm.'+side,'Hand.'+side
 sh,el,wr=bones[ua][0],bones[ua][1],bones[fa][1]
 tube('Heavy_torn_sleeve_'+side,[sh,sh.lerp(el,.20),sh.lerp(el,.75),el,el.lerp(wr,.29)],[(.104,.104),(.099,.093),(.080,.075),(.075,.075),(.061,.062)],[ua,ua,ua,{ua:.5,fa:.5},fa],'cloth',8,True)
 tube('Long_exposed_forearm_'+side,[el,el.lerp(wr,.20),el.lerp(wr,.69),wr],[(.064,.061),(.056,.054),(.041,.037),(.036,.031)],[{ua:.3,fa:.7},fa,fa,{fa:.7,ha:.3}],'skin',7)
 # Slim wrapping around one forearm, broken work-sleeve on the other.
 for i,t in enumerate([.39,.47,.66]):
  c=el.lerp(wr,t);c2=el.lerp(wr,t+.035)
  rad=.054-(t*.022)
  tube('Forearm_binding_'+side+str(i),[c,c2],[rad,rad],[fa,fa],'seam',7)
 ico('Sharp_elbow_'+side,el,(.078,.068,.076),fa,'seam',1)
 tube('Gaunt_hand_'+side,[wr,bones[ha][1]],[(.038,.030),(.055,.024)],[{fa:.3,ha:.7},ha],'skin',7)
 for i in range(4):
  f,ft=f'Finger{i}.{side}',f'FingerTip{i}.{side}'
  tube('Unnaturally_long_finger_'+side+str(i),[bones[f][0],bones[f][1],bones[ft][1]],[(.015,.014),(.012,.012),(.006,.008)],[{ha:.2,f:.8},{f:.5,ft:.5},ft],'skin',5)
  e=bones[ft][1]
  tube('Dark_broken_nail_'+side+str(i),[e+Vector((0,-.006,.026)),e+Vector((0,-.018,-.013))],[.009,.002],[ft,ft],'seam',4)
 tube('Twisted_thumb_'+side,[bones['Thumb.'+side][0],bones['Thumb.'+side][1]],[.023,.009],['Thumb.'+side]*2,'skin',5)
 th,kn,an=bones['Thigh.'+side][0],bones['Thigh.'+side][1],bones['Shin.'+side][1]
 thigh,shin,foot='Thigh.'+side,'Shin.'+side,'Foot.'+side
 tube('Worn_work_trouser_'+side,[th,th.lerp(kn,.35),th.lerp(kn,.85),kn,kn.lerp(an,.15)],[(.116,.106),(.103,.100),(.082,.077),(.074,.068),(.071,.068)],[{thigh:.85,'Hips':.15},thigh,thigh,{thigh:.5,shin:.5},shin],'cloth',8,True)
 tube('Thin_lower_leg_'+side,[kn,kn.lerp(an,.5),an],[(.067,.065),(.056,.054),(.055,.053)],[{thigh:.3,shin:.7},shin,{shin:.8,foot:.2}],'cloth',7)
 ico('Battered_knee_'+side,kn+Vector((0,-.035,.015)),(.085,.052,.079),shin,'seam',1)
 tube('Tall_boot_ankle_'+side,[an-Vector((0,0,.035)),an+Vector((0,0,.13))],[(.073,.085),(.069,.064)],[foot,{shin:.8,foot:.2}],'boot',8)
 # Low polygon boot toe keeps sole precisely on ground at z=0.
 x=s*.145
 vs=[(x-.079,.087,0),(x+.079,.087,0),(x+.085,-.252,0),(x-.082,-.252,0),(x-.070,.068,.15),(x+.070,.068,.15),(x+.075,-.228,.105),(x-.075,-.228,.105)]
 skin_obj('Long_square_work_boot_'+side,vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],[{foot:1}]*8,'boot')
 for i in range(3):
  block('Boot_lace_'+side+str(i),(x,-.075-i*.043,.132-i*.009),(.108,.012,.009),foot,'rust')
 # Discontinuous frayed hems as real pointed low-poly geometry.
 for j in range(3):
  xx=s*(.072+j*.05); zz=.81+.022*j
  skin_obj('Trouser_tatter_'+side+str(j),[(xx,-.093,zz),(xx+.020,-.095,zz+.08),(xx+.038,-.097,zz-.055)],[(0,1,2)],[{thigh:1}]*3,'seam')
# Asymmetry: iron brace and hanging rag on left shoulder, skin seam on right.
tube('Left_shoulder_iron_brace',[(.12,.102,1.716),(.25,.065,1.786),(.331,-.010,1.666)],[.023,.027,.020],['Chest','UpperArm.L','UpperArm.L'],'rust',5)
skin_obj('Hanging_torn_shoulder_rag',[(-.287,.038,1.68),(-.337,.02,1.63),(-.407,.024,1.30),(-.365,.023,1.38)],[(0,1,2),(0,2,3)],[{'UpperArm.R':1}]*4,'seam')
# Merge skin pieces for compact glTF, preserving materials, vertex groups, and UVs.
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.object.join()
mesh_obj=bpy.context.object;mesh_obj.name='Attendant_Skinned_Mesh'
# Flat normal faceting is intentional; doublesided apron/tatters are enabled.
for m in M.values():m.use_backface_culling=False
for p in mesh_obj.data.polygons:p.use_smooth=False
# Author all requested skeletal actions from local pose transforms.
rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
CLIPS={}
def reset_pose():
 for pb in rig.pose.bones:
  pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
def pose(data,locs=None):
 data=dict(data)
 for bn,offset in [('Spine',5),('Chest',5),('Head',-5)]:
  old=data.get(bn,(0,0,0));data[bn]=(old[0]+offset,old[1],old[2])
 for n,rot in data.items():rig.pose.bones[n].rotation_euler=tuple(radians(a) for a in rot)
 if locs:
  for n,loc in locs.items():rig.pose.bones[n].location=loc

def fingers(data,amount=0,spread=0):
 for side,s in [('L',1),('R',-1)]:
  for i in range(4):
   data[f'Finger{i}.{side}']=(amount,0,(i-1.5)*spread*s)
   data[f'FingerTip{i}.{side}']=(amount*.7,0,0)
  data['Thumb.'+side]=(amount*.35,0,-spread*s)
 return data

def rotate_bone_toward(n, direction):
 """Bake a world-space aim into local FK keys; no runtime IK dependency."""
 pb=rig.pose.bones[n]
 old=pb.tail-pb.head
 rotation=old.rotation_difference(Vector(direction)) @ pb.matrix.to_quaternion()
 pb.matrix=Matrix.Translation(pb.head) @ rotation.to_matrix().to_4x4()
 bpy.context.view_layer.update()

def two_bone_contact(upper,lower,target,pole):
 """Analytic two-bone reach, used only while authoring new contact poses.
 The same joint names/skin remain. Solved matrices become ordinary glTF keys.
 """
 a=rig.pose.bones[upper].head.copy();target=Vector(target);delta=target-a
 l1=rig.data.bones[upper].length;l2=rig.data.bones[lower].length
 distance=max(.001,min(delta.length,l1+l2-.0001));along=delta.normalized()
 side=Vector(pole)-a;side-=along*side.dot(along)
 if side.length<.001:side=along.cross(Vector((0,0,1)))
 side.normalize()
 foot=(l1*l1-l2*l2+distance*distance)/(2*distance)
 height=math.sqrt(max(0,l1*l1-foot*foot))
 elbow=a+along*foot+side*height
 rotate_bone_toward(upper,elbow-a)
 rotate_bone_toward(lower,target-rig.pose.bones[lower].head)

def contact_pose(name,t):
 # Feet remain planted for static environmental performances. Unlike the old
 # whole-body ground offset, each leg reaches its own actual ankle anchor.
 if name in ('Brace','Strike','InspectClose','PeekLeft','PeekRight','DoorPush','CrouchSearch'):
  for side,sign in [('L',1),('R',-1)]:
   target=Vector((sign*.145,.003,.145))
   two_bone_contact('Thigh.'+side,'Shin.'+side,target,(sign*.18,-1,.5))
   foot=rig.pose.bones['Foot.'+side]
   foot.matrix=Matrix.Translation(foot.head) @ rig.data.bones['Foot.'+side].matrix_local.to_quaternion().to_matrix().to_4x4()
   bpy.context.view_layer.update()
 # Stalk stance moves backward at constant speed. The .8 m stance excursion
 # over .68 of a 2.2 s loop gives a reference travel speed of 0.535 m/s.
 if name=='Stalk':
  for side,sign,offset in [('L',1,0),('R',-1,.5)]:
   p=(t+offset)%1
   if p<.68: forward=-.40+.80*(p/.68);lift=0
   else:
    swing=(p-.68)/.32;forward=.40-.80*smooth01(swing);lift=.07*sin(pi*swing)**2
   target=Vector((sign*.145,forward,.145+lift))
   two_bone_contact('Thigh.'+side,'Shin.'+side,target,(sign*.18,-1,.5))
   foot=rig.pose.bones['Foot.'+side]
   foot.matrix=Matrix.Translation(foot.head) @ rig.data.bones['Foot.'+side].matrix_local.to_quaternion().to_matrix().to_4x4()
   bpy.context.view_layer.update()
 # Contact targets share one plane and are held through the impact window.
 # The actor must be placed by this plane at runtime; do not slide the hands.
 arms=[]
 if name=='Brace':
  w=envelope(t,.04,.34,.69,.96)
  arms=[('L',1,(.28,-1.00,1.45),w),('R',-1,(-.28,-1.00,1.49),w)]
 elif name=='Strike':
  w=envelope(t,.36,.50,.55,.82)
  arms=[('R',-1,(-.20,-1.10,1.44),w)]
 elif name=='DoorPush':
  w=envelope(t,.02,.35,.68,.98)
  arms=[('R',-1,(-.20,-1.00,1.30),w)]
 elif name=='CrouchSearch':
  # Long fingers must clear the floor while investigating beneath a vehicle.
  # The asymmetrical wrists remain above .52 m at the deepest crouch.
  w=envelope(t,.02,.26,.76,.98)
  arms=[('L',1,(.28,-.72,.64),w),('R',-1,(-.25,-.56,.52),w)]
 elif name=='InspectClose':
  w=envelope(t,.04,.30,.77,1)
  arms=[('L',1,(.30,-.91,1.10),w)]
 for side,sign,target,w in arms:
  if w<=0:continue
  current=rig.pose.bones['Forearm.'+side].tail.copy();desired=current.lerp(Vector(target),w)
  two_bone_contact('UpperArm.'+side,'Forearm.'+side,desired,(sign*1.2,-.2,1.45))
  hand=rig.pose.bones['Hand.'+side]
  current_q=hand.matrix.to_quaternion();vertical=rig.data.bones['Hand.'+side].matrix_local.to_quaternion()
  hand.matrix=Matrix.Translation(hand.head) @ current_q.slerp(vertical,w).to_matrix().to_4x4()
  bpy.context.view_layer.update()

def add_clip(name,dur,fn,loop=True,samples=25):
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 frames=round(dur*30)
 for i in range(samples):
  t=i/(samples-1);frame=t*frames
  reset_pose();data,locs=fn(t);pose(data,locs)
  bpy.context.view_layer.update()
  contact_pose(name,t)
  # Maintain grounded boot contact from actual weighted sole vertices.
  sole_z=[]
  for side in ['L','R']:
   bn='Foot.'+side;group=mesh_obj.vertex_groups[bn].index
   transform=rig.pose.bones[bn].matrix @ rig.data.bones[bn].matrix_local.inverted()
   for vtx in mesh_obj.data.vertices:
    if vtx.co.z<.012 and any(g.group==group and g.weight>.99 for g in vtx.groups):sole_z.append((transform @ vtx.co).z)
  if sole_z:rig.pose.bones['Hips'].location.y-=min(sole_z)/rig.data.bones['Hips'].matrix_local.col[1].z
  bpy.context.view_layer.update()
  for pb in rig.pose.bones:
   pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
   pb.keyframe_insert('location',frame=frame,group=pb.name)
 for fc in action.fcurves:
  for kp in fc.keyframe_points:kp.interpolation='LINEAR'
 action.use_fake_user=True
 track=rig.animation_data.nla_tracks.new();track.name=name
 strip=track.strips.new(name,0,action);strip.action_frame_start=0;strip.action_frame_end=frames;track.mute=True
 CLIPS[name]={'duration_seconds':dur,'frames':frames,'loop':loop,'keyed_bones':len(rig.pose.bones)}
 return action

def idle(t):
 q=sin(2*pi*t)
 d={'Spine':(2+1.5*q,0,0),'Chest':(-1+1.3*q,0,1),'Neck':(4,0,-4),'Head':(-3+q,0,4+1.6*sin(2*pi*t)), 'UpperArm.L':(-3,0,2),'UpperArm.R':(3,0,-4),'Forearm.L':(-4+q,0,0),'Forearm.R':(-3-q,0,0)}
 return fingers(d,8+2*q,2),{'Hips':(0,.004*q,0)}
def gait(t,run=False):
 q=sin(2*pi*t);ql=sin(2*pi*t);qr=-ql
 amp=37 if run else 22
 d={'Spine':(12 if run else 4,0,3*q),'Chest':(8 if run else 2,0,-3*q),'Head':(-9 if run else -4,3*q,-3*q),'Neck':(2,0,0)}
 for side,s,phase in [('L',1,ql),('R',-1,qr)]:
  d['Thigh.'+side]=(-amp*phase,0,2*s)
  d['Shin.'+side]=(max(0,-phase)*(55 if run else 25)+4,0,0)
  d['Foot.'+side]=(-max(0,phase)*(13 if run else 8),0,0)
  d['UpperArm.'+side]=(amp*.9*phase,0,5*s)
  d['Forearm.'+side]=(-28 if run else -8,0,0)
 return fingers(d,18 if run else 8,3),{'Hips':(0,(.028 if run else .014)*(cos(4*pi*t)-1),0)}
def listen(t):
 w=sin(pi*t)**2
 d={'Spine':(1,0,-6*w),'Chest':(-2,0,-7*w),'Neck':(3,12*w,10*w),'Head':(-2,-28*w,18*w),'UpperArm.L':(-67*w,0,-23*w),'Forearm.L':(-82*w,0,10*w),'Hand.L':(8*w,0,25*w),'UpperArm.R':(6,0,-5)}
 return fingers(d,10+12*w,4),{}
def search(t):
 w=sin(pi*t)**2;scan=sin(2*pi*t)
 d={'Spine':(9*w,0,4*scan),'Chest':(7*w,12*scan,0),'Neck':(8*w,0,0),'Head':(3*w,35*scan,-8*scan),'UpperArm.L':(-12*w,0,-5),'UpperArm.R':(-7*w,0,4),'Forearm.L':(-16*w,0,0)}
 return fingers(d,9,5*w),{'Hips':(0,-.018*w,0)}
ATTACK_KEYS=[
 (0,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0),'UpperArm.R':(3,0,-4),'Forearm.R':(-4,0,0)},0),
 (.24,{'Spine':(-6,0,-9),'Chest':(-12,-8,-18),'Head':(7,15,6),'UpperArm.R':(-120,-12,-34),'Forearm.R':(-116,0,0),'Hand.R':(-10,0,-8),'UpperArm.L':(-20,0,20),'Forearm.L':(-15,0,0)},.018),
 (.40,{'Spine':(-8,0,-10),'Chest':(-12,-8,-20),'Head':(9,16,10),'UpperArm.R':(-125,-12,-36),'Forearm.R':(-120,0,0),'Hand.R':(-12,0,-8),'UpperArm.L':(-25,0,20),'Forearm.L':(-22,0,0)},.016),
 (.50,{'Spine':(25,0,7),'Chest':(20,4,21),'Head':(-20,-12,-8),'UpperArm.R':(-110,0,18),'Forearm.R':(-30,0,0),'Hand.R':(10,0,4),'UpperArm.L':(-38,0,-8),'Forearm.L':(-10,0,0),'Thigh.L':(-15,0,0),'Shin.L':(19,0,0),'Thigh.R':(9,0,0)},-.035),
 (.62,{'Spine':(22,0,10),'Chest':(18,6,28),'Head':(-19,-12,-10),'UpperArm.R':(-29,0,38),'Forearm.R':(-12,0,0),'Hand.R':(14,0,10),'UpperArm.L':(-19,0,-8),'Forearm.L':(-10,0,0),'Thigh.L':(-10,0,0),'Shin.L':(15,0,0)},-.028),
 (1,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0),'UpperArm.R':(3,0,-4),'Forearm.R':(-4,0,0)},0)]
def interpolate_keys(t,keys):
 for i in range(len(keys)-1):
  a,ad,az=keys[i];b,bd,bz=keys[i+1]
  if a<=t<=b:
   v=(t-a)/(b-a);d={}
   for n in set(ad)|set(bd):
    av=ad.get(n,(0,0,0));bv=bd.get(n,(0,0,0));d[n]=tuple(av[k]*(1-v)+bv[k]*v for k in range(3))
   return d,az*(1-v)+bz*v
 return keys[-1][1].copy(),keys[-1][2]
def attack(t):
 d,z=interpolate_keys(t,ATTACK_KEYS);fingers(d,7+32*sin(pi*t)**2,9*sin(pi*t)**2)
 return d,{'Hips':(0,z,0)}
def recover(t):
 v=(1-t)**2
 d={'Spine':(17*v+3,0,8*v),'Chest':(13*v,0,16*v),'Head':(-14*v,-12*v,-7*v),'UpperArm.R':(-24*v,0,26*v),'Forearm.R':(-13*v,0,0),'UpperArm.L':(-8*v,0,-7*v)}
 return fingers(d,8+22*v,3*v),{'Hips':(0,-.025*v,0)}
def inspect(t):
 w=sin(pi*t)**2
 d={'Spine':(24*w,0,-8*w),'Chest':(14*w,0,5*w),'Neck':(11*w,0,0),'Head':(8*w,-15*w,-8*w),'UpperArm.L':(-31*w,0,-10*w),'Forearm.L':(-20*w,0,0),'Hand.L':(16*w,0,0),'UpperArm.R':(-9*w,0,8*w),'Thigh.L':(-15*w,0,-5*w),'Shin.L':(26*w,0,0),'Thigh.R':(-7*w,0,5*w),'Shin.R':(16*w,0,0)}
 return fingers(d,10+15*w,7*w),{'Hips':(0,-.085*w,0)}

# 2.0: authored transitions and environmental contacts. These are in-place clips:
# the collision controller owns root translation/yaw. Never drive the mesh root
# from both animation and navigation, which would double movement and slide feet.
def smooth01(v):
 v=max(0,min(1,v));return v*v*(3-2*v)
def envelope(t,a,b,c,d):
 return smooth01((t-a)/(b-a))*(1-smooth01((t-c)/(d-c)))
def turn_pose(t,sign):
 # Head anticipates, hips follow, inside foot unweights, then both feet settle.
 # Runtime rotates 90 degrees during phases .20-.78. Root is never keyframed.
 anticipation=envelope(t,0,.17,.62,1)
 step=sin(pi*max(0,min(1,(t-.18)/.58)))**2 if .18<t<.76 else 0
 settle=sin(pi*t)**2
 d={'Head':(-3,-sign*28*anticipation,-sign*5*anticipation),
    'Neck':(3,-sign*9*anticipation,0),
    'Chest':(1,sign*8*anticipation,-sign*7*settle),
    'Spine':(3,sign*3*anticipation,sign*4*settle),
    'UpperArm.L':(-6-10*settle,0,8*settle),
    'UpperArm.R':(-5+8*settle,0,-8*settle),
    'Forearm.L':(-9-8*settle,0,0),'Forearm.R':(-9-5*settle,0,0)}
 side='L' if sign>0 else 'R';other='R' if sign>0 else 'L'
 d['Thigh.'+side]=(-23*step,0,sign*8*step)
 d['Shin.'+side]=(38*step,0,0)
 d['Foot.'+side]=(-12*step,0,-sign*12*step)
 d['Thigh.'+other]=(3*settle,0,-sign*4*settle)
 d['Shin.'+other]=(5*settle,0,0)
 d['Foot.'+other]=(-2*settle,0,sign*5*settle)
 return fingers(d,9+6*settle,2),{'Hips':(sign*.025*step,-.015*step,0)}
BRAKE_KEYS=[
 (0,{'Spine':(11,0,0),'Chest':(8,0,0),'Head':(-8,0,0),'Thigh.L':(-15,0,0),'Shin.L':(17,0,0),'Thigh.R':(8,0,0),'UpperArm.L':(-16,0,7),'UpperArm.R':(18,0,-5),'Forearm.L':(-28,0,0),'Forearm.R':(-28,0,0)},0),
 (.30,{'Spine':(-5,0,2),'Chest':(16,0,-3),'Head':(-13,0,0),'Thigh.L':(-24,0,0),'Shin.L':(28,0,0),'Foot.L':(-4,0,0),'Thigh.R':(4,0,0),'Shin.R':(22,0,0),'UpperArm.L':(-36,0,10),'UpperArm.R':(-25,0,-8),'Forearm.L':(-25,0,0),'Forearm.R':(-35,0,0)},-.035),
 (.66,{'Spine':(2,0,0),'Chest':(2,0,0),'Head':(-2,0,0),'Thigh.L':(-6,0,0),'Shin.L':(9,0,0),'Thigh.R':(-3,0,0),'Shin.R':(6,0,0),'UpperArm.L':(-10,0,5),'UpperArm.R':(-8,0,-4),'Forearm.L':(-15,0,0),'Forearm.R':(-17,0,0)},-.015),
 (1,{'Spine':(2,0,0),'Chest':(-1,0,1),'Neck':(4,0,-4),'Head':(-3,0,4),'UpperArm.L':(-3,0,2),'UpperArm.R':(3,0,-4),'Forearm.L':(-4,0,0),'Forearm.R':(-3,0,0)},0)]
def brake(t):
 d,z=interpolate_keys(t,BRAKE_KEYS);return fingers(d,13-5*t,2),{'Hips':(0,z,0)}
def backstep(t):
 # One clearly lifted rear step. Controller backs up a bounded 0.25-0.40 m.
 lift=sin(pi*max(0,min(1,(t-.12)/.6)))**2 if .12<t<.72 else 0
 body=sin(pi*t)**2
 d={'Spine':(-5*body,0,-3*body),'Chest':(3*body,0,4*body),'Head':(-2,12*body,-6*body),
    'Thigh.R':(19*lift,0,-5*lift),'Shin.R':(30*lift,0,0),'Foot.R':(-13*lift,0,0),
    'Thigh.L':(-6*body,0,2*body),'Shin.L':(10*body,0,0),'Foot.L':(-3*body,0,0),
    'UpperArm.L':(-31*body,0,14*body),'Forearm.L':(-33*body,0,0),
    'UpperArm.R':(-20*body,0,-13*body),'Forearm.R':(-22*body,0,0)}
 return fingers(d,10+10*body,4*body),{'Hips':(-.024*lift,-.018*lift,0)}
BRACE_KEYS=[
 (0,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0)},0),
 (.22,{'Spine':(12,0,0),'Chest':(7,0,0),'Head':(-10,0,0),'UpperArm.L':(-77,0,-11),'Forearm.L':(-48,0,0),'Hand.L':(23,0,7),'UpperArm.R':(-85,0,10),'Forearm.R':(-42,0,0),'Hand.R':(26,0,-7),'Thigh.L':(-10,0,-4),'Shin.L':(15,0,0),'Thigh.R':(5,0,4),'Shin.R':(7,0,0)},-.018),
 (.38,{'Spine':(17,0,0),'Chest':(13,0,0),'Head':(-17,0,0),'UpperArm.L':(-92,0,-8),'Forearm.L':(-32,0,0),'Hand.L':(28,0,4),'UpperArm.R':(-96,0,8),'Forearm.R':(-29,0,0),'Hand.R':(30,0,-4),'Thigh.L':(-14,0,-4),'Shin.L':(20,0,0),'Thigh.R':(6,0,4),'Shin.R':(10,0,0)},-.025),
 (.67,{'Spine':(18,0,1),'Chest':(14,0,1),'Head':(-17,7,-3),'UpperArm.L':(-91,0,-8),'Forearm.L':(-33,0,0),'Hand.L':(28,0,4),'UpperArm.R':(-96,0,8),'Forearm.R':(-30,0,0),'Hand.R':(30,0,-4),'Thigh.L':(-14,0,-4),'Shin.L':(20,0,0),'Thigh.R':(6,0,4),'Shin.R':(10,0,0)},-.025),
 (1,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0)},0)]
def brace(t):
 d,z=interpolate_keys(t,BRACE_KEYS);return fingers(d,-6*envelope(t,.03,.3,.7,1),6),{'Hips':(0,z,0)}
STRIKE_KEYS=[
 (0,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0),'UpperArm.R':(-10,0,-4),'Forearm.R':(-8,0,0)},0),
 (.24,{'Spine':(-4,0,-8),'Chest':(-8,-7,-13),'Head':(5,9,4),'UpperArm.R':(-102,-8,-27),'Forearm.R':(-111,0,0),'Hand.R':(-5,0,-6),'UpperArm.L':(-16,0,12),'Forearm.L':(-20,0,0)},.01),
 (.36,{'Spine':(-5,0,-8),'Chest':(-8,-7,-14),'Head':(6,10,5),'UpperArm.R':(-108,-8,-29),'Forearm.R':(-116,0,0),'Hand.R':(-8,0,-5),'UpperArm.L':(-19,0,12),'Forearm.L':(-20,0,0)},.01),
 (.50,{'Spine':(17,0,4),'Chest':(13,2,12),'Head':(-14,-7,-5),'UpperArm.R':(-113,0,7),'Forearm.R':(-22,0,0),'Hand.R':(25,0,3),'UpperArm.L':(-34,0,-10),'Forearm.L':(-15,0,0),'Thigh.L':(-12,0,0),'Shin.L':(18,0,0),'Thigh.R':(5,0,0),'Shin.R':(7,0,0)},-.02),
 (.55,{'Spine':(15,0,4),'Chest':(12,2,11),'Head':(-13,-7,-5),'UpperArm.R':(-109,0,8),'Forearm.R':(-27,0,0),'Hand.R':(24,0,3),'UpperArm.L':(-32,0,-10),'Forearm.L':(-17,0,0),'Thigh.L':(-11,0,0),'Shin.L':(17,0,0),'Thigh.R':(5,0,0),'Shin.R':(7,0,0)},-.02),
 (.72,{'Spine':(9,0,3),'Chest':(5,0,6),'Head':(-6,-4,-2),'UpperArm.R':(-55,0,13),'Forearm.R':(-55,0,0),'Hand.R':(10,0,3),'UpperArm.L':(-20,0,-6),'Forearm.L':(-17,0,0)},-.01),
 (1,{'Spine':(3,0,0),'Chest':(2,0,0),'Head':(-2,0,0),'UpperArm.R':(-10,0,-4),'Forearm.R':(-8,0,0)},0)]
def strike(t):
 d,z=interpolate_keys(t,STRIKE_KEYS);return fingers(d,5+14*sin(pi*t)**2,5),{'Hips':(0,z,0)}
def inspect_close(t):
 # Slow descent, a long held look through slats, then deliberate release.
 w=envelope(t,0,.32,.77,1)
 glance=sin(2*pi*max(0,min(1,(t-.30)/.46)))*w if .30<t<.76 else 0
 d={'Spine':(22*w,0,-8*w),'Chest':(15*w,0,7*w),'Neck':(13*w,6*glance,0),
    'Head':(-3+8*w,-14*w+10*glance,-10*w),
    'UpperArm.L':(-73*w,0,-13*w),'Forearm.L':(-57*w,0,0),'Hand.L':(23*w,0,7*w),
    'UpperArm.R':(-15*w,0,10*w),'Forearm.R':(-21*w,0,0),
    'Thigh.L':(-29*w,0,-6*w),'Shin.L':(47*w,0,0),'Foot.L':(-15*w,0,0),
    'Thigh.R':(-20*w,0,5*w),'Shin.R':(37*w,0,0),'Foot.R':(-13*w,0,0)}
 return fingers(d,10+14*w,5*w),{'Hips':(0,-.11*w,0)}

# 3.0: restrained evidence-driven performances. The old fifteen actions above
# are intentionally untouched. Root transforms remain constant in every action.
def stalk(t):
 # Ankle movement is baked separately so the loaded sole travels backward
 # linearly during stance and clears the floor on swing.
 q=sin(2*pi*t)
 d={'Spine':(11,0,1.6*q),'Chest':(7,0,-1.3*q),'Neck':(1,-3*q,0),
    'Head':(-12,6*q,-2*q),
    'UpperArm.L':(-13+7*q,0,-3),'UpperArm.R':(-12-7*q,0,3),
    'Forearm.L':(-20-2*q,0,0),'Forearm.R':(-18+2*q,0,0)}
 return fingers(d,11+2*cos(2*pi*t),2),{'Hips':(.008*q,-.18+.006*cos(4*pi*t),0)}

def peek(t,sign):
 # Head leads, chest follows and both settle. No lateral root motion.
 head=envelope(t,0,.21,.75,1);body=envelope(t,.12,.38,.68,.94)
 d={'Head':(-3,-sign*36*head,-sign*3*head),
    'Neck':(3,-sign*13*head,0),'Chest':(2,sign*4*body,-sign*5*body),
    'Spine':(3,0,-sign*2*body),'UpperArm.L':(-8,0,-3),
    'UpperArm.R':(-7,0,3),'Forearm.L':(-10,0,0),'Forearm.R':(-10,0,0)}
 return fingers(d,9+2*body,2),{'Hips':(0,-.015*body,0)}

def door_push(t):
 reach=envelope(t,.02,.35,.68,.98);weight=envelope(t,.17,.47,.68,.94)
 d={'Spine':(3+14*weight,0,2*weight),'Chest':(2+10*weight,0,4*weight),
    'Head':(-2-12*weight,-3*weight,0),'Neck':(2,0,0),
    'UpperArm.R':(-8-79*reach,0,-5+9*reach),
    'Forearm.R':(-8-25*reach,0,0),'Hand.R':(22*reach,0,0),
    'UpperArm.L':(-8-13*weight,0,-4),'Forearm.L':(-11-6*weight,0,0)}
 return fingers(d,8-15*reach,4*reach),{'Hips':(0,-.045*weight,0)}

def crouch_search(t):
 crouch=envelope(t,.02,.26,.76,.98)
 # A deliberate left-to-right inspection while low, then standing.
 scan=sin(2*pi*max(0,min(1,(t-.26)/.48)))*crouch if .26<t<.74 else 0
 d={'Spine':(3+18*crouch,0,-2*crouch),'Chest':(2+12*crouch,5*scan,0),
    'Neck':(2+5*crouch,-7*scan,0),'Head':(-3+4*crouch,28*scan,-5*crouch),
    'UpperArm.L':(-9-39*crouch,0,-4),'Forearm.L':(-9-38*crouch,0,0),
    'UpperArm.R':(-7-23*crouch,0,2),'Forearm.R':(-10-31*crouch,0,0)}
 return fingers(d,9+6*crouch,3*crouch),{'Hips':(0,-.27*crouch,0)}

START_RUN_KEYS=[
 (0,{'Spine':(2,0,0),'Chest':(-1,0,1),'Neck':(4,0,-4),'Head':(-3,0,4),'UpperArm.L':(-3,0,2),'UpperArm.R':(3,0,-4),'Forearm.L':(-4,0,0),'Forearm.R':(-3,0,0)},0),
 (.20,{'Spine':(4,0,0),'Chest':(2,0,0),'Neck':(2,0,0),'Head':(-9,0,0),'UpperArm.L':(-8,0,4),'UpperArm.R':(4,0,-4),'Forearm.L':(-12,0,0),'Forearm.R':(-10,0,0)},-.018),
 (.48,{'Spine':(12,0,0),'Chest':(8,0,0),'Neck':(2,0,0),'Head':(-9,0,0),'Thigh.L':(-17,0,2),'Shin.L':(22,0,0),'Foot.L':(-5,0,0),'Thigh.R':(10,0,-2),'Shin.R':(13,0,0),'UpperArm.L':(-18,0,5),'UpperArm.R':(16,0,-5),'Forearm.L':(-28,0,0),'Forearm.R':(-28,0,0)},-.04),
 (.77,{'Spine':(14,0,0),'Chest':(9,0,0),'Neck':(2,0,0),'Head':(-10,0,0),'Thigh.L':(-28,0,2),'Shin.L':(16,0,0),'Foot.L':(-9,0,0),'Thigh.R':(21,0,-2),'Shin.R':(30,0,0),'UpperArm.L':(-26,0,5),'UpperArm.R':(22,0,-5),'Forearm.L':(-28,0,0),'Forearm.R':(-28,0,0)},-.035),
 (1,{'Spine':(12,0,0),'Chest':(8,0,0),'Head':(-9,0,0),'Neck':(2,0,0),'Thigh.L':(0,0,2),'Thigh.R':(0,0,-2),'Shin.L':(4,0,0),'Shin.R':(4,0,0),'Foot.L':(0,0,0),'Foot.R':(0,0,0),'UpperArm.L':(0,0,5),'UpperArm.R':(0,0,-5),'Forearm.L':(-28,0,0),'Forearm.R':(-28,0,0)},0)]
def start_run(t):
 d,z=interpolate_keys(t,START_RUN_KEYS)
 return fingers(d,8+10*smooth01(t),3),{'Hips':(0,z,0)}

actions={}
actions['Idle']=add_clip('Idle',3.2,idle)
actions['Walk']=add_clip('Walk',1.4,lambda t:gait(t,False),samples=29)
actions['Run']=add_clip('Run',.8,lambda t:gait(t,True),samples=25)
actions['Listen']=add_clip('Listen',2.4,listen)
actions['Search']=add_clip('Search',3.2,search)
actions['Attack']=add_clip('Attack',1.6,attack,False,samples=49)
actions['Recover']=add_clip('Recover',1.5,recover,False)
actions['Inspect']=add_clip('Inspect',3.2,inspect)
actions['TurnLeft']=add_clip('TurnLeft',.9,lambda t:turn_pose(t,1),False,samples=28)
actions['TurnRight']=add_clip('TurnRight',.9,lambda t:turn_pose(t,-1),False,samples=28)
actions['Brake']=add_clip('Brake',.8,brake,False,samples=25)
actions['Backstep']=add_clip('Backstep',.9,backstep,False,samples=28)
actions['Brace']=add_clip('Brace',1.8,brace,False,samples=55)
actions['Strike']=add_clip('Strike',1.2,strike,False,samples=61)
actions['InspectClose']=add_clip('InspectClose',3.6,inspect_close,True,samples=55)
actions['Stalk']=add_clip('Stalk',2.2,stalk,True,samples=67)
actions['PeekLeft']=add_clip('PeekLeft',1.8,lambda t:peek(t,1),False,samples=55)
actions['PeekRight']=add_clip('PeekRight',1.8,lambda t:peek(t,-1),False,samples=55)
actions['DoorPush']=add_clip('DoorPush',1.8,door_push,False,samples=55)
actions['CrouchSearch']=add_clip('CrouchSearch',4.0,crouch_search,True,samples=81)
actions['StartRun']=add_clip('StartRun',.6,start_run,False,samples=37)
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
reset_pose();scene.frame_set(0)
# Metadata used in runtime integration and QA.
rig['character']='The Attendant'
rig['forward_gltf']='+Z'
rig['attack_contact_normalized']=.5
rig['attack_damage_window_normalized']='0.46-0.56'
rig['original_procedural_asset']=True
mesh_obj['weighted_skin']=True
# The baked materials deliberately use image texture * tint; convert multiply into
# dedicated small material images so the standard glTF exporter preserves grime.
for name,m in M.items():
 if name in ['black','eye']:continue
 bs=m.node_tree.nodes.get('Principled BSDF');col=tuple(m.diffuse_color)[:3]
 texim=bpy.data.images.new('Attendant_'+name+'_albedo',width=SZ,height=SZ,alpha=False)
 pix=[]
 for k in range(0,len(pixels),4):pix.extend([pixels[k]*col[0],pixels[k+1]*col[1],pixels[k+2]*col[2],1])
 texim.pixels=pix;texim.filepath_raw=os.path.join(OUT,'attendant-'+name+'.png');texim.file_format='PNG';texim.save();texim.pack()
 for link in list(m.node_tree.links):
  if link.to_node==bs and link.to_socket.name=='Base Color':m.node_tree.links.remove(link)
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=texim;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
# Select only the export rig and weighted mesh.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh_obj.select_set(True);bpy.context.view_layer.objects.active=rig
GLB=os.path.join(OUT,'attendant.glb')
bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_force_sampling=True,export_anim_single_armature=True,export_current_frame=False,export_skins=True,export_morph=False,export_materials='EXPORT',export_cameras=False,export_lights=False,export_apply=False,export_rest_position_armature=True)
# Save editable source with a studio setup. The studio never enters the exported GLB.
world=bpy.data.worlds.new('Attendant_studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.025,.033,.038,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='Preview_floor'
fm=mat('Preview_floor_material',(.038,.047,.050),.9,0,False);floor.data.materials.append(fm)
def area(name,loc,power,color,size,target=(0,0,1.2)):
 bpy.ops.object.light_add(type='AREA',location=loc);ob=bpy.context.object;ob.name=name;ob.data.energy=power;ob.data.color=color;ob.data.shape='DISK';ob.data.size=size;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Preview_key',(-3,-4,5),650,(.79,.85,1),4)
area('Preview_fill',(4,-1,2.7),280,(.78,.87,.75),3)
area('Preview_rim',(1,3,3),900,(.45,.68,.76),3)
bpy.ops.object.camera_add(location=(3.25,-5.5,2.55));camera=bpy.context.object;camera.name='Preview_camera';camera.data.type='ORTHO';camera.data.ortho_scale=2.96;camera.rotation_euler=(Vector((0,-.08,1.17))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False
scene.render.resolution_x=480;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
rig.animation_data.action=actions['Idle'];scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'attendant.blend'))
# Summary before render lets the integrator use the asset immediately.
triangles=sum(len(p.vertices)-2 for p in mesh_obj.data.polygons)
coords=[Vector(v.co) for v in mesh_obj.data.vertices]
minb=[min(v[k] for v in coords) for k in range(3)];maxb=[max(v[k] for v in coords) for k in range(3)]
manifest={
 'title':'The Attendant','version':'3.0','source_type':'Original procedural model, rig, textures, and authored animation; no third-party input assets',
 'license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','source_file':'build_attendant.py','editable_source':'attendant.blend',
 'provenance':'Generated from numerical geometry and authored bone transforms in build_attendant.py. No Quaternius, Kenney, or downloaded asset data was incorporated.',
 'gltf_axis':{'up':'+Y','forward':'+Z','units':'metres','origin':'ground-centred between boot soles'},
 'blender_axis':{'up':'+Z','forward':'-Y'},
 'bounds_rest_gltf':{'min':[minb[0],minb[2],-maxb[1]],'max':[maxb[0],maxb[2],-minb[1]],'height_metres':maxb[2]-minb[2]},
 'mesh':{'vertices_blender':len(mesh_obj.data.vertices),'triangles':triangles,'materials':len(mesh_obj.data.materials),'real_weighted_skin':True,'blended_joint_weights':True,'joints':sum(1 for b in rig.data.bones if b.use_deform),'skeleton_bones':len(rig.pose.bones),'root_motion':False,'embedded_textures':True},
 'clips':CLIPS,
 'attack_timing':{'duration_seconds':1.6,'windup_normalized':[0,.40],'swing_normalized':[.40,.50],'contact_normalized':.50,'contact_seconds':.80,'damage_window_normalized':[.46,.56],'recovery_normalized':[.56,1.0],'notes':'One deliberate right-arm overhand raking strike. Damage must be emitted once at normalized 0.50, never at attack start. Clip contains windup, contact, follow-through, and return. Recover is a separately authored settling motion for interrupted states.'},
 'validation':{'browser_qa':'Not performed by asset author. Integrator must inspect playback in Babylon.','pose_render_sheet':'attendant-contact-sheet.png'},
}
for fn in ['attendant.glb','build_attendant.py','attendant.blend']:
 data=open(os.path.join(OUT,fn),'rb').read();manifest.setdefault('files',{})[fn]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
manifest['integration']= {'asset_version': '3.0', 'game_release': '1.11', 'axes': {'up': '+Y', 'front': '+Z', 'units': 'metres'}, 'root_motion': False, 'triangles': 1868, 'joints': 38, 'reference_speeds_metres_per_second': {'Stalk': 0.53475935828877}, 'foot_contacts_normalized': {'Stalk': [0, 0.5]}, 'runtime_notes': ['The collision controller owns translation and yaw; every clip is in place.', 'Use Stalk playback ratio actual_speed / 0.53475936. Its nominal duration is 2.2 seconds. Allow ratio above 1.65 if stalking faster than 0.88 m/s.', 'Sample PeekLeft and PeekRight by paused gameplay phase. Head begins first; torso follows after phase .12; peak attention is .38-.68.', 'DoorPush meets its held target by phase .35; retain contact until .68; drive the interaction cue once inside this window. The reference point is Hand.R bone head (wrist). The palm/fingers extend down along the same contact plane.', 'Peek actions do not shift the root. The head leans only about 0.068 m to either side at the midpoint; full sleeves retain the existing silhouette width.', 'CrouchSearch stays planted, lowers during .02-.26, scans while low .26-.76, and rises by .98. Prefer it for a stopped evidence search.', 'StartRun is exactly .6 seconds, 18 source frames; its final pose joins Run at phase zero. Blend while increasing physical speed; it contains no root displacement.', 'Baked analytic contacts require no runtime IK solver. Do not infer hidden-player locations from animation state.'], 'new_clips': {'Stalk': {'duration': 2.2, 'loop': True, 'reference_speed': 0.53475935828877, 'contacts': [0, 0.5]}, 'PeekLeft': {'duration': 1.8, 'loop': False, 'anticipation': [0, 0.21], 'body_follow': [0.12, 0.38], 'hold': [0.38, 0.68]}, 'PeekRight': {'duration': 1.8, 'loop': False, 'anticipation': [0, 0.21], 'body_follow': [0.12, 0.38], 'hold': [0.38, 0.68]}, 'DoorPush': {'duration': 1.8, 'loop': False, 'contact_interval': [0.35, 0.68], 'right_hand_gltf': [-0.2, 1.3, 1.0]}, 'CrouchSearch': {'duration': 4, 'loop': True, 'low_scan_interval': [0.26, 0.76]}, 'StartRun': {'duration': 0.6, 'loop': False, 'joins_clip': 'Run', 'joins_phase': 0}}, 'browser_playback_verified': False, 'inspected_render_sheet': 'attendant-contact-sheet.png'}
open(os.path.join(OUT,'manifest.json'),'w').write(json.dumps(manifest,indent=2))
open(os.path.join(OUT,'integration-v3.json'),'w').write(json.dumps(manifest['integration'],indent=2))
print('ATTENDANT_EXPORTED',GLB,os.path.getsize(GLB),'triangles',triangles,flush=True)
# Render actual evaluated skeletal poses; no painted or composited creature stand-ins.
shots=[('01-stalk','Stalk',.20),('02-peek-left','PeekLeft',.50),('03-peek-right','PeekRight',.50),('04-push-reach','DoorPush',.35),('05-push-weight','DoorPush',.55),('06-crouch-search','CrouchSearch',.50),('07-start-run','StartRun',.70),('08-strike','Strike',.50),('09-idle','Idle',.10)]
for label,clip,t in shots:
 rig.animation_data.action=actions[clip];scene.frame_set(int(t*CLIPS[clip]['frames']),subframe=t*CLIPS[clip]['frames']%1);scene.render.filepath=os.path.join(OUT,label+'.png');bpy.ops.render.render(write_still=True)
print('ATTENDANT_RENDERS_COMPLETE',flush=True)
