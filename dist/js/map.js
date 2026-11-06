import { TASKS } from './tasks.js?v=1.19.0';
/** Schematic floor plan. Discovered blockers disappear when their task is done. */
export function renderMap(position = null, destination = null, visited = [], flags = [], mechanisms=[]) {
  if((position?.z??1)<0||(destination?.z??1)<0)return renderYardMap(position,destination,flags)+`<details class="journal-history"><summary>Garage floor plan</summary>${renderMap(null,null,visited,flags,mechanisms)}</details>`;
  const rooms = [
    [-30, 7, 13, 22, "SECURITY"],
    [-30, 33, 13, 24, "STORAGE"],
    [-30, 62, 13, 26, "WORKSHOP"],
    [17, 27, 13, 24, "ELECTRICAL"],
    [17, 86, 13, 24, "PUMP ROOM"],
  ];
  // Mirror X to agree with the actual north-facing Babylon view.
  const sx = (x) => (31 - x) * 7,
    sz = (z) => z * 6 + 35;
  const roomSVG = rooms
    .map(
      ([x, z, w, d, label]) =>
        `<rect x="${sx(x + w)}" y="${sz(z)}" width="${w * 7}" height="${d * 6}" fill="${visited.includes(label === "PUMP ROOM" ? "pump" : label.toLowerCase()) ? "#35534e" : "#1b2b2d"}" stroke="#799588" stroke-width="1"/><text x="${sx(x + w / 2)}" y="${sz(z + d / 2)}" text-anchor="middle" fill="#c5d3bd" font-size="11" letter-spacing=".4">${label}</text>`,
    )
    .join("");
  const marker = position
    ? `<circle cx="${sx(position.x)}" cy="${sz(position.z)}" r="8" fill="#fff0c6" stroke="#182a2c" stroke-width="2"/><text x="217" y="743" text-anchor="middle" fill="#c9b382" font-size="11" letter-spacing="1">● YOUR POSITION</text>`
    : "";
  const destinationMarker = destination ? `<circle cx="${sx(destination.x)}" cy="${sz(destination.z)}" r="11" fill="none" stroke="#e6c585" stroke-width="3"/><circle cx="${sx(destination.x)}" cy="${sz(destination.z)}" r="3" fill="#e6c585"/>` : "";
  const shortcut = flags.includes("key") ? `<path d="M${sx(-24)} ${sz(29)}V${sz(62)}" fill="none" stroke="#e6c585" stroke-width="3" stroke-dasharray="5 4"/>` : "";
  const annotations=TASKS.filter(t=>mechanisms?.includes(t.id)&&!flags.includes(t.id)&&t.destination).map(t=>`<g><circle cx="${sx(t.destination.x)}" cy="${sz(t.destination.z)}" r="7" fill="#ad785c"/><text x="${sx(t.destination.x)}" y="${sz(t.destination.z)+4}" text-anchor="middle" fill="#fff2d6" font-size="11">!</text><title>Requires · ${t.title}</title></g>`).join('');
  return `<p class="settings-note">${destination ? "DESTINATION · " + destination.name : "Service floor plan"}<br>Gold ring: current task · White dot: you · Green rooms: visited · Dashed gold: unlocked service passage · !: discovered blocked mechanism</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 434 770" role="img" aria-label="Meridian B2 plan. North exit at top. Security, Storage and Workshop on the service side. Electrical and Pump Room on the opposite side." style="font-family:Arial,sans-serif;width:100%;max-height:60vh"><rect width="434" height="770" fill="#102023"/><rect x="7" y="41" width="420" height="654" fill="#192e31" stroke="#799588"/><rect x="98" y="41" width="238" height="654" fill="#15292c" stroke="#799588"/>${roomSVG}${shortcut}<path d="M217 650V65" fill="none" stroke="#6e8176" stroke-width="1" stroke-dasharray="5 8"/><path d="M210 76l7-12 7 12" fill="none" stroke="#c9b382"/><text x="217" y="22" text-anchor="middle" fill="#c9b382" font-size="12" letter-spacing="3">NORTH EXIT</text><rect x="${sx(10)-32}" y="${sz(76)}" width="32" height="25" fill="#788f85"/><text x="${sx(12.5)}" y="${sz(83)}" text-anchor="middle" fill="#cfddc9" font-size="10">BAY 042</text><text x="217" y="718" text-anchor="middle" fill="#aabdaf" font-size="10" letter-spacing="2">MERIDIAN / BASEMENT 2</text>${annotations}${destinationMarker}${marker}</svg>`;
}

