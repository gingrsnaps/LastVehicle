"""Arrange actual Blender geometry renders for visual inspection, not concept art."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path(__file__).resolve().parent
entries=json.loads((ROOT/'scenery-build.json').read_text())['assets']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
sheet=Image.new('RGB',(2000,1068),(15,24,25));d=ImageDraw.Draw(sheet)
d.text((24,18),'MERIDIAN SCENERY / LAST VEHICLE 1.19',fill=(218,211,186),font=font)
d.text((24,54),f"Ten original CC0 props | {sum(a['triangles'] for a in entries):,} triangles | Actual source mesh renders, fitted to individual tiles",fill=(155,180,173),font=small)
for i,a in enumerate(entries):
 x=(i%5)*400;y=92+(i//5)*484
 image=Image.open(ROOT/'renders'/(a['id']+'.png')).convert('RGB').resize((400,400),Image.Resampling.LANCZOS);sheet.paste(image,(x,y))
 d.text((x+12,y+402),a['id'].upper(),fill=(227,222,200),font=small)
 d.text((x+12,y+426),str(a['triangles'])+' tris / '+str(round(a['bytes']/1024,1))+' KiB',fill=(143,169,160),font=small)
 dims=' x '.join(f'{v:.2f}' for v in a['dimensions'])
 d.text((x+12,y+450),dims+' m (W x H x D)',fill=(143,169,160),font=small)
sheet.save(ROOT/'Meridian_Scenery_v119_Contact_Sheet.jpg',quality=94)
