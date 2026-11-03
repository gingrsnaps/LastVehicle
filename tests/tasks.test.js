import test from "node:test";
import assert from "node:assert/strict";
import { TASKS, currentTask, inventoryStatus, taskText } from "../dist/js/tasks.js";
import { availability, destination, hintText } from "../dist/js/guidance.js";
import { journalTask } from "../dist/js/journal.js";
import { newGame, FLAG_IDS, validateSave, OBJECTIVES } from "../dist/js/state.js";

test("Every objective prefix agrees across journal, hint, map and interaction requirements",()=>{
  for(let n=0;n<TASKS.length;n++){
    const state={...newGame(),flags:FLAG_IDS.slice(0,n)},task=currentTask(state);
    assert.equal(task.id,TASKS[n].id);assert.equal(journalTask(state).instruction,task.instruction);
    assert.equal(OBJECTIVES[n][2],task.instruction);assert.deepEqual(destination(state),task.destination);
    const ready=availability(task.action,state);assert.equal(ready.available,true,task.id);
    assert.equal(ready.label,task.label,task.id);
    assert.equal(hintText(state,2,{interact:"KeyQ"}),taskText(task.instruction,{interact:"KeyQ"}));
    const restored=validateSave(JSON.parse(JSON.stringify(state)));
    assert.equal(journalTask(restored).id,task.id);assert.deepEqual(restored.flags,state.flags);
  }
});
test("All initial car targets share the inspection action and completed inspection changes their roles",()=>{
  const state=newGame();
  for(const id of ["car","repair","car-passenger"]){
    const p=availability(id,state);assert.equal(p.available,true);assert.equal(p.action,"car");assert.equal(p.label,"Inspect car");
  }
  state.flags.push("car");
  assert.equal(availability("car-passenger",state).hidden,true);
  assert.match(availability("repair",state).reason,/battery from the floor/);
});
test("Remapped interaction keys appear in revealed hints and installed parts remain accounted for",()=>{
  const s=newGame();assert.match(hintText(s,3,{interact:"KeyQ"}),/press Q/);
  s.flags=FLAG_IDS.slice(0,4);assert.deepEqual(inventoryStatus(s).map(i=>i.status),["Carrying","Carrying","Carrying","Carrying"]);
  s.flags.push("repair");assert.deepEqual(inventoryStatus(s).map(i=>i.status),["Installed","Installed","Carrying","Carrying"]);
  s.flags.push("power");assert.deepEqual(inventoryStatus(s).map(i=>i.status),["Installed","Installed","Installed","Carrying"]);
});
