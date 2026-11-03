import { sightClear } from "./navigation.js?v=1.14.0";

/** Target small authored interaction volumes on visible handles/items. Full 3D
 * occlusion reaches the object; table tops no longer behave like tall walls. */
export function selectInteraction(items, eye, forward, blockers, policy = () => ({ available: true }), previous = null, tolerance=0) {
  let best = null, bestScore = -Infinity;
  for (const item of items) {
    const status = policy(item.id);
    if (item.hidden || status.hidden) continue;
    const dx = item.pos.x - eye.x, dy = item.pos.y - eye.y, dz = item.pos.z - eye.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance > 3.6 || distance < 0.03) continue;
    const along = dx * forward.x + dy * forward.y + dz * forward.z;
    if (along <= 0) continue;
    const dot = along / distance;
    const radius = item.radius ?? (item.id === "car" || item.id === "van" ? 0.65 : item.id === "key" ? 0.22 : 0.38);
    const lateral = Math.sqrt(Math.max(0, distance * distance - along * along));
    if (lateral > radius + distance * 0.045 + tolerance || !sightClear(eye, item.pos, blockers)) continue;
    const inReach = distance - radius <= 2.35;
    // A small score bias stabilises competing targets; it never retains a target
    // that has left the aim volume, become hidden, or moved behind a blocker.
    const score = dot - distance * 0.025 + (previous === item.id ? 0.018 : 0);
    if (score <= bestScore) continue;
    bestScore = score;
    best = { item, action:status.action || item.id, distance, usable: inReach && status.available,
      label: status.label || item.label,
      reason: !inReach ? "Move closer" : status.reason || "",
      locked: inReach && !status.available };
  }
  return best;
}

/** A brief aim grace stabilises small handles. Eligibility, reach and occlusion
 * are recomputed every time, including the actual E press. No stale use action
 * survives a wall, pickup, state change or an out-of-reach movement. */
export class InteractionFocus {
  reset(){this.id=null;this.seen=0;this.pending=null;this.pendingAt=0;}
  constructor(){this.reset();}
  choose(items,eye,forward,blockers,policy,now){
    const hint=selectInteraction(items,eye,forward,blockers,policy,this.id);
    if(hint?.item.id===this.id){this.seen=now;this.pending=null;return hint;}
    if(this.id&&now-this.seen<120){
      const held=selectInteraction(items.filter(i=>i.id===this.id),eye,forward,blockers,policy,this.id,.12);
      if(held&&held.distance-(held.item.radius??.38)<=2.35)return held;
    }
    if(!hint){this.id=null;this.pending=null;return null;}
    if(!this.id){this.id=hint.item.id;this.seen=now;return hint;}
    if(this.pending!==hint.item.id){this.pending=hint.item.id;this.pendingAt=now;}
    if(now-this.pendingAt<90)return null;
    this.id=hint.item.id;this.seen=now;this.pending=null;return hint;
  }
}
