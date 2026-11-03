import { acousticRoute } from "./acoustics.js?v=1.14.0";
import { EvidenceMemory, DecisionPolicy } from "./evidence.js?v=1.14.0";
import { PursuitRoutes } from "./pursuit.js?v=1.14.0";
import { difficultyRules } from "./difficulty.js?v=1.14.0";
import { AGENT_RADIUS, lineClear, sightClear, moveCircle, blocked } from "./navigation.js?v=1.14.0";
import { dampAngle } from "./animation.js?v=1.14.0";
import { RouteFollower } from "./locomotion.js?v=1.14.0";
import { LoopMemory } from "./tactics.js?v=1.14.0";

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const copy=p=>({x:p.x,z:p.z});
const PATROL=[{x:0,z:40},{x:1,z:85},{x:-21,z:18},{x:-22,z:45},{x:23,z:39},{x:0,z:67}];
const JUNCTIONS=[{x:-22,z:28},{x:-22,z:35},{x:-22,z:55},{x:-22,z:65},{x:-15,z:18},{x:-15,z:45},{x:-15,z:76},{x:15,z:39},{x:15,z:98},{x:0,z:26},{x:0,z:60},{x:0,z:85}];
const passive=new Set(["dormant","waiting","reveal","staged","trapped"]);

/** One evidence-driven opponent. Sensing is sampled at 10 Hz, movement at the
 * gameplay rate, and expensive paths at most once per planning interval.
 * Only observed positions update memory; hidden coordinates are never searched.
 * There is deliberately no network/LLM dependency in this AI. */
