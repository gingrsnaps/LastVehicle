import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Threat } from '../dist/js/threat.js?v=1.19.0';
import { AudioMixer } from '../dist/js/audio.js?v=1.19.0';
import { wireAudio } from './audio-fixture.js';
import { newGame, FLAG_IDS, validateSettings } from '../dist/js/state.js?v=1.19.0';
import { blocked, lineClear } from '../dist/js/navigation.js?v=1.19.0';
import { RouteFollower } from '../dist/js/locomotion.js?v=1.19.0';

// Geometry and logic tests use the shipped engine. No claim of GPU rendering,
// JPEG decode, audible playback or measured game FPS is made by this fixture.
globalThis.OffscreenCanvas=class {constructor(w,h){this.width=w;this.height=h;}getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}};
await import('../dist/vendor/babylon.js');await import('../dist/vendor/babylonjs.loaders.min.js');
const B=globalThis.BABYLON;
const {stepBolt,boltHitTime}=await import('../dist/js/distractions.js?v=1.19.0');
const {World}=await import('../dist/js/world.js?v=1.19.0');
const {Game}=await import('../dist/js/game.js?v=1.19.0');
const {SurfaceLibrary,projectSurfaceUV,surfaceRecipe}=await import('../dist/js/surface-library.js?v=1.19.0');
const hidden={pos:{x:80,z:100},hiding:{id:'unseen'},height:1.68};

test('Swept bolts hit an enemy once at 30/60/144 FPS, respect height and stop at the nearest wall',()=>{
 const target={x:0,y:1.3,z:2,w:.68,h:2.1,d:.68};
 for(const fps of [30,60,144])for(const shield of [false,true]){
  const body={x:0,y:1.4,z:0,vx:0,vy:.1,vz:8,active:true,contacted:false};
  const walls=shield?[{x:0,y:1.5,z:.9,w:3,h:3,d:.1,surface:'metal'}]:[];let hits=0;
  for(let i=0;i<fps;i++)hits+=Number(stepBolt(body,1/fps,walls,target));
  assert.equal(hits,1);assert.equal(body.impact.surface,shield?'metal':'enemy');
  assert.ok(Number.isFinite(body.impact.x+body.impact.y+body.impact.z));
 }
 const from={x:0,y:4,z:0},to={x:0,y:4,z:4};assert.equal(boltHitTime(from,to,target),Infinity);
 assert.equal(boltHitTime({x:0,y:1,z:0},{x:0,y:1,z:4},{...target,enabled:false}),Infinity);
 const b={x:0,y:1,z:0,vx:0,vy:0,vz:8,active:true,contacted:false};
 stepBolt(b,.012,[{x:0,y:1,z:.09,w:2,h:2,d:.01,surface:'glass'},{x:0,y:1,z:.05,w:2,h:2,d:.01,surface:'metal'}]);
 assert.equal(b.impact.surface,'metal','physical order, not rectangle authoring order');
});

test('Direct bolts interrupt windup, cannot be cancelled by hiding, and resist rapid repeat stun on every difficulty',()=>{
 const durations=[];
 for(const difficulty of ['easy','medium','hard']){
  const t=new Threat([],difficulty),p={pos:{x:0,z:1},height:1.68,flashlight:true};t.pos={x:0,z:0};t.beginAttack(p);
  assert.equal(t.receiveBolt({x:0,y:1.3,z:0,incoming:{x:0,z:-8}}),'staggered');durations.push(t.stunTime);
  const initial=t.stunTime;t.observeHide({id:'locker',entry:{x:1,z:0}},true);assert.equal(t.mode,'stunned');
  assert.equal(t.lure({x:1,z:0}),false);assert.equal(t.pursueIfSeen(p),false);
  assert.equal(t.receiveBolt({x:0,z:0}),'resisted');assert.equal(t.stunTime,initial);
  const position={...t.pos};while(t.mode==='stunned'){
   const r=t.tick(.01,p);assert.equal(r.caught,false);assert.equal(r.animation,'Recover');assert.deepEqual(t.pos,position);
  }
  assert.equal(t.mode,'listen');assert.equal(t.receiveBolt({x:0,z:0}),'resisted');
  t.clock=t.stunResistUntil+.1;assert.equal(t.receiveBolt({x:0,z:0}),'staggered');
  t.reset();assert.equal(t.lastBoltEvent,null);assert.equal(t.stunTime,0);
 }
 assert.ok(durations[0]>durations[1]&&durations[1]>durations[2]);
});

