import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Threat} from '../dist/js/threat.js?v=1.19.0';
import {EncounterDirector} from '../dist/js/encounters.js?v=1.19.0';
import {CreatureScenes} from '../dist/js/creature-scenes.js?v=1.19.0';
import {signTextureSize} from '../dist/js/sign-sizing.js?v=1.19.0';
import {newGame,FLAG_IDS} from '../dist/js/state.js?v=1.19.0';

globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}};
await import('../dist/vendor/babylon.js');await import('../dist/vendor/babylonjs.loaders.min.js');
const B=globalThis.BABYLON;
const {requestTexture,loadSurfaceTexture}=await import('../dist/js/texture-loader.js?v=1.19.0');
const {World}=await import('../dist/js/world.js?v=1.19.0');
const {Game}=await import('../dist/js/game.js?v=1.19.0');
const {projectSurfaceUV,surfaceRecipe,SurfaceLibrary}=await import('../dist/js/surface-library.js?v=1.19.0');
const hidden={pos:{x:90,z:100},hiding:{id:'far-away'}};
const report={version:'1.19.0',scope:'Shipped GLB geometry and non-image materials, injected texture handles, simulated logic. No GPU rendering, JPEG decode or audible approval.'};

test('GPU allocation exceptions dispose the real Babylon texture instead of leaking a scene blocker',async()=>{
 const engine=new B.NullEngine(),scene=new B.Scene(engine),original=engine.createTexture;
 engine.createTexture=()=>{throw new Error('injected GPU allocation failure');};
 try{for(let i=0;i<3;i++){
  const result=await requestTexture(scene,'bad.jpg');assert.equal(result.texture,null);assert.match(result.error,/GPU allocation/);
  assert.equal(scene.textures.length,0,'no orphaned blocking BaseTexture');
 }}finally{engine.createTexture=original;engine.dispose();}
});

test('Synchronous callbacks, timeout, duplicate/late completion and bounded retry settle and clean once',async()=>{
 let handle;
 class Texture {
  constructor(url,scene,mipmap,invert,sampling,onLoad,onError){handle=this;this.error=onError;this.disposals=0;this.internal=null;}
  updateURL(url,buffer,onLoad){this.load=onLoad;if(url==='sync'){this.error('allocation rejected');this.internal={allocated:true};throw new Error('secondary error');}}
  dispose(){this.disposals++;this.internal=null;}
 }
 const result=await requestTexture({},'sync',{Texture});assert.equal(result.texture,null);assert.match(result.error,/allocation rejected/);assert.equal(handle.disposals,1);assert.equal(handle.internal,null);
 const late=requestTexture({},'late',{Texture,timeoutMs:4});const pending=handle;assert.equal((await late).texture,null);
 pending.load();pending.error('late');await Promise.resolve();assert.equal(pending.disposals,1);
 const world={scene:{}},good={isTexture:true};let calls=0;
 assert.equal(await loadSurfaceTexture(world,'retry.jpg',{request:async()=>({texture:++calls===2?good:null,error:calls===1?'transient':null})}),good);
 assert.equal(world.assetHealth.textures['retry.jpg'].attempts,2);assert.equal(world.assetHealth.textures['retry.jpg'].state,'ready');
 world.textureDeadline=performance.now()-1;
 assert.equal(await loadSurfaceTexture(world,'expired.jpg',{request:async()=>{throw Error('must not start');}}),null);
 assert.equal(world.assetHealth.textures['expired.jpg'].attempts,0);assert.deepEqual(world.failedAssets,['textures/expired.jpg']);
});

