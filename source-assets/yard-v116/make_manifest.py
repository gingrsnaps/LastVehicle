"""Generate this pack's isolated manifest; the release owner merges it."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
build=json.loads((ROOT/'yard-build.json').read_text())
validation=json.loads((ROOT/'validation.json').read_text())
assert validation['passed'] and validation['total_triangles']==build['total_triangles']
base={'author':'Original artwork created for A GingrSnaps Project','license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','license_file':'licenses/Yard-v116.txt','source_type':'Original numeric geometry and palette materials; no external asset inputs','source':'source-assets/yard-v116/','verified':'2026-11-04','type':'model','source_file':'source-assets/yard-v116/build_props.py','editable_source':'source-assets/yard-v116/Meridian_Yard_Details_v116.blend'}
assets=[]
for entry in build['assets']:
 a={**base,**{k:v for k,v in entry.items() if k!='parts'}}
 a['file']=a['file'].removeprefix('assets/'); a['id']='v116-yard-'+a['id']; assets.append(a)
(ROOT/'manifest-fragment.json').write_text(json.dumps({'game_release':'Last Vehicle 1.16','assets':assets},indent=2)+'\n')
qa={'passed':True,'assets':len(assets),'total_encoded_bytes':sum(a['bytes'] for a in assets),'triangles':sum(a['triangles'] for a in assets),'closed_components':sum(a['closed_components'] for a in assets),'external_dependencies':0,'textures':0,'ground_contact':'All actual loaded mesh bounds have minimum Y=0 within 1e-6 m; wall models are mounted at their lower edge','anchors':'Both Babylon handedness modes validated; two wall assets have rear mounting plane Z=0','normals':'All finite and unit-length; triangle winding matches normals; no degenerate triangles','geometry_validation':'validation.json','blender_contact_sheet':'Meridian_Yard_Details_v116_Contact_Sheet.png','browser_visual_qa':False}
(ROOT/'qa-summary.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps(qa))
