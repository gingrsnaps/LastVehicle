import test from "node:test";
import assert from "node:assert/strict";
// NullEngine validates real Babylon scene construction without claiming a GPU test.
// Only the 2D text-canvas drawing surface is stubbed; scene/cameras/materials are real.
globalThis.OffscreenCanvas = class {
  constructor(w, h) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return {
      fillRect() {},
      fillText() {},
      clearRect() {},
      measureText() {
        return { width: 30 };
      },
      canvas: this,
    };
  }
};
await import("../dist/vendor/babylon.js");
const { World } = await import("../dist/js/world.js");
const { Player } = await import("../dist/js/player.js");
const { findPath, blocked } = await import("../dist/js/navigation.js");
const { newGame, validateSave, FLAG_IDS } = await import("../dist/js/state.js");
const engine = new BABYLON.NullEngine();
const world = new World(engine);
// Exercise the authored vehicle placement/collision path without network access.
// The fallback art uses primitive meshes; model byte integrity is checked separately.
const originalLoader = BABYLON.SceneLoader.LoadAssetContainerAsync;
const originalWarn = console.warn;
BABYLON.SceneLoader.LoadAssetContainerAsync = async () => {
  throw new Error("offline test");
};
console.warn = () => {};
await world.loadAssets();
BABYLON.SceneLoader.LoadAssetContainerAsync = originalLoader;
console.warn = originalWarn;

test("Scene constructs on pinned Babylon and applies every quality preset", () => {
  for (const quality of ["low", "medium", "high"])
    world.setSettings({
      quality,
      fov: 78,
      brightness: 1.15,
      reducedFlashes: false,
    });
  assert.ok(world.scene.meshes.length > 300);
});
test("Every authored checkpoint is outside solid geometry", () => {
  for (let n = 0; n <= FLAG_IDS.length; n++) {
    const s = validateSave({ ...newGame(), flags: FLAG_IDS.slice(0, n) });
    world.sync(s);
    assert.equal(
      blocked(s.checkpoint.x, s.checkpoint.z, world.rects, 0.3),
      false,
      "prefix " + n,
    );
  }
});
test("All objective areas connect through actual authored doorways", () => {
  world.sync(newGame());
  const points = [
    { x: 10, z: 98 },
    { x: 8, z: 73 },
    { x: -23, z: 20 },
    { x: -26, z: 76 },
    { x: 26, z: 39 },
    { x: 25, z: 98 },
    { x: -15, z: 79 },
    { x: -4, z: 7 },
  ];
  for (let i = 1; i < points.length; i++)
    assert.ok(
      findPath(points[i - 1], points[i], world.rects).length > 0,
      "route " + i,
    );
});
test("Closed grille blocks workshop only; opening exit clears gate collision", () => {
  const s = newGame();
  world.sync(s);
  assert.equal(world.grilleRect.enabled, false);
  world.visuals.setGrille(1);
  assert.equal(world.grilleRect.enabled, true);
  s.flags = FLAG_IDS.slice(0, 8);
  world.sync(s);
  assert.equal(world.grilleRect.enabled, false,"loading restores temporary barriers");
  assert.equal(world.exitRect.enabled, false);
});

test("Wayfinding labels keep their proportions and sit on doorway headers",()=>{
  const labels=world.scene.meshes.filter(m=>m.name.startsWith("sign "));
  assert.ok(labels.length>15);
  for(const label of labels){
    const box=label.getBoundingInfo().boundingBox.extendSize,size=label.material.diffuseTexture.getSize();
    assert.ok(Math.abs(size.width/size.height-box.x/box.y)<.12,label.name);
    assert.equal(label.material.backFaceCulling,true);
  }
  for(const name of ["SECURITY","STORAGE","WORKSHOP","ELECTRICAL","PUMP ROOM"]){
    const label=labels.find(m=>m.name.includes(name)&&Math.abs(Math.abs(m.position.x)-16.72)<.02);
    assert.ok(label,name);assert.equal(label.position.y,3.7);
  }
});

test("Static batching preserves dynamic actors and substantially reduces mesh count", () => {
  const before = world.scene.meshes.length,
    actorCount = world.worker.getChildMeshes().length;
  world.optimizeStatic();
  assert.ok(world.scene.meshes.length < before * 0.5);
  assert.equal(world.worker.getChildMeshes().length, actorCount);
  assert.equal(world.exitGate.isDisposed(), false);
  world.sync(newGame());
});

test("Every interactive can be aimed at from a reachable approach point", () => {
  world.sync(newGame());
  const approaches = {
    car: [13.67, 74.9],
    "car-passenger": [13.67,81.2],
    battery: [9.6,75.6],
    repair: [9.1,78],
    key: [-23.4, 19.3],
    log: [-24.5, 20.1],
    terminal: [-25, 15.7],
    release: [-28, 25.6],
    incident: [-24, 46.1],
    workorder: [-23, 71.1],
    fuse: [-25.2, 76],
    power: [25, 39],
    valve: [25, 98],
    dispatch: [23, 93.1],
    alarm: [-14.2, 73],
    trap: [-14.2, 79],
    gate: [-4.7, 7.5],
    plaque: [3.35, 6.3],
    van: [-7.3, 98],
  };
  for(const spot of world.stage.spots)approaches[spot.id]=[spot.entry.x,spot.entry.z+.5];
  const player = Object.create(Player.prototype);
  player.world = world;
  for (const [id, [x, z]] of Object.entries(approaches)) {
    assert.equal(
      blocked(x, z, world.rects, 0.29),
      false,
      "approach blocked: " + id,
    );
    player.focus?.reset();
    player.pos = { x, z };
    world.camera.position.set(x, 1.68, z);
    world.camera.setTarget(world.interactives.find((t) => t.id === id).pos);
    world.camera.getViewMatrix(true);
    assert.equal(player.target()?.id, id, "unreachable interaction: " + id);
  }
});

