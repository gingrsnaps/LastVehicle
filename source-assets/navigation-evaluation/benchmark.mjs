/** Reproduce Node CPU measurements: node benchmark.mjs [output.json].
 * Reuses the preserved v1.10 source snapshot and actual GLB collision fixture.
 * No browser frame pacing, shader compilation, GPU time or user crash is measured.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {prepareNavigation,findPath,reachableGoal,blocked,lineClear,AGENT_RADIUS} from './baseline-js/navigation.js?v=1.10.0';
import {RouteFollower} from './baseline-js/locomotion.js';
import {CornerGraph} from './corner-graph.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const fixture=JSON.parse(readFileSync(resolve(here,'garage-fixture.json'))),rects=fixture.rects;
const stamp=()=>performance.now();
const stat=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,minMs:sorted[0],medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],maxMs:sorted.at(-1),totalMs:values.reduce((a,b)=>a+b,0)}};
const time=(fn,n=30)=>{for(let i=0;i<3;i++)fn();const values=[];let result;for(let i=0;i<n;i++){const a=stamp();result=fn();values.push(stamp()-a)}return {...stat(values),waypoints:result?.length??result?.path?.length??null,found:!!(result?.length??result)}};
let a=stamp();prepareNavigation(rects);const gridPrepareMs=stamp()-a;
a=stamp();const graph=new CornerGraph(rects);const graphPrepareMs=stamp()-a;
const grille=rects.find(r=>/grille/.test(r.name));
const cases=[
 {name:'clear central lane',start:{x:0,z:20},goal:{x:0,z:98}},
 {name:'Security alcove to hall',start:fixture.securityActor,goal:{x:-22,z:26}},
 {name:'west service passage',start:{x:-22,z:26},goal:{x:-22,z:76}},
 {name:'Workshop to Electrical',start:{x:-22,z:76},goal:{x:16.05,z:39}},
 {name:'around repaired vehicle',start:{x:9,z:78},goal:{x:13.67,z:75.6}},
 {name:'driver side to north exit',start:{x:13.67,z:75.6},goal:{x:-4,z:7}},
 {name:'blocked evidence inside vehicle',start:{x:9,z:78},goal:{x:13,z:78}},
 {name:'impossible beyond outer wall',start:{x:0,z:60},goal:{x:35,z:60}},
 {name:'closed workshop grille',start:{x:-22,z:76},goal:{x:-15,z:76},closed:true},
];
const results=[];
for(const c of cases){
 if(grille)grille.enabled=!!c.closed;
 const grid=time(()=>findPath(c.start,c.goal,rects));
 const production=time(()=>reachableGoal(c.start,c.goal,rects));
 const prototype=time(()=>graph.findPath(c.start,c.goal));
 const p=graph.findPath(c.start,c.goal);let prev=c.start,valid=true;
 for(const next of p){if(!lineClear(prev,next,rects,AGENT_RADIUS)||blocked(next.x,next.z,rects,AGENT_RADIUS))valid=false;prev=next;}
 results.push({...c,startBlocked:blocked(c.start.x,c.start.z,rects,AGENT_RADIUS),goalBlocked:blocked(c.goal.x,c.goal.z,rects,AGENT_RADIUS),gridRaw:grid,productionReachable:production,cornerGraph:prototype,cornerSegmentsValid:valid});
}
if(grille)grille.enabled=false;
const movement=[];
for(const c of cases.slice(0,6))for(const fps of [30,60,144]){
 const mover=new RouteFollower(rects),pos={...c.start},samples=[];let yaw=0,clock=0;
 for(let frame=0;frame<fps*70&&Math.hypot(pos.x-c.goal.x,pos.z-c.goal.z)>.12;frame++){
  clock+=1/fps;const t=stamp();yaw=mover.step(pos,yaw,c.goal,3.15,1/fps,clock).yaw;samples.push(stamp()-t);
 }
 movement.push({case:c.name,fps,simulatedSeconds:clock,reached:Math.hypot(pos.x-c.goal.x,pos.z-c.goal.z)<.12,recoveries:mover.recoveries,stepCPU:stat(samples)});
}
const report={scope:'Node-only CPU benchmark. Not GPU FPS or browser frame-time measurement.',baseline:fixture.baseCommit,version:fixture.baselineVersion,runtime:process.version,cpu:os.cpus()[0]?.model,rectangles:rects.length,gridPrepareMs,cornerGraphPrepareMs:graphPrepareMs,cornerGraphNodes:graph.nodes.length,cornerGraphEdges:graph.edges.reduce((s,e)=>s+e.length,0)/2,caseResults:results,movement};
const output=resolve(process.argv[2]||resolve(here,'navigation-comparison.json'));
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,gridPrepareMs,cornerGraphPrepareMs:graphPrepareMs,nodes:graph.nodes.length,cases:results.map(r=>({name:r.name,gridP95:r.gridRaw.p95Ms,reachableP95:r.productionReachable.p95Ms,cornerP95:r.cornerGraph.p95Ms,cornerValid:r.cornerSegmentsValid,found:r.cornerGraph.found})),movementWorstMs:Math.max(...movement.map(m=>m.stepCPU.maxMs)),allMovementReached:movement.every(m=>m.reached)},null,2));
