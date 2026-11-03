const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const LIFE={sight:12,sound:9,beam:7,door:12,track:10};

/** A bounded notebook of observations, not access to the player's hidden state.
 * Positions come only from sight/hearing or a visible footprint. Older and
 * uncertain clues lose weight. Nearby repeat observations update one entry. */
export class EvidenceMemory {
  constructor(limit=12){this.limit=limit;this.reset();}
  reset(){this.items=[];this.serial=0;}
  observe(kind,position,time,{confidence=.5,source=kind,uncertainty=0}={}){
    if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return null;
    let item=this.items.find(e=>e.source===source&&distance(e,position)<2);
    if(!item){item={id:++this.serial};this.items.push(item);}
    Object.assign(item,{kind,source,x:position.x,z:position.z,time,
      confidence:Math.max(.05,Math.min(1,confidence)),uncertainty});
    if(this.items.length>this.limit)this.items.shift();return item;
  }
  score(e,time){return e.confidence*Math.max(0,1-(time-e.time)/(LIFE[e.kind]||8));}
  prune(time){this.items=this.items.filter(e=>this.score(e,time)>.025);}
  best(time,origin=null){
    let result=null,score=0;
    for(const e of this.items){const value=this.score(e,time)/(1+(origin?distance(e,origin)*.018:0));if(value>score){score=value;result=e;}}
    return result?{...result,score}:null;
  }
  near(point,time,radius=5){return this.items.filter(e=>distance(e,point)<radius&&this.score(e,time)>.15);}
  lockerCase(spot,time){
    const nearby=this.near(spot.entry,time,3.5);
    const door=nearby.find(e=>e.kind==='door'&&e.source===`door:${spot.id}`&&this.score(e,time)>.35);
    const corroboration=nearby.find(e=>e!==door&&['sight','track'].includes(e.kind)&&this.score(e,time)>.3);
    // Hearing any random locker is not enough to identify an occupant.
    return !!(door&&corroboration&&Math.abs(door.time-corroboration.time)<6);
  }
  report(time){return this.items.map(e=>({...e,score:Number(this.score(e,time).toFixed(3))}));}
}

/** Small utility selector with hysteresis: a similar-scoring distraction cannot
 * make the opponent change its mind on every sensing tick. Direct sight can
 * interrupt immediately. Goals are selected only from the evidence notebook. */
export class DecisionPolicy {
  reset(){this.choice=null;this.until=0;this.reason='No evidence';}
  constructor(){this.reset();}
  choose(memory,time,{visible=false,suspicion=0,origin=null}={}){
    const evidence=memory.best(time,origin);
    if(!evidence){if(time>=this.until){this.choice=null;this.reason='Search exhausted';}return this.choice;}
    const behavior=visible?(suspicion>=1?'chase':'stalk'):
      evidence.kind==='door'?'check-door':evidence.kind==='track'?'track':evidence.score>.65?'investigate':'stalk';
    const urgent=visible||!this.choice||time>=this.until||evidence.score>(this.choice.score||0)+.3;
    if(urgent){this.choice={behavior,evidenceId:evidence.id,goal:{x:evidence.x,z:evidence.z},score:evidence.score};this.until=time+(visible?.35:1.25);this.reason=`${behavior}: ${evidence.kind} (${Math.round(evidence.score*100)}%)`;}
    return this.choice;
  }
}
