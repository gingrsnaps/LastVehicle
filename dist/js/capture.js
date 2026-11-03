/** Pointer lock is asynchronous, including browsers whose request method returns
 * void. The event, not a short delay or a resolved Promise, confirms capture.
 * This controller never changes iframe permissions or tries to bypass a denial. */
export class MouseCapture {
  constructor(canvas, onState, doc = document) {
    this.canvas = canvas;
    this.doc = doc;
    this.onState = onState;
    this.state = "idle";
    this.wanted = false;
    this.serial = 0;
    this.pending = null;
    this.history = [];
    doc.addEventListener("pointerlockchange", () => {
      if (doc.pointerLockElement === canvas) {
        if (!this.wanted) {
          doc.exitPointerLock?.();
          return;
        }
        this.finish(true);
      } else if (this.state === "locked") {
        this.wanted = false;
        this.state = "idle";
        this.record("released");
        this.onState("released");
      }
    });
    doc.addEventListener("pointerlockerror", () => {
      if (this.pending)
        this.finish(
          false,
          this.pending.raw
            ? "Raw mouse input was not accepted. Try Enter game for standard controls."
            : "The browser blocked mouse capture. Try again, open the game in its own tab, or use drag controls.",
        );
    });
  }
  record(event, detail = "") {
    this.history.push({ event, detail, time: Math.round(performance.now()), state: this.state, focused: this.doc.hasFocus?.() ?? null, visibility: this.doc.visibilityState || "unknown" });
    if (this.history.length > 24) this.history.shift();
  }
  request({ raw = false } = {}) {
    if (this.pending) return this.pending.promise;
    this.wanted = true;
    if (this.doc.pointerLockElement === this.canvas) {
      this.state = "locked";
      this.onState("locked");
      return Promise.resolve(true);
    }
    const id = ++this.serial;
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    this.pending = { id, raw, promise, resolve, timer: null };
    this.state = "requesting";
    this.record("request", raw ? "raw" : "standard");
    this.onState("requesting");
    // This is a watchdog for a browser that reports neither event. A slow grant
    // (>180 ms) remains valid; gameplay stays paused until it actually arrives.
    this.pending.timer = setTimeout(() => {
      if (this.pending?.id === id)
        this.finish(
          false,
          "No capture response arrived. Click Enter game again or choose drag controls.",
        );
    }, 5000);
    try {
      this.canvas.focus?.({ preventScroll: true });
      if (!this.canvas.requestPointerLock)
        throw new Error("Mouse capture is unavailable in this browser.");
      // Keep the request on the original trusted button-click stack. Standard
      // capture deliberately omits options for broad Firefox/Chromium support.
      const result = raw
        ? this.canvas.requestPointerLock({ unadjustedMovement: true })
        : this.canvas.requestPointerLock();
      if (result?.then)
        result.then(
          () => {
            if (
              this.pending?.id === id &&
              this.doc.pointerLockElement === this.canvas
            )
              this.finish(true);
          },
          (error) => {
            if (this.pending?.id !== id) return; // Ignore an old request's rejection.
            const message =
              error?.name === "NotSupportedError"
                ? "Raw input is unsupported here. Click Enter game to use standard controls."
                : "Mouse capture was denied or the page lost focus. Click Enter game again, or use drag controls.";
            this.finish(false, message);
          },
        );
      // A synchronous legacy implementation can already have granted it.
      if (
        this.pending?.id === id &&
        this.doc.pointerLockElement === this.canvas
      )
        this.finish(true);
    } catch (error) {
      this.finish(
        false,
        error?.message ||
          "Mouse capture could not start. Use drag controls or retry.",
      );
    }
    return promise;
  }
  finish(ok, message = "") {
    const pending = this.pending;
    if (!pending && this.state === "locked" && ok) return;
    if (pending) {
      clearTimeout(pending.timer);
      this.pending = null;
      pending.resolve(ok);
    }
    this.state = ok ? "locked" : "error";
    this.wanted = ok;
    this.record(ok ? "granted" : "failed", message);
    this.onState(ok ? "locked" : "failed", message);
  }
  cancel() {
    this.record("cancel");
    this.serial++;
    this.wanted = false;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.resolve(false);
      this.pending = null;
    }
    this.state = "idle";
    if (this.doc.pointerLockElement === this.canvas)
      this.doc.exitPointerLock?.();
  }
}