test("Flashlight aims with the camera, lights every quality level, and switches fully off", () => {
  world.sync(newGame());
  for (const quality of ["low", "medium", "high"]) {
    world.setSettings({
      quality,
      fov: 78,
      brightness: 1.15,
      reducedFlashes: false,
    });
    world.camera.rotationQuaternion = null;
    world.camera.rotation.set(0.3, 1.1, 0);
    world.camera.getViewMatrix(true);
    world.scene.onBeforeRenderObservable.notifyObservers(world.scene);
    const ray = world.camera.getForwardRay().direction;
    assert.ok(BABYLON.Vector3.Dot(ray, world.flash.direction) > 0.9999);
    world.visuals.setFlash(true);
    world.visuals.tick(1, 0, null, true);
    assert.ok(world.flash.isEnabled());
    assert.ok(world.flash.intensity > 900);
    assert.ok(world.spill.intensity > 80);
    assert.equal(world.flash.shadowEnabled, quality !== "low");
    assert.ok(world.flash.excludedMeshes.includes(world.visuals.lens));
    world.visuals.setFlash(false);
    world.visuals.tick(1, 0, null, true);
    assert.ok(world.flash.intensity < .01);
  }
});
test("Movable cabinet and gate survive batching; collision changes during gate animation", () => {
  world.sync(newGame());
  assert.equal(world.visuals.cabinetDoor.isDisposed(), false);
  assert.equal(
    world.visuals.hand.getChildMeshes().some((m) => m.isWorldMatrixFrozen),
    false,
  );
  let done = 0;
  world.visuals.action("gate", 1, () => done++);
  world.visuals.animator.tick(0.3);
  assert.ok(world.exitGate.position.y > 1.9 && world.exitGate.position.y < 5.9);
  assert.equal(world.exitRect.enabled, true);
  assert.equal(done, 0);
  world.visuals.animator.tick(0.7);
  assert.equal(world.exitRect.enabled, false);
  assert.equal(done, 1);
  world.sync(newGame());
  assert.equal(world.exitRect.enabled, true);
});
test("Siren path reaches the actual workshop from garage and pump-room approaches", async () => {
  const { Threat } = await import("../dist/js/threat.js");
  world.sync(newGame());
  for (const start of [
    { x: 0, z: 63 },
    { x: 23, z: 98 },
    { x: 2, z: 91 },
  ]) {
    const t = new Threat(world.rects);
    t.pos = { ...start };
    t.lure({x:-24,z:76},90);
    const player = {
      pos: { x: 10, z: 104 },
      hiding: {id:"route-test"}, // isolate route following from visible-player overrides
      crouched: false,
      flashlight: true,
    };
    for (let i = 0; i < 60 * 90 && t.pos.x > -19; i++) t.tick(1 / 60, player);
    assert.ok(t.pos.x < -19, JSON.stringify({ start, stopped: t.pos }));
  }
});

