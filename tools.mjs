import { plan, counterfactual, freshSample } from './engine.mjs';
const num={type:'number'};
const loadSchema={type:'object',additionalProperties:false,required:['id','name','watts','dutyPct','highDutyPct','startupWatts','essential','priority','enabled'],properties:{id:{type:'string'},name:{type:'string'},watts:num,dutyPct:num,highDutyPct:num,startupWatts:num,essential:{type:'boolean'},priority:num,enabled:{type:'boolean'}}};
export const planSchema={type:'object',additionalProperties:false,required:['battery','horizonHours','loads'],properties:{
  battery:{type:'object',additionalProperties:false,required:['capacityWh','chargePct','reservePct','efficiencyPct','idleWatts','continuousWatts','surgeWatts'],properties:Object.fromEntries(['capacityWh','chargePct','reservePct','efficiencyPct','idleWatts','continuousWatts','surgeWatts'].map(k=>[k,num]))},
  horizonHours:num,loads:{type:'array',maxItems:12,items:loadSchema}
}};
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export const tools=[
  {name:'get_outage_example',title:'Get an editable outage rehearsal',description:'Returns synthetic sample battery and appliance assumptions for a Texas apartment. Never present this as live user data.',inputSchema:{type:'object',additionalProperties:false,properties:{}},annotations},
  {name:'plan_backup_power',title:'Plan backup power',description:'Calculate a deterministic reserve-aware portable battery plan. Checks Wh, running W and simultaneous-start surge W separately, uses high duty-cycle assumptions, preserves protected loads, and selects optional loads by priority. No hardware control. Ask the user for missing ratings and never invent them. Not validated for medical equipment.',inputSchema:planSchema,annotations},
  {name:'compare_outage_plan',title:'Compare an outage what-if',description:'Recalculate the same plan for changed target hours, battery charge, or removal of an optional appliance. Does not remove protected loads. Outputs before and after calculations.',inputSchema:{type:'object',additionalProperties:false,required:['input','change'],properties:{input:planSchema,change:{type:'object',additionalProperties:false,properties:{horizonHours:num,chargePct:num,excludeId:{type:'string'}}}}},annotations}
];
export function callTool(name,args={}) {
  let result;
  if(name==='get_outage_example') result=freshSample();
  else if(name==='plan_backup_power') result=plan(args);
  else if(name==='compare_outage_plan') {
    if(!args.change || !Object.keys(args.change).length) throw new Error('At least one supported change is required.');
    result=counterfactual(args.input,args.change);
  } else throw new Error(`Unknown tool: ${name}`);
  return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false};
}
