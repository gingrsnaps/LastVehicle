import { consumeSteps } from "./preparation.js?v=1.14.0";
/** A small deterministic navigation/collision layer for a single flat floor.
 * Avoiding a physics engine keeps downloads and CPU costs small. All distances
 * are in metres; walls/cars are axis-aligned collision rectangles. */
export function blocked(x, z, rects, r = 0.28) {
  return rects.some(
    (b) =>
      b.enabled !== false &&
      x > b.x - b.w / 2 - r &&
      x < b.x + b.w / 2 + r &&
      z > b.z - b.d / 2 - r &&
      z < b.z + b.d / 2 + r,
  );
}
export function moveCircle(pos, dx, dz, rects, r = 0.28) {
  // Small substeps prevent tunnelling at low FPS. Axis separation slides along walls.
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let i = 0; i < n; i++) {
    if (!blocked(pos.x + dx / n, pos.z, rects, r)) pos.x += dx / n;
    if (!blocked(pos.x, pos.z + dz / n, rects, r)) pos.z += dz / n;
  }
  return pos;
}
/** Exact slab intersection: one test per blocker, rather than hundreds of
 * 20 cm samples along a long ray. Optional height enables honest desk/item LOS. */
export function segmentHits(a, b, box, radius = 0, height = false) {
  if (box.enabled === false) return false;
  let enter = 0, leave = 1;
  const count = height && Number.isFinite(box.y) && Number.isFinite(box.h) ? 3 : 2;
  for (let axis=0;axis<count;axis++) {
    const start=axis===0?a.x:axis===1?a.z:a.y;
    const end=axis===0?b.x:axis===1?b.z:b.y;
    const center=axis===0?box.x:axis===1?box.z:box.y;
    const size=axis===0?box.w:axis===1?box.d:box.h;
    const lo=center-size/2-radius, hi=center+size/2+radius, delta=end-start;
    if(Math.abs(delta)<1e-9) {if(start<lo || start>hi)return false;}
    else {let t0=(lo-start)/delta,t1=(hi-start)/delta;if(t0>t1){const temp=t0;t0=t1;t1=temp;}
      enter=Math.max(enter,t0);leave=Math.min(leave,t1);if(enter>leave)return false;}
  }
  return leave > 0.0001 && enter < 0.9999;
}
export function lineClear(a, b, rects, radius = 0) {
  return !rects.some((box) => segmentHits(a, b, box, radius));
}
export function sightClear(a, b, rects) {
  return !rects.some((box) => segmentHits(a, b, box, 0, true));
}

