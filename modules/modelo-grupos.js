/* Desgloses semanales independientes del registro diario. C aporta fechas y lectura numérica. */
(function(root){
 'use strict';
 const catalog=[
  [1,'ALIMENTOS DE DESPENSA'],[2,'ALIMENTOS FRESCOS PREPARADOS'],[3,'BARRAS NUTRITIVAS'],[4,'BEBIDAS ISOTONICAS'],[5,'BEBIDAS CARBONATADAS'],[6,'BEBIDAS ENERGETICAS'],[7,'CECINAS Y QUESOS'],[8,'CHOCOLATES'],[9,'COMIDA INSTANTANEA'],[10,'CUIDADO PERSONAL Y DE HOGAR'],[11,'AGUAS Y AGUAS SABORIZADAS'],[12,'DULCES Y CHICLES'],[13,'GALLETAS SALUDABLES'],[14,'GALLETAS Y MASAS DULCES EMPACA'],[15,'HELADOS'],[16,'JUGOS'],[17,'LACTEOS'],[18,'MISCELANEOS'],[19,'SNACKS'],[20,'CIGARROS'],[21,'TE Y CAFE'],[22,'PANADERIA'],[23,'BEBIDAS CALIENTES'],[24,'OTROS PRODUCTOS TABACO'],[25,'SERVICIOS ALIMENTICIOS'],[26,'REPOSTERIA FRESCA'],[28,'RECARGAS DELIVERY']
 ];
 const clean=s=>String(s??'').replace(/\u00a0/g,' ').trim().replace(/\s+/g,' ');
 const defaultApps=['UBER','PDD YA','RAPPI'];
 const appName=value=>{const name=clean(value),key=name.toLocaleUpperCase('es-CL');return ['PEDIDOS YA','PPD YA'].includes(key)?'PDD YA':defaultApps.includes(key)?key:name;};
 function withDefaultApps(apps){const named=apps.map(a=>({...a,name:appName(a.name)}));return [...defaultApps.map(name=>named.find(a=>a.name===name)||{name,amount:0}),...named.filter(a=>!defaultApps.includes(a.name))];}
 const week=value=>Array.isArray(value)?{groups:value,apps:[]}:value;
 const isCigarettes=(code,name)=>Number(code)===20||code!=null&&Number(code)===0&&clean(name).toUpperCase()==='CIGARROS';
 const net=(amount,code,name)=>isCigarettes(code,name)?amount:amount/1.19;
 function numeric(value,C,label){try{const n=typeof value==='number'?value:C.number(value);if(!Number.isFinite(n)||Math.abs(n)>1e13||Math.abs(C.round(n)-n)>0.00001)throw Error('Usa hasta dos decimales');return n;}catch(e){throw Error(`${label}: ${e.message}.`);}}
 function normalizeRows(rows,C){
  if(!Array.isArray(rows)||rows.length>1000)throw Error('Cada semana admite hasta 1.000 categorías.');
  const seen=new Set();
  return rows.map((r,i)=>{
   const codeText=clean(r.code),code=Number(codeText),name=clean(r.name);
   if(!/^\d{1,6}$/.test(codeText))throw Error(`Fila ${i+1}: el grupo debe ser un número entero de 0 a 999999.`);
   const key=code===0?`sin-codigo:${name.toLocaleUpperCase('es-CL')}`:code;
   if(seen.has(key))throw Error(`El grupo ${code===0?name:code} está repetido en esta semana.`);seen.add(key);
   if(!name||name.length>200)throw Error(`Grupo ${code}: completa un nombre de hasta 200 caracteres.`);
   return {code,name,quantity:clean(r.quantity)===''?0:numeric(r.quantity,C,`Grupo ${code}, cantidad`),amount:numeric(r.amount,C,`Grupo ${code}, venta bruta`)};
  });
 }
 function normalizeApps(apps,C){
  if(!Array.isArray(apps)||apps.length>100)throw Error('Cada semana admite hasta 100 APPs.');
  const seen=new Set();return apps.map((a,i)=>{const name=appName(a.name);if(!name||name.length>100)throw Error(`APP ${i+1}: completa un nombre de hasta 100 caracteres.`);const key=name.toLocaleUpperCase('es-CL');if(seen.has(key))throw Error(`La APP ${name} está repetida.`);seen.add(key);return {name,amount:numeric(a.amount,C,`APP ${name}, venta bruta`)};});
 }
 function normalizeWeek(value,C){const w=week(value);if(!w||typeof w!=='object')throw Error('Semana de ventas por grupos inválida.');return {groups:normalizeRows(w.groups,C),apps:normalizeApps(w.apps||[],C)};}
 function validate(data,C){
  if(data===undefined)return {};
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>6000)throw Error('Desglose por grupos inválido.');
  let count=0;
  for(const [start,value] of Object.entries(data)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||C.parseDate(start)!==start||C.date(start).getUTCDay()!==1)throw Error('Fecha de semana inválida en ventas por grupos.');
   const year=C.weekInfo(start).year;if(year<2000||year>2100)throw Error('El año de ventas por grupos debe estar entre 2000 y 2100.');
   const w=week(value);
   if(!w||!Array.isArray(w.groups)||w.groups.some(r=>!r||typeof r.code!=='number'||typeof r.name!=='string'||!(r.quantity===null||typeof r.quantity==='number')||typeof r.amount!=='number'))throw Error('Datos de categorías inválidos en el respaldo.');
   if(w.apps!==undefined&&(!Array.isArray(w.apps)||w.apps.some(a=>!a||typeof a.name!=='string'||typeof a.amount!=='number')))throw Error('Datos de APPs inválidos en el respaldo.');
   const normalized=normalizeWeek(w,C);count+=normalized.groups.length+normalized.apps.length;
  }
  if(count>200000)throw Error('El desglose admite hasta 200.000 filas en total.');return data;
 }
 function totals(value){
  const w=week(value),groups=w.groups,apps=w.apps||[],sum=rs=>rs.reduce((s,r)=>s+Math.round(r.amount*100),0)/100;
  const quantity=groups.some(r=>r.quantity!==null)?groups.reduce((s,r)=>s+Math.round((r.quantity||0)*100),0)/100:null;
  const groupGross=sum(groups),appGross=sum(apps),groupNet=groups.reduce((s,r)=>s+net(r.amount,r.code,r.name),0),appNet=apps.reduce((s,r)=>s+net(r.amount),0);
  return {quantity,amount:groupGross+appGross,net:groupNet+appNet,groupGross,groupNet,appGross,appNet};
 }
 function blankRows(source){return (source||catalog.map(([code,name])=>({code,name}))).map(r=>({code:r.code,name:r.name,quantity:0,amount:0}));}
 function blankWeek(source){const w=source&&week(source);return {groups:blankRows(w?.groups),apps:withDefaultApps(w?.apps||[]).map(a=>({name:a.name,amount:0}))};}
 function parse(text,C){
  const source=String(text).replace(/^\uFEFF/,'').replace(/\u00a0/g,' '),rows=[],apps=[],warnings=[];
  let range=null,reportTotal=null,reportApps=null,reportedWeek=null,shortDates=null,netLayout=false,noCodeLayout=false,amountOnlyLayout=false;
  const ranges=[...source.matchAll(/desde\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*[|\t ]*hasta\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/gi)];
  if(ranges.length>1)throw Error('Pega un solo reporte semanal por vez.');
  const dates=ranges[0];
  if(dates){const start=C.parseDate(dates[1]),end=C.parseDate(dates[2]);if(C.date(start).getUTCDay()!==1||C.add(start,6)!==end)throw Error('El reporte debe abarcar una semana completa, de lunes a domingo.');range={start,end,...C.weekInfo(start)};}
  for(const [index,line] of source.split(/\r?\n/).entries()){
   if(!line.trim())continue;let cells;
   if(line.includes('\t'))cells=line.split('\t');else if(line.includes('|'))cells=line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|');else if(line.includes(';'))cells=line.split(';');else cells=line.trim().split(/\s{2,}/);
   cells=cells.map(s=>clean(s).replace(/^"(.*)"$/,'$1'));while(cells.length>4&&cells.at(-1)==='')cells.pop();
   if(cells.every(c=>!c||/^:?-+:?$/.test(c)))continue;
   if(!cells[0]&&!cells[1]&&/^\d{1,2}$/.test(cells[2]||'')){reportedWeek=Number(cells[2]);continue;}
   if(/^Semana$/i.test(cells[0])){shortDates=[cells[1],cells[2]];continue;}
   if(/^Resumen de Ventas por Grupos/i.test(cells[0])||/^desde\s*:/i.test(cells[0]))continue;
   if(/^Grupo(?: Familia)?$/i.test(cells[0])||cells.length===3&&/^(Nombre|Descripci[oó]n(?: Grupo)?)$/i.test(cells[0])&&/^(Cantidad|Venta Bruta)$/i.test(cells[1])){if(rows.length||apps.length)throw Error('Pega un solo reporte semanal por vez.');amountOnlyLayout=cells.length===3&&/^Grupo(?: Familia)?$/i.test(cells[0]);netLayout=!amountOnlyLayout&&cells.some(c=>/^Venta Bruta$/i.test(c));noCodeLayout=cells.length===3&&!amountOnlyLayout;continue;}
   const totalIndex=cells.findIndex(c=>/^(TOTAL(?:ES)?|VENTA TOTAL|TOTAL VENTA|TOTAL GENERAL)\s*:?$/i.test(c));
   const appsTotalIndex=cells.findIndex(c=>/^TOTAL VENTAS? APPS?$/i.test(c));
   if(totalIndex>=0||appsTotalIndex>=0){const i=totalIndex>=0?totalIndex:appsTotalIndex,tail=cells.slice(i+1);if(tail.length<(amountOnlyLayout?1:2))throw Error('La fila de totales está incompleta.');const t=amountOnlyLayout?{amount:C.number(tail.at(-1))}:netLayout?{amount:C.number(tail[0]),net:C.number(tail[1])}:{quantity:C.number(tail[0]),amount:C.number(tail[1])};if(totalIndex>=0){if(reportTotal)throw Error('Pega un solo reporte semanal por vez.');reportTotal=t;}else reportApps=t;continue;}
   if(cells.length===3&&/^\d+$/.test(cells[0])){
    amountOnlyLayout=true;rows.push({code:cells[0],name:cells[1],quantity:0,amount:cells[2]});continue;
   }
   if(cells.length===3&&(!netLayout||noCodeLayout)){
    rows.push({code:0,name:cells[0],quantity:netLayout?0:cells[1],amount:netLayout?cells[1]:cells[2]});continue;
   }
   if(netLayout&&!/^\d+$/.test(cells[0])){
    const section=/^Ventas? APPS?$/i.test(cells[0]),name=clean(section?cells[1]:cells[0]).replace(/^VENTAS?\s+/i,'');
    const amount=C.number(cells[section?2:1]),reportedNet=C.number(cells[section?3:2]);
    if(!name)throw Error(`Fila ${index+1}: falta el nombre de la APP.`);
    apps.push({name,amount});if(Math.abs(Math.round(net(amount))-reportedNet)>1)warnings.push(`La venta neta informada de ${name} difiere del cálculo bruto ÷ 1,19.`);continue;
   }
   if(cells.length!==4)throw Error(`Fila ${index+1}: copia Grupo, Nombre y Monto bruto, o las cuatro columnas del reporte.`);
   rows.push({code:cells[0],name:cells[1],quantity:netLayout?0:cells[2],amount:netLayout?cells[2]:cells[3]});
  }
  if(!rows.length&&!apps.length)throw Error('Pega al menos una categoría o APP del reporte.');
  const data=normalizeWeek({groups:rows,apps},C);data.apps=withDefaultApps(data.apps);const total=totals(data);
  if(reportTotal&&(Math.abs(reportTotal.amount-total.amount)>0.005||reportTotal.quantity!==undefined&&Math.abs(reportTotal.quantity-total.quantity)>0.005||reportTotal.net!==undefined&&Math.abs(reportTotal.net-Math.round(total.net))>0.5))warnings.push('Los totales del reporte no coinciden con el desglose calculado. Revisa los importes antes de aplicarlo.');
  if(reportApps&&(Math.abs(reportApps.amount-total.appGross)>0.005||Math.abs(reportApps.net-Math.round(total.appNet))>0.5))warnings.push('El subtotal de APPs no coincide con las APPs informadas.');
  return {rows:data.groups,apps:data.apps,data,range,reportedWeek,shortDates,total,reportTotal,warnings};
 }
 function resolveStart(parsed,C,year,fallback){
  const start=parsed.range?.start||(parsed.reportedWeek!==null?C.weekStart(year,parsed.reportedWeek):fallback);
  const info=C.weekInfo(start);
  if(parsed.reportedWeek!==null&&(parsed.reportedWeek<1||parsed.reportedWeek>C.weekInfo(`${year}-12-28`).week||info.year!==year))throw Error('La semana del reporte no existe en el año seleccionado.');
  if(parsed.shortDates){for(const [i,label] of parsed.shortDates.entries()){const match=clean(label).toLowerCase().match(/^(\d{1,2})\s+([a-záéíóú]+)/),d=C.date(C.add(start,i*6));if(!match||+match[1]!==d.getUTCDate()||C.months[d.getUTCMonth()].toLowerCase().slice(0,3)!==match[2].slice(0,3))throw Error('Las fechas del reporte no coinciden con la semana. Revisa el año ISO seleccionado.');}}
  return start;
 }
 const api={normalizeRows,normalizeApps,normalizeWeek,validate,week,isCigarettes,net,totals,blankRows,blankWeek,parse,resolveStart};root.IndicatorGroupSalesModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
