"""Original CC0 Meridian scenery kit for Last Vehicle 1.19.

Run from any directory: blender --background --python build_props.py
All geometry is authored here in metres, +Y up and +Z facing the viewer.
Blender uses (x,-z,y); glTF export reverses that rotation without scale hacks.
Primitive construction follows this project's CC0 yard-v115 generator. This
pack contains only closed opaque solids. No external images or models are used.
The .blend and ten independent GLBs are generated together from this source.
"""
from pathlib import Path
import bpy, json, math, hashlib
from collections import Counter
from mathutils import Vector, Euler

ROOT=Path(__file__).resolve().parent
MODELS=ROOT.parents[1]/'dist/assets/models'
MODELS.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1

# Intentionally retain the existing shared names and exact PBR values. Runtime
# batches can reuse the Yard115 materials across both versions of the pack.
PALETTE={
 'teal':('#2e514e',.82,.10), 'steel':('#63706b',.57,.45),
 'dark':('#1a292b',.86,.12), 'rubber':('#152024',.96,0),
 'ochre':('#b09a61',.85,.05), 'paper':('#b9b7a3',.97,0),
 'rust':('#76503a',.94,.15), 'concrete':('#737d75',.96,0),
 'cloth':('#657266',1,0), 'dust':('#85816c',.96,0),
 'wood':('#85785a',.95,0), 'moss':('#465a39',1,0),
}
def srgb(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
MATS={}
for name,(hx,rough,metal) in PALETTE.items():
 c=tuple(srgb(int(hx[i:i+2],16)/255) for i in (1,3,5))
 m=bpy.data.materials.new('Yard115_'+name); m.diffuse_color=(*c,1); m.use_nodes=True; m.use_backface_culling=True
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*c,1)
 bs.inputs['Roughness'].default_value=rough
 bs.inputs['Metallic'].default_value=metal
 MATS[name]=m
MATNAMES=list(MATS)
def conv(p): return (p[0],-p[2],p[1])