export class Threat {
  constructor(rects,difficulty="medium",spots=[]){this.rects=rects;this.rules=difficultyRules(difficulty);this.spots=spots;this.reset();}
  reset(){
    this.evidence=new EvidenceMemory();this.policy=new DecisionPolicy();this.decisionAt=0;this.watchUntil=0;this.watchCooldown=0;this.searchAction=null;this.runStart=0;this.movingSpeed=0;this.lastTrack=0;this.contactEvents=[];this.inspectionAuthorized=false;
    this.pos={x:0,z:63};this.yaw=Math.PI;this.mode="dormant";this.suspicion=0;this.clock=0;
    this.lastKnown=null;this.lastSeen=null;this.lastVelocity={x:0,z:0};this.evidenceAge=Infinity;
    this.destination=null;this.path=[];this.lastPlan=null;this.repath=0;this.memory=0;this.grace=0;
    this.searchTime=0;this.searchPlan=[];this.cleared=new Map();this.patrolVisits=new Map();this.patrolIndex=0;
    this.stepDistance=0;this.lastHeard=0;this.speed=0;this.lureTime=0;this.lureUses=new Map();this.trapTime=0;
    this.witness=null;this.inspectSpot=null;this.inspectTime=0;this.searchIndex=0;this.stuck=0;this.pressure=false;
    this.senseClock=0;this.seesPlayer=false;this.listenTime=0;this.attackTime=0;this.recoveryTime=0;this.attackHit=false;
    this.predictionAt=-Infinity;this.predictionGoal=null;this.heardAt=-Infinity;this.evidenceStrength=0;this.escapeAttempts=0;
    this.scriptRoute=null;this.scriptArrived=false;this.scriptPose="Idle";this.attackSerial=0;
    this.mover=new RouteFollower(this.rects);this.motionPose=null;this.motionPhase=null;this.navigationCooldown=0;this.listenHeading=null;this.brakeTime=0;
    this.patrolSeed=(Math.random()*0xffffffff)>>>0;this.patrolPause=0;this.soundTurn=0;this.boltCheckUntil=0;
    this.loops=new LoopMemory(this.rects);this.lostCorner=false;this.bodyLean=0;
  }
  prepareRoutes(){this.routes=new PursuitRoutes(this.rects);}
  activate(noisePosition){
    const retain=["reveal","waiting","staged"].includes(this.mode),pos=copy(this.pos),yaw=this.yaw;
    this.reset();if(retain){this.pos=pos;this.yaw=yaw;}
    this.mode="investigate";this.grace=this.rules.grace;this.lastKnown=copy(noisePosition);this.destination=copy(noisePosition);
  }
  /** A story route still uses the same collider/path controller. Only a dormant,
   * unseen first appearance may be placed at its authored start position. */
  stageRoute(points,pose="Idle"){
    this.mode="staged";this.scriptRoute=points.map(copy);this.scriptArrived=false;this.scriptPose=pose;
    this.destination=this.scriptRoute.shift()||copy(this.pos);this.path=[];this.lastPlan=null;this.repath=0;
    this.mover.invalidate();
  }
  releaseStage(noisePosition,grace=1.6){
    this.mode="investigate";this.scriptRoute=null;this.scriptArrived=false;
    this.destination=copy(noisePosition);this.lastKnown=copy(noisePosition);this.path=[];this.lastPlan=null;this.grace=grace;
  }
  pursueIfSeen(player,grace=.9){
    if(!this.canSee(player))return false;
    this.lastKnown=copy(player.pos);this.lastSeen={...this.lastKnown,time:this.clock};
    this.evidence.observe('sight',this.lastKnown,this.clock,{confidence:1,source:'player-sight'});
    this.memory=this.rules.memory;this.suspicion=1;this.destination=copy(this.lastKnown);
    this.mode='chase';this.grace=grace;this.runStart=.6;this.mover.invalidate();return true;
  }
  reveal(){
    if(this.mode!=="dormant")return false;
    this.pos={x:-12,z:56.5};this.mode="reveal";this.revealIndex=0;this.revealPause=0;
    this.revealRoute=[{x:-8.4,z:56.5},{x:-8.4,z:61},{x:-8.4,z:56.5},{x:-12,z:56.5}];return true;
  }
  lure(position={x:-24,z:76},seconds=9){
    if(["attack","recover","staged"].includes(this.mode)||(this.mode==="chase"&&this.memory>this.rules.memory-1))return false;
    const key=`${Math.round(position.x)},${Math.round(position.z)}`,uses=this.lureUses.get(key)||0;
    this.lureUses.set(key,uses+1);
    this.mode="lured";this.lureTime=Math.max(2.5,seconds*Math.pow(this.rules.lureRetention,Math.min(3,uses)));
    this.lastKnown=copy(position);this.destination=copy(position);this.path=[];this.lastPlan=null;this.repath=0;
    this.lastVelocity={x:0,z:0};this.evidenceAge=0;return true;
  }
  trap(seconds=12){this.mode="trapped";this.trapTime=seconds;this.trapContact=0;this.suspicion=0;this.speed=0;this.attackTime=0;}
  hear(position,loudness,kind="sound",source=kind){
    if(passive.has(this.mode)||["lured","attack","recover"].includes(this.mode)||this.grace>0)return;
    const route=acousticRoute(this.pos,position,(a,b)=>!lineClear(a,b,this.rects,.05));
    const audible=loudness*this.rules.hearing*route.gain;
    const strength=audible/(route.distance+1);
    if(route.distance<audible&&(this.mode!=="chase"||this.memory<2)&&(this.clock-this.heardAt>1.4||strength>this.evidenceStrength*1.2)){
      this.heardAt=this.clock;this.evidenceStrength=strength;
      const uncertainty=strength>1.5?0:strength>.7?.75:1.5;
      const heard=uncertainty?{x:Math.round(position.x/uncertainty)*uncertainty,z:Math.round(position.z/uncertainty)*uncertainty}:position;
      this.evidence.observe(kind,heard,this.clock,{confidence:Math.min(.9,.35+strength*.5),uncertainty,source});
      this.lastKnown=copy(heard);this.destination=copy(heard);this.lastHeard=3;this.evidenceAge=0;
      this.lastVelocity={x:0,z:0};this.listenTime=0;if(this.mode!=="chase")this.mode="investigate";this.repath=0;
      this.listenHeading=Math.atan2(heard.x-this.pos.x,heard.z-this.pos.z);
      this.soundTurn=this.rules.id==='easy'?.55:.3;
    }
  }
  hearBolt(position){
    this.boltHabits ||= [];
    let habit=this.boltHabits.find(p=>distance(p,position)<5);
    if(!habit){habit={x:position.x,z:position.z,uses:0};this.boltHabits.push(habit);if(this.boltHabits.length>3)this.boltHabits.shift();}
    habit.uses=Math.min(3,habit.uses+1);
    // Habituation belongs to this area. It never overrides a fresh visual chase.
    this.hear(position,28*Math.pow(this.rules.lureRetention,habit.uses-1),'sound','bolt:'+Math.round(position.x/5)+':'+Math.round(position.z/5));
    if(habit.uses>=3&&['investigate','stalk'].includes(this.mode)&&this.lastKnown&&distance(this.lastKnown,position)<2){
      const cover=this.coverPoints().filter(p=>distance(p,position)<7).sort((a,b)=>distance(a,this.pos)-distance(b,this.pos))[0];
      if(cover){this.destination=copy(cover);this.boltCheckUntil=this.clock+6;this.mover.invalidate();} // Plausible cover, never hidden coordinates.
      this.listenTime=.5;
    }
  }
  canSee(player){
    if(player.hiding||player.vehicle)return false;
    const dx=player.pos.x-this.pos.x,dz=player.pos.z-this.pos.z,d=Math.hypot(dx,dz);
    const visibility=player.flashlight?1:player.visibility??.78;
    if(d>(player.crouched?this.rules.crouchVision:this.rules.standingVision)*visibility)return false;
    const dot=d?(Math.sin(this.yaw)*dx+Math.cos(this.yaw)*dz)/d:1;
    if(d>=2.2&&dot<(["chase","attack"].includes(this.mode)?-.1:.5))return false;
    const height=player.height??(player.crouched?1.16:1.68),eye={...this.pos,y:1.85};
    // Low vehicles can hide a crouched body while a standing head remains visible.
    return [height,height*.68].some(y=>sightClear(eye,{...player.pos,y},this.rects));
  }
  visibleBeam(player){
    if(!player.flashlight||player.hiding||player.vehicle||!Number.isFinite(player.yaw))return null;
    const eye={...player.pos,y:player.height??1.68},c=Math.cos(player.pitch||0);
    let patch=null;
    for(let d=1;d<=7;d+=1){
      const p={x:eye.x+Math.sin(player.yaw)*d*c,y:eye.y-Math.sin(player.pitch||0)*d,z:eye.z+Math.cos(player.yaw)*d*c};
      if(p.y<.05||!sightClear(eye,p,this.rects))break;patch=p;
    }
    if(!patch||distance(this.pos,patch)>this.rules.standingVision*.65)return null;
    const dx=patch.x-this.pos.x,dz=patch.z-this.pos.z,d=Math.hypot(dx,dz);
    if(d>1&&(Math.sin(this.yaw)*dx+Math.cos(this.yaw)*dz)/d<.35)return null;
    return sightClear({...this.pos,y:1.85},patch,this.rects)?copy(patch):null;
  }
  observeHide(spot,seen){
    if(!seen&&this.rules.id!=="easy"&&!passive.has(this.mode)&&this.grace<=0){
      const audible=distance(this.pos,spot.entry)<7*this.rules.hearing&&lineClear(this.pos,spot.entry,this.rects,.05);
      if(audible){
        this.evidence.observe('door',spot.entry,this.clock,{confidence:.85,source:`door:${spot.id}`});
        if(this.evidence.lockerCase(spot,this.clock)){
          this.inspectSpot=spot;this.inspectTime=0;this.destination=copy(spot.inspectEntry||spot.entry);
          this.mode='inspect';this.searchTime=Math.max(this.searchTime,this.rules.inspection+distance(this.pos,spot.entry)/this.rules.investigate+3);this.inspectionAuthorized=true;this.mover.invalidate();
        }
      }
    }
    if(seen&&this.grace<=0&&!passive.has(this.mode)){
      this.inspectionAuthorized=true;this.witness=spot.id;this.inspectSpot=spot;this.inspectTime=0;this.lastKnown=copy(spot.entry);
      this.destination=copy(spot.inspectEntry||spot.entry);this.mode="inspect";this.path=[];this.lastPlan=null;this.mover.invalidate();
    }
  }
  observeTracks(tracks){
    if(this.rules.id==='easy'||passive.has(this.mode)||this.clock<this.lastTrack)return;
    this.lastTrack=this.clock+.3;
    for(const trace of tracks||[]){
      if(trace.age>8||trace.creature||distance(this.pos,trace)>5)continue;
      const dx=trace.x-this.pos.x,dz=trace.z-this.pos.z;
      if(dx*Math.sin(this.yaw)+dz*Math.cos(this.yaw)<0)continue;
      if(sightClear({...this.pos,y:1.8},{x:trace.x,y:.025,z:trace.z},this.rects))
        this.evidence.observe('track',trace,this.clock,{confidence:.55,source:`track:${trace.serial}`});
    }
  }
  diagnostics(){return {mode:this.mode,reason:this.policy.reason,evidence:this.evidence.report(this.clock),recoveries:this.mover.recoveries,planning:this.mover.planningReport?.()};}
  coverPoints(){
    if(this.coverCount===this.rects.length)return this.coverCache;
    const points=[];
    for(const r of this.rects){
      if(r.dynamic||!/car|sedan|van|suv|hatchback|covered|equipment|machine|column|pillar/.test(r.name||""))continue;
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const p={x:r.x+sx*(r.w/2+.7),z:r.z+sz*(r.d/2+.7)};
        if(!blocked(p.x,p.z,this.rects,.34))points.push({...p,lookAt:{x:r.x,z:r.z},low:(r.h||1.3)<1.8,id:`cover:${r.x}:${r.z}:${sx}:${sz}`});
      }
    }
    this.coverCount=this.rects.length;this.coverCache=points.slice(0,64);return this.coverCache;
  }
  beginSearch(){
    this.searchAction=null;this.mode="search";this.searchTime=this.rules.search;this.searchIndex=0;this.inspectSpot=null;
    const origin=this.evidence.best(this.clock)?.score>.25?this.evidence.best(this.clock):this.lastKnown||this.pos;this.destination=copy(origin);this.path=[];this.lastPlan=null;
    for(const [key,time] of this.cleared)if(this.clock-time>45)this.cleared.delete(key);
    const options=[];
    for(const spot of this.spots){
      const d=distance(origin,spot.entry);
      if(this.rules.checkRadius>0&&d<this.rules.checkRadius&&!this.cleared.has(spot.id))options.push({id:spot.id,...(spot.inspectEntry||spot.entry),spot,score:d-2-(this.evidence.lockerCase(spot,this.clock)?5:0)});
    }
    for(const p of [...this.coverPoints(),...JUNCTIONS.map((p,i)=>({...p,id:"junction:"+i}))]){
      const d=distance(origin,p);if(d<1||d>this.rules.searchRadius||this.cleared.has(p.id))continue;
      const ahead=((p.x-origin.x)*this.lastVelocity.x+(p.z-origin.z)*this.lastVelocity.z)/(d||1);
      options.push({...p,score:d-Math.max(0,ahead)*.8});
    }
    // Unit-test/open spaces still get a bounded geometric sweep; real rooms use
    // authored cover and doorway candidates before these fallback positions.
    for(const [i,o] of [[2,1],[-1,3],[-3,-1],[1,-3]].entries()){
      const p={x:origin.x+o[0],z:origin.z+o[1]},id=`sweep:${Math.round(p.x)}:${Math.round(p.z)}`;
      if(!blocked(p.x,p.z,this.rects,.34)&&!this.cleared.has(id))options.push({...p,id,score:5+i});
    }
    if(this.routes){
      const costs=this.routes.costsFrom(this.pos);
      for(const p of options){const length=this.routes.distance(this.pos,p,costs);p.score=Number.isFinite(length)?p.score+length*.25:Infinity;}
    }
    options.sort((a,b)=>a.score-b.score);this.searchPlan=options.filter(p=>Number.isFinite(p.score)).slice(0,this.rules.searchChecks);
    this.inspectSpot=this.searchPlan.find(p=>p.spot)?.spot||null;
  }
  nextSearchPoint(){
    const next=this.searchPlan.shift();
    if(!next){this.mode="listen";this.listenTime=1.15;this.afterListen="patrol";this.destination=null;return;}
    this.searchTarget=next;this.destination=copy(next);this.path=[];this.lastPlan=null;this.inspectTime=0;
    this.inspectionAuthorized=!!(next.spot&&this.rules.id!=="easy"&&this.evidence.lockerCase(next.spot,this.clock));this.inspectSpot=next.spot||null;this.mode=next.spot?"inspect":"search";this.searchIndex++;
  }
  prediction(){
    if(!this.lastKnown)return null;
    if(this.evidenceAge>this.rules.predictTime)return copy(this.lastKnown);
    // Cache failed predictions too: a blocked guess must not run graph searches
    // on every animation frame. Fresh visual evidence invalidates this cache.
    if(this.clock-this.predictionAt<.85)return copy(this.predictionGoal||this.lastKnown);
    this.predictionAt=this.clock;
    const intercept=this.routes?.intercept(this.lastKnown,this.lastVelocity,this.pos,this.rules);
    if(intercept){this.predictionGoal=intercept;return copy(intercept);}
    const v=this.lastVelocity,len=Math.hypot(v.x,v.z);
    this.predictionGoal=copy(this.lastKnown);
    if(len<.4)return copy(this.predictionGoal);
    const ahead={x:this.lastKnown.x+v.x/len*this.rules.predictDistance,z:this.lastKnown.z+v.z/len*this.rules.predictDistance};
    const choices=[ahead,...JUNCTIONS.filter(p=>distance(p,ahead)<2.8)];
    for(const p of choices)if(!blocked(p.x,p.z,this.rects,.34)&&lineClear(this.lastKnown,p,this.rects,.34)){this.predictionGoal=copy(p);break;}
    return copy(this.predictionGoal);
  }
  choosePatrol(){
    this.patrolSeed=(Math.imul(this.patrolSeed,1664525)+1013904223)>>>0;
    const variation=this.patrolSeed/4294967296;
    const scored=PATROL.map((p,i)=>({p,i,score:(this.clock-(this.patrolVisits.get(i)??-20))*1.2-distance(this.pos,p)*.32+Math.sin(i*2.399+variation*6.28)*7}));
    scored.sort((a,b)=>b.score-a.score);const pick=scored.find(x=>distance(x.p,this.pos)>3)||scored[0];
    this.patrolVisits.set(pick.i,this.clock);this.patrolIndex++;this.destination=copy(pick.p);this.path=[];this.lastPlan=null;
  }
  attentionPoint(){
    // Derived only from evidence already earned by perception. Hidden players
    // never supply a fresh position to this visual response.
    if(this.mode==="inspect")return this.inspectSpot?.inspectEntry||this.destination;
    if(["listen","investigate","watch","stalk","chase","alert"].includes(this.mode))return this.lastKnown;
    if(this.mode==="search")return this.searchAction?.lookAt||this.destination;
    return null;
  }
  moveToward(goal,speed,dt){
    if(!goal)return;
    // Acceleration is simulation-driven, so animation speed matches real travel.
    if(this.clock-(this.lastMoveAt??-1) > dt*1.5 || this.mover.turnAction)this.movingSpeed=0;
    this.lastMoveAt=this.clock;
    this.movingSpeed+=Math.max(-6*dt,Math.min(3.8*dt,speed-this.movingSpeed));
    const result=this.mover.step(this.pos,this.yaw,goal,this.movingSpeed,dt,this.clock,this.mode);
    const turn=Math.atan2(Math.sin(result.yaw-this.yaw),Math.cos(result.yaw-this.yaw));
    const lean=this.mode==='chase'?Math.max(-.17,Math.min(.17,-turn/Math.max(.001,dt)*result.speed*.025)):0;
    this.bodyLean+=(lean-this.bodyLean)*(1-Math.exp(-dt*8));
    if(result.speed<.001)this.movingSpeed=0;
    this.yaw=result.yaw;this.speed=result.speed;this.stepDistance+=result.speed*dt;
    this.path=this.mover.path;this.motionPose=result.pose;this.motionPhase=result.phase;
    this.stuck=result.failed?2:0;
    this.escapeAttempts=this.mover.failures;
  }
  beginAttack(player){
    this.mode="attack";this.attackTime=0;this.attackHit=false;this.attackSerial++;
    const dx=player.pos.x-this.pos.x,dz=player.pos.z-this.pos.z,d=Math.hypot(dx,dz)||1;
    this.attackDirection={x:dx/d,z:dz/d};this.yaw=Math.atan2(dx,dz);this.destination=null;
  }
  tickAttack(dt,player){
    const before=this.attackTime;this.attackTime+=dt;
    const wind=this.rules.attackWindup,lunge=.24;
    if(this.attackTime>=wind&&before<wind+lunge){
      const moving=Math.max(0,Math.min(this.attackTime,wind+lunge)-Math.max(before,wind));
      moveCircle(this.pos,this.attackDirection.x*moving*2.7,this.attackDirection.z*moving*2.7,this.rects,AGENT_RADIUS);
      const dx=player.pos.x-this.pos.x,dz=player.pos.z-this.pos.z,d=Math.hypot(dx,dz),dot=d?(dx*this.attackDirection.x+dz*this.attackDirection.z)/d:1;
      if(!this.attackHit&&!player.hiding&&!player.vehicle&&d<1.08&&dot>.35&&sightClear({...this.pos,y:1.3},{...player.pos,y:player.height??1.6},this.rects)){
        this.attackHit=true;return {caught:true,distance:d,animation:"Attack",phase:.5};
      }
    }
    const phase=this.attackTime<wind?.46*this.attackTime/wind:.46+.1*Math.min(1,(this.attackTime-wind)/lunge);
    if(this.attackTime>=wind+lunge){this.mode="recover";this.recoveryTime=this.rules.attackRecovery;return {caught:false,attackMissed:!this.attackHit,animation:"Recover",phase:0};}
    return {caught:false,distance:distance(this.pos,player.pos),animation:"Attack",phase,attacking:true};
  }
  tick(dt,player){
    const previousSpeed=this.speed;this.runStart=Math.max(0,this.runStart-dt);this.brakeTime=Math.max(0,this.brakeTime-dt);
    this.clock+=dt;this.evidenceStrength=Math.max(0,this.evidenceStrength-dt*.4);this.speed=0;this.lastHeard=Math.max(0,this.lastHeard-dt);this.evidenceAge+=dt;
    this.motionPose=null;this.motionPhase=null;this.navigationCooldown=Math.max(0,this.navigationCooldown-dt);
    const base={caught:false,step:false,visible:false,distance:distance(this.pos,player.pos)};
    if(["dormant","waiting"].includes(this.mode))return base;
    if(this.mode==="reveal"){
      const goal=this.revealRoute[this.revealIndex];if(!goal){this.mode="waiting";return base;}
      const d=distance(goal,this.pos);
      if(d<.2){if(this.revealIndex===1&&this.revealPause<.8){this.revealPause+=dt;return {...base,revealed:true};}this.revealIndex++;}
      else this.moveToward(goal,1.8,dt);
      return {...base,revealed:this.revealIndex===1};
    }
    if(this.mode==="staged"){
      if(!this.scriptArrived){
        if(distance(this.pos,this.destination)<.08){
          if(this.scriptRoute.length){this.destination=this.scriptRoute.shift();this.path=[];this.lastPlan=null;}
          else this.scriptArrived=true;
        }else this.moveToward(this.destination,2.5,dt);
      }
      return {...base,animation:this.scriptArrived?this.scriptPose:this.motionPose|| (this.speed>2.3?"Run":"Walk"),phase:this.scriptArrived?null:this.motionPhase,staged:true,arrived:this.scriptArrived};
    }
    if(this.mode==="trapped"){
      this.trapTime=Math.max(0,this.trapTime-dt);
      const contact={x:-18.05,z:75.8},arrived=distance(this.pos,contact)<.1;
      const before=this.trapContact||0;
      if(!arrived)this.moveToward(contact,1.7,dt);else{this.yaw=dampAngle(this.yaw,Math.PI/2,8,dt);this.trapContact=before+dt;}
      if(!this.trapTime){this.mode="patrol";this.destination=null;}
      return {...base,escapingTrap:this.trapTime<3,trapContactCue:arrived&&before<.63&&this.trapContact>=.63,animation:arrived?"DoorPush":this.motionPose||"Walk",phase:arrived?Math.min(.68,this.trapContact/1.8):this.motionPhase};
    }
    if(this.grace>0){this.grace=Math.max(0,this.grace-dt);return {...base,animation:"Listen"};}
    if(this.mode==="attack")return this.tickAttack(dt,player);
    if(this.mode==="recover"){
      this.recoveryTime=Math.max(0,this.recoveryTime-dt);const phase=1-this.recoveryTime/this.rules.attackRecovery;
      if(!this.recoveryTime){this.mode="chase";this.destination=this.lastKnown&&copy(this.lastKnown);this.senseClock=0;}
      return {...base,animation:"Recover",phase};
    }
    this.senseClock-=dt;
    if(this.senseClock<=0){
      this.senseClock=.1;this.seesPlayer=this.canSee(player);
      if(this.seesPlayer){
        if(this.lastSeen&&this.clock-this.lastSeen.time<.3){
          const elapsed=Math.max(.05,this.clock-this.lastSeen.time),dx=(player.pos.x-this.lastSeen.x)/elapsed,dz=(player.pos.z-this.lastSeen.z)/elapsed,m=Math.max(1,Math.hypot(dx,dz)/5);
          this.lastVelocity={x:dx/m,z:dz/m};
        }
        this.predictionAt=-Infinity;
        this.evidence.observe('sight',player.pos,this.clock,{confidence:1,source:'player-sight'});
        this.lastKnown=copy(player.pos);this.lastSeen={...this.lastKnown,time:this.clock};this.memory=this.rules.memory;this.evidenceAge=0;
        this.loops.observe(this.lastKnown,this.clock,this.rules,this.pos);this.lostCorner=false;
      }else if(!["chase","alert","lured","inspect"].includes(this.mode)){
        const beam=this.visibleBeam(player);
        if(beam){this.evidence.observe('beam',beam,this.clock,{confidence:.45});this.lastKnown=beam;this.destination=copy(beam);this.mode="investigate";this.evidenceAge=0;}
      }
    }
    const visible=this.seesPlayer&&!player.hiding&&!player.vehicle;
    if(this.clock>=this.decisionAt){
      this.decisionAt=this.clock+.25;this.evidence.prune(this.clock);
      const decision=this.policy.choose(this.evidence,this.clock,{visible,suspicion:this.suspicion,origin:this.pos});
      if(decision&&['patrol','investigate','stalk'].includes(this.mode)&&!visible&&this.clock>=(this.boltCheckUntil||0)){
        this.mode=decision.behavior==='stalk'?'stalk':'investigate';this.destination=copy(decision.goal);
      }
    }
    if(this.mode==="lured"){this.lureTime-=dt;if(this.lureTime<=0)this.beginSearch();}
    if(visible&&this.navigationCooldown<=0){
      this.suspicion=Math.min(1,this.suspicion+dt*this.rules.awareness*(player.crouched?.85:1.6)*(player.flashlight?1.15:1));
      if(this.mode!=="lured"||this.suspicion>=1){
        if(this.suspicion>=1&&this.mode!=='chase')this.runStart=.6;
        this.mode=this.suspicion>=1?"chase":this.suspicion<.55&&base.distance>6?"stalk":"alert";this.destination=this.mode==='chase'?(this.loops.goal(this.clock)||copy(this.lastKnown)):copy(this.lastKnown);
        this.searchAction=null;this.inspectionAuthorized=false;this.inspectSpot=null;this.witness=null;this.inspectTime=0;
      }
    }else{
      this.memory=Math.max(0,this.memory-dt);this.suspicion=Math.max(0,this.suspicion-dt*.14);
      if(["chase","alert","stalk"].includes(this.mode)&&(this.mode!=="stalk"||this.memory>0)){
        if(this.memory===0)this.beginSearch();else{
          // First reach the last witnessed corner, then listen. A committed
          // observed-loop cutoff may finish, but never tracks hidden position.
          this.destination=this.loops.goal(this.clock)||(!this.lostCorner?copy(this.lastKnown):this.prediction());
          if(!this.lostCorner&&distance(this.pos,this.lastKnown)<.65){this.lostCorner=true;this.mode='listen';this.listenTime=this.rules.listen;this.afterListen='search';this.listenHeading=Math.atan2(this.lastVelocity.x,this.lastVelocity.z);}
          if(this.rules.intercept&&this.evidenceAge>1&&this.evidenceAge<3&&this.clock>this.watchCooldown&&this.predictionGoal&&distance(this.pos,this.predictionGoal)<1.2&&Math.hypot(this.lastVelocity.x,this.lastVelocity.z)>1){
            this.mode='watch';this.watchUntil=this.clock+(this.rules.id==='hard'?4:2.5);this.watchCooldown=this.clock+25;
          }
        }
      }
    }
    if(this.mode==="chase"&&base.distance<1.8&&this.canSee(player)){
      this.beginAttack(player);return {...base,attackStarted:true,animation:"Attack",phase:0};
    }
    if(this.mode==='watch'){
      this.yaw=dampAngle(this.yaw,Math.atan2(this.lastKnown.x-this.pos.x,this.lastKnown.z-this.pos.z),3,dt);
      if(this.clock>=this.watchUntil)this.beginSearch();
      return {...base,animation:'Listen',listening:true};
    }
    if(this.searchAction&&!visible){
      const action=this.searchAction;action.time+=dt;
      if(action.lookAt)this.yaw=dampAngle(this.yaw,Math.atan2(action.lookAt.x-this.pos.x,action.lookAt.z-this.pos.z),4,dt);
      if(action.time>=action.duration){this.searchAction=null;this.nextSearchPoint();}
      return {...base,animation:action.clip,phase:Math.min(1,action.time/action.duration)};
    }
    if(this.mode==="listen"){
      this.listenTime-=dt;
      this.yaw=this.listenHeading===null?this.yaw+dt*.24:dampAngle(this.yaw,this.listenHeading,3,dt);
      if(this.listenTime<=0){if(this.afterListen==="patrol"){this.mode="patrol";this.destination=null;}else this.beginSearch();}
      return {...base,animation:this.brakeTime?'Brake':"Listen",phase:this.brakeTime?1-this.brakeTime/.8:null,listening:true};
    }
    if(["search","inspect"].includes(this.mode)&&!this.witness){
      this.searchTime-=dt;if(this.searchTime<=0){this.mode="patrol";this.destination=null;this.inspectSpot=null;}
    }
    if(!visible&&this.soundTurn>0&&['investigate','stalk'].includes(this.mode)){
      this.soundTurn=Math.max(0,this.soundTurn-dt);this.yaw=dampAngle(this.yaw,this.listenHeading??this.yaw,9,dt);
      return {...base,animation:'Listen',listening:true};
    }
    if(this.mode==='patrol'&&this.patrolPause>0){this.patrolPause-=dt;return {...base,animation:'Listen'};}
    if(this.mode==="patrol"&&!this.destination)this.choosePatrol();
    let inspected=false;
    if(this.destination){
      const endpoint=this.mover.goal&&this.mover.planned&&distance(this.mover.planned,this.destination)<.85?this.mover.goal:this.destination;
      if(distance(this.pos,endpoint)<(this.mode==='inspect'?.08:.5)){
        if(previousSpeed>1.5)this.brakeTime=.8;
        if(this.mode==="patrol"){this.destination=null;this.patrolPause=.35+(this.patrolSeed%600)/1000;}
        else if(["investigate","stalk"].includes(this.mode)){this.mode="listen";this.listenTime=this.rules.listen;this.afterListen="search";}
        else if(this.mode==="search"){
          if(this.searchTarget)this.cleared.set(this.searchTarget.id,this.clock);
          const cover=this.searchTarget?.id?.startsWith('cover:');
          this.searchAction={clip:cover&&this.searchTarget.low?'CrouchSearch':this.searchIndex%2?'PeekLeft':'PeekRight',lookAt:this.searchTarget?.lookAt,time:0,duration:cover?2.1:1.25};
        }else if(this.mode==="inspect"){
          this.yaw=dampAngle(this.yaw,this.inspectSpot?.yaw??Math.PI,8,dt);
          this.inspectTime+=dt;
          if(this.inspectTime>=this.rules.inspection){
            // A witnessed entry or corroborated door/visible evidence authorizes
            // this inspection. A blind guess remains a near discovery; the
            // hidden occupant is consulted only after physically reaching it.
            inspected=player.hiding?.id===this.inspectSpot?.id&&(this.witness===this.inspectSpot?.id||this.inspectionAuthorized);
            if(!inspected){if(this.inspectSpot)this.cleared.set(this.inspectSpot.id,this.clock);this.witness=null;this.inspectSpot=null;this.nextSearchPoint();}
          }
        }
      }else{
        const speed=(this.mode==="chase"?this.rules.chase:this.mode==="lured"?this.rules.lure:this.mode==="alert"?1.9:this.mode==="stalk"?.9:this.rules.investigate)*(this.pressure?1.04:1);
        this.moveToward(this.destination,speed,dt);
        if(this.stuck>1.5&&["search","inspect","patrol","investigate","stalk","chase","alert"].includes(this.mode)){
          if(this.mode==="patrol")this.destination=null;
          else if(["chase","alert","investigate","stalk"].includes(this.mode)){
            // Replan from the actual position; repeated failures become a finite
            // evidence-based search, never a teleport through the obstruction.
            this.path=[];this.lastPlan=null;this.repath=0;this.predictionGoal=null;this.predictionAt=-Infinity;
            this.beginSearch();this.nextSearchPoint();this.navigationCooldown=2.5;
          }else this.nextSearchPoint();this.stuck=0;this.mover.failures=0;this.mover.invalidate();
        }
      }
    }
    let step=false;if(this.stepDistance>(this.mode==="chase"?1.2:.88)){this.stepDistance=0;step=true;}
    const inspecting=this.mode==="inspect"&&this.inspectTime>0;
    const animation=inspecting?'InspectClose':this.motionPose||(this.mode==='stalk'&&this.speed>.1?'Stalk':this.runStart>0?'StartRun':this.speed>2.3?'Run':this.speed>.1?'Walk':this.brakeTime?'Brake':this.mode==='search'?'Search':'Idle');
    const phase=inspecting?Math.min(1,this.inspectTime/this.rules.inspection):this.motionPose?this.motionPhase:animation==='StartRun'?1-this.runStart/.6:this.brakeTime&&this.speed<.1?1-this.brakeTime/.8:null;
    return {caught:inspected,step,visible,distance:distance(this.pos,player.pos),inspecting,
      animation,phase};
  }
}