test("Flashlight starts hidden, equips smoothly, reverses cleanly, and is hidden during menus", () => {
  world.sync(newGame());
  world.visuals.setGameplay(true);
  const v = world.visuals;
  v.tick(0.1, 0, null, true);
  assert.equal(v.hand.isEnabled(), false);
  assert.ok(world.flash.intensity < .01);
  v.setFlash(true);
  v.tick(0.12, 0.12, null, true);
  assert.ok(v.equip > 0 && v.equip < 1);
  assert.equal(v.hand.isEnabled(), true);
  const intermediate = v.equip;
  v.setFlash(false);
  assert.equal(v.equip, intermediate);
  v.tick(0.3, 0.42, null, true);
  assert.equal(v.equip, 0);
  assert.equal(v.hand.isEnabled(), false);
  v.setFlash(true);
  v.tick(0.5, 1, null, true);
  assert.equal(v.equip, 1);
  v.setGameplay(false);
  v.tick(0.1, 1.1, null, false);
  assert.equal(v.hand.isEnabled(), false);
  world.sync(newGame());
});
test("Every interaction visibly moves, freezes when paused, and completes once with an impact cue", () => {
  const v = world.visuals;
  const samples = {
    key: () => v.key.position.y,
    fuse: () => v.cabinetDoor.rotation.y,
    release: () => v.lockerDoor.rotation.y,
    valve: () => v.valve.rotation.x,
    gate: () => world.exitGate.position.y,
    trap: () => world.grilleRoot.position.y,
  };
  for (const [id, sample] of Object.entries(samples)) {
    world.sync(newGame());
    v.setGameplay(true);
    let commits = 0,
      cues = 0;
    const start = sample();
    v.action(
      id,
      1,
      () => commits++,
      () => cues++,
    );
    v.tick(0.45, 0.45, null, true);
    assert.notEqual(sample(), start, id + " must have visible travel");
    assert.equal(commits, 0);
    const paused = sample();
    v.tick(0.3, 0.75, null, false);
    assert.equal(sample(), paused, id + " pauses");
    v.tick(0.55, 1.3, null, true);
    v.tick(0.2, 1.5, null, true);
    assert.equal(commits, 1, id);
    assert.equal(cues, 1, id);
    assert.equal(v.actionHand.isEnabled(), false, id + " hand retracts");
  }
  world.sync(newGame());
  v.switchCircuit(0, true);
  v.tick(0.2, 0, null, false, true);
  assert.ok(v.breakers[0].rotation.z < 0 && v.breakers[0].rotation.z > -0.7);
  v.tick(0.3, 0.2, null, false, true);
  assert.equal(v.breakers[0].rotation.z, -0.7);
  world.sync(newGame());
});
test("Nearby interaction prompts use remapped keys and never reach through a wall", async () => {
  const { UI } = await import("../dist/js/ui.js");
  const nodes = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!nodes.has(id)) {
        const classes = new Set(["hidden"]);
        nodes.set(id, {
          textContent: "",
          style: {},
          classList: {
            add(c) {
              classes.add(c);
            },
            remove(c) {
              classes.delete(c);
            },
            toggle(c, on) {
              on ? classes.add(c) : classes.delete(c);
            },
            contains(c) {
              return classes.has(c);
            },
          },
        });
      }
      return nodes.get(id);
    },
  };
  world.sync(newGame());
  const player = Object.create(Player.prototype);
  player.world = world;
  player.pos = { x: -25.2, z: 76 };
  const anchor = world.interactives.find((t) => t.id === "fuse");
  world.camera.position.set(player.pos.x, 1.68, player.pos.z);
  world.camera.setTarget(anchor.pos);
  world.camera.getViewMatrix(true);
  const hint = player.interactionHint();
  assert.equal(hint.item.id, "fuse");
  assert.equal(hint.usable, true);
  const ui = Object.create(UI.prototype);
  ui.game = {
    world,
    engine,
    canvas: {
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 1280, height: 720 };
      },
    },
    settings: { interactionHighlight: true, bindings: { interact: "KeyQ" } },
  };
  ui.interaction(hint);
  assert.equal(document.getElementById("interact-key").textContent, "Q");
  assert.equal(document.getElementById("world-prompt-key").textContent, "Q");
  assert.equal(
    document.getElementById("interaction").classList.contains("hidden"),
    false,
  );
  const wall = { x: -26.3, z: 76, w: 0.2, d: 3, enabled: true };
  world.rects.push(wall);
  assert.notEqual(player.interactionHint()?.item.id, "fuse");
  world.rects.pop();
  delete globalThis.document;
});
test("Bundled Attendant imports with real skeletal clips and changing joint poses", async () => {
  const fs = await import("node:fs");
  await import("../dist/vendor/babylonjs.loaders.min.js");
  const data = new Uint8Array(
    fs.readFileSync(
      new URL("../dist/assets/models/attendant.glb", import.meta.url),
    ),
  );
  const container = await BABYLON.LoadAssetContainerAsync(data, world.scene, {
    pluginExtension: ".glb",
    pluginOptions: { gltf: { skipMaterials: true } },
  });
  assert.equal(container.skeletons.length, 1);
  assert.deepEqual(container.animationGroups.map((g) => g.name).sort(), [
    "Attack", "Backstep", "Brace", "Brake", "CrouchSearch", "DoorPush", "Idle", "Inspect", "InspectClose", "Listen", "PeekLeft", "PeekRight", "Recover", "Run", "Search", "Stalk", "StartRun", "Strike", "TurnLeft", "TurnRight", "Walk",
  ]);
  // Exercise the production actor wrapper and clip setup using the real import.
  const loader = BABYLON.SceneLoader.LoadAssetContainerAsync;
  BABYLON.SceneLoader.LoadAssetContainerAsync = async () => container;
  try {
    await world.visuals.loadActor();
  } finally {
    BABYLON.SceneLoader.LoadAssetContainerAsync = loader;
  }
  assert.equal(world.visuals.actorLoaded, true);
  assert.ok(world.worker.getChildMeshes().some((m) => m.skeleton));
  assert.ok(container.skeletons[0].bones.length>=38);
  const attack=container.animationGroups.find(g=>g.name==="Attack");
  attack.start(true);attack.goToFrame((attack.from+attack.to)/2);
  const hand=container.transformNodes.find(n=>n.name==="Hand.R");hand.computeWorldMatrix(true);
  assert.ok(hand.absolutePosition.z>1,"actual strike faces the controller's +Z heading");
  assert.ok(hand.absolutePosition.y>1.2&&hand.absolutePosition.y<1.7,"strike contacts a player's torso");

  for (const group of container.animationGroups) {
    for (const other of container.animationGroups)
      other.setWeightForAllAnimatables(other === group ? 1 : 0);
    group.start(true);
    group.goToFrame(group.from);
    const pose = () =>
      group.targetedAnimations
        .filter((t) => t.animation.targetProperty === "rotationQuaternion")
        .map((t) => t.target.rotationQuaternion.asArray());
    const before = pose();
    group.goToFrame(group.from + (group.to - group.from) * 0.37);
    assert.notDeepEqual(
      pose(),
      before,
      group.name + " must animate actual bones",
    );
    group.stop();
  }
  // Check production clip blending and pause/resume against real animatables.
  world.sync(newGame());
  world.worker.setEnabled(true);
  const actorPlayer = {
    settings: { fov: 78, cinematicMotion: true, bob: 0, sway: 0 },
    walkClock: 0,
    lookVelocity: { x: 0, y: 0 },
  };
  world.visuals.setActorMotion("Run", 3.1);
  world.visuals.tick(0.1, 0, actorPlayer, true);
  assert.ok(
    world.visuals.clipWeights.Run > 0 && world.visuals.clipWeights.Run < 1,
  );
  assert.ok(
    Math.abs(
      Object.values(world.visuals.clipWeights).reduce((a, b) => a + b, 0) - 1,
    ) < 0.00001,
  );
  assert.ok(container.animationGroups.filter(g=>g.isPlaying).length<=2,"only current and fading clips run");
  assert.ok(world.visuals.clips.Run.isPlaying);
  world.visuals.tick(0.1, 0.1, actorPlayer, false);
  assert.ok(container.animationGroups.every((g) => !g.isPlaying));
  world.visuals.tick(0.1, 0.2, actorPlayer, true);
  assert.ok(container.animationGroups.filter(g=>g.isPlaying).length<=2,"only current and fading clips run");
  assert.ok(world.visuals.clips.Run.isPlaying);
  world.worker.setEnabled(false);
  world.visuals.tick(0.1, 0.3, actorPlayer, true);
  assert.ok(container.animationGroups.every((g) => !g.isPlaying));
  const attention=world.visuals.attention;assert.equal(attention.parts.length,2);
  for(let i=0;i<50;i++)attention.update(1/60,{x:10,z:0},0,"Listen");
  attention.restore();const bases=attention.parts.map(p=>p.node.rotationQuaternion.clone());
  for(let i=0;i<200;i++){attention.apply();assert.ok(attention.parts.every(p=>p.node.rotationQuaternion.asArray().every(Number.isFinite)));attention.restore();}
  attention.parts.forEach((p,i)=>assert.ok(p.node.rotationQuaternion.equalsWithEpsilon(bases[i],1e-7),"no accumulated look offset"));
  attention.update(1/60,{x:10,z:0},0,"Strike");attention.apply();
  attention.parts.forEach((p,i)=>assert.ok(p.node.rotationQuaternion.equalsWithEpsilon(bases[i],1e-7),"contact clip keeps authored joints"));
  attention.reset();container.dispose();
});

test("Service shortcuts unlock with the key and remain usable as escape routes", () => {
  const state=newGame(); world.sync(state);
  assert.ok(world.shortcuts.every(d=>d.rect.enabled));
  state.flags=FLAG_IDS.slice(0,3); world.sync(state);
  assert.ok(world.shortcuts.every(d=>!d.rect.enabled));
  assert.ok(world.shortcuts.every(d=>!d.mesh.isDisposed()));
  const route=findPath({x:-24,z:27},{x:-24,z:65},world.rects);
  assert.ok(route.length);
  assert.ok(route.every(p=>p.x < -17),"unlocked route stays in west rooms");
  state.flags=FLAG_IDS.slice(0,7); world.sync(state);
  assert.equal(world.shortcuts[0].rect.enabled,false);
  assert.equal(world.shortcuts[1].rect.enabled,false);
});

