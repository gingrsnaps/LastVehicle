import { inventoryStatus } from "./tasks.js?v=1.14.0";
import { renderJournal, returnSummary } from "./journal.js?v=1.14.0";
import { destination } from "./guidance.js?v=1.14.0";
import { DIFFICULTIES, difficultyRules } from "./difficulty.js?v=1.14.0";
import { renderSettings } from "./settings-ui.js?v=1.14.0";
import { PRESETS } from "./preferences.js?v=1.14.0";
import { renderMap } from "./map.js?v=1.14.0";
export const $ = (id) => document.getElementById(id);
export const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function keyName(code) {
  const arrows = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };
  return arrows[code] || String(code).replace(/^(Key|Digit)/, "").replace(/(Left|Right)$/, "").replace("Control", "Ctrl");
}
/** DOM menus stay separate from the WebGL scene: text remains sharp at low render
 * resolution, keyboard navigation works, and the user can scroll long notes. */
export class UI {
  constructor(game) {
    this.game = game;
    this.overlay = null;
    this.settingsTab = "basics";
    this.toastUntil = 0;
    this.subtitleUntil = 0;
    $("journal-button").onclick=()=>this.journal();
    $("pause-button").onclick = () => game.pause();
    $("new-game").onclick = () => game.confirmNew();
    $("continue").onclick = () => game.start(true);
    $("settings-button").onclick = () => this.settings();
    $("credits-button").onclick = () => this.credits();
    $("save-file").onchange = async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        if (file.size > 65536) throw new Error("Save file is too large.");
        await game.importSave(await file.text());
      } catch (err) {
        this.toast(err.message, 7000);
      }
    };
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.code === "Escape") {
          e.preventDefault();
          if (this.bindingAction) {
            this.bindingAction = null;
            this.settings();
            return;
          }
          if (this.overlay) {
            // Escape can itself be the browser's capture-release gesture. Keep
            // Pause visible until a deliberate Resume click requests capture.
            if (this.overlay === "pause" || this.overlay === "capture") return;
            if (
              [
                "pause",
                "capture",
                "settings",
                "credits",
                "journal",
                "note",
                "power",
                "keypad",
                "confirm",
                "difficulty",
                "map",
                "performance-route",
                "contrast",
              ].includes(this.overlay)
            )
              this.back();
          } else if (game.playing) game.pause();
        }
        if (this.bindingAction) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const action = this.bindingAction;
          this.bindingAction = null;
          const valid =
            /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Control(Left|Right)|Space|Tab)$/.test(
              e.code,
            );
          if (valid) {
            const other = Object.keys(game.settings.bindings).find(
              (a) => game.settings.bindings[a] === e.code,
            );
            if (other)
              game.settings.bindings[other] = game.settings.bindings[action];
            game.settings.bindings[action] = e.code;
            game.applySettings();
          } else
            this.toast(
              "Choose a letter, arrow, number, Shift, Ctrl, or Space.",
            );
          this.settings();
        }
        // Trap focus inside a modal; controls remain reachable without a mouse.
        if (e.code === "Tab" && this.overlay) {
          const nodes = [
            ...$("panel").querySelectorAll(
              "button:not(:disabled),input,select,a",
            ),
          ].filter((n) => n.offsetParent !== null);
          if (!nodes.length) return;
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      },
      true,
    );
  }
  show(type, html) {
    if (this.overlay === "settings" && type !== "settings" && type !== "recovery") this.game.cancelGraphics?.();
    this.game.stopInput();
    $("overlay").classList.toggle("cinematic-overlay", type === "ending");
    $("panel").classList.toggle("cinematic-panel", ["credits", "ending"].includes(type));
    $("overlay").classList.toggle("graphics-preview", type === "settings" && !!this.game.graphics?.baseline);
    this.game.audio.play("ui-open", { volume: 0.22, bus: "ui", reverb: false });
    this.overlay = type;
    $("overlay").classList.remove("hidden");
    $("panel").innerHTML = html;
    $("panel").scrollTop = 0;
    $("panel").focus();
    $("close-panel")?.addEventListener("click", () => this.back());
  }
  head(kicker, title, close = true) {
    return `${close ? '<button id="close-panel" class="close-button" aria-label="Close">×</button>' : ""}<span class="eyebrow">${kicker}</span><h2>${title}</h2>`;
  }
  hide() {
    if (this.overlay === "settings") this.game.cancelGraphics?.();
    this.overlay = null;
    $("overlay").classList.add("hidden");
    $("panel").innerHTML = "";
  }
  capture() {
    const touch=matchMedia("(pointer:coarse)").matches;
    const returning=!!this.game.hasPlayed;
    this.show('capture',this.head('MERIDIAN / B2',returning?'Resume your escape':'Ready to enter',false)+
      '<p id="capture-status" role="status" aria-live="polite">Click once to enter. Then move the mouse freely; no dragging is needed. Escape pauses and releases the mouse.</p><div class="button-row"><button id="capture-retry" class="btn accent">'+(returning?'Resume':'Enter game')+'</button>'+
      '<button id="capture-controller" class="btn">Use controller</button><small id="controller-status" class="settings-note"></small>'+
      (touch?'<button id="capture-touch" class="btn">Use touch controls</button>':'')+
      '<button id="capture-back" class="btn">Pause menu</button></div><p class="settings-note">Playing in an embedded page? <a id="capture-tab" target="_blank" rel="noopener">Open the game in its own tab</a> for mouse capture.</p><details id="capture-options" class="diagnostics"><summary>Mouse options & troubleshooting</summary><div class="button-row"><button id="capture-standard" class="btn">Use standard free mouse-look</button><button id="capture-raw" class="btn">Try raw mouse input</button><button id="capture-drag" class="btn">Choose drag controls</button></div><p class="settings-note">Standard input is the default. Raw input needs browser support. Drag controls are an optional fallback and require holding the left mouse button to look.</p><pre id="capture-details"></pre><button id="capture-report" class="btn">Download diagnostic report</button></details>');
    $('capture-tab').href=window.location.href;
    $('capture-retry').textContent=this.game.settings.mouseMode==='drag'?'Enter with saved drag mode':this.game.settings.mouseMode==='raw'?'Enter with raw mouse-look':returning?'Resume · free mouse-look':'Enter game · free mouse-look';
    $('capture-retry').onclick=()=>this.game.resume();
    $('capture-standard').onclick=()=>this.game.resume('locked',false);
    $('capture-raw').onclick=()=>this.game.resume('raw',true);
    $('capture-drag').onclick=()=>this.game.resume('drag');
    $('capture-touch')?.addEventListener('click',()=>this.game.resume('touch'));
    $('capture-controller')?.addEventListener('click',()=>{
      const g=this.game;g.settings.controllerEnabled=true;g.controller.retry();g.applySettings();g.pollController(performance.now());
      if(g.controller.connected)g.resume('controller');
      else $('controller-status').textContent=g.controller.blocked?'Controller access is blocked by this browser or embed. Use mouse controls or open the standalone tab.':'Connect a standard controller and press a button, then select Use controller.';
    });
    $('controller-status').textContent=this.game.controller?.connected?'Controller connected · A uses · X light · Y journal':this.game.controller?.available?'Controller detected · select Use controller':'Controller optional · connect one and select Use controller';
    $('capture-back').onclick=()=>this.pause();
    $('capture-report').onclick=()=>this.downloadDiagnostics();
    this.refreshCaptureDetails();
  }
  captureStatus(status, message = "") {
    if (this.overlay !== "capture") return;
    const pending = status === "requesting";
    $("capture-retry").disabled = pending;
    $("capture-retry").textContent = pending
      ? "Waiting for browser…"
      : "Enter game";
    if ($("capture-raw")) $("capture-raw").disabled = pending;
    $("capture-standard").disabled = pending;
    if (!pending) $("capture-retry").focus();
    $("capture-status").textContent = pending
      ? "Waiting for mouse permission… If this embed blocks capture, use the standalone-tab link below or explicitly choose drag controls."
      : message + " You can open the game in its own tab or choose drag controls below.";
    $("capture-tab").classList.toggle("capture-help", status === "failed");
    if(status==='failed'&&$('capture-options'))$('capture-options').open=true;
    this.refreshCaptureDetails();
  }
  newGameSetup(hasSave) {
    let selected = this.game.settings.difficulty;
    this.show(
      "difficulty",
      this.head("A NEW LAST SHIFT", "Choose your difficulty") +
        '<p>All modes include the complete story, three main story encounters plus situational scares, checkpoint saves, and the same puzzle clues. You can change difficulty later in Settings.</p><div class="difficulty-cards">' +
        Object.values(DIFFICULTIES)
          .map(
            (d) =>
              `<button data-difficulty="${d.id}" class="difficulty-card ${d.id === selected ? "selected" : ""}" aria-pressed="${d.id === selected}"><strong>${d.label}</strong><span>${d.description}</span></button>`,
          )
          .join("") +
        "</div>" +
        (hasSave
          ? '<p class="settings-note">Starting replaces your current checkpoint. Export it first if you want to keep a backup.</p>'
          : "") +
        '<div class="button-row"><button id="difficulty-start" class="btn accent">Enter the garage</button>' +
        (hasSave
          ? '<button id="difficulty-export" class="btn">Export existing save</button>'
          : "") +
        '<button id="difficulty-cancel" class="btn">Back</button></div>',
    );
    for (const button of $("panel").querySelectorAll("[data-difficulty]"))
      button.onclick = () => {
        selected = button.dataset.difficulty;
        for (const b of $("panel").querySelectorAll("[data-difficulty]")) {
          b.classList.toggle("selected", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        }
      };
    $("difficulty-start").onclick = () => this.game.start(false, selected);
    $("difficulty-export")?.addEventListener("click", () =>
      this.game.exportSave(this.game.store.readGame()),
    );
    $("difficulty-cancel").onclick = () => this.back();
  }
  interaction(hint) {
    $("interaction").classList.toggle("hidden", !hint);
    $("world-prompt").classList.add("hidden");
    if (!hint) return;
    const key = this.actionKey('interact');
    this.text("interact-key", hint.usable ? key : hint.locked ? "!" : "·");
    $("interaction").classList.toggle("unavailable", !hint.usable);
    this.text("interaction-label", hint.usable ? 'Use · '+(hint.label || hint.item.label) : hint.locked?'Requires · '+hint.reason:hint.reason);
    if (!this.game.settings.interactionHighlight) return;
    const B = globalThis.BABYLON,
      w = this.game.world,
      c = w.camera,
      e = this.game.engine;
    // Reuse projection buffers: this path runs every gameplay frame.
    const cache = this.promptProjection ||= { point: B.Vector3.Zero(), result: B.Vector3.Zero(), identity: B.Matrix.Identity(), transform: B.Matrix.Identity(), viewport: {x:0,y:0,width:0,height:0} };
    cache.point.copyFrom(hint.item.pos); cache.point.y += .23;
    c.getViewMatrix().multiplyToRef(c.getProjectionMatrix(), cache.transform);
    Object.assign(cache.viewport, {x:c.viewport.x*e.getRenderWidth(), y:c.viewport.y*e.getRenderHeight(), width:c.viewport.width*e.getRenderWidth(), height:c.viewport.height*e.getRenderHeight()});
    B.Vector3.ProjectToRef(cache.point, cache.identity, cache.transform, cache.viewport, cache.result);
    const projected = cache.result;
    if (projected.z < 0 || projected.z > 1) return;
    const rect = this.canvasRect ||= this.game.canvas.getBoundingClientRect();
    const x = (projected.x / e.getRenderWidth()) * rect.width,
      y = (projected.y / e.getRenderHeight()) * rect.height;
    if (x < 30 || x > rect.width - 30 || y < 30 || y > rect.height - 60) return;
    $("world-prompt").style.left = rect.left + x + "px";
    $("world-prompt").style.top = rect.top + y + "px";
    this.text("world-prompt-key", hint.usable ? key : hint.locked ? "!" : "·");
    $("world-prompt").classList.toggle("unavailable", !hint.usable);
    $("world-prompt").classList.remove("hidden");
  }
  back() {
    if(this.overlay==="contrast"){this.game.closeContrast();return;}
    if (this.overlay === "settings") this.game.cancelGraphics?.();
    if (this.overlay === "capture") {
      this.pause();
      return;
    }
    if (this.overlay === "map") {
      this.journal();
      return;
    }
    if (this.overlay === "note" && this.fromJournal) {
      this.fromJournal = false;
      this.journal(this.journalTab || "notes");
      return;
    }
    if (
      ["settings", "credits", "journal", "difficulty", "performance-route", "performance-setup"].includes(this.overlay) &&
      this.game.started
    ) {
      this.pause();
      return;
    }
    this.hide();
    if (this.game.started) this.game.resume();
  }
  menu() {
    this.hide();
    $("menu").classList.remove("hidden");
    $("hud").classList.add("hidden");
    const saved=this.game.store.readGame();
    $("continue").classList.toggle("hidden", !saved);
    $('continue-summary').classList.toggle('hidden',!saved);
    if(saved){const recap=returnSummary(saved);$('continue-summary').innerHTML=`<strong>${escapeHTML(recap.chapter)}</strong>${escapeHTML(recap.next)}<br>${difficultyRules(saved.difficulty).label} · ${saved.savedAt?escapeHTML(new Date(saved.savedAt).toLocaleString()):'Checkpoint available'}`;}

    $("new-game").querySelector("span").textContent = this.game.store.readGame()
      ? "New game"
      : "Enter the garage";
  }
  toast(text, ms = 3500) {
    $("toast").textContent = text;
    $("toast").classList.remove("hidden");
    this.toastUntil = performance.now() + ms;
  }
  subtitle(text, seconds = 5) {
    if (!this.game.settings.subtitles) return;
    if(text.startsWith('[')&&this.game.settings.soundCaptions===false)return;
    $("subtitle").textContent = (this.game.settings.speakerLabels?(text.startsWith('[')?'Environment · ':'You · '):'')+text;
    $("subtitle").classList.remove("hidden");
    this.subtitleUntil = performance.now() + seconds * 1000;
  }
  tick(now) {
    if(now<(this.nextUITick || 0))return; this.nextUITick=now+100;
    const preview = this.game.graphics;
    if (preview?.baseline) {
      this.text("graphics-countdown", `Keep these graphics? ${Math.max(0, Math.ceil((preview.deadline-now)/1000))} seconds`);
      if (now >= preview.deadline) { this.game.cancelGraphics(); if (this.overlay === "settings") this.settings(); this.toast("Graphics reverted. Your previous settings are restored."); }
    }
    if (now > this.toastUntil) $("toast").classList.add("hidden");
    if (now > this.subtitleUntil) $("subtitle").classList.add("hidden");
    if (now > this.hintUntil) $("hint-card").classList.add("hidden");
    if (now > this.previewUntil) $("note-preview").classList.add("hidden");
  }
  pause() {
    this.show(
      "pause",
      this.head("MERIDIAN / B2", "Take a breath") +
        `<p>Difficulty: ${difficultyRules(this.game.state.difficulty).label}. Your progress is saved at completed objectives. Returning from a save places you at a safe checkpoint.</p><div class="button-row"><button id="resume" class="btn accent">Resume</button><button id="save" class="btn">Save checkpoint</button><button id="journal-open" class="btn">Journal</button></div><div class="button-row"><button id="options" class="btn">Settings</button><button id="mouse-options" class="btn">Mouse controls</button><button id="export" class="btn">Export save</button><button id="import" class="btn">Import save</button></div><div class="button-row"><button id="quit" class="btn">Return to title</button></div><details class="diagnostics"><summary>Advanced diagnostics</summary><div class="button-row"><button id="diagnostic-pause" class="btn">Download diagnostic report</button><button id="performance-route" class="btn">Performance test route</button></div></details>`,
    );
    $("resume").onclick = () => {
      this.hide();
      this.game.resume();
    };
    $("save").onclick = () => this.game.save();
    $("journal-open").onclick = () => this.journal();
    $("options").onclick = () => this.settings();
    $("mouse-options").onclick = () => this.capture();
    $("performance-route").onclick=()=>this.performanceRoute();
    $("diagnostic-pause").onclick = () => this.downloadDiagnostics();
    $("export").onclick = () => this.game.exportSave();
    $("import").onclick = () => $("save-file").click();
    $("quit").onclick = () => {
      this.game.save(false);
      this.game.toMenu();
    };
  }
  note(id, fromJournal = false) {
    const note = this.game.notes[id];
    if (!note) return;
    this.fromJournal = fromJournal;
    if(!this.game.state.journal.readNotes.includes(id))this.game.state.journal.readNotes.push(id);
    this.game.save(false); this.game.updateHUD();
    this.show(
      "note",
      this.head("READING · GAME PAUSED / " + note.tag, escapeHTML(note.title)) +
        `<div class="note-copy">${escapeHTML(note.text)}</div><div class="button-row"><button id="put-down" class="btn accent">${fromJournal ? "Back to journal" : "Put down"}</button></div>`,
    );
    $("put-down").onclick = () => this.back();
  }
  journal(tab="tasks") {
    if(tab==="controls")this.game.store.set("controlsSeen","1");
    renderJournal(this,tab);
  }
  map() { this.journal("map"); }
  settings(tab = this.settingsTab) { renderSettings(this, tab); }
  text(id, value) { const e = $(id); if (e && e.textContent !== value) e.textContent = value; }
  downloadJSON(data, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  performanceOverlay(stats) {
    const g = this.game, mode = g.settings.fpsMode;
    const gpu = g.gpuMs == null ? "unavailable" : g.gpuMs.toFixed(1)+" ms";
    const adaptive = g.settings.adaptive ? ` · adaptive ${Math.round(g.adaptive.factor*100)}%${g.adaptive.gpuAvailable ? "" : " (waiting for GPU timer)"}` : "";
    this.text("fps-text", mode === "basic" ? `${Math.round(stats.fps)} FPS` : `${Math.round(stats.fps)} FPS · ${stats.frameMs.toFixed(1)} ms
1% low ${Math.round(stats.low1)} · ${stats.seconds.toFixed(0)}s of play
CPU work ${g.cpuMs.toFixed(1)} ms · GPU ${gpu}
${g.engine.getRenderWidth()} × ${g.engine.getRenderHeight()}${adaptive}`);
    const graph = $("fps-graph"); graph.classList.toggle("hidden", mode !== "graph");
    $("fps-legend").classList.toggle("hidden", mode !== "graph");
    if (mode !== "graph") return;
    const ctx = graph.getContext("2d"); if (!ctx) return;
    const w = graph.width, h = graph.height;
    ctx.clearRect(0,0,w,h); ctx.strokeStyle = "#647a70"; ctx.lineWidth = 1;
    const ceiling = Math.max(50, ...stats.graph), budget = 1000/(g.settings.fpsCap || 60);
    ctx.beginPath(); ctx.moveTo(0,h-budget/ceiling*h); ctx.lineTo(w,h-budget/ceiling*h); ctx.stroke();
    ctx.strokeStyle = "#dac89e"; ctx.beginPath();
    stats.graph.forEach((v,i) => { const x=i/119*w,y=h-Math.min(h,v/ceiling*h); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }); ctx.stroke();
    this.text("fps-legend", `Frame time · top ${ceiling.toFixed(0)} ms · line ${budget.toFixed(1)} ms budget`);
    $("fps-legend").classList.toggle("hidden", mode !== "graph");
  }
  inventoryText(){return inventoryStatus(this.game.state).map(item=>`${item.name}: ${item.status.toLowerCase()}`).join(" · ");}
  previewNote(id) {
    this.game.updateHUD();
    if(this.game.settings.journalNotify)this.toast("Journal updated",1800);
  }
  hint() { this.journal("hints"); }
  tutorial(text) {
    if ($("tutorial").textContent !== text) $("tutorial").textContent = text;
    $("tutorial").classList.toggle("hidden", !text);
  }
  diagnostics() {
    const times = (this.game.stats?.samples() || []).sort((a,b) => a-b);
    const capture = this.game.player?.mouseCapture;
    let previousCrash=null;try{previousCrash=JSON.parse(this.game.store.get("lastCrash")||"null");}catch{}
    return { version: "1.14.0", pass:this.game.profilePass || "Normal play", metrics:this.game.stats?.summary() || null, browser: globalThis.navigator?.userAgent || "unknown", embedded: window.self !== window.top,
      playing: this.game.playing, started: this.game.started, inputMode: this.game.player?.captureMode,
      pointerLocked: document.pointerLockElement === this.game.canvas, captureState: capture?.state,
      preparation: this.game.world?.preparation || null,
      ai:this.game.threat?.diagnostics?.()||null,placement:this.game.world?.placements?.report?.()||null,
      profiling: this.game.hitches?.report() || null,
      shaderCompilationMs: this.game.instrumentation?.shaderCompilationTimeCounter.total ?? null,
      drawCalls: this.game.sceneInstrumentation?.drawCallsCounter.current ?? null,
      shadowCasters: this.game.world?.shadowCasterCount ?? null,
      quality: this.game.settings.quality, settings: this.game.graphics?.persisted(this.game.settings) || this.game.settings, gpuFrameMs: this.game.gpuMs ?? null, adaptiveScale: this.game.adaptive?.factor ?? 1, frameSamples: times.length,
      p95FrameMs: times.length ? Math.round(times[Math.floor((times.length-1)*0.95)] * 10) / 10 : null,
      worstFrameMs: times.length ? Math.round(times.at(-1)) : null,
      framesOver100ms: times.filter(t => t > 100).length,
      failure: this.game.recoveryLog?.error || null, previousCrash, recentActions:this.game.recoveryLog?.events || [],
      failedAssets:this.game.world?.failedAssets || [], failedSounds:this.game.audio?.failures || [],
      audioFaults:{count:this.game.audio?.faultCount||0,recent:this.game.audio?.faults||[]},
      budgets:this.game.world?.renderBudgetReport?.(),navigation:this.game.threat?.diagnostics?.(),performanceSetup:this.game.calibration?.report(this.game.settings),
      controller:{connected:this.game.controller?.connected,blocked:this.game.controller?.blocked,error:this.game.controller?.error},renderBuffer:this.game.renderSizing,
      resources:{meshes:this.game.world?.scene?.meshes.length ?? 0,textures:this.game.world?.scene?.textures.length ?? 0,voices:this.game.audio?.voices?.size ?? 0,audioBytes:this.game.audio?.decodedBytes||0},
      error: this.game.lastError || null, objective: this.game.currentObjective()[0], events: capture?.history || [] };
  }
  refreshCaptureDetails() {
    const element = $("capture-details");
    if (element) element.textContent = JSON.stringify(this.diagnostics(), null, 2);
  }
  performanceRoute() {
    this.show("performance-route",this.head("OPTIONAL LOCAL TEST", "Check frame pacing")+
      '<p>Use the same graphics and route for both passes. This records timings only; it does not move you, complete tasks, or upload data.</p><ol><li>Start a new Easy run by bay 042, before collecting the Security key.</li><li>Walk north to the exit and return south, entering Security, Storage, Workshop, Electrical and Pump Room.</li><li>Toggle the flashlight in each room without completing objectives. Open and close the journal once.</li><li>Return here and finish the pass. Repeat the same route without reloading.</li></ol><div class="button-row"><button id="profile-first" class="btn">Begin first pass</button><button id="profile-second" class="btn">Begin second pass</button><button id="profile-finish" class="btn accent">Finish pass & export</button></div><p class="settings-note">First-pass GPU work, repeated stalls and CPU-heavy sections can then be compared. Timings depend on this machine. Keep playtime and route similar.</p>');
    const begin=label=>{
      this.game.stats.reset(); this.game.hitches.events.length=0; this.game.hitches.maxima={};
      this.game.profilePass=label; this.toast(label+" started. Walk the route, then return here.",5000);
      this.hide();this.game.resume();
    };
    $("profile-first").onclick=()=>begin("First pass"); $("profile-second").onclick=()=>begin("Second pass");
    $("profile-finish").onclick=()=>{
      const report=this.diagnostics();this.game.profileReports ||= [];
      this.game.profileReports.push(report);if(this.game.profileReports.length>2)this.game.profileReports.shift();
      this.downloadJSON({version:"1.14.0",passes:this.game.profileReports},"LastVehicle-performance-route.json");
    };
  }
  actionKey(action){return this.game.player?.inputDevice==='controller'?({interact:'A',flashlight:'X',journal:'Y',hint:'View',sprint:'L3',crouch:'B',throw:'RB',objective:'D-pad ↑'}[action]||action):keyName(this.game.settings.bindings[action]);}
  guidedPerformance(){
    const g=this.game,r=g.calibration?.report(g.settings);
    this.show('performance-setup',this.head('OPTIONAL LOCAL TEST','Find comfortable settings')+
      '<p>Use a normal route through the garage and at least one room. Walk 25 metres, turn around, and leave the flashlight on for at least six seconds. The sample needs 30 seconds of active play. Pauses do not count.</p>'+
      (r?`<article class="journal-task"><p>${escapeHTML(r.message)}</p><p>${r.seconds} seconds · ${r.rooms}/2 areas · ${r.metres}/25 metres · flashlight ${r.flashlightSeconds}/6 seconds · turns ${r.turnDegrees}/180°</p><p>95th-percentile frame: ${r.p95.toFixed(1)} ms. CPU submission: ${r.cpu.toFixed(1)} ms. GPU: ${r.gpu===null?'unavailable':r.gpu.toFixed(1)+' ms'}.</p></article>`:'')+
      '<div class="button-row"><button id="setup-start" class="btn accent" '+(!g.started?'disabled':'')+'>Start a new sample</button>'+(r&&!r.complete?'<button id="setup-continue" class="btn">Continue sample</button>':'')+(r?.complete&&Object.keys(r.patch).length?'<button id="setup-suggest" class="btn">Stage suggested graphics</button>':'')+'<button id="setup-back" class="btn">Back to settings</button></div><p class="settings-note">Start or continue a game first. Suggestions need Apply and Keep; your manual settings remain unchanged until then. A short sample does not certify stable performance.</p>');
    $('setup-start').onclick=()=>g.beginCalibration();
    $('setup-continue')?.addEventListener('click',()=>{this.hide();g.resume();});
    $('setup-suggest')?.addEventListener('click',()=>{g.graphics.stage(g.settings,r.patch);this.settings('display');});
    $('setup-back').onclick=()=>this.settings('performance');
  }
  downloadDiagnostics() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.diagnostics(), null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "LastVehicle-diagnostics.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  recovery(error) {
    const g=this.game;g.renderFault=true;g.lastError=error?.message||"Unknown error";
    g.recoveryLog?.capture(error,{objective:g.currentObjective()?.[0],mode:g.threat?.mode,
      position:g.player?{...g.player.pos}:null});
    g.store.set("lastCrash",JSON.stringify({version:"1.14.0",...g.recoveryLog?.error}));
    g.stopInput();g.audio.suspend();
    const previous=g.store.readGame(),saved=g.store.available&&!!previous;
    this.show("recovery",this.head("GAME PAUSED","Restore a clean checkpoint",false)+
      `<p>${saved?"Your previous checkpoint is available. Reload to rebuild the scene, then choose Continue.":"Browser storage is blocked. Export your checkpoint, reload, then import the file from the title screen."}</p>
      <div class="button-row"><button id="recover-play" class="btn accent">Reload checkpoint</button><button id="recover-low" class="btn">Reload with Low graphics</button><button id="recover-save" class="btn">Export checkpoint</button><button id="recover-report" class="btn">Download diagnostic report</button></div>
      <details><summary>Error details</summary><p>${escapeHTML(g.lastError)}</p></details>`);
    $("recover-play").onclick=()=>g.reloadCheckpoint();
    $("recover-low").onclick=()=>g.reloadCheckpoint(true);
    $("recover-save").onclick=()=>{const s=g.lastGoodSave||g.store.readGame();if(s){g.exportSave(s);g.recoveryExported=true;}};
    $("recover-report").onclick=()=>this.downloadDiagnostics();
  }
  credits() {
    this.show(
      "credits",
      this.head("A GINGRSNAPS PROJECT", "Last Vehicle") +
        `<p>A short horror game about the people who are still here when everyone else goes home.</p><div class="credits-list"><strong>Created for GingrSnaps</strong><br>Babylon.js — Apache 2.0<br><br><strong>Public-domain / CC0 assets</strong><br>Vehicles & props — Kenney, Car Kit 3.1, Factory Kit and Furniture Kit<br>The Attendant — original creature, rig & animation<br>Meridian worn details, maintenance key, wall paint, weather and three-note score — original CC0 assets<br>Legacy optional human — Quaternius (2017 CC0 pack)<br>Interface & impact sounds — Kenney<br>Music — “Dream 2 Ambience” by TokyoGeisha; legacy “EmptyCity” by yd; “Horror Atmosphere” by Juhani Junkala / SubspaceAudio; horror ambience by congusbongus<br>Sound effects — qubodup, Brian MacIntosh / BMacZero, TinyWorlds, Independent.nu, Frenchyboy, congusbongus looneybits Ogrebane, rubberduck and Thimras.<br>Surface textures — Poly Haven: Rob Tuytel, Amal Kumar and Dimitrios Savva.<br><br>Original level geometry, interface, story, and game code were created for this project.<br><br><a href="assets/CREDITS.md" target="_blank" rel="noopener">Complete audio and model credits ↗</a><br><a href="assets/assets-manifest.json" target="_blank" rel="noopener">Asset sources and license manifest ↗</a></div><div class="button-row"><button id="credits-back" class="btn accent">Back</button><button id="credits-intro" class="btn">Replay studio intro</button></div>`,
    );
    $("credits-intro").onclick = () => this.game.replayIntro();
    $("credits-back").onclick = () => this.back();
  }
}
