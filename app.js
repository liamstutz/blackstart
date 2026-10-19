const $=id=>document.getElementById(id);
let state,lastPlan,busy=false,requestId=0;
const fmt=(n,d=1)=>n===null?'—':Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trace=[];
async function rpc(method,params={}) {
  const req={jsonrpc:'2.0',id:++requestId,method,params};
  const res=await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify(req)});
  const data=await res.json();
  if(!res.ok||data.error)throw new Error(data.error?.message??data.error??'MCP request failed.');
  if(method==='tools/call'){trace.unshift({at:new Date().toISOString(),request:req,response:data});trace.splice(8);$('trace').textContent=JSON.stringify(trace,null,2);$('tool-caption').textContent=`${params.name} · MCP 2025-11-25 · Streamable HTTP`;}
  if(data.result?.isError)throw new Error(data.result.content?.[0]?.text??'Invalid tool arguments');
  return data.result;
}
async function tool(name,args={}){return (await rpc('tools/call',{name,arguments:args})).structuredContent;}
function showError(e){$('error').hidden=false;$('error').textContent=e.message??String(e);}
function clearError(){$('error').hidden=true;}
function fields(){for(const [k,v]of Object.entries(state.battery))$(k).value=v;$('horizonHours').value=state.horizonHours;$('charge-title').textContent=`${state.battery.chargePct}%`;$('battery-fill').style.width=`${state.battery.chargePct}%`;}
function renderLoads(){
  $('loads').innerHTML=state.loads.map(l=>`<div class="load"><input type="checkbox" data-enable="${l.id}" aria-label="Include ${escape(l.name)}" ${l.enabled?'checked':''}><button class="load-edit" data-edit="${l.id}" aria-label="Edit ${escape(l.name)}"><strong>${escape(l.name)}</strong><span>${fmt(l.watts*l.dutyPct/100)}–${fmt(l.watts*l.highDutyPct/100)} W average</span></button>${l.essential?'<span class="protected-tag">PROTECTED</span>':`<span class="priority-tag">P${l.priority}</span>`}</div>`).join('');
  document.querySelectorAll('[data-enable]').forEach(el=>el.addEventListener('change',async()=>{const l=state.loads.find(l=>l.id===el.dataset.enable);l.enabled=el.checked;await update();}));
  document.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener('click',()=>openLoad(el.dataset.edit)));
}
function chart(p){
  const W=740,H=214,left=34,right=17,top=12,bottom=34;
  const x=h=>left+(W-left-right)*h/p.horizonHours;
  const y=pct=>top+(H-top-bottom)*(1-Math.max(0,Math.min(100,pct))/100);
  const path=key=>p.timeline.map((pt,i)=>`${i?'L':'M'}${x(pt.hour).toFixed(2)},${y(pt[key]).toFixed(2)}`).join(' ');
  const area=path('typicalPct')+' '+[...p.timeline].reverse().map(pt=>`L${x(pt.hour).toFixed(2)},${y(pt.highUsePct).toFixed(2)}`).join(' ')+' Z';
  let svg='';
  for(const v of [0,25,50,75,100])svg+=`<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#e8e9de"/><text x="${left-9}" y="${y(v)+3}" text-anchor="end" fill="#8b927f" font-size="9" font-family="monospace">${v}</text>`;
  for(let i=0;i<5;i++){const t=p.horizonHours*i/4;svg+=`<text x="${x(t)}" y="${H-10}" text-anchor="middle" fill="#858d7d" font-size="9" font-family="monospace">${fmt(t)}h</text>`;}
  const reserveY=y(state.battery.reservePct);
  svg+=`<path d="${area}" fill="#dfe8d6" opacity=".85"/><path d="${path('allLoadsPct')}" fill="none" stroke="#b7ab99" stroke-width="2" stroke-dasharray="5 5"/><path d="${path('highUsePct')}" fill="none" stroke="${p.feasible?'#58734a':'#c85830'}" stroke-width="3" stroke-linecap="round"/><path d="${path('typicalPct')}" fill="none" stroke="#96a786" stroke-width="1"/><line x1="${left}" x2="${W-right}" y1="${reserveY}" y2="${reserveY}" stroke="#d66a40" stroke-dasharray="3 4"/><text x="${W-right-3}" y="${reserveY-5}" text-anchor="end" fill="#c65a32" font-size="9" font-family="monospace">${state.battery.reservePct}% reserve</text>`;
  $('chart').innerHTML=svg;
}
function render(p,answer){
  lastPlan=p;fields();renderLoads();
  $('plan-status').textContent=p.empty?'NO LOADS':p.feasible?'FITS YOUR TARGET':'TARGET NOT MET';$('plan-status').className='tag'+(p.feasible?'':' fail');
  $('runway').textContent=fmt(p.recommended.conservativeHours);$('baseline-hours').textContent=fmt(p.baseline.conservativeHours);
  $('runway-caption').textContent=p.empty?'Add an appliance to start':p.feasible?`To the ${state.battery.reservePct}% reserve · ${state.horizonHours}h target covered`:`Protected-load estimate · ${state.horizonHours}h target not covered`;
  $('baseline-delta').textContent=(!p.baseline.continuousFits||!p.baseline.surgeFits)?'Energy estimate only · inverter check fails':`High-use case · ${p.baseline.energyFits?'energy target covered':'short of target'}`;
  $('usable').textContent=fmt(p.recommended.usableAcWh,0)+' Wh';$('draw').textContent=fmt(p.recommended.highWatts,0)+' W';$('margin').textContent=(p.recommended.marginWh>=0?'+':'')+fmt(p.recommended.marginWh,0)+' Wh';$('margin').className=p.recommended.marginWh<0?'fail':'';
  $('answer').textContent=answer??p.spokenSummary;
  $('recommendation').innerHTML=state.loads.filter(l=>l.enabled).map(l=>`<div class="recommend-row"><span class="${p.selected.includes(l.id)?'':'deferred-name'}">${escape(l.name)}</span><span class="${p.selected.includes(l.id)?'keep':'defer'}">${p.selected.includes(l.id)?(l.essential?'KEEP · PROTECTED':'KEEP'):'DEFER'}</span></div>`).join('')||'<p class="small muted">No appliances selected.</p>';
  $('apply-plan').disabled=!p.feasible;
  const m=p.recommended,b=state.battery;
  $('checks').innerHTML=[[m.energyFits,'Energy budget',`${fmt(m.demandWh,0)} / ${fmt(m.usableAcWh,0)} Wh`],[m.continuousFits,'Running power',`${fmt(m.runPeakWatts,0)} / ${fmt(b.continuousWatts,0)} W`],[m.surgeFits,'Startup surge',`${fmt(m.startupPeakWatts,0)} / ${fmt(b.surgeWatts,0)} W`]].map(([ok,label,val])=>`<div class="check-row"><span class="${ok?'pass':'fail'}">${ok?'✓':'×'}</span><span>${label}</span><small>${val}</small></div>`).join('');
  $('receipt').innerHTML=`<p class="formula">${b.capacityWh} Wh × max(0, ${b.chargePct}% − ${b.reservePct}%) × ${b.efficiencyPct}% = <strong>${fmt(m.usableAcWh,2)} usable AC Wh</strong></p><div class="receipt-grid"><div><small>Stored energy at start</small><strong>${fmt(m.storedWh,2)} Wh</strong></div><div><small>Protected reserve (nameplate)</small><strong>${fmt(m.reserveWh,2)} Wh</strong></div><div><small>Conversion losses above reserve</small><strong>${fmt(p.calculation.conversionLossWh,2)} Wh</strong></div><div><small>Idle overhead across target</small><strong>${fmt(p.selected.length?b.idleWatts*state.horizonHours:0,2)} Wh</strong></div></div><p class="formula">${fmt(m.highWatts,2)} W × ${state.horizonHours} h = ${fmt(m.demandWh,2)} Wh required<br>${fmt(m.usableAcWh,2)} Wh ÷ ${fmt(m.highWatts,2)} W = ${fmt(m.conservativeHours,2)} h to reserve</p><p>Typical-to-high-use runtime: ${fmt(m.conservativeHours)}–${fmt(m.typicalHours)} hours. This range reflects two chosen scenarios; it is not a statistical confidence interval.</p>`;
  $('assumptions').innerHTML='<ul>'+[...p.warnings,...p.assumptions].map(s=>`<li>${escape(s)}</li>`).join('')+'</ul>';
  chart(p);
}
async function update(answer){
  clearError();try{const p=await tool('plan_backup_power',state);render(p,answer);return p;}catch(e){showError(e);return null;}
}
async function ask(text){
  if(busy||!state)return;busy=true;clearError();
  try {
    let match;
    if(/medical|oxygen|cpap|ventilator|dialysis|medicine.*safe|food.*safe/i.test(text)){$('answer').textContent='Blackstart is not validated for medical equipment and cannot determine food or medicine safety from a power estimate. Use the equipment manufacturer’s backup plan and appropriate professional or official guidance.';return;}
    if((match=text.match(/(?:make it|lasts?|for|target|until).*?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i)) || (match=text.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i))){const c=await tool('compare_outage_plan',{input:state,change:{horizonHours:Number(match[1])}});state=c.input;render(c.after,`At ${c.after.horizonHours} hours: ${c.after.spokenSummary}`);}
    else if((match=text.match(/(?:battery|charge).*?(\d+(?:\.\d+)?)\s*(?:%|percent)/i))){const c=await tool('compare_outage_plan',{input:state,change:{chargePct:Number(match[1])}});state=c.input;render(c.after,c.after.spokenSummary);}
    else if(/kettle/i.test(text)){
      if(!state.loads.some(l=>l.id==='kettle'))state.loads.push({id:'kettle',name:'Electric kettle',watts:1800,dutyPct:100,highDutyPct:100,startupWatts:1800,essential:false,priority:1,enabled:true});else state.loads.find(l=>l.id==='kettle').enabled=true;
      const p=await update();if(p){const b=state.battery;const impossible=1800>b.continuousWatts; $('answer').textContent=impossible?`This example kettle needs 1,800 W, above your ${fmt(b.continuousWatts,0)} W continuous inverter limit even on its own. A bigger energy budget cannot fix a power-limit mismatch. The kettle has been deferred; the recommended selection remains separate from your appliance wishlist.`:p.spokenSummary+' The sample kettle is modeled as continuously on; edit its duty cycle if you have measured use.';}
    }
    else if(/math|explain|why|receipt|how/i.test(text)){const p=await update();if(p)$('answer').textContent=`Start with ${fmt(p.recommended.storedWh)} stored Wh, keep ${fmt(p.recommended.reserveWh)} Wh in reserve, then account for ${state.battery.efficiencyPct}% conversion efficiency. That leaves ${fmt(p.recommended.usableAcWh)} AC Wh. The recommended high-use draw is ${fmt(p.recommended.highWatts)} W, including idle overhead. Protected loads come first; optional loads are added in your priority order only when the full target and both power checks fit.`;}
    else if(/reset|start over/i.test(text)){state=await tool('get_outage_example');await update();}
    else if(/plan|recalculate|morning|night|essentials/i.test(text)){await update();}
    else if((match=text.match(/(?:remove|drop|without)\s+(?:the\s+)?(.+)/i))){const name=match[1].trim().toLowerCase();const load=state.loads.find(l=>l.name.toLowerCase().includes(name)||l.id===name);if(!load)throw new Error('Name an appliance from the list, such as laptop or fan.');const c=await tool('compare_outage_plan',{input:state,change:{excludeId:load.id}});state=c.input;render(c.after);}
    else {$('answer').textContent='This demo uses explicit intent rules, not a language model. Try “make it 12 hours”, “battery is at 60%”, “remove the fan”, “can I add a kettle?”, or “explain the math”. You can edit every assumption in the controls.';}
  }catch(e){showError(e);$('answer').textContent=e.message;}finally{busy=false;$('question').value='';}
}
function openLoad(id){
  const l=state.loads.find(l=>l.id===id)??{id:'',name:'',watts:30,startupWatts:30,dutyPct:100,highDutyPct:100,priority:1,essential:false};
  $('edit-heading').textContent=id?'Edit '+l.name:'Add an appliance';
  for(const key of ['id','name','watts','startupWatts','dutyPct','highDutyPct','priority'])$('load-'+key).value=l[key];$('load-essential').checked=l.essential;$('load-error').textContent='';$('load-dialog').showModal();
}
$('load-form').addEventListener('submit',async e=>{
  e.preventDefault();const prior=structuredClone(state);let l=state.loads.find(l=>l.id===$('load-id').value);
  if(!l){if(state.loads.length>=12){$('load-error').textContent='The demo supports up to 12 loads.';return;}l={id:'custom-'+Date.now().toString(36),enabled:true};state.loads.push(l);}
  l.name=$('load-name').value.trim();for(const key of ['watts','startupWatts','dutyPct','highDutyPct','priority'])l[key]=Number($('load-'+key).value);l.essential=$('load-essential').checked;
  try{const p=await tool('plan_backup_power',state);clearError();render(p);$('load-dialog').close();}catch(e){state=prior;$('load-error').textContent=e.message;}
});
$('close-dialog').addEventListener('click',()=>$('load-dialog').close());$('add-load').addEventListener('click',()=>openLoad());
$('ask-form').addEventListener('submit',e=>{e.preventDefault();ask($('question').value);});document.querySelectorAll('[data-prompt]').forEach(el=>el.addEventListener('click',()=>ask(el.dataset.prompt)));
for(const key of ['capacityWh','chargePct','reservePct','efficiencyPct','idleWatts','continuousWatts','surgeWatts','horizonHours'])$(key).addEventListener('change',async()=>{if(!state)return;if(key==='horizonHours')state.horizonHours=Number($(key).value);else state.battery[key]=Number($(key).value);await update();});
$('reset').addEventListener('click',async()=>{state=await tool('get_outage_example');await update();});
$('apply-plan').addEventListener('click',async()=>{if(!lastPlan?.feasible)return;state.loads.forEach(l=>{l.enabled=lastPlan.selected.includes(l.id);});await update('Selection updated in this planner. No physical appliances were switched. '+lastPlan.spokenSummary);});
$('speak').addEventListener('click',()=>{if(!('speechSynthesis'in window)){$('answer').textContent+=' Speech playback is unavailable in this browser.';return;}speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance($('answer').textContent);speech.rate=.98;speechSynthesis.speak(speech);});
$('export').addEventListener('click',()=>{const payload={project:'Blackstart',createdAt:new Date().toISOString(),mode:'simulation',input:state,result:lastPlan};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='blackstart-plan-receipt.json';a.click();URL.revokeObjectURL(url);});
try{await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'blackstart-web-simulator',version:'1.0.0'}});await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});await rpc('tools/list');state=await tool('get_outage_example');await update();$('connection').innerHTML='<i></i> LOCAL MCP ONLINE';$('connection').classList.add('online');}catch(e){showError(e);$('connection').innerHTML='<i></i> CONNECTION FAILED';}
