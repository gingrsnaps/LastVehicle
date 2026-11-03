/** Check the delivered GLBs through Babylon's actual loader, not source shapes.
 * Usage: node validate_models.mjs /absolute/path/to/project/dist/vendor
 * NullEngine checks transforms/materials/anchors; it is not a GPU render test.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const vendor=process.argv[2] || path.resolve(root,'../../dist/vendor');
await import(pathToFileURL(path.join(vendor,'babylon.js')));
await import(pathToFileURL(path.join(vendor,'babylonjs.loaders.min.js')));
const B=globalThis.BABYLON,manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const engine=new B.NullEngine(),scene=new B.Scene(engine);scene.useRightHandedSystem=true;
const results=[];
for(const a of manifest.assets){
 const local=path.join(root,a.file),file=fs.existsSync(local)?local:path.resolve(root,'../../dist/assets/models/details',path.basename(a.file));
 const data=new Uint8Array(fs.readFileSync(file));
 const jsonSize=new DataView(data.buffer).getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(data.slice(20,20+jsonSize)));
 assert.ok(!(gltf.images||[]).some(i=>i.uri&&!i.uri.startsWith('data:')),'external image');
 assert.ok(!(gltf.buffers||[]).some(i=>i.uri&&!i.uri.startsWith('data:')),'external buffer');
 const c=await B.LoadAssetContainerAsync(data,scene,{pluginExtension:'.glb'});c.addAllToScene();
 const meshes=c.meshes.filter(m=>m.getTotalVertices());let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],tri=0;
 for(const m of meshes){m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.minimumWorld.asArray()[i]);max[i]=Math.max(max[i],b.maximumWorld.asArray()[i]);}tri+=m.getTotalIndices()/3;
  const pos=m.getVerticesData('position'),norm=m.getVerticesData('normal');assert.ok(pos.every(Number.isFinite)&&norm.every(Number.isFinite));
 }
 for(let i=0;i<3;i++){assert.ok(Math.abs(min[i]-a.bounds_min[i])<1e-5,a.id+' min axis '+i);assert.ok(Math.abs(max[i]-a.bounds_max[i])<1e-5,a.id+' max axis '+i);}
 assert.ok(Math.abs(min[1])<1e-6,a.id+' ground');if(a.support_type==='wall')assert.ok(Math.abs(min[2])<1e-6,a.id+' rear mount');assert.equal(tri,a.triangles);
 for(const [name,anchor] of Object.entries(a.anchors)){
  const node=[...c.transformNodes,...c.meshes].find(n=>n.name===anchor.node);assert.ok(node,a.id+' anchor '+name);node.computeWorldMatrix(true);const p=node.getAbsolutePosition().asArray();
  for(let i=0;i<3;i++)assert.ok(Math.abs(p[i]-anchor.position[i])<1e-5,a.id+' anchor transform '+name);
 }
 const leftScene=new B.Scene(engine); // default Babylon handedness used by the game
 const left=await B.LoadAssetContainerAsync(data,leftScene,{pluginExtension:'.glb'});left.addAllToScene();
 let leftMin=[Infinity,Infinity,Infinity],leftMax=[-Infinity,-Infinity,-Infinity];
 for(const mesh of left.meshes.filter(m=>m.getTotalVertices())){mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;for(let i=0;i<3;i++){leftMin[i]=Math.min(leftMin[i],box.minimumWorld.asArray()[i]);leftMax[i]=Math.max(leftMax[i],box.maximumWorld.asArray()[i]);}}
 const expectedMin=[-a.bounds_max[0],a.bounds_min[1],a.bounds_min[2]],expectedMax=[-a.bounds_min[0],a.bounds_max[1],a.bounds_max[2]];
 for(let i=0;i<3;i++){assert.ok(Math.abs(leftMin[i]-expectedMin[i])<1e-5,a.id+' LH min');assert.ok(Math.abs(leftMax[i]-expectedMax[i])<1e-5,a.id+' LH max');}
 for(const [name,anchor] of Object.entries(a.anchors)){const node=[...left.transformNodes,...left.meshes].find(n=>n.name===anchor.node);node.computeWorldMatrix(true);const p=node.getAbsolutePosition().asArray(),expect=[-anchor.position[0],anchor.position[1],anchor.position[2]];for(let i=0;i<3;i++)assert.ok(Math.abs(p[i]-expect[i])<1e-5,a.id+' LH anchor');}
 results.push({id:a.id,meshes:meshes.length,triangles:tri,materials:c.materials.length,minimum:min,maximum:max,left_handed_minimum:leftMin,left_handed_maximum:leftMax,external_dependencies:0,anchors_verified:Object.keys(a.anchors).length});left.dispose();leftScene.dispose();c.dispose();
}
scene.dispose();engine.dispose();fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify({passed:true,models:results.length,engine:'Babylon.js 9.33.1 NullEngine glTF and default left-handed validation',browser_visual_qa:false,results},null,2)+'\n');console.log('VALIDATED '+results.length+' actual GLBs');
