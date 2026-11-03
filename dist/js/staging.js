import { stealthVisibility } from "./lighting.js?v=1.14.0";
import { roomAt } from "./guidance.js?v=1.14.0";
const B=globalThis.BABYLON;
const smooth=t=>t*t*(3-2*t);
export const DRIVE_START=2.2, DRIVE_END=14.6;
export const SHELTERS=[
 {id:"hide-security",name:"Security locker",x:-28,z:10,entry:{x:-28,z:11.25},yaw:Math.PI},
 {id:"hide-storage",name:"Storage locker",x:-28,z:43,entry:{x:-28,z:44.25},yaw:Math.PI},
 {id:"hide-workshop",name:"Workshop locker",x:-28,z:85,entry:{x:-28,z:86.25},yaw:Math.PI},
 {id:"hide-electrical",name:"Electrical locker",x:25,z:48,entry:{x:25,z:49.25},yaw:Math.PI},
 {id:"hide-pump",name:"Pump-room locker",x:21,z:88,entry:{x:21,z:89.25},yaw:Math.PI},
];
// Sample a curved bay exit once. Arc-length traversal gives one continuous speed
// profile through the turn and straight lane; the camera never jumps at a joint.
const drivePath=[];
for(let i=0;i<=50;i++){
 const t=i/50,u=1-t,x=13*u*u*u+24*u*u*t,z=78*u*u*u+234*u*u*t+231*u*t*t+68*t*t*t;
 const dx=-15*u*u-48*u*t,dz=-6*u*t-27*t*t;
 drivePath.push({x,z,yaw:Math.atan2(dx,dz)});
}
for(let i=1;i<=60;i++)drivePath.push({x:0,z:68-83*i/60,yaw:-Math.PI});
let distance=0;for(let i=0;i<drivePath.length;i++){if(i)distance+=Math.hypot(drivePath[i].x-drivePath[i-1].x,drivePath[i].z-drivePath[i-1].z);drivePath[i].distance=distance;}
export function drivePose(seconds){
 const q=smooth(Math.max(0,Math.min(1,(seconds-DRIVE_START)/(DRIVE_END-DRIVE_START)))),d=q*distance;
 let index=1;while(index<drivePath.length-1&&drivePath[index].distance<d)index++;
 const a=drivePath[index-1],b=drivePath[index],t=(d-a.distance)/(b.distance-a.distance||1);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw:a.yaw+(b.yaw-a.yaw)*t};
}
/** Authored low-poly hero props. Static dressing is batched by World; the car,
 * hood, locker doors and cockpit stay in dynamicRoots and are prepared at load. */
