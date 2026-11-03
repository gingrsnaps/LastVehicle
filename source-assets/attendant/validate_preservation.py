"""Compare keyed channels of an optional previous GLB to the new delivered GLB.
Usage: python validate_preservation.py /path/to/previous/attendant.glb
The previous asset is not needed to run or regenerate the character.
"""
from pathlib import Path
import struct,json,sys,hashlib
P=Path(__file__).resolve().parent

def read(path):
 raw=Path(path).read_bytes();length=struct.unpack_from('<I',raw,12)[0]
 g=json.loads(raw[20:20+length]);off=20+length;blen=struct.unpack_from('<I',raw,off)[0];binary=raw[off+8:off+8+blen]
 def acc(i):
  a=g['accessors'][i];b=g['bufferViews'][a['bufferView']];f='<'+{5126:'f',5123:'H',5125:'I'}[a['componentType']]*{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  size=struct.calcsize(f);offset=b.get('byteOffset',0)+a.get('byteOffset',0);stride=b.get('byteStride',size)
  return [struct.unpack_from(f,binary,offset+n*stride) for n in range(a['count'])]
 out={}
 for action in g['animations']:
  channels={}
  for c in action['channels']:
   s=action['samplers'][c['sampler']];key=g['nodes'][c['target']['node']]['name']+':'+c['target']['path']
   channels[key]=(acc(s['input']),acc(s['output']))
  out[action['name']]=channels
 return out,hashlib.sha256(raw).hexdigest()
old,oldhash=read(sys.argv[1]);new,newhash=read(P/'attendant.glb')
report={'previous_sha256':oldhash,'current_sha256':newhash,'clips':{},'all_previous_clips_preserved':True}
for name,channels in old.items():
 assert set(channels)==set(new[name]),name
 delta=0;values=0
 for key,pair in channels.items():
  for oldvalues,newvalues in zip(pair,new[name][key]):
   assert len(oldvalues)==len(newvalues),(name,key)
   for a,b in zip(oldvalues,newvalues):
    assert len(a)==len(b)
    delta=max(delta,max(abs(x-y) for x,y in zip(a,b)));values+=len(a)
 assert delta<1e-7,(name,delta)
 report['clips'][name]={'maximum_absolute_delta':delta,'scalar_values_compared':values}
report['previous_clip_count']=len(old);report['new_clip_count']=len(new);report['maximum_absolute_delta']=max(c['maximum_absolute_delta'] for c in report['clips'].values())
(P/'legacy-clip-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
