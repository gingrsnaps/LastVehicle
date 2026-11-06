import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A bounded DOM/event facade + the actual Babylon NullEngine. This exercises
// the real Game/Player/UI transition and frame path, not a browser permission UI.
function events(target = {}) {
  const handlers = new Map();
  target.addEventListener = (name, fn) => { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(fn); };
  target.removeEventListener = (name, fn) => { handlers.set(name, (handlers.get(name) || []).filter(f=>f!==fn)); };
  target.fire = (name, event = {}) => { for (const fn of handlers.get(name) || []) fn(event); };
  return target;
}
const nodes = new Map();
class Element {
  constructor(tag = "div", attrs = "") {
    this.tagName = tag.toUpperCase(); this.dataset = {}; this.style = {setProperty(){}};
    this.value = ""; this.textContent = ""; this.children = []; this.owned = [];
    this.classes = new Set();
    this.classList = { add:(...xs)=>xs.forEach(x=>this.classes.add(x)), remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)), toggle:(x,on)=>on === false ? this.classes.delete(x) : this.classes.add(x) };
    for (const [, key, value] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (key === "id") { this.id=value; nodes.set(value,this); }
      if (key.startsWith("data-")) this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = value;
      if (["type","value"].includes(key)) this[key] = value;
    }
    events(this);
  }
  set innerHTML(html) {
    for (const id of this.owned) nodes.delete(id);
    this.owned = []; this.children = []; this.html = html;
    for (const [,tag,attrs] of html.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)) {
      const el = new Element(tag,attrs); this.children.push(el); if(el.id) this.owned.push(el.id);
    }
  }
  get innerHTML(){return this.html || "";}
  focus(){document.activeElement=this;}
  click(){this.onclick?.();this.fire("click");}
  setAttribute(){}
  getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:1280,height:720};}
  querySelector(){return new Element("span");}
  querySelectorAll(query){
    const data=query.match(/\[data-([a-z-]+)\]/);
    if(data)return this.children.filter(e=>e.dataset[data[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined);
    if(query==='button:not(:disabled),input,select,a[href]')return this.children.filter(e=>['BUTTON','INPUT','SELECT','A'].includes(e.tagName)&&!e.disabled);
    return [];
  }
}
globalThis.document = events({ getElementById:id=>nodes.get(id)||null, documentElement:new Element("html"), hasFocus:()=>true,
  pointerLockElement:null, exitPointerLock(){this.pointerLockElement=null;this.fire("pointerlockchange");} });
globalThis.window = events({ innerWidth:1280, innerHeight:720, devicePixelRatio:1, location:{href:"https://example.test/"},
  localStorage:{ data:new Map(), getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);} } });
window.self=window; window.top=window;
globalThis.matchMedia = ()=>({matches:false});
const html=fs.readFileSync(new URL("../dist/index.html",import.meta.url),"utf8");
for(const [,tag,attrs] of html.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)) new Element(tag,attrs);
globalThis.OffscreenCanvas = class {
  constructor(w,h){this.width=w;this.height=h;}
  getContext(){return {fillRect(){},fillText(){},clearRect(){},measureText(){return {width:30};},canvas:this};}
};
document.createElement=tag=>tag==="canvas" ? new OffscreenCanvas(512,512) : new Element(tag);
await import("../dist/vendor/babylon.js");
const {AudioMixer}=await import("../dist/js/audio.js");
const {wireAudio}=await import("./audio-fixture.js");
const {Game}=await import("../dist/js/game.js");
const {World}=await import("../dist/js/world.js");
const {Player}=await import("../dist/js/player.js");
const {Threat}=await import("../dist/js/threat.js");
const {has}=await import("../dist/js/state.js");

