import { loadInBatches, consumeSteps } from './preparation.js?v=1.19.0';
import { loadSurfaceTexture } from './texture-loader.js?v=1.19.0';
const B=globalThis.BABYLON;

// One shared image pair per surface, measured in metres per repeat. UVs belong
// to geometry, not a per-object clone of the texture. This preserves batching.
export const SURFACE_TILES=Object.freeze({asphalt:2.08,concrete:1.23,brick:3,wood:1.8,metal:2,fabric:.3,grain:.18,'leaf-litter':3,moss:1.5,rust:1.5,peeling:2});
const native={
 floor:['concrete',.78,.83,.81],concrete:['concrete',.86,.9,.87],ceiling:['concrete',.64,.7,.68],
 teal:['metal',.47,.72,.67],steel:['metal',.82,.88,.86],yardAsphalt:['asphalt',.95,1,.98],
 yardWall:['brick',.8,.87,.81],yardRust:['rust',.82,.82,.76],yardMoss:['moss',.74,.85,.68],
 yardPavers:['concrete',.7,.77,.71],yardWood:['wood',.93,.92,.83],borderSoil:['leaf-litter',.8,.85,.73],
 bark:['wood',.52,.6,.45],decayMoss:['moss',.84,.93,.77],decayMold:['moss',.42,.51,.4],
 decayRust:['rust',.95,.95,.9],decayPeel:['peeling',.94,.98,.93],
 dark:['grain',.15,.21,.22],yellow:['grain',.8,.69,.43],rubber:['grain',.12,.15,.14],
 canvas:['fabric',.75,.81,.75],worker:['fabric',.36,.45,.43],glove:['fabric',.42,.5,.46],seatFabric:['fabric',.4,.49,.44],
 torchBody:['grain',.24,.35,.37],torchRim:['metal',.8,.88,.83],carPaint:['grain',.25,.46,.43],
 wood:['wood',.84,.81,.7],metalMedium:['metal',.7,.77,.74],metalDark:['grain',.23,.28,.27],carpet:['fabric',.6,.64,.59],
};
export function surfaceRecipe(name){
 if(native[name])return native[name];
 // Imported palettes keep their readable paper and glass. Existing Kenney color-map textures are deliberately preserved.
 const color=/^(?:Yard115|Meridian)_(steel|teal|rust|concrete|moss|dark|ochre|cloth|dust|rubber|wood)(?:\.\d+)?$/.exec(name)?.[1];
 const role={moss:'decayMoss',rust:'decayRust',ochre:'yellow',cloth:'canvas',dust:'concrete'}[color]||color;
 return role?native[role]:null;
}

/** Planar projection on each actual face fixes the one-tile-per-box stretching
 * that made a 100m floor and a small prop display the same-sized image. It also
 * works after glTF's handedness/scale transforms. Run before static batching. */
export function projectSurfaceUV(mesh,recipeForMaterial,onInvalid=()=>{}){
 const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),normals=mesh.getVerticesData(B.VertexBuffer.NormalKind);
 if(!positions||!normals)return 0;
 const materials=mesh.material?.subMaterials||[mesh.material],recipes=materials.map(recipeForMaterial);
 if(!recipes.some(Boolean))return 0;
 if(positions.length!==normals.length||positions.some(n=>!Number.isFinite(n))||normals.some(n=>!Number.isFinite(n))){onInvalid(mesh.name,'non-finite or incomplete vertex data');return 0;}
 mesh.computeWorldMatrix(true);
 const determinant=mesh.getWorldMatrix().determinant();
 if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12){onInvalid(mesh.name,'singular transform');return 0;}
 mesh.makeGeometryUnique();
 const world=mesh.getWorldMatrix(),normalMatrix=B.Matrix.Transpose(world.clone().invert()),indices=mesh.getIndices();
 const uv=Array.from(mesh.getVerticesData(B.VertexBuffer.UVKind)||new Float32Array(positions.length/3*2));
 const at=new B.Vector3(),normal=new B.Vector3(),p=new B.Vector3(),n=new B.Vector3();let written=0;
 const write=(i,recipe)=>{
   const scale=SURFACE_TILES[recipe[0]]||2;
   at.set(positions[i*3],positions[i*3+1],positions[i*3+2]);normal.set(normals[i*3],normals[i*3+1],normals[i*3+2]);
   B.Vector3.TransformCoordinatesToRef(at,world,p);B.Vector3.TransformNormalToRef(normal,normalMatrix,n);
   const x=Math.abs(n.x),y=Math.abs(n.y),z=Math.abs(n.z);
   if(y>=x&&y>=z){uv[i*2]=p.x/scale;uv[i*2+1]=p.z/scale;}
   else if(x>=z){uv[i*2]=p.z/scale;uv[i*2+1]=p.y/scale;}
   else {uv[i*2]=p.x/scale;uv[i*2+1]=p.y/scale;}
   written++;
 };
 if(materials.length===1){if(recipes[0])for(let i=0;i<positions.length/3;i++)write(i,recipes[0]);}
 else for(const sub of mesh.subMeshes||[]){const recipe=recipes[sub.materialIndex];if(recipe)for(let j=sub.indexStart;j<sub.indexStart+sub.indexCount;j++)write(indices[j],recipe);}
 mesh.setVerticesData(B.VertexBuffer.UVKind,uv);return written;
}

