import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { indexSpatial, spatialReport, firstNearby } from '../dist/js/spatial.js?v=1.19.0';
import { blocked, lineClear, sightClear, moveCircle } from '../dist/js/navigation.js?v=1.19.0';
import { GuideRoute } from '../dist/js/wayfinding.js?v=1.19.0';
import { currentTask } from '../dist/js/tasks.js?v=1.19.0';
import { newGame, FLAG_IDS, validateSettings } from '../dist/js/state.js?v=1.19.0';
import { availability } from '../dist/js/guidance.js?v=1.19.0';
import { selectInteraction } from '../dist/js/interaction.js?v=1.19.0';
import { AreaTimings } from '../dist/js/performance.js?v=1.19.0';
import { Threat } from '../dist/js/threat.js?v=1.19.0';
import { YARD } from '../dist/js/campaign.js?v=1.19.0';

test('Spatial queries match linear exact tests, including moving gates and visibility heights',()=>{
 const rects=Array.from({length:180},(_,i)=>({x:(i%12)*5-28,z:Math.floor(i/12)*6-60,w:1+(i%3),d:.4+(i%4),y:1,h:2,enabled:i%17!==0,seeThrough:i%7===0,name:'fixed '+i}));
 const moving={x:2,z:2,w:3,d:.2,y:1,h:2,dynamic:true,enabled:true};rects.push(moving);const linear=rects.slice();indexSpatial(rects);
 for(let i=0;i<500;i++){
  const a={x:Math.sin(i*1.23)*29,z:Math.cos(i*.73)*58,y:.8+(i%3)*.6},b={x:a.x+Math.sin(i)*7,z:a.z+Math.cos(i)*8,y:1.6};
  assert.equal(blocked(a.x,a.z,rects,.3),blocked(a.x,a.z,linear,.3));
  assert.equal(lineClear(a,b,rects,.2),lineClear(a,b,linear,.2));
  assert.equal(sightClear(a,b,rects),sightClear(a,b,linear));
 }
 moving.x=18;moving.z=-33;moving.enabled=false;
 assert.equal(lineClear({x:18,z:-38},{x:18,z:-30},rects),lineClear({x:18,z:-38},{x:18,z:-30},linear));
 const report=spatialReport(rects);assert.ok(report.candidates<report.linearEquivalent*.2,JSON.stringify(report));
 // Bucket traversal differs from authoring order; swept bolt contact must not.
 const overlapping=[{x:1,z:1,w:2,d:2,dynamic:true},{x:1,z:1,w:2,d:2}];indexSpatial(overlapping);
 assert.strictEqual(firstNearby(overlapping,0,0,2,2,()=>true),overlapping[0]);
 overlapping[0].enabled=false;
 assert.strictEqual(firstNearby(overlapping,0,0,2,2,b=>b.enabled!==false),overlapping[1]);
});
test('Weather, sky and scenery preferences survive validation; area timings separate CPU/GPU evidence',()=>{
 const s=validateSettings({weatherEffects:'off',skyBrightness:9,sceneryMotion:false});
 assert.equal(s.weatherEffects,'off');assert.equal(s.skyBrightness,1.2);assert.equal(s.sceneryMotion,false);
 assert.equal(validateSettings({weatherEffects:'bad'}).weatherEffects,'reduced');
 const stats=new AreaTimings();for(let i=0;i<100;i++)stats.sample('yard',i===99?130:16,6,null);
 stats.sample('gatehouse',20,8,12);const r=stats.report();assert.equal(r.yard.p95BucketMs,16);assert.equal(r.yard.over100,1);assert.equal(r.yard.gpuMs,null);assert.equal(r.gatehouse.gpuMs,12);
 stats.reset();assert.deepEqual(stats.report(),{});
});

globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}};
await import('../dist/vendor/babylon.js');await import('../dist/vendor/babylonjs.loaders.min.js');
const {World}=await import('../dist/js/world.js?v=1.19.0');
const {exposedToRain,weatherBudget}=await import('../dist/js/yard.js?v=1.19.0');
const B=globalThis.BABYLON,engine=new B.NullEngine(),world=new World(engine),loader=B.SceneLoader.LoadAssetContainerAsync;
B.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>B.LoadAssetContainerAsync(new Uint8Array(fs.readFileSync(new URL('../dist/'+base+file,import.meta.url))),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}});
try{await world.loadAssets();}finally{B.SceneLoader.LoadAssetContainerAsync=loader;}
const report={scope:'Actual geometry and NullEngine simulation. Materials skipped; not a rendered GPU or human playtest.',version:'1.19.0'};

test('Every exterior objective can be found by following guidance from multiple actual approaches',()=>{
 const starts={yard:[{x:0,z:8},{x:22,z:-40},{x:0,z:-42}],isolate:[{x:-10,z:-47.5},{x:24,z:-33}],barrier:[{x:0,z:-30},{x:27,z:-48}],route:[{x:20,z:-35},{x:0,z:-50}]};
 report.guidance=[];
 for(const [id,entries] of Object.entries(starts))for(const start of entries){
  const state={...newGame(),flags:FLAG_IDS.slice(0,FLAG_IDS.indexOf(id))};world.sync(state,true);
  const guide=new GuideRoute(world.rects),p={...start},task=currentTask(state);guide.request(task,world.interactives,p);let reached=false,frames=0;
  assert.equal(blocked(p.x,p.z,world.rects,.3),false,'test starts on a usable floor '+id);
  for(;frames<3600;frames++){
   const g=guide.tick(p,1/30);if(!g)continue;
   if(g.kind==='object'){
    const item=world.interactives.find(i=>i.id===id),eye=new B.Vector3(p.x,1.68,p.z),forward=new B.Vector3(g.point.x,g.point.y,g.point.z).subtract(eye).normalize();
    const hint=selectInteraction(world.interactives,eye,forward,world.rects,x=>availability(x,state));
    assert.equal(hint?.item.id,id);assert.equal(hint.usable,true,'guidance ends at a usable view');reached=true;break;
   }
   assert.equal(lineClear(p,g.point,world.rects,.3),true,'arrow must not lead through a blocker');
   const dx=g.point.x-p.x,dz=g.point.z-p.z,length=Math.hypot(dx,dz),step=Math.min(length,2.95/30);
   if(length)moveCircle(p,dx/length*step,dz/length*step,world.rects,.3);
  }
  assert.ok(reached,JSON.stringify({id,start,p,goal:guide.goal,path:guide.route?.path?.length,progress:guide.progress,nearby:guide.route?.path?.slice(guide.progress,guide.progress+4),marker:guide.result,blocking:world.rects.filter(r=>r.enabled!==false&&Math.abs(r.x-p.x)<r.w/2+.6&&Math.abs(r.z-p.z)<r.d/2+.6)}));report.guidance.push({id,start,arrival:p,frames});
 }
});
test('Shared outdoor anchors, labels, supported imported props and the marked dry route remain consistent',()=>{
 assert.equal(world.failedAssets?.length||0,0);assert.equal(world.yard.assetPlacements,55);assert.deepEqual(world.placements.report().unresolved,[]);
 const records=world.placements.report().records.filter(p=>String(p.id).startsWith('yard-prop:'));
 for(const p of records)assert.ok(Math.abs(p.bottom-p.supportY)<.00001,p.label);
 for(const c of [YARD.inspect,YARD.isolate,YARD.release,YARD.route]){
  const s={...newGame(),flags:FLAG_IDS.slice(0,FLAG_IDS.indexOf(c.id))},task=currentTask(s),item=world.interactives.find(i=>i.id===c.id);
  assert.equal(task.destination.x,item.pos.x);assert.equal(task.destination.z,item.pos.z);assert.strictEqual(task.destination.approach,c.approach);
 }
 world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);
 assert.equal(lineClear({x:-10.6,z:-11},{x:-10.6,z:-46},world.rects,.3),true,'dry pedestrian strip');
 const hunter=new Threat(world.rects,'hard');assert.ok(hunter.coverPoints().some(p=>p.z<-20),'outdoor cover cannot be dropped by the old garage-first cache cap');
 report.placements=world.placements.report();
});
test('Sky remains an independent three-mesh unlit background; weather honors shelter and user settings',()=>{
 assert.equal(world.sky.meshes.length,3);const lights=world.scene.lights.length,hemi=world.hemi.intensity,count=world.scene.meshes.length;
 for(const m of world.sky.meshes){assert.equal(m.isPickable,false);assert.equal(m.infiniteDistance,true);assert.equal(m.applyFog,false);assert.equal(m.receiveShadows,false);}
 world.sky.setSettings({...validateSettings(),skyBrightness:.4});world.sky.tick(3,{z:-20});assert.equal(world.sky.visible,true);assert.equal(world.hemi.intensity,hemi);assert.equal(world.scene.lights.length,lights);
 world.sky.tick(4,{z:70});assert.equal(world.sky.visible,false);
 assert.equal(exposedToRain({x:25,z:-22}),false);assert.equal(exposedToRain({x:23,z:-44}),false);assert.equal(exposedToRain({x:0,z:-20}),true);
 assert.deepEqual(weatherBudget({weatherEffects:'off'}),{rain:0,steam:0});
 for(let i=0;i<120;i++)world.yard.tick(1/60,i/60,{pos:{x:26,z:-18}},{weatherEffects:'off',sceneryMotion:false});
 assert.deepEqual(world.yard.effectCounts,{rain:0,steam:0});assert.equal(world.scene.meshes.length,count);
});
test('Outdoor floor props do not intersect other authored bodies or hide a locker entrance',()=>{
 const collisions=[];
 for(const p of world.placements.report().records.filter(p=>String(p.id).startsWith('yard-prop:')&&p.z<0&&!/coat|calendar|wall-services|drain-weeds/.test(p.label))){
  for(const r of world.rects){
   if(r.enabled===false||Math.abs(p.x-r.x)<.001&&Math.abs(p.z-r.z)<.001)continue;
   if((p.w+r.w)/2-Math.abs(p.x-r.x)>.025&&(p.d+r.d)/2-Math.abs(p.z-r.z)>.025)collisions.push({prop:p.label,body:r.name});
  }
 }
 assert.deepEqual(collisions,[]);report.floorPropOverlaps=collisions;
});
test('Sector culling excludes deep garage geometry outdoors while preserving the entrance and skyline',()=>{
 world.optimizeStatic();world.setSettings(validateSettings());world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);
 report.visibility=[];
 for(const [name,p] of [['garage',{x:0,z:60}],['yard',{x:0,z:-30}],['gatehouse',{x:23,z:-44}],['road',{x:-9,z:-80}]]){
  world.updateRoomVisibility(p,1);const enabled=world.roomBatches.filter(b=>b.enabled);
  if(p.z<0){assert.ok(enabled.some(b=>b.backdrop));assert.ok(world.roomBatches.some(b=>b.zone==='garage'&&b.bounds.minZ>32&&!b.enabled));assert.ok(enabled.some(b=>b.zone==='garage'&&b.bounds.minZ<=3));}
  else assert.equal(enabled.some(b=>['yard','gatehouse','road'].includes(b.zone)),false);
  report.visibility.push({area:name,total:world.roomBatches.length,enabled:enabled.length,enabledTriangles:enabled.reduce((n,b)=>n+(b.mesh.getTotalIndices?.()||0)/3,0)});
 }
 report.spatial=world.renderBudgetReport().spatial;
 world.updateRoomVisibility({x:0,z:-30},1);world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},false);
 assert.equal(world.visibleRoom,'yard','progress must keep the player\'s current sector');
 assert.ok(world.roomBatches.some(b=>b.backdrop&&b.enabled));
 if(process.env.LV116_REPORT)fs.writeFileSync(process.env.LV116_REPORT,JSON.stringify(report,null,2)+'\n');
});
