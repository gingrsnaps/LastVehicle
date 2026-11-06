import { has, NOTES } from "./state.js?v=1.19.0";
import { TASKS, TASK_BY_ID, currentTask, taskText } from "./tasks.js?v=1.19.0";
import { objective } from "./state.js?v=1.19.0";

/** Prompts and the actual action share the same prerequisite check. A car's
 * hood/passenger side offer inspection first, never a premature repair task. */
export function availability(id,state,player={},threat={}) {
  const done=flag=>has(state,flag), next=currentTask(state);
  const result=(available,label,reason="",hidden=false,action=id)=>({available,label,reason,hidden,action});
  if(id in NOTES)return result(true,`Read ${NOTES[id].title.toLowerCase()}`);
  if(id==="van")return result(true,"Inspect service van · optional evidence");
  if(id.startsWith("hide-"))return result(!player.vehicle,"Hide");
  if(["car","repair","car-passenger"].includes(id)&&!done("car"))return result(true,TASK_BY_ID.car.label,"",false,"car");
  if(id==="car-passenger")return result(false,"", "",true);
  if(id.startsWith('refill-'))return result(!state.refills?.includes(id)&&(state.bolts??3)<3,'Take spare bolts',state.refills?.includes(id)?'Tray empty':'You can carry three bolts');
  if(id==="car"&&done("car"))return result(done("route")&&done("repair"),TASK_BY_ID.escaped.label, next?"Next: "+next.instruction:"");
  const task=TASK_BY_ID[id];
  if(task) {
    if(done(id))return result(false,task.label,"Completed",true);
    if(task.requires.some(flag=>!done(flag)))return result(false,task.label,"Next: "+next.instruction);
    return result(true,task.label);
  }
  const optional={release:"Read security evidence · optional",valve:"Release pressure · optional distraction",alarm:"Sound siren · optional distraction",trap:"Drop grille · temporary distraction"};
  if(id==="release"&&!done("terminal"))return result(false,optional[id],"Security evidence locker unlocks after exit authorization. Optional.");
  if(["valve","alarm"].includes(id)&&!done("key"))return result(false,optional[id],"Available after collecting the maintenance key. Optional.");
  if(id==="trap") {
    if((player.pos?.x??0)<-16)return result(false,optional[id],"Step outside the workshop");
    const p=threat.pos||threat;
    if(!(p.x<=-19&&p.z>=62&&p.z<=88))return result(false,optional[id],"Wait until he is inside the workshop");
  }
  return result(id in optional,optional[id]||"Inspect");
}

export const ROOMS = ["security", "storage", "workshop", "electrical", "pump",'yard','gatehouse','road'];
export function roomAt(p) {
  if(p.z<-58)return 'road';
  if(p.z<0){if(p.x>16.3&&p.z<=-36&&p.z>=-52.2)return 'gatehouse';return 'yard';}
  if (p.x < -17) {
    if (p.z >= 7 && p.z <= 29) return "security";
    if (p.z >= 33 && p.z <= 57) return "storage";
    if (p.z >= 62 && p.z <= 88) return "workshop";
  }
  if (p.x > 17 && p.z >= 27 && p.z <= 51) return "electrical";
  if (p.x > 17 && p.z >= 86) return "pump";
  return "garage";
}

// Map destinations and all hint levels are projections of the same task record.
export const DESTINATIONS=Object.fromEntries(TASKS.map(task=>[task.id,task.destination]));
export function destination(state){return currentTask(state)?.destination || null;}
export function hintText(state,level=1,bindings={}) {
  const task=currentTask(state);if(!task)return "You escaped Meridian.";
  return taskText(level<=1?task.hints[0]:level===2?task.instruction:task.hints[1],bindings);
}

/** Only active, quiet play counts toward the reminder. Pauses, reading and
 * pursuit cannot consume the player's hint timer. Hints never advance a flag. */
export class Guidance {
  constructor(state) { this.reset(state); }
  reset(state) {
    this.id = objective(state)[0]; this.level = 0; this.idle = 0;
    this.reminded = false; this.markerSeconds = 0;
  }
  progress(state) { this.reset(state); }
  request(state) {
    if (this.id !== objective(state)[0]) this.reset(state);
    this.level = Math.min(3, this.level + 1);
    this.markerSeconds = 60; this.idle = 0; this.reminded = false;
    return { level: this.level, text: hintText(state, this.level), destination: destination(state) };
  }
  tick(dt, state, busy, reminders = true) {
    if (this.id !== objective(state)[0]) this.reset(state);
    this.markerSeconds = Math.max(0, this.markerSeconds - dt);
    if (busy) return false;
    this.idle += dt;
    if (reminders && !this.reminded && this.idle >= 60) { this.reminded = true; return true; }
    return false;
  }
}
