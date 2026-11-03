import { AGENT_RADIUS, lineClear, blocked } from "./navigation.js?v=1.14.0";
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const ROUTE_NODES=[
  [-22,18],[-22,28],[-22,35],[-22,45],[-22,55],[-22,65],[-22,76],[-22,85],[-22,98],
  [-15,18],[-15,45],[-15,76],[-15,98], [0,18],[0,39],[0,60],[0,76],[0,98],
  [15,39],[15,98],[23,39],[23,98],
].map(([x,z],i)=>({x,z,id:"route:"+i}));

/** A tiny visibility graph for inference, prepared at the loading screen.
 * The existing collision-aware A* still controls actual movement. Dynamic
 * shutters are checked live without recompiling the whole navigation grid. */
export class PursuitRoutes {
  constructor(rects,nodes=ROUTE_NODES){
    this.rects=rects;
    this.doors=rects.filter(r=>r.dynamic||/gate|grille|shortcut/.test(r.name||""));
    const solid=rects.filter(r=>!this.doors.includes(r));
    this.nodes=nodes.filter(p=>!blocked(p.x,p.z,solid,AGENT_RADIUS));
    this.edges=this.nodes.map(a=>this.nodes.map(b=>a!==b&&lineClear(a,b,solid,AGENT_RADIUS)?dist(a,b):Infinity));
  }
  costsFrom(origin){
    const n=this.nodes.length,cost=this.nodes.map(p=>lineClear(origin,p,this.rects,AGENT_RADIUS)?dist(origin,p):Infinity),seen=new Uint8Array(n);
    for(let k=0;k<n;k++){
      let i=-1;for(let j=0;j<n;j++)if(!seen[j]&&(i<0||cost[j]<cost[i]))i=j;
      if(i<0||!Number.isFinite(cost[i]))break;seen[i]=1;
      for(let j=0;j<n;j++)if(!seen[j]&&cost[i]+this.edges[i][j]<cost[j]&&lineClear(this.nodes[i],this.nodes[j],this.doors,AGENT_RADIUS))cost[j]=cost[i]+this.edges[i][j];
    }
    return cost;
  }
  distance(origin,target,costs=this.costsFrom(origin)){
    let best=lineClear(origin,target,this.rects,AGENT_RADIUS)?dist(origin,target):Infinity;
    for(let i=0;i<this.nodes.length;i++)if(costs[i]<best&&lineClear(this.nodes[i],target,this.rects,AGENT_RADIUS))best=Math.min(best,costs[i]+dist(this.nodes[i],target));
    return best;
  }
  intercept(evidence,velocity,enemy,rules){
    const speed=Math.hypot(velocity.x,velocity.z);if(speed<.4||!rules.intercept)return null;
    const observed=this.costsFrom(evidence),hunter=this.costsFrom(enemy);let best=null,score=-Infinity;
    for(let i=0;i<this.nodes.length;i++){
      const p=this.nodes[i],d=dist(evidence,p);if(d<1.5||d>rules.predictDistance*2.5)continue;
      const forward=((p.x-evidence.x)*velocity.x+(p.z-evidence.z)*velocity.z)/(d*speed);
      if(forward<.2||observed[i]>rules.predictDistance*3||!Number.isFinite(hunter[i]))continue;
      const arrival=hunter[i]/rules.chase,escape=observed[i]/Math.max(1.3,speed);
      if(arrival>escape+rules.predictTime*1.5)continue;
      const value=forward*8-arrival*.6-Math.abs(arrival-escape)*.4;
      if(value>score){score=value;best={x:p.x,z:p.z};}
    }
    return best;
  }
}
