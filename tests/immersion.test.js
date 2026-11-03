import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteFollower } from '../dist/js/locomotion.js';
import { AGENT_RADIUS, blocked, prepareNavigation, reachableGoal } from '../dist/js/navigation.js';
import { PUDDLES, surfaceAt, footContact, stepProfile } from '../dist/js/surfaces.js';
import { AudioMixer } from '../dist/js/audio.js';
import { Threat } from '../dist/js/threat.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

for(const fps of [30,60,144])test(`Physical pursuit escapes a U-shaped obstacle at ${fps} FPS`,()=>{
  const walls=[{x:0,z:10,w:8,d:.35},{x:-4,z:14,w:.35,d:8},{x:4,z:14,w:.35,d:8}];
  const mover=new RouteFollower(walls),pos={x:0,z:7},goal={x:0,z:16};let yaw=0,clock=0;
  for(let i=0;i<fps*30&&dist(pos,goal)>.12;i++){
    clock+=1/fps;const step=mover.step(pos,yaw,goal,3.15,1/fps,clock);yaw=step.yaw;
    assert.equal(blocked(pos.x,pos.z,walls,AGENT_RADIUS),false);
  }
  assert.ok(dist(pos,goal)<.12,JSON.stringify({pos,failures:mover.failures,recoveries:mover.recoveries}));
});
test('A closing door invalidates the route and produces a collision-safe detour',()=>{
  const door={x:0,z:30,w:.3,d:8,dynamic:true,enabled:false};const walls=[door];prepareNavigation(walls);
  const mover=new RouteFollower(walls),pos={x:-5,z:30},goal={x:5,z:30};let yaw=Math.PI/2;
  for(let i=0;i<1200&&dist(pos,goal)>.12;i++){
    if(i===35)door.enabled=true;
    yaw=mover.step(pos,yaw,goal,3.15,1/60,i/60).yaw;
    assert.equal(blocked(pos.x,pos.z,walls,AGENT_RADIUS),false);
  }
  assert.ok(dist(pos,goal)<.12,JSON.stringify(pos));
});
test('Blocked evidence is projected to free floor without moving the actor',()=>{
  const pos={x:0,z:4},saved={...pos},box={x:0,z:8,w:1,d:1};
  const result=reachableGoal(pos,{x:0,z:8},[box]);
  assert.ok(result);assert.equal(blocked(result.goal.x,result.goal.z,[box],AGENT_RADIUS),false);assert.deepEqual(pos,saved);
});
test('Visible-player sensing does not erase navigation recovery history',()=>{
  const t=new Threat([]);t.pos={x:0,z:5};t.mode='chase';t.grace=0;t.yaw=0;t.suspicion=1;
  t.mover.failures=2;t.mover.successTravel=0;
  t.tick(.016,{pos:{x:0,z:12},flashlight:true,yaw:0,height:1.68});
  assert.equal(t.mover.failures,2);
});
test('Water contact matches every visible puddle edge and never an entire room',()=>{
  for(const p of PUDDLES){
    assert.equal(surfaceAt({x:p.x,z:p.z})?.id,p.id);
    assert.equal(surfaceAt({x:p.x+p.rx*.99,z:p.z})?.id,p.id);
    assert.notEqual(surfaceAt({x:p.x+p.rx*1.02,z:p.z})?.id,p.id);
  }
  assert.equal(surfaceAt({x:25,z:94}),null);
  const p={x:3,z:65},walk=stepProfile(p),run=stepProfile(p,{sprinting:true}),crouch=stepProfile(p,{crouched:true});
  assert.ok(run.hearing>walk.hearing&&walk.hearing>crouch.hearing);assert.ok(run.force>walk.force);
  assert.notDeepEqual(footContact(p,0,true),footContact(p,0,false));
});
test('Wet samples shuffle distinct recordings without immediate repetition',()=>{
  const a=new AudioMixer(),played=[];a.play=(name,opts)=>played.push({name,opts});
  for(let i=0;i<25;i++)a.footstep({x:3,y:.04,z:65},stepProfile({x:3,z:65}));
  assert.equal(new Set(played.slice(0,5).map(v=>v.name)).size,5);
  for(let i=1;i<played.length;i++)assert.notEqual(played[i].name,played[i-1].name);
  a.footstep({x:25,z:94},stepProfile({x:25,z:94}));assert.match(played.at(-1).name,/^concrete-step-[1-3]$/);
});
test('Unwitnessed locker inspection is a near discovery; witnessed entry still catches',()=>{
  const spot={id:'locker',entry:{x:0,z:5},yaw:Math.PI};
  for(const witnessed of [false,true]){
    const t=new Threat([],'hard',[spot]);t.pos={x:0,z:5};t.mode='inspect';t.inspectSpot=spot;t.destination={...spot.entry};t.searchTime=15;
    t.witness=witnessed?spot.id:null;let caught=false;
    for(let i=0;i<180&&!caught;i++)caught=t.tick(1/60,{pos:{x:0,z:4},hiding:{id:spot.id}}).caught;
    assert.equal(caught,witnessed);
  }
});

test('An about-face uses two planted quarter turns and a stopped creature accelerates from rest',()=>{
 const m=new RouteFollower([]),pos={x:0,z:0};let yaw=0,clock=0,turns=0,wasTurning=false;
 for(let i=0;i<150;i++){
  clock+=1/60;const before={...pos},r=m.step(pos,yaw,{x:0,z:-10},3,1/60,clock);yaw=r.yaw;
  const turning=!!r.pose?.startsWith('Turn');if(turning&&!wasTurning)turns++;
  if(turning)assert.deepEqual(pos,before);wasTurning=turning;
 }
 assert.ok(Math.cos(yaw)<-.95);assert.ok(pos.z<0);assert.ok(m.turnAction===null);
 const t=new Threat([]);t.pos={x:0,z:0};t.yaw=0;t.mode='investigate';t.clock=1;
 t.moveToward({x:0,z:20},3,1/60);assert.ok(t.speed<.07);
 t.clock+=5;t.movingSpeed=3;t.moveToward({x:0,z:20},3,1/60);assert.ok(t.speed<.07,'restart does not retain running velocity');
});
test('Attention uses the same uncertain evidence as hearing, never a hidden target',()=>{
 const t=new Threat([],'medium');t.pos={x:0,z:0};t.mode='patrol';t.grace=0;t.clock=5;
 t.hear({x:4.23,z:7.17},9);assert.deepEqual(t.attentionPoint(),t.lastKnown);
 assert.equal(t.listenHeading,Math.atan2(t.lastKnown.x,t.lastKnown.z));
 const known={...t.lastKnown};t.tick(.016,{pos:{x:100,z:100},hiding:{id:'unknown'}});
 assert.deepEqual(t.lastKnown,known);assert.notDeepEqual(t.attentionPoint(),{x:100,z:100});
});