test("Unready loading fails visibly and restores view/light state instead of silently succeeding", async () => {
  world.setSettings({quality:"medium",shadows:"medium",glow:true,fxaa:false,fov:78,brightness:1.15});
  const worker=world.worker.isEnabled(), position=world.camera.position.clone();
  await assert.rejects(world.warmup(()=>{}, {timeoutMs:1}),/did not finish preparing/);
  assert.equal(world.worker.isEnabled(),worker); assert.equal(world.flash.intensity,0); assert.equal(world.spill.intensity,0);
  assert.ok(world.camera.position.equals(position)); assert.notEqual(world.preparation?.ready,true);
});
test("Successful readiness visits all rooms and leaves hand models hidden (GPU readiness simulated)", async () => {
  const ready=world.scene.isReady; world.scene.isReady=()=>true;
  world.visuals.hand.setEnabled(false);world.visuals.actionHand.setEnabled(false);
  const stages=[];
  try {await world.warmup((label,p)=>stages.push([label,p]));} finally {world.scene.isReady=ready;}
  assert.equal(world.preparation.rooms,10);assert.equal(world.preparation.ready,true);
  assert.equal(world.visuals.hand.isEnabled(),false); assert.equal(world.visuals.actionHand.isEnabled(),false);
  assert.ok(stages.every(([,p])=>p<1),"Only Game may report Ready after preparation completes");
});
test("Walking and toggling flashlight keeps all light identities and enabled states stable", () => {
  const lights=[...world.scene.lights], pool=world.lightPool.map(s=>s.light.uniqueId);
  let changes=0; const original=lights.map(l=>l.setEnabled);
  lights.forEach((l,i)=>l.setEnabled=function(value){changes++;return original[i].call(this,value);});
  try {
    for(let i=0;i<600;i++) {
      world.updateLights({x:Math.sin(i/60)*24,z:5+i/6},i/60,i%60<30);
      world.visuals.tick(1/60,i/60,null,true);
    }
    assert.equal(changes,0);assert.equal(world.scene.lights.length,7);
    assert.deepEqual(world.lightPool.map(s=>s.light.uniqueId),pool);
    assert.ok(world.shadowCasterCount<world.scene.meshes.length/2);
  } finally {lights.forEach((l,i)=>l.setEnabled=original[i]);}
});
test("Batched construction and navigation preserve authored rooms and yield to other tasks", async () => {
  const e=new BABYLON.NullEngine(), w=new World(e,{defer:true});
  let taskRan=false; const timer=setTimeout(()=>taskRan=true,0);
  await w.buildAsync();
  assert.equal(taskRan,true);clearTimeout(timer);
  assert.equal(w.interactives.length,world.interactives.length-1,"asset placement adds the van interaction later");
  assert.equal(w.lightPool.length,4);await w.optimizeAsync();
  w.dispose();e.dispose();
});

test("The entire escape car clears authored obstacles through the bay turn and open exit", async()=>{
  const {drivePose}=await import("../dist/js/staging.js");
  world.sync({...newGame(),flags:FLAG_IDS.slice(0,8)});
  // Separating-axis test of the car's full footprint, including mirrors and
  // bumpers, against the actual level collision rectangles at 120 samples/sec.
  const overlaps=(pose,r)=>{
    const right={x:Math.cos(pose.yaw),z:-Math.sin(pose.yaw)};
    const front={x:Math.sin(pose.yaw),z:Math.cos(pose.yaw)};
    for(const axis of [{x:1,z:0},{x:0,z:1},right,front]){
      const gap=Math.abs((r.x-pose.x)*axis.x+(r.z-pose.z)*axis.z);
      const car=1.15*Math.abs(right.x*axis.x+right.z*axis.z)+2.3*Math.abs(front.x*axis.x+front.z*axis.z);
      const obstacle=r.w/2*Math.abs(axis.x)+r.d/2*Math.abs(axis.z);
      if(gap>=car+obstacle)return false;
    }
    return true;
  };
  let previous=drivePose(0);
  for(let i=0;i<=1752;i++){
    const pose=drivePose(i/120);
    for(const r of world.rects)if(r.enabled!==false&&r!==world.stage.carRect)
      assert.equal(overlaps(pose,r),false,`collision at ${i/120}s: ${r.name||JSON.stringify(r)}`);
    assert.ok(Math.hypot(pose.x-previous.x,pose.z-previous.z)<.15,"continuous path");previous=pose;
  }
  assert.ok(previous.z<-14);
  world.sync(newGame());
});
test("Battery recovery, hood repair and locker door animate and survive a checkpoint reset",()=>{
  const s=world.stage;world.sync({...newGame(),flags:["car"]});
  assert.ok(s.hood.rotation.x<-.9);assert.equal(s.installedBattery.isEnabled(),false);
  s.action("battery",.5);assert.ok(s.battery.position.y>.1);
  s.action("repair",.5);assert.equal(s.installedBattery.isEnabled(),true);
  s.action("repair",1);assert.ok(Math.abs(s.hood.rotation.x)<1e-9);
  s.setHidden(s.spots[0],true);world.visuals.animator.tick(.2);
  assert.ok(s.spots[0].door.rotation.y<-.5);
  world.sync({...newGame(),flags:FLAG_IDS.slice(0,5)});
  assert.equal(s.battery.isEnabled(),false);assert.equal(s.kit.isEnabled(),false);
  assert.equal(s.installedBattery.isEnabled(),true);assert.equal(s.spots[0].door.rotation.y,0);
  world.sync(newGame());
});
test("Lighting uses room-local pools and a low ambient fill without rebuilding the pool",()=>{
  world.sync(newGame());assert.ok(world.hemi.intensity<.06);
  world.updateLights({x:-24,z:18},0,false,0,true);
  for(const slot of world.lightPool)if(slot.light.intensity>0)assert.ok(slot.light.position.x<-17);
  const pos={x:0,z:50},visibility=world.stage.visibility(pos);
  world.setSettings({quality:"low",brightness:1.8,fov:78});
  assert.equal(world.stage.visibility(pos),visibility,"brightness cannot change AI");
});

