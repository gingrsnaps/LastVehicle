import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  validateSave,
  checkpointSave,
  validateSettings,
  FLAG_IDS,
} from "../dist/js/state.js";
import { DIFFICULTIES } from "../dist/js/difficulty.js";
import { Threat } from "../dist/js/threat.js";
test("All difficulties round-trip through saves; old or invalid values safely become Medium", () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const s = newGame(difficulty);
    s.flags = FLAG_IDS.slice(0, 6);
    assert.equal(validateSave(checkpointSave(s)).difficulty, difficulty);
    assert.deepEqual(validateSave(s).flags, s.flags);
    assert.equal(validateSettings({ difficulty }).difficulty, difficulty);
  }
  const old = newGame();
  delete old.difficulty;
  assert.equal(validateSave(old).difficulty, "medium");
  for (const difficulty of ["impossible", {}, [], true, 0, "__proto__"])
    assert.equal(validateSave({ ...old, difficulty }).difficulty, "medium");
});
test("Difficulty changes sight, hearing, suspicion, pursuit speed and stamina in the intended order", () => {
  const modes = Object.values(DIFFICULTIES),
    threats = modes.map((d) => new Threat([], d.id));
  const p = { pos: { x: 0, z: 20 }, crouched: false, flashlight: true };
  for (const t of threats) {
    t.activate({ x: 0, z: 20 });
    t.pos = { x: 0, z: 0 };
    t.grace = 0;
    t.yaw = 0;
  }
  assert.equal(threats[0].canSee(p), false);
  assert.equal(threats[1].canSee(p), true);
  assert.equal(threats[2].canSee(p), true);
  p.pos.z = 8;
  for (const t of threats) t.tick(0.1, p);
  assert.ok(
    threats[0].suspicion < threats[1].suspicion &&
      threats[1].suspicion < threats[2].suspicion,
  );
  for (const t of threats) {
    t.mode = "chase";
    t.suspicion = 1;
    // All modes accelerate gradually; compare after reaching pursuit speed.
    for(let i=0;i<12;i++)t.tick(0.1, p);
  }
  assert.ok(
    threats[0].pos.z < threats[1].pos.z && threats[1].pos.z < threats[2].pos.z,
  );
  for (const t of threats) {
    t.reset();
    t.activate({ x: 0, z: 63 });
    t.grace=0;
    t.hear({ x: 8, z: 63 }, 7);
  }
  assert.equal(threats[0].lastKnown.x, 0);
  assert.equal(threats[1].lastKnown.x, 0);
  assert.ok(Math.abs(threats[2].lastKnown.x-8)<=.75,"hearing localizes a clue with bounded uncertainty");
  for (let i = 1; i < modes.length; i++) {
    assert.ok(modes[i].chase > modes[i - 1].chase);
    assert.ok(modes[i].staminaDrain > modes[i - 1].staminaDrain);
    assert.ok(modes[i].staminaRecovery < modes[i - 1].staminaRecovery);
    assert.ok(modes[i].search > modes[i - 1].search);
  }
});
