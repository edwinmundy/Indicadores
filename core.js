(function(root){
'use strict';
const objectives=root.IndicatorObjectivesModel||(typeof require==='function'?require('./modules/modelo-objetivos.js'):null);
const scaleModel=root.IndicatorScaleModel||(typeof require==='function'?require('./modules/modelo-escala.js'):null);
const groupSalesModel=root.IndicatorGroupSalesModel||(typeof require==='function'?require('./modules/modelo-grupos.js'):null);
const independentModel=root.IndicatorIndependentModel||(typeof require==='function'?require('./modules/modelo-independientes.js'):null);
const removalModel=root.IndicatorRemovalModel||(typeof require==='function'?require('./modules/modelo-eliminaciones.js'):null);
const textModel=root.IndicatorTextModel||(typeof require==='function'?require('./modules/modelo-textos.js'):null);
const attendanceModel=root.IndicatorAttendanceModel||(typeof require==='function'?require('./modules/modelo-atenciones.js'):null);
const metricsModel=root.IndicatorMetricsModel||(typeof require==='function'?require('./modules/modelo-metricas.js'):null);
const DAY=86400000, COLS=['F','H','J','L','N','P','R','T','V','X','Z','AB','AD','AF','AI','AK'];
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const iso=d=>d.toISOString().slice(0,10), date=s=>new Date(s+'T00:00:00Z'), add=(s,n)=>iso(new Date(date(s).getTime()+n*DAY));
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function weekInfo(s){const d=date(s);d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();return {year,week:Math.ceil((((d-new Date(Date.UTC(year,0,1)))/DAY)+1)/7)};}
function weekStart(year,week){const d=new Date(Date.UTC(year,0,4));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()||7)+1+(week-1)*7);return iso(d);}
function validDate(y,m,d){const dt=new Date(Date.UTC(y,m-1,d));if(y<1900||y>2200||dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('Fecha no válida');return iso(dt);}
function parseDate(raw){let s=String(raw).trim().replace(/^['"]|['"]$/g,'');let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);if(m)return validDate(+m[1],+m[2],+m[3]);m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s.*)?$/);if(m)return validDate(+m[3],+m[2],+m[1]);if(/^\d{5}(?:\.0+)?$/.test(s)){const d=new Date(Date.UTC(1899,11,30)+Number(s)*DAY);return validDate(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());}throw Error('Usa una fecha completa DD/MM/AAAA');}
function number(raw){let s=String(raw??'').trim().replace(/CLP|\$|\s|\u00a0/gi,'');if(s===''||s==='—'||s==='-')return 0;let neg=false;if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}if(s.includes(',')){if(!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(s))throw Error('Número inválido (usa 1.234,56)');s=s.replace(/\./g,'').replace(',','.');}else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s)){s=s.replace(/\./g,'');}else if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(s))throw Error('Número inválido');const n=Number(s)*(neg?-1:1);if(!Number.isFinite(n)||Math.abs(n)>1e13)throw Error('Número fuera de rango');return n;}
function fingerprint(r){return r.date+'|'+r.values.join('|');}
function totals(rows){return rows.reduce((a,r)=>{r.values.forEach((v,i)=>a.values[i]=round(a.values[i]+v));a.sales=round(a.sales+r.values[2]+r.values[4]+r.values[7]);a.visits+=r.values[0]+r.values[5];return a;},{values:Array(8).fill(0),sales:0,visits:0});}
function validatePurchases(purchases){
 if(purchases===undefined)return {};
 if(!purchases||typeof purchases!=='object'||Array.isArray(purchases))throw Error('Compras semanales inválidas');
 for(const [start,amount] of Object.entries(purchases)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||parseDate(start)!==start||date(start).getUTCDay()!==1||!Number.isFinite(amount)||amount<0||amount>1e13||Math.abs(round(amount)-amount)>0.00001)throw Error('Compra semanal inválida en el respaldo');
 }
 return purchases;
}
function purchaseWeeks(year){
 if(!Number.isInteger(year)||year<2000||year>2100)throw Error('El año de compras debe estar entre 2000 y 2100.');
 return Array.from({length:weekInfo(`${year}-12-28`).week},(_,i)=>{const start=weekStart(year,i+1);return {year,week:i+1,start,end:add(start,6)};});
}
// El reparto usa todos los registros, antes de aplicar filtros de pantalla.
function allocatePurchases(rows,purchases={}){
 validatePurchases(purchases);
 const weeks=new Map(),allocation=new Map();
 for(const r of rows){const w=weekInfo(r.date),start=weekStart(w.year,w.week);if(!weeks.has(start))weeks.set(start,new Map());const days=weeks.get(start);if(!days.has(r.date))days.set(r.date,[]);days.get(r.date).push(r);}
 const split=(cents,count,i)=>Math.floor(cents/count)+(i<cents%count?1:0);
 for(const [start,amount] of Object.entries(purchases)){
  const days=weeks.get(start);if(!days?.size)continue;
  [...days].sort(([a],[b])=>a.localeCompare(b)).forEach(([day,records],dayIndex)=>{
   const cents=split(Math.round(amount*100),days.size,dayIndex);
   [...records].sort((a,b)=>a.id.localeCompare(b.id)).forEach((r,i)=>allocation.set(r.id,split(cents,records.length,i)/100));
  });
 }
 return allocation;
}
function purchaseTotal(rows,allocation){return rows.reduce((sum,r)=>sum+Math.round((allocation.get(r.id)||0)*100),0)/100;}
function weeklyMargins(rows,purchases={}){
 validatePurchases(purchases);
 const weeks=new Map();
 for(const r of rows){const w=weekInfo(r.date),start=weekStart(w.year,w.week);if(!weeks.has(start))weeks.set(start,{start,end:add(start,6),year:w.year,week:w.week,sales:0,purchase:purchases[start]??null,mc:null});const summary=weeks.get(start);summary.sales=round(summary.sales+r.values[2]+r.values[4]+r.values[7]);}
 for(const week of weeks.values())if(week.purchase!==null&&week.sales!==0)week.mc=(week.sales-week.purchase)/week.sales;
 return weeks;
}
function parse(text){const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/);const rows=[],errors=[];let headers=0;lines.forEach((line,i)=>{if(!line.trim())return;const sep=line.includes('\t')?'\t':';';const cells=line.split(sep).map(v=>v.trim().replace(/^"(.*)"$/,'$1'));while(cells.length>9&&cells.at(-1)==='')cells.pop();if(/^(ventas?\s*d[ií]a|fecha)$/i.test(cells[0])){headers++;return;}if(cells.length!==9){errors.push(`Fila ${i+1}: se esperan 9 columnas y hay ${cells.length}. Copia las celdas directamente desde Excel.`);return;}try{const d=parseDate(cells[0]);const values=cells.slice(1).map(number);if(!Number.isInteger(values[0])||!Number.isInteger(values[5])||values[0]<0||values[5]<0)throw Error('Los totales de documentos deben ser enteros de 0 o más');rows.push({id:globalThis.crypto?.randomUUID?.()||'r'+Date.now()+Math.random(),date:d,values});}catch(e){errors.push(`Fila ${i+1}: ${e.message}.`);}});if(!rows.length&&!errors.length)errors.push('Pega al menos una fila de ventas.');return {rows,errors,headers};}
function configValid(c){textModel.validate(c?.indicatorText);if(!c||!Object.hasOwn(metricsModel.catalog,c.metric)||typeof c.title!=='string'||!c.title.trim()||c.title.length>100)throw Error('Configuración del indicador inválida');if(!Number.isInteger(c.year)||c.year<2000||c.year>2100||!Number.isInteger(c.startWeek)||c.startWeek<1||c.startWeek>weekInfo(`${c.year}-12-28`).week)throw Error('Año o semana ISO inválidos');for(const k of Object.keys(metricsModel.catalog))if(['sales','visits'].includes(k)||c.scales?.[k]!==undefined)scaleModel.validate(k==='mc'?{...c.scales[k],unit:'percent'}:c.scales?.[k]);if(c.cashClosingsVersion===2)for(const value of Object.values(c.goals?.cashClosings||{}))if(value!==null&&(!Number.isFinite(value)||value<0||value>1))throw Error('La meta de cierres debe estar entre 0 % y 100 %.');for(const [key,direction] of Object.entries(c.independentDirections||{}))if(!independentModel.catalog[key]||!['higher','lower','equal'].includes(direction))throw Error('Criterio de objetivo independiente inválido');for(const [year,plan] of Object.entries(c.objectivePlans||{})){if(!/^\d{4}$/.test(year)||+year<2000||+year>2100)throw Error('Año inválido en la tabla de objetivos');objectives.validate(plan);}return c;}
function isPercent(metric){return metric==='mc'||metricsModel.catalog[metric]?.unit==='percent';}
function metricScale(config,metric=config.metric){
 const definition=metricsModel.catalog[metric],stored=config.scales?.[metric];
 const useStored=['cashClosings','removedSkus'].includes(metric)?stored?.unit==='percent':metric==='complaints'?stored?.allowNegative===true:true;
 const scale=(useStored?stored:null)||{min:definition.min??0,max:definition.max};
 return isPercent(metric)?{...scale,unit:'percent'}:metric==='complaints'?{...scale,allowNegative:true}:scale;
}
function attendanceContext(rows,reports={}){return attendanceModel.context(rows,reports,api);}
function metricContext(rows,groupSales={},purchases={},cashierSales={}){return metricsModel.context(rows,groupSales,api,purchases,cashierSales);}
function buildPeriods(config,rows,groupSales={},purchases={},independentData={},cashierSales={}){
 configValid(config);const independent=metricsModel.catalog[config.metric].independent,ctx=independent?null:metricContext(rows,groupSales,purchases,cashierSales),start=weekStart(config.year,config.startWeek),th=date(add(start,3)),q=Math.floor(th.getUTCMonth()/3),pstart=new Date(Date.UTC(th.getUTCFullYear(),q*3-3,1)),periods=[];
 for(let i=0;i<3;i++){
  const m=new Date(Date.UTC(pstart.getUTCFullYear(),pstart.getUTCMonth()+i,1)),s=iso(m),e=iso(new Date(Date.UTC(m.getUTCFullYear(),m.getUTCMonth()+1,0))),result=independent?independentModel.period(independentData,config.metric,'m:'+s.slice(0,7)):metricsModel.period(ctx,config.metric,s,'month');
  periods.push({key:'m:'+s.slice(0,7),label:months[m.getUTCMonth()].toUpperCase(),short:months[m.getUTCMonth()].slice(0,3),start:s,end:e,...result,value:result.value===null?null:isPercent(config.metric)?result.value:round(result.value),kind:'month',year:m.getUTCFullYear()});
 }
 for(let i=0;i<13;i++){const s=add(start,i*7),w=weekInfo(s);periods.push({key:`w:${w.year}-${w.week}`,label:String(w.week),short:`S${w.week}`,start:s,end:add(s,6),...(independent?independentModel.period(independentData,config.metric,`w:${w.year}-${w.week}`):metricsModel.period(ctx,config.metric,s,'week')),kind:'week',year:w.year});}
 return periods.map((p,i)=>({...p,col:COLS[i],goal:objectives.goal(config,p),...(independent?{direction:metricsModel.catalog[config.metric].direction||config.independentDirections?.[config.metric]||(config.metric==='removedSkus'?'lower':'higher')}:{})}));
}
function status(p){return p.value===null?'empty':p.goal===null?'none':(p.direction==='lower'?p.value<=p.goal:p.direction==='above'?p.value>p.goal:p.direction==='equal'?p.value===p.goal:p.value>=p.goal)?'good':'bad';}
function validateBackup(s){if(s?.version!==1||!Array.isArray(s.rows)||s.rows.length>200000)throw Error('Respaldo no compatible');configValid(s.config);validatePurchases(s.purchases);groupSalesModel.validate(s.groupSales,api);independentModel.validate(s.independentIndicators,api);removalModel.validate(s.eliminationRecords,api);removalModel.validateCashierSales(s.eliminationCashierSales,api);const ids=new Set();for(const r of s.rows){if(typeof r.id!=='string'||ids.has(r.id)||parseDate(r.date)!==r.date||!Array.isArray(r.values)||r.values.length!==8||!r.values.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e13)||![r.values[0],r.values[5]].every(n=>Number.isInteger(n)&&n>=0))throw Error('El respaldo contiene registros inválidos');ids.add(r.id);}for(const metric of Object.keys(metricsModel.catalog))for(const [key,v] of Object.entries(s.config.goals?.[metric]||{})){if(!/^[mw]:\d{4}-\d{1,2}$/.test(key)||!(v===null||Number.isFinite(v)&&(metric==='mc'||v>=0)))throw Error('Objetivo inválido en el respaldo');}return s;}
const api={attendanceContext,isPercent,independentModel,metrics:metricsModel.catalog,extraMetrics:metricsModel.extras,metricLabels:metricsModel.labels,metricContext,metricScale,groupSalesModel,scaleLevels:scaleModel.levels,scalePosition:scaleModel.position,scaleValueAt:scaleModel.valueAt,COLS,months,iso,date,add,round,weekInfo,weekStart,parseDate,number,parse,fingerprint,totals,buildPeriods,status,validateBackup,configValid,validatePurchases,purchaseWeeks,allocatePurchases,purchaseTotal,weeklyMargins};root.IndicatorCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
