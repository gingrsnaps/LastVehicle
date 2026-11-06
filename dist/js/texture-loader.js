const B=globalThis.BABYLON;

/** Allocate the handle before image/GPU work. Even a synchronous failure must
 * leave no blocking Texture registered with the scene. Cleanup runs after the
 * call stack, because an error callback can precede internal-texture assignment. */
export function requestTexture(scene,url,{timeoutMs=4500,Texture=B.Texture}={}){
 return new Promise(resolve=>{
  let texture=null,timer=null,settled=false;
  const finish=(ok,reason='')=>{
   if(settled)return;settled=true;clearTimeout(timer);
   queueMicrotask(()=>{
    if(!ok){try{texture?.dispose();}catch{}resolve({texture:null,error:String(reason||'Image preparation failed').slice(0,240)});}
    else resolve({texture,error:null});
   });
  };
  try{
   texture=new Texture(null,scene,false,false,B.Texture.TRILINEAR_SAMPLINGMODE,null,(message,error)=>finish(false,error?.message||message));
   texture.wrapU=texture.wrapV=B.Texture.WRAP_ADDRESSMODE;texture.anisotropicFilteringLevel=2;
   timer=setTimeout(()=>finish(false,'Image preparation timed out'),Math.max(1,timeoutMs));
   texture.updateURL(url,null,()=>finish(true));
  }catch(error){finish(false,error.message);}
 });
}

/** Bounded retry, a shared loading deadline and local, exportable diagnostics.
 * All these loads finish behind the loading screen, never during a chase. */
export async function loadSurfaceTexture(world,file,{attempts=2,timeoutMs=4500,request=requestTexture}={}){
 world.assetHealth??={textures:{}};world.textureDeadline??=performance.now()+20000;
 const entry=world.assetHealth.textures[file]={state:'loading',attempts:0,error:null};
 const began=performance.now();let result={texture:null,error:'Texture preparation budget exceeded'};
 for(let n=0;n<attempts;n++){
  const remaining=world.textureDeadline-performance.now();if(remaining<=0)break;
  entry.attempts++;result=await request(world.scene,'assets/textures/'+file,{timeoutMs:Math.min(timeoutMs,remaining)});
  if(result.texture)break;
 }
 entry.state=result.texture?'ready':'failed';entry.error=result.error;entry.milliseconds=Math.round(performance.now()-began);
 if(!result.texture){world.failedAssets??=[];const name='textures/'+file;if(!world.failedAssets.includes(name))world.failedAssets.push(name);}
 return result.texture;
}
