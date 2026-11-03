import { currentTask, inventoryStatus } from "./tasks.js?v=1.14.0";
import { OBJECTIVES, NOTES, objective } from "./state.js?v=1.14.0";
import { hintText, destination } from "./guidance.js?v=1.14.0";
import { renderMap } from "./map.js?v=1.14.0";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
export function journalTask(state) {
  const task=currentTask(state);
  return task ? {...task,reason:task.why,notes:task.notes.filter(id=>state.notes.includes(id))} : {id:"done",title:"You escaped Meridian",instruction:"",reason:"You made it out.",notes:[],destination:null};
}
export function revealHint(state) {
  const id = objective(state)[0];
  if (id === "done") return 0;
  state.journal.hints[id] = Math.min(3,(state.journal.hints[id] || 0)+1);
  return state.journal.hints[id];
}
export function returnSummary(state){
 const task=journalTask(state),last=OBJECTIVES.filter(([id])=>state.flags.includes(id)).at(-1);
 return {chapter:state.flags.includes('gate')?'03 / GET OUT':state.flags.includes('repair')?'02 / RESTORE THE EXIT':'01 / REPAIR YOUR CAR',completed:last?.[1]||'Arrived at Meridian',next:task.title,instruction:task.instruction,note:task.notes[0]||null};
}

/** Tasks are derived from authoritative progression. Reading can never complete
 * an objective. Only explicitly revealed hints are shown; future tasks stay hidden. */