test("Service hatch and loose lamp survive batching and play one contact cue each",()=>{
  world.sync(newGame());const a=world.atmosphere,v=world.visuals;
  assert.equal(a.hatch.isDisposed(),false);let hits=0;
  a.playHatch(()=>hits++);v.animator.tick(.2);assert.equal(hits,0);
  v.animator.tick(.36);assert.equal(hits,1);assert.ok(a.hatch.rotation.z>.8);
  v.animator.tick(2);assert.equal(hits,1);assert.equal(a.hatch.rotation.z,.95);
  a.playLamp(()=>hits++);v.animator.tick(.1);assert.equal(hits,1);
  v.animator.tick(.13);assert.equal(hits,2);assert.notEqual(a.lamp.rotation.z,0);
  world.sync(newGame());v.animator.tick(5);assert.equal(hits,2);assert.equal(a.lamp.rotation.z,0);
});
test("The reveal uses collision-safe walking and keeps its position when pursuit activates",async()=>{
  const {Threat}=await import("../dist/js/threat.js");world.sync(newGame());
  const t=new Threat(world.rects);assert.equal(t.reveal(),true);let saw=false;
  for(let n=0;n<1200&&t.mode==="reveal";n++){
    const previous={...t.pos},r=t.tick(1/60,{pos:{x:9,z:73}});saw ||= !!r.revealed;
    assert.ok(Math.hypot(t.pos.x-previous.x,t.pos.z-previous.z)<.04);
    assert.equal(blocked(t.pos.x,t.pos.z,world.rects,.32),false);
  }
  assert.equal(t.mode,"waiting");assert.equal(saw,true);const previous={...t.pos};
  t.activate({x:-23,z:18});assert.deepEqual(t.pos,previous);assert.equal(t.mode,"investigate");
});
test("Entry door closes before driving and only an adjacent side window can trigger the optional beat",()=>{
  world.sync(newGame());const stage=world.stage;
  const p={pos:{x:13.25,z:81.3},yaw:0,pitch:0,settings:{reducedMotion:false}};
  stage.beginDrive(p);stage.tickDrive(.65,p);
  assert.ok(stage.doors.find(d=>d.side===-1).node.rotation.y>1);
  assert.equal(stage.carRect.enabled,true);assert.equal(stage.nearbyWindow({x:13.3,z:79.3}),null);
  stage.tickDrive(.85,p);assert.ok(Math.abs(stage.doors.find(d=>d.side===-1).node.rotation.y)<.001);
  assert.equal(stage.car.position.x,13);assert.equal(stage.nearbyWindow({x:10.2,z:78}),null);
  assert.equal(stage.nearbyWindow({x:13.3,z:79.3}),null);
  assert.equal(stage.nearbyWindow({x:13.3,z:75.9})?.door.side,-1);
  stage.tickDrive(.71,p);assert.equal(stage.carRect.enabled,false);assert.equal(stage.nearbyWindow({x:13.3,z:79.3}),null);
});

test("Every new public prop imports as standalone geometry at its recorded physical size",async()=>{
  const fs=await import("node:fs");await import("../dist/vendor/babylonjs.loaders.min.js");
  const {PROP_SIZES}=await import("../dist/js/props.js");
  for(const [name,size] of Object.entries(PROP_SIZES)){
    const data=new Uint8Array(fs.readFileSync(new URL("../dist/assets/models/"+name+".glb",import.meta.url)));
    const c=await BABYLON.LoadAssetContainerAsync(data,world.scene,{pluginExtension:".glb",pluginOptions:{gltf:{skipMaterials:true}}});
    const meshes=c.meshes.filter(m=>m.getTotalVertices()>0);assert.ok(meshes.length>0,name);
    const min=new BABYLON.Vector3(Infinity,Infinity,Infinity),max=new BABYLON.Vector3(-Infinity,-Infinity,-Infinity);
    for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;min.minimizeInPlace(b.minimumWorld);max.maximizeInPlace(b.maximumWorld);}
    const measured=max.subtract(min).asArray();for(let i=0;i<3;i++)assert.ok(Math.abs(measured[i]-size[i])<.002,name+" axis "+i);
    assert.ok(Math.abs(min.y)<.002,name+" ground pivot");c.dispose();
  }
});

test("Security's real actor alcove and both routes around the wired window remain walkable",async()=>{
  const {Threat}=await import("../dist/js/threat.js");world.sync({...newGame(),flags:FLAG_IDS.slice(0,3)});
  const start=world.atmosphere.securityActor;
  assert.equal(blocked(start.x,start.z,world.rects,.32),false);
  for(const goal of [{x:-22,z:18},{x:-27,z:18},{x:-16,z:18}])assert.ok(findPath(start,goal,world.rects).length);
  const t=new Threat(world.rects);t.pos={...start};t.releaseStage({x:-16,z:18},0);
  const p={pos:{x:10,z:100},hiding:{id:"route"}};
  for(let i=0;i<2400&&Math.hypot(t.pos.x+16,t.pos.z-18)>.8;i++)t.tick(1/60,p);
  assert.ok(Math.hypot(t.pos.x+16,t.pos.z-18)<.8,JSON.stringify(t.pos));
});
test("Security and surge transforms survive batching, pause cleanly and fire one saved-impact cue",()=>{
  world.sync(newGame());const a=world.atmosphere,v=world.visuals;let impacts=0,done=0;
  a.playSecurity(()=>impacts++,()=>done++);v.tick(.1,0,null,true);assert.equal(impacts,0);
  assert.ok(a.securityShutter.position.y>1.78);const y=a.securityShutter.position.y;
  v.tick(1,0,null,false);assert.equal(a.securityShutter.position.y,y);
  v.tick(1,0,null,true);assert.equal(impacts,1);assert.equal(a.windowDamage.isEnabled(),true);
  v.tick(2,0,null,true);assert.equal(impacts,1);assert.equal(done,1);
  a.playSurge(()=>impacts++);v.tick(.8,0,null,true);assert.equal(impacts,2);assert.equal(a.emergencyMode,true);
  v.tick(2,0,null,true);assert.equal(impacts,2);assert.ok(a.panelCover.rotation.y>1);
  world.sync({...newGame(),scares:["securityBreach","powerSurge"]});assert.equal(a.windowDamage.isEnabled(),true);assert.equal(a.emergencyMode,true);
  world.sync(newGame());assert.equal(a.windowDamage.isEnabled(),false);assert.equal(a.emergencyMode,false);
});
test("Conservative room culling keeps adjacent door views and preserves the current sector on reset",()=>{
  world.updateRoomVisibility({x:-24,z:18},1);
  for(const b of world.roomBatches)assert.equal(b.enabled,!b.backdrop&&["garage","security","storage"].includes(b.zone));
  world.updateRoomVisibility({x:0,z:40},1);assert.ok(world.roomBatches.every(b=>b.enabled===(!b.backdrop&&!['yard','gatehouse','road'].includes(b.zone))));
  world.updateRoomVisibility({x:24,z:39},1);assert.ok(world.roomBatches.some(b=>!b.enabled));
  world.sync(newGame());for(const b of world.roomBatches)assert.equal(b.enabled,!b.backdrop&&["garage","electrical"].includes(b.zone));
});

