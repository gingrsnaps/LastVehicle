/** Gameplay-only telemetry. A fixed ring avoids shift()/allocations per frame.
 * 1% low = 1000 / mean of the slowest 1% of sampled frame intervals. It is a
 * rolling diagnostic, not a promise about another computer's performance. */
export class FrameStats {
  constructor(capacity = 6000) {
    this.times = new Float64Array(capacity);
    this.stamps = new Float64Array(capacity);
    this.reset();
  }
  reset() { this.head = 0; this.count = 0; this.clock = 0; }
  push(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.clock += ms;
    this.times[this.head] = ms; this.stamps[this.head] = this.clock;
    this.head = (this.head + 1) % this.times.length;
    this.count = Math.min(this.count + 1, this.times.length);
  }
  samples(windowMs = 30000) {
    const out = [];
    for (let n = this.count - 1; n >= 0; n--) {
      const i = (this.head - 1 - n + this.times.length) % this.times.length;
      if (this.clock - this.stamps[i] < windowMs) out.push(this.times[i]);
    }
    return out;
  }
  summary() {
    const samples = this.samples(), recent = this.samples(1000);
    const sorted = [...samples].sort((a, b) => b - a);
    const slow = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * .01)));
    const mean = values => values.reduce((sum, n) => sum + n, 0) / (values.length || 1);
    const frameMs = mean(recent);
    return { count: samples.length, fps: frameMs ? 1000 / frameMs : 0,
      frameMs, low1: slow.length ? 1000 / mean(slow) : 0,
      p95: sorted.length ? sorted[Math.floor((sorted.length - 1) * .05)] : 0,
      worst: sorted[0] || 0, over100: samples.filter(n => n > 100).length,
      seconds: Math.min(30, this.clock / 1000), graph: samples.slice(-120) };
  }
}

/** Conservative GPU-driven resolution scaling. Without a valid GPU timer it
 * stays at the user's chosen scale: CPU stalls should not blur the picture.
 * Three seconds of sustained load are required; recovery is deliberately slower. */
export class AdaptiveScale {
  constructor() { this.reset(); }
  reset() { this.factor = 1; this.heavy = 0; this.light = 0; this.gpuAvailable = false; }
  tick(dt, gpuMs, cpuMs, targetMs, floor = .65) {
    this.gpuAvailable = Number.isFinite(gpuMs) && gpuMs > 0;
    if (!this.gpuAvailable) { this.heavy = this.light = 0; return false; }
    const old = this.factor;
    // GPU measurements are asynchronous. Hysteresis avoids reacting to one spike.
    this.heavy = gpuMs > targetMs * .95 && cpuMs < targetMs * .8 ? this.heavy + dt : 0;
    this.light = gpuMs < targetMs * .65 && cpuMs < targetMs * .8 ? this.light + dt : 0;
    if (this.heavy >= 3) { this.factor = Math.max(floor, this.factor - .05); this.heavy = 0; }
    if (this.light >= 6) { this.factor = Math.min(1, this.factor + .025); this.light = 0; }
    this.factor = Math.max(floor, this.factor);
    return Math.abs(this.factor - old) > .0001;
  }
}

/** Preserve the frame-cap phase despite sub-millisecond rAF jitter. A missed
 * deadline skips debt instead of triggering a burst of catch-up renders. */
export function nextFrameDeadline(previous, now, interval) {
  if (!interval) return now;
  const next = previous ? previous + interval : now + interval;
  return next <= now ? now + interval : next;
}

/** Local-only diagnostics. Cheap section totals run every frame; objects are
 * allocated only for slow frames. Export includes at most 40 recent events. */
export class HitchRecorder {
  constructor() { this.events=[]; this.sections={}; this.maxima={}; }
  begin(now) { this.frameStart=this.sectionStart=now; }
  section(name, now=performance.now()) {
    const ms=now-this.sectionStart; this.sectionStart=now;
    this.sections[name]=ms; this.maxima[name]=Math.max(this.maxima[name]||0,ms);
  }
  finish(interval, context, now=performance.now()) {
    const work=now-this.frameStart;
    if(interval>=50 || work>=35) this.record({type:"frame",intervalMs:Math.round(interval*10)/10,workMs:Math.round(work*10)/10,sections:{...this.sections},...context});
  }
  record(event) { this.events.push(event); if(this.events.length>40)this.events.shift(); }
  report() { return {sectionMaximaMs:{...this.maxima},recentEvents:[...this.events]}; }
}