export function renderJournal(ui, tab = "tasks") {
  const g=ui.game, s=g.state, task=journalTask(s), j=s.journal;
  ui.journalTab=tab;
  j.lastObjective=task.id;
  const chapter=s.flags.includes("gate")?"03 / GET OUT":s.flags.includes("repair")?"02 / RESTORE THE EXIT":"01 / REPAIR YOUR CAR";
  const noteLink=id=>`<button class="journal-note" data-note="${id}"><span>${j.readNotes.includes(id)?"":"<i class=\"unread-dot\"></i>"}${esc(NOTES[id].title)}</span><small>${esc(NOTES[id].tag)}</small></button>`;
  let body="";
  if(tab==="tasks") {
    body=`<article class="journal-task"><span class="eyebrow">${chapter}</span><h3>${esc(task.title)}</h3><p>${esc(task.instruction)}</p><p class="journal-reason">${esc(task.reason)}</p><div class="journal-inventory">${inventoryStatus(s).map(item=>`<span class="item-state ${item.status.toLowerCase()}"><b>${esc(item.name)}</b><small>${item.status}</small></span>`).join("")}</div></article>`;
    const recap=returnSummary(s);
    body+='<details class="journal-history"><summary>Where was I?</summary><p>✓ Completed · '+esc(recap.completed)+'.</p><p>Next · '+esc(recap.instruction)+'</p>'+(recap.note?noteLink(recap.note):'<p>No relevant document collected yet.</p>')+'</details>';
    if(s.flags.includes("key"))body+='<details class="journal-history"><summary>Surviving the Attendant</summary><p>Keep a solid object between you and it. Running is loud. Crouching behind a vehicle hides you better; a flashlight shining around a corner can give it a clue. Break sight before entering a SHELTER locker. On Medium and Hard it can connect a nearby door sound with a recent sighting or visible wet footprints; give it space before hiding. A raised arm warns of a committed strike: move aside, then use its recovery to escape. Puddles and sprinting carry farther through doorways. Three bolts can draw it toward an impact; repeated throws into the same area become less convincing. Restored drive-lane lights make crossings easier for it to see. Repeated sirens distract it for less time. Your journal pauses the game.</p></details>';
    const changes=[];
    if(s.scares.includes("securityBreach"))changes.push("The wired glass held. The Attendant can walk around it. The key also unlocked the west service passage.");
    if(s.scares.includes("workshopBreach"))changes.push("The workshop impact was loud. Use the service passage or garage cover if something investigates.");
    if(s.scares.includes("powerSurge"))changes.push("Emergency lighting is dimmer, but the exit supply works. Continue to the Security computer; the extra panel cover is not another puzzle.");
    if(s.scares.includes("carReturn"))changes.push("It withdrew behind the parked hatchback near my car. It is still in the garage. The driver’s door is on the left side of my car.");
    if(s.scares.includes('cartPush'))changes.push('It shoved the storage cart. The cart stayed against the shelves; the passage is still clear.');
    if(s.scares.includes('pressureBurst'))changes.push('A pressure joint split in the pump room. Water now pools below the broken insulation. Watch for loud splashes.');
    if(j.observations?.includes("wetTracks"))changes.push("My wet shoes leave temporary prints on dry concrete. Running through water is loud.");
    if(j.observations?.includes("heardDoor"))changes.push("It checked the locker I used. Break its sight and put more distance between us before hiding.");
    if(changes.length)body+='<details class="journal-history"><summary>What changed in the garage</summary><ul>'+changes.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></details>';
    if(task.notes.length) body+='<h3>Relevant collected notes</h3>'+task.notes.map(noteLink).join("");
    body+='<p class="settings-note">Optional: evidence, the siren and pressure valve. They are not required to open the exit.</p><div class="button-row"><button id="journal-hints" class="btn">Need a hint?</button><button id="floor-plan" class="btn">Open map</button></div><details class="journal-history"><summary>Completed tasks · '+s.flags.length+'</summary><ol>'+OBJECTIVES.filter(([id])=>s.flags.includes(id)).map(([,title])=>`<li>✓ ${esc(title)}</li>`).join("")+'</ol></details>';
  } else if(tab==="hints") {
    const level=j.hints[task.id] || 0;
    body=`<h3>${esc(task.title)}</h3><p>Reveal only as much help as you want. Opening this page does not reveal an answer.</p>`;
    for(let n=1;n<=level;n++)body+=`<article class="journal-clue"><small>${["","A NUDGE","A CLEARER DIRECTION","THE SOLUTION"][n]}</small><p>${esc(hintText(s,n,g.settings.bindings))}</p></article>`;
    if(task.id!=="done" && level<3)body+=`<button id="journal-reveal" class="btn accent">${["Reveal a nudge","Reveal a clearer direction","Reveal the solution"][level]}</button>`;
    if(level===3)body+='<p class="settings-note">All hints for this task are revealed. They remain in your checkpoint save.</p>';
    body+='<div class="button-row"><button id="journal-marker" class="btn">Request a temporary direction marker</button></div><p class="settings-note">The marker appears for 20 seconds of active play after you resume.</p>';
  } else if(tab==="notes") {
    body='<p>Collected evidence and documents. Unread entries have a small dot.</p><div class="journal-notes">'+(s.notes.map(noteLink).join("") || '<p>No documents collected yet.</p>')+'</div>';
  } else if(tab==="map") {
    body=renderMap(g.player.pos,task.destination,s.visited,s.flags,j.mechanisms)+'<div class="button-row"><button id="journal-marker" class="btn">Request a temporary direction marker</button></div>';
  } else {
    const key=a=>esc(safeKey(g.settings.bindings[a]));
    body=`<h3>Your first minute</h3><ol class="journal-controls"><li>Click Enter game once, then move the mouse to look. Escape pauses.</li><li>Walk with ${key("forward")} ${key("left")} ${key("back")} ${key("right")}.</li><li>Press ${key("flashlight")} to raise or put away the flashlight.</li><li>Aim at an object and use ${key("interact")} when its nearby prompt appears.</li><li>${key("journal")} opens this journal. ${key("hint")} opens its optional hints. ${key("objective")} briefly shows the task when the objective display is set to On request.</li><li>${key("sprint")} sprints in short bursts; ${key("crouch")} crouches. Use cover and listen.</li></ol><p>${key("throw")} throws one of your three bolts toward your aim. They are distractions, not required tools. Repeated impacts in the same place lose effectiveness. Tools are used automatically. ${key("interact")} enters and leaves SHELTER lockers. Break its sight before hiding; it remembers a locker it watched you enter. On Medium and Hard, a nearby door sound plus a recent sighting or visible wet footprints can also lead it to the correct locker. Reading the journal pauses the Attendant. Completed objectives are saved at safe checkpoints.</p>`;
    j.controlsSeen=true;
    body+='<p>Controller (enable in Settings): left stick moves, right looks; A uses/hides, X toggles the flashlight, Y opens the journal, B crouches, L3 sprints, RB throws a bolt, D-pad Up shows the task, Menu pauses. D-pad navigates menus; left/right adjusts sliders. A selects and B goes back. A disconnected pad pauses play.</p>';
  }
  ui.show("journal",ui.head("MERIDIAN / FIELD NOTES", "Journal")+`<div class="tabs journal-tabs">${[["tasks","Task"],["hints","Hints"],["notes","Notes & evidence"],["map","Map"],["controls","Controls"]].map(([id,label])=>`<button data-journal-tab="${id}" class="${tab===id?"selected":""}">${label}</button>`).join("")}</div><div class="journal-body">${body}</div><div class="button-row journal-footer"><button id="journal-resume" class="btn accent">Resume game</button><button id="journal-pause" class="btn">Pause menu</button></div>`);
  for(const b of $("panel").querySelectorAll("[data-journal-tab]"))b.onclick=()=>ui.journal(b.dataset.journalTab);
  for(const b of $("panel").querySelectorAll("[data-note]"))b.onclick=()=>ui.note(b.dataset.note,true);
  $("journal-hints")?.addEventListener("click",()=>ui.journal("hints"));
  $("floor-plan")?.addEventListener("click",()=>ui.journal("map"));
  $("journal-reveal")?.addEventListener("click",()=>{revealHint(s);ui.journal("hints");});
  $("journal-marker")?.addEventListener("click",()=>{g.guidance.markerSeconds=20;ui.toast("Direction marker requested. Resume when you are ready.");});
  $("journal-resume").onclick=()=>{ui.hide();g.resume();};
  $("journal-pause").onclick=()=>ui.pause();
  g.save(false); g.updateHUD();
}
function safeKey(code) { return ({ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"})[code] || String(code).replace(/^(Key|Digit)/,"").replace(/(Left|Right)$/,"").replace("Control","Ctrl"); }