test("Delivered cars and props are grounded after actual glTF transforms, and the full car route stays clear",async()=>{
  const fs=await import("node:fs");await import("../dist/vendor/babylonjs.loaders.min.js");
  const e=new BABYLON.NullEngine(),w=new World(e),savedLoader=BABYLON.SceneLoader.LoadAssetContainerAsync;
  BABYLON.SceneLoader.LoadAssetContainerAsync=async(_root,file,scene)=>BABYLON.LoadAssetContainerAsync(
    new Uint8Array(fs.readFileSync(new URL("../dist/"+_root+file,import.meta.url))),scene,
    {pluginExtension:".glb",pluginOptions:{gltf:{skipMaterials:true}}});
  try{await w.loadAssets();}finally{BABYLON.SceneLoader.LoadAssetContainerAsync=savedLoader;}
  assert.equal(w.failedAssets?.length||0,0);
  const placement=w.placements.report();
  if(process.env.LV_PLACEMENT_REPORT)fs.writeFileSync(process.env.LV_PLACEMENT_REPORT,JSON.stringify(placement,null,2)+"\n");
  assert.deepEqual(placement.unresolved,[],"all signs need physical supports");
  assert.equal(new Set(w.details.instances.map(p=>p.name)).size,24);
  assert.equal(w.richDetails.instances.length,12);
  const key=w.visuals.key,grip=w.visuals.keyGrip;
  assert.ok(grip,'imported maintenance key has its real ring-grip anchor');
  assert.ok(Math.abs(key.metadata.placement.bottom-1.225)<.0001,'key rests on the raised tray support');
  assert.ok(key.metadata.placement.w>.4&&key.metadata.placement.w<.43);
  assert.equal(w.visuals.dynamicRoots.has(key),true);
  for(const fps of [30,60,144]){
    w.sync(newGame());w.visuals.action('key',.45,()=>{});
    for(let t=0;t<.45;t+=1/fps){w.visuals.animator.tick(1/fps);assert.equal(key.scaling.x,1);}
    w.sync(newGame());assert.ok(Math.abs(key.position.y-1.225)<.0001);
  }
  assert.equal(w.decay.paint.length,4);
  for(const mark of w.decay.paint){assert.ok(Math.abs(Math.abs(mark.plane.position.x)-29.75)<.005);assert.equal(mark.plane.isPickable,false);}
  for(const peel of w.scene.meshes.filter(m=>m.name==='irregular flaking wall finish'))assert.ok(Math.abs(peel.position.x)>.748+29,'wall paint must not share the flaking-plaster plane');
  for(const detail of w.richDetails.instances){
    if(detail.spec.support==='wall'){
      const b=detail.bounds,plane=detail.spec.position[0],face=plane<0?b.x-b.w/2:b.x+b.w/2;
      assert.ok(Math.abs(face-plane)<.004,detail.spec.id+' mounts to the real wall plane');
    }
    if(detail.spec.parent)assert.equal(detail.root.isDescendantOf(w.stage.car),true,detail.spec.id+' follows the escaping car');
  }
  const visor=w.richDetails.instances.find(d=>d.spec.id==='sagging-sun-visor');
  const roof=visor.root.getDescendants().find(n=>n.name.endsWith('__roof_pivot'));roof.computeWorldMatrix(true);
  const mounted=BABYLON.Vector3.TransformCoordinates(roof.getAbsolutePosition(),BABYLON.Matrix.Invert(w.stage.car.computeWorldMatrix(true)));
  assert.ok(BABYLON.Vector3.Distance(mounted,BABYLON.Vector3.FromArray(visor.spec.anchor_target_local))<.0001);
  for(const root of w.scene.transformNodes.filter(n=>n.metadata?.placement)){
    const p=root.metadata.placement;assert.ok(Math.abs(p.bottom-root.metadata.supportY)<.0001,root.name);
    assert.ok(p.w>0&&p.d>0&&p.h>0,root.name);
  }
  const cloth=w.scene.meshes.find(m=>m.name==="workshop oil cloth"&&m.position.z===69);
  assert.ok(Math.abs(cloth.position.y-.006-.925)<.00001);
  for(const car of w.rects.filter(r=>["van","sedan","suv","hatchback"].includes(r.name)))assert.ok(car.w>3&&car.d>1.5);
  const {drivePose}=await import("../dist/js/staging.js");
  w.sync({...newGame(),flags:FLAG_IDS.slice(0,8)});w.stage.carRect.enabled=false;
  // Test the complete vehicle footprint with real imported parked cars, rather
  // than relying on the primitive missing-asset fallback from earlier tests.
  for(let t=0;t<=14.6;t+=.025){
    const p=drivePose(t),right={x:Math.cos(p.yaw),z:-Math.sin(p.yaw)},front={x:Math.sin(p.yaw),z:Math.cos(p.yaw)};
    for(const r of w.rects)if(r.enabled!==false){
      const overlap=[{x:1,z:0},{x:0,z:1},right,front].every(axis=>{
        const gap=Math.abs((r.x-p.x)*axis.x+(r.z-p.z)*axis.z);
        const a=1.15*Math.abs(right.x*axis.x+right.z*axis.z)+2.3*Math.abs(front.x*axis.x+front.z*axis.z);
        const b=r.w/2*Math.abs(axis.x)+r.d/2*Math.abs(axis.z);return gap<a+b;
      });
      assert.equal(overlap,false,`drive at ${t}: ${r.name}`);
    }
  }
  const {PursuitRoutes}=await import("../dist/js/pursuit.js");const routes=new PursuitRoutes(w.rects);
  assert.ok(Number.isFinite(routes.distance({x:-22,z:18},{x:-22,z:76})),"unlocked service corridor");
  const {RouteFollower}=await import('../dist/js/locomotion.js');
  const {AGENT_RADIUS}=await import('../dist/js/navigation.js');
  w.stage.carRect.enabled=true;
  // These traverse the real imported footprints, desk/window alcove, room
  // doorways and service passage; every integration step stays outside solids.
  const journeys=[
    [{...w.atmosphere.securityActor},{x:-22,z:26}],
    [{x:-22,z:26},{x:-22,z:76}],
    [{x:-22,z:76},{x:16.05,z:39}],
    [{x:9,z:78},{x:13.67,z:75.6}],
    [{x:9,z:67.4},{x:15,z:67.2}],
    [{x:15,z:67.2},{x:15,z:72}],
    [{x:13.67,z:75.6},{x:-4,z:7}],
  ];
  for(const fps of [30,60,144])for(const [from,goal] of journeys){
    const mover=new RouteFollower(w.rects),pos={...from};let yaw=0,clock=0;
    for(let i=0;i<fps*65&&Math.hypot(pos.x-goal.x,pos.z-goal.z)>.12;i++){
      clock+=1/fps;yaw=mover.step(pos,yaw,goal,3.15,1/fps,clock).yaw;
      assert.equal(blocked(pos.x,pos.z,w.rects,AGENT_RADIUS),false,JSON.stringify({fps,pos,from,goal}));
    }
    assert.ok(Math.hypot(pos.x-goal.x,pos.z-goal.z)<.12,JSON.stringify({fps,pos,from,goal,recoveries:mover.recoveries}));
  }
  const {Threat}=await import('../dist/js/threat.js');
  w.visuals.setGrille(1);
  const trapped=new Threat(w.rects);trapped.pos={x:-24,z:76};trapped.yaw=Math.PI/2;trapped.trap(12);
  let contacts=0;
  for(let i=0;i<600;i++){
    const r=trapped.tick(1/60,{pos:{x:0,z:60},hiding:{id:'test'}});
    assert.equal(blocked(trapped.pos.x,trapped.pos.z,w.rects,AGENT_RADIUS),false);
    if(r.trapContactCue)contacts++;
  }
  assert.equal(contacts,1,'the real closed grille is physically reachable for DoorPush');
  assert.ok(Math.abs(trapped.pos.x+18.05)<.1);
  e.dispose();
});

