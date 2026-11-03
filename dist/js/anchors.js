const B=globalThis.BABYLON;
export const signNormal=yaw=>({x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)});

/** Placement happens once before static batching. A sign is attached to a real
 * supporting face, or receives a complete suspended bracket. The same records
 * feed the development overlay and exported placement audit. */
export class PlacementRegistry {
  constructor(world){this.w=world;this.signs=[];this.records=[];this.debugMeshes=[];}
  sign(mesh,spec){this.signs.push({mesh,...spec});}
  resolve(){
    const w=this.w,signs=new Set(this.signs.map(s=>s.mesh));
    const surfaces=w.scene.meshes.filter(m=>m.geometry&&!signs.has(m)&&m.isEnabled()&&!m.isDescendantOf(w.worker)&&!m.isDescendantOf(w.visuals.hand));
    for(const s of this.signs){
      if(s.floor){this.records.push({id:s.mesh.uniqueId,label:s.text,type:'floor',x:s.mesh.position.x,y:s.mesh.position.y,z:s.mesh.position.z});continue;}
      const n=signNormal(s.yaw),axis=Math.abs(n.x)>.7?'x':'z',side=axis==='x'?n.x:n.z,lateral=axis==='x'?'z':'x';
      let support=null,face=0,best=Infinity;
      for(const m of surfaces){
        // Moving objects retain their own authored attachments. Static signs
        // must not accidentally mount to the enemy, a door leaf or held props.
        if(/glass|shutter|door leaf|screen|dust|ripple|drop/.test(m.name))continue;
        m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox,lo=b.minimumWorld,hi=b.maximumWorld;
        const f=side>0?hi[axis]:lo[axis],gap=(s.mesh.position[axis]-f)*side;
        if(gap<-.08||gap>1.0||s.mesh.position.y-s.h/2<lo.y-.04||s.mesh.position.y+s.h/2>hi.y+.04)continue;
        if(s.mesh.position[lateral]-s.w/2<lo[lateral]-.04||s.mesh.position[lateral]+s.w/2>hi[lateral]+.04)continue;
        if(Math.abs(gap)<best){best=Math.abs(gap);support=m;face=f;}
      }
      // A 24 mm physical plate keeps the print consistently 3 mm clear of it.
      if(support)s.mesh.position[axis]=face+side*.027;
      const p=s.mesh.position,plate=w.box('plaque backing · '+s.text,p.x-n.x*.015,p.y,p.z-n.z*.015,s.w+.06,s.h+.06,.024,'dark');
      plate.rotation.y=s.yaw;
      const right={x:Math.cos(s.yaw),z:-Math.sin(s.yaw)};
      for(const x of [-1,1])for(const y of [-1,1]){
        const screw=w.box('plaque fastener',p.x+right.x*x*(s.w/2-.045)+n.x*.002,p.y+y*(s.h/2-.035),p.z+right.z*x*(s.w/2-.045)+n.z*.002,.018,.018,.008,'steel');screw.rotation.y=s.yaw;
      }
      if(!support&&p.y>2.8){
        const length=Math.max(.05,4.18-(p.y+s.h/2));
        for(const side of [-1,1])w.box('ceiling sign hanger',p.x+right.x*side*s.w*.35,p.y+s.h/2+length/2,p.z+right.z*side*s.w*.35,.035,length,.035,'steel');
      }
      // Unmounted low labels are reported rather than silently called aligned.
      this.records.push({id:s.mesh.uniqueId,label:s.text,type:support?'surface':p.y>2.8?'suspended':'authored',support:support?.name||null,x:p.x,y:p.y,z:p.z,yaw:s.yaw,width:s.w,height:s.h,normal:n,offset:support?.027:null});
    }
    this.resolved=true;
  }
  record(id,root,{support='floor',supportY=0,kind='prop'}={}){
    const b=root.metadata?.placement;
    this.records.push({id,label:root.name,type:kind,support,supportY,...b});
  }
  report(){return {resolved:!!this.resolved,count:this.records.length,unresolved:this.records.filter(r=>r.type==='authored').map(r=>r.label),records:this.records};}
  showDebug(on){
    // Development-only view: allocated once on explicit request, never in play.
    if(on&&!this.debugMeshes.length){
      const mat=this.w.material('placement debug','#d3b34d',1,'#d3b34d');
      for(const r of this.records){if(!Number.isFinite(r.x))continue;
        const m=B.MeshBuilder.CreateBox('anchor '+r.label,{size:.065},this.w.scene);m.position.set(r.x,r.y||.04,r.z);m.material=mat;m.isPickable=false;this.debugMeshes.push(m);
      }
    }
    for(const m of this.debugMeshes)m.setEnabled(on);
    return this.report();
  }
}
