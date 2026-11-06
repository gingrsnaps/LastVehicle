/** Conservative sector visibility, separate from camera-frustum culling.
 * Outdoors retain the garage facade and entrance sectors. Deeper interior
 * geometry is kept only near the open shutter, where it can actually be seen.
 * Long meshes crossing a boundary remain enabled through their measured bounds. */
const exterior=new Set(['yard','gatehouse','road']);
export function sectorVisible(batch,position,room,gateOpen=true,detailLevel=0){
  if(batch.detailQuality>detailLevel)return false;
  const zone=batch.zone,b=batch.bounds;
  const outside=exterior.has(room),external=exterior.has(zone);
  if(!b)return true;
  if(batch.backdrop)return position.z<0||(gateOpen&&position.z<26);
  if(outside){
    if(external)return true;
    // The facade cannot disappear when looking back from the service road.
    if(zone==='garage'&&b.minZ<=3)return true;
    const depth=position.z>-12?32:position.z>-26?17:3;
    return gateOpen&&b.minZ<depth&&(zone==='garage'||position.z>-10);
  }
  if(external)return gateOpen&&position.z<26&&(zone==='yard'||position.z<14);
  if(room==='garage'||zone==='garage'||room===zone)return true;
  const west=['security','storage','workshop'],a=west.indexOf(room),c=west.indexOf(zone);
  return a>=0&&c>=0&&Math.abs(a-c)===1;
}
