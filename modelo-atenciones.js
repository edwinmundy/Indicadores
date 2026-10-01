/* Atenciones semanales por cajero y reparto entero entre fechas con boletas. */
(function(root){
 'use strict';
 function context(rows,reports,C){
  const weeks=new Map(),days=new Map(),records=new Map(),registered=new Map();
  const startFor=day=>{const info=C.weekInfo(day);return C.weekStart(info.year,info.week);};
  for(const row of rows){const start=startFor(row.date);if(!registered.has(start))registered.set(start,new Map());const dates=registered.get(start);if(!dates.has(row.date))dates.set(row.date,[]);dates.get(row.date).push(row);}
  const split=(total,count,index)=>Math.floor(total/count)+(index<total%count?1:0);
  for(const [start,cashiers] of Object.entries(reports||{})){
   if(!cashiers.length)continue;
   const total=cashiers.reduce((sum,cashier)=>sum+cashier.visits,0);weeks.set(start,total);
   const dates=registered.get(start),keys=dates?.size?[...dates.keys()].sort():Array.from({length:7},(_,index)=>C.add(start,index));
   keys.forEach((day,index)=>{const amount=split(total,keys.length,index);days.set(day,amount);const entries=dates?.get(day)||[];entries.forEach((row,i)=>records.set(row.id,split(amount,entries.length,i)));});
  }
  function rangeTotal(from,until){const values=[...days].filter(([day])=>day>=from&&day<=until).map(([,value])=>value);return values.length?values.reduce((sum,value)=>sum+value,0):null;}
  function sumRows(selected){return selected.length&&selected.every(row=>records.has(row.id))?selected.reduce((sum,row)=>sum+records.get(row.id),0):null;}
  return {weeks,days,records,rangeTotal,sumRows,startFor};
 }
 const api={context};root.IndicatorAttendanceModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
