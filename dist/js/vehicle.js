import { blocked, segmentHits } from './navigation.js?v=1.19.0';
/** A deliberately slow kinematic car. Four corner probes and swept edge tests
 * keep it on the ground and out of walls without a heavyweight physics engine.
 * The mesh, camera, wheel rotation and sounds consume this one simulation. */
export function carCorners(pose,pad=0){
  const s=Math.sin(pose.yaw),c=Math.cos(pose.yaw);
  return [[-1-pad,-2.25-pad],[1+pad,-2.25-pad],[1+pad,2.25+pad],[-1-pad,2.25+pad]].map(([x,z])=>({x:pose.x+x*c+z*s,z:pose.z-x*s+z*c}));
}
export function carBlocked(pose,rects,ignore=null){
  const corners=carCorners(pose,.04);
  for(const r of rects){
    if(r===ignore||r.enabled===false)continue;
    if(corners.some(p=>blocked(p.x,p.z,[r],0)))return true;
    if(corners.some((p,i)=>segmentHits(p,corners[(i+1)%4],r)))return true;
    // Also catch a small obstacle completely enclosed by the car footprint.
    const dx=r.x-pose.x,dz=r.z-pose.z,c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
    if(Math.abs(c*dx-s*dz)<1.04&&Math.abs(s*dx+c*dz)<2.29)return true;
  }
  return false;
}
export class VehicleController {
  constructor(rects,body){this.rects=rects;this.body=body;this.reset();}
  reset(pose={x:13,z:78,yaw:-Math.PI/2}){Object.assign(this,pose);this.speed=0;this.steer=0;this.distance=0;this.blocked=false;this.finishTime=0;}
  tick(dt,{throttle=0,steer=0}={}){
    dt=Math.max(0,Math.min(.075,Number.isFinite(dt)?dt:0));
    throttle=Math.max(-1,Math.min(1,throttle));steer=Math.max(-1,Math.min(1,steer));
    this.steer+=(steer-this.steer)*(1-Math.exp(-dt*9));
    // S brakes while travelling forward, then smoothly becomes reverse.
    const target=throttle>0?6.2:throttle<0?-2.6:0;
    const rate=throttle<0&&this.speed>0?7.5:throttle?2.4:3.2;
    this.speed+=Math.sign(target-this.speed)*Math.min(Math.abs(target-this.speed),rate*dt);
    const count=Math.max(1,Math.ceil(Math.abs(this.speed*dt)/.10));this.blocked=false;
    for(let i=0;i<count;i++){
      const h=dt/count,turn=this.speed/2.9*Math.tan(this.steer*.52)*h;
      const next={x:this.x+Math.sin(this.yaw+turn*.5)*this.speed*h,z:this.z+Math.cos(this.yaw+turn*.5)*this.speed*h,yaw:this.yaw+turn};
      if(carBlocked(next,this.rects,this.body)){this.speed=0;this.blocked=true;break;}
      this.distance+=Math.abs(this.speed*h);Object.assign(this,next);
    }
    return this;
  }
  exitPoint(){
    if(Math.abs(this.speed)>.08)return null;
    // Exit on the LEFT driver side; if blocked, ask the player to reposition.
    for(const side of [-1.6,-2.0]){
      const p={x:this.x+Math.cos(this.yaw)*side+Math.sin(this.yaw)*(-.45),z:this.z-Math.sin(this.yaw)*side+Math.cos(this.yaw)*(-.45)};
      if(!blocked(p.x,p.z,this.rects.filter(r=>r!==this.body),.3))return p;
    }
    return null;
  }
}