class Asset:
 def __init__(self,name,support='ground',notes=''):
  self.name=name; self.support=support; self.notes=notes
  self.v=[]; self.f=[]; self.mi=[]; self.parts=[]; self.anchors={}; self.contacts=[]
 def mesh(self,vertices,faces,mat,label):
  # Every disconnected component must be a closed consistently wound solid.
  # Intersections between supported components are intentional, not loose scraps.
  edges=Counter(); direction=Counter(); volume=0
  for f in faces:
   for a,b in zip(f,f[1:]+f[:1]):
    edges[tuple(sorted((a,b)))]+=1; direction[(a,b)]+=1
   for j in range(1,len(f)-1):
    a,b,c=[Vector(vertices[k]) for k in (f[0],f[j],f[j+1])]
    volume+=a.dot(b.cross(c))/6
  if any(n!=2 for n in edges.values()): raise ValueError(label+' has an open/non-manifold edge')
  if any(direction[(a,b)]!=direction[(b,a)] for a,b in edges): raise ValueError(label+' has inconsistent winding')
  if volume<=1e-12: raise ValueError(label+' has inward or zero-volume geometry: '+str(volume))
  k=len(self.v)
  self.v.extend(tuple(p) for p in vertices)
  self.f.extend(tuple(i+k for i in f) for f in faces)
  self.mi.extend([MATNAMES.index(mat)]*len(faces))
  self.parts.append({'name':label,'vertices':len(vertices),'faces':len(faces),'closed':True,'signed_volume_m3':volume})
 def box(self,label,p,size,mat='teal',rot=None):
  x,y,z=p; w,h,d=[v/2 for v in size]
  vs=[(-w,-h,-d),(w,-h,-d),(w,h,-d),(-w,h,-d),(-w,-h,d),(w,-h,d),(w,h,d),(-w,h,d)]
  if rot: vs=[Euler(rot,'XYZ').to_matrix()@Vector(v) for v in vs]
  self.mesh([(v[0]+x,v[1]+y,v[2]+z) for v in vs],[(0,1,5,4),(3,7,6,2),(4,5,6,7),(3,2,1,0),(0,4,7,3),(1,2,6,5)],mat,label)
 def rod(self,label,a,b,r,mat='steel',n=8,top=None):
  a=Vector(a); b=Vector(b); axis=(b-a).normalized()
  u=axis.cross(Vector((0,1,0) if abs(axis.y)<.9 else (0,0,1))).normalized()
  v=axis.cross(u); rt=r if top is None else top
  vs=[tuple(o+rr*(u*math.cos(t*2*math.pi/n)+v*math.sin(t*2*math.pi/n))) for o,rr in [(a,r),(b,rt)] for t in range(n)]
  fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.mesh(vs,fs,mat,label)
 def cyl(self,label,p,r,h,mat='steel',axis='y',n=8,top=None):
  v=Vector({'x':(1,0,0),'y':(0,1,0),'z':(0,0,1)}[axis]); p=Vector(p)
  self.rod(label,p-v*h/2,p+v*h/2,r,mat,n,top)
 def path(self,label,points,r,mat='rubber',n=6):
  for a,b in zip(points,points[1:]): self.rod(label,a,b,r,mat,n)
 def ring(self,label,p,rx,ry,tube,mat='steel',plane='xy',n=10,sides=4):
  # Alternating oval links share a horizontal major axis; their tube is solid.
  u=Vector((1,0,0)); v=Vector((0,1,0) if plane=='xy' else (0,0,-1)); ax=u.cross(v)
  p=Vector(p); vs=[]
  for i in range(n):
   t=i*2*math.pi/n; normal=(u*(math.cos(t)/rx)+v*(math.sin(t)/ry)).normalized()
   c=p+u*rx*math.cos(t)+v*ry*math.sin(t)
   for j in range(sides):
    q=j*2*math.pi/sides; vs.append(tuple(c+normal*tube*math.cos(q)+ax*tube*math.sin(q)))
  fs=[(i*sides+j,((i+1)%n)*sides+j,((i+1)%n)*sides+(j+1)%sides,i*sides+(j+1)%sides) for i in range(n) for j in range(sides)]
  self.mesh(vs,fs,mat,label)
 def front_prism(self,label,outline,z,depth,mat):
  # Outline is counter-clockwise in XY. Both end faces are closed, not decals.
  n=len(outline); vs=[(x,y,z+zz) for zz in [-depth/2,depth/2] for x,y in outline]
  self.mesh(vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,label)
 def foot(self,label,p,w,d,h,mat='concrete'):
  # Asymmetrically clipped corners suggest damage without unsupported debris.
  x,y,z=p; outline=[(-w/2+.06,-d/2),(w/2-.035,-d/2),(w/2,-d/2+.07),(w/2,d/2-.05),(w/2-.08,d/2),(-w/2+.025,d/2),(-w/2,d/2-.07),(-w/2,-d/2+.035)]
  n=len(outline); vs=[(x+xx,y+yy,z+zz) for yy in [0,h] for xx,zz in outline]
  self.mesh(vs,[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)],mat,label)
 def anchor(self,name,p,normal=None):
  self.anchors[name]={'position':list(p),**({'normal':list(normal)} if normal else {})}
 def finish(self):
  # Normalize the actual lowest vertex and rear mounting plane, including all
  # geometry and anchors, before making the GLB. No runtime origin correction.
  dy=-min(v[1] for v in self.v)
  dz=-min(v[2] for v in self.v) if self.support=='wall' else 0
  self.v=[(x,y+dy,z+dz) for x,y,z in self.v]
  for info in self.anchors.values(): info['position'][1]+=dy; info['position'][2]+=dz
  self.contacts=[[x,y+dy,z+dz] for x,y,z in self.contacts]
  me=bpy.data.meshes.new(self.name+'_mesh'); me.from_pydata([conv(v) for v in self.v],[],self.f)
  for m in MATS.values(): me.materials.append(m)
  for poly,idx in zip(me.polygons,self.mi): poly.material_index=idx; poly.use_smooth=False
  me.update()
  # Finite face-projected local UVs make these stand-alone assets useful outside
  # this game too. The runtime reprojects eligible palettes at physical scale.
  uv=me.uv_layers.new(name='SurfaceUV')
  for poly in me.polygons:
   axis=max(range(3),key=lambda i:abs(poly.normal[i]))
   axes=[i for i in range(3) if i!=axis]
   for li in poly.loop_indices:
    q=me.vertices[me.loops[li].vertex_index].co
    uv.data[li].uv=(q[axes[0]],q[axes[1]])
  ob=bpy.data.objects.new(self.name,me); bpy.context.collection.objects.link(ob)
  ob['asset_id']=self.name; ob['license']='CC0-1.0'; ob['support_type']=self.support
  ob['front_axis']='gltf +Z'; ob['units']='metres'; ob['closed_components']=True
  lo=[min(v[i] for v in self.v) for i in range(3)]; hi=[max(v[i] for v in self.v) for i in range(3)]
  self.anchor('support_bottom',(0,lo[1],0),(0,1,0))
  if self.support=='wall': self.anchor('rear_mount',(0,(lo[1]+hi[1])/2,lo[2]),(0,0,1))
  bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob
  for name,info in self.anchors.items():
   e=bpy.data.objects.new(self.name+'__'+name,None); bpy.context.collection.objects.link(e)
   e.parent=ob; e.location=conv(info['position']); e.empty_display_size=.035
   e['anchor_name']=name; e.select_set(True); info['node']=e.name
  path=MODELS/('lv119-'+self.name+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_apply=True)
  triangles=sum(len(f)-2 for f in self.f)
  return {'id':self.name,'file':'assets/models/'+path.name,'license':'CC0-1.0','draw_calls_max':len(set(self.mi)),'support_type':self.support,'front_axis':'+Z','units':'metres','origin':'support-bottom centre; wall rear mounting plane Z=0','bounds_min':lo,'bounds_max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)],'triangles':triangles,'vertices_authored':len(self.v),'closed_components':len(self.parts),'anchors':self.anchors,'contact_points':self.contacts,'notes':self.notes,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':self.parts}

