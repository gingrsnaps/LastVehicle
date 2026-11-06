import { DEFAULT_SETTINGS, validateSettings } from "./state.js?v=1.19.0";

export const GRAPHICS_KEYS = ["quality", "shadows", "glow", "fxaa", "resolution", "scale", "adaptive", "adaptiveFloor", "weatherEffects"];
export const PRESETS = {
  low: { shadows: "off", glow: false, fxaa: false },
  medium: { shadows: "medium", glow: true, fxaa: false },
  high: { shadows: "high", glow: true, fxaa: true },
};
export const CATEGORIES = {
  gameplay: ["difficulty", "skipIntro", "objectiveHUD", "objectiveMode", "journalNotify", "hintReminders", "easyAdrenaline", "staminaMode"],
  display: [...GRAPHICS_KEYS, "brightness", "skyBrightness"],
  performance: ["fpsCap", "menuFPS", "fpsMode", "fpsCorner", "fpsSize"],
  audio: ["master", "music", "ambience", "sfx", "uiVolume", "loudEffects", "dynamicRange", "soundCaptions","monoAudio"],
  comfort: ['sceneryMotion','stableHorizon',"reducedMotion", "cinematicMotion", "fov", "bob", "sway", "uiScale", "subtitleSize", "promptScale", "crosshair", "crosshairSize", "crosshairContrast", "subtitles", "reducedFlashes", "interactionHighlight","cameraShake","scareScreenEffects","sprintFOV","subtitleBackground","speakerLabels"],
  controls: ['throwGuide',"mouseMode", "sensitivity", "separateAxes", "sensitivityY", "invertY", "lookSmoothing", "sprintMode", "crouchMode", "bindings","controllerEnabled","controllerDeadzone","controllerCurve","controllerLook"],
};
const pick = s => Object.fromEntries(GRAPHICS_KEYS.map(k => [k, s[k]]));

/** Only graphics are transactional. Editing audio during a preview must neither
 * save the unconfirmed graphics nor lose the new audio setting on Revert. */
export class GraphicsPreview {
  constructor() { this.draft = null; this.baseline = null; this.deadline = 0; }
  stage(current, patch) {
    if (patch.quality && PRESETS[patch.quality]) patch = { ...patch, ...PRESETS[patch.quality] };
    else if (["shadows", "glow", "fxaa"].some(k => k in patch) && !("quality" in patch)) patch = { ...patch, quality: "custom" };
    this.draft = pick(validateSettings({ ...current, ...this.draft, ...patch }));
  }
  apply(current, now) {
    if (!this.draft || this.baseline) return current;
    this.baseline = pick(current); this.deadline = now + 15000;
    return { ...current, ...this.draft };
  }
  persisted(current) { return { ...current, ...(this.baseline || {}) }; }
  keep() { this.draft = this.baseline = null; this.deadline = 0; }
  revert(current) { const restored = this.persisted(current); this.keep(); return restored; }
}
export function resetCategory(current, category) {
  const next = { ...current };
  for (const k of CATEGORIES[category] || []) next[k] = structuredClone(DEFAULT_SETTINGS[k]);
  return validateSettings(next);
}
export function importPreferences(text) {
  if (text.length > 65536) throw Error("Settings file is too large.");
  const data = JSON.parse(text);
  if (data?.type !== "last-vehicle-settings" || data.version !== 1 || !data.settings || typeof data.settings !== "object" || Array.isArray(data.settings))
    throw Error("Choose a Last Vehicle settings export, not a story save.");
  return validateSettings(data.settings);
}
