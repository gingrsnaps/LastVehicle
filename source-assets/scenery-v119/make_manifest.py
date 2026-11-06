"""Generate an isolated manifest fragment; the release owner merges it."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
build=json.loads((ROOT/'scenery-build.json').read_text())
validation=json.loads((ROOT/'validation.json').read_text())
assert validation['passed'] and validation['total_triangles']==build['total_triangles']
base={'author':'Original artwork created for A GingrSnaps Project','license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','license_file':'licenses/Scenery-v119.txt','source_type':'Original numeric geometry and palette materials; no external inputs','source':'source-assets/scenery-v119/','verified':'2026-11-05','type':'model','source_file':'source-assets/scenery-v119/build_props.py','editable_source':'source-assets/scenery-v119/Meridian_Scenery_v119.blend'}
assets=[]
for entry in build['assets']:
 a={**base,**{k:v for k,v in entry.items() if k!='parts'}}
 a['file']=a['file'].removeprefix('assets/');a['id']='lv119-'+a['id'];assets.append(a)
(ROOT/'manifest-fragment.json').write_text(json.dumps({'game_release':'Last Vehicle 1.19','assets':assets},indent=2)+'\n')
qa={'passed':True,'assets':len(assets),'total_encoded_bytes':sum(a['bytes'] for a in assets),'triangles':sum(a['triangles'] for a in assets),'maximum_triangles_per_asset':max(a['triangles'] for a in assets),'closed_components':sum(a['closed_components'] for a in assets),'external_dependencies':0,'textures':0,'uvs':'Every actual loaded mesh has finite, complete UVs. Runtime may reproject physical texture scale.','ground_contact':'All actual loaded bounds minimum Y=0 within 1e-6 m; wall vent uses lower-edge/rear mounting origin.','anchors':'Both Babylon handedness modes validated; wall rear plane Z=0.','normals':'Finite, unit length; triangle winding agrees; no degenerate triangles.','geometry_validation':'validation.json','blender_contact_sheet':'Meridian_Scenery_v119_Contact_Sheet.jpg','browser_visual_qa':False}
(ROOT/'qa-summary.json').write_text(json.dumps(qa,indent=2)+'\n');print(json.dumps(qa))
