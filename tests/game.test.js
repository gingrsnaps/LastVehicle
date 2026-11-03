import test from "node:test";
import assert from "node:assert/strict";
import { EncounterDirector } from "../dist/js/encounters.js";
import { Animator } from "../dist/js/animation.js";
import { Threat } from "../dist/js/threat.js";
import { Game } from "../dist/js/game.js";
import { UI } from "../dist/js/ui.js";
import { newGame, has, FLAG_IDS, NOTES, DEFAULT_SETTINGS } from "../dist/js/state.js";
// A narrow DOM facade exercises the actual puzzle handlers; it does not pretend
// to verify their appearance, pointer-lock behavior, or GPU rendering.
const elements = new Map();
const circuits = [0, 1, 2].map((i) => ({
  dataset: { circuit: String(i) },
  classList: { add() {}, remove() {} },
}));
const digits = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "CLEAR",
  "0",
  "ENTER",
].map((n) => ({ dataset: { digit: n } }));
globalThis.document = {
  getElementById(id) {
    if (!elements.has(id))
      elements.set(id, {
        style: {},
        value: "",
        textContent: "",
        classList: { add() {}, remove() {}, toggle() {} },
        querySelectorAll(q) {
          return q.includes("circuit") ? circuits : digits;
        },
      });
    return elements.get(id);
  },
};
function makeGame(difficulty = "medium") {
  const g = Object.create(Game.prototype);
  g.state = newGame(difficulty);
  g.runToken = 1;
  g.pendingAction = null;
  g.threat = new Threat([], difficulty);
  g.notes = NOTES;
  g.settings = { ...DEFAULT_SETTINGS, reducedFlashes: true };
  g.player = { pos: { x: -15, z: 79 } };
  const clock = new Animator();
  g.finishAction = () => clock.tick(3);
  g.clock = clock;
  g.world = {
    visuals: {
      action(id, duration, done) {
        clock.to("interaction", 0, 1, duration, () => {}, done);
      },
      animator:clock,breakers:[0,1,2].map(()=>({rotation:{z:0}})),
      switchCircuit(index,on,done=()=>{}){clock.to("breaker"+index,0,1,.48,()=>{},done);},
    },
    sync() {},
    worker: {
      position: {
        x: 0,
        set(x, y, z) {
          this.x = x;
          this.z = z;
        },
      },
    },
  };
  g.audio = {
    play() {
      return { src: { stop() {} } };
    },
    setTension() {},
  };
  g.ui = {
    game: g,
    actionKey: UI.prototype.actionKey,
    head() {
      return "";
    },
    show(type) {
      g.modal = type;g.ui.overlay=type;
    },
    hide() {
      g.modal = null;g.ui.overlay=null;
    },
    subtitle() {},
    note() {},
    previewNote() {},
    toast() {},
  };
  g.updateHUD = () => {};
  g.save = () => {};
  g.scare = () => {};
  g.resume = () => {};
  return g;
}
test("Locked interactions cannot bypass prerequisites", () => {
  const g = makeGame();
  for (const id of [
    "key",
    "fuse",
    "power",
    "terminal",
    "release",
    "valve",
    "alarm",
    "trap",
    "gate",
  ])
    g.interact(id);
  assert.deepEqual(g.state.flags, []);
});
for (const difficulty of ["easy", "medium", "hard"])
  test(`Repair and exit prerequisites complete on ${difficulty}`, () => {
    const g = makeGame(difficulty);
    for (const id of ["car","battery","key","fuse","repair"]) {g.interact(id);g.finishAction();}
    assert.deepEqual(g.state.flags, FLAG_IDS.slice(0,5));
    g.interact("power"); circuits[2].onclick();g.finishAction();
    assert.equal(has(g.state,"power"),false);
    for(const c of circuits){c.onclick();g.finishAction();}
    assert.equal(has(g.state,"power"),true);
    g.interact("terminal");document.getElementById("pin").value="0000";digits.at(-1).onclick();
    assert.equal(has(g.state,"terminal"),false);
    document.getElementById("pin").value="1986";digits.at(-1).onclick();
    g.interact("gate");g.finishAction();
    assert.deepEqual(g.state.flags,FLAG_IDS.slice(0,8));
    assert.equal(has(g.state,"escaped"),false,"opening the exit cannot finish the game");
  });
