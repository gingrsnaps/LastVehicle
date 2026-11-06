/** Authoritative task contract. The journal, map, prompts and save flag order
 * all derive from these records. Keep IDs stable so existing checkpoints survive.
 * Text may contain {use}; render it using the CURRENT binding, never a literal E. */
import { EXPANSION_TASKS } from './campaign.js?v=1.19.0';
export const TASKS = [
  {
    "id": "car",
    "action": "car",
    "title": "Inspect your car",
    "instruction": "Inspect the teal car in bay 042. Its left driver door or front hood both work.",
    "label": "Inspect car",
    "requires": [],
    "why": "Your car is your way out. Find out why it will not start.",
    "notes": [
      "notice"
    ],
    "destination": {
      "room": "garage",
      "name": "BAY 042 · YOUR CAR",
      "x": 13.67,
      "z": 76.95,
      "portal": [
        10,
        75
      ]
    },
    "hints": [
      "Find the teal car on the east side of the lane.",
      "Aim at the driver handle or the hood and press {use}. Both inspect the same car."
    ]
  },
  {
    "id": "battery",
    "action": "battery",
    "title": "Recover your battery",
    "instruction": "Take the removed battery from the floor beside the front of your car.",
    "label": "Take car battery",
    "requires": [
      "car"
    ],
    "why": "Keep the battery; the damaged cable will also need replacement.",
    "notes": [
      "notice"
    ],
    "destination": {
      "room": "garage",
      "name": "BAY 042 · BATTERY",
      "x": 9.6,
      "z": 77.1,
      "portal": [
        9,
        78
      ]
    },
    "hints": [
      "Look just west of the car, near the open hood.",
      "Aim at the black battery with a handle and two terminals, then press {use}."
    ]
  },
  {
    "id": "key",
    "action": "key",
    "title": "Find the maintenance key",
    "instruction": "Go to room 01, SECURITY. Take the maintenance key from the desk.",
    "label": "Take maintenance key",
    "requires": [
      "car",
      "battery"
    ],
    "why": "The key opens the workshop cabinet and west service passage.",
    "notes": [
      "log"
    ],
    "destination": {
      "room": "security",
      "name": "01 · SECURITY",
      "x": -23.4,
      "z": 18,
      "portal": [
        -16,
        18
      ]
    },
    "hints": [
      "Security is at the northwest end of the garage.",
      "Take the brass key beside the log. The key works automatically; no inventory menu is required."
    ]
  },
  {
    "id": "fuse",
    "action": "fuse",
    "title": "Collect the repair supplies",
    "instruction": "Use the REPAIR SUPPLIES cabinet in room 03, WORKSHOP. One pickup collects the battery cable and exit-control fuse.",
    "label": "Take cable & fuse",
    "requires": [
      "car",
      "battery",
      "key"
    ],
    "why": "The cable repairs your car; the fuse restores the exit supply.",
    "notes": [
      "log",
      "workorder"
    ],
    "destination": {
      "room": "workshop",
      "name": "03 · WORKSHOP",
      "x": -27.3,
      "z": 76,
      "portal": [
        -16,
        76
      ]
    },
    "hints": [
      "Follow the west service passage south to Workshop.",
      "Aim at the labelled cabinet beside the damaged side door and press {use}. Both parts are collected together."
    ]
  },
  {
    "id": "repair",
    "action": "repair",
    "title": "Repair your car",
    "instruction": "Return to bay 042. Use the open hood to install the battery and replacement cable.",
    "label": "Install battery & cable",
    "requires": [
      "car",
      "battery",
      "key",
      "fuse"
    ],
    "why": "Prepare the car before attracting attention at the exit.",
    "notes": [
      "notice",
      "workorder"
    ],
    "destination": {
      "room": "garage",
      "name": "BAY 042 · OPEN HOOD",
      "x": 10.7,
      "z": 78,
      "portal": [
        9,
        78
      ]
    },
    "hints": [
      "The hood faces west, toward the driving lane.",
      "Press {use} at the hood. Both parts install automatically. Press {use} again to cancel if you need to run."
    ]
  },
  {
    "id": "power",
    "action": "power",
    "title": "Restore the exit supply",
    "instruction": "Use the panel in room 04, ELECTRICAL. The fuse installs automatically; choose the circuit order from the workshop note.",
    "label": "Restore exit supply",
    "requires": [
      "car",
      "battery",
      "key",
      "fuse",
      "repair"
    ],
    "why": "The vehicle exit and Security computer need electricity.",
    "notes": [
      "workorder"
    ],
    "destination": {
      "room": "electrical",
      "name": "04 · ELECTRICAL",
      "x": 27.1,
      "z": 39,
      "portal": [
        16,
        39
      ]
    },
    "hints": [
      "The restart procedure is in your collected notes.",
      "At the Electrical panel choose VENTILATION, then LIGHTING, then ACCESS."
    ]
  },
  {
    "id": "terminal",
    "action": "terminal",
    "title": "Authorize the exit",
    "instruction": "Use the computer in room 01, SECURITY. Enter the year Meridian opened.",
    "label": "Authorize vehicle exit",
    "requires": [
      "car",
      "battery",
      "key",
      "fuse",
      "repair",
      "power"
    ],
    "why": "The computer authorizes the north gate motor directly.",
    "notes": [
      "log",
      "plaque"
    ],
    "destination": {
      "room": "security",
      "name": "01 · SECURITY",
      "x": -25,
      "z": 13.7,
      "portal": [
        -16,
        18
      ]
    },
    "hints": [
      "The handover log and the north dedication plaque give the year.",
      "Enter 1986 at the Security computer and confirm."
    ]
  },
  {
    "id": "gate",
    "action": "gate",
    "title": "Raise the exit shutter",
    "instruction": "Use the gate motor to the left of the north exit. Walk outside and inspect the service-yard barrier.",
    "label": "Raise exit shutter",
    "requires": [
      "car",
      "battery",
      "key",
      "fuse",
      "repair",
      "power",
      "terminal"
    ],
    "why": "The motor will attract attention. Plan a route back using cover.",
    "notes": [
      "dispatch"
    ],
    "destination": {
      "room": "garage",
      "name": "NORTH EXIT · MOTOR",
      "x": -4.7,
      "z": 5.5,
      "portal": [
        -4,
        7
      ]
    },
    "hints": [
      "The motor is beside the north shutter, on its left.",
      "Press {use} at the motor. You can move while the shutter rises. Continue on foot into the service yard when it finishes."
    ]
  },
  {
    "id": "escaped",
    "action": "car",
    "title": "Return to your car",
    "instruction": "Use the left driver door of your repaired car in bay 042 to escape.",
    "label": "Enter car & escape",
    "requires": [
      "car",
      "battery",
      "key",
      "fuse",
      "repair",
      "power",
      "terminal",
      "gate"
    ],
    "why": "The gate is open and the car is ready. Break sight and hide if the Attendant blocks your route.",
    "notes": [
      "incident",
      "dispatch"
    ],
    "destination": {
      "room": "garage",
      "name": "BAY 042 · DRIVER DOOR",
      "x": 13.67,
      "z": 76.95,
      "portal": [
        10,
        75
      ]
    },
    "hints": [
      "Use rooms and the west service passage to break pursuit.",
      "Press {use} at the left driver door (north side while parked). The car door opens, closes, and the automatic drive begins. Escape still pauses."
    ]
  }
];
// Append the exterior chapter before the existing ending, keeping old IDs stable.
const ending=TASKS.pop();
for(const spec of EXPANSION_TASKS)TASKS.push({...spec,action:spec.id,requires:TASKS.map(t=>t.id),notes:['yard-log']});
ending.requires=TASKS.map(t=>t.id);ending.title='Return to your car and drive out';ending.label='Enter driver seat';
ending.instruction='Return to bay 042 and enter the left driver door. Drive through the garage shutter, across the yard and left around the roadworks container to the street.';
ending.why='The street barrier and cargo lane are clear. You control the car all the way to the road.';
ending.hints=['Use the unlocked service passage to return to bay 042.','Use the left driver handle. Move forward/back to accelerate/brake or reverse; left/right steers. Use again when stopped to exit. Follow the OPEN LANE arrow past the container.'];
TASKS.push(ending);
export const TASK_BY_ID = Object.fromEntries(TASKS.map(task=>[task.id,task]));
export const currentTask = state => {
  const task=TASKS.find(task=>!state.flags.includes(task.id))||null;
  if(task?.id==='escaped'&&state.driving)return {...task,title:'Drive to the street',instruction:'Drive through the garage shutter and open street barrier. Use the open lane beside the roadworks container, then follow the lane to the street.',destination:{room:'road',name:'SERVICE ROAD · STREET',x:0,z:-95,portal:[0,-58]},hints:['Follow the amber road lights north.','Accelerate/brake with forward/back, steer with left/right. Follow the OPEN LANE sign beside the container. You can reverse and reposition.']};
  if(task?.id==='escaped'&&state.carPosition)return {...task,title:'Return to your parked car',instruction:'Enter the left driver door of your parked car, then drive north to the street.',destination:{room:state.carPosition.z<0?'yard':'garage',name:'PARKED CAR · LEFT DRIVER DOOR',...state.carPosition,portal:[state.carPosition.x,state.carPosition.z]}};
  return task;
};
export function keyLabel(code="KeyE") {
  return ({ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"})[code] || String(code).replace(/^(Key|Digit)/,"").replace(/(Left|Right)$/,"").replace("Control","Ctrl");
}
export function taskText(text, bindings={}) {return text.replaceAll("{use}",keyLabel(bindings.interact));}
/** Used items remain acknowledged after they disappear from carried inventory. */
export function inventoryStatus(state) {
  const has=id=>state.flags.includes(id);
  const item=(name,found,used)=>({name,status:has(used)?"Installed":has(found)?"Carrying":"Missing"});
  const parts=[item("Car battery","battery","repair"),item("Battery cable","fuse","repair"),item("Exit-control fuse","fuse","power")];
  if(has("key"))parts.push({name:"Maintenance key",status:"Carrying"});
  return parts;
}
