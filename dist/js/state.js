import { ENCOUNTER_IDS } from "./encounters.js?v=1.19.0";
import { TASKS, currentTask } from "./tasks.js?v=1.19.0";
import { difficultyId } from "./difficulty.js?v=1.19.0";
/**
 * Last Vehicle — pure game rules and persistence.
 * This module has no Babylon or DOM dependency, so the important save/progression
 * rules can be tested using Node. Never trust a JSON file just because we made it.
 */
export const VERSION = 3;
const LEGACY_FLAGS = ["car","key","fuse","power","terminal","release","valve","alarm","trapped","gate","escaped"];
export const FLAG_IDS = TASKS.map(task=>task.id);
export const NOTE_IDS = [
  "notice",
  "log",
  "workorder",
  "plaque",
  "incident",
  "dispatch",
  "yard-log",
];
export const ACTIONS = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  sprint: "ShiftLeft",
  crouch: "KeyC",
  interact: "KeyE",
  flashlight: "KeyF",
  journal: "KeyJ",
  hint: "KeyH",
  objective: "Tab",
  throw: "KeyQ",
};
export const DEFAULT_SETTINGS = Object.freeze({
  guidanceVersion: 2,
  objectiveHUD: true,
  objectiveMode:"always",
  easyAdrenaline:false,
  staminaMode:"auto",
  journalNotify: false,
  sensitivity: 1,
  rawMouse: false, // Legacy field retained for old settings imports.
  mouseMode: "locked",
  separateAxes: false,
  sensitivityY: 1,
  sprintMode: "hold",
  crouchMode: "toggle",
  reducedMotion: false,
  stableHorizon: true,
  throwGuide: true,
  skipIntro: false,
  shadows: "off",
  glow: false,
  fxaa: false,
  adaptive: false,
  adaptiveFloor: 0.65,
  weatherEffects: 'reduced',
  skyBrightness: .8,
  sceneryMotion: true,
  menuFPS: 30,
  fpsMode: "off",
  fpsCorner: "top-right",
  fpsSize: 1,
  uiScale: 1,
  crosshairSize: 1,
  crosshairContrast: true,
  uiVolume: 0.49,
  loudEffects: 1,
  difficulty: "medium",
  cinematicMotion: false,
  lookSmoothing: 0,
  sway: 0.4,
  subtitleSize: 1,
  dynamicRange: "full",
  interactionHighlight: true,
  fov: 78,
  invertY: false,
  master: 0.75,
  music: 0.35,
  ambience: 0.65,
  sfx: 0.7,
  brightness: 1,
  quality: "low",
  scale: 1,
  resolution: "auto",
  fpsCap: 60,
  showFPS: false,
  bob: 0.12,
  subtitles: true,
  soundCaptions: true,
  reducedFlashes: false,
  crosshair: true,
  hints: true,
  hintReminders: true,
  tutorial: false,
  promptScale: 1,
  controllerEnabled:false,controllerDeadzone:.18,controllerCurve:1.5,controllerLook:1,
  cameraShake:.5,scareScreenEffects:.65,sprintFOV:0,monoAudio:false,
  subtitleBackground:.8,speakerLabels:true,
  bindings: { ...ACTIONS },
});
export const NOTES = {
  'yard-log':{title:'The gatehouse handover',tag:'GATEHOUSE · FINAL SHIFT',text:'The garage shutter opens into the service yard. The STREET BARRIER is a separate interlock.\n\n1. Disconnect LOADING at the utility selector beside the generator. The loading feed is flooded.\n2. Select GATEHOUSE. The dry supply operates the barrier motor.\n3. Turn the yellow BARRIER BRAKE wheel beside the damaged side door.\n4. Winch the cargo dolly aside from the loading dock.\n\nThe roadworks container leaves an open lane beside it. Follow the OPEN LANE arrow.\n\nVehicle 042 is underlined three times. The attached ticket is still warm.'},
  notice: {
    title: "A notice under the wiper",
    tag: "YOUR CAR · BAY 042",
    text: "YOUR BATTERY IS ON THE FLOOR\n\nSomeone removed the battery and cut a lead. Recover it, then find a replacement cable in the workshop. The workshop key is in Security, at the north end of B2. The vehicle exit has also been isolated.\n\nDo not use the stairwell. The door closes from the other side.\n\nSomeone has written your bay number on the back. The ink is still wet.",
  },
  log: {
    title: "The final shift",
    tag: "SECURITY · HANDOVER LOG",
    text: "MERIDIAN — EST. 1986. Legacy override uses the founding year.\n\n23:10 — North stairwell sealed for inspection.\n23:36 — Electrical fault reported in B2. A spare fuse and battery cable are in the workshop cabinet.\n00:04 — Vehicle 042 still on site. Driver is upstairs.\n00:11 — The inspection blind moved. There is no night attendant on the roster. Who is behind the glass?\n\nThe next line was pressed hard enough to tear the paper:\n\nTHE EXIT WAS SWITCHED OFF FROM INSIDE.",
  },
  workorder: {
    title: "Restart procedure",
    tag: "WORKSHOP · TECHNICAL NOTE",
    text: "When the supply fails, replace the control fuse in the electrical room.\n\nRestart in this order:\n1. VENTILATION — clear exhaust from the garage.\n2. LIGHTING — restore floor lighting.\n3. ACCESS — energize the security terminal.\n\nThe security override uses the year Meridian opened. There is a brass dedication plaque beside the north exit.\n\nThe Security terminal authorizes the gate motor directly. The pump valve and workshop siren can make a useful distraction. A grille will only hold whatever is following you for a few seconds.",
  },
  plaque: {
    title: "Meridian",
    tag: "NORTH EXIT · DEDICATION",
    text: "MERIDIAN PARKING\nOpened 1986\n\nFor the people who keep this city moving.\n\nBelow the plaque, four short scratches mark the wall. The camera above it is pointed at the floor.",
  },
  incident: {
    title: "An unfinished incident report",
    tag: "STORAGE · CARBON COPY",
    text: "Incident 17-B\n\nThree drivers have reported finding their battery leads loosened. All three were the last ticket of the night. The workshop door was open each time.\n\nThe night attendant was removed from the roster six years ago. There has been no replacement. The shapes in the security stills are too tall; the arms reach almost to the floor. Security was told the matter was closed.\n\nAttached: a photograph of a grey service van. Something hangs inside the windshield. It looks like a collection of parking tickets.",
  },
  dispatch: {
    title: "A voice on the line",
    tag: "PUMP ROOM · DISPATCH TRANSCRIPT",
    text: "DISPATCH: Your alarm will reach us if the power is on. Hold position by the north exit.\n\nSECURITY: It is waiting between me and the gate.\n\nDISPATCH: Is the workshop grille still connected?\n\nSECURITY: Yes. Manual release on the outside. The test siren is inside the bay.\n\nDISPATCH: Sound the siren to draw it away. The grille is damaged; closing it will only buy a few seconds. If it sees you, break its line of sight before hiding. Leave in your car.\n\nThe rest of the page is blank.",
  },
};
// Each chapter has one purpose; the journal exposes only its next useful step.
export const OBJECTIVES = TASKS.map(task=>[task.id,task.title,task.instruction]);
export function newGame(difficulty = "medium") {
  return {
    version: VERSION,
    difficulty: difficultyId(difficulty),
    flags: [],
    notes: [],
    visited: [],
    tutorial: [],
    scares: [],
    journal: {hints:{}, observations:[], mechanisms:[], readNotes:[], lastObjective:"", controlsSeen:false},
    bolts:3,
    boltHistory:[],
    refills:[],
    seconds: 0,
    checkpoint: { x: 10, z: 98, yaw: Math.PI },
    savedAt: 0,
  };
}
export function has(s, id) {
  return s.flags.includes(id);
}
export function mark(s, id) {
  if (FLAG_IDS.includes(id) && !has(s, id)) s.flags.push(id);
}
export function objective(s) {
  const task=currentTask(s);
  return task?[task.id,task.title,task.instruction]:["done", "You made it out", ""];
}
export function collectNote(s, id) {
  if (NOTE_IDS.includes(id) && !s.notes.includes(id)) s.notes.push(id);
}
const clamp = (n, a, b, f) =>
  Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : f;
