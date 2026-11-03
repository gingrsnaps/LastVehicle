import { moveCircle } from './navigation.js?v=1.14.0';
const B=globalThis.BABYLON;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Prebuilt physical aftermath. The cart has one dynamic collider, and the
 * burst's visible puddle is also its footstep surface. No runtime asset loads. */
export class EquipmentScenes {
 constructor(w){
  this.w=w;this.source={x:29.52,y:2.48,z:99.6};const v=w.visuals;
  this.cart=v.root('storage cart encounter');this.cart.position.set(-24,0,41);
  v.box('cart lower tray',this.cart,0,.25,0,1.05,.08,1.05,'steel');
  v.box('cart upper tray',this.cart,0,.82,0,1.05,.08,1.05,'teal');
  for(const x of [-.47,.47])for(const z of [-.45,.45])v.box('cart upright',this.cart,x,.56,z,.04,.7,.04,'steel');
  for(const x of [-.47,.47])v.box('cart handle stem',this.cart,x,1.05,.5,.04,.44,.04,'steel');
  v.box('cart push handle',this.cart,0,1.25,.5,1.0,.04,.04,'rubber');
  this.wheels=[];
  for(const x of [-.43,.43])for(const z of [-.4,.4]){v.box('cart caster stem',this.cart,x,.2,z,.035,.12,.035,'steel');const wheel=v.cylinder('cart rolling wheel',this.cart,x,.1,z,.2,.08,'rubber',10);wheel.rotation.z=Math.PI/2;this.wheels.push(wheel);}
  this.cartRect={name:'dynamic storage cart',x:-24,z:41,w:1.12,d:1.12,y:.68,h:1.36,dynamic:true,enabled:true};w.rects.push(this.cartRect);
  this.cart.metadata={placement:{...this.cartRect,bottom:0},supportY:0};w.placements.record('encounter:cart',this.cart,{support:'floor'});
  this.scrape=v.root('cart aftermath scratches');this.scrape.position.set(-24,.025,40.6);
  for(const x of [-.43,.43])v.box('wheel scrape',this.scrape,x,0,0,.025,.003,1.4,'steel');this.scrape.setEnabled(false);
  this.water={id:'burst-leak',x:28.65,z:99.65,rx:1.05,rz:1.15,depth:.025,enabled:false};w.extraWater=[this.water];
  this.puddle=B.MeshBuilder.CreateDisc('pressure burst puddle',{radius:1,tessellation:20},w.scene);this.puddle.rotation.x=Math.PI/2;this.puddle.position.set(this.water.x,.026,this.water.z);this.puddle.scaling.set(this.water.rx,this.water.rz,1);this.puddle.material=w.materials.puddle;this.puddle.isPickable=false;this.puddle.setEnabled(false);v.dynamicRoots.add(this.puddle);
  this.drops=[];
  for(let i=0;i<12;i++){const d=v.box('prebuilt pressure spray',null,29.5,2.4,99.6,.012,.06,.012,'puddle');d.setEnabled(false);v.dynamicRoots.add(d);this.drops.push(d);}
  this.paper=[];
  for(let i=0;i<4;i++){const m=v.box('exit moving ticket',null,-2+i*1.25,.03,2.6+i*.12,.15,.004,.21,'paper');v.dynamicRoots.add(m);this.paper.push({mesh:m,x:m.position.x,z:m.position.z,phase:i*1.6});}
  this.rain=[];
  for(let i=0;i<16;i++){const m=v.box('outside rain streak',null,-3.5+i*.46,2, -1.5-(i%3)*.5,.008,.22,.008,'puddle');m.setEnabled(false);v.dynamicRoots.add(m);this.rain.push(m);}
  this.reset({scares:[]});
 }
 bindSource(){this.source=this.w.richDetails?.leakSource||{x:29.52,y:2.48,z:99.6};}
 clearCartSweep(player){return Math.abs(player.pos.x+24)>1.35||player.pos.z<38.9||player.pos.z>42.1;}
 moveCart(fraction,player){
  const target=41-.9*smooth(fraction),dz=target-this.cart.position.z;
  if(Math.abs(player.pos.x-this.cartRect.x)<this.cartRect.w/2+.35&&Math.abs(player.pos.z-target)<this.cartRect.d/2+.35)return false;
  // Other walls/props constrain the cart too. Its own collider is omitted.
  this.cartBlockers ||= this.w.rects.filter(r=>r!==this.cartRect);
  const point={x:this.cart.position.x,z:this.cart.position.z};
  moveCircle(point,0,dz,this.cartBlockers,.56);const moved=point.z-this.cart.position.z;
  this.cart.position.z=point.z;this.cartRect.z=point.z;
  for(const wheel of this.wheels)wheel.rotation.x+=moved/.1;
  return Math.abs(moved)>.00001;
 }
 burst(){this.burstTime=0;this.water.enabled=true;this.puddle.setEnabled(true);}
 reset(state){this.reliefTime=0;this.cart.position.z=state.scares.includes('cartPush')?40.1:41;this.cartRect.z=this.cart.position.z;this.scrape.setEnabled(state.scares.includes('cartPush'));this.water.enabled=state.scares.includes('pressureBurst');this.puddle.setEnabled(this.water.enabled);this.burstTime=100;for(const d of this.drops)d.setEnabled(false);}
 prepare(on){this.puddle.setEnabled(on||this.water.enabled);for(const d of this.drops)d.setEnabled(on);}
 tick(dt,time,player,settings){
  this.burstTime+=dt;const source=this.source||{x:29.52,y:2.48,z:99.6},near=Math.hypot(player.pos.x-source.x,player.pos.z-source.z)<14;
  this.reliefTime=Math.max(0,this.reliefTime-dt);
  const burst=this.burstTime<1.35,limit=settings.quality==='low'?4:12;
  for(let i=0;i<this.drops.length;i++){
   const active=near&&this.water.enabled&&i<limit&&(burst||i<(this.reliefTime>0?1:2));this.drops[i].setEnabled(active);if(!active)continue;
   const age=burst?(this.burstTime+i*.035)%.52:(time+i*.4)%.72;
   this.drops[i].position.set(source.x-age*(burst?2.0:.12),Math.max(.04,source.y-age*2.6-4.9*age*age),source.z+Math.sin(i*2.4)*age*.55);
  }
  const exit=this.w.exitOpen&&player.pos.z<16;
  for(const [i,m] of this.rain.entries()){m.setEnabled(exit&&i<(settings.quality==='low'?6:16));if(exit)m.position.y=3.4-((time*5+i*.37)%3.4);}
  for(const p of this.paper){if(!exit)continue;p.mesh.position.x=p.x+Math.sin(time*.7+p.phase)*.22;p.mesh.position.z=p.z+Math.sin(time*.4+p.phase)*.12;p.mesh.rotation.y=Math.sin(time*.8+p.phase)*.16;}
 }
}
