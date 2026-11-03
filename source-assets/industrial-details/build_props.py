"""Original low-poly Meridian maintenance props for Last Vehicle 1.11.
Run: blender --background --python build_props.py
All geometry/materials are authored numerically here; no downloaded inputs.
Design coordinates use metres, Y up, +Z front. Export matches those glTF axes.
Blender uses (x,-z,y). Every model has a ground/support-bottom origin; wall
models additionally have a rear mounting plane at local Z=0. Nothing animates.
"""
from pathlib import Path
import bpy, json, math, hashlib, random
from mathutils import Vector, Euler
ROOT=Path(__file__).resolve().parent
MODELS=ROOT/'models'; MODELS.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
PALETTE={
 'teal':('#2e514e',.82,.10),'steel':('#63706b',.57,.45),'dark':('#1a292b',.86,.12),
 'rubber':('#152024',.96,.0),'ochre':('#b09a61',.85,.05),'paper':('#b9b7a3',.97,0),
 'rust':('#76503a',.94,.15),'red':('#8d4034',.74,.10),'glass':('#425b58',.28,.18),
 'concrete':('#737d75',.96,0),'cloth':('#657266',1,0),'dust':('#85816c',.96,0),
}
def srgb(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
MATS={}
for name,(hx,rough,metal) in PALETTE.items():
 c=tuple(srgb(int(hx[i:i+2],16)/255) for i in (1,3,5));m=bpy.data.materials.new('Meridian_'+name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;MATS[name]=m
MATNAMES=list(MATS)
def conv(p):return (p[0],-p[2],p[1])
class Asset:
 def __init__(self,name,support='ground',notes=''):
  self.name=name;self.support=support;self.notes=notes;self.v=[];self.f=[];self.mi=[];self.parts=[];self.anchors={};self.contacts=[]
 def mesh(self,vertices,faces,mat,label):
  k=len(self.v);self.v.extend(tuple(p) for p in vertices);self.f.extend(tuple(i+k for i in f) for f in faces);self.mi.extend([MATNAMES.index(mat)]*len(faces));self.parts.append({'name':label,'vertices':len(vertices),'faces':len(faces)})
 def box(self,label,p,size,mat='teal',rot=None):
  x,y,z=p;w,h,d=[v/2 for v in size];vs=[(-w,-h,-d),(w,-h,-d),(w,h,-d),(-w,h,-d),(-w,-h,d),(w,-h,d),(w,h,d),(-w,h,d)]
  if rot:vs=[Euler(rot,'XYZ').to_matrix()@Vector(v) for v in vs]
  self.mesh([(v[0]+x,v[1]+y,v[2]+z) for v in vs],[(0,1,5,4),(3,7,6,2),(4,5,6,7),(3,2,1,0),(0,4,7,3),(1,2,6,5)],mat,label)
 def rod(self,label,a,b,r,mat='steel',n=10,top=None):
  a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0) if abs(axis.y)<.9 else (0,0,1))).normalized();v=axis.cross(u);rt=r if top is None else top
  vs=[tuple(o+rr*(u*math.cos(t*2*math.pi/n)+v*math.sin(t*2*math.pi/n))) for o,rr in [(a,r),(b,rt)] for t in range(n)]
  fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.mesh(vs,fs,mat,label)
 def cyl(self,label,p,r,h,mat='steel',axis='y',n=12,top=None):
  v=Vector({'x':(1,0,0),'y':(0,1,0),'z':(0,0,1)}[axis]);p=Vector(p);self.rod(label,p-v*h/2,p+v*h/2,r,mat,n,top)
 def path(self,label,points,r,mat='rubber',n=6):
  for a,b in zip(points,points[1:]):self.rod(label,a,b,r,mat,n)
 def ring(self,label,p,r,tube,mat='steel',axis='z',n=20,sides=6):
  ax=Vector({'x':(1,0,0),'y':(0,1,0),'z':(0,0,1)}[axis]);u=ax.cross(Vector((0,1,0) if abs(ax.y)<.9 else (0,0,1))).normalized();v=ax.cross(u);p=Vector(p);vs=[]
  for i in range(n):
   radial=u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n)
   for j in range(sides):vs.append(tuple(p+radial*(r+tube*math.cos(j*2*math.pi/sides))+ax*tube*math.sin(j*2*math.pi/sides)))
  fs=[(i*sides+j,((i+1)%n)*sides+j,((i+1)%n)*sides+(j+1)%sides,i*sides+(j+1)%sides) for i in range(n) for j in range(sides)]
  self.mesh(vs,fs,mat,label)
 def panel(self,label,p,w,h,d,bevel=.03,mat='teal'):
  # Eight-corner housing, giving a readable chamfered silhouette at low cost.
  x,y,z=p;a=w/2;b=h/2;r=min(bevel,a*.35,b*.35);outline=[(-a+r,-b),(a-r,-b),(a,-b+r),(a,b-r),(a-r,b),(-a+r,b),(-a,b-r),(-a,-b+r)]
  vs=[(x+xx,y+yy,z+zz) for zz in [-d/2,d/2] for xx,yy in outline]
  self.mesh(vs,[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],mat,label)
 def bolts(self,points,r=.015,axis='z'):
  for p in points:self.cyl('hex fastener',p,r,r*.5,'steel',axis,n=6)
 def anchor(self,name,p,normal=None):self.anchors[name]={'position':list(p),**({'normal':normal} if normal else {})}
 def finish(self):
  # Normalize geometry and attachment points together, never just its mesh.
  dy=-min(v[1] for v in self.v);dz=-min(v[2] for v in self.v) if self.support=='wall' else 0
  self.v=[(x,y+dy,z+dz) for x,y,z in self.v]
  for info in self.anchors.values():info['position'][1]+=dy;info['position'][2]+=dz
  self.contacts=[[x,y+dy,z+dz] for x,y,z in self.contacts]
  me=bpy.data.meshes.new(self.name+'_mesh');me.from_pydata([conv(v) for v in self.v],[],self.f);me.materials.clear()
  for m in MATS.values():me.materials.append(m)
  for poly,idx in zip(me.polygons,self.mi):poly.material_index=idx;poly.use_smooth=False
  me.update();ob=bpy.data.objects.new(self.name,me);bpy.context.collection.objects.link(ob)
  ob['asset_id']=self.name;ob['license']='CC0-1.0';ob['support_type']=self.support;ob['front_axis']='gltf +Z';ob['units']='metres'
  lo=[min(v[i] for v in self.v) for i in range(3)];hi=[max(v[i] for v in self.v) for i in range(3)]
  self.anchor('support_bottom',(0,lo[1],0),(0,1,0))
  if self.support=='wall':self.anchor('rear_mount',(0,(lo[1]+hi[1])/2,lo[2]),(0,0,1))
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
  for name,info in self.anchors.items():
   e=bpy.data.objects.new(self.name+'__'+name,None);bpy.context.collection.objects.link(e);e.parent=ob;e.location=conv(info['position']);e.empty_display_size=.035;e['anchor_name']=name;e.select_set(True);info['node']=e.name
  path=MODELS/(self.name+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_apply=True)
  triangles=sum(len(f)-2 for f in self.f)
  return ob,{'id':self.name,'file':'models/'+path.name,'support_type':self.support,'front_axis':'+Z','units':'metres','origin':'support-bottom centre; wall models rear plane at Z=0','bounds_min':lo,'bounds_max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)],'triangles':triangles,'vertices_authored':len(self.v),'anchors':self.anchors,'contact_points':self.contacts,'notes':self.notes,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':self.parts}
