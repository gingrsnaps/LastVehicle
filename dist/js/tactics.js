import { blocked, AGENT_RADIUS } from './navigation.js?v=1.19.0';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

/** Learns a repeated circle only from sampled, visible positions. Memory expires
 * after lost sight; it cannot consult an unseen player's live coordinates. */
export class LoopMemory {
  constructor(rects){this.rects=rects;this.reset();}
  reset(){this.samples=new Map();this.nextSample=0;this.cooldown=0;this.commit=null;this.decisions=0;}
  observe(point,clock,rules,enemy){
    if(clock<this.nextSample)return;this.nextSample=clock+.35;
    for(const [key,s] of this.samples)if(clock-s.time>4)this.samples.delete(key);
    if(!rules.intercept)return;
    for(const r of this.rects){
      // Match vehicle words, not the "car" prefix in a moving storage cart.
      if(!/(?:^|[\s_-])(?:car|sedan|van|suv|hatchback|covered)(?:[\s_-]|$)/i.test(r.name||'')||r.enabled===false)continue;
      const dx=(point.x-r.x)/(r.w/2+1),dz=(point.z-r.z)/(r.d/2+1);
      if(Math.hypot(dx,dz)>2.2||Math.hypot(dx,dz)<.6)continue;
      const angle=Math.atan2(dz,dx),old=this.samples.get(r);
      const delta=old?wrap(angle-old.angle):0;
      // Gaps/large jumps are new observations, not invented motion behind cover.
      const continuous=old&&clock-old.time<1.3&&Math.abs(delta)<1.2;
      const signed=continuous?(Math.sign(delta)===Math.sign(old.sweep)||Math.abs(delta)<.02?old.sweep+delta:delta):0;
      const sample={angle,time:clock,sweep:signed};this.samples.set(r,sample);
      if(Math.abs(signed)<(rules.id==='hard'?Math.PI*1.35:Math.PI*1.8)||clock<this.cooldown)continue;
      const ahead=angle+Math.sign(signed)*Math.PI*.65;
      const goal={x:r.x+Math.cos(ahead)*(r.w/2+1.05),z:r.z+Math.sin(ahead)*(r.d/2+1.05)};
      if(blocked(goal.x,goal.z,this.rects,AGENT_RADIUS))continue;
      // Do not abandon a close strike for a long speculative detour.
      if(Math.hypot(goal.x-enemy.x,goal.z-enemy.z)>12)continue;
      this.commit={goal,until:clock+(rules.id==='hard'?2.4:1.8)};
      this.cooldown=clock+18;sample.sweep=0;this.decisions++;break;
    }
  }
  goal(clock){if(this.commit&&clock<this.commit.until)return {...this.commit.goal};this.commit=null;return null;}
}
