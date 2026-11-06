/** Load the exported runtime files through the game's bundled Babylon loader.
 * This is geometry/anchor QA, not a browser or gameplay playthrough. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylon.js')));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylonjs.loaders.min.js')));
const B=globalThis.BABYLON,build=JSON.parse(fs.readFileSync(path.join(root,'yard-build.json')));
const engine=new B.NullEngine(),results=[];
for(const asset of build.assets){
 const data=new Uint8Array(fs.readFileSync(path.resolve(root,'../../dist',asset.file)));
 assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
 const jsonLength=new DataView(data.buffer).getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(data.slice(20,20+jsonLength)));
 assert.equal(gltf.images?.length||0,0);assert.equal(gltf.animations?.length||0,0);assert.equal(gltf.cameras?.length||0,0);
 assert.ok(!gltf.buffers.some(b=>b.uri));
 const perHandedness=[];
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
  assert.equal(triangles,asset.triangles);assert.ok(Math.abs(lo[1])<1e-6);assert.ok(triangles>=300&&triangles<=2000);
  const expectedLo=rightHanded?asset.bounds_min:[-asset.bounds_max[0],asset.bounds_min[1],asset.bounds_min[2]];
  const expectedHi=rightHanded?asset.bounds_max:[-asset.bounds_min[0],asset.bounds_max[1],asset.bounds_max[2]];
  for(let i=0;i<3;i++){assert.ok(Math.abs(lo[i]-expectedLo[i])<1e-5);assert.ok(Math.abs(hi[i]-expectedHi[i])<1e-5);}
  const anchors={};
  for(const [name,info] of Object.entries(asset.anchors)){
   const p=info.position,node=[...c.transformNodes,...c.meshes].find(n=>n.name===asset.id+'__'+name);assert.ok(node,name);node.computeWorldMatrix(true);
   const actual=node.getAbsolutePosition().asArray(),expected=[rightHanded?p[0]:-p[0],p[1],p[2]];
   for(let i=0;i<3;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-5,name);
   anchors[name]=actual;
  }
  perHandedness.push({rightHanded,triangles,meshes:meshes.length,materials:c.materials.length,bounds_min:lo,bounds_max:hi,anchors});
  c.dispose();scene.dispose();
 }
 results.push({id:asset.id,sha256:asset.sha256,results:perHandedness});
}
engine.dispose();
const report={passed:true,engine:'Babylon.js 9.33.1 NullEngine',browser_visual_qa:false,external_dependencies:0,assets:results.length,total_triangles:build.total_triangles,total_bytes:build.total_bytes,results};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,assets:results.length,total_triangles:build.total_triangles,total_bytes:build.total_bytes}));
