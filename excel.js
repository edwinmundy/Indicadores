/* Edición selectiva de OpenXML: conserva el logo, dibujos, impresión y estilos originales.
   JSZip se distribuye localmente. No se envían archivos ni datos a servicios externos. */
(function(){
'use strict';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',REL='http://schemas.openxmlformats.org/package/2006/relationships',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',CT='http://schemas.openxmlformats.org/package/2006/content-types',A='http://schemas.openxmlformats.org/drawingml/2006/main',XDR='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const C=IndicatorCore;
function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('La plantilla contiene XML inválido');return d;}
const serialize=d=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(d.documentElement);
const all=(node,tag,ns=NS)=>Array.from(node.getElementsByTagNameNS(ns,tag)),first=(node,tag,ns=NS)=>all(node,tag,ns)[0];
function el(doc,tag,attrs={},text,ns=NS){const x=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(text!==undefined)x.textContent=String(text);return x;}
const colnum=s=>[...s].reduce((v,c)=>v*26+c.charCodeAt(0)-64,0),dayserial=s=>(C.date(s)-new Date(Date.UTC(1899,11,30)))/86400000;
async function load(data){const zip=await JSZip.loadAsync(data,{base64:typeof data==='string'});for(const p of ['xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml','[Content_Types].xml'])if(!zip.file(p))throw Error('Selecciona un archivo .xlsx válido');const wb=xml(await zip.file('xl/workbook.xml').async('string')),rels=xml(await zip.file('xl/_rels/workbook.xml.rels').async('string'));const sheets=all(wb,'sheet');let sh=sheets.find(s=>s.getAttribute('name')==='Venta Neta');if(!sh&&sheets.length===1)sh=sheets[0];if(!sh)throw Error('No se encontró la hoja Venta Neta');const id=sh.getAttributeNS(R,'id'),rel=all(rels,'Relationship',REL).find(r=>r.getAttribute('Id')===id);const path=resolvePart('xl/workbook.xml',rel?.getAttribute('Target'));if(!zip.file(path))throw Error('La hoja no está disponible');const doc=xml(await zip.file(path).async('string'));const merges=all(doc,'mergeCell').map(e=>e.getAttribute('ref'));if(!merges.includes('H3:AF3')||!merges.includes('B47:D48'))throw Error('La plantilla debe conservar la distribución de Indicadores.xlsx (H3:AF3 y B47:D48)');return {zip,wb,rels,sh,path,doc};}
function resolvePart(base,target){if(!target)throw Error('Relación de archivo incompleta');const parts=(target.startsWith('/')?target.slice(1):base.slice(0,base.lastIndexOf('/')+1)+target).split('/');const out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}
// Coordenadas absolutas en EMU: los offsets de columnas distintas no se pueden restar.
function drawingGrid(doc){
 const format=first(doc,'sheetFormatPr'),columns=all(doc,'col'),rows=new Map(all(doc,'row').map(r=>[+r.getAttribute('r')-1,r]));
 const columnWidth=i=>{const c=columns.find(c=>+c.getAttribute('min')<=i+1&&+c.getAttribute('max')>=i+1);if(c?.getAttribute('hidden')==='1')return 0;const w=Number(c?.getAttribute('width')??format?.getAttribute('defaultColWidth')??8.43);return Math.floor((256*w+Math.floor(128/7))/256*7)*9525;};
 const rowHeight=i=>{const r=rows.get(i);if(r?.getAttribute('hidden')==='1')return 0;return Math.floor(Number(r?.getAttribute('ht')??format?.getAttribute('defaultRowHeight')??15)*4/3)*9525;};
 const sum=(size,index)=>{let n=0;for(let i=0;i<index;i++)n+=size(i);return n;};
 return {rowHeight,y:i=>sum(rowHeight,i),x:m=>sum(columnWidth,+first(m,'col',XDR).textContent)+Number(first(m,'colOff',XDR).textContent),setX(m,x){let col=0;while(col<16383&&x>=columnWidth(col)){x-=columnWidth(col);col++;}first(m,'col',XDR).textContent=col;first(m,'colOff',XDR).textContent=Math.round(x);}};
}
function sheetWriter(doc){let sd=first(doc,'sheetData');if(!sd){sd=el(doc,'sheetData');doc.documentElement.append(sd);}const map=new Map(all(sd,'c').map(c=>[c.getAttribute('r'),c])),rows=new Map(all(sd,'row').map(r=>[+r.getAttribute('r'),r]));return function cell(ref,value,formula,style){let c=map.get(ref);if(!c){const rn=+ref.match(/\d+$/)[0];let row=rows.get(rn);if(!row){row=el(doc,'row',{r:rn});const next=Array.from(sd.children).find(r=>+r.getAttribute('r')>rn);sd.insertBefore(row,next||null);rows.set(rn,row);}c=el(doc,'c',{r:ref});const col=colnum(ref.match(/^[A-Z]+/)[0]);const next=Array.from(row.children).find(x=>colnum(x.getAttribute('r').match(/^[A-Z]+/)[0])>col);row.insertBefore(c,next||null);map.set(ref,c);}if(value===undefined&&formula===undefined){if(style!==undefined)c.setAttribute('s',style);return c;}while(c.firstChild)c.firstChild.remove();c.removeAttribute('t');if(style!==undefined)c.setAttribute('s',style);if(formula){c.append(el(doc,'f',{},formula.replace(/^=/,'')));if(value===null||value===''){c.setAttribute('t','str');c.append(el(doc,'v',{},''));}else c.append(el(doc,'v',{},value));}else if(typeof value==='number'){c.append(el(doc,'v',{},value));}else if(value!==null&&value!==undefined){c.setAttribute('t','inlineStr');const is=el(doc,'is'),t=el(doc,'t',{},String(value));t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');is.append(t);c.append(is);}return c;};}
function newSheet(widths){const d=xml(`<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols/> <sheetData/></worksheet>`);const cols=first(d,'cols');widths.forEach((w,i)=>cols.append(el(d,'col',{min:i+1,max:i+1,width:w,customWidth:1})));return d;}
async function exportExcel(data,state,{mode='indicator'}={}){C.validateBackup(state);const independentData=IndicatorCashModel.indicatorData(IndicatorRemovalModel.indicatorData(state.independentIndicators||{},state.eliminationRecords||[],state.eliminationCashierSales||{},C),C);const {zip,wb,rels,sh,path,doc}=await load(data),styles=xml(await zip.file('xl/styles.xml').async('string')),cts=xml(await zip.file('[Content_Types].xml').async('string'));const write=sheetWriter(doc),periods=C.buildPeriods(state.config,state.rows,state.groupSales,state.purchases,independentData,state.eliminationCashierSales),metric=state.config.metric,scale=C.metricScale(state.config),metricData=C.metricContext(state.rows,state.groupSales,state.purchases,state.eliminationCashierSales);
const fills=first(styles,'fills'),fonts=first(styles,'fonts'),xfs=first(styles,'cellXfs');
function fill(color){const id=fills.children.length,f=el(styles,'fill'),p=el(styles,'patternFill',{patternType:'solid'});p.append(el(styles,'fgColor',{rgb:'FF'+color}),el(styles,'bgColor',{indexed:64}));f.append(p);fills.append(f);fills.setAttribute('count',fills.children.length);return id;}
const fillIds={white:fill('FFFFFF'),good:fill('70AD47'),bad:fill('FF0000'),none:fill('000000'),header:fill('17253B')};
const fontCache=new Map();function font(base,color){const key=base+color;if(fontCache.has(key))return fontCache.get(key);const f=fonts.children[base].cloneNode(true);all(f,'color').forEach(c=>c.remove());f.append(el(styles,'color',{rgb:'FF'+color}));const id=fonts.children.length;fonts.append(f);fonts.setAttribute('count',fonts.children.length);fontCache.set(key,id);return id;}
const styleCache=new Map();function style(base,kind,format){const key=`${base}|${kind}|${format}`;if(styleCache.has(key))return styleCache.get(key);const x=xfs.children[base].cloneNode(true);x.setAttribute('fillId',fillIds[kind]);x.setAttribute('applyFill','1');x.setAttribute('fontId',font(+x.getAttribute('fontId'),['none','header'].includes(kind)?'FFFFFF':'000000'));x.setAttribute('applyFont','1');if(format!==undefined){x.setAttribute('numFmtId',format);x.setAttribute('applyNumberFormat','1');}const id=xfs.children.length;xfs.append(x);xfs.setAttribute('count',xfs.children.length);styleCache.set(key,id);return id;}
let numFmts=first(styles,'numFmts');if(!numFmts){numFmts=el(styles,'numFmts',{count:0});styles.documentElement.insertBefore(numFmts,styles.documentElement.firstChild);}const dateFormat=Math.max(163,...all(numFmts,'numFmt').map(x=>+x.getAttribute('numFmtId')))+1;numFmts.append(el(styles,'numFmt',{numFmtId:dateFormat,formatCode:'dd/mm/yyyy'}));const currencyFormat=dateFormat+1;numFmts.append(el(styles,'numFmt',{numFmtId:currencyFormat,formatCode:'"$"#,##0;-"$"#,##0'}));numFmts.setAttribute('count',numFmts.children.length);
const oneDecimalPercent=currencyFormat+1,oneDecimalNumber=currencyFormat+2;numFmts.append(el(styles,'numFmt',{numFmtId:oneDecimalPercent,formatCode:'0.0%'}),el(styles,'numFmt',{numFmtId:oneDecimalNumber,formatCode:'#,##0.0'}));numFmts.setAttribute('count',numFmts.children.length);
const headStyle=style(0,'header',0),numStyle=style(0,'white',4),intStyle=style(0,'white',3),currencyStyle=style(0,'white',currencyFormat),percentStyle=style(0,'white',10),mcStyle=style(0,'white',9),dateStyle=style(0,'white',dateFormat),textStyle=style(0,'white',0);
const existingNames=new Set(all(wb,'sheet').map(s=>s.getAttribute('name')));function unique(base){let s=base,i=2;while(existingNames.has(s))s=base+' '+i++;existingNames.add(s);return s;}
const rawName=unique('Registro diario'),weekName=unique('Resumen semanal'),purchasesName=unique('Compras semanales'),raw=newSheet([15,17,19,19,19,19,17,19,19,21,18,20,16,20,22,22,22,22,22]),rawWrite=sheetWriter(raw),sorted=[...state.rows].sort((a,b)=>a.date.localeCompare(b.date)),allocation=C.allocatePurchases(state.rows,state.purchases);
const headers=['Ventas día','Atenciones','M. Total','M. Neto','IVA','M. Exento','Atenciones','M. Total','M. Exento','TOTAL','ATENCIONES','COMPRA','MC','TP','SA','UBER','PPD YA','RAPPI','TOTAL APPs'];headers.forEach((h,i)=>rawWrite(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
for(let i=0;i<sorted.length;i++){const r=sorted[i],rn=i+2;rawWrite('A'+rn,dayserial(r.date),undefined,dateStyle);r.values.forEach((v,j)=>rawWrite(String.fromCharCode(66+j)+rn,v,undefined,[0,5].includes(j)?intStyle:numStyle));const t=C.totals([r]);rawWrite('J'+rn,t.sales,`D${rn}+F${rn}+I${rn}`,numStyle);rawWrite('K'+rn,metricData.attendance.records.get(r.id)??null,undefined,intStyle);rawWrite('L'+rn,allocation.get(r.id)??null,undefined,currencyStyle);}const end=Math.max(2,sorted.length+1);raw.documentElement.append(el(raw,'autoFilter',{ref:`A1:S${end}`}));
const qRaw="'"+rawName.replace(/'/g,"''")+"'",rawDates=`${qRaw}!$A$2:$A$${end}`,rawSales=`${qRaw}!$J$2:$J$${end}`,rawVisits=`${qRaw}!$K$2:$K$${end}`;
const starts=new Set();for(const p of periods){const w=C.weekInfo(p.start);for(let s=C.weekStart(w.year,w.week);s<=p.end;s=C.add(s,7))starts.add(s);}for(const r of sorted){const w=C.weekInfo(r.date);starts.add(C.weekStart(w.year,w.week));}for(const start of Object.keys(state.groupSales||{}))starts.add(start);for(const start of metricData.attendance.weeks.keys())starts.add(start);const allWeeks=[...starts].sort();const weekly=newSheet([16,16,16,16,18,23,20,3,19,16,16,16,14,23,20,22,22,22,22,22,22,16]),ww=sheetWriter(weekly),weeklyMap=new Map();['Semana ISO','Desde','Hasta','Jueves ISO','Registros','Venta neta semanal','Atenciones'].forEach((h,i)=>ww(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
const grouped=new Map();for(const r of sorted){const w=C.weekInfo(r.date),s=C.weekStart(w.year,w.week);if(!grouped.has(s))grouped.set(s,[]);grouped.get(s).push(r);}
allWeeks.forEach((s,i)=>{const rn=i+2,w=C.weekInfo(s),rs=grouped.get(s)||[],t=C.totals(rs);weeklyMap.set(s,rn);ww('A'+rn,`${w.year}-S${String(w.week).padStart(2,'0')}`,undefined,textStyle);ww('B'+rn,dayserial(s),undefined,dateStyle);ww('C'+rn,dayserial(C.add(s,6)),`B${rn}+6`,dateStyle);ww('D'+rn,dayserial(C.add(s,3)),`B${rn}+3`,dateStyle);ww('E'+rn,rs.length,`COUNTIFS(${rawDates},">="&B${rn},${rawDates},"<="&C${rn})`,intStyle);for(const [col,range,key] of [['F',rawSales,'sales'],['G',rawVisits,'visits']])ww(col+rn,rs.length?t[key]:'',`IF(E${rn}=0,"",SUMIFS(${range},${rawDates},">="&B${rn},${rawDates},"<="&C${rn}))`,key==='sales'?numStyle:intStyle);});weekly.documentElement.append(el(weekly,'autoFilter',{ref:`A1:G${allWeeks.length+1}`}));
allWeeks.forEach((start,index)=>ww('G'+(index+2),metricData.attendance.weeks.get(start)??null,undefined,intStyle));
// Semanas recortadas a cada mes calendario para los tres promedios mensuales.
const monthBlocks=new Map();let monthlyRow=2;
['Mes calendario','Semana ISO','Desde','Hasta','Registros','Venta neta del tramo','Atenciones del tramo'].forEach((h,i)=>ww(String.fromCharCode(73+i)+'1',h,undefined,headStyle));
for(const p of periods.filter(p=>p.kind==='month')){
 const firstRow=monthlyRow,w=C.weekInfo(p.start);
 for(let monday=C.weekStart(w.year,w.week);monday<=p.end;monday=C.add(monday,7)){
  const rn=monthlyRow++,from=monday<p.start?p.start:monday,until=C.add(monday,6)>p.end?p.end:C.add(monday,6),rs=sorted.filter(r=>r.date>=from&&r.date<=until),t=C.totals(rs),wi=C.weekInfo(monday);
  ww('I'+rn,p.label+' '+p.year,undefined,textStyle);ww('J'+rn,`${wi.year}-S${wi.week}`,undefined,textStyle);
  ww('K'+rn,dayserial(from),undefined,dateStyle);ww('L'+rn,dayserial(until),undefined,dateStyle);
  ww('M'+rn,rs.length,`COUNTIFS(${rawDates},">="&K${rn},${rawDates},"<="&L${rn})`,intStyle);
  for(const [col,range,key] of [['N',rawSales,'sales'],['O',rawVisits,'visits']])ww(col+rn,rs.length?t[key]:'',`IF(M${rn}=0,"",SUMIFS(${range},${rawDates},">="&K${rn},${rawDates},"<="&L${rn}))`,key==='sales'?numStyle:intStyle);
  ww('O'+rn,metricData.attendance.rangeTotal(from,until),undefined,intStyle);
 }
 monthBlocks.set(p.key,[firstRow,monthlyRow-1]);
}
const qWeek="'"+weekName.replace(/'/g,"''")+"'";
const metricCols={tp:'P',sa:'Q',uber:'R',pddya:'S',rappi:'T',apps:'U',mc:'V'};
const monthCols={tp:'F',sa:'G',uber:'H',pddya:'I',rappi:'J',apps:'K',mc:'Q'},sampleCols={sa:'L',uber:'M',pddya:'N',rappi:'O',apps:'P'};
const monthlyName=unique('Resumen mensual'),distributionName=unique('Distribución desglose');
const qMonthly="'"+monthlyName.replace(/'/g,"''")+"'",qDistribution="'"+distributionName.replace(/'/g,"''")+"'";
const monthlySheet=newSheet([16,16,16,23,19,21,23,23,23,23,23,16,16,16,16,16,16]),mw=sheetWriter(monthlySheet),monthlyMap=new Map();
const distributionSheet=newSheet([16,16,18,23,23,23,23,23]),aw=sheetWriter(distributionSheet);
['Fecha','Inicio semana','Proporción','SA','UBER','PPD YA','RAPPI','TOTAL APPs'].forEach((h,i)=>aw(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
metricData.contributions.sort((a,b)=>a.date.localeCompare(b.date)).forEach((part,i)=>{
 const rn=i+2,sourceRow=weeklyMap.get(part.start);aw('A'+rn,dayserial(part.date),undefined,dateStyle);aw('B'+rn,dayserial(part.start),undefined,dateStyle);aw('C'+rn,part.share,undefined,percentStyle);
 for(const [j,key] of ['sa','uber','pddya','rappi','apps'].entries()){const source=`${qWeek}!${metricCols[key]}${sourceRow}`;aw(String.fromCharCode(68+j)+rn,part[key]??'',`IF(ISNUMBER(${source}),${source}*C${rn},"")`,currencyStyle);}
});
const distEnd=Math.max(2,metricData.contributions.length+1),distDates=`${qDistribution}!$A$2:$A$${distEnd}`;
distributionSheet.documentElement.append(el(distributionSheet,'autoFilter',{ref:`A1:H${distEnd}`}));
['Mes','Desde','Hasta','Venta neta','Atenciones','TP','SA','UBER','PPD YA','RAPPI','TOTAL APPs','Semanas SA','Semanas UBER','Semanas PPD YA','Semanas RAPPI','Semanas APPs','MC'].forEach((h,i)=>mw(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
const monthKeys=[...new Set([...metricData.months.keys(),...periods.filter(p=>p.kind==='month').map(p=>p.start.slice(0,7))])].sort();
monthKeys.forEach((month,i)=>{
 const rn=i+2,from=month+'-01',d=C.date(from),until=C.iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0))),value=metricData.months.get(month);monthlyMap.set(month,rn);
 mw('A'+rn,month,undefined,textStyle);mw('B'+rn,dayserial(from),undefined,dateStyle);mw('C'+rn,dayserial(until),undefined,dateStyle);
 for(const [col,key,source] of [['D','sales',rawSales],['E','visits',rawVisits]])mw(col+rn,value?.[key]??'',`IF(COUNTIFS(${rawDates},">="&B${rn},${rawDates},"<="&C${rn})=0,"",SUMIFS(${source},${rawDates},">="&B${rn},${rawDates},"<="&C${rn}))`,key==='visits'?intStyle:currencyStyle);
 mw('E'+rn,value?.visits??null,undefined,intStyle);
 mw('F'+rn,value?.tp??null,value?.tp==null?undefined:`IF(OR(NOT(ISNUMBER(D${rn})),NOT(ISNUMBER(E${rn})),E${rn}=0),"",D${rn}/E${rn})`,currencyStyle);
 const purchaseRange=`${qRaw}!$L$2:$L$${end}`;
 mw('Q'+rn,value?.mc??'',`IF(OR(NOT(ISNUMBER(D${rn})),D${rn}=0,COUNTIFS(${rawDates},">="&B${rn},${rawDates},"<="&C${rn},${purchaseRange},"<>")=0),"",(D${rn}-SUMIFS(${purchaseRange},${rawDates},">="&B${rn},${rawDates},"<="&C${rn}))/D${rn})`,mcStyle);
 for(const [j,key] of ['sa','uber','pddya','rappi','apps'].entries()){
  const col=String.fromCharCode(68+j),source=`${qDistribution}!$${col}$2:$${col}$${distEnd}`,count=value?.samples[key]||0;
  mw(sampleCols[key]+rn,count,undefined,intStyle);
  mw(monthCols[key]+rn,value?.[key]??'',`IF(${sampleCols[key]}${rn}=0,"",SUMIFS(${source},${distDates},">="&B${rn},${distDates},"<="&C${rn}))`,currencyStyle);
 }
});
monthlySheet.documentElement.append(el(monthlySheet,'autoFilter',{ref:`A1:Q${monthKeys.length+1}`}));
write('H3',state.config.title);
const indicatorText=IndicatorTextModel.resolve(state.config,periods,C);
write('B5','Definición: '+indicatorText.definition);write('V5','Fuente: '+indicatorText.source);write('B52','Frecuencia: '+indicatorText.frequency);write('V52','Responsable: '+indicatorText.responsible);
let headerFooter=first(doc,'headerFooter');
if(!headerFooter){headerFooter=el(doc,'headerFooter');const pageSetup=first(doc,'pageSetup');if(pageSetup)pageSetup.after(headerFooter);else doc.documentElement.append(headerFooter);}
let oddHeader=first(headerFooter,'oddHeader');if(!oddHeader){oddHeader=el(doc,'oddHeader');headerFooter.prepend(oddHeader);}
for(const header of ['oddHeader','evenHeader','firstHeader'].map(name=>first(headerFooter,name)).filter(Boolean)){
 const text=IndicatorTextModel.centerHeader(header.textContent,indicatorText.centerHeader);
 if(text.length>255)throw Error('El encabezado de impresión supera el límite de Excel. Acorta el texto central.');
 header.textContent=text;
}
write('AI5',C.metrics[metric].independent?(metric==='negativeSkus'?'Objetivo: 0 %':'Objetivo:'):metric==='mc'?'Objetivo MC:':metric==='visits'?'Objetivo Atenciones:':'Objetivo Neto:');
for(let i=0;i<13;i++){const v=C.scaleLevels(scale)[12-i];write('AT'+(5+i),v);const ref='B'+(8+3*i),c=write(ref);write(ref,v,'AT'+(5+i),style(+(c.getAttribute('s')||0),'white',metric==='mc'?9:C.isPercent(metric)?oneDecimalPercent:oneDecimalNumber));}
// Umbrales por fila interpolados entre los niveles redondeados del eje.
write('AU9','Umbral barra',undefined,headStyle);
for(let row=10;row<=45;row++){
 const relative=Math.max(0,Math.min(36,row-8)),i=Math.min(11,Math.floor(relative/3)),fraction=(relative-i*3)/3;
 const formula=`AT${5+i}+(AT${6+i}-AT${5+i})*${fraction}`;
 write('AU'+row,C.scaleValueAt((44-row)/36,scale),formula,numStyle);
}
// La fila 47 está combinada y contiene el rótulo del eje, no otro valor de escala.
write('B47','Mes / Sem');write('F50',indicatorText.quarterPeriod);write('L50',indicatorText.weekPeriod);
for(let i=0;i<periods.length;i++){const p=periods[i],rn=i+31,col=p.col;write('AR'+rn,p.kind==='month'?p.label:Number(p.label));write('AS'+rn,p.goal);let formula;
if(C.metrics[metric].independent||metric==='visits'){
 formula=undefined;
}else if(p.kind==='week'){
 const source=`${qWeek}!${metricCols[metric]||(metric==='sales'?'F':'G')}${weeklyMap.get(p.start)}`;formula=`IF(ISNUMBER(${source}),${source},"")`;
}else if(C.extraMetrics.includes(metric)||metric==='mc'){
 const mr=monthlyMap.get(p.start.slice(0,7)),source=`${qMonthly}!${monthCols[metric]}${mr}`;
 formula=metric==='mc'?`IF(ISNUMBER(${source}),${source},"")`:metric==='tp'?`IF(ISNUMBER(${source}),ROUND(${source},2),"")`:`IF(${qMonthly}!${sampleCols[metric]}${mr}=0,"",ROUND(${source}/${qMonthly}!${sampleCols[metric]}${mr},2))`;
}else{
 const [firstRow,lastRow]=monthBlocks.get(p.key),counts=`${qWeek}!$M$${firstRow}:$M$${lastRow}`,values=`${qWeek}!$${metric==='sales'?'N':'O'}$${firstRow}:$${metric==='sales'?'N':'O'}$${lastRow}`;
 formula=`IF(COUNTIF(${counts},">0")=0,"",ROUND(SUM(${values})/COUNTIF(${counts},">0"),2))`;
}

write('AT'+rn,p.value,formula);write(col+'47',p.kind==='month'?p.label:Number(p.label));write(col+'9',p.goal,`IF(ISNUMBER(AS${rn}),AS${rn},"")`);write(col+'20',p.value,`IF(ISNUMBER(AT${rn}),AT${rn},"")`);if(metric==='mc'||C.metrics[metric].independent)write(col+'29',null);else write(col+'29',p.value!==null&&p.goal!==null&&p.goal!==0?p.value/p.goal:'',`IF(OR(NOT(ISNUMBER(${col}20)),NOT(ISNUMBER(${col}9)),${col}9=0),"",${col}20/${col}9)`);
for(let row=8;row<=45;row++){const cell=write(col+row),base=+(cell.getAttribute('s')||0),threshold=C.scaleValueAt((44-row)/36,scale);const kind=row>=10&&p.value!==null&&(row>=44||p.value>=threshold)?C.status(p):'white';const numericFormat=metric==='removedSkus'?oneDecimalPercent:metric==='negativeSkus'?10:['mc','cashClosings'].includes(metric)?9:metric==='visits'||C.metrics[metric].unit==='count'?3:currencyFormat;write(col+row,undefined,undefined,style(base,kind==='empty'?'white':kind,row===9||row===20?numericFormat:undefined));}}
// Cierres: cantidades sobre el resultado porcentual; no se muestra alcance de la meta.
if(metric==='cashClosings')for(const period of periods){
 write(period.col+'13',period.cash?'Malos: '+period.cash.bad:'Malos: —');
 write(period.col+'16',period.cash?'Total: '+period.cash.total:'Total: —');
}
// Sustituye las líneas de objetivo, manteniendo el logo y el resto de dibujos.
const sheetRelPath=path.replace(/([^/]+)$/,'_rels/$1.rels');if(zip.file(sheetRelPath)){const dr=xml(await zip.file(sheetRelPath).async('string')),drawingRel=all(dr,'Relationship',REL).find(r=>r.getAttribute('Type').endsWith('/drawing'));if(drawingRel){const drawingPath=resolvePart(path,drawingRel.getAttribute('Target')),drawing=xml(await zip.file(drawingPath).async('string')),grid=drawingGrid(doc);for(const anchor of [...drawing.documentElement.children]){const nv=first(anchor,'cNvPr',XDR),name=nv?.getAttribute('name')||'';const match=name.match(/^cn_(\d+)$/);if(!match)continue;const p=periods[+match[1]-1];if(!p)continue;if(p.goal===null){anchor.remove();continue;}const proportion=C.scalePosition(p.goal,scale);const rowPos=43.5-proportion*36,ri=Math.floor(rowPos),frac=rowPos-ri,rowOff=Math.round(frac*grid.rowHeight(ri));for(const marker of ['from','to']){const m=first(anchor,marker,XDR);first(m,'row',XDR).textContent=ri;first(m,'rowOff',XDR).textContent=rowOff;}
// Una marca corta en el margen evita tachar el resultado o su porcentaje.
const from=first(anchor,'from',XDR),to=first(anchor,'to',XDR),start=grid.x(from),end=grid.x(to);
const width=Math.max(1,Math.round((end-start)*(ri===19||ri===28?0.12:1)));
grid.setX(from,start);grid.setX(to,start+width);
// El anclaje y la transformación de la forma deben describir la misma línea.
const xf=first(anchor,'xfrm',A),off=xf&&first(xf,'off',A),ext=xf&&first(xf,'ext',A);
if(off){off.setAttribute('x',start);off.setAttribute('y',grid.y(ri)+rowOff);}
if(ext){ext.setAttribute('cx',width);ext.setAttribute('cy',0);}
const ln=first(anchor,'ln',A);if(ln){all(ln,'solidFill',A).forEach(x=>x.remove());const f=el(drawing,'a:solidFill',{},undefined,A);f.append(el(drawing,'a:srgbClr',{val:'000000'},undefined,A));ln.prepend(f);}
}zip.file(drawingPath,serialize(drawing));}}
// Reglas dinámicas para los colores de las barras.
let dxfs=first(styles,'dxfs');if(!dxfs){dxfs=el(styles,'dxfs',{count:0});const before=first(styles,'tableStyles')||first(styles,'colors')||first(styles,'extLst');styles.documentElement.insertBefore(dxfs,before||null);}const dxfIds={};for(const [kind,color] of [['good','70AD47'],['bad','FF0000'],['none','000000'],['white','FFFFFF']]){const d=el(styles,'dxf'),f=el(styles,'fill'),p=el(styles,'patternFill',{patternType:'solid'});p.append(el(styles,'fgColor',{rgb:'FF'+color}));f.append(p);const ft=el(styles,'font');ft.append(el(styles,'color',{rgb:kind==='none'?'FFFFFFFF':'FF000000'}));d.append(ft,f);dxfIds[kind]=dxfs.children.length;dxfs.append(d);}dxfs.setAttribute('count',dxfs.children.length);
const cfBefore=Array.from(doc.documentElement.children).find(x=>['dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','drawing','extLst'].includes(x.localName));let priority=1+Math.max(0,...all(doc,'cfRule').map(x=>+x.getAttribute('priority')));
for(const p of periods){const col=p.col,cf=el(doc,'conditionalFormatting',{sqref:`${col}10:${col}45`}),active=`AND(ISNUMBER(${col}$20),OR(ROW()>=44,${col}$20>=$AU10))`;
for(const [kind,formula] of [['none',`AND(${active},NOT(ISNUMBER(${col}$9)))`],['good',`AND(${active},ISNUMBER(${col}$9),${col}$20>=${col}$9)`],['bad',`AND(${active},ISNUMBER(${col}$9),${col}$20<${col}$9)`],['white','TRUE']]){const rule=el(doc,'cfRule',{type:'expression',dxfId:dxfIds[kind],priority:priority++,stopIfTrue:1});rule.append(el(doc,'formula',{},formula));cf.append(rule);}doc.documentElement.insertBefore(cf,cfBefore||null);}
const generatedSheets=[];const sheetNodes=first(wb,'sheets');let sheetId=Math.max(...all(wb,'sheet').map(s=>+s.getAttribute('sheetId')));const usedPaths=new Set(Object.keys(zip.files));function attach(name,sheet){generatedSheets.push({name,doc:sheet});let i=1;while(usedPaths.has(`xl/worksheets/sheet${i}.xml`))i++;const target=`worksheets/sheet${i}.xml`;usedPaths.add('xl/'+target);let j=1;const used=new Set(all(rels,'Relationship',REL).map(r=>r.getAttribute('Id')));while(used.has('rId'+j))j++;const rid='rId'+j,s=el(wb,'sheet',{name,sheetId:++sheetId});s.setAttributeNS(R,'r:id',rid);sheetNodes.append(s);rels.documentElement.append(el(rels,'Relationship',{Id:rid,Type:R+'/worksheet',Target:target},undefined,REL));cts.documentElement.append(el(cts,'Override',{PartName:'/xl/'+target,ContentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'},undefined,CT));zip.file('xl/'+target,serialize(sheet));}
// Compra semanal y conciliación del reparto diario, incluyendo semanas aún sin ventas.
const purchaseSheet=newSheet([18,16,16,21,21,21,21,23,16]),pw=sheetWriter(purchaseSheet),rawPurchases=`${qRaw}!$L$2:$L$${end}`;
['Semana ISO','Inicio','Final','Compra','Días con registros','Distribuido','Pendiente de reparto','Venta neta semanal','MC'].forEach((h,i)=>pw(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
const purchaseStarts=[...new Set([...allWeeks,...Object.keys(state.purchases||{})])].sort(),purchaseRowMap=new Map(),margins=C.weeklyMargins(state.rows,state.purchases);
purchaseStarts.forEach((start,i)=>{
 const rn=i+2,w=C.weekInfo(start),rows=grouped.get(start)||[],amount=state.purchases?.[start],distributed=C.purchaseTotal(rows,allocation);purchaseRowMap.set(start,rn);
 pw('A'+rn,`${w.year}-S${String(w.week).padStart(2,'0')}`,undefined,textStyle);
 pw('B'+rn,dayserial(start),undefined,dateStyle);pw('C'+rn,dayserial(C.add(start,6)),`B${rn}+6`,dateStyle);
 pw('D'+rn,amount??null,undefined,currencyStyle);pw('E'+rn,new Set(rows.map(r=>r.date)).size,undefined,intStyle);
 pw('F'+rn,amount===undefined?'':distributed,`IF(ISNUMBER(D${rn}),SUMIFS(${rawPurchases},${rawDates},">="&B${rn},${rawDates},"<="&C${rn}),"")`,currencyStyle);
 pw('G'+rn,amount===undefined?'':C.round(amount-distributed),`IF(ISNUMBER(D${rn}),ROUND(D${rn}-F${rn},2),"")`,currencyStyle);
 pw('H'+rn,rows.length?C.totals(rows).sales:'',`IF(E${rn}=0,"",SUMIFS(${rawSales},${rawDates},">="&B${rn},${rawDates},"<="&C${rn}))`,currencyStyle);
 pw('I'+rn,margins.get(start)?.mc??'',`IF(OR(NOT(ISNUMBER(D${rn})),NOT(ISNUMBER(H${rn})),H${rn}=0),"",(H${rn}-D${rn})/H${rn})`,mcStyle);
});
purchaseSheet.documentElement.append(el(purchaseSheet,'autoFilter',{ref:`A1:I${purchaseStarts.length+1}`}));
const qPurchases="'"+purchasesName.replace(/'/g,"''")+"'";
sorted.forEach((r,i)=>{const w=C.weekInfo(r.date),start=C.weekStart(w.year,w.week),source=`${qPurchases}!I${purchaseRowMap.get(start)}`;rawWrite('M'+(i+2),margins.get(start)?.mc??'',`IF(ISNUMBER(${source}),${source},"")`,mcStyle);});
ww('V1','MC',undefined,headStyle);
allWeeks.forEach((start,i)=>{const source=`${qPurchases}!I${purchaseRowMap.get(start)}`;ww('V'+(i+2),margins.get(start)?.mc??'',`IF(ISNUMBER(${source}),${source},"")`,mcStyle);});
attach(purchasesName,purchaseSheet);
const groupRefs=new Map();
// El desglose no se suma nuevamente a las ventas del registro diario.
const groupStarts=Object.keys(state.groupSales||{}).sort();
if(groupStarts.length){
 const M=IndicatorGroupSalesModel,detailName=unique('Ventas por grupos'),summaryName=unique('Resumen ventas por grupos'),detail=newSheet([12,12,16,16,14,12,46,19,23,23]),summary=newSheet([12,12,16,16,20,23,23,23,23,23,23,24,23]),dw=sheetWriter(detail),sw=sheetWriter(summary);
 ['Año ISO','Semana','Inicio','Final','Tipo','Grupo','Nombre','Cantidad','Venta Bruta','Venta Neta'].forEach((h,i)=>dw(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
 ['Año ISO','Semana','Inicio','Final','Cantidad informada','Bruto categorías','Neto categorías','Bruto APPs','Neto APPs','Total Bruto','Total Neto','Venta neta registro','Diferencia neta'].forEach((h,i)=>sw(String.fromCharCode(65+i)+'1',h,undefined,headStyle));
 let detailRow=2;
 for(const start of groupStarts){const w=C.weekInfo(start),data=M.normalizeWeek(state.groupSales[start],C),refs={sa:[],uber:[],pddya:[],rappi:[],apps:[]};groupRefs.set(start,refs);
  for(const group of [...data.groups.map(r=>({...r,type:'Grupo'})),...data.apps.map(r=>({...r,type:'APP',code:null,quantity:null}))]){
   const rn=detailRow++;dw('A'+rn,w.year,undefined,intStyle);dw('B'+rn,w.week,undefined,intStyle);dw('C'+rn,dayserial(start),undefined,dateStyle);dw('D'+rn,dayserial(C.add(start,6)),`C${rn}+6`,dateStyle);
   dw('E'+rn,group.type,undefined,textStyle);dw('F'+rn,group.code,undefined,intStyle);dw('G'+rn,group.name,undefined,textStyle);dw('H'+rn,group.quantity,undefined,numStyle);dw('I'+rn,group.amount,undefined,currencyStyle);
   const reference="'"+detailName.replace(/'/g,"''")+"'!J"+rn,name=group.name.trim().toUpperCase();
   if(group.type==='Grupo'&&(group.code===25||group.code===0&&name==='SERVICIOS ALIMENTICIOS'))refs.sa.push(reference);
   if(group.type==='APP'){
    refs.apps.push(reference);const appKey={UBER:'uber','PDD YA':'pddya','PPD YA':'pddya','PEDIDOS YA':'pddya',RAPPI:'rappi'}[name.replace(/^VENTAS?\s+/,'')];if(appKey)refs[appKey].push(reference);
   }
   dw('J'+rn,M.net(group.amount,group.code,group.name),`IF(AND(E${rn}="Grupo",OR(F${rn}=20,AND(F${rn}=0,UPPER(TRIM(G${rn}))="CIGARROS"))),I${rn},I${rn}/1.19)`,currencyStyle);
  }
 }
 const last=Math.max(2,detailRow-1),qDetail="'"+detailName.replace(/'/g,"''")+"'",dates=`${qDetail}!$C$2:$C$${last}`,types=`${qDetail}!$E$2:$E$${last}`,quantities=`${qDetail}!$H$2:$H$${last}`,gross=`${qDetail}!$I$2:$I$${last}`,net=`${qDetail}!$J$2:$J$${last}`;
 groupStarts.forEach((start,i)=>{
  const rn=i+2,w=C.weekInfo(start),total=M.totals(state.groupSales[start]),rs=grouped.get(start)||[],sale=C.totals(rs).sales;
  sw('A'+rn,w.year,undefined,intStyle);sw('B'+rn,w.week,undefined,intStyle);sw('C'+rn,dayserial(start),undefined,dateStyle);sw('D'+rn,dayserial(C.add(start,6)),`C${rn}+6`,dateStyle);
  sw('E'+rn,total.quantity??'',`IF(COUNTIFS(${dates},C${rn},${quantities},"<>")=0,"",SUMIF(${dates},C${rn},${quantities}))`,numStyle);
  for(const [col,key,type,range] of [['F','groupGross','Grupo',gross],['G','groupNet','Grupo',net],['H','appGross','APP',gross],['I','appNet','APP',net]])sw(col+rn,total[key],`SUMIFS(${range},${dates},C${rn},${types},"${type}")`,currencyStyle);
  sw('J'+rn,total.amount,`F${rn}+H${rn}`,currencyStyle);sw('K'+rn,total.net,`G${rn}+I${rn}`,currencyStyle);
  sw('L'+rn,rs.length?sale:'',`IF(COUNTIFS(${rawDates},">="&C${rn},${rawDates},"<="&D${rn})=0,"",SUMIFS(${rawSales},${rawDates},">="&C${rn},${rawDates},"<="&D${rn}))`,currencyStyle);
  sw('M'+rn,rs.length?total.net-sale:'',`IF(ISNUMBER(L${rn}),K${rn}-L${rn},"")`,currencyStyle);
 });
 detail.documentElement.append(el(detail,'autoFilter',{ref:`A1:J${last}`}));summary.documentElement.append(el(summary,'autoFilter',{ref:`A1:M${groupStarts.length+1}`}));
 attach(detailName,detail);attach(summaryName,summary);
}
// Las seis métricas usan las mismas semanas y cálculos que la pantalla.
for(const key of C.extraMetrics)ww(metricCols[key]+'1',C.metricLabels[key],undefined,headStyle);
allWeeks.forEach((start,i)=>{
 const rn=i+2,values=metricData.weeks.get(start),refs=groupRefs.get(start);
 ww('P'+rn,values?.tp??'',`IF(OR(NOT(ISNUMBER(F${rn})),NOT(ISNUMBER(G${rn})),G${rn}=0),"",F${rn}/G${rn})`,currencyStyle);
 for(const key of ['sa','uber','pddya','rappi','apps'])ww(metricCols[key]+rn,values?.[key]??'',refs?.[key].length?`SUM(${refs[key].join(',')})`:undefined,currencyStyle);
});
sorted.forEach((r,i)=>{
 const rn=i+2,start=metricData.startFor(r.date),sourceRow=weeklyMap.get(start),values=metricData.weeks.get(start);
 C.extraMetrics.forEach((key,j)=>{const source=`${qWeek}!${metricCols[key]}${sourceRow}`;rawWrite(String.fromCharCode(78+j)+rn,values?.[key]??'',`IF(ISNUMBER(${source}),${source},"")`,currencyStyle);});
});
attach(rawName,raw);attach(weekName,weekly);attach(monthlyName,monthlySheet);attach(distributionName,distributionSheet);
// Los datos propios se exportan en una hoja aparte, sin mezclarlos con ventas o compras.
const ownData=independentData;
if(Object.keys(ownData).length||Object.keys(C.independentModel.catalog).some(key=>Object.keys(state.config.goals?.[key]||{}).length)){
 const independentSheet=newSheet([38,15,12,18,16,16,18,18,19,19,25,18,18,18]),iw=sheetWriter(independentSheet);
 ['Indicador','Tipo de período','Año','Período','Desde','Hasta','SKUs negativos','SKUs vigentes','Resultado','Objetivo','Criterio de cumplimiento','Cierres buenos','Cierres malos','Total de cierres'].forEach((name,i)=>iw(String.fromCharCode(65+i)+'1',name,undefined,headStyle));
 let row=2;
 for(const [key,definition] of Object.entries(C.independentModel.catalog)){
  const keys=[...new Set([...Object.keys(ownData[key]||{}),...Object.keys(state.config.goals?.[key]||{})])].sort();
  for(const periodKey of keys){
   const [kind,year,part]=periodKey.split(/[:-]/),month=kind==='m',from=month?`${year}-${part.padStart(2,'0')}-01`:C.weekStart(+year,+part),until=month?C.iso(new Date(Date.UTC(+year,+part,0))):C.add(from,6);
   const record=ownData[key]?.[periodKey],value=C.independentModel.result(key,record),goal=Object.hasOwn(definition,'fixedGoal')?definition.fixedGoal:key==='cashClosings'?IndicatorObjectivesModel.cashGoal(state.config,periodKey):key==='removedSkus'&&state.config.removalGoalsVersion!==1?null:state.config.goals?.[key]?.[periodKey]??null,direction=definition.direction||state.config.independentDirections?.[key]||(key==='removedSkus'?'lower':'higher');
   const rn=row++,format=key==='negativeSkus'?percentStyle:key==='cashClosings'?mcStyle:key==='removedSkus'?style(0,'white',oneDecimalPercent):intStyle;
   iw('A'+rn,definition.label,undefined,textStyle);iw('B'+rn,month?'Mes':'Semana',undefined,textStyle);iw('C'+rn,+year,undefined,intStyle);iw('D'+rn,month?C.months[+part-1]:'S'+part,undefined,textStyle);
   iw('E'+rn,dayserial(from),undefined,dateStyle);iw('F'+rn,dayserial(until),undefined,dateStyle);
   iw('G'+rn,record?.negative??null,undefined,intStyle);iw('H'+rn,record?.active??null,undefined,intStyle);
   iw('I'+rn,value??'',key==='cashClosings'&&record?.source!=='cash-month-average'?`IF(OR(NOT(ISNUMBER(L${rn})),N${rn}=0),"",L${rn}/N${rn})`:key==='negativeSkus'?`IF(OR(NOT(ISNUMBER(G${rn})),NOT(ISNUMBER(H${rn})),H${rn}=0),"",G${rn}/H${rn})`:undefined,format);
   iw('J'+rn,goal,undefined,format);iw('K'+rn,{lower:'Menor o igual',higher:'Mayor o igual',above:'Mayor que',equal:'Igual'}[direction],undefined,textStyle);
   if(key==='cashClosings'){
    const totals=IndicatorCashModel.totals(record);
    iw('L'+rn,totals?.good??null,undefined,intStyle);iw('M'+rn,totals?.bad??null,undefined,intStyle);
    iw('N'+rn,totals?.total??'',`IF(OR(NOT(ISNUMBER(L${rn})),NOT(ISNUMBER(M${rn}))),"",L${rn}+M${rn})`,intStyle);
   }
  }
 }
 independentSheet.documentElement.append(el(independentSheet,'autoFilter',{ref:`A1:N${Math.max(1,row-1)}`}));
 attach(unique('Indicadores independientes'),independentSheet);
}
// Desglose de cierres por cajero, independiente del resto de los datos.
const cashRecords=Object.entries(state.independentIndicators?.cashClosings||{}).filter(([,record])=>Array.isArray(record.cashiers));
if(cashRecords.length){
 const detail=newSheet([14,16,16,16,38,16,16,18]),cw=sheetWriter(detail);let rn=2;
 ['Tipo de período','Período','Desde','Hasta','Cajero','Buenos','Malos','Total cierres'].forEach((name,i)=>cw(String.fromCharCode(65+i)+'1',name,undefined,headStyle));
 for(const [key,record] of cashRecords.sort(([a],[b])=>a.localeCompare(b))){
  const [kind,year,part]=key.split(/[:-]/),month=kind==='m',from=month?`${year}-${part.padStart(2,'0')}-01`:C.weekStart(+year,+part),until=month?C.iso(new Date(Date.UTC(+year,+part,0))):C.add(from,6);
  for(const cashier of record.cashiers){
   cw('A'+rn,month?'Mes':'Semana',undefined,textStyle);cw('B'+rn,month?C.months[+part-1]+' '+year:'S'+part+' '+year,undefined,textStyle);
   cw('C'+rn,dayserial(from),undefined,dateStyle);cw('D'+rn,dayserial(until),undefined,dateStyle);cw('E'+rn,cashier.name,undefined,textStyle);
   cw('F'+rn,cashier.good,undefined,intStyle);cw('G'+rn,cashier.bad,undefined,intStyle);cw('H'+rn,cashier.good+cashier.bad,`F${rn}+G${rn}`,intStyle);rn++;
  }
 }
 detail.documentElement.append(el(detail,'autoFilter',{ref:`A1:H${rn-1}`}));attach(unique('Cierres por cajero'),detail);
}
// Clear presentation values only after the bars and goal markers have been calculated.
if(mode==='indicator'&&indicatorText.hideValues===true){
 for(const cell of all(doc,'c')){
  const ref=cell.getAttribute('r'),match=ref?.match(/^([A-Z]+)(\d+)$/);if(!match)continue;
  const column=colnum(match[1]),row=Number(match[2]);
  if((column===2&&row>=8&&row<=44)||(column>=6&&column<=37&&(row===9||row===20)))write(ref,null);
 }
}
return IndicatorWorkbookExport.create({zip,sourcePath:path,sourceDoc:doc,styles,sourceRelationships:rels,mode,
  sheets:generatedSheets,indicatorName:C.metrics[metric].title});
}
async function exportMany(data,state,metrics,onProgress=()=>{}){
 const keys=[...new Set(metrics)];if(!keys.length)throw Error('Selecciona al menos un indicador.');
 if(keys.some(key=>!Object.hasOwn(C.metrics,key)||['uber','pddya','rappi'].includes(key)))throw Error('La selección contiene un indicador no disponible.');
 const entries=[];
 for(const [index,metric] of keys.entries()){
  onProgress(`Preparando ${index+1} de ${keys.length}: ${C.metrics[metric].label}…`);
  await new Promise(resolve=>setTimeout(resolve,0));
  const config={...state.config,metric,title:metric===state.config.metric?state.config.title:state.config.metricTitles?.[metric]||C.metrics[metric].title};
  entries.push({name:config.title,blob:await exportExcel(data,{...state,config},{mode:'indicator'})});
 }
 onProgress('Reuniendo los indicadores en un solo libro…');
 return IndicatorWorkbookMerge.merge(entries);
}
window.IndicatorExcel={validate:async data=>{const x=await load(data);return {name:x.sh.getAttribute('name')};},export:exportExcel,exportMany,exportData:(data,state)=>exportExcel(data,state,{mode:'data'})};
})();
