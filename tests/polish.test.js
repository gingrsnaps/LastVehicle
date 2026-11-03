import test from "node:test";
import assert from "node:assert/strict";
import { RecoveryLog } from "../dist/js/recovery.js";
import { PursuitRoutes } from "../dist/js/pursuit.js";
import { Threat } from "../dist/js/threat.js";
import { AudioMixer } from "../dist/js/audio.js";
import { PARKED_CARS,PARKING_ROWS } from "../dist/js/placement.js";

test("Cars occupy bay centers and 042 keeps its wider opening clearance",()=>{
  for(const car of PARKED_CARS){
    const edges=PARKING_ROWS.find(r=>r.side===car.side).edges;
    assert.ok(car.z>edges[car.bay]+2&&car.z<edges[car.bay+1]-2);
  }
  const edges=PARKING_ROWS.find(r=>r.side===1).edges;
  assert.ok(edges.includes(73)&&edges.includes(83));assert.ok(!edges.includes(80));
});
test("Recovery diagnostics retain the stack and have bounded history",()=>{
  const log=new RecoveryLog(8);
  for(let i=0;i<1000;i++)log.record("objective",{id:String(i)});
  log.capture(new Error("synthetic fault"),{mode:"chase"});
  assert.equal(log.events.length,8);assert.match(log.error.stack,/synthetic fault/);
  assert.equal(log.events.at(-1).type,"fault");
});
test("Failed interception is cached between planning ticks and expires with evidence",()=>{
  const t=new Threat([],"hard");let calls=0;t.routes={intercept(){calls++;return null;}};
  t.lastKnown={x:2,z:5};t.lastVelocity={x:1,z:0};t.evidenceAge=0;
  for(let i=0;i<80;i++){t.clock=i/100;t.prediction();}
  assert.equal(calls,1);t.clock=1;t.prediction();assert.equal(calls,2);
  t.evidenceAge=20;assert.deepEqual(t.prediction(),t.lastKnown);
});
test("Route inference respects closed shutters and uses observed heading",()=>{
  const door={x:0,z:5,w:20,d:.5,name:"shortcut",dynamic:true,enabled:true};
  const routes=new PursuitRoutes([door],[{x:0,z:1},{x:0,z:9},{x:0,z:13}]);
  assert.equal(routes.distance({x:0,z:1},{x:0,z:13}),Infinity);
  door.enabled=false;assert.equal(routes.distance({x:0,z:1},{x:0,z:13}),12);
  const rules={intercept:true,predictDistance:5,predictTime:3,chase:3.75};
  assert.equal(routes.intercept({x:0,z:9},{x:0,z:-2},{x:0,z:12},rules)?.z,1);
  assert.equal(routes.intercept({x:0,z:9},{x:0,z:2},{x:0,z:12},rules)?.z,13);
});
test("Repeated weaker noises do not thrash a committed investigation",()=>{
  const t=new Threat([],"hard");t.mode="patrol";t.pos={x:0,z:0};t.clock=10;
  t.hear({x:0,z:5},40);const target={...t.destination};
  t.hear({x:4,z:5},7);assert.deepEqual(t.destination,target);
  t.clock+=2;t.hear({x:4,z:5},20);assert.deepEqual(t.destination,{x:4,z:5});
});
test("Stopping audio releases every node immediately and repeated stops are safe",()=>{
  const mixer=new AudioMixer();let stopped=0,disconnected=0;
  for(let i=0;i<24;i++)mixer.voices.add({src:{stop(){stopped++;},disconnect(){disconnected++;}},gain:{disconnect(){disconnected++;}}});
  mixer.stop();assert.equal(mixer.voices.size,0);assert.equal(stopped,24);assert.equal(disconnected,48);
  mixer.stop();assert.equal(stopped,24);
});
