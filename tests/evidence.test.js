import test from 'node:test';
import assert from 'node:assert/strict';
import {EvidenceMemory,DecisionPolicy} from '../dist/js/evidence.js';
import {Threat} from '../dist/js/threat.js';
import {Footwear,groundKind} from '../dist/js/surfaces.js';
import {acousticRoute} from '../dist/js/acoustics.js';
import {audioOccluded} from '../dist/js/audio.js';

test('Evidence is bounded, retains separate clues, and expires without hidden position input',()=>{
  const m=new EvidenceMemory(3);
  m.observe('sight',{x:1,z:2},0,{confidence:1});
  m.observe('sound',{x:8,z:8},0,{confidence:.4,uncertainty:1.5});
  assert.equal(m.items.length,2);assert.equal(m.best(0).kind,'sight');
  m.observe('track',{x:5,z:5},1,{source:'print:1'});
  m.observe('door',{x:8,z:9},2,{source:'door:1'});assert.equal(m.items.length,3);
  m.prune(30);assert.equal(m.best(30),null);
});
test('Decisions retain a goal through similar distractions but direct sight interrupts',()=>{
  const m=new EvidenceMemory(),p=new DecisionPolicy();
  m.observe('sound',{x:2,z:2},0,{confidence:.6});
  const first=p.choose(m,0);
  m.observe('door',{x:10,z:10},.2,{confidence:.65});
  assert.deepEqual(p.choose(m,.2).goal,first.goal);
  m.observe('sight',{x:5,z:5},.3,{confidence:1});
  assert.equal(p.choose(m,.3,{visible:true,suspicion:1}).behavior,'chase');
  assert.deepEqual(p.choice.goal,{x:5,z:5});
  m.prune(20);assert.equal(p.choose(m,20),null);
});
test('Locker capture requires witnessed entry or corroborated evidence on Medium/Hard',()=>{
  const spot={id:'test-locker',entry:{x:0,z:5},yaw:0};
  for(const difficulty of ['easy','medium','hard'])for(const clue of ['none','sound','sight','track','expired']){
    const t=new Threat([],difficulty,[spot]);t.mode='patrol';t.pos={x:0,z:4.7};t.yaw=0;t.grace=0;t.clock=10;
    if(clue!=='none')t.evidence.observe(clue==='expired'?'sight':clue,spot.entry,clue==='expired'?0:9.5,{confidence:.9,source:'previous observation'});
    t.observeHide(spot,false);
    const expected=difficulty!=='easy'&&['sight','track'].includes(clue);
    assert.equal(t.inspectionAuthorized,expected,difficulty+' / '+clue);
    if(expected){
      // It must walk to the target and finish an actual inspection. Neither
      // a timer reset nor merely knowing the hidden ID is an instant capture.
      let caught=false;const player={pos:{x:400,z:400},hiding:{id:spot.id}};
      for(let i=0;i<300&&!caught;i++)caught=t.tick(1/60,player).caught;
      assert.equal(caught,true,difficulty+' inspection completes');
      assert.ok(Math.hypot(t.pos.x-spot.entry.x,t.pos.z-spot.entry.z)<.1);
    }
  }
});
test('Only fresh visible forward wet tracks inform a non-Easy enemy',()=>{
  for(const difficulty of ['easy','medium','hard']){
    const t=new Threat([],difficulty);t.mode='patrol';t.pos={x:0,z:0};t.yaw=0;
    t.observeTracks([{x:0,z:3,age:1,serial:1},{x:0,z:-2,age:1,serial:2},{x:0,z:2,age:9,serial:3},{x:0,z:2,age:1,serial:4,creature:true}]);
    assert.deepEqual(t.evidence.items.map(e=>e.source),difficulty==='easy'?[]:['track:1']);
  }
  const t=new Threat([{x:0,z:1.5,w:6,d:.2,y:1.5,h:3}]);t.mode='patrol';t.pos={x:0,z:0};t.yaw=0;
  t.observeTracks([{x:0,z:3,age:1,serial:1}]);assert.equal(t.evidence.items.length,0);
});
test('Wet shoes dry over real contacts and floor materials have narrow boundaries',()=>{
  const shoes=new Footwear();assert.equal(shoes.contact({x:3,z:65}).wetness,1);
  let wet=1;for(let i=0;i<7;i++){const next=shoes.contact({x:0,z:10}).wetness;assert.ok(next<wet||next===0);wet=next;}
  assert.equal(wet,0);assert.equal(groundKind({x:15.1,z:14}),'grate');
  assert.equal(groundKind({x:15.4,z:14}),'concrete');assert.equal(groundKind({x:-28.5,z:70}),'debris');
});
test('Doorway acoustics use two clear segments and respect a closed opening',()=>{
  const listener={x:-15,z:20},source={x:-20,z:10};
  const walls=[{x:-17,z:8,w:.4,d:17},{x:-17,z:27,w:.4,d:15}];
  const routed=acousticRoute(listener,source,(a,b)=>audioOccluded(a,b,walls));
  assert.equal(routed.kind,'doorway');assert.deepEqual(routed.point,{x:-17,y:1.3,z:18});
  walls.push({x:-17,z:18,w:.4,d:3});
  assert.equal(acousticRoute(listener,source,(a,b)=>audioOccluded(a,b,walls)).kind,'muffled');
  assert.equal(acousticRoute({x:0,z:0},{x:1,z:0},()=>false).kind,'direct');
});
test('A trapped actor approaches its grille contact before a single timed push cue',()=>{
  const t=new Threat([]);t.pos={x:-18.7,z:75.8};t.yaw=Math.PI/2;t.trap(12);
  let cues=0,firstPhase=null;const p={pos:{x:10,z:60},hiding:{id:'elsewhere'}};
  for(let i=0;i<800;i++){
    const r=t.tick(1/60,p);if(r.trapContactCue)cues++;
    if(r.animation==='DoorPush'&&firstPhase===null)firstPhase=r.phase;
  }
  assert.equal(cues,1);assert.ok(firstPhase<.05,'no snap to the contact pose on arrival');assert.notEqual(t.mode,'trapped');
});
