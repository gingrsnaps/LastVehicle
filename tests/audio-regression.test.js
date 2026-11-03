import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/vendor/babylon.js';
import {AudioMixer} from '../dist/js/audio.js';
import {snapshotPosition} from '../dist/js/spatial-audio.js';
import {wireAudio} from './audio-fixture.js';
const player={pos:{x:8,z:76},height:1.68,yaw:0,pitch:0};
for(const modern of [true,false])test(`Battery Vector3 survives acoustic updates and disposal (${modern?'AudioParam':'legacy fallback'})`,()=>{
  const a=wireAudio(new AudioMixer(),modern),v=new BABYLON.Vector3(9.6,.5,77.16);
  const voice=a.play('tool-handling',{position:v});assert.ok(voice);
  assert.deepEqual(voice.position,{x:9.6,y:.5,z:77.16});
  v.x=NaN;v.z=Infinity; // pickup mesh can move or disappear after the sound starts.
  for(let i=0;i<15;i++)assert.doesNotThrow(()=>a.updateListener(player,[],.08));
  assert.equal(a.faultCount,0);
  a.position(voice,new BABYLON.Vector3(0,0,0));assert.deepEqual(voice.position,{x:0,y:0,z:0});
  a.position(voice,{x:NaN,y:0,z:0});assert.deepEqual(voice.position,{x:0,y:0,z:0});
  for(let i=0;i<100;i++){a.play('tool-handling',{position:new BABYLON.Vector3(9.6,.5,77.16)});a.updateListener(player,[],.08);}
  assert.equal(a.voices.size,24);a.stop();assert.equal(a.voices.size,0);
});
test('Invalid audio is bounded and cannot throw into game actions',()=>{
 const a=wireAudio(new AudioMixer());
 for(const p of [undefined,{}, {x:1,z:NaN},{x:Infinity,z:1},{x:1e100,z:1},{x:'1',z:1},{get x(){throw Error('disposed');},z:1}]){
   // Undefined means the option was omitted, so test through a missing axis.
   assert.equal(a.play('tool-handling',{position:p??{z:1}}),null);
 }
 assert.deepEqual(snapshotPosition({x:0,z:0}),{x:0,y:1,z:0});
 assert.ok(a.faults.length<=12);assert.equal(a.voices.size,0);
 const original=a.ctx.createPanner;a.ctx.createPanner=()=>{throw Error('device lost');};
 assert.doesNotThrow(()=>a.play('tool-handling',{position:{x:1,z:2}}));assert.equal(a.voices.size,0);
 a.ctx.createPanner=original;const v=a.play('tool-handling',{position:{x:1,z:2}});
 v.position.x=NaN;assert.doesNotThrow(()=>a.updateListener(player,[],.08));assert.equal(a.voices.size,0);
 assert.doesNotThrow(()=>a.updateListener({...player,yaw:NaN},[],.08));
});

test('New spatial contacts, quiet motif transitions, fan cutoff and valve relief retain finite mixer values',()=>{
 const names=['lv113-cart-impact','lv113-cart-wheel','lv113-pressure-burst','lv113-fan-stop','lv113-cloth-shift','lv113-motif','lv113-return','lv113-exit-rain','ambience','drip'];
 const a=wireAudio(new AudioMixer(),true,names);
 for(const name of names.slice(0,5))assert.ok(a.play(name,{position:{x:29.5,y:2.4,z:99.6},volume:.35}));
 a.loops.motif=a.play('lv113-motif',{loop:true,bus:'music',volume:0});a.loops.returnTheme=a.play('lv113-return',{loop:true,bus:'music',volume:0});
 a.loops.exitRain=a.play('lv113-exit-rain',{loop:true,bus:'ambience',volume:0});a.loops.ambience=a.play('ambience',{loop:true,volume:.17});
 a.worldLoops=[a.play('drip',{loop:true,volume:.45}),a.play('ambience',{loop:true,volume:.23})];
 a.updateScene(.3,'garage','patrol',{...player,pos:{x:13,z:78}},{flags:[],scares:[]},{reliefTime:0});assert.ok(a.loops.motif.volume>0);assert.equal(a.loops.returnTheme.volume,0);
 a.updateScene(.3,'garage','patrol',{...player,pos:{x:13,z:78}},{flags:['gate'],scares:['powerSurge']},{reliefTime:10});assert.equal(a.loops.motif.volume,0);assert.ok(a.loops.returnTheme.volume>0);assert.equal(a.worldLoops[1].volume,0);assert.equal(a.worldLoops[0].volume,.16);
 a.updateScene(.3,'garage','chase',player,{flags:['gate'],scares:['powerSurge']},{reliefTime:0});assert.equal(a.loops.returnTheme.volume,0);assert.equal(a.faultCount,0);assert.ok(a.ctx.writes.every(Number.isFinite));a.stop();
});
