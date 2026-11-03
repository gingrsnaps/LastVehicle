import bpy,json,os,math
from mathutils import Vector
P=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(P,'attendant.blend'))
rig=bpy.data.objects['The_Attendant'];mesh=bpy.data.objects['Attendant_Skinned_Mesh'];scene=bpy.context.scene
for tr in rig.animation_data.nla_tracks:tr.mute=True
meta=json.load(open(os.path.join(P,'manifest.json')));data={}
sole={}
for side in ('L','R'):
 g=mesh.vertex_groups['Foot.'+side].index
 sole[side]=[v.index for v in mesh.data.vertices if v.co.z<.012 and any(x.group==g and x.weight>.99 for x in v.groups)]
for name,clip in meta['clips'].items():
 rig.animation_data.action=bpy.data.actions[name]
 min_z=100;max_xz=0;max_y=0;anchors={};max_drift=0;max_penetration=0
 for i in range(61):
  t=i/60;f=t*clip['frames'];scene.frame_set(math.floor(f),subframe=f%1)
  deps=bpy.context.evaluated_depsgraph_get();evaluation=mesh.evaluated_get(deps);em=evaluation.to_mesh()
  for v in em.vertices:
   assert all(math.isfinite(x) for x in v.co)
   min_z=min(min_z,v.co.z);max_y=max(max_y,v.co.z);max_xz=max(max_xz,math.hypot(v.co.x,v.co.y))
  for side,indices in sole.items():
   pts=[em.vertices[j].co for j in indices]
   max_penetration=min(max_penetration,min(p.z for p in pts))
   center=sum(pts,Vector())/len(pts)
   if side not in anchors:anchors[side]=center.copy()
   max_drift=max(max_drift,(center-anchors[side]).length)
  evaluation.to_mesh_clear()
 data[name]={'sample_count':61,'mesh_min_z_metres':round(min_z,6),'sole_min_z_metres':round(max_penetration,6),'max_sole_anchor_drift_metres':round(max_drift,6),'maximum_height_metres':round(max_y,5),'maximum_horizontal_reach_metres':round(max_xz,5)}
 if name in ('Brace','Strike','InspectClose','PeekLeft','PeekRight','DoorPush','CrouchSearch'):
  assert max_drift<.002,(name,max_drift)
 if name in ('Brace','Strike','InspectClose','PeekLeft','PeekRight','DoorPush','CrouchSearch'):assert max_penetration>-.006,(name,max_penetration)
contacts={}
for name,phase in [('Brace',.5),('Strike',.5),('InspectClose',.5),('DoorPush',.5),('PeekLeft',.5),('PeekRight',.5),('CrouchSearch',.5)]:
 rig.animation_data.action=bpy.data.actions[name];f=meta['clips'][name]['frames']*phase;scene.frame_set(int(f),subframe=f%1)
 contacts[name]={'phase':phase,'bone_points_gltf':{}}
 for bn in ['Hand.L','Hand.R','Head']:
  pb=rig.pose.bones[bn];v=pb.head;contacts[name]['bone_points_gltf'][bn]=[round(v.x,5),round(v.z,5),round(-v.y,5)]
# StartRun deliberately joins the exact Run phase-zero pose.
rig.animation_data.action=bpy.data.actions['StartRun'];scene.frame_set(meta['clips']['StartRun']['frames'])
start_end={b.name:b.matrix.copy() for b in rig.pose.bones}
rig.animation_data.action=bpy.data.actions['Run'];scene.frame_set(0)
join_delta=max(abs(start_end[b.name][r][c]-b.matrix[r][c]) for b in rig.pose.bones for r in range(4) for c in range(4))
assert join_delta<1e-5,join_delta
report={'start_run_to_run_matrix_max_delta':join_delta,'clips':data,'contacts':contacts,'browser_playback_verified':False,'feet_anchored_for':['Brace','Strike','InspectClose','PeekLeft','PeekRight','DoorPush','CrouchSearch']}
json.dump(report,open(os.path.join(P,'pose-validation.json'),'w'),indent=2)
print(json.dumps(report,indent=2))
