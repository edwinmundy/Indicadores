(function(){
'use strict';
const C=IndicatorCore,$=id=>document.getElementById(id),KEY='indicador-local-v1';
const removalButton=document.createElement('button');removalButton.id='removalButton';removalButton.type='button';removalButton.textContent='Registro de eliminación';removalButton.hidden=true;removalButton.setAttribute('aria-haspopup','dialog');removalButton.setAttribute('aria-controls','removalDialog');$('independentButton').after(removalButton);
const n=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2}),integer=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0}),percent=new Intl.NumberFormat('es-CL',{style:'percent',minimumFractionDigits:0,maximumFractionDigits:0}),money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skuPercent=new Intl.NumberFormat('es-CL',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=(v,metric=state.config.metric)=>v===null?'Sin datos':metric==='negativeSkus'?skuPercent.format(v):metric==='removedSkus'?removalPercent.format(v):C.metrics[metric]?.unit==='count'?integer.format(v):['mc','cashClosings'].includes(metric)?percent.format(v):metric==='visits'?integer.format(v):money.format(v);
const removalPercent=new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:1});
function getIndependentData(){return IndicatorCashModel.indicatorData(IndicatorRemovalModel.indicatorData(state.independentIndicators||{},state.eliminationRecords||[],state.eliminationCashierSales||{},C),C);}
const df=s=>C.date(s).toLocaleDateString('es-CL',{day:'2-digit',month:'short',timeZone:'UTC'});
let state={version:1,rows:[],config:{title:'VENTA NETA',metric:'sales',year:new Date().getFullYear(),startWeek:27,scales:{sales:{min:9000000,max:21000000},visits:{min:0,max:1200}},goals:{sales:{},visits:{}}}};
let pending=null,editId=null,templateData=window.INDICADOR_TEMPLATE,templateLabel='Indicadores.xlsx',openedMonths=new Set(),openedDays=new Set();
let storageFailed=false;
function message(s,error=false){$('message').hidden=false;$('message').textContent=s;$('message').classList.toggle('error',error);}
try{const saved=localStorage.getItem(KEY);if(saved)state=C.validateBackup(JSON.parse(saved));}catch(e){storageFailed=true;message('No se pudo leer el registro guardado. No se sobrescribirá. Restaura un respaldo o revisa el almacenamiento del navegador. '+e.message,true);}
function save(){if(storageFailed){message('El guardado local está bloqueado por un error de almacenamiento. Descarga un respaldo antes de cerrar.',true);return;}try{state.savedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='';}catch(e){message('No hay espacio o el navegador bloquea el guardado. Descarga un respaldo antes de cerrar.',true);$('saveStatus').textContent='Pendiente de respaldo';}}
function syncInputs(){if(['uber','pddya','rappi'].includes(state.config.metric)){state.config.metricTitles??={};state.config.metricTitles[state.config.metric]=state.config.title;state.config.metric='apps';state.config.title=state.config.metricTitles.apps||C.metrics.apps.title;}for(const k of ['title','metric','year','startWeek'])$(k).value=state.config[k];}
function render(){const independent=!!C.metrics[state.config.metric].independent;$('independentButton').hidden=!independent;$('viewSales').hidden=!independent;$('viewSales').textContent='Ver registro de ventas ('+state.rows.length+')';$('salesStats').hidden=independent;$('salesRegistry').hidden=independent;$('goodLegend').textContent=independent?'Cumple objetivo':'Cumple o supera meta';$('badLegend').textContent=independent?'Fuera de objetivo':'Bajo meta';const ps=C.buildPeriods(state.config,state.rows,state.groupSales,state.purchases,getIndependentData(),state.eliminationCashierSales),weeks=ps.slice(3);$('weekRange').textContent=`Semanas ${weeks[0].label} — ${weeks.at(-1).label}`;$('dateRange').textContent=`${df(weeks[0].start)} – ${df(weeks.at(-1).end)} ${weeks.at(-1).year}`;const rs=state.rows.filter(r=>r.date>=weeks[0].start&&r.date<=weeks.at(-1).end),t=C.totals(rs);$('totalSales').textContent=fmt(t.sales,'sales');$('totalVisits').textContent=fmt(C.attendanceContext(state.rows,state.eliminationCashierSales).rangeTotal(weeks[0].start,weeks.at(-1).end),'visits');$('totalDays').textContent=new Set(rs.map(r=>r.date)).size;$('totalWeeks').innerHTML=weeks.filter(w=>w.value!==null).length+' <em>/ 13</em>';$('chartTitle').textContent=state.config.title;$('chartSubtitle').textContent=state.config.metric==='cashClosings'?'Cierres buenos sobre el total de cierres':independent?'Resultados propios por mes y semana':state.config.metric==='mc'?'Margen de contribución del mes y de cada semana':state.config.metric==='tp'?'Ticket promedio del mes y de cada semana':'Promedio semanal del trimestre anterior y resultados semanales';$('recordCount').textContent=state.rows.length;$('saveStatus').textContent=storageFailed?'Respaldo necesario':state.savedAt?'':'Sin datos registrados';
removalButton.hidden=state.config.metric!=='removedSkus';
$('indicatorHideValues').checked=state.config.indicatorText?.[state.config.metric]?.hideValues===true;
const scale=C.metricScale(state.config),height=v=>Math.max(1,100*C.scalePosition(v,scale));const axisValue=v=>new Intl.NumberFormat('es-CL',{style:C.isPercent(state.config.metric)?'percent':'decimal',maximumFractionDigits:state.config.metric==='mc'?0:1}).format(v);const short=v=>independent?fmt(v):['mc','cashClosings'].includes(state.config.metric)?percent.format(v):state.config.metric!=='visits'?(Math.abs(v)>=1e6?n.format(v/1e6)+' M':Math.abs(v)>=1e3?n.format(v/1e3)+' mil':n.format(v)):integer.format(v);const colors={empty:'#FFFFFF',none:'#000000',good:'#70AD47',bad:'#FF0000'};
$('chart').classList.toggle('cash-chart',state.config.metric==='cashClosings');
$('chart').innerHTML=`<div class="axis">${[12,9,6,3,0].map(i=>C.scaleLevels(scale)[i]).map(v=>`<span>${esc(axisValue(v))}</span>`).join('')}</div><div class="chart-items">${ps.map(p=>{const status=C.status(p),title=`${p.kind==='month'?p.label+' '+p.year:'Semana '+p.label+' / '+p.year}\n${df(p.start)} – ${df(p.end)}\nResultado: ${fmt(p.value)}\nObjetivo: ${p.goal===null?'Sin objetivo':fmt(p.goal)}${state.config.metric==='cashClosings'?`\nCierres malos: ${p.cash?integer.format(p.cash.bad):'—'}\nTotal de cierres: ${p.cash?integer.format(p.cash.total):'—'}`:independent?'\nDato independiente del período':p.kind==='month'?(state.config.metric==='mc'?'\n(Venta neta del mes − compra del mes) / venta neta del mes':state.config.metric==='tp'?'\nVenta neta del mes / atenciones del mes':'\nPromedio de '+p.samples+' semanas con datos'):'\n'+p.samples+' días registrados'}`;return `<div class="chart-col" title="${esc(title)}">${state.config.metric==='cashClosings'?`<div class="cash-bar-counts"><span>Malos: ${p.cash?integer.format(p.cash.bad):'—'}</span><span>Total: ${p.cash?integer.format(p.cash.total):'—'}</span></div>`:''}<div class="bar-track" aria-label="${esc(title)}">${p.goal!==null?`<span class="goal-marker" style="bottom:${height(p.goal)}%"></span>`:''}<div class="bar ${status==='empty'?'no-data':status==='none'?'no-goal':''}" style="--bar:${colors[status]};height:${p.value===null?0:height(p.value)}%"></div></div><div class="chart-label"><b>${esc(p.short)}</b><small>${p.value===null?'—':esc(short(p.value))}</small></div></div>`;}).join('')}</div>`;
renderRows();}
const numericColumns=[...Array.from({length:8},(_,i)=>'v'+i),'sales','visits','purchase','mc',...C.extraMetrics];
function metricLimits(summaries,keys=numericColumns){
 return Object.fromEntries(keys.map(key=>{
  let count=0,min=Infinity,max=-Infinity;
  for(const summary of summaries){const value=summary?.[key];if(!Number.isFinite(value))continue;count++;min=Math.min(min,value);max=Math.max(max,value);}
  return [key,count>1?{min,max}:null];
 }));
}
function extremeMarker(value,range){
 if(!Number.isFinite(value)||!range||range.max===range.min)return '';
 if(Math.abs(value-range.max)<1e-8)return '<span class="metric-high" role="img" aria-label="Máximo del conjunto visible" title="Máximo del conjunto visible">▲</span>';
 if(Math.abs(value-range.min)<1e-8)return '<span class="metric-low" role="img" aria-label="Mínimo del conjunto visible" title="Mínimo del conjunto visible">▼</span>';
 return '';
}
function cells(t,limits){
 return t.values.map((v,i)=>`<td data-sales-group="${i<5?1:2}">${esc(([0,5].includes(i)?integer:n).format(v))}${extremeMarker(v,limits['v'+i])}</td>`).join('')+`<td class="calculated">${esc(fmt(t.sales,'sales'))}${extremeMarker(t.sales,limits.sales)}</td><td class="calculated">${esc(t.visits===null?'—':integer.format(t.visits))}${extremeMarker(t.visits,limits.visits)}</td>`;
}
function extraCells(summary,limits,label){
 return C.extraMetrics.map(key=>{
  const value=summary?.[key]??null;
  return `<td class="metric-cell" data-metric="${key}" title="${esc(label+' · '+C.metrics[key].label)}">${value===null?'—':esc(money.format(value))}${extremeMarker(value,limits[key])}</td>`;
 }).join('');
}
function renderRows(){
 renderGroupVisibility();
 const filter=$('monthFilter').value,rs=state.rows.filter(r=>!filter||r.date.startsWith(filter)).sort((a,b)=>a.date.localeCompare(b.date));
 const allocation=C.allocatePurchases(state.rows,state.purchases),metrics=C.metricContext(state.rows,state.groupSales,state.purchases,state.eliminationCashierSales),margins=C.weeklyMargins(state.rows,state.purchases);
 const summarize=(rows,extra,mc)=>{
  const total=C.totals(rows),purchase=rows.some(r=>allocation.has(r.id))?C.purchaseTotal(rows,allocation):null;
  return {...total,visits:metrics.attendance.sumRows(rows),...Object.fromEntries(total.values.map((v,i)=>['v'+i,v])),...Object.fromEntries(C.extraMetrics.map(key=>[key,extra?.[key]??null])),purchase,mc:mc??null};
 };
 const groups=new Map(),days=new Map(),records=new Map();
 for(const r of rs){
  const month=r.date.slice(0,7),start=metrics.startFor(r.date);
  if(!groups.has(month))groups.set(month,[]);groups.get(month).push(r);
  if(!days.has(r.date))days.set(r.date,[]);days.get(r.date).push(r);
  records.set(r.id,summarize([r],metrics.weeks.get(start),margins.get(start)?.mc));
 }
 const monthly=new Map([...groups].map(([month,rows])=>{
  const summary=summarize(rows,metrics.months.get(month),null);
  summary.mc=summary.sales!==0&&summary.purchase!==null?(summary.sales-summary.purchase)/summary.sales:null;
  return [month,summary];
 }));
 const daily=new Map([...days].map(([day,rows])=>{const start=metrics.startFor(day);return [day,summarize(rows,metrics.weeks.get(start),margins.get(start)?.mc)];}));
 const weekly=[...new Set(rs.map(r=>metrics.startFor(r.date)))].map(start=>({...metrics.weeks.get(start),mc:margins.get(start)?.mc??null}));
 const monthlyLimits=metricLimits([...monthly.values()]),weeklyLimits=metricLimits(weekly,['mc',...C.extraMetrics]);
 const dailyLimits={...metricLimits([...daily.values()]),...weeklyLimits},recordLimits={...metricLimits([...records.values()]),...weeklyLimits};
 const purchaseCell=(summary,limits)=>`<td class="purchase-cell">${summary.purchase===null?'—':esc(money.format(summary.purchase))}${extremeMarker(summary.purchase,limits.purchase)}</td>`;
 const marginCell=(summary,limits,label)=>`<td class="mc-cell${summary.mc<0?' negative':''}" title="${esc(label)}">${summary.mc===null?'—':esc(percent.format(summary.mc))}${extremeMarker(summary.mc,limits.mc)}</td>`;
 let html='';
 for(const [month,rows] of [...groups].reverse()){
  const open=openedMonths.has(month),d=C.date(month+'-01'),summary=monthly.get(month);
  html+=`<tr class="month-row"><td><button class="tree-toggle" data-month="${month}" aria-expanded="${open}">${open?'▾':'▸'} ${C.months[d.getUTCMonth()]} ${d.getUTCFullYear()} <small>(${new Set(rows.map(r=>r.date)).size} días)</small></button></td>${cells(summary,monthlyLimits)}${purchaseCell(summary,monthlyLimits)}${marginCell(summary,monthlyLimits,'MC mensual · (Venta neta del mes − compra asignada al mes) / venta neta del mes')}${extraCells(summary,monthlyLimits,'Mes '+month)}</tr>`;
  if(!open)continue;
  for(const day of [...new Set(rows.map(r=>r.date))].reverse()){
   const dr=days.get(day),expanded=openedDays.has(day),summary=daily.get(day),start=metrics.startFor(day),w=C.weekInfo(day),label=`Semana ${w.week} / ${w.year} · ${df(start)} – ${df(C.add(start,6))}`;
   html+=`<tr class="day-row"><td><button class="tree-toggle" data-day="${day}" aria-expanded="${expanded}">${expanded?'▾':'▸'} ${day.split('-').reverse().join('/')} <small>(${dr.length})</small></button></td>${cells(summary,dailyLimits)}${purchaseCell(summary,dailyLimits)}${marginCell(summary,dailyLimits,'MC · '+label)}${extraCells(summary,dailyLimits,label)}</tr>`;
   if(expanded)for(const [i,r] of dr.entries()){
    const summary=records.get(r.id);
    html+=`<tr class="detail-row"><td class="detail-date">Registro ${i+1}</td>${cells(summary,recordLimits)}${purchaseCell(summary,recordLimits)}${marginCell(summary,recordLimits,'MC · '+label)}${extraCells(summary,recordLimits,label)}</tr>`;
   }
  }
 }
 $('rows').innerHTML=html;$('empty').hidden=rs.length>0;$('salesTable').hidden=rs.length===0;
 $('empty').querySelector('h3').textContent=state.rows.length?'Sin registros para este mes':'Tu registro comienza aquí';
 $('registrySummary').textContent=rs.length?`${rs.length} registros · ${new Set(rs.map(r=>r.date)).size} días · Total neto: ${fmt(C.totals(rs).sales,'sales')} · Compra: ${money.format(C.purchaseTotal(rs,allocation))}`:'Los datos permanecen en este navegador.';
}
function renderGroupVisibility(){
 for(const group of [1,2]){
  const hidden=state.registryView?.['hideGroup'+group]===true,button=$('toggleGroup'+group);
  $('salesTable').classList.toggle('hide-group-'+group,hidden);
  button.textContent=`${hidden?'Mostrar':'Ocultar'} ${group===1?'primer':'segundo'} grupo`;
  button.setAttribute('aria-expanded',String(!hidden));
 }
}
for(const group of [1,2])$('toggleGroup'+group).addEventListener('click',()=>{
 state.registryView={hideGroup1:state.registryView?.hideGroup1===true,hideGroup2:state.registryView?.hideGroup2===true};
 state.registryView['hideGroup'+group]=!state.registryView['hideGroup'+group];
 save();renderGroupVisibility();
});
function openPaste(row){pending=null;editId=row?.id||null;$('pasteTitle').textContent=row?'Editar registro':'Libro de Boletas';$('pasteText').value=row?[row.date,...row.values.map(v=>String(v).replace('.',','))].join('\t'):'';$('importMode').disabled=!!row;$('import').disabled=true;$('pastePreview').textContent='Revisa los datos antes de incorporarlos.';$('pastePreview').classList.remove('error');$('pasteDialog').showModal();$('pasteText').focus();}
function validatePaste(){pending=C.parse($('pasteText').value);if(editId&&pending.rows.length!==1)pending.errors.push('Para editar, pega exactamente una fila.');$('pastePreview').classList.toggle('error',pending.errors.length>0);$('import').disabled=pending.errors.length>0;if(pending.errors.length){$('pastePreview').textContent=pending.errors.slice(0,20).join('\n');return;}const t=C.totals(pending.rows),dates=new Set(pending.rows.map(r=>r.date)),existing=state.rows.filter(r=>dates.has(r.date)),seen=new Set(state.rows.map(C.fingerprint));let duplicates=0;for(const r of pending.rows){const key=C.fingerprint(r);if(seen.has(key))duplicates++;seen.add(key);}$('pastePreview').textContent=`${pending.rows.length} filas válidas · ${dates.size} días\nVenta neta: ${fmt(t.sales,'sales')} · Documentos del libro: ${n.format(t.visits)}\n${editId?'Se actualizará únicamente este registro.':$('importMode').value==='replace'?`${existing.length} registros existentes de esos días serán reemplazados.`:`Se omitirán ${duplicates} duplicados exactos; los demás registros se agregarán.`}`;}
for(const id of ['paste','pasteEmpty'])$(id).onclick=()=>openPaste();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('validate').onclick=validatePaste;$('pasteText').oninput=()=>{pending=null;$('import').disabled=true;};$('importMode').onchange=()=>{if(pending)validatePaste();};
$('pasteForm').onsubmit=e=>{e.preventDefault();validatePaste();if(pending.errors.length)return;let count=pending.rows.length;if(editId){state.rows=state.rows.map(r=>r.id===editId?{...pending.rows[0],id:r.id}:r);}else if($('importMode').value==='replace'){const dates=new Set(pending.rows.map(r=>r.date));state.rows=state.rows.filter(r=>!dates.has(r.date)).concat(pending.rows);}else{const seen=new Set(state.rows.map(C.fingerprint));const add=pending.rows.filter(r=>{const k=C.fingerprint(r);if(seen.has(k))return false;seen.add(k);return true;});count=add.length;state.rows.push(...add);}for(const r of pending.rows)openedMonths.add(r.date.slice(0,7));save();render();$('pasteDialog').close();message(`${count} registros guardados. El indicador está actualizado; genera el Excel cuando lo necesites.`);};
$('rows').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.month){const s=b.dataset.month;openedMonths.has(s)?openedMonths.delete(s):openedMonths.add(s);renderRows();}else if(b.dataset.day){const s=b.dataset.day;openedDays.has(s)?openedDays.delete(s):openedDays.add(s);renderRows();}};
$('monthFilter').onchange=renderRows;$('clearFilter').onclick=()=>{$('monthFilter').value='';renderRows();};
for(const key of ['title','year','startWeek','metric'])$(key).onchange=()=>{try{const next=structuredClone(state.config);next[key]=['year','startWeek'].includes(key)?Number($(key).value):$(key).value.trim();if(key==='metric'){next.metricTitles??={};next.metricTitles[state.config.metric]=state.config.title;next.title=next.metricTitles[next.metric]||C.metrics[next.metric].title;}C.configValid(next);state.config=next;syncInputs();save();render();}catch(e){message(e.message,true);syncInputs();}};
// Punto de integración: ambos módulos comparten configuración y actualización,
// pero cada uno administra su formulario y cambia solo sus propios campos.
const configurationModules = {
  getConfig: () => state.config,
  getPeriods: () => C.buildPeriods(state.config, state.rows, state.groupSales, state.purchases, getIndependentData(), state.eliminationCashierSales),
  commitConfig(config) {
    C.configValid(config);
    state.config = config;
    save();
    render();
  },
  formatValue: fmt,
  formatDate: df,
  escapeHtml: esc
};
IndicatorScale.init(configurationModules);
IndicatorGoals.init(configurationModules);
IndicatorText.init(configurationModules);
IndicatorMultiExport.init({getState:()=>state,getTemplate:()=>templateData,download,escapeHtml:esc});
const independentModules={...configurationModules,getData:getIndependentData,commitData(data,config){C.independentModel.validate(data,C);state.independentIndicators=data;state.config=config;save();render();}};
IndicatorIndependent.init(independentModules);
IndicatorCash.init(independentModules);
IndicatorRemovals.init({...configurationModules,getRows:()=>state.eliminationRecords||[],getCashierSales:()=>state.eliminationCashierSales||{},commitRows(rows,cashierSales){
 if(storageFailed)throw Error('El guardado está bloqueado. Restaura un respaldo antes de guardar.');
 IndicatorRemovalModel.validate(rows,C);
 IndicatorRemovalModel.validateCashierSales(cashierSales,C);
 const next={...state,eliminationRecords:rows,eliminationCashierSales:cashierSales,savedAt:new Date().toISOString()};
 try{localStorage.setItem(KEY,JSON.stringify(next));}catch(e){throw Error('No se pudo guardar en este navegador. Mantén abierta esta ventana para conservar los cambios pendientes.');}
 state=next;render();
}});
IndicatorPurchases.init({getRows:()=>state.rows,getPurchases:()=>state.purchases||{},getYear:()=>state.config.year,commitPurchases(purchases){C.validatePurchases(purchases);state.purchases=purchases;save();render();message('Compras guardadas y repartidas entre los días con registros de cada semana.');}});
IndicatorGroupSales.init({getData:()=>state.groupSales||{},getRows:()=>state.rows,getConfig:()=>state.config,escapeHtml:esc,commitData(data){IndicatorGroupSalesModel.validate(data,C);state.groupSales=data;save();render();message('Desglose de ventas por grupos guardado.');}});
IndicatorGroupAnalysis.init({getData:()=>state.groupSales||{},getRows:()=>state.rows,getPurchases:()=>state.purchases||{},getCashierSales:()=>state.eliminationCashierSales||{},getConfig:()=>state.config,escapeHtml:esc});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('backup').onclick=()=>{download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`Respaldo-indicador-${new Date().toISOString().slice(0,10)}.json`);message('Respaldo descargado. Incluye los registros, las compras, las ventas por grupos, las metas, la escala y los indicadores independientes; conserva también tu plantilla Excel si usas una distinta.');};
$('viewSales').onclick=()=>{$('metric').value='sales';$('metric').dispatchEvent(new Event('change'));};
$('restore').onclick=()=>$('restoreFile').click();$('restoreFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const s=C.validateBackup(JSON.parse(await f.text()));if((state.rows.length||state.eliminationRecords?.length||Object.keys(state.eliminationCashierSales||{}).length||Object.keys(state.purchases||{}).length||Object.keys(state.groupSales||{}).length||Object.keys(state.independentIndicators||{}).length)&&!confirm(`El respaldo contiene ${s.rows.length} registros de ventas y ${s.eliminationRecords?.length||0} de eliminación y reemplazará los registros, las ventas por cajero, compras, desgloses e indicadores independientes actuales. ¿Continuar?`))return;state=s;storageFailed=false;openedMonths=new Set();openedDays=new Set();syncInputs();save();render();message(`${s.rows.length} registros de ventas y ${s.eliminationRecords?.length||0} de eliminación restaurados.`);}catch(e){message(e.message,true);}finally{$('restoreFile').value='';}};
$('template').onclick=()=>$('templateFile').click();$('templateFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const bytes=await f.arrayBuffer();const info=await IndicatorExcel.validate(bytes);templateData=bytes;templateLabel=f.name;$('templateName').textContent=`Plantilla: ${f.name} · Hoja: ${info.name}`;message('Plantilla cargada para esta sesión. Los registros se conservaron.');}catch(e){message('No se pudo cargar la plantilla: '+e.message,true);}finally{$('templateFile').value='';}};
$('export').onclick=async()=>{const b=$('export');b.disabled=true;b.textContent='Preparando Excel…';try{const blob=await IndicatorExcel.export(templateData,state);download(blob,`INDICADOR-${C.metrics[state.config.metric].title.replaceAll(' ','-')}-${state.config.year}-S${state.config.startWeek}.xlsx`);$('message').hidden=true;$('message').textContent='';}catch(e){console.error(e);message('No se pudo generar el Excel: '+e.message,true);}finally{b.disabled=false;b.textContent='↓ Exportar indicador';}};
syncInputs();render();
$('exportData').onclick=async()=>{const b=$('exportData');b.disabled=true;b.textContent='Preparando datos…';try{const blob=await IndicatorExcel.exportData(templateData,state);download(blob,`DATOS-INDICADORES-${new Date().toISOString().slice(0,10)}.xlsx`);$('message').hidden=true;$('message').textContent='';}catch(e){console.error(e);message('No se pudieron exportar los datos: '+e.message,true);}finally{b.disabled=false;b.textContent='↓ Exportar datos';}};
if(document.modelContext?.registerTool){Promise.resolve(document.modelContext.registerTool({name:'read_sales_indicator',description:'Leer los resultados y las metas del indicador semanal actual.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('No se aceptan parámetros');return {title:state.config.title,metric:state.config.metric,records:state.rows.length,periods:C.buildPeriods(state.config,state.rows,state.groupSales,state.purchases,getIndependentData(),state.eliminationCashierSales)};}})).catch(()=>{});}
})();
