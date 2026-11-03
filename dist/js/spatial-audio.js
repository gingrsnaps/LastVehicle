/** Web Audio takes finite float32 coordinates. Babylon Vector3 stores these
 * behind getters: spreading a Vector3 copies _x, not x. Read each public axis.
 * A missing Y is permitted for our ground-plane events; X/Z are required. */
export function snapshotPosition(value, out = {}) {
  try {
    const x = value?.x, y = value?.y ?? 1, z = value?.z;
    if (![x, y, z].every(n => typeof n === "number" && Number.isFinite(Math.fround(n)))) return null;
    out.x = x; out.y = y; out.z = z;
    return out;
  } catch { return null; } // A disposed/custom emitter may expose throwing getters.
}

/** Prefer modern AudioParams; old Web Audio implementations retain a fallback.
 * Callers isolate failures per voice, so audio never owns game progression. */
export function setSpatialPosition(node, point, now, smooth = false) {
  const p = snapshotPosition(point);
  if (!p) throw new TypeError("Invalid spatial sound coordinates");
  if (node.positionX && node.positionY && node.positionZ) {
    for (const axis of ["X", "Y", "Z"]) {
      const parameter = node["position" + axis], value = p[axis.toLowerCase()];
      if (smooth && parameter.setTargetAtTime) parameter.setTargetAtTime(value, now, .025);
      else parameter.setValueAtTime(value, now);
    }
  } else node.setPosition(p.x, p.y, p.z);
}
