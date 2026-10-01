/* Captura del reporte por cajero. Totales y filas de resumen no son cajeros. */
(function(root){
 'use strict';
 function totals(record){
  if(record?.source==='cash-month-average')return null;
  if(!Array.isArray(record?.cashiers))return null;
  return record.cashiers.reduce((sum,row)=>({good:sum.good+row.good,bad:sum.bad+row.bad,total:sum.total+row.good+row.bad}),{good:0,bad:0,total:0});
 }
 function result(record){if(record?.source==='cash-month-average')return record.monthlyRatio??null;const summary=totals(record);return summary&&summary.total>0?summary.good/summary.total:null;}
 function indicatorData(data,C){
  const records={...data?.cashClosings},months=new Map();
  for(const [key,record] of Object.entries(records)){
   if(key.startsWith('m:')){
    records[key]={...record,source:'cash-month-average',monthlyRatio:null,days:0};
    continue;
   }
   if(!key.startsWith('w:'))continue;
   const [year,week]=key.slice(2).split('-').map(Number),start=C.weekStart(year,week),value=result(record);
   for(let day=0;day<7;day++){
    const monthKey='m:'+C.add(start,day).slice(0,7),month=months.get(monthKey)||{sum:0,days:0};
    if(value!==null){month.sum+=value;month.days++;}
    months.set(monthKey,month);
   }
  }
  for(const [key,month] of months)records[key]={...records[key],source:'cash-month-average',monthlyRatio:month.days?month.sum/month.days:null,days:month.days};
  return {...data,cashClosings:records};
 }
 function validate(record){
  if(record.source==='cash-month-average'){
   if(record.monthlyRatio!=null&&(!Number.isFinite(record.monthlyRatio)||record.monthlyRatio<0||record.monthlyRatio>1))throw Error('Promedio mensual de cierres inválido.');
   if(!Number.isInteger(record.days)||record.days<0||record.days>31)throw Error('Cantidad de días del promedio de cierres inválida.');
  }
  if(record.cashiers===undefined)return;
  if(!Array.isArray(record.cashiers)||record.cashiers.length>10000)throw Error('El detalle de cajeros no es válido.');
  for(const row of record.cashiers){
   if(!row||typeof row.name!=='string'||!row.name.trim()||row.name.length>160)throw Error('Cada fila debe tener un nombre de cajero.');
   for(const field of ['good','bad'])if(!Number.isSafeInteger(row[field])||row[field]<0||row[field]>1e10)throw Error('Los cierres buenos y malos deben ser cantidades enteras de 0 o más.');
  }
 }
 function parse(text,C){
  const rows=[];
  for(const [index,line] of String(text).split(/\r?\n/).entries()){
   if(!line.trim())continue;
   let cells;
   if(line.includes('\t'))cells=line.split('\t');
   else if(line.includes('|')){cells=line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|');}
   else cells=line.split(';');
   cells=cells.map(value=>value.trim().replace(/^"(.*)"$/,'$1').replace(/\u00a0/g,' '));
   if(cells.every(value=>!value||/^:?-+:?$/.test(value)))continue;
   if(/^(buenos?|cierres buenos)$/i.test(cells[0])&&/^(malos?|cierres malos)$/i.test(cells[1]))continue;
   const name=(cells[2]||'').replace(/\s+/g,' ').trim();
   if(!name||/^(total(?:es)?|diferencia|porcentaje|resultado)$/i.test(name))continue;
   if(cells.slice(3).some(value=>value!==''))throw Error(`Fila ${index+1}: pega solo Bueno, Malo y Cajero.`);
   try{
    const row={name,good:C.number(cells[0]||''),bad:C.number(cells[1]||'')};validate({cashiers:[row]});rows.push(row);
   }catch(error){throw Error(`Fila ${index+1}: ${error.message}`);}
  }
  if(!rows.length)throw Error('Pega al menos una fila con el nombre del cajero.');
  return rows;
 }
 const api={totals,result,validate,parse,indicatorData,minimumGoal:0,description:'Buenos ÷ (buenos + malos) × 100 · Porcentaje redondeado sin decimales.'};root.IndicatorCashModel=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
