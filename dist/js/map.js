import { TASKS } from './tasks.js?v=1.14.0';
/** Schematic floor plan. Discovered blockers disappear when their task is done. */
export function renderMap(position = null, destination = null, visited = [], flags = [], mechanisms=[]) {
  const rooms = [
    [-30, 7, 13, 22, "SECURITY"],
    [-30, 33, 13, 24, "STORAGE"],
    [-30, 62, 13, 26, "WORKSHOP"],
    [17, 27, 13, 24, "ELECTRICAL"],
    [17, 86, 13, 24, "PUMP ROOM"],
  ];
  const sx = (x) => (x + 31) * 7,
    sz = (z) => z * 6 + 35;
  const roomSVG = rooms
    .map(
      ([x, z, w, d, label]) =>
        `<rect x="${sx(x)}" y="${sz(z)}" width="${w * 7}" height="${d * 6}" fill="${visited.includes(label === "PUMP ROOM" ? "pump" : label.toLowerCase()) ? "#35534e" : "#1b2b2d"}" stroke="#799588" stroke-width="1"/><text x="${sx(x + w / 2)}" y="${sz(z + d / 2)}" text-anchor="middle" fill="#c5d3bd" font-size="11" letter-spacing=".4">${label}</text>`,
    )
    .join("");
  const marker = position
    ? `<circle cx="${sx(position.x)}" cy="${sz(position.z)}" r="8" fill="#fff0c6" stroke="#182a2c" stroke-width="2"/><text x="217" y="743" text-anchor="middle" fill="#c9b382" font-size="11" letter-spacing="1">● YOUR POSITION</text>`
    : "";
  const destinationMarker = destination ? `<circle cx="${sx(destination.x)}" cy="${sz(destination.z)}" r="11" fill="none" stroke="#e6c585" stroke-width="3"/><circle cx="${sx(destination.x)}" cy="${sz(destination.z)}" r="3" fill="#e6c585"/>` : "";
  const shortcut = flags.includes("key") ? `<path d="M${sx(-24)} ${sz(29)}V${sz(62)}" fill="none" stroke="#e6c585" stroke-width="3" stroke-dasharray="5 4"/>` : "";
  const annotations=TASKS.filter(t=>mechanisms?.includes(t.id)&&!flags.includes(t.id)&&t.destination).map(t=>`<g><circle cx="${sx(t.destination.x)}" cy="${sz(t.destination.z)}" r="7" fill="#ad785c"/><text x="${sx(t.destination.x)}" y="${sz(t.destination.z)+4}" text-anchor="middle" fill="#fff2d6" font-size="11">!</text><title>Requires · ${t.title}</title></g>`).join('');
  return `<p class="settings-note">${destination ? "DESTINATION · " + destination.name : "Service floor plan"}<br>Gold ring: current task · White dot: you · Green rooms: visited · Dashed gold: unlocked service passage · !: discovered blocked mechanism</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 434 770" role="img" aria-label="Meridian B2 plan. North exit at top. Security, Storage and Workshop on west side. Electrical and Pump Room on east side." style="font-family:Arial,sans-serif;width:100%;max-height:60vh"><rect width="434" height="770" fill="#102023"/><rect x="7" y="41" width="420" height="654" fill="#192e31" stroke="#799588"/><rect x="98" y="41" width="238" height="654" fill="#15292c" stroke="#799588"/>${roomSVG}${shortcut}<path d="M217 650V65" fill="none" stroke="#6e8176" stroke-width="1" stroke-dasharray="5 8"/><path d="M210 76l7-12 7 12" fill="none" stroke="#c9b382"/><text x="217" y="22" text-anchor="middle" fill="#c9b382" font-size="12" letter-spacing="3">NORTH EXIT</text><rect x="${sx(10)}" y="${sz(76)}" width="32" height="25" fill="#788f85"/><text x="${sx(12.5)}" y="${sz(83)}" text-anchor="middle" fill="#cfddc9" font-size="10">BAY 042</text><text x="217" y="718" text-anchor="middle" fill="#aabdaf" font-size="10" letter-spacing="2">MERIDIAN / BASEMENT 2</text>${annotations}${destinationMarker}${marker}</svg>`;
}
