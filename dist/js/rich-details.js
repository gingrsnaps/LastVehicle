import { RICH_LAYOUT } from './detail-layout.js?v=1.19.0';
import { groundModel } from './placement.js?v=1.19.0';
import { yieldTask } from './preparation.js?v=1.19.0';
const B=globalThis.BABYLON;
export class RichDetails {
 constructor(w){this.w=w;this.instances=[];this.visor=null;this.quality='low';}
 async load(){
  const w=this.w,containers=new Map();let next=0;
  const work=async()=>{while(next<RICH_LAYOUT.length){const spec=RICH_LAYOUT[next++];try{
   const c=await B.SceneLoader.LoadAssetContainerAsync('assets/models/details-v113/',spec.id+'.glb',w.scene);c.removeAllFromScene();containers.set(spec.id,c);w.containers['rich-'+spec.id]=c;
  }catch{w.failedAssets??=[];w.failedAssets.push('rich-'+spec.id);}await yieldTask();}};
  await Promise.all([work(),work()]);
  for(const spec of RICH_LAYOUT){
   const c=containers.get(spec.id);if(!c)continue;
   const root=new B.TransformNode('worn '+spec.id,w.scene),inst=c.instantiateModelsToScene(n=>'worn '+n,false,{doNotInstantiate:true});
   for(const n of inst.rootNodes)n.parent=root;root.rotation.y=spec.yaw||0;
   const anchor=name=>{const n=root.getDescendants().find(n=>n.name.endsWith(spec.id+'__'+name));n?.computeWorldMatrix(true);return n;};
   let bounds;
   if(spec.parent){
    groundModel(root,0,0,0);root.parent=spec.parent.endsWith('cockpit')?w.stage.cockpit:w.stage.car;
    if(spec.local_position)root.position.addInPlace(B.Vector3.FromArray(spec.local_position));
    if(spec.anchor_target_local){
     const mount=anchor(spec.anchor);if(mount){
      const local=B.Vector3.TransformCoordinates(mount.getAbsolutePosition(),B.Matrix.Invert(root.parent.computeWorldMatrix(true)));
      root.position.addInPlace(B.Vector3.FromArray(spec.anchor_target_local).subtract(local));
      // The pivot is on the roof, so secondary motion never detaches the mount.
      const pivot=new B.TransformNode('passenger visor hinge',w.scene);pivot.parent=root.parent;pivot.position.copyFromFloats(...spec.anchor_target_local);
      root.position.subtractInPlace(pivot.position);root.parent=pivot;this.visor=pivot;
     }
    }
    w.visuals.dynamicRoots.add(root);bounds=null;
   }else{
    const [x,y,z]=spec.position;bounds=groundModel(root,x,z,y);
    if(spec.support==='wall'){
     const axis=Math.abs(Math.sin(spec.yaw))>.7?'x':'z',normal=axis==='x'?Math.sin(spec.yaw):Math.cos(spec.yaw),size=axis==='x'?bounds.w:bounds.d;
     root.position[axis]+=normal*(size/2+.003);bounds[axis]+=normal*(size/2+.003);
    }
    w.placements.record('rich:'+spec.id,root,{support:spec.support,supportY:y});
   }
   const level=['damaged-intercom','emergency-diagram','split-insulation-elbow'].includes(spec.id)?0:spec.quality==='high'?2:1;
   for(const m of root.getChildMeshes()){
    m.isPickable=false;m.receiveShadows=true;m.metadata={...m.metadata,lvCaster:false,detailQuality:level};
    const share=mat=>{if(!mat)return mat;if(mat.subMaterials){mat.subMaterials=mat.subMaterials.map(share);return mat;}
     const key='rich:'+mat.name.replace(/\.[0-9]+$/,'');if(w.details.palette.has(key))return w.details.palette.get(key);mat.maxSimultaneousLights=7;w.details.palette.set(key,mat);return mat;};m.material=share(m.material);
   }
   if(spec.id==='split-insulation-elbow'){
    const lower=anchor('socket_lower')?.getAbsolutePosition(),right=anchor('socket_right')?.getAbsolutePosition();
    if(lower)w.cylinder('insulated pipe lower connection',lower.x,lower.y/2,lower.z,.088,lower.y,'steel',8);
    if(right){const pipe=w.cylinder('insulated pipe side connection',right.x,right.y,right.z-.6,.088,1.2,'steel',8);pipe.rotation.x=Math.PI/2;}
    if(lower&&right)this.leakSource={x:(lower.x+right.x)/2-.07,y:right.y-.04,z:(lower.z+right.z)/2};
   }
   this.instances.push({root,spec,level,bounds});await yieldTask();
  }
  // Cracks attach to the CRT face after its real sign backing has resolved.
  const face=w.screen;
  if(face)for(let i=0;i<4;i++){const m=w.visuals.box('CRT corner crack',face,-.29+i*.015,.13-i*.022,-.004,.003,.065,.003,'steel');m.rotation.z=.7+i*.3;}
  for(let i=0;i<3;i++){const m=w.box('crossed-out rota shift',-29.558,1.88-i*.13,12.3,.006,.008,.24,'labelInk');m.rotation.x=.07;}
  // Thin opaque tool silhouettes sit on the actual bench back wall.
  for(let i=0;i<3;i++)w.box('missing tool outline',-29.735,1.6+i*.2,72.1,.006,.12,.22,'stain');
 }
 setSettings(settings){this.quality=settings.quality;const n=settings.quality==='low'?0:settings.quality==='high'?2:1;for(const d of this.instances)if(d.spec.parent)d.root.setEnabled(d.level<=n);}
 tick(dt,time,player){if(this.visor&&player.vehicle)this.visor.rotation.x=Math.sin(time*3.2)*.008+Math.sin(time*6.1)*.003;}
}
