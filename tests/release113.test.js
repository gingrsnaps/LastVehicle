import test from 'node:test';
import assert from 'node:assert/strict';
import { LoopMemory } from '../dist/js/tactics.js';
import { difficultyRules } from '../dist/js/difficulty.js';
import { RouteFollower } from '../dist/js/locomotion.js';
import { prepareNavigation, routeSteps, createPathWorkspace, findPath, lineClear } from '../dist/js/navigation.js';
import { InteractionFocus } from '../dist/js/interaction.js';
import { ControllerInput, stick } from '../dist/js/controller.js';
import { PerformanceSetup } from '../dist/js/performance.js';
import { newGame, DEFAULT_SETTINGS, validateSettings, validateSave, FLAG_IDS } from '../dist/js/state.js';
import { EncounterDirector } from '../dist/js/encounters.js';
import { returnSummary } from '../dist/js/journal.js';
import { renderMap } from '../dist/js/map.js';
import { searchSettings } from '../dist/js/settings-help.js';

test('An observed repeated car loop earns a short cutoff on Medium/Hard, never on Easy',()=>{
 const rects=[{name:'sedan',x:0,z:20,w:2,d:4}],counts=[];
 for(const difficulty of ['easy','medium','hard']){
  const memory=new LoopMemory(rects),rules=difficultyRules(difficulty);
  for(let i=0;i<48;i++)memory.observe({x:2.7*Math.cos(i*.18),z:20+3.8*Math.sin(i*.18)},i*.36,rules,{x:-4,z:20});
  counts.push(memory.decisions);assert.equal(memory.goal(30),null,'inference expires instead of following hidden coordinates');
 }
 assert.equal(counts[0],0);assert.ok(counts[1]>0&&counts[2]>0);
 const discontinuous=new LoopMemory(rects);
 for(let i=0;i<48;i++)discontinuous.observe({x:2.7*Math.cos(i*.18),z:20+3.8*Math.sin(i*.18)},i*2,difficultyRules('hard'),{x:-4,z:20});
 assert.equal(discontinuous.decisions,0,'unseen gaps cannot be invented as a witnessed circle');
 const cart=new LoopMemory([{...rects[0],name:'dynamic storage cart'}]);
 cart.observe({x:2.7,z:20},0,difficultyRules('hard'),{x:-4,z:20});
 assert.equal(cart.samples.size,0,'small movable carts are not vehicle-loop landmarks');
});

test('Budgeted navigation survives an interleaved synchronous reachability check',()=>{
 const walls=[{x:0,z:30,w:28,d:1},{x:-12,z:37,w:1,d:14},{x:12,z:23,w:1,d:14}];prepareNavigation(walls);
 const start={x:-20,z:15},goal={x:20,z:46},job=routeSteps(start,goal,walls,new Set(),createPathWorkspace());
 let result,slices=0;
 do{result=job.next();slices++;if(!result.done){assert.ok(result.value.visited<=6000);findPath({x:20,z:10},{x:20,z:45},walls);}}while(!result.done&&slices<200);
 assert.ok(slices>1&&result.done);assert.ok(result.value?.path.length>5);
 let prior=start;for(const point of result.value.path){assert.equal(lineClear(prior,point,walls,.34),true);prior=point;}
});

test('Chase corners flow while an investigative right-angle turn plants its feet',()=>{
 const chase=new RouteFollower([]),search=new RouteFollower([]),a={x:0,z:10},b={...a},goal={x:8,z:10};
 const running=chase.step(a,0,goal,3,.05,1,'chase'),checking=search.step(b,0,goal,1.3,.05,1,'search');
 assert.ok(a.x>0);assert.equal(running.pose,null);assert.equal(b.x,0);assert.equal(checking.pose,'TurnRight');
 assert.equal(chase.planSlices,1);assert.equal(chase.planningReport().pending,false);
});

test('Brief aim drift keeps a handle, but a wall or changed requirement cannot keep a stale use action',()=>{
 const focus=new InteractionFocus(),item={id:'handle',pos:{x:0,y:1,z:2},radius:.2},eye={x:0,y:1,z:0};let allowed=true;
 const policy=()=>({available:allowed,reason:'A key is required'});
 assert.equal(focus.choose([item],eye,{x:0,y:0,z:1},[],policy,0).usable,true);
 const drift={x:.18,y:0,z:Math.sqrt(1-.18**2)};
 assert.equal(focus.choose([item],eye,drift,[],policy,80).item.id,'handle');
 allowed=false;assert.equal(focus.choose([item],eye,drift,[],policy,90).usable,false);
 assert.equal(focus.choose([item],eye,drift,[{x:0,z:1,y:1,w:2,d:.2,h:3}],policy,95),null);
 focus.reset();assert.equal(focus.choose([item],{...eye,z:-3},{x:0,y:0,z:1},[],policy,100),null);
});