AS=[]
def asset(name,support='ground',notes=''):
 a=Asset(name,support,notes); AS.append(a); return a

# 01 / Three unmistakable pallets. Each upper pallet rests on the boards below.
# Different board lengths and a chipped corner suggest use without loose scraps.
a=asset('worn-pallet-stack',notes='Ground scenery. Keep clear of pedestrian strips, controls and vehicle swept paths; footprint 1.22 x .92 m.')
for layer in range(3):
 y=layer*.19; dx=.012*layer; dz=-.014*layer
 for z in [-.34,0,.34]: a.box('lower bearer',(dx,y+.028,z+dz),(1.18,.056,.11),'wood')
 for x in [-.47,0,.47]:
  for z in [-.34,.34]: a.box('spacer block',(x+dx,y+.096,z+dz),(.13,.08,.13),'dust')
 for i in range(5):
  x=-.48+i*.24
  a.box('worn top plank',(x+dx,y+.164,dz),(.19,.052,.90-(.05 if layer==2 and i==0 else 0)),'wood')
  if layer==2:
   for z in [-.34,.34]:a.cyl('nail head',(x+dx,y+.192,z+dz),.009,.004,'dark',n=5)
 for x,z in [(-.49,-.42),(.49,.42)]: a.box('dark end wear',(x+dx,y+.166,z+dz),(.15,.04,.012),'dark')

