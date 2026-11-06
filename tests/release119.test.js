import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Threat} from '../dist/js/threat.js?v=1.19.0';
import {PATROL_STOPS,PatrolPlanner} from '../dist/js/patrol.js?v=1.19.0';
import {renderMap} from '../dist/js/map.js?v=1.19.0';
import {RouteFollower} from '../dist/js/locomotion.js?v=1.19.0';
import {blocked,lineClear,reachableGoal,prepareNavigation} from '../dist/js/navigation.js?v=1.19.0';
import {newGame,FLAG_IDS,validateSettings} from '../dist/js/state.js?v=1.19.0';
import {ambientPower,fixturePower} from '../dist/js/lighting.js?v=1.19.0';

globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}};
await import('../dist/vendor/babylon.js');await import('../dist/vendor/babylonjs.loaders.min.js');
const {World}=await import('../dist/js/world.js?v=1.19.0');
const B=globalThis.BABYLON,engine=new B.NullEngine(),world=new World(engine),loader=B.SceneLoader.LoadAssetContainerAsync;
B.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>B.LoadAssetContainerAsync(new Uint8Array(fs.readFileSync(new URL('../dist/'+base+file,import.meta.url))),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}});
try{await world.loadAssets();}finally{B.SceneLoader.LoadAssetContainerAsync=loader;}
const report={version:'1.19.0',scope:'Actual GLBs/colliders and simulated logic. Materials skipped here; no GPU/rendered-gameplay or audible-performance approval.',patrol:[],placement:{}};
const hidden={pos:{x:1000,z:1000},hiding:{id:'far-away'}};
const yardState={...newGame(),flags:FLAG_IDS.slice(0,FLAG_IDS.indexOf('yard'))};
world.sync(yardState,true);prepareNavigation(world.rects);

test('Patrol records arrivals, cools down failures, respects closed sections and validates all authored destinations',()=>{
 for(const p of PATROL_STOPS){assert.equal(blocked(p.x,p.z,world.rects,.34),false,p.name);assert.ok(reachableGoal({x:0,z:63},p,world.rects),p.name);}
 const planner=new PatrolPlanner([]);const selected=planner.choose({x:0,z:63},10,1,{});
 assert.equal(planner.visits.size,0);assert.equal(planner.arrive({x:0,z:63},11),false);
 assert.ok(selected.z>=0);assert.equal(planner.arrive(selected,12),true);assert.equal(planner.visits.get(selected.id),12);
 planner.choose({x:0,z:63},15,50,{});const failed=planner.target;planner.fail(15);
 assert.equal(planner.failed.get(failed.id),35);assert.notEqual(planner.choose({x:0,z:63},16,20,{}).id,failed.id);
});

test('Patrol reaches outside and returns regularly on all difficulties without crossing colliders or reading hidden position',()=>{
 world.sync(yardState,true);
 for(const difficulty of ['easy','medium','hard'])for(const seed of [1,10000]){
  const t=new Threat(world.rects,difficulty);t.prepareRoutes();t.mode='patrol';t.setPatrolChapter(yardState);t.patrolSeed=seed;
  let first=null,outside=0,absence=0,maxAbsence=0;const visits=new Set();
  for(let i=0;i<30*600;i++){
   t.tick(1/30,hidden);
   if(t.pos.z<0){first??=t.clock;outside+=1/30;absence=0;}else{absence+=1/30;if(first)maxAbsence=Math.max(maxAbsence,absence);}
   if(i%30===0)assert.equal(blocked(t.pos.x,t.pos.z,world.rects,.34),false,difficulty+' body clearance');
   for(const a of t.patrol.arrivals)visits.add(a.id);
  }
  assert.ok(first<55,difficulty+' initial yard arrival '+first);assert.ok(maxAbsence<85,difficulty+' exterior absence '+maxAbsence);
  for(const p of PATROL_STOPS.filter(p=>p.z<0))assert.ok(visits.has(p.id),difficulty+' actual arrival '+p.name);
  assert.equal(t.mover.recoveries,0);assert.equal(t.lastKnown,null,'patrol has no secret player coordinates');
  report.patrol.push({difficulty,seed,firstExteriorSeconds:first,maxExteriorAbsenceSeconds:maxAbsence,outsideSeconds:outside,uniqueArrivals:visits.size,recoveries:t.mover.recoveries,planning:t.mover.planningReport()});
 }
});