/** Optional guided sample: only real gameplay counts. Recommendations are a
 * graphics draft, never an automatic quality change or a hardware guarantee. */
export class PerformanceSetup {
 constructor(){this.stats=new FrameStats(6000);this.seconds=0;this.rooms=new Set();this.lightSeconds=0;this.travel=0;this.turn=0;this.previous=null;this.done=false;this.cpu=0;this.gpu=0;this.gpuCount=0;this.frames=0;}
 sample(dt,ms,player,room,cpu,gpu){
  if(this.done)return;
  this.seconds+=dt;this.stats.push(ms);this.frames++;this.cpu+=cpu||0;
  if(Number.isFinite(gpu)&&gpu>0){this.gpu+=gpu;this.gpuCount++;}
  this.rooms.add(room);if(player.flashlight)this.lightSeconds+=dt;
  if(this.previous){this.travel+=Math.hypot(player.pos.x-this.previous.x,player.pos.z-this.previous.z);this.turn+=Math.abs(Math.atan2(Math.sin(player.yaw-this.previous.yaw),Math.cos(player.yaw-this.previous.yaw)));}
  this.previous={...player.pos,yaw:player.yaw};
  this.done=this.seconds>=30&&this.rooms.size>=2&&this.lightSeconds>=6&&this.travel>=25&&this.turn>=Math.PI;
 }
 report(settings){
  const stats=this.stats.summary(),budget=1000/(settings.fpsCap||60),cpu=this.cpu/Math.max(1,this.frames),gpu=this.gpuCount?this.gpu/this.gpuCount:null;
  const heavy=stats.p95>budget*1.3;
  const patch=heavy?{quality:'low',shadows:'off',glow:false,fxaa:false,...(gpu&&gpu>budget*.9?{scale:Math.max(.65,(settings.scale||1)*.85)}:{})}:{};
  return {complete:this.done,seconds:Math.round(this.seconds),rooms:this.rooms.size,flashlightSeconds:Math.round(this.lightSeconds),metres:Math.round(this.travel),turnDegrees:Math.round(this.turn*180/Math.PI),p95:stats.p95,cpu,gpu,patch,message:!this.done?'More route coverage is needed.':heavy?(gpu&&gpu>budget*.9?'Measured graphics pressure: try the suggested lower graphics draft.':'Slow frames were measured. Try the low graphics draft and repeat the same route; lower resolution alone may not help CPU or loading stalls.'):'This route sample fits the selected frame target. Keep your current choices and repeat the route after a cold load.'};
 }
}

/** Cap render targets before construction and after resize. HTML stays native
 * resolution. The 4K pixel budget also constrains ultrawide/supersampled windows. */
export function renderSizing(width,height,settings,caps={},factor=1){
 const w=Number.isFinite(width)&&width>0?width:1,h=Number.isFinite(height)&&height>0?height:1;
 const maxHeight=settings.resolution==='auto'?Infinity:Number(settings.resolution)||1080;
 const scale=Number.isFinite(settings.scale)?settings.scale:1;
 let ratio=Math.min(1,maxHeight/h)*Math.max(.5,Math.min(1.5,scale))*Math.max(.5,Math.min(1,factor));
 const hardware=Math.max(1,Math.min(caps.maxTextureSize||8192,caps.maxRenderTextureSize||8192));
 ratio=Math.min(ratio,hardware/w,hardware/h,Math.sqrt(8294400/(w*h)));
 return {width:Math.max(1,Math.floor(w*ratio)),height:Math.max(1,Math.floor(h*ratio)),scaling:1/ratio,limited:ratio<Math.min(1,maxHeight/h)*scale*factor-.001};
}
