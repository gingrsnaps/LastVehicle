import { AGENT_RADIUS, blocked, lineClear, moveCircle, routeSteps, createPathWorkspace } from './navigation.js?v=1.14.0';
import { dampAngle } from './animation.js?v=1.14.0';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

/** Physical route following for one enemy. Recovery uses the same collision
 * checks as walking: no position snapping, teleporting, or wall penetration.
 * Progress is measured over seconds, so 30 and 144 FPS have the same rules. */
export class RouteFollower {
  constructor(rects){this.rects=rects;this.workspace=createPathWorkspace();this.reset();}
  reset(){
    this.path=[];this.goal=null;this.planned=null;this.nextPlan=0;
    this.windowTime=0;this.progress=0;this.failures=0;this.successTravel=0;
    this.avoid=new Map();this.lastNode=null;this.recovery=null;this.recoveries=0;
    this.lastSpeed=0;this.brake=0;this.lastTurn=0;this.routeFailed=false;this.turnAction=null;
    this.job=null;this.commitUntil=0;this.planCount=0;this.planSlices=0;this.maxPlanMs=0;
  }
  invalidate(){this.nextPlan=0;this.planned=null;this.path=[];this.goal=null;this.job=null;this.commitUntil=0;}
  planningReport(){return {plans:this.planCount,slices:this.planSlices,maxSliceMs:+this.maxPlanMs.toFixed(2),pending:!!this.job};}
  recover(pos,yaw,clock){
    const next=this.path[0];
    if(this.lastNode!==null&&next?.navIndex!==undefined)this.avoid.set(`${this.lastNode}:${next.navIndex}`,clock+7);
    // Back off first; if the back is blocked try a diagonal/side step. Recovery
    // candidates have a clear swept body, not just a free endpoint.
    const angles=[Math.PI,Math.PI*.75,-Math.PI*.75,Math.PI/2,-Math.PI/2];
    const target=angles.map(a=>({x:pos.x+Math.sin(yaw+a)*.38,z:pos.z+Math.cos(yaw+a)*.38}))
      .find(p=>lineClear(pos,p,this.rects,AGENT_RADIUS)&&!blocked(p.x,p.z,this.rects,AGENT_RADIUS));
    this.recovery=target?{from:{...pos},target,time:0}:null;this.turnAction=null;
    this.failures++;this.recoveries++;this.windowTime=this.progress=0;
    this.invalidate();this.nextPlan=clock+.65;
  }
  step(pos,yaw,evidence,speed,dt,clock,mode='search'){
    const before={...pos};let pose=null,phase=null,failed=false;
    if(!evidence||dt<=0)return {yaw,speed:0,pose,phase,failed};
    for(const [key,until] of this.avoid)if(clock>=until)this.avoid.delete(key);
    if(this.recovery){
      const r=this.recovery;r.time+=dt;const blend=smooth((r.time/.9-.12)/.6);
      const x=r.from.x+(r.target.x-r.from.x)*blend,z=r.from.z+(r.target.z-r.from.z)*blend;
      moveCircle(pos,x-pos.x,z-pos.z,this.rects,AGENT_RADIUS);
      pose='Backstep';phase=Math.min(1,r.time/.9);
      if(r.time>=.9){this.recovery=null;this.nextPlan=0;}
      return {yaw,speed:distance(pos,before)/dt,pose,phase,failed:false};
    }
    const changed=!this.planned||distance(this.planned,evidence)>.8;
    const obstructed=this.path[0]&&!lineClear(pos,this.path[0],this.rects,AGENT_RADIUS);
    if(!this.job&&clock>=this.nextPlan&&(obstructed||clock>=this.commitUntil&&(changed||(!this.path.length&&!this.goal)||this.routeFailed))){
      this.job={iterator:routeSteps({...pos},{...evidence},this.rects,new Set(this.avoid.keys()),this.workspace),target:{...evidence}};
      this.planCount++;
    }
    if(this.job){
      const started=performance.now(),result=this.job.iterator.next();this.planSlices++;
      this.maxPlanMs=Math.max(this.maxPlanMs,performance.now()-started);
      if(result.done){
        const route=result.value;this.planned=this.job.target;this.job=null;
        this.goal=route?.goal||null;this.path=route?.path||[];this.lastNode=null;
        // A route keeps its first corner briefly. A newly blocked edge may still
        // interrupt immediately; a moving target cannot flip it every frame.
        this.nextPlan=clock+.65;this.commitUntil=clock+(mode==='chase'?1.15:.75);this.routeFailed=!route;
        if(!route){this.failures++;failed=this.failures>=2;}
      }
    }
    // A moving visible target can be followed directly between scheduled plans.
    const direct=!blocked(evidence.x,evidence.z,this.rects,AGENT_RADIUS)&&lineClear(pos,evidence,this.rects,AGENT_RADIUS);
    if(direct){this.goal={...evidence};this.routeFailed=false;}
    while(this.path.length&&distance(pos,this.path[0])<.075){this.lastNode=this.path.shift().navIndex??null;this.windowTime=this.progress=0;}
    const next=direct?evidence:this.path[0]||this.goal;
    if(!next||(!direct&&!lineClear(pos,next,this.rects,AGENT_RADIUS))){
      if(!this.job)this.windowTime+=dt;
      if(this.windowTime>.95){this.recover(pos,yaw,clock);failed=this.failures>=3;}
      return {yaw,speed:0,pose:'Listen',phase:null,failed};
    }
    const d=distance(pos,next);
    if(d<.06){
      if(this.lastSpeed>1.5)this.brake=.8;
      this.brake=Math.max(0,this.brake-dt);this.lastSpeed=0;
      return {yaw,speed:0,pose:this.brake?'Brake':null,phase:this.brake?1-this.brake/.8:null,failed};
    }
    const heading=Math.atan2(next.x-pos.x,next.z-pos.z),turn=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));
    const chasing=mode==='chase';
    if(!this.turnAction&&Math.abs(turn)>(chasing?2.5:1.2)){this.turnAction={from:yaw,angle:Math.sign(turn)*Math.min(Math.PI/2,Math.abs(turn)),time:0,duration:chasing?.48:.86};this.windowTime=this.progress=0;}
    if(this.turnAction){
      const a=this.turnAction;a.time+=dt;phase=Math.min(1,a.time/a.duration);
      yaw=a.from+a.angle*smooth((phase-.2)/.56);pose=a.angle>0?'TurnRight':'TurnLeft';
      if(phase>=1)this.turnAction=null;
      this.lastSpeed=0;return {yaw,speed:0,pose,phase,failed};
    }
    yaw=dampAngle(yaw,heading,chasing?10:7,dt);
    const stride=chasing?Math.max(.24,Math.cos(turn)*.8+.2):Math.abs(turn)>1.15?0:Math.max(.15,Math.cos(turn));
    const finalLeg=direct||this.path.length<=1;
    const approach=finalLeg?Math.min(speed,Math.sqrt(2*3.8*Math.max(0,d-.045))):speed;
    const travel=Math.min(d,approach*stride*dt);
    if(travel)moveCircle(pos,(next.x-pos.x)/d*travel,(next.z-pos.z)/d*travel,this.rects,AGENT_RADIUS);
    const walked=distance(before,pos),advance=d-distance(pos,next);
    this.windowTime+=dt;this.progress+=advance;this.successTravel+=Math.max(0,advance);
    if(this.successTravel>.8){this.failures=0;this.successTravel=0;}
    if(this.windowTime>=1.05){
      if(this.progress<.065){this.recover(pos,yaw,clock);failed=this.failures>=3;}
      this.windowTime=this.progress=0;
    }
    this.lastSpeed=walked/dt;this.lastTurn=turn;
    return {yaw,speed:this.lastSpeed,pose,phase,failed};
  }
}
