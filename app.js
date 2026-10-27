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
function renderMonthSalesProgress(){
 const card=$('monthSalesProgress'),now=new Date(),year=now.getFullYear();if(Number(state.config.year)!==year){card.hidden=true;return;}
 const month=now.getMonth(),day=now.getDate(),daysInMonth=new Date(year,month+1,0).getDate(),monthKey=`${year}-${String(month+1).padStart(2,'0')}`,todayKey=`${monthKey}-${String(day).padStart(2,'0')}`,planFor=y=>state.config.objectivePlans?.[y]??(window.INDICADOR_OBJECTIVES_BASE?.year===Number(y)?window.INDICADOR_OBJECTIVES_BASE:null),plan=planFor(year),goal=plan?IndicatorObjectivesModel.value(plan,'monthlySales',month):null,plannedDays=plan?IndicatorObjectivesModel.value(plan,'effectiveDays',month):null,actual=C.totals(state.rows.filter(row=>row.date>=`${monthKey}-01`&&row.date<=todayKey)).sales,projection=day?actual/day*daysInMonth:0,daysLeft=daysInMonth-day,gap=goal===null?null:Math.max(0,goal-actual),progress=goal>0?Math.max(0,Math.min(100,actual/goal*100)):0;
 const effectiveUnits=(y,m,through)=>{let total=0;for(let date=1;date<=through;date++){const weekday=new Date(y,m,date).getDay();total+=(weekday===0||weekday===6)?0.5:1;}return total;},calendarUnits=effectiveUnits(year,month,daysInMonth),elapsedCalendarUnits=effectiveUnits(year,month,day),effectiveElapsed=Number.isFinite(plannedDays)&&plannedDays>0?plannedDays*elapsedCalendarUnits/calendarUnits:null,effectiveRemaining=effectiveElapsed===null?null:Math.max(0,plannedDays-effectiveElapsed),effectiveDaily=effectiveElapsed>0?actual/effectiveElapsed:null,effectiveProjection=effectiveDaily!==null&&plannedDays>0?effectiveDaily*plannedDays:null;
 const historicalMonths=new Map();for(const row of state.rows){const key=row.date.slice(0,7),rowYear=Number(key.slice(0,4));if(rowYear<year-1||rowYear>year||key>=monthKey)continue;if(!historicalMonths.has(key))historicalMonths.set(key,[]);historicalMonths.get(key).push(row);}
 const historical=[...historicalMonths].map(([key,rows])=>{const [yearText,monthText]=key.split('-'),historyYear=Number(yearText),historyMonth=Number(monthText)-1,historyEnd=new Date(historyYear,historyMonth+1,0),historyDays=historyEnd.getDate(),historyPlan=planFor(historyYear),planEffective=historyPlan?IndicatorObjectivesModel.value(historyPlan,'effectiveDays',historyMonth):null,effective=Number.isFinite(planEffective)&&planEffective>0?planEffective:effectiveUnits(historyYear,historyMonth,historyDays),sales=C.totals(rows).sales;return {weekday:historyEnd.getDay(),daily:sales/effective};}).filter(item=>Number.isFinite(item.daily));
 const closingDate=new Date(year,month+1,0),closingWeekday=closingDate.getDay(),weekdayName=new Intl.DateTimeFormat('es-CL',{weekday:'long'}).format(closingDate),overallDaily=historical.length?historical.reduce((sum,item)=>sum+item.daily,0)/historical.length:null,closingHistory=historical.filter(item=>item.weekday===closingWeekday),closingAverage=closingHistory.length?closingHistory.reduce((sum,item)=>sum+item.daily,0)/closingHistory.length:null,historicalDelta=overallDaily>0&&closingAverage!==null?closingAverage/overallDaily-1:null,historicalProjection=effectiveProjection!==null&&historicalDelta!==null?effectiveProjection*(1+historicalDelta):null,historyDeltaLabel=historicalDelta===null?'Sin muestra suficiente':`${historicalDelta>0?'+':''}${percent.format(historicalDelta)}`;
 card.hidden=false;$('monthProgressTitle').textContent=`Avance de venta neta · ${C.months[month]} ${year}`;$('monthProgressDate').textContent=`Al ${now.toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})} · ${day} de ${daysInMonth} días calendario`;$('monthProgressGoal').textContent=goal===null?'Sin objetivo':money.format(goal);$('monthProgressActual').textContent=money.format(actual);$('monthProgressDaysLeft').textContent=integer.format(daysLeft);$('monthProgressGap').textContent=goal===null?'—':gap>0?money.format(gap):actual>goal?`Superada por ${money.format(actual-goal)}`:'Meta alcanzada';$('monthProgressProjection').textContent=money.format(projection);$('monthProgressBar').style.width=`${progress}%`;$('monthProgressTrack')?.setAttribute('aria-valuenow',String(Math.round(progress)));
 $('monthEffectiveDaysObjective').textContent=Number.isFinite(plannedDays)?n.format(plannedDays):'Sin objetivo';$('monthEffectiveDaysElapsed').textContent=effectiveElapsed===null?'—':n.format(effectiveElapsed);$('monthEffectiveDaysRemaining').textContent=effectiveRemaining===null?'—':n.format(effectiveRemaining);$('monthEffectiveDailyProjection').textContent=effectiveDaily===null?'—':money.format(effectiveDaily);$('monthEffectiveProjection').textContent=effectiveProjection===null?'—':money.format(effectiveProjection);$('monthClosingWeekday').textContent=weekdayName.charAt(0).toUpperCase()+weekdayName.slice(1);$('monthClosingHistory').textContent=historyDeltaLabel;
 const potentialImpact=historicalProjection!==null&&effectiveProjection!==null?historicalProjection-effectiveProjection:null;$('monthClosingHistoryNote').textContent=closingHistory.length?`n = ${closingHistory.length} ${closingHistory.length===1?'mes':'meses'} · ${potentialImpact===null?'impacto estimado no disponible':`${money.format(Math.abs(potentialImpact))} ${potentialImpact>0?'sobre':'bajo'} la proyección efectiva`}`:`Sin meses registrados con cierre en ${weekdayName}.`;
 $('monthProgressEffectiveFormula').textContent=plannedDays===null?'Carga los días efectivos mensuales en Objetivos para calcular esta proyección.':`Según Objetivos: ${n.format(effectiveElapsed)} de ${n.format(plannedDays)} días efectivos transcurridos. Lun–vie = 1; sábado y domingo = 0,5 cada uno. Ritmo: ${money.format(effectiveDaily||0)} por día efectivo.`;
 const closingWeight=closingWeekday===6?0.5:closingWeekday===0?1:0,closingTargetAmount=closingWeight&&goal!==null&&plannedDays>0?money.format(goal/plannedDays*closingWeight):null;$('monthProgressWeekendImpact').textContent=`La comparación usa la venta neta promedio por día efectivo de los meses con datos registrados en 2025 y 2026. Compara los meses que cierran en este mismo día con el promedio histórico general; es una referencia descriptiva, no una causa demostrada.${closingWeekday===6?` Este mes termina sábado: medio día efectivo queda en el mes y el domingo pasa al siguiente.${closingTargetAmount?` Equivale a ${closingTargetAmount} de la meta.`:''}`:closingWeekday===0?` Este mes termina domingo: sábado + domingo cuentan como 1 día efectivo.${closingTargetAmount?` Equivale a ${closingTargetAmount} de la meta.`:''}`:''}`;
 const status=$('monthProgressStatus');status.classList.remove('on-pace','behind','no-goal');if(goal===null||goal<=0){status.textContent='Carga el objetivo mensual para comparar';status.classList.add('no-goal');}else if(actual>=goal){status.textContent=`Meta alcanzada${actual>goal?` · ${money.format(actual-goal)} sobre el objetivo`:''}`;status.classList.add('on-pace');}else if(projection>=goal){status.textContent='Al ritmo actual, se alcanzaría la meta';status.classList.add('on-pace');}else{status.textContent=`Al ritmo actual, quedarían ${money.format(goal-projection)} por cubrir`;status.classList.add('behind');}
}
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
renderMonthSalesProgress();renderRows();}
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
function renderWeeklyChart(weeks){
 const metric=$('weeklyChartMetric').value||'sales',label=$('weeklyChartMetric').selectedOptions[0]?.textContent||'TOTAL',weekCount=C.weekInfo(`${state.config.year}-12-28`).week;
 const byWeek=new Map(weeks.map(week=>[C.weekInfo(week.start).week,week.summary])),values=Array.from({length:weekCount},(_,index)=>byWeek.get(index+1)?.[metric]??null),present=values.filter(Number.isFinite),countMetric=['visits','v0','v5'].includes(metric),valueFormat=value=>metric==='mc'?percent.format(value):countMetric?integer.format(value):money.format(value);
 const host=$('weeklyChart');host.setAttribute('aria-label',`${label}: historial semanal del año ${state.config.year}`);
 if(!present.length){host.innerHTML=`<p class="weekly-chart-empty">No hay datos de ${esc(label)} para el año ${state.config.year}.</p>`;return;}
 const width=1260,height=330,left=100,right=20,top=18,bottom=46,plotWidth=width-left-right,plotHeight=height-top-bottom;
 let min=Math.min(0,...present),max=Math.max(0,...present);if(min===max){min-=1;max+=1;}const x=index=>left+index*plotWidth/(weekCount-1),y=value=>top+(max-value)*plotHeight/(max-min),tickValues=Array.from({length:5},(_,index)=>max-(max-min)*index/4);
 let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="weeklyChartSvgTitle" xmlns="http://www.w3.org/2000/svg"><title id="weeklyChartSvgTitle">${esc(label)} por semana del año ${state.config.year}</title>`;
 for(const value of tickValues){const yy=y(value);svg+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" class="weekly-chart-grid"/><text x="${left-10}" y="${yy+4}" text-anchor="end" class="weekly-chart-axis-label">${esc(valueFormat(value))}</text>`;}
 const slot=plotWidth/weekCount,barWidth=Math.max(4,Math.min(18,slot*.68)),baseline=y(0);
 values.forEach((value,index)=>{if(!Number.isFinite(value))return;const barY=y(value),topY=Math.min(barY,baseline),barHeight=Math.max(2,Math.abs(baseline-barY));svg+=`<rect x="${(x(index)-barWidth/2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="1.5" class="weekly-chart-bar"><title>Semana ${index+1}: ${esc(valueFormat(value))}</title></rect>`;});
 for(let index=0;index<weekCount;index++){const px=x(index);svg+=`<line x1="${px}" y1="${height-bottom}" x2="${px}" y2="${height-bottom+4}" class="weekly-chart-tick"/><text x="${px}" y="${height-12}" text-anchor="middle" class="weekly-chart-axis-label">${index+1}</text>`;}svg+=`<line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" class="weekly-chart-axis"/><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="weekly-chart-axis"/></svg>`;host.innerHTML=svg;
}
function renderRows(){
 renderGroupVisibility();
 const filter=$('monthFilter').value,rs=state.rows.filter(r=>!filter||r.date.startsWith(filter)).sort((a,b)=>a.date.localeCompare(b.date));
 const allocation=C.allocatePurchases(state.rows,state.purchases),metrics=C.metricContext(state.rows,state.groupSales,state.purchases,state.eliminationCashierSales),margins=C.weeklyMargins(state.rows,state.purchases);
 const summarize=(rows,extra,mc)=>{
  const total=C.totals(rows),purchase=rows.some(r=>allocation.has(r.id))?C.purchaseTotal(rows,allocation):null;
  return {...total,visits:metrics.attendance.sumRows(rows),...Object.fromEntries(total.values.map((v,i)=>['v'+i,v])),...Object.fromEntries(C.extraMetrics.map(key=>[key,extra?.[key]??null])),purchase,mc:mc??null};
 };
 $('weeklyRegistryYear').textContent=state.config.year;
 const annualGroups=new Map();
 for(const row of state.rows){if(C.weekInfo(row.date).year!==state.config.year)continue;const start=metrics.startFor(row.date);if(!annualGroups.has(start))annualGroups.set(start,[]);annualGroups.get(start).push(row);}
 const annualWeeks=[...annualGroups].sort(([a],[b])=>b.localeCompare(a)).map(([start,rows])=>({start,rows,summary:summarize(rows,metrics.weeks.get(start),margins.get(start)?.mc)})),annualWeekLimits=metricLimits(annualWeeks.map(week=>week.summary));
 renderWeeklyChart(annualWeeks);
 const renderAnnualWeeks=()=>{$('weeklyRows').innerHTML=annualWeeks.map(({start,rows,summary})=>{const week=C.weekInfo(start),label=`Semana ${week.week} / ${week.year} · ${df(start)} – ${df(C.add(start,6))}`;return `<tr class="week-summary-row"><td>${esc(label)} <small>(${new Set(rows.map(r=>r.date)).size} días)</small></td>${cells(summary,annualWeekLimits)}${purchaseCell(summary,annualWeekLimits)}${marginCell(summary,annualWeekLimits,'MC semanal · (Venta neta de la semana − compra asignada) / venta neta de la semana')}${extraCells(summary,annualWeekLimits,label)}</tr>`;}).join('');$('weeklySalesTable').hidden=!annualWeeks.length;};
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
 renderAnnualWeeks();
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
  $('weeklySalesTable').classList.toggle('hide-group-'+group,hidden);
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
$('weeklyChartMetric').onchange=renderRows;
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