test('Interior and return patrols physically enter workshop and pump and sweep both garage aisles',()=>{
 for(const chapter of ['interior','return']){
  const t=new Threat(world.rects,'medium');t.prepareRoutes();t.mode='patrol';t.outsideUnlocked=chapter==='return';t.patrol.setChapter(chapter);t.patrolSeed=1;
  const visits=new Set();
  for(let i=0;i<30*900;i++){t.tick(1/30,hidden);for(const a of t.patrol.arrivals)visits.add(a.id);if(chapter==='interior')assert.ok(t.pos.z>=0);}
  for(const name of ['workshop room','pump room','west car aisle','east car aisle'])assert.ok(visits.has(PATROL_STOPS.find(p=>p.name===name).id),chapter+' '+name);
  assert.equal(t.mover.recoveries,0);report.patrol.push({chapter,seconds:900,uniqueArrivals:visits.size,recoveries:t.mover.recoveries});
 }
});

test('A near-but-not-cleared pillar corner is traversed at 30, 60 and 144 Hz instead of replanning forever',()=>{
 for(const fps of [30,60,144]){
  const m=new RouteFollower(world.rects),p={x:-5.022641258601918,z:55.954893360149505},target={x:23,z:98};let yaw=-5.8223172005179515;
  assert.equal(lineClear(p,{x:-5,z:56.625},world.rects,.34),false,'known regression corner');
  for(let i=0;i<fps*50&&Math.hypot(p.x-target.x,p.z-target.z)>.15;i++){
   yaw=m.step(p,yaw,target,2.05,1/fps,i/fps,'patrol').yaw;
   assert.equal(blocked(p.x,p.z,world.rects,.34),false);
  }
  assert.ok(Math.hypot(p.x-target.x,p.z-target.z)<.15,JSON.stringify({fps,p,target}));assert.equal(m.recoveries,0);assert.ok(m.planCount<5);
 }
});

test('Ninety new placements are grounded, wall vents face the room, and large props avoid controls and other bodies',()=>{
 assert.equal(world.scenery.records.length,90);assert.equal(world.failedAssets?.length||0,0);
 const overlaps=[];
 for(const p of world.scenery.records){
  assert.ok(Math.abs(p.bottom-(p.wall?p.root.metadata.supportY:0))<1e-5,p.id+' supported');
  if(p.wall){
   const rear=p.root.getDescendants().find(n=>n.name.endsWith('__rear_mount')),front=p.root.getDescendants().find(n=>n.name.endsWith('__front_center'));
   rear.computeWorldMatrix(true);front.computeWorldMatrix(true);const a=rear.getAbsolutePosition(),b=front.getAbsolutePosition();
   assert.ok(p.x<0?b.x>a.x:b.x<a.x,'vent must project out of supporting wall');continue;
  }
  if(p.backdrop||p.small)continue;
  for(const r of world.rects){
   if(r.enabled===false||Math.abs(p.x-r.x)<.001&&Math.abs(p.z-r.z)<.001)continue;
   if((p.w+r.w)/2-Math.abs(p.x-r.x)>.025&&(p.d+r.d)/2-Math.abs(p.z-r.z)>.025)overlaps.push([p.root.name,r.name]);
  }
 }
 for(const spot of world.stage.spots)assert.equal(blocked(spot.entry.x,spot.entry.z,world.rects,.3),false,spot.id+' shelter approach');
 assert.deepEqual(overlaps,[]);report.placement.newProps=world.scenery.records.length;report.placement.largeBodyOverlaps=overlaps;
});

test('Signs face usable approaches, side-door header has architecture, and fence posts meet actual corners',()=>{
 const signs=world.placements.report().records.filter(r=>r.width);
 const loading=signs.filter(s=>/^LOADING \d+$/.test(s.label));assert.equal(loading.length,3);
 for(const s of loading){assert.ok(s.normal.x>.9);assert.ok(s.x>-18.32,'print outside shutter ribs');}
 assert.ok(world.scene.getMeshByName('gatehouse side door lintel'));
 for(const label of ['SECONDARY EXIT','BARRIER BRAKE']){
  const backing=world.scene.getMeshByName('yard sign backing '+label);backing.computeWorldMatrix(true);
  const b=backing.getBoundingInfo().boundingBox;assert.ok(b.minimumWorld.x>=16.62&&b.minimumWorld.x<16.65,label+' within 3cm of real wall');
 }
 assert.ok(signs.some(s=>s.label==='02 UTILITY SELECTOR  ←'));assert.ok(signs.some(s=>s.label==='03 GATEHOUSE  ←'));
 const f=world.yard.fenceSegments;for(const side of [-1,1]){
  const edge=f.find(r=>Math.abs(r.x-side*29.7)<.001);assert.equal(edge.z-edge.length/2,-58);assert.equal(edge.z+edge.length/2,0);
  const back=f.find(r=>r.axis==='x'&&r.z===-58&&Math.sign(r.x)===side);assert.ok(Math.abs(Math.abs(back.x)+back.length/2-29.7)<1e-8);
 }
 for(const {post,foot} of world.yard.fencePosts.values()){assert.equal(post.position.x,foot.position.x);assert.equal(post.position.z,foot.position.z);}
 report.placement.fencePosts=world.yard.fencePosts.size;
});

