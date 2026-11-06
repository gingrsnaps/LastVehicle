import { groundModel } from './placement.js?v=1.19.0';
import { loadInBatches, yieldTask } from './preparation.js?v=1.19.0';
const B=globalThis.BABYLON;
// Deliberate service-area clusters, in metres. Large props receive their measured
// physical footprint. Small debris/reeds and scenery beyond fences do not impede
// movement. No prop is spawned during play, and every copy uses shared materials.
export const SCENERY_LAYOUT=[
 // Loading apron: store supplies against boundaries, leaving the paved strip.
 ['worn-pallet-stack',-27,-5,.1],['dented-bin',-28.4,-7.3,1.4],['abandoned-hand-truck',-24.5,-6,1.5],
 ['timber-bundle',-26,-12,.05],['tire-stack',-28.6,-11,.2],['rubble-cluster',-28.5,-15,0],
 ['worn-pallet-stack',-23,-11,0],['dented-bin',-17,-15,1.57],['abandoned-hand-truck',-17.95,-21.5,1.57],
 ['tire-stack',-17,-29.6,0],['rubble-cluster',-28.4,-36.8,0],['dented-bin',-28,-45,1.2],
 ['worn-pallet-stack',-28,-48,0],['timber-bundle',-23,-57,.05],['tire-stack',-28,-55,0],
 // Utility side. Do not put a prop underneath the selector or front doorway.
 ['dented-bin',28,-7,3.14],['worn-pallet-stack',27.6,-9.5,0],['tire-stack',28.4,-14,0],
 ['abandoned-hand-truck',28.5,-20,0],['rubble-cluster',28.4,-24,0],['dented-bin',28.4,-29,3.14],
 ['worn-pallet-stack',25,-33,0],['timber-bundle',28.1,-31.7,Math.PI/2],['tire-stack',28.5,-34.6,0],
 ['dented-bin',28,-50.5,3.14],['rubble-cluster',28,-54,0],
 // Garage and service rooms: clutter around the existing usable workstations.
 ['tire-stack',-15,8,0],['dented-bin',15,8,3.14],['worn-pallet-stack',-26,11,0],
 ['dented-bin',-28,26,0],['abandoned-hand-truck',-28,35,0],['tire-stack',-28,48,0],
 ['worn-pallet-stack',-27,55,0],['timber-bundle',-27,64,0],['dented-bin',-26.8,85.3,0],
 ['tire-stack',-26,90,0],['worn-pallet-stack',-27,108,0],['abandoned-hand-truck',-27,106,0],
 ['dented-bin',28,29,3.14],['tire-stack',28,49,0],['worn-pallet-stack',28,57,0],
 ['abandoned-hand-truck',28,65,3.14],['timber-bundle',28,83,Math.PI/2],['dented-bin',28,88,3.14],
 ['tire-stack',28,107,0],['rubble-cluster',-15.8,56,0],['rubble-cluster',15.7,105,0],
 // Background sheds break the skyline below the existing industrial buildings.
 ['maintenance-shed',38.5,-28,Math.PI/2,0,true],['maintenance-shed',-38.5,-28,-Math.PI/2,0,true],
 ['maintenance-shed',38.5,-73,Math.PI/2,0,true],['maintenance-shed',-38.5,-73,-Math.PI/2,0,true],
 ['damaged-road-barrier',19,-65,.1,0,true],['damaged-road-barrier',-19,-65,-.1,0,true],
 ['damaged-road-barrier',18.5,-93,0,0,true],['damaged-road-barrier',-18.5,-93,0,0,true],
 // Mounted vents attach by their exported rear anchor, not their bounding centre.
 ['wall-vent',-18.49,-20,Math.PI/2,2.75,false,true],['wall-vent',-18.49,-29,Math.PI/2,2.75,false,true],
 ['wall-vent',29.27,-47,-Math.PI/2,2.1,false,true],
];
for(const side of [-1,1])for(let i=0;i<8;i++){
 SCENERY_LAYOUT.push(['drain-reeds',side*(30.8+(i%2)*.4),-6-i*6.5,i*.7,0,true]);
 if(i%2===0)SCENERY_LAYOUT.push(['rubble-cluster',side*31.5,-9-i*6.5,i*.3,0,true]);
}
for(const side of [-1,1])for(let i=0;i<4;i++)SCENERY_LAYOUT.push(['drain-reeds',side*16.4,-66-i*8,i,0,true]);

export class Scenery {
 constructor(w){this.w=w;this.records=[];}
 async load(){
  const w=this.w,cache={},names=[...new Set(SCENERY_LAYOUT.map(p=>p[0]))];
  await loadInBatches(names,async id=>{
   try{const c=await B.SceneLoader.LoadAssetContainerAsync('assets/models/','lv119-'+id+'.glb',w.scene);c.removeAllFromScene();cache[id]=c;}
   catch{w.failedAssets??=[];w.failedAssets.push('lv119-'+id);}
  },2);
  this.containers=cache;
  for(const [i,p] of SCENERY_LAYOUT.entries()){
   const [id,x,z,yaw=0,y=0,backdrop=false,wall=false]=p,c=cache[id];if(!c)continue;
   const root=new B.TransformNode('scenery '+id+' '+i,w.scene),inst=c.instantiateModelsToScene(n=>'scenery '+n,false,{doNotInstantiate:true});
   for(const n of inst.rootNodes)n.parent=root;
   root.rotation.y=yaw;groundModel(root,x,z,y);
   const b=root.metadata.placement;
   if(wall){
    // Mount the actual rear plane; preserve authored bottom height and handedness.
    const anchor=root.getDescendants().find(n=>n.name.endsWith('__rear_mount'));
    if(anchor){anchor.computeWorldMatrix(true);const a=anchor.getAbsolutePosition(),dx=x-a.x,dz=z-a.z;root.position.x+=dx;root.position.z+=dz;b.x+=dx;b.z+=dz;root.computeWorldMatrix(true);}
   }
   const small=['rubble-cluster','drain-reeds'].includes(id);
   for(const m of root.getChildMeshes()){
    m.isPickable=false;m.receiveShadows=!backdrop;
    // Small static props use existing lighting; no added lights, shadow passes,
    // physics body, update callback or material allocation per gameplay frame.
    m.metadata={lvCaster:false,backdrop,detailQuality:0};
    if(m.material)m.material.maxSimultaneousLights=7;
   }
   if(!backdrop&&!wall&&!small)w.rects.push({...b,enabled:true,name:'scenery '+id});
   w.placements.record('scenery119:'+i,root,{support:wall?'wall face':backdrop?'background ground':'floor',supportY:y});
   this.records.push({id,root,backdrop,wall,small,...b});await yieldTask();
  }
 }
}
