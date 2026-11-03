"""Assemble exact Blender render thumbnails and factual dimension labels.
Needs Pillow only for this authoring aid; the browser game does not use it.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text());assets=manifest['assets']
W=1800;TOP=126;CW=300;CH=344;BOTTOM=66
im=Image.new('RGB',(W,TOP+4*CH+BOTTOM),'#162d2b');d=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(s):return ImageFont.truetype(font,s)
d.text((28,19),'MERIDIAN / INDUSTRIAL DETAILS',font=f(36),fill='#e6e8d8')
d.text((30,66),'24 original low-poly props • actual Blender renders • all measurements in metres',font=f(20),fill='#bbc9b9')
for i,a in enumerate(assets):
 x=(i%6)*CW;y=TOP+(i//6)*CH;pic=Image.open(ROOT/'renders'/f"{a['id']}.png").convert('RGB').resize((284,284),Image.Resampling.LANCZOS)
 im.paste(pic,(x+8,y));d.text((x+11,y+290),a['id'].replace('-',' ').upper(),font=f(16),fill='#e2e5d4')
 dims=' × '.join(f'{v:.2f}' for v in a['dimensions']);d.text((x+11,y+313),f"{dims}  /  {a['support_type']}",font=f(13),fill='#a9c4b4')
d.text((28,TOP+4*CH+12),'Geometry and mounting origins validated from delivered GLBs. Studio lighting is for inspection; it is not baked into the models.',font=f(17),fill='#b8c8b8')
im.save(ROOT/'Meridian_Industrial_Contact_Sheet.png')
print(ROOT/'Meridian_Industrial_Contact_Sheet.png')
