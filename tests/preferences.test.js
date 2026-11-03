import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, validateSettings, SaveStore, newGame } from "../dist/js/state.js";
import { GraphicsPreview, importPreferences, resetCategory, GRAPHICS_KEYS } from "../dist/js/preferences.js";
import { FrameStats, AdaptiveScale, nextFrameDeadline, HitchRecorder } from "../dist/js/performance.js";
import { Animator } from "../dist/js/animation.js";
import { introFrames, INTRO_MS, playIntro, FootfallTracker } from "../dist/js/presentation.js";

test("Old settings migrate FPS, graphics and interface volume while retaining remapped controls", () => {
  const s = validateSettings({quality:"low", showFPS:true, sfx:.5, bindings:{interact:"KeyH"}});
  assert.equal(s.fpsMode,"basic"); assert.equal(s.shadows,"off"); assert.equal(s.glow,false);
  assert.equal(s.uiVolume,.35); assert.equal(s.mouseMode,"locked"); assert.equal(s.bindings.interact,"KeyH");
  const safe = validateSettings({fpsMode:"bad",uiScale:500,sensitivityY:-100,mouseMode:"raw",adaptiveFloor:NaN});
  assert.equal(safe.fpsMode,"off"); assert.equal(safe.uiScale,1.3); assert.equal(safe.sensitivityY,.25); assert.equal(safe.adaptiveFloor,.65);
});
test("Graphics preview keeps unrelated live settings, never persists unconfirmed values, and fully reverts", () => {
  let s=validateSettings({quality:"medium"}); const preview=new GraphicsPreview();
  preview.stage(s,{quality:"high",scale:1.4});
  assert.equal(s.quality,"medium");
  s=preview.apply(s,100); assert.equal(s.shadows,"high"); assert.equal(preview.deadline,15100);
  s.music=.1;
  assert.equal(preview.persisted(s).quality,"medium"); assert.equal(preview.persisted(s).music,.1);
  s=preview.revert(s); assert.equal(s.quality,"medium"); assert.equal(s.scale,1); assert.equal(s.music,.1);
  preview.stage(s,{shadows:"off"}); s=preview.apply(s,500); preview.keep();
  assert.equal(s.quality,"custom"); assert.equal(preview.persisted(s).shadows,"off"); assert.equal(preview.baseline,null);
});
test("Settings export validation and category reset do not modify story saves or other categories", () => {
  const data=new Map(), store=new SaveStore({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
  store.writeGame(newGame("hard")); const save=store.get("save");
  let s=validateSettings({music:.1,master:.2,sensitivity:2,quality:"custom",shadows:"off"});
  s=resetCategory(s,"audio"); assert.equal(s.music,DEFAULT_SETTINGS.music); assert.equal(s.sensitivity,2); assert.equal(s.shadows,"off");
  const imported=importPreferences(JSON.stringify({type:"last-vehicle-settings",version:1,settings:s}));
  store.writeSettings(imported); assert.equal(store.get("save"),save);
  assert.throws(()=>importPreferences(JSON.stringify(newGame()))); assert.throws(()=>importPreferences("x".repeat(65537)));
  assert.ok(GRAPHICS_KEYS.includes("adaptive"));
});
test("Gameplay telemetry has a bounded rolling window and computes a defined 1% low", () => {
  const stats=new FrameStats();
  for(let i=0;i<990;i++) stats.push(10);
  for(let i=0;i<10;i++) stats.push(100);
  const s=stats.summary(); assert.equal(s.count,1000); assert.equal(s.low1,10); assert.equal(s.worst,100);
  // A pause records no sample and therefore cannot appear as a giant frame.
  const before=stats.summary(); assert.deepEqual(stats.summary(),before);
  for(let i=0;i<3500;i++)stats.push(10);
  assert.equal(stats.summary().worst,10); assert.ok(stats.summary().count<=3000);
  stats.reset(); assert.equal(stats.summary().fps,0);
  const small=new FrameStats(3); [10,20,30,40].forEach(n=>small.push(n)); assert.deepEqual(small.samples(),[20,30,40]);
});
test("Adaptive resolution ignores CPU stalls and missing GPU timers, respects its floor, and recovers slowly", () => {
  const a=new AdaptiveScale();
  for(let i=0;i<500;i++)a.tick(.1,null,3,16.7,.65);
  assert.equal(a.factor,1); assert.equal(a.gpuAvailable,false);
  for(let i=0;i<500;i++)a.tick(.1,25,23,16.7,.65);
  assert.equal(a.factor,1,"CPU-bound frames do not lower render scale");
  for(let i=0;i<500;i++)a.tick(.1,25,3,16.7,.65);
  assert.equal(a.factor,.65);
  for(let i=0;i<61;i++)a.tick(.1,5,3,16.7,.65);
  assert.ok(Math.abs(a.factor-.675)<1e-9);
  a.reset(); assert.equal(a.factor,1);
});
test("Cinematic tween timing agrees at 30, 60, 120 and 144 FPS and survives a pause", () => {
  const samples=[];
  for(const fps of [30,60,120,144]) {
    const animator=new Animator(); let value=0,done=0;
    animator.to("gate",0,1,2,v=>value=v,()=>done++,"cinematic");
    for(let i=0;i<fps;i++)animator.tick(1/fps);
    samples.push(value); assert.equal(done,0);
    const paused=value; animator.tick(0); assert.equal(value,paused);
    for(let i=0;i<fps+1;i++)animator.tick(1/fps);
    assert.equal(value,1); assert.equal(done,1);
  }
  for(const n of samples)assert.ok(Math.abs(n-.5)<1e-9);
});
test("Studio intro uses a three-second completion promise and remains skippable", async () => {
  assert.equal(INTRO_MS,3000); assert.deepEqual(introFrames().map(f=>f.offset),[0,.15,.85,1]);
  assert.ok(introFrames(true).every(f=>f.transform==="none"));
  globalThis.document={addEventListener(){},removeEventListener(){}};
  let hidden=true,finish,cancelled=false,duration;
  const element={classList:{remove(){hidden=false;},add(){hidden=true;}},setAttribute(){}};
  const button={focus(){}};
  const content={animate(_frames,options){duration=options.duration;return {finished:new Promise(r=>finish=r),cancel(){cancelled=true;},play(){},pause(){}};}};
  const first=playIntro(element,content,button); assert.equal(hidden,false); assert.equal(duration,3000);
  finish(); await first; assert.equal(hidden,true); assert.equal(cancelled,true);
  const second=playIntro(element,content,button); button.onclick(); await second; assert.equal(hidden,true);
});
test("Foot contacts follow clip phase without a false step on transition or pause", () => {
  const foot=new FootfallTracker(); foot.reset();
  assert.equal(foot.sample("Walk",0,0,100),false);
  assert.equal(foot.sample("Walk",18,0,100),true);
  assert.equal(foot.sample("Walk",19,0,100),false);
  assert.equal(foot.sample("Walk",68,0,100),true);
  assert.equal(foot.sample("Run",63,0,100),false);
  foot.reset(); assert.equal(foot.sample("Run",0,0,100),false);
  assert.equal(foot.sample("Run",9,0,100),true);assert.equal(foot.sample("Run",59,0,100),true);
  assert.equal(foot.sample("Idle",0,0,100),false);
  // Holding a one-shot phase (pause or a slow renderer) must not repeat its
  // contact cue. Returning to phase zero rearms the next physical action.
  for(const [clip,contact] of [["Backstep",72],["TurnLeft",76],["TurnRight",76],["Brake",32]]){
    assert.equal(foot.sample(clip,0,0,100),false);
    assert.equal(foot.sample(clip,contact-1,0,100),false);
    assert.equal(foot.sample(clip,contact,0,100),true);
    assert.equal(foot.sample(clip,contact,0,100),false);
    assert.equal(foot.sample(clip,100,0,100),false);
    assert.equal(foot.sample(clip,0,0,100),false);
    assert.equal(foot.sample(clip,contact+1,0,100),true);
  }
});

test("Quiet journal migration keeps existing graphics and key choices", () => {
  const old=validateSettings({quality:"high",hintReminders:true,tutorial:true,bindings:{journal:"KeyN"}});
  assert.equal(old.quality,"high"); assert.equal(old.shadows,"high");
  assert.equal(old.bindings.journal,"KeyN"); assert.equal(old.hintReminders,false);
  assert.equal(old.objectiveHUD,true); assert.equal(old.journalNotify,false);
  const chosen=validateSettings({...old,objectiveHUD:true,journalNotify:true});
  assert.equal(chosen.objectiveHUD,true); assert.equal(chosen.journalNotify,true);
  assert.equal(validateSettings({}).quality,"low");
});
test("A 60 FPS cap tolerates refresh jitter without repeatedly skipping alternate frames", () => {
  const interval=1000/60; let deadline=0,frames=0;
  for(let i=1;i<=600;i++) {
    const now=i*interval+(i%2 ? -.35 : .35);
    if(now<deadline-1.5)continue;
    deadline=nextFrameDeadline(deadline,now,interval); frames++;
  }
  assert.equal(frames,600);
  assert.equal(nextFrameDeadline(100,600,interval),600+interval,"no catch-up render debt after a stall");
});
test("Hitch records are bounded and separate CPU work from elapsed frame intervals", () => {
  const h=new HitchRecorder();
  h.begin(0);h.section("renderSubmission",2);h.finish(16,{},3);
  assert.equal(h.events.length,0);
  h.begin(100);h.section("renderSubmission",102);h.finish(110,{flashlight:true},104);
  const e=h.report().recentEvents[0];assert.equal(e.intervalMs,110);assert.equal(e.workMs,4);
  assert.equal(e.sections.renderSubmission,2);
  for(let n=0;n<100;n++)h.record({type:"save",durationMs:n});
  assert.equal(h.report().recentEvents.length,40);assert.equal(h.events[0].durationMs,60);
});
