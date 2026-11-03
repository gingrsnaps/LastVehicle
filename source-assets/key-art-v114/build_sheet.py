"""Compose an inspection sheet from actual GLB renders and original SVGs.
Requires Pillow and the Inkscape CLI for authoring; neither is a game dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[1]/'dist/assets/textures'
page=Image.new('RGB',(1200,1200),'#152b29');draw=ImageDraw.Draw(page)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
draw.text((36,24),'LAST VEHICLE 1.14 · ORIGINAL KEY & WALL MARKS',font=font,fill='#dac89e')
draw.text((36,58),'Actual exported GLB render. SVG decals shown on a neutral wall swatch.',font=small,fill='#afc0b8')
img=Image.open(ROOT/'key-desk.png').convert('RGB');img.thumbnail((1128,520));page.paste(img,(36+(1128-img.width)//2,90))
draw.text((36,638),'Maintenance key · 882 triangles · 5 materials · no textures',font=small,fill='#d1d8ca')
names=['v114-graffiti-low-tide.svg','v114-graffiti-night.svg','v114-inspection-surface.svg','v114-inspection-meridian.svg']
for i,name in enumerate(names):
 x=36+(i%2)*580;y=682+(i//2)*245
 swatch=Image.new('RGBA',(548,204),'#263b37')
 render=ROOT/(name+'.png')
 subprocess.run(['inkscape',str(OUT/name),'--export-type=png','--export-filename='+str(render),'--export-width=408','--export-height=204'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 p=Image.open(render).convert('RGBA')
 swatch.alpha_composite(p,((548-p.width)//2,0));page.paste(swatch.convert('RGB'),(x,y))
 draw.text((x+4,y+212),name.replace('v114-',''),font=small,fill='#aabfb5')
page.save(ROOT/'Key_Art_v114_Contact_Sheet.png')
