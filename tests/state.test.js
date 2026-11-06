import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  validateSave,
  validateSettings,
  checkpointSave,
  FLAG_IDS,
  objective,
  SaveStore,
} from "../dist/js/state.js";
import { moveCircle, findPath, lineClear } from "../dist/js/navigation.js";
test("Every possible progress mask normalizes to a reachable objective prefix", () => {
  for (let mask = 0; mask < 1 << FLAG_IDS.length; mask++) {
    const raw = {
      ...newGame(),
      flags: FLAG_IDS.filter((_, i) => mask & (1 << i)),
    };
    const safe = validateSave(raw);
    assert.deepEqual(safe.flags, FLAG_IDS.slice(0, safe.flags.length));
    assert.ok(objective(safe));
    assert.ok(Number.isFinite(safe.checkpoint.x));
  }
});
test("Safe checkpoints retain repair progress without storing transient pursuit or hiding", () => {
  const s={...newGame(),flags:FLAG_IDS.slice(0,8)};
  const restored=validateSave(checkpointSave(s));
  assert.deepEqual(restored.flags,s.flags);assert.equal(restored.flags.includes("trapped"),false);
  assert.deepEqual(restored.checkpoint,{x:-6,z:8,yaw:0});
});
test("Every legacy checkpoint migrates to reachable v3 progress; original local save is backed up", () => {
  const legacy=["car","key","fuse","power","terminal","release","valve","alarm","trapped","gate","escaped"];
  const counts=[0,1,3,5,6,7,7,7,7,7,8,FLAG_IDS.length];
  for(let n=0;n<=legacy.length;n++){
    const raw={...newGame("hard"),version:1,flags:legacy.slice(0,n)};
    const migrated=validateSave(raw);
    assert.equal(migrated.version,3);assert.equal(migrated.difficulty,"hard");
    assert.deepEqual(migrated.flags,FLAG_IDS.slice(0,counts[n]));
  }
  const original=JSON.stringify({...newGame(),version:1,flags:["car","key","fuse"]});
  const data=new Map([["lastvehicle.save",original]]);
  const store=new SaveStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
  const migrated=store.readGame();assert.equal(migrated.version,3);
  assert.equal(data.get("lastvehicle.save.v1.backup"),original);
  store.writeGame(migrated);store.readGame();assert.equal(data.get("lastvehicle.save.v1.backup"),original);
});
test("Untrusted saves and settings cannot inject content or invalid coordinates", () => {
  assert.throws(() => validateSave({ version: 99 }));
  const s = validateSave({
    ...newGame(),
    notes: ["<script>", "log", "log"],
    seconds: Infinity,
    checkpoint: { x: Infinity, z: NaN },
  });
  assert.deepEqual(s.notes, ["log"]);
  assert.equal(s.seconds, 0);
  assert.equal(s.checkpoint.x, 10);
  const settings = validateSettings({
    sensitivity: 100,
    quality: "ultra",
    fov: NaN,
    master: -10,
    bindings: { interact: "<script>" },
  });
  assert.equal(settings.sensitivity, 3);
  assert.equal(settings.master, 0);
  assert.equal(settings.quality, "low");
});
test("Storage denial and corrupt JSON remain recoverable", () => {
  const denied = new SaveStore({
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  });
  assert.equal(denied.writeGame(newGame()), false);
  assert.ok(denied.readGame());
  const bad = new SaveStore({
    getItem() {
      return "{broken";
    },
    setItem() {},
  });
  assert.equal(bad.readGame(), null);
  assert.equal(bad.readSettings().fov, 78);
});
test("Collision substeps stop tunnelling and permit wall sliding", () => {
  const rects = [{ x: 2, z: 0, w: 1, d: 6 }],
    p = { x: 0, z: 0 };
  moveCircle(p, 10, 2, rects);
  assert.ok(p.x < 1.3);
  assert.ok(p.z > 1.5);
  assert.equal(lineClear({ x: 0, z: 0 }, { x: 5, z: 0 }, rects), false);
});
test("Pursuer routes around a solid obstacle", () => {
  const rects = [{ x: 0, z: 12, w: 6, d: 3 }];
  const path = findPath({ x: 0, z: 4 }, { x: 0, z: 20 }, rects);
  assert.ok(path.length > 10);
  assert.ok(path.some((p) => Math.abs(p.x) > 3));
});

test("Journal migration and checkpoint round trips preserve reading without importing future hints", () => {
  const old={...newGame(),notes:["notice"]};delete old.journal;
  assert.deepEqual(validateSave(old).journal,{hints:{},observations:[],mechanisms:[],readNotes:[],lastObjective:"",controlsSeen:false});
  const raw={...old,flags:["car"],journal:{hints:{car:3,battery:2,escaped:3,fuse:99},readNotes:["notice","notice","dispatch","<script>"],lastObjective:"battery",controlsSeen:true}};
  const saved=checkpointSave(raw), restored=validateSave(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.flags,["car"]);
  assert.deepEqual(restored.journal,{hints:{car:3,battery:2},observations:[],mechanisms:[],readNotes:["notice"],lastObjective:"battery",controlsSeen:true});
});