test("Real startup, rejected capture, moving frames, note reading, checkpoint continue and ending", async()=>{
  const g=new Game();
  g.engine=new BABYLON.NullEngine(); g.world=new World(g.engine); g.threat=new Threat(g.world.rects,"medium",g.world.stage.spots);
  g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a),(s,m)=>g.handleCapture(s,m));
  g.audio={failures:[],stop(){},apply(){},unlock:async()=>true,startAmbience(){},setPaused(){},setTension(){},resume(){},play(){return null;},footstep(){},updateListener(){},suspend(){}};
  g.bindEvents();
  await g.start(false,"easy");
  assert.equal(g.ui.overlay,"journal"); assert.equal(g.ui.journalTab,"controls");
  assert.equal(g.state.journal.controlsSeen,true);
  nodes.get("journal-resume").onclick();
  assert.equal(g.ui.overlay,"capture"); assert.equal(g.playing,false);
  g.canvas.requestPointerLock=()=>{throw new Error("Denied by test host");};
  nodes.get("capture-retry").onclick();
  assert.equal(g.playing,false); assert.equal(g.ui.overlay,"capture");
  nodes.get("capture-drag").onclick();
  assert.equal(g.playing,true); assert.equal(g.player.captureMode,"drag"); assert.equal(g.ui.overlay,null);
  const before=g.player.pos.z;
  g.player.keys.add(g.settings.bindings.forward);
  const frames=n=>{for(let i=0;i<n;i++){g.lastTime=performance.now()-16.7;g.nextRender=0;g.frame();}};
  frames(90); assert.ok(g.player.pos.z<before-2);
  g.player.clear();
  g.interact("car"); frames(40);
  assert.equal(has(g.state,"car"),true);
  assert.equal(g.playing,true,"pickup preview must not pause the game");
  g.action("journal"); assert.equal(g.playing,false);
  g.ui.note("notice",true); nodes.get("put-down").onclick(); assert.equal(g.ui.overlay,"journal");
  g.ui.back(); assert.equal(g.ui.overlay,"pause");
  nodes.get("resume").onclick(); assert.equal(g.playing,true);
  g.save(false); g.toMenu(); await g.start(true);
  assert.equal(has(g.state,"car"),true); assert.equal(g.state.difficulty,"easy");
  nodes.get("capture-drag").onclick(); frames(2);
  assert.equal(g.playing,true); assert.ok(g.stats.count);
  assert.doesNotThrow(()=>g.ui.map()); assert.equal(g.ui.overlay,"journal");
  g.resume("drag");
  // Exercise actual UI puzzle buttons and animations all the way to the ending.
  g.audio=wireAudio(new AudioMixer(),true,["tool-handling","switch","metal","door-open","lock-turn"]);
  g.interact("battery"); frames(20);
  const pickupPhase=g.world.visuals.actionPhase;g.pause();frames(20);assert.equal(g.world.visuals.actionPhase,pickupPhase);
  g.resume("drag");frames(56);assert.equal(has(g.state,"battery"),true);assert.equal(g.audio.faultCount,0);
  assert.ok([...g.audio.voices].some(v=>v.name==="tool-handling"&&Number.isFinite(v.position.x))); g.interact("key"); frames(35); g.interact("fuse"); frames(55);
  g.interact("repair"); frames(135);
  g.interact("power");
  for(const button of nodes.get("panel").querySelectorAll("[data-circuit]")){button.onclick();frames(32);}
  assert.equal(g.playing,true);
  g.interact("terminal"); nodes.get("pin").value="1986";
  nodes.get("panel").querySelectorAll("[data-digit]").find(b=>b.dataset.digit==="ENTER").onclick();
  g.interact("gate"); frames(150);
  g.player.pos={x:0,z:0}; frames(1);
  assert.equal(has(g.state,"escaped"),false,"walking through the gate is not the ending");
  g.interact('yard');frames(55);g.interact('isolate');nodes.get('loading-off').onclick();nodes.get('gatehouse-on').onclick();
  g.interact('barrier');frames(175);g.interact('route');frames(200);
  assert.equal(has(g.state,'route'),true);
  g.player.pos={x:13.67,z:74.9};g.player.updateCamera();
  g.world.camera.setTarget(g.world.interactives.find(i=>i.id==="car").pos);g.world.camera.getViewMatrix(true);
  g.action("interact");assert.equal(g.player.vehicle,true);
  frames(120);const driveTime=g.world.stage.driveTime;
  g.pause();frames(30);assert.equal(g.world.stage.driveTime,driveTime,"escape pauses safely");
  g.resume("drag");frames(180);assert.equal(g.world.stage.car.position.x,13,'no automatic movement without input');
  g.player.keys.add(g.settings.bindings.forward);frames(60);assert.ok(g.world.stage.car.position.x<13);g.player.clear();
  // Full collision-safe route is covered using the real controller in release115.
  // Here exercise the production ending transition at the physical finish line.
  g.world.stage.vehicle.reset({x:0,z:-95,yaw:Math.PI});frames(100);
  assert.equal(has(g.state,"escaped"),true);assert.equal(g.ui.overlay,"ending");
  assert.ok(g.world.stage.car.position.z<-94);
  g.engine.dispose();
});

