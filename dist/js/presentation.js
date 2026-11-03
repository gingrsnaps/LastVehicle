/** The branding animation owns its completion. No competing three-second timer
 * can cut a frame off the logo. WAAPI also ignores CSS animation-duration rules,
 * so reduced motion keeps the readable hold while removing translation. */
export const INTRO_MS = 3000;
export function introFrames(reduced = false) {
  return [
    { opacity: 0, transform: reduced ? "none" : "translateY(6px)", offset: 0 },
    { opacity: 1, transform: "none", offset: .15 },
    { opacity: 1, transform: "none", offset: .85 },
    { opacity: 0, transform: reduced ? "none" : "translateY(-2px)", offset: 1 },
  ];
}
export async function playIntro(element, content, skipButton, reduced = false) {
  element.classList.remove("hidden"); element.setAttribute("aria-hidden", "false");
  let animation, timer, finish;
  const skipped = new Promise(resolve => { finish = resolve; });
  skipButton.onclick = () => { animation?.cancel(); finish(); };
  skipButton.focus();
  try {
    if (content.animate) {
      animation = content.animate(introFrames(reduced), { duration: INTRO_MS, easing: "linear", fill: "both" });
      const visible = () => document.hidden ? animation.pause() : animation.play();
      document.addEventListener("visibilitychange", visible);
      try { await Promise.race([animation.finished.catch(() => {}), skipped]); }
      finally { document.removeEventListener("visibilitychange", visible); }
    } else {
      // Old browser fallback: still readable and always dismissible.
      await Promise.race([new Promise(resolve => { timer = setTimeout(resolve, INTRO_MS); }), skipped]);
    }
  } finally {
    clearTimeout(timer); animation?.cancel(); skipButton.onclick = null;
    element.classList.add("hidden"); element.setAttribute("aria-hidden", "true");
  }
}

const PLANTED_CONTACT = Object.freeze({Backstep:.72,TurnLeft:.76,TurnRight:.76,Brake:.32});

/** One contact per half-cycle of the visible locomotion clip. Switching clips or
 * resuming seeds the tracker instead of producing a spurious landing sound. */
export class FootfallTracker {
  reset() { this.clip = null; this.half = null; this.previousPhase=null; }
  sample(name, frame, from, to) {
    const plant=PLANTED_CONTACT[name];
    if(plant!==undefined&&to>from){
      const phase=(frame-from)/(to-from),contact=this.clip===name&&this.previousPhase<plant&&phase>=plant;
      this.clip=name;this.previousPhase=phase;this.half=null;return contact;
    }
    if (!["Walk", "Run", "Stalk"].includes(name) || !(to > from)) { this.reset(); return false; }
    // Main planted-foot transitions sampled from the new weighted rig. Ignore
    // smaller toe-rock contacts so one stride still produces exactly two cues.
    const offset=name==="Run"?.917:name==="Stalk"?0:.825;
    const phase = ((frame - from) / (to - from) + offset) % 1;
    const half = Math.floor(phase * 2);
    const contact = this.clip === name && this.half !== null && this.half !== half;
    this.clip = name; this.half = half; return contact;
  }
}
