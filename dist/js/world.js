import { Distractions } from "./distractions.js?v=1.14.0";
import { selectFixtures, lightingPhase, fixturePower, ambientPower } from "./lighting.js?v=1.14.0";
import { Details } from "./details.js?v=1.14.0";
import { RichDetails } from "./rich-details.js?v=1.14.0";
import { EquipmentScenes } from "./equipment-scenes.js?v=1.14.0";
import { PlacementRegistry } from "./anchors.js?v=1.14.0";
import { Decay } from "./decay.js?v=1.14.0";
import { PUDDLES, SurfaceEffects } from "./surfaces.js?v=1.14.0";
import { PARKING_ROWS, PARKED_CARS, groundModel } from "./placement.js?v=1.14.0";
import { PROP_LAYOUT, PROP_SIZES, propCollider } from "./props.js?v=1.14.0";
import { Atmosphere } from "./atmosphere.js?v=1.14.0";
import { Staging } from "./staging.js?v=1.14.0";
import { roomAt } from "./guidance.js?v=1.14.0";
import { consumeSteps, yieldTask, waitForReady, loadInBatches } from "./preparation.js?v=1.14.0";
import { Visuals } from "./visuals.js?v=1.14.0";
/**
 * Scene construction. Public CC0 cars are dressed with original modular geometry.
 * Units are metres; Y is up and the north exit is at Z=0. A flat, continuous floor
 * avoids stairs/physics edge cases. Physics proxies and visual meshes are separate.
 */
