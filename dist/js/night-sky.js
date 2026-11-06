const B=globalThis.BABYLON;
/** A local, stylized night sky: three unlit meshes, no image downloads, shadow
 * passes, reflection capture or per-pixel cloud noise. Geometry is authored once
 * during loading. infiniteDistance follows the camera without changing gameplay
 * lighting or the hunter's visibility model. */
export class NightSky {
  constructor(w){
    this.w=w;this.meshes=[];this.material=new B.StandardMaterial('night sky vertex palette',w.scene);
    Object.assign(this.material,{disableLighting:true,backFaceCulling:false,fogEnabled:false});
    this.material.diffuseColor=B.Color3.White();this.material.emissiveColor=new B.Color3(.7,.7,.7);this.material.specularColor=B.Color3.Black();
    const dome=B.MeshBuilder.CreateSphere('night skybox dome',{diameter:220,segments:16},w.scene);
    const p=dome.getVerticesData(B.VertexBuffer.PositionKind),colors=[];
    for(let i=0;i<p.length;i+=3){
      const elevation=Math.max(0,p[i+1]/110),h=Math.pow(1-elevation,3);
      // Quiet urban horizon; the yard itself remains dark and needs the torch.
      colors.push(.006+h*.018,.010+h*.022,.024+h*.025,1);
    }
    dome.setVerticesData(B.VertexBuffer.ColorKind,colors);this.adopt(dome);
    const cloud={positions:[],indices:[],colors:[]},stars={positions:[],indices:[],colors:[]};
    const direction=(yaw,elevation,r)=>new B.Vector3(Math.sin(yaw)*Math.cos(elevation)*r,Math.sin(elevation)*r,Math.cos(yaw)*Math.cos(elevation)*r);
    const triangle=(data,points,color)=>{const base=data.positions.length/3;for(const v of points){data.positions.push(v.x,v.y,v.z);data.colors.push(...color,1);}data.indices.push(base,base+1,base+2);};
    // Broken cloud banks near the horizon, not repeated rings over the whole
    // dome. These are opaque silhouettes: no alpha overdraw or noise shader.
    for(let patch=0;patch<7;patch++)for(let i=0;i<8;i++){
      const yaw=patch*.93+i*.067,spread=.10,e=.07+(patch%3)*.075+Math.sin(i*.7)*.028;
      triangle(cloud,[direction(yaw-spread,e,101),direction(yaw+spread,e,101),direction(yaw,e+.055+(i%3)*.012,101)],[.006,.011,.019]);
    }
    const yaw=-.65,e=.48,center=direction(yaw,e,106),right=new B.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=B.Vector3.Cross(center.normalizeToNew(),right).normalize();
    for(let i=0;i<20;i++){
      const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
      triangle(stars,[center,center.add(right.scale(Math.cos(a)*1.35)).add(up.scale(Math.sin(a)*1.35)),center.add(right.scale(Math.cos(b)*1.35)).add(up.scale(Math.sin(b)*1.35))],[.40,.43,.46]);
    }
    // Equal-area Fibonacci distribution across the upper hemisphere. All stars
    // live in ONE mesh and never twinkle or allocate anything during gameplay.
    // Diameters are large enough to survive Low render scale without noisy bloom.
    this.starCount=640;this.starRecords=[];
    for(let i=0;i<this.starCount;i++){
      const y=i*2.3999632297,e=Math.asin(.09+.9*(i+.5)/this.starCount),c=direction(y,e,108);
      // Leave the moon face uncluttered.
      if(B.Vector3.Distance(c,center)<2.6)continue;
      const r=new B.Vector3(Math.cos(y),0,-Math.sin(y)),u=B.Vector3.Cross(c.normalizeToNew(),r).normalize();
      const bright=i%17===0,size=bright?.16:.065+(i%7)*.009,l=bright?.85:.32+(i%5)*.075;
      const a=c.add(r.scale(-size)),b=c.add(u.scale(size)),d=c.add(r.scale(size)),f=c.add(u.scale(-size));
      const color=i%5===0?[l,l*.92,l*.8]:[l*.85,l*.93,l];
      triangle(stars,[a,b,d],color);triangle(stars,[a,d,f],color);
      this.starRecords.push({x:c.x,y:c.y,z:c.z,radius:size});
    }
    this.starCount=this.starRecords.length;
    for(const [name,data] of [['low cloud silhouettes',cloud],['veiled moon and stars',stars]]){
      const m=new B.Mesh(name,w.scene),v=new B.VertexData();v.positions=data.positions;v.indices=data.indices;v.colors=data.colors;v.normals=[];B.VertexData.ComputeNormals(v.positions,v.indices,v.normals);v.applyToMesh(m);this.adopt(m);
    }
    this.clouds=this.meshes[1];this.setSettings({skyBrightness:.8});
  }
  adopt(m){m.material=this.material;m.infiniteDistance=true;m.isPickable=false;m.applyFog=false;m.receiveShadows=false;m.alwaysSelectAsActiveMesh=true;m.metadata={sky:true,lvCaster:false};this.meshes.push(m);this.w.visuals.dynamicRoots.add(m);this.w.glow.addExcludedMesh(m);}
  setSettings(s){this.settings=s;this.material.emissiveColor.setAll(s.skyBrightness??.8);}
  tick(time,position){
    const visible=position.z<28||!!this.preparing;
    if(this.visible!==visible){this.visible=visible;for(const m of this.meshes)m.setEnabled(visible);}
    // Static cloud shapes drift extremely slowly; reduced motion freezes them.
    if(visible)this.clouds.rotation.y=this.settings?.reducedMotion||this.settings?.sceneryMotion===false?0:time*.0007;
  }
  prepare(on){this.preparing=on;this.visible=null;this.tick(0,this.w.camera.position);}
}
