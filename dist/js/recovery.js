/** Small, local-only diagnostic ring. Never records typed text, key presses or
 * network credentials. Bounded history cannot grow with a long play session. */
export class RecoveryLog {
  constructor(limit=48){this.limit=limit;this.events=[];this.error=null;}
  record(type,detail={}){
    this.events.push({at:new Date().toISOString(),type,...detail});
    if(this.events.length>this.limit)this.events.shift();
  }
  capture(error,context={}){
    this.error={message:String(error?.message??error).slice(0,1200),
      stack:String(error?.stack??"").slice(0,6000),...context};
    this.record("fault",{message:this.error.message});return this.error;
  }
}
