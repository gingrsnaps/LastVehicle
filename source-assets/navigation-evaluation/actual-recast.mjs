/** Actual Recast/Detour 1.6.4 WASM experiment through Babylon 9.33.1.
 * CPU-only research. Uses 1.10 actual imported collider fixture, flat walkable
 * floor and 2.5m tall proxy obstacles matching the shipped 2D blocker model.
 * Recast is vendored in this optional research folder, not in the game runtime.
 */
import fs from 'node:fs';import {createRequire} from 'node:module';import {performance} from 'node:perf_hooks';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import * as grid from './baseline-js/navigation-cached-prototype.js';
const here=dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
if(!process.argv[2])throw Error('Pass the absolute root of the matching LastVehicle project.');
const game=process.argv[2];require(resolve(game,'dist/vendor/babylon.js'));
const makeRecast=require('./recast-1.6.4/package/recast.wasm.js');
let started=performance.now();const R=await makeRecast({wasmBinary:fs.readFileSync(new URL('./recast-1.6.4/package/recast.wasm.wasm',import.meta.url))});const wasmInitMs=performance.now()-started;
const fixture=JSON.parse(fs.readFileSync(new URL('./garage-fixture.json',import.meta.url))),old=JSON.parse(fs.readFileSync(new URL('./navigation-comparison.json',import.meta.url)));
const rects=fixture.rects,grille=rects.find(r=>/grille/.test(r.name));grille.enabled=false;
grid.prepareNavigation(rects);
const V=(p,y=0)=>new BABYLON.Vector3(p.x,y,p.z),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const stats=a=>{a.sort((x,y)=>x-y);return {samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1)}};
const validate=(p,start,goal)=>{
 let last=start,clear=true;for(const q of p){if(!grid.lineClear(last,q,rects,grid.AGENT_RADIUS)||grid.blocked(q.x,q.z,rects,grid.AGENT_RADIUS))clear=false;last=q;}
 return {points:p.length,segmentClear:clear&&p.length>0,reachesGoal:p.length>0&&dist(p.at(-1),goal)<.15,firstOffset:p.length?dist(start,p[0]):null,lastOffset:p.length?dist(p.at(-1),goal):null,minY:p.length?Math.min(...p.map(x=>x.y)):null,maxY:p.length?Math.max(...p.map(x=>x.y)):null};
};
const variants=[];
for(const mode of ['standard-radius','expanded-proxies']){
 const engine=new BABYLON.NullEngine(),scene=new BABYLON.Scene(engine),meshes=[];
 const floor=BABYLON.MeshBuilder.CreateGround('garage floor',{width:60,height:112},scene);floor.position.z=56;meshes.push(floor);
 const expansion=mode==='expanded-proxies'?grid.AGENT_RADIUS:0;
 for(const r of rects)if(r.enabled){const b=BABYLON.MeshBuilder.CreateBox(r.name||'blocker',{width:r.w+expansion*2,height:2.5,depth:r.d+expansion*2},scene);b.position.set(r.x,1.25,r.z);meshes.push(b);}
 const nav=new BABYLON.RecastJSPlugin(R);
 const config={cs:.1,ch:.1,walkableSlopeAngle:35,walkableHeight:19,walkableClimb:0,walkableRadius:mode==='standard-radius'?4:0,maxEdgeLen:120,maxSimplificationError:.3,minRegionArea:2,mergeRegionArea:8,maxVertsPerPoly:6,detailSampleDist:6,detailSampleMaxError:.2,tileSize:32,borderSize:mode==='standard-radius'?7:3};
 started=performance.now();nav.createNavMesh(meshes,config);const bakeMs=performance.now()-started;nav.setDefaultQueryExtent(new BABYLON.Vector3(.6,.6,.6));
 const data=nav.getNavmeshData();fs.writeFileSync(resolve(here,'recast-'+mode+'.bin'),data);
 const debug=nav.createDebugNavMesh(scene),triangles=debug.getTotalIndices()/3;debug.dispose();
 const cases=[];
 for(const c of old.caseResults.filter(c=>!c.closed)){
  const times=[],gtimes=[];let p,g;
  for(let i=0;i<70;i++){
   const funcs=[()=>{const t=performance.now();p=nav.computePath(V(c.start),V(c.goal));if(i>=10)times.push(performance.now()-t)},()=>{const t=performance.now();g=grid.reachableGoal(c.start,c.goal,rects);if(i>=10)gtimes.push(performance.now()-t)}];
   if(i%2)funcs.reverse();for(const fn of funcs)fn();
  }
  cases.push({name:c.name,nav:stats(times),grid:stats(gtimes),validation:validate(p,c.start,c.goal),path:p.map(q=>({x:q.x,y:q.y,z:q.z}))});
 }
 const c=old.caseResults.find(c=>c.closed),before=nav.computePath(V(c.start),V(c.goal));
 grille.enabled=true;started=performance.now();const obstacle=nav.addBoxObstacle(V(grille,1.25),new BABYLON.Vector3(grille.w/2+expansion,1.25,grille.d/2+expansion),0);
 // Legacy API exposes update() but no completion return. Bounded 32 updates
 // are used for this small single-obstacle experiment; results validate outcome.
 for(let i=0;i<32;i++)nav.navMesh.update();const closeUpdateMs=performance.now()-started;
 const closed=nav.computePath(V(c.start),V(c.goal));
 const closedCheck=validate(closed,c.start,c.goal);
 started=performance.now();nav.removeObstacle(obstacle);for(let i=0;i<32;i++)nav.navMesh.update();const openUpdateMs=performance.now()-started;grille.enabled=false;
 const opened=nav.computePath(V(c.start),V(c.goal));
 const restored=new BABYLON.RecastJSPlugin(R);started=performance.now();restored.buildFromNavmeshData(data);restored.setDefaultQueryExtent(new BABYLON.Vector3(.6,.6,.6));const restoreMs=performance.now()-started;
 const restoredPath=restored.computePath(V(c.start),V(c.goal));
 grille.enabled=true;const restoredObstacle=restored.addBoxObstacle(V(grille,1.25),new BABYLON.Vector3(grille.w/2+expansion,1.25,grille.d/2+expansion),0);
 for(let i=0;i<32;i++)restored.navMesh.update();
 const restoredClosed=validate(restored.computePath(V(c.start),V(c.goal)),c.start,c.goal);
 restored.removeObstacle(restoredObstacle);for(let i=0;i<32;i++)restored.navMesh.update();grille.enabled=false;
 variants.push({mode,config,bakeMs,restoreMs,serializedBytes:data.length,navTriangles:triangles,sourceProxyCount:meshes.length,cases,dynamicDoor:{before:validate(before,c.start,c.goal),closed:closedCheck,opened:validate(opened,c.start,c.goal),closeUpdateMs,openUpdateMs,restored:validate(restoredPath,c.start,c.goal),restoredClosed,closedPath:closed.map(q=>({x:q.x,y:q.y,z:q.z}))}});
 restored.dispose();nav.dispose();scene.dispose();engine.dispose();
}
const result={scope:'Actual Recast/Detour WASM, Node CPU only. Collider-proxy geometry follows flat-floor gameplay; not original render mesh triangles. No browser, GPU or perceived smoothness measured.',version:'recast-detour@1.6.4',babylon:'9.33.1',wasmInitMs,variants};
fs.writeFileSync(resolve(here,'actual-recast-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({wasmInitMs,variants:variants.map(v=>({mode:v.mode,bakeMs:v.bakeMs,restoreMs:v.restoreMs,bytes:v.serializedBytes,triangles:v.navTriangles,cases:v.cases.map(c=>({name:c.name,navP95:c.nav.p95Ms,gridP95:c.grid.p95Ms,...c.validation})),dynamicDoor:v.dynamicDoor}))},null,2));
