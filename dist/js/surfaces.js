/** The same ellipses draw the water and answer foot-contact queries. Width and
 * depth are radii in metres, matching the scaled disc geometry in World. */
export const PUDDLES=Object.freeze([
  {id:'gate-runoff',x:1.6,z:5.3,rx:2.3,rz:2.5,depth:.025},
  {id:'lane-leak',x:3,z:65,rx:2.3,rz:4,depth:.035},
  {id:'rear-drain',x:-12,z:87,rx:3,rz:2,depth:.025},
  {id:'electrical-leak',x:11,z:36,rx:2,rz:3,depth:.02},
  {id:'pump-leak',x:20.8,z:101.2,rx:1.8,rz:2.5,depth:.04},
  {id:'workshop-leak',x:-22,z:81,rx:1.15,rz:1.7,depth:.015},
]);
export function surfaceAt(p,extra=[]){const inside=w=>w.enabled!==false&&((p.x-w.x)/w.rx)**2+((p.z-w.z)/w.rz)**2<=1;return PUDDLES.find(inside)||extra.find(inside)||null;}
// This record also places the raised drain cover and its dark inset.
export const DRAIN_COVERS=Object.freeze([{x:27.5,z:100,halfWidth:.26,halfDepth:.35}]);
export function groundKind(p){
  if(DRAIN_COVERS.some(d=>Math.abs(p.x-d.x)<=d.halfWidth&&Math.abs(p.z-d.z)<=d.halfDepth))return 'grate';
  for(const x of [-15.1,15.1])for(let z=14;z<106;z+=12)
    if(Math.abs(p.x-x)<.115&&Math.abs(p.z-z)<1.2)return 'grate';
  if((p.x<-27.8&&p.z>62&&p.z<85)||(p.x>27.8&&p.z>90&&p.z<106))return 'debris';
  return 'concrete';
}
export class Footwear {
  constructor(){this.wet=0;}
  contact(point,options){const profile=stepProfile(point,options);this.wet=profile.water?1:Math.max(0,this.wet-.16);profile.wetness=this.wet;return profile;}
}
export function footContact(pos,yaw,left){
  const side=left?-.16:.16;
  return {x:pos.x+Math.cos(yaw)*side+Math.sin(yaw)*.07,y:.035,z:pos.z-Math.sin(yaw)*side+Math.cos(yaw)*.07};
}
export function stepProfile(point,{crouched=false,sprinting=false,creature=false,extraWater=[]}={}){
  const water=surfaceAt(point,extraWater),force=creature?1.25:crouched?.35:sprinting?1.15:.7;
  return {water,kind:groundKind(point),creature,force,volume:creature?.48:crouched?.13:sprinting?.44:.28,
    hearing:(crouched?2:sprinting?18:8)*(water?1.5:1),rate:creature?.82:1};
}

/** All rings and droplets exist before gameplay/shader preparation. Allocation
 * and geometry creation never happen on a footstep or during a chase. */
