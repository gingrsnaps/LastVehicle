/** Story beats are saved once, while timing remains transient. A pause freezes
 * this controller. Required-task beats have priority over optional ambience;
 * close attacks and witnessed locker inspections always win the frame. */
export const MAJOR_ENCOUNTERS = ["securityBreach", "workshopBreach", "powerSurge"];
export const QUALITY_ENCOUNTERS=[...MAJOR_ENCOUNTERS,'closePass','shelterInspection','carReturn','cartPush','pressureBurst'];
export const ENCOUNTER_IDS = [...QUALITY_ENCOUNTERS,"watcher","cabinet","crossing","pursuit","locker","window"];
export class EncounterDirector {
  constructor(state) { this.reset(state); }
  reset(state) {
    this.state=state;this.queue=[];this.active=null;this.quiet=0;this.recovery=0;this.chasing=false;
    this.chaseDuration=0;this.progress=state.flags.length;this.failures=0;
    // Resume an interrupted beat at the task's checkpoint, but never replay a
    // committed impact. Saves from older releases keep their legacy records.
    const recent=[["power","powerSurge"],["fuse","workshopBreach"],["key","securityBreach"]].find(([flag])=>state.flags.includes(flag));
    if(recent&&!state.scares.includes(recent[1]))this.request(recent[1]);
  }
  request(id) { if(!ENCOUNTER_IDS.includes(id)||this.state.scares.includes(id)||this.active===id||this.queue.includes(id))return false;this.queue.push(id);return true; }
  tick(dt,mode,failures=0) {
    this.quiet=Math.max(0,this.quiet-dt);this.recovery=Math.max(0,this.recovery-dt);
    const chase=["chase","attack","recover"].includes(mode);
    if(chase)this.chaseDuration+=dt;
    if(this.chasing&&!chase){this.recovery=Math.max(this.recovery,6+Math.min(18,this.chaseDuration*.6));this.chaseDuration=0;}
    if(failures>this.failures){this.recovery=Math.max(this.recovery,Math.min(36,12+failures*6));this.failures=failures;}
    if(this.state.flags.length!==this.progress){this.progress=this.state.flags.length;this.recovery=Math.max(this.recovery,3);}
    this.chasing=chase;
  }
  next({mode,hiding=false,vehicle=false,busy=false,ready=()=>true}) {
    if(this.active||hiding||vehicle||busy||this.chasing||this.recovery>0||["chase","attack","recover","inspect"].includes(mode))return null;
    const index=this.queue.findIndex(id=>ready(id)&&(MAJOR_ENCOUNTERS.includes(id)?this.quiet<=0:this.quiet<=0&&this.recovery<=0&&!this.chasing));
    if(index<0)return null;return this.active=this.queue.splice(index,1)[0];
  }
  commit(id) { if(!this.state.scares.includes(id))this.state.scares.push(id);this.active=null;this.quiet=QUALITY_ENCOUNTERS.includes(id)?45:28; }
}
