import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSample,plan,counterfactual} from './engine.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<.011,`${a} should equal ${b}`);

test('sample conserves energy and chooses fridge, router and light for eight hours',()=>{
  const p=plan(freshSample());
  assert.equal(p.feasible,true);
  assert.deepEqual(p.selected,['fridge','router','lamp']);
  near(p.recommended.usableAcWh,1536*.65*.88);
  near(p.recommended.highWatts,120*.55+18+9+8);
  near(p.recommended.demandWh,808);
  near(p.recommended.conservativeHours,878.592/101);
  near(p.recommended.marginWh,70.592);
  assert.equal(p.baseline.energyFits,false);
});
test('twelve-hour outage is impossible without sacrificing protected loads',()=>{
  const s=freshSample();s.horizonHours=12;const p=plan(s);
  assert.equal(p.feasible,false);
  assert.deepEqual(p.selected,['fridge','router']);
  near(p.recommended.marginWh,878.592-92*12);
  assert.match(p.spokenSummary,/will not silently drop/);
});
test('zero charge and below-reserve states cannot promise runtime',()=>{
  for(const charge of [0,10,15]){const s=freshSample();s.battery.chargePct=charge;const p=plan(s);assert.equal(p.feasible,false);assert.equal(p.recommended.usableAcWh,0);assert.equal(p.recommended.conservativeHours,0);}
});
test('surge uses peak power, never duty-averaged power',()=>{
  const s=freshSample();s.battery.surgeWatts=1600;s.loads[0].startupWatts=1800;s.loads[0].dutyPct=1;s.loads[0].highDutyPct=1;
  const p=plan(s);assert.equal(p.recommended.energyFits,true);assert.equal(p.recommended.surgeFits,false);assert.equal(p.feasible,false);
});
test('continuous power fails even if energy and surge pass',()=>{
  const s=freshSample();s.battery.continuousWatts=100;const p=plan(s);assert.equal(p.recommended.continuousFits,false);assert.equal(p.feasible,false);
});
test('optional appliance with impossible power is excluded',()=>{
  const s=freshSample();s.loads.push({id:'kettle',name:'Kettle',watts:1800,startupWatts:1800,dutyPct:1,highDutyPct:1,priority:5,essential:false,enabled:true});
  const p=plan(s);assert.equal(p.baseline.continuousFits,false);assert.equal(p.feasible,true);assert.ok(!p.selected.includes('kettle'));
});
test('higher-priority appliance wins over cheaper lower-priority options',()=>{
  const s=freshSample();s.loads.find(l=>l.id==='fan').priority=5;s.horizonHours=6;const p=plan(s);
  assert.ok(p.selected.includes('fan'));assert.ok(!p.selected.includes('laptop'));
});
test('protect flag cannot be bypassed through conversational what-if',()=>{
  assert.throws(()=>counterfactual(freshSample(),{excludeId:'fridge'}),/Protected/);
  assert.throws(()=>counterfactual(freshSample(),{excludeId:'unknown'}),/Unknown/);
});
test('counterfactual is immutable and recomputes before/after',()=>{
  const s=freshSample();const c=counterfactual(s,{horizonHours:12,chargePct:60});
  assert.equal(s.horizonHours,8);assert.equal(s.battery.chargePct,80);assert.equal(c.after.horizonHours,12);assert.equal(c.before.feasible,true);assert.equal(c.after.feasible,false);
});
test('input limits reject NaN, invalid cycle ranges, duplicate ids, and excessive workloads',()=>{
  for(const edit of [s=>s.battery.capacityWh=NaN,s=>s.battery.chargePct=101,s=>s.loads[0].highDutyPct=1,s=>s.loads[1].id='fridge',s=>s.horizonHours=-1,s=>s.loads[0].startupWatts=0,s=>s.loads[0].enabled='true',s=>s.loads=Array(13).fill(s.loads[0])]){const s=freshSample();edit(s);assert.throws(()=>plan(s));}
});
test('empty plan does not claim a successful outage plan',()=>{
  const s=freshSample();s.loads=[];const p=plan(s);assert.equal(p.feasible,false);assert.equal(p.empty,true);assert.equal(p.recommended.conservativeHours,null);
});
test('medical label is flagged without inferring equipment suitability',()=>{
  const s=freshSample();s.loads[0].name='CPAP';assert.ok(plan(s).warnings.some(w=>w.includes('not validated')));
});
test('single constant load agrees with hand calculation and timeline',()=>{
  const s={battery:{capacityWh:1000,chargePct:90,reservePct:10,efficiencyPct:80,idleWatts:10,continuousWatts:500,surgeWatts:1000},horizonHours:4,loads:[{id:'test',name:'Test load',watts:150,startupWatts:200,dutyPct:100,highDutyPct:100,priority:1,essential:true,enabled:true}]};
  const p=plan(s);near(p.recommended.usableAcWh,640);near(p.recommended.conservativeHours,4);near(p.timeline.at(-1).highUsePct,10);assert.equal(p.feasible,true);
});
test('deterministic sweep never claims feasible while violating a constraint',()=>{
  for(const charge of [20,40,60,80,100])for(const horizon of [1,4,8,12,24]){const s=freshSample();s.battery.chargePct=charge;s.horizonHours=horizon;const p=plan(s);if(p.feasible){assert.ok(p.recommended.marginWh>=-.01);assert.ok(p.recommended.continuousFits);assert.ok(p.recommended.surgeFits);assert.ok(p.protected.every(id=>p.selected.includes(id)));}}
});