test('Paired booms and dolly have a clear full sweep; no loose cable or overhead wire survives',()=>{
 assert.equal(world.yard.barrierArms.length,2);assert.equal(world.yard.barrierRect.w,12);
 for(const t of [0,.25,.5,.75,1]){
  world.yard.action('barrier',t);world.yard.action('route',t);
  for(const {pivot} of world.yard.barrierArms)for(const m of pivot.getChildMeshes()){
   m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;assert.ok(b.maximumWorld.y<7.3&&b.minimumWorld.y>.9);
  }
  const d=world.yard.dollyRect;
  for(const r of world.rects){if(r===d||r.enabled===false)continue;assert.ok((d.w+r.w)/2-Math.abs(d.x-r.x)<=.025||(d.d+r.d)/2-Math.abs(d.z-r.z)<=.025,'dolly swept overlap '+r.name);}
 }
 assert.equal(world.scene.meshes.some(m=>/steel tow cable|supported utility conduit|roof-mounted conduit hanger/.test(m.name)),false);
 world.sync(yardState,true);
});

test('North-up journal maps agree with the actual camera rather than mirroring left and right',()=>{
 world.camera.rotation.set(0,Math.PI,0);world.camera.getViewMatrix(true);
 const right=world.camera.getDirection(B.Axis.X);
 assert.ok(right.x<-.99);
 const yard=renderMap({x:10,z:-20,yaw:Math.PI},null,[],[]);
 const match=yard.match(/transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)"/);
 assert.ok(match);assert.ok(Number(match[1])<186,'positive X belongs on the left of a north-up view');assert.equal(Number(match[3]),180);
 const garage=renderMap({x:10,z:30},null,[],[]);
 const marker=garage.match(/<circle cx="([-\d.]+)" cy="[-\d.]+" r="8"/);
 assert.ok(marker);assert.ok(Number(marker[1])<217);
 assert.doesNotMatch(yard,/KEEP LEFT|passes LEFT/);
});

test('Darker light pools retain independent sky and torch; sky has a dense deterministic star field without runtime allocation',()=>{
 assert.ok(ambientPower('restored')<=.012&&ambientPower('outage')<=.004);
 assert.ok(fixturePower({x:0,z:-20,emergency:true},'restored')<.5);
 assert.ok(world.lights.filter(l=>l.z>0&&!l.emergency).every(l=>l.base<=2.8));
 assert.ok(world.sky.starCount>=630);assert.equal(world.sky.meshes.length,3);
 assert.ok(world.sky.starRecords.every(p=>p.y>0&&Number.isFinite(p.x)&&p.radius>=.065));
 const lights=world.scene.lights.length,meshes=world.scene.meshes.length,hemi=world.hemi.intensity;
 world.sky.setSettings({...validateSettings(),skyBrightness:1.2});
 for(let i=0;i<1000;i++){world.sky.tick(i/30,{z:-30});world.yard.tick(1/30,i/30,{pos:{x:26,z:-18}},{quality:'low',weatherEffects:'reduced',reducedMotion:true});}
 assert.equal(world.scene.lights.length,lights);assert.equal(world.scene.meshes.length,meshes);assert.equal(world.hemi.intensity,hemi);
 world.optimizeStatic();world.setSettings(validateSettings());world.updateRoomVisibility({x:0,z:-30},1);
 report.scene=world.renderBudgetReport();report.skyStars=world.sky.starCount;
 if(process.env.LV119_REPORT)fs.writeFileSync(process.env.LV119_REPORT,JSON.stringify(report,null,2)+'\n');
});
