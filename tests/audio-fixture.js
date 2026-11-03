// Strict Web Audio boundary used with the real mixer. This does not emulate
// audible rendering, but rejects exactly the non-finite API input that crashed.
export function strictAudioContext(modern=true) {
  const writes=[],nodes=[];
  const finite=n=>{if(!Number.isFinite(Math.fround(n)))throw new TypeError('PannerNode.setPosition: Argument is not a finite floating-point value');};
  const parameter=()=>({value:0,setValueAtTime(n){finite(n);writes.push(n);},setTargetAtTime(n){finite(n);writes.push(n);}});
  const node=()=>{const n={connect(){},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
  const spatial=()=>{const n=node();if(modern)for(const a of ['X','Y','Z'])n['position'+a]=parameter();else n.setPosition=(...p)=>p.forEach(finite);return n;};
  const listener=spatial();listener.setOrientation=(...p)=>p.forEach(finite);
  return {currentTime:0,state:'running',listener,writes,nodes,resume:async()=>{},suspend:async()=>{},
    createOscillator(){return {...node(),frequency:parameter(),start(){},stop(){}};},
    createBufferSource(){return {...node(),playbackRate:parameter(),start(){},stop(){}};},
    createGain(){return {...node(),gain:parameter()};},
    createBiquadFilter(){return {...node(),frequency:parameter()};},
    createStereoPanner(){return {...node(),pan:parameter()};},createPanner:spatial};
}
export function wireAudio(mixer,modern=true,names=['tool-handling']) {
  mixer.ctx=strictAudioContext(modern);mixer.buffers=Object.fromEntries(names.map(n=>[n,{}]));
  mixer.buses={sfx:{},ambience:{},music:{},ui:{}};mixer.reverb={};mixer.wet=mixer.ctx.createGain();
  mixer.worldGain=mixer.ctx.createGain();mixer.ready=true;return mixer;
}
