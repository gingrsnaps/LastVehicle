import { reachableGoal } from './navigation.js?v=1.19.0';
import { dampAngle } from './animation.js?v=1.19.0';
import { roomAt } from './guidance.js?v=1.19.0';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const CREATURE_SCENES={
  cartPush:{room:'storage',goal:{x:-24,z:42.65},yaw:Math.PI,duration:2.6,impact:.72},
  carReturn:{room:'garage',goal:{x:9,z:67.4},yaw:Math.PI,duration:1.6,impact:.65,retreat:[{x:15,z:67.2},{x:15,z:72}]},
  workshopBreach:{room:'workshop',goal:{x:-15.85,z:76},yaw:-Math.PI/2,duration:1.55,impact:.24},
  powerSurge:{room:'electrical',goal:{x:16.05,z:39},yaw:Math.PI/2,duration:2.7,impact:.85},
  closePass:{room:'storage',goal:{x:-22,z:60},yaw:Math.PI,duration:2.2,impact:.65},
};

/** One real actor owns every encounter. This director walks it to the scene,
 * waits for a readable view, and releases it into ordinary evidence-based AI.
 * Walking away cancels staging. Story progression and player input never wait.
 * Every timer is advanced by the paused gameplay clock. */
export class CreatureScenes {
  constructor(game){this.g=game;this.reset();}
  reset(){this.active=null;this.cooldown=0;this.pose=null;this.waiting=new Map();}
  fallbackReady(id){return (this.waiting.get(id)||0)>=4;}
  cancel(requeue=true){
    const g=this.g,a=this.active;if(!a)return;
    if(a.wheelVoice)g.audio.releaseVoice?.(a.wheelVoice);
    if(a.id==='workshopBreach')g.world.visuals.setGrille(0);
    if(g.threat.mode==='staged')g.threat.releaseStage(a.evidence,1.2);
    if(g.director.active===a.id)g.director.active=null;
    if(requeue&&!g.state.scares.includes(a.id))g.director.request(a.id);
    this.active=null;this.pose=null;this.cooldown=8;
  }
  tick(dt){
    const g=this.g,t=g.threat,p=g.player,d=g.director;this.cooldown=Math.max(0,this.cooldown-dt);
    for(const id of d.queue){const spec=CREATURE_SCENES[id];
      if(spec&&roomAt(p.pos)===spec.room&&!p.hiding&&!p.vehicle&&!g.pendingAction)
        this.waiting.set(id,(this.waiting.get(id)||0)+dt);
    }
    if(typeof t.stageRoute!=='function')return false;
    if(!this.active){
      if(t.doorApproach||this.cooldown||d.quiet>0||d.recovery>0||d.active||p.hiding||p.vehicle||g.pendingAction||['dormant','waiting','reveal','attack','recover','stunned','chase','inspect','trapped','lured'].includes(t.mode))return false;
      const room=roomAt(p.pos);
      let id=d.queue.find(id=>CREATURE_SCENES[id]?.room===room);
      if(!id&&g.state.flags.includes('key')&&!g.state.scares.includes('closePass')&&p.pos.x<-18&&p.pos.z>51&&p.pos.z<68&&dist(t.pos,CREATURE_SCENES.closePass.goal)<14){id='closePass';d.request(id);}
      if(!id&&g.state.flags.includes('gate')&&!g.state.scares.includes('carReturn')&&room==='garage'&&p.pos.z>55&&p.pos.z<82&&dist(p.pos,CREATURE_SCENES.carReturn.goal)>4&&dist(p.pos,CREATURE_SCENES.carReturn.goal)<18&&dist(t.pos,CREATURE_SCENES.carReturn.goal)<20){id='carReturn';d.request(id);}
      if(!id&&g.state.flags.includes('key')&&!g.state.scares.includes('cartPush')&&room==='storage'&&g.world.equipment?.clearCartSweep(p)&&dist(t.pos,CREATURE_SCENES.cartPush.goal)<18){id='cartPush';d.request(id);}
      if(!id)return false;
      if(this.fallbackReady(id)&&!['closePass','carReturn','cartPush'].includes(id))return false;
      const spec=CREATURE_SCENES[id];
      if(dist(p.pos,spec.goal)<2.4||dist(t.pos,spec.goal)>28)return false;
      // Planning is only attempted once per eligibility interval, not every
      // frame while the player stands near an unreachable closed doorway.
      this.cooldown=2;
      const route=reachableGoal(t.pos,spec.goal,g.world.rects);
      if(!route)return false;
      if(spec.retreat){let start=spec.goal;for(const goal of spec.retreat){if(!reachableGoal(start,goal,g.world.rects))return false;start=goal;}}
      this.active={id,spec,time:0,phase:'approach',cue:0,impact:false,evidence:{...(t.lastKnown||spec.goal)}};
      d.queue=d.queue.filter(x=>x!==id);d.active=id;
      t.stageRoute([spec.goal],id==='workshopBreach'?'Brace':'Listen');
      if(id!=='carReturn')g.audio.play(id==='closePass'?'panel-scrape':'handle-strain',{volume:.25,position:{...t.pos,y:1.4},refDistance:4});
    }
    const a=this.active;a.time+=dt;
    if(p.vehicle||p.hiding||dist(p.pos,a.spec.goal)>19||t.mode!=='staged'||(a.phase==='approach'&&a.time>7)){
      this.cancel();return false;
    }
    if(a.phase==='withdraw'){
      this.pose=null;
      if(t.scriptArrived||a.time>8){t.releaseStage(a.evidence,t.rules.id==='easy'?3:2);this.active=null;this.cooldown=45;}
      return true;
    }
    if(a.phase==='approach'){
      if(!t.scriptArrived)return true;
      t.yaw=dampAngle(t.yaw,a.spec.yaw,8,dt);
      a.cue+=dt;
      if(a.cue>3){a.cue=0;g.audio.play('creature-breath',{volume:.3,position:{...t.pos,y:1.7},refDistance:4});}
      if(!g.visualReadable({...t.pos,y:1.5},1.8,18)){if(a.time>7)this.cancel(false);return true;}
      a.phase='beat';a.time=0;g.audio.prepareBeat?.(a.spec.impact+.3);
      if(a.id==='workshopBreach'&&Math.abs(p.pos.x+17)>1.1)g.world.visuals.setGrille(1);
      if(a.id==='powerSurge')g.world.atmosphere.playSurge(()=>{g.audio.play('lv113-fan-stop',{volume:.38,position:{x:23,y:3.73,z:42},refDistance:4});});
    }
    const time=a.time;
    if(a.id==='powerSurge'){
      a.relayStep??=0;
      if(a.relayStep<3&&time>=[.04,.24,.45][a.relayStep]){a.relayStep++;g.audio.play('switch',{volume:.22,position:g.world.atmosphere.surgePosition,refDistance:3});}
    }
    t.yaw=dampAngle(t.yaw,a.spec.yaw,10,dt);
    if(a.id==='workshopBreach'){
      this.pose={clip:'Strike',phase:time<.24?time/.24*.5:.5+Math.min(1,(time-.24)/.8)*.5};
      // Actual palm at phase .5: (-.20,1.44,+1.10), rotated to the grille.
      if(time>.8)g.world.visuals.setGrille(1-smooth((time-.8)/.75));
    }else if(a.id==='cartPush'){
      this.pose={clip:'DoorPush',phase:Math.min(1,time/1.8)};
      if(time>=a.spec.impact){
        const moved=g.world.equipment.moveCart((time-a.spec.impact)/.85,p);
        if(a.wheelVoice&&moved)g.audio.position?.(a.wheelVoice,{x:-24,y:.35,z:g.world.equipment.cart.position.z});
        if(!moved&&time>a.spec.impact+.05&&a.wheelVoice){g.audio.releaseVoice?.(a.wheelVoice);a.wheelVoice=null;}
      }
    }else if(a.id==='powerSurge')this.pose={clip:'InspectClose',phase:.15+.6*smooth(time/a.spec.duration)};
    else this.pose={clip:'Listen',phase:Math.min(1,time/a.spec.duration)};
    if(!a.impact&&time>=a.spec.impact){
      a.impact=true;g.recordEncounter(a.id);
      if(a.id==='cartPush'){
        g.world.equipment.scrape.setEnabled(true);
        a.wheelVoice=g.audio.play('lv113-cart-wheel',{volume:.48,position:{x:-24,y:.35,z:g.world.equipment.cart.position.z},refDistance:4});
        g.audio.play('lv113-cart-impact',{volume:.55,position:{x:-24,y:1.25,z:41.5},refDistance:4});
        g.ui.subtitle('[It shoves the cart across the empty aisle. The wheels screech.]',3);
      }
      if(a.id==='carReturn')g.world.atmosphere.returnScuff.setEnabled(true);
      const source=a.id==='workshopBreach'?{x:-16.95,y:1.44,z:75.8}:{...t.pos,y:1.65};
      if(a.id!=='cartPush')g.audio.play(a.id==='carReturn'?'panel-scrape':a.id==='workshopBreach'?'door-strike':'creature-breath',{volume:a.id==='workshopBreach'?.62:.45,position:source,refDistance:5});
      if(a.id==='workshopBreach')g.world.atmosphere.playHatch(()=>{});
      if(a.id!=='cartPush')g.ui.subtitle(a.id==='carReturn'?'[Metal drags beside the parked car. It watches, then pulls back.]':a.id==='workshopBreach'?'[Its hand hits the grille. The latch starts to lift.]':a.id==='powerSurge'?'[The restored lights reveal it at the doorway.]':'[It stops in the passage. Listening.]',3);
    }
    if(time>=a.spec.duration){
      if(a.spec.retreat){a.phase='withdraw';a.time=0;this.pose=null;t.stageRoute(a.spec.retreat,'Listen');return true;}
      const known=t.canSee(p)?{...p.pos}:a.evidence;
      if(a.id==='workshopBreach')g.world.visuals.setGrille(0);
      t.releaseStage(known,t.rules.id==='easy'?3:t.rules.id==='hard'?1.3:2);
      if(['powerSurge','workshopBreach'].includes(a.id)&&t.pursueIfSeen(p,t.rules.id==='easy'?1.8:.9))g.ui.subtitle('It sees you in the light. Break sight behind solid cover.',3.5);
      this.pose=null;this.active=null;this.cooldown=45;
    }
    return true;
  }
}
