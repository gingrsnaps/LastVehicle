import { blocked, lineClear, sightClear, routeSteps, createPathWorkspace } from './navigation.js?v=1.19.0';
/** Requested guidance follows actual walkable geometry. The arrow denotes a
 * route; the upright diamond denotes an object. Neither completes a task or
 * grants interaction through walls. Planning advances in bounded slices. */
export class GuideRoute {
  constructor(rects){this.rects=rects;this.workspace=createPathWorkspace();this.reset();}
  reset(){this.key='';this.route=null;this.job=null;this.result=null;this.retry=0;this.target=null;this.progress=0;}
  request(task,items,position){
    if(!task){this.reset();return;}
    const d=task.destination;
    const item=items.find(i=>i.id===(d.controlId||task.action||task.id)&&!i.hidden);
    const target=item?.pos||{x:d.x,y:1.2,z:d.z};
    const key=task.id+':'+target.x.toFixed(1)+':'+target.z.toFixed(1);
    if(key===this.key&&this.target){return;}
    this.key=key;this.name=d.name;this.target={x:target.x,y:target.y,z:target.z};this.controlId=item?.id;
    this.explicit=d.approach||item?.approach;this.radius=item?.radius??.38;
    this.route=null;this.result=null;this.progress=0;this.begin(position);
  }
  begin(position){
    const target=this.target;if(!target)return;
    const candidates=[];
    if(this.explicit)candidates.push({...this.explicit});
    // Legacy objects get a reachable stand-off point instead of their solid
    // centre. Authored outdoor approaches retain priority over nearest distance.
    for(const r of [1.5,1.95,1.1])for(let i=0;i<12;i++){
      const a=i*Math.PI/6;candidates.push({x:target.x+Math.sin(a)*r,z:target.z+Math.cos(a)*r});
    }
    const clear=candidates.filter(p=>!blocked(p.x,p.z,this.rects,.3)&&sightClear({...p,y:1.68},target,this.rects));
    if(!this.explicit)clear.sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
    this.candidates=clear;this.start={...position};this.retry=1.2;
    this.tryCandidate(position);
  }
  tryCandidate(position){
    this.goal=this.candidates.shift();
    this.job=this.goal?routeSteps(position,this.goal,this.rects,new Set(),this.workspace):null;
  }
  tick(position,dt){
    this.retry=Math.max(0,this.retry-dt);
    if(!this.target)return null;
    if(this.job){const step=this.job.next();if(step.done){
      this.route=step.value;this.job=null;this.progress=0;
      // A clear stand-off point can still be in a disconnected room. Try the
      // remaining views incrementally; never run several A* searches in a frame.
      if(!this.route&&this.candidates.length)this.tryCandidate(position);
    }}
    const close=Math.hypot(position.x-this.target.x,1.68-this.target.y,position.z-this.target.z)-this.radius<=2.35&&sightClear({...position,y:1.68},this.target,this.rects);
    const atFront=!this.explicit||Math.hypot(position.x-this.goal?.x,position.z-this.goal?.z)<1.7;
    // This is an AIM marker. Raising it above a handle made following the hint
    // select empty space. The hollow diamond now surrounds the usable anchor.
    if(close&&atFront)return this.result={kind:'object',point:{...this.target},name:this.name,controlId:this.controlId};
    if(!this.route){if(!this.job&&!this.retry)this.begin(position);return this.result=null;}
    const path=this.route.path?.length?this.route.path:[this.route.goal];
    // Walk past close path nodes, then look ahead only through clear geometry.
    while(this.progress<path.length-1&&Math.hypot(position.x-path[this.progress].x,position.z-path[this.progress].z)<1.25&&lineClear(position,path[this.progress+1],this.rects,.3))this.progress++;
    let p=null;
    for(let i=this.progress;i<path.length;i++){
      const node=path[i],distance=Math.hypot(position.x-node.x,position.z-node.z);
      if(distance>8&&p)break;
      if(!lineClear(position,node,this.rects,.3))break;
      p=node;this.progress=i;
    }
    if(!p){if(!this.job&&!this.retry)this.begin(position);return this.result=null;}
    const dx=p.x-position.x,dz=p.z-position.z,d=Math.hypot(dx,dz),scale=Math.min(1,7/Math.max(.01,d));
    return this.result={kind:'route',point:{x:position.x+dx*scale,y:.07,z:position.z+dz*scale},yaw:Math.atan2(dx,dz),name:this.name,controlId:this.controlId};
  }
}
