// These are real openings, not synthetic sound sources. Obstructed sounds can
// arrive via a visible doorway; closed doors are checked against live geometry.
const PORTALS=[[0,0],[20,-36],[16.5,-44],[0,-58],[-17,18],[-17,45],[-17,76],[-17,98],[17,39],[17,98],[-24,29],[-24,33],[-24,57],[-24,62]].map(([x,z])=>({x,y:1.3,z}));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function acousticRoute(listener,source,occluded){
 if(!occluded(listener,source))return {gain:1,frequency:18000,point:source,kind:'direct',distance:distance(listener,source)};
 let best=null,cost=Infinity;
 for(const p of PORTALS){const d=distance(listener,p)+distance(p,source);
   if(d<cost&&d<45&&!occluded(listener,p)&&!occluded(p,source)){best=p;cost=d;}
 }
 if(best)return {gain:Math.max(.18,.62/(1+Math.max(0,cost-distance(listener,source))*.08)),frequency:3200,point:best,kind:'doorway',distance:cost};
 return {gain:.24,frequency:850,point:source,kind:'muffled',distance:distance(listener,source)};
}