AS=[]
def asset(name,support='ground',notes=''):
 a=Asset(name,support,notes);AS.append(a);return a
# 01 — wheel stop: taper, anchor washers, faded reflective inserts.
a=asset('wheel-stop',notes='Align long X axis across a parking bay. Two underside contact pads.');a.box('foundation',(0,.035,0),(1.65,.07,.22),'concrete');a.panel('tapered body',(0,.105,0),1.72,.16,.25,.06,'concrete')
for x in [-.63,.63]:a.cyl('anchor washer',(x,.19,0),.04,.008,'dark');a.cyl('bolt head',(x,.197,0),.018,.015,'steel',n=6)
for x in [-.48,0,.48]:a.box('worn reflector',(x,.115,.128),(.27,.045,.006),'ochre')
a.contacts=[[-.6,0,0],[.6,0,0]]
# 02 — parking ticket dispenser, service seam, card slot, button, base bolts.
a=asset('ticket-dispenser',notes='Front +Z faces the approaching lane; keep interaction clear.');a.box('mounting base',(0,.035,0),(.42,.07,.38),'dark');a.panel('lower steel column',(0,.55,0),.3,1.03,.28,.025,'teal');a.panel('sloped head',(0,1.15,.02),.43,.38,.37,.045,'teal');a.box('screen recess',(0,1.22,.212),(.28,.13,.012),'dark');a.box('dim display',(0,1.22,.221),(.235,.085,.005),'glass');a.box('ticket mouth',(0,1.08,.212),(.21,.024,.018),'rubber');a.box('ticket lip',(0,1.061,.223),(.23,.009,.045),'steel');a.cyl('request button',(.135,1.075,.225),.026,.018,'ochre','z');a.box('door seam',(0,.48,.146),(.27,.72,.006),'dark');a.box('service door',(0,.48,.151),(.254,.7,.007),'teal');a.bolts([(-.16,.076,-.12),(.16,.076,-.12),(-.16,.076,.12),(.16,.076,.12)],axis='y');a.anchor('ticket_slot',(0,1.08,.23));a.anchor('button',(.135,1.075,.235))
# 03 — bracket supports a pipe running vertically.
a=asset('pipe-bracket','wall');a.box('rear mounting plate',(0,.15,.017),(.15,.3,.034),'steel');a.box('standoff',(0,.15,.095),(.065,.075,.16),'steel');a.ring('split clamp',(0,.15,.2),.082,.012,'steel','y',16,5);a.bolts([(0,.04,.04),(0,.26,.04)]);a.box('clamp ear',(.095,.15,.2),(.035,.034,.038),'steel');a.anchor('pipe_centre',(0,.15,.2))
# 04 — surface junction with four conduit sockets.
a=asset('conduit-junction','wall');a.panel('cast enclosure',(0,.14,.05),.24,.24,.1,.025,'steel');a.panel('removable cover',(0,.14,.108),.208,.208,.018,.015,'teal');a.bolts([(-.075,.065,.12),(.075,.065,.12),(-.075,.215,.12),(.075,.215,.12)],r=.01)
for ax,sgn in [('x',-1),('x',1),('y',-1),('y',1)]:
 p=(sgn*.145,.14,.053) if ax=='x' else (0,.14+sgn*.145,.053);a.cyl('conduit gland',p,.031,.055,'dark',ax);a.cyl('collar',p,.038,.019,'steel',ax,n=8)
