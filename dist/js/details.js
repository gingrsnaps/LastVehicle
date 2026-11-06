import { groundModel, PARKED_CARS } from './placement.js?v=1.19.0';
import { DRAIN_COVERS } from './surfaces.js?v=1.19.0';
import { yieldTask } from './preparation.js?v=1.19.0';
const B=globalThis.BABYLON;
// Ground/support Y and wall back planes are explicit, in metres. The same
// measured instance supplies its collider and its placement-audit record.
export const DETAIL_LAYOUT=[
 ['ticket-dispenser',4.9,0,6,Math.PI],['safety-bollard',4.1,0,4.4,0],['safety-bollard',-4.1,0,4.4,0],
 ['desk-lamp',-25.1,.925,18,0],['ticket-stack',-24.7,.925,18.3,.2],
 ['wall-clock',-29.75,2.5,20,Math.PI/2,'wall'],['fire-extinguisher',-16.795,.75,23,Math.PI/2,'wall'],
 ['conduit-junction',-29.75,2.7,25,Math.PI/2,'wall'],['wall-fan',-29.75,2.9,49,Math.PI/2,'wall'],
 ['parts-cabinet',-28.9,0,46,Math.PI/2],['cable-coil',-28.4,0,43,0],['warning-stand',-28.2,0,53,.3],
 ['tool-board',-29.75,1.4,70,Math.PI/2,'wall'],['battery-charger',-23.8,.925,68.7,0],
 ['tool-tray',-21.8,.925,69,.2],['folded-rag',-23.4,.925,69.35,-.3],
 ['maintenance-trolley',-24.2,0,79.6,Math.PI/2],['service-bucket',-28.7,0,79,0],
 ['electrical-box',29.75,1.4,33,-Math.PI/2,'wall'],['conduit-junction',29.75,2.6,35,-Math.PI/2,'wall'],
 ['cable-tray',29.75,3.3,40,-Math.PI/2,'wall'],['pipe-bracket',29.75,2.8,45,-Math.PI/2,'wall'],
 ['pressure-gauge',29.75,1.65,97,-Math.PI/2,'wall'],['hose-reel',29.75,.85,94,-Math.PI/2,'wall'],
 ...DRAIN_COVERS.map(d=>['drain-grate',d.x,0,d.z,0]),['service-bucket',28.4,0,102,0],['warning-stand',26.6,0,95,-.2],
 ['cable-tray',-29.75,3.3,59,Math.PI/2,'wall'],['pipe-bracket',-29.75,2.8,61,Math.PI/2,'wall'],
 ...PARKED_CARS.map(c=>['wheel-stop',c.side*15.3,0,c.z,Math.PI/2]),
];

export class Details {
 constructor(w){this.w=w;this.instances=[];this.palette=new Map();}
 async load(){
   const w=this.w,names=[...new Set(DETAIL_LAYOUT.map(r=>r[0]))];let next=0;
   const work=async()=>{while(next<names.length){const name=names[next++];try{
     const c=await B.SceneLoader.LoadAssetContainerAsync('assets/models/details/',name+'.glb',w.scene);c.removeAllFromScene();w.containers['detail-'+name]=c;
   }catch{w.failedAssets??=[];w.failedAssets.push('detail-'+name);}await yieldTask();}};
   await Promise.all([work(),work()]);
   for(const [index,row] of DETAIL_LAYOUT.entries()){
     const [name,x,y,z,yaw,support='floor']=row,c=w.containers['detail-'+name];if(!c)continue;
     const inst=c.instantiateModelsToScene(n=>'detail '+name+' '+n,false,{doNotInstantiate:true});
     const root=new B.TransformNode('detail '+name,w.scene);for(const node of inst.rootNodes)node.parent=root;
     root.rotation.y=yaw;const bounds=groundModel(root,x,z,y);
     if(support==='wall'){
       const axis=Math.abs(Math.sin(yaw))>.7?'x':'z',normal=axis==='x'?Math.sin(yaw):Math.cos(yaw),size=axis==='x'?bounds.w:bounds.d;
       root.position[axis]+=normal*(size/2+.003);bounds[axis]+=normal*(size/2+.003);
     }
     for(const m of root.getChildMeshes()){
       m.isPickable=false;m.receiveShadows=true;m.metadata={...m.metadata,lvCaster:bounds.h>.3};
       const share=material=>{if(!material)return material;
         if(material.subMaterials){material.subMaterials=material.subMaterials.map(share);return material;}
         const key=material.name.replace(/\.[0-9]+$/,'');if(this.palette.has(key))return this.palette.get(key);
         material.maxSimultaneousLights=7;this.palette.set(key,material);return material;};
       m.material=share(m.material);
     }
     const anchor=id=>{const node=root.getDescendants().find(n=>n.name.endsWith(name+'__'+id));if(!node)return null;node.computeWorldMatrix(true);return node.getAbsolutePosition();};
     // Connect functional-looking fittings to actual pipes/conduits. Named
     // anchors include the loader's handedness conversion and authored offsets.
     if(name==='pressure-gauge'){const p=anchor('connection');if(p)w.cylinder('gauge supply pipe',p.x,p.y/2,p.z,.045,p.y,'steel',10);}
     if(name==='pipe-bracket'){const p=anchor('pipe_centre');if(p)w.cylinder('clamped utility pipe',p.x,p.y,p.z,.09,1.15,'steel',10);}
     if(name==='conduit-junction'){const p=anchor('conduit_top');if(p){const h=Math.max(.05,4.18-p.y);w.cylinder('connected wall conduit',p.x,p.y+h/2,p.z,.045,h,'steel',8);}}
     if(name==='drain-grate')w.box('drain inset darkness',bounds.x,.001,bounds.z,.46,.002,.64,'black');
     // Read the model's actual emitter anchor after handedness conversion and
     // grounding. It uses an existing light slot rather than adding a new light.
     if(name==='desk-lamp'){
       const emitter=root.getDescendants().find(n=>n.name.endsWith('desk-lamp__light_emitter'));
       if(emitter){emitter.computeWorldMatrix(true);const p=emitter.getAbsolutePosition();w.lights.push({x:p.x,y:p.y,z:p.z,base:.12,range:2.4,color:B.Color3.FromHexString('#e7c690')});}
     }
     if(bounds.h>.3&&y<1.8)w.rects.push({...bounds,name:'detail '+name,enabled:true});
     w.placements.record('detail:'+index,root,{support,supportY:y});this.instances.push({name,root,bounds,support,yaw});
     await yieldTask();
   }
 }
}
