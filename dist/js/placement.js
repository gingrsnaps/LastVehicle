/** Metres, Y-up. These shared records keep paint, cars and collision in agreement.
 * Bay 042 deliberately has a wider space for its opening doors and escape turn. */
export const PARKING_ROWS = [
  {side:-1,edges:[10,17,24,31,38,45,52,59,66,73,80,87,94,101,108]},
  {side:1,edges:[10,17,24,31,38,45,52,59,66,73,83,90,97,104,111]},
];
export const PARKED_CARS = [
  {type:"van",side:-1,bay:12}, {type:"hatchback",side:1,bay:2},
  {type:"suv",side:-1,bay:3}, {type:"sedan",side:1,bay:6},
  {type:"hatchback",side:-1,bay:7}, {type:"van",side:-1,bay:11},
  {type:"hatchback",side:1,bay:8}, {type:"suv",side:1,bay:12}, {type:"sedan",side:-1,bay:0},
].map(car=>{
  const edges=PARKING_ROWS.find(row=>row.side===car.side).edges;
  return {...car,x:car.side*12,z:(edges[car.bay]+edges[car.bay+1])/2,yaw:car.side*Math.PI/2};
});

/** Measure actual transformed vertices' bounds after glTF handedness conversion.
 * Called only while loading, never on a gameplay frame. The caller can use this
 * same footprint for collision and contact shading instead of a generic car box. */
export function groundModel(root,x,z,supportY=0) {
  const meshes=[...(root.getTotalVertices?.() ? [root] : []),...(root.getChildMeshes?.() || [])];
  const measure=()=>{
    const lo={x:Infinity,y:Infinity,z:Infinity},hi={x:-Infinity,y:-Infinity,z:-Infinity};
    root.computeWorldMatrix(true);
    for(const mesh of meshes){
      if(!mesh.getTotalVertices?.())continue;
      mesh.computeWorldMatrix(true);
      const b=mesh.getBoundingInfo().boundingBox;
      for(const axis of ["x","y","z"]){lo[axis]=Math.min(lo[axis],b.minimumWorld[axis]);hi[axis]=Math.max(hi[axis],b.maximumWorld[axis]);}
    }
    return {lo,hi};
  };
  let b=measure();
  if(!Number.isFinite(b.lo.y))return null;
  root.position.x+=x-(b.lo.x+b.hi.x)/2;
  root.position.z+=z-(b.lo.z+b.hi.z)/2;
  root.position.y+=supportY-b.lo.y;
  b=measure();
  const bounds={x:(b.lo.x+b.hi.x)/2,z:(b.lo.z+b.hi.z)/2,y:(b.lo.y+b.hi.y)/2,
    w:b.hi.x-b.lo.x,h:b.hi.y-b.lo.y,d:b.hi.z-b.lo.z,bottom:b.lo.y};
  root.metadata={...root.metadata,placement:bounds,supportY};
  return bounds;
}
