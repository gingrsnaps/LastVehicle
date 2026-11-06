/** Keep long sign allocations within a fixed budget and device limits while
 * preserving their aspect ratio. Real mesh dimensions remain unchanged. */
export function signTextureSize(w,h,maxTextureSize=2048){
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('Invalid sign dimensions');
 const cap=Math.max(1,Math.min(2048,Number.isFinite(maxTextureSize)?maxTextureSize:2048));
 const desired=Math.max(w<2.6?512:1024,Math.ceil(64*w/h));
 const scale=Math.min(1,cap/desired,Math.min(cap,1024)/(desired*h/w));
 const width=Math.max(1,Math.floor(desired*scale));
 return {width,height:Math.max(1,Math.min(Math.floor(Math.min(cap,1024)),Math.round(width*h/w)))};
}
