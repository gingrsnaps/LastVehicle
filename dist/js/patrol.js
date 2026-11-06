import { AGENT_RADIUS, blocked } from './navigation.js?v=1.19.0';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Named patrol stops are ordinary walkable floor positions, NOT player targets.
 * Two nearby arrivals make a sweep; then an overdue section wins. The public
 * shutter/winch state changes the area being guarded without reading a hidden
 * player's coordinates. All route costs use the prebuilt visibility graph. */
export const PATROL_STOPS=[
 ['entrance','apron',0,8],['entrance','security aisle',-8.2,18],['entrance','ticket aisle',8.2,25],['entrance','security room',-21,18],
 ['middle','west car aisle',-8.2,42],['middle','east car aisle',8.2,54],['middle','store room',-22,45],['middle','electrical room',23,39],
 ['rear','workshop approach',-8.2,73],['rear','workshop room',-22,76],['rear','bay 042 approach',3,85],['rear','pump room',23,98],['rear','rear crossover',0,102],
 ['yard-west','shutter threshold',0,-8],['yard-west','loading approach',-8,-20],['yard-west','loading dock',-14,-39],['yard-west','barrier approach',-6,-48],
 ['yard-east','utility approach',8,-28],['yard-east','generator awning',23,-22],['yard-east','gatehouse room',20,-40],['yard-east','outer crossover',8,-48],
].map(([section,name,x,z],i)=>Object.freeze({id:'patrol:'+i,section,name,x,z}));

export class PatrolPlanner {
 constructor(rects){this.rects=rects;this.visits=new Map();this.sectionVisits=new Map();this.failed=new Map();this.arrivals=[];this.resetSweep();}
 resetSweep(){this.section=null;this.sweep=0;this.target=null;this.since=0;}
 prepare(routes){this.routes=routes;}
 setChapter(chapter){
  if(this.chapter===chapter)return;
  this.chapter=chapter;this.resetSweep();
  // The open shutter is a public mechanical cue. It does not teleport or cancel
  // pursuit, a stagger, an inspection or an already heard distraction.
  this.priority=chapter==='yard'?'yard-west':chapter==='return'?'entrance':null;
 }
 choose(origin,clock,seed,{outsideUnlocked=false}={}){
  if(!this.chapter)this.setChapter(outsideUnlocked?'yard':'interior');
  const sections=this.chapter==='yard'?['entrance','yard-west','yard-east']:
   this.chapter==='return'&&outsideUnlocked?['entrance','middle','rear','yard-west','yard-east']:['entrance','middle','rear'];
  const costs=this.routes?.costsFrom(origin);
  const candidates=PATROL_STOPS.filter(p=>sections.includes(p.section)&&
    (outsideUnlocked||p.z>=0)&&!blocked(p.x,p.z,this.rects,AGENT_RADIUS)&&clock>=(this.failed.get(p.id)||0))
    .map((p,i)=>({p,cost:this.routes?this.routes.distance(origin,p,costs):distance(origin,p),jitter:Math.sin(i*2.399+seed/4294967296*6.28)*2}))
    .filter(c=>Number.isFinite(c.cost));
  if(!candidates.length){this.target=null;return null;}
  const groups=sections.map(section=>{
    const points=candidates.filter(c=>c.p.section===section);
    const age=Math.min(110,clock-(this.sectionVisits.get(section)??-110));
    return {section,points,age,cost:Math.min(...points.map(c=>c.cost))};
  }).filter(g=>g.points.length);
  let group=groups.find(g=>g.section===this.priority);
  if(group)this.priority=null;
  // Finish only two destinations in a section. The age cap prevents selection
  // time from growing forever and dictating the same four-minute circuit.
  if(!group&&this.sweep<2)group=groups.find(g=>g.section===this.section);
  if(!group){
    const alternatives=groups.filter(g=>g.section!==this.section);
    const pool=alternatives.length?alternatives:groups;
    pool.sort((a,b)=>(b.age*.3-Math.min(80,b.cost)*.16)-(a.age*.3-Math.min(80,a.cost)*.16));
    group=pool[0];
  }
  if(group.section!==this.section){this.section=group.section;this.sweep=0;}
  const points=group.points.filter(c=>distance(origin,c.p)>1.1);
  const pool=points.length?points:group.points;
  pool.sort((a,b)=>this.score(b,clock)-this.score(a,clock));
  this.target=pool[0].p;this.since=clock;return this.target;
 }
 score(c,clock){return Math.min(100,clock-(this.visits.get(c.p.id)??-100))*.22-Math.min(20,c.cost)*.22+c.jitter;}
 arrive(position,clock){
  if(!this.target||distance(position,this.target)>.8)return false;
  const p=this.target;this.visits.set(p.id,clock);this.sectionVisits.set(p.section,clock);this.sweep++;
  this.arrivals.push({id:p.id,section:p.section,time:clock});if(this.arrivals.length>48)this.arrivals.shift();
  this.target=null;return true;
 }
 fail(clock){if(this.target)this.failed.set(this.target.id,clock+20);this.target=null;this.sweep=2;}
 report(){return {chapter:this.chapter,section:this.section,target:this.target?.name||null,arrivals:this.arrivals.slice(-12),visitedStops:this.visits.size};}
}
