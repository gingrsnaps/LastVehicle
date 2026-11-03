import { roomAt } from "./guidance.js?v=1.14.0";
const B=globalThis.BABYLON;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

/** Small authored environmental details. Static objects join the normal batching
 * pass. Only the hatch, loose lamp and shared dust instances remain dynamic.
 * Nothing is created or downloaded when a scare fires. */
export class Atmosphere {
  constructor(world){
    this.w=world;this.v=world.visuals;this.time=0;this.dustLimit=0;this.dust=[];
    world.material("canvas","#59635b",.98);world.material("stain","#242f2e",.98);
    world.material("labelInk","#142925",.95);world.material("dust","#b5b9a4",1);
    world.materials.dust.alpha=.25;
    this.dressRooms();this.makeEncounters();this.makeStorySets();this.makeContactDetails();this.makeDust();
  }
  dressRooms(){
    const w=this.w;
    // The desk's interactive note and key retain clear space in front of them.
    w.box("ticket tray",-24.9,.97,18.1,.5,.09,.32,"dark");
    for(let i=0;i<4;i++)w.box("stacked shift tickets",-24.9,1.02+i*.008,18.1,.35,.008,.21,"paper");
    w.cylinder("abandoned coffee",-23.1,1.06,17.6,.13,.22,"paper",10);
    w.box("wall rota backing",-29.64,1.9,13, .08,1.3,2,"teal");
    w.sign("SHIFT ROTA / B2",-29.58,2.27,13,1.75,.22,-Math.PI/2);
    for(let i=0;i<4;i++)w.box("rota page",-29.57,1.8,12.3+i*.45,.012,.63,.35,"paper");
    // Small physical details, not additional puzzles or false interaction targets.
    for(const [x,z,top] of [[-25.9,82,1.6],[-26.7,82,1.6],[-22.6,69,.925]]){
      w.box("workshop oil cloth",x,top+.006,z,.48,.012,.35,"canvas");
      const wrench=w.box("spare spanner",x,top+.0295,z,.07,.035,.32,"steel");wrench.rotation.y=.65;
    }
    for(const [x,z] of [[-20,35],[-20,52]]){
      w.box("covered equipment",x,.65,z,1.2,1.3,1.5,"canvas",true);
      w.box("cloth folded edge",x,.74,z+.76,1.23,.2,.04,"canvas");
    }
    // Narrow surface marks share opaque materials and merge with static sectors.
    for(let i=0;i<16;i++){
      const z=14+i*5.3;
      for(const x of [-1.15,1.15]){
        const mark=w.box("faded tyre scuff",x,.026,z,.11,.005,1.1,"stain");mark.rotation.y=.04*Math.sin(i);
      }
    }
    for(const [x,z] of [[-21,19],[-21,71],[24,45],[22,95]]){
      for(let i=0;i<3;i++)w.box("utility cable",x+i*.06,3.48,z,.035,.035,4,"black");
    }
    // Small drip rings share one geometry; no screen-wide reflective surface.
    for(let i=0;i<3;i++){
      const ring=B.MeshBuilder.CreateTorus("drip ring",{diameter:.2+i*.18,thickness:.007,tessellation:16},w.scene);
      ring.position.set(20.8,.03,101.2);ring.material=w.materials.puddle;ring.isPickable=false;
    }
  }
  makeStorySets(){
    const w=this.w,v=this.v;
    // Security's inspection window is behind the key desk, with open routes at
    // both ends. The single real enemy starts behind it; there is no duplicate.
    w.material("wiredGlass","#1c3031",.38);w.materials.wiredGlass.alpha=.22;
    w.material("crackedGlass","#82928b",.7);w.material("safetyGlow","#7b3a16",.8,"#8f4216");
    w.box("security window base",-23.5,.53,16.45,4.7,1.06,.16,"teal",true);
    w.box("security wired window",-23.5,1.77,16.45,4.7,1.42,.04,"wiredGlass");
    w.rects.push({x:-23.5,z:16.45,w:4.7,d:.16,y:1.77,h:1.42,enabled:true,name:"security window"});
    for(const x of [-25.85,-23.5,-21.15])w.box("window mullion",x,1.77,16.45,.05,1.45,.08,"steel");
    for(const y of [1.06,2.49])w.box("window frame",-23.5,y,16.45,4.8,.055,.09,"steel");
    this.securityShutter=v.root("security privacy blind");this.securityShutter.position.set(-23.5,1.78,16.38);
    for(let i=0;i<9;i++)v.box("blind slat",this.securityShutter,0,-.62+i*.155,0,4.62,.105,.045,"canvas");
    this.windowDamage=v.root("window impact cracks");this.windowDamage.position.set(-23.45,1.44,16.48);
    for(let i=0;i<9;i++){const m=v.box("radial glass fracture",this.windowDamage,Math.sin(i*.7)*.17,Math.cos(i*.7)*.2,0,.007,.45,.008,"crackedGlass");m.rotation.z=-i*.7;}
    this.windowDamage.setEnabled(false);
    this.securityPosition={x:-23.45,y:1.44,z:16.5};this.securityActor={x:-23.25,z:15.35};
    // A spring-loaded electrical cover stays clear of the actual breaker handles.
    w.box("auxiliary relay housing",27.68,1.85,40.3,.42,1,.9,"steel",true);
    this.panelCover=v.root("electrical auxiliary door");this.panelCover.position.set(27.4,2.3,40.7);
    v.box("electrical cover leaf",this.panelCover,0,-.45,-.4,.07,.9,.8,"teal");
    v.box("panel warning stripe",this.panelCover,-.045,-.2,-.4,.015,.12,.6,"yellow");
    this.surgePosition={x:27.3,y:1.8,z:40.25};
    // The indicator changes emission only: no light or particle allocation at impact.
    this.surgeIndicator=v.box("failed relay indicator",null,27.33,2.14,40.25,.04,.09,.22,"red");
    this.surgeIndicator.material=w.material("relayFlash","#441d0a",.6,"#61320e");v.dynamicRoots.add(this.surgeIndicator);
    this.emergency=[];
    for(const [x,z] of [[-16.5,18],[-16.5,45],[-16.5,76],[16.5,39],[16.5,98],[0,8]]){
      const m=w.box("emergency route marker",x,.12,z,.08,.06,.5,"safetyGlow");
      this.emergency.push(m);
    }
    // Thick cables, drain channels and worn patches are opaque geometry; they
    // merge with static materials instead of adding transparent decal overdraw.
    for(const x of [-15.1,15.1])for(let z=14;z<106;z+=12){
      w.box("drain channel",x,.021,z,.23,.007,2.4,"dark");
      for(let i=0;i<9;i++)w.box("drain crossbar",x,.027,z-1+i*.25,.22,.006,.025,"steel");
    }
    for(const [x,z] of [[-29.3,40],[-29.3,53],[29.2,31],[29.2,47],[-29.3,66]]){
      w.box("utility wall conduit",x,1.3,z,.045,2.6,.045,"steel");
      w.box("cable junction",x,2.45,z,.15,.32,.26,"dark");
    }
    for(const [x,z] of [[-26.8,38],[-26.8,54],[-21,84]])for(let i=0;i<3;i++){
      const tyre=B.MeshBuilder.CreateTorus("stored tyre",{diameter:.67,thickness:.16,tessellation:12},w.scene);
      tyre.position.set(x,.13+i*.21,z);tyre.material=w.materials.rubber;tyre.isPickable=false;
    }
    for(const [x,z,turn] of [[-29.62,25,0],[-29.62,82,0],[29.62,45,Math.PI]]){
      for(let i=0;i<6;i++){
        const streak=w.box("weathered wall streak",x,1.05+i*.19,z+i*.13,.018,.65,.025+i*.009,"stain");streak.rotation.x=.08;streak.rotation.y=turn;
      }
    }
    // Broken camera, labelled fuse storage and restrained floor clutter tell the
    // story without introducing misleading interactables or blocking the lane.
    w.box("CCTV mounting arm",-18.3,3.1,18,.7,.06,.08,"steel");
    this.cctv=v.root("damaged CCTV head");this.cctv.position.set(-18,3.08,18);
    v.box("CCTV casing",this.cctv,0,0,0,.26,.18,.44,"paper");
    v.box("CCTV black lens",this.cctv,0,0,.23,.15,.11,.015,"black");
    for(let i=0;i<5;i++){
      const paper=w.box("wind-blown ticket",-20.5+(i%2)*.3,.029,24+i*.35,.17,.006,.25,"paper");paper.rotation.y=i*.7;
    }
    w.sign("NO NIGHT ATTENDANT",-29.57,1.45,11.8,1.6,.25,-Math.PI/2,"#c6b897","#26312f");
    w.sign("EMERGENCY CIRCUIT",27.67,2.46,39,1.45,.14,Math.PI/2,"#bea16e","#222e2b");
    // An actual shielded door light supplies the side-lit electrical reveal.
    w.box('electrical doorway light bracket',17.55,2.75,41,.34,.08,.12,'steel');
    w.box('electrical doorway amber lens',17.55,2.7,41,.26,.035,.08,'warm');
    w.lights.push({x:17.55,y:2.65,z:41,base:1.6,range:4.5,color:B.Color3.FromHexString('#b7b88c')});
  }
  makeContactDetails(){
    const w=this.w,v=this.v;this.nearMotion=[];
    // Small work lights share the existing four fixture slots. They expose the
    // battery/cabinet locally while the driving lane remains dark.
    w.lights.push({x:7.8,y:2.7,z:82,base:3,range:5,color:B.Color3.FromHexString("#e1b873")});
    w.box("cabinet lamp bracket",-28.05,2.5,76,.9,.06,.12,"steel");
    w.box("cabinet work tube",-27.67,2.45,76,.08,.06,.55,"warm");
    w.lights.push({x:-27.5,y:2.35,z:76,base:1.8,range:4,color:B.Color3.FromHexString("#e1c28e")});
    // A protected inspection lamp clips to the engine-bay lip, supported at both ends.
    v.box("inspection lamp frame",w.stage.car,.55,1.07,1.35,.08,.14,.42,"yellow");
    v.box("inspection lamp lens",w.stage.car,.5,1.07,1.35,.02,.09,.28,"warm");
    const p=B.Vector3.TransformCoordinates(new B.Vector3(.46,1.15,1.35),w.stage.car.computeWorldMatrix(true));
    w.lights.push({x:p.x,y:p.y,z:p.z,base:.18,range:2.2,color:B.Color3.FromHexString("#ebc992")});
    for(const [x,z] of [[-28.2,81.5],[-23.8,81.5],[-28.2,82.5],[-23.8,82.5]]){
      w.cylinder("bench fastening bolt",x,1.611,z,.034,.022,"steel",6);
      w.box("rust halo below fastening",x,1.602,z,.07,.004,.06,"stain");
    }
    // Hanging insulation begins at an existing overhead cable, not in midair.
    const cable=v.root("frayed cable tail");cable.position.set(-21,3.48,84);
    for(let i=0;i<4;i++)v.box("hanging cable segment",cable,Math.sin(i*.3)*.04,-.12-i*.23,0,.023,.25,.023,"black");
    this.nearMotion.push({node:cable,axis:'z',base:0,amount:.025,rate:.7});
    const vent=v.root("loose pump vent slat");vent.position.set(29.69,2.83,96);
    v.box("hinged vent edge",vent,0,-.06,0,.04,.12,1.22,"steel");
    this.nearMotion.push({node:vent,axis:'z',base:0,amount:.018,rate:1.1});
    // Saved encounter aftermath: worn metal and a fresh dragged mark remain.
    this.returnScuff=v.root("return encounter floor scrape");this.returnScuff.position.set(9,.021,67.4);
    for(let i=0;i<3;i++){const mark=v.box("fresh drag scratch",this.returnScuff,i*.11,.001+i*.001,0,.018,.004,1.15,"steel");mark.rotation.y=.7;}
    this.returnScuff.setEnabled(false);
  }
  playSecurity(onImpact=()=>{},onDone=()=>{}){
    let struck=false;this.securityActive=true;this.securityPhase=0;
    this.v.animator.to("security-breach",0,1,3.2,t=>{
      this.securityPhase=t;
      // The slats lift first, revealing the actual actor winding up behind glass.
      this.securityShutter.position.y=1.78+1.45*smooth(t/.36);
      if(t>=.58&&!struck){struck=true;this.windowDamage.setEnabled(true);onImpact();}
      if(struck)this.securityShutter.rotation.x=Math.sin(t*75)*Math.exp(-(t-.58)*13)*.025;
    },()=>{this.securityActive=false;this.securityShutter.rotation.x=0;onDone();},"linear");
  }
  playSurge(onImpact=()=>{}){
    let struck=false;this.surgeActive=true;
    this.v.animator.to("electrical-surge",0,1,1.8,t=>{
      this.panelCover.rotation.y=1.25*smooth((t-.22)/.18)+(t>.4?Math.sin(t*36)*Math.exp(-(t-.4)*8)*.12:0);
      const pulse=t>.25&&t<.42?1:0;
      this.surgeIndicator.material.emissiveColor.set(.38+pulse*(this.settings?.reducedFlashes?.05:.5),.13,.025);
      if(t>=.4&&!struck){struck=true;this.emergencyMode=true;onImpact();}
    },()=>{this.surgeActive=false;this.panelCover.rotation.y=1.25;},"linear");
  }
  makeEncounters(){
    const w=this.w,v=this.v;
    w.box("service duct housing",-27.85,1.12,74.5,.66,2.24,.98,"teal",true);
    this.hatch=v.root("loose service hatch");this.hatch.position.set(-27.45,2.12,74.5);
    v.box("hinged service panel",this.hatch,0,-.44,0,.07,.88,.82,"steel");
    for(let i=0;i<4;i++)v.box("hatch louvre",this.hatch,.045,-.2-i*.12,0,.025,.03,.62,"dark");
    w.box("hatch dark recess",-27.51,1.68,74.5,.07,.91,.86,"black");
    this.lamp=v.root("loose work lamp");this.lamp.position.set(7.8,3.77,82);
    v.box("lamp suspension",this.lamp,0,-.45,0,.035,.9,.035,"black");
    v.box("work lamp housing",this.lamp,0,-.98,0,.6,.13,.28,"yellow");
    v.box("work lamp tube",this.lamp,0,-1.05,0,.47,.025,.19,"warm");
    w.box("lamp support",7.8,3.78,82,1.8,.08,.12,"steel");
    w.box("lamp impact guard",8.45,2.8,82,.06,.6,.36,"steel");
    this.hatchPosition={x:-27.35,y:1.7,z:74.5};this.lampPosition={x:7.8,y:2.8,z:82};
  }
  makeDust(){
    const w=this.w;
    const source=B.MeshBuilder.CreateSphere("dust mote",{diameter:.018,segments:2},w.scene);
    source.material=w.materials.dust;source.isPickable=false;
    for(let i=0;i<18;i++){
      const mesh=i?source.createInstance("dust mote "+i):source;
      mesh.isPickable=false;w.visuals.dynamicRoots.add(mesh);mesh.setEnabled(false);
      const anchor=[{x:-25,z:75},{x:10,z:80},{x:23,z:97}][i%3];
      mesh.position.set(anchor.x,1.5,anchor.z);
      this.dust.push({mesh,anchor,phase:i*1.71});
    }
  }
  setSettings(settings){this.settings=settings;this.dustLimit=settings.quality==="high"?18:settings.quality==="medium"?9:0;}
  prepare(enabled){this.preparing=enabled;for(const {mesh} of this.dust)mesh.setEnabled(enabled);if(enabled){this.returnBeforeWarmup=this.returnScuff.isEnabled();this.returnScuff.setEnabled(true);this.damageBeforeWarmup=this.windowDamage.isEnabled();this.windowDamage.setEnabled(true);}else {this.windowDamage.setEnabled(!!this.damageBeforeWarmup);this.returnScuff.setEnabled(!!this.returnBeforeWarmup);}}
  reset(state){
    this.returnScuff.setEnabled(state.scares.includes("carReturn"));
    this.blackoutTime=0;this.hatch.rotation.z=(state.scares.includes("cabinet")||state.scares.includes("workshopBreach"))?.95:0;this.lamp.rotation.z=0;
    this.hatchActive=false;this.lampActive=false;this.securityActive=false;this.surgeActive=false;
    this.securityShutter.position.y=state.scares.includes("securityBreach")?3.23:1.78;
    this.securityShutter.rotation.x=0;this.windowDamage.setEnabled(state.scares.includes("securityBreach"));
    this.emergencyMode=state.scares.includes("powerSurge");this.panelCover.rotation.y=this.emergencyMode?1.25:0;
  }
  playHatch(onImpact=()=>{}){
    if(this.hatchActive)return false;this.hatchActive=true;let sounded=false;
    this.v.animator.to("hatch-scare",0,1,1.25,t=>{
      // Brief anticipation, a fast fall, then a restrained physical bounce.
      const fall=smooth((t-.22)/.22);
      this.hatch.rotation.z=.95*fall+(t>.44?Math.sin((t-.44)*35)*Math.exp(-(t-.44)*9)*.09:0);
      if(t>=.44&&!sounded){sounded=true;onImpact();}
    },()=>{this.hatch.rotation.z=.95;this.hatchActive=false;},"linear");return true;
  }
  playLamp(onImpact=()=>{}){
    if(this.lampActive)return false;this.lampActive=true;let sounded=false;
    this.v.animator.to("lamp-scare",0,1,2.2,t=>{
      this.lamp.rotation.z=Math.sin(t*Math.PI*5)*Math.exp(-t*3)*.45;
      if(t>=.1&&!sounded){sounded=true;onImpact();}
    },()=>{this.lamp.rotation.z=0;this.lampActive=false;},"linear");return true;
  }
  tick(dt,time,player,playing){
    if(!playing||!player)return;
    this.blackoutTime=Math.max(0,(this.blackoutTime||0)-dt);
    const near=node=>Math.hypot(node.position.x-player.pos.x,node.position.z-player.pos.z)<12&&roomAt(node.position)===roomAt(player.pos);
    if(near(this.cctv)){this.cctv.rotation.y=Math.sin(time*.17)*.14;this.cctv.rotation.x=.35+Math.sin(time*.41)*.015;}
    if(!this.settings?.reducedMotion)for(const motion of this.nearMotion)if(near(motion.node))motion.node.rotation[motion.axis]=motion.base+Math.sin(time*motion.rate)*motion.amount;
    for(let i=0;i<this.dust.length;i++){
      const d=this.dust[i],dx=d.anchor.x-player.pos.x,dz=d.anchor.z-player.pos.z;
      const visible=i<this.dustLimit&&player.flashlight&&!player.hiding&&!player.vehicle&&dx*dx+dz*dz<64&&roomAt(d.anchor)===roomAt(player.pos);
      if(d.mesh.isEnabled()!==visible)d.mesh.setEnabled(visible);
      if(visible)d.mesh.position.set(d.anchor.x+Math.sin(time*.13+d.phase)*1.5,1.5+Math.sin(time*.19+d.phase)*.7,d.anchor.z+Math.cos(time*.11+d.phase)*1.4);
    }
  }
}
