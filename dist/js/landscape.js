const B=globalThis.BABYLON;
/** Authored border scenery. Leaves are opaque geometry (no transparent forest
 * overdraw), share three materials, and are merged by the normal sector pass.
 * Decoration never adds invisible collision or blocks a task approach. */
export class Landscape {
 constructor(w){this.w=w;this.records=[];this.roots=[];this.build();}
 tag(mesh,backdrop=false){mesh.isPickable=false;mesh.receiveShadows=true;mesh.metadata={...mesh.metadata,lvCaster:false,backdrop};return mesh;}
 patch(name,x,y,z,rx,rz,material,seed=0,yaw=0,wall=false){
   const m=B.MeshBuilder.CreateDisc(name,{radius:1,tessellation:15,sideOrientation:B.Mesh.DOUBLESIDE},this.w.scene);
   const p=m.getVerticesData(B.VertexBuffer.PositionKind);
   for(let i=0;i<p.length;i+=3){const a=Math.atan2(p[i+1],p[i]),r=.84+.16*Math.sin(a*4+seed)**2;p[i]*=r*rx;p[i+1]*=r*rz;}
   m.setVerticesData(B.VertexBuffer.PositionKind,p);m.position.set(x,y,z);m.material=this.w.materials[material];
   if(wall)m.rotation.y=yaw;else m.rotation.x=Math.PI/2;this.tag(m);
   return m;
 }
 shrub(x,z,size,seed,backdrop=true){
   const w=this.w,positions=[],indices=[],normals=[],colors=[];
   const leaf=(base,tip,width,color)=>{
     const d=tip.subtract(base),side=new B.Vector3(-d.z,0,d.x).normalize().scale(width),mid=base.add(d.scale(.52));
     const points=[base,mid.add(side),tip,mid.subtract(side),mid.add(new B.Vector3(0,.04*size,0))],i=positions.length/3;
     for(const p of points){positions.push(p.x,p.y,p.z);colors.push(...color,1);}
     indices.push(i,i+1,i+4,i+1,i+2,i+4,i+2,i+3,i+4,i+3,i,i+4);
   };
   // Each bush is an asymmetric group of branches, not a floating green ball.
   for(let j=0;j<6;j++){
     const a=j*2.399+seed,height=(.55+(j%3)*.16)*size;
     const root=new B.Vector3(x,0,z),tip=new B.Vector3(x+Math.sin(a)*size*.4,height,z+Math.cos(a)*size*.4);
     const stem=B.MeshBuilder.CreateTube('shrub grounded branch',{path:[root,tip],radius:.018*size,tessellation:4},w.scene);stem.material=w.materials.bark;this.tag(stem,backdrop);
     for(let k=1;k<=5;k++)for(const side of [-1,1]){
       const t=k/6,p=B.Vector3.Lerp(root,tip,t),angle=a+side*1.2+k*.3;
       const end=p.add(new B.Vector3(Math.sin(angle)*.32*size,.12*size,Math.cos(angle)*.32*size));
       leaf(p,end,.105*size,j%2?[.63,.8,.55]:[.78,.89,.64]);
     }
   }
   const mesh=new B.Mesh('border shrub foliage',w.scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.colors=colors;B.VertexData.ComputeNormals(positions,indices,normals);data.normals=normals;data.applyToMesh(mesh);
   mesh.material=w.materials.leaf;this.tag(mesh,backdrop);this.records.push({type:'shrub',x,z,size,baseY:0,triangles:indices.length/3,backdrop});
 }
 build(){
   const w=this.w;
   w.material('yardWood','#9a957d',.94);w.material('borderSoil','#727963',1);w.material('bark','#685c40',1);
   const leaf=w.material('leaf','#5b7350',1);leaf.backFaceCulling=false;
   for(const side of [-1,1]){
     this.tag(w.box('land beyond boundary fence',side*46,-.15,-48,32,.3,110,'borderSoil'),true);
     for(let i=0;i<9;i++)this.shrub(side*(32.2+(i%3)*1.2),-5-i*10.5,1+(i%3)*.2,i*.7);
     for(let i=0;i<4;i++){
       const x=side*(36+(i%2)*1.5),z=-17-i*23,h=5+(i%2)*1.2;
       this.tag(w.cylinder('background tree grounded trunk',x,h/2,z,.26,h,'bark',6),true);
       for(let j=0;j<3;j++){
         const crown=B.MeshBuilder.CreateIcoSphere('background tree crown',{radius:1.5,subdivisions:1,flat:true},w.scene);
         crown.position.set(x+Math.sin(j*2.4)*.6,h-.4+j*.4,z+Math.cos(j*2.4)*.6);crown.scaling.set(1,1.25,1);crown.material=leaf;this.tag(crown,true);
       }
       this.records.push({type:'tree',x,z,baseY:0,backdrop:true});
     }
   }
   for(const side of [-1,1])for(let i=0;i<3;i++)this.shrub(side*(17.3+i*.6),-64-i*12,.85+i*.1,i+2);
   // Growth follows wall bases, drain runoff and shade. Keep control faces,
   // pavement arrows and every usable approach free of visual clutter.
   for(const [x,z] of [[-28,-9],[-27,-13],[28,-10],[28,-32],[-26,-45],[-28,-53],[28,-55]]){
     this.patch('leaf litter under fence growth',x,.006,z,.9,1.5,'borderSoil',z);
     this.patch('moss at damp yard edge',x+.2,.011,z,.55,.95,'decayMoss',z+1);
   }
   for(const z of [-18,-26,-32])this.patch('loading wall damp growth',-18.373,.55,z,1.3,.51,'decayMold',z,-Math.PI/2,true);
   for(const z of [-38,-43,-49])this.patch('gatehouse lower mold',29.266,.42,z,1.4,.4,'decayMold',z,Math.PI/2,true);
   this.patch('gatehouse rear flaking paint',24.9,1.7,-51.873,2.1,1.15,'decayPeel',7,Math.PI,true);
   // A few recognizably constructed wood surfaces make the utility area feel
   // inhabited. Their edges sit on actual benches rather than in mid-air.
   w.box('worn wooden gatehouse desktop',23,.864,-45.2,3.6,.025,1.4,'yardWood');
   // The scene keeps the original puddle ellipses for sound/AI contact; vertex
   // alpha softens their visible edge without changing that gameplay geometry.
   for(const m of w.scene.meshes){
     if(!['water','yard shallow rainwater','pressure burst puddle'].includes(m.name))continue;
     const p=m.getVerticesData(B.VertexBuffer.PositionKind),c=[];
     for(let i=0;i<p.length;i+=3){const r=Math.hypot(p[i],p[i+1]);c.push(1,1,1,r>.8?.12:.88);}
     m.setVerticesData(B.VertexBuffer.ColorKind,c);m.hasVertexAlpha=true;
     m.material=w.materials.puddle;m.material.roughness=.23;m.material.alpha=.68;
   }
 }
}
