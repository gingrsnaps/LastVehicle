const B=globalThis.BABYLON;
const clamp=(n,limit)=>Math.max(-limit,Math.min(limit,n));
const CONTACT_CLIPS=new Set(['Attack','Strike','DoorPush','InspectClose','Brace','Backstep']);
/** A small additive look response layered after skeletal animation. Each render
 * restores the previous sampled pose BEFORE animation, so offsets never build
 * up during paused frames or phase-controlled one-shots. */
export class AttentionOverlay {
 constructor(scene,root,nodes){
  this.root=root;this.head=0;this.shoulders=0;this.blocked=false;this.lean=0;this.forward=new B.Vector3();
  this.parts=[['Head',1],['Chest',.28]].map(([name,weight])=>{
   const node=nodes.find(n=>n.name===name&&n.rotationQuaternion);
   return node?{node,weight,base:node.rotationQuaternion.clone(),axis:new B.Vector3(),inverse:new B.Matrix(),offset:new B.Quaternion()}:null;
  }).filter(Boolean);
  this.before=scene.onBeforeAnimationsObservable.add(()=>this.restore());
  this.after=scene.onAfterAnimationsObservable.add(()=>this.apply());
 }
 restore(){for(const p of this.parts)p.node.rotationQuaternion.copyFrom(p.base);}
 reset(){this.restore();this.head=this.shoulders=this.lean=0;}
 update(dt,target,yaw,clip,lean=0){
  const wanted=target?Math.atan2(target.x-this.root.position.x,target.z-this.root.position.z)-yaw:0;
  this.blocked=CONTACT_CLIPS.has(clip);
  const angle=this.blocked?0:clamp(Math.atan2(Math.sin(wanted),Math.cos(wanted)),.78);
  this.head+=(angle-this.head)*(1-Math.exp(-dt*10));
  this.shoulders+=(this.head-this.shoulders)*(1-Math.exp(-dt*3.5));
  this.lean+=((this.blocked?0:lean||0)-this.lean)*(1-Math.exp(-dt*7));this.forward.set(Math.sin(yaw),0,Math.cos(yaw));
 }
 apply(){
  for(const p of this.parts){
   p.base.copyFrom(p.node.rotationQuaternion);
   const angle=this.blocked?0:clamp(p.weight===1?this.head*.72:this.shoulders*p.weight,p.weight===1?.58:.17);
   const roll=this.blocked?0:this.lean*(p.weight===1?.12:1);
   if(Math.abs(angle)<.0001&&Math.abs(roll)<.0001)continue;
   // Convert world up through the animated joint basis. glTF's reflected root
   // reverses handedness, so the axial vector must also reverse its sign.
   const matrix=p.node.computeWorldMatrix(true);matrix.invertToRef(p.inverse);
   B.Vector3.TransformNormalToRef(B.Axis.Y,p.inverse,p.axis);p.axis.normalize();
   if(matrix.determinant()<0)p.axis.scaleInPlace(-1);
   B.Quaternion.RotationAxisToRef(p.axis,angle,p.offset);
   p.base.multiplyToRef(p.offset,p.node.rotationQuaternion);
   if(roll){B.Vector3.TransformNormalToRef(this.forward,p.inverse,p.axis);p.axis.normalize();if(matrix.determinant()<0)p.axis.scaleInPlace(-1);B.Quaternion.RotationAxisToRef(p.axis,roll,p.offset);p.node.rotationQuaternion.multiplyToRef(p.offset,p.node.rotationQuaternion);}
  }
 }
}