a.anchor('conduit_left',(-.1725,.14,.053));a.anchor('conduit_right',(.1725,.14,.053));a.anchor('conduit_top',(0,.3125,.053))
# 05 — cable tray: open ladder section with two visible cable routes.
a=asset('cable-tray','wall',notes='Repeat along X; rear wall plane at Z=0. Use supports every second segment.');a.box('rear rail',(0,.045,.025),(1.2,.09,.05),'steel');a.box('front rail',(0,.045,.31),(1.2,.09,.04),'steel')
for x in [-.5,-.3,-.1,.1,.3,.5]:a.box('perforated rung',(x,.025,.17),(.035,.035,.28),'steel')
for z in [.12,.18]:a.rod('contained cable',(-.59,.065,z),(.59,.065,z),.012,'rubber',6)
a.anchor('join_left',(-.6,.045,.17));a.anchor('join_right',(.6,.045,.17))
# 06 — pressure gauge with bezel, dial ticks and needle.
a=asset('pressure-gauge','wall');a.cyl('mount back',(0,.145,.025),.12,.05,'dark','z',20);a.cyl('bezel',(0,.145,.063),.128,.04,'steel','z',20);a.cyl('dial',(0,.145,.086),.108,.008,'paper','z',20)
for i in range(11):
 t=(-2.3+i*.46);x=math.sin(t)*.085;y=.145+math.cos(t)*.085;a.box('dial tick',(x,y,.092),(.008,.018,.003),'dark',rot=(0,0,-t))