test("Actual settings controls apply/keep/revert graphics, preserve live audio, and time out safely", () => {
  const g=new Game();
  g.engine=new BABYLON.NullEngine(); g.world=new World(g.engine); g.threat=new Threat(g.world.rects,"medium",g.world.stage.spots);
  g.player=new Player(g.world,g.canvas,g.settings,()=>{});
  g.settings.quality="medium"; g.settings.shadows="medium"; g.settings.glow=true; g.settings.fxaa=false;
  const set=(key,value)=>{const el=nodes.get("set-"+key);assert.ok(el,key);el.value=String(value);el.checked=!!value;el.oninput();};
  for(const tab of ["basics","gameplay","display","performance","audio","comfort","controls"]) assert.doesNotThrow(()=>g.ui.settings(tab));
  g.ui.settings("display"); set("quality","high");
  assert.equal(g.settings.quality,"medium"); assert.equal(g.graphics.draft.shadows,"high");
  nodes.get("graphics-apply").fire("click"); assert.equal(g.settings.quality,"high"); assert.ok(g.world.fxaa);
  assert.equal(g.store.readSettings().quality,"medium","preview is never persisted");
  g.ui.settings("audio"); set("music",.15);
  nodes.get("graphics-revert").fire("click");
  assert.equal(g.settings.quality,"medium"); assert.equal(g.settings.music,.15); assert.equal(g.world.fxaa,null);
  g.ui.settings("display"); set("quality","high"); nodes.get("graphics-apply").fire("click"); nodes.get("graphics-keep").fire("click");
  assert.equal(g.store.readSettings().quality,"high");
  set("scale",.7); nodes.get("graphics-apply").fire("click");
  g.ui.tick(g.graphics.deadline+1); assert.equal(g.settings.scale,1); assert.equal(g.graphics.baseline,null);
  set("scale",.5); nodes.get("graphics-apply").fire("click"); g.ui.back();
  assert.equal(g.settings.scale,1); assert.equal(g.graphics.draft,null);
  g.ui.settings("controls"); set("mouseMode","raw"); set("separateAxes",true); set("sensitivityY",1.8);
  assert.equal(g.store.readSettings().mouseMode,"raw"); assert.equal(g.store.readSettings().sensitivityY,1.8);
  g.ui.settings("performance"); set("fpsMode","detailed");
  g.stats.push(16.7); assert.doesNotThrow(()=>g.ui.performanceOverlay(g.stats.summary()));
  assert.match(nodes.get("fps-text").textContent,/1% low/);
  const camera=g.world.camera.position.clone();
  g.ui.settings("basics");nodes.get("contrast-preview").fire("click");
  assert.equal(g.ui.overlay,"contrast");nodes.get("contrast-toggle").onclick();assert.equal(g.previewBeam,true);
  nodes.get("contrast-brightness").value="0.85";nodes.get("contrast-brightness").oninput();
  assert.equal(g.store.readSettings().brightness,.85);nodes.get("contrast-done").onclick();
  assert.equal(g.ui.overlay,"settings");assert.ok(g.world.camera.position.equals(camera));
  assert.equal(g.world.flash.intensity,0);
  g.ui.hide(); g.engine.dispose();
});

