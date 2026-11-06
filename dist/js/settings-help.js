import { CATEGORIES } from './preferences.js?v=1.19.0';
export const SETTING_HELP={
 weatherEffects:'Controls rain and steam density. Puddles, cover and important landmarks remain on every setting.',
 skyBrightness:'Changes the background sky only; does not brighten the yard or change enemy detection.',
 sceneryMotion:'Slow clouds and nearby chain/sign movement. Reduced motion also suppresses it.',
 objectiveMode:'Always shows a compact task; On request shows it for eight seconds with Tab; Journal only keeps the screen clear.',
 hintReminders:'After a quiet minute without progress, offers the journal without revealing a solution.',
 easyAdrenaline:'Easy only: one small stamina reserve when a visible chase begins. At least 35 seconds between assists.',
 staminaMode:'Auto shows stamina during sprint/recovery. It never darkens the view or reveals a hidden enemy.',

 sensitivity:'Mouse movement turns the view immediately. Smoothing is optional.',
 sensitivityY:'Used only when separate vertical sensitivity is enabled.',
 controllerDeadzone:'Increase until untouched sticks stop drifting.',
 controllerCurve:'Higher values give finer aiming near the centre of the stick.',
 controllerLook:'Maximum controller turn rate; independent of mouse sensitivity.',
 controllerEnabled:'Standard gamepads: left stick moves, right looks, A uses, X light, Y journal, B crouch, L3 sprint, Menu pauses. D-pad navigates menus; left/right adjusts values.',
 scale:'Changes 3D pixel density. Interface text remains at the browser resolution.',
 resolution:'A render-height ceiling, not an operating-system screen-size change.',
 adaptive:'Reduces render resolution only after sustained measured GPU pressure.',
 stableHorizon:'Enabled by default. Removes impact roll while keeping free mouse-look and separately adjustable hand sway.',
 throwGuide:'Hold the keyboard throw key to preview its arc; release to throw. Controller RB throws directly.',
 cameraShake:'Short impact motion only. Zero keeps the view steady.',
 scareScreenEffects:'Brief edge darkening at impacts; never a full-screen image.',
 loudEffects:'Reduces abrupt sound peaks without changing enemy difficulty.',
 sprintFOV:'Optional field-of-view widening while sprinting, in degrees.',
 monoAudio:'Combines stereo channels. Directional information remains in captions.',
 subtitleBackground:'Dark backing behind text for contrast against the scene.',
 speakerLabels:'Identifies environmental captions and the player’s thoughts.',
 reducedMotion:'Suppresses bob, sway, camera shake and animated field-of-view changes.',
 reducedFlashes:'Softens light changes without removing clues or encounters.',
 fpsCap:'The browser/display still controls synchronization. This is a frame limiter.',
 fpsMode:'FPS counter, detailed frame-time statistics, or the frame-time graph. Off hides it.',
 brightness:'Adjust visibility without changing how the enemy detects you.',
 mouseMode:'Free mouse-look requires a click and browser pointer-lock permission.',
 lookSmoothing:'Zero gives immediate mouse response; other values smooth rotation.',
 shadows:'Flashlight shadow resolution. Off has the lowest GPU cost.',
 dynamicRange:'Night compresses loud peaks and keeps quieter detail audible.',
};
export function searchSettings(query){
 const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 if(!words.length)return [];
 return Object.entries(CATEGORIES).flatMap(([tab,keys])=>keys.filter(key=>words.every(word=>(key.replace(/[A-Z]/g,c=>' '+c).toLowerCase()+' '+(SETTING_HELP[key]||'').toLowerCase()+' '+tab).includes(word))).map(key=>({tab,key,label:key.replace(/[A-Z]/g,c=>' '+c.toLowerCase())}))).slice(0,16);
}