a.rod('needle',(0,.145,.098),(.045,.21,.098),.004,'red',5);a.cyl('needle hub',(0,.145,.1),.014,.008,'dark','z',10);a.cyl('threaded stem',(0,.012,.037),.025,.026,'steel','y',8);a.anchor('connection',(0,0,.037));a.anchor('dial_centre',(0,.145,.1))
# 07 — extinguisher with metal retaining band, valve, hose and nozzle.
a=asset('fire-extinguisher','wall');a.box('wall holder',(0,.34,.022),(.15,.56,.044),'dark');a.box('lower cradle',(0,.035,.1),(.22,.07,.19),'dark');a.cyl('tank',(0,.30,.145),.105,.48,'red',n=16);a.cyl('shoulder',(0,.555,.145),.105,.07,'red',n=16,top=.043);a.cyl('valve neck',(0,.61,.145),.035,.055,'steel',n=10);a.box('lever',(0,.655,.145),(.17,.025,.045),'dark');a.box('label',(0,.32,.251),(.105,.15,.008),'paper');a.ring('retaining band',(0,.32,.145),.108,.009,'steel','y',16,5);a.path('hose',[(.045,.62,.145),(.15,.60,.15),(.17,.43,.16),(.16,.16,.18)],.014,'rubber');a.rod('nozzle',(.16,.16,.18),(.14,.08,.19),.022,'dark',8);a.anchor('handle',(0,.65,.145))
# 08 — charger with dial, carry handle, coiled leads and clamps.
a=asset('battery-charger','desk');a.panel('steel case',(0,.15,0),.46,.28,.31,.035,'teal');a.box('feet',(0,.012,0),(.4,.024,.26),'rubber');a.cyl('ammeter bezel',(-.105,.19,.16),.055,.015,'dark','z',12);a.cyl('ammeter face',(-.105,.19,.17),.045,.008,'paper','z',12);a.rod('meter needle',(-.105,.19,.176),(-.08,.215,.176),.003,'red',4);a.cyl('switch',(.125,.17,.17),.026,.025,'dark','z',10)
for x in [-.06,-.03,0,.03,.06]:a.box('vent slot',(x,.075,.159),(.012,.045,.01),'dark')
a.path('carry handle',[(-.13,.29,0),(-.13,.36,0),(.13,.36,0),(.13,.29,0)],.018,'rubber');a.path('positive lead',[(.22,.12,0),(.3,.07,.04),(.3,.04,.2),(.19,.035,.23)],.009,'red');a.path('ground lead',[(-.22,.1,0),(-.3,.045,.04),(-.3,.035,.2),(-.2,.035,.22)],.009,'rubber');a.box('positive clamp',(.17,.035,.23),(.1,.035,.025),'red',rot=(0,.2,0));a.box('ground clamp',(-.17,.035,.22),(.1,.035,.025),'dark',rot=(0,-.2,0));a.anchor('carry_handle',(0,.36,0))
# 09 — shallow tray with wrench, socket and screws; no floating tools.
a=asset('tool-tray','desk');a.box('tray base',(0,.012,0),(.47,.024,.28),'steel')
for x in [-.23,.23]:a.box('folded rim',(x,.04,0),(.015,.065,.28),'teal')
for z in [-.132,.132]:a.box('folded rim',(0,.04,z),(.47,.065,.015),'teal')
a.box('wrench shank',(-.045,.032,-.035),(.27,.016,.028),'steel',rot=(0,.18,0));a.ring('wrench eye',(-.173,.034,-.011),.032,.009,'steel','y',10,4);a.cyl('socket',(.13,.047,.065),.025,.047,'steel',n=10)
for i in range(4):a.rod('loose screw',(.02+i*.035,.035,.045),(.04+i*.035,.035,.08),.005,'dark',5)
# 10 — tool board with visibly hung tools and fixed hooks.
a=asset('tool-board','wall');a.box('back frame',(0,.38,.022),(.92,.76,.044),'dark');a.box('peg panel',(0,.38,.048),(.86,.7,.014),'ochre')
for x in [-.32,-.16,0,.16,.32]:
 for y in [.16,.32,.48,.64]:a.cyl('peg hole',(x,y,.057),.009,.003,'dark','z',6)
