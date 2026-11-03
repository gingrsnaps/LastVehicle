/** Measurements belong to the delivered, embedded GLBs. Placement uses a
 * separate root so Babylon's glTF handedness conversion remains intact.
 * Furniture sits at human scale and never replaces an interactive anchor. */
export const PROP_SIZES={
 "office-chair":[.33495,.6076,.314299],"office-desk":[.734475,.384408,.3923],
 "office-monitor":[.392688,.294285,.104004],"storage-crate":[.595,.55,1],
 "industrial-machine":[1.2,1.299752,1.5],"control-console":[.6,.991309,.499245],
 "valve-pipe":[1,1,1.015601]
};
// The preserved glTF conversion flips source +Z to world -Z before this yaw.
// name, x, z, yaw, scale, height above floor. Raised boxes sit on existing shelves.
export const PROP_LAYOUT=[
 ["office-desk",-20.2,10.2,Math.PI,1.95,0],
 ["office-monitor",-20.2,9.98,Math.PI,1.6,.75],
 ["office-chair",-20.3,11.25,.18,1.8,0],
 ["office-chair",-27.2,15.4,Math.PI+.15,1.8,0],
 ["storage-crate",-26.7,38,0,1,1.36],
 ["storage-crate",-28,51,.05,1,1.36],
 ["storage-crate",-21.1,49,Math.PI/2,1.2,0],
 ["industrial-machine",-20,82,Math.PI/2,1.2,0],
 ["control-console",22,32,Math.PI,1.2,0],
 ["valve-pipe",28,104,Math.PI/2,1.4,0],
 ["industrial-machine",21,104,.2,1.2,0],
 ["storage-crate",-26.9,51,0,.8,1.36],
 ["storage-crate",-28,38,0,.75,1.36],
 ["control-console",28,45,Math.PI/2,1,0],
 ["office-monitor",-26,12.8,0,1.45,.93],
 ["valve-pipe",28,91,Math.PI/2,1.15,0]
];
export function propCollider(name,x,z,yaw,scale,y=0){
 const [w,h,d]=PROP_SIZES[name].map(v=>v*scale),c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
 return {name:"dressing "+name,x,z,y:y+h/2,w:w*c+d*s,h,d:w*s+d*c,enabled:true};
}
