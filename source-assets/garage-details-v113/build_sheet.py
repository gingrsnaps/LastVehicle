"""Lay out real Blender inspection renders; no generated/painted asset art.
Run after render_props.py with a Python environment containing Pillow.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
ROOT=Path(__file__).resolve().parent
m=json.loads((ROOT/'manifest-fragment.json').read_text())
width,cell,top,bottom=1440,360,105,60
sheet=Image.new('RGB',(width,top+3*418+bottom),'#162d2b');draw=ImageDraw.Draw(sheet)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):return ImageFont.truetype(font_path,n)
draw.text((22,16),'MERIDIAN / WORN GARAGE DETAILS',font=font(31),fill='#e6e8d8')
draw.text((24,61),'12 original CC0 props  /  actual Blender renders  /  Last Vehicle 1.13',font=font(19),fill='#b8c9b8')
for i,a in enumerate(m['assets']):
 x=i%4*cell;y=top+i//4*418
 pic=Image.open(ROOT/'renders'/f"{a['id']}.png").convert('RGB').resize((344,344),Image.Resampling.LANCZOS)
 sheet.paste(pic,(x+8,y))
 draw.text((x+11,y+351),a['id'].replace('-',' ').upper(),font=font(16),fill='#e2e5d4')
 dims=' × '.join(f'{v:.3f}' for v in a['dimensions'])
 draw.text((x+11,y+376),f"{dims} m  /  {a['triangles']} triangles",font=font(14),fill='#a9c4b4')
draw.text((22,top+3*418+10),'Studio lighting for inspection only. Grounding, wall mounts and anchors verified from the delivered GLBs.',font=font(17),fill='#b8c8b8')
sheet.save(ROOT/'Meridian_Garage_Details_v113_Contact_Sheet.png')
