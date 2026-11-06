import { snapshotPosition, setSpatialPosition } from "./spatial-audio.js?v=1.19.0";
import { acousticRoute } from "./acoustics.js?v=1.19.0";
import { segmentHits } from "./navigation.js?v=1.19.0";

/** Local, licensed recordings through a Web Audio mixer. World effects use real
 * 3D emitters; headphones, distance and walls all affect their perceived source. */
export class AudioMixer {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.buses = {};
    this.loops = {};
    this.voices = new Set();
    this.ready = false;
    this.failures = [];
    this.settings = null;
    this.occlusionTimer = 0;
    this.listenerTimer=0; this.listenerPosition={x:0,y:0,z:0};
    this.worldLoops = [];
    this.maxVoices=24;this.decodedBytes=0;
    this.faults=[];this.faultCount=0;this.positionScratch={};
  }
  async unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 6;
        this.limiter.ratio.value = 16;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.18;
        this.limiter.connect(this.master);
        this.range = this.ctx.createDynamicsCompressor();
        this.range.connect(this.limiter);
        this.worldGain = this.ctx.createGain();
        this.worldGain.connect(this.range);
        for (const type of ["music", "ambience", "sfx", "ui"]) {
          const gain = this.ctx.createGain();
          gain.connect(
            type === "music" || type === "ui" ? this.range : this.worldGain,
          );
          this.buses[type] = gain;
        }
        // A deterministic synthetic room impulse is DSP, not another sound asset.
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this.makeImpulse(1.25);
        this.wet = this.ctx.createGain();
        this.wet.gain.value = 0.08;
        this.reverb.connect(this.wet);
        this.wet.connect(this.buses.ambience);
        if (this.settings) this.apply(this.settings);
      }
      await this.ctx.resume();
      if(!this.ready){
        if(!this.loading)this.loading=this.load().finally(()=>{this.loading=null;});
        await this.loading;
      }
      return this.ready;
    } catch (error) {
      console.warn("Audio unavailable", error);
      return false;
    }
  }
  makeImpulse(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds),
      b = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    let seed = 42;
    for (let c = 0; c < 2; c++) {
      const data = b.getChannelData(c);
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] =
          ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / length, 3) * 0.38;
      }
    }
    return b;
  }
  async load() {
    const names = [
      "ambience",
      "music",
      "metal",
      "rattle",
      "footstep",
      "alarm",
      "scare",
      "click",
      "switch",
      "ui-open",
      "drip",
      "service",
      "tension",
      "hatch-impact",
      "door-close",
      "unease", "aftermath", "creature-breath", "creature-attack", "creature-recover", "surge",
    ];
    names.push("door-open","lock-turn","tool-handling","metal-stress","wood-crack","wood-creak","footstep-wet","creature-footstep");
    names.push('water-step-1','water-step-2','water-step-3','water-step-4','water-step-5','panel-scrape','handle-strain','door-strike');
    names.push("concrete-step-1","concrete-step-2","concrete-step-3","debris-step-1","debris-step-2","debris-step-3","grate-step-1","grate-step-2","hinge-creak-1","hinge-creak-2");
    names.push('lv113-motif','lv113-return','lv113-cloth-shift','lv113-cart-wheel','lv113-cart-impact','lv113-pressure-burst','lv113-fan-stop','lv113-exit-rain');
    names.push('lv114-city-night','lv114-entrance-rain','lv114-distant-thunder','lv114-bolt-impact','lv114-electric-cutoff','lv114-player-breath');
    names.push('lv115-roof-rain','lv115-yard-wind','lv115-gravel-step-1','lv115-gravel-step-2','lv115-bolt-metal','lv115-bolt-glass','lv115-bolt-water','lv115-fence-strike','lv115-door-breach','lv115-road-gravel','lv115-engine-idle','lv115-yard-tension');
    this.loadAbort=new AbortController();const signal=this.loadAbort.signal;
    let next=0;
    const worker=async()=>{
      while(next<names.length&&!signal.aborted){
        const name=names[next++];if(this.buffers[name])continue;
        const request=new AbortController(),abort=()=>request.abort();
        signal.addEventListener("abort",abort,{once:true});const timer=setTimeout(abort,7000);
        try {
          // New exploration/aftermath recordings replace their old decoded buffers.
          // Only two decode jobs run together; cold-start peaks stay bounded.
          const file=name==="music"?"confined-ambience":name==="aftermath"?"nobody-aftermath":name;
          const response=await fetch(`assets/audio/${file}.ogg`,{signal:request.signal});
          if(!response.ok)throw Error(response.status);
          const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
          if(!signal.aborted){this.buffers[name]=buffer;this.decodedBytes+=buffer.length*buffer.numberOfChannels*4;}
        }catch(error){if(!signal.aborted){this.failures.push(name);console.warn("Missing sound",name);}}
        finally{clearTimeout(timer);signal.removeEventListener("abort",abort);}
      }
    };
    await Promise.all([worker(),worker()]);this.ready=!signal.aborted;return this.ready;
  }
  cancelPreparation(){this.loadAbort?.abort();}
  apply(settings) {
    this.settings = settings;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Explicit one-channel mixing folds stereo before the output. Switching back
    // to max restores the normal stereo graph without recreating any voices.
    this.master.channelCount=settings.monoAudio?1:2;
    this.master.channelCountMode=settings.monoAudio?'explicit':'max';
    this.master.gain.setTargetAtTime(settings.master, now, 0.05);
    for (const name of ["music", "ambience", "sfx"])
      this.buses[name].gain.setTargetAtTime(settings[name], now, 0.05);
    this.buses.ui.gain.setTargetAtTime(settings.uiVolume ?? settings.sfx * 0.7, now, 0.05);
    for (const voice of this.voices) if (voice.loud) {
      voice.volume = voice.baseVolume * (settings.loudEffects ?? 1);
      this.setVoiceGain(voice,voice.volume*(voice.acousticGain??1),.05);
    }
    const night = settings.dynamicRange === "night";
    this.range.threshold.value = night ? -29 : -12;
    this.range.knee.value = night ? 25 : 10;
    this.range.ratio.value = night ? 5 : 1;
    this.range.attack.value = 0.008;
    this.range.release.value = 0.25;
  }
  play(
    name,
    {
      volume = 1,
      rate = 1,
      pan = 0,
      bus = "sfx",
      loop = false,
      position = null,
      refDistance = 2,
      maxDistance = 45,
      reverb = true,
      priority = 0,
    } = {},
  ) {
    if (!this.ctx || !this.buffers[name]) return null;
    // Snapshot before an item is lifted/disposed. Never follow its mesh fields.
    const point=position===null?null:snapshotPosition(position);
    if(position!==null&&!point){this.reportFault(name,"invalid emitter");return null;}
    if(![volume,rate,pan,refDistance,maxDistance].every(Number.isFinite)||rate<=0||refDistance<=0||maxDistance<refDistance){this.reportFault(name,"invalid sound parameters");return null;}
    let src,gain,filter,panner,send=null,voice=null;
    try {
    if(this.voices.size>=this.maxVoices){
      // A footstep must not immediately evict the bolt impact that explains a
      // distraction. Important one-shots remain inside the same voice ceiling.
      let oldest;
      for(const v of this.voices)if(!v.loop&&(v.priority||0)<=priority&&(!oldest||(v.priority||0)<(oldest.priority||0)))oldest=v;
      if(!oldest)return null;this.releaseVoice(oldest);
    }
    // The separate loud-effects control scales authored stingers and metal/alarm
    // events before spatialization. Night mode additionally compresses the mix.
    const baseVolume = volume, loud = ["scare", "metal", "alarm", "rattle", "hatch-impact", "creature-attack", "surge", "metal-stress", "wood-crack",'door-strike','lv113-cart-impact','lv113-pressure-burst','lv114-distant-thunder','lv114-electric-cutoff','lv115-fence-strike','lv115-door-breach'].includes(name);
    if (loud) volume *= this.settings?.loudEffects ?? 1;
    src = this.ctx.createBufferSource();
    gain = this.ctx.createGain();
    filter = this.ctx.createBiquadFilter();
    src.buffer = this.buffers[name];
    src.loop = loop;
    src.playbackRate.value = rate;
    gain.gain.value = volume;
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    panner = point
      ? this.ctx.createPanner()
      : this.ctx.createStereoPanner();
    if (point) {
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = refDistance;
      panner.maxDistance = maxDistance;
      panner.rolloffFactor = 1.1;
      setSpatialPosition(panner,point,this.ctx.currentTime);
    } else panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(gain);
    gain.connect(filter);
    filter.connect(panner);
    panner.connect(this.buses[bus] || this.buses.sfx);
    if (point && reverb) {
      send = this.ctx.createGain();
      send.gain.value = 0.12;
      panner.connect(send);
      send.connect(this.reverb);
    }
    voice = {
      name,
      src,
      gain,
      panner,
      filter,
      position: point,
      volume, baseVolume, loud,
      bus,
      loop,
      priority,
      send,
    };
    this.voices.add(voice);
    src.onended=()=>this.releaseVoice(voice,false);
    src.start();
    return voice;
    } catch(error) {
      this.reportFault(name,error.message);
      if(voice)this.releaseVoice(voice);
      else {try{src?.stop();}catch{}for(const node of [src,gain,filter,panner,send])try{node?.disconnect();}catch{}}
      return null;
    }
  }
  setVoiceGain(voice,target,tau=.1){
    if(!voice||!Number.isFinite(target)||!this.ctx)return;
    // A stationary listener must not append hundreds of identical automation
    // events per minute. Real fades still run in the audio thread.
    if(Math.abs((voice.gainTarget??Infinity)-target)<.002&&voice.gainTau===tau)return;
    voice.gain.gain.setTargetAtTime(target,this.ctx.currentTime,tau);
    voice.gainTarget=target;voice.gainTau=tau;
  }
  reportFault(name,reason){
    this.faultCount++;
    // Bounded diagnostics, once per unique reason. No console flood per frame.
    if(this.faults.some(f=>f.name===name&&f.reason===reason))return;
    const fault={name,reason:String(reason).slice(0,180)};
    if(this.faults.length===12)this.faults.shift();this.faults.push(fault);
    console.warn("Skipped audio event",fault.name,fault.reason);
  }
  releaseVoice(voice,stop=true){
    if(!this.voices.delete(voice))return;
    if(voice.src)voice.src.onended=null;
    if(stop)try{voice.src.stop();}catch{}
    for(const node of [voice.src,voice.gain,voice.filter,voice.panner,voice.send])try{node?.disconnect();}catch{}
  }
  position(voice, pos) {
    if (!voice?.position) return;
    const point=snapshotPosition(pos,this.positionScratch);
    if(!point){this.reportFault(voice.name,"invalid moving emitter");return;}
    try {
      setSpatialPosition(voice.panner,point,this.ctx.currentTime,true);
      snapshotPosition(point,voice.position);
    }catch(error){this.reportFault(voice.name,error.message);this.releaseVoice(voice);}
  }
  footstep(point,profile,creature=false){
    let name=creature?'creature-footstep':'footstep';
    if(profile.water){
      this.waterBag ||= [];
      if(!this.waterBag.length){
        this.waterBag=[1,2,3,4,5];
        for(let i=4;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.waterBag[i],this.waterBag[j]]=[this.waterBag[j],this.waterBag[i]];}
        if(this.waterBag[4]===this.lastWater)[this.waterBag[0],this.waterBag[4]]=[this.waterBag[4],this.waterBag[0]];
      }
      this.lastWater=this.waterBag.pop();name='water-step-'+this.lastWater;
    }
    if(!profile.water&&!creature){
      const kind=profile.kind||'concrete',count=['grate','gravel'].includes(kind)?2:3;
      this.stepLast ||= {};let n=1+Math.floor(Math.random()*count);if(n===this.stepLast[kind])n=n%count+1;this.stepLast[kind]=n;
      name=profile.wetness>.2?'footstep-wet':kind==='gravel'?`lv115-gravel-step-${n}`:`${kind}-step-${n}`;
    }
    return this.play(name,{volume:profile.volume*(profile.water?1.3:1),rate:profile.rate*(.96+Math.random()*.08),position:creature?point:null,refDistance:3,reverb:creature});
  }
  startAmbience() {
    if (!this.loops.ambience)
      this.loops.ambience = this.play("ambience", {
        bus: "ambience",
        volume: 0.17,
        loop: true,
      });
    if (!this.loops.music)
      this.loops.music = this.play("music", {
        bus: "music",
        volume: 0.23,
        loop: true,
      });
    for(const name of ["service","tension","unease","aftermath"])if(!this.loops[name])this.loops[name]=this.play(name,{bus:name==="service"?"ambience":"music",volume:0,loop:true,reverb:false});
    for(const [key,file,bus] of [['motif','lv113-motif','music'],['returnTheme','lv113-return','music'],['exitRain','lv113-exit-rain','ambience']])if(!this.loops[key])this.loops[key]=this.play(file,{bus,volume:0,loop:true,reverb:false});
    for(const [key,file,bus] of [['city','lv114-city-night','ambience'],['entranceRain','lv114-entrance-rain','ambience'],['breath','lv114-player-breath','sfx']])if(!this.loops[key])this.loops[key]=this.play(file,{bus,volume:0,loop:true,reverb:false});
    for(const [key,file,bus] of [['yardWind','lv115-yard-wind','ambience'],['roofRain','lv115-roof-rain','ambience'],['yardTension','lv115-yard-tension','music']])if(!this.loops[key])this.loops[key]=this.play(file,{bus,volume:0,loop:true,reverb:false});
    this.thunderTimer=65;this.mixDirty=true;
    if (!this.worldLoops.length) {
      this.worldLoops.push(
        this.play("drip", {
          bus: "ambience",
          volume: 0.45,
          position: { x: 20.8, y: 2, z: 101.2 },
          loop: true,
          refDistance: 2.5,
        }),
      );
      this.worldLoops.push(
        this.play("ambience", {
          bus: "ambience",
          volume: 0.23,
          position: { x: 26, y: 2, z: 39 },
          loop: true,
          refDistance: 3,
        }),
      );
      this.worldLoops.push(
        this.play("ambience", {
          bus: "ambience",
          volume: 0.18,
          position: { x: -24, y: 3.5, z: 80 },
          loop: true,
          refDistance: 2,
        }),
      );
    }
  }
  updateListener(player, rects, dt) {
    if (!this.ctx) return;
    const t=this.ctx.currentTime, l=this.ctx.listener, p=this.listenerPosition;
    if(!snapshotPosition({x:player.pos?.x,y:player.height??1.68,z:player.pos?.z},this.positionScratch)||![player.yaw,player.pitch,dt].every(Number.isFinite)){
      this.reportFault("listener","invalid player transform");return;
    }
    snapshotPosition(this.positionScratch,p);
    this.listenerTimer-=dt;
    if(this.listenerTimer<=0) {
      this.listenerTimer=1/30;
      const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw),sp=Math.sin(player.pitch),cp=Math.cos(player.pitch);
      try {
      setSpatialPosition(l,p,t,true);
      if(l.forwardX) {
        l.forwardX.setTargetAtTime(sy*cp,t,.01); l.forwardY.setTargetAtTime(-sp,t,.01); l.forwardZ.setTargetAtTime(cy*cp,t,.01);
        l.upX.setTargetAtTime(sy*sp,t,.01); l.upY.setTargetAtTime(cp,t,.01); l.upZ.setTargetAtTime(cy*sp,t,.01);
      } else l.setOrientation(sy*cp,-sp,cy*cp,sy*sp,cp,cy*sp);
      }catch(error){this.reportFault("listener",error.message);}
      const room=Math.abs(p.x)>17;
      if(room!==this.listenerRoom) {this.listenerRoom=room;this.wet.gain.setTargetAtTime(room ? .06 : .12,t,.4);}
    }
    this.occlusionTimer-=dt;
    if(this.occlusionTimer>0)return;
    this.occlusionTimer=.08;
    // One positional voice per slice. Persistent Set iteration avoids allocating
    // a filtered blocker array or checking every emitter on the same frame.
    this.occlusionIterator ||= this.voices.values();
    let voice;
    for(let n=0;n<=this.voices.size;n++) {
      let entry=this.occlusionIterator.next();
      if(entry.done) {this.occlusionIterator=this.voices.values();entry=this.occlusionIterator.next();}
      if(entry.done)break;
      if(entry.value.position && this.voices.has(entry.value)) {voice=entry.value;break;}
    }
    if(!voice)return;
    try {
    if(!snapshotPosition(voice.position,this.positionScratch))throw new TypeError("invalid stored emitter");
    const route=acousticRoute(p,this.positionScratch,(a,b)=>audioOccluded(a,b,rects));
    voice.occluded=route.kind!=='direct';
    // Do not restart an identical automation ramp at every obstruction slice.
    if(voice.acousticFrequency!==route.frequency){voice.filter.frequency.setTargetAtTime(route.frequency,t,.12);voice.acousticFrequency=route.frequency;}
    if(voice.acousticGain!==route.gain){this.setVoiceGain(voice,voice.volume*route.gain,.12);voice.acousticGain=route.gain;}
    const q=route.point,py=q.y??1;
    if(voice.panX!==q.x||voice.panY!==py||voice.panZ!==q.z){
      setSpatialPosition(voice.panner,q,t,true);voice.panX=q.x;voice.panY=py;voice.panZ=q.z;
    }
    }catch(error){this.reportFault(voice.name,error.message);this.releaseVoice(voice);}
  }

  /** Original procedural engine tone: no recording or additional download.
   * Oscillators feed the existing SFX/master buses, so all volume controls apply. */
  startEngine(){
    if(!this.ctx || this.engineNodes)return;
    let gain,filter;const oscillators=[];
    try{
      gain=this.ctx.createGain();filter=this.ctx.createBiquadFilter();
      filter.type="lowpass";filter.frequency.value=190;gain.gain.value=.055;
      filter.connect(gain);gain.connect(this.buses.sfx);
      for(const harmonic of [1,2,3]){const o=this.ctx.createOscillator();oscillators.push(o);o.type=harmonic===1?"triangle":"sine";o.frequency.value=34*harmonic;o.connect(filter);o.start();}
      this.engineNodes={gain,filter,oscillators};this.engineNext=0;
      this.engineIdle=this.play('lv115-engine-idle',{volume:.24,loop:true,reverb:false});
      this.engineRoad=this.play('lv115-road-gravel',{volume:0,loop:true,reverb:false});
    }catch(error){
      this.reportFault("car engine",error.message);
      for(const o of oscillators)try{o.stop();}catch{}
      for(const n of [...oscillators,gain,filter])try{n?.disconnect();}catch{}
    }
  }

  updateEngine(seconds,speed=0){
    if(!this.engineNodes || seconds<this.engineNext)return;this.engineNext=seconds+.08;
    const rpm=34+Math.min(1,Math.abs(speed)/6.2)*34;
    this.setVoiceGain(this.engineRoad,Math.min(.28,Math.abs(speed)*.045),.2);
    this.engineNodes.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(rpm*(i+1),this.ctx.currentTime,.12));
  }
  stopEngine(){
    if(this.engineIdle)this.releaseVoice(this.engineIdle);if(this.engineRoad)this.releaseVoice(this.engineRoad);this.engineIdle=this.engineRoad=null;
    if(!this.engineNodes)return;
    for(const o of this.engineNodes.oscillators){try{o.stop();o.disconnect();}catch{}}
    this.engineNodes.filter.disconnect();this.engineNodes.gain.disconnect();this.engineNodes=null;
  }
  /** Mix states follow actual AI state; a hidden enemy does not emit fake
   * directional footsteps. All loops were decoded before play. */
  setTension(mode) {
    this.musicMode=mode===true?"chase":mode===false?"patrol":mode;this.mixDirty=true;
  }
  prepareBeat(seconds=1.25){this.duckTimer=seconds;this.mixDirty=true;}
  updateScene(dt,room,mode,player=null,state=null,equipment=null){
    const wasChased=["chase","attack"].includes(this.musicMode);
    if(wasChased&&!["chase","attack","recover"].includes(mode))this.reliefTime=12;
    const relief=this.reliefTime>0;this.reliefTime=Math.max(0,(this.reliefTime||0)-dt);
    if(relief!==(this.reliefTime>0))this.mixDirty=true;
    const wasDucked=this.duckTimer>0;this.duckTimer=Math.max(0,(this.duckTimer||0)-dt);
    if(room!==this.musicRoom||mode!==this.musicMode||wasDucked!==(this.duckTimer>0))this.mixDirty=true;
    this.musicRoom=room;this.musicMode=mode;
    this.storyMixTime=(this.storyMixTime||0)+dt;
    if(player&&state&&this.storyMixTime>=.25){
      this.storyMixTime=0;this.carProximity=Math.max(0,Math.min(1,(18-Math.hypot(player.pos.x-13,player.pos.z-78))/14));
      this.returning=state.flags.includes('gate');this.exitProximity=this.returning?Math.max(0,Math.min(1,(16-player.pos.z)/12)):0;
      this.pressureRelief=(equipment?.reliefTime||0)>0;this.mixDirty=true;
      this.fansStopped=state.scares.includes('powerSurge');
      this.weatherProximity=Math.max(0,Math.min(1,(35-player.pos.z)/30));
      this.breathLevel=player.vehicle?0:Math.max(0,1-(player.stamina??1))*(player.sprinting?1:.55);
    }
    this.thunderTimer=(this.thunderTimer??65)-dt;
    if(this.thunderTimer<=0&&!this.mixPaused&&!(this.duckTimer>0)&&!['chase','attack','recover'].includes(mode)){
      this.play('lv114-distant-thunder',{bus:'ambience',volume:.24,reverb:false});this.thunderTimer=80+Math.random()*35;
    }
    if(this.mixDirty)this.applySceneMix();
  }
  applySceneMix(){
    if(!this.ctx)return;this.mixDirty=false;
    const levels=sceneMix(this.musicRoom||"garage",this.musicMode,this.duckTimer>0,this.mixPaused,this.reliefTime>0);
    const calm=this.mixPaused||this.duckTimer>0||['chase','attack','recover'].includes(this.musicMode)?0:1;
    levels.motif=calm*(this.returning?0:(this.carProximity||0)*.4);
    levels.returnTheme=calm*(this.returning?(this.carProximity||0)*.45:0);
    levels.exitRain=(this.mixPaused?0:1)*(this.exitProximity||0)*.65;
    const outside=['yard','road','gatehouse'].includes(this.musicRoom),sheltered=this.musicRoom==='gatehouse',audible=this.mixPaused?0:this.duckTimer>0?.25:1;
    levels.yardWind=outside?(sheltered?.10:.42)*audible:0;levels.roofRain=outside?(sheltered?.5:.18)*audible:0;
    levels.yardTension=outside?(['chase','attack','recover'].includes(this.musicMode)?.05:.22)*audible:0;
    if(outside){levels.music*=.2;levels.service=0;}
    const weather=this.weatherProximity||0;
    levels.city=this.mixPaused?0:.1+weather*.18;
    levels.entranceRain=this.mixPaused?0:weather*.34*(1-(this.exitProximity||0));
    levels.breath=this.mixPaused?0:(this.breathLevel||0)*.9;
    levels.ambience=outside?0:this.fansStopped?.07:.17;
    for(const [name,level] of Object.entries(levels)){
      const voice=this.loops[name];if(!voice)continue;
      voice.volume=level;this.setVoiceGain(voice,level,this.duckTimer>0?.08:.8);
    }
    const drip=this.worldLoops[0];if(drip){drip.volume=this.pressureRelief?.16:.45;this.setVoiceGain(drip,drip.volume*(drip.acousticGain??1),.8);}
    for(let i=1;i<this.worldLoops.length;i++){const voice=this.worldLoops[i];if(!voice)continue;voice.volume=this.fansStopped?0:i===1?.23:.18;this.setVoiceGain(voice,voice.volume*(voice.acousticGain??1),.5);}
  }
  setPaused(paused) {
    this.mixPaused=paused;this.applySceneMix();
    if (this.ctx)
      this.worldGain.gain.setTargetAtTime(
        paused ? 0.2 : 1,
        this.ctx.currentTime,
        0.15,
      );
  }
  endingFade() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.worldGain.gain.setTargetAtTime(0, t, .45);
    this.loops.music?.gain.gain.setTargetAtTime(.12, t, .65);
    for(const name of ["service","tension","unease","aftermath","motif","returnTheme","exitRain","city","entranceRain","breath","yardWind","roofRain","yardTension"])this.loops[name]?.gain.gain.setTargetAtTime(0,t,.45);
  }
  async soundTest() {
    if (!await this.unlock()) return false;
    this.play("click", { bus: "ui", volume: .4, reverb: false });
    this.play("footstep", { bus: "sfx", volume: .3, reverb: false });
    return true;
  }
  async stereoTest(){
    if(!await this.unlock())return false;
    this.play('click',{bus:'ui',pan:-1,volume:.35,reverb:false});
    const ctx=this.ctx;
    setTimeout(()=>{if(this.ctx===ctx&&ctx.state==='running')this.play('click',{bus:'ui',pan:1,volume:.35,reverb:false});},700);
    return true;
  }
  suspend() {
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }
  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
  }
  stop() {
    this.stopEngine();
    for(const voice of this.voices)this.releaseVoice(voice);
    this.occlusionIterator=null;
    this.loops = {};
    this.worldLoops = [];
  }
}

/** Source geometry containing an emitter must not muffle its own sound. */
export function audioOccluded(listener,source,rects) {
  for(const b of rects) {
    if(b.seeThrough)continue;
    if(Math.abs(source.x-b.x)<b.w/2 && Math.abs(source.z-b.z)<b.d/2)continue;
    if(segmentHits(listener,source,b,.05))return true;
  }
  return false;
}

/** Pure targets make audio transitions testable without claiming an audible QA pass. */
export function sceneMix(room,mode,duck=false,paused=false,relief=false){
  const service=["workshop","electrical","pump","storage"].includes(room);
  const chase=["chase","attack","recover"].includes(mode),search=["search","inspect","investigate","listen","stalk","watch"].includes(mode);
  const gain=(duck?.2:1)*(paused?.35:1);
  return {music:(room==="security"?.045:service?.035:.14)*gain,
    service:(service?.13:.025)*gain,tension:(chase?.27:search?.07:.008)*gain,
    unease:(chase||relief?0:search?.11:service?.065:.025)*gain,aftermath:(relief&&!chase?.12:0)*gain};
}