test('Controller deadzones, neutral arming, button edges and disconnection prevent stuck inputs',()=>{
 const settings={...DEFAULT_SETTINGS,controllerEnabled:true},c=new ControllerInput();
 const pad={connected:true,mapping:'standard',index:0,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 assert.deepEqual(stick(.1,.02),{x:0,y:0});assert.ok(Math.abs(Math.hypot(...Object.values(stick(1,1)))-1)<1e-8);
 c.poll(settings,[pad]);pad.buttons[0].pressed=true;assert.deepEqual(c.poll(settings,[pad]).pressed,[0]);assert.deepEqual(c.poll(settings,[pad]).pressed,[]);
 c.clear();assert.deepEqual(c.poll(settings,[pad]).pressed,[]);pad.buttons[0].pressed=false;c.poll(settings,[pad]);pad.buttons[0].pressed=true;assert.deepEqual(c.poll(settings,[pad]).pressed,[0]);
 assert.equal(c.poll(settings,[]).disconnected,true);assert.equal(c.connected,false);
 assert.equal(c.poll(settings,[{...pad,mapping:''}]).pressed.length,0);
});

test('Guided performance suggestions require route coverage and leave manual settings intact',()=>{
 const setup=new PerformanceSetup(),settings={...DEFAULT_SETTINGS,quality:'high',shadows:'high'},before=structuredClone(settings);
 for(let i=0;i<600;i++)setup.sample(.05,40,{pos:{x:i*.06,z:78},yaw:i*.012,flashlight:true},i<300?'garage':'workshop',8,36);
 const report=setup.report(settings);assert.equal(report.complete,true);assert.equal(report.patch.quality,'low');assert.ok(report.patch.scale<1);assert.deepEqual(settings,before);
 const idle=new PerformanceSetup();for(let i=0;i<700;i++)idle.sample(.05,16.7,{pos:{x:0,z:10},yaw:0,flashlight:false},'garage',4,null);
 assert.equal(idle.done,false);
});

test('Chase duration and repeated failures reserve recovery time for all encounters',()=>{
 const state=newGame(),d=new EncounterDirector(state);d.request('securityBreach');
 for(let i=0;i<20;i++)d.tick(1,'chase');assert.equal(d.next({mode:'chase'}),null);
 d.tick(.1,'search');assert.ok(d.recovery>=17);assert.equal(d.next({mode:'search'}),null);
 for(let i=0;i<20;i++)d.tick(1,'patrol');assert.equal(d.next({mode:'patrol'}),'securityBreach');d.commit('securityBreach');
 d.quiet=0;d.request('pressureBurst');d.tick(.1,'patrol',2);assert.equal(d.next({mode:'patrol'}),null);
});

test('Recaps and map annotations derive from collected evidence and completed mechanism state',()=>{
 const state=newGame();state.flags=FLAG_IDS.slice(0,3);state.notes=['log'];state.journal.mechanisms=['fuse','terminal','malicious'];
 const restored=validateSave(state),summary=returnSummary(restored);assert.equal(summary.next,'Collect the repair supplies');assert.equal(summary.note,'log');assert.equal(restored.journal.mechanisms.includes('malicious'),false);
 assert.match(renderMap(null,null,[],restored.flags,restored.journal.mechanisms),/Requires · Collect the repair supplies/);
 restored.flags.push('fuse');assert.doesNotMatch(renderMap(null,null,[],restored.flags,restored.journal.mechanisms),/Requires · Collect the repair supplies/);
});

test('New preferences are validated and findable without changing difficulty',()=>{
 const prefs=validateSettings({controllerDeadzone:99,cameraShake:-2,subtitleBackground:NaN,monoAudio:true,difficulty:'easy'});
 assert.equal(prefs.controllerDeadzone,.4);assert.equal(prefs.cameraShake,0);assert.equal(prefs.subtitleBackground,.8);assert.equal(prefs.monoAudio,true);assert.equal(prefs.difficulty,'easy');
 assert.ok(searchSettings('drift').some(r=>r.key==='controllerDeadzone'));assert.ok(searchSettings('mono').some(r=>r.tab==='audio'));
});
