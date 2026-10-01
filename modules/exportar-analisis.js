/* Exportación local del comparativo. PNG en canvas y XLSX real mediante JSZip. */
(function(){
 'use strict';
 const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const pct=new Intl.NumberFormat('es-CL',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1});
 const mcPercent=new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:0});
 const number=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2});
 const colors={bg:'#151515',panel:'#242424',line:'#424242',text:'#f2f2f2',muted:'#bcbcbc',green:'#91c969',red:'#ff7777',blue:'#98afd5'};
 const fmt=(v,type='money')=>v===null||v===undefined?'—':type==='mc'?mcPercent.format(v):type==='percent'?pct.format(v):type==='number'?number.format(v):money.format(v);
 function growth(now,before){
  if(now===null||before===null)return {value:null,label:now===null?'—':'Sin base'};
  if(before===0&&now!==0)return {value:null,label:'Base 0'};
  const value=before===0?0:(now-before)/Math.abs(before);
  return {value,label:(value>0?'▲ +':value<0?'▼ ':'')+pct.format(value)};
 }
 function filename(data){return `${data.detailOnly?'Desglose-grupos-apps':'Comparativo'}-${data.weeks[0].start}-a-${data.weeks.at(-1).end}`;}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 function page(){
  const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=1800;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador no permite crear imágenes.');ctx.scale(2,2);ctx.fillStyle=colors.bg;ctx.fillRect(0,0,1600,900);
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,width=1500,size=16,color=colors.text,align='left',bold=false){
   let s=String(value??'');ctx.font=`${bold?600:400} ${size}px Arial`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;
   if(ctx.measureText(s).width>width){while(s.length&&ctx.measureText(s+'…').width>width)s=s.slice(0,-1);s+='…';}
   ctx.fillText(s,x,y);
  }
  function line(x1,y1,x2,y2,color=colors.line){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  return {canvas,ctx,rect,text,line};
 }
 function heading(p,data,title,subtitle){p.text(title,40,44,1520,27,colors.text,'left',true);p.text(data.range,40,80,1520,16,colors.muted);p.text(subtitle,40,110,1520,13,colors.muted);}
 function footer(p,data,label){p.line(40,850,1560,850);p.text(label,40,874,1250,12,colors.muted);p.text(data.weeks.length+' semanas',1560,874,200,12,colors.muted,'right');}
 function summaryImage(data){
  const p=page();heading(p,data,'Análisis de ventas por grupo','Resumen del período · '+(data.basis==='gross'?'Gráficos en venta bruta':'Gráficos en venta neta'));
  data.cards.forEach((card,i)=>{const x=40+i*385;p.rect(x,140,365,95,colors.panel);p.text(card.label,x+16,162,333,13,colors.muted);p.text(card.value,x+16,194,333,26,card.tone==='up'?colors.green:card.tone==='down'?colors.red:colors.text,'left',true);p.text(card.note,x+16,220,333,11,colors.muted);});
  p.rect(40,254,850,315,colors.panel);p.text(data.chartName,60,279,810,18,colors.text,'left',true);
  const values=data.chartValues,valid=values.filter(Number.isFinite),left=122,right=865,top=315,bottom=498;
  if(valid.length){
   const low=Math.min(0,...valid),high=Math.max(0,...valid),span=high-low||1,y=v=>bottom-(v-low)/span*(bottom-top),zero=y(0),step=(right-left)/data.weeks.length;
   for(let i=0;i<=4;i++){const value=low+span*i/4,yy=y(value);p.line(left,yy,right,yy);p.text(Math.abs(value)>=1e6?number.format(value/1e6)+' M':number.format(value/1000)+' mil',110,yy,65,11,colors.muted,'right');}
   data.weeks.forEach((week,i)=>{const x=left+step*(i+.5),value=values[i];if(value!==null){const yy=y(value);p.rect(x-25,Math.min(yy,zero),50,Math.max(2,Math.abs(yy-zero)),value<0?colors.red:i===values.length-1?colors.green:colors.blue);p.text(fmt(value),x,value<0?yy+13:yy-12,step-8,13,colors.text,'center',true);}else p.text('Sin datos',x,zero-14,step-8,12,colors.muted,'center');p.text(week.label,x,527,step-8,12,colors.text,'center');p.text(week.dates,x,548,step-8,10,colors.muted,'center');});
  }else p.text('Sin datos para el gráfico seleccionado',465,415,760,18,colors.muted,'center');
  p.rect(910,254,650,315,colors.panel);p.text('Grupos con mayor venta del período',930,279,610,18,colors.text,'left',true);
  const ranking=data.ranking.slice(0,8),max=Math.max(1,...ranking.map(r=>Math.abs(r.amount)));
  ranking.forEach((r,i)=>{const y=311+i*30;p.text((i+1)+'. '+r.name,930,y,420,11,colors.text);p.text(fmt(r.amount),1540,y,160,12,colors.text,'right',true);p.rect(930,y+10,610,4,'#3a3a3a');p.rect(930,y+10,610*Math.abs(r.amount)/max,4,r.amount<0?colors.red:colors.green);});
  if(!ranking.length)p.text('Sin categorías registradas',1235,406,610,17,colors.muted,'center');
  p.text('Resumen semanal del registro',40,602,1520,18,colors.text,'left',true);
  const nameWidth=350,cellWidth=(1520-nameWidth)/data.weeks.length;
  p.rect(40,621,1520,30,'#34422c');data.weeks.forEach((w,i)=>p.text(w.label,40+nameWidth+(i+.5)*cellWidth,636,cellWidth-16,13,colors.text,'center',true));
  data.summary.forEach((row,i)=>{const y=652+i*33;p.rect(40,y,1520,32,i%2?'#252525':'#202020');p.text(row.label,52,y+16,nameWidth-24,12,colors.text);row.values.forEach((value,j)=>p.text(fmt(value,row.format),40+nameWidth+(j+1)*cellWidth-14,y+16,cellWidth-28,14,colors.text,'right'));});
  footer(p,data,'Totales del desglose completo · Cigarros: participación en venta neta, no margen comercial');return p.canvas;
 }
 function comparisonImage(data,entries,index,pages){
  const p=page();heading(p,data,data.detailOnly?'Desglose de grupos y APPs':'Comparativo de ventas por grupo',`${data.filterLabel} · Lámina ${index+1} de ${pages} · Crecimiento neto vs semana anterior`);
  const left=40,codeWidth=44,nameWidth=264,shareWidth=80,weekWidth=(1520-codeWidth-nameWidth-shareWidth)/data.weeks.length;
  const headerTop=137,headerHeight=58,rowTop=headerTop+headerHeight,rowHeight=34;
  const widths=data.quantity?[weekWidth*.16,weekWidth*.28,weekWidth*.28,weekWidth*.28]:[weekWidth*.35,weekWidth*.35,weekWidth*.30];
  const labels=data.quantity?['Cant.','Bruto','Neto','Crec.']:['Bruto','Neto','Crec.'];
  p.rect(left,headerTop,1520,headerHeight,'#303030');p.text('Grupo',left+codeWidth/2,headerTop+29,codeWidth-4,11,colors.text,'center',true);p.text('Descripción',left+codeWidth+10,headerTop+29,nameWidth-20,13,colors.text,'left',true);
  data.weeks.forEach((w,i)=>{const x=left+codeWidth+nameWidth+i*weekWidth;p.rect(x,headerTop,weekWidth-1,headerHeight,w.present?'#34422c':'#393939');p.text(w.label+' · '+w.dates,x+weekWidth/2,headerTop+15,weekWidth-12,11,colors.text,'center',true);let offset=x;labels.forEach((label,j)=>{p.text(label,offset+widths[j]/2,headerTop+43,widths[j]-8,11,colors.muted,'center');offset+=widths[j];});});
  p.text('% última',1560-shareWidth/2,headerTop+19,shareWidth-8,11,colors.text,'center');p.text('semana',1560-shareWidth/2,headerTop+39,shareWidth-8,11,colors.text,'center');
  function drawRow(entry,y,total=false){
   p.rect(left,y,1520,rowHeight-1,total?'#303b2a':'#232323');
   const shade=entry.sa?'#403b29':entry.cigarettes?'#293545':entry.type==='app'?'#382f40':total?'#303b2a':'#292929';p.rect(left,y,codeWidth+nameWidth,rowHeight-1,shade);
   p.text(entry.code??'',left+codeWidth/2,y+17,codeWidth-6,10,colors.muted,'center');p.text(entry.name,left+codeWidth+8,y+17,nameWidth-16,11,colors.text,'left',total);
   entry.values.forEach((v,i)=>{
    let x=left+codeWidth+nameWidth+i*weekWidth;const g=growth(v?.net??null,entry.previous[i]?.net??null);
    const vals=data.quantity?[fmt(v?.quantity,'number'),fmt(v?.gross),fmt(v?.net),g.label]:[fmt(v?.gross),fmt(v?.net),g.label];
    vals.forEach((value,j)=>{
     const isGrowth=j===vals.length-1,color=isGrowth&&g.value!==null?(g.value>0?colors.green:g.value<0?colors.red:colors.muted):colors.text;
     if(isGrowth&&g.value!==null){const width=Math.min(.46,Math.abs(g.value)*.46)*widths[j],center=x+widths[j]/2;p.rect(g.value<0?center-width:center,y+4,width,rowHeight-9,g.value<0?'#592e2e':'#344c2b');}
     p.text(value,x+widths[j]-6,y+17,widths[j]-12,11,color,'right',isGrowth||total);x+=widths[j];
    });p.line(x,y,x,y+rowHeight,'#444444');
   });
   p.text(fmt(entry.share,'percent'),1553,y+17,shareWidth-12,11,colors.text,'right',total);
  }
  entries.forEach((entry,i)=>drawRow(entry,rowTop+i*rowHeight));
  if(!entries.length)p.text('No hay filas para el filtro seleccionado',800,rowTop+35,1400,18,colors.muted,'center');
  const totalsTop=Math.max(rowTop+Math.max(1,entries.length)*rowHeight+10,690);
  data.totals.forEach((entry,i)=>drawRow(entry,totalsTop+i*rowHeight,true));
  footer(p,data,'Totales del desglose completo · — sin datos · Sin base: semana anterior ausente · Base 0: porcentaje no calculable');return p.canvas;
 }
 function png(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>{canvas.width=1;canvas.height=1;blob?resolve(blob):reject(Error('No se pudo crear la imagen PNG.'));},'image/png'));}
 const pngUrls=[];
 function preparePngDownloads(){
  const links=document.getElementById('analysisPngFiles');if(links)links.replaceChildren();
  pngUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));
 }
 function downloadPng(blob,name){
  const links=document.getElementById('analysisPngFiles');
  if(!links){download(blob,name);return;}
  const url=URL.createObjectURL(blob),link=document.createElement('a');pngUrls.push(url);
  link.href=url;link.download=name;link.textContent='↓ '+name;links.append(link);link.click();
 }
 async function exportPng(data,summaryOnly){
  preparePngDownloads();
  if(summaryOnly&&!data.detailOnly){downloadPng(await png(summaryImage(data)),filename(data)+'-resumen.png');return 'Resumen PNG listo.';}
  const size=14,pages=Math.max(1,Math.ceil(data.entries.length/size));
  if(!data.detailOnly)downloadPng(await png(summaryImage(data)),filename(data)+'-01-resumen.png');
  for(let i=0;i<pages;i++){
   const image=await png(comparisonImage(data,data.entries.slice(i*size,(i+1)*size),i,pages));
   const suffix=String(i+(data.detailOnly?1:2)).padStart(2,'0');
   downloadPng(image,filename(data)+'-'+suffix+(data.detailOnly?'-desglose.png':'-comparativo.png'));
  }
  return `${pages+(data.detailOnly?0:1)} archivos PNG listos. También puedes descargarlos individualmente aquí.`;
 }
 const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 function column(i){let result='';for(i++;i>0;i=Math.floor((i-1)/26))result=String.fromCharCode(65+(i-1)%26)+result;return result;}
 function sheet(){
  const rows=new Map(),heights=new Map(),merges=[],widths=[];
  const put=(r,c,value,style=0)=>{if(!rows.has(r))rows.set(r,new Map());rows.get(r).set(c,{value,style});};
  return {put,heights,merges,widths,serialize(lastRow,lastColumn,frozen=6){
   const content=[...rows].sort(([a],[b])=>a-b).map(([r,cells])=>`<row r="${r}"${heights.has(r)?` ht="${heights.get(r)}" customHeight="1"`:''}>`+[...cells].sort(([a],[b])=>a-b).map(([c,cell])=>{const ref=column(c)+r,attrs=`r="${ref}" s="${cell.style}"`;return typeof cell.value==='number'&&Number.isFinite(cell.value)?`<c ${attrs}><v>${cell.value}</v></c>`:cell.value===null||cell.value===undefined?`<c ${attrs}/>`:`<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`;}).join('')+'</row>').join('');
   return declaration+`<worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${column(lastColumn)}${lastRow}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="2" ySplit="${frozen}" topLeftCell="C${frozen+1}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="C${frozen+1}" sqref="C${frozen+1}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${content}</sheetData>${merges.length?`<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:''}<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }};
 }
 function styles(){
  const fonts=[['222222',false,11],['FFFFFF',true,11],['FFFFFF',true,19],['22722C',true,11],['C52727',true,11],['555555',false,10]];
  const fills=['none','gray125','273523','FFFFFF','FFF3CC','E7EFF9','F0E8F7','E0ECD9'];
  const configs=[[0,3,0],[1,2,0],[2,2,0],[0,3,164],[0,3,165],[3,3,165],[4,3,165],[0,3,166],[0,4,0],[0,5,0],[0,6,0],[1,2,164],[1,2,165],[5,3,0],[0,7,164],[0,7,165],[0,3,9]];
  return declaration+`<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0;-&quot;$&quot;#,##0"/><numFmt numFmtId="165" formatCode="0.0%;-0.0%;0.0%"/><numFmt numFmtId="166" formatCode="#,##0.##"/></numFmts><fonts count="${fonts.length}">${fonts.map(([color,bold,size])=>`<font>${bold?'<b/>':''}<sz val="${size}"/><color rgb="FF${color}"/><name val="Calibri"/><family val="2"/></font>`).join('')}</fonts><fills count="${fills.length}">${fills.map(fill=>fill==='none'||fill==='gray125'?`<fill><patternFill patternType="${fill}"/></fill>`:`<fill><patternFill patternType="solid"><fgColor rgb="FF${fill}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8D8D8"/></left><right style="thin"><color rgb="FFD8D8D8"/></right><top style="thin"><color rgb="FFD8D8D8"/></top><bottom style="thin"><color rgb="FFD8D8D8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${configs.length}">${configs.map(([font,fill,format])=>`<xf numFmtId="${format}" fontId="${font}" fillId="${fill}" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 }
 async function exportExcel(data){
  const comparison=sheet(),span=data.quantity?4:3,lastCol=2+span*data.weeks.length;
  comparison.widths.push(9,43);data.weeks.forEach(()=>comparison.widths.push(...(data.quantity?[12,18,18,16]:[18,18,16])));comparison.widths.push(18);
  comparison.put(1,0,data.detailOnly?'DESGLOSE DE GRUPOS Y APPs':'COMPARATIVO DE VENTAS POR GRUPO',2);comparison.merges.push(`A1:${column(lastCol)}1`);comparison.heights.set(1,34);
  comparison.put(2,0,data.range,13);comparison.merges.push(`A2:${column(lastCol)}2`);
  comparison.put(3,0,data.filterLabel+' · Crecimiento neto vs semana anterior · Totales del desglose completo',13);comparison.merges.push(`A3:${column(lastCol)}3`);comparison.heights.set(3,30);
  for(let c=0;c<=lastCol;c++){comparison.put(5,c,null,1);comparison.put(6,c,null,1);}
  comparison.put(5,0,'Grupo',1);comparison.put(5,1,'Descripción',1);comparison.merges.push('A5:A6','B5:B6');
  data.weeks.forEach((week,i)=>{const c=2+i*span;comparison.put(5,c,week.label+' · '+week.dates+(week.present?'':' · Sin desglose'),1);comparison.merges.push(`${column(c)}5:${column(c+span-1)}5`);(data.quantity?['Cantidad','Venta bruta','Venta neta','Crecimiento']:['Venta bruta','Venta neta','Crecimiento']).forEach((label,j)=>comparison.put(6,c+j,label,1));});
  comparison.put(5,lastCol,'Participación última semana',1);comparison.merges.push(`${column(lastCol)}5:${column(lastCol)}6`);comparison.heights.set(5,32);
  let rn=7;
  function writeEntry(entry,total=false){
   const row=rn++,nameStyle=total?1:entry.sa?8:entry.cigarettes?9:entry.type==='app'?10:0;
   comparison.put(row,0,entry.code??'',nameStyle);comparison.put(row,1,entry.name,nameStyle);comparison.heights.set(row,29);
   entry.values.forEach((value,i)=>{let c=2+i*span;if(data.quantity)comparison.put(row,c++,value?.quantity??null,7);comparison.put(row,c++,value?.gross??null,total?14:3);comparison.put(row,c++,value?.net??null,total?14:3);const g=growth(value?.net??null,entry.previous[i]?.net??null);comparison.put(row,c,g.value===null?g.label:g.value,g.value===null?13:g.value>0?5:g.value<0?6:4);});
   comparison.put(row,lastCol,entry.share,total?15:4);
  }
  data.entries.forEach(entry=>writeEntry(entry));rn++;data.totals.forEach(entry=>writeEntry(entry,true));
  const summary=sheet();summary.widths.push(43,...data.weeks.map(()=>23));summary.put(1,0,'RESUMEN SEMANAL',2);summary.merges.push(`A1:${column(data.weeks.length)}1`);summary.heights.set(1,34);summary.put(2,0,data.range,13);summary.merges.push(`A2:${column(data.weeks.length)}2`);
  summary.put(4,0,'Resultado',1);data.weeks.forEach((week,i)=>summary.put(4,i+1,week.label+' · '+week.dates,1));summary.heights.set(4,35);
  const summaryRows=[{label:'Venta total bruta del desglose',format:'money',values:data.weeks.map(w=>w.total?.gross??null)},{label:'Venta total neta del desglose',format:'money',values:data.weeks.map(w=>w.total?.net??null)},...data.summary];
  summaryRows.forEach((row,i)=>{summary.put(i+5,0,row.label,0);summary.heights.set(i+5,27);row.values.forEach((value,j)=>summary.put(i+5,j+1,value,row.format==='mc'?16:row.format==='percent'?4:row.format==='number'?7:3));});
  let sr=summaryRows.length+7;summary.put(sr++,0,'Ranking del período · '+(data.basis==='gross'?'Venta bruta':'Venta neta'),1);
  data.ranking.forEach(entry=>{summary.put(sr,0,entry.name,0);summary.put(sr++,1,entry.amount,3);});
  const basis=sheet();basis.widths.push(9,43,...data.weeks.map(()=>22));basis.put(1,0,'BASES DE COMPARACIÓN · NETO DE LA SEMANA ANTERIOR',2);basis.merges.push(`A1:${column(data.weeks.length+1)}1`);basis.heights.set(1,34);basis.put(2,0,'Cada columna contiene el neto de la semana inmediatamente anterior a la indicada.',13);basis.merges.push(`A2:${column(data.weeks.length+1)}2`);
  basis.put(4,0,'Grupo',1);basis.put(4,1,'Descripción',1);data.weeks.forEach((w,i)=>basis.put(4,i+2,'Anterior a '+w.label,1));
  [...data.entries,...data.totals].forEach((entry,i)=>{basis.put(i+5,0,entry.code??'',0);basis.put(i+5,1,entry.name,0);entry.previous.forEach((value,j)=>basis.put(i+5,j+2,value?.net??null,3));});
  const sheets=data.detailOnly?[['Grupos y APPs',comparison.serialize(rn-1,lastCol)]]:[['Comparativo',comparison.serialize(rn-1,lastCol)],['Resumen',summary.serialize(sr-1,data.weeks.length,4)],['Bases crecimiento',basis.serialize(data.entries.length+data.totals.length+4,data.weeks.length+1,4)]];
  const zip=new JSZip();zip.file('[Content_Types].xml',declaration+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml',declaration+`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map(([name],i)=>`<sheet name="${xml(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels',declaration+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml',styles());sheets.forEach(([,content],i)=>zip.file(`xl/worksheets/sheet${i+1}.xml`,content));
  download(await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'}),filename(data)+'.xlsx');return data.detailOnly?'Desglose de grupos y APPs descargado en Excel.':'Comparativo Excel descargado.';
 }
 window.IndicatorAnalysisExport={png:exportPng,excel:exportExcel};
})();