a.bolts([(-.41,.06,.061),(.41,.06,.061),(-.41,.70,.061),(.41,.70,.061)])
for x in [-.28,-.02,.24]:a.rod('tool hook',(x,.57,.059),(x,.57,.10),.008,'steel',6)
a.box('spanner handle',(-.28,.38,.105),(.035,.34,.024),'steel');a.ring('spanner eye',(-.28,.57,.105),.037,.011,'steel','z',10,4);a.box('screwdriver grip',(-.02,.39,.105),(.046,.15,.04),'red');a.rod('screwdriver shaft',(-.02,.47,.105),(-.02,.59,.105),.008,'steel');a.box('hammer handle',(.24,.39,.105),(.034,.32,.034),'dark');a.box('hammer head',(.24,.57,.105),(.17,.05,.055),'steel')
# 11 — adjustable work lamp, physical neck/bracket, unlit diffuser.
a=asset('desk-lamp','desk');a.cyl('weighted base',(0,.024,0),.16,.048,'teal',n=16);a.rod('lower arm',(0,.05,0),(-.07,.28,-.025),.018,'steel');a.rod('upper arm',(-.07,.28,-.025),(.08,.47,.025),.018,'steel');a.cyl('elbow pin',(-.07,.28,-.025),.035,.045,'dark','z',10);a.panel('lamp shade',(.12,.46,.06),.25,.12,.18,.025,'teal');a.box('diffuser',(.12,.398,.06),(.2,.006,.13),'paper');a.path('power cord',[(0,.035,-.1),(-.12,.025,-.19),(-.22,.018,-.15)],.006,'rubber');a.anchor('light_emitter',(.12,.39,.06),(0,-1,0));a.anchor('switch',(.1,.05,.0))
# 12 — fixed ventilation fan with inset blades and protective grid.
a=asset('wall-fan','wall');a.panel('housing',(0,.3,.055),.62,.6,.11,.045,'steel');a.cyl('dark opening',(0,.3,.113),.25,.014,'dark','z',20);a.cyl('fan hub',(0,.3,.15),.057,.06,'steel','z',12)
for i in range(5):
 t=i*2*math.pi/5;a.box('static blade',(math.sin(t)*.13,.3+math.cos(t)*.13,.14),(.075,.23,.018),'teal',rot=(0,0,-t+.28))
for x in [-.18,-.09,0,.09,.18]:a.rod('protective grille',(x,.07,.19),(x,.53,.19),.006,'steel',5)
a.bolts([(-.255,.055,.12),(.255,.055,.12),(-.255,.545,.12),(.255,.545,.12)]);a.anchor('fan_axis',(0,.3,.15),(0,0,1))
# 13 — layered folded rag, asymmetric drape, stitched edge.
a=asset('folded-rag','desk')
for layer in range(2):
 vs=[];nx=6;nz=5
 for j in range(nz):
  for i in range(nx):
   x=(i/(nx-1)-.5)*(.30-layer*.025)+layer*.012+math.sin(j*1.2+i)*.004
   z=(j/(nz-1)-.5)*(.22-layer*.02)+layer*.005+math.cos(i*1.4+j)*.003
   y=.006+layer*.01+math.sin(i*1.1+j*.3)**2*.005+math.sin(j*1.4)*.002
   if layer and i==nx-1 and j==nz-1:y+=.012
   vs.append((x,y,z))
 top=list(vs);vs.extend((x,y-.005,z) for x,y,z in top);count=len(top);fs=[]
 for j in range(nz-1):
  for i in range(nx-1):
   k=j*nx+i;face=(k,k+nx,k+nx+1,k+1);fs.append(face);fs.append(tuple(q+count for q in reversed(face)))
 border=list(range(nx))+[j*nx+nx-1 for j in range(1,nz)]+list(range((nz-1)*nx+nx-2,(nz-1)*nx-1,-1))+[j*nx for j in range(nz-2,0,-1)]
 for k,n in zip(border,border[1:]+border[:1]):fs.append((k,n,n+count,k+count))
 a.mesh(vs,fs,'cloth','soft folded cloth layer')
 if layer:
  for j,i in [(1,1),(1,2),(2,1)]:
   k=j*nx+i;ids=[k,k+nx,k+nx+1,k+1];a.mesh([(top[q][0],top[q][1]+.0005,top[q][2]) for q in ids],[(0,1,2,3)],'dark','irregular oil stain')
  seam=[(top[q][0],top[q][1]+.001,top[q][2]) for q in range((nz-1)*nx,nz*nx)];a.path('stitched cloth edge',seam,.0012,'paper',4)