test('A lost-sight clatter holds the investigation against old sight evidence; visible chase ignores distraction',()=>{
 const t=new Threat([],'hard');t.mode='chase';t.pos={x:0,z:0};t.clock=3;t.memory=t.rules.memory;
 t.lastKnown={x:0,z:10};t.lastSeen={...t.lastKnown,time:1};t.evidenceAge=2;t.seesPlayer=false;
 t.evidence.observe('sight',t.lastKnown,1,{confidence:1,source:'player-sight'});
 assert.equal(t.hearBolt({x:5,z:5,surface:'metal'}),true);assert.equal(t.mode,'investigate');
 for(let i=0;i<8;i++){t.tick(.1,hidden);assert.deepEqual(t.destination,{x:5,z:5});}
 assert.equal(t.diagnostics().bolts.heard,1);
 t.mode='chase';t.seesPlayer=true;t.lastSeen.time=t.clock;t.memory=t.rules.memory;
 assert.equal(t.hearBolt({x:-4,z:2,surface:'metal'}),false);assert.equal(t.diagnostics().bolts.ignored,1);
});

test('Impact audio has priority within the 24-voice cap and production hit handling reaches the real AI/mixer',()=>{
 const names=['tool-handling','lv115-bolt-metal','lv115-bolt-water','lv115-bolt-glass','lv114-bolt-impact','creature-recover','lv113-cloth-shift'];
 const audio=wireAudio(new AudioMixer(),true,names);
 for(let i=0;i<24;i++)audio.play('tool-handling');
 const threat=new Threat([]);threat.mode='patrol';threat.pos={x:0,z:0};let saves=0;const captions=[];
 const g={audio,threat,player:{pos:{x:0,z:3}},ui:{subtitle:t=>captions.push(t)},queueAutosave:()=>saves++};
 assert.equal(Game.prototype.boltImpact.call(g,{x:0,y:1.4,z:0,surface:'enemy',incoming:{x:0,z:-8}}),'staggered');
 const impact=[...audio.voices].find(v=>v.name==='lv115-bolt-metal');assert.ok(impact);assert.equal(impact.priority,2);
 for(let i=0;i<50;i++)audio.play('tool-handling');
 assert.equal(audio.voices.size,24);assert.ok(audio.voices.has(impact));assert.ok(captions[0].includes('staggers'));assert.equal(saves,1);
 for(const name of names)assert.ok(fs.existsSync(new URL('../dist/assets/audio/'+name+'.ogg',import.meta.url)),name);
 audio.stop();assert.equal(audio.voices.size,0);
});

const engine=new B.NullEngine(),world=new World(engine),loader=B.SceneLoader.LoadAssetContainerAsync;
B.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>B.LoadAssetContainerAsync(new Uint8Array(fs.readFileSync(new URL('../dist/'+base+file,import.meta.url))),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}});
try{await world.loadAssets();}finally{B.SceneLoader.LoadAssetContainerAsync=loader;}
const report={version:'1.19.0',scope:'Actual GLB geometry and simulated logic. Imported materials skipped; injected texture objects. No GPU, audible or full human playthrough approval.'};

test('Physical UV projection respects dimensions and mirrored scaling; shared color/roughness maps preserve unrelated palettes',async()=>{
 const scene=new B.Scene(engine),mat=new B.PBRMaterial('concrete',scene),box=B.MeshBuilder.CreateBox('test slab',{width:10,height:1,depth:4},scene);box.material=mat;box.scaling.x=-2;
 projectSurfaceUV(box,m=>surfaceRecipe(m.name));const normals=box.getVerticesData(B.VertexBuffer.NormalKind),uv=box.getVerticesData(B.VertexBuffer.UVKind),u=[];
 for(let i=0;i<normals.length/3;i++)if(normals[i*3+1]>.9)u.push(uv[i*2]);
 assert.ok(Math.abs(Math.max(...u)-Math.min(...u)-20/1.23)<.0001);
 const protectedMat=new B.PBRMaterial('Kenney colormap',world.scene),original=new B.Texture(null,world.scene);protectedMat.albedoTexture=original;
 const files=[];await world.surfaceLibrary.load(async file=>{assert.ok(fs.existsSync(new URL('../dist/assets/textures/'+file,import.meta.url)));files.push(file);return new B.Texture(null,world.scene);});
 assert.equal(files.length,14);assert.equal(world.surfaceLibrary.report.maps,14);assert.ok(world.surfaceLibrary.report.meshes>100);
 assert.strictEqual(protectedMat.albedoTexture,original);assert.strictEqual(world.materials.floor.albedoTexture,world.surfaceLibrary.maps.concrete.albedo);
 assert.equal(world.materials.floor.albedoTexture.gammaSpace,true);assert.equal(world.materials.floor.metallicTexture.gammaSpace,false);
 assert.equal(world.materials.floor.useMetallnessFromMetallicTextureBlue,false);
 report.surfaces=world.surfaceLibrary.report;scene.dispose();protectedMat.dispose();original.dispose();
});

