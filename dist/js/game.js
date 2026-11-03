import { Footwear } from "./surfaces.js?v=1.14.0";
import { RecoveryLog } from "./recovery.js?v=1.14.0";
import { footContact, stepProfile } from "./surfaces.js?v=1.14.0";
import { CreatureScenes } from "./creature-scenes.js?v=1.14.0";
import { ControllerInput } from "./controller.js?v=1.14.0";
import { EncounterDirector, MAJOR_ENCOUNTERS } from "./encounters.js?v=1.14.0";
import { lineClear, sightClear } from "./navigation.js?v=1.14.0";
import { yieldTask } from "./preparation.js?v=1.14.0";
import { PRESETS } from "./preferences.js?v=1.14.0";
import { FrameStats, AdaptiveScale, nextFrameDeadline, HitchRecorder, PerformanceSetup, renderSizing } from "./performance.js?v=1.14.0";
import { GraphicsPreview } from "./preferences.js?v=1.14.0";
import { playIntro } from "./presentation.js?v=1.14.0";
import { availability, Guidance, destination, roomAt } from "./guidance.js?v=1.14.0";
import { prepareNavigationAsync } from "./navigation.js?v=1.14.0";
import { difficultyRules } from "./difficulty.js?v=1.14.0";
import { World } from "./world.js?v=1.14.0";
import { Player } from "./player.js?v=1.14.0";
import { AudioMixer } from "./audio.js?v=1.14.0";
import { UI, $, keyName, escapeHTML } from "./ui.js?v=1.14.0";
import {
  newGame,
  has,
  mark,
  collectNote,
  NOTES,
  objective,
  SaveStore,
  validateSave,
  checkpointSave,
  safeCheckpoint,
} from "./state.js?v=1.14.0";
import { Threat } from "./threat.js?v=1.14.0";
const B = globalThis.BABYLON;
/** The game owns progression; the scene only displays its state. This separation
 * makes checkpoints deterministic and keeps all story locks in one place. */