export class SurfaceEffects {
  constructor(w){
    this.w=w;this.rings=[];this.drops=[];this.traces=[];this.serial=0;this.traceIndex=0;this.ringIndex=0;this.dropIndex=0;this.limit=4;
    const B=globalThis.BABYLON;
    const ringMat=w.material('ripple sheen','#708781',.28);ringMat.alpha=.38;
    const dropMat=w.material('splash droplets','#637d78',.2);
    const trackMat=w.material('wet sole contact','#182829',.24);trackMat.alpha=.35;
    for(let i=0;i<20;i++){
      const mesh=B.MeshBuilder.CreateDisc('pooled damp footprint',{radius:1,tessellation:10},w.scene);
      mesh.rotation.x=Math.PI/2;mesh.scaling.set(.065,.135,1);mesh.material=trackMat;mesh.isPickable=false;mesh.setEnabled(false);w.visuals.dynamicRoots.add(mesh);
      this.traces.push({mesh,x:0,z:0,age:30,serial:0,creature:false});
    }
    for(let i=0;i<12;i++){
      const mesh=B.MeshBuilder.CreateTorus('pooled foot ripple',{diameter:1,thickness:.009,tessellation:16},w.scene);
      mesh.material=ringMat;mesh.isPickable=false;mesh.setEnabled(false);w.visuals.dynamicRoots.add(mesh);
      this.rings.push({mesh,age:2,life:.8,force:1});
    }
    for(let i=0;i<24;i++){
      const mesh=B.MeshBuilder.CreateSphere('pooled splash droplet',{diameter:.025,segments:2},w.scene);
      mesh.material=dropMat;mesh.isPickable=false;mesh.setEnabled(false);w.visuals.dynamicRoots.add(mesh);
      this.drops.push({mesh,age:2,life:.42,x:0,z:0,vx:0,vz:0,vy:0});
    }
    this.apply({quality:'low'});
  }
  apply(settings){
    this.limit=settings.quality==='high'?12:settings.quality==='low'?4:8;
    this.dropLimit=settings.quality==='low'?0:settings.quality==='high'?24:12;
    this.traceLimit=settings.quality==='low'?8:20;
    this.reset();
  }
  reset(){
    this.traceIndex=this.ringIndex=this.dropIndex=0;
    for(const pool of [this.rings,this.drops,this.traces])for(const p of pool){p.age=30;p.mesh.setEnabled(false);}
  }
  prepare(on){for(const pool of [this.rings,this.drops,this.traces])for(const p of pool){p.mesh.setEnabled(on);if(on)p.mesh.position.set(0,.04,60);}}
  emit(point,profile){
    if(!profile.water&&profile.wetness>.15){
      const t=this.traces[this.traceIndex++%this.traceLimit];Object.assign(t,{x:point.x,z:point.z,age:0,serial:++this.serial,creature:!!profile.creature,wetness:profile.wetness});
      t.mesh.position.set(point.x,.018,point.z);t.mesh.rotation.z=profile.yaw||0;t.mesh.visibility=profile.wetness;t.mesh.setEnabled(true);
    }
    if(!profile.water)return;
    const ring=this.rings[this.ringIndex++%this.limit];ring.age=0;ring.force=profile.force;
    ring.mesh.position.set(point.x,.036,point.z);ring.mesh.scaling.setAll(.08);ring.mesh.setEnabled(true);
    const count=this.dropLimit?Math.ceil(profile.force*3):0;
    for(let n=0;n<count;n++){
      const d=this.drops[this.dropIndex++%this.dropLimit],angle=(this.dropIndex*2.399963);
      d.age=0;d.x=point.x;d.z=point.z;d.vx=Math.cos(angle)*.45*profile.force;d.vz=Math.sin(angle)*.45*profile.force;d.vy=.8+profile.force*.65;
      d.mesh.position.set(point.x,.04,point.z);d.mesh.setEnabled(true);
    }
  }
  tick(dt){
    for(const t of this.traces){if(t.age>=12)continue;t.age+=dt;t.mesh.visibility=t.wetness*Math.max(0,1-t.age/12);if(t.age>=12)t.mesh.setEnabled(false);}
    for(const r of this.rings){
      if(r.age>=r.life)continue;r.age+=dt;
      if(r.age>=r.life){r.mesh.setEnabled(false);continue;}
      const t=r.age/r.life,s=.1+t*.75*r.force;r.mesh.scaling.set(s,1-t*.85,s);
    }
    for(const d of this.drops){
      if(d.age>=d.life)continue;d.age+=dt;
      const y=.04+d.vy*d.age-4.9*d.age*d.age;
      if(d.age>=d.life||y<.035){d.age=d.life;d.mesh.setEnabled(false);continue;}
      d.mesh.position.set(d.x+d.vx*d.age,y,d.z+d.vz*d.age);
    }
  }
}
