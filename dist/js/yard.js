import { YARD, REFILLS } from './campaign.js?v=1.19.0';
import { roomAt } from './guidance.js?v=1.19.0';
import { groundModel } from './placement.js?v=1.19.0';
import { loadInBatches, consumeSteps } from './preparation.js?v=1.19.0';
const B=globalThis.BABYLON;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function exposedToRain(p){return p.z<0&&!(p.x>16.4&&p.z<=-36&&p.z>=-52.2)&&!(p.x>=21&&p.x<=29&&p.z<=-14&&p.z>=-30)&&!(p.x>=-21.5&&p.x<=-16.5&&p.z<=-14.5&&p.z>=-35.5);}
export function weatherBudget(s){
  const level=s.weatherEffects||'full';if(level==='off')return {rain:0,steam:0};
  return {rain:level==='reduced'?(s.quality==='low'?10:14):s.quality==='low'?18:s.quality==='high'?48:32,steam:level==='reduced'||s.quality==='low'?4:12};
}
/** Authored exterior chapter. Large silhouettes, contact details and sound
 * sources are grouped deliberately; the central route stays wide enough for
 * the car. All meshes/effects exist before the loading screen is dismissed. */
export class ServiceYard {
  constructor(w,{defer=false}={}){
    this.w=w;this.v=w.visuals;this.rain=[];this.steam=[];this.props=[];this.refillRoots={};
    for(const [id,c] of [['yardAsphalt','#283330'],['yardRust','#654c3c'],['yardMoss','#374a35'],['yardPaper','#9c9478'],['yardWall','#68716a'],['yardWet','#253b3e']])w.material(id,c,.96);
    const mist=w.material('yardMist','#71817d',1);mist.alpha=.075;mist.backFaceCulling=false;
    if(!defer)for(const _ of this.buildSteps()){}
  }
  *buildSteps(){for(const build of ['buildEnvelope','buildGatehouse','buildUtility','buildLoadingDock','buildDetails','buildDressing','buildEffects']){this[build]();yield;}}
  async buildAsync(){await consumeSteps(this.buildSteps());}
  box(...a){return this.w.box(...a);}
  /** A mounted sign always has a solid backing at the same transform. */
  sign(text,x,y,z,width=2,yaw=0){
    const backing=this.box('yard sign backing '+text,x,y,z,width+.13,.51,.10,'teal');backing.rotation.y=yaw;
    const wallMounted=/ROAD WORKS|^(?:03 )?GATEHOUSE$|SECONDARY|BARRIER BRAKE|^LOADING|LAST DEPARTURE|^1 LOADING/.test(text);
    if(!wallMounted)for(const side of [-1,1]){
      const offset=side*width*.35;
      this.box('grounded wayfinding post',x+Math.cos(yaw)*offset,y/2,z-Math.sin(yaw)*offset,.055,y,.055,'steel',true);
    }
    return this.w.sign(text,x-Math.sin(yaw)*.058,y,z-Math.cos(yaw)*.058,width,.38,yaw,'#e0c89a','#253c39');
  }
  fence(x,z,length,axis='z'){
    const along=axis==='x';
    this.fenceSegments??=[];this.fencePosts??=new Map();this.fenceSegments.push({x,z,length,axis});
    this.box('yard fence collision',x,1.25,z,along?length:.08,2.5,along?.08:length,'dark',true).dispose();
    this.w.rects.at(-1).seeThrough=true;
    for(let i=0;i<=Math.ceil(length/2.5);i++){
      const a=-length/2+i*length/Math.ceil(length/2.5);
      const px=x+(along?a:0),pz=z+(along?0:a),key=px.toFixed(3)+':'+pz.toFixed(3);
      if(!this.fencePosts.has(key)){
        const post=this.box('fence post',px,1.35,pz,.08,2.7,.08,'steel');
        const foot=this.box('weathered fence footing',px,.07,pz,.28,.14,.28,'concrete');
        this.fencePosts.set(key,{post,foot});
      }
    }
    for(const y of [.25,1.35,2.45])this.box('fence rail',x,y,z,along?length:.035,.035,along?.035:length,'steel');
    // Low-poly open mesh: enough wire silhouette without a transparent texture.
    for(let i=.25;i<length;i+=1.1){
      const a=i-length/2;
      this.box('vertical fence wire',x+(along?a:0),1.35,z+(along?0:a),.028,2.2,.028,'steel');
    }
  }
  buildEnvelope(){
    // Meet the garage at Z=-1. The previous slabs overlapped at Y=0 across
    // the apron, producing flickering textures and dark wire-like edges.
    this.box('service yard ground',0,-.16,-51,60,.32,100,'yardAsphalt');
    this.fence(-29.7,-29,58);this.fence(29.7,-29,58);
    // Exact shared corners and a 12m entrance, matched by two 6m booms.
    this.fence(-17.85,-58,23.7,'x');this.fence(17.85,-58,23.7,'x');
    this.fence(-15,-79,42);this.fence(15,-79,42);
    this.box('street boundary',0,2,-101,30,4,.4,'dark',true);
    // A fixed container creates a broad open detour on the short driving road.
    this.box('service road shipping container',6,1.45,-72,11,2.9,8,'teal',true);
    for(let i=0;i<13;i++)this.box('container corrugation',.65+i*.89,1.45,-67.97,.07,2.78,.05,'steel');
    this.sign('ROAD WORKS — OPEN LANE →',4,2.25,-67.89,4,Math.PI);
    this.sign('01 BARRIER CONTROL',-10,2.55,-49.55,2.8,Math.PI);
    this.sign('01 BARRIER CONTROL  ↑',-5.6,2.35,-19,3.0,Math.PI);
    this.sign('02 UTILITY SELECTOR  ←',4.2,2.35,-23,3.1,Math.PI);
    this.sign('03 GATEHOUSE  ←',4,2.6,-39,2.8,Math.PI);
    this.sign('B2 / BAY 042  ↑',-3,2.55,-11,2.5,0);
    for(const [x,z] of [[-11,-49],[20,-36],[-19,-30],[26,-22],[-10,-75],[0,-93]]){
      this.box('yard lamp post',x,2,z,.12,4,.12,'steel');
      this.box('yard lamp hood',x,3.96,z,.7,.14,.48,'dark');
      this.box('yard amber diffuser',x,3.86,z,.5,.04,.3,'warm');
      this.w.lights.push({x,y:3.65,z,base:.85,color:B.Color3.FromHexString('#e4c191'),range:7,emergency:true});
    }
    this.barrierArms=[];
    for(const side of [-1,1]){
      const pivot=this.v.root('street barrier pivot '+side);pivot.position.set(side*6,1.15,-58);
      this.v.box('striped street barrier arm',pivot,-side*3,0,0,5.95,.22,.16,'yardPaper');
      for(let n=0;n<6;n++)this.v.box('barrier red marking',pivot,-side*(.5+n),0,.085,.4,.23,.015,'red');
      this.box('street barrier motor plinth',side*6,.12,-58,.65,.24,.8,'concrete');
      this.box('street barrier motor housing',side*6,.73,-58,.42,1.2,.48,'yardRust');
      this.barrierArms.push({pivot,side});
    }
    this.barrier=this.barrierArms[0].pivot;
    this.barrierRect={x:0,z:-58,y:1.1,h:2.2,w:12,d:.35,dynamic:true,enabled:true,name:'street barrier'};this.w.rects.push(this.barrierRect);
    this.box('barrier cabinet support',-10,.62,-49.6,.15,1.24,.15,'steel');
    this.box('barrier interlock cabinet',-10,1.3,-49.6,.8,.8,.34,'teal',true);
    this.box('amber BARRIER CONTROL front panel',-10,1.3,-49.418,.68,.65,.02,'yellow');
    this.box('barrier control handle',-9.76,1.25,-49.36,.04,.25,.05,'steel');
    this.box('barrier control status lamp',-10.22,1.24,-49.395,.055,.055,.012,'warm');
    this.w.sign('BARRIER CONTROL',-10,1.51,-49.39,.63,.12,Math.PI,'#e9dfba','#263735');
    this.w.sign('INSPECT PANEL',-10,1.08,-49.39,.56,.12,Math.PI,'#e9dfba','#263735');
    this.w.interactive('yard','Inspect BARRIER CONTROL',YARD.inspect.x,YARD.inspect.y,YARD.inspect.z,{radius:.44,approach:YARD.inspect.approach});
    // Cargo dolly moves along a cable; visual and collision move together.
    this.dolly=this.v.root('cargo dolly obstruction');this.dolly.position.set(0,0,-53);
    this.v.box('dolly steel bed',this.dolly,0,.28,0,9,.2,2.5,'steel');
    this.v.box('dolly strapped load',this.dolly,0,.95,0,7.6,1.15,2.1,'yardRust');
    for(const x of [-3.7,3.7])for(const z of [-1,1])this.v.cylinder('dolly wheel',this.dolly,x,.21,z,.4,.18,'rubber',8).rotation.z=Math.PI/2;
    for(const x of [-2.5,0,2.5])this.v.box('load tie down',this.dolly,x,1.55,0,.07,.04,2.2,'yellow');
    this.dollyRect={x:0,z:-53,y:.8,h:1.6,w:9,d:2.6,dynamic:true,enabled:true,name:'yard cargo dolly'};this.w.rects.push(this.dollyRect);
    // This divider gives the hunter a real opening to run around after a strike.
    this.fence(-12,-32,14);this.fence(-10,-51.5,6,'x');this.fenceImpact=this.v.root('loose fence sheet');this.fenceImpact.position.set(-10,1.9,-51.43);
    this.v.box('loose warning panel',this.fenceImpact,0,0,0,1.5,.9,.05,'yardRust');
  }
  buildGatehouse(){
    const box=(...a)=>this.box(...a);
    box('gatehouse floor',23,-.02,-44,13,.08,17,'floor');
    box('gatehouse north wall',23,1.7,-52,13,3.4,.24,'yardWall',true);
    box('gatehouse east wall',29.4,1.7,-44,.24,3.4,16,'yardWall',true);
    // Front door x=20; secondary west opening z=-44. Both have usable clearance.
    box('gatehouse south left',17.75,1.7,-36,2.5,3.4,.24,'yardWall',true);
    box('gatehouse south right',25.25,1.7,-36,8.5,3.4,.24,'yardWall',true);
    box('gatehouse door lintel',20,3.15,-36,2,.5,.24,'yardWall');
    box('gatehouse west north',16.5,1.7,-48.6,.24,3.4,6.8,'yardWall',true);
    box('gatehouse west south',16.5,1.7,-39.4,.24,3.4,6.8,'yardWall',true);
    box('gatehouse side door lintel',16.5,2.95,-44,.24,.9,2.4,'yardWall');
    box('gatehouse roof',23,3.5,-44,14,.2,18,'dark');
    this.sign('03 GATEHOUSE',20,2.82,-35.85,1.9,Math.PI);
    this.sign('SECONDARY EXIT',16.68,2.8,-44,1.6,-Math.PI/2);
    this.weakDoor=this.v.root('gatehouse damaged side door');this.weakDoor.position.set(16.5,0,-45.2);
    this.v.box('damaged door panel',this.weakDoor,0,1.25,1.2,.08,2.5,2.4,'teal');
    this.v.box('door handle',this.weakDoor,.08,1.2,2.05,.08,.22,.06,'steel');
    this.doorRect={x:16.5,z:-44,y:1.25,h:2.5,w:.2,d:2.4,dynamic:true,enabled:true,name:'gatehouse weak door'};this.w.rects.push(this.doorRect);
    this.box('gatehouse crank backing',16.74,1.2,-45.9,.24,1.1,1.2,'steel',true);
    this.crank=this.v.root('gatehouse brake release crank');this.crank.position.set(16.94,1.1,-45.9);
    const wheel=B.MeshBuilder.CreateTorus('yellow release wheel',{diameter:.64,thickness:.065,tessellation:12},this.w.scene);wheel.parent=this.crank;wheel.rotation.z=Math.PI/2;wheel.material=this.w.materials.yellow;
    this.v.box('release wheel spoke',this.crank,0,0,0,.07,.06,.6,'yellow');
    this.sign('BARRIER BRAKE',16.68,2.15,-45.9,1.5,-Math.PI/2);
    this.w.interactive('barrier','Turn BARRIER BRAKE',YARD.release.x,YARD.release.y,YARD.release.z,{radius:.45,approach:YARD.release.approach});
    this.w.interactive('yard-log','Read gatehouse handover',22.7,.92,-44.8,{radius:.25});
    this.w.lights.push({x:23,y:2.95,z:-44,base:1.1,color:B.Color3.FromHexString('#b0c9b5'),range:6,emergency:true});
    box('gatehouse ceiling fixture',23,3.15,-44,1.4,.1,.3,'cool');
    // Original architectural dressing remains even if optional GLBs fail.
    box('gatehouse rear desk',23,.79,-45.2,3.6,.12,1.4,'yardWall',true);
    for(const x of [21.6,24.4])box('desk pedestal',x,.39,-45.2,.55,.78,1.1,'teal');
    for(let i=0;i<6;i++)box('stacked parking shift sheets',22.7,.864+i*.008,-44.9,.34,.008,.43,'yardPaper').rotation.y=.03*i;
    box('old gatehouse monitor',23.8,1.13,-45.4,.6,.48,.5,'dark');
    box('monitor dull screen',23.8,1.15,-45.13,.48,.32,.015,'dashboardGlow');
    this.sign('042 / LAST DEPARTURE',23,2.05,-51.83,2.5,Math.PI);
  }
  buildUtility(){
    this.box('utility awning',25,3.4,-22,8,.16,16,'steel');
    for(const z of [-29.5,-14.5])this.box('awning upright',21.2,1.7,z,.16,3.4,.16,'yardRust',true);
    this.box('utility switch cabinet',26.1,1.25,-22,.8,2.2,1.4,'teal',true);
    this.selector=this.v.root('dry circuit selector');this.selector.position.set(25.67,1.35,-22);
    this.v.box('selector handle',this.selector,0,0,0,.1,.45,.08,'yellow');
    this.sign('1 LOADING OFF / 2 GATEHOUSE ON',25.65,1.79,-22,1.22,Math.PI/2);
    this.w.sign('UTILITY SELECTOR',25.66,2.1,-22,1.05,.2,Math.PI/2,'#e0c89a','#253c39');
    this.w.interactive('isolate','Use UTILITY SELECTOR',YARD.isolate.x,YARD.isolate.y,YARD.isolate.z,{radius:.4,approach:YARD.isolate.approach});
    this.box('utility generator concrete base',26,.15,-27,3,.3,2.4,'concrete',true);
    this.box('utility generator enclosure',26,1.2,-27,2.6,1.8,2,'yardRust',true);
    for(let i=0;i<8;i++)this.box('generator cooling slot',24.68,1.0+i*.1,-27,.03,.03,1.55,'black');
    this.box('leaking pipe',27,1.4,-18,.14,2.8,.14,'steel');
  }
  buildLoadingDock(){
    this.box('loading bay structure',-24,2,-25,11,4,21,'yardWall',true);
    this.box('loading awning',-19,3.8,-25,5,.15,21,'yardRust');
    for(const [bay,z] of [-31,-23,-17].entries()){
      this.box('closed loading shutter',-18.43,1.6,z,.12,2.8,4.5,'steel');
      for(let i=0;i<11;i++)this.box('loading shutter rib',-18.35,.38+i*.23,z,.05,.035,4.5,'dark');
      this.sign('LOADING '+String(bay+1).padStart(2,'0'),-18.3,3.18,z,2,-Math.PI/2);
    }
    this.box('yard winch pedestal',-18,.5,-34,.9,1,.8,'steel',true);
    this.winch=this.v.root('cargo winch');this.winch.position.set(-18,1.05,-34);
    this.v.cylinder('winch drum',this.winch,0,0,0,.4,.65,'yardRust',10).rotation.z=Math.PI/2;
    this.sign('04 DOCK WINCH',-16.8,2,-35.8,2.6,Math.PI);
    this.w.interactive('route','Use DOCK WINCH',YARD.route.x,YARD.route.y,YARD.route.z,{radius:.38,approach:YARD.route.approach});
    // The tow rope is inside a flush steel channel. Nothing sweeps diagonally
    // across a walking route, through a fence or through the parked service van.
    // The take-up pulley is west of the complete 0 -> -20m dolly travel.
    this.box('covered tow channel',-12.5,.025,-53,25,.05,.18,'dark');
    this.box('tow channel seam',-12.5,.052,-53,25,.004,.025,'black');
    this.box('enclosed take-up pulley',-25,.18,-53,.45,.36,.48,'yardRust');
    this.box('winch supported protective shroud',-18,.92,-34,.8,.38,.7,'yardRust');
    this.box('loading dock bolt table',-16.8,.9,-23,1.1,.12,.75,'steel',true);
    for(const x of [-17.2,-16.4])this.box('bolt table legs',x,.45,-23,.06,.9,.6,'steel');
    // Refills are explicit finite trays, not an infinite interaction exploit.
    for(const refill of REFILLS){
      this.box(refill.label,refill.x,refill.y-.0175,refill.z,.36,.025,.26,'steel');
      const bolts=this.v.root(refill.label+' contents');bolts.position.set(refill.x,refill.y+.0075,refill.z);this.refillRoots[refill.id]=bolts;
      for(let i=0;i<3;i++)this.v.box('spare steel bolt',bolts,-.09+i*.09,0,0,.025,.025,.17,'steel');
      this.w.interactive(refill.id,'Take spare bolts',refill.x,refill.y,refill.z,{radius:.25});
    }
  }
  buildDetails(){
    // Twenty grounded detail clusters. Borders collect rubbish; walking lanes
    // collect drainage and wheel marks, never random waist-high obstacles.
    for(let i=0;i<20;i++){
      const x=i%2?-28.6:28.6,z=-5-Math.floor(i/2)*5.2;
      for(let j=0;j<3;j++)this.box('yard moss clump',x+(j-1)*.16,.045,z+j*.17,.33,.08,.45,'yardMoss');
      for(let j=0;j<2;j++)this.box('wet discarded ticket',x-(i%2?-.7:.7),.015+j*.003,z+j*.24,.16,.009,.22,'yardPaper').rotation.y=i*.8+j;
    }
    for(const z of [-12,-31,-48,-61,-86]){
      for(let i=0;i<8;i++)this.box('storm drain slit',-3.4+i*.14,.012,z,.065,.015,.65,'black');
      for(const side of [-1,1])this.box('wet tyre trace',side*1.2,.011,z+3,.21,.009,4,'yardWet');
    }
    for(const [x,z,w,d] of [[8,-20,5,8],[-6,-43,7,5],[0,-55,9,3],[-9,-78,5,6]]){
      const puddle=B.MeshBuilder.CreateDisc('yard shallow rainwater',{radius:1,tessellation:20},this.w.scene);puddle.rotation.x=Math.PI/2;puddle.position.set(x,.009,z);puddle.scaling.set(w/2,d/2,1);puddle.material=this.w.materials.yardWet;puddle.isPickable=false;
      this.w.extraWater ||= [];this.w.extraWater.push({x,z,rx:w/2,rz:d/2,depth:.025});
    }
    // Parked maintenance vans sit on their wheel contact plane with aligned proxies.
    for(const [x,z,yaw] of [[10,-16,0],[-22,-43,Math.PI],[23,-9,Math.PI/2]])this.props.push({name:'van',x,z,yaw});
    this.box('torn insulation bundle',-21,.38,-39,2.4,.76,1.4,'canvas',true);
    this.box('discarded steel cabinet',9,.65,-38,2.8,1.3,1.5,'steel',true);
    for(let i=0;i<5;i++)this.box('cabinet loose paper',8.8+i*.19,.018,-36.8+i*.13,.22,.01,.31,'yardPaper').rotation.y=i*.3;
    // Irregular, textured damp patches are mounted by Landscape after loading.
  }
  async load(){
    for(const p of this.props){
      const root=this.w.placeModel(p.name,p.x,p.z,p.yaw,1.5),b=root.metadata?.placement;
      if(b)this.w.rects.push({...b,name:'yard service van',enabled:true});
      this.w.placements.record('yard-van:'+p.x,root);
    }
    // Optional original pack is imported in a bounded pair, then merged with
    // static geometry. Explicit anchors remain independent of model origins.
    await this.loadPropPack();
  }
  buildDressing(){
    const w=this.w;
    w.material('yardPavers','#414a43',1);w.material('citySilhouette','#172328',1);w.material('cityWindow','#655d3d',1,'#48432b');
    // The dry pedestrian strip is a quiet alternative to wet open crossings.
    // Its geometry is decorative; it adds no curbs or ankle-catching collisions.
    for(let i=0;i<29;i++)this.box('dry pedestrian paver',-10.6,.019,-11-i*1.25,1.35,.025,1.08,'yardPavers');
    for(const x of [-6,6])this.box('exit apron worn lane edge',x,.014,-8,.09,.013,10,'yellow');
    this.box('garage apron drain channel',0,.012,-3.5,10,.025,.38,'dark');
    for(let i=0;i<30;i++)this.box('drain grate',-4.8+i*.33,.03,-3.5,.16,.025,.38,'steel');
    // Roof edges, gutters and cables make the architecture read as maintained
    // infrastructure that has deteriorated, rather than isolated boxes.
    for(const [x,z,length] of [[-16.55,-25,21],[21,-22,16],[29.55,-44,17]]){
      this.box('supported gutter',x,3.48,z,.13,.15,length,'yardRust');
      this.box('gutter downpipe',x,1.7,z-length/2+.25,.1,3.4,.1,'yardRust');
      this.box('damp runoff patch',x,.017,z-length/2+.15,.5,.018,1.3,'yardWet');
    }
    // Small stories at the desk: these are scenery, clearly different from
    // the labelled bolt tray and readable handover document.
    this.box('gatehouse radio body',24.1,1.03,-45.1,.45,.32,.22,'teal');
    for(let i=0;i<5;i++)this.box('radio speaker slat',23.98+i*.045,1.02,-44.981,.018,.15,.009,'dark');
    this.box('radio aerial',24.22,1.48,-45.14,.015,.65,.015,'steel');
    this.box('shift mug',23.2,.95,-44.8,.13,.16,.13,'paper');
    this.box('mug dark opening',23.2,1.034,-44.8,.09,.008,.09,'dark');
    for(let i=0;i<7;i++)this.box('abandoned shift file',21.55+i*.045,.91,-45.25,.032,.12,.23,i%2?'canvas':'yardPaper');
    for(let i=0;i<18;i++){
      const x=i%2?28.9:-28.9,z=-6-Math.floor(i/2)*5.5;
      this.box('edge concrete fragment',x,.045,z,.18+(i%3)*.1,.09,.25,'concrete').rotation.y=i*.7;
    }
    // Buildings sit beyond physical boundary fences. Their simple silhouettes
    // stay on Low; windows are emissive geometry, not additional real lights.
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const x=side*(49+(i%2)*5),z=-7-i*20,h=9+(i*7%13),width=12+(i%2)*4;
      const building=this.box('distant industrial building',x,h/2-.1,z,width,h,15,'citySilhouette');building.metadata={lvCaster:false,backdrop:true};
      const roof=this.box('distant rooftop plant',x,h+.8,z,4,1.8,5,'citySilhouette');roof.metadata={lvCaster:false,backdrop:true};
      for(let row=0;row<2;row++)for(let col=0;col<4;col++)if((i+col+row)%3===0){
        const pane=this.box('distant occupied window',x-side*(width/2+.015),4+row*3,z-5+col*2.5,.03,.75,1.2,'cityWindow');pane.metadata={lvCaster:false,backdrop:true};
      }
    }
    this.motionRoots=[];
    for(const [x,z] of [[-16.6,-17.7],[21.2,-28.5]]){
      const root=this.v.root('nearby hanging chain');root.position.set(x,3.38,z);
      for(let i=0;i<7;i++){const link=B.MeshBuilder.CreateTorus('chain link',{diameter:.1,thickness:.022,tessellation:6},w.scene);link.parent=root;link.position.y=-.08-i*.09;link.rotation.x=Math.PI/2;link.rotation.y=i%2?Math.PI/2:0;link.material=w.materials.steel;link.isPickable=false;}
      this.motionRoots.push(root);
    }
    this.looseTarp=this.v.root('loose sheet on discarded cabinet');this.looseTarp.position.set(9,1.32,-38);
    this.v.box('supported canvas corner',this.looseTarp,0,0,0,2,.035,1.2,'canvas');this.motionRoots.push(this.looseTarp);
  }
  async loadPropPack(){
    const names=['dock-cluster','dumpster-refuse','cable-reel','drain-weeds','road-barrier','gatehouse-desk','coat-noticeboard','utility-transformer','fence-panel','drum-store'];
    const newer=['loading-trolley','bollard-chain','freight-tarp','wall-services','gatehouse-chair','calendar-coat'];names.push(...newer);
    const cache={};
    await loadInBatches(names,async id=>{
      const file=(newer.includes(id)?'v116':'v115')+'-yard-'+id;
      try{cache[id]=await B.SceneLoader.LoadAssetContainerAsync('assets/models/',file+'.glb',this.w.scene);}
      catch{this.w.failedAssets??=[];this.w.failedAssets.push(file);}
    },2);
    const palette=new Map();
    for(const c of Object.values(cache))for(const m of c.meshes){
      const source=m.material;if(!source)continue;
      const share=mat=>{if(!mat)return mat;if(palette.has(mat.name))return palette.get(mat.name);mat.maxSimultaneousLights=7;palette.set(mat.name,mat);return mat;};
      if(source.subMaterials)source.subMaterials=source.subMaterials.map(share);else m.material=share(source);
    }
    // Preserve navigation silhouettes on Low. Only tiny paper/weeds are reduced.
    const layout=[
      ['dock-cluster',-16.8,-18,0],['dock-cluster',-16.8,-28,.15],['dock-cluster',-24,-38,.1],
      ['dumpster-refuse',-26,-9,Math.PI/2],['dumpster-refuse',27,-55,Math.PI],
      ['cable-reel',-16.5,-26,.2],['cable-reel',24,-18,0],['cable-reel',-20,-48,0],
      ['drum-store',-16.5,-20,0],['drum-store',-28,-40.5,0],['drum-store',27,-12,0],
      ['utility-transformer',26,-30,0],['gatehouse-desk',26.5,-38.4,Math.PI],
      ['coat-noticeboard',23,-51.86,0,1.05],['coat-noticeboard',29.23,-40.2,-Math.PI/2,1.05],
      ['road-barrier',12,-64,0],['road-barrier',-13,-68,Math.PI/2],['road-barrier',12,-86,0],
      ['drain-weeds',-27,-13,0],['drain-weeds',27,-48,0],['drain-weeds',-3,-60,0],['drain-weeds',-11,-81,0],
      ['fence-panel',-25,-56,0],['fence-panel',25,-56,0],
      // Garage corners get supporting clutter too, away from interaction approaches.
      ['dock-cluster',-28,95,0],['drum-store',28,60,0],['cable-reel',-28,59,0],
      ['drain-weeds',29,81,0],['drain-weeds',-29,92,0],['dumpster-refuse',27,76,Math.PI/2],
      ['loading-trolley',-14.5,-12,0],['loading-trolley',-17,-31,Math.PI/2],['loading-trolley',24,-16,Math.PI],
      ['bollard-chain',-8,-7,0],['bollard-chain',9,-7,0],['bollard-chain',22,-55,0],['bollard-chain',11,-62,0],
      ['freight-tarp',-7.8,-23,0],['freight-tarp',8,-32,0],['freight-tarp',-7.8,-39,0],['freight-tarp',12.5,-47,0],['freight-tarp',-25,-48,Math.PI/2],
      ['wall-services',-18.26,-25,Math.PI/2,.12],['wall-services',29.24,-48,-Math.PI/2,.12],
      ['gatehouse-chair',24.5,-43.7,Math.PI],['gatehouse-chair',27.2,-40.5,-.35],
      ['calendar-coat',25.5,-51.86,0,1.05],
      ['dock-cluster',-27,-53,.1],['cable-reel',-14.8,-43,.1],['drum-store',27,-5,0],
      ['drain-weeds',-18.6,-8,0],['drain-weeds',14,-43,0],['drain-weeds',-27.5,-33,0],
      ['road-barrier',13,-94,0],['road-barrier',-13,-92,0],
    ];
    let serial=0;
    for(const [id,x,z,yaw,y=0] of layout){
      const c=cache[id];if(!c)continue;
      const root=new B.TransformNode('yard prop '+id+' '+serial,this.w.scene);
      const inst=c.instantiateModelsToScene(n=>'yard '+n,false,{doNotInstantiate:true});
      for(const n of inst.rootNodes)n.parent=root;
      root.position.set(x,y,z);root.rotation.y=yaw;
      const wall=['coat-noticeboard','wall-services','calendar-coat'].includes(id),decoration=id==='drain-weeds';
      for(const m of root.getChildMeshes()){m.isPickable=false;m.receiveShadows=true;m.metadata={lvCaster:!decoration&&!wall,detailQuality:0};}
      groundModel(root,x,z,y);const b=root.metadata?.placement;
      if(wall&&b){
        // Floor centering must not embed a wall prop halfway into its wall.
        // Mount the imported rear anchor to the actual supporting wall face.
        const anchor=root.getDescendants().find(n=>n.name.endsWith('__rear_mount'));
        if(anchor){anchor.computeWorldMatrix(true);const at=anchor.getAbsolutePosition();const dx=x-at.x,dz=z-at.z;root.position.x+=dx;root.position.z+=dz;b.x+=dx;b.z+=dz;root.computeWorldMatrix(true);}
      }
      if(b&&!wall&&!decoration)this.w.rects.push({...b,name:'yard prop '+id,seeThrough:['fence-panel','bollard-chain','gatehouse-chair'].includes(id),surface:['bollard-chain','loading-trolley'].includes(id)?'metal':undefined,enabled:true});
      this.w.placements.record('yard-prop:'+serial++,root,{support:wall?'gatehouse wall':'floor',supportY:y});
    }
    this.assetPlacements=serial;
  }
  buildEffects(){
    for(let i=0;i<48;i++){
      const m=this.box('pooled exterior rain',0,0,0,.012,.35,.012,'cool');m.isVisible=false;this.v.dynamicRoots.add(m);this.rain.push(m);
    }
    for(let i=0;i<12;i++){
      const m=B.MeshBuilder.CreateSphere('pooled pipe steam',{diameter:1,segments:3},this.w.scene);m.material=this.w.materials.yardMist;m.isPickable=false;m.setEnabled(false);this.v.dynamicRoots.add(m);this.steam.push(m);
    }
  }
  prepare(on){
    for(const m of this.rain){m.isVisible=on;if(on)m.position.set(0,2,-18);}
    for(const m of this.steam){m.setEnabled(on);if(on)m.position.set(27,1.7,-18);}
  }
  setSettings(s){this.settings=s;}
  setBarrier(open){
    // Paired booms rise towards their own motor housings. Max height < 7.3m.
    for(const {pivot,side} of this.barrierArms)pivot.rotation.z=-side*open*Math.PI/2;
  }
  sync(state,immediate=true){
    this.state=state;
    for(const [id,root] of Object.entries(this.refillRoots))root.setEnabled(!state.refills?.includes(id));
    const clear=state.flags.includes('route'),released=state.flags.includes('barrier');
    if(immediate){this.setBarrier(released?1:0);this.dolly.position.x=clear?-20:0;this.weakDoor.rotation.y=released?1.55:0;this.fenceImpact.rotation.z=0;this.beat=null;}
    this.barrierRect.enabled=!released;this.dollyRect.x=this.dolly.position.x;if(immediate){this.doorRect.enabled=!released;this.hunterBreach=null;}
    this.selector.rotation.x=state.flags.includes('isolate')?Math.PI/2:0;
  }
  action(id,t){
    if(id==='barrier'){this.crank.rotation.x=t*Math.PI*8;this.setBarrier(smooth((t-.35)/.65));}
    if(id==='route'){this.winch.rotation.x=t*Math.PI*12;this.dolly.position.x=-20*smooth(t);this.dollyRect.x=this.dolly.position.x;}
  }
  impact(id){this.beat={id,time:0};}
  hunterDoor(dt,threat){
    // A real door interaction, based only on evidence the AI has earned.
    // The ordinary south doorway remains an alternate route on every difficulty.
    if(!this.doorRect.enabled||threat.rules.id==='easy'){threat.cancelDoorApproach();return null;}
    if(this.hunterBreach){
      this.hunterBreach.time+=dt;
      if(this.hunterBreach.time>=.65&&!this.hunterBreach.hit){this.hunterBreach.hit=true;this.impact('gatehouseBreach');return 'contact';}
      if(this.hunterBreach.time>=2){this.doorRect.enabled=false;threat.releaseStage(this.hunterBreach.evidence,1.4);this.hunterBreach=null;}
      return null;
    }
    const e=threat.lastKnown;if(!e||roomAt(e)!=='gatehouse'||!['search','investigate','chase'].includes(threat.mode)||threat.seesPlayer)return null;
    const approach={x:15.5,z:-44},distance=Math.hypot(threat.pos.x-approach.x,threat.pos.z-approach.z);
    if(threat.pos.x>16.5||distance>7)return null;
    if(!threat.approachDoor(approach,e))return null;
    if(distance<.4){this.hunterBreach={time:0,hit:false,evidence:{...e}};threat.stageRoute([{...threat.pos}],'DoorPush');threat.yaw=Math.PI/2;}
    return null;
  }
  tick(dt,time,player,settings){
    const outside=player.pos.z<0&&roomAt(player.pos)!=='gatehouse',budget=weatherBudget(settings),count=budget.rain;
    this.effectCounts??={rain:0,steam:0};this.effectCounts.rain=0;this.effectCounts.steam=0;
    for(let i=0;i<this.rain.length;i++){
      const x=((i*7.13)%18)-9,z=((i*3.91)%18)-9,y=4.8-((time*8+i*.29)%4.7);
      const m=this.rain[i];m.position.set(player.pos.x+x,y,player.pos.z+z);
      const visible=outside&&i<count&&exposedToRain(m.position);m.isVisible=visible;if(!visible)continue;
      this.effectCounts.rain++;m.rotation.z=.11;
    }
    for(let i=0;i<this.steam.length;i++){
      const m=this.steam[i],enabled=outside&&Math.hypot(player.pos.x-27,player.pos.z+18)<22&&i<budget.steam;m.setEnabled(enabled);if(!enabled)continue;
      this.effectCounts.steam++;
      const phase=(time*.35+i/12)%1;m.position.set(27-phase*.8,1.3+phase*1.7,-18+Math.sin(i)*.2);m.scaling.setAll(.18+phase*.55);m.visibility=(1-phase)*.38;
    }
    for(let i=0;i<(this.motionRoots?.length||0);i++){
      const root=this.motionRoots[i],near=Math.hypot(player.pos.x-root.position.x,player.pos.z-root.position.z)<28;
      root.rotation.z=near&&settings.sceneryMotion!==false&&!settings.reducedMotion?Math.sin(time*.7+i)*.025:0;
    }
    if(this.beat){
      this.beat.time+=dt;const t=this.beat.time;
      if(this.beat.id==='yardFence')this.fenceImpact.rotation.z=Math.sin(t*39)*.18*Math.exp(-t*3.5);
      if(this.beat.id==='gatehouseBreach'){this.weakDoor.rotation.y=smooth(t/.22)*.55+Math.sin(t*30)*.045*Math.exp(-t*3);if(t>1)this.weakDoor.rotation.y=.55+smooth((t-1)/.7);}
      if(t>1.8){if(this.beat.id==='gatehouseBreach'){this.doorRect.enabled=false;this.weakDoor.rotation.y=1.55;}this.beat=null;}
    }
  }
}
