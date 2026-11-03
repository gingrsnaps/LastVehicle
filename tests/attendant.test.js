import test from "node:test";
import assert from "node:assert/strict";
import { Threat } from "../dist/js/threat.js";
import { EncounterDirector, MAJOR_ENCOUNTERS } from "../dist/js/encounters.js";
import { newGame, validateSave, FLAG_IDS } from "../dist/js/state.js";
import { sceneMix } from "../dist/js/audio.js";
const player=(x=0,z=1.3)=>({pos:{x,z},height:1.68,yaw:0,pitch:0,flashlight:true});
for(const difficulty of ["easy","medium","hard"]){
  test(`Attacks on ${difficulty} have a real windup, can miss, and recover`,()=>{
    const t=new Threat([],difficulty),p=player();t.pos={x:0,z:0};t.mode="chase";t.yaw=0;t.suspicion=1;
    const first=t.tick(.016,p);assert.equal(first.attackStarted,true);assert.equal(first.caught,false);
    const wind=t.rules.attackWindup;let elapsed=0;
    while(elapsed<wind-.05){assert.equal(t.tick(.01,p).caught,false);elapsed+=.01;}
    assert.deepEqual(t.pos,{x:0,z:0},"the raised-arm tell does not move the enemy");
    p.pos={x:2.2,z:1.3};let missed=false;
    for(let i=0;i<40;i++){const r=t.tick(.01,p);assert.equal(r.caught,false);missed ||= !!r.attackMissed;}
    assert.equal(missed,true);assert.equal(t.mode,"recover");
    const location={...t.pos};t.tick(.1,p);assert.deepEqual(t.pos,location,"recovery is a usable escape window");
  });
}
test("A committed attack cannot follow a sideways dodge, capture through a wall, or hit twice",()=>{
  const t=new Threat([]),p=player(0,.9);t.pos={x:0,z:0};t.beginAttack(p);
  let hits=0;for(let i=0;i<120;i++)hits+=Number(t.tickAttack(.01,p).caught);
  assert.equal(hits,1);
  const wall={x:0,z:.5,y:1.2,w:5,d:.15,h:2.4};
  const protectedThreat=new Threat([wall]);protectedThreat.pos={x:0,z:0};protectedThreat.beginAttack(p);
  for(let i=0;i<120;i++)assert.equal(protectedThreat.tickAttack(.01,p).caught,false);
  assert.ok(protectedThreat.pos.z<.2);
});
test("Prediction follows observed direction and expires without reading hidden coordinates",()=>{
  const t=new Threat([]),p=player(0,8);t.mode="chase";t.suspicion=1;t.pos={x:0,z:0};t.yaw=0;
  t.tick(.1,p);p.pos.x=.4;t.tick(.1,p);
  const evidence={...t.lastKnown};assert.ok(t.lastVelocity.x>1);
  p.hiding={id:"unseen"};p.pos={x:50,z:50};t.tick(.1,p);
  assert.deepEqual(t.lastKnown,evidence);assert.deepEqual(t.destination,evidence,"first approach the last observed corner");
  const predicted=t.prediction();assert.ok(predicted.x>evidence.x&&predicted.x<10);
  t.pos={...evidence};t.tick(.1,p);assert.equal(t.mode,'listen',"listen at the last corner before a cover search");
  t.evidenceAge=t.rules.predictTime+.1;assert.deepEqual(t.prediction(),evidence);
});
test("A recently cleared locker is skipped, but becomes eligible after memory expires",()=>{
  const spots=[{id:"near",entry:{x:1,z:1}},{id:"far",entry:{x:20,z:20}}],t=new Threat([],"hard",spots);
  t.lastKnown={x:0,z:0};t.cleared.set("near",t.clock);t.beginSearch();assert.ok(t.searchPlan.every(p=>p.id!=="near"));
  t.clock+=46;t.beginSearch();assert.ok(t.searchPlan.some(p=>p.id==="near"));assert.ok(t.searchPlan.every(p=>p.id!=="far"));
});
test("Repeating a siren reduces investigation time and does not reset fresh chase evidence",()=>{
  const t=new Threat([],"hard"),noise={x:4,z:5};t.lure(noise,9);const first=t.lureTime;
  t.mode="patrol";t.lure(noise,9);assert.ok(t.lureTime<first);
  t.mode="chase";t.memory=t.rules.memory;t.lastKnown={x:9,z:9};assert.equal(t.lure(noise,9),false);assert.deepEqual(t.lastKnown,{x:9,z:9});
});
test("Flashlight clues require a visible beam patch and cannot pass a solid wall",()=>{
  const t=new Threat([]),p=player(0,0);p.yaw=Math.PI/2;t.pos={x:7,z:4};t.yaw=Math.PI;
  assert.ok(t.visibleBeam(p));p.flashlight=false;assert.equal(t.visibleBeam(p),null);p.flashlight=true;
  t.rects=[{x:7,z:2,y:1.5,w:18,d:.2,h:3}];assert.equal(t.visibleBeam(p),null);
});
test("Perception is sampled while movement continues between sensing ticks",()=>{
  const t=new Threat([]),p=player(0,14);t.mode="patrol";let checks=0;const see=t.canSee.bind(t);t.canSee=p=>{checks++;return see(p);};
  for(let i=0;i<120;i++)t.tick(1/120,p);
  assert.ok(checks>=8&&checks<=11,String(checks));assert.ok(t.pos.z>0);
});
test("Story beats queue once, yield to attacks, respect quiet time and preserve save records",()=>{
  const s=newGame(),d=new EncounterDirector(s);
  for(const id of MAJOR_ENCOUNTERS){assert.equal(d.request(id),true);assert.equal(d.request(id),false);}
  assert.equal(d.next({mode:"attack"}),null);
  assert.equal(d.next({mode:"patrol",ready:id=>id==="workshopBreach"}),"workshopBreach");
  assert.equal(d.next({mode:"patrol"}),null);d.commit("workshopBreach");
  assert.equal(d.next({mode:"patrol"}),null);d.tick(45.01,"patrol");
  assert.equal(d.next({mode:"patrol"}),"securityBreach");d.commit("securityBreach");
  const restored=validateSave({...s,flags:FLAG_IDS.slice(0,3)});assert.deepEqual(restored.scares,s.scares);
  assert.equal(new EncounterDirector(restored).queue.length,0);
});
test("Checkpoint continuation resumes only the latest unfinished beat and preserves older saves",()=>{
  const s={...newGame(),flags:FLAG_IDS.slice(0,6),scares:["watcher","cabinet"]},d=new EncounterDirector(s);
  assert.deepEqual(d.queue,["powerSurge"]);assert.deepEqual(validateSave(s).scares,s.scares);
});
test("New audio layers separate searching, pursuit and aftermath without masking the attack tell",()=>{
  const search=sceneMix("workshop","search"),attack=sceneMix("workshop","attack"),relief=sceneMix("workshop","patrol",false,false,true);
  assert.ok(search.unease>0);assert.equal(attack.unease,0);assert.ok(attack.tension>search.tension);
  assert.ok(relief.aftermath>0);assert.equal(relief.unease,0);
  for(const value of Object.values(sceneMix("workshop","attack",true)))assert.ok(value>=0&&value<.1);
});
