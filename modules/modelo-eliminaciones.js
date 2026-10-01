/* Registro original de eliminaciones; independiente del cálculo del indicador. */
(function(root){
 'use strict';
 const headers=['Vacío','COD CAJ','CAJ','N','NM','NMM','FECHA','HORA','COD','PROD','TRX','VAL','TOTAL'];
 const clean=value=>String(value??'').replace(/\u00a0/g,' ').trim();
 const nameKey=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLocaleLowerCase('es-CL');
 function validateSale(row){
  if(!row||typeof row.name!=='string'||!clean(row.name)||row.name.length>2000||!Number.isSafeInteger(row.visits)||row.visits<0||row.visits>1e13||!Number.isFinite(row.gross)||Math.abs(row.gross)>1e13)throw Error('Revisa el cajero, las atenciones y el monto bruto.');
 }
 function validateCashierSales(data,C){
  if(data===undefined)return {};
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Las ventas por cajero no son válidas.');
  for(const [start,rows] of Object.entries(data)){
   if(C.parseDate(start)!==start||C.date(start).getUTCDay()!==1||!Array.isArray(rows)||rows.length>10000)throw Error('Semana inválida en ventas por cajero.');
   for(const row of rows)validateSale(row);
  }
  return data;
 }
 function parseCashierSales(text,C){
  const rows=[];
  for(const [index,line] of String(text).split(/\r?\n/).entries()){
   if(!line.trim())continue;
   let cells=line.includes('\t')?line.split('\t'):line.includes('|')?line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|'):line.split(';');
   cells=cells.map(value=>clean(value).replace(/^"(.*)"$/,'$1'));
   if(cells.every(value=>!value||/^:?-+:?$/.test(value)))continue;
   if(/^cajero$/i.test(cells[0])&&/atenciones/i.test(cells[1]||''))continue;
   if(/^(total|totales|total venta|total general)$/i.test(cells[0]))continue;
   if(cells.length!==3)throw Error(`Fila ${index+1}: pega Cajero, Total Atenciones y Monto (3 columnas).`);
   try{
    const row={name:cells[0].replace(/\s+/g,' '),visits:C.number(cells[1]),gross:C.number(cells[2])};
    if(!cells[1]||!cells[2])throw Error('Completa atenciones y monto; usa 0 cuando corresponda.');
    validateSale(row);rows.push(row);
   }catch(error){throw Error(`Fila ${index+1}: ${error.message}`);}
  }
  if(!rows.length)throw Error('Pega al menos un cajero con atenciones y monto bruto.');
  return rows;
 }
 function cross(rows,sales,C,selected=''){
  const result=new Map(),weeks=new Set(selected?[selected]:[...Object.keys(sales),...rows.map(row=>week(row,C))]);
  const itemFor=name=>{
   const key=nameKey(name);if(!result.has(key))result.set(key,{name,visits:0,gross:0,removed:0,hasSales:false,missingSales:false,missingDetail:false});
   return result.get(key);
  };
  const detail=new Map();
  for(const row of rows){const start=week(row,C);if(!weeks.has(start))continue;if(!detail.has(start))detail.set(start,[]);detail.get(start).push(row);}
  for(const start of weeks){
   const weeklySales=new Set();
   for(const row of sales[start]||[]){
    const item=itemFor(row.name);item.visits+=row.visits;item.gross=C.round(item.gross+row.gross);item.hasSales=true;
    if(!detail.has(start))item.missingDetail=true;
    weeklySales.add(nameKey(row.name));
   }
   for(const row of detail.get(start)||[]){
    const item=itemFor(clean(row.cells[2]).replace(/\s+/g,' '));item.removed=C.round(item.removed+C.number(row.cells[12]));
    if(!weeklySales.has(nameKey(row.cells[2])))item.missingSales=true;
   }
  }
  const items=[...result.values()],gross=C.round(items.reduce((sum,item)=>sum+item.gross,0)),net=gross/1.19;
  for(const item of items){
   item.net=item.hasSales?item.gross/1.19:null;
   item.share=item.net!==null&&net!==0?item.net/net:null;
   item.ratio=item.hasSales&&!item.missingSales&&!item.missingDetail&&item.gross!==0?item.removed/item.gross:null;
  }
  return {items,total:{visits:items.reduce((sum,item)=>sum+item.visits,0),gross,net,removed:C.round(items.reduce((sum,item)=>sum+item.removed,0)),hasSales:items.some(item=>item.hasSales),incomplete:items.some(item=>item.missingSales||item.missingDetail)},unmatched:items.filter(item=>item.missingSales).map(item=>item.name),missingDetail:items.some(item=>item.missingDetail)};
 }
 function validate(rows,C){
  if(rows===undefined)return [];
  if(!Array.isArray(rows)||rows.length>200000)throw Error('El registro de eliminación no es válido o supera las 200.000 filas.');
  const ids=new Set();
  for(const row of rows){
   if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||!Array.isArray(row.cells)||row.cells.length!==13||row.cells.some(cell=>typeof cell!=='string'||cell.length>2000))throw Error('Hay una fila inválida en el registro de eliminación.');
   ids.add(row.id);
   if(!clean(row.cells[2]))throw Error('Cada fila debe incluir el cajero en la columna 3.');
   C.parseDate(row.cells[6]);
   if(!clean(row.cells[12]))throw Error('Cada fila debe incluir TOTAL en la columna 13.');
   C.number(row.cells[12]);
  }
  return rows;
 }
 function parse(text,C){
  const rows=[];
  for(const [index,line] of String(text).split(/\r?\n/).entries()){
   if(!line.trim())continue;
   let cells;
   // Do not trim the whole TSV line: the initial empty cell is column 1.
   if(line.includes('\t'))cells=line.split('\t');
   else if(line.includes('|'))cells=line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|');
   else cells=line.split(';');
   cells=cells.map(value=>clean(value).replace(/^"(.*)"$/,'$1').replace(/""/g,'"'));
   if(cells.every(value=>!value||/^:?-+:?$/.test(value)))continue;
   if(/^COD\s*CAJ$/i.test(cells[1]||'')&&/^TOTAL$/i.test(cells[12]||''))continue;
   if(cells.length!==13)throw Error(`Fila ${index+1}: se necesitan 13 columnas, incluida la primera vacía; se recibieron ${cells.length}.`);
   const row={id:crypto.randomUUID(),cells};
   try{validate([row],C);}catch(error){throw Error(`Fila ${index+1}: ${error.message}`);}
   rows.push(row);
  }
  if(!rows.length)throw Error('Pega al menos una fila de datos de las 13 columnas.');
  return rows;
 }
 function week(row,C){const info=C.weekInfo(C.parseDate(row.cells[6]));return C.weekStart(info.year,info.week);}
 function summarize(rows,C){
  const cashiers=new Map();let total=0;
  for(const row of rows){
   const name=clean(row.cells[2]).replace(/\s+/g,' '),key=nameKey(name),amount=C.number(row.cells[12]);
   const item=cashiers.get(key)||{name,total:0,count:0};
   item.total=C.round(item.total+amount);item.count++;cashiers.set(key,item);total=C.round(total+amount);
  }
  return {total,cashiers:[...cashiers.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'))};
 }
 function indicatorData(data,rows,sales,C){
  const next={...data,removedSkus:{...data?.removedSkus}};
  for(const [key,record] of Object.entries(next.removedSkus)){
   if(key.startsWith('m:'))next.removedSkus[key]={...record,...(record.source!=='removal'&&record.ratio!=null?{previousManualRatio:record.ratio}:{}),ratio:null,source:'removal',days:0};
   else if(record.source==='removal')next.removedSkus[key]={...record,ratio:null};
  }
  const starts=new Set([...Object.keys(sales),...rows.map(row=>week(row,C))]);
  const months=new Map();
  for(const start of starts){
   const {total}=cross(rows,sales,C,start),info=C.weekInfo(start),key=`w:${info.year}-${info.week}`;
   const ratio=total.hasSales&&!total.incomplete&&total.gross!==0?total.removed/total.gross:null;
   next.removedSkus[key]={...next.removedSkus[key],ratio,source:'removal'};
   // Each calendar day carries its week's percentage; missing weeks do not count as zero.
   for(let day=0;day<7;day++){
    const monthKey='m:'+C.add(start,day).slice(0,7),month=months.get(monthKey)||{sum:0,days:0};
    if(ratio!==null){month.sum+=ratio;month.days++;}
    months.set(monthKey,month);
   }
  }
  for(const [key,month] of months)next.removedSkus[key]={...next.removedSkus[key],ratio:month.days?month.sum/month.days:null,source:'removal',days:month.days};
  return next;
 }
 const api={headers,validate,parse,week,summarize,validateCashierSales,parseCashierSales,cross,indicatorData};root.IndicatorRemovalModel=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