const B = globalThis.BABYLON;
const C = (hex) => B.Color3.FromHexString(hex);
export class World {
  constructor(engine, { defer = false } = {}) {
    this.engine = engine;
    this.scene = new B.Scene(engine);
    this.scene.clearColor = new B.Color4(0.016, 0.025, 0.031, 1);
    this.scene.fogMode = B.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.019;
    this.scene.fogColor = C("#162126");
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.15;
    this.scene.imageProcessingConfiguration.contrast = 1.1;
    this.placements = new PlacementRegistry(this);
    this.rects = [];
    this.interactives = [];
    this.shortcuts = [];
    this.lights = [];
    this.shadowMeshes = [];
    this.containers = {};
    this.decals = [];
    this.camera = new B.UniversalCamera(
      "eyes",
      new B.Vector3(5, 1.7, 82),
      this.scene,
    );
    this.camera.minZ = 0.035;
    this.camera.fovMode = B.Camera.FOVMODE_HORIZONTAL_FIXED;
    this.camera.inertia = 0;
    this.camera.maxZ = 145;
    this.camera.inputs.clear();
    this.scene.activeCamera = this.camera;
    this.materials = {};
    this.makeMaterials();
    const hemi = new B.HemisphericLight(
      "bounce",
      new B.Vector3(0, 1, 0),
      this.scene,
    );
    hemi.intensity = 0.18;
    hemi.diffuse = C("#91a9aa");
    hemi.groundColor = C("#222a2c");
    this.hemi = hemi;
    this.flash = new B.SpotLight(
      "flashlight",
      this.camera.position.clone(),
      new B.Vector3(0, 0, 1),
      0.78,
      2,
      this.scene,
    );
    this.flash.diffuse = C("#fff1d3");
    this.flash.intensityMode = B.Light.INTENSITYMODE_LUMINOUSINTENSITY;
    this.flash.intensity = 950;
    this.flash.innerAngle = 0.3;
    this.flash.range = 32;
    this.spill = new B.SpotLight(
      "flashlight spill",
      this.camera.position.clone(),
      new B.Vector3(0, 0, 1),
      1.45,
      1.5,
      this.scene,
    );
    this.spill.intensityMode = B.Light.INTENSITYMODE_LUMINOUSINTENSITY;
    this.spill.intensity = 90;
    this.spill.range = 16;
    this.spill.diffuse = C("#e8dcc1");
    this.spill.innerAngle = 0.65;
    this.flash.shadowMinZ = 0.15;
    this.flash.shadowMaxZ = 36;
    this.shadow = new B.ShadowGenerator(1024, this.flash);
    this.shadow.usePercentageCloserFiltering = true;
    this.shadow.filteringQuality = B.ShadowGenerator.QUALITY_LOW;
    this.shadow.bias = 0.0008;
    this.shadow.normalBias = 0.035;
    this.shadow.darkness = 0.35;
    this.glow = new B.GlowLayer("soft fixture bloom", this.scene, {
      mainTextureRatio: 0.35,
      blurKernelSize: 24,
    });
    this.glow.intensity = 0.28;
    // Letter masks stay sharp even after static batching replaces sign meshes.
    this.glow.customEmissiveColorSelector=(mesh,subMesh,material,color)=>{
      if(material?.metadata?.readableLabel){color.set(0,0,0,0);return;}
      const c=material?.emissiveColor,k=(material?.emissiveIntensity??1)*(material?.emissiveTexture?.level??1);
      if(c)color.set(c.r*k,c.g*k,c.b*k,material.alpha??1);else color.copyFrom(this.glow.neutralColor);
    };
    // The same seven light objects remain attached throughout play. Moving a
    // reusable ceiling light changes uniforms, not the material light topology.
    this.lightPool = Array.from({length:4}, (_,i) => {
      const light = new B.PointLight("ceiling light slot "+i, new B.Vector3(0,3.7,0), this.scene);
      light.range=11; light.intensity=0;
      return {light,current:null,target:null,level:0};
    });
    if (!defer) {
      this.buildArchitecture(); this.buildRooms(); this.buildWorker();
      this.visuals = new Visuals(this); this.finishConstruction();
    }
  }
  async buildAsync(report = () => {}) {
    report("Building the garage", .03); await yieldTask();
    await consumeSteps(this.architectureSteps(),()=>report("Building the garage", .08));
    await consumeSteps(this.roomSteps(),()=>report("Preparing the rooms", .15));
    this.buildWorker(); await yieldTask();
    this.visuals = new Visuals(this, {defer:true});
    await this.visuals.buildAsync(); this.finishConstruction();
    report("Garage constructed", .22);
  }
  finishConstruction() {
    this.stage = new Staging(this);
    this.atmosphere = new Atmosphere(this);
    this.decay = new Decay(this);
    this.surfaces = new SurfaceEffects(this);
    this.equipment=new EquipmentScenes(this);
    this.distractions=new Distractions(this);
    for (const door of this.shortcuts) this.visuals.dynamicRoots.add(door.mesh);
    this.waypoint = B.MeshBuilder.CreateTorus("requested destination marker", { diameter: 1.15, thickness: 0.055, tessellation: 16 }, this.scene);
    this.waypoint.material = this.materials.warm;
    this.waypoint.position.y = 0.05;
    this.waypoint.isPickable = false;
    this.waypoint.setEnabled(false);
    this.visuals.dynamicRoots.add(this.waypoint);
    this.scene.skipPointerMovePicking = true;
    this.beamDirection=B.Vector3.Zero();this.beamRight=B.Vector3.Zero();
    this.scene.onBeforeRenderObservable.add(() => {
      this.camera.getViewMatrix(true);
      const direction=this.beamDirection;
      if(this.stage.driving)this.stage.car.getDirectionToRef(B.Axis.Z,direction);else this.camera.getDirectionToRef(B.Axis.Z,direction);
      if(this.stage.driving){
        // Both beams originate beyond the bumper, never inside the windshield.
        // Reuse the existing slots, preserving the prepared shader light layout.
        this.stage.car.computeWorldMatrix(true);
        B.Vector3.TransformCoordinatesToRef(this.stage.headlightLeft,this.stage.car.getWorldMatrix(),this.flash.position);
        B.Vector3.TransformCoordinatesToRef(this.stage.headlightRight,this.stage.car.getWorldMatrix(),this.spill.position);
        this.flash.direction.copyFrom(direction);this.spill.direction.copyFrom(direction);return;
      }
      const right=this.beamRight;this.camera.getDirectionToRef(B.Axis.X,right);
      this.flash.position.copyFrom(this.camera.position);
      this.flash.position.addInPlaceFromFloats(right.x*.065+direction.x*.035,right.y*.065+direction.y*.035,right.z*.065+direction.z*.035);
      this.spill.position.copyFrom(this.flash.position);
      this.flash.direction.copyFrom(direction);
      this.spill.direction.copyFrom(direction);
    });
  }
  material(name, color, roughness = 0.9, emission = null) {
    const m = new B.PBRMaterial(name, this.scene);
    m.albedoColor = C(color);
    m.metallic = 0;
    m.roughness = roughness;
    m.maxSimultaneousLights = 7;
    if (emission) {
      m.emissiveColor = C(emission);
      m.unlit = true;
    }
    this.materials[name] = m;
    return m;
  }
  makeMaterials() {
    this.material("concrete", "#646f6d");
    this.material("ceiling", "#424d4c");
    this.material("floor", "#424b4c", 0.7);
    this.material("teal", "#244a49");
    this.material("dark", "#172223");
    this.material("steel", "#4d5a59", 0.5);
    this.material("yellow", "#bda66a");
    this.material("paper", "#b8b8a4");
    this.material("black", "#090f12");
    this.material("warm", "#ffd59a", 0.3, "#ffc88a");
    this.material("cool", "#b3d4d0", 0.3, "#98c6c0");
    this.material("red", "#bd4a36", 0.4, "#b32d1c");
    this.material("green", "#b0e5bf", 0.5, "#79b590");
    this.material("worker", "#1d282b");
    this.material("skin", "#78786c");
    this.material("rubber", "#10181a");
  }
  box(name, x, y, z, w, h, d, mat = "concrete", collision = false) {
    const m = B.MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      this.scene,
    );
    m.position.set(x, y, z);
    m.material = this.materials[mat];
    m.isPickable = false;
    m.receiveShadows = true;
    if (collision) this.rects.push({ x, y, z, w, h, d, enabled: true, name });
    m.metadata = { lvCaster: (collision || /pillar|locker|cabinet|shutter|grille|door/.test(name)) && h > .3 };
    if (m.metadata.lvCaster) {
      this.shadowMeshes.push(m);
      this.shadow.addShadowCaster(m);
    }
    return m;
  }
  cylinder(name, x, y, z, diameter, height, mat = "steel", tessellation = 10) {
    const m = B.MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation },
      this.scene,
    );
    m.position.set(x, y, z);
    m.material = this.materials[mat];
    m.isPickable = false;
    m.receiveShadows = true;
    m.metadata = {lvCaster:diameter > .5 && height > .5};
    if (m.metadata.lvCaster) this.shadow.addShadowCaster(m);
    return m;
  }
  sign(
    text,
    x,
    y,
    z,
    w = 3,
    h = 0.8,
    rotation = Math.PI,
    color = "#b8c9c2",
    bg = "#253c3a",
  ) {
    // Keep long, narrow labels proportional while retaining readable texel height.
    const width=Math.max(w<2.6?512:1024,Math.ceil(64*w/h)),height=Math.round(width*h/w);
    const tex = new B.DynamicTexture(
      "sign " + text,
      { width, height },
      this.scene,
      false,
    );
    const ctx = tex.getContext();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let font=Math.min(height*.56,width*.11);
    ctx.font=`600 ${font}px sans-serif`;
    const measured=ctx.measureText(text).width;
    if(measured>width*.9){font*=width*.9/measured;ctx.font=`600 ${font}px sans-serif`;}
    ctx.fillText(text, width/2, height/2);
    tex.update();
    const mat = new B.StandardMaterial("print " + text, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = new B.Color3(0.025, 0.025, 0.025);
    const essential=/EXIT|SHELTER|SECURITY|WORKSHOP|STORAGE|ELECTRICAL|PUMP|SERVICE|POWER|VENT|REPAIR|GATE|RELEASE|ACCESS/.test(text);
    if(essential){
      // Illuminate only the letters. The panel remains dark and receives the
      // actual room lights; there is no new point light or bloom halo per sign.
      const mask=new B.DynamicTexture("letter mask "+text,{width,height},this.scene,false);
      const ink=mask.getContext();ink.fillStyle="#000000";ink.fillRect(0,0,width,height);
      ink.fillStyle=color;ink.textAlign="center";ink.textBaseline="middle";ink.font=ctx.font;
      ink.fillText(text,width/2,height/2);mask.update();mat.emissiveTexture=mask;
      mat.emissiveColor.setAll(.24);mat.metadata={readableLabel:true};
    }
    mat.specularColor = B.Color3.Black();
    mat.backFaceCulling = true;
    const plane = B.MeshBuilder.CreatePlane(
      "sign " + text,
      { width: w, height: h },
      this.scene,
    );
    plane.position.set(x, y, z);
    plane.rotation.y = rotation;
    plane.material = mat;
    plane.isPickable = false;
    this.placements.sign(plane,{text,w,h,yaw:rotation,floor:false});
    return plane;
  }
  labelFloor(text, x, z) {
    const p = this.sign(text, x, 0.015, z, 1.5, 0.4, 0, "#aaa993", "#41494a");
    p.rotation.x = Math.PI / 2;
    this.placements.signs.at(-1).floor=true;
  }
  lamp(x, z, warm = false) {
    this.box("light housing", x, 4.12, z, 2.4, 0.16, 0.32, "dark");
    const diffuser=this.box(
      "fluorescent diffuser",
      x,
      4.01,
      z,
      2.1,
      0.04,
      0.16,
      warm ? "warm" : "cool",
    );
    const circuit=roomAt({x,z})==='garage'?(Math.abs(x)<4?'lane':'edge'):roomAt({x,z}),key='fixture-'+circuit+(warm?'warm':'cool');
    if(!this.materials[key])this.materials[key]=diffuser.material.clone(key);
    diffuser.material=this.materials[key];
    const fixture = { x, z, base:warm?5:7, color:C(warm ? "#ffd095" : "#a1c3c3"),diffuserMaterial:diffuser.material };
    this.lights.push(fixture);
    return fixture;
  }

  interactive(id, label, x, y, z, opts = {}) {
    const item = { id, label, pos: new B.Vector3(x, y, z), ...opts };
    this.interactives.push(item);
    return item;
  }
  buildArchitecture() { for (const _ of this.architectureSteps()) {} }
  *architectureSteps() {
    this.box("floor", 0, -0.18, 55, 60, 0.36, 112, "floor");
    this.box("ceiling", 0, 4.5, 55, 60, 0.3, 112, "ceiling");
    this.box("west perimeter", -30, 2.1, 55, 0.45, 4.4, 112, "concrete", true);
    this.box("east perimeter", 30, 2.1, 55, 0.45, 4.4, 112, "concrete", true);
    this.box("south perimeter", 0, 2.1, 110, 60, 4.4, 0.5, "concrete", true);
    // The north wall has a real opening, with a separate sliding exit gate collider.
    this.box("north wall left", -17, 2.1, 1, 26, 4.4, 0.5, "concrete", true);
    this.box("north wall right", 17, 2.1, 1, 26, 4.4, 0.5, "concrete", true);
    this.box("outside floor", 0, -0.2, -4, 8, 0.4, 10, "floor");
    this.box("outside left", -4, 2, -4, 0.4, 4, 10, "dark", true);
    this.box("outside right", 4, 2, -4, 0.4, 4, 10, "dark", true);
    this.exitGate = this.box(
      "exit shutter",
      0,
      1.9,
      2,
      7,
      3.8,
      0.18,
      "steel",
      true,
    );
    this.exitRect = this.rects.at(-1);
    this.exitRibs = [];
    for (let y = 0.3; y < 3.8; y += 0.27) {
      const rib = this.box("shutter rib", 0, y, 2.12, 6.8, 0.03, 0.07, "dark");
      this.exitRibs.push({ mesh: rib, y });
    }
    this.sign("EXIT  ↑", 0, 3.8, 4.3, 3, 0.65, Math.PI, "#dfdfbe", "#324c43");
    this.sign("MERIDIAN  /  B2", 0, 3.1, 109.72, 6, 0.9, 0);
    yield;
    // Main hall walls have authored openings into the side rooms.
    const westOpen = [18, 45, 76, 98],
      eastOpen = [39, 98];
    for (const [side, openings] of [
      [-1, westOpen],
      [1, eastOpen],
    ]) {
      let start = 1;
      for (const z of [...openings, 112]) {
        const end = z === 112 ? 110 : z - 1.8;
        const len = end - start;
        if (len > 0) {
          this.box(
            "room partition",
            side * 17,
            2.1,
            (start + end) / 2,
            0.35,
            4.4,
            len,
            "concrete",
            true,
          );
          this.box(
            "wall teal band",
            side * 16.79,
            1.02,
            (start + end) / 2,
            0.03,
            0.65,
            len,
            "teal",
          );
        }
        start = z + 1.8;
      }
    }
    for (const z of [7, 29, 33, 57, 62, 88]) {
      if ([29, 33, 57, 62].includes(z)) {
        // A 3 m service opening links the west rooms. The key unlocks this
        // shortcut; its workshop fire door closes before the final encounter.
        this.box("west divider left", -27.75, 2.1, z, 4.5, 4.4, 0.3, "concrete", true);
        this.box("west divider right", -19.75, 2.1, z, 5.5, 4.4, 0.3, "concrete", true);
        this.box("service lintel", -24, 3.95, z, 3, 0.7, 0.3, "concrete");
      } else this.box("west room divider", -23.5, 2.1, z, 13, 4.4, 0.3, "concrete", true);
    }
    for (const z of [29, 57]) {
      const mesh = this.box("service shortcut door", -24, 1.8, z, 3, 3.6, 0.18, "teal");
      const rect = { x: -24, y: 1.8, z, w: 3, h: 3.6, d: 0.18, enabled: true, dynamic: true, name: "service shortcut" };
      this.rects.push(rect); this.shortcuts.push({ mesh, rect, open: null });
      this.sign("SERVICE PASSAGE", -24, 3.7, z - 0.2, 2.9, 0.3, 0, "#e4ce91", "#324c43");
      this.sign("01 SECURITY / 03 WORKSHOP", -24, 3.7, z + 0.2, 2.9, 0.3, Math.PI, "#e4ce91", "#324c43");
    }
    for (const z of [27, 51, 86])
      this.box(
        "east room divider",
        23.5,
        2.1,
        z,
        13,
        4.4,
        0.3,
        "concrete",
        true,
      );
    // Repeated structural bays produce depth and readable light/dark rhythm.
    for (let z = 12; z <= 102; z += 15) {
      this.box("ceiling crossbeam", 0, 3.97, z, 34, 0.6, 0.65, "ceiling");
      for (const x of [-5.8, 5.8]) {
        this.box("pillar", x, 2.05, z, 0.9, 4.1, 0.9, "concrete", true);
        this.box("pillar paint", x, 1, z, 0.93, 0.85, 0.93, "teal");
        this.box("pillar bumper", x, 0.25, z, 1.04, 0.23, 1.04, "black");
        this.sign(
          String(Math.round(z / 15) + 1).padStart(2, "0"),
          x,
          2.3,
          z + 0.46,
          0.55,
          0.22,
          Math.PI,
        );
      }
      this.lamp(0, z + 5, z > 60);
      yield;
    }
    for (const x of [-15.2, 15.2]) {
      const pipe = this.cylinder(
        "overhead pipe",
        x,
        3.85,
        55,
        0.13,
        108,
        "steel",
        8,
      );
      pipe.rotation.x = Math.PI / 2;
      for (let z = 10; z < 109; z += 12)
        this.box("pipe bracket", x, 4.02, z, 0.5, 0.45, 0.1, "dark");
    }
    for (const {side,edges} of PARKING_ROWS) {
      for (const z of edges) {
        this.box("parking line",side*11.5,.012,z,8.2,.018,.065,"yellow");
        yield;
      }
      for(let i=0;i<edges.length-1;i++) {
        const z=(edges[i]+edges[i+1])/2;
        this.labelFloor(side===1&&z===78?"042":String(30+i),side*13.9,z);
      }
    }
    for (let z = 10; z < 105; z += 6)
      this.box("lane divider", 0, 0.014, z, 0.09, 0.02, 2, "yellow");
    for (const z of [25, 56, 86]) {
      const arrow = this.box(
        "direction arrow",
        1,
        0.02,
        z,
        0.15,
        0.025,
        1.8,
        "yellow",
      );
      const a = this.box(
        "arrow head",
        0.77,
        0.02,
        z - 0.7,
        0.75,
        0.025,
        0.12,
        "yellow",
      );
      a.rotation.y = -Math.PI / 4;
      const b = this.box(
        "arrow head",
        1.23,
        0.02,
        z - 0.7,
        0.75,
        0.025,
        0.12,
        "yellow",
      );
      b.rotation.y = Math.PI / 4;
    }
    this.sign("SECURITY  →     EXIT  ↑", 0, 3.5, 26, 5, 0.75);
    this.sign("WORKSHOP  →    PUMP ROOM  ←", 0, 3.5, 88, 5.6, 0.75);
    this.sign("SECURITY  ←",0,3.5,26.05,5,.75,0);
    this.sign("WORKSHOP  ←    PUMP ROOM  →",0,3.5,88.05,5.6,.75,0);
    this.sign("B2", 16.75, 2.7, 67, 3, 1, Math.PI / 2, "#c5d2cb", "#244a49");
    this.box("dedication plaque support",3.35,1.7,3.84,1.62,.55,.08,"steel",true);
    this.box("dedication plaque post",3.35,.82,3.84,.12,1.64,.12,"steel");
    this.sign("1986", 3.35, 1.7, 3.9, 1.45, 0.38);
    this.interactive("plaque", "Read dedication plaque", 3.35, 1.5, 4.3);
    this.box("gate motor", -4.7, 0.8, 5, 1, 1.6, 0.7, "teal", true);
    this.sign("GATE RELEASE", -4.7, 1.4, 5.37, .88, 0.28);
    this.interactive("gate", "Use gate release", -4.7, 1.2, 5.5);
    // Fine floor drainage and a restrained glossy puddle break up broad surfaces.
    for (const z of [32, 61, 90]) {
      for (let x = -15; x < 16; x += 0.3) {
        this.box("drain slot", x, 0.018, z, 0.13, 0.02, 0.45, "black");
        if (Math.round((x+15)/.3) % 16 === 0) yield;
      }
    }
    const puddle = this.material("puddle", "#263b3e", 0.16);
    puddle.alpha = 0.75;
    for (const {x,z,rx:w,rz:d} of PUDDLES) {
      const p = B.MeshBuilder.CreateDisc(
        "water",
        { radius: 1, tessellation: 13 },
        this.scene,
      );
      p.rotation.x = Math.PI / 2;
      p.scaling.set(w, d, 1);
      p.position.set(x, 0.022, z);
      p.material = puddle;
      p.isPickable = false;
    }
  }
  roomTitle(title, x, z, side) {
    this.sign(
      title,
      x,
      3.3,
      z,
      3.5,
      0.6,
      side < 0 ? -Math.PI / 2 : Math.PI / 2,
    );
    this.lamp(side * 23, z, true);
  }
  desk(x, z) {
    this.box("desk top", x, 0.86, z, 3, 0.13, 1.25, "steel", true);
    for (const side of [-1, 1])
      this.box("desk pedestal", x + side * 1.1, 0.42, z, 0.55, 0.8, 1, "teal");
  }
  paper(id, x, z) {
    this.box("paper", x, 0.948, z, 0.4, 0.012, 0.3, "paper");
    this.interactive(id, "Read document", x, 1, z);
  }
  buildRooms() { for (const _ of this.roomSteps()) {} }
  *roomSteps() {
    this.roomTitle("01  SECURITY", -16.75, 18, -1);
    this.desk(-24, 18);
    this.box("key on desk", -23.4, 0.98, 18, 0.22, 0.06, 0.1, "yellow");
    this.interactive("key", "Take maintenance key", -23.4, 1, 18);
    this.paper("log", -24.5, 18);
    this.desk(-25, 13);
    this.box("CRT case", -25, 1.3, 13, 0.9, 0.78, 0.8, "dark");
    this.screen = this.sign(
      "OFFLINE",
      -25,
      1.35,
      13.42,
      0.72,
      0.36,
      Math.PI,
      "#a4d8b8",
      "#0c201b",
    );
    this.interactive("terminal", "Use security terminal", -25, 1.3, 13.7);
    this.box("security locker", -28, 1.15, 23, 1.4, 2.3, 0.8, "teal", true);
    this.sign("EVIDENCE", -28, 1.8, 23.42, 1.1, 0.25);
    this.interactive("release", "Read security evidence", -28, 1.2, 23.6);
    this.sign("NIGHT SHIFT / 00:17", -29.7, 2.5, 17, 3, 0.55, -Math.PI / 2);
    yield;
    this.roomTitle("02  STORAGE", -16.75, 45, -1);
    this.desk(-24, 44);
    this.paper("incident", -24, 44);
    for (const z of [38, 51]) {
      for (const y of [0.2, 1.3, 2.4])
        this.box("shelf", -27, y, z, 4, 0.12, 1.5, "steel");
      for (const x of [-28.9, -25.1])
        this.box("shelf upright", x, 1.3, z, 0.1, 2.7, 1.5, "dark", true);
    }
    yield;
    this.roomTitle("03  WORKSHOP", -16.75, 76, -1);
    this.desk(-23, 69);
    this.paper("workorder", -23, 69);
    this.box("fuse cabinet", -28, 1.4, 76, 0.8, 2, 2, "teal", true);
    this.sign("REPAIR SUPPLIES", -27.56, 1.7, 76, 1.5, 0.35, -Math.PI / 2);
    this.interactive("fuse", "Open fuse cabinet", -27.3, 1.2, 76);
    this.box("workbench", -26, 0.8, 82, 5, 1.6, 1.3, "steel", true);
    this.box("siren control", -16.7, 1.3, 73, 0.2, 0.6, 0.45, "yellow");
    this.interactive("alarm", "Test workshop siren", -16.2, 1.3, 73);
    this.box("grille handle", -16.7, 1.25, 79, 0.2, 0.5, 0.3, "red");
    this.interactive("trap", "Pull grille handle", -16.1, 1.3, 79);
    this.grilleRoot = new B.TransformNode("workshop grille", this.scene);
    this.grilleParts = [];
    for (let z = 74.3; z <= 77.7; z += 0.25) {
      const p = this.box("grille bar", -17, 2, z, 0.08, 3.8, 0.06, "steel");
      p.parent = this.grilleRoot;
      this.grilleParts.push(p);
    }
    this.grilleRoot.position.y = 3.7;
    this.grilleRect = {
      x: -17,
      z: 76,
      w: 0.3,
      d: 3.6,
      enabled: false,
      name: "workshop grille",
    };
    this.rects.push(this.grilleRect);
    yield;
    this.roomTitle("04  ELECTRICAL", 16.75, 39, 1);
    this.box("breaker cabinet", 28, 1.4, 39, 0.6, 2.3, 2.4, "steel", true);
    for (let z = 38.3; z < 40; z += 0.55)
      this.box("breaker switch", 27.65, 1.4, z, 0.2, 0.3, 0.2, "yellow");
    this.sign("POWER / B2", 27.6, 2.15, 39, 2, 0.45, Math.PI / 2);
    this.interactive("power", "Inspect breaker panel", 27.1, 1.4, 39);
    this.sign("VENT → LIGHT → ACCESS", 29.73, 2.7, 43, 3.4, 0.5, Math.PI / 2);
    yield;
    this.roomTitle("05  PUMP ROOM", 16.75, 98, 1);
    for (const x of [21, 26]) {
      this.cylinder("coolant tank", x, 1.3, 104, 2.1, 2.6, "teal", 12);
      this.rects.push({ x, z: 104, w: 1.95, d: 1.95, enabled: true });
    }
    const pipe = this.cylinder(
      "isolation pipe",
      28,
      1.4,
      98,
      0.2,
      4,
      "steel",
      8,
    );
    pipe.rotation.x = Math.PI / 2;
    this.valve = B.MeshBuilder.CreateTorus(
      "isolation wheel",
      { diameter: 0.8, thickness: 0.06, tessellation: 12 },
      this.scene,
    );
    this.valve.position.set(27.6, 1.4, 98);
    this.valve.rotation.z = Math.PI / 2;
    this.valve.material = this.materials.red;
    this.interactive("valve", "Release noisy pressure", 27.1, 1.4, 98);
    this.desk(23, 91);
    this.paper("dispatch", 23, 91);
    this.sign(
      "PRESSURE RELEASE / NOISE",
      29.73,
      2.7,
      98,
      4,
      0.55,
      Math.PI / 2,
    );
    // Player's car is loaded later; these anchors are independent of the art file.
    this.interactive("car", "Try your car", 10.6, 1.1, 73);
    this.sign("042", 16.72, 1.8, 78, 1, 0.4, Math.PI / 2, "#d9d0b4", "#273f3b");
  }
  buildWorker() {
    const root = new B.TransformNode("the contractor", this.scene);
    this.worker = root;
    const part = (name, x, y, z, w, h, d, mat) => {
      const m = this.box(name, x, y, z, w, h, d, mat);
      m.parent = root;
      return m;
    };
    part("work coat", 0, 1.17, 0, 0.54, 0.78, 0.28, "worker");
    part("shoulders", 0, 1.57, 0, 0.67, 0.22, 0.32, "worker");
    part("hood", 0, 1.9, 0, 0.34, 0.42, 0.34, "black");
    part("face", 0, 1.87, 0.17, 0.23, 0.24, 0.035, "skin");
    part("eyes", 0, 1.92, 0.194, 0.2, 0.045, 0.02, "black");
    this.workerLimbs = [];
    for (const s of [-1, 1]) {
      const leg = part("leg", s * 0.16, 0.48, 0, 0.21, 0.9, 0.23, "worker");
      this.workerLimbs.push(leg);
      const arm = part("arm", s * 0.4, 1.12, 0, 0.16, 0.91, 0.19, "worker");
      this.workerLimbs.push(arm);
      part("boot", s * 0.16, 0.07, 0.075, 0.24, 0.14, 0.39, "black");
    }
    root.position.set(0, 0, 50);
    root.setEnabled(false);
  }
  async loadAssets(onProgress) {
    const names = ["sedan", "hatchback", "van", "suv", "cone", "box", "maintenance-key-v114", ...Object.keys(PROP_SIZES)];
    let count = 0;
    await loadInBatches(names, async (name) => {
        try {
          this.containers[name] = await B.SceneLoader.LoadAssetContainerAsync(
            "assets/models/",
            name + ".glb",
            this.scene,
          );
          this.containers[name].removeAllFromScene();
        } catch (e) {
          console.warn("Model missing:", name, e);
          this.failedAssets ??= [];
          this.failedAssets.push(name);
        }
        count++;
        onProgress?.(count / names.length);
      }, 2);
    this.visuals.installKey(this.containers['maintenance-key-v114']);
    for (const {type,x,z,yaw} of PARKED_CARS) {
      const root=this.placeModel(type,x,z,yaw,1.5);
      const bounds=root.metadata?.placement;
      if(bounds) {
        this.rects.push({...bounds,name:type,enabled:true});
        const shadow=this.materials.contact??this.material("contact","#060e11");
        shadow.alpha=.28;
        const g=B.MeshBuilder.CreateGround("car contact",{width:bounds.w*.94,height:bounds.d*.94},this.scene);
        g.position.set(bounds.x,.008,bounds.z);g.material=shadow;g.isPickable=false;
      }
      await yieldTask();
    }
    for (const [x, z] of [
      [-15, 68],
      [-15, 82],
      [6, 3],
      [7, 3],
      [8, 3],
      [20, 34],
    ]) { this.placeModel("cone", x, z, 0, 0.8); await yieldTask(); }
    for (const [x, z] of [
      [-23, 37],
      [-23, 50.5],
      [-23, 52],
      [25, 32],
      [-28, 68],
    ]) { this.placeModel("box", x, z, 0, 1); await yieldTask(); }
    for(const prop of PROP_LAYOUT){
      const [name,x,z,yaw,scale,y]=prop;
      const root=this.placeModel(name,x,z,yaw,scale,y);
      this.rects.push({...propCollider(...prop),...root.metadata?.placement});await yieldTask();
    }
    this.interactive("van", "Inspect the grey van", -9.5, 1.2, 98);
    this.details=new Details(this);await this.details.load();
    this.richDetails=new RichDetails(this);await this.richDetails.load();
    this.equipment.bindSource();
    for(const f of this.lights)if(f.range&&f.range<=5)f.emergency=true;
    this.placements.resolve();
  }
  placeModel(name, x, z, rotation = 0, scale = 1, y = 0) {
    const c = this.containers[name];
    if (!c) {
      const size=PROP_SIZES[name]||[1,1,1];
      const fallback=this.box("asset fallback " + name,x,y+size[1]*scale/2,z,size[0]*scale,size[1]*scale,size[2]*scale,"steel");
      fallback.rotation.y=rotation;groundModel(fallback,x,z,y);return fallback;
    }
    const inst = c.instantiateModelsToScene((n) => name + " " + n, false, {
      doNotInstantiate: true,
    });
    const root = new B.TransformNode(name + " placed", this.scene);
    for (const n of inst.rootNodes) n.parent = root;
    root.position.set(x, y, z);
    root.rotation.y = rotation;
    root.scaling.setAll(scale);
    for (const m of root.getChildMeshes()) {
      m.metadata = {...m.metadata, lvCaster:["sedan","hatchback","van","suv"].includes(name)};
      m.isPickable = false;
      m.receiveShadows = true;
      this.shadow.addShadowCaster(m);
      if (m.material) {
        m.material.maxSimultaneousLights = 7;
        if ("roughness" in m.material) m.material.roughness = 0.82;
        if(PROP_SIZES[name]&&m.material.albedoColor)m.material.albedoColor=new B.Color3(.64,.72,.66);
      }
    }
    groundModel(root,x,z,y);
    return root;
  }
  sync(state, immediate = true) {
    this.visibleRoom=null;this.updateRoomVisibility({x:0,z:50},1);
    this.powered = state.flags.includes("power");
    this.lightingPhase=lightingPhase(state);
    this.hemi.intensity=ambientPower(this.lightingPhase);
    for(const f of this.lights)if(f.diffuserMaterial)f.diffuserMaterial.emissiveColor.copyFrom(f.color).scaleInPlace(fixturePower(f,this.lightingPhase)*.7);
    this.exitOpen = state.flags.includes("gate");
    this.grilleClosed = false;
    this.visuals.sync(state, immediate);
    this.stage.sync(state, immediate);
    if(immediate){this.atmosphere.reset(state);this.surfaces?.reset();this.equipment?.reset(state);}
    for (const [index, door] of this.shortcuts.entries()) {
      const open = state.flags.includes("key") ;
      const target = open ? 5.8 : 1.8;
      const apply = (y) => { door.mesh.position.y = y; door.rect.enabled = y < 4.1; };
      if (immediate) apply(target);
      else if (door.open !== open) this.visuals.animator.to("shortcut" + index, door.mesh.position.y, target, 0.8, apply);
      door.open = open;
    }
  }

  setSettings(s) {
    this.detailLevel=s.quality==='low'?0:s.quality==='high'?2:1;this.visibleRoom=null;
    this.richDetails?.setSettings(s);
    this.atmosphere?.setSettings(s);
    if(this.surfaceQuality!==s.quality){this.surfaces?.apply(s);this.surfaceQuality=s.quality;}
    this.camera.fov = (s.fov * Math.PI) / 180;
    this.scene.imageProcessingConfiguration.exposure = s.brightness;
    // Changing audio or sensitivity does not recreate GPU textures/post-processes.
    const shadows = s.shadows ?? (s.quality === "low" ? "off" : s.quality === "high" ? "high" : "medium");
    const size = shadows === "high" ? 1024 : 512;
    if (this.appliedShadowSize !== size) {
      this.shadow.getShadowMap()?.resize(size); this.appliedShadowSize = size;
    }
    this.flash.shadowEnabled = shadows !== "off";
    this.glow.isEnabled = s.glow ?? s.quality !== "low";
    this.glow.intensity = s.reducedFlashes ? 0.15 : 0.28;
    if (s.fxaa && !this.fxaa) this.fxaa = new B.FxaaPostProcess("optional FXAA", 1, this.camera);
    if (!s.fxaa && this.fxaa) { this.fxaa.dispose(this.camera); this.fxaa = null; }
    this.scene.fogDensity = 0.019;
  }
  async warmup(report = () => {}, options = {}) {
    const savedPosition=this.camera.position.clone(), savedRotation=this.camera.rotation.clone();
    const workerEnabled=this.worker.isEnabled(), hand=this.visuals.hand.isEnabled(), action=this.visuals.actionHand.isEnabled();
    const cockpit=this.stage.cockpit.isEnabled();this.stage.cockpit.setEnabled(true);this.atmosphere.prepare(true);this.surfaces?.prepare(true);this.equipment?.prepare(true);
    this.worker.setEnabled(true); this.visuals.hand.setEnabled(true); this.visuals.actionHand.setEnabled(true);
    const views=[[10,98,Math.PI],[-23,18,Math.PI],[-23,45,0],[-23,76,-Math.PI/2],[24,39,Math.PI/2],[24,98,Math.PI/2],[0,7,Math.PI]];
    const started=performance.now();
    try {
      for (let i=0;i<views.length;i++) {
        const [x,z,yaw]=views[i]; this.camera.position.set(x,1.68,z); this.camera.rotation.set(0,yaw,0);
        this.updateLights({x,z},0,false,0,true);
        this.flash.intensity=950; this.spill.intensity=90;
        report("Preparing lighting · room "+(i+1)+" / "+views.length, .67+.25*i/views.length);
        await yieldTask();
        // Prepare all visible submeshes, textures, shadow/post-process render
        // targets and skeleton layouts. Missing readiness is never called success.
        await waitForReady(()=>{
          this.scene.render();
          return this.scene.isReady(true);
        }, {label:"Room "+(i+1)+" lighting", ...options});
        this.flash.intensity=0; this.spill.intensity=0;
        this.scene.render();
      }
      report("Preparing animations", .94);
      for(const group of Object.values(this.visuals.clips)) {
        group.goToFrame((group.from+group.to)/2); this.scene.render(); await yieldTask(); group.goToFrame(group.from); group.pause();
      }
      // Cache the cockpit/headlight material variant too. It must not compile
      // for the first time just as the final chase reaches the car.
      this.stage.setVehicleLighting(true);
      this.camera.position.copyFrom(B.Vector3.TransformCoordinates(this.stage.driverEye,this.stage.car.computeWorldMatrix(true)));
      this.camera.rotation.set(0,this.stage.car.rotation.y,0);this.stage.driving=true;
      this.flash.intensity=520;this.spill.intensity=360;
      await waitForReady(()=>{this.scene.render();return this.scene.isReady(true);},{label:'Escape headlights',...options});
      this.stage.driving=false;this.stage.setVehicleLighting(false);
      this.preparation={ready:true,rooms:views.length,milliseconds:Math.round(performance.now()-started)};
    } finally {
      this.stage.driving=false;this.stage.setVehicleLighting(false);
      this.stage.cockpit.setEnabled(cockpit);this.atmosphere.prepare(false);this.surfaces?.prepare(false);this.equipment?.prepare(false);
      this.worker.setEnabled(workerEnabled); this.visuals.hand.setEnabled(hand); this.visuals.actionHand.setEnabled(action);
      this.camera.position.copyFrom(savedPosition); this.camera.rotation.copyFrom(savedRotation);
      this.visuals.setFlash(false); this.flash.intensity=0; this.spill.intensity=0;
      this.scene.resetLastAnimationTimeFrame();
    }
  }
  updateLights(pos, time, flashOn = true, scare = 0, immediate = false) {
    this.visuals.setFlash(flashOn);
    const dt=Math.max(0,Math.min(.1,time-(this.lightTime??time))); this.lightTime=time;
    const zone=roomAt(pos),boundary=zone!==this.lightZone;
    if (immediate || boundary || !this.lightSelectionPosition || Math.hypot(pos.x-this.lightSelectionPosition.x,pos.z-this.lightSelectionPosition.z)>.65) {
      const nearest=selectFixtures(this.lights,pos);
      const assigned=new Set();
      for(const slot of this.lightPool) if(nearest.includes(slot.target)) assigned.add(slot.target); else slot.target=null;
      for(const slot of this.lightPool) if(!slot.target) {slot.target=nearest.find(f=>!assigned.has(f))||null; assigned.add(slot.target);}
      this.lightSelectionPosition={x:pos.x,z:pos.z};this.lightZone=zone;
    }
    const blend=immediate?1:1-Math.exp(-dt*22);
    for(const slot of this.lightPool) {
      if (slot.current!==slot.target) {
        // Transfer the reusable slot immediately, then settle its brightness.
        // No fade-to-black wait while the player stands inside a doorway.
        slot.current=slot.target;slot.level=immediate?1:.6;
        if(slot.current){slot.light.position.set(slot.current.x,slot.current.y??3.7,slot.current.z);slot.light.diffuse.copyFrom(slot.current.color);slot.light.range=slot.current.range??(roomAt(slot.current)==="garage"?11:6);}
      }
      slot.level+=((slot.current?1:0)-slot.level)*blend;
      if(immediate)slot.level=slot.current?1:0;
      slot.light.intensity=(slot.current?.base || 0)*slot.level*fixturePower(slot.current||{x:0,z:0},this.lightingPhase||"arrival")*(scare?Math.max(.2,1-scare):1)*(1-Math.sin(Math.PI*Math.min(1,(this.atmosphere?.blackoutTime||0)/2))*(this.atmosphere?.settings?.reducedFlashes?.28:.82));
    }
  }
  showWaypoint(destination, player, seconds, time, inRoom) {
    this.waypoint.setEnabled(!!destination && seconds > 0);
    if (!destination || seconds <= 0) return;
    const [x, z] = inRoom ? [destination.x, destination.z] : destination.portal;
    this.waypoint.position.set(x, 0.055, z);
    this.waypoint.scaling.setAll(1 + Math.sin(time * 3) * 0.07);
  }
  menuCamera(time) {
    this.camera.position.set(3.1 + Math.sin(time * 0.07) * 0.65, 1.55, 80.7);
    this.camera.setTarget(new B.Vector3(12, 1.45, 71));
    this.updateLights(this.camera.position, time, false);
  }
  /** Merge static meshes by material and 25m sector. This reduces draw calls while
   * preserving useful frustum-culling bounds. Dynamic gates and the actor stay
   * separate. Collision rectangles are independent and therefore unchanged. */
  optimizeStatic() { for (const _ of this.optimizationSteps()) {} }
  async optimizeAsync() { await consumeSteps(this.optimizationSteps()); }
  *optimizationSteps() {
    const excluded = new Set([
      this.exitGate,
      this.valve,
      ...this.exitRibs.map((r) => r.mesh),
    ]);
    const isDynamic = (m) => {
      for (let n = m; n; n = n.parent)
        if (
          n === this.worker ||
          n === this.grilleRoot ||
          excluded.has(n) ||
          this.visuals.dynamicRoots.has(n)
        )
          return true;
      return false;
    };
    const groups = new Map();
    for (const m of [...this.scene.meshes]) {
      if (!m.geometry || !m.material || isDynamic(m)) continue;
      m.computeWorldMatrix(true);
      const key =
        m.material.uniqueId + ":" + roomAt(m.getAbsolutePosition()) + ":" + Math.floor(m.getAbsolutePosition().z / 25) + ":" + !!m.metadata?.lvCaster + ':' + (m.metadata?.detailQuality||0);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    this.roomBatches=[];
    for (const meshes of groups.values()) {
      const zone=roomAt(meshes[0].getAbsolutePosition()),detailQuality=meshes[0].metadata?.detailQuality||0;
      let batch=meshes[0];
      if (meshes.length > 1) {
        const merged = B.Mesh.MergeMeshes(
          meshes,
          true,
          true,
          undefined,
          false,
          false,
        );
        if (merged) {
          batch=merged;
          merged.name = "static sector · "+zone;
          merged.metadata={lvCaster:!!meshes[0].metadata?.lvCaster,detailQuality};
          merged.isPickable = false;
          merged.receiveShadows = true;
          merged.freezeWorldMatrix();
        }
      } else meshes[0].freezeWorldMatrix();
      this.roomBatches.push({mesh:batch,zone,detailQuality,enabled:true});
      yield;
    }
    this.shadow.getShadowMap().renderList = [];
    for (const m of this.scene.meshes)
      if (
        m.geometry &&
        m.metadata?.lvCaster &&
        m.isEnabled() &&
        !m.isDescendantOf(this.visuals.hand) &&
        !m.isDescendantOf(this.visuals.actionHand) &&
        !m.isDescendantOf(this.visuals.focus)
      )
        this.shadow.addShadowCaster(m);
    // Hidden actor meshes need to be registered before they become visible.
    for (const m of this.worker.getChildMeshes())
      this.shadow.addShadowCaster(m);
    this.shadowCasterCount=this.shadow.getShadowMap().renderList.length;
    this.scene.skipPointerMovePicking = true;
  }
  /** Conservative room culling, sampled at 4 Hz. Keep the main garage and
   * adjacent west rooms visible through every doorway; ordinary Babylon frustum
   * culling remains active inside each material/room/sector batch. */
  updateRoomVisibility(pos,dt){
    this.visibilityTimer=(this.visibilityTimer||0)-dt;if(this.visibilityTimer>0)return;this.visibilityTimer=.25;
    const room=roomAt(pos);if(room===this.visibleRoom)return;this.visibleRoom=room;
    const west=["security","storage","workshop"],index=west.indexOf(room);
    for(const batch of this.roomBatches||[]){
      const visible=batch.detailQuality<=(this.detailLevel??0)&&(room==="garage"||batch.zone==="garage"||batch.zone===room||(index>=0&&Math.abs(west.indexOf(batch.zone)-index)===1&&west.includes(batch.zone)));
      if(visible!==batch.enabled){batch.mesh.setEnabled(visible);batch.enabled=visible;}
    }
  }
  renderBudgetReport(){
    const rooms={};
    for(const b of this.roomBatches||[]){const room=rooms[b.zone]||={batches:0,triangles:0,shadowBatches:0};room.batches++;room.triangles+=(b.mesh.getTotalIndices?.()||0)/3;if(b.mesh.metadata?.lvCaster)room.shadowBatches++;}
    return {rooms,limits:{garage:{batches:300,triangles:150000},serviceRoom:{batches:120,triangles:50000},fixtureLightSlots:4,enemyPathNodesPerSlice:128,audioVoices:24},dynamicRoots:this.visuals.dynamicRoots.size,shadowCasters:this.shadowCasterCount||0};
  }
  dispose() {
    this.scene.dispose();
  }
}