test('Denied controller access survives real moving frames and graphics loss preserves the checkpoint',async()=>{
 const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);g.threat=new Threat(g.world.rects,'medium',g.world.stage.spots);
 g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a));
 g.audio=wireAudio(new AudioMixer(),true,[]);g.audio.apply=()=>{};await g.start(false,'medium');g.resume('drag');
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let calls=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads(){calls++;throw new DOMException('host denies controllers','SecurityError');}}});
 try{
  g.settings.controllerEnabled=false;g.player.keys.add(g.settings.bindings.forward);const before=g.player.pos.z;
  const frames=n=>{for(let i=0;i<n;i++){g.lastTime=performance.now()-16.7;g.nextRender=0;g.frame();}};
  frames(30);assert.equal(calls,0);assert.ok(g.player.pos.z<before);
  g.settings.controllerEnabled=true;frames(30);assert.equal(calls,1);assert.equal(g.playing,true);assert.equal(!!g.renderFault,false);
  g.settings.objectiveMode='request';g.action('objective');assert.equal(nodes.get('objective-block').classes.has('hidden'),false);
  g.objectiveSeconds=0;g.refreshObjectiveVisibility();assert.equal(nodes.get('objective-block').classes.has('hidden'),true);
  g.settings.objectiveMode='always';g.refreshObjectiveVisibility();assert.equal(nodes.get('objective-block').classes.has('hidden'),false);
  g.player.keys.clear();g.action('throw');assert.equal(g.state.bolts,2);assert.equal(g.store.readGame().bolts,2);
  g.state.flags=['car'];g.save(false);g.loadingReady=true;g.bindGraphicsRecovery();
  g.engine.onContextLostObservable.notifyObservers(g.engine);assert.equal(g.contextLost,true);assert.equal(g.playing,false);assert.equal(g.ui.overlay,'recovery');
  assert.deepEqual(g.store.readGame().flags,['car']);assert.ok(g.store.get('lastCrash'));
  g.engine.onContextRestoredObservable.notifyObservers(g.engine);assert.equal(g.playing,false,'restore cannot silently resume half-prepared state');
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;g.engine.dispose();}
});

test("Journal task, hints, evidence and map use real handlers and persist without advancing tasks", async () => {
  const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);g.threat=new Threat(g.world.rects,"medium",g.world.stage.spots);
  g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a));
  g.started=true; g.playing=true;g.state.notes.push("notice");
  const flags=[...g.state.flags];g.requestHint();
  assert.equal(g.ui.overlay,"journal");assert.equal(g.ui.journalTab,"hints");assert.equal(g.playing,false);
  assert.equal(g.state.journal.hints.car,undefined);assert.ok(!nodes.get("panel").innerHTML.includes("Approach the driver's side"));
  nodes.get("journal-reveal").fire("click");assert.equal(g.state.journal.hints.car,1);
  nodes.get("journal-reveal").fire("click");nodes.get("journal-reveal").fire("click");
  assert.equal(g.state.journal.hints.car,3);assert.equal(g.store.readGame().journal.hints.car,3);
  g.ui.journal("notes");nodes.get("panel").querySelectorAll("[data-note]")[0].onclick();
  assert.deepEqual(g.state.journal.readNotes,["notice"]);nodes.get("put-down").onclick();assert.equal(g.ui.journalTab,"notes");
  g.ui.journal("map");nodes.get("journal-marker").fire("click");assert.equal(g.guidance.markerSeconds,60);
  assert.deepEqual(g.state.flags,flags);g.ui.hide();g.engine.dispose();
});


test("Locker entry hides the flashlight, prevents movement, supports pause, and exits with the same interaction",()=>{
  const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);
  g.threat=new Threat(g.world.rects,"medium",g.world.stage.spots);
  g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a));
  g.audio={play(){},resume(){},setPaused(){},setTension(){}};g.started=true;g.playing=true;
  const spot=g.world.stage.spots[0];g.player.pos={...spot.entry};g.player.updateCamera();
  const before={...g.player.pos};g.player.flashlight=true;g.interact(spot.id);
  assert.equal(g.player.hiding,null);assert.equal(g.player.flashlight,false);
  g.world.visuals.animator.tick(.3);assert.equal(g.player.hiding,null,"reach precedes entering");
  const doorAngle=spot.door.rotation.y;g.pause();g.world.visuals.tick(.5,0,g.player,false);assert.equal(spot.door.rotation.y,doorAngle);
  g.resume("drag");g.world.visuals.animator.tick(.66);
  assert.equal(g.player.hiding.id,spot.id);
  assert.equal(g.threat.mode,"dormant");
  g.player.keys.add(g.settings.bindings.forward);g.player.tick(.1);
  assert.deepEqual(g.player.pos,{x:spot.x,z:spot.z});
  g.pause();assert.equal(g.playing,false);assert.equal(g.player.hiding.id,spot.id);
  g.resume("drag");g.action("interact");g.world.visuals.animator.tick(1);assert.equal(g.player.hiding?.id,undefined);
  assert.deepEqual(g.player.pos,before);g.engine.dispose();
});

