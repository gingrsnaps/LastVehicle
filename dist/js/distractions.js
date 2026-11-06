import { anyNearby } from './spatial.js?v=1.19.0';
import { surfaceAt } from './surfaces.js?v=1.19.0';
const B=globalThis.BABYLON;
/** Earliest intersection, in normalized segment time. Height and enabled state
 * matter: a bolt cannot hit the monster through a wall or an open gate. */
export function boltHitTime(a,b,r,radius=.025){
 if(r.enabled===false||![r.x,r.y,r.z,r.w,r.h,r.d].every(Number.isFinite))return Infinity;
 let enter=0,leave=1;
 for(const [axis,size] of [['x','w'],['y','h'],['z','d']]){
   const delta=b[axis]-a[axis],lo=r[axis]-r[size]/2-radius,hi=r[axis]+r[size]/2+radius;
   if(Math.abs(delta)<1e-9){if(a[axis]<lo||a[axis]>hi)return Infinity;continue;}
   const t0=(lo-a[axis])/delta,t1=(hi-a[axis])/delta;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
   if(enter>leave)return Infinity;
 }
 return enter;
}
/** Swept movement prevents a low frame rate from throwing a bolt through a
 * wall. First contact is one sound/event; the supplied cue contains its tail. */
export function stepBolt(body,dt,rects,target=null){
 if(!body.active)return false;
 let contact=false;
 const steps=Math.max(1,Math.ceil(Math.min(.1,dt)/.012));
 for(let i=0;i<steps;i++){
  const h=Math.min(.1,dt)/steps,from={x:body.x,y:body.y,z:body.z};
  body.vy-=9.8*h;
  const to={x:body.x+body.vx*h,y:body.y+body.vy*h,z:body.z+body.vz*h};
  let wall,wallTime=Infinity;
  anyNearby(rects,Math.min(from.x,to.x)-.025,Math.min(from.z,to.z)-.025,Math.max(from.x,to.x)+.025,Math.max(from.z,to.z)+.025,r=>{const t=boltHitTime(from,to,r);if(t<wallTime){wallTime=t;wall=r;}return false;});
  const enemyTime=!body.contacted&&target?boltHitTime(from,to,target,.035):Infinity;
  if(Number.isFinite(enemyTime)&&enemyTime<wallTime){
    body.contacted=true;body.surface='enemy';contact=true;
    body.impact={x:from.x+(to.x-from.x)*enemyTime,y:from.y+(to.y-from.y)*enemyTime,z:from.z+(to.z-from.z)*enemyTime,surface:'enemy',incoming:{x:body.vx,z:body.vz}};
    Object.assign(body,{x:body.impact.x,y:body.impact.y,z:body.impact.z});body.vx*=-.12;body.vz*=-.12;body.vy=-.4;
    return true;
  }
  if(wall){
   if(!body.contacted){contact=true;body.contacted=true;body.surface=wall.surface||(/window|glass/.test(wall.name||'')?'glass':/steel|car|van|fence|cabinet|dolly|barrier|grille/.test(wall.name||'')?'metal':'concrete');
    body.impact={x:from.x+(to.x-from.x)*wallTime,y:from.y+(to.y-from.y)*wallTime,z:from.z+(to.z-from.z)*wallTime,surface:body.surface};}
   // Slide down after a wall strike. Never leave a prop suspended at impact.
   body.vx*=-.18;body.vz*=-.18;to.x=from.x;to.z=from.z;
   const top=wall.y+wall.h/2+.026;
   if(from.y>=top&&to.y<=top){to.y=top;body.active=false;}
  }
  if(to.y<=.025){
   if(!body.contacted){contact=true;body.contacted=true;body.surface='floor';body.impact={x:to.x,y:.025,z:to.z,surface:'floor'};}
   to.y=.025;body.active=false;body.vx=body.vy=body.vz=0;
  }
  Object.assign(body,to);
  if(!body.active)break;
 }
 return contact;
}
/** Three reusable physical bolts. Saved ammunition prevents unlimited supplies
 * by reloading; no physics engine, mesh creation or asset fetch during play. */