# 02 / A hollow tapered waste bin with uneven panel outlines and a displaced,
# but rim-supported, lid. Wheel and front-foot contacts sit exactly on the floor.
a=asset('dented-bin',notes='Ground scenery. Open cavity and canted lid make the outline readable; no animation or implied interaction.')
outline=[(-.29,-.24),(.25,-.24),(.31,-.17),(.30,.19),(.22,.27),(-.23,.26),(-.32,.17),(-.30,-.16)]
n=len(outline);bottom=[(x*.82,.20,z*.82) for x,z in outline];top=[(x,1.03,z) for x,z in outline]
innerbottom=[(x*.82*.91,.20,z*.82*.91) for x,z in outline];innertop=[(x*.91,1.03,z*.91) for x,z in outline]
faces=[]
for i in range(n):
 j=(i+1)%n
 faces.extend([(i,i+n,j+n,j),(2*n+i,2*n+j,3*n+j,3*n+i),(n+i,3*n+i,3*n+j,n+j),(i,j,2*n+j,2*n+i)])
a.mesh(bottom+top+innerbottom+innertop,faces,'teal','hollow dented bin shell')
a.box('bin cavity floor',(0,.215,0),(.50,.035,.42),'dark')
for x in [-.20,.20]:
 a.cyl('rear rolling wheel',(x,.095,-.22),.095,.065,'rubber','x',12)
 a.box('rear wheel fork',(x,.185,-.22),(.055,.16,.06),'steel')
 a.box('front support foot',(x,.105,.19),(.07,.21,.08),'dark')
a.box('loose supported lid',(.045,1.06,-.045),(.62,.045,.55),'dark',(.02,.055,0))
a.box('lid lifting grip',(.04,1.11,-.02),(.21,.07,.035),'steel')
for x in [-.2,.2]:a.box('bin handle lug',(x,.93,-.275),(.055,.07,.06),'steel')
a.rod('rear grip',(-.2,.94,-.305),(.2,.94,-.305),.022,'rubber')
a.box('faded collection label',(0,.72,.269),(.24,.19,.012),'paper')
for x in [-.075,-.02,.05]:a.box('label stencil',(x,.73,.278),(.025,.07,.006),'dark')
a.box('panel abrasion',(-.215,.42,.246),(.085,.2,.012),'rust')

# 03 / The broad damaged foot is still stable. Exposed metal ends are rigid
# reinforcement, not trailing cables. Broken chips remain grounded beside it.
a=asset('damaged-road-barrier',notes='Ground scenery or an explicitly authored blocker. Use outside the driveable route; 2.25 m wide with a broad stable base.')
a.foot('damaged concrete plinth',(0,0,0),2.10,.57,.16)
outline=[(-1.00,.16),(-.93,.63),(-.38,.66),(-.24,.58),(.08,.66),(.65,.66),(.76,.54),(.96,.60),(1.01,.16)]
# Reverse this profile to the counter-clockwise convention for front_prism.
a.front_prism('chipped concrete body',list(reversed(outline)),0,.35,'concrete')
for x in [-.72,-.23,.26,.7]:
 a.box('faded warning face',(x,.43,.181),(.30,.19,.012),'ochre')
 a.box('old stripe',(x+.03,.43,.19),(.06,.2,.009),'dark',(0,0,-.3))
a.rod('exposed rigid reinforcement',(.66,.50,0),(.80,.70,0),.015,'rust',6)
a.foot('grounded broken chip',(-1.04,0,.3),.28,.22,.09,'dust')

# 04 / Tyres use actual open torus silhouettes instead of featureless cylinders.
a=asset('tire-stack',notes='Ground scenery. Three supported tires, 0.70 m diameter; allow clearance around the entire footprint.')
for layer in range(3):
 x=(layer%2)*.025;z=(layer%2)*-.015;y=.09*math.sqrt(3)/2+layer*.09*math.sqrt(3)
 a.ring('open tire carcass',(x,y,z),.255,.255,.09,'rubber','xz',n=16,sides=6)
 for i in range(8):
  ang=i*math.pi/4
  a.box('raised worn tread',(x+math.sin(ang)*.328,y,z+math.cos(ang)*.328),(.055,.115,.025),'dark',(0,ang,0))

