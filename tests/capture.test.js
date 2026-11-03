import test from "node:test";
import assert from "node:assert/strict";
import { MouseCapture } from "../dist/js/capture.js";
import { Game } from "../dist/js/game.js";
import { Player } from "../dist/js/player.js";
import { UI } from "../dist/js/ui.js";
import { newGame, DEFAULT_SETTINGS } from "../dist/js/state.js";
function eventSurface() {
  const handlers = new Map();
  return {
    addEventListener(n, f) {
      if (!handlers.has(n)) handlers.set(n, []);
      handlers.get(n).push(f);
    },
    fire(n, e = {}) {
      for (const f of handlers.get(n) || []) f(e);
    },
  };
}
function environment() {
  const elements = new Map();
  const doc = Object.assign(eventSurface(), {
    pointerLockElement: null,
    exitPointerLock() {
      this.pointerLockElement = null;
      this.fire("pointerlockchange");
    },
    getElementById(id) {
      if (!elements.has(id))
        elements.set(
          id,
          Object.assign(eventSurface(), {
            style: {},
            disabled: false,
            textContent: "",
            innerHTML: "",
            classList: { add() {}, remove() {}, toggle() {} },
            focus() {
              doc.activeElement = this;
            },
            setAttribute() {},
            querySelectorAll() {
              return [];
            },
          }),
        );
      return elements.get(id);
    },
  });
  const canvas = Object.assign(eventSurface(), {
    focus() {
      doc.activeElement = this;
    },
  });
  return { doc, canvas };
}
test("Legacy void-return capture may arrive after 180 ms without being cancelled", async () => {
  const { doc, canvas } = environment(),
    states = [];
  canvas.requestPointerLock = () => {};
  const capture = new MouseCapture(canvas, (s) => states.push(s), doc);
  const result = capture.request();
  await new Promise((r) => setTimeout(r, 260));
  assert.equal(capture.state, "requesting");
  doc.pointerLockElement = canvas;
  doc.fire("pointerlockchange");
  assert.equal(await result, true);
  assert.deepEqual(states, ["requesting", "locked"]);
  capture.cancel();
});
test("Cancelling a pending request rejects late capture and permits a clean retry", async () => {
  const { doc, canvas } = environment();
  canvas.requestPointerLock = () => {};
  const states = [],
    capture = new MouseCapture(canvas, (s) => states.push(s), doc);
  const first = capture.request();
  capture.cancel();
  assert.equal(await first, false);
  doc.pointerLockElement = canvas;
  doc.fire("pointerlockchange");
  assert.equal(doc.pointerLockElement, null);
  assert.equal(states.includes("locked"), false);
  const retry = capture.request();
  doc.pointerLockElement = canvas;
  doc.fire("pointerlockchange");
  assert.equal(await retry, true);
  capture.cancel();
});
test("Actual Capture mouse button waits for confirmation, recovers from errors, and requires an explicit drag choice", async () => {
  const { doc, canvas } = environment();
  globalThis.document = doc;
  globalThis.window = Object.assign(eventSurface(), {
    location: { href: "https://example.test/game/" },
  });
  globalThis.matchMedia = () => ({ matches: false });
  const g = Object.create(Game.prototype);
  Object.assign(g, {
    started: true,
    playing: false,
    state: newGame(),
    settings: {
      ...DEFAULT_SETTINGS,
      rawMouse: true,
      bindings: { ...DEFAULT_SETTINGS.bindings },
    },
    canvas,
    world: { rects: [], visuals: { focusOn() {} } },
    audio: { play() {}, resume() {}, setPaused() {} },
    store: {
      readGame() {
        return null;
      },
    },
  });
  g.player = new Player(
    g.world,
    canvas,
    g.settings,
    () => {},
    (status, message) => g.handleCapture(status, message),
  );
  g.ui = new UI(g);
  let options = "untouched";
  canvas.requestPointerLock = (o) => {
    options = o;
  };
  g.ui.capture();
  doc.getElementById("capture-retry").onclick();
  assert.equal(
    options,
    undefined,
    "primary button requests standard input even if raw option is enabled",
  );
  assert.equal(g.playing, false);
  assert.equal(g.ui.overlay, "capture");
  assert.equal(doc.getElementById("capture-retry").disabled, true);
  doc.pointerLockElement = canvas;
  doc.fire("pointerlockchange");
  assert.equal(g.playing, true);
  assert.equal(g.player.active, true);
  assert.equal(g.ui.overlay, null);
  g.stopInput();
  g.ui.capture();
  doc.getElementById("capture-retry").onclick();
  doc.fire("pointerlockerror");
  assert.equal(g.playing, false, "Capture denial keeps the mode choice visible instead of silently changing controls");
  assert.equal(g.ui.overlay, "capture");
  assert.equal(g.player.captureMode, "locked");
  g.stopInput();
  g.ui.capture();
  doc.getElementById("capture-drag").onclick();
  assert.equal(g.playing, true);
  assert.equal(g.player.captureMode, "drag");
  g.stopInput();
});
test("Unsupported advanced raw request reports failure; a new standard click can succeed", async () => {
  const { doc, canvas } = environment();
  const messages = [];
  canvas.requestPointerLock = (options) =>
    options
      ? Promise.reject(Object.assign(Error(), { name: "NotSupportedError" }))
      : Promise.resolve();
  const c = new MouseCapture(canvas, (s, m) => messages.push([s, m]), doc);
  assert.equal(await c.request({ raw: true }), false);
  assert.match(messages.at(-1)[1], /standard/);
  const result = c.request();
  await Promise.resolve();
  assert.equal(c.state, "requesting");
  doc.pointerLockElement = canvas;
  doc.fire("pointerlockchange");
  assert.equal(await result, true);
  c.cancel();
});

test("A missing browser response terminates the pending request", (t) => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const {doc,canvas}=environment();
  canvas.requestPointerLock=()=>{};
  const states=[];
  const capture=new MouseCapture(canvas,(state)=>states.push(state),doc);
  capture.request();
  t.mock.timers.tick(5001);
  assert.equal(capture.state,"error");
  assert.equal(capture.pending,null);
  assert.deepEqual(states,["requesting","failed"]);
  capture.cancel();
});
