/** Yield a real task boundary, not Promise.resolve(): the browser needs time to
 * paint the loading UI and process input between small construction batches. */
export const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
export async function consumeSteps(iterator, onStep = () => {}, budgetMs = 6) {
  let start = performance.now(), count = 0;
  for (const value of iterator) {
    onStep(value, ++count);
    if (performance.now() - start >= budgetMs) { await yieldTask(); start = performance.now(); }
  }
  await yieldTask();
}

/** A timeout is failure, never proof of readiness. Retry happens on a fresh load
 * so a partially prepared scene cannot accidentally become a playable scene. */
export async function waitForReady(check, { timeoutMs = 12000, label = "Graphics", yieldFrame = () => new Promise(r => setTimeout(r, 16)), now = () => performance.now() } = {}) {
  const began = now();
  while (!check()) {
    if (now() - began >= timeoutMs) throw Error(`${label} did not finish preparing. Retry, or choose simpler graphics.`);
    await yieldFrame();
  }
}
