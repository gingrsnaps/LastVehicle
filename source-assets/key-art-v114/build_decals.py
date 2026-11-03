"""Original vector-only wall marks. No font, external bitmap, or trademark input.
Run with Python 3; these SVGs can be used directly as local transparent textures.
A single optional raster atlas preview is for inspection, not a runtime dependency.
"""
from pathlib import Path
import json, hashlib, math
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parents[1]/'dist/assets/textures'
OUT.mkdir(parents=True,exist_ok=True)
# Simple authored line glyphs. All stroke coordinates are in a 10x14 cell.
G={
 'A':'M0 14 L5 0 L10 14 M2 9 H8','B':'M0 14 V0 H6 Q11 0 10 4 Q10 7 5 7 H0 M5 7 Q11 7 10 11 Q10 14 6 14 H0',
 'C':'M10 2 Q5 -1 1 3 Q-1 7 1 11 Q5 16 10 12','D':'M0 14 V0 H4 Q11 0 10 7 Q11 14 4 14 H0',
 'E':'M10 0 H0 V14 H10 M0 7 H7','F':'M10 0 H0 V14 M0 7 H7','G':'M10 2 Q5 -1 1 3 Q-1 7 1 11 Q5 16 10 12 V8 H6',
 'H':'M0 0 V14 M10 0 V14 M0 7 H10','I':'M0 0 H10 M5 0 V14 M0 14 H10','K':'M0 0 V14 M10 0 L0 7 L10 14',
 'L':'M0 0 V14 H10','M':'M0 14 V0 L5 7 L10 0 V14','N':'M0 14 V0 L10 14 V0','O':'M5 0 Q0 0 0 7 Q0 14 5 14 Q10 14 10 7 Q10 0 5 0',
 'P':'M0 14 V0 H6 Q11 0 10 4 Q10 7 6 7 H0','R':'M0 14 V0 H6 Q11 0 10 4 Q10 7 6 7 H0 M5 7 L11 14',
 'S':'M10 2 Q5 -1 1 2 Q-2 6 5 7 Q12 8 9 12 Q5 16 0 12','T':'M0 0 H10 M5 0 V14','U':'M0 0 V10 Q0 14 5 14 Q10 14 10 10 V0',
 'V':'M0 0 L5 14 L10 0','W':'M0 0 L2 14 L5 7 L8 14 L10 0','Y':'M0 0 L5 7 L10 0 M5 7 V14',
 '2':'M0 3 Q0 0 5 0 Q10 0 10 4 L0 14 H10'}
def lettering(text,x,y,size,color,stroke=1.1,spacing=13):
 parts=[]
 for i,ch in enumerate(text):
  if ch==' ':continue
  parts.append(f'<path transform="translate({x+i*spacing*size:.2f} {y}) scale({size})" d="{G[ch]}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round"/>')
 return ''.join(parts)
def svg(body):return '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256">'+body+'</svg>\n'
assets={}
# Old paint tag. It carries no direction or puzzle code; it is atmosphere only.
body='<g opacity=".56" transform="rotate(-5 256 128)">' + lettering('LOW TIDE',32,64,4.0,'#849387',1.2,13)
body+='<path d="M33 154 Q210 176 458 150 M73 157 v40 M105 160 v17 M389 156 v28 M432 153 v42" fill="none" stroke="#849387" stroke-width="4.5" stroke-linecap="round"/>'
body+='<path d="M52 53 l31 -13 M440 60 l18 -12" stroke="#849387" stroke-width="3" opacity=".7"/></g>'
assets['v114-graffiti-low-tide.svg']=svg(body)
# Loose single-line night tag, subdued green-gray with a few broken paint gaps.
body='<g opacity=".5" transform="skewX(-9) translate(40 0)">' + lettering('NIGHT',62,63,5.0,'#8f9b8a',1.0,14)
body+='<path d="M69 156 Q182 133 380 164 Q396 169 424 153 M89 56 L72 40 M399 63 L427 52 M169 143 V184 M330 154 v36" fill="none" stroke="#8f9b8a" stroke-width="5" stroke-linecap="round"/></g>'
assets['v114-graffiti-night.svg']=svg(body)
# A worn old inspection stamp. No buttons, switches, instruction arrows or IDs.
body='<g opacity=".52" transform="rotate(3 256 128)"><path d="M26 37 H471 V214 H26 V37 M34 45 H463 V206 H34 V45" fill="none" stroke="#99845f" stroke-width="3" stroke-dasharray="76 4 28 7 17 3"/>'
body+=lettering('SURFACE',74,64,3.3,'#99845f',.8,14)+lettering('CHECKED',74,134,3.3,'#99845f',.8,14)
body+='<path d="M44 115 H447" stroke="#99845f" stroke-width="2" stroke-dasharray="65 5 18 3"/></g>'
assets['v114-inspection-surface.svg']=svg(body)
# Maintenance department stencil, decorative administrative marking.
body='<g opacity=".48" transform="rotate(-2 256 128)"><path d="M33 50 H466 M33 196 H466" fill="none" stroke="#8a9a91" stroke-width="4" stroke-dasharray="26 4"/>'
body+=lettering('MERIDIAN',47,69,3.6,'#8a9a91',.8,14)+lettering('SERVICE',92,139,3.0,'#8a9a91',.8,14)
body+='<path d="M30 68 V176 M473 68 V176" stroke="#8a9a91" stroke-width="3" stroke-dasharray="30 6"/></g>'
assets['v114-inspection-meridian.svg']=svg(body)
entries=[]
for name,content in assets.items():
 path=OUT/name;path.write_text(content)
 entries.append({'file':'textures/'+name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'width':512,'height':256,'license':'CC0-1.0','external_dependencies':0})
(ROOT/'decals-build.json').write_text(json.dumps(entries,indent=2)+'\n')
print(json.dumps(entries,indent=2))
