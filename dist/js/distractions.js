import { segmentHits } from './navigation.js?v=1.14.0';
const B=globalThis.BABYLON;
/** Swept movement prevents a low frame rate from throwing a bolt through a
 * wall. First contact is one sound/event; the supplied cue contains its tail. */
export function stepBolt(body,dt,rects){
 if(!body.active)return false;
 let contact=false;
 const steps=Math.max(1,Math.ceil(Math.min(.1,dt)/.012));
 for(let i=0;i<steps;i++){
  const h=Math.min(.1,dt)/steps,from={x:body.x,y:body.y,z:body.z};
  body.vy-=9.8*h;
  const to={x:body.x+body.vx*h,y:body.y+body.vy*h,z:body.z+body.vz*h};
  const wall=rects.find(r=>Number.isFinite(r.y)&&Number.isFinite(r.h)&&segmentHits(from,to,r,.025,true));
  if(wall){
   if(!body.contacted){contact=true;body.contacted=true;}
   // Slide down after a wall strike. Never leave a prop suspended at impact.
   body.vx*=-.18;body.vz*=-.18;to.x=from.x;to.z=from.z;
   const top=wall.y+wall.h/2+.026;
   if(from.y>=top&&to.y<=top){to.y=top;body.active=false;}
  }
  if(to.y<=.025){
   if(!body.contacted){contact=true;body.contacted=true;}
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
  for(let i=0;i<3;i++){
   const root=w.visuals.root('throwable bolt '+i);
   const shaft=w.visuals.cylinder('bolt shaft',root,0,0,0,.018,.11,'steel',6);shaft.rotation.z=Math.PI/2;
   const head=w.visuals.cylinder('hex bolt head',root,-.055,0,0,.037,.017,'steel',6);head.rotation.z=Math.PI/2;
   root.setEnabled(false);this.slots.push({root,active:false,life:0});
  }
 }
 reset(){this.cooldown=0;this.handTime=0;for(const b of this.slots){b.active=false;b.life=0;b.root.setEnabled(false);}}
 throw(player,state){
  if(this.cooldown||player.hiding||player.vehicle||!state.bolts)return false;
  const body=this.slots.find(b=>!b.active&&b.life<=0)||this.slots.find(b=>!b.active);if(!body)return false;
  const pitch=Math.max(-1,Math.min(.8,player.pitch)),c=Math.cos(pitch);
  Object.assign(body,{x:player.pos.x,y:player.height-.12,z:player.pos.z,vx:Math.sin(player.yaw)*c*8,vz:Math.cos(player.yaw)*c*8,vy:-Math.sin(pitch)*8+2.0,active:true,contacted:false,life:6});
  body.root.position.set(body.x,body.y,body.z);body.root.setEnabled(true);
  state.bolts--;this.cooldown=.7;this.handTime=.38;return true;
 }
 tick(dt,onImpact){
  this.cooldown=Math.max(0,this.cooldown-dt);this.handTime=Math.max(0,this.handTime-dt);
  for(const b of this.slots){
   if(b.life<=0)continue;b.life-=dt;
   if(b.active){if(stepBolt(b,dt,this.w.rects))onImpact({x:b.x,y:b.y,z:b.z});b.root.position.set(b.x,b.y,b.z);b.root.rotation.z+=dt*12;}
   if(b.life<=0){b.active=false;b.root.setEnabled(false);}
  }
 }
}
