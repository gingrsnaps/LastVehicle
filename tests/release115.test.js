import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newGame,FLAG_IDS,validateSave,validateSettings,SaveStore,safeCheckpoint } from '../dist/js/state.js';
import { Threat } from '../dist/js/threat.js';
import { VehicleController,carBlocked } from '../dist/js/vehicle.js';
import { blocked,findPath,sightClear,lineClear } from '../dist/js/navigation.js';
import { TASKS } from '../dist/js/tasks.js';
import { availability,roomAt } from '../dist/js/guidance.js';
import { selectInteraction } from '../dist/js/interaction.js';
import { renderMap } from '../dist/js/map.js';
import { REFILLS,YARD } from '../dist/js/campaign.js';

test('v2 saves preserve completed endings, resume unfinished yard progression and retain a backup',()=>{
 const old=['car','battery','key','fuse','repair','power','terminal','gate','escaped'];
 for(let i=0;i<=old.length;i++){
  const raw={...newGame(),version:2,flags:old.slice(0,i)};
  assert.deepEqual(validateSave(raw).flags,i===old.length?FLAG_IDS:old.slice(0,i));
 }
 const text=JSON.stringify({...newGame(),version:2,flags:old.slice(0,8)}),data=new Map([['lastvehicle.save',text]]);
 const store=new SaveStore({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 store.writeGame(store.readGame());assert.equal(data.get('lastvehicle.save.v2.backup'),text);
 assert.equal(validateSave({...newGame(),version:2,flags:['escaped']}).flags.length,0,'malformed completion cannot become a win');
});
test('Attack grace allows real hearing; unheard and fresh-chase bolts never consume habituation',()=>{
 const t=new Threat([]);t.mode='patrol';t.grace=10;t.pos={x:0,z:0};
 assert.equal(t.hearBolt({x:0,z:5}),true);assert.equal(t.mode,'investigate');assert.equal(t.boltHabits[0].uses,1);assert.equal(t.grace,10);
 t.clock+=3;assert.equal(t.hearBolt({x:25,z:100}),false);assert.equal(t.boltHabits.length,1);
 t.mode='chase';t.memory=6;t.clock+=3;assert.equal(t.hearBolt({x:0,z:4}),false);assert.equal(t.boltHabits[0].uses,1);
});
test('Stable horizon defaults on; finite spare trays persist without refill duplication',()=>{
 assert.equal(validateSettings().stableHorizon,true);assert.equal(validateSettings({stableHorizon:false}).stableHorizon,false);
 const s=validateSave({...newGame(),bolts:1,refills:['refill-yard','refill-yard','infinite']});
 assert.deepEqual(s.refills,['refill-yard']);assert.equal(availability('refill-yard',s).available,false);
 assert.equal(availability('refill-workshop',s).available,true);s.bolts=3;assert.equal(availability('refill-workshop',s).available,false);
});
test('Vehicle inputs are frame-rate stable, brake to reverse and never tunnel through walls',()=>{
 const ends=[];
 for(const fps of [30,60,144]){
  const car=new VehicleController([]);car.reset({x:0,z:0,yaw:0});
  for(let n=0;n<fps*4;n++)car.tick(1/fps,{throttle:1});ends.push(car.z);
  for(let n=0;n<fps*3;n++)car.tick(1/fps,{throttle:-1});assert.ok(car.speed<0);
  assert.equal(car.exitPoint(),null);for(let n=0;n<fps*2;n++)car.tick(1/fps,{});assert.ok(car.exitPoint().x<car.x);
 }
 assert.ok(Math.max(...ends)-Math.min(...ends)<.15);
 const wall={x:0,z:10,w:10,d:.2,y:1,h:2},car=new VehicleController([wall]);car.reset({x:0,z:0,yaw:0});
 for(let i=0;i<150;i++)car.tick(.075,{throttle:1});assert.ok(car.z<7.7);assert.equal(carBlocked(car,[wall]),false);
});
test('Wire fences block traversal while transmitting sight and the exterior journal has matching destinations',()=>{
 const r=[{x:0,z:0,w:10,d:.1,y:1,h:2,seeThrough:true}],a={x:0,y:1,z:-2},b={x:0,y:1,z:2};
 assert.equal(lineClear(a,b,r),false);assert.equal(sightClear(a,b,r),true);
 const svg=renderMap({x:0,z:-20},TASKS.find(t=>t.id==='isolate').destination,[],[]);
 assert.match(svg,/SELECTOR/);assert.match(svg,/GATEHOUSE/);assert.match(svg,/Garage floor plan/);
});

// Real geometry and pure simulation, explicitly not a hardware-rendered playtest.
globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}};
await import('../dist/vendor/babylon.js');await import('../dist/vendor/babylonjs.loaders.min.js');
const {World}=await import('../dist/js/world.js');
const {Game}=await import('../dist/js/game.js');
const B=globalThis.BABYLON,engine=new B.NullEngine(),world=new World(engine),loader=B.SceneLoader.LoadAssetContainerAsync;
B.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>B.LoadAssetContainerAsync(new Uint8Array(fs.readFileSync(new URL('../dist/'+base+file,import.meta.url))),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}});
try{await world.loadAssets();}finally{B.SceneLoader.LoadAssetContainerAsync=loader;}
const complete={...newGame(),flags:FLAG_IDS.slice(0,-1)};