# 05 / Hand truck rests on its wheels and the low toe plate. Every bar joins
# another component; fixed scenery does not silently create push interaction.
a=asset('abandoned-hand-truck',notes='Ground scenery. Tip rests at floor level and wheels touch the floor. Do not place in front of a task or shelter.')
for x in [-.25,.25]:
 a.cyl('rubber wheel',(x,.13,-.16),.13,.075,'rubber','x',12)
 a.cyl('hub',(x+(.04 if x>0 else -.04),.13,-.16),.04,.012,'steel','x',8)
 a.rod('leaning upright',(x,.14,-.13),(x,1.15,-.29),.025,'teal')
 a.rod('rubber handle',(x,1.15,-.29),(x,1.15,-.41),.03,'rubber')
a.rod('wheel axle',(-.29,.13,-.16),(.29,.13,-.16),.022,'steel')
for y in [.35,.64,.92]:
 z=-.13-(y-.14)/1.01*.16
 a.rod('frame cross bar',(-.25,y,z),(.25,y,z),.022,'steel')
a.box('grounded toe plate',(0,.022,.13),(.58,.044,.64),'rust')
a.box('toe stiffening fold',(0,.07,-.17),(.57,.10,.04),'steel')
a.box('faded company plate',(0,.66,-.20),(.29,.16,.018),'ochre')
for x in [-.07,0,.07]:a.box('plate lettering',(x,.66,-.186),(.025,.05,.008),'dark')

# 06 / Rear plane at Z=0 is the wall mount. The louvers touch both sides of
# the frame; this prop must be anchored to a wall, not suspended in open space.
a=asset('wall-vent','wall',notes='Wall-mounted lower-edge origin with rear Z=0. Front +Z, 0.90 m wide. Mount against a real wall at 0.45–2.3 m lower-edge height.')
a.box('dark vent recess',(0,.43,.035),(.84,.82,.07),'dark')
for x in [-.43,.43]:a.box('vent frame side',(x,.44,.07),(.06,.88,.14),'teal')
for y in [.03,.85]:a.box('vent frame crosspiece',(0,y,.07),(.9,.06,.14),'teal')
for i in range(7):a.box('sloped metal louver',(0,.12+i*.103,.115),(.84,.065,.10),'steel',(.30,0,0))
for x in [-.43,.43]:
 for y in [.06,.82]:a.cyl('mounting screw',(x,y,.145),.013,.014,'rust','z',6)
a.anchor('front_center',(0,.44,.17),(0,0,1))

# 07 / Timber lies directly on the floor, with solid flat straps supporting
# the bundle's outline. Shorter top boards expose ends and layered construction.
a=asset('timber-bundle',notes='Ground scenery. Broad 2.25 x 0.75 m stack; use along walls or outside fences, never across a walking lane.')
for layer in range(3):
 for row in range(3):
  length=2.22-(.14 if layer==2 and row==0 else .03*row)
  a.box('weathered timber',(0,layer*.11+.055,-.255+row*.255),(length,.11,.235),'wood')
for x in [-.72,.69]:
 a.box('bundle top band',(x,.339,0),(.037,.018,.75),'dark')
 for z in [-.376,.376]:a.box('bundle side band',(x,.174,z),(.037,.348,.012),'dark')
for x in [-1.1,1.1]:a.box('exposed end wear',(x,.18,.13),(.012,.08,.1),'dust')

# 08 / Small drainage reeds: no transparent alpha cards, no dynamic simulation.
# Every stalk begins at the ground and leaf bases intersect their parent stalk.
a=asset('drain-reeds',notes='Grounded opaque foliage. Repeat at damp wall/fence bases outside clear task approaches. 0.6–0.8 m tall; no collision needed.')
for i in range(10):
 angle=i*2.39996;x=math.sin(angle)*(.09+.025*(i%3));z=math.cos(angle)*(.09+.025*(i%3));h=.45+(i%4)*.09
 mid=(x,h*.53,z)
 tip=(x+math.sin(angle)*.13,h,z+math.cos(angle)*.13)
 a.rod('rooted reed stem',(x,0,z),mid,.012,'moss',5,top=.009)
 a.rod('bent reed tip',mid,tip,.009,'moss',5,top=.003)
 for side in [-1,1]:
  aa=angle+side*.9;start=(mid[0],mid[1]-.10,mid[2]);end=(start[0]+math.sin(aa)*.22,start[1]+.18,start[2]+math.cos(aa)*.22)
  a.rod('pointed reed leaf',start,end,.025,'moss',3,top=.0015)
 if i%3==0:a.rod('dry seed head',(tip[0],tip[1]-.07,tip[2]),(tip[0]+.012,tip[1]+.055,tip[2]),.025,'dust',6)

