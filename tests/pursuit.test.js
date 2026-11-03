import test from "node:test";
import assert from "node:assert/strict";
import { Threat } from "../dist/js/threat.js";

// These scenarios test the rules behind fair hiding. They do not claim to
// measure fear, animation quality, or browser frame pacing.
const spots=[
  {id:"a",entry:{x:0,z:5}},
  {id:"b",entry:{x:20,z:5}},
];
const hidden=id=>({pos:{x:id==="a"?0:20,z:6},hiding:{id},flashlight:false});
function active(difficulty="medium"){
  const t=new Threat([],difficulty,spots);t.activate({x:0,z:4.5});
  t.pos={x:0,z:0};t.yaw=0;t.grace=0;return t;
}
for(const difficulty of ["easy","medium","hard"]){
  test(`A witnessed locker entry can be caught on ${difficulty}`,()=>{
    const t=active(difficulty);t.observeHide(spots[0],true);
    let caught=false;
    for(let i=0;i<600&&!caught;i++)caught=t.tick(1/60,hidden("a")).caught;
    assert.equal(caught,true);assert.equal(t.witness,"a");
  });
}
test("Search chooses lockers from last evidence, never hidden player coordinates",()=>{
  for(const difficulty of ["medium","hard"]){
    const t=active(difficulty);t.beginSearch();
    assert.equal(t.inspectSpot.id,"a");
    for(let i=0;i<1200;i++)assert.equal(t.tick(1/60,hidden("b")).caught,false);
    assert.equal(t.lastKnown.x,0);
  }
  const easy=active("easy");easy.beginSearch();assert.equal(easy.inspectSpot,null);
});
test("Hiding cannot activate a dormant enemy or release a trapped one",()=>{
  const t=new Threat([],"hard",spots);t.observeHide(spots[0],true);
  assert.equal(t.mode,"dormant");t.trap(12);t.observeHide(spots[0],true);
  assert.equal(t.mode,"trapped");
});
test("Siren loses a fresh visual chase, lasts nine seconds, and leaves evidence at its source",()=>{
  const t=active();t.mode="chase";t.memory=t.rules.memory;
  assert.equal(t.lure({x:5,z:10},9),false);
  t.mode="search";assert.equal(t.lure({x:5,z:10},9),true);
  for(let i=0;i<541;i++)t.tick(1/60,hidden("b"));
  assert.notEqual(t.mode,"lured");assert.deepEqual(t.lastKnown,{x:5,z:10});
  t.trap(12);for(let i=0;i<721;i++)t.tick(1/60,hidden("b"));
  assert.notEqual(t.mode,"trapped");
});
test("Walls and darkness affect detection; display settings never enter perception",()=>{
  const t=active();t.pos={x:0,z:0};t.yaw=0;
  const player={pos:{x:0,z:15},visibility:.45,flashlight:false};
  assert.equal(t.canSee(player),false);player.flashlight=true;
  assert.equal(t.canSee(player),true);
  t.rects.push({x:0,z:8,w:6,d:.15});assert.equal(t.canSee(player),false);
  t.rects=[];player.vehicle=true;assert.equal(t.canSee(player),false);
});