test("Optional grille requires safe placement and never advances the story", () => {
  const g=makeGame();g.state.flags=FLAG_IDS.slice(0,7);
  const flags=[...g.state.flags];
  g.world.worker.position.x=-15;g.interact("trap");g.finishAction();
  assert.notEqual(g.threat.mode,"trapped");
  g.world.worker.position.x=-24;g.world.worker.position.z=76;g.player.pos.x=-22;
  g.interact("trap");g.finishAction();assert.notEqual(g.threat.mode,"trapped");
  g.player.pos.x=-15;g.interact("trap");g.finishAction();
  assert.equal(g.threat.mode,"trapped");assert.deepEqual(g.state.flags,flags);
});
test("Repeated collection is idempotent and journal has valid document IDs", () => {
  const g=makeGame();
  for(let n=0;n<3;n++)for(const id of ["car","battery","key","fuse","van"]){g.interact(id);g.finishAction();}
  assert.equal(g.state.flags.length,4);
  assert.equal(new Set(g.state.notes).size,g.state.notes.length);
  assert.ok(g.state.notes.every(id=>id in NOTES));
});

// A save must never contain a flag for an unfinished animation.
test("Actions commit once on completion; loading another run cancels stale commits", () => {
  const g = makeGame();
  g.interact("car");
  assert.equal(has(g.state, "car"), false);
  assert.equal(g.player.movementLocked, false, "ordinary interactions keep movement responsive");
  g.clock.tick(0.2);
  g.interact("key");
  assert.deepEqual(g.state.flags, []);
  g.finishAction();
  assert.equal(has(g.state, "car"), true);
  assert.equal(g.player.movementLocked, false);
  g.interact("battery");
  g.runToken++;
  g.state = newGame();
  g.finishAction();
  assert.deepEqual(g.state.flags, []);
});

test("Repair cancellation restores movement and cannot commit after cancellation", () => {
  const g=makeGame();
  g.state.flags=FLAG_IDS.slice(0,4);
  g.interact("repair");
  assert.equal(g.player.movementLocked,true);
  g.cancelAction();
  assert.equal(g.player.movementLocked,false);
  assert.equal(has(g.state,"repair"),false);
  g.finishAction();
  assert.equal(has(g.state,"repair"),false);
});

test("An unready creature scene does not block a readable environmental beat",()=>{
  const g=makeGame(),heard=[];
  g.audio.play=id=>heard.push(id);g.director=new EncounterDirector(g.state);
  for(const id of ["securityBreach","workshopBreach","pursuit"])g.director.request(id);
  g.world.camera={fov:1.36};g.world.rects=[];
  g.player={pos:{x:10,z:81},yaw:Math.atan2(-2.2,1),height:1.68};
  g.world.atmosphere={securityActor:{x:-23.25,z:15.35},securityPosition:{x:-23.45,z:16.5},hatchPosition:{x:-27.35,y:1.7,z:74.5},lampPosition:{x:7.8,y:1.7,z:82},playLamp:done=>g.clock.to("lamp",0,1,.22,()=>{},done)};
  g.tickEncounters(.1);assert.deepEqual(g.state.scares,[]);assert.deepEqual(heard,[]);
  g.clock.tick(.22);assert.deepEqual(g.state.scares,["pursuit"]);assert.deepEqual(heard,["hatch-impact"]);
  assert.deepEqual(g.director.queue,["securityBreach","workshopBreach"]);
});

test("The first hood and passenger-door interactions inspect the car instead of demanding supplies",()=>{
  for(const id of ["repair","car-passenger"]){
    const g=makeGame();g.interact(id);assert.deepEqual(g.state.flags,[]);g.finishAction();
    assert.deepEqual(g.state.flags,["car"]);assert.equal(has(g.state,"repair"),false);
  }
});
test("A visual encounter is withheld when the player looks at the floor",()=>{
  const g=makeGame();g.player={pos:{x:0,z:0},yaw:0,pitch:1.4,height:1.68};g.world.camera={fov:1.36};g.world.rects=[];
  assert.equal(g.visualReadable({x:0,z:12}),false);
  g.player.pitch=0;assert.equal(g.visualReadable({x:0,z:12}),true);
});
