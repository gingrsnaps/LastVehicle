import test from "node:test";
import assert from "node:assert/strict";
import { availability, Guidance, destination } from "../dist/js/guidance.js";
import { selectInteraction } from "../dist/js/interaction.js";
import { sightClear, findPath, lineClear } from "../dist/js/navigation.js";
import { newGame, FLAG_IDS, validateSettings, validateSave, DEFAULT_SETTINGS } from "../dist/js/state.js";
import { keyName } from "../dist/js/ui.js";
import { renderMap } from "../dist/js/map.js";

test("Objective prompts enforce prerequisites and remove completed pickups", () => {
  const s = newGame();
  assert.equal(availability("key", s).available, false);
  s.flags.push("car","battery");
  assert.equal(availability("key", s).available, true);
  s.flags.push("key");
  assert.equal(availability("key", s).hidden, true);
  assert.equal(availability("fuse", s).available, true);
  assert.match(availability("terminal", s).reason, /REPAIR SUPPLIES/);
});
test("Trap readiness matches actor position, room depth, and player safety", () => {
  const s = { ...newGame(), flags: FLAG_IDS.slice(0, 8) };
  assert.equal(availability("trap", s, {pos:{x:-15}}, {x:-24,z:76}).available, true);
  for (const [player, actor] of [[{x:-22},{x:-24,z:76}], [{x:-15},{x:-18,z:76}], [{x:-15},{x:-24,z:50}]])
    assert.equal(availability("trap", s, {pos:player}, actor).available, false);
});
test("A wall near the object blocks a prompt; a low desk allows a visible item", () => {
  const item = { id: "key", label: "Take key", pos: {x:0,y:1,z:2.4} };
  const eye = {x:0,y:1.68,z:0}, delta = {x:0,y:-0.68,z:2.4}, length = Math.hypot(delta.y,delta.z);
  const forward = {x:0,y:delta.y/length,z:delta.z/length};
  const wall = {x:0,y:2,z:2.3,w:3,h:4,d:0.05};
  assert.equal(selectInteraction([item],eye,forward,[wall]),null);
  const desk = {x:0,y:0.45,z:2.5,w:3,h:0.9,d:1};
  assert.equal(selectInteraction([item],eye,forward,[desk]).usable,true);
  assert.equal(sightClear(eye,item.pos,[wall]),false);
});
test("Prompts and use share reach, aim, and availability without stale targets", () => {
  const item={id:"power",label:"Panel",pos:{x:0,y:1.6,z:2}}, eye={x:0,y:1.6,z:0}, f={x:0,y:0,z:1};
  const locked = selectInteraction([item],eye,f,[],()=>({available:false,reason:"Needs fuse"}));
  assert.equal(locked.usable,false); assert.equal(locked.reason,"Needs fuse");
  assert.equal(selectInteraction([item],eye,{x:1,y:0,z:0},[],undefined,"power"),null);
  item.pos.z=3.4;
  assert.equal(selectInteraction([item],eye,f,[]).reason,"Move closer");
});
test("Hints escalate on request; pauses/chases do not spend the reminder clock", () => {
  const s={...newGame(),flags:FLAG_IDS.slice(0,6)}, h=new Guidance(s);
  for(let i=0;i<100;i++) assert.equal(h.tick(1,s,true),false);
  assert.equal(h.idle,0);
  assert.equal(h.tick(60,s,false),true);
  assert.equal(h.tick(60,s,false),false);
  assert.equal(h.request(s).level,1);
  assert.equal(h.request(s).level,2);
  assert.match(h.request(s).text,/1986/);
  s.flags.push("terminal"); h.tick(0,s,false);
  assert.equal(h.level,0); assert.equal(destination(s).room,"garage");
});
test("New hint binding preserves older custom keys; saves sanitise discovery metadata", () => {
  const bindings={...DEFAULT_SETTINGS.bindings,interact:"KeyH"}; delete bindings.hint;
  const settings=validateSettings({bindings});
  assert.equal(settings.bindings.interact,"KeyH");
  assert.equal(keyName("ArrowLeft"),"←");
  assert.equal(keyName("ArrowRight"),"→");
  assert.equal(keyName("KeyH"),"H");
  assert.notEqual(settings.bindings.hint,"KeyH");
  assert.equal(new Set(Object.values(settings.bindings)).size,Object.keys(settings.bindings).length);
  const restored=validateSave({...newGame(),visited:["security","bad","security"],tutorial:["look","bad"]});
  assert.deepEqual(restored.visited,["security"]); assert.deepEqual(restored.tutorial,["look"]);
  const legacy={...newGame()}; delete legacy.visited; delete legacy.tutorial;
  assert.deepEqual(validateSave(legacy).visited,[]);
});
test("Floor plan identifies the current destination, visited rooms, and unlocked passage", () => {
  const s={...newGame(),flags:FLAG_IDS.slice(0,3)};
  const html=renderMap({x:-20,z:18},destination(s),["security"],s.flags);
  assert.match(html,/03 · WORKSHOP/); assert.match(html,/YOUR POSITION/);
  assert.match(html,/#35534e/); assert.match(html,/Dashed gold/);
});
test("Route edges cannot jump across a thin wall between unblocked grid centres", () => {
  const rects=[{x:0,y:2,z:12.8,w:12,h:4,d:0.08}];
  const start={x:0,z:7},goal={x:0,z:19};
  const path=findPath(start,goal,rects);
  assert.ok(path.length);
  let previous=start;
  for(const p of [...path,goal]) { assert.equal(lineClear(previous,p,rects,0.32),true); previous=p; }
});
