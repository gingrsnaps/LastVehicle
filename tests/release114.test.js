import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerInput } from '../dist/js/controller.js';
import { loadInBatches } from '../dist/js/preparation.js';
import { renderSizing } from '../dist/js/performance.js';
import { lightingPhase, stealthVisibility } from '../dist/js/lighting.js';
import { stepBolt } from '../dist/js/distractions.js';
import { Threat } from '../dist/js/threat.js';
import { newGame, validateSave, validateSettings, DEFAULT_SETTINGS } from '../dist/js/state.js';
import { AudioMixer } from '../dist/js/audio.js';
import { wireAudio } from './audio-fixture.js';

test('Denied gamepad API is never called while disabled and fails once until explicit retry',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let calls=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads(){calls++;throw new DOMException('permissions policy','SecurityError');}}});
 try{
  const c=new ControllerInput();for(let i=0;i<300;i++)c.poll(DEFAULT_SETTINGS);assert.equal(calls,0);
  const enabled={...DEFAULT_SETTINGS,controllerEnabled:true};
  for(let i=0;i<300;i++)assert.deepEqual(c.poll(enabled).move,{x:0,y:0});
  assert.equal(calls,1);assert.equal(c.blocked,true);assert.match(c.error,/SecurityError/);
  c.retry();c.poll(enabled);assert.equal(calls,2);
  c.poll(DEFAULT_SETTINGS);c.poll(enabled);assert.equal(calls,3);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});

test('Preparation runs only two imports at once and finishes all work before reporting failure',async()=>{
 let active=0,peak=0,done=0;
 await assert.rejects(loadInBatches(Array.from({length:14},(_,i)=>i),async i=>{
  active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;done++;
  if(i===3)throw Error('missing model');
 },2),/missing model/);
 assert.equal(peak,2);assert.equal(active,0);assert.equal(done,14);
});

test('Render sizing bounds supersampled ultrawide windows and respects hardware limits',()=>{
 for(const [w,h,limit] of [[7680,2160,8192],[16000,9000,4096],[1,1,4096]]){
  const r=renderSizing(w,h,{...DEFAULT_SETTINGS,scale:1.5},{maxTextureSize:limit,maxRenderTextureSize:limit});
  assert.ok(r.width*r.height<=8294400);assert.ok(r.width<=limit&&r.height<=limit);assert.ok(Number.isFinite(r.scaling)&&r.scaling>0);
 }
 const r=renderSizing(1920,1080,{...DEFAULT_SETTINGS,resolution:'720'});assert.equal(r.height,720);
 assert.equal(renderSizing(NaN,0,DEFAULT_SETTINGS).height,1);
});

test('Inspection outage and restored lanes share one brightness-independent stealth calculation',()=>{
 const s=newGame(),fixtures=[{x:0,z:50,base:7}],p={x:0,z:50};
 const arrival=stealthVisibility(p,fixtures,lightingPhase(s));s.flags.push('car');
 const dark=stealthVisibility(p,fixtures,lightingPhase(s));s.flags.push('power');
 const exposed=stealthVisibility(p,fixtures,lightingPhase(s));assert.ok(arrival>dark+.5&&exposed>dark+.5);
 assert.equal(lightingPhase(validateSave(newGame())),'arrival');
});

test('Bolt swept contacts sound once, fall after a wall hit and settle at floor height',()=>{
 for(const dt of [1/30,1/60,1/144]){
  const b={active:true,x:0,y:1.5,z:10,vx:0,vy:2,vz:8,contacted:false};let contacts=0;
  const walls=[{x:0,y:2,z:11.5,w:10,h:4,d:.2}];
  for(let i=0;i<5/dt;i++){if(stepBolt(b,dt,walls))contacts++;assert.ok(b.z<11.4,'swept wall cannot be crossed');}
  assert.equal(contacts,1);assert.equal(b.active,false);assert.equal(b.y,.025);
 }
 const b={active:true,x:0,y:1,z:0,vx:2,vy:1,vz:1};let contacts=0;
 for(let i=0;i<100;i++)if(stepBolt(b,.05,[]))contacts++;
 assert.equal(contacts,1);assert.equal(b.y,.025);
});