test('Left cockpit and headlights remain correctly mounted throughout the escape',()=>{
  world.sync(newGame());const s=world.stage,p={pos:{x:13.67,z:75},yaw:0,pitch:0,settings:{reducedMotion:false}};
  world.camera.position.set(13.67,1.68,75);s.beginDrive(p);
  assert.equal(s.driverSide,-1);assert.ok(s.driverEye.x<0&&s.steering.position.x<0);
  for(let i=0;i<146;i++){
    s.tickDrive(.1,p);world.scene.onBeforeRenderObservable.notifyObservers(world.scene);
    const inv=s.car.getWorldMatrix().clone().invert();
    const left=BABYLON.Vector3.TransformCoordinates(world.flash.position,inv),right=BABYLON.Vector3.TransformCoordinates(world.spill.position,inv);
    assert.ok(left.z>2.2&&right.z>2.2,'light origins are beyond bumper/glass');
    assert.ok(left.x<0&&right.x>0);assert.ok(world.flash.direction.subtract(s.car.getDirection(BABYLON.Axis.Z)).length()<.001);
    assert.ok(world.flash.excludedMeshes.includes(s.steering));
  }
  world.sync(newGame());assert.equal(world.flash.excludedMeshes.includes(s.steering),false);
});

test('Pooled water effects never allocate meshes on contact and expire cleanly',()=>{
  const effects=world.surfaces;effects.apply({quality:'high'});const before=world.scene.meshes.length;
  for(let i=0;i<120;i++){effects.emit({x:3,z:65},{water:true,force:1});effects.tick(1/60);}
  assert.equal(world.scene.meshes.length,before);effects.tick(2);
  assert.ok([...effects.rings,...effects.drops].every(p=>!p.mesh.isEnabled()));
});


test('Damp footprints reuse slots, fade, and clear on checkpoint reset',()=>{
  const effects=world.surfaces;effects.apply({quality:'high'});const count=world.scene.meshes.length;
  for(let i=0;i<100;i++)effects.emit({x:i*.01,z:10},{water:null,wetness:.8,yaw:.2});
  assert.equal(world.scene.meshes.length,count);assert.equal(effects.traces.filter(t=>t.age===0).length,20);
  effects.tick(13);assert.ok(effects.traces.every(t=>!t.mesh.isEnabled()));
  effects.emit({x:0,z:10},{water:null,wetness:.8});world.sync(newGame());
  assert.ok(effects.traces.every(t=>t.age>8&&!t.mesh.isEnabled()));
});

test('Doorway crossing and stopping selects incoming fixtures immediately with stable light identities',()=>{
 const w=new World(engine),ids=w.scene.lights.map(l=>l.uniqueId);
 const crossings=[[-17,18],[-17,45],[-17,76],[17,39],[17,98]];
 for(const [x,z] of crossings){
  const side=Math.sign(x),outside={x:x-side*.25,z},inside={x:x+side*.25,z};
  w.updateLights(outside,10,false,0,true);
  assert.ok(w.lightPool.some(s=>s.target&&Math.sign(s.target.x)===side&&Math.abs(s.target.x)>17),'nearby doorway is prepared');
  w.updateLights(inside,10.016,false);
  assert.equal(w.lightZone, (awaitRoom(inside)));
  assert.ok(w.lightPool.some(s=>s.current&&Math.abs(s.current.x)>17&&s.level>=.6));
  w.updateLights(inside,10.116,false);w.updateLights(inside,10.216,false);
  assert.ok(w.lightPool.filter(s=>s.current).every(s=>s.level>.95),'standing still settles within 200ms');
 }
 assert.deepEqual(w.scene.lights.map(l=>l.uniqueId),ids);assert.equal(ids.length,7);
 const signs=w.scene.materials.filter(m=>m.metadata?.readableLabel);
 const glowColor=new BABYLON.Color4();w.glow.customEmissiveColorSelector(null,null,w.materials.warm,glowColor);
 assert.ok(glowColor.r>0,"ordinary light fixtures retain their authored bloom");
 w.glow.customEmissiveColorSelector(null,null,signs[0],glowColor);assert.equal(glowColor.r,0);
 assert.ok(signs.length>=12);for(const mat of signs){assert.ok(mat.emissiveTexture);assert.ok(mat.emissiveColor.r<.3);}
 w.scene.dispose();
});
function awaitRoom(p){return p.x<-17?p.z<29?'security':p.z<58?'storage':'workshop':p.z>86?'pump':'electrical';}