// Static walkability is compiled while loading. Moving doors are checked live,
// so opening a gate does not rebuild thousands of cells during a chase.
const grids = new WeakMap();
// One body clearance is used by planning, steering and recovery. The former
// coarse grid could omit the only usable point beside a vehicle or door jamb.
export const AGENT_RADIUS = .34;
const CELL = .625, WIDTH = 97, HEIGHT = 177;
const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const points = Array.from({length: WIDTH * HEIGHT}, (_,k) => ({ x: -30 + (k % WIDTH) * CELL, z: 1 + Math.floor(k / WIDTH) * CELL }));
const worldPoint = (k) => points[k];
const indexOf = (p) => Math.max(0, Math.min(HEIGHT - 1, Math.round((p.z - 1) / CELL))) * WIDTH + Math.max(0, Math.min(WIDTH - 1, Math.round((p.x + 30) / CELL)));
export function prepareNavigation(rects) {
  const it=navigationSteps(rects); let step; do {step=it.next();} while(!step.done); return step.value;
}
export async function prepareNavigationAsync(rects) { await consumeSteps(navigationSteps(rects)); return grids.get(rects); }
function* navigationSteps(rects) {
  let grid = grids.get(rects);
  if (grid && grid.count === rects.length) return grid;
  const dynamic = rects.filter((r) => r.dynamic || /gate|grille|shortcut/.test(r.name || ""));
  const statics = rects.filter((r) => !dynamic.includes(r));
  const walkable = new Uint8Array(WIDTH * HEIGHT);
  for (let k = 0; k < walkable.length; k++) {
    const p = worldPoint(k); walkable[k] = !blocked(p.x, p.z, statics, AGENT_RADIUS);
    if(k%64===0) yield;
  }
  const edges = new Uint8Array(walkable.length);
  const directions = DIRECTIONS;
  for (let k = 0; k < walkable.length; k++) {
    if(k%32===0) yield;
    if (!walkable[k]) continue;
    const x = k % WIDTH, z = Math.floor(k / WIDTH), p = worldPoint(k);
    for (let d = 0; d < DIRECTIONS.length; d++) {
      const nx = x + directions[d][0], nz = z + directions[d][1], nk = nz * WIDTH + nx;
      if (nx >= 0 && nx < WIDTH && nz >= 0 && nz < HEIGHT && walkable[nk] && lineClear(p, worldPoint(nk), statics, AGENT_RADIUS)) edges[k] |= 1 << d;
    }
  }
  // Label static connected regions once. Impossible evidence on the opposite
  // side of a sealed wall can then be rejected without flooding the whole map.
  const component=new Uint16Array(walkable.length),queue=new Int32Array(walkable.length);let label=0;
  for(let seed=0;seed<walkable.length;seed++){
    if(!walkable[seed]||component[seed])continue;label++;let head=0,tail=0;queue[tail++]=seed;component[seed]=label;
    while(head<tail){
      const k=queue[head++];
      for(let d=0;d<DIRECTIONS.length;d++)if(edges[k]&(1<<d)){
        const [dx,dz]=DIRECTIONS[d],next=k+dz*WIDTH+dx;
        if(!component[next]){component[next]=label;queue[tail++]=next;}
      }
      if(head%256===0)yield;
    }
  }
  grid = { walkable, edges, component, dynamic, count: rects.length };
  grids.set(rects, grid); return grid;
}
class MinHeap {
  constructor() { this.items = []; }
  push(node) {
    let i = this.items.length; this.items.push(node);
    while (i) { const p = (i - 1) >> 1; if (this.items[p].f <= node.f) break; this.items[i] = this.items[p]; i = p; }
    this.items[i] = node;
  }
  pop() {
    const first = this.items[0], tail = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (2 * i + 1 < this.items.length) {
        let c = 2 * i + 1;
        if (c + 1 < this.items.length && this.items[c + 1].f < this.items[c].f) c++;
        if (tail.f <= this.items[c].f) break;
        this.items[i] = this.items[c]; i = c;
      }
      this.items[i] = tail;
    }
    return first;
  }
}
export function createPathWorkspace(){return {came:new Int32Array(WIDTH*HEIGHT),cost:new Float32Array(WIDTH*HEIGHT),closed:new Uint8Array(WIDTH*HEIGHT),dynamicBlocked:new Int8Array(WIDTH*HEIGHT)};}
export function findPath(start, goal, rects, avoided = new Set()) {
  const it=findPathSteps(start,goal,rects,avoided);let result;
  do{result=it.next();}while(!result.done);return result.value;
}
/** The gameplay caller advances one 128-node slice per frame. Each live job
 * owns its workspace, so a synchronous scene reachability check cannot corrupt
 * a suspended chase search. Loading/tests can still exhaust findPath normally. */