test("Production story encounters pause, commit once, restore, and show the attack before the retry panel",async()=>{
  const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);g.threat=new Threat(g.world.rects,"medium",g.world.stage.spots);
  g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a),(s,m)=>g.handleCapture(s,m));
  g.audio={failures:[],stop(){},apply(){},unlock:async()=>true,startAmbience(){},setPaused(){},setTension(){},resume(){},play(){return null;},footstep(){},updateListener(){},suspend(){}};
  await g.start(false,"medium");g.resume("drag");
  const frames=n=>{for(let i=0;i<n;i++){g.lastTime=performance.now()-16.7;g.nextRender=0;g.frame();}};
  const pose=(x,z,yaw=0,pitch=0)=>{g.player.pos={x,z};g.player.yaw=g.player.targetYaw=yaw;g.player.pitch=g.player.targetPitch=pitch;g.player.updateCamera();};
  g.state.flags=["car","battery"];g.world.sync(g.state);
  pose(-23.4,19.3,Math.PI,.23);g.action("interact");frames(35);
  assert.equal(has(g.state,"key"),true);assert.equal(g.world.atmosphere.securityActive,true,'key starts the reveal without a three-second recovery');
  const before=g.world.atmosphere.securityPhase;g.pause();frames(30);assert.equal(g.world.atmosphere.securityPhase,before);
  g.resume("drag");frames(50);assert.ok(g.state.scares.includes("securityBreach"));assert.equal(g.state.scares.filter(id=>id==='securityBreach').length,1);
  pose(-25.2,76,-Math.PI/2,.13);g.director.quiet=0;g.action("interact");frames(100);
  assert.equal(has(g.state,"fuse"),true);
  // The creature must physically arrive at the entrance before the impact.
  g.threat.pos={x:-14.2,z:76};g.threat.mode="investigate";g.threat.yaw=-Math.PI/2;g.threat.grace=4;
  g.threat.lastKnown={x:-23,z:76};g.threat.destination={x:-23,z:76};g.threat.mover.reset();
  pose(-23,76,Math.PI/2);g.director.quiet=0;g.creatureScenes.cooldown=0;frames(450);
  assert.ok(g.state.scares.includes("workshopBreach"));
  pose(9,78,Math.PI/2,.2);g.interact("repair");frames(135);assert.equal(has(g.state,"repair"),true);
  pose(25,39,Math.PI/2);g.director.quiet=0;g.interact("power");
  for(const button of nodes.get("panel").querySelectorAll("[data-circuit]")){button.onclick();frames(32);}
  g.threat.pos={x:15,z:39};g.threat.mode="investigate";g.threat.grace=4;g.threat.yaw=Math.PI/2;
  g.threat.lastKnown={x:25,z:39};g.threat.destination={x:25,z:39};g.threat.mover.reset();
  pose(25,39,-Math.PI/2);g.director.quiet=0;g.creatureScenes.cooldown=0;frames(420);assert.equal(has(g.state,"power"),true);assert.ok(g.state.scares.includes("powerSurge"));assert.equal(g.world.atmosphere.emergencyMode,true);
  const saved=g.store.readGame();for(const id of ["securityBreach","workshopBreach","powerSurge"])assert.equal(saved.scares.filter(x=>x===id).length,1);
  // A real controller attack reaches the production capture path. The impact
  // is allowed to finish for .42s before the retry dialog pauses the scene.
  pose(24,40);g.threat.pos={x:24,z:40.9};g.threat.mode="chase";g.threat.yaw=Math.PI;g.threat.suspicion=1;g.threat.grace=0;g.threat.senseClock=0;g.threat.memory=g.threat.rules.memory;
  frames(1);assert.equal(g.threat.mode,"attack");assert.equal(g.ui.overlay,null);
  for(let i=0;i<120&&g.captureTime===null;i++)frames(1);
  assert.ok(g.captureTime>0);assert.equal(g.playing,true);assert.equal(g.player.movementLocked,true);
  frames(30);assert.equal(g.ui.overlay,"caught");assert.equal(g.playing,false);
  g.engine.dispose();
});


