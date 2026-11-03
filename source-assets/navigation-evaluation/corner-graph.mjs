/** Research prototype: visibility graph of expanded AABB corners.
 * This is NOT a Recast navigation mesh. Its routes remain on a flat floor and
 * depend on the same conservative rectangle collision model as the shipped grid.
 * Static edges are prepared before play; mutable doors are tested on each query.
 * Build-time nodes include dynamic door corners so detours remain possible.
 */
import {AGENT_RADIUS,blocked,lineClear} from './baseline-js/navigation.js?v=1.10.0';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class CornerGraph {
 constructor(rects){
  this.rects=rects;this.dynamic=rects.filter(r=>r.dynamic||/gate|grille|shortcut/.test(r.name));
  const statics=rects.filter(r=>!this.dynamic.includes(r));
  const nodes=[],keys=new Set(),margin=AGENT_RADIUS+.025;
  for(const r of rects)for(const sx of [-1,1])for(const sz of [-1,1]){
   const p={x:r.x+sx*(r.w/2+margin),z:r.z+sz*(r.d/2+margin)};
   if(p.x<-29.5||p.x>29.5||p.z<1||p.z>111||blocked(p.x,p.z,statics,AGENT_RADIUS))continue;
   const key=p.x.toFixed(4)+','+p.z.toFixed(4);if(keys.has(key))continue;keys.add(key);nodes.push(p);
  }
  this.nodes=nodes;this.edges=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(lineClear(nodes[i],nodes[j],statics,AGENT_RADIUS)){
   const d=dist(nodes[i],nodes[j]);this.edges[i].push({j,d});this.edges[j].push({j:i,d});
  }
 }
 findPath(start,goal){
  if(blocked(start.x,start.z,this.rects,AGENT_RADIUS)||blocked(goal.x,goal.z,this.rects,AGENT_RADIUS))return [];
  if(lineClear(start,goal,this.rects,AGENT_RADIUS))return [{...goal}];
  const nodes=this.nodes,n=nodes.length,cost=new Float64Array(n),seen=new Uint8Array(n),parent=new Int32Array(n),goals=new Float64Array(n);
  cost.fill(Infinity);parent.fill(-1);goals.fill(Infinity);
  for(let i=0;i<n;i++){
   if(lineClear(start,nodes[i],this.rects,AGENT_RADIUS))cost[i]=dist(start,nodes[i]);
   if(lineClear(nodes[i],goal,this.rects,AGENT_RADIUS))goals[i]=dist(nodes[i],goal);
  }
  let best=Infinity,end=-1,visited=0;
  for(let iteration=0;iteration<n;iteration++){
   let k=-1;for(let j=0;j<n;j++)if(!seen[j]&&cost[j]<best&&(k<0||cost[j]+dist(nodes[j],goal)<cost[k]+dist(nodes[k],goal)))k=j;
   if(k<0||!Number.isFinite(cost[k]))break;
   seen[k]=1;visited++;
   if(cost[k]+goals[k]<best){best=cost[k]+goals[k];end=k;}
   for(const edge of this.edges[k])if(!seen[edge.j]&&cost[k]+edge.d<cost[edge.j]&&lineClear(nodes[k],nodes[edge.j],this.dynamic,AGENT_RADIUS)){
    cost[edge.j]=cost[k]+edge.d;parent[edge.j]=k;
   }
  }
  this.lastVisited=visited;
  if(end<0)return [];
  const out=[{...goal}];for(let k=end;k>=0;k=parent[k])out.push({...nodes[k]});return out.reverse();
 }
}
