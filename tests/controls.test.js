import test from "node:test";
import assert from "node:assert/strict";
await import("../dist/vendor/babylon.js");
const { Player } = await import("../dist/js/player.js");
const { DEFAULT_SETTINGS } = await import("../dist/js/state.js");
const events = new Map();
globalThis.window = {
  addEventListener(name, fn) {
    events.set("window:" + name, fn);
  },
};
globalThis.document = {
  pointerLockElement: null,
  addEventListener(name, fn) {
    events.set(name, fn);
  },
  exitPointerLock() {
    this.pointerLockElement = null;
  },
};
const engine = new BABYLON.NullEngine();
function setup() {
  events.clear();
  document.pointerLockElement = null;
  const scene = new BABYLON.Scene(engine),
    camera = new BABYLON.UniversalCamera("test", BABYLON.Vector3.Zero(), scene);
  camera.inputs.clear();
  const canvas = {
    addEventListener(name, fn) {
      events.set("canvas:" + name, fn);
    },
  };
  const status = [];
  const p = new Player(
    { camera, rects: [], interactives: [] },
    canvas,
    { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_SETTINGS.bindings } },
    () => {},
    (s) => status.push(s),
  );
  p.restore({ x: 0, z: 0, yaw: 0 });
  p.active = true;
  return { p, canvas, camera, status, scene };
}
test("Mouse axes, inversion, pitch bounds and heading-relative movement remain consistent", () => {
  const { p, camera, scene } = setup();
  p.look(100, 100);
  p.updateCamera();
  let f = camera.getForwardRay().direction;
  assert.ok(f.x > 0 && f.y < 0, "right and down move the view right and down");
  const previous = p.pitch;
  p.settings.invertY = true;
  p.look(0, 100);
  assert.ok(p.pitch < previous);
  p.look(0, 1900);
  assert.equal(p.pitch, -1.3);
  p.restore({ x: 0, z: 0, yaw: Math.PI / 2 });
  p.keys.add("KeyW");
  for (let i = 0; i < 60; i++) p.tick(1 / 60);
  assert.ok(p.pos.x > 2 && Math.abs(p.pos.z) < 0.001);
  p.keys.clear();
  p.keys.add("KeyD");
  for (let i = 0; i < 60; i++) p.tick(1 / 60);
  assert.ok(p.pos.z < -2, "strafe right respects the current heading");
  scene.dispose();
});
test("Unsmoothed input does not depend on frame rate and smoothing can be cleared without drift", () => {
  const a = setup(),
    b = setup();
  a.p.look(200, -100);
  b.p.look(200, -100);
  for (let i = 0; i < 30; i++) a.p.tick(1 / 30);
  for (let i = 0; i < 120; i++) b.p.tick(1 / 120);
  assert.equal(a.p.yaw, b.p.yaw);
  assert.equal(a.p.pitch, b.p.pitch);
  a.p.settings.lookSmoothing = 0.1;
  a.p.look(100, 0);
  const yaw = a.p.yaw;
  a.p.clear();
  a.p.tick(0.1);
  assert.equal(a.p.yaw, yaw);
  a.scene.dispose();
  b.scene.dispose();
});
test("Standard capture works without raw options, recenter packet is ignored, and denial is reported", async () => {
  const { p, canvas, status, scene } = setup();
  let calls = 0;
  canvas.requestPointerLock = async (options) => {
    calls++;
    if (options) {
      const e = new Error("raw unsupported");
      e.name = "NotSupportedError";
      throw e;
    }
    document.pointerLockElement = canvas;
    events.get("pointerlockchange")();
  };
  await p.lock();
  assert.equal(calls, 1);
  assert.deepEqual(status, ["requesting", "locked"]);
  events.get("window:mousemove")({ movementX: 500, movementY: 0 });
  assert.equal(p.yaw, 0);
  events.get("window:mousemove")({ movementX: 50, movementY: 0 });
  assert.ok(p.yaw > 0);
  document.pointerLockElement = null;
  canvas.requestPointerLock = async () => {
    throw Error("blocked");
  };
  await p.lock();
  assert.equal(status.at(-1), "failed");
  p.useDragControls();
  const yaw = p.yaw;
  events.get("canvas:pointerdown")({
    button: 0,
    pointerType: "mouse",
    clientX: 10,
    clientY: 10,
  });
  events.get("canvas:pointermove")({ clientX: 35, clientY: 10 });
  assert.ok(p.yaw > yaw);
  events.get("canvas:pointerup")();
  const stopped = p.yaw;
  events.get("canvas:pointermove")({ clientX: 100, clientY: 10 });
  assert.equal(p.yaw, stopped);
  scene.dispose();
});

test("Selected difficulty actually changes sprint endurance in the player controller", async () => {
  const { difficultyRules } = await import("../dist/js/difficulty.js");
  const remaining = [];
  for (const id of ["easy", "medium", "hard"]) {
    const { p, scene } = setup();
    p.rules = difficultyRules(id);
    p.keys.add("KeyW");
    p.keys.add("ShiftLeft");
    for (let i = 0; i < 120; i++) p.tick(1 / 60);
    remaining.push(p.stamina);
    scene.dispose();
  }
  assert.ok(remaining[0] > remaining[1] && remaining[1] > remaining[2]);
});

test("Separate axes and hold/toggle controls work without repeat toggles or stuck inputs", () => {
  const {p,scene}=setup();
  p.settings.separateAxes=true; p.settings.sensitivity=1; p.settings.sensitivityY=2;
  p.look(100,100); assert.ok(Math.abs(p.pitch-p.yaw*2)<1e-10);
  p.settings.sprintMode="toggle"; p.settings.crouchMode="toggle";
  const key=code=>events.get("window:keydown")({code,repeat:false,preventDefault(){}});
  key("KeyW"); key("ShiftLeft"); events.get("window:keyup")({code:"ShiftLeft"});
  p.tick(1/60); assert.equal(p.sprinting,true);
  events.get("window:keydown")({code:"ShiftLeft",repeat:true,preventDefault(){}}); p.tick(1/60); assert.equal(p.sprinting,true);
  key(p.settings.bindings.crouch); events.get("window:keyup")({code:p.settings.bindings.crouch}); p.tick(1/60); assert.equal(p.crouched,true); assert.equal(p.sprinting,false);
  p.clear(); p.tick(1/60); assert.equal(p.crouched,false); assert.equal(p.toggleSprint,false);
  scene.dispose();
});
