import test from "node:test";
import assert from "node:assert/strict";
import { Threat } from "../dist/js/threat.js";
import { Animator } from "../dist/js/animation.js";
test("Sight needs a clear line and last-known position does not track through walls", () => {
  const walls = [{ x: 0, z: 5, w: 20, d: 1, enabled: true }];
  const t = new Threat(walls);
  t.activate({ x: 0, z: 2 });
  t.pos = { x: 0, z: 0 };
  t.grace = 0;
  const p = { pos: { x: 0, z: 8 }, crouched: false, flashlight: true };
  assert.equal(t.canSee(p), false);
  const known = { ...t.lastKnown };
  for (let i = 0; i < 30; i++) t.tick(1 / 60, p);
  assert.deepEqual(t.lastKnown, known);
  walls[0].enabled = false;t.yaw=0;t.mover.reset(); // Isolate line of sight from the longer planted-turn animation.
  assert.equal(t.canSee(p), true);
  for (let i = 0; i < 50; i++) t.tick(1 / 60, p);
  assert.equal(t.mode, "chase");
  const lastSeen = { ...t.lastKnown };
  walls[0].enabled = true;
  p.pos = { x: 10, z: 9 };
  t.tick(0.1, p);
  assert.deepEqual(t.lastKnown, lastSeen);
});
test("Quiet crouching and running have different hearing ranges; siren takes priority", () => {
  const t = new Threat([]);
  t.activate({ x: 0, z: 63 });
  t.grace = 0;
  const noise = { x: 6, z: 63 };
  t.hear(noise, 2);
  assert.equal(t.lastKnown.x, 0);
  t.hear(noise, 16);
  assert.equal(t.lastKnown.x, 6);
  t.lure();
  t.hear({ x: 20, z: 80 }, 100);
  assert.equal(t.mode, "lured");
  assert.deepEqual(t.destination, { x: -24, z: 76 });
  t.trap();
  const pos = { ...t.pos };
  t.tick(1, { pos: { x: 0, z: 64 }, crouched: false });
  assert.deepEqual(t.pos, pos);
});
test("Tween clocks freeze when not advanced and clear discards callbacks", () => {
  const a = new Animator();
  let v = 0,
    commits = 0;
  a.to(
    "door",
    0,
    1,
    1,
    (x) => (v = x),
    () => commits++,
  );
  a.tick(0.4);
  const paused = v;
  assert.ok(paused > 0 && paused < 1);
  assert.equal(commits, 0);
  a.clear();
  a.tick(2);
  assert.equal(commits, 0);
  assert.equal(v, paused);
  a.to(
    "door",
    0,
    1,
    0.2,
    (x) => (v = x),
    () => commits++,
  );
  a.tick(0.2);
  a.tick(2);
  assert.equal(v, 1);
  assert.equal(commits, 1);
});
