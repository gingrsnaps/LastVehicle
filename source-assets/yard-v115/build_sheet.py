"""Assemble independent Blender inspection renders into one labelled sheet."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path(__file__).resolve().parent
entries=json.loads((ROOT/'yard-build.json').read_text())['assets']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
sheet=Image.new('RGB',(1920,946),(15,24,25));d=ImageDraw.Draw(sheet)
d.text((25,19),'MERIDIAN SERVICE YARD / LAST VEHICLE 1.15',fill=(218,211,186),font=font)
d.text((25,50),'Original low-poly props · metres · grounded origins · opaque palette materials · inspection lighting',fill=(155,180,173),font=small)
for i,a in enumerate(entries):
 x=(i%5)*384;y=85+(i//5)*430
 image=Image.open(ROOT/'renders'/(a['id']+'.png')).convert('RGB');sheet.paste(image,(x,y))
 d.text((x+14,y+386),a['id'].upper(),fill=(227,222,200),font=small)
 d.text((x+14,y+408),str(a['triangles'])+' tris / '+str(round(a['bytes']/1024,1))+' KiB',fill=(143,169,160),font=small)
sheet.save(ROOT/'Meridian_Service_Yard_v115_Contact_Sheet.png')
