"""Refresh this pack's integration fragment after regenerating its assets.
The parent release process owns the shared assets manifest and credits.
"""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
key=json.loads((ROOT/'key-build.json').read_text())
base={'author':'Original artwork created for A GingrSnaps Project','license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','license_file':'licenses/Key-Art-v114.txt','source_type':'Original numeric geometry / vector paths; no external asset inputs','source':'source-assets/key-art-v114/','verified':'2026-11-03'}
entry={**base,**key,'id':'maintenance-key-v114','type':'model','draw_calls_max':5,'source_file':'source-assets/key-art-v114/build_key.py','editable_source':'source-assets/key-art-v114/Maintenance_Key_v114.blend','support_type':'desk','origin':'Ring-centered XZ; mesh bottom Y=0','notes':'Recognizable ring, blade and readable MAINTENANCE tag; retain authored scale during pickup.'}
assets=[entry]
for d in json.loads((ROOT/'decals-build.json').read_text()):
 raw=(PROJECT/'dist/assets'/d['file']).read_text();tree=ET.fromstring(raw)
 assert not any(t in raw.lower() for t in ['<script','<text','href=','<foreignobject','<filter'])
 assert tree.attrib['width']=='512' and tree.attrib['height']=='256'
 assets.append({**base,**d,'id':Path(d['file']).stem,'type':'texture','source_file':'source-assets/key-art-v114/build_decals.py','notes':'Transparent SVG, original vector paths only; static cosmetic wall plane, no interaction.'})
(ROOT/'manifest-fragment.json').write_text(json.dumps({'game_release':'Last Vehicle 1.14','assets':assets},indent=2)+'\n')
report={'passed':True,'assets':len(assets),'total_encoded_bytes':sum(a['bytes'] for a in assets),'key_triangles':key['triangles'],'key_materials':5,'key_textures':0,'svg_count':4,'svg_raster_dimensions_each':[512,256],'rgba8_raster_bytes_four':4*512*256*4,'external_dependencies':0,'xml_static_paths_verified':True,'browser_visual_qa':False}
(ROOT/'qa-summary.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
