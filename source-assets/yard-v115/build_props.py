"""Original low-poly Meridian service yard details for Last Vehicle 1.15.
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
MODELS=ROOT.parents[1]/'dist/assets/models'; MODELS.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
PALETTE={
 'teal':('#2e514e',.82,.10),'steel':('#63706b',.57,.45),'dark':('#1a292b',.86,.12),
 'rubber':('#152024',.96,.0),'ochre':('#b09a61',.85,.05),'paper':('#b9b7a3',.97,0),
 'rust':('#76503a',.94,.15),'red':('#8d4034',.74,.10),'glass':('#425b58',.28,.18),
 'concrete':('#737d75',.96,0),'cloth':('#657266',1,0),'dust':('#85816c',.96,0),'moss':('#46523d',1,0),
}
def srgb(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
MATS={}
for name,(hx,rough,metal) in PALETTE.items():
 c=tuple(srgb(int(hx[i:i+2],16)/255) for i in (1,3,5));m=bpy.data.materials.new('Yard115_'+name);m.diffuse_color=(*c,1);m.use_nodes=True
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
  path=MODELS/('v115-yard-'+self.name+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_apply=True)
  triangles=sum(len(f)-2 for f in self.f)
  return ob,{'id':self.name,'file':'assets/models/'+path.name,'license':'CC0-1.0','draw_calls_max':len(set(self.mi)),'support_type':self.support,'front_axis':'+Z','units':'metres','origin':'support-bottom centre; wall models rear plane at Z=0','bounds_min':lo,'bounds_max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)],'triangles':triangles,'vertices_authored':len(self.v),'anchors':self.anchors,'contact_points':self.contacts,'notes':self.notes,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':self.parts}

AS=[]
def asset(name,support='ground',notes=''):
 a=Asset(name,support,notes);AS.append(a);return a

def flat_chip(a,label,points,mat='rust'):
 """A supported opaque chip, not a floating transparent decal or new texture."""
 a.mesh(points,[tuple(range(len(points)))],mat,label)

# Every piece is authored in metres. Supported clutter is joined into each prop,
# so there are no runtime rigid bodies, independent draw nodes, or loose scraps.
# 01: a strapped crate, empty slats, and a splintered pallet make a loading bay
# look used while keeping the walkable path separate from its broad footprint.
a=asset('dock-cluster',notes='Floor-supported pallet and strapped freight. Suggested blocker: 1.6 by 1.25 m; never place across a doorway.')
for x in [-.55,0,.55]:a.box('pallet runner',(x,.085,0),(.14,.17,1.15),'dust')
for i in range(7):a.box('top slat',(-.64+i*.21,.205,0),(.16,.07,1.2),'ochre')
a.box('shipping crate',(0,.685,0),(1.02,.89,.94),'dust')
for x in [-.45,.45]:
 for z in [-.48,.48]:a.box('crate upright',(x,.69,z),(.08,.91,.07),'ochre')
for y in [.29,1.08]:
 for z in [-.49,.49]:a.box('crate cross brace',(0,y,z),(1.03,.07,.045),'ochre')
for x in [-.3,.3]:
 for z in [-.483,.483]:a.box('steel strap',(x,.69,z),(.035,.9,.012),'dark')
 a.box('strap over lid',(x,1.139,0),(.035,.015,.99),'dark')
a.box('shipping label',(.2,.83,.492),(.28,.15,.007),'paper')
for i in range(4):a.box('label stencil',(.12+i*.047,.84,.497),(.025,.06,.003),'dark')
a.box('fallen brace',(.73,.045,.25),(.07,.09,.95),'ochre',rot=(0,-.14,0))
a.bolts([(-.44,.3,.516),(.44,.3,.516),(-.44,1.07,.516),(.44,1.07,.516)],.014)
a.anchor('crate_top',(0,1.146,0),(0,1,0))

# 02: lidded dumpster with supported refuse, caster wheels and weathering plates.
a=asset('dumpster-refuse',notes='Floor origin includes caster wheels. Use a broad body blocker; do not collide every refuse detail.')
for x in [-.77,.77]:
 for z in [-.40,.40]:
  a.cyl('caster',(x,.105,z),.105,.085,'rubber','x',8)
  a.box('caster bracket',(x,.205,z),(.07,.16,.12),'steel')
a.box('bin body',(0,.72,0),(1.82,1.05,.99),'teal')
a.box('top lip',(0,1.25,0),(1.95,.08,1.08),'dark')
a.box('closed lid',(0,1.31,-.24),(1.95,.065,.56),'rubber')
a.box('refuse recess',(0,1.27,.25),(1.78,.012,.45),'dark')
for i,(x,z,r) in enumerate([(-.64,.22,.20),(-.25,.25,.23),(.24,.23,.19),(.63,.21,.20)]):
 a.cyl('tied refuse sack',(x,1.28+r*.7,z),r,r*1.4,'rubber','y',7,top=r*.68)
 a.cyl('sack tie',(x,1.28+r*1.45,z),.038,.04,'dark','y',5)
for x in [-.62,.62]:a.box('reinforcing rib',(x,.73,.51),(.045,.85,.045),'steel')
a.box('service label',(-.25,.94,.509),(.40,.18,.008),'paper')
a.box('rust scar',(.53,.43,.510),(.24,.10,.007),'rust',rot=(0,0,-.13))
a.box('loose carton',(-1.05,.16,.18),(.35,.32,.43),'dust',rot=(0,.13,0))
a.anchor('lid_contact',(0,1.35,-.24),(0,1,0))

# 03: utility spool and closed toolbox. Coils remain one static low-sided mesh.
a=asset('cable-reel',notes='Grounded spool and toolcase; keep outside narrow routes.')
for x in [-.34,.34]:a.cyl('wood reel end',(x,.39,0),.39,.065,'ochre','x',12)
a.cyl('reel core',(0,.39,0),.25,.63,'dust','x',12)
for x in [-.245,-.16,-.075,.01,.095,.18,.265]:a.ring('cable coil',(x,.39,0),.28,.04,'rubber','x',12,5)
for x in [-.375,.375]:a.cyl('hub bolt',(x,.39,0),.06,.018,'steel','x',6)
a.box('toolcase',(.78,.16,.10),(.55,.30,.47),'teal')
a.box('case lid',(.78,.322,.10),(.57,.035,.49),'dark')
a.path('case handle',[(.63,.34,.10),(.63,.41,.10),(.93,.41,.10),(.93,.34,.10)],.021,'steel',5)
for x in [.62,.94]:a.box('case clasp',(x,.29,.345),(.06,.09,.015),'steel')
a.path('loose cable tail',[(.25,.12,.24),(.42,.03,.50),(.11,.03,.60),(-.13,.03,.51)],.028,'rubber',5)
a.anchor('toolcase_lid',(.78,.34,.1),(0,1,0))

# 04: an embedded shallow drain frame and low broken weeds. Keep decorative:
# its four-millimetre support offset avoids z-fighting on the ground plane.
a=asset('drain-weeds',notes='Decorative ground cover, no blocker. Set origin to terrain support; drain frame is only 25 mm high.')
a.box('drain shadow',(0,.007,0),(.86,.014,.57),'dark')
for z in [-.30,.30]:a.box('drain rim',(0,.016,z),(.96,.025,.04),'steel')
for x in [-.46,.46]:a.box('drain rim',(x,.016,0),(.04,.025,.60),'steel')
for i in range(11):a.box('slotted grate',(-.41+i*.082,.019,0),(.026,.018,.55),'steel')
for x in [-.42,.42]:
 for z in [-.26,.26]:a.cyl('grate screw',(x,.034,z),.013,.007,'rust','y',6)
for i in range(11):
 x=-.48+(i%5)*.23;z=.37+(i//5)*.07;h=.10+(i%3)*.035
 a.rod('weed stem',(x,.0,z),(x+.025,.06+h,z-.025),.008,'cloth',4)
 a.mesh([(x,.045,z),(x+.10,.10+h*.5,z+.02),(x+.03,.09,z+.025)],[(0,1,2)],'cloth','broad broken leaf')
a.box('caught litter',(.24,.041,.05),(.18,.013,.11),'paper',rot=(0,-.23,0))

# 05: concrete road barrier, flaking warning paint, bolt plates and lifting eyes.
a=asset('road-barrier',notes='Solid barrier: use 2.4 by .58 m navigation/collision footprint; do not mark as breakable unless implemented.')
# Sloping concrete cross section is a genuine prism, not a floating rectangular slab.
outline=[(-.29,0),(.29,0),(.29,.21),(.13,.66),(.13,.92),(-.13,.92),(-.13,.66),(-.29,.21)]
v=[(x,y,z) for x in [-1.2,1.2] for z,y in outline]
a.mesh(v,[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],'concrete','tapered concrete barrier')
for i in range(8):a.box('warning patch',(-1.02+i*.29,.78,.135),(.20,.20,.012),'ochre' if i%2 else 'dark')
for x in [-.75,.75]:
 a.ring('lifting eye',(x,.958,0),.057,.012,'steel','x',10,5)
 a.box('foot plate',(x,.015,0),(.33,.03,.63),'rust')
for x in [-1.19,1.19]:a.box('end wear',(x,.4,0),(.015,.20,.25),'rust')
a.anchor('top',(0,.92,0),(0,1,0))

# 06: complete gatehouse workstation. The set remains floor grounded; items sit
# on its actual .83 m top and can be used as anchors for a separate action UI.
a=asset('gatehouse-desk',notes='Floor-supported workstation. Front is +Z. Interactable control should use radio or work_surface anchor; avoid vague prompts for every prop.')
a.box('worktop',(0,.80,0),(1.68,.06,.76),'dust')
for x in [-.72,.72]:
 for z in [-.29,.29]:a.box('desk leg',(x,.385,z),(.055,.77,.055),'steel')
a.box('drawer pedestal',(-.51,.43,0),(.43,.69,.65),'teal')
for y in [.26,.49,.70]:
 a.box('drawer front',(-.51,y,.34),(.40,.16,.03),'teal')
 a.box('drawer handle',(-.51,y,.371),(.13,.025,.03),'steel')
a.box('radio body',(-.40,.96,-.12),(.49,.26,.25),'dark')
a.box('speaker panel',(-.49,.975,.012),(.23,.17,.014),'teal')
for i in range(6):a.box('speaker slot',(-.56+i*.028,.975,.022),(.009,.135,.006),'dark')
a.box('frequency display',(-.25,1.005,.013),(.12,.045,.012),'glass')
for x in [-.28,-.21]:a.cyl('radio knob',(x,.925,.03),.022,.025,'steel','z',8)
a.rod('antenna',(-.60,1.10,-.18),(-.66,1.57,-.18),.006,'steel',6)
a.path('handset cord',[(-.65,.88,-.10),(-.73,.85,.1),(-.70,.85,.2),(-.62,.85,.23)],.008,'rubber',6)
a.box('handset',(-.55,.87,.22),(.30,.07,.08),'rubber')
for y in [.86,.93]:
 a.box('ticket tray',(.42,y,-.11),(.51,.025,.36),'steel')
 for x in [.17,.67]:a.box('tray rim',(x,y+.035,-.11),(.015,.065,.36),'steel')
 a.box('ticket stack',(.42,y+.025,-.11),(.40,.024,.29),'paper')
a.box('shift sheet',(.10,.836,.22),(.28,.009,.22),'paper',rot=(0,-.12,0))
for i in range(4):a.box('shift sheet marks',(.10,.842,.15+i*.035),(.16,.003,.005),'dark')
a.cyl('mug',(.61,.895,.24),.052,.125,'ochre','y',8)
a.cyl('mug dark interior',(.61,.96,.24),.040,.004,'dark','y',8)
a.anchor('work_surface',(0,.831,0),(0,1,0));a.anchor('radio',(-.4,.98,.04),(0,0,1))

# 07: wall backing with hanging coat, shift papers, hooks and wet hems.
# Wall rear plane is normalized to zero, so placement needs no guessed offset.
a=asset('coat-noticeboard','wall','Rear mounting plane Z=0. Set origin on the lower edge of a wall mount, usually 1.0 m above floor; +Z faces room.')
a.box('backing',(0,.69,.025),(1.10,1.38,.05),'dust')
for x in [-.53,.53]:a.box('frame upright',(x,.69,.055),(.035,1.38,.03),'steel')
for y in [.02,1.36]:a.box('frame crossbar',(0,y,.055),(1.10,.04,.03),'steel')
a.box('paper sheet',(.27,.90,.058),(.36,.40,.012),'paper',rot=(0,0,-.03))
a.box('shift sheet',(.25,.40,.060),(.32,.33,.012),'paper',rot=(0,0,.06))
for y in [.80,.88,.96,1.04,.34,.40,.46]:a.box('ink line',(.26,y,.071),(.21,.012,.004),'dark')
a.rod('coat hook',(-.27,1.23,.06),(-.27,1.23,.14),.015,'steel',6)
a.box('coat shoulders',(-.25,1.08,.145),(.41,.20,.10),'cloth')
a.box('coat torso',(-.25,.69,.137),(.34,.65,.095),'cloth')
a.box('left sleeve',(-.48,.80,.14),(.12,.52,.10),'cloth',rot=(0,0,-.12))
a.box('right sleeve',(-.02,.80,.14),(.12,.52,.10),'cloth',rot=(0,0,.14))
a.box('coat split',(-.25,.58,.190),(.02,.45,.006),'dark')
for y in [.61,.77,.93]:a.cyl('coat button',(-.20,y,.195),.013,.008,'ochre','z',6)
for x in [-.34,-.17]:a.box('wet hem',(x,.38,.189),(.14,.055,.01),'dark')
a.anchor('paper',(.27,.9,.074),(0,0,1))

# 08: service transformer cabinet with porcelain bushings and radiator fins.
a=asset('utility-transformer',notes='Grounded concrete plinth with cabinet. Use 1.50 by 1.05 m body blocker; the top bushings and wires are decorative.')
a.box('concrete plinth',(0,.08,0),(1.50,.16,1.05),'concrete')
a.box('cabinet',(0,.94,0),(1.22,1.56,.80),'teal')
a.box('cabinet front',(0,.94,.414),(1.14,1.46,.03),'teal')
a.box('door seam',(.17,.95,.434),(.014,1.40,.008),'dark')
a.box('door latch',(.25,.96,.46),(.04,.18,.05),'steel')
a.box('danger plate',(-.23,1.26,.439),(.35,.25,.008),'ochre')
a.mesh([(-.27,1.36,.447),(-.13,1.23,.447),(-.23,1.23,.447),(-.19,1.16,.447),(-.34,1.28,.447),(-.25,1.28,.447)],[(0,1,2,3,4,5)],'dark','voltage emblem')
for x in [-.65,.65]:
 for z in [-.28,-.12,.04,.20,.36]:a.box('cooling fin',(x,.95,z),(.10,1.1,.035),'steel')
a.box('overhanging cap',(0,1.75,0),(1.34,.06,.92),'dark')
for x in [-.40,0,.40]:
 a.cyl('porcelain post',(x,1.91,0),.075,.28,'paper','y',8)
 for y in [1.81,1.89,1.97]:a.cyl('insulator disc',(x,y,0),.115,.033,'paper','y',8)
 a.cyl('terminal',(x,2.08,0),.032,.10,'steel','y',6)
a.path('ground cable',[(-.56,1.60,-.42),(-.63,1.3,-.44),(-.65,.15,-.44),(-.80,.03,-.43)],.025,'rubber',6)
a.anchor('control',(0,.95,.45),(0,0,1))

# 09: sagging chain-link panel, broad wire spacing for legibility and budgets.
# The mesh is open: use sight-transmitting collision for the gameplay fence.
a=asset('fence-panel',notes='3.10 m wide open panel. Ground origin at concrete feet. Collision can block walking, but line-of-sight should pass through the wire openings.')
for x in [-1.45,1.45]:
 a.box('post footing',(x,.06,0),(.20,.12,.24),'concrete')
 a.rod('fence post',(x,.12,0),(x,2.23,0),.042,'steel',8)
a.rod('top rail',(-1.45,2.13,0),(1.45,2.13,0),.026,'steel',6)
a.rod('bottom rail',(-1.45,.24,0),(1.45,.24,0),.022,'rust',6)
# Each wire follows a shallow bow. Cuts at the inner frame keep no loose ends.
for slope in [-1,1]:
 for k in range(-12,13):
  b=k*.25
  pts=[]
  for i in range(61):
   x=-1.40+i*2.80/60;y=slope*x+b
   if .28<=y<=2.08:pts.append((x,y,-.07*(1-(x/1.4)**2)))
  if len(pts)>1:a.rod('diamond wire',pts[0],pts[-1],.008,'steel',4)
for x in [-1.45,1.45]:a.bolts([(x,.30,.047),(x,2.07,.047)],.018)
a.anchor('strike',(0,1.35,-.07),(0,0,1))

# 10: stacked maintenance drums, support pallet and bent drip tray.
a=asset('drum-store',notes='Floor support pallet with drums; ideal for a loading corner. Suggested blocker 1.55 by 1.2 m.')
for x in [-.6,0,.6]:a.box('pallet runner',(x,.07,0),(.12,.14,1.12),'dust')
for i in range(6):a.box('pallet slat',(-.65+i*.26,.17,0),(.20,.06,1.12),'ochre')
for x,z in [(-.38,-.20),(.38,.12)]:
 a.cyl('steel drum',(x,.67,z),.30,.94,'teal','y',10)
 for y in [.24,.45,.91,1.14]:a.cyl('drum rib',(x,y,z),.316,.032,'steel','y',10)
 a.cyl('recessed lid',(x,1.148,z),.275,.02,'dark','y',10)
 a.cyl('filler cap',(x+.13,1.166,z),.044,.025,'steel','y',6)
 a.box('hazard label',(x,.72,z+.298),(.20,.21,.008),'ochre')
 a.box('label tear',(x+.07,.66,z+.304),(.058,.05,.008),'rust')
a.box('drip tray',(.25,.031,.79),(.75,.062,.25),'steel',rot=(0,-.08,0))
a.anchor('drum_top',(-.38,1.18,-.20),(0,1,0))

# Supported chips and damp streaks are opaque coplanar geometry, only 2-3 mm
# ahead of the supporting face. A deterministic seed makes rebuilds reproducible.
def weather_front(a, patches):
 for i,(x,y,z,w,h,mat) in enumerate(patches):
  rng=random.Random(115+i)
  pts=[(x+xx*w,y+yy*h,z) for xx,yy in [(-.5,-.35),(-.2,-.5),(.5,-.24),(.42,.32),(.07,.5),(-.45,.21)]]
  a.mesh(pts,[tuple(range(6))],mat,'supported worn paint / damp patch')
by_id={a.name:a for a in AS}
weather_front(by_id['dumpster-refuse'],[(-.70,.45,.499,.22,.25,'rust'),(.64,.67,.499,.26,.18,'rust'),(.12,.28,.499,.55,.07,'moss'),(-.43,.58,.499,.09,.31,'dark'),(.37,1.14,.499,.15,.07,'steel')])
weather_front(by_id['utility-transformer'],[(-.47,.30,.432,.13,.21,'rust'),(.40,.24,.432,.26,.08,'moss'),(-.17,.50,.432,.10,.28,'dark'),(.49,1.59,.432,.12,.09,'rust')])
weather_front(by_id['road-barrier'],[(-.98,.83,.143,.10,.09,'concrete'),(.71,.75,.143,.12,.08,'concrete'),(.0,.64,.140,.18,.06,'moss')])
weather_front(by_id['dock-cluster'],[(-.18,.68,.474,.08,.50,'dark'),(.35,.56,.474,.04,.27,'rust'),(-.34,.40,.474,.10,.09,'dust')])
weather_front(by_id['coat-noticeboard'],[(.39,.15,.056,.14,.12,'moss')])
# Shallow, scattered growth rooted beside the drain is colored geometry rather
# than a transparent decal or particles. The clear grate remains readable.
a=by_id['drain-weeds']
for i in range(7):
 x=-.5+i*.15;z=.45+(i%2)*.04
 a.cyl('rooted moss',(x,.012,z),.07,.012,'moss','y',5)

# Export separate runtime GLBs; the source .blend intentionally keeps all ten
# objects at their authored origin so every prop is easy to edit independently.
records=[]
for a in AS:
 ob,record=a.finish();records.append(record)
 if not (300 <= record['triangles'] <= 2000):
  raise ValueError(f"{a.name}: triangle budget {record['triangles']} is outside 300..2000")
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Meridian_Service_Yard_v115.blend'))
manifest={'title':'Meridian Service Yard','version':'1.0','game_release':'Last Vehicle 1.15','license':'CC0-1.0','source_type':'Original numeric geometry and palette materials; no external files, textures, fonts or brands','source_file':'build_props.py','editable_source':'Meridian_Service_Yard_v115.blend','coordinate_system':{'up':'+Y','forward':'+Z','units':'metres'},'palette_srgb':{k:v[0] for k,v in PALETTE.items()},'assets':records,'total_bytes':sum(x['bytes'] for x in records),'total_triangles':sum(x['triangles'] for x in records),'runtime_notes':['One mesh per prop; each material is one primitive. Static batching by material is recommended.','Keep full asset on all quality modes; reduce repeated placements on Low.','No textures, lights, cameras, particle systems, animation, physics or audio are embedded.','Named anchors are geometry-local glTF coordinates; Babylon left-handed import mirrors X.']}
(ROOT/'yard-build.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('YARD115_SUMMARY '+json.dumps({k:manifest[k] for k in ['total_bytes','total_triangles']}))