# 14 — wall hose reel with crank, spindle, backed bracket and hanging tail.
a=asset('hose-reel','wall');a.box('wall bracket',(0,.32,.02),(.25,.42,.04),'steel');a.box('spindle mount',(0,.32,.11),(.09,.09,.18),'steel');a.cyl('rear cheek',(0,.32,.15),.24,.025,'teal','z',16);a.cyl('spool',(0,.32,.23),.12,.14,'dark','z',16)
for z in [.175,.205,.235,.265]:a.ring('wound hose',(0,.32,z),.18,.018,'rubber','z',20,6)
a.ring('front reel rim',(0,.32,.30),.23,.018,'teal','z',16,5)
for t in [0,2.094,4.188]:a.rod('front spoke',(0,.32,.3),(math.sin(t)*.21,.32+math.cos(t)*.21,.3),.014,'teal',6)
a.cyl('crank spindle',(0,.32,.33),.029,.07,'steel','z',8);a.rod('crank arm',(0,.32,.37),(.09,.39,.37),.012,'steel');a.cyl('crank grip',(.09,.39,.405),.018,.07,'rubber','z');a.path('hanging tail',[(-.19,.27,.24),(-.26,.14,.21),(-.23,.025,.2),(-.13,.02,.24)],.018,'rubber');a.cyl('hose nozzle',(-.1,.02,.24),.023,.07,'steel','x',8);a.anchor('handle',(.09,.39,.44))
# 15 — service trolley with four real casters and lifted push bar.
a=asset('maintenance-trolley');
for x in [-.32,.32]:
 for z in [-.22,.22]:
  a.cyl('caster tyre',(x,.065,z),.065,.04,'rubber','x',12);a.cyl('caster hub',(x,.065,z),.027,.045,'steel','x',10);a.box('caster fork',(x,.13,z),(.045,.055,.045),'steel');a.contacts.append([x,0,z])
for y in [.17,.68]:
 a.box('tray bottom',(0,y,0),(.74,.035,.56),'teal')
 for x in [-.36,.36]:a.box('tray rim',(x,y+.045,0),(.025,.09,.56),'teal')
 for z in [-.27,.27]:a.box('tray rim',(0,y+.045,z),(.74,.09,.025),'teal')
for x in [-.31,.31]:
 for z in [-.22,.22]:a.rod('corner upright',(x,.18,z),(x,.73,z),.018,'steel',8)
a.path('push bar',[(-.32,.73,-.24),(-.32,.88,-.35),(.32,.88,-.35),(.32,.73,-.24)],.02,'steel',8);a.rod('rubber grip',(-.21,.88,-.35),(.21,.88,-.35),.025,'rubber',10);a.anchor('push_handle',(0,.88,-.35));a.anchor('top_support',(0,.6975,0),(0,1,0))
# 16 — electrical service box with recessed seam, handle and small conduit ends.
a=asset('electrical-box','wall');a.panel('steel case',(0,.36,.075),.5,.7,.15,.025,'teal');a.box('door gasket',(0,.36,.155),(.452,.65,.014),'dark');a.panel('front door',(0,.36,.167),.433,.631,.014,.014,'teal');a.box('inspection label',(0,.50,.179),(.17,.095,.003),'ochre');a.box('label symbol',(0,.50,.182),(.02,.055,.002),'dark',rot=(0,0,-.4));a.path('pull handle',[(.145,.28,.177),(.145,.28,.22),(.145,.42,.22),(.145,.42,.177)],.009,'steel')
for y in [.15,.57]:a.cyl('hinge barrel',(-.221,y,.18),.016,.075,'steel','y',8)
for x in [-.14,.14]:a.cyl('lower cable gland',(x,.015,.073),.029,.03,'dark','y',8)
a.anchor('handle',(.145,.35,.22));a.anchor('door_hinge',(-.221,.36,.18),(0,1,0))
# 17 — grate with solid surround, believable open slots, no texture holes.
a=asset('drain-grate',notes='Support bottom at Y=0; recess into the floor by 0.04m for a flush bar/rim top; bolt heads rise to 0.0475m.');
for x in [-.24,.24]:a.box('side rim',(x,.02,0),(.04,.04,.7),'steel')
for z in [-.33,.33]:a.box('end rim',(0,.02,z),(.5,.04,.04),'steel')
for z in [-.26,-.17,-.08,.01,.1,.19,.28]:a.box('grate bar',(0,.02,z),(.43,.035,.035),'steel')
a.bolts([(-.24,.044,-.28),(.24,.044,.28)],r=.014,axis='y');a.anchor('surface_top',(0,.04,0),(0,1,0))
# 18 — bollard with base plate, bolts and two restrained safety bands.
a=asset('safety-bollard');a.box('base plate',(0,.025,0),(.29,.05,.29),'dark');a.cyl('post',(0,.47,0),.079,.89,'ochre',n=12);a.cyl('top cap',(0,.925,0),.082,.03,'dark',n=12)
for y in [.56,.73]:a.cyl('warning band',(0,y,0),.0805,.068,'dark',n=12)
a.bolts([(-.105,.057,-.105),(.105,.057,-.105),(-.105,.057,.105),(.105,.057,.105)],axis='y');a.contacts=[[0,0,0]]
# 19 — open bucket with inner wall/rim, tapered body and folding wire bail.
a=asset('service-bucket');n=16;vs=[]
for y,r in [(0,.105),(.28,.145),(.28,.132),(.022,.094)]:
 for i in range(n):vs.append((math.cos(i*2*math.pi/n)*r,y,math.sin(i*2*math.pi/n)*r))
