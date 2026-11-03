"""Compose actual Blender pose renders into an inspection sheet; no drawn poses."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',32)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
labels=[('01-stalk.png','STALK · measured stance and lifted swing'),('02-peek-left.png','PEEK LEFT · head leads the torso'),('03-peek-right.png','PEEK RIGHT · feet remain planted'),('04-push-reach.png','DOOR PUSH · right-hand contact at 35%'),('05-push-weight.png','DOOR PUSH · held contact and body weight'),('06-crouch-search.png','CROUCH SEARCH · low, deliberate sweep'),('07-start-run.png','START RUN · anticipation and acceleration'),('08-strike.png','STRIKE · existing action preserved'),('09-idle.png','IDLE · original silhouette preserved')]
w,h=480,600;top=108;lh=48
sheet=Image.new('RGB',(w*3,(h+lh)*3+top+60),(17,23,26));d=ImageDraw.Draw(sheet)
d.text((24,14),'THE ATTENDANT · SEARCH & INTENTION',font=title,fill=(224,215,192))
d.text((24,60),'21 authored clips · 1,868 triangles · six new context actions · fifteen prior clips retained',font=small,fill=(157,177,177))
for i,(fn,label) in enumerate(labels):
 x=i%3*w;y=top+i//3*(h+lh)
 sheet.paste(Image.open(P/fn).convert('RGB'),(x,y));d.text((x+14,y+h+10),label,font=f,fill=(218,207,180))
d.text((24,sheet.height-42),'Actual evaluated Blender poses. Browser playback and blending still require integration playtesting.',font=small,fill=(141,158,160))
sheet.save(P/'attendant-contact-sheet.png');print(P/'attendant-contact-sheet.png')
