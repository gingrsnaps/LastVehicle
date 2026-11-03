import test from "node:test";
import assert from "node:assert/strict";
import { waitForReady } from "../dist/js/preparation.js";
import { AudioMixer, audioOccluded, sceneMix } from "../dist/js/audio.js";

test("Readiness waits for actual completion and rejects a timed-out preparation", async () => {
  let clock=0,checks=0;
  const options={timeoutMs:30,now:()=>clock,yieldFrame:async()=>{clock+=10;}};
  await waitForReady(()=>++checks===3,options);
  assert.equal(clock,20);
  clock=0;
  await assert.rejects(waitForReady(()=>false,options),/did not finish preparing/);
  assert.equal(clock,30);
});

test("Audio obstruction ignores the emitter's housing and disabled doors, but respects intervening walls", () => {
  const a={x:0,z:0},b={x:10,z:0};
  const housing={x:10,z:0,w:2,d:2},wall={x:5,z:0,w:.3,d:5};
  assert.equal(audioOccluded(a,b,[housing]),false);
  assert.equal(audioOccluded(a,b,[housing,wall]),true);
  assert.equal(audioOccluded(a,b,[housing,{...wall,enabled:false}]),false);
});

test("Positional audio spreads wall checks across slices and leaves unchanged filter parameters alone", () => {
  const mixer=new AudioMixer(), wall={x:5,z:0,w:.3,d:10};let writes=0;
  const param=()=>({setTargetAtTime(){writes++;}});
  mixer.ctx={currentTime:0,listener:{setPosition(){},setOrientation(){}}};
  mixer.wet={gain:{setTargetAtTime(){}}};
  const voices=Array.from({length:3},()=>({position:{x:10,z:0},panner:{setPosition(){}},volume:.5,filter:{frequency:param()},gain:{gain:param()}}));
  mixer.voices.add({}); // Non-positional music is never an obstruction test.
  for(const v of voices)mixer.voices.add(v);
  const player={pos:{x:0,z:0},yaw:0,pitch:0,height:1.68};
  mixer.updateListener(player,[wall],.08);
  assert.equal(voices.filter(v=>v.occluded===true).length,1);
  mixer.updateListener(player,[wall],.08);mixer.updateListener(player,[wall],.08);
  assert.equal(voices.filter(v=>v.occluded===true).length,3);assert.equal(writes,6);
  for(let i=0;i<3;i++)mixer.updateListener(player,[wall],.08);
  assert.equal(writes,6,"unchanged occlusion does not reschedule audio ramps");
  wall.enabled=false;mixer.updateListener(player,[wall],.08);
  assert.equal(voices.filter(v=>v.occluded===false).length,1);assert.equal(writes,8);
});

test("Room beds and tension follow real room/chase state, with quiet pauses and scare anticipation",()=>{
  const garage=sceneMix("garage","patrol"),workshop=sceneMix("workshop","patrol"),chase=sceneMix("workshop","chase");
  assert.ok(workshop.service>garage.service);assert.ok(chase.tension>workshop.tension);
  const duck=sceneMix("workshop","chase",true),pause=sceneMix("workshop","chase",false,true);
  for(const key of ["music","service","tension"]){assert.ok(duck[key]<chase[key]);assert.ok(pause[key]<chase[key]);}
  assert.ok(sceneMix("security","patrol").music<garage.music);
});
