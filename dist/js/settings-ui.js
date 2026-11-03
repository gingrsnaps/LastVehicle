import { SETTING_HELP, searchSettings } from './settings-help.js?v=1.14.0';
import { DEFAULT_SETTINGS, validateSettings } from "./state.js?v=1.14.0";
import { CATEGORIES, GRAPHICS_KEYS, PRESETS, resetCategory, importPreferences } from "./preferences.js?v=1.14.0";
const $ = id => document.getElementById(id);
const titles = { basics:"Quick setup", gameplay: "Gameplay", display: "Graphics", performance: "Performance", audio: "Audio", comfort: "Comfort", controls: "Controls" };
const keyLabel = code => ({ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"})[code] || String(code).replace(/^(Key|Digit)/, "").replace(/(Left|Right)$/, "");
const choices = values => values.map(v => [v, String(v)]);

/** Accessible HTML controls stay at display resolution even when WebGL is scaled.
 * Sliders such as volume are live; expensive graphics remain a draft until Apply. */
export function renderSettings(ui, tab) {
  const game = ui.game, preview = game.graphics;
  ui.settingsTab = tab;
  const s = { ...game.settings, ...preview.draft };
  const help=key=>`<small class="setting-help">${SETTING_HELP[key]||''} Default: ${typeof DEFAULT_SETTINGS[key]==='boolean'?(DEFAULT_SETTINGS[key]?'On':'Off'):String(DEFAULT_SETTINGS[key])}.</small>`;
  const range = (key, label, min, max, step = 1) => `<div class="setting"><label for="set-${key}">${label}<output id="out-${key}">${s[key]}</output></label><input data-setting="${key}" id="set-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}">${help(key)}</div>`;
  const check = (key, label) => `<div class="setting check"><label for="set-${key}">${label}</label><input data-setting="${key}" id="set-${key}" type="checkbox" ${s[key] ? "checked" : ""}>${help(key)}</div>`;
  const select = (key, label, opts) => `<div class="setting"><label for="set-${key}">${label}</label><select data-setting="${key}" id="set-${key}">${opts.map(([v,t]) => `<option value="${v}" ${String(s[key]) === String(v) ? "selected" : ""}>${t}</option>`).join("")}</select>${help(key)}</div>`;
  let body = "", note = "Preferences save in this browser. Story checkpoints use a separate export.";
  if(tab==="basics") {
    body=select("difficulty","Difficulty",[["easy","Easy"],["medium","Medium"],["hard","Hard"]])+range("sensitivity","Mouse sensitivity",.25,3,.05)+range("master","Master volume",0,1,.05)+range("brightness","Brightness",.6,1.8,.05)+select("quality","Quality",[["low","Low"],["medium","Medium"],["high","High"],["custom","Custom"]])+select("fpsCap","Frame limit",[[30,"30 FPS"],[60,"60 FPS"],[90,"90 FPS"],[120,"120 FPS"],[144,"144 FPS"],[0,"Display rate"]])+check("reducedMotion","Reduced motion");
    const k=name=>keyLabel(s.bindings[name]);
    body+=`<p class="settings-note">Mouse looks · ${["forward","left","back","right"].map(k).join(" / ")} moves · ${k("interact")} uses or hides · ${k("flashlight")} toggles the light · ${k("sprint")} sprints · ${k("crouch")} crouches · ${k("journal")} opens the journal. Key changes are in Controls.</p><button id="contrast-preview" class="btn">Check flashlight contrast</button>`;
    note="Common choices are here. The other tabs retain detailed display, audio, performance, comfort and control options. Darkness is intentional; use the flashlight to inspect objects.";
  } else if (tab === "gameplay") {
    body = select("difficulty", "Difficulty", [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]) + check("skipIntro", "Skip studio intro after first viewing") + select("objectiveMode", "Current objective", [["always","Always visible"],["request","Show on request"],["journal","Journal only"]]) + check("hintReminders", "Offer a hint after inactivity") + check("easyAdrenaline", "Easy: emergency stamina reserve") + select("staminaMode", "Stamina display", [["auto","While sprinting/recovering"],["always","Always"],["off","Off"]]) + check("journalNotify", "Brief journal update notification");
    note = `All difficulties keep the full story, clues, and checkpoints. ${keyLabel(s.bindings.journal)} opens your journal; ${keyLabel(s.bindings.hint)} opens its hints without revealing an answer. Hints are revealed only by clicking in the journal. Tools are used automatically. Controls are explained once and remain in the journal.`;
  } else if (tab === "display") {
    body = select("quality", "Quality preset", [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["custom", "Custom"]]) + select("shadows", "Flashlight shadows", [["off", "Off"], ["medium", "Medium · 512"], ["high", "High · 1024"]]) + check("glow", "Fixture glow") + check("fxaa", "Additional edge smoothing (FXAA)") + select("resolution", "Maximum render height", [["auto", "Match window"], ["720", "720p"], ["1080", "1080p"], ["1440", "1440p"]]) + range("scale", "Render scale", .5, 1.5, .05) + check("adaptive", "Adaptive resolution (requires GPU timer)") + range("adaptiveFloor", "Adaptive minimum · fraction of chosen scale", .5, 1, .05) + range("brightness", "Brightness · live", .6, 1.8, .05);
    note = "Graphics changes need Apply, then Keep within 15 seconds. FXAA provides optional edge smoothing. Multisample canvas antialiasing is disabled to reduce memory use; the render buffer is capped at the device limits and a 4K pixel budget. Adaptive resolution responds gradually to sustained GPU load and stays fixed when GPU timing is unavailable. Text stays sharp.";
  } else if (tab === "performance") {
    body = select("fpsCap", "Gameplay frame limit", [[30,"30 FPS"],[60,"60 FPS"],[90,"90 FPS"],[120,"120 FPS"],[144,"144 FPS"],[0,"Display refresh rate"]]) + select("menuFPS", "Title/menu frame limit", choices([15,30,60])) + select("fpsMode", "Performance overlay", [["off","Off"],["basic","FPS"],["detailed","Detailed"],["graph","Detailed + frame-time graph"]]) + select("fpsCorner", "Overlay position", [["top-right","Top right"],["top-left","Top left"],["bottom-right","Bottom right"],["bottom-left","Bottom left"]]) + range("fpsSize", "Overlay size", .8, 1.5, .1);
    note = "VSync and the maximum refresh rate are controlled by the browser/display. Statistics update four times per second, using gameplay frames only. 1% low uses up to 30 seconds of active play. Menus, intro, loading, and pauses are excluded. Opaque panels freeze the 3D backdrop. Pause → Performance test route describes a repeatable first/second-pass test; diagnostics include slow-frame sections.";
  } else if (tab === "audio") {
    body = range("master", "Master volume", 0,1,.05) + range("music", "Music",0,1,.05) + range("ambience", "Environment",0,1,.05) + range("sfx", "Effects & footsteps",0,1,.05) + range("uiVolume", "Interface sounds",0,1,.05) + range("loudEffects", "Loud effects · stingers, metal, alarms",.25,1,.05) + select("dynamicRange", "Dynamic range", [["full","Full"],["night","Night · softer peaks"]]) + check("soundCaptions", "Sound-effect captions · requires subtitles") + '<button id="sound-test" class="btn">Test interface and footstep sounds</button>';
    note = "Volume changes are immediate. Loud effects reduces those sound sources; Night mode compresses the overall mix. There is no surprise scare sound in the test. All story clues remain readable without audio.";
  } else if (tab === "comfort") {
    body = check("reducedMotion", "Reduced motion preset") + range("fov", "Horizontal field of view",60,105) + check("cinematicMotion", "Cinematic interaction focus") + range("bob", "Head movement",0,1,.05) + range("sway", "Flashlight sway",0,1,.05) + range("uiScale", "Interface scale",.85,1.3,.05) + range("subtitleSize", "Subtitle scale",.8,1.5,.1) + range("promptScale", "Interaction prompt size",.85,1.5,.05) + check("crosshair", "Show aiming dot") + range("crosshairSize", "Aiming dot size",.5,2,.1) + check("crosshairContrast", "High-contrast aiming dot") + check("subtitles", "Subtitles & sound captions") + check("reducedFlashes", "Reduce light changes") + check("interactionHighlight", "Highlight nearby interactions");
    note = "Reduced motion temporarily disables head bob, hand sway, interaction FOV changes, and moving menu entrances without erasing your custom values. The intro keeps its three-second readable fade. Light changes have their own control.";
  } else {
    body = select("mouseMode", "Preferred look mode", [["locked","Free mouse-look · recommended"],["raw","Free mouse-look · raw input"],["drag","Hold left button to look"]]) + range("sensitivity", "Mouse sensitivity / horizontal",.25,3,.05) + check("separateAxes", "Separate vertical sensitivity") + range("sensitivityY", "Vertical sensitivity · when separated",.25,3,.05) + check("invertY", "Invert vertical look") + range("lookSmoothing", "Look smoothing · seconds, 0 = off",0,.12,.01) + select("sprintMode", "Sprint", [["hold","Hold"],["toggle","Toggle"]]) + select("crouchMode", "Crouch", [["hold","Hold"],["toggle","Toggle"]]) + '<div id="sensitivity-preview" tabindex="0" aria-label="Sensitivity preview: move the mouse here"><span id="preview-reticle">+</span><small>Move the mouse here to compare sensitivity · no click required</small></div>' + Object.keys(s.bindings).map(a => `<div class="setting"><label>${a[0].toUpperCase()+a.slice(1)}</label><button class="bind" data-bind="${a}">${({ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"})[s.bindings[a]] || s.bindings[a].replace(/^(Key|Digit)/,"").replace(/(Left|Right)$/ ,"")}</button></div>`).join("");
    note = "Enter game / Resume requests capture using a fresh click. Once captured, move the mouse freely; no button needs to be held. Escape pauses and releases capture. Raw input needs browser support. If an embed blocks capture, open the standalone tab. Toggle sprint/crouch reset on pause so movement cannot stick.";
  }
  if(tab==='basics'||tab==='comfort')body+='<button id="comfort-preset" class="btn">Apply calm-camera comfort preset</button>';
  if(tab==='comfort')body+=range('cameraShake','Impact camera shake',0,1,.05)+range('scareScreenEffects','Scare edge effects',0,1,.05)+range('sprintFOV','Sprint field-of-view widening',0,8,.5)+range('subtitleBackground','Subtitle background opacity',0,1,.05)+check('speakerLabels','Caption speaker labels');
  if(tab==='audio')body+=check('monoAudio','Mono output')+'<button id="stereo-test" class="btn">Test left, then right channel</button><p class="settings-note">A gentle click plays left first, then right. Mono combines both positions.</p>';
  if(tab==='controls')body+=check('controllerEnabled','Enable standard gamepad')+range('controllerDeadzone','Controller deadzone',.05,.4,.01)+range('controllerCurve','Controller look curve',1,3,.1)+range('controllerLook','Controller sensitivity',.25,3,.05);
  if(tab==='display'||tab==='performance'){
    const rect=game.canvas.getBoundingClientRect();
    body+=`<p class="settings-note">Browser viewport: ${Math.round(rect.width)} × ${Math.round(rect.height)} CSS pixels. 3D render buffer: ${game.engine.getRenderWidth()} × ${game.engine.getRenderHeight()} pixels. Fullscreen changes the viewport; render scale changes 3D detail.</p>`;
  }
  if(tab==='performance'||tab==='basics')body+='<button id="guided-performance" class="btn">Guided performance setup</button>';
  const confirmation = preview.baseline ? '<div class="graphics-confirm" role="status"><strong id="graphics-countdown">Keep these graphics? 15 seconds</strong><button id="graphics-keep" class="btn accent">Keep</button><button id="graphics-revert" class="btn">Revert</button></div>' : '<div class="button-row"><button id="graphics-apply" class="btn" '+(!preview.draft?'disabled':'')+'>Apply graphics</button><span id="graphics-pending" class="settings-note">'+(preview.draft?'Unapplied graphics changes':'Graphics are saved')+'</span></div>';
  ui.show("settings", ui.head("MAKE YOURSELF COMFORTABLE", "Settings") + `<label class="settings-search" for="settings-search">Find a setting<input id="settings-search" type="search" placeholder="Try mouse, captions, frame, controller…" autocomplete="off"></label><div id="settings-results" aria-live="polite"></div><div class="tabs">${Object.entries(titles).map(([id,t])=>`<button data-tab="${id}" class="${id===tab?'selected':''}">${t}</button>`).join("")}</div>${confirmation}<div class="settings-group">${body}</div><p class="settings-note">${note}</p><div class="button-row"><button id="settings-done" class="btn accent">Done</button><button id="fullscreen" class="btn">${document.fullscreenElement?'Leave fullscreen':'Fullscreen'}</button><button id="reset-category" class="btn">Reset ${titles[tab]}</button><button id="reset-settings" class="btn">Restore all defaults</button></div><div class="button-row"><button id="settings-export" class="btn">Export settings</button><button id="settings-import" class="btn">Import settings</button>${!game.started?'<button id="import-title" class="btn">Import story save</button>':''}</div>`);
  $('settings-search').oninput=()=>{
    const matches=searchSettings($('settings-search').value);
    $('settings-results').innerHTML=matches.map(m=>`<button class="search-result" data-found="${m.key}" data-category="${m.tab}">${m.label} · ${titles[m.tab]}</button>`).join('')||($('settings-search').value?'<p>No matching settings.</p>':'');
    for(const button of $('settings-results').querySelectorAll('[data-found]'))button.onclick=()=>{ui.settings(button.dataset.category);const input=$('set-'+button.dataset.found);input?.scrollIntoView?.({block:'center'});input?.focus();};
  };
  $('comfort-preset')?.addEventListener('click',()=>{Object.assign(game.settings,{reducedMotion:true,reducedFlashes:true,cameraShake:0,scareScreenEffects:0,sprintFOV:0});game.applySettings();ui.settings(tab);});
  $('guided-performance')?.addEventListener('click',()=>ui.guidedPerformance());
  $('stereo-test')?.addEventListener('click',async()=>{const ok=await game.audio.stereoTest();ui.toast(ok?'Left click, then right click. Mono output combines both.':'Audio unavailable. Check browser sound permissions.');});
  const refreshDraft = () => {
    if ($("graphics-apply")) $("graphics-apply").disabled = !preview.draft;
    if ($("graphics-pending")) $("graphics-pending").textContent = preview.draft ? "Unapplied graphics changes" : "Graphics are saved";
  };
  for (const b of $("panel").querySelectorAll("[data-tab]")) b.onclick = () => ui.settings(b.dataset.tab);
  for (const input of $("panel").querySelectorAll("[data-setting]")) {
    const key = input.dataset.setting;
    if (GRAPHICS_KEYS.includes(key) && preview.baseline) input.disabled = true;
    input.oninput = () => {
      const value = input.type === "checkbox" ? input.checked : typeof DEFAULT_SETTINGS[key] === "number" ? Number(input.value) : input.value;
      if (GRAPHICS_KEYS.includes(key)) { preview.stage(game.settings, { [key]: value }); refreshDraft(); }
      else { game.settings[key] = value; if (key === "difficulty") game.setDifficulty(value); else game.applySettings(); }
      if ($("out-"+key)) $("out-"+key).textContent = value;
      if (["quality","shadows","glow","fxaa"].includes(key)) ui.settings(tab);
    };
  }
  for (const b of $("panel").querySelectorAll("[data-bind]")) b.onclick = () => { ui.bindingAction = b.dataset.bind; b.textContent = "Press a key…"; };
  $("graphics-apply")?.addEventListener("click", () => { game.previewGraphics(); ui.settings(tab); });
  $("graphics-keep")?.addEventListener("click", () => { game.keepGraphics(); ui.settings(tab); });
  $("graphics-revert")?.addEventListener("click", () => { game.cancelGraphics(); ui.settings(tab); });
  $("settings-done").onclick = () => ui.back();
  $("fullscreen").onclick = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); ui.settings(tab); }
    catch { ui.toast("Fullscreen is unavailable in this browser or embed."); }
  };
  const replace = next => {
    game.cancelGraphics();
    const graphics = Object.fromEntries(GRAPHICS_KEYS.map(k => [k,next[k]]));
    const existingGraphics = Object.fromEntries(GRAPHICS_KEYS.map(k => [k,game.settings[k]]));
    game.settings = validateSettings({ ...next, ...existingGraphics });
    preview.stage(game.settings, graphics); game.setDifficulty(next.difficulty);
    ui.settings(tab);
  };
  $("reset-category").onclick = () => {
    if(tab==="basics") replace({...s,...PRESETS.low,quality:"low",difficulty:"medium",sensitivity:1,master:.75,brightness:1,fpsCap:60,reducedMotion:false});
    else if (tab === "display") replace(resetCategory(s, tab));
    else { for (const k of (CATEGORIES[tab]||["difficulty","sensitivity","master","brightness","reducedMotion"])) game.settings[k] = structuredClone(DEFAULT_SETTINGS[k]); if (tab === "gameplay" || tab === "basics") game.setDifficulty(game.settings.difficulty); else game.applySettings(); ui.settings(tab); }
  };
  $("reset-settings").onclick = () => replace(validateSettings());
  $("settings-export").onclick = () => ui.downloadJSON({ type: "last-vehicle-settings", version: 1, settings: preview.persisted(game.settings) }, "LastVehicle-settings.json");
  $("settings-import").onclick = () => $("settings-file").click();
  $("settings-file").onchange = async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    try { if (file.size > 65536) throw Error("Settings file is too large."); replace(importPreferences(await file.text())); ui.toast("Settings imported. Apply and Keep to save imported graphics."); }
    catch (error) { ui.toast(error.message); }
  };
  $("contrast-preview")?.addEventListener("click",()=>game.previewContrast());
  $("sound-test")?.addEventListener("click", async () => {
    const ok = await game.audio.soundTest(); ui.toast(ok ? "Interface click and footstep played at your current volumes." : "Audio is unavailable. Check browser sound permissions.");
  });
  $("import-title")?.addEventListener("click", () => $("save-file").click());
  const area = $("sensitivity-preview");
  if (area) {
    let previous = null, x = 0, y = 0;
    area.onpointerleave = () => { previous = null; };
    area.onpointermove = e => {
      if (previous) { const p = game.settings; x += (e.clientX-previous.x)*p.sensitivity; y += (e.clientY-previous.y)*(p.separateAxes?p.sensitivityY:p.sensitivity)*(p.invertY?-1:1); }
      previous = {x:e.clientX,y:e.clientY};
      x = Math.max(-120,Math.min(120,x)); y = Math.max(-25,Math.min(25,y));
      $("preview-reticle").style.transform = `translate(${x}px,${y}px)`;
    };
  }
}