function renderYardMap(position,destination,flags){
  const x=n=>(31-n)*6,z=n=>(n+102)*5.3+25;
  const marker=(p,color,r)=>p&&p.z<0?`<circle cx="${x(p.x)}" cy="${z(p.z)}" r="${r}" fill="none" stroke="${color}" stroke-width="3"/>`:'';
  const barrier=flags.includes('barrier')?'#6f967c':'#b98563';
  return `<p class="settings-note">SERVICE YARD / STREET${destination?' · '+destination.name:''}<br>01 Barrier control · 02 Utility selector · 03 Gatehouse brake · 04 Dock winch<br>Gold ring: task · White arrow: your facing direction · North is up. Follow the OPEN LANE sign around the roadworks container.</p>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 630" role="img" aria-label="Service yard map with gatehouse beside the generator, loading dock opposite and street barrier at the far end" style="font-family:Arial,sans-serif;width:100%;max-height:64vh">
  <rect width="372" height="630" fill="#102023"/><rect x="96" y="25" width="180" height="233" fill="#263936" stroke="#819080"/>
  <rect x="7" y="258" width="358" height="318" fill="#1c3031" stroke="#819080"/>
  <rect x="${x(11.5)}" y="${z(-76)}" width="66" height="42" fill="#596156"/><text x="154" y="${z(-70)}" fill="#eee1ba" font-size="9" text-anchor="middle">ROADWORKS</text>
  <path d="M186 286 V242 L240 210 V135 L186 62" stroke="#bdaa72" stroke-width="3" fill="none" stroke-dasharray="7 5"/>
  <text x="186" y="18" text-anchor="middle" fill="#e6c585" font-size="12">STREET / DEPARTURE</text>
  <rect x="${x(29.5)}" y="${z(-52)}" width="78" height="85" fill="#3b524b" stroke="#91a28d"/><text x="${x(23)}" y="${z(-44)}" text-anchor="middle" fill="#e1debf" font-size="10">GATEHOUSE</text>
  <rect x="${x(-18.5)}" y="${z(-35.5)}" width="66" height="111" fill="#3c4944"/><text x="${x(-24)}" y="${z(-24)}" text-anchor="middle" fill="#e1debf" font-size="10">LOADING</text>
  <rect x="${x(29.1667)}" y="${z(-30)}" width="49" height="85" fill="#4b5140"/><text x="${x(25)}" y="${z(-22)}" text-anchor="middle" fill="#e1debf" font-size="9">SELECTOR</text>
  <path d="M150 ${z(-58)}H222" stroke="${barrier}" stroke-width="4"/><text x="186" y="${z(-58)-9}" text-anchor="middle" fill="#e1debf" font-size="10">${flags.includes('barrier')?'BARRIER OPEN':'STREET BARRIER'}</text>
  <text x="${x(-18)}" y="${z(-37)}" text-anchor="middle" fill="#e1debf" font-size="9">WINCH</text><path d="M${x(-12)} ${z(-39)}V${z(-25)}" stroke="#809486" stroke-width="3"/>
  <text x="186" y="600" text-anchor="middle" fill="#e6c585" font-size="12">GARAGE SHUTTER / BAY 042 ↓</text>
  ${marker(destination,'#e6c585',9)}${marker(position,'#fff0c6',5)}${position&&position.z<0?`<path d="M0 12 L-5 -5 L0 -2 L5 -5 Z" fill="#fff0c6" transform="translate(${x(position.x)} ${z(position.z)}) rotate(${(position.yaw||0)*180/Math.PI})"/>`:''}<text x="${x(-10)}" y="${z(-49.4)+17}" text-anchor="middle" fill="#e6c585" font-size="8">BARRIER CONTROL</text><text x="${x(18.5)}" y="${z(-45.9)-12}" text-anchor="middle" fill="#e6c585" font-size="8">BRAKE</text></svg>`;
}