test('Scenery is grounded outside the route; floors meet, and the obsolete crossing cable and roof wires are removed',()=>{
 assert.equal(world.failedAssets?.length||0,0);assert.equal(world.landscape.records.filter(r=>r.type==='shrub').length,24);assert.equal(world.landscape.records.filter(r=>r.type==='tree').length,8);
 for(const r of world.landscape.records){assert.equal(r.baseY,0);assert.ok(Math.abs(r.x)>17);}
 const yard=world.scene.getMeshByName('service yard ground');yard.computeWorldMatrix(true);assert.ok(Math.abs(yard.getBoundingInfo().boundingBox.maximumWorld.z+1)<.0001);
 assert.equal(world.scene.getMeshByName('outside floor'),null);
 assert.equal(world.scene.meshes.some(m=>/supported utility conduit|roof-mounted conduit hanger|steel tow cable/.test(m.name)),false);
 const channel=world.scene.getMeshByName('covered tow channel');assert.ok(channel);channel.computeWorldMatrix(true);
 assert.ok(channel.getBoundingInfo().boundingBox.maximumWorld.y<.06);
 for(const t of [0,.25,.5,.75,1]){
  world.yard.action('route',t);assert.equal(world.yard.dollyRect.x,world.yard.dolly.position.x);
  assert.equal(world.yard.dolly.position.z,-53);
 }
 world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);
 assert.equal(lineClear({x:-10.6,z:-11},{x:-10.6,z:-46},world.rects,.3),true);
 assert.deepEqual(world.placements.report().unresolved,[]);report.scenery=world.landscape.records;
});

test('The hunter physically traverses the exterior control route with the gatehouse side door both open and closed',()=>{
 report.routes=[];
 for(const closed of [true,false]){
  world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);world.yard.doorRect.enabled=closed;
  const p={x:-10.6,z:-10},goals=[{x:24,z:-30},{x:23,z:-44},{x:-16,z:-34}],m=new RouteFollower(world.rects);let yaw=0,clock=0;
  for(const goal of goals){let frames=0;m.invalidate();
   for(;frames<3000&&Math.hypot(p.x-goal.x,p.z-goal.z)>.35;frames++){
    const before={...p},r=m.step(p,yaw,goal,3.5,1/30,clock,'chase');yaw=r.yaw;clock+=1/30;
    assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=3.5/30+.001,'no teleport recovery');assert.equal(blocked(p.x,p.z,world.rects,.32),false);
   }
   assert.ok(frames<3000,JSON.stringify({closed,goal,p,failures:m.failures}));report.routes.push({closed,goal,frames,recoveries:m.recoveries});
  }
 }
});

test('Textured foliage/water batches construct without incompatible layouts, retain alpha, and cull by sector',()=>{
 world.optimizeStatic();world.setSettings(validateSettings());world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);
 const water=world.roomBatches.filter(b=>b.mesh.material===world.materials.puddle&&b.mesh.isVerticesDataPresent(B.VertexBuffer.ColorKind));assert.ok(water.length);assert.ok(water.every(b=>b.mesh.hasVertexAlpha));
 const count=world.scene.meshes.length;for(let i=0;i<120;i++)world.yard.tick(1/60,i/60,{pos:{x:0,z:-30}},{weatherEffects:'off',sceneryMotion:false});assert.equal(world.scene.meshes.length,count);
 report.visibility=[];
 for(const [area,pos] of [['garage',{x:0,z:65}],['yard',{x:0,z:-30}],['road',{x:0,z:-85}]]){
  world.updateRoomVisibility(pos,1);const enabled=world.roomBatches.filter(b=>b.enabled);
  if(area==='garage')assert.ok(enabled.every(b=>!b.backdrop));else assert.ok(enabled.some(b=>b.backdrop));
  report.visibility.push({area,enabledBatches:enabled.length,triangles:enabled.reduce((n,b)=>n+(b.mesh.getTotalIndices?.()||0)/3,0)});
 }
 report.budget=world.renderBudgetReport();
 if(process.env.LV117_REPORT)fs.writeFileSync(process.env.LV117_REPORT,JSON.stringify(report,null,2)+'\n');
});