export class SurfaceLibrary {
 constructor(w){this.w=w;this.maps={};this.report={maps:0,materials:0,meshes:0,projectedVertices:0,invalidGeometry:[],missingMaterials:[],roles:{},reusedMaterials:0};}
 async load(readTexture=null){
   // Optional reader lets offline tests inspect real assignments without
   // claiming that NullEngine decoded or rendered the JPEGs.
   const texture=readTexture||(file=>loadSurfaceTexture(this.w,file));
   const jobs=['asphalt','concrete','brick','wood','metal','leaf-litter','fabric'].flatMap(id=>['albedo','roughness'].map(channel=>({id,channel})));
   // Two requests/decode preparations at a time. All finish behind loading UI.
   await loadInBatches(jobs,async({id,channel})=>{
     const t=await texture((id==='fabric'?'v118-':'v117-')+id+'-'+channel+'.jpg');
     if(t){t.gammaSpace=channel==='albedo';(this.maps[id]??={})[channel]=t;this.report.maps++;}
   },2);
   // Reuse existing CC0 decay textures; do not fetch duplicate image buffers.
   for(const [id,name] of [['moss','decayMoss'],['rust','decayRust'],['peeling','decayPeel']]){
     const m=this.w.materials[name];this.maps[id]={albedo:m?.albedoTexture,roughness:m?.metallicTexture};
   }
   // Fine grayscale variation reuses a shared map, without another GPU image.
   this.maps.grain={albedo:this.maps.metal?.roughness,roughness:this.maps.metal?.roughness};
   const required=['asphalt','concrete','brick','wood','metal','leaf-litter','fabric','grain'];
   if(!readTexture)required.push('moss','rust','peeling');
   const missing=required.filter(id=>!this.maps[id]?.albedo);this.report.missingMaterials=missing;
   if(missing.length)throw new Error('Required surface textures could not load: '+missing.join(', ')+'. Extract the complete package into a new folder and retry.');
   await consumeSteps(this.applySteps());
 }
 *applySteps(){
   const assigned=new Map();
   for(const m of this.w.scene.materials){
     const recipe=surfaceRecipe(m.name);if(!recipe||!('albedoColor' in m))continue;
     const maps=this.maps[recipe[0]];if(!maps?.albedo)continue;
     // Preserve image-bearing GLB atlases and their authored UVs.
     if(m.albedoTexture&&!m.name.startsWith('decay'))continue;
     // Only known solid palettes are eligible; signatures/icons retain their UVs.
     m.albedoColor.set(recipe[1],recipe[2],recipe[3]);m.albedoTexture=maps.albedo;
     m.metallicTexture=maps.roughness||null;m.useRoughnessFromMetallicTextureGreen=true;
     m.useRoughnessFromMetallicTextureAlpha=false;m.useMetallnessFromMetallicTextureBlue=false;
     m.roughness=1;assigned.set(m,recipe);this.report.materials++;this.report.roles[recipe[0]]=(this.report.roles[recipe[0]]||0)+1;yield;
   }
   for(const mesh of this.w.scene.meshes){
     if(!mesh.geometry)continue;
     const n=projectSurfaceUV(mesh,m=>assigned.get(m),(name,reason)=>{if(this.report.invalidGeometry.length<24)this.report.invalidGeometry.push({name,reason});});
     if(n){this.report.meshes++;this.report.projectedVertices+=n;}yield;
   }
   // Separate GLBs repeat the same palette. Share only materials whose full
   // serialized render state agrees; retain alpha, metalness and every flag.
   // This lets the later sector merger combine props across model files.
   const shared=new Map(),aliases=new Map();
   for(const m of assigned.keys()){
     if(!/^(Yard115|Meridian)_/.test(m.name)||m.animations?.length)continue;
     const data=m.serialize();delete data.name;delete data.id;delete data.uniqueId;
     const key=JSON.stringify(data),canonical=shared.get(key);
     if(canonical){aliases.set(m,canonical);this.report.reusedMaterials++;}else shared.set(key,m);
     yield;
   }
   for(const mesh of this.w.scene.meshes){
     if(aliases.has(mesh.material))mesh.material=aliases.get(mesh.material);
     else if(mesh.material?.subMaterials)mesh.material.subMaterials=mesh.material.subMaterials.map(m=>aliases.get(m)||m);
     yield;
   }
 }
}