export class Staging {
 constructor(w){this.w=w;this.visuals=w.visuals;this.spots=SHELTERS.map(s=>({...s,entry:{...s.entry},inspectEntry:{x:s.x+.66,z:s.z+1.4}}));this.makeCar();this.makeBattery();this.makeShelters();this.fixWayfinding();}
 root(name,parent=null){return this.visuals.root(name,parent);}
 box(name,parent,x,y,z,a,b,c,mat){return this.visuals.box(name,parent,x,y,z,a,b,c,mat);}
 makeCar(){
  const w=this.w;
  this.driverSide=-1;this.driverEye=new B.Vector3(-.43,1.43,-.37);
  this.headlightLeft=new B.Vector3(-.62,.85,2.29);this.headlightRight=new B.Vector3(.62,.85,2.29);
  w.material("carPaint","#355b58",.6);w.material("glass","#112528",.35);
  w.material("windowGlass","#6a8985",.2).alpha=.12;
  w.material("batteryLabel","#c7bfa4",.9);w.material("copper","#a67b4c",.5);
  this.car=this.root("bay 042 · repairable car");this.car.position.set(13,0,78);this.car.rotation.y=-Math.PI/2;
  const box=(name,x,y,z,a,b,c,mat)=>this.box(name,this.car,x,y,z,a,b,c,mat);
  box("painted sill",0,.48,0,1.8,.35,4.3,"carPaint");
  box("lower body",0,.77,-.4,1.77,.42,3.35,"carPaint");
  box("boot lid",0,1.02,-1.55,1.72,.12,.95,"carPaint");
  box("front bumper",0,.5,2.17,1.85,.2,.12,"rubber");
  box("rear bumper",0,.5,-2.17,1.85,.2,.12,"rubber");
  box("engine bay",0,.82,1.42,1.45,.1,1.2,"black");
  box("engine block",.23,.96,1.25,.7,.27,.65,"steel");
  box("battery tray",-.48,.91,1.65,.48,.05,.4,"steel");
  this.installedBattery=box("installed car battery",-.48,1.075,1.65,.4,.28,.3,"black");
  this.newCable=box("connected battery lead",-.24,1.23,1.56,.32,.035,.035,"red");
  this.repairSocket=this.root("battery cable clamp contact",this.car);this.repairSocket.position.set(-.4,1.23,1.56);
  this.box("new terminal clamp",this.newCable,-.16,0,0,.065,.04,.065,"copper");
  // Corrosion is concentrated at the terminals, never across the readable label.
  w.material("terminalCorrosion","#779184",.97);
  for(const x of [-.13,.13])this.box("old corroded terminal",this.installedBattery,x,.15,0,.055,.025,.05,"terminalCorrosion");
  this.hood=this.root("hood hinge",this.car);this.hood.position.set(0,1.08,.77);
  this.box("hood panel",this.hood,0,0,.64,1.75,.075,1.33,"carPaint");
  box("roof",0,1.66,-.35,1.65,.09,1.65,"carPaint");
  this.wheels=[];this.doors=[];
  for(const side of [-1,1]){
    for(const z of [-1.16,.48]){const post=box("window pillar",side*.81,1.35,z,.09,.65,.1,"carPaint");post.rotation.x=z>0?-.28:.18;}
    const door=this.root(side===this.driverSide?"driver door hinge":"passenger door hinge",this.car);
    door.position.set(side*.87,0,.48);this.doors.push({node:door,side});
    this.box("door lower",door,0,.92,-.78,.06,.28,1.5,"carPaint");
    this.box("window sill",door,0,1.1,-.83,.07,.07,1.63,"steel");
    const handle=this.box("door handle",door,side*.05,1.03,-1.15,.045,.05,.2,"steel");
    this.doors[this.doors.length-1].handle=handle;
    this.box("side glazing",door,0,1.39,-.83,.022,.49,1.39,"windowGlass");
    box("mirror",side*1.03,1.2,.35,.22,.12,.18,"carPaint");
    box("headlamp",side*.62,.87,2.105,.4,.17,.06,"paper");
    box("tail lamp",side*.65,.87,-2.105,.3,.12,.06,"red");
    for(const z of [-1.4,1.45]){
      const axle=this.root("wheel axle",this.car);axle.position.set(side*.88,.375,z);this.wheels.push(axle);
      const tyre=this.visuals.cylinder("tyre",axle,0,0,0,.75,.22,"rubber",12);tyre.rotation.z=Math.PI/2;
      const hub=this.visuals.cylinder("wheel hub",axle,side*.125,0,0,.37,.025,"steel",10);hub.rotation.z=Math.PI/2;
      this.box("hub spoke",axle,side*.14,0,0,.03,.29,.045,"dark");
    }
  }
  // A visible steering wheel and dashboard make the escape an actual in-car view.
  this.cockpit=this.root("driver cockpit",this.car);
  w.material('seatFabric','#263532',.97);
  for(const side of [-1,1]){
    this.box('front seat cushion',this.car,side*.43,.98,-.45,.59,.12,.66,'seatFabric');
    const back=this.box('front seat back',this.car,side*.43,1.27,-.89,.57,.5,.12,'seatFabric');back.rotation.x=-.08;
    this.box('seat headrest',this.car,side*.43,1.52,-.91,.28,.15,.1,'seatFabric');
  }
  this.box('centre storage console',this.cockpit,0,1.055,-.24,.17,.15,.57,'dark');
  this.box('folded passenger paper bag',this.car,.43,1.16,-.45,.26,.24,.2,'paper');
  this.box('bag folded closure',this.car,.43,1.285,-.45,.27,.025,.045,'paper');
  this.box("windshield",this.car,0,1.4,.48,1.53,.48,.02,"windowGlass");
  this.box("dashboard",this.cockpit,0,1.04,.47,1.55,.2,.32,"dark");
  this.box("instrument cluster",this.cockpit,-.42,1.18,.39,.42,.15,.04,"glass");
  w.material('dashboardGlow','#435f54',.75,'#244236');
  for(const x of [-.53,-.38])this.box("instrument needle",this.cockpit,x,1.19,.36,.015,.08,.012,"dashboardGlow");
  this.steering=B.MeshBuilder.CreateTorus("steering wheel",{diameter:.36,thickness:.035,tessellation:16},w.scene);
  this.steering.parent=this.cockpit;this.steering.position.set(-.43,1.11,.12);this.steering.rotation.x=.9;this.steering.material=w.materials.rubber;
  this.drivingHands=[];
  for(const side of [-1,1]){
    const glove=this.box("driving glove",this.steering,side*.16,0,0,.085,.09,.1,"glove");this.drivingHands.push(glove);
    for(let i=0;i<3;i++)this.box('curled driving finger',glove,side*.04,-.025+i*.023,.025,.035,.018,.055,'glove');
  }
  this.cockpit.setEnabled(false);
  // Only the broad body panels need additional dynamic shadow draws.
  for(const mesh of this.car.getChildMeshes())if(["painted sill","lower body","boot lid","hood panel","roof"].includes(mesh.name)){
    mesh.metadata={...mesh.metadata,lvCaster:true};w.shadowMeshes.push(mesh);w.shadow.addShadowCaster(mesh);
  }
  this.carRect={x:13,z:78,w:4.1,d:1.85,enabled:true,name:"bay 042 car",y:.83,h:1.66,dynamic:true};w.rects.push(this.carRect);
  this.car.computeWorldMatrix(true);this.driverHandle=this.doors.find(d=>d.side===this.driverSide).handle.getAbsolutePosition().clone();
  // Aim at the handle's exterior face, clear of the simplified body collider.
  this.driverHandle.z-=.035;
  const door=w.interactives.find(i=>i.id==="car");door.pos.copyFrom(this.driverHandle);door.radius=.38;
  w.interactive("repair","Install battery & cable",10.7,1.05,78,{radius:.55});
  const passenger=B.Vector3.TransformCoordinates(new B.Vector3(1.05,1.03,-.67),this.car.getWorldMatrix());
  w.interactive("car-passenger","Inspect car",passenger.x,passenger.y,passenger.z,{radius:.4});
 }
 setVehicleLighting(on){
  if(this.vehicleLighting===on)return;this.vehicleLighting=on;
  for(const light of [this.w.flash,this.w.spill]){
    if(on){light._walkingExclusions=[...light.excludedMeshes];light.excludedMeshes=[...light._walkingExclusions,...this.car.getChildMeshes()];}
    else if(light._walkingExclusions){light.excludedMeshes=light._walkingExclusions;light._walkingExclusions=null;}
  }
 }
 makeBattery(){
  const w=this.w;this.battery=this.root("recoverable car battery");this.battery.position.set(9.6,-.01,77.1);
  this.box("battery body",this.battery,0,.18,0,.4,.34,.28,"black");
  this.box("battery lid",this.battery,0,.365,0,.42,.04,.3,"dark");
  this.box("battery label",this.battery,0,.2,-.146,.27,.13,.012,"batteryLabel");
  for(const x of [-.13,.13]){
    this.visuals.cylinder("battery terminal",this.battery,x,.405,0,.035,.06,x<0?"red":"steel",8);
    this.box("handle upright",this.battery,x,.45,.06,.025,.13,.025,"steel");
  }
  this.batteryHandle=this.box("battery carrying handle",this.battery,0,.51,.06,.28,.025,.025,"steel");
  w.interactive("battery","Take car battery",9.6,.35,77.1,{radius:.25});
  for(const mesh of this.visuals.releaseKey.getChildMeshes())mesh.dispose();
  this.box("security evidence envelope",this.visuals.releaseKey,0,0,0,.34,.24,.03,"paper");
  this.kit=this.root("replacement cable kit");this.kit.position.set(-27.83,1.4,76);
  for(let i=0;i<3;i++)this.box("coiled red cable",this.kit,0,i*.03,0,.25,.018,.14,"red");
  this.box("brass terminal clamp",this.kit,.1,.05,.08,.08,.06,.04,"copper");
 }
 makeShelters(){
  const w=this.w;
  for(const spot of this.spots){
    const root=this.root(spot.name);root.position.set(spot.x,0,spot.z);spot.root=root;
    this.box("locker back",root,0,1.05,-.45,1.05,2.1,.09,"teal");
    for(const side of [-1,1])this.box("locker side",root,side*.5,1.05,0,.08,2.1,.95,"teal");
    this.box("locker roof",root,0,2.1,0,1.05,.08,1,"teal");
    this.box("locker floor",root,0,.06,0,1,.08,.95,"dark");
    const door=this.root("shelter door hinge",root);door.position.set(-.48,0,.49);spot.door=door;
    this.box("locker door lower",door,.48,.67,0,.94,1.32,.055,"teal");
    this.box("locker door upper",door,.48,1.92,0,.94,.3,.055,"teal");
    for(let i=0;i<4;i++)this.box("locker view louvre",door,.48,1.38+i*.095,0,.94,.044,.07,"dark");
    spot.handle=this.box("locker handle",door,.84,1.08,.065,.05,.22,.07,"steel");
    w.rects.push({x:spot.x,z:spot.z,w:1.08,d:1,enabled:true,name:spot.id});
    w.interactive(spot.id,"Hide",spot.entry.x,1.3,spot.z+.59,{radius:.36});
    this.box("locker fixed label header",root,0,2.28,.45,1.04,.32,.08,"teal");
    w.sign("SHELTER",spot.x,2.28,spot.z+.51,.94,.2,Math.PI,"#d6cfb4","#24403b");
  }
 }
 fixWayfinding(){
  const w=this.w;
  for(const [z,side,name] of [[18,-1,"SECURITY"],[45,-1,"STORAGE"],[76,-1,"WORKSHOP"],[39,1,"ELECTRICAL"],[98,1,"PUMP ROOM"]]){
    w.box("door header backing",side*17,3.7,z,.5,.7,3.6,"teal");
    const label=w.scene.meshes.find(m=>m.name.startsWith("sign ")&&m.name.includes(name)&&Math.abs(m.position.x-side*16.75)<.1);
    if(label){label.position.y=3.7;label.position.x=side*16.72;}
  }
 }
 setHidden(spot,hidden){
  // Open, then settle into the closed position. The slats are genuine gaps.
  this.visuals.animator.to(spot.id,0,1,.42,t=>{spot.door.rotation.y=-Math.sin(t*Math.PI)*1.15;},()=>{spot.door.rotation.y=0;});
 }
 sync(state,immediate){
  const has=id=>state.flags.includes(id);
  this.battery.setEnabled(!has("battery"));this.battery.position.set(9.6,-.01,77.1);this.battery.scaling.setAll(1);
  this.kit.setEnabled(!has("fuse"));
  this.hood.rotation.x=has("repair")?0:has("car")?-.95:0;
  this.installedBattery.position.y=1.075;this.installedBattery.setEnabled(has("repair"));this.newCable.setEnabled(has("repair"));this.newCable.scaling.x=1;
  if(immediate){this.setVehicleLighting(false);this.car.position.set(13,0,78);this.car.rotation.y=-Math.PI/2;this.carRect.enabled=true;this.cockpit.setEnabled(false);this.driving=false;for(const s of this.spots)s.door.rotation.y=0;for(const wheel of this.wheels)wheel.rotation.x=0;for(const door of this.doors)door.node.rotation.y=0;}
 }
 action(id,t){
  if(id==="car")this.hood.rotation.x=-smooth(t)*.95;
  if(id==="battery"){
    // Reach, close the glove, then lift. The full-size object transfers below
    // the frame into inventory; it never shrinks or teleports into the palm.
    this.pickupGrip??=new B.Vector3();this.pickupLocal??=new B.Vector3();
    const lower=smooth(Math.max(0,Math.min(1,(t-.82)/.18)));
    this.pickupLocal.set(-.15,-.25-lower*1.1,.82-lower*.3);
    B.Vector3.TransformCoordinatesToRef(this.pickupLocal,this.w.camera.getWorldMatrix(),this.pickupGrip);
    const lift=smooth(Math.max(0,Math.min(1,(t-.36)/.42)));
    this.battery.position.set(9.6+(this.pickupGrip.x-9.6)*lift,-.01+(this.pickupGrip.y-.51+.01)*lift,77.1+(this.pickupGrip.z-.06-77.1)*lift);
    this.battery.scaling.setAll(1);

  }
  if(id==="repair"){
    this.installedBattery.setEnabled(t>.3);this.installedBattery.position.y=1.075+Math.max(0,.54-t)*.9;
    this.newCable.setEnabled(t>.55);this.newCable.scaling.x=.65+.35*smooth(Math.max(0,Math.min(1,(t-.65)/.1)));this.hood.rotation.x=-.95*(1-smooth(Math.max(0,(t-.75)/.25)));
  }
 }
 beginDrive(player){
  this.entryEye=this.w.camera.position.clone();this.entryView=this.w.camera.rotation.clone();
  this.driving=true;this.driveTime=0;this.engineStarted=false;this.windowHit=false;this.carRect.enabled=true;this.cockpit.setEnabled(true);this.hood.rotation.x=0;
  this.setVehicleLighting(true);
  player.vehicle=true;player.flashlight=false;player.vehicleHeading=this.car.rotation.y;player.yaw=player.targetYaw=this.car.rotation.y;player.pitch=player.targetPitch=0;
 }
 tickDrive(dt,player){
  if(!this.driving)return false;
  this.driveTime+=dt;const t=this.driveTime;
  // The driver door opens before the camera enters, then audibly latches.
  const open=t<.35?0:t<.65?smooth((t-.35)/.3):t<1.05?1:1-smooth(Math.min(1,(t-1.05)/.45));
  const driver=this.doors.find(d=>d.side===this.driverSide);driver.node.rotation.y=1.12*open;
  if(t>=DRIVE_START)this.carRect.enabled=false;
  const pose=drivePose(t),travel=Math.hypot(pose.x-this.car.position.x,pose.z-this.car.position.z);
  for(const wheel of this.wheels)wheel.rotation.x+=travel/.375;
  this.car.position.set(pose.x,0,pose.z);this.car.rotation.y=pose.yaw;
  this.steering.rotation.z=t<6?-.32*Math.sin(Math.min(1,t/6)*Math.PI):0;
  const turn=this.car.rotation.y-(player.vehicleHeading??this.car.rotation.y);player.vehicleHeading=this.car.rotation.y;player.yaw+=turn;player.targetYaw+=turn;
  this.car.computeWorldMatrix(true);
  const eye=B.Vector3.TransformCoordinates(this.driverEye,this.car.getWorldMatrix());
  const entry=player.settings?.reducedMotion?1:smooth(Math.min(1,t/1.15));
  if(entry<1){
    const beside=B.Vector3.TransformCoordinates(new B.Vector3(-1.4,1.58,-.45),this.car.getWorldMatrix());
    if(t<.4)B.Vector3.LerpToRef(this.entryEye,beside,smooth(t/.4),eye);
    else B.Vector3.LerpToRef(beside,eye,smooth(Math.min(1,(t-.4)/.75)),eye);
  }
  // Keep spatial audio and diagnostics at the driver's actual position.
  player.pos.x=eye.x;player.pos.z=eye.z;player.height=eye.y;
  const yawDelta=Math.atan2(Math.sin(player.yaw-this.entryView.y),Math.cos(player.yaw-this.entryView.y));
  this.w.camera.position.copyFrom(eye);this.w.camera.rotation.set(this.entryView.x+(player.pitch-this.entryView.x)*entry,this.entryView.y+yawDelta*entry,0);
  this.w.camera.getViewMatrix(true);
  return t>=DRIVE_END;
 }
 /** Test the actual window exterior before playing the optional escape beat.
  * Coordinates are transformed to the moving car, so the bonnet/rear bumper
  * cannot accidentally qualify as a side window. No actor teleport is used. */
 nearbyWindow(enemy){
  if(this.driveTime<.75||this.driveTime>=1.6||this.windowHit)return null;
  const yaw=this.car.rotation.y,dx=enemy.x-this.car.position.x,dz=enemy.z-this.car.position.z;
  const x=Math.cos(yaw)*dx-Math.sin(yaw)*dz,z=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
  if(Math.abs(z+.3)>.55||Math.abs(x)<1.95||Math.abs(x)>2.25)return null;
  const side=x>0?1:-1;if(side!==this.driverSide)return null;
  return {door:this.doors.find(d=>d.side===side),position:{x:this.car.position.x+Math.cos(yaw)*side*1.01+Math.sin(yaw)*(-.3),y:1.35,z:this.car.position.z-Math.sin(yaw)*side*1.01+Math.cos(yaw)*(-.3)}};
 }
 visibility(pos){
  return stealthVisibility(pos,this.w.lights,this.w.lightingPhase||'outage');
 }
}