test('Distraction stock and bounded regional habituation survive saves and old saves gain defaults',()=>{
 const s=newGame();s.bolts=1;s.boltHistory=[{x:0,z:42,uses:2}];
 const restored=validateSave(s);assert.equal(restored.bolts,1);assert.deepEqual(restored.boltHistory,s.boltHistory);
 const old={...s};delete old.bolts;delete old.boltHistory;assert.equal(validateSave(old).bolts,3);
 assert.equal(validateSave({...s,bolts:Infinity}).bolts,3);
 assert.equal(validateSave({...s,boltHistory:[{x:NaN,z:42,uses:2}]}).boltHistory.length,0);
});

test('Repeated bolts inspect plausible cover without consulting a hidden player or interrupting sight',()=>{
 const t=new Threat([],'medium');t.mode='patrol';t.pos={x:0,z:30};
 t.coverPoints=()=>[{x:2,z:36},{x:18,z:80}];const p={x:0,z:36};
 for(let i=0;i<3;i++){t.clock=i*3+2;t.hearBolt(p);}
 assert.equal(t.boltHabits[0].uses,3);assert.deepEqual(t.destination,{x:2,z:36});assert.ok(t.boltCheckUntil>t.clock);
 t.mode='chase';t.memory=10;t.destination={x:0,z:50};t.hearBolt(p);assert.deepEqual(t.destination,{x:0,z:50});
});

test('Wet footsteps are easier to hear while solid walls still attenuate their route',()=>{
 const dry=new Threat([]),wet=new Threat([]),blocked=new Threat([{x:0,z:35,y:2,w:40,d:1,h:4}]);
 for(const t of [dry,wet,blocked]){t.mode='patrol';t.pos={x:0,z:30};}
 dry.hear({x:0,z:40},8);wet.hear({x:0,z:40},12);blocked.hear({x:0,z:40},12);
 assert.equal(dry.mode,'patrol');assert.equal(wet.mode,'investigate');assert.equal(blocked.mode,'patrol');assert.ok(wet.soundTurn>0);
});

test('Post-encounter pursuit requires actual sight and keeps the sole actor at its current position',()=>{
 const t=new Threat([]);t.pos={x:0,z:30};t.yaw=0;t.mode='investigate';
 const p={pos:{x:0,z:35},height:1.68,visibility:1,flashlight:false};
 assert.equal(t.pursueIfSeen({...p,hiding:{id:'locker'}}),false);
 assert.equal(t.pursueIfSeen(p),true);assert.equal(t.mode,'chase');assert.deepEqual(t.pos,{x:0,z:30});assert.ok(t.grace>0);
});

test('New guidance defaults stay compact while explicit old journal preferences and remaps survive',()=>{
 const fresh=validateSettings({});assert.equal(fresh.objectiveMode,'always');assert.equal(fresh.hintReminders,true);
 const old=validateSettings({objectiveHUD:false,guidanceVersion:2,bindings:{journal:'KeyN',sprint:'KeyQ'}});
 assert.equal(old.objectiveMode,'journal');assert.equal(old.bindings.journal,'KeyN');assert.equal(old.bindings.sprint,'KeyQ');assert.notEqual(old.bindings.throw,'KeyQ');
 assert.equal(validateSettings({objectiveMode:'request'}).objectiveMode,'request');
});

test('Thirty simulated minutes keep scene-mix automation and voice counts bounded; exertion mutes on pause',()=>{
 const names=['ambience','music','service','tension','unease','aftermath','drip','lv113-motif','lv113-return','lv113-exit-rain','lv114-city-night','lv114-entrance-rain','lv114-distant-thunder','lv114-player-breath'];
 const a=wireAudio(new AudioMixer(),true,names);a.startAmbience();
 const p={pos:{x:0,z:12},stamina:.4,sprinting:true},s=newGame();
 for(let i=0;i<7200;i++){a.ctx.currentTime=i*.25;a.updateScene(.25,'garage','patrol',p,s);for(const v of a.voices)if(!v.loop)a.releaseVoice(v);assert.ok(a.voices.size<=24);}
 assert.ok(a.loops.breath.volume>0);assert.ok(a.loops.city.volume>0);assert.ok(a.ctx.writes.length<200,'constant mix should not queue per-frame ramps');
 a.setPaused(true);assert.equal(a.loops.breath.volume,0);assert.equal(a.loops.entranceRain.volume,0);a.stop();assert.equal(a.voices.size,0);
});
