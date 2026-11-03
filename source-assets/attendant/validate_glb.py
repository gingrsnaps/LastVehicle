"""Structural and animation validation for attendant.glb; no browser assertions."""
from pathlib import Path
import struct,json,math,hashlib
P=Path(__file__).resolve().parent
raw=(P/'attendant.glb').read_bytes()
magic,version,total=struct.unpack_from('<4sII',raw)
assert magic==b'glTF' and version==2 and total==len(raw)
jsonlen,jsonkind=struct.unpack_from('<II',raw,12)
g=json.loads(raw[20:20+jsonlen]); off=20+jsonlen
binlen,binkind=struct.unpack_from('<II',raw,off);binary=raw[off+8:off+8+binlen]
formatters={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}
components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(i):
 a=g['accessors'][i];view=g['bufferViews'][a['bufferView']];fmt='<'+formatters[a['componentType']]*components[a['type']]
 size=struct.calcsize(fmt);stride=view.get('byteStride',size);start=view.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from(fmt,binary,start+j*stride) for j in range(a['count'])]
assert len(g['skins'])==1
assert all('uri' not in image and 'bufferView' in image for image in g['images'])
tri=0;verts=0;maxerr=0;blended=0
for m in g['meshes']:
 for p in m['primitives']:
  at=p['attributes'];assert 'JOINTS_0' in at and 'WEIGHTS_0' in at
  vs=acc(at['POSITION']);ws=acc(at['WEIGHTS_0']);js=acc(at['JOINTS_0'])
  verts+=len(vs);tri+=len(acc(p['indices']))//3
  for w,j in zip(ws,js):
   maxerr=max(maxerr,abs(sum(w)-1));blended+=sum(x>.001 for x in w)>1
   assert all(jj<len(g['skins'][0]['joints']) for jj in j)
assert maxerr<1e-5 and blended>0
manifest=json.loads((P/'manifest.json').read_text())
expected={name:clip['duration_seconds'] for name,clip in manifest['clips'].items()}
clips={}
for a in g['animations']:
 duration=max(acc(s['input'])[-1][0] for s in a['samplers']); varying=0;loopdiff=0
 for c in a['channels']:
  sm=a['samplers'][c['sampler']];values=acc(sm['output'])
  varying+=any(any(abs(x-y)>1e-5 for x,y in zip(v,values[0])) for v in values[1:])
  loopdiff=max(loopdiff,max(abs(x-y) for x,y in zip(values[0],values[-1])))
 assert varying>3
 clips[a['name']]={'duration_seconds':round(duration,4),'channels':len(a['channels']),'varying_channels':varying,'endpoint_max_delta':round(loopdiff,8)}
 assert abs(duration-expected[a['name']])<1e-5
 if manifest['clips'][a['name']]['loop']:assert loopdiff<1e-5
assert set(clips)==set(expected)
report={'file':'attendant.glb','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'triangles':tri,'exported_vertices':verts,'skin_count':len(g['skins']),'skin_joint_count':len(g['skins'][0]['joints']),'embedded_images':len(g['images']),'external_dependencies':[],'weighted_vertices_with_multiple_joints':blended,'maximum_weight_sum_error':maxerr,'clips':clips,'browser_qa_performed':False}
(P/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
