/** Application entry: keep fatal startup errors readable instead of a black canvas. */
import { Game } from "./game.js?v=1.19.0";
import { $ } from "./ui.js?v=1.19.0";
const game = new Game();
// Event-handler failures must produce a recovery screen, not an inert menu.
// Reports remain local; no telemetry or personal data is sent anywhere.
function reportRuntimeError(error) {
  if (!game.started || !game.world || game.renderFault) return;
  console.error(error);
  game.ui.recovery(error);
}
window.addEventListener("error", (event) => {
  if (event.error) reportRuntimeError(event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  reportRuntimeError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
});
game.boot().catch((error) => {
  console.error(error);
  game.loadingFailed(error);
});
// No debug cheats or arbitrary evaluation endpoints are exposed in production.

// Opt-in authoring inspection; ordinary player URLs expose no debug interface.
if(new URLSearchParams(location.search).has('inspect')){
  window.lastVehicleInspector={report:()=>game.world?.placements.report(),show:()=>game.world?.placements.showDebug(true),hide:()=>game.world?.placements.showDebug(false)};
}