test('Fresh noise cancels a stale peek/search plan and holds the audible destination',()=>{
 for(const difficulty of ['easy','medium','hard']){
  const t=new Threat([],difficulty);t.mode='search';t.pos={x:0,z:30};t.lastKnown={x:1,z:30};
  t.searchAction={time:0,duration:.25,clip:'PeekLeft',lookAt:{x:1,z:30}};t.searchPlan=[{id:'old-cover',x:-5,z:30}];
  t.evidence.observe('sight',{x:-5,z:30},0,{confidence:1});
  assert.equal(t.hear({x:5,z:30},30),true);assert.equal(t.searchAction,null);assert.deepEqual(t.searchPlan,[]);
  for(let i=0;i<6;i++){t.tick(.1,hidden);assert.deepEqual(t.destination,{x:5,z:30});}
 }
 const lost=new Threat([],'hard');lost.mode='chase';lost.memory=1;lost.pos={x:0,z:30};lost.loops.commit={goal:{x:-5,z:30},until:20};
 assert.equal(lost.hear({x:5,z:30},30),true);lost.tick(.1,hidden);assert.deepEqual(lost.destination,{x:5,z:30});assert.equal(lost.mode,'investigate');
 const t=new Threat([],'hard');t.mode='patrol';t.pos={x:0,z:30};
 t.observeHide({id:'witnessed',entry:{x:2,z:30}},true);
 assert.equal(t.hear({x:-3,z:30},10),false);assert.equal(t.mode,'inspect');assert.equal(t.witness,'witnessed');
});

test('Direct bolt stun survives encounter selection, creature staging and yard impacts',()=>{
 const t=new Threat([]);t.mode='patrol';t.pos={x:16.62,z:-44.7};t.receiveBolt({x:16.62,z:-44.7});const duration=t.stunTime;
 const state=newGame(),director=new EncounterDirector(state);director.request('powerSurge');
 assert.equal(director.next({mode:t.mode}),null);assert.equal(t.stageRoute([{x:0,z:0}],'Strike'),false);assert.equal(t.mode,'stunned');
 const game={threat:t,state,director,player:{pos:{x:23,z:39}},world:{},audio:{}};
 assert.equal(new CreatureScenes(game).tick(.1),false);assert.equal(t.stunTime,duration);
 let impacts=0;Object.assign(game,{yardEncounter:{id:'gatehouseBreach',time:1},visualReadable:()=>true,recordEncounter:()=>{},world:{yard:{impact(){impacts++;}}},audio:{prepareBeat(){},play(){}},ui:{subtitle(){}}});
 Game.prototype.tickYardEncounters.call(game,.1);assert.equal(impacts,1);assert.equal(t.mode,'stunned');assert.equal(t.stunTime,duration);
 t.tick(.1,hidden);assert.ok(t.stunTime<duration);assert.equal(t.mode,'stunned');
});

test('Door approach yields to fresh sight and a direct hit, and expires instead of looping forever',()=>{
 const make=()=>{const t=new Threat([],'hard');t.mode='chase';t.pos={x:0,z:0};t.lastKnown={x:10,z:0};t.memory=9;t.yaw=0;assert.equal(t.approachDoor({x:5,z:0},t.lastKnown),true);return t;};
 const seen=make();seen.tick(.1,{pos:{x:0,z:4},height:1.68,flashlight:true});assert.equal(seen.doorApproach,null);assert.deepEqual(seen.lastKnown,{x:0,z:4});
 const locker=make();locker.observeHide({id:'observed',entry:{x:1,z:1}},true);assert.equal(locker.doorApproach,null);assert.equal(locker.mode,'inspect');
 const hit=make();hit.receiveBolt({x:0,z:0});assert.equal(hit.doorApproach,null);assert.equal(hit.mode,'stunned');
 const stale=make();stale.clock=9;stale.tick(.1,hidden);assert.equal(stale.doorApproach,null);assert.equal(stale.approachDoor({x:5,z:0},stale.lastKnown),false);
});

test('Oversized sign allocations keep aspect and respect device caps',()=>{
 for(const [w,h,cap] of [[12,.15,4096],[2,20,4096],[8,.3,256],[3,.8,1024]]){
  const s=signTextureSize(w,h,cap);assert.ok(s.width<=Math.min(2048,cap)&&s.height<=Math.min(1024,cap));
  assert.ok(Math.abs(s.height-s.width*h/w)<=1);
 }
 assert.throws(()=>signTextureSize(NaN,1));
});

