/** Small deterministic tween scheduler. Pausing stops its clock. A new run clears
 * pending callbacks, so a completed animation from an old game cannot alter a save. */
export const ease = {
  linear: (t) => t,
  cinematic: (t) => t * t * t * (t * (t * 6 - 15) + 10),
  smooth: (t) => t * t * (3 - 2 * t),
  out: (t) => 1 - (1 - t) ** 3,
  weight: (t) =>
    t < 0.8 ? (t / 0.8) ** 2 : 1 + Math.sin((t - 0.8) * Math.PI * 10) * 0.018,
};
export class Animator {
  constructor() {
    this.channels = new Map();
  }
  to(key, from, to, duration, apply, done = () => {}, curve = "smooth") {
    this.channels.set(key, {
      from,
      to,
      duration: Math.max(0.001, duration),
      time: 0,
      apply,
      done,
      curve,
    });
    apply(from);
  }
  tick(dt) {
    for (const [key, a] of [...this.channels]) {
      if (this.channels.get(key) !== a) continue;
      a.time += dt;
      const t = Math.min(1, a.time / a.duration);
      a.apply(a.from + (a.to - a.from) * ease[a.curve](t));
      if (t === 1 && this.channels.get(key) === a) {
        this.channels.delete(key);
        a.done();
      }
    }
  }
  clear() {
    this.channels.clear();
  }
}
export function dampAngle(current, target, rate, dt) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + delta * (1 - Math.exp(-rate * dt));
}