export class Game {
  constructor() {
    // Accessing localStorage itself can throw in restricted iframes.
    let storage;
    try {
      storage = window.localStorage;
    } catch {
      storage = {
        getItem() {
          throw Error();
        },
        setItem() {
          throw Error();
        },
      };
    }
    this.store = new SaveStore(storage);
    this.settings = this.store.readSettings();
    if (!this.store.get("settings") && globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) this.settings.reducedMotion = true;
    this.graphics = new GraphicsPreview();
    this.stats = new FrameStats();
    this.hitches = new HitchRecorder();
    this.adaptive = new AdaptiveScale();
    this.state = newGame();
    this.recoveryLog = new RecoveryLog();
    this.lastGoodSave = this.store.readGame();
    this.notes = NOTES;
    this.canvas = $("game");
    this.audio = new AudioMixer();
    this.audio.apply(this.settings);
    this.ui = new UI(this);
    this.started = false;
    this.playing = false;
    this.target = null;
    this.scareTime = 0;this.impactTime=0;
    this.gameTime = 0;
    this.lastTime = 0;
    this.lastRender = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.runToken = 0;
    this.pendingAction = null;
    this.scareActorTime = 0;
    this.autosaveTime = 0;
    this.cpuMs = 0; this.gpuMs = null;
    this.guidance = new Guidance(this.state);
    this.controller=new ControllerInput();
  }
  async boot() {
    if (!B.Engine.isSupported())
      throw new Error(
        "WebGL is unavailable. Enable hardware acceleration in your browser, then reload.",
      );
    this.engine = new B.Engine(
      this.canvas,
      false,
      {
        preserveDrawingBuffer: false,
        stencil: true,
        powerPreference: "high-performance",
      },
      false,
    );
    this.resize(); // Limit framebuffer allocation before building any scene targets.
    this.bindGraphicsRecovery();
    this.loadingProgress("Building the garage", .01); await yieldTask();
    this.world = new World(this.engine, {defer:true});
    await this.world.buildAsync((label,p)=>this.loadingProgress(label,p));
    this.instrumentation = new B.EngineInstrumentation(this.engine);
    this.instrumentation.captureShaderCompilationTime = true;
    this.sceneInstrumentation = new B.SceneInstrumentation(this.world.scene);
    this.sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
    this.sceneInstrumentation.captureRenderTime = true;
    this.threat = new Threat(this.world.rects, this.settings.difficulty, this.world.stage.spots);
    this.player = new Player(
      this.world,
      this.canvas,
      this.settings,
      (a) => this.action(a),
      (status, message) => this.handleCapture(status, message),
    );
    await this.world.loadAssets(p=>this.loadingProgress("Loading vehicle assets", .22+p*.2));
    this.loadingProgress("Preparing weathered surfaces", .43);
    await this.world.decay.load();
    this.loadingProgress("Loading character animations", .44); await yieldTask();
    await this.world.visuals.loadActor();
    this.loadingProgress("Preparing static geometry", .5); await yieldTask();
    await this.world.optimizeAsync();
    this.loadingProgress("Preparing routes", .6); await yieldTask();
    await prepareNavigationAsync(this.world.rects);
    this.threat.prepareRoutes();
    this.applySettings();
    this.world.sync(this.state);
    this.bindEvents();
    this.resize();
    await this.world.warmup((label,p)=>this.loadingProgress(label,p));
    if(this.contextLost)throw new Error("Graphics interrupted during preparation. Reload in Low mode to retry.");
    this.world.sync(this.state);
    this.loadingProgress("Ready", 1); await yieldTask();
    this.loadingReady=true;
    $("loading").classList.add("hidden");
    this.engine.runRenderLoop(() => {
      if (this.renderFault || this.contextLost) return;
      try { this.frame(); } catch (error) {
        this.renderFault = true;
        console.error("Game frame failed", error);
        this.ui.recovery(error);
      }
    });
    if (this.store.get("recover")!=="1" && (!this.settings.skipIntro || !this.store.get("introSeen"))) await this.intro();
    this.ui.menu();
    if(this.store.get("recover")==="1"){this.store.set("recover","0");this.ui.toast("Scene rebuilt. Choose Continue to restore your checkpoint.",7000);}
    if (this.world.failedAssets?.length || !this.world.visuals.actorLoaded)
      this.ui.toast(
        "Some models could not load. Reload to restore the full scene.",
        7000,
      );
  }
  loadingProgress(label, progress) {
    $("load-label").textContent=label;
    $("load-fill").style.width=Math.round(progress*100)+"%";
    $("load-percent").textContent=Math.round(progress*100)+"%";
  }
  loadingFailed(error) {
    this.loadingReady=false;
    $("loading").classList.remove("hidden");
    $("load-label").textContent=error.message;
    $("load-actions").classList.remove("hidden");
    $("load-retry").onclick=()=>window.location.reload();
    $("load-simple").onclick=()=>{
      Object.assign(this.settings, PRESETS.low, {quality:"low",resolution:"720",scale:1,adaptive:false});
      this.store.writeSettings(this.settings); window.location.reload();
    };
  }
  queueAutosave() {
    if(this.autosavePending)return;
    this.autosavePending=true;
    const write=()=>{this.autosavePending=false;if(this.started&&!this.renderFault)this.save(false);};
    // Objective saves stay immediate. Routine clock/discovery saves prefer idle
    // time and are flushed by pause/pagehide; no promise of asynchronous storage.
    if(globalThis.requestIdleCallback) requestIdleCallback(write,{timeout:2000});
    else setTimeout(write,150);
  }
  async intro() {
    this.presenting = true;
    try { await playIntro($("intro"), $("intro-content"), $("intro-skip"), this.settings.reducedMotion); }
    finally { this.presenting = false; this.store.set("introSeen", "1"); this.renderDirty = true; }
  }
  async replayIntro() {
    this.ui.hide(); $("menu").classList.add("hidden");
    await this.intro();
    if (!this.started) this.ui.menu();
    this.ui.credits();
  }
  bindEvents() {
    $("touch-throw").onclick=()=>this.action("throw");
    $("touch-objective").onclick=()=>this.action("objective");
    window.addEventListener("gamepadconnected",e=>{this.controller.available=e.gamepad?.mapping==='standard';if(this.ui.overlay==='capture'&&$('controller-status'))$('controller-status').textContent='Controller detected · select Use controller';});
    $("touch-hint").onclick = () => this.action("hint");
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this.graphics.baseline) { this.cancelGraphics(); if (this.ui.overlay === "settings") this.ui.settings(); }
        if (this.playing) this.pause();
        this.audio.suspend();
      } else if (!this.playing) this.audio.suspend();
    });
    window.addEventListener("blur", () => {
      if (this.playing && document.hasFocus?.() === false && !this.player.mouseCapture.pending) this.pause();
    });
    window.addEventListener("pagehide", () => {
      if (this.started&&!this.renderFault) this.save(false);
    });
    this.bindGraphicsRecovery();
    // Two independent touch regions: one move joystick and one look surface.
    let moveId = null,
      lookId = null,
      last = { x: 0, y: 0 };
    const move = (e) => {
      const r = $("move-pad").getBoundingClientRect(),
        dx = (e.clientX - r.left - r.width / 2) / 45,
        dy = (e.clientY - r.top - r.height / 2) / 45,
        len = Math.max(1, Math.hypot(dx, dy));
      this.player.touchMove = { x: dx / len, y: dy / len };
      $("move-knob").style.transform =
        `translate(${(dx / len) * 35}px,${(dy / len) * 35}px)`;
    };
    $("move-pad").onpointerdown = (e) => {
      moveId = e.pointerId;
      e.currentTarget.setPointerCapture(moveId);
      move(e);
    };
    $("move-pad").onpointermove = (e) => {
      if (e.pointerId === moveId) move(e);
    };
    const stopMove = () => {
      moveId = null;
      this.player.touchMove = { x: 0, y: 0 };
      $("move-knob").style.transform = "";
    };
    $("move-pad").onpointerup = stopMove;
    $("move-pad").onpointercancel = stopMove;
    $("look-pad").onpointerdown = (e) => {
      lookId = e.pointerId;
      last = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(lookId);
    };
    $("look-pad").onpointermove = (e) => {
      if (e.pointerId === lookId && this.playing) {
        this.player.look(
          (e.clientX - last.x) * 1.8,
          (e.clientY - last.y) * 1.8,
        );
        last = { x: e.clientX, y: e.clientY };
      }
    };
    $("look-pad").onpointerup = () => (lookId = null);
    $("look-pad").onpointercancel = () => (lookId = null);
    $("touch-use").onclick = () => this.action("interact");
    $("touch-light").onclick = () => this.action("flashlight");
    $("touch-run").onclick = () => {
      this.player.touchSprint = !this.player.touchSprint;
      $("touch-run").style.borderColor = this.player.touchSprint
        ? "#c9b382"
        : "";
    };
  }
  bindGraphicsRecovery(){
    if(this.graphicsRecoveryBound||!this.engine?.onContextLostObservable)return;
    this.graphicsRecoveryBound=true;
    this.engine.onContextLostObservable.add(()=>{
      this.contextLost=true;
      const error=new Error('Graphics context lost. Reload with Low graphics to reduce GPU memory use.');
      if(this.loadingReady)this.ui.recovery(error);else this.loadingFailed(error);
    });
    this.engine.onContextRestoredObservable.add(()=>{
      this.contextLost=false;this.recoveryLog.record('graphics-context-restored');
      this.ui.toast('Graphics restored. Reload your checkpoint for a clean scene.',7000);
    });
  }
  resize() {
    if (!this.engine) return;
    const s = this.settings;
    const factor = s.adaptive ? (this.adaptive?.factor ?? 1) : 1;
    const size=renderSizing(window.innerWidth,window.innerHeight,s,this.engine.getCaps?.()||{},factor);
    const signature=`${window.innerWidth}:${window.innerHeight}:${size.width}:${size.height}`;
    if(signature===this.renderSize)return;
    this.renderSize=signature;this.renderSizing=size;
    this.engine.setHardwareScalingLevel(size.scaling);
    this.engine.resize(); this.renderDirty = true;
    if(this.ui)this.ui.canvasRect=null;
  }
  applySettings() {
    const s = this.settings;
    this.audio.apply(s);
    if (this.world) {
      this.world.setSettings(s); this.player.settings = s;
      const rules = difficultyRules(this.started ? this.state.difficulty : s.difficulty);
      this.player.rules = this.threat.rules = rules;
      if (!s.adaptive) this.adaptive?.reset();
      this.resize(); this.renderDirty = true;
    }
    if (this.instrumentation) this.instrumentation.captureGPUFrameTime = s.adaptive || ["detailed", "graph"].includes(s.fpsMode);
    $("fps").classList.toggle("hidden", s.fpsMode === "off");
    $("fps").setAttribute("data-corner", s.fpsCorner);
    $("fps").style.setProperty("--fps-scale", s.fpsSize);
    $("crosshair").classList.toggle("hidden", !s.crosshair);
    $("crosshair").classList.toggle("high-contrast", s.crosshairContrast);
    s.objectiveHUD=s.objectiveMode!=="journal";
    this.refreshObjectiveVisibility();
    if (!s.subtitles) $("subtitle").classList.add("hidden");
    for (const [key,value] of Object.entries({"subtitle-scale":s.subtitleSize,"prompt-scale":s.promptScale,"ui-scale":s.uiScale,"crosshair-scale":s.crosshairSize}))
      document.documentElement.style.setProperty("--"+key,value);
    document.documentElement.classList.toggle("reduced-motion", s.reducedMotion);
    document.documentElement.style.setProperty('--subtitle-background',s.subtitleBackground??.8);
    this.store.writeSettings(this.graphics?.persisted(s) ?? s);
  }
  previewContrast(){
    const c=this.world.camera;this.contrastPose={position:c.position.clone(),rotation:c.rotation.clone()};this.previewBeam=false;
    c.position.set(11,1.68,65);c.rotation.set(0,Math.PI/2,0);this.world.updateLights(c.position,this.gameTime,false,0,true);
    this.ui.show("contrast",this.ui.head("LIGHTING CHECK", "Darkness & flashlight")+'<p>Look at the wall outside this panel. With the beam off, edges should be faintly visible. With it on, details should be clear. Adjust for your display.</p><label for="contrast-brightness">Brightness</label><input id="contrast-brightness" type="range" min="0.6" max="1.8" step="0.05" value="'+this.settings.brightness+'"><div class="button-row"><button id="contrast-toggle" class="btn accent">Switch beam on</button><button id="contrast-done" class="btn">Back to settings</button></div>');
    $("overlay").classList.add("contrast-preview");
    $("contrast-toggle").onclick=()=>{this.previewBeam=!this.previewBeam;$("contrast-toggle").textContent=this.previewBeam?"Switch beam off":"Switch beam on";};
    $("contrast-brightness").oninput=()=>{this.settings.brightness=Number($("contrast-brightness").value);this.applySettings();};
    $("contrast-done").onclick=()=>this.closeContrast();
  }
  closeContrast(){
    if(this.contrastPose){this.world.camera.position.copyFrom(this.contrastPose.position);this.world.camera.rotation.copyFrom(this.contrastPose.rotation);this.contrastPose=null;}
    this.previewBeam=false;this.world.flash.intensity=this.world.spill.intensity=0;
    $("overlay").classList.remove("contrast-preview");this.ui.settings("basics");
  }
  previewGraphics() {
    this.settings = this.graphics.apply(this.settings, performance.now());
    this.adaptive.reset(); this.applySettings();
  }
  keepGraphics() { this.graphics.keep(); this.applySettings(); }
  cancelGraphics() {
    if (!this.graphics.draft && !this.graphics.baseline) return;
    this.settings = this.graphics.revert(this.settings);
    this.adaptive.reset(); this.applySettings();
  }
  currentObjective() {
    return objective(this.state);
  }
  confirmNew() {
    this.ui.newGameSetup(!!this.store.readGame());
  }
  async start(continuing, difficulty = this.settings.difficulty) {
    if(!continuing)this.sessionFailures=0;
    this.calibration=null;this.objectiveSeconds=0;this.adrenalineAt=-Infinity;
    this.world.distractions?.reset();
    const token = ++this.runToken;
    this.recoveryLog?.record("start",{continuing,difficulty});
    this.audio.stop();
    this.pendingAction = null;this.shelterTransition=null;this.circuitPending=false;
    this.captureTime=null;this.creatureVoiceTime=6;this.actorStrike=0;this.revealPending=false;this.encounterPending=null;this.inspectionKey=null;this.hideExit=null;this.distractionTime=0;this.trapWarned=false;this.audio.stopEngine?.();
    document.documentElement.classList.remove("driving");
    this.stats?.reset(); this.adaptive?.reset();
    this.autosaveTime = 0;
    this.nextScareCue=0;this.ambientCueTime=18;
    this.scareTime = 0;this.impactTime=0;
    $("action-progress").classList.add("hidden");
    $("danger").style.opacity = "0";
    try {
      this.alarmSound?.src.stop();
    } catch {}
    this.alarmSound = null;
    this.ui.hide();
    this.state = continuing
      ? this.store.readGame() || newGame()
      : newGame(difficulty);
    this.lastGoodSave=checkpointSave(this.state);
    this.settings.difficulty = this.state.difficulty;
    this.applySettings();
    this.started = true;
    this.player.rules = this.threat.rules = difficultyRules(
      this.state.difficulty,
    );
    if (has(this.state, "escaped")) {
      this.showEnding();
      return;
    }
    this.player.restore(this.state.checkpoint);
    this.guidance = new Guidance(this.state);
    this.tutorialOrigin = { ...this.player.pos, yaw: this.player.yaw, pitch: this.player.pitch };
    this.entryMessage = continuing ? `Checkpoint restored · ${this.currentObjective()[1]}` : "00:17. The last ticket is yours. Find bay 042.";
    this.threat.reset();
    this.threat.boltHabits=this.state.boltHistory;
    this.director=new EncounterDirector(this.state);
    this.creatureScenes=new CreatureScenes(this);this.footwear=new Footwear();this.inspectionImpact=null;this.lastNavRecoveries=0;this.escapeStrike=null;
    this.threat.spots=this.world.stage.spots;
    if(has(this.state,"key")){this.threat.activate(this.player.pos);this.threat.grace+=Math.min(8,(this.sessionFailures||0)*2);this.threat.boltHabits=this.state.boltHistory;}
    if(!has(this.state,"key") || (!has(this.state,"fuse")&&!this.state.scares.includes("securityBreach"))){
      this.threat.pos={...this.world.atmosphere.securityActor};this.threat.yaw=0;this.threat.mode="dormant";
    }
    this.threat.pressure=has(this.state,"gate");
    if(has(this.state,"gate")&&!this.state.scares.includes("pursuit"))this.scare("pursuit");
    this.scareActorTime = 0;
    this.crossing = false;
    this.lureCaption = false;
    this.world.worker.setEnabled(false);
    this.world.worker.position.set(this.threat.pos.x, 0, this.threat.pos.z);
    this.world.sync(this.state);
    // The loading tour/title camera may have left the reusable lights in a
    // different room. Prime their positions before the first playable frame.
    this.world.updateLights(this.player.pos, this.gameTime, false, 0, true);
    $("menu").classList.add("hidden");
    $("hud").classList.remove("hidden");
    this.updateHUD();
    // Prepare/decode audio before play. Unlock is called on this trusted click;
    // capture gets its own fresh Enter game click after preparation is finished.
    this.ui.show("preparing", this.ui.head("MERIDIAN / B2", "Preparing the garage", false) + '<p>Preparing sound and your checkpoint…</p><button id="skip-audio" class="btn">Continue without sound</button>');
    let skipAudio;
    const skip = new Promise(resolve => { skipAudio = resolve; });
    $("skip-audio").onclick = () => skipAudio(false);
    let timeout;
    const audioReady = await Promise.race([this.audio.unlock(), skip, new Promise(resolve => { timeout = setTimeout(() => resolve(false), 8000); })]);
    clearTimeout(timeout);
    if (token !== this.runToken || !this.started) return;
    if(!audioReady)this.audio.cancelPreparation();
    if (audioReady) this.audio.startAmbience();
    this.audio.setPaused(true);
    this.audio.setTension(false);
    if (!continuing) this.save(false);
    if (!this.store.get("controlsSeen") && !this.state.journal.controlsSeen) this.ui.journal("controls");
    else this.ui.capture();
    if (!audioReady || this.audio.failures.length) this.ui.toast("Some sound is unavailable. You can still play; all clues have text.", 7000);
    if (!this.store.available)
      this.ui.toast(
        "Browser storage is unavailable. Export your save from Pause to keep progress.",
        9000,
      );
  }
  stopInput() {
    this.controller?.clear();
    this.renderDirty = true;
    this.playing = false;
    if (this.player) {
      this.player.active = false;
      this.player.cancelCapture();
      this.player.clear();
    }
    this.audio.setPaused(true);
    this.world?.visuals.focusOn(null, false);
    $("interaction").classList.add("hidden");
    $("world-prompt").classList.add("hidden");
  }
  handleCapture(status, message = "") {
    if (!this.started || has(this.state, "escaped")) return;
    if (status === "locked") {
      this.settings.mouseMode = this.captureRaw ? "raw" : "locked";
      this.store.writeSettings?.(this.settings);
        try {
        this.beginPlaying();
        this.ui.hide();
      } catch (error) {
        console.error("Capture granted but gameplay could not start", error);
        this.player.mouseCapture.record("start-failed", error.message);
        this.ui.capture();
        this.ui.captureStatus("failed", "Mouse capture succeeded, but gameplay could not start. Open troubleshooting details or try drag controls.");
      }
    } else if (status === "released" && this.playing) this.pause();
    else if (status === "requesting" || status === "failed") {
      this.ui.captureStatus(status, message);

    }
  }
  /** The Enter game click does not rebuild its own dialog or cancel its request.
   * Locked and drag entry converge on exactly the same gameplay transition. */
  resume(mode = this.player?.captureMode==='controller'?'controller':this.settings.mouseMode || "locked", raw = mode === "raw") {
    if (!this.started || has(this.state, "escaped")) return;
    if(mode==='controller'&&!this.controller?.connected){this.ui.toast('Enable Controller in Settings → Controls, then press a button on a standard gamepad.');this.ui.capture();return;}
    if (mode === "drag" || mode === "touch" || mode === 'controller') {
        if (mode === "drag") { this.settings.mouseMode = "drag"; this.store.writeSettings?.(this.settings); }
      this.player.useDragControls();
      this.player.captureMode = mode;
      try { this.beginPlaying(); this.ui.hide(); }
      catch (error) { this.ui.recovery(error); }
      return;
    }
    this.player.captureMode = "locked";
    if (document.pointerLockElement === this.canvas) {
      this.handleCapture("locked"); return;
    }
    if (this.ui.overlay !== "capture") this.ui.capture();
    this.captureRaw = raw;
    this.player.lock({ raw });
  }
  beginPlaying() {
    this.hasPlayed=true;
    this.player.clear();
    this.playing = true;
    this.player.active = true;
    this.lastTime = performance.now();
    this.world.scene?.resetLastAnimationTimeFrame();
    this.skipFrameSample = true;
    this.ui.toast(this.player.captureMode === "locked" ? "Free mouse-look active · move the mouse without holding a button · Esc pauses" : this.player.captureMode === "touch" ? "Touch controls active" : this.player.captureMode==='controller'?'Controller active · A uses · X flashlight · Y journal · Menu pauses':"Drag look active · hold the left mouse button to look", 5000);
    this.nextRender = this.lastTime;
    this.audio.resume();
    this.audio.setPaused(false);
    this.updateHUD();
    this.canvas.focus({ preventScroll: true });
    if (this.entryMessage) { this.ui.subtitle(this.entryMessage, 7); this.entryMessage = ""; }
  }
  setDifficulty(id) {
    const rules = difficultyRules(id);
    this.settings.difficulty = rules.id;
    if (this.started) this.state.difficulty = rules.id;
    this.applySettings();
    if (this.started) {
      this.save(false);
      this.updateHUD();
    }
    this.ui.toast(`Difficulty · ${rules.label}`);
  }
  pause() {
    if (!this.started) return;
    this.save(false); this.ui.pause();
  }
  toMenu() {
    this.runToken++;
    this.pendingAction = null;
    this.world.visuals.animator.clear();
    this.player.movementLocked = false;
    $("action-progress").classList.add("hidden");
    try {
      this.alarmSound?.src.stop();
    } catch {}
    this.alarmSound = null;
    this.audio.stopEngine?.();document.documentElement.classList.remove("driving");
    this.stopInput();
    this.started = false;
    this.world.worker.setEnabled(false);
    this.audio.setTension(false);
    $("danger").style.opacity = "0";
    this.ui.menu();
  }
  save(notify = true) {
    if (!this.started || this.renderFault) return;
    const start=performance.now();
    const good=validateSave(checkpointSave(this.state));
    this.lastGoodSave=good;
    const ok = this.store.writeGame(good);
    const duration=performance.now()-start;
    if(duration>10)this.hitches?.record({type:"save",durationMs:Math.round(duration*10)/10});
    if (notify)
      this.ui.toast(
        ok
          ? "Checkpoint saved"
          : "Storage unavailable — export your save to keep it.",
        ok ? 2300 : 7000,
      );
  }
  reloadCheckpoint(low=false) {
    // Do not serialize a partially failed interaction. Use the last validated
    // checkpoint captured by save(), then let a page reload release the GPU/audio.
    const good=this.lastGoodSave||this.store.readGame();
    if(good&&!this.store.writeGame(good)&&!this.recoveryExported){
      this.ui.toast("Storage is blocked. Export the checkpoint before reloading.",9000);return false;
    }
    if(low){Object.assign(this.settings,PRESETS.low,{quality:"low",resolution:"720",scale:1,adaptive:false});this.graphics.baseline=null;}
    this.store.writeSettings(this.graphics.persisted(this.settings));this.store.set("recover","1");
    this.audio.stop();this.engine.stopRenderLoop();window.location.reload();return true;
  }
  exportSave(state = this.state) {
    const s = state ? (this.started ? checkpointSave(state) : state) : null;
    if (!s) {
      this.ui.toast("There is no save to export yet.");
      return;
    }
    const blob = new Blob([JSON.stringify(s, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "LastVehicle-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.ui.toast("Save exported. Keep this file as a backup.");
  }
  async importSave(text) {
    const saved = validateSave(JSON.parse(text));
    this.store.writeGame(saved);
    this.ui.hide();
    await this.start(true);
    this.ui.toast("Save imported. Restored to a safe checkpoint.");
  }
  complete(id, caption) {
    this.recoveryLog?.record("objective",{id});
    mark(this.state, id);
    if(id==='car'){this.audio.play('lv114-electric-cutoff',{volume:.38,position:{x:0,y:3.7,z:80}});caption="The overhead lights cut out. "+this.ui.actionKey('flashlight')+" raises your flashlight. Recover the battery beside the hood.";}
    this.guidance?.progress(this.state);
    this.world.sync(this.state, false);
    this.updateHUD();
    this.save();
    if (caption) this.ui.subtitle(caption, 6);
  }
  /** Completion happens at the end of an action, never at its first frame.
   * Pausing freezes the tween. Leaving this run invalidates its callback, so a
   * stale animation cannot unlock an objective in a newly loaded game. */
  performAction(id, label, duration, commit) {
    if (this.pendingAction) return;
    const token = this.runToken;
    this.pendingAction = { id, token, duration, elapsed: 0 };
    // Machinery can require standing still; picking up an item never does.
    this.player.movementLocked = ["valve","repair"].includes(id);
    if (["valve","repair"].includes(id) && this.player.velocity) this.player.velocity.x = this.player.velocity.z = 0;
    $("action-label").textContent = label + (["valve","repair"].includes(id) ? ` · ${this.ui.actionKey('interact')} to cancel` : "");
    $("action-progress").classList.remove("hidden");
    this.world.visuals.action(
      id,
      duration,
      () => {
        if (token !== this.runToken || this.pendingAction?.id !== id) return;
        this.pendingAction = null;
        this.player.movementLocked = false;
        $("action-progress").classList.add("hidden");
        commit();
      },
      () => {
        if (id === "trap")
          this.audio.play("metal", {
            volume: 0.7,
            position: { x: -17, y: 1, z: 76 },
            refDistance: 4,
          });
        if (id === "gate")
          this.audio.play("metal", {
            volume: 0.24,
            position: { x: 0, y: 3, z: 1 },
            refDistance: 5,
          });
        if(id==="fuse"||id==="release")this.audio.play("door-open",{volume:.32,position:this.world.visuals.actionTarget});
        if(id==="key")this.audio.play("lock-turn",{volume:.3});
        if(id==="battery"||id==="repair"){const node=id==="battery"?this.world.stage.batteryHandle:this.world.stage.repairSocket;node.computeWorldMatrix(true);this.audio.play("tool-handling",{volume:.4,position:node.getAbsolutePosition()});}
      },
    );
  }
  cancelAction() {
    if (!this.pendingAction) return;
    this.pendingAction = null;
    this.player.movementLocked = false;
    this.world.visuals.animator?.channels.delete("interaction");
    this.world.visuals.actionId = "";
    this.world.visuals.actionPhase = 0;
    this.world.sync(this.state, false);
    $("action-progress").classList.add("hidden");
    this.ui.toast("Action cancelled. You can try again.");
  }
  getAvailability(id) {
    // Use the actor's displayed position for the trap, so the prompt matches
    // what the player sees while luring him into the room.
    return availability(id, this.state, this.player, this.world.worker.position);
  }
  requestHint() {
    this.ui.journal("hints");
  }
  tickGuidance(dt) {
    const room = roomAt(this.player.pos);
    if (room !== "garage" && !this.state.visited.includes(room)) {
      this.state.visited.push(room); this.guidance.idle = 0;
    }
    if(this.guidance.tick(dt,this.state,this.pendingAction||this.player.hiding||['chase','attack','inspect','recover'].includes(this.threat.mode),this.settings.hintReminders))
      this.ui.toast('Need a direction? '+this.ui.actionKey('hint')+' opens optional journal hints.',5000);
    this.objectiveSeconds=Math.max(0,(this.objectiveSeconds||0)-dt);this.refreshObjectiveVisibility();
    let d = destination(this.state);
    if (d && has(this.state, "key") && !has(this.state, "gate") && this.player.pos.x < -17) {
      if (d.room === "workshop" && this.player.pos.z < 62) d = {...d, portal:[-24,62]};
      if (d.room === "security" && this.player.pos.z > 29) d = {...d, portal:[-24,29]};
    }
    this.world.showWaypoint(d, this.player, this.guidance.markerSeconds, this.gameTime, room === d?.room);
    this.ui.tutorial("");
  }
  refreshObjectiveVisibility(){
    const mode=this.settings.objectiveMode||(this.settings.objectiveHUD?'always':'journal');
    $('objective-block').classList.toggle('hidden',mode==='journal'||mode==='request'&&!(this.objectiveSeconds>0));
    $('objective-hint').classList.remove('hidden');
  }
  updateHUD() {
    const o = objective(this.state);
    const j=this.state.journal;
    if(j) {
      const unread=j.lastObjective!==o[0] || this.state.notes.some(id=>!j.readNotes.includes(id));
      $("journal-dot").classList.toggle("hidden",!unread);
      this.ui.text("journal-key",this.ui.actionKey('journal'));
      $("journal-button").setAttribute("aria-label", unread?"Journal · unread updates":"Open journal");
    }
    $("difficulty-label").textContent = difficultyRules(
      this.state.difficulty,
    ).label.toUpperCase();
    $("objective").textContent = o[1];
    $("objective-hint").textContent = (destination(this.state)?.name||"Exit reached")+" · "+this.ui.actionKey("journal")+" Journal";
    this.ui.text("bolt-status",this.ui.actionKey("throw")+" · BOLTS "+(this.state.bolts??3));
    this.refreshObjectiveVisibility();
    $("chapter").textContent = has(this.state, "gate")
      ? "03 / SOMEONE STAYED"
      : has(this.state, "repair")
        ? "02 / THE OTHER SHIFT"
        : "01 / THE LAST TICKET";
    $("flash-status").textContent =
      `${this.ui.actionKey('flashlight')} · ${this.player?.flashlight ? "LIGHT ON" : "LIGHT OFF"}`;
    $("interact-key").textContent = keyName(this.settings.bindings.interact);
  }
  action(action) {
    if (!this.playing || this.player.vehicle) return;
    if(this.shelterTransition&&!["journal","hint"].includes(action))return;
    if (action === "flashlight" && !this.player.hiding) {
      this.player.flashlight = !this.player.flashlight;
      this.audio.play("click", { volume: 0.5, bus: "ui", reverb: false });
      this.updateHUD();
    }
    if(action==='objective'){this.objectiveSeconds=8;this.refreshObjectiveVisibility();}
    if(action==='throw'&&!this.pendingAction){
      if(this.world.distractions?.throw(this.player,this.state)){this.updateHUD();this.save(false);}
      else if(!this.state.bolts)this.ui.toast('No bolts left. Use cover, the siren or the valve.');
    }
    if (action === "journal") this.ui.journal();
    if (action === "hint") this.requestHint();
    if (action === "interact") {
      if (["valve","repair"].includes(this.pendingAction?.id)) { this.cancelAction(); return; }
      if (this.pendingAction) return;
      if(this.player.hiding){this.leaveShelter();return;}
      const hint = this.player.interactionHint(id => this.getAvailability(id));
      if (hint?.usable) this.interact(hint.action || hint.item.id);
      else if (hint) this.ui.subtitle(hint.reason, 3);
    }
  }
  interact(id) {
    this.recoveryLog?.record("interact",{id});
    if (this.pendingAction) return;
    const s = this.state;
    const eligibility = this.getAvailability(id);
    if (!eligibility.available) { if (!eligibility.hidden) this.ui.subtitle(eligibility.reason, 4); return; }
    id=eligibility.action || id;
    if (id in NOTES) {
      const alreadyRead = s.notes.includes(id);
      collectNote(s, id);
      this.save(false);
      if (alreadyRead) this.ui.note(id); else this.ui.previewNote(id);
      return;
    }
    if(id.startsWith("hide-")){this.enterShelter(id);return;}
    if(id==="car"){
      if(has(s,"car")){this.beginEscape();return;}
      this.audio.play("rattle",{volume:.3,rate:.85});
      this.performAction("car","INSPECTING SABOTAGE",.65,()=>{collectNote(s,"notice");this.complete("car","The battery is on the floor. Someone cut the cable. Recover it.");});return;
    }
    if(id==="battery"){
      this.performAction("battery","RECOVERING BATTERY",1.2,()=>this.complete("battery","Battery recovered. Security holds the workshop key."));return;
    }
    if(id==="key"){
      this.performAction("key","TAKING MAINTENANCE KEY",.45,()=>{
        collectNote(s,"log");this.complete("key",`Someone is still in the garage. Break its sight before using ${this.ui.actionKey('interact')} at a SHELTER locker. The same key lets you leave.`);
        this.scare("securityBreach");
      });return;
    }
    if(id==="fuse"){
      this.performAction("fuse","TAKING FUSE & CABLE",.85,()=>{
        collectNote(s,"workorder");this.complete("fuse","Cable and fuse acquired. Repair the car at its open hood.");this.scare("workshopBreach");
      });return;
    }
    if(id==="repair"){
      this.performAction("repair","INSTALLING BATTERY & CABLE",2.1,()=>{this.complete("repair","The car is ready. Restore power to the vehicle exit.");this.threat.hear(this.player.pos,16);});return;
    }
    if(id==="power"){this.powerPuzzle();return;}
    if(id==="terminal"){this.keypad();return;}
    if(id==="release"){collectNote(s,"incident");this.save(false);this.ui.note("incident");return;}
    if(id==="valve"||id==="alarm"){
      if(this.distractionTime>0){this.ui.subtitle("The mechanism is resetting. Use cover.",3);return;}
      this.performAction(id,id==="valve"?"RELEASING PRESSURE":"STARTING SIREN",id==="valve"?1.1:.3,()=>{
        const position=id==="valve"?{x:26,z:98}:{x:-24,z:76};
        const redirected=this.threat.lure(position,9);this.distractionTime=18;
        if(id==='valve'&&this.world.equipment){this.world.equipment.reliefTime=18;this.audio.play('lv113-pressure-burst',{volume:.3,position:{...position,y:1.5}});}
        this.alarmSound=this.audio.play(id==="valve"?"rattle":"alarm",{volume:.45,loop:true,position:{...position,y:1.5},refDistance:4});
        this.ui.subtitle(redirected?"The noise draws its attention. Move while he investigates.":"It still sees you. Break its line of sight.",4);
      });return;
    }
    if(id==="trap"){
      if(this.threat.mode==="trapped")return;
      this.performAction("trap","DROPPING DAMAGED GRILLE",.65,()=>{this.threat.trap(12);this.trapWarned=false;this.ui.subtitle("The grille will only hold briefly. Move.",4);});return;
    }
    if(id==="gate"){
      this.audio.play("rattle",{volume:.48,rate:.7,position:{x:0,y:2,z:1},refDistance:5});
      this.performAction("gate","RAISING EXIT SHUTTER",2.4,()=>{
        this.complete("gate","The exit is open. Get back to your car in bay 042.");
        this.threat.pressure=true;this.threat.hear({x:0,z:5},90);this.scare("pursuit");
      });return;
    }
    if (id === "van") {
      collectNote(s, "incident");
      this.save(false);
      this.ui.previewNote("incident");
    }
  }
  enterShelter(id){
    const spot=this.world.stage.spots.find(s=>s.id===id);if(!spot||this.shelterTransition)return;
    this.cancelAction();this.hideExit={...this.player.pos};
    this.transitionShelter(spot,true);
  }
  leaveShelter(){
    const hidden=this.player.hiding;if(!hidden||this.shelterTransition)return;
    this.transitionShelter(this.world.stage.spots.find(s=>s.id===hidden.id),false);
  }
  transitionShelter(spot,enter){
    const token=this.runToken,p=this.player,v=this.world.visuals;
    const from={...p.pos},to=enter?{x:spot.x,z:spot.z}:{...(this.hideExit||spot.entry)};
    const yaw=p.yaw,turn=Math.atan2(Math.sin(-yaw),Math.cos(-yaw));
    let crossed=false,cued=false;this.shelterTransition=spot.id;
    p.clear();p.movementLocked=true;p.velocity.x=p.velocity.z=0;p.flashlight=false;
    v.contactNode=spot.handle;v.contactPhase=0;
    // The paused animation clock owns door, hand, camera and state together.
    v.animator.to("shelter-transition",0,1,.95,t=>{
      if(token!==this.runToken)return;
      v.contactPhase=t;
      const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
      const open=smooth((t-.2)/.22)*(1-smooth((t-.72)/.28));spot.door.rotation.y=-open*1.15;
      if(t>=.3&&!cued){cued=true;this.audio.play(enter?"hinge-creak-1":"hinge-creak-2",{volume:.16,position:spot.handle.getAbsolutePosition(),refDistance:2});}
      const travel=smooth((t-.42)/.28);
      if(t>=.42&&!crossed){
        crossed=true;
        if(enter){
          const seen=!["dormant","waiting","reveal","trapped"].includes(this.threat.mode)&&this.threat.grace<=0&&this.threat.canSee(p);
          p.hiding={...spot,viewYaw:0,exitHint:{item:{id:"exit-hide",pos:{x:spot.x,y:1.6,z:spot.z+.55}},usable:true,label:"Leave shelter",reason:"",distance:.5}};
          this.threat.observeHide(spot,seen);
          this.ui.subtitle(seen?"It saw you enter. Get out and find another route.":`Keep quiet. ${keyName(this.settings.bindings.interact)} to leave when it is clear.`,4);
        }else p.hiding=null;
      }
      p.pos.x=from.x+(to.x-from.x)*travel;p.pos.z=from.z+(to.z-from.z)*travel;
      p.height=enter?1.68-.07*travel:1.61+.07*travel;
      p.yaw=p.targetYaw=yaw+turn*travel;p.pitch=p.targetPitch=0;p.updateCamera();
    },()=>{spot.door.rotation.y=0;v.contactNode=null;this.shelterTransition=null;p.movementLocked=false;this.updateHUD();},"linear");
  }
  beginEscape(){
    if(!has(this.state,"repair")||!has(this.state,"gate")||this.player.vehicle)return;
    this.threat.hear(this.world.stage.driverHandle,200);
    this.world.stage.beginDrive(this.player);this.audio.play("switch",{volume:.2});
    this.world.visuals.setFlash(false);document.documentElement.classList.add("driving");
    this.ui.subtitle("Getting in. Keep your head down.",2);
  }
  powerPuzzle() {
    let sequence = [];this.circuitPending=false;
    for(let i=0;i<3;i++){this.world.visuals.animator.channels.delete("breaker"+i);this.world.visuals.breakers[i].rotation.z=0;}
    const token=this.runToken;
    this.ui.show(
      "power",
      this.ui.head("ELECTRICAL / CONTROL PANEL", "Restore the supply") +
        '<p>The replacement fuse is seated. Restore the exit supply. The restart procedure is in your journal.</p><div class="puzzle-row"><button data-circuit="0">VENTILATION</button><button data-circuit="1">LIGHTING</button><button data-circuit="2">ACCESS</button></div><p id="power-status">CONTROL FUSE: READY</p><div class="button-row"><button id="power-note" class="btn">Read restart procedure</button></div>',
    );
    for (const b of $("panel").querySelectorAll("[data-circuit]"))
      b.onclick = () => {
        if(this.circuitPending)return;
        const id = Number(b.dataset.circuit);
        if (id !== sequence.length) {
          sequence = [];
          for (let i = 0; i < 3; i++)
            this.world.visuals.switchCircuit(i, false);
          for (const v of $("panel").querySelectorAll("[data-circuit]"))
            v.classList.remove("on");
          $("power-status").textContent =
            "Sequence rejected. Ventilation must precede Lighting, then Access.";
          this.audio.play("rattle", { volume: 0.12, rate: 1.5 });
          return;
        }
        this.circuitPending=true;
        for(const button of $("panel").querySelectorAll("[data-circuit]"))button.disabled=true;
        $("power-status").textContent="Engaging circuit…";
        this.world.visuals.switchCircuit(id,true,()=>{
          this.circuitPending=false;
          if(token!==this.runToken||this.ui.overlay!=="power")return;
          sequence.push(id);b.classList.add("on");
          for(const button of $("panel").querySelectorAll("[data-circuit]"))button.disabled=false;
          $("power-status").textContent=sequence.length+" / 3 CIRCUITS ONLINE";
          if(sequence.length===3){this.ui.hide();this.complete("power","Emergency circuits restored. The Security computer can authorize the exit.");this.scare("powerSurge");this.resume();}
        },position=>this.audio.play("switch",{volume:.3,position}));
      };
    $("power-note").onclick = () => {
      collectNote(this.state, "workorder");
      $("power-status").textContent = "Restart procedure: VENTILATION → LIGHTING → ACCESS. Each correct switch stays lit.";
    };
  }
  keypad() {
    let pin = "";
    this.ui.show(
      "keypad",
      this.ui.head("SECURITY / OVERRIDE", "Authorise access") +
        '<p>Legacy security code: the year Meridian opened. The handover log and north-exit plaque contain the answer.</p><button id="keypad-clue" class="btn">Show collected clue</button><p id="keypad-clue-text"></p><input id="pin" class="keypad-input" aria-label="Four digit security code" inputmode="numeric" maxlength="4" autocomplete="off"><div class="keypad">' +
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "ENTER"]
          .map((n) => `<button data-digit="${n}">${n}</button>`)
          .join("") +
        '</div><p id="pin-status">ENTER FOUR DIGITS</p>',
    );
    $("keypad-clue").onclick = () => { $("keypad-clue-text").textContent = this.state.notes.includes("log") || this.state.notes.includes("plaque") ? "MERIDIAN — EST. 1986. Enter the four-digit year." : "Read the dedication plaque beside the north exit, or request an explicit hint with H after closing this panel."; };
    const submit = () => {
      pin = $("pin").value;
      if (pin === "1986") {
        this.ui.hide();
        this.complete(
          "terminal",
          "Vehicle exit authorized. Raise the shutter at the north gate.",
        );
        this.resume();
      } else {
        $("pin-status").textContent =
          "Access denied. Check the dedication plaque beside the north gate.";
        pin = "";
        $("pin").value = "";
      }
    };
    $("pin").oninput = () => {
      $("pin").value = $("pin").value.replace(/\D/g, "").slice(0, 4);
      pin = $("pin").value;
    };
    $("pin").onkeydown = (e) => {
      if (e.code === "Enter") submit();
    };
    for (const b of $("panel").querySelectorAll("[data-digit]"))
      b.onclick = () => {
        this.audio.play("click", { volume: 0.3, bus: "ui" });
        const n = b.dataset.digit;
        if (n === "ENTER") submit();
        else {
          pin = n === "CLEAR" ? "" : (pin + n).slice(0, 4);
          $("pin").value = pin;
        }
      };
  }
  scare(id){
    this.director ||= new EncounterDirector(this.state);
    this.director.request(id);
  }
  visualReadable(p,min=5,max=23){
    const dx=p.x-this.player.pos.x,dz=p.z-this.player.pos.z,d=Math.hypot(dx,dz);
    const dot=d?(Math.sin(this.player.yaw)*dx+Math.cos(this.player.yaw)*dz)/d:1;
    const fov=this.world.camera.fov||1.36;
    const aspect=(this.engine?.getRenderWidth()/this.engine?.getRenderHeight())||16/9;
    const halfVertical=Math.atan(Math.tan(fov/2)/aspect);
    const elevation=Math.atan2((p.y??1.1)-(this.player.height??1.68),Math.max(.1,d));
    return d>=min&&d<=max&&dot>Math.cos(fov*.48)&&Math.abs(elevation+(this.player.pitch||0))<halfVertical*.96&&sightClear({...this.player.pos,y:this.player.height??1.68},{...p,y:p.y??1.1},this.world.rects);
  }
  recordEncounter(id){
    this.director ||= new EncounterDirector(this.state);this.director.commit(id);
    this.impactTime=.42;
    this.encounterPending=null;this.recoveryLog?.record("encounter",{id});this.updateHUD();this.save(false);
  }
  tickEncounters(dt){
    this.director ||= new EncounterDirector(this.state);this.director.tick(dt,this.threat.mode,this.sessionFailures||0);
    this.creatureScenes ||= new CreatureScenes(this);
    if(this.creatureScenes.tick(dt))return;
    const a=this.world.atmosphere,near=p=>Math.hypot(p.x-this.player.pos.x,p.z-this.player.pos.z);
    const equipment=this.world.equipment;
    if(equipment&&has(this.state,'key')&&roomAt(this.player.pos)==='pump'&&near(equipment.source||{x:29.5,z:99.6})<8)this.director.request('pressureBurst');
    // Walking away from the first reveal must not leave the monster dormant for
    // the entire game. It follows the key-desk noise through real doorways; its
    // first later visible appearance becomes the saved encounter instead.
    if(this.director.queue.includes("securityBreach")&&this.threat.mode==="dormant"&&near(a.securityPosition)>9)
      this.threat.releaseStage({x:-23.25,z:18},3);
    const id=this.director.next({mode:this.threat.mode,hiding:!!this.player.hiding,vehicle:!!this.player.vehicle,busy:!!this.pendingAction,ready:id=>{
      if(id==="securityBreach")return Math.hypot(this.threat.pos.x-a.securityActor.x,this.threat.pos.z-a.securityActor.z)<1
        ?this.visualReadable({...a.securityPosition,z:16.58},.3,7)
        :this.visualReadable({...this.threat.pos,y:1.5},3,15);
      if(id==="workshopBreach")return (typeof this.threat.stageRoute!=='function'||this.creatureScenes.fallbackReady('workshopBreach'))&&this.visualReadable(a.hatchPosition,.3,8);
      if(id==="powerSurge")return (typeof this.threat.stageRoute!=='function'||this.creatureScenes.fallbackReady('powerSurge'))&&this.visualReadable(a.surgePosition,.3,8);
      if(id==="pursuit")return near(a.lampPosition)<12&&this.visualReadable(a.lampPosition,.5,15);
      if(id==='pressureBurst')return equipment&&this.visualReadable(equipment.source,.8,8);
      return false;
    }});
    if(!id){
      const queued=this.director.queue.find(k=>["securityBreach","workshopBreach","powerSurge"].includes(k));
      const point=queued==="securityBreach"?a.securityPosition:queued==="workshopBreach"?a.hatchPosition:a.surgePosition;
      if(queued&&near(point)<8&&!this.player.hiding&&!this.director.chasing&&!this.pendingAction&&(this.nextScareCue??0)<this.gameTime){
        this.nextScareCue=this.gameTime+9;
        this.audio.play("metal-stress",{volume:.18,position:point,refDistance:3});
        this.ui.subtitle(queued==="securityBreach"?"[A latch shifts behind the desk.]":queued==="workshopBreach"?"[The loose service hatch strains.]":"[The relay housing begins to vibrate.]",2.8);
      }
      return;
    }
    const token=this.runToken;this.encounterPending=id;this.audio.prepareBeat?.();
    const impact=(position,caption,sound="hatch-impact")=>{
      if(token!==this.runToken)return;
      this.recordEncounter(id);this.audio.play(sound,{volume:.52,position,refDistance:4});
      this.ui.subtitle(caption,3.5);
    };
    if(id==='pressureBurst'){
      this.audio.play('lv113-pressure-burst',{volume:.55,position:equipment.source,refDistance:4});
      let released=false;
      this.world.visuals.animator.to('pressure-burst',0,1,1.4,t=>{
        if(!released&&t>=.18/1.4){released=true;equipment.burst();this.recordEncounter(id);this.ui.subtitle('[The pipe joint splits. Water hisses onto the concrete.]',3.5);}
      },()=>{},'linear');
    }else if(id==="securityBreach"&&Math.hypot(this.threat.pos.x-a.securityActor.x,this.threat.pos.z-a.securityActor.z)>=1){
      const evidence=this.threat.lastKnown||{x:-23.25,z:18};
      this.threat.stageRoute([{...this.threat.pos}],"Listen");let sounded=false;
      this.world.visuals.animator.to("first-sighting",0,1,1.4,t=>{
        if(t>.35&&!sounded){sounded=true;impact({...this.threat.pos,y:1.6},"[It stops. Its head turns toward you.]","creature-breath");}
      },()=>{if(token===this.runToken)this.threat.releaseStage(evidence,2.2);},"smooth");
    }else if(id==="securityBreach"){
      // The creature has occupied this screened alcove since the level began.
      // This reveal never moves it across the level or inflicts scripted damage.
      this.threat.mode="waiting";this.threat.yaw=0;this.world.worker.setEnabled(true);
      const evidence={...this.player.pos};
      a.playSecurity(()=>{impact(a.securityPosition,"[Something strikes the wired glass.]");this.audio.play("creature-attack",{volume:.32,position:{...this.threat.pos,y:1.7}});},()=>{
        if(token!==this.runToken)return;this.threat.releaseStage(evidence,2.8);
        if(this.threat.pursueIfSeen(this.player,this.state.difficulty==='easy'?2:1.2))this.ui.subtitle("It saw you. Sprint behind a vehicle, then use a SHELTER locker after breaking sight.",5);
      });
    }else if(id==="workshopBreach"){
      this.audio.play("metal-stress",{volume:.24,position:a.hatchPosition});
      a.blackoutTime=2;
      a.playHatch(()=>{impact(a.hatchPosition,"[The service hatch bursts open. Metal scrapes behind it.]");this.threat.hear({x:-22,z:76},200);});
    }else if(id==="powerSurge"){
      a.playSurge(()=>{impact(a.surgePosition,"[A relay bursts. Emergency lighting takes over.]","surge");this.threat.hear(a.surgePosition,110);});
    }else if(id==="pursuit")a.playLamp(()=>impact(a.lampPosition,"[The hanging lamp strikes a metal guard.]"));
  }
  tickAmbient(dt){
    this.ambientCueTime=(this.ambientCueTime??18)-dt;
    if(this.ambientCueTime>0||this.pendingAction||this.player.vehicle||this.director?.active||this.director?.quiet>0||["chase","attack","recover","inspect"].includes(this.threat.mode))return;
    this.ambientCueTime=22+Math.random()*16;
    const room=roomAt(this.player.pos),cues={
      security:["wood-crack",-29,3.4,17],storage:["wood-creak",-27,1.3,38],
      workshop:["metal-stress",-29.6,2.65,74],pump:["metal-stress",28,2,99],
      electrical:["wood-creak",28,1,46],
    },cue=cues[room];
    if(cue){const [name,x,y,z]=cue;this.audio.play(name,{volume:.13,position:{x,y,z},refDistance:2});}
  }
  tickThreat(dt){
    const actor=this.world.worker;
    if(this.captureTime!==null&&this.captureTime!==undefined){
      this.captureTime=Math.max(0,this.captureTime-dt);
      this.world.visuals.setActorMotion(this.captureInLocker?"Inspect":"Attack",0,this.captureInLocker?.48:.5+(1-this.captureTime/.42)*.25);
      if(this.captureTime===0)this.showCaught();
      return;
    }
    if(this.threat.mode==="dormant")return;
    actor.setEnabled(true);this.player.visibility=this.world.stage.visibility(this.player.pos);
    const previous=this.threat.mode,result=this.threat.tick(dt,this.player);
    actor.position.set(this.threat.pos.x,0,this.threat.pos.z);actor.rotation.y=this.threat.yaw;
    this.actorStrike=Math.max(0,(this.actorStrike||0)-dt);
    let clip=result.animation||(this.threat.speed>2.3?"Run":this.threat.speed>.1?"Walk":"Idle"),phase=result.phase;
    if(this.world.atmosphere.securityActive){
      clip="Strike";const t=this.world.atmosphere.securityPhase;
      // The rig's strike contacts at normalized phase .50; match the glass cue.
      if(t<.2){clip='Listen';phase=t*2.5;}else phase=t<.58?(t-.2)/.38*.5:.5+(t-.58)/.42*.5;
    } else if(this.escapeStrike){clip='Strike';phase=Math.min(1,this.escapeStrike.time/1.2);}
    else if(this.actorStrike>0){clip="Strike";phase=.5;}
    else if(this.creatureScenes?.pose){clip=this.creatureScenes.pose.clip;phase=this.creatureScenes.pose.phase;}
    this.world.visuals.setActorMotion(clip,this.threat.speed,phase);
    this.world.visuals.attention?.update(dt,this.threat.attentionPoint(),this.threat.yaw,clip,this.threat.bodyLean);
    if(previous!==this.threat.mode&&['inspect','listen','recover'].includes(this.threat.mode))this.audio.play('lv113-cloth-shift',{volume:.25,position:{...this.threat.pos,y:1.2},refDistance:2});
    if(result.attackStarted){this.audio.play("creature-attack",{volume:.42,position:{...this.threat.pos,y:1.6},refDistance:3});this.ui.subtitle("[It raises a long arm. Move!]",1.2);}
    if(result.trapContactCue)this.audio.play('handle-strain',{volume:.32,position:{x:-17.04,y:1.3,z:76},refDistance:3});
    if(result.attackMissed)this.audio.play("creature-recover",{volume:.3,position:{...this.threat.pos,y:1.5}});
    this.creatureVoiceTime=Math.max(0,(this.creatureVoiceTime||0)-dt);
    if(!this.creatureVoiceTime&&result.distance<13&&["listen","search","inspect","patrol"].includes(this.threat.mode)){
      this.creatureVoiceTime=10;this.audio.play("creature-breath",{volume:.22,position:{...this.threat.pos,y:1.6},refDistance:2});
    }
    if(this.revealPending&&result.revealed&&this.visualReadable(this.threat.pos)){
      this.revealPending=false;this.recordEncounter("watcher");
      this.ui.subtitle("[A figure moves between the parked cars.]",3);
    }

    if(this.threat.mode==='chase'&&previous!=='chase'&&this.state.difficulty==='easy'&&this.settings.easyAdrenaline&&this.player.stamina<.28&&this.gameTime-(this.adrenalineAt??-Infinity)>35){
      this.player.stamina=Math.min(1,this.player.stamina+.2);this.player.exhausted=false;this.adrenalineAt=this.gameTime;this.ui.toast('A second wind · Easy stamina assist',2000);
    }
    if(this.threat.mode!==this.lastThreatMode){
      this.audio.setTension(this.threat.mode);
      if(this.threat.mode==="search"&&result.distance<22)this.ui.subtitle("[Its footsteps slow nearby.]",3);
      this.lastThreatMode=this.threat.mode;
    }
    // The handle caption and sound occur at the door, not when an inspection is
    // merely planned at the other end of the room.
    const inspecting=result.inspecting?this.threat.inspectSpot?.id:null;
    if(inspecting&&inspecting!==this.inspectionKey){
      this.inspectionImpact=null;
      if(result.distance<12)this.ui.subtitle("[Its shadow covers the locker slats.]",3);
    }
    this.inspectionKey=inspecting;
    const inspectionPhase=this.threat.inspectTime/this.threat.rules.inspection;
    if(inspecting&&inspectionPhase>=.42&&this.inspectionImpact!==inspecting){
      this.inspectionImpact=inspecting;const spot=this.threat.inspectSpot;
      this.audio.play('handle-strain',{volume:.42,position:{x:spot.x+.36,y:1.1,z:spot.z+.49},refDistance:2});
      if(result.distance<12)this.ui.subtitle('[The handle tightens. It listens at the door.]',3);
      if(this.player.hiding?.id===inspecting&&!this.state.journal.observations.includes("heardDoor"))this.state.journal.observations.push("heardDoor");
      if(this.player.hiding?.id===inspecting&&!this.state.scares.includes('shelterInspection'))this.recordEncounter('shelterInspection');
    }
    for(const spot of this.world.stage.spots)if(!this.world.visuals.animator.channels.has(spot.id)){
      const active=this.threat.inspectSpot?.id===spot.id&&result.inspecting;
      spot.door.rotation.y=active?-((this.threat.witness===spot.id||this.threat.inspectionAuthorized)?.9:.09)*Math.sin(Math.min(1,inspectionPhase)*Math.PI):0;
    }
    if(this.threat.mover?.recoveries!==this.lastNavRecoveries){
      this.lastNavRecoveries=this.threat.mover?.recoveries;
      this.recoveryLog?.record('route-recovery',{x:this.threat.pos.x,z:this.threat.pos.z,mode:this.threat.mode,attempts:this.threat.escapeAttempts});
    }
    if(result.escapingTrap&&!this.trapWarned){this.trapWarned=true;this.ui.subtitle("[The grille latch is giving way.]",3);this.audio.play("metal",{volume:.32,position:{x:-17,y:1,z:76}});}
    if(previous==="trapped"&&this.threat.mode!=="trapped")this.world.visuals.animator.to("release-grille",1,0,.8,t=>this.world.visuals.setGrille(t));
    this.distractionTime=Math.max(0,(this.distractionTime||0)-dt);
    if(this.distractionTime<9&&this.alarmSound){try{this.alarmSound.src.stop();}catch{}this.alarmSound=null;}
    const pressure=result.distance===undefined||this.player.hiding?0:Math.max(0,.52-result.distance/22);
    $("danger").style.opacity=String(Math.min(1,pressure*2));
    if(result.caught&&!this.player.vehicle)this.caught();
  }
  caught() {
    if(this.captureTime!==null&&this.captureTime!==undefined)return;
    this.sessionFailures=(this.sessionFailures||0)+1;
    this.captureTime=.42;this.captureInLocker=!!this.player.hiding;
    if(this.pendingAction){
      this.pendingAction=null;this.world.visuals.animator.channels.delete("interaction");
      this.world.visuals.actionId="";this.world.visuals.actionPhase=0;
      this.world.sync(this.state,false);$("action-progress").classList.add("hidden");
    }
    this.player.clear?.();this.player.movementLocked=true;
    this.audio.play("scare", { volume: .48 });
  }
  showCaught() {
    this.ui.show(
      "caught",
      this.ui.head("THE OTHER SHIFT", "Too close", false) +
        '<p>The Attendant reached you. Your last safe checkpoint is intact.</p><div class="button-row"><button id="retry" class="btn accent">Retry checkpoint</button><button id="caught-menu" class="btn">Return to title</button></div>',
    );
    $("retry").onclick = () => {
      this.lureCaption = false;
      this.start(true);
    };
    $("caught-menu").onclick = () => this.toMenu();
  }
  showEnding() {
    this.stopInput();
    $("menu").classList.add("hidden");
    $("hud").classList.add("hidden");
    $("danger").style.opacity = "0";
    this.audio.setTension(false);this.audio.stopEngine?.();document.documentElement.classList.remove("driving");
    const evidence = ["log", "incident", "dispatch"].filter((x) =>
      this.state.notes.includes(x),
    ).length;
    this.ui.show(
      "ending",
      this.ui.head("04 / THE FIRST LIGHT", "You were the last.", false) +
        `<p>Your headlights reach the street as the first bus turns the corner. In the mirror, the garage entrance falls away. You keep driving.</p><p>${evidence === 3 ? "You give the police the incident report, the shift log, and the dispatch transcript. This time, the garage cannot call it an electrical fault." : "You report the sabotage and the thing that chased you. The repaired battery lead is still warm under the hood. There are gaps in the story, but you are here to tell it."}</p><div class="stat-grid"><div>${Math.floor(this.state.seconds / 60)}:${String(Math.floor(this.state.seconds % 60)).padStart(2, "0")}<small>TIME IN MERIDIAN</small></div><div>${evidence} / 3<small>EVIDENCE RECOVERED</small></div><div>${this.state.scares.filter(id=>MAJOR_ENCOUNTERS.includes(id)).length} / 3<small>STORY ENCOUNTERS</small></div></div><p class="eyebrow">A GingrSnaps Project</p><div class="button-row"><button id="end-title" class="btn accent">Return to title</button><button id="end-credits" class="btn">Credits</button></div>`,
    );
    this.audio.endingFade?.();
    $("end-title").onclick = () => this.toMenu();
    $("end-credits").onclick = () => {
      this.toMenu();
      this.ui.credits();
    };
  }
  frame() {
    const now = performance.now();
    this.pollController(now);
    // UI timers run independently of rendering; Keep/Revert works at any FPS cap.
    this.ui.tick(now);
    if (this.presenting || document.hidden) return;
    const opaquePanel = this.ui.overlay && this.ui.overlay !== "power" && this.ui.overlay !== "contrast" && !this.graphics.baseline;
    if (!this.playing && opaquePanel && !this.renderDirty) return;
    const cap = this.playing ? this.settings.fpsCap : this.settings.menuFPS;
    const interval = cap ? 1000 / cap : 0;
    if (interval && now < (this.nextRender || 0) - Math.min(1.5,interval*.1)) return;
    this.nextRender = nextFrameDeadline(this.nextRender || 0, now, interval);
    const elapsed = now - (this.lastTime || now);
    const dt = Math.min(.075, elapsed / 1000);
    this.lastTime = now; this.lastRender = now; this.renderDirty = false;
    const sampledGameplay = this.playing;
    const skipTelemetry = this.skipFrameSample;
    this.hitches.begin(performance.now());
    if (sampledGameplay) {
      if (!this.skipFrameSample) this.stats.push(elapsed);
      this.skipFrameSample = false;
      this.gameTime += dt;
    } else if (!this.started && !opaquePanel) this.gameTime += dt;
    if (this.playing) {
      this.state.seconds += dt;
      this.footwear ||= new Footwear();
      const move = this.player.tick(dt);
      if(this.promptDevice!==this.player.inputDevice){this.promptDevice=this.player.inputDevice;this.updateHUD();}
      if (move.step) {
        this.leftFoot=!this.leftFoot;
        const point=footContact(this.player.pos,this.player.yaw,this.leftFoot);
        const profile=this.footwear.contact(point,{crouched:move.crouched,sprinting:this.player.sprinting,extraWater:this.world.extraWater});profile.yaw=this.player.yaw;
        this.threat.hear(point,profile.hearing);this.audio.footstep(point,profile);
        this.world.surfaces.emit(point,profile);
        if(profile.wetness>.2&&!profile.water&&!this.state.journal.observations.includes("wetTracks"))this.state.journal.observations.push("wetTracks");
      }
      this.hitches.section("movement");
      this.audio.updateListener(this.player, this.world.rects, dt);
      this.audio.updateScene?.(dt,roomAt(this.player.pos),this.threat.mode,this.player,this.state,this.world.equipment);
      this.hitches.section("audio");
      this.nearbyHint = this.pendingAction
        ? null
        : this.player.interactionHint(id => this.getAvailability(id));
      if(this.nearbyHint?.locked&&['repair','fuse','power','terminal','gate'].includes(this.nearbyHint.action)){
        this.state.journal.mechanisms ||= [];
        if(!this.state.journal.mechanisms.includes(this.nearbyHint.action))this.state.journal.mechanisms.push(this.nearbyHint.action);
      }
      this.target = this.nearbyHint?.usable ? this.nearbyHint.item : null;
      this.world.visuals.focusOn(
        this.nearbyHint?.item,
        this.settings.interactionHighlight && !this.player.hiding,
      );
      this.ui.interaction(this.nearbyHint);
      if (this.pendingAction) {
        this.pendingAction.elapsed += dt;
        $("action-fill").style.width = this.world.visuals.actionPhase * 100 + "%";
        if (this.pendingAction.elapsed > this.pendingAction.duration + 0.5) this.cancelAction();
      }
      $("crosshair").classList.toggle("active", !!this.target);
      $('stamina-fill').style.transform=`scaleX(${this.player.stamina})`;
      const stamina=$('stamina-meter'),mode=this.settings.staminaMode;
      stamina.classList.toggle('hidden',mode==='off'||mode!=='always'&&!this.player.sprinting&&this.player.stamina>.995);
      stamina.classList.toggle('low',this.player.stamina<.28);
      const percent=Math.round(this.player.stamina*100);if(this.staminaPercent!==percent){this.staminaPercent=percent;stamina.setAttribute('aria-valuenow',percent);this.ui.text('stamina-label',this.player.exhausted?'CATCH YOUR BREATH':'STAMINA');}
      const p = this.player.pos;
      const location =
        p.x < -17
          ? p.z < 29
            ? "SECURITY"
            : p.z < 58
              ? "STORAGE"
              : p.z < 88
                ? "WORKSHOP"
                : "SERVICE BAY"
          : p.x > 17
            ? p.z > 86
              ? "PUMP ROOM"
              : "ELECTRICAL"
            : "MERIDIAN / B2";
      this.ui.text("location", location);

      this.hitches.section("interactionAndHUD");
      this.threat.observeTracks?.(this.world.surfaces.traces);
      this.tickThreat(dt);this.hitches.section("threat");
      if(this.playing){this.tickEncounters(dt);this.hitches.section("encounters");this.tickAmbient(dt);this.hitches.section("environment");}
      this.world.atmosphere.tick(dt,this.gameTime,this.player,true);
      this.world.surfaces.tick(dt);
      this.world.equipment?.tick(dt,this.gameTime,this.player,this.settings);
      this.world.distractions?.tick(dt,point=>{
        this.audio.play('lv114-bolt-impact',{volume:.46,position:point,refDistance:4});
        this.threat.hearBolt?.(point);this.save(false);
      });
      this.world.richDetails?.tick(dt,this.gameTime,this.player);
      this.world.updateRoomVisibility?.(this.player.pos,dt);
      this.hitches.section("surfaceEffects");
      this.guidanceTick=(this.guidanceTick || 0)+dt;
      if(this.guidanceTick>=.1) {this.tickGuidance(this.guidanceTick);this.guidanceTick=0;}
      this.scareTime = Math.max(0, this.scareTime - dt * 0.55);
      this.world.updateLights(
        this.player.pos,
        this.gameTime,
        this.player.flashlight,
        this.scareTime,
      );
      this.hitches.section("lightingAndGuidance");
      if(this.player.vehicle){
        const stage=this.world.stage,finished=stage.tickDrive(dt,this.player);
        if(stage.driveTime>=1.5&&!stage.engineStarted){
          stage.engineStarted=true;this.audio.play("door-close",{volume:.48});this.audio.startEngine?.();
          this.ui.subtitle("Door latched. Engine running. You're leaving Meridian.",4);
        }
        const window=this.threat.mode==="chase"?stage.nearbyWindow(this.threat.pos):null;
        if(window&&!this.escapeStrike&&lineClear(this.threat.pos,window.position,this.world.rects,.02)){
          stage.windowHit=true;this.escapeStrike={time:0,window,hit:false};
          this.threat.stageRoute([{...this.threat.pos}],'Strike');
          const dx=window.position.x-this.threat.pos.x,dz=window.position.z-this.threat.pos.z;
          this.threat.yaw=Math.atan2(dx,dz)-Math.atan2(-.2,1.1);
        }
        if(this.escapeStrike){
          const strike=this.escapeStrike;strike.time+=dt;
          this.world.visuals.setActorMotion('Strike',0,Math.min(1,strike.time/1.2));
          if(strike.time>=.6&&!strike.hit){
            strike.hit=true;this.recordEncounter('window');
            this.audio.play('door-strike',{volume:.58,position:strike.window.position,refDistance:2});
            this.ui.subtitle('[Its palm hits the left window. The engine pulls away.]',2.5);
          }
          if(strike.hit)strike.window.door.node.rotation.y+=Math.sin((strike.time-.6)*45)*.014*Math.exp(-(strike.time-.6)*9);
          if(strike.time>=1.2){this.threat.releaseStage({...this.player.pos},.5);this.escapeStrike=null;}
        }
        this.audio.updateEngine?.(stage.driveTime);
        if(finished){mark(this.state,"escaped");this.save(false);this.showEnding();}
      }
      this.autosaveTime += dt;
      if (this.autosaveTime >= 30) {
        this.autosaveTime = 0;
        this.queueAutosave();
      }
    } else if (!this.started && this.ui.overlay!=="contrast") this.world.menuCamera(this.gameTime);
    // Freeze skeletal motion while a menu is open. Breaker lever UI animation is
    // advances only in its own modal, with its contact/commit callback, while the threat stays paused.
    this.world.scene.animationsEnabled = this.playing;
    this.world.visuals.setGameplay(this.playing||this.ui.overlay==="power");
    this.world.visuals.tick(
      dt,
      this.gameTime,
      this.player,
      this.playing,
      this.ui.overlay === "power",
    );
    if(this.playing){
      this.impactTime=Math.max(0,(this.impactTime||0)-dt);
      const impact=this.impactTime/.42;
      $('impact-edge').style.opacity=String(impact*(this.settings.scareScreenEffects??.65)*.45);
      if(!this.player.vehicle&&!this.settings.reducedMotion&&impact){
        this.world.camera.rotation.z=Math.sin(this.gameTime*46)*impact*(this.settings.cameraShake??.5)*.012;
        this.world.camera.getViewMatrix(true);
      }
    }else $('impact-edge').style.opacity='0';
    if(this.ui.overlay==="contrast"){this.world.flash.intensity=this.previewBeam?950:0;this.world.spill.intensity=this.previewBeam?90:0;}
    this.hitches.section("animation");
    this.world.scene.render();
    this.hitches.section("renderSubmission");
    if (sampledGameplay && this.playing && this.world.visuals.actorFootstep()) {
      const p = this.world.worker.position;
      this.creatureLeftFoot=!this.creatureLeftFoot;
      const point=footContact(p,this.threat.yaw,this.creatureLeftFoot),profile=stepProfile(point,{creature:true,extraWater:this.world.extraWater});
      this.audio.footstep(point,profile,true);this.world.surfaces.emit(point,profile);
        if(profile.wetness>.2&&!profile.water&&!this.state.journal.observations.includes("wetTracks"))this.state.journal.observations.push("wetTracks");
      if(profile.water&&Math.hypot(point.x-this.player.pos.x,point.z-this.player.pos.z)<9&&this.gameTime>(this.nextSplashCaption||0)){
        this.nextSplashCaption=this.gameTime+5;this.ui.subtitle('[Heavy footsteps splash nearby.]',2.3);
      }
    }
    this.cpuMs = performance.now() - now;
    // Do not allocate a diagnostic context on normal frames, or treat time in
    // menus as a hitch. This is CPU submission time, not GPU completion time.
    if(sampledGameplay && !skipTelemetry && (elapsed>=50 || this.cpuMs>=35))
      this.hitches.finish(elapsed,{x:Math.round(this.player.pos.x),z:Math.round(this.player.pos.z),flashlight:this.player.flashlight,drawCalls:this.sceneInstrumentation?.drawCallsCounter.current ?? null});
    const gpu = this.instrumentation?.gpuFrameTimeCounter;
    this.gpuMs = gpu?.count && gpu.current > 0 ? gpu.current * 0.000001 : null;
    if(sampledGameplay&&!skipTelemetry&&this.calibration&&!this.calibration.done){
      this.calibration.sample(dt,elapsed,this.player,roomAt(this.player.pos),this.cpuMs,this.gpuMs);
      if(this.calibration.done)this.ui.toast('Performance sample ready. Review it in Settings → Performance.',6500);
    }
    if (sampledGameplay && this.settings.adaptive && this.adaptive.tick(dt, this.gpuMs, this.cpuMs, 1000 / (this.settings.fpsCap || 60), this.settings.adaptiveFloor)) this.resize();
    if (sampledGameplay && now >= (this.nextStats || 0)) {
      this.nextStats = now + 250;
      if (this.settings.fpsMode !== "off") this.ui.performanceOverlay(this.stats.summary());
    }
  }

  pollController(now){
    if(!this.controller||!this.player)return;
    const dt=Math.min(.05,Math.max(0,(now-(this.padTime||now))/1000));this.padTime=now;
    const pad=this.controller.poll(this.settings);
    if(pad.disconnected){this.player.clear();if(this.playing){this.pause();this.ui.toast('Controller disconnected. Reconnect it or resume with mouse controls.');}return;}
    if(this.controller.blocked&&!this.controllerWarning){this.controllerWarning=true;this.ui.toast("Controller access is blocked here. Mouse and keyboard remain available.",6500);}
    if(!this.controller.blocked)this.controllerWarning=false;
    if(document.hidden)return;
    if(this.playing){
      this.player.padMove=pad.move;this.player.padSprint=!!pad.held[10];this.player.padCrouch=!!pad.held[1];
      if(Math.hypot(pad.move.x,pad.move.y)+Math.hypot(pad.look.x,pad.look.y)>.05||pad.pressed.length)this.player.inputDevice='controller';
      if(Math.hypot(pad.look.x,pad.look.y)>0){
        // Stick rotation is radians/second; mouse deltas stay independent of dt.
        this.player.look(pad.look.x*dt*2.2*this.settings.controllerLook/(.0021*this.settings.sensitivity),pad.look.y*dt*1.7*this.settings.controllerLook/(.0021*(this.settings.separateAxes?this.settings.sensitivityY:this.settings.sensitivity)), 'controller');
      }
      for(const b of pad.pressed){
        if(b===9){this.pause();return;}
        if(b===10&&this.settings.sprintMode==='toggle')this.player.toggleSprint=!this.player.toggleSprint;
        if(b===1&&this.settings.crouchMode==='toggle')this.player.toggleCrouch=!this.player.toggleCrouch;
        const action={0:'interact',2:'flashlight',3:'journal',8:'hint',5:'throw',12:'objective'}[b];if(action)this.action(action);
        if(!this.playing)return;
      }
    }else if(this.controller.connected){
      const panel=this.ui.overlay?$('panel'):$('menu');
      const controls=Array.from(panel?.querySelectorAll?.('button:not(:disabled),input,select,a[href]')||[]).filter(e=>!e.closest?.('.hidden')&&!e.hidden);
      let i=controls.indexOf(document.activeElement);
      if(pad.pressed.some(b=>b===12||b===13)){i=(i+(pad.pressed.includes(12)?-1:1)+controls.length)%controls.length;controls[i]?.focus();}
      if(pad.pressed.includes(0)){
        const button=controls[i]||controls[0];
        // A pad button is not a pointer-lock user gesture. Resume through the
        // controller path even if mouse-look was used earlier in this session.
        if(this.started&&['resume','capture-retry','journal-resume'].includes(button?.id))this.resume('controller');else button?.click();
      }
      if(pad.pressed.includes(1)&&this.ui.overlay)this.ui.back();
      if(pad.pressed.includes(9)&&this.started&&['pause','capture'].includes(this.ui.overlay))this.resume('controller');
      const focused=controls[i],direction=pad.pressed.includes(15)?1:pad.pressed.includes(14)?-1:0;
      if(direction&&focused?.type==='range'){focused.value=String(Math.max(Number(focused.min),Math.min(Number(focused.max),Number(focused.value)+direction*Number(focused.step||1))));focused.oninput?.();}
      if(direction&&focused?.tagName==='SELECT'){focused.selectedIndex=Math.max(0,Math.min(focused.options.length-1,focused.selectedIndex+direction));focused.oninput?.();}
    }
  }
  beginCalibration(){this.calibration=new PerformanceSetup();this.ui.hide();this.resume();this.ui.toast('Walk through the garage and one room, turn around, and use the flashlight. Only active play is measured.',6500);}
}
