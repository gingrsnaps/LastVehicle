/** Outdoor controls have one source of truth. Visuals, prompts, the map and
 * safe approach markers use the same object; the marker never means "stand
 * inside the mesh". Coordinates are metres, Y up, north negative Z. */
const control=(id,name,x,y,z,ax,az,room='yard')=>Object.freeze({id,name,x,y,z,approach:{x:ax,z:az},room});
export const YARD=Object.freeze({
 inspect:control('yard','BARRIER CONTROL',-10,1.28,-49.4,-10,-47.5),
 isolate:control('isolate','UTILITY SELECTOR',25.62,1.35,-22,23.8,-22),
 release:control('barrier','BARRIER BRAKE',17.02,1.1,-45.9,18.5,-45.7,'gatehouse'),
 route:control('route','DOCK WINCH',-18,1.2,-34,-16.5,-33.7),
 fence:{x:-10,y:1.9,z:-51.5},gatehouseDoor:{x:20,y:1.4,z:-36},
});
const task=(c,title,instruction,why,hints)=>({
 id:c.id,title,label:c.id==='yard'?'Inspect BARRIER CONTROL':c.id==='isolate'?'Use UTILITY SELECTOR':c.id==='barrier'?'Turn BARRIER BRAKE':'Use DOCK WINCH',
 instruction,why,destination:{...c,controlId:c.id,name:c.name,portal:[c.approach.x,c.approach.z]},hints,
});
export const EXPANSION_TASKS=[
 task(YARD.inspect,'Inspect BARRIER CONTROL',
 'Walk through the raised garage shutter. Follow the paved strip beside the loading dock to 01 BARRIER CONTROL, before the cargo dolly. Use its amber front panel.',
 'The garage shutter opens into a service yard. Its street barrier has a separate control.',
 ['Follow the paved strip and 01 BARRIER CONTROL signs beside the loading dock. The cabinet stands before the cargo dolly, under an amber lamp.',
 'Face the amber panel labelled BARRIER CONTROL, approach until the use prompt appears, then press {use}. The barrier arm itself is not the control.']),
 task(YARD.isolate,'Use the UTILITY SELECTOR',
 'Go to the generator awning opposite the loading dock. At UTILITY SELECTOR choose LOADING OFF, then GATEHOUSE ON.',
 'The wet loading circuit must be isolated before the dry gatehouse supply can power the barrier.',
 ['Look for 02 UTILITY SELECTOR under the generator awning. Its handle is on the cabinet facing the open yard, beside the generator.',
 'Approach the yellow selector handle from the open side of the awning. Press {use}, choose LOADING OFF, then GATEHOUSE ON.']),
 task(YARD.release,'Release the BARRIER BRAKE',
 'Enter the GATEHOUSE through its front doorway. Turn the yellow wheel beside the damaged side door, labelled BARRIER BRAKE.',
 'Power is restored; the barrier motor still needs its mechanical brake released.',
 ['The gatehouse is the small building beyond the generator awning. Its front door faces the garage.',
 'Inside, find the yellow wheel beside the damaged side door. Press {use} to crank; use again to cancel if threatened.']),
 task(YARD.route,'Clear the road with the DOCK WINCH',
 'Go to 04 DOCK WINCH beside the loading shutters. It pulls the cargo dolly along the covered tow channel. Pull it aside, then return to bay 042.',
 'The barrier is open, but freight blocks the driving lane.',
 ['Find 04 DOCK WINCH at the loading dock; the dolly moves along the ground channel. The winch stands beside the closed loading shutters.',
 'Approach the labelled winch beside the loading shutters and press {use}. Let it finish, then return to the driver door of your repaired car.']),
];
export const REFILLS=[
 {id:'refill-workshop',x:-25,y:1.63,z:82.8,label:'Workshop bolt tray'},
 {id:'refill-yard',x:-16.8,y:.99,z:-23,label:'Loading dock bolt tray'},
 {id:'refill-gatehouse',x:21.9,y:.88,z:-44.7,label:'Gatehouse bolt tray'},
];
