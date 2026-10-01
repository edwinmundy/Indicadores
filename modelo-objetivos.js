/* Modelo anual de objetivos. Compartido por el formulario, las barras y Excel. */
(function (root) {
  'use strict';
  const rows = [
    {id:'effectiveDays',label:'Días efectivos',type:'number'},
    {id:'monthlySales',label:'Venta neta MES',type:'money'},
    {id:'monthlyTicket',label:'Ticket promedio MES',type:'money'},
    {id:'saGoal',label:'Obj SA',type:'money'},
    {id:'saGrowth',label:'% crecimiento SA',type:'percent',negative:true},
    {id:'monthlyVisits',label:'N. atenciones',type:'number'},
    {id:'dailyVisits',label:'Atenciones día efectivo',type:'number'},
    {id:'mc',label:'MC',type:'percent',negative:true},
    {id:'ro',label:'RO',type:'money',negative:true},
    {id:'roPercent',label:'% RO',type:'percent',negative:true},
    {id:'weeklySales',label:'Venta neta SEMANAL',type:'money',formula:'Venta neta DIARIA × 6'},
    {id:'dailySales',label:'Venta neta DIARIA',type:'money',formula:'Venta neta MES ÷ Días efectivos'},
    {id:'shift1',label:'Venta neta turno 1',type:'money',formula:'Venta neta DIARIA × 60 %'},
    {id:'shift2',label:'Venta neta turno 2',type:'money',formula:'Venta neta DIARIA × 40 %'},
    {id:'weeklySA',label:'SERVICIOS ALIMENTICIOS',type:'money',formula:'Obj SA ÷ 30 × 7'},
    {id:'ecommerceMonth',label:'ECOMMERCE MES',type:'money'},
    {id:'ecommerceWeek',label:'ECOMMERCE SEM',type:'money'}
  ];
  function emptyPlan(seed) {
    return {visitsMode:'sixDays',values:Object.fromEntries(rows.filter(r=>!r.formula)
      .map(r=>[r.id,seed?.values?.[r.id]?.slice()||Array(12).fill(null)]))};
  }
  function validate(plan) {
    if(!plan||!['manual','sixDays'].includes(plan.visitsMode)||!plan.values)throw Error('Tabla anual de objetivos inválida.');
    for(const row of rows.filter(r=>!r.formula)) {
      const values=plan.values[row.id];
      if(!Array.isArray(values)||values.length!==12)throw Error(`Faltan los doce meses de ${row.label}.`);
      for(const v of values)if(v!==null&&(!Number.isFinite(v)||Math.abs(v)>1e13||(!row.negative&&v<0)||(row.id==='effectiveDays'&&v<=0)))throw Error(`Valor inválido en ${row.label}. Los días efectivos deben ser mayores que cero.`);
    }
    return plan;
  }
  function value(plan,id,month) {
    if(!plan)return null;
    const get=key=>plan.values[key]?.[month]??null;
    const daily=get('monthlySales')!==null&&get('effectiveDays')>0?get('monthlySales')/get('effectiveDays'):null;
    if(id==='dailySales')return daily;
    if(id==='weeklySales')return daily===null?null:daily*6;
    if(id==='shift1')return daily===null?null:daily*.6;
    if(id==='shift2')return daily===null?null:daily*.4;
    if(id==='weeklySA')return get('saGoal')===null?null:get('saGoal')/30*7;
    return get(id);
  }
  function annualGoal(config,period) {
    const monthKey=period.kind==='month'?period.key.slice(2):new Date(new Date(period.start+'T00:00:00Z').getTime()+3*86400000).toISOString().slice(0,7);
    const plan=config.objectivePlans?.[monthKey.slice(0,4)],month=Number(monthKey.slice(5))-1;
    if(!plan)return null;
    if(config.metric==='sales')return value(plan,'weeklySales',month);
    if(config.metric==='mc')return value(plan,'mc',month);
    if(config.metric==='tp')return value(plan,'monthlyTicket',month);
    if(config.metric==='sa')return value(plan,'weeklySA',month);
    if(config.metric==='apps')return value(plan,'ecommerceWeek',month);
    if(config.metric!=='visits')return null;
    const daily=value(plan,'dailyVisits',month);
    return plan.visitsMode==='sixDays'&&daily!==null?daily*6:null;
  }
  function cashGoal(config,key) {
    const saved=config.cashClosingsVersion===2?config.goals?.cashClosings?.[key]:null;
    return saved==null||(saved===1&&config.cashClosingsGoalVersion!==1)?.9:saved;
  }
  function goal(config,period) {
    if(['negativeSkus','complaints','compliments'].includes(config.metric))return 0;
    if(config.metric==='cashClosings')return cashGoal(config,period.key);
    if(config.metric==='removedSkus'&&config.removalGoalsVersion!==1)return null;
    const manual=config.goals?.[config.metric]||{};
    return Object.hasOwn(manual,period.key)?manual[period.key]:annualGoal(config,period);
  }
  const api={rows,emptyPlan,validate,value,annualGoal,goal,cashGoal};
  root.IndicatorObjectivesModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
