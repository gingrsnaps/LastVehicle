"""Build an original low-poly, support-bottom maintenance key for Last Vehicle.
Run: blender --background --python source-assets/key-art-v114/build_key.py
Design coordinates: metres, Y up. Blender conversion: (x, -z, y).
The tag text uses our own simple numeric pixel glyphs; no font or image input.
"""
from pathlib import Path
import bpy, math, json, hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
OUT=PROJECT/'dist/assets/models/maintenance-key-v114.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'
bpy.context.preferences.filepaths.save_version=0
def srgb(c): return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
PALETTE={'brass':('#a59462',.42,.72),'steel':('#9ba6a2',.34,.76),'ochre':('#b9a66c',.8,.02),'ink':('#203330',.95,0),'wear':('#d0c29a',.9,0)}
MATS=[]
for name,(color,rough,metal) in PALETTE.items():
 c=tuple(srgb(int(color[i:i+2],16)/255) for i in (1,3,5));m=bpy.data.materials.new('Key114_'+name);m.use_nodes=True;m.diffuse_color=(*c,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;MATS.append(m)
vs=[];faces=[];materials=[]
def mesh(points,fs,mat):
 n=len(vs);vs.extend(points);faces.extend([tuple(n+i for i in f) for f in fs]);materials.extend([list(PALETTE).index(mat)]*len(fs))
def box(x,y,z,w,h,d,mat):
 a=w/2;b=h/2;c=d/2
 mesh([(x+xx,y+yy,z+zz) for xx,yy,zz in [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]],[(0,1,5,4),(3,7,6,2),(4,5,6,7),(3,2,1,0),(0,4,7,3),(1,2,6,5)],mat)
def ring(x,y,z,r,tube,mat,n=20,s=4):
 pts=[]
 for i in range(n):
  a=i*2*math.pi/n
  for j in range(s):
   b=j*2*math.pi/s;pts.append((x+(r+tube*math.cos(b))*math.cos(a),y+tube*math.sin(b),z+(r+tube*math.cos(b))*math.sin(a)))
 mesh(pts,[(i*s+(j+1)%s,((i+1)%n)*s+(j+1)%s,((i+1)%n)*s+j,i*s+j) for i in range(n) for j in range(s)],mat)
def plate(outline,bottom,top,mat):
 # Viewed from +Y, negative XZ winding gives outward top normals.
 area=sum(outline[i][0]*outline[(i+1)%len(outline)][1]-outline[(i+1)%len(outline)][0]*outline[i][1] for i in range(len(outline)))
 if area>0:outline=list(reversed(outline))
 n=len(outline);pts=[(x,y,z) for y in [bottom,top] for x,z in outline]
 mesh(pts,[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)
def mark(x,z,w,d,mat='ink',y=.0103):
 mesh([(x,y,z),(x,y,z+d),(x+w,y,z+d),(x+w,y,z)],[(0,1,2,3)],mat)
# The actual ring and key head have holes, unlike the old cuboid placeholder.
ring(0,.008,0,.034,.003,'steel',24,4)
ring(-.037,.0045,.006,.022,.0045,'brass',16,4)
# One contiguous toothed blade reaches out from the head. Small reverse notches
# and top grooves keep the silhouette recognizable at low-poly resolution.
outline=[(-.051,-.004),(-.160,-.004),(-.166,.002),(-.166,.020),(-.151,.020),(-.151,.012),(-.140,.012),(-.140,.024),(-.126,.024),(-.126,.015),(-.116,.015),(-.116,.020),(-.101,.020),(-.101,.012),(-.051,.012)]
plate(outline,0,.007,'brass')
mark(-.148,.0002,.083,.0019,'ink',.0071)
mark(-.149,.0038,.047,.0012,'wear',.0072)
# Worn broad tag attached to the same ring, with a proper metal eyelet.
# Black outer sleeve peeks around the inset brass paper panel.
outline=[(.027,-.012),(.045,-.038),(.239,-.038),(.249,-.028),(.249,.038),(.239,.048),(.045,.048),(.027,.022)]
plate(outline,.0006,.0086,'ink')
outline2=[(.036,-.010),(.049,-.033),(.235,-.033),(.244,-.024),(.244,.034),(.235,.043),(.049,.043),(.036,.020)]
plate(outline2,.0086,.0100,'ochre')
ring(.034,.0106,.005,.008,.0015,'steel',12,4)
# Hole interior is a dark inset on this tag; the key's bow and main ring are open.
mark(.029,.001,.010,.008,'ink',.0107)
GLYPHS={
 'A':['01110','10001','10001','11111','10001','10001','10001'],
 'B':['11110','10001','10001','11110','10001','10001','11110'],
 'C':['01111','10000','10000','10000','10000','10000','01111'],
 'E':['11111','10000','10000','11110','10000','10000','11111'],
 'I':['111','010','010','010','010','010','111'],
 'M':['10001','11011','10101','10101','10001','10001','10001'],
 'N':['10001','11001','11001','10101','10011','10011','10001'],
 'T':['11111','00100','00100','00100','00100','00100','00100'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],
 '2':['01110','10001','00001','00110','01000','10000','11111'],
 '4':['00010','00110','01010','10010','11111','00010','00010']}
def text(word,x,z,cell):
 for char in word:
  if char==' ':x+=cell*3;continue
  glyph=GLYPHS[char]
  # Merge each horizontal run into one quad: no tiny disconnected cubes.
  for row,line in enumerate(glyph):
   start=None
   for col in range(len(line)+1):
    lit=col<len(line) and line[col]=='1'
    if lit and start is None:start=col
    if not lit and start is not None:
     mark(x+start*cell,z+row*cell,(col-start)*cell,cell);start=None
  x+=(len(glyph[0])+1)*cell
text('MAINTENANCE',.059,-.024,.0026)
mark(.057,.0008,.173,.0013)
text('B2 042',.058,.010,.0026)
# Sparse physical wear touches the upper surface and remains below type.
for x,z,w,d in [(.226,.036,.009,.003),(.052,.035,.015,.001),(.232,-.026,.006,.009),(.143,.034,.026,.001)]:mark(x,z,w,d,'wear',.0104)
# Convert geometry to Blender without nonuniform root scaling.
me=bpy.data.meshes.new('maintenance-key-v114_geometry');me.from_pydata([(x,-z,y) for x,y,z in vs],[],faces);me.update()
for m in MATS:me.materials.append(m)
for p,mat in zip(me.polygons,materials):p.material_index=mat;p.use_smooth=False
ob=bpy.data.objects.new('maintenance-key-v114',me);bpy.context.collection.objects.link(ob)
# Closed surfaces need outward normals. Do not recalculate disconnected print
# quads: their normal is already +Y in design coordinates.
bpy.context.view_layer.objects.active=ob;ob.select_set(True)
ob['license']='CC0-1.0';ob['units']='metres';ob['origin']='support-bottom';ob['source']='build_key.py'
anchors={'support_bottom':(0,0,0),'table_support':(-.105,0,.005),'grip':(0,.008,0),'ring':(0,.008,0),'tag_center':(.145,.010,.005)}
for name,p in anchors.items():
 e=bpy.data.objects.new('maintenance-key-v114__'+name,None);bpy.context.collection.objects.link(e);e.parent=ob;e.location=(p[0],-p[2],p[1]);e.empty_display_size=.012;e['anchor_name']=name;e.select_set(True)
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Maintenance_Key_v114.blend'))
lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
report={'file':'models/'+OUT.name,'dimensions':[hi[i]-lo[i] for i in range(3)],'bounds_min':lo,'bounds_max':hi,'anchors':{k:list(p) for k,p in anchors.items()},'triangles':sum(len(f)-2 for f in faces),'material_count':len(MATS),'texture_count':0,'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()}
(ROOT/'key-build.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
