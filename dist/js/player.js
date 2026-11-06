import { InteractionFocus } from "./interaction.js?v=1.19.0";
import { MouseCapture } from "./capture.js?v=1.19.0";
import { difficultyRules } from "./difficulty.js?v=1.19.0";
import { moveCircle } from "./navigation.js?v=1.19.0";

/** A single input owner. Mouse deltas represent angles, so never multiply them by
 * frame time or devicePixelRatio. Translation and interpolation DO use seconds. */
export class Player {
  constructor(world, canvas, settings, onAction, onCapture = () => {}) {
    Object.assign(this, { world, canvas, settings, onAction, onCapture });
    this.keys = new Set();
    this.focus=new InteractionFocus();this.inputDevice='mouse';
    this.active = false;
    this.flashlight = false;
    this.hiding=null;this.vehicle=false;
    this.pos = { x: 10, z: 98 };
    this.yaw = Math.PI;
    this.pitch = 0;
    this.targetYaw = this.yaw;
    this.targetPitch = 0;
    this.height = 1.68;
    this.stamina = 1;
    this.exhausted = false;
    this.walkClock = 0;
    this.stepClock = 0;
    this.distance = 0;
    this.velocity = { x: 0, z: 0 };
    this.touchMove = { x: 0, y: 0 };
    this.padMove={x:0,y:0};this.padSprint=false;this.padCrouch=false;
    this.sprinting = false;
    this.crouched = false;
    this.touchSprint = false;
    this.toggleSprint = this.toggleCrouch = false;
    this.captureMode = "locked";
    this.lockPending = false;
    this.dragging = false;
    this.ignoreNextDelta = false;
    this.movementLocked = false;
    this.lastDrag = null;
    this.lookVelocity = { x: 0, y: 0 };
    this.rules = difficultyRules("medium");
    this.mouseCapture = new MouseCapture(canvas, (status, message) => {
      if (status === "locked") {
        this.captureMode = "locked";
        this.ignoreNextDelta = true;
        this.clear();
      }
      this.onCapture(status, message);
    });
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.target?.matches?.("input,select,textarea,button"))
        return;
      if (
        Object.values(this.settings.bindings).includes(e.code) ||
        e.code === "Tab"
      )
        e.preventDefault();
      this.keys.add(e.code);
      this.inputDevice='keyboard';
      if (!e.repeat) {
        if (e.code === this.settings.bindings.sprint && this.settings.sprintMode === "toggle") this.toggleSprint = !this.toggleSprint;
        if (e.code === this.settings.bindings.crouch && this.settings.crouchMode === "toggle") this.toggleCrouch = !this.toggleCrouch;
      }
      if (!e.repeat)
        for (const action of ["interact", "flashlight", "journal", "hint", "objective", "throw"])
          if (e.code === this.settings.bindings[action]) {if(action==='throw'&&this.settings.throwGuide)this.throwAiming=true;else this.onAction(action);}
    });
    window.addEventListener("keyup", (e) => {this.keys.delete(e.code);if(e.code===this.settings.bindings.throw&&this.throwAiming){this.throwAiming=false;if(this.active)this.onAction('throw');}});
    window.addEventListener("blur", () => this.clear());
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.active || e.pointerType === "touch" || e.button !== 0) return;
      if (this.captureMode === "drag") {
        this.dragging = true;
        this.lastDrag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture?.(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (
        !this.active ||
        this.captureMode !== "drag" ||
        !this.dragging ||
        !this.lastDrag
      )
        return;
      this.look(e.clientX - this.lastDrag.x, e.clientY - this.lastDrag.y);
      this.lastDrag = { x: e.clientX, y: e.clientY };
    });
    const endDrag = () => {
      this.dragging = false;
      this.lastDrag = null;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    window.addEventListener("mousemove", (e) => {
      if (
        !this.active ||
        this.captureMode !== "locked" ||
        document.pointerLockElement !== canvas
      )
        return;
      // Browsers may deliver a cursor-recentring packet immediately after capture.
      if (this.ignoreNextDelta) {
        this.ignoreNextDelta = false;
        return;
      }
      this.look(e.movementX, e.movementY);
    });
  }
  clear() {
    this.throwAiming=false;
    this.keys.clear();
    this.focus?.reset();
    this.touchMove = { x: 0, y: 0 };
    this.padMove={x:0,y:0};this.padSprint=false;this.padCrouch=false;
    this.velocity = { x: 0, z: 0 };
    this.dragging = false;
    this.lastDrag = null;
    this.sprinting = false;
    this.touchSprint = false;
    this.toggleSprint = this.toggleCrouch = false;
    this.lookVelocity = { x: 0, y: 0 };
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
  }
  lock(options = {}) {
    return this.mouseCapture.request(options);
  }
  cancelCapture() {
    this.mouseCapture.cancel();
  }
  useDragControls() {
    this.cancelCapture();
    this.captureMode = "drag";
    this.ignoreNextDelta = false;
    this.clear();
  }
  look(x, y, device='mouse') {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if(x||y)this.inputDevice=device;
    // Ignore implausible focus-loss packets, without clipping ordinary fast swipes.
    if (Math.abs(x) > 2000 || Math.abs(y) > 2000) return;
    const gain = 0.0021 * this.settings.sensitivity;
    this.targetYaw += x * gain;
    this.targetPitch = Math.max(
      -1.3,
      Math.min(
        1.3,
        this.targetPitch + y * (this.settings.separateAxes ? 0.0021 * this.settings.sensitivityY : gain) * (this.settings.invertY ? -1 : 1),
      ),
    );
    this.lookVelocity.x = x; this.lookVelocity.y = y;
    const heading=this.vehicle?this.vehicleHeading:this.hiding?.viewYaw;
    if(heading!==undefined && heading!==null){this.targetYaw=Math.max(heading-.9,Math.min(heading+.9,this.targetYaw));this.targetPitch=Math.max(-.45,Math.min(.5,this.targetPitch));}
    if (!this.settings.lookSmoothing) {
      this.yaw = this.targetYaw;
      this.pitch = this.targetPitch;
    }
  }
  restore(cp) {
    this.pos = { x: cp.x, z: cp.z };
    this.yaw = cp.yaw;
    this.pitch = 0;
    this.height = 1.68;
    this.stamina = 1;
    this.exhausted = false;
    this.movementLocked = false;
    this.hiding=null;this.vehicle=false;
    this.flashlight = false;
    this.clear();
    this.updateCamera(0);
  }
  down(action) {
    return this.keys.has(this.settings.bindings[action]);
  }
  tick(dt) {
    if (!this.active)
      return { moving: false, step: false, crouched: this.crouched, speed: 0 };
    const smoothing = this.settings.lookSmoothing || 0;
    if (smoothing) {
      const a = 1 - Math.exp(-dt / smoothing);
      this.yaw += (this.targetYaw - this.yaw) * a;
      this.pitch += (this.targetPitch - this.pitch) * a;
    }
    if(this.hiding || this.vehicle){this.velocity.x=this.velocity.z=0;this.sprinting=false;this.stamina=Math.min(1,this.stamina+this.rules.staminaRecovery*dt);if(!this.vehicle)this.updateCamera(0);return {moving:false,step:false,crouched:false,speed:0};}
    let forward =
      (this.down("forward") ? 1 : 0) -
      (this.down("back") ? 1 : 0) -
      this.touchMove.y - (this.padMove?.y||0);
    let right =
      (this.down("right") ? 1 : 0) -
      (this.down("left") ? 1 : 0) +
      this.touchMove.x + (this.padMove?.x||0);
    const length = Math.hypot(forward, right);
    if (length > 1) {
      forward /= length;
      right /= length;
    }
    if (this.movementLocked) {
      forward = 0;
      right = 0;
    }
    this.crouched = this.settings.crouchMode === "toggle" ? !!this.toggleCrouch : this.down("crouch")||this.padCrouch;
    const moving = Math.hypot(forward, right) > 0.05;
    if (this.stamina <= 0.02) this.exhausted = true;
    if (this.stamina > 0.28) this.exhausted = false;
    this.sprinting =
      ((this.settings.sprintMode === "toggle" ? this.toggleSprint : this.down("sprint")||this.padSprint) || this.touchSprint) &&
      moving &&
      !this.crouched &&
      !this.exhausted;
    this.stamina = Math.max(
      0,
      Math.min(
        1,
        this.stamina +
          (this.sprinting
            ? -this.rules.staminaDrain
            : this.rules.staminaRecovery) *
            dt,
      ),
    );
    const speed = this.crouched ? 1.4 : this.sprinting ? 4.9 : 2.95;
    const desiredX =
      (Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right) * speed;
    const desiredZ =
      (Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right) * speed;
    const acceleration = 1 - Math.exp(-dt * (moving ? 26 : 50));
    this.velocity.x += (desiredX - this.velocity.x) * acceleration;
    this.velocity.z += (desiredZ - this.velocity.z) * acceleration;
    if(!moving){this.velocity.x=0;this.velocity.z=0;}
    const before = { ...this.pos };
    moveCircle(
      this.pos,
      this.velocity.x * dt,
      this.velocity.z * dt,
      this.world.rects,
      0.29,
    );
    const walked = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    if(Math.abs(this.pos.x-before.x)<.0001)this.velocity.x=0;
    if(Math.abs(this.pos.z-before.z)<.0001)this.velocity.z=0;
    this.distance += walked;
    this.walkClock += walked * 6;
    this.stepClock += walked;
    const stepLength = this.crouched ? 0.78 : this.sprinting ? 1.25 : 0.95;
    let step = false;
    if (this.stepClock > stepLength) {
      step = true;
      this.stepClock %= stepLength;
    }
    this.height +=
      ((this.crouched ? 1.16 : 1.68) - this.height) * (1 - Math.exp(-dt * 12));
    this.updateCamera(walked > 0.001 ? (this.settings.reducedMotion ? 0 : this.settings.bob) : 0);
    this.lookVelocity.x *= Math.exp(-dt * 15);
    this.lookVelocity.y *= Math.exp(-dt * 15);
    return {
      moving: walked > 0.001,
      step,
      crouched: this.crouched,
      speed: dt ? walked / dt : 0,
    };
  }
  updateCamera(bob = 0) {
    const camera = this.world.camera;
    camera.rotationQuaternion = null;
    camera.cameraRotation?.set(0, 0);
    camera.cameraDirection?.setAll(0);
    camera.position.set(
      this.pos.x,
      this.height + Math.sin(this.walkClock) * 0.025 * bob,
      this.pos.z,
    );
    camera.rotation.set(this.pitch, this.yaw, 0);
    // Refresh the view before ray tests and the flashlight sample it this frame.
    camera.getViewMatrix(true);
  }
  /** Share this selection with both the HUD and the actual interaction key. */
  interactionHint(policy) {
    if(this.vehicle)return null;
    if(this.hiding)return this.hiding.exitHint;
    const hint = (this.focus ||= new InteractionFocus()).choose(this.world.interactives,
      this.world.camera.position, this.world.camera.getForwardRay().direction,
      this.world.rects, policy, performance.now());
    this.lastTarget = hint?.item.id || null;
    return hint;
  }
  target() {
    const hint = this.interactionHint();
    return hint?.usable ? hint.item : null;
  }
}
