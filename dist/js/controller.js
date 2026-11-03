/** Standard-mapped pads only. Disabled controls never touch the browser API:
 * hosts may deny getGamepads() with SecurityError, even when no pad is attached. */
export function stick(x=0,y=0,deadzone=.18,curve=1.5){
  if(!Number.isFinite(x)||!Number.isFinite(y))return {x:0,y:0};
  const length=Math.hypot(x,y);if(length<=deadzone)return {x:0,y:0};
  const gain=Math.pow(Math.min(1,(length-deadzone)/(1-deadzone)),curve)/length;
  return {x:x*gain,y:y*gain};
}
export class ControllerInput {
  constructor(){this.index=null;this.previous=[];this.connected=false;this.armed=false;this.blocked=false;this.error=null;this.available=false;this.enabled=false;
    this.idle={disconnected:false,move:{x:0,y:0},look:{x:0,y:0},pressed:[],held:[]};}
  clear(){this.armed=false;}
  retry(){this.blocked=false;this.error=null;this.clear();}
  neutral(){const disconnected=this.connected;this.index=null;this.connected=false;this.previous.length=0;this.armed=false;this.idle.disconnected=disconnected;return this.idle;}
  poll(settings,pads){
    if(!settings.controllerEnabled){this.enabled=false;return this.neutral();}
    if(!this.enabled){this.enabled=true;this.retry();}
    if(this.blocked)return this.neutral();
    try {
      // Evaluate lazily inside try, not in a default argument outside it.
      if(pads===undefined)pads=globalThis.navigator?.getGamepads?.()||[];
      let pad=null;
      for(const p of pads)if(p?.connected&&p.mapping==='standard'&&(this.index===null||p.index===this.index)){pad=p;break;}
      if(!pad)return this.neutral();
      this.index=pad.index;this.connected=true;this.available=true;
      const held=Array.from(pad.buttons,b=>!!b?.pressed),pressed=[];
      for(let i=0;i<held.length;i++)if(held[i]&&!this.previous[i]&&this.armed)pressed.push(i);
      if(!held.some(Boolean))this.armed=true;this.previous=held;
      return {disconnected:false,move:stick(pad.axes[0],pad.axes[1],settings.controllerDeadzone,1),look:stick(pad.axes[2],pad.axes[3],settings.controllerDeadzone,settings.controllerCurve),pressed,held};
    } catch(error) {
      // Fail only this optional input source. No retry storm on later frames.
      this.blocked=true;this.error=String(error?.name||'ControllerUnavailable')+': '+String(error?.message||'Controller access unavailable').slice(0,180);
      return this.neutral();
    }
  }
}
