/** Import the actual GLBs through the game's bundled Babylon runtime.
 * This is deterministic geometry/anchor QA, not a browser gameplay test. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylon.js')));
await import(pathToFileURL(path.resolve(root,'../../dist/vendor/babylonjs.loaders.min.js')));
const B=globalThis.BABYLON;
const build=JSON.parse(fs.readFileSync(path.join(root,'scenery-build.json')));
assert.equal(build.assets.length,10); assert.ok(build.total_triangles<=9000);
const engine=new B.NullEngine(),results=[];
for(const asset of build.assets){
 const data=new Uint8Array(fs.readFileSync(path.resolve(root,'../../dist',asset.file)));
 assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
 const jsonLength=new DataView(data.buffer).getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(data.slice(20,20+jsonLength)));
 assert.equal(gltf.images?.length||0,0); assert.equal(gltf.textures?.length||0,0);
 assert.equal(gltf.animations?.length||0,0); assert.equal(gltf.cameras?.length||0,0);
 assert.ok(!gltf.buffers.some(b=>b.uri)); assert.ok(!gltf.extensions?.KHR_lights_punctual);
 assert.ok(gltf.materials.every(m=>(m.alphaMode||'OPAQUE')==='OPAQUE' && !m.doubleSided));
 assert.ok(gltf.materials.every(m=>build.material_names.includes(m.name)));
 assert.equal(gltf.meshes.length,1); assert.equal(gltf.meshes[0].primitives.length,asset.draw_calls_max);
 assert.ok(asset.parts.every(p=>p.closed && p.signed_volume_m3>0));
 const perHandedness=[];
 for(const rightHanded of [true,false]){
  const scene=new B.Scene(engine); scene.useRightHandedSystem=rightHanded;
  const c=await B.LoadAssetContainerAsync(data,scene,{pluginExtension:'.glb'}); c.addAllToScene();
  let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],triangles=0,normalMin=Infinity,normalMax=0;
  const meshes=c.meshes.filter(m=>m.getTotalVertices());
  assert.equal(meshes.length,asset.draw_calls_max);
  for(const m of meshes){
   m.computeWorldMatrix(true); const box=m.getBoundingInfo().boundingBox;
   for(let i=0;i<3;i++){
    lo[i]=Math.min(lo[i],box.minimumWorld.asArray()[i]);
    hi[i]=Math.max(hi[i],box.maximumWorld.asArray()[i]);
   }
   const p=m.getVerticesData('position'),n=m.getVerticesData('normal'),ix=m.getIndices(),uv=m.getVerticesData('uv');
   assert.ok(uv?.length===p.length/3*2&&uv.every(Number.isFinite),asset.id+' UV data');
   assert.ok(p.every(Number.isFinite)&&n.every(Number.isFinite));
   for(let i=0;i<n.length;i+=3){
    const length=Math.hypot(n[i],n[i+1],n[i+2]);
    assert.ok(Math.abs(length-1)<1e-5); normalMin=Math.min(normalMin,length); normalMax=Math.max(normalMax,length);
   }
   for(let i=0;i<ix.length;i+=3){
    const a=B.Vector3.FromArray(p,ix[i]*3),b=B.Vector3.FromArray(p,ix[i+1]*3),d=B.Vector3.FromArray(p,ix[i+2]*3);
    const cross=B.Vector3.Cross(b.subtract(a),d.subtract(a));
    assert.ok(cross.length()>1e-10,asset.id+' degenerate triangle');
    const normal=B.Vector3.FromArray(n,ix[i]*3);
    assert.ok(B.Vector3.Dot(cross.normalize(),normal)>.80,asset.id+' winding / normal mismatch');
   }
   triangles+=m.getTotalIndices()/3;
  }
  assert.equal(triangles,asset.triangles); assert.ok(Math.abs(lo[1])<1e-6);
  const expectedLo=rightHanded?asset.bounds_min:[-asset.bounds_max[0],asset.bounds_min[1],asset.bounds_min[2]];
  const expectedHi=rightHanded?asset.bounds_max:[-asset.bounds_min[0],asset.bounds_max[1],asset.bounds_max[2]];
  for(let i=0;i<3;i++){
   assert.ok(Math.abs(lo[i]-expectedLo[i])<1e-5,asset.id+' minimum '+i);
   assert.ok(Math.abs(hi[i]-expectedHi[i])<1e-5,asset.id+' maximum '+i);
  }
  if(asset.support_type==='wall') assert.ok(Math.abs(lo[2])<1e-6);
  const anchors={};
  for(const [name,info] of Object.entries(asset.anchors)){
   const p=info.position,node=[...c.transformNodes,...c.meshes].find(n=>n.name===asset.id+'__'+name);
   assert.ok(node,name); node.computeWorldMatrix(true);
   const actual=node.getAbsolutePosition().asArray(),expected=[rightHanded?p[0]:-p[0],p[1],p[2]];
   for(let i=0;i<3;i++) assert.ok(Math.abs(actual[i]-expected[i])<1e-5,name);
   anchors[name]=actual;
  }
  perHandedness.push({rightHanded,triangles,meshes:meshes.length,materials:c.materials.length,bounds_min:lo,bounds_max:hi,dimensions:hi.map((v,i)=>v-lo[i]),normal_length_min:normalMin,normal_length_max:normalMax,anchors});
  c.dispose(); scene.dispose();
 }
 results.push({id:asset.id,sha256:asset.sha256,closed_components:asset.closed_components,results:perHandedness});
}
engine.dispose();
const report={passed:true,engine:'Babylon.js '+B.Engine.Version+' NullEngine',browser_visual_qa:false,external_dependencies:0,textures:0,all_materials_opaque:true,all_source_components_closed:true,all_loaded_normals_finite_and_unit:true,all_triangles_non_degenerate:true,winding_matches_normals:true,assets:results.length,total_triangles:build.total_triangles,total_bytes:build.total_bytes,results};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,assets:results.length,total_triangles:build.total_triangles,total_bytes:build.total_bytes}));
