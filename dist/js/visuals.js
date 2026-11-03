import { AttentionOverlay } from "./attention.js?v=1.14.0";
import { yieldTask } from "./preparation.js?v=1.14.0";
import { FootfallTracker } from "./presentation.js?v=1.14.0";
import { Animator, ease } from "./animation.js?v=1.14.0";
const B = globalThis.BABYLON;

/** Dynamic presentation stays separate from static batching. Everything in
 * dynamicRoots remains movable; collision continues to live in world.rects. */
export class Visuals {
  constructor(world, {defer=false} = {}) {
    this.w = world;
    this.scene = world.scene;
    this.animator = new Animator();
    this.dynamicRoots = new Set();
    this.actionPhase = 0;
    this.actionId = "";
    this.flashLevel = 0;
    this.flashWanted = false;
    this.equip = 0;
    this.gameplay = false;
    this.clipWeights = {};
    this.clips = {};
    this.actorClip = "Idle";
    this.footfalls = new FootfallTracker();
    this.fans = [];
    this.drips = [];
    if(!defer) for(const name of ["makeViewModel","makeActionHand","makeInteractables","makeEnvironment","makeFocusCue"]) this[name]();
  }
  async buildAsync() {
    for(const name of ["makeViewModel","makeActionHand","makeInteractables","makeEnvironment","makeFocusCue"]) { await yieldTask(); this[name](); }
  }
  root(name, parent = null) {
    const root = new B.TransformNode(name, this.scene);
    root.parent = parent;
    this.dynamicRoots.add(root);
    return root;
  }
  box(name, parent, x, y, z, w, h, d, material) {
    const m = this.w.box(name, x, y, z, w, h, d, material);
    m.parent = parent;
    return m;
  }
  cylinder(name, parent, x, y, z, diameter, height, material, segments = 10) {
    const m = this.w.cylinder(
      name,
      x,
      y,
      z,
      diameter,
      height,
      material,
      segments,
    );
    m.parent = parent;
    return m;
  }
  makeViewModel() {
    const w = this.w;
    w.material("glove", "#2c3d3d", 0.85);
    w.material("torchBody", "#26393d", 0.55);
    w.material("torchRim", "#8c9b94", 0.4);
    w.material("torchLens", "#d5dec9", 0.25, "#75816b");
    this.hand = this.root("first person flashlight", w.camera);
    this.hand.position.set(0.27, -0.23, 0.48);
    this.box("sleeve", this.hand, 0, -0.15, -0.08, 0.15, 0.24, 0.19, "worker");
    const palm = this.box(
      "gloved hand",
      this.hand,
      0,
      -0.025,
      0,
      0.115,
      0.14,
      0.15,
      "glove",
    );
    palm.rotation.x = -0.18;
    for (let i = 0; i < 3; i++)
      this.box(
        "glove knuckle",
        this.hand,
        0.057,
        -0.038 + i * 0.032,
        0.055,
        0.045,
        0.026,
        0.08,
        "glove",
      );
    const body = this.cylinder(
      "torch barrel",
      this.hand,
      0,
      0.08,
      0.05,
      0.105,
      0.34,
      "torchBody",
      12,
    );
    body.rotation.x = Math.PI / 2;
    const head = this.cylinder(
      "torch bezel",
      this.hand,
      0,
      0.08,
      0.23,
      0.17,
      0.08,
      "torchRim",
      12,
    );
    head.rotation.x = Math.PI / 2;
    const lens = this.cylinder(
      "torch glass",
      this.hand,
      0,
      0.08,
      0.275,
      0.139,
      0.012,
      "torchLens",
      16,
    );
    lens.rotation.x = Math.PI / 2;
    this.lens = lens;
    this.flashSwitch = this.box(
      "torch switch",
      this.hand,
      0,
      0.137,
      0.02,
      0.038,
      0.014,
      0.055,
      "black",
    );
    for (const m of this.hand.getChildMeshes()) {
      m.renderingGroupId = 2;
      m.receiveShadows = false;
      m.isPickable = false;
      w.shadow.removeShadowCaster(m);
      w.flash.excludedMeshes.push(m);
      w.spill.excludedMeshes.push(m);
    }
    // First-person mesh draws after world depth, like a conventional view model.
    // Its short reach and lowered pose keep it off the crosshair and interaction area.
    this.scene.setRenderingAutoClearDepthStencil(2, true, true, false);
    this.hand.setEnabled(false);
  }
  makeActionHand() {
    // A separate empty hand can reach while the flashlight is put away. The
    // flashlight itself never appears merely because an interaction started.
    const w = this.w;
    this.actionHand = this.root("interaction hand", w.camera);
    this.box(
      "reaching sleeve",
      this.actionHand,
      0,
      -0.13,
      -0.06,
      0.14,
      0.26,
      0.16,
      "worker",
    );
    this.box(
      "reaching glove",
      this.actionHand,
      0,
      0,
      0.015,
      0.13,
      0.14,
      0.14,
      "glove",
    );
    for (let i = 0; i < 3; i++)
      this.box(
        "reaching fingers",
        this.actionHand,
        -0.035 + i * 0.036,
        0.07,
        0.05,
        0.03,
        0.075,
        0.07,
        "glove",
      );
    for (const m of this.actionHand.getChildMeshes()) {
      m.renderingGroupId = 2;
      m.receiveShadows = false;
      m.isPickable = false;
      w.shadow.removeShadowCaster(m);
      w.flash.excludedMeshes.push(m);
      w.spill.excludedMeshes.push(m);
    }
    this.repairTool=this.root("repair wrench jaw pivot",this.actionHand);
    this.box("wrench handle",this.repairTool,-.12,0,0,.24,.025,.035,"steel");
    for(const z of [-.035,.035])this.box("wrench jaw",this.repairTool,.015,0,z,.065,.025,.018,"steel");
    for(const mesh of this.repairTool.getChildMeshes()){mesh.renderingGroupId=2;mesh.receiveShadows=false;w.flash.excludedMeshes.push(mesh);w.spill.excludedMeshes.push(mesh);}
    this.repairTool.setEnabled(false);
    this.actionFingers=this.actionHand.getChildMeshes().filter(m=>m.name==="reaching fingers");
    this.actionLocal=new B.Vector3();this.actionWorld=new B.Vector3();
    this.actionHand.setEnabled(false);
  }
  makeInteractables() {
    const w = this.w;
    // Replace the solid fuse-cabinet visual with an actual framed compartment.
    const original = this.scene.getMeshByName("fuse cabinet");
    original?.dispose();
    w.box("cabinet back", -28.35, 1.4, 76, 0.1, 2, 2, "teal");
    w.box("cabinet ceiling", -28, 2.38, 76, 0.8, 0.08, 2, "steel");
    w.box("cabinet bottom", -28, 0.42, 76, 0.8, 0.08, 2, "steel");
    for (const z of [75.04, 76.96])
      w.box("cabinet side", -28, 1.4, z, 0.8, 2, 0.08, "teal");
    this.cabinetDoor = this.root("fuse cabinet hinge");
    this.cabinetDoor.position.set(-27.54, 0.45, 75.04);
    this.box(
      "fuse cabinet door",
      this.cabinetDoor,
      0,
      0.95,
      0.94,
      0.075,
      1.9,
      1.86,
      "teal",
    );
    this.box(
      "cabinet handle",
      this.cabinetDoor,
      0.07,
      0.9,
      1.68,
      0.09,
      0.23,
      0.06,
      "yellow",
    );
    this.fuse = this.root("replacement fuse");
    this.fuse.position.set(-27.86, 1.1, 76);
    this.cylinder("ceramic fuse", this.fuse, 0, 0, 0, 0.1, 0.35, "paper", 10);
    for (const y of [-0.18, 0.18])
      this.cylinder(
        "copper fuse cap",
        this.fuse,
        0,
        y,
        0,
        0.115,
        0.065,
        "yellow",
        10,
      );
    this.key = this.scene.getMeshByName("key on desk");
    if (this.key) this.dynamicRoots.add(this.key);
    // Keep the authored collider, but give the locker a real open compartment.
    this.scene.getMeshByName("security locker")?.dispose();
    w.box("locker back", -28, 1.15, 22.65, 1.4, 2.3, 0.08, "teal");
    for (const x of [-28.66, -27.34])
      w.box("locker side", x, 1.15, 23, 0.08, 2.3, 0.8, "teal");
    for (const y of [0.04, 2.26])
      w.box("locker cap", -28, y, 23, 1.4, 0.08, 0.8, "teal");
    this.releaseKey = this.root("release key");
    this.releaseKey.position.set(-28, 1.2, 23.1);
    this.box(
      "release key blade",
      this.releaseKey,
      0,
      0,
      0,
      0.07,
      0.3,
      0.035,
      "yellow",
    );
    this.cylinder(
      "release key head",
      this.releaseKey,
      0,
      0.18,
      0,
      0.16,
      0.04,
      "yellow",
      8,
    ).rotation.x = Math.PI / 2;
    this.lockerDoor = this.root("override locker hinge");
    this.lockerDoor.position.set(-28.68, 0, 23.47);
    this.box(
      "locker front",
      this.lockerDoor,
      0.68,
      1.15,
      0,
      1.35,
      2.28,
      0.07,
      "teal",
    );
    this.box(
      "locker pull",
      this.lockerDoor,
      1.1,
      1.15,
      0.06,
      0.06,
      0.25,
      0.08,
      "yellow",
    );
    const plate = this.scene.getMeshByName("sign OVERRIDE");
    if (plate) {
      plate.parent = this.lockerDoor;
      plate.position.set(0.68, 1.8, 0.05);
    }

    this.breakers = [];this.breakerHandles=[];
    for (const [i, z] of [38.3, 38.85, 39.4].entries()) {
      const old = this.scene.meshes.find(
        (m) => m.name === "breaker switch" && Math.abs(m.position.z - z) < 0.1,
      );
      old?.dispose();
      const root = this.root("breaker pivot " + i);
      root.position.set(27.6, 1.4, z);
      this.breakerHandles.push(this.box("breaker handle", root, -0.08, 0, 0, 0.22, 0.27, 0.12, "yellow"));
      this.breakers.push(root);
      this.box(
        "circuit status " + i,
        root,
        -0.03,
        0.28,
        0,
        0.03,
        0.07,
        0.07,
        "red",
      );
    }
    this.valve = w.valve;
    this.dynamicRoots.add(this.valve);
    for (let i = 0; i < 3; i++) {
      const spoke = this.box(
        "valve spoke",
        this.valve,
        Math.sin((i * Math.PI * 2) / 3) * 0.16,
        0,
        Math.cos((i * Math.PI * 2) / 3) * 0.16,
        0.045,
        0.045,
        0.34,
        "red",
      );
      spoke.rotation.y = (i * Math.PI * 2) / 3;
    }
    this.cylinder("valve hub", this.valve, 0, 0, 0, 0.14, 0.09, "steel", 10);
    this.dynamicRoots.add(w.exitGate);
    for (const rib of w.exitRibs) this.dynamicRoots.add(rib.mesh);
    this.dynamicRoots.add(w.grilleRoot);
  }
  makeEnvironment() {
    const w = this.w;
    // Fans, pipes, and a few falling drops supply subtle motion without particle
    // simulation or hundreds of transparent layers.
    for (const [x, z] of [
      [-24, 80],
      [23, 42],
    ]) {
      w.cylinder("ventilation surround", x, 3.84, z, 0.94, 0.15, "dark", 12);
      const rotor = this.root("vent fan rotor");
      rotor.position.set(x, 3.73, z);
      for (let i = 0; i < 4; i++) {
        const blade = this.box(
          "fan blade",
          rotor,
          Math.sin((i * Math.PI) / 2) * 0.2,
          0,
          Math.cos((i * Math.PI) / 2) * 0.2,
          0.16,
          0.035,
          0.48,
          "steel",
        );
        blade.rotation.y = (i * Math.PI) / 2;
      }
      this.fans.push(rotor);
    }
    for (let i = 0; i < 5; i++) {
      const d = B.MeshBuilder.CreateSphere(
        "water drop",
        { diameter: 0.018, segments: 4 },
        this.scene,
      );
      d.material = w.materials.cool;
      d.isPickable = false;
      this.dynamicRoots.add(d);
      this.drips.push({ mesh: d, phase: i * 0.83 });
    }
    // Physical clues around the sabotaged car and service area.
    w.sign(
      "ACCESS REVOKED",
      -29.72,
      2.05,
      21,
      1.8,
      0.42,
      -Math.PI / 2,
      "#cfb082",
      "#303a36",
    );
    for (let i = 0; i < 8; i++) {
      const ticket = w.box(
        "discarded ticket",
        -23 + (i % 4) * 0.25,
        0.02,
        78 + Math.floor(i / 4) * 0.33,
        0.13,
        0.01,
        0.25,
        "paper",
      );
      ticket.rotation.y = i * 0.47;
    }
    for (let i = 0; i < 3; i++) {
      const tool = w.box(
        "abandoned wrench",
        -25 + i * 0.35,
        1.63,
        82,
        0.08,
        0.03,
        0.5,
        "steel",
      );
      tool.rotation.y = 0.6 * i;
    }
    // Dedicated small lamps make doorway locations readable in the dark.
    for (const [x, z, mat] of [
      [-16.6, 18, "green"],
      [-16.6, 45, "warm"],
      [-16.6, 76, "warm"],
      [16.6, 39, "warm"],
      [16.6, 98, "cool"],
    ])
      w.box("door marker", x, 2.75, z, 0.09, 0.12, 1.8, mat);
  }
  makeFocusCue() {
    const m = B.MeshBuilder.CreateTorus(
      "interaction focus",
      { diameter: 0.16, thickness: 0.009, tessellation: 24 },
      this.scene,
    );
    m.rotation.x = Math.PI / 2;
    m.material = this.w.materials.warm;
    m.isPickable = false;
    m.setEnabled(false);
    // Torus originally lies on XZ; parent plane can billboard independently.
    this.focus = this.root("interaction marker");
    m.parent = this.focus;
    m.position.setAll(0);
    this.focus.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    this.focus.setEnabled(false);
    m.setEnabled(true);
  }
  async loadActor() {
    try {
      const container = await B.SceneLoader.LoadAssetContainerAsync(
        "assets/models/",
        "attendant.glb",
        this.scene,
      );
      container.addAllToScene();
      const wrapper = this.root("animated Attendant");
      for (const node of container.rootNodes) node.parent = wrapper;
      // glTF loader preserves its conversion root. A separate authored yaw aligns
      // this model's forward direction with the controller's +Z heading.
      const orientation = this.root("Attendant facing", wrapper);
      for (const node of container.rootNodes) node.parent = orientation;
      orientation.rotation.y = 0; // Verified loader conversion preserves this file’s +Z front.
      const fallback = this.w.worker;
      this.w.worker = wrapper;
      fallback.dispose(false, false);
      for (const mesh of wrapper.getChildMeshes()) {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        this.w.shadow.addShadowCaster(mesh);
        if (mesh.material) {
          mesh.material.maxSimultaneousLights = 7;
          mesh.material.roughness = 0.94;

        }
      }
      for (const group of container.animationGroups) {
        this.clips[group.name] = group;
        this.clipWeights[group.name] = group.name === "Idle" ? 1 : 0;
        group.stop();
        group.start(true);
        group.setWeightForAllAnimatables(this.clipWeights[group.name]);
      }
      // The creature includes authored headgear, hands and weighted clothing.
      // Preserve its embedded palette and use its real skeletal clips.
      wrapper.setEnabled(false);
      this.attention=new AttentionOverlay(this.scene,wrapper,container.transformNodes);
      this.actorLoaded = true;
      this.actorClips = container.animationGroups.map((a) => a.name);
    } catch (error) {
      this.actorLoaded = false;
      console.warn("Animated Attendant failed to load", error);
    }
  }
  setActorMotion(name, speed = 0, phase = undefined) {
    const next=this.clips[name]?name:"Idle";
    if(next!==this.actorClip){
      this.footfalls.reset();
      const gait=new Set(['Walk','Run','Stalk']);
      if(gait.has(this.actorClip)&&gait.has(next)){
        const old=this.clips[this.actorClip],phase=(old.getCurrentFrame()-old.from)/Math.max(1,old.to-old.from);
        this.clips[next].goToFrame(this.clips[next].from+phase*(this.clips[next].to-this.clips[next].from));
      }
      // StartRun was authored to join the first frame of Run. Resume that
      // frame rather than a phase left over from an earlier pursuit.
      if(this.actorClip==="StartRun"&&next==="Run")this.clips[next].goToFrame(this.clips[next].from);
    }
    this.actorClip=next;this.actorPhase=Number.isFinite(phase)?Math.max(0,Math.min(1,phase)):null;
    const group=this.clips[next];
    // Damage/impact clocks own one-shot poses, so attacks cannot desynchronize
    // at 30/60/144 FPS or keep striking after the game is paused.
    if(group)group.speedRatio=this.actorPhase!==null?0:speed>0?Math.max(.06,Math.min(1.65,speed/(next==="Run"?3.1:next==="Stalk"?.535:1.35))):1;
  }
  installKey(container){
    if(!container)return;
    if(this.key){this.dynamicRoots.delete(this.key);this.key.dispose();}
    this.key=this.root('maintenance key on Security desk');
    const instance=container.instantiateModelsToScene(n=>'quest '+n,false,{doNotInstantiate:true});
    for(const n of instance.rootNodes)n.parent=this.key;
    this.key.position.set(-23.4,.925,18);this.keyHome=this.key.position.clone();
    this.keyGrip=this.key.getDescendants().find(n=>n.name.endsWith('__grip'));
    let lo=new B.Vector3(Infinity,Infinity,Infinity),hi=new B.Vector3(-Infinity,-Infinity,-Infinity);
    for(const mesh of this.key.getChildMeshes()){
      mesh.isPickable=false;mesh.receiveShadows=true;
      if(mesh.material)mesh.material.maxSimultaneousLights=7;
      if(!mesh.getTotalVertices())continue;mesh.computeWorldMatrix(true);
      const b=mesh.getBoundingInfo().boundingBox;lo=B.Vector3.Minimize(lo,b.minimumWorld);hi=B.Vector3.Maximize(hi,b.maximumWorld);
    }
    this.key.metadata={supportY:.925,placement:{x:(lo.x+hi.x)/2,y:(lo.y+hi.y)/2,z:(lo.z+hi.z)/2,w:hi.x-lo.x,h:hi.y-lo.y,d:hi.z-lo.z,bottom:lo.y}};
    this.w.placements.record('quest:maintenance-key',this.key,{support:'Security desk',supportY:.925});
  }
  actorFootstep() {
    const group = this.clips[this.actorClip];
    if (!this.actorPlaying || !group || this.clipWeights[this.actorClip] < .6) { this.footfalls.reset(); return false; }
    return this.footfalls.sample(this.actorClip, group.getCurrentFrame(), group.from, group.to);
  }
  focusOn(item, enabled) {
    this.focus.setEnabled(!!item && enabled);
    if (item) this.focus.position.copyFrom(item.pos);
  }
  setGameplay(active) {
    this.gameplay = active;
    if (!active) {
      this.hand.setEnabled(false);
      this.actionHand.setEnabled(false);
      this.focus.setEnabled(false);
    }
  }
  setFlash(on) {
    if (on !== this.flashWanted) {
      // Reverse from the current position if F is pressed during equip/holster.
      this.animator.to(
        "equipment",
        this.equip,
        on ? 1 : 0,
        on ? 0.38 : 0.28,
        (t) => (this.equip = t),
        () => {},
        "cinematic",
      );
      this.animator.to(
        "flashswitch",
        0,
        1,
        0.18,
        (t) =>
          (this.flashSwitch.position.y = 0.137 - Math.sin(t * Math.PI) * 0.009),
      );
    }
    this.flashWanted = on;
  }
  action(id, duration, done, onCue = () => {}) {
    this.actionId = id;
    this.actionPhase = 0;
    this.actionTarget=this.w.interactives.find(item=>item.id===id)?.pos || null;
    let sounded = false;
    const phase = (t, start, end) =>
      ease.cinematic(Math.max(0, Math.min(1, (t - start) / (end - start))));
    this.animator.to(
      "interaction",
      0,
      1,
      duration,
      (t) => {
        this.actionPhase = t;
        this.w.stage?.action(id,t);
        if (id === "fuse") {
          this.cabinetDoor.rotation.y = phase(t, 0.06, 0.68) * 1.48;
          const grab = phase(t, 0.58, 1);
          this.fuse.position.set(-27.86 + grab * 0.55, 1.1 + grab * 0.17, 76);
          this.fuse.scaling.setAll(1 - grab * 0.7);
        }
        if (id === "key" && this.key) {
          const grab = phase(t, 0.12, 0.94);
          this.key.position.y = (this.keyHome?.y??.98) + grab * 0.22;
          this.key.rotation.y = grab * 0.5;
          this.key.scaling.setAll(1); // Keep the real ring and tag dimensions while lifting.
        }
        if (id === "release") {
          this.lockerDoor.rotation.y = -phase(t, 0.06, 0.68) * 1.25;
          const grab = phase(t, 0.58, 1);
          this.releaseKey.position.z = 23.1 + grab * 0.4;
          this.releaseKey.scaling.setAll(1 - grab * 0.7);
        }
        if (id === "valve")
          this.valve.rotation.x = phase(t, 0.06, 0.96) * Math.PI * 2;
        if (id === "gate") this.setGate(phase(t, 0.08, 0.96));
        if (id === "trap") {
          // Accelerating drop followed by one small mechanical settling movement.
          const drop = Math.min(1, t / 0.82) ** 2;
          this.setGrille(drop);
          if (t > 0.82)
            this.w.grilleRoot.position.y +=
              Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.045;
        }
        const impact = id === "battery" ? .34 : id === "repair" ? .64 : id === "trap" ? .82 : id === "gate" ? .96 : .68;
        if (!sounded && t >= impact) {
          sounded = true;
          onCue("impact");
        }
      },
      () => {
        this.actionId = "";
        this.actionPhase = 0;
        done();
      },
      "linear",
    );
  }
  switchCircuit(index, on, done=()=>{}, onContact=()=>{}) {
    const lever=this.breakers[index];if(!lever)return;
    const from=lever.rotation.z,to=on?-.7:0;let sounded=false;
    this.contactNode=this.breakerHandles[index];this.contactPhase=0;
    this.animator.to("breaker"+index,0,1,.48,t=>{
      this.contactPhase=t;lever.rotation.z=from+(to-from)*ease.cinematic(Math.max(0,Math.min(1,(t-.24)/.5)));
      if(t>=.52&&!sounded){sounded=true;onContact(this.contactNode.getAbsolutePosition());}
    },()=>{this.contactNode=null;done();},"linear");
  }