test('New chapters have reachable controls, grounded actual assets, clear checkpoints and supported signs',()=>{
 assert.equal(world.failedAssets?.length||0,0);assert.equal(world.yard.assetPlacements,55);
 assert.deepEqual(world.placements.report().unresolved,[]);
 const approaches={yard:{x:-10,z:-47.5},isolate:{x:23.8,z:-22},barrier:{x:18.5,z:-45.7},route:{x:-16.5,z:-33.7}};
 let from={x:-6,z:8};
 for(const id of ['yard','isolate','barrier','route']){
  const s={...newGame(),flags:FLAG_IDS.slice(0,FLAG_IDS.indexOf(id))};world.sync(s);
  const p=approaches[id],item=world.interactives.find(i=>i.id===id),eye=new B.Vector3(p.x,1.68,p.z),forward=item.pos.subtract(eye).normalize();
  assert.equal(blocked(p.x,p.z,world.rects,.3),false,id+' approach');
  assert.ok(findPath(from,p,world.rects).length,id+' route');
  const hint=selectInteraction(world.interactives,eye,forward,world.rects,x=>availability(x,s));
  assert.equal(hint?.item.id,id);assert.equal(hint.usable,true,id+' usable');from=p;
 }
 for(let n=0;n<FLAG_IDS.length;n++){const s={...newGame(),flags:FLAG_IDS.slice(0,n)};world.sync(s);assert.equal(blocked(safeCheckpoint(s).x,safeCheckpoint(s).z,world.rects,.3),false,'checkpoint '+n);}
 for(const record of world.placements.report().records.filter(p=>String(p.id).startsWith('yard-prop:')))assert.ok(Math.abs(record.bottom-record.supportY)<1e-5);
 for(const refill of REFILLS){const p={x:refill.x,z:refill.z+.9};assert.equal(blocked(p.x,p.z,world.rects,.29),false,refill.id);}
});

test('Manual driving completes a continuous route with actual car/yard colliders and no automatic travel',()=>{
 world.sync(complete);world.stage.carRect.enabled=false;
 const car=world.stage.vehicle;car.reset();
 for(let i=0;i<300;i++)car.tick(1/60,{});assert.equal(car.x,13);assert.equal(car.z,78);
 const waypoints=[{x:6,z:78},{x:1,z:73},{x:0,z:64},{x:0,z:10},{x:0,z:-39},{x:0,z:-55},{x:-5,z:-64},{x:-9,z:-73},{x:-9,z:-83},{x:0,z:-96}];
 let index=0,collisions=0;
 for(let i=0;i<60*150;i++){
  const target=waypoints[index];if(Math.hypot(car.x-target.x,car.z-target.z)<3.3&&index<waypoints.length-1)index++;
  const p=waypoints[index],angle=Math.atan2(Math.sin(Math.atan2(p.x-car.x,p.z-car.z)-car.yaw),Math.cos(Math.atan2(p.x-car.x,p.z-car.z)-car.yaw));
  car.tick(1/60,{throttle:1,steer:Math.max(-1,Math.min(1,angle*1.6))});
  if(car.blocked)collisions++;if(car.z<-94)break;
 }
 assert.ok(car.z<-94,JSON.stringify({x:car.x,z:car.z,yaw:car.yaw,index,collisions}));
 assert.equal(collisions,0);assert.ok(car.distance>170);
});

test('New weather, impacts and body-aware door opening reuse prepared meshes',()=>{
 world.sync(complete);const before=world.scene.meshes.length;
 for(let i=0;i<300;i++){world.yard.tick(1/60,i/60,{pos:{x:23,z:-18}},{quality:'high'});if(i===10)world.yard.impact('yardFence');}
 assert.equal(world.scene.meshes.length,before);assert.equal(world.yard.rain.length,48);assert.equal(world.yard.steam.length,12);
 world.yard.doorRect.enabled=true;
 const t=new Threat(world.rects,'hard');t.mode='investigate';t.pos={x:15.5,z:-44};t.lastKnown={x:23,z:-44};
 let hits=0;for(let i=0;i<150;i++)if(world.yard.hunterDoor(1/60,t)==='contact')hits++;
 assert.equal(hits,1);assert.equal(world.yard.doorRect.enabled,false);assert.equal(t.mode,'investigate');
});

test('Security and new control-linked scare surfaces sit in the natural interaction view',()=>{
 world.sync(complete);world.setSettings(validateSettings());world.yard.doorRect.enabled=true;
 for(const [id,p,target] of [['key',{x:-23.4,z:19.3},{...world.atmosphere.securityPosition,z:16.58}],['yard',{x:-10,z:-47.5},YARD.fence],['barrier',{x:18.5,z:-45.7},{x:16.62,y:1.4,z:-44.7}]]){
  const item=world.interactives.find(i=>i.id===id),dx=item.pos.x-p.x,dz=item.pos.z-p.z;
  const player={pos:p,height:1.68,yaw:Math.atan2(dx,dz),pitch:Math.atan2(1.68-item.pos.y,Math.hypot(dx,dz))};
  const g={player,world,engine:{getRenderWidth:()=>1280,getRenderHeight:()=>720}};
  assert.equal(Game.prototype.visualReadable.call(g,target,.3,24),true,id+' readable without a forced camera turn');
 }
});
