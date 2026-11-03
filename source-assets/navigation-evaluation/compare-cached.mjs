/** Interleaved CPU-only comparison. Prototype has no world/game integration. */
import fs from 'node:fs';import {performance} from 'node:perf_hooks';
import * as baseline from './baseline-js/navigation.js?v=1.10.0';
import * as cached from './baseline-js/navigation-cached-prototype.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./garage-fixture.json',import.meta.url))),previous=JSON.parse(fs.readFileSync(new URL('./navigation-comparison.json',import.meta.url)));
const rects=fixture.rects,grille=rects.find(r=>/grille/.test(r.name));
const prep={};for(const [name,mod] of Object.entries({baseline,cached})){const t=performance.now();mod.prepareNavigation(rects);prep[name]=performance.now()-t;}
const summary=a=>{a.sort((x,y)=>x-y);return {medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1)}};
const report=[];
for(const c of previous.caseResults){
 if(grille)grille.enabled=!!c.closed;
 const values={baseline:[],cached:[]};let valid=true,equalFound=true;
 for(let i=0;i<80;i++){
  const found=[];
  for(const [name,mod] of (i%2?Object.entries({baseline,cached}):Object.entries({cached,baseline}))){
   const t=performance.now(),r=mod.reachableGoal(c.start,c.goal,rects),elapsed=performance.now()-t;if(i>=10)values[name].push(elapsed);found.push(!!r);
   if(r){let p=c.start;for(const q of [...r.path,r.goal]){if(!baseline.lineClear(p,q,rects,baseline.AGENT_RADIUS)||baseline.blocked(q.x,q.z,rects,baseline.AGENT_RADIUS))valid=false;p=q;}}
  }
  if(found[0]!==found[1])equalFound=false;
 }
 report.push({name:c.name,baseline:summary(values.baseline),cached:summary(values.cached),allSegmentsClear:valid,equalFound});
}
const output={scope:'CPU-only interleaved queries; same actual fixture; cached prototype NOT integrated or browser tested',preparationMs:prep,changes:['precomputed coordinate objects','per-query cached dynamic endpoint blockage','no failed-edge string allocation when avoided set empty','octile heuristic'],report};
fs.writeFileSync(new URL('./cached-grid-comparison.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
