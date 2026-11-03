"""Original low-poly Meridian worn garage details for Last Vehicle 1.13.
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
MODELS=ROOT.parents[1]/'dist/assets/models/details-v113'; MODELS.mkdir(parents=True,exist_ok=True)
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
  return ob,{'id':self.name,'file':'assets/models/details-v113/'+path.name,'license':'CC0-1.0','draw_calls_max':len(set(self.mi)),'support_type':self.support,'front_axis':'+Z','units':'metres','origin':'support-bottom centre; wall models rear plane at Z=0','bounds_min':lo,'bounds_max':hi,'dimensions':[hi[i]-lo[i] for i in range(3)],'triangles':triangles,'vertices_authored':len(self.v),'anchors':self.anchors,'contact_points':self.contacts,'notes':self.notes,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'parts':self.parts}

AS=[]
def asset(name,support='desk',notes=''):
 a=Asset(name,support,notes);AS.append(a);return a

def flat_chip(a,label,points,mat='rust'):
 """A supported opaque chip, not a floating transparent decal or new texture."""
 a.mesh(points,[tuple(range(len(points)))],mat,label)

# 01. Damaged intercom. The snapped corner, dented grille and a tethered
# handset lead read as wear without a photograph or unreadable tiny text.
a=asset('damaged-intercom','wall','Rear mounting plane Z=0. Speaker and button anchors are cosmetic; do not add an interaction unless it has an authored outcome.')
a.panel('mounting flange',(0,.32,.014),.31,.49,.028,.026,'dark')
a.panel('worn steel enclosure',(0,.32,.061),.283,.46,.075,.028,'teal')
a.panel('speaker recess',(0,.405,.100),.221,.22,.007,.023,'dark')
for i in range(6):
 y=.325+i*.031
 # A shallow bend interrupts the grille's otherwise regular silhouette.
 a.box('bent speaker bar',(-.019 if i==2 else 0,y,.109),(.183 if i==2 else .205,.009,.012),'steel',rot=(0,0,.045 if i==2 else 0))
a.panel('call plate',(.005,.205,.105),.195,.082,.012,.009,'dark')
a.cyl('call button',(.005,.205,.119),.024,.018,'red','z',10)
a.box('broken label insert',(-.055,.265,.106),(.093,.021,.005),'paper',rot=(0,0,-.05))
a.bolts([(-.115,.11,.104),(.115,.11,.104),(-.115,.53,.104),(.115,.53,.104)],r=.011)
a.path('captive cable',[(-.105,.11,.07),(-.161,.076,.087),(-.158,.019,.11),(-.126,.016,.12),(-.10,.043,.11)],.009,'rubber',6)
flat_chip(a,'corner impact',[(-.14,.52,.102),(-.121,.5,.102),(-.086,.526,.102),(-.124,.545,.102)],'rust')
a.path('fracture in face',[(.06,.505,.108),(.045,.478,.108),(.068,.459,.108)],.0017,'rubber',4)
a.anchor('speaker',(0,.405,.119),(0,0,1));a.anchor('call_button',(.005,.205,.131),(0,0,1));a.anchor('cable_entry',(-.105,.11,.07))

# 02. Shallow ash tray. Bottom, ash and extinguished cigarette pieces all
# physically touch; no floating scraps. No active glow or particle system.
a=asset('cigarette-tray','desk','Set support-bottom on a tabletop. Debris is joined into one mesh and has no collision or interaction.')
a.box('pressed tray base',(0,.009,0),(.232,.018,.17),'steel')
for z in [-.079,.079]:a.box('raised rim',(0,.026,z),(.232,.034,.012),'steel')
for x in [-.11,.11]:a.box('raised rim',(x,.026,0),(.012,.034,.15),'steel')
a.box('ash bed',(0,.019,0),(.199,.003,.137),'dust')
for i,(x,z,ang) in enumerate([(-.042,.02,.22),(.034,-.028,-.35),(.05,.032,1.1)]):
 direction=Vector((math.cos(ang),0,math.sin(ang)));centre=Vector((x,.027,z))
 a.rod('paper cigarette stub',centre-direction*.022,centre+direction*.022,.006,'paper',6)
 a.rod('stained filter',centre-direction*.033,centre-direction*.022,.0065,'ochre',6)
 a.rod('extinguished end',centre+direction*.022,centre+direction*.029,.0068,'dark',6)
for x,z,r in [(-.07,-.035,.012),(.006,.038,.009),(.079,-.013,.014),(-.015,-.038,.008)]:
 a.cyl('compressed ash',(x,.022,z),r,.003,'dark',n=5)
a.anchor('surface',(0,.020,0),(0,1,0))

# 03. Key board. Empty hook shadows make the missing items intentional.
# Tags are colored shapes only: required game text must remain accessible UI.
a=asset('key-hook-board','wall','Wall-backed board with four hooks. Three empty key silhouettes convey absence; only one decorative key is present.')
a.panel('steel frame',(0,.225,.018),.57,.45,.036,.015,'dark')
a.box('faded backing',(0,.225,.041),(.531,.411,.01),'ochre')
for i,x in enumerate([-.196,-.065,.065,.196]):
 a.box('label holder',(x,.345,.05),(.103,.047,.006),'steel')
 a.box('blank paper tag',(x,.347,.054),(.084,.03,.003),'paper')
 a.path('key hook',[(x,.285,.047),(x,.278,.083),(x,.296,.098)],.0055,'steel',6)
 # A raised paint shadow under each key stays on the backing surface.
 a.ring('old key outline',(x,.242,.05),.019,.003,'dark','z',10,4)
 a.box('old key shaft outline',(x,.194,.05),(.009,.061,.003),'dark')
 a.box('old tooth outline',(x+.007,.174,.05),(.017,.009,.003),'dark')
a.ring('remaining key ring',(-.196,.265,.096),.018,.0035,'steel','z',12,4)
a.box('remaining key blade',(-.196,.217,.096),(.01,.065,.006),'steel')
a.box('remaining key teeth',(-.188,.197,.096),(.024,.015,.006),'steel')
a.bolts([(-.253,.029,.05),(.253,.029,.05),(-.253,.421,.05),(.253,.421,.05)],r=.009)
flat_chip(a,'worn lower corner',[(.20,.034,.048),(.258,.025,.048),(.25,.061,.048),(.219,.053,.048)],'rust')
a.anchor('last_hook',(-.196,.29,.096));a.anchor('empty_hook',(.196,.29,.096))

# 04. Loose cut cables. Only short low-sided segments and no spring physics.
a=asset('cable-offcuts','desk','Small cable bundle on a known bench or floor support. Tangent points touch the support plane; never spawn as a blocking collider.')
for i,(pts,mat) in enumerate([
 ([(-.19,.012,-.042),(-.09,.012,-.059),(.013,.012,-.025),(.11,.012,-.048)],'rubber'),
 ([(-.16,.011,.046),(-.08,.011,.063),(.041,.011,.028),(.17,.011,.057)],'red'),
 ([(-.13,.009,.098),(-.052,.009,.109),(.054,.009,.102),(.12,.009,.077)],'rubber')]):
 a.path('cut insulated lead',pts,.009 if i!=1 else .007,'rubber' if i==2 else mat,6)
 p=Vector(pts[-1]);t=(p-Vector(pts[-2])).normalized();a.rod('exposed copper',p,p+t*.022,.0045,'ochre',5)
 a.rod('cut sleeve ring',p-t*.008,p,.010 if i==0 else .008,'dark',6)
a.box('discarded crimp sleeve',(.09,.011,-.09),(.038,.022,.016),'steel',rot=(0,.3,0))
a.anchor('pick_centre',(0,.025,.02),(0,1,0))

# 05. Battery terminal brush. Wire bundles are sparse geometry and a polished
# core beneath the bristles gives a legible silhouette without alpha textures.
a=asset('terminal-brush','desk','Intended for workshop bench top Y=1.6 or desk top Y=.925. Brush is a cosmetic detail; do not make it a required new pickup.')
a.panel('rubber grip',(-.056,.027,0),.176,.045,.05,.014,'rubber')
a.rod('brush shaft',(.026,.029,0),(.116,.029,0),.007,'steel',6)
for x in [.091,.105,.119]:
 for i in range(6):
  t=i*math.pi/3;start=(x,.029,0);end=(x,.029+math.sin(t)*.026,math.cos(t)*.026)
  a.rod('wire bristle bundle',start,end,.0027,'steel',4)
for x in [-.12,-.09,-.06,-.03]:a.box('grip rib',(x,.051,0),(.009,.004,.043),'dark')
a.cyl('end cap',(-.145,.027,0),.018,.012,'steel','x',8)
a.anchor('handle',(-.067,.028,0));a.anchor('brush_tip',(.12,.029,0))

# 06. Split insulation elbow: a quarter-bend built with joined ring sections.
# Connector anchors tell the integrator exactly where a pipe must continue.
a=asset('split-insulation-elbow','wall','Rear support plane at Z=0. Connect incoming/outgoing pipe only to the named socket anchors; includes wall fixing straps.')
# Centerline is vertical at the lower end and horizontal at the right end.
points=[(0,.09,.145),(0,.22,.145),(.018,.29,.145),(.065,.34,.145),(.13,.36,.145),(.26,.36,.145)]
a.path('exposed rusty pipe',points,.044,'rust',8)
for j,(start,end) in enumerate(zip(points,points[1:])):
 # The elbow retains two weathered wrapping layers with a gap at the split.
 a.rod('mould-dark insulation',start,end,.067,'cloth' if j%2 else 'dark',8)
for x,y in [(0,.13),(.2,.36)]:
 a.box('rear saddle',(x,y,.019),(.12,.09,.038),'steel')
 a.box('stand off',(x,y,.071),(.042,.038,.104),'steel')
# Split cover reveals metal at the bend rather than a transparent hole.
a.path('exposed seam',[(.018,.29,.213),(.066,.34,.213),(.13,.36,.213)],.006,'rust',5)
a.cyl('lower sealing band',(0,.1,.145),.071,.023,'steel','y',8)
a.cyl('right sealing band',(.22,.36,.145),.071,.023,'steel','x',8)
a.anchor('socket_lower',(0,.09,.145),(0,-1,0));a.anchor('socket_right',(.26,.36,.145),(1,0,0))

# 07. Pump seal/flange: disconnected worn parts resting on a support.
a=asset('pump-seal-kit','desk','Loose pump gasket and washer laid flat. Appropriate on pump shelf/ground; not an active puzzle object.')
a.ring('compressed rubber gasket',(-.035,.009,0),.054,.009,'rubber','y',16,5)
a.ring('rusted clamp ring',(.053,.012,.023),.045,.008,'rust','y',16,5)
for x,z in [(-.08,-.048),(-.083,.047),(.008,-.049),(.011,.049)]:a.cyl('gasket fixing ear',(x,.009,z),.014,.016,'rubber',n=8)
a.rod('retaining bolt',(.064,.009,-.061),(.109,.009,-.042),.006,'steel',6)
a.cyl('loose nut',(.112,.011,-.033),.011,.016,'steel',n=6)
a.anchor('gasket_centre',(-.035,.009,0),(0,1,0))

# 08. Parking permit on a small dashboard holder, deliberately without text.
a=asset('parking-permit','desk','Dashboard holder. Parent to the car before positioning. Keep the support-bottom on a verified dashboard surface, not on glass.')
a.box('rubber non-slip base',(0,.004,0),(.143,.008,.079),'rubber')
a.box('permit sleeve',(0,.012,0),(.126,.008,.073),'dark')
a.box('faded permit card',(0,.017,0),(.116,.002,.063),'paper')
a.box('permit colored band',(-.044,.0182,0),(.019,.001,.056),'teal')
for i,w in enumerate([.047,.041,.052]):a.box('printed visual rule',(.009,.0182,-.018+i*.013),(w,.001,.002),'dark')
a.box('faded stamp',(.036,.0182,.02),(.018,.001,.013),'red',rot=(0,.14,0))
a.anchor('dashboard_contact',(0,0,0),(0,1,0))

# 09. Sagging visor; pivot is explicit and is not at its grounded export origin.
# To animate, put a parent at roof_pivot then offset the model by -anchor position.
a=asset('sagging-sun-visor','car','Model has bottom origin for deterministic bounds. For roof installation align roof_pivot to the existing car roof mount, then use visor_hinge as a rotation reference. This static model already has a shallow sag; do not add physics.')
a.panel('fabric padded visor',(0,.105,0),.34,.18,.038,.024,'cloth')
a.box('sunken mirror frame',(.035,.113,.022),(.153,.085,.009),'dark')
a.box('fogged mirror insert',(.035,.113,.028),(.131,.067,.004),'glass')
a.box('ticket elastic',(-.104,.105,.023),(.015,.153,.008),'rubber',rot=(0,0,-.035))
a.box('caught paper slip',(-.086,.11,.029),(.082,.069,.003),'paper',rot=(0,0,-.095))
a.path('roof mounting arm',[(-.13,.194,0),(-.13,.23,0),(-.09,.239,-.015)],.009,'steel',6)
a.box('roof mount',(-.09,.247,-.015),(.045,.017,.034),'dark')
flat_chip(a,'frayed lower edge',[(-.123,.016,.021),(-.081,.016,.021),(-.095,.03,.021),(-.112,.025,.021)],'dust')
a.anchor('roof_pivot',(-.09,.2555,-.015),(0,1,0));a.anchor('visor_hinge',(-.13,.193,0),(1,0,0))

# 10. Emergency diagram: arrows and route rectangles, no critical baked text.
a=asset('emergency-diagram','wall','Decorative plan board. It is not the gameplay map. Required directions and route text must live in the journal/UI and stay consistent with the level.')
a.panel('metal notice frame',(0,.29,.015),.64,.58,.03,.016,'teal')
a.box('stained notice sheet',(0,.29,.034),(.6,.54,.008),'paper')
# The simple diagram is an original schematic, not an inaccurate level map.
for x,y,w,h in [(-.13,.34,.17,.20),(.12,.34,.17,.20),(-.13,.14,.17,.10),(.12,.14,.17,.10)]:
 for xx in [x-w/2,x+w/2]:a.box('diagram room line',(xx,y,.039),(.004,h,.002),'dark')
 for yy in [y-h/2,y+h/2]:a.box('diagram room line',(x,yy,.039),(w,.004,.002),'dark')
a.box('highlighted route',(0,.295,.041),(.014,.32,.003),'teal')
a.box('highlighted exit',(0,.469,.041),(.098,.026,.003),'teal')
a.mesh([(-.027,.433,.043),(.027,.433,.043),(0,.463,.043)],[(0,1,2)],'teal','route arrow')
a.cyl('current-area dot',(0,.139,.043),.014,.004,'red','z',10)
for x in [-.28,.28]:
 for y in [.035,.545]:a.cyl('corner fixing',(x,y,.042),.009,.005,'steel','z',6)
flat_chip(a,'leak stain',[(-.293,.035,.039),(-.23,.036,.039),(-.22,.078,.039),(-.256,.10,.039),(-.29,.07,.039)],'dust')
a.anchor('diagram_face',(0,.29,.044),(0,0,1))

# 11. Torn weather strip: bottom is supported and loose flaps have joined roots.
a=asset('torn-weather-strip','wall','Wall/door-jamb detail; rear plane Z=0. Keep away from navigation thresholds. The ragged piece is attached to its extrusion, never floating.')
a.box('attachment channel',(0,.34,.009),(.034,.68,.018),'steel')
a.box('rubber seal stem',(.012,.34,.024),(.024,.68,.03),'rubber')
a.path('partly peeled lip',[(.023,.64,.035),(.05,.55,.057),(.075,.43,.064),(.061,.34,.071),(.092,.27,.082)],.011,'rubber',6)
for y in [.1,.23,.40,.59]:a.cyl('retaining fastener',(-.009,y,.02),.0045,.004,'steel','z',6)
a.mesh([(.026,.30,.047),(.098,.274,.082),(.079,.263,.082),(.04,.277,.05)],[(0,1,2,3)],'dark','torn rubber web')
a.anchor('channel_top',(0,.68,.009),(0,1,0));a.anchor('channel_bottom',(0,0,.009),(0,-1,0))

# 12. Discarded work glove. A compact angular cloth silhouette and seams, with
# thickness all around so it renders correctly from any observation angle.
a=asset('discarded-work-glove','desk','Rest support-bottom on workshop cloth or bench. Single joined mesh, no physics; keep clear of pickup colliders.')
a.panel('flattened glove palm',(0,.02,0),.096,.031,.11,.012,'cloth')
a.box('worn cuff',(0,.02,-.071),(.102,.03,.04),'dark')
for x,length,zoffset,ang in [(-.035,.061,0,.08),(-.011,.078,.006,.01),(.013,.074,.003,-.02),(.035,.056,-.004,-.08)]:
 a.box('folded glove finger',(x,.017,.061+length/2+zoffset),(.022,.028,length),'cloth',rot=(0,ang,0))
 a.box('knuckle seam',(x,.033,.067),(.015,.002,.004),'dust')
a.box('turned glove thumb',(-.064,.017,.008),(.066,.028,.025),'cloth',rot=(0,.54,0))
flat_chip(a,'grease mark',[(-.038,.037,-.025),(.018,.037,-.03),(.03,.037,.004),(-.013,.037,.027),(-.033,.037,.008)],'dark')
a.anchor('cuff',(0,.021,-.091))

# Export each mesh while still at its useful local origin. Geometry is consolidated
# to one mesh per prop, and palette materials reuse their established Meridian names.
objects=[];entries=[]
for a in AS:
 ob,info=a.finish();objects.append(ob);entries.append(info)
for i,ob in enumerate(objects):ob.location=(i%4*.95,-(i//4)*1.05,0)
scene.world.color=(.18,.18,.18)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Meridian_Garage_Details_v113.blend'))
manifest={
 'title':'Meridian Worn Garage Details','version':'1.0','game_release':'Last Vehicle 1.13',
 'license':'CC0-1.0','source_type':'Original numeric geometry and palette materials; no downloaded assets, textures or fonts',
 'source_file':'build_props.py','editable_source':'Meridian_Garage_Details_v113.blend',
 'coordinate_system':{'up':'+Y','forward':'+Z','units':'metres'},
 'palette_srgb':{k:v[0] for k,v in PALETTE.items()},
 'runtime_directory':'dist/assets/models/details-v113','assets':entries,
 'total_bytes':sum(a['bytes'] for a in entries),'total_triangles':sum(a['triangles'] for a in entries),
 'draw_calls_max_all_types_visible':sum(a['draw_calls_max'] for a in entries),
 'runtime_notes':['One mesh per prop; each used palette material creates one primitive/submesh.',
  'Use shared materials by Meridian material name when instantiating multiple props.',
  'Do not give these cosmetic details physics or navigation collision.',
  'No animation clips, lights, textures, cameras or audio are embedded.',
  'Named anchors are geometry-local; Babylon default handedness mirrors X through the glTF root.']
}
for name in ['build_props.py','Meridian_Garage_Details_v113.blend']:
 p=ROOT/name;manifest.setdefault('source_files',{})[name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(ROOT/'manifest-fragment.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('GARAGE_DETAILS_COMPLETE',len(entries),manifest['total_triangles'],manifest['total_bytes'])
