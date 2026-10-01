/* Métricas compartidas por registro, indicadores y Excel. No modifica los datos de origen. */
(function(root){
 'use strict';
 const extras=['tp','sa','uber','pddya','rappi','apps'];
 const breakdown=['sa','uber','pddya','rappi','apps'];
 const catalog={
  sales:{label:'Venta neta',title:'VENTA NETA',max:21000000},
  visits:{label:'Atenciones',title:'ATENCIONES',max:1200},
  tp:{label:'TP · Ticket promedio',title:'TICKET PROMEDIO',max:20000},
  sa:{label:'SA · Servicios alimenticios',title:'SERVICIOS ALIMENTICIOS',max:3000000},
  uber:{label:'UBER',title:'UBER',max:1000000},
  pddya:{label:'PPD YA',title:'PPD YA',max:1000000},
  rappi:{label:'RAPPI',title:'RAPPI',max:1000000},
  apps:{label:'TOTAL APPs',title:'TOTAL APPs',max:2000000},
  mc:{label:'MC · Margen de contribución',title:'MC',max:1},
  ...(root.IndicatorIndependentModel||(typeof require==='function'?require('./modelo-independientes.js'):{})).catalog
 };
 const labels={tp:'TP',sa:'SA',uber:'UBER',pddya:'PPD YA',rappi:'RAPPI',apps:'TOTAL APPs'};
 const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
 function context(rows,groupSales,C,purchases={},cashierSales={}){
  const attendance=C.attendanceContext(rows,cashierSales);
  const margins=C.weeklyMargins(rows,purchases),allocation=C.allocatePurchases(rows,purchases);
  const weeks=new Map(),monthRows=new Map(),monthParts=new Map(),contributions=[];
  const startFor=day=>{const w=C.weekInfo(day);return C.weekStart(w.year,w.week);};
  function ensure(start){if(!weeks.has(start))weeks.set(start,{start,end:C.add(start,6),rows:[],days:new Set(),sales:null,visits:null,tp:null,mc:null,sa:null,uber:null,pddya:null,rappi:null,apps:null});return weeks.get(start);}
  for(const start of attendance.weeks.keys())ensure(start);
  for(const row of rows){const week=ensure(startFor(row.date));week.rows.push(row);week.days.add(row.date);const month=row.date.slice(0,7);if(!monthRows.has(month))monthRows.set(month,[]);monthRows.get(month).push(row);}
  for(const [start,value] of Object.entries(groupSales||{})){
   const week=ensure(start),data=C.groupSalesModel.normalizeWeek(value,C),sa=data.groups.filter(g=>g.code===25||g.code===0&&normalize(g.name)==='SERVICIOS ALIMENTICIOS');
   if(sa.length)week.sa=sa.reduce((sum,g)=>sum+C.groupSalesModel.net(g.amount,g.code,g.name),0);
   for(const [key,names] of [['uber',['UBER']],['pddya',['PDD YA','PPD YA','PEDIDOS YA']],['rappi',['RAPPI']]]){
    const apps=data.apps.filter(a=>names.includes(normalize(a.name).replace(/^VENTAS?\s+/,'')));
    if(apps.length)week[key]=apps.reduce((sum,a)=>sum+C.groupSalesModel.net(a.amount),0);
   }
   if(data.apps.length)week.apps=data.apps.reduce((sum,a)=>sum+C.groupSalesModel.net(a.amount),0);
  }
  for(const week of weeks.values()){
   week.mc=margins.get(week.start)?.mc??null;
   week.visits=attendance.weeks.get(week.start)??null;
   if(week.rows.length){const t=C.totals(week.rows);week.sales=t.sales;week.tp=week.visits>0?t.sales/week.visits:null;}
   // Sin registro diario, el desglose semanal se distribuye entre los siete días calendario.
   const days=week.days.size?[...week.days].sort():Array.from({length:7},(_,i)=>C.add(week.start,i));
   if(breakdown.some(key=>week[key]!==null))for(const day of days){
    const part={date:day,start:week.start,share:1/days.length};
    for(const key of breakdown)part[key]=week[key]===null?null:week[key]/days.length;
    contributions.push(part);const month=day.slice(0,7);if(!monthParts.has(month))monthParts.set(month,[]);monthParts.get(month).push(part);
   }
  }
  const months=new Map();
  for(const month of new Set([...monthRows.keys(),...monthParts.keys(),...[...attendance.days.keys()].map(day=>day.slice(0,7))])){
   const records=monthRows.get(month)||[],parts=monthParts.get(month)||[],total=C.totals(records),count=new Set(records.map(r=>startFor(r.date))).size;
   const value={sales:records.length?total.sales:null,visits:records.length?total.visits:null,tp:records.length&&total.visits!==0?total.sales/total.visits:null,mc:records.some(r=>allocation.has(r.id))&&total.sales!==0?(total.sales-C.purchaseTotal(records,allocation))/total.sales:null,samples:{sales:count,visits:count,tp:count,mc:count}};
   value.visits=attendance.rangeTotal(month+'-01',month+'-31');
   value.samples.visits=new Set([...attendance.days.keys()].filter(day=>day.startsWith(month)).map(startFor)).size;
   value.tp=records.length&&attendance.sumRows(records)!==null&&value.visits>0?total.sales/value.visits:null;
   for(const key of breakdown){const present=parts.filter(p=>p[key]!==null);value[key]=present.length?present.reduce((sum,p)=>sum+p[key],0):null;value.samples[key]=new Set(present.map(p=>p.start)).size;}
   months.set(month,value);
  }
  return {weeks,months,contributions,startFor,attendance};
 }
 function period(ctx,metric,start,kind){
  if(kind==='week'){const week=ctx.weeks.get(start);return {value:week?.[metric]??null,samples:week?(week.days.size||(week[metric]!==null?7:0)):0};}
  const month=ctx.months.get(start.slice(0,7)),value=month?.[metric]??null,samples=month?.samples[metric]||0;
  return {value:value===null?null:['tp','mc'].includes(metric)?value:value/samples,samples};
 }
 const api={catalog,extras,breakdown,labels,context,period};root.IndicatorMetricsModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