test('Battery grip follows its real handle at 30, 60 and 144 FPS without shrinking, and repairs sit on the tray',()=>{
 const w=new World(engine),v=w.visuals;
 const player={settings:{fov:78,reducedMotion:true},walkClock:0,lookVelocity:{x:0,y:0}};
 for(const fps of [30,60,144]){
  w.sync({...newGame(),flags:['car']});v.setGameplay(true);
  w.camera.position.set(9.6,1.68,75.6);w.camera.setTarget(new BABYLON.Vector3(9.6,.5,77.16));w.camera.getViewMatrix(true);
  let cues=0,done=0;v.action('battery',1.2,()=>done++,()=>cues++);
  for(let i=0;i<Math.ceil(1.2*fps);i++){
   v.tick(1/fps,i/fps,player,true);assert.equal(w.stage.battery.scaling.x,1);
   if(v.actionPhase>.38&&v.actionPhase<.78){
    v.actionHand.computeWorldMatrix(true);w.stage.batteryHandle.computeWorldMatrix(true);
    assert.ok(BABYLON.Vector3.Distance(v.actionHand.getAbsolutePosition(),w.stage.batteryHandle.getAbsolutePosition())<.012,'hand remains on grip');
   }
  }
  v.tick(.05,2,player,true);assert.equal(cues,1);assert.equal(done,1);
 }
 w.sync({...newGame(),flags:FLAG_IDS.slice(0,5)});
 assert.ok(Math.abs(w.stage.installedBattery.position.y-.14-.935)<1e-9);
 assert.ok(w.stage.newCable.position.y>w.stage.installedBattery.position.y+.14);
 for(const spot of w.stage.spots)assert.ok(spot.handle.position.z>.055);
 w.scene.dispose();
});

test('Return-trip encounter walks the sole enemy behind the adjacent car and saves the aftermath once',async()=>{
 const {CreatureScenes}=await import('../dist/js/creature-scenes.js');
 const {EncounterDirector}=await import('../dist/js/encounters.js');
 const {Threat}=await import('../dist/js/threat.js');
 const state={...newGame(),flags:FLAG_IDS.slice(0,8)},director=new EncounterDirector(state);director.queue=[];
 const threat=new Threat(world.rects,'medium');threat.pos={x:9,z:65};threat.yaw=0;threat.mode='patrol';threat.lastKnown={x:7,z:60};
 const player={pos:{x:6,z:63},yaw:0,pitch:0,height:1.68};let commits=0;
 const g={state,director,threat,player,world,audio:{play(){},prepareBeat(){}},ui:{subtitle(){}},visualReadable:()=>true,
  recordEncounter(id){commits++;director.commit(id);}};
 const scenes=new CreatureScenes(g);let moved=0,withdraw=false;
 for(let i=0;i<1500;i++){
  const before={...threat.pos};scenes.tick(1/60);
  if(scenes.active?.phase==='withdraw')withdraw=true;
  if(!scenes.active&&commits)break;
  threat.tick(1/60,player);const step=Math.hypot(threat.pos.x-before.x,threat.pos.z-before.z);moved+=step;
  assert.ok(step<.06,'no teleport');assert.equal(blocked(threat.pos.x,threat.pos.z,world.rects,.34),false);
 }
 assert.equal(commits,1);assert.ok(withdraw);assert.ok(moved>6);assert.equal(world.atmosphere.returnScuff.isEnabled(),true);
 assert.equal(state.scares.filter(x=>x==='carReturn').length,1);assert.ok(threat.pos.x>14);
 world.sync(newGame());
});

test('Physical cart aftermath and pressure puddle survive batching and safe checkpoint restoration',async()=>{
 const {stepProfile}=await import('../dist/js/surfaces.js');
 const e=world.equipment,p={pos:{x:-22,z:44},vehicle:false};world.sync(newGame());
 assert.equal(e.cart.isDisposed(),false);assert.equal(e.clearCartSweep(p),true);
 const count=world.scene.meshes.length,original=e.cart.position.z;
 for(let i=0;i<60;i++)e.moveCart(i/59,p);
 assert.ok(e.cart.position.z<original-.8);assert.equal(e.cartRect.z,e.cart.position.z);
 world.sync(newGame());p.pos={x:-24,z:40};assert.equal(e.clearCartSweep(p),false);assert.equal(e.moveCart(1,p),false);assert.equal(e.cart.position.z,41);
 assert.equal(stepProfile(e.water,{extraWater:world.extraWater}).water,null);e.burst();
 assert.equal(stepProfile(e.water,{extraWater:world.extraWater}).water.id,'burst-leak');
 assert.equal(e.puddle.isEnabled(),true);e.tick(.5,10,{pos:{x:26,z:98}}, {quality:'high'});
 assert.equal(world.scene.meshes.length,count,'encounters allocate no meshes during play');
 world.sync({...newGame(),scares:['cartPush','pressureBurst']});assert.equal(e.cartRect.z,40.1);assert.equal(e.water.enabled,true);
 world.sync(newGame());assert.equal(e.cartRect.z,41);assert.equal(e.water.enabled,false);assert.equal(e.puddle.isEnabled(),false);
});

test('Optional cart encounter uses the same actor, a clear sweep, actual motion and one saved impact',async()=>{
 const {Threat}=await import('../dist/js/threat.js'),{CreatureScenes}=await import('../dist/js/creature-scenes.js'),{EncounterDirector}=await import('../dist/js/encounters.js');
 const state={...newGame(),flags:['car','battery','key']};world.sync(state);
 const threat=new Threat(world.rects,'medium',world.stage.spots);threat.pos={x:-22,z:42.65};threat.yaw=Math.PI;threat.mode='investigate';threat.grace=2;threat.lastKnown={x:-24,z:42.65};threat.destination={...threat.lastKnown};
 const player={pos:{x:-21,z:45},yaw:Math.PI,flashlight:false,visibility:.4,hiding:null},director=new EncounterDirector(state);director.queue=[];
 let impacts=0;const sounds=[];
 const g={world,threat,player,state,director,pendingAction:null,visualReadable:()=>true,audio:{play:(n)=>sounds.push(n),prepareBeat(){}},ui:{subtitle(){}},recordEncounter:id=>{impacts++;director.commit(id);}};
 const scenes=new CreatureScenes(g);
 for(let i=0;i<600&&!state.scares.includes('cartPush');i++){threat.tick(1/60,player);director.tick(1/60,threat.mode);scenes.tick(1/60);}
 assert.equal(impacts,1);assert.ok(state.scares.includes('cartPush'));assert.ok(sounds.includes('lv113-cart-impact'));
 for(let i=0;i<180;i++){threat.tick(1/60,player);director.tick(1/60,threat.mode);scenes.tick(1/60);}
 assert.ok(world.equipment.cart.position.z<40.3);assert.equal(world.equipment.cartRect.z,world.equipment.cart.position.z);assert.equal(impacts,1);
 world.sync(newGame());
});
