import { groundModel } from "./placement.js?v=1.19.0";
import { PUDDLES } from "./surfaces.js?v=1.19.0";
import { loadSurfaceTexture } from './texture-loader.js?v=1.19.0';
const B=globalThis.BABYLON;

/** Authored decay follows water, gravity and room function. These meshes are
 * built once and sector-batched with the architecture. Four small wall-paint
 * planes are the only added alpha layers; no realtime reflections or lights. */
export class Decay {
  constructor(world){
    this.w=world;this.paint=[];
    world.material("decayMoss","#8c9c77",.97);
    world.material("decayMold","#475548",.98);
    world.material("decayRust","#b2b5ab",.88);
    world.material("decayPeel","#929e97",.98);
    this.build();
  }
  async load(){
    const w=this.w;
    const texture=file=>loadSurfaceTexture(w,file);
    for(const [prefix,names] of [["moss",["decayMoss","decayMold"]],["rust",["decayRust"]],["peeling",["decayPeel"]]]){
      const [color,rough]=await Promise.all([texture(prefix+"-albedo.jpg"),texture(prefix+"-roughness.jpg")]);
      if(rough)rough.gammaSpace=false;
      for(const name of names){const m=w.materials[name];m.albedoTexture=color;m.metallicTexture=rough;
        m.useRoughnessFromMetallicTextureGreen=true;m.useRoughnessFromMetallicTextureAlpha=false;
        m.useMetallnessFromMetallicTextureBlue=false;}
    }
    await this.loadPaint(texture);
  }
  async loadPaint(texture){
    for(const mark of this.paint){const map=await texture(mark.file);if(map){map.hasAlpha=true;mark.material.alpha=1;mark.material.diffuseTexture=map;mark.material.useAlphaFromDiffuseTexture=true;}}
  }
  build(){
    const w=this.w;
    // Irregular opaque stain geometry avoids rectangular decal edges and extra
    // transparent render passes. All patches join the static material batches.
    const stain=(name,x,y,z,sx,sy,material,yaw,seed)=>{
      const mesh=B.MeshBuilder.CreateDisc(name,{radius:1,tessellation:11,updatable:true},w.scene);
      const points=mesh.getVerticesData(B.VertexBuffer.PositionKind);
      for(let i=3;i<points.length;i+=3){const variation=.72+.28*Math.sin(seed+i*2.399)**2;points[i]*=variation;points[i+1]*=variation;}
      mesh.updateVerticesData(B.VertexBuffer.PositionKind,points);mesh.position.set(x,y,z);mesh.scaling.set(sx,sy,1);mesh.rotation.y=yaw;mesh.material=w.materials[material];mesh.isPickable=false;return mesh;
    };
    // Mineral deposits and dark growth outline actual leaks. Small irregular
    // opaque patches batch with the floor; they do not add reflection passes.
    for(const puddle of PUDDLES)for(let i=0;i<7;i++){
      const a=i*2.39996,x=puddle.x+Math.cos(a)*puddle.rx*.96,z=puddle.z+Math.sin(a)*puddle.rz*.96;
      const mark=w.box('mineral edge at '+puddle.id,x,.006,z,.16+(i%3)*.09,.008,.28,'decayMold');mark.rotation.y=a;
    }
    // Peeling plaster at the room perimeter leaves doors, signs and clues clear.
    for(const [side,z] of [[-1,11],[-1,15],[-1,22],[-1,26],[-1,39],[-1,50],[-1,67],[-1,83],[1,31],[1,44],[1,93],[1,102]]){
      stain("irregular flaking wall finish",side*29.749,1.85,z,1.8,1.5,"decayPeel",side>0?Math.PI/2:-Math.PI/2,z);
      stain("damp lower wall",side*29.742,.38,z,1.7,.37,"decayMold",side>0?Math.PI/2:-Math.PI/2,z+8);

    }
    // Runoff starts at real pipe brackets/junctions and follows gravity; labels
    // and handles are kept clear. The bottom patch connects to damp wall edges.
    for(const [side,z,top] of [[-1,25,2.7],[-1,61,2.8],[1,35,2.6],[1,45,2.8],[1,97,1.65]]){
      for(let i=0;i<3;i++)w.box("runoff below pipe fixing",side*29.737,top-.45-i*.48,z+i*.025,.005,.5,.055+i*.024,"decayRust");
      stain("damp patch under leaking pipe",side*29.733,.25,z,.55,.24,"decayMold",side>0?Math.PI/2:-Math.PI/2,z);
    }
    // Outdoor growth appears at the ramp/drains; dark damp growth in the pump room.
    for(const [x,z,sx,sz] of [[-4,5,1.1,2.2],[4,5,.9,1.6],[-15.1,15,.8,2.3],[15.1,102,.7,2.1],[28.3,100,1.6,3.8],[28.3,94,1.4,2.3]])
      w.box("growth around drainage",x,.004,z,sx,.008,sz,x>20?"decayMold":"decayMoss");
    for(const [x,z] of [[-28.4,65],[-28.5,84],[28.5,46]]){
      w.box("corroded cabinet",x,.78,z,1.2,1.56,.75,"decayRust",true);
      w.box("missing cabinet drawer",x,.95,z+.384,.9,.37,.015,"dark");
      const door=w.box("bent cabinet panel",x-.5,.54,z+.49,.25,1.06,.07,"decayRust");door.rotation.y=.23;
      w.box("cabinet foot",x-.42,.07,z+.25,.15,.14,.15,"black");
      w.box("cabinet foot",x+.42,.07,z+.25,.15,.14,.15,"black");
    }
    for(const [x,z] of [[-28.7,23],[-28.6,52],[28.7,93],[-28.6,81]]){
      for(let i=0;i<5;i++){
        const chip=B.MeshBuilder.CreatePolyhedron("fallen plaster",{type:0,size:.13+i*.017},w.scene);
        chip.material=w.materials.decayPeel;chip.rotation.set(i*.73,i*.94,i*.31);chip.scaling.y=.38;
        groundModel(chip,x+(i%2)*.31,z+(i-2)*.33,0);chip.isPickable=false;
      }
    }
    for(const [x,z] of [[-14.9,89],[28.6,105]]){
      const root=new B.TransformNode("damaged drain cover",w.scene);
      for(let i=0;i<6;i++){const bar=w.box("rusted drain slat",i*.12-.3,0,0,.06,.035,.7,"decayRust");bar.parent=root;}
      root.rotation.x=.13;root.rotation.y=.17;groundModel(root,x,z,0);
    }
    // Wall paint sits 4 mm above known perimeter faces. Four small lit planes
    // stay on Low too; they have no interaction prompt or collision.
    for(const [file,side,z,y,width] of [
      ['v114-graffiti-low-tide.svg',1,103,2.1,1.7],
      ['v114-graffiti-night.svg',-1,49,2.25,1.6],
      ['v114-inspection-surface.svg',-1,82,2.7,.72],
      ['v114-inspection-meridian.svg',-1,26.5,1.6,.72],
    ]){
      const material=new B.StandardMaterial('weathered wall ink '+file,w.scene);material.diffuseColor.setAll(.7);material.specularColor.setAll(0);material.emissiveColor.setAll(0);material.maxSimultaneousLights=7;
      const plane=B.MeshBuilder.CreatePlane('wall mark '+file,{width,height:width/2},w.scene);
      plane.position.set(side*29.746,y,z);plane.rotation.y=side*Math.PI/2;plane.material=material;plane.isPickable=false;material.alpha=0;
      plane.metadata={placement:{x:plane.position.x,y,z,w:.001,h:width/2,d:width}};
      this.paint.push({file,material,plane});w.placements.record('paint:'+file,plane,{support:'perimeter wall',kind:'wall-paint',supportY:y});
    }
    // Intact lower bars and the broken corner make the vent readable at low detail.
    for(const [x,z] of [[-29.75,74],[29.75,96]]){
      w.box("abandoned ventilation opening",x,2.65,z,.05,.65,1.3,"dark");
      for(let i=0;i<5;i++){const bar=w.box("damaged vent slat",x+(x<0?.04:-.04),2.4+i*.11,z,.06,.035,1.25,"decayRust");bar.rotation.x=i===4?.12:0;}
    }
  }
}