const engine=new B.NullEngine(),world=new World(engine),loader=B.SceneLoader.LoadAssetContainerAsync;
const skipped=[];
// Keep actual imported material identities. Only embedded-image models need
// skipMaterials, because this fixture has no browser image decoder.
B.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>{
 const bytes=fs.readFileSync(new URL('../dist/'+base+file,import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const skip=!!gltf.images?.length;if(skip)skipped.push(file);
 return B.LoadAssetContainerAsync(new Uint8Array(bytes),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:skip}}});
};
try{await world.loadAssets();}finally{B.SceneLoader.LoadAssetContainerAsync=loader;}

test('Real prop materials receive UVs and textures, including the previously blank freight tarp',async()=>{
 for(const name of ['decayMoss','decayMold','decayRust','decayPeel']){world.materials[name].albedoTexture=new B.Texture(null,world.scene);world.materials[name].metallicTexture=new B.Texture(null,world.scene);}
 const clothMeshes=world.scene.meshes.filter(m=>m.material?.name==='Yard115_cloth');
 const protectedMat=new B.PBRMaterial('steel',world.scene),atlas=new B.Texture(null,world.scene);protectedMat.albedoTexture=atlas;
 await world.surfaceLibrary.load(async file=>{assert.ok(fs.existsSync(new URL('../dist/assets/textures/'+file,import.meta.url)));return new B.Texture(null,world.scene);});
 const roles=['Yard115_dark','Yard115_ochre','Yard115_cloth','Yard115_dust','Yard115_rubber','carpet','canvas','carPaint','torchBody','seatFabric'];
 for(const name of roles){const matches=world.scene.materials.filter(m=>m.name===name);assert.ok(matches.length,name);assert.ok(matches.every(m=>m.albedoTexture),name);}
 const tarp=world.scene.meshes.filter(m=>/freight.tarp/i.test(m.name));assert.ok(tarp.length,'loaded tarp');
 let projected=0;for(const mesh of clothMeshes){if(mesh.geometry){assert.ok(mesh.isVerticesDataPresent(B.VertexBuffer.UVKind));assert.ok(mesh.getVerticesData(B.VertexBuffer.UVKind).every(Number.isFinite));projected++;}}
 assert.ok(projected>=10);assert.strictEqual(protectedMat.albedoTexture,atlas);
 assert.ok(world.surfaceLibrary.report.materials>79);assert.ok(world.surfaceLibrary.report.meshes>1946);
 assert.deepEqual(world.surfaceLibrary.report.invalidGeometry,[]);
 const added=world.scene.meshes.filter(m=>m.name.startsWith('scenery '));
 assert.ok(added.length>100);
 for(const m of added){const mat=m.material;if(mat&&surfaceRecipe(mat.name))assert.ok(mat.albedoTexture,'new prop textured: '+m.name);}
 report.surfaces=world.surfaceLibrary.report;report.imageMaterialModelsSkipped=skipped;
});

test('Palette reuse combines identical render states and preserves culling differences',async()=>{
 const scene=new B.Scene(engine),meshes=[];
 for(let i=0;i<3;i++){
  const mat=new B.PBRMaterial('Yard115_steel'+(i?'.00'+i:''),scene);mat.metallic=.7;
  if(i===2)mat.backFaceCulling=false;
  const mesh=B.MeshBuilder.CreateBox('palette '+i,{},scene);mesh.material=mat;meshes.push(mesh);
 }
 const lib=new SurfaceLibrary({scene,materials:{}});await lib.load(async()=>new B.Texture(null,scene));
 assert.strictEqual(meshes[0].material,meshes[1].material);
 assert.notStrictEqual(meshes[0].material,meshes[2].material);assert.equal(meshes[2].material.backFaceCulling,false);
 assert.equal(lib.report.reusedMaterials,1);scene.dispose();
});