test("Runtime recovery preserves the last good checkpoint and reloads instead of resuming a faulty scene",()=>{
  const g=new Game();g.engine=new BABYLON.NullEngine();g.started=true;g.settings.sensitivity=1.7;
  g.state.flags=["car"];g.save(false);
  g.state.flags.push("battery"); // Simulate work interrupted before its next save.
  let reloads=0;const original=window.location.reload;window.location.reload=()=>reloads++;
  g.ui.recovery(new Error("injected render failure"));
  assert.equal(g.renderFault,true);assert.equal(g.playing,false);
  assert.deepEqual(g.store.readGame().flags,["car"]);assert.match(g.recoveryLog.error.stack,/injected render failure/);
  nodes.get("recover-play").onclick();
  assert.equal(reloads,1);assert.deepEqual(g.store.readGame().flags,["car"]);
  assert.equal(g.store.readSettings().sensitivity,1.7);
  window.location.reload=original;g.engine.dispose();
});

test('Expanded settings search, comfort preset, recap and controller-disconnect recovery use real handlers',async()=>{
 const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);g.threat=new Threat(g.world.rects,'medium',g.world.stage.spots);
 g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a));
 g.audio={failures:[],stop(){},apply(){},unlock:async()=>true,startAmbience(){},setPaused(){},setTension(){},resume(){},play(){return null;},footstep(){},updateListener(){},suspend(){}};
 await g.start(false,'easy');g.ui.settings('controls');
 const enabled=nodes.get('set-controllerEnabled');enabled.checked=true;enabled.oninput();assert.equal(g.store.readSettings().controllerEnabled,true);
 const search=nodes.get('settings-search');search.value='deadzone';search.oninput();
 const found=nodes.get('settings-results').querySelectorAll('[data-found]');assert.ok(found.length);found[0].onclick();assert.equal(document.activeElement.id,'set-controllerDeadzone');
 g.ui.settings('comfort');nodes.get('comfort-preset').fire('click');assert.equal(g.settings.cameraShake,0);assert.equal(g.settings.reducedFlashes,true);assert.equal(g.settings.scareScreenEffects,0);
 const originalNavigator=globalThis.navigator;let pads=[{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
 try{
  g.pollController(100);g.resume('controller');assert.equal(g.playing,true);assert.equal(g.player.captureMode,'controller');
  pads[0].axes[1]=-1;g.pollController(120);g.player.tick(.05);assert.ok(g.player.padMove.y<0);
  pads=[];g.pollController(140);assert.equal(g.playing,false);assert.equal(g.ui.overlay,'pause');assert.deepEqual(g.player.padMove,{x:0,y:0});
  pads=[{connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false}))}];g.pollController(160);
  g.player.captureMode='locked';nodes.get('resume').focus();pads[0].buttons[0].pressed=true;g.pollController(180);
  assert.equal(g.playing,true);assert.equal(g.player.captureMode,'controller','pad A never attempts browser mouse permission');
  g.save(false);g.toMenu();assert.match(nodes.get('continue-summary').innerHTML,/Inspect your car/);
 }finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:originalNavigator});g.engine.dispose();}
});


test('Preparation faults export their stage and missing assets; context restoration cannot resume an interrupted boot',()=>{
 const g=new Game();g.engine=new BABYLON.NullEngine();g.loadingProgress('Preparing surfaces',.43);
 g.world={failedAssets:['textures/missing.jpg'],assetHealth:{textures:{'missing.jpg':{state:'failed',attempts:2}}},surfaceLibrary:{report:{missingMaterials:['concrete']}}};
 g.loadingFailed(new Error('Required surface textures could not load: concrete'));
 assert.equal(g.loadingReady,false);assert.equal(g.bootInterrupted,true);assert.equal(g.renderFault,true);assert.match(nodes.get('load-label').textContent,/concrete/);
 const saved=JSON.parse(g.store.get('lastCrash'));assert.equal(saved.stage,'Preparing surfaces');assert.deepEqual(saved.failedAssets,['textures/missing.jpg']);
 let downloads=0;g.ui.downloadDiagnostics=()=>downloads++;nodes.get('load-report').onclick();assert.equal(downloads,1);
 const report=g.ui.diagnostics();assert.equal(report.assetHealth.textures['missing.jpg'].state,'failed');assert.deepEqual(report.surfaceCoverage.missingMaterials,['concrete']);
 g.bindGraphicsRecovery();g.engine.onContextRestoredObservable.notifyObservers(g.engine);
 assert.equal(g.contextLost,false);assert.throws(()=>g.loadingProgress('Ready',1),/interrupted/);assert.equal(g.loadingReady,false);
 g.engine.dispose();
});