# 09 / Broken masonry is grounded at every piece, so scattering copies cannot
# create floating debris. Asymmetry is deterministic and reproducible.
a=asset('rubble-cluster',notes='Small grounded rubble patch. Place at damaged wall bases or beyond fences; decorative only unless a real blocker is authored.')
for i in range(8):
 ang=i*2.39996;x=math.sin(ang)*(.22+.05*(i%3));z=math.cos(ang)*(.24+.035*(i%4))
 w=.18+(i%3)*.05;d=.16+(i%2)*.07;h=.055+(i%4)*.028
 a.foot('grounded masonry fragment',(x,0,z),w,d,h,'concrete' if i%3 else 'rust')
for i in range(3):a.box('splintered board',(i*.14-.18,.018,.31-i*.08),(.34,.036,.065),'wood',(0,.13*i,0))

# 10 / A compact distant maintenance shed, with a roof that actually meets the
# walls. Boarded windows, rain gutter and skirting give a clear silhouette.
a=asset('maintenance-shed',notes='Background-only suggested. Ground origin, 2.3 x 2.7 m footprint. Use outside playable fence, no interior or runtime door interaction.')
a.foot('concrete shed footing',(0,0,0),2.3,2.7,.16)
a.box('shed wall body',(0,1.13,0),(2.12,1.94,2.5),'teal')
# Closed triangular ridge prism, axis along Z.
a.front_prism('pitched roof',[(-1.16,2.06),(1.16,2.06),(0,2.55)],0,2.76,'rust')
for x in [-.98,.98]:
 for z in [-1.20,1.20]:a.box('corner trim',(x,1.13,z),(.085,1.95,.085),'steel')
for i in range(8):a.box('front siding seam',(-.92+i*.26,1.14,1.257),(.025,1.90,.015),'dark')
a.box('shed door',(0,.97,1.272),(.85,1.60,.035),'wood')
for y in [.29,1.59]:a.box('door cross batten',(0,y,1.302),(.84,.09,.028),'steel')
a.box('door handle',(.29,1.01,1.333),(.035,.17,.035),'rust')
a.box('boarded side window',(-1.07,1.5,-.20),(.04,.56,.74),'dark')
for y in [1.36,1.59]:a.box('window shutter board',(-1.098,y,-.2),(.04,.15,.80),'wood')
a.rod('rigid gutter pipe',(-1.14,2.08,-1.30),(-1.14,.15,-1.30),.03,'steel',6)

# Export each independent model, then keep the editable collection as a .blend.
records=[]
for a in AS:
 record=a.finish()
 if record['triangles']>1200:raise ValueError(a.name+' exceeds triangle budget: '+str(record['triangles']))
 records.append(record)
# Gallery positions are editing convenience only; already-exported GLBs remain
# centred at their support origins and contain no cameras/lights/studio objects.
for i,a in enumerate(AS):bpy.data.objects[a.name].location=(i%5*3.5,i//5*4.5,0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Meridian_Scenery_v119.blend'))
report={'release':'Last Vehicle 1.19','units':'metres','front_axis':'+Z','material_names':[m.name for m in MATS.values()],'total_triangles':sum(a['triangles'] for a in records),'total_bytes':sum(a['bytes'] for a in records),'assets':records}
(ROOT/'scenery-build.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'assets':len(records),'triangles':report['total_triangles'],'bytes':report['total_bytes']}))