test('Required images fail loading explicitly; invalid geometry cannot write non-finite UVs',async()=>{
 const scene=new B.Scene(engine),mat=new B.PBRMaterial('concrete',scene),box=B.MeshBuilder.CreateBox('bad transform',{},scene);box.material=mat;box.scaling.x=0;
 const issues=[];assert.equal(projectSurfaceUV(box,m=>surfaceRecipe(m.name),(name,reason)=>issues.push(reason)),0);assert.match(issues[0],/singular/);
 box.scaling.x=1;const normals=box.getVerticesData(B.VertexBuffer.NormalKind);normals[0]=NaN;box.setVerticesData(B.VertexBuffer.NormalKind,normals);
 assert.equal(projectSurfaceUV(box,m=>surfaceRecipe(m.name),(name,reason)=>issues.push(reason)),0);assert.match(issues[1],/non-finite/);
 const lib=new SurfaceLibrary({scene,materials:{}});await assert.rejects(lib.load(async()=>null),/Required surface textures/);assert.ok(lib.report.missingMaterials.includes('fabric'));scene.dispose();
});

test('Gatehouse door approach survives real chase ticks and reaches a physical breach',()=>{
 world.sync({...newGame(),flags:FLAG_IDS.slice(0,-1)},true);const yard=world.yard;yard.doorRect.enabled=true;
 const t=new Threat(world.rects,'hard');t.mode='chase';t.pos={x:10,z:-44};t.lastKnown={x:23,z:-44};t.clock=2;t.memory=9;t.senseClock=1;t.seesPlayer=false;
 let contact=0,frames=0;
 for(;frames<500&&yard.doorRect.enabled;frames++){
  if(yard.hunterDoor(1/30,t)==='contact'){contact++;assert.ok(Math.hypot(t.pos.x-15.5,t.pos.z+44)<.4);}
  t.tick(1/30,hidden);
  if(frames===0)assert.deepEqual(t.destination,{x:15.5,z:-44},'unreachable evidence must not overwrite the approach');
 }
 assert.equal(yard.doorRect.enabled,false);assert.equal(contact,1);assert.equal(t.doorApproach,null);report.breach={frames,contact,position:t.pos};
 yard.doorRect.enabled=true;const interrupted=new Threat(world.rects,'hard');interrupted.mode='investigate';interrupted.pos={x:10,z:-44};interrupted.lastKnown={x:23,z:-44};
 yard.hunterDoor(.1,interrupted);assert.ok(interrupted.doorApproach);yard.doorRect.enabled=false;yard.hunterDoor(.1,interrupted);assert.equal(interrupted.doorApproach,null);
});

test('Loading preparation follows room visibility and restores it even when rendering fails',async()=>{
 world.optimizeStatic();world.updateRoomVisibility({x:0,z:65},1);const initial={...world.visibilityPosition};
 const render=world.scene.render,isReady=world.scene.isReady,seen=[];world.scene.isReady=()=>true;
 world.scene.render=()=>{seen.push({z:world.camera.position.z,room:world.visibleRoom,external:world.roomBatches.some(b=>b.enabled&&b.backdrop)});};
 try{
  await world.warmup();assert.ok(seen.some(v=>v.z===-18&&v.external));assert.ok(seen.some(v=>v.z===-79&&v.external));assert.deepEqual(world.visibilityPosition,initial);
  delete world.visibilityPosition;world.camera.position.set(3,1.68,65);
  world.scene.render=()=>{throw Error('injected render failure');};await assert.rejects(world.warmup(),/injected render/);assert.deepEqual(world.visibilityPosition,{x:3,z:65});
 }finally{world.scene.render=render;world.scene.isReady=isReady;}
 report.warmup=seen;report.budget=world.renderBudgetReport();
 if(process.env.LV118_REPORT)fs.writeFileSync(process.env.LV118_REPORT,JSON.stringify(report,null,2)+'\n');
 engine.dispose();
});