fs=[]
for layer in range(3):
 for i in range(n):fs.append((layer*n+i,layer*n+(i+1)%n,(layer+1)*n+(i+1)%n,(layer+1)*n+i))
fs.append(tuple(reversed(range(n))));fs.append(tuple(range(3*n,4*n)));a.mesh(vs,[tuple(reversed(f)) for f in fs],'teal','open bucket shell');a.ring('rolled lip',(0,.28,0),.14,.008,'steel','y',16,5)
pts=[(-.143,.245,0),(-.15,.41,0),(-.09,.48,0),(.09,.48,0),(.15,.41,0),(.143,.245,0)];a.path('wire bail',pts,.006,'steel');a.rod('bail grip',(-.055,.48,0),(.055,.48,0),.015,'rubber',8);a.anchor('handle',(0,.48,0))
# 20 — clock, angular tick marks, stationary authored time, no runtime text.
a=asset('wall-clock','wall');a.cyl('back case',(0,.17,.025),.16,.05,'dark','z',24);a.cyl('rim',(0,.17,.056),.166,.025,'steel','z',24);a.cyl('dial',(0,.17,.073),.148,.008,'paper','z',24)
for i in range(12):
 t=i*math.pi/6;a.box('hour mark',(math.sin(t)*.128,.17+math.cos(t)*.128,.079),(.008,.018,.003),'dark',rot=(0,0,-t))
a.rod('minute hand',(0,.17,.084),(.022,.277,.084),.0038,'dark',4);a.rod('hour hand',(0,.17,.086),(-.063,.151,.086),.005,'dark',4);a.cyl('hand pin',(0,.17,.089),.009,.008,'rust','z',8)
# 21 — paper stack with visible slips, stripes, folded receipt.
a=asset('ticket-stack','desk');
for i in range(6):a.box('paper slip',(math.sin(i)*.006,.001+i*.0025,math.cos(i)*.006),(.11,.002,.06),'paper',rot=(0,(i-2)*.035,0))
for z in [-.018,-.006,.006,.018]:a.box('printed line',(0,.0155,z),(.075,.0005,.002),'dark')
a.box('folded receipt',(.072,.022,.012),(.05,.003,.065),'paper',rot=(0,0,.5))
# 22 — worn A-frame warning stand with independent feet, handle and symbol.
a=asset('warning-stand');
for z in [-.18,.18]:
 for x in [-.18,.18]:a.rod('folding leg',(x,.02,z),(x,.70,0),.018,'ochre',6);a.box('rubber foot',(x,.013,z),(.055,.026,.055),'rubber');a.contacts.append([x,0,z])
