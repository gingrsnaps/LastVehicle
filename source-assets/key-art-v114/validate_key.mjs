/** Validate the actual GLB through the same Babylon version used by the game.
 * This verifies geometry and anchors; it does not claim browser visual QA. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylon.js')));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylonjs.loaders.min.js')));
const B=globalThis.BABYLON,build=JSON.parse(fs.readFileSync(path.join(root,'key-build.json')));
const data=new Uint8Array(fs.readFileSync(path.resolve(root,'../../dist/assets',build.file)));
assert.equal(createHash('sha256').update(data).digest('hex'),build.sha256);
const jsonLength=new DataView(data.buffer).getUint32(12,true);
const gltf=JSON.parse(new TextDecoder().decode(data.slice(20,20+jsonLength)));
assert.equal(gltf.images?.length||0,0);assert.equal(gltf.animations?.length||0,0);
assert.ok(!gltf.buffers.some(b=>b.uri));
const engine=new B.NullEngine(),results=[];
for(const rightHanded of [true,false]){
 const scene=new B.Scene(engine);scene.useRightHandedSystem=rightHanded;
 const c=await B.LoadAssetContainerAsync(data,scene,{pluginExtension:'.glb'});c.addAllToScene();
 let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],triangles=0;
 const meshes=c.meshes.filter(m=>m.getTotalVertices());
 for(const m of meshes){
  m.computeWorldMatrix(true);const box=m.getBoundingInfo().boundingBox;
  for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],box.minimumWorld.asArray()[i]);hi[i]=Math.max(hi[i],box.maximumWorld.asArray()[i]);}
  const p=m.getVerticesData('position'),n=m.getVerticesData('normal');
  assert.ok(p.every(Number.isFinite)&&n.every(Number.isFinite));
  for(let i=0;i<n.length;i+=3)assert.ok(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)<1e-5);
  triangles+=m.getTotalIndices()/3;
 }
 assert.equal(triangles,build.triangles);assert.ok(Math.abs(lo[1])<1e-6);
 const expectedLo=rightHanded?build.bounds_min:[-build.bounds_max[0],build.bounds_min[1],build.bounds_min[2]];
 const expectedHi=rightHanded?build.bounds_max:[-build.bounds_min[0],build.bounds_max[1],build.bounds_max[2]];
 for(let i=0;i<3;i++){assert.ok(Math.abs(lo[i]-expectedLo[i])<1e-5);assert.ok(Math.abs(hi[i]-expectedHi[i])<1e-5);}
 const anchors={};
 for(const [name,p] of Object.entries(build.anchors)){
  const node=[...c.transformNodes,...c.meshes].find(n=>n.name==='maintenance-key-v114__'+name);assert.ok(node,name);node.computeWorldMatrix(true);
  const actual=node.getAbsolutePosition().asArray(),expected=[rightHanded?p[0]:-p[0],p[1],p[2]];
  for(let i=0;i<3;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-5,name);
  anchors[name]=actual;
 }
 results.push({rightHanded,triangles,meshes:meshes.length,materials:c.materials.length,bounds_min:lo,bounds_max:hi,anchors});
 c.dispose();scene.dispose();
}
engine.dispose();
const report={passed:true,engine:'Babylon.js 9.33.1 NullEngine',browser_visual_qa:false,external_dependencies:0,sha256:build.sha256,results};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