export function validateSettings(raw = {}) {
  const out = { ...DEFAULT_SETTINGS, bindings: { ...ACTIONS } };
  if (!raw || typeof raw !== "object") return out;
  const limits = {
    sensitivity: [0.25, 3],
    sensitivityY: [0.25, 3],
    uiVolume: [0, 1], loudEffects: [0.25, 1],
    adaptiveFloor: [0.5, 1], fpsSize: [0.8, 1.5],
    skyBrightness: [.35,1.2],
    uiScale: [0.85, 1.3], crosshairSize: [0.5, 2],
    fov: [60, 105],
    master: [0, 1],
    music: [0, 1],
    ambience: [0, 1],
    sfx: [0, 1],
    brightness: [0.6, 1.8],
    scale: [0.5, 1.5],
    bob: [0, 1],
    sway: [0, 1],
    lookSmoothing: [0, 0.12],
    subtitleSize: [0.8, 1.5],
    promptScale: [0.85, 1.5],
    controllerDeadzone:[.05,.4],controllerCurve:[1,3],controllerLook:[.25,3],
    cameraShake:[0,1],scareScreenEffects:[0,1],sprintFOV:[0,8],subtitleBackground:[0,1],
  };
  for (const [key, [a, b]] of Object.entries(limits))
    out[key] = clamp(raw[key], a, b, out[key]);
  for (const key of [
    "objectiveHUD", "journalNotify", "easyAdrenaline",
    "controllerEnabled","monoAudio","speakerLabels","sceneryMotion",
    "separateAxes", "reducedMotion", "stableHorizon", "throwGuide", "skipIntro", "glow", "fxaa", "adaptive", "crosshairContrast",
    "cinematicMotion",
    "invertY",
    "rawMouse",
    "interactionHighlight",
    "showFPS",
    "subtitles",
    "soundCaptions",
    "reducedFlashes",
    "crosshair",
    "hints",
    "hintReminders",
    "tutorial",
  ])
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  if (["full", "night"].includes(raw.dynamicRange))
    out.dynamicRange = raw.dynamicRange;
  if(['off','reduced','full'].includes(raw.weatherEffects))out.weatherEffects=raw.weatherEffects;
  if (["low", "medium", "high", "custom"].includes(raw.quality))
    out.quality = raw.quality;
  if (["auto", "720", "1080", "1440"].includes(raw.resolution))
    out.resolution = raw.resolution;
  if ([0, 30, 60, 90, 120, 144].includes(raw.fpsCap)) out.fpsCap = raw.fpsCap;
  for (const [key, values] of Object.entries({
    objectiveMode:["always","request","journal"],staminaMode:["auto","always","off"],
    mouseMode: ["locked", "raw", "drag"], sprintMode: ["hold", "toggle"], crouchMode: ["hold", "toggle"],
    shadows: ["off", "medium", "high"], fpsMode: ["off", "basic", "detailed", "graph"],
    fpsCorner: ["top-right", "top-left", "bottom-right", "bottom-left"],
  })) if (values.includes(raw[key])) out[key] = raw[key];
  if ([15, 30, 60].includes(raw.menuFPS)) out.menuFPS = raw.menuFPS;
  // Upgrade existing preferences without discarding remaps or changing saves.
  if (!("shadows" in raw)) out.shadows = out.quality === "low" ? "off" : out.quality === "high" ? "high" : "medium";
  if (!("glow" in raw)) out.glow = out.quality !== "low";
  if (!("fxaa" in raw)) out.fxaa = out.quality === "high";
  if (!("uiVolume" in raw) && Number.isFinite(raw.sfx)) out.uiVolume = out.sfx * .7;
  if (!("fpsMode" in raw) && raw.showFPS) out.fpsMode = "basic";
  out.showFPS = out.fpsMode !== "off";
  if(!['always','request','journal'].includes(raw.objectiveMode)&&typeof raw.objectiveHUD==='boolean')out.objectiveMode=raw.objectiveHUD?'always':'journal';
  out.objectiveHUD=out.objectiveMode!=='journal';
  if(Object.keys(raw).length&&raw.guidanceVersion !== 2) {out.hintReminders=false;out.tutorial=false;}
  out.difficulty = difficultyId(raw.difficulty);
  // Preserve existing remaps when a new action is added in an update. Assign
  // only missing/conflicting actions to an unused key; never reset the whole set.
  const keys = new Set(), supplied = new Set();
  for (const action of Object.keys(ACTIONS)) {
    const k = raw.bindings?.[action];
    if (typeof k === "string" && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Control(Left|Right)|Space|Tab)$/.test(k) && !keys.has(k)) {
      out.bindings[action] = k; keys.add(k); supplied.add(action);
    }
  }
  for (const action of Object.keys(ACTIONS)) {
    if (supplied.has(action)) continue;
    const choices = [ACTIONS[action], "KeyH", "KeyQ", "KeyR", "KeyT", "KeyU", ...Array.from({length: 26}, (_, i) => "Key" + String.fromCharCode(65+i))];
    const k = choices.find(k => !keys.has(k)); out.bindings[action] = k; keys.add(k);
  }
  return out;
}
export function validateSave(raw) {
  if (
    !raw ||
    ![1, 2, VERSION].includes(raw.version) ||
    !Array.isArray(raw.flags) ||
    !Array.isArray(raw.notes)
  )
    throw new Error("This is not a compatible Last Vehicle save.");
  const s = newGame(raw.difficulty);
  let flags = raw.flags;
  if (raw.version === 1) {
    // v1 had no repair objectives. Preserve its completed work and credit the
    // newly introduced prerequisites up to the matching checkpoint. Never
    // mutate the supplied backup, or infer a win from an unfinished old run.
    let n=0; while(n<LEGACY_FLAGS.length && flags.includes(LEGACY_FLAGS[n]))n++;
    const through=[-1,0,2,4,5,6,6,6,6,6,7,8][n];
    flags=n===LEGACY_FLAGS.length?[...FLAG_IDS]:FLAG_IDS.slice(0,through+1);
  }
  // A completed pre-expansion run stays complete. An unfinished v2 run resumes
  // after its existing objectives and discovers the yard normally.
  const oldOrder=['car','battery','key','fuse','repair','power','terminal','gate','escaped'];
  if(raw.version===2 && oldOrder.every(id=>raw.flags.includes(id)))flags=[...FLAG_IDS];
  let gap = false;
  s.flags = FLAG_IDS.filter(id => { if(!flags.includes(id))gap=true;return !gap; });
  s.notes = [...new Set(raw.notes.filter((x) => NOTE_IDS.includes(x)))];
  s.scares = [
    ...new Set(
      (Array.isArray(raw.scares) ? raw.scares : []).filter((x) =>
        ENCOUNTER_IDS.includes(x),
      ),
    ),
  ];
  s.visited = [...new Set((Array.isArray(raw.visited) ? raw.visited : []).filter(x => ["security", "storage", "workshop", "electrical", "pump",'yard','gatehouse','road'].includes(x)))];
  s.tutorial = [...new Set((Array.isArray(raw.tutorial) ? raw.tutorial : []).filter(x => ["look", "move", "flashlight", "interact", "stealth"].includes(x)))];
  const journal=raw.journal && typeof raw.journal === "object" ? raw.journal : {};
  for(const id of FLAG_IDS.slice(0,s.flags.length+1)) {
    const value=journal.hints?.[id];
    if(Number.isInteger(value) && value>=0 && value<=3) s.journal.hints[id]=value;
  }
  s.journal.readNotes=[...new Set((Array.isArray(journal.readNotes)?journal.readNotes:[]).filter(id=>s.notes.includes(id)))];
  s.journal.observations=[...new Set((Array.isArray(journal.observations)?journal.observations:[]).filter(id=>["wetTracks","heardDoor"].includes(id)))];
  s.journal.mechanisms=[...new Set((Array.isArray(journal.mechanisms)?journal.mechanisms:[]).filter(id=>['repair','fuse','power','terminal','gate','yard','isolate','barrier','route'].includes(id)))];
  s.journal.lastObjective=[...FLAG_IDS,"done"].includes(journal.lastObjective)?journal.lastObjective:"";
  s.journal.controlsSeen=journal.controlsSeen===true;
  s.bolts=Number.isInteger(raw.bolts)?clamp(raw.bolts,0,3,3):3;
  s.boltHistory=(Array.isArray(raw.boltHistory)?raw.boltHistory:[]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=31&&p.z>=-101&&p.z<=115&&Number.isInteger(p.uses)&&p.uses>0).slice(-3).map(p=>({x:p.x,z:p.z,uses:Math.min(3,p.uses)}));
  s.refills=[...new Set((Array.isArray(raw.refills)?raw.refills:[]).filter(id=>['refill-workshop','refill-yard','refill-gatehouse'].includes(id)))];
  s.seconds = clamp(raw.seconds, 0, 864000, 0);
  s.savedAt = clamp(raw.savedAt, 0, 9999999999999, 0);
  // Restore only authored safe positions: arbitrary imported coordinates could put
  // the player inside geometry. The checkpoint derives from the last completed task.
  s.checkpoint = safeCheckpoint(s);
  return s;
}
export function safeCheckpoint(s) {
  if(has(s,'route'))return {x:-15,z:-32,yaw:Math.PI};
  if(has(s,'barrier'))return {x:23,z:-42,yaw:Math.PI/2};
  if(has(s,'isolate'))return {x:23,z:-22,yaw:Math.PI};
  if(has(s,'yard'))return {x:-9,z:-47,yaw:Math.PI};
  if (has(s,"gate")) return {x:-6,z:8,yaw:0};
  if (has(s,"terminal")) return {x:-22,z:18,yaw:Math.PI/2};
  if (has(s,"power")) return {x:24,z:40,yaw:-Math.PI/2};
  if (has(s,"repair")) return {x:9,z:79,yaw:Math.PI};
  if (has(s,"fuse")) return {x:-23,z:72,yaw:Math.PI/2};
  if (has(s,"key")) return {x:-22,z:18,yaw:Math.PI/2};
  if (has(s,"car")) return {x:9,z:79,yaw:Math.PI/2};
  return {x:10,z:98,yaw:Math.PI};
}
export function checkpointSave(s) {
  const saved = structuredClone(s);
  delete saved.driving;delete saved.carPosition; // Live guidance, never an unsafe vehicle checkpoint.
  saved.checkpoint=safeCheckpoint(saved); saved.savedAt=Date.now();
  // Enemy, locker occupancy, temporary lures and drive animation are deliberately
  // transient. Continuing rebuilds a safe world with a fresh grace period.
  return saved;
}
export class SaveStore {
  constructor(storage) {
    this.storage = storage;
    this.available = true;
    this.memory = {};
  }
  get(key) {
    try {
      return this.storage.getItem("lastvehicle." + key);
    } catch {
      this.available = false;
      return this.memory[key] ?? null;
    }
  }
  set(key, value) {
    this.memory[key] = value;
    try {
      this.storage.setItem("lastvehicle." + key, value);
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }
  readGame() {
    try {
      const s = this.get("save");
      if(!s)return null;
      const raw=JSON.parse(s),valid=validateSave(raw);
      if(raw.version<VERSION && !this.get('save.v'+raw.version+'.backup'))this.set('save.v'+raw.version+'.backup',s);
      return valid;
    } catch {
      return null;
    }
  }
  writeGame(state) {
    return this.set("save", JSON.stringify(checkpointSave(state)));
  }
  readSettings() {
    try {
      return validateSettings(JSON.parse(this.get("settings") || "{}"));
    } catch {
      return validateSettings();
    }
  }
  writeSettings(settings) {
    return this.set("settings", JSON.stringify(validateSettings(settings)));
  }
}