a.panel('warning face',(0,.37,.099),.42,.50,.018,.035,'ochre');a.box('dark symbol stem',(0,.40,.112),(.025,.15,.004),'dark',rot=(0,0,.05));a.box('dark symbol dot',(0,.29,.112),(.027,.026,.004),'dark');a.path('top handle',[(-.1,.67,0),(-.1,.735,0),(.1,.735,0),(.1,.67,0)],.014,'ochre',6);a.rod('hinge',(-.205,.665,0),(.205,.665,0),.013,'steel',8);a.box('scuffed corner',(.154,.18,.113),(.065,.02,.003),'dark',rot=(0,0,.4));a.anchor('carry_handle',(0,.735,0))
# 23 — coiled power lead on floor with supported plug ends.
a=asset('cable-coil','ground');
for i in range(3):a.ring('coiled cable',(0,.011+i*.018,0),.17-i*.025,.009,'rubber','y',22,6)
a.path('loose cable end',[(.16,.012,0),(.24,.012,.03),(.29,.012,.14)],.009,'rubber');a.box('plug',(.295,.02,.165),(.04,.04,.065),'dark');a.rod('plug pin',(.285,.02,.2),(.285,.02,.221),.003,'steel',5);a.rod('plug pin',(.305,.02,.2),(.305,.02,.221),.003,'steel',5)
# 24 — grounded drawer cabinet, feet, handles, drawer gaps and top lip.
a=asset('parts-cabinet');
for x in [-.235,.235]:
 for z in [-.18,.18]:a.box('rubber foot',(x,.025,z),(.055,.05,.055),'rubber');a.contacts.append([x,0,z])
a.panel('cabinet shell',(0,.39,0),.56,.68,.45,.02,'teal');a.box('drawer recess',(0,.40,.228),(.50,.58,.01),'dark')
for y in [.17,.355,.54]:a.panel('drawer front',(0,y,.239),.47,.16,.018,.008,'teal');a.path('drawer pull',[(-.08,y,.251),(-.08,y,.29),(.08,y,.29),(.08,y,.251)],.009,'steel',6)
a.box('top work surface',(0,.747,0),(.59,.035,.48),'steel');a.box('rear rim',(0,.78,-.23),(.59,.06,.02),'steel');a.anchor('top_support',(0,.7645,0),(0,1,0))

# Local chips at exposed edges. These small opaque polygons sit on known
# supporting faces; no floating dirt cards or runtime decal pass is needed.
for name,x,y,z,scale in [('ticket-dispenser',-.11,.20,.1558,.035),('electrical-box',-.18,.14,.1748,.033),('parts-cabinet',-.19,.595,.2488,.029),('battery-charger',-.19,.21,.1558,.024),('maintenance-trolley',.22,.21,.2833,.038)]:
 a=next(v for v in AS if v.name==name)
 for n in range(3):
  xx=x+n*scale*.8;yy=y+math.sin(n*1.7)*scale*.4
  outline=[(xx-scale*.45,yy-scale*.14,z),(xx+scale*.12,yy-scale*.19,z),(xx+scale*.42,yy+scale*.02,z),(xx+scale*.19,yy+scale*.18,z),(xx-scale*.38,yy+scale*.11,z)]
  a.mesh(outline,[(0,1,2,3,4)],'rust' if n%2 else 'steel','chipped exposed edge')

objects=[];entries=[]
for a in AS:
 ob,info=a.finish();objects.append(ob);entries.append(info)
# Save the editable source with assets in an inspection grid. Mesh-local exports
# stay at their authored origins, independent of this Blender presentation layout.
for i,ob in enumerate(objects):ob.location=(i%6*2.3,-(i//6)*2.4,0)
scene.world.color=(.18,.18,.18)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Meridian_Industrial_Props.blend'))
manifest={'title':'Meridian Industrial Detail Pack','version':'1.0','game_release':'Last Vehicle 1.11','license':'CC0-1.0','source_type':'Original numeric geometry and materials; no third-party inputs','source_file':'build_props.py','editable_source':'Meridian_Industrial_Props.blend','coordinate_system':{'up':'+Y','forward':'+Z','units':'metres'},'palette_srgb':{k:v[0] for k,v in PALETTE.items()},'assets':entries,'total_bytes':sum(a['bytes'] for a in entries),'total_triangles':sum(a['triangles'] for a in entries)}
for name in ['build_props.py','Meridian_Industrial_Props.blend']:
 p=ROOT/name;manifest.setdefault('source_files',{})[name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PROPS_COMPLETE',len(entries),manifest['total_triangles'],manifest['total_bytes'])