function* findPathSteps(start, goal, rects, avoided = new Set(), workspace=null) {
  const grid = prepareNavigation(rects), g = indexOf(goal);
  // A rounded start can land on the wrong side of a thin wall. Connect to a
  // nearby visible grid point instead; every subsequent edge is collision-safe.
  const nominal = indexOf(start), sx = nominal % WIDTH, sz = Math.floor(nominal / WIDTH);
  let s = -1, nearest = Infinity;
  for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
    const x = sx + dx, z = sz + dz, k = z * WIDTH + x;
    if (x < 0 || x >= WIDTH || z < 0 || z >= HEIGHT || !grid.walkable[k]) continue;
    const p = worldPoint(k), distance = Math.hypot(p.x - start.x, p.z - start.z);
    if (distance < nearest && lineClear(start, p, rects, AGENT_RADIUS)) { s = k; nearest = distance; }
  }
  if (s < 0) return [];
  const gx = g % WIDTH, gz = Math.floor(g / WIDTH);
  let connected=false;
  for(let dz=-3;dz<=3&&!connected;dz++)for(let dx=-3;dx<=3;dx++){
    const x=gx+dx,z=gz+dz,k=z*WIDTH+x;
    if(x>=0&&x<WIDTH&&z>=0&&z<HEIGHT&&grid.component[k]===grid.component[s]&&lineClear(worldPoint(k),goal,rects,AGENT_RADIUS)){connected=true;break;}
  }
  if(!connected)return [];
  grid.scratch ||= createPathWorkspace();
  const {came,cost,closed,dynamicBlocked}=workspace||grid.scratch; came.fill(-1);cost.fill(Infinity);closed.fill(0);dynamicBlocked.fill(-1);
  const avoidEdges=avoided.size>0;
  const open = new MinHeap();
  cost[s] = 0; open.push({ k: s, g: 0, f: 0 });
  let end = -1;
  let visited=0;
  while (open.items.length && visited<6000) {
    const c = open.pop(); if (closed[c.k]) continue; closed[c.k] = 1;
    visited++;
    if(visited%128===0)yield {visited};
    const x = c.k % WIDTH, z = Math.floor(c.k / WIDTH);
    if (Math.abs(x - gx) + Math.abs(z - gz) <= 3 && lineClear(worldPoint(c.k), goal, rects, AGENT_RADIUS)) { end = c.k; break; }
    for (let direction=0;direction<DIRECTIONS.length;direction++) {
      const [dx,dz]=DIRECTIONS[direction];
      if (!(grid.edges[c.k] & (1 << direction))) continue;
      const nx = x + dx, nz = z + dz, k = nz * WIDTH + nx;
      if (nx < 0 || nx >= WIDTH || nz < 0 || nz >= HEIGHT || closed[k] || !grid.walkable[k]) continue;
      const p = worldPoint(k);
      if(dynamicBlocked[k]<0)dynamicBlocked[k]=blocked(p.x,p.z,grid.dynamic,AGENT_RADIUS)?1:0;
      if (dynamicBlocked[k] || !lineClear(worldPoint(c.k), p, grid.dynamic, AGENT_RADIUS)) continue;
      // Penalize a recently failed edge. A single narrow doorway remains usable
      // when there is no alternative; the actor still tries a physical backstep.
      const nc = c.g + (direction<4?1:Math.SQRT2) + (avoidEdges&&avoided.has(`${c.k}:${k}`)?12:0); if (nc >= cost[k]) continue;
      cost[k] = nc; came[k] = c.k;
      open.push({ k, g: nc, f: nc + (Math.max(Math.abs(nx-gx),Math.abs(nz-gz))+(Math.SQRT2-1)*Math.min(Math.abs(nx-gx),Math.abs(nz-gz))) });
    }
  }
  if (end < 0) return [];
  const result = [];
  for (let k = end; came[k] >= 0; k = came[k]) result.push({...worldPoint(k),navIndex:k});
  result.push({...worldPoint(s),navIndex:s});
  result.reverse(); result.push({x:goal.x,z:goal.z}); return result;
}

/** A sound can originate inside a cabinet or car. Project that evidence onto a
 * nearby reachable floor point; never move the actor or rewrite its memory. */
export function reachableGoal(start,goal,rects,avoided=new Set()) {
  const it=routeSteps(start,goal,rects,avoided);let result;
  do{result=it.next();}while(!result.done);return result.value;
}
export function* routeSteps(start,goal,rects,avoided=new Set(),workspace=null) {
  if(!goal)return null;
  if(!blocked(goal.x,goal.z,rects,AGENT_RADIUS)){
    if(lineClear(start,goal,rects,AGENT_RADIUS))return {goal:{...goal},path:[],direct:true};
    const path=yield* findPathSteps(start,goal,rects,avoided,workspace);
    return path.length?{goal:{...goal},path,direct:false}:null;
  }
  const candidates=[];
  for(const r of [.45,.85,1.3,1.8])for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,p={x:goal.x+Math.cos(angle)*r,z:goal.z+Math.sin(angle)*r};
    if(!blocked(p.x,p.z,rects,AGENT_RADIUS))candidates.push(p);
  }
  candidates.sort((a,b)=>Math.hypot(a.x-goal.x,a.z-goal.z)-Math.hypot(b.x-goal.x,b.z-goal.z)||Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
  // Bound expensive searches. Evidence inside a large solid prop is abandoned
  // instead of stalling every render frame trying dozens of impossible points.
  for(const p of candidates.slice(0,4)){
    if(lineClear(start,p,rects,AGENT_RADIUS))return {goal:p,path:[],direct:true};
    const path=yield* findPathSteps(start,p,rects,avoided,workspace);if(path.length)return {goal:p,path,direct:false};
    yield {candidate:true};
  }
  return null;
}
