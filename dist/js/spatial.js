/** Opt-in broad phase for authored collision arrays. Six-metre cells reject
 * distant geometry before the existing exact intersection test. Moving bodies
 * are deliberately checked live: a door, dolly or car never needs a grid rebuild.
 * Registration happens during loading; unregistered/test arrays keep linear semantics. */
const indices = new WeakMap();
const CELL = 6;
const key = (x,z) => (x + 32768) * 65536 + z + 32768;
export const isMovingBlocker = b => !!b.dynamic || /gate|grille|shortcut/.test(b.name || '');
export function indexSpatial(rects) {
  const old=indices.get(rects);if(old?.length===rects.length)return old;
  const data={length:rects.length,cells:new Map(),moving:[],fixed:[],seen:null,order:new Map(rects.map((b,i)=>[b,i])),stamp:0,queries:0,candidates:0,linearEquivalent:0};
  for(const box of rects){
    if(isMovingBlocker(box)){data.moving.push(box);continue;}
    const i=data.fixed.push(box)-1;
    for(let x=Math.floor((box.x-box.w/2)/CELL);x<=Math.floor((box.x+box.w/2)/CELL);x++)
      for(let z=Math.floor((box.z-box.d/2)/CELL);z<=Math.floor((box.z+box.d/2)/CELL);z++){
        const k=key(x,z);let bucket=data.cells.get(k);if(!bucket)data.cells.set(k,bucket=[]);bucket.push(i);
      }
  }
  data.seen=new Uint32Array(data.fixed.length);indices.set(rects,data);return data;
}
/** Callback returns true to stop. No candidate arrays or Sets are allocated on
 * gameplay queries. Stamp wrap is handled even during an unusually long run. */
export function anyNearby(rects,minX,minZ,maxX,maxZ,test){
  let d=indices.get(rects);if(!d)return rects.some(test);
  if(d.length!==rects.length)d=indexSpatial(rects);
  d.queries++;d.linearEquivalent+=rects.length;
  const x0=Math.floor(minX/CELL),z0=Math.floor(minZ/CELL),x1=Math.floor(maxX/CELL),z1=Math.floor(maxZ/CELL);
  // Out-of-bounds imported data must not create an unbounded cell loop.
  if(!Number.isFinite(x0+z0+x1+z1)||(x1-x0+1)*(z1-z0+1)>2048){
    return rects.some(b=>{d.candidates++;return test(b);});
  }
  d.stamp=(d.stamp+1)>>>0;if(!d.stamp){d.seen.fill(0);d.stamp=1;}
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    const bucket=d.cells.get(key(x,z));if(!bucket)continue;
    for(const i of bucket){if(d.seen[i]===d.stamp)continue;d.seen[i]=d.stamp;d.candidates++;if(test(d.fixed[i]))return true;}
  }
  for(const b of d.moving){d.candidates++;if(test(b))return true;}
  return false;
}
export function spatialReport(rects){
  const d=indices.get(rects);return d?{cellMetres:CELL,staticBodies:d.fixed.length,dynamicBodies:d.moving.length,cells:d.cells.size,queries:d.queries,candidates:d.candidates,linearEquivalent:d.linearEquivalent}:null;
}
/** Retain the authored first-hit ordering used by tiny swept bolt segments.
 * Broad-phase bucket order must not change which overlapping surface wins. */
export function firstNearby(rects,minX,minZ,maxX,maxZ,test){
  if(!indices.has(rects))return rects.find(test);
  if(indices.get(rects).length!==rects.length)indexSpatial(rects);
  const d=indices.get(rects);let found,order=Infinity;
  anyNearby(rects,minX,minZ,maxX,maxZ,b=>{const n=d.order.get(b);if(n<order&&test(b)){found=b;order=n;}return false;});
  return found;
}
