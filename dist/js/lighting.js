import { roomAt } from './guidance.js?v=1.19.0';
// Only real door openings connect rooms. Preselect the neighbouring fixture on
// approach; proximity to a solid wall must never light the room behind it.
export const LIGHT_PORTALS=[
 {x:0,z:0,a:'garage',b:'yard'},{x:20,z:-36,a:'yard',b:'gatehouse'},{x:16.5,z:-44,a:'yard',b:'gatehouse'},{x:0,z:-58,a:'yard',b:'road'},
 {x:-17,z:18,a:'garage',b:'security'},{x:-17,z:45,a:'garage',b:'storage'},
 {x:-17,z:76,a:'garage',b:'workshop'},{x:17,z:39,a:'garage',b:'electrical'},
 {x:17,z:98,a:'garage',b:'pump'},{x:-24,z:29,a:'security',b:'garage'},
 {x:-24,z:33,a:'storage',b:'garage'},{x:-24,z:57,a:'storage',b:'garage'},
 {x:-24,z:62,a:'workshop',b:'garage'},
];
export function selectFixtures(fixtures,position,limit=4){
 const zone=roomAt(position),neighbours=new Set();
 for(const p of LIGHT_PORTALS)if(Math.hypot(p.x-position.x,p.z-position.z)<4.5){
   if(p.a===zone)neighbours.add(p.b);if(p.b===zone)neighbours.add(p.a);
 }
 const distance=f=>(f.x-position.x)**2+(f.z-position.z)**2;
 const own=fixtures.filter(f=>roomAt(f)===zone).sort((a,b)=>distance(a)-distance(b));
 const nearby=fixtures.filter(f=>neighbours.has(roomAt(f))).sort((a,b)=>distance(a)-distance(b));
 // At most two neighbouring lights; nearby work lamps and home-room lights win.
 const selected=own.slice(0,nearby.length?2:limit);
 selected.push(...nearby.slice(0,Math.min(2,limit-selected.length)));
 for(const f of own)if(selected.length<limit&&!selected.includes(f))selected.push(f);
 return selected;
}


/** Story lighting and stealth share authored circuits, independent of the
 * player's brightness slider. No GPU pixel readback is used for perception. */
export function lightingPhase(state){return state?.flags?.includes('power')?'restored':state?.flags?.includes('car')?'outage':'arrival';}
export function fixturePower(fixture,phase){
 const room=roomAt(fixture);
 if(['yard','gatehouse','road'].includes(room))return fixture.emergency?(room==='gatehouse'?.52:.42):.12;
 if(phase==='arrival')return .88;
 if(phase==='outage')return fixture.emergency?.3:.065;
 // Restored drive-lane and task lighting exposes crossings; peripheral cover
 // stays dark. Existing task/sign lamps are always usable at their positions.
 return room==='garage'&&Math.abs(fixture.x)<4||room==='electrical'||room==='security'?.95:fixture.emergency?.4:.25;
}
export function ambientPower(phase){return phase==='arrival'?.035:phase==='restored'?.012:.004;}
export function stealthVisibility(position,fixtures,phase='outage'){
 let value=phase==='arrival'?.38:phase==='restored'?.23:.18;
 const room=roomAt(position);
 for(const f of fixtures)if(roomAt(f)===room){
   const falloff=Math.max(0,1-Math.hypot(position.x-f.x,position.z-f.z)/(f.range||11));
   const strength=Math.min(1,(f.base||1)/1.5)*fixturePower(f,phase);
   value=Math.max(value,.18+falloff*strength*.8);
 }
 return Math.max(.18,Math.min(.95,value));
}