export class Distractions {
 constructor(w){
    this.w=w;this.slots=[];this.cooldown=0;this.handTime=0;
  this.enemyBody={x:0,z:0,y:1.3,w:.68,d:.68,h:2.1,enabled:true};
  this.guide=[];this.guideBody={};
  for(let i=0;i<12;i++){
    const m=B.MeshBuilder.CreateSphere('bolt aim dot',{diameter:.04,segments:2},w.scene);m.material=w.materials.warm;m.isPickable=false;m.setEnabled(false);w.visuals.dynamicRoots.add(m);this.guide.push(m);
  }
  for(let i=0;i<3;i++){
   const root=w.visuals.root('throwable bolt '+i);
   const shaft=w.visuals.cylinder('bolt shaft',root,0,0,0,.018,.11,'steel',6);shaft.rotation.z=Math.PI/2;
   const head=w.visuals.cylinder('hex bolt head',root,-.055,0,0,.037,.017,'steel',6);head.rotation.z=Math.PI/2;
   root.setEnabled(false);this.slots.push({root,active:false,life:0});
  }
 }
 reset(){this.cooldown=0;this.handTime=0;for(const m of this.guide)m.setEnabled(false);for(const b of this.slots){b.active=false;b.life=0;b.root.setEnabled(false);}}
 updateGuide(player,state){
  const on=!!(player.throwAiming&&player.active&&!player.hiding&&!player.vehicle&&state.bolts&&player.settings.throwGuide);
  const pitch=Math.max(-1,Math.min(.8,player.pitch)),c=Math.cos(pitch),b=this.guideBody;
  if(on)Object.assign(b,{x:player.pos.x,y:player.height-.12,z:player.pos.z,vx:Math.sin(player.yaw)*c*8,vz:Math.cos(player.yaw)*c*8,vy:-Math.sin(pitch)*8+2,active:true,contacted:false});
  for(const m of this.guide){m.setEnabled(on&&b.active);if(on&&b.active){stepBolt(b,.07,this.w.rects);m.position.set(b.x,b.y,b.z);}}
 }
 throw(player,state){
  if(this.cooldown||player.hiding||player.vehicle||!state.bolts)return false;
  const body=this.slots.find(b=>!b.active&&b.life<=0)||this.slots.find(b=>!b.active);if(!body)return false;
  const pitch=Math.max(-1,Math.min(.8,player.pitch)),c=Math.cos(pitch);
  Object.assign(body,{x:player.pos.x,y:player.height-.12,z:player.pos.z,vx:Math.sin(player.yaw)*c*8,vz:Math.cos(player.yaw)*c*8,vy:-Math.sin(pitch)*8+2.0,active:true,contacted:false,impact:null,life:6});
  body.root.position.set(body.x,body.y,body.z);body.root.setEnabled(true);
  state.bolts--;this.cooldown=.7;this.handTime=.38;return true;
 }
 tick(dt,onImpact,threat=null){
  this.cooldown=Math.max(0,this.cooldown-dt);this.handTime=Math.max(0,this.handTime-dt);
  const target=threat?.canReceiveBolt?.()?this.enemyBody:null;
  if(target){target.x=threat.pos.x;target.z=threat.pos.z;}
  for(const b of this.slots){
   if(b.life<=0)continue;b.life-=dt;
   if(b.active){
     if(stepBolt(b,dt,this.w.rects,target)){
       const hit=b.impact||{x:b.x,y:b.y,z:b.z,surface:b.surface};
       if(hit.surface==='floor'&&surfaceAt(hit,this.w.extraWater))hit.surface='water';
       onImpact(hit);
     }
     b.root.position.set(b.x,b.y,b.z);b.root.rotation.z+=dt*12;
   }
   if(b.life<=0){b.active=false;b.root.setEnabled(false);}
  }
 }
}
