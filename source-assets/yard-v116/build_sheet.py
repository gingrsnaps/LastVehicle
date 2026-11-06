"""Assemble the actual Blender inspection renders, with honest scale labels."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path(__file__).resolve().parent
entries=json.loads((ROOT/'yard-build.json').read_text())['assets']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
sheet=Image.new('RGB',(1536,1304),(15,24,25)); d=ImageDraw.Draw(sheet)
d.text((24,18),'MERIDIAN YARD DETAILS / LAST VEHICLE 1.16',fill=(218,211,186),font=font)
d.text((24,54),f"Six original CC0 props · shared Yard115 palette · {sum(a['triangles'] for a in entries):,} triangles · actual source mesh renders",fill=(155,180,173),font=small)
for i,a in enumerate(entries):
 x=(i%3)*512; y=92+(i//3)*598
 image=Image.open(ROOT/'renders'/(a['id']+'.png')).convert('RGB'); sheet.paste(image,(x,y))
 d.text((x+17,y+520),a['id'].upper(),fill=(227,222,200),font=small)
 d.text((x+17,y+547),str(a['triangles'])+' tris / '+str(round(a['bytes']/1024,1))+' KiB',fill=(143,169,160),font=small)
 dims=' × '.join(f'{v:.3f}' for v in a['dimensions'])
 d.text((x+17,y+573),dims+' m (W × H × D)',fill=(143,169,160),font=small)
sheet.save(ROOT/'Meridian_Yard_Details_v116_Contact_Sheet.png')
