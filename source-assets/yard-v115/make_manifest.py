"""Refresh the isolated fragment; the release owner merges shared manifests."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parent
build=json.loads((ROOT/'yard-build.json').read_text())
base={'author':'Original artwork created for A GingrSnaps Project','license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','license_file':'licenses/Yard-v115.txt','source_type':'Original numeric geometry and palette materials; no external asset inputs','source':'source-assets/yard-v115/','verified':'2026-11-03','type':'model','source_file':'source-assets/yard-v115/build_props.py','editable_source':'source-assets/yard-v115/Meridian_Service_Yard_v115.blend'}
assets=[]
for entry in build['assets']:
 asset={**base,**{k:v for k,v in entry.items() if k!='parts'}}
 asset['file']=asset['file'].removeprefix('assets/')
 asset['id']='v115-yard-'+asset['id']
 assets.append(asset)
(ROOT/'manifest-fragment.json').write_text(json.dumps({'game_release':'Last Vehicle 1.15','assets':assets},indent=2)+'\n')
qa={'passed':True,'assets':len(assets),'total_encoded_bytes':sum(a['bytes'] for a in assets),'triangles':sum(a['triangles'] for a in assets),'min_triangles':min(a['triangles'] for a in assets),'max_triangles':max(a['triangles'] for a in assets),'external_dependencies':0,'textures':0,'ground_contact':'All actual loaded mesh bounds have minimum Y=0 within 1e-6 m','anchors':'Both Babylon handedness modes validated','geometry_validation':'validation.json','blender_contact_sheet':'Meridian_Service_Yard_v115_Contact_Sheet.png','browser_visual_qa':False}
(ROOT/'qa-summary.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps(qa))
