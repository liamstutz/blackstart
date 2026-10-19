// The planning engine has no model dependency. All energy is in Wh; power is in W.
export const sample = {
  battery: { capacityWh: 1536, chargePct: 80, reservePct: 15, efficiencyPct: 88, idleWatts: 8, continuousWatts: 1500, surgeWatts: 2500 },
  horizonHours: 8,
  loads: [
    { id: 'fridge', name: 'Refrigerator', watts: 120, dutyPct: 35, highDutyPct: 55, startupWatts: 700, essential: true, priority: 5, enabled: true },
    { id: 'router', name: 'Modem + router', watts: 18, dutyPct: 100, highDutyPct: 100, startupWatts: 18, essential: true, priority: 4, enabled: true },
    { id: 'lamp', name: 'LED task light', watts: 9, dutyPct: 100, highDutyPct: 100, startupWatts: 9, essential: false, priority: 3, enabled: true },
    { id: 'fan', name: 'Desk fan', watts: 35, dutyPct: 100, highDutyPct: 100, startupWatts: 70, essential: false, priority: 2, enabled: true },
    { id: 'laptop', name: 'Laptop charger', watts: 60, dutyPct: 100, highDutyPct: 100, startupWatts: 60, essential: false, priority: 1, enabled: true }
  ]
};
export const freshSample = () => structuredClone(sample);
const r = (n) => Math.round(n * 100) / 100;
function number(value, name, lo, hi) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi) throw new Error(`${name} must be a number between ${lo} and ${hi}.`);
}
export function validate(input) {
  if (!input || typeof input !== 'object' || !input.battery) throw new Error('A battery profile is required.');
  const b = input.battery;
  for (const [key, lo, hi] of [['capacityWh',1,100000],['chargePct',0,100],['reservePct',0,100],['efficiencyPct',1,100],['idleWatts',0,500],['continuousWatts',1,30000],['surgeWatts',1,60000]]) number(b[key], key, lo, hi);
  if (b.surgeWatts < b.continuousWatts) throw new Error('Surge rating cannot be lower than continuous rating.');
  number(input.horizonHours, 'horizonHours', 0.25, 72);
  if (!Array.isArray(input.loads) || input.loads.length > 12) throw new Error('Use at most 12 loads.');
  const ids = new Set();
  for (const l of input.loads) {
    if (typeof l.id !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(l.id) || ids.has(l.id)) throw new Error('Each load needs a unique short id.');
    ids.add(l.id);
    if (typeof l.name !== 'string' || !l.name.trim() || l.name.length > 80) throw new Error('Each load needs a name of 1–80 characters.');
    for (const [key, lo, hi] of [['watts',0,30000],['dutyPct',0,100],['highDutyPct',0,100],['startupWatts',0,60000],['priority',1,5]]) number(l[key], `${l.name}.${key}`, lo, hi);
    if (l.highDutyPct < l.dutyPct) throw new Error('High-use duty cycle cannot be below typical duty cycle.');
    if (l.startupWatts < l.watts) throw new Error('Startup power cannot be below running power.');
    if (typeof l.essential !== 'boolean' || typeof l.enabled !== 'boolean') throw new Error('essential and enabled must be booleans.');
  }
  return input;
}
// IdleWatts is explicitly AC-equivalent overhead, so all demand uses the same side of conversion.
function rawMetrics(input, loads) {
  const b = input.battery;
  const storedWh = b.capacityWh * b.chargePct / 100;
  const reserveWh = b.capacityWh * b.reservePct / 100;
  const usableDcWh = Math.max(0, storedWh - reserveWh);
  const usableAcWh = usableDcWh * b.efficiencyPct / 100;
  const idle = loads.length ? b.idleWatts : 0;
  const typicalWatts = loads.reduce((n,l) => n + l.watts*l.dutyPct/100, idle);
  const highWatts = loads.reduce((n,l) => n + l.watts*l.highDutyPct/100, idle);
  const runPeakWatts = loads.reduce((n,l) => n+l.watts,0);
  // Conservative bound: all selected loads start simultaneously. Never compare duty-averaged W with inverter ratings.
  const startupPeakWatts = loads.reduce((n,l) => n+l.startupWatts,0);
  const oneAtATimeStartupWatts = Math.max(runPeakWatts, ...loads.map(l=>runPeakWatts-l.watts+l.startupWatts));
  const demandWh = highWatts*input.horizonHours;
  return { storedWh, reserveWh, usableDcWh, usableAcWh, typicalWatts, highWatts, runPeakWatts, startupPeakWatts, oneAtATimeStartupWatts,
    typicalHours: typicalWatts ? usableAcWh/typicalWatts : null,
    conservativeHours: highWatts ? usableAcWh/highWatts : null,
    demandWh, marginWh: usableAcWh-demandWh,
    energyFits: demandWh <= usableAcWh + 1e-9,
    continuousFits: runPeakWatts <= b.continuousWatts,
    surgeFits: startupPeakWatts <= b.surgeWatts,
    reserveBreached: b.chargePct < b.reservePct
  };
}
function present(m) { return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,typeof v === 'number'?r(v):v])); }
function fits(m) { return m.energyFits && m.continuousFits && m.surgeFits && !m.reserveBreached; }
function summarize(input, selected, m) {
  if (!selected.length) return 'No loads selected. Add appliances to build a power plan.';
  const names = selected.map(x=>x.name.toLowerCase()).join(', ');
  if (m.reserveBreached) return 'Your battery is already below your chosen reserve. Blackstart will not budget energy you have protected.';
  if (!m.continuousFits) return `The selected appliances can draw ${r(m.runPeakWatts)} W while running, above your ${input.battery.continuousWatts} W inverter rating. This combination is blocked.`;
  if (!m.surgeFits) return `Simultaneous startup may need ${r(m.startupPeakWatts)} W, above your ${input.battery.surgeWatts} W surge rating. This combination needs a different load selection or verified startup sequencing.`;
  if (!m.energyFits) return `The protected loads do not fit ${input.horizonHours} hours under the high-use assumptions. They reach the reserve in about ${r(m.conservativeHours)} hours. The energy shortfall is ${r(-m.marginWh)} Wh. Keep the reserve and arrange another source of power; I will not silently drop a protected load.`;
  return `For ${input.horizonHours} hours, keep ${names}. Under your high-use assumptions, this plan reaches the reserve in about ${r(m.conservativeHours)} hours, with ${r(m.marginWh)} Wh of margin at the target. This is an estimate, not a restoration forecast.`;
}
export function plan(input) {
  validate(input);
  const enabled = input.loads.filter(l=>l.enabled);
  const essential = enabled.filter(l=>l.essential);
  const optional = enabled.filter(l=>!l.essential);
  const baseline = rawMetrics(input,enabled);
  // Enumerate bounded subsets. Lexicographic priority preserves the user's preference order.
  let best = null;
  for(let mask=0; mask < 2**optional.length; mask++) {
    const chosen = [...essential,...optional.filter((_,i)=>mask&(1<<i))];
    const m = rawMetrics(input,chosen);
    if (!fits(m)) continue;
    const counts = [5,4,3,2,1].map(p=>chosen.filter(l=>!l.essential && l.priority===p).length);
    const score = counts.reduce((n,v)=>n*13+v,0);
    if(!best || score > best.score || (score===best.score && m.highWatts < best.m.highWatts)) best = {chosen,m,score};
  }
  const selected = best?.chosen ?? essential;
  const m = best?.m ?? rawMetrics(input,essential);
  const excluded = enabled.filter(l=>!selected.some(s=>s.id===l.id));
  const warnings = [];
  if (enabled.some(l=>/medical|oxygen|ventilator|cpap|dialysis/i.test(l.name))) warnings.push('This prototype is not validated for medical equipment. Use the device manufacturer’s and care team’s backup-power plan.');
  if (enabled.some(l=>l.highDutyPct>l.dutyPct)) warnings.push('Duty-cycle ranges are user assumptions, not confidence intervals. Actual consumption can exceed the high-use case.');
  if (selected.some(l=>/fridge|refrigerator|freezer/i.test(l.name))) warnings.push('Power availability does not establish food or medicine safety. Use a thermometer and official guidance.');
  if (!baseline.continuousFits) warnings.push('The original selection exceeds continuous inverter power.');
  if (!baseline.surgeFits) warnings.push('The original selection exceeds the simultaneous-start surge rating.');
  if (input.battery.chargePct <= input.battery.reservePct) warnings.push('No usable energy remains above the reserve.');
  const timeline = Array.from({length:17},(_,i)=>{
    const hour=input.horizonHours*i/16;
    const charge=(power)=>Math.max(0,input.battery.chargePct-power*hour/(input.battery.efficiencyPct/100)/input.battery.capacityWh*100);
    return {hour:r(hour),typicalPct:r(charge(m.typicalWatts)),highUsePct:r(charge(m.highWatts)),allLoadsPct:r(charge(baseline.highWatts))};
  });
  return { feasible: Boolean(best) && selected.length>0, empty: enabled.length===0, baseline:present(baseline), recommended:present(m),
    selected:selected.map(l=>l.id), excluded:excluded.map(l=>({id:l.id,name:l.name,reason:'Does not fit the target alongside higher-priority loads under high-use energy and simultaneous-start constraints.'})),
    protected:essential.map(l=>l.id), horizonHours:input.horizonHours, timeline, warnings,
    spokenSummary:summarize(input,selected,m),
    assumptions:['Battery and appliance figures are editable sample assumptions, not telemetry.','Reserve is a percentage of nameplate capacity; efficiency is applied after reserve.','Idle overhead is AC-equivalent and charged whenever one or more loads are selected.','No solar recharge, grid restoration, temperature model, device control, or network availability is assumed.','A feasible calculation is conditional on supplied ratings; verify equipment compatibility and manufacturer instructions.'],
    calculation:{formula:'capacityWh × max(0, chargePct − reservePct) / 100 × efficiencyPct / 100', usableAcWh:r(m.usableAcWh), highUseDemandFormula:'hours × (sum(runningWatts × highDutyPct / 100) + AC-equivalent idleWatts)', highUseDemandWh:r(m.demandWh), reserveWh:r(m.reserveWh), conversionLossWh:r(m.usableDcWh-m.usableAcWh)},
    loadLedger:selected.map(l=>({id:l.id,name:l.name,typicalWatts:r(l.watts*l.dutyPct/100),highUseWatts:r(l.watts*l.highDutyPct/100),highUseWh:r(l.watts*l.highDutyPct/100*input.horizonHours),protected:l.essential}))
  };
}
export function counterfactual(input,change) {
  const altered = structuredClone(input);
  if (change.horizonHours!==undefined) altered.horizonHours=change.horizonHours;
  if (change.chargePct!==undefined) altered.battery.chargePct=change.chargePct;
  if (change.excludeId!==undefined) {
    const l=altered.loads.find(l=>l.id===change.excludeId);
    if(!l) throw new Error('Unknown load id.');
    if(l.essential) throw new Error('Protected loads cannot be removed by a what-if. Change protection explicitly in the appliance editor.');
    l.enabled=false;
  }
  return {before:plan(input), after:plan(altered), input:altered};
}
