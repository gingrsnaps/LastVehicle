"""Original CC0 Meridian yard details for Last Vehicle 1.16.

Run from any directory: blender --background --python build_props.py
All geometry is authored here in metres, +Y up and +Z facing the viewer.
Blender uses (x,-z,y); glTF export reverses that rotation without scale hacks.
Primitive construction follows this project's CC0 yard-v115 generator. This
pack contains only closed opaque solids, including wear, straps and paper ink.
The .blend and six independent GLBs are generated together from this source.
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
  me.update(); ob=bpy.data.objects.new(self.name,me); bpy.context.collection.objects.link(ob)
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
  path=MODELS/('v116-yard-'+self.name+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_apply=True)
  triangles=sum(len(f)-2 for f in self.f)
  return {'id':self.name,'file':'assets/models/'+path.name,'license':'CC0-1.0','draw_calls_max':len(set(self.mi)),'support_type':self.support,'front_axis':'+Z','units':'metres','origin':'support-bottom centre; wall rear mounting plane Z=0','bounds_min':lo,'bounds_max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)],'triangles':triangles,'vertices_authored':len(self.v),'closed_components':len(self.parts),'anchors':self.anchors,'contact_points':self.contacts,'notes':self.notes,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':self.parts}

AS=[]
def asset(name,support='ground',notes=''):
 a=Asset(name,support,notes); AS.append(a); return a

# 01 / A fixed trolley silhouette with four real wheel contacts, two distinct
# crates and straps continuing over each lid. It has no movable runtime parts.
a=asset('loading-trolley',notes='1.20 by 1.00 m overall footprint. Fixed scenery; wheels do not imply push interaction. Place beside the loading wall, outside the vehicle lane.')
for x in [-.46,.46]:
 for z in [-.31,.34]:
  a.cyl('rubber caster',(x,.105,z),.105,.08,'rubber','x',12)
  a.cyl('caster hub',(x+(.043 if x>0 else -.043),.105,z),.032,.014,'steel','x',6)
  a.box('wheel fork',(x,.215,z),(.055,.15,.095),'steel')
  a.contacts.append([x,0,z])
a.box('loading deck',(0,.275,.05),(1.16,.07,.90),'teal')
for x in [-.59,.59]: a.box('edge bumper',(x,.29,.05),(.02,.09,.90),'rubber')
for z in [-.39,.49]: a.box('deck cross lip',(0,.315,z),(1.18,.045,.02),'steel')
for x in [-.48,.48]: a.rod('handle upright',(x,.29,-.475),(x,1.075,-.475),.025,'steel')
a.rod('push bar',(-.48,1.075,-.475),(.48,1.075,-.475),.025,'rubber')
for x,z,w,h,d in [(-.25,.055,.56,.51,.63),(.29,.11,.44,.41,.51)]:
 y=.31+h/2; a.box('freight crate',(x,y,z),(w,h,d),'dust')
 for xx in [x-w*.39,x+w*.39]:
  for zz in [z-d/2-.014,z+d/2+.014]: a.box('crate corner batten',(xx,y,zz),(.043,h,.028),'ochre')
 for yy in [.34,.31+h-.03]: a.box('front crate batten',(x,yy,z+d/2+.02),(w,.055,.025),'ochre')
 for zz in [z-d/2-.031,z+d/2+.034]: a.box('vertical freight strap',(x+.06,y,zz),(.025,h+.016,.014),'dark')
 a.box('strap over lid',(x+.06,.31+h+.009,z),(.025,.018,d+.08),'dark')
 a.box('shipping paper',(x-.08,y+.03,z+d/2+.035),(.15,.105,.012),'paper')
 for i in range(3): a.box('shipping stencil',(x-.127+i*.038,y+.03,z+d/2+.043),(.017,.047,.004),'dark')
a.box('supported deck wear',(-.35,.315,.45),(.24,.008,.06),'rust')
a.anchor('handle',(0,1.075,-.475),(0,0,-1))

# 02 / Concrete feet set the exact broad footprint. Links alternate their
# planes and sag between attachment eyes; the gap remains visibly open.
a=asset('bollard-chain',notes='1.60 by .60 m feet. Use post blockers and an explicit chain crossing rule if required. Do not treat the entire open gap as an opaque AI sight blocker.')
for x in [-.58,.58]:
 a.foot('damaged concrete footing',(x,0,0),.44,.60,.14)
 a.cyl('post socket',(x,.16,0),.105,.05,'rust',n=8)
 a.cyl('painted bollard',(x,.555,0),.073,.79,'teal',n=10)
 a.cyl('warning collar',(x,.76,0),.077,.115,'ochre',n=10)
 a.cyl('dark cap',(x,.966,0),.082,.04,'dark',n=10)
 a.ring('chain attachment eye',(x,.80,.085),.041,.038,.012,'steel',n=8)
 for xx in [x-.14,x+.14]: a.cyl('foot anchor bolt',(xx,.151,.14),.022,.022,'steel',n=6)
 a.box('cast foot scar',(x-.10,.071,.301),(.10,.05,.004),'dust')
 a.contacts.extend([[x-.15,0,-.23],[x+.15,0,.23]])
for i in range(13):
 x=-.51+i*.085; y=.585+.215*(x/.51)**2
 a.ring('sagging chain link',(x,y,.095),.064,.032,.011,'steel' if i%4 else 'rust','xy' if i%2==0 else 'xz',n=10,sides=4)
a.anchor('chain_midpoint',(0,.585,.095),(0,0,1))

# 03 / The tarp is a closed irregular polyhedron, not a transparent or open
# plane. Its low hem still exposes supported crate edges and pallet runners.
a=asset('freight-tarp',notes='2.50 by 1.50 m footprint, about 1.20 m tall. Coarse opaque cover blocker may use the body bounds. Keep a clear passage around the cluster.')
for x in [-1.12,0,1.12]: a.box('pallet runner',(x,.075,0),(.18,.15,1.50),'dust')
for i in range(11): a.box('pallet top slat',(-1.15+i*.23,.18,0),(.20,.06,1.50),'ochre')
for x,w,h in [(-.59,1.05,.68),(.52,1.05,.81)]:
 a.box('stacked freight under tarp',(x,.21+h/2,0),(w,h,1.05),'dust')
 for xx in [x-w*.42,x+w*.42]: a.box('crate brace below hem',(xx,.35,.545),(.06,.28,.04),'ochre')
outline=[(-1.20,-.67),(-.62,-.71),(.58,-.69),(1.18,-.61),(1.20,.65),(.60,.70),(-.58,.69),(-1.19,.61)]
bottom_y=[.46,.43,.50,.41,.44,.39,.48,.42]
top_y=[1.03,1.09,1.17,1.14,1.11,1.18,1.06,1.01]
vs=[(x,bottom_y[i],z) for i,(x,z) in enumerate(outline)]
vs += [(x*.93,top_y[i],z*.90) for i,(x,z) in enumerate(outline)]
vs.append((.27,1.20,-.02)); vs.append((0,.435,0))
# Explicit triangles keep the intentionally nonplanar folds' normals exact.
faces=[(i,(i+1)%8,17) for i in range(8)]
for i in range(8):
 j=(i+1)%8; faces.extend([(i,i+8,j+8),(i,j+8,j)])
faces += [((i+1)%8+8,i+8,16) for i in range(8)]
a.mesh(vs,faces,'cloth','closed draped tarp')
for x,top in [(-.73,1.075),(.78,1.155)]:
 a.path('tie rope',[(x,.29,-.70),(x,top,-.63),(x,top+.014,.01),(x,top,.62),(x,.29,.70)],.014,'dark',6)
 for z in [-.70,.70]: a.cyl('rope anchor knot',(x,.29,z),.027,.04,'ochre',axis='x',n=6)
a.box('low freight label',(-.35,.325,.531),(.27,.13,.012),'paper')
for i in range(4): a.box('freight label ink',(-.42+i*.045,.325,.539),(.024,.06,.004),'dark')
a.anchor('cover_top',(.27,1.20,-.02),(0,1,0))
a.contacts=[[-1.12,0,-.65],[-1.12,0,.65],[1.12,0,-.65],[1.12,0,.65]]

# 04 / U-shaped gutter pieces are each closed solid. The visual trough is
# assembled from a bottom, lips and ends; no one-sided faces are exported.
a=asset('wall-services','wall','Rear mounting plane Z=0; +Z faces away from wall. Lower origin is the bottom of the wall service set, not terrain. Place 0.08–0.20 m above grade so outlet clears it.')
for x in [-.48,.45]:
 for y in [.31,1.28,2.20]: a.box('wall attachment pad',(x,y,.015),(.16,.075,.03),'rust')
a.box('gutter bottom',(0,2.295,.115),(1.30,.03,.23),'steel')
a.box('gutter rear lip',(0,2.35,.013),(1.30,.10,.026),'teal')
a.box('gutter front lip',(0,2.34,.222),(1.30,.08,.026),'teal')
for x in [-.637,.637]: a.box('gutter closed end',(x,2.335,.115),(.026,.11,.23),'steel')
a.box('gutter dark bed',(0,2.313,.115),(1.25,.006,.17),'dark')
a.cyl('gutter outlet collar',(-.40,2.265,.12),.071,.065,'rust',n=10)
a.cyl('downpipe',(-.40,1.215,.12),.052,2.05,'teal',n=10)
for y in [.31,1.28,2.20]:
 a.cyl('downpipe clamp',(-.40,y,.12),.061,.045,'steel',n=10)
 a.box('clamp wall tab',(-.46,y,.065),(.12,.045,.08),'steel')
a.path('downpipe outlet',[(-.40,.19,.12),(-.40,.08,.20),(-.40,.08,.285)],.052,'rust',8)
a.cyl('outlet dark end',(-.40,.08,.288),.043,.008,'dark','z',10)
a.box('junction housing',(.29,1.57,.075),(.40,.36,.15),'teal')
a.box('junction front',(.29,1.57,.156),(.35,.31,.014),'steel')
a.box('junction seam',(.29,1.57,.167),(.012,.25,.008),'dark')
a.box('junction warning plate',(.20,1.60,.171),(.10,.11,.008),'ochre')
for x in [.145,.435]:
 for y in [1.45,1.69]: a.cyl('box screw',(x,y,.17),.009,.008,'dark','z',6)
a.path('left electrical conduit',[(.20,0,.06),(.20,1.37,.06),(.20,1.40,.09)],.014,'dark',6)
a.path('right electrical conduit',[(.52,0,.055),(.52,1.99,.055),(.31,2.09,.055),(.31,1.77,.06)],.014,'steel',6)
for y in [.36,.93,1.22,1.98]: a.box('conduit saddle',(.52,y,.044),(.065,.03,.06),'rust')
a.anchor('junction_face',(.29,1.57,.175),(0,0,1))

# 05 / Small gatehouse chair. Each splayed leg ends inside a separate flat
# rubber foot; the actual foot vertices establish the floor and footprint.
a=asset('gatehouse-chair',notes='.65 by .65 m footprint. Seat anchor is at the top of its cushion. Static scenery; keep the chair outside gatehouse doors and interaction approach zones.')
for x in [-.29,.29]:
 for z in [-.29,.29]:
  a.cyl('rubber foot',(x,.025,z),.035,.05,'rubber',n=8)
  a.rod('splayed steel leg',(x,.045,z),(x*.80,.445,z*.78),.023,'steel',8)
  a.contacts.append([x,0,z])
a.box('seat pan',(0,.44,0),(.55,.05,.54),'teal')
a.box('seat cushion',(0,.49,.005),(.53,.06,.53),'cloth')
for x in [-.23,.23]:
 a.rod('back upright',(x,.43,-.23),(x,.975,-.265),.022,'steel',8)
 a.rod('seat side rail',(x,.405,-.22),(x,.405,.23),.019,'rust',6)
a.front_prism('rounded chair back',[(-.275,.67),(.275,.67),(.275,.91),(.24,.955),(-.24,.955),(-.275,.91)],-.265,.075,'teal')
a.front_prism('back upholstery',[(-.235,.70),(.235,.70),(.235,.89),(.21,.918),(-.21,.918),(-.235,.89)],-.22,.025,'cloth')
for x in [-.205,.205]: a.cyl('back fastener',(x,.72,-.203),.012,.009,'steel','z',6)
a.box('seat wear',(0,.522,.21),(.17,.004,.055),'dust')
a.anchor('seat_top',(0,.524,.005),(0,1,0))

# 06 / A calendar, hooks and a hanging coat share an actual rear mounting
# plane. Calendar marks are abstract geometry, so the asset uses no font file.
a=asset('calendar-coat','wall','Rear plane Z=0; lower origin is the hanging coat hem. Mount about .85–1.05 m above floor; +Z faces the room. Calendar is decorative, not a readable puzzle or promised interaction.')
a.box('wall hook rail',(0,1.15,.025),(1.10,.10,.05),'dust')
for x in [-.49,.49]: a.cyl('rail mounting bolt',(x,1.15,.056),.014,.014,'steel','z',6)
for x in [-.23,.05,.37]:
 a.path('coat hook',[(x,1.15,.05),(x,1.15,.14),(x,1.19,.15)],.013,'steel',6)
a.path('coat hanger',[(-.23,1.15,.13),(-.23,1.07,.14),(-.43,.955,.14),(-.03,.955,.14),(-.23,1.07,.14)],.012,'dark',6)
cx=-.23
a.front_prism('hanging coat torso',[(cx-.17,.015),(cx+.16,0),(cx+.17,.70),(cx+.20,.83),(cx+.09,.96),(cx-.09,.96),(cx-.20,.83),(cx-.16,.67)],.145,.10,'cloth')
a.front_prism('left hanging sleeve',[(-.52,.19),(-.43,.17),(-.38,.77),(-.43,.87),(-.49,.78)],.14,.10,'cloth')
a.front_prism('right hanging sleeve',[(.01,.18),(.09,.20),(.055,.79),(-.035,.88),(-.075,.77)],.14,.10,'cloth')
a.box('coat split',(cx,.42,.20),(.017,.75,.01),'dark')
for x in [cx-.105,cx+.105]: a.box('coat pocket',(x,.40,.205),(.115,.145,.02),'cloth')
for y in [.35,.51,.67,.82]: a.cyl('coat button',(cx+.034,y,.213),.012,.01,'ochre','z',6)
a.box('damp coat hem',(cx,.035,.200),(.30,.05,.012),'dark')
a.box('calendar backing',(.315,.725,.018),(.43,.71,.036),'dark')
a.box('calendar sheet',(.315,.715,.043),(.40,.66,.014),'paper')
a.box('calendar header',(.315,.985,.053),(.40,.12,.009),'teal')
for i in range(4): a.box('header abstract mark',(.23+i*.055,.99,.06),(.031,.038,.006),'paper')
for row in range(5):
 for col in range(7):
  x=.15+col*.054; y=.88-row*.090
  a.box('calendar date mark',(x,y,.054),(.020 if (row+col)%3 else .029,.023,.007),'dark')
a.box('calendar selected date',(.312,.70,.06),(.040,.041,.006),'rust')
for x in [.20,.43]: a.cyl('calendar binder ring',(x,1.073,.047),.014,.036,'steel','y',6)
a.anchor('calendar_face',(.315,.715,.065),(0,0,1))

records=[a.finish() for a in AS]
assert len(records)==6
assert sum(a['triangles'] for a in records)<=6500
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Meridian_Yard_Details_v116.blend'))
manifest={'title':'Meridian Yard Details','version':'1.0','game_release':'Last Vehicle 1.16','license':'CC0-1.0','source_type':'Original numeric geometry and palette materials; no external asset inputs','source_file':'build_props.py','editable_source':'Meridian_Yard_Details_v116.blend','coordinate_system':{'up':'+Y','forward':'+Z','units':'metres'},'palette_srgb':{k:v[0] for k,v in PALETTE.items()},'material_names':['Yard115_'+k for k in PALETTE],'assets':records,'total_bytes':sum(x['bytes'] for x in records),'total_triangles':sum(x['triangles'] for x in records),'runtime_notes':['One mesh per prop, material primitives; share Yard115 materials and batch static placements.','Every source component is a closed consistently wound positive-volume solid.','No textures, animation, audio, cameras, lights, particles or external dependencies.','Babylon left-handed glTF loading mirrors X. Preserve its import root; use loaded anchor nodes.']}
(ROOT/'yard-build.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('YARD116_SUMMARY '+json.dumps({'total_bytes':manifest['total_bytes'],'total_triangles':manifest['total_triangles'],'dimensions':{a['id']:a['dimensions'] for a in records}}))