test('Exterior chapter follows the visible guide and completes through real E actions and puzzle buttons on all difficulties',async()=>{
 // Same production DOM/Game/Player facade as startup, now with every shipped
 // static GLB. Following the marker must work; tests must not aim at an invisible
 // item coordinate or call interact(id) to bypass the actual reach test.
 await import('../dist/vendor/babylonjs.loaders.min.js');
 const {GuideRoute}=await import('../dist/js/wayfinding.js?v=1.19.0');
 const {currentTask}=await import('../dist/js/tasks.js?v=1.19.0');
 const {newGame,FLAG_IDS}=await import('../dist/js/state.js?v=1.19.0');
 const {Guidance}=await import('../dist/js/guidance.js?v=1.19.0');
 const {moveCircle,lineClear}=await import('../dist/js/navigation.js?v=1.19.0');
 const g=new Game();g.engine=new BABYLON.NullEngine();g.world=new World(g.engine);
 const loader=BABYLON.SceneLoader.LoadAssetContainerAsync;
 BABYLON.SceneLoader.LoadAssetContainerAsync=async(base,file,scene)=>BABYLON.LoadAssetContainerAsync(new Uint8Array(fs.readFileSync(new URL('../dist/'+base+file,import.meta.url))),scene,{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}});
 try{await g.world.loadAssets();}finally{BABYLON.SceneLoader.LoadAssetContainerAsync=loader;}
 g.threat=new Threat(g.world.rects);g.player=new Player(g.world,g.canvas,g.settings,a=>g.action(a));g.settings.mouseMode='drag';
 g.audio={play(){},setPaused(){},resume(){}};g.scare=()=>{};
 try{for(const difficulty of ['easy','medium','hard']){
  g.state={...newGame(),difficulty,flags:FLAG_IDS.slice(0,FLAG_IDS.indexOf('yard'))};g.guidance=new Guidance(g.state);
  g.world.sync(g.state,true);g.pendingAction=null;g.started=g.playing=g.player.active=true;g.runToken++;
  g.player.pos={x:0,z:8};g.player.clear();
  for(const id of ['yard','isolate','barrier','route']){
   assert.equal(currentTask(g.state).id,id);
   const guide=new GuideRoute(g.world.rects);guide.request(currentTask(g.state),g.world.interactives,g.player.pos);
   let marker=null;
   for(let i=0;i<3600;i++){
    const m=guide.tick(g.player.pos,1/30);if(!m)continue;
    if(m.kind==='object'){marker=m;break;}
    assert.ok(lineClear(g.player.pos,m.point,g.world.rects,.3));
    const dx=m.point.x-g.player.pos.x,dz=m.point.z-g.player.pos.z,d=Math.hypot(dx,dz),step=Math.min(d,2.95/30);
    if(d)moveCircle(g.player.pos,dx/d*step,dz/d*step,g.world.rects,.3);
   }
   assert.ok(marker,id+' visible object marker');
   const dx=marker.point.x-g.player.pos.x,dz=marker.point.z-g.player.pos.z;
   g.player.yaw=g.player.targetYaw=Math.atan2(dx,dz);g.player.pitch=g.player.targetPitch=Math.atan2(g.player.height-marker.point.y,Math.hypot(dx,dz));
   g.player.updateCamera();g.player.focus.reset();
   assert.equal(g.player.interactionHint(x=>g.getAvailability(x))?.item.id,id);
   g.action('interact');
   if(id==='isolate'){
    assert.equal(g.ui.overlay,'yard-power');
    nodes.get('gatehouse-on').onclick();assert.equal(has(g.state,'isolate'),false,'wrong sequence is recoverable');
    nodes.get('loading-off').onclick();nodes.get('gatehouse-on').onclick();
   }else{
    assert.equal(g.pendingAction?.id,id);
    for(let i=0;i<120&&g.pendingAction;i++)g.world.visuals.animator.tick(1/30);
   }
   assert.equal(has(g.state,id),true,difficulty+' '+id+' completes');
  }
  assert.equal(g.world.yard.barrierRect.enabled,false);assert.equal(g.world.yard.dollyRect.x,-20);
  assert.equal(currentTask(g.state).id,'escaped');assert.equal(g.threat.patrol.chapter,'return');
 }}finally{g.engine.dispose();}
});