  setGate(t) {
    this.w.exitGate.position.y = 1.9 + 4 * t;
    for (const rib of this.w.exitRibs) rib.mesh.position.y = rib.y + 4 * t;
    this.w.exitRect.enabled = t < 0.92;
  }
  setGrille(t) {
    this.w.grilleRoot.position.y = 3.7 * (1 - t);
    this.w.grilleRect.enabled = t > 0.62;
  }
  sync(state, immediate = true) {
    const has = (id) => state.flags.includes(id === "release" ? "terminal" : id);
    if (immediate) {
      this.animator.clear();this.attention?.reset();
      this.actionId = "";
      this.actionPhase = 0;
      this.contactNode=null;this.contactPhase=0;
      this.equip = 0;
      this.flashWanted = false;
      this.flashLevel = 0;
      this.hand.setEnabled(false);
      this.actionHand.setEnabled(false);
      this.actorClip = "Idle";this.actorPhase=null;
      this.actorPlaying = false;
      for (const [name, group] of Object.entries(this.clips)) {
        this.clipWeights[name] = Number(name === "Idle");
        group.setWeightForAllAnimatables(this.clipWeights[name]);
        group.goToFrame(group.from);
        group.pause();
      }
    }
    this.setGate(has("gate") ? 1 : 0);
    if(immediate)this.setGrille(0);
    this.cabinetDoor.rotation.y = has("fuse") ? 1.48 : 0;
    this.fuse.position.set(-27.86, 1.1, 76);
    this.fuse.setEnabled(!has("fuse"));
    this.fuse.scaling.setAll(1);
    this.lockerDoor.rotation.y = has("release") ? -1.25 : 0;
    this.releaseKey.setEnabled(true);
    this.releaseKey.position.z = 23.1;
    this.releaseKey.scaling.setAll(1);
    this.key?.setEnabled(!has("key"));
    if (this.key) {
      if(this.keyHome)this.key.position.copyFrom(this.keyHome);else this.key.position.y=.98;
      this.key.rotation.y = 0;
      this.key.scaling.setAll(1);
    }
    this.valve.rotation.x = has("valve") ? Math.PI * 2 : 0;
    for (const [i, lever] of this.breakers.entries())
      if (immediate || !this.animator.channels.has("breaker" + i))
        lever.rotation.z = has("power") ? -0.7 : 0;
    for (const item of this.w.interactives)
      item.hidden = item.id === "key" && has("key");
  }
  tick(dt, time, player, playing, puzzleOpen = false) {
    if (playing || puzzleOpen) this.animator.tick(dt);
    const desired =
      this.flashWanted && playing && !player?.hiding && !player?.vehicle ? Math.min(1, this.equip * 1.7) : 0;
    this.hand.setEnabled(this.gameplay && playing && !player?.hiding && !player?.vehicle && this.equip > 0.001);
    const handPhase = this.contactNode ? this.contactPhase : this.actionId === "gate" ? Math.min(1, this.actionPhase * 6) : this.actionPhase;
    const clamp=t=>Math.max(0,Math.min(1,t));
    const entryTime=player?.vehicle?this.w.stage.driveTime:0,entering=!!player?.vehicle&&entryTime>.22&&entryTime<.9;
    const reach=entering?ease.cinematic(clamp((entryTime-.22)/.16))*(1-ease.cinematic(clamp((entryTime-.55)/.35))):(this.actionId||this.contactNode)?ease.cinematic(clamp(handPhase/.28))*(1-ease.cinematic(clamp((handPhase-(this.actionId==="battery"?.96:.78))/(this.actionId==="battery"?.04:.22)))):0;
    const repairing=this.actionId==="repair";
    this.actionHand.setEnabled(this.gameplay && (playing||puzzleOpen) && (!player?.vehicle||entering) && reach > 0.01);
    this.actionHand.position.set(
      -0.28 + reach * 0.15,
      -0.58 + reach * (repairing?.22:.32),
      0.4 + reach * (repairing?.46:.28),
    );
    this.actionHand.rotation.set(
      -0.35 + reach * (repairing?.18:.55),
      0.22,
      -0.12 + reach * 0.25,
    );
    this.repairTool.setEnabled(repairing&&this.actionPhase>.54&&this.actionPhase<.77);
    const contactTarget=this.contactNode?this.contactNode.getAbsolutePosition():entering?this.w.stage.doors.find(d=>d.side===-1).handle.getAbsolutePosition():this.actionTarget;
    if(contactTarget&&reach>.01){
      // Hold contact through the cue, then retract. Target a moving battery's
      // carrying handle, not its old floor coordinate. Mouse control stays free.
      this.actionWorld.copyFrom(contactTarget);
      if(this.actionId==='key'&&this.keyGrip){this.keyGrip.computeWorldMatrix(true);this.actionWorld.copyFrom(this.keyGrip.getAbsolutePosition());}
      if(this.actionId==="battery"){
        this.w.stage.batteryHandle.computeWorldMatrix(true);this.actionWorld.copyFrom(this.w.stage.batteryHandle.getAbsolutePosition());
      }
      if(repairing){const node=this.actionPhase<.55?this.w.stage.installedBattery:this.w.stage.repairSocket;node.computeWorldMatrix(true);this.actionWorld.copyFrom(node.getAbsolutePosition());}
      B.Vector3.TransformCoordinatesToRef(this.actionWorld,this.w.camera.getViewMatrix(true),this.actionLocal);
      const local=this.actionLocal;
      if(local.z>.1){
        const scale=1; // The glove reaches the real socket, not an artificial 1.1m sphere.
        this.actionHand.position.set(-.28+(local.x*scale+.28)*reach,-.58+(local.y*scale+.58)*reach,.4+(local.z*scale-.4)*reach);
        this.actionHand.rotation.y=Math.atan2(local.x,Math.max(.1,local.z))*.7;
        this.actionHand.rotation.x=-Math.atan2(local.y,Math.max(.1,local.z))*.65;
        if(repairing&&this.actionPhase>.55&&this.actionPhase<.77)this.actionHand.rotation.z+=Math.sin((this.actionPhase-.55)*Math.PI*24)*.16;
        if(this.actionId==="valve")this.actionHand.rotation.z+=Math.sin(this.actionPhase*Math.PI*4)*.3*reach;
      }
    }
    const grip=this.actionId==="battery"?ease.cinematic(clamp((handPhase-.26)/.1))*reach:reach;
    for(const finger of this.actionFingers||[])finger.rotation.x=-.8*grip;
    const throwing=this.w.distractions?.handTime||0;
    if(throwing>0&&playing&&!player?.hiding&&!this.actionId){
      const t=1-throwing/.38,lift=Math.sin(t*Math.PI);
      this.actionHand.setEnabled(true);this.actionHand.position.set(-.28,-.58+lift*.32,.4+lift*.35);
      this.actionHand.rotation.set(-.35+lift*.7,.22,-.12-lift*.2);
      for(const finger of this.actionFingers||[])finger.rotation.x=t<.4?-.8:0;
    }
    if (player) {
      const focus = !player.settings.reducedMotion && player.settings.cinematicMotion && this.actionId === "valve" ? reach : 0;
      this.w.camera.fov =
        (((player.settings.fov ?? 78) - focus * 2 + (this.sprintFov=(this.sprintFov||0)+((player.sprinting&&!player.settings.reducedMotion?(player.settings.sprintFOV||0):0)-(this.sprintFov||0))*(1-Math.exp(-dt*5)))) * Math.PI) / 180;
    }
    this.flashLevel += (desired - this.flashLevel) * (1 - Math.exp(-dt * 18));
    const headlights=player?.vehicle?ease.smooth(clamp((this.w.stage.driveTime-.7)/.5)):0;
    this.w.flash.intensity = player?.vehicle ? 520*headlights : 950 * this.flashLevel;
    this.w.spill.intensity = player?.vehicle ? 360*headlights : 90 * this.flashLevel;
    // Keep both light slots attached; zero intensity extinguishes the beam without
    // dirtying the lighting layout of every material on each flashlight toggle.
    this.lens.material.emissiveColor.setAll(this.flashLevel * 0.6 + 0.08);
    if(playing){
      const target=this.w.atmosphere.emergencyMode||this.w.lightingPhase==='outage'?0:5;
      this.fanSpeed=(this.fanSpeed??.3)+(target-(this.fanSpeed??.3))*(1-Math.exp(-dt*1.5));
      this.fanPhase=((this.fanPhase||0)+this.fanSpeed*dt)%(Math.PI*2);
      for(const fan of this.fans)if(player&&B.Vector3.DistanceSquared(fan.position,this.w.camera.position)<144)fan.rotation.y=this.fanPhase;
    }
    if (playing) for (const drop of this.drips) {
      const near=player?.pos&&Math.hypot(player.pos.x-20.8,player.pos.z-101.2)<12;
      if(!near){if(drop.mesh.isEnabled())drop.mesh.setEnabled(false);continue;}
      const phase = (time + drop.phase) % 3.4;
      drop.mesh.position.set(20.8, 3.5 - phase * 1.2, 101.2);
      drop.mesh.setEnabled(phase < 2.9);
    }
    const animateActor = playing && this.w.worker.isEnabled();
    if(animateActor!==this.actorPlaying){
      this.actorPlaying=animateActor;this.footfalls.reset();
      if(!animateActor)for(const group of Object.values(this.clips))group.pause();
    }
    if(animateActor)for(const [name,group] of Object.entries(this.clips)){
      this.clipWeights[name]+=(Number(name===this.actorClip)-this.clipWeights[name])*(1-Math.exp(-dt*12));
      if(this.clipWeights[name]<.002&&name!==this.actorClip){this.clipWeights[name]=0;group.pause();}
      else if(!group.isPlaying)group.play(true);
      group.setWeightForAllAnimatables(this.clipWeights[name]);
      if(name===this.actorClip&&this.actorPhase!==null&&this.actorPhase!==undefined)
        group.goToFrame(group.from+(group.to-group.from)*this.actorPhase);
    }
    if (player && playing) {
      const sway = player.settings.reducedMotion ? 0 : (player.settings.sway ?? 0.4),
        bob = player.settings.reducedMotion ? 0 : player.settings.bob;
      const actionDip = this.actionId
        ? Math.sin(this.actionPhase * Math.PI) * 0.1
        : 0;
      this.hand.position.set(
        0.27 + Math.sin(player.walkClock * 0.5) * 0.008 * sway,
        -0.23 -
          (1 - this.equip) * 0.5 +
          Math.sin(player.walkClock) * 0.012 * bob -
          actionDip,
        0.48 - (1 - this.equip) * 0.16,
      );
      this.hand.rotation.set(
        (1 - this.equip) * 0.7 -
          player.lookVelocity.y * 0.0006 * sway +
          Math.sin(time * 1.3) * 0.008 * sway,
        -player.lookVelocity.x * 0.0008 * sway,
        Math.sin(player.walkClock * 0.5) * 0.02 * sway,
      );

    }
  }
}
