/* PDF local: páginas A4 horizontales con hasta cuatro indicadores, sin servicios externos. */
(function(){
 'use strict';
 const WIDTH=1684,HEIGHT=1190,SCALE=2,COLORS={good:'#70AD47',bad:'#FF0000',none:'#000000',empty:'#FFFFFF'};
 function model(state,metrics){
  const C=IndicatorCore,data=IndicatorCashModel.indicatorData(IndicatorRemovalModel.indicatorData(state.independentIndicators||{},state.eliminationRecords||[],state.eliminationCashierSales||{},C),C);
  return metrics.map(metric=>{
   const config={...state.config,metric,title:metric===state.config.metric?state.config.title:state.config.metricTitles?.[metric]||C.metrics[metric].title};
   const periods=C.buildPeriods(config,state.rows,state.groupSales,state.purchases,data,state.eliminationCashierSales);
   return {config,periods,scale:C.metricScale(config),text:IndicatorTextModel.resolve(config,periods,C)};
  });
 }
 function textBox(ctx,value,x,y,width,height,{size=13,bold=false,align='left',color='#222'}={}){
  const text=String(value??'');let lines=[];
  for(;size>=6;size-=.5){
   ctx.font=`${bold?'700':'400'} ${size}px Arial`;lines=[];
   for(const paragraph of text.split(/\r?\n/)){
    let line='';for(const word of paragraph.split(/\s+/)){
     const next=line?line+' '+word:word;
     if(ctx.measureText(next).width<=width){line=next;continue;}
     if(line){lines.push(line);line='';}
     for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line);
   }
   if(lines.length*size*1.18<=height)break;
  }
  ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.font=`${bold?'700':'400'} ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';
  const left=align==='center'?x+width/2:align==='right'?x+width:x;
  lines.forEach((line,i)=>ctx.fillText(line,left,y+i*size*1.18));ctx.restore();
 }
 function card(ctx,item,x,y,w,h){
  const C=IndicatorCore,{config,periods,scale,text}=item,metric=config.metric,hidden=text.hideValues===true;
  const format=value=>{
   if(value===null)return '—';
   if(C.isPercent(metric))return new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:metric==='negativeSkus'?2:metric==='removedSkus'?1:0}).format(value);
   const amount=Math.abs(value),unit=amount>=1e6?' M':amount>=1e3?' mil':'',divisor=amount>=1e6?1e6:amount>=1e3?1e3:1;
   return new Intl.NumberFormat('es-CL',{maximumFractionDigits:unit?1:0}).format(value/divisor)+unit;
  };
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b8bdc4';ctx.lineWidth=1;ctx.strokeRect(.5,.5,w-1,h-1);
  textBox(ctx,text.centerHeader,14,10,w-28,45,{size:13,bold:true,align:'center'});
  textBox(ctx,config.title,18,61,w-36,31,{size:22,bold:true,align:'center'});
  ctx.fillStyle='#eff1f3';ctx.fillRect(12,97,w-24,57);
  textBox(ctx,'Definición: '+text.definition,20,104,w*.64-28,45,{size:12});
  textBox(ctx,'Fuente: '+text.source,w*.64,104,w*.36-20,45,{size:12});
  const left=78,top=197,bottom=383,chartWidth=w-left-18,step=chartWidth/periods.length,barWidth=Math.min(25,step*.56);
  const yFor=value=>bottom-C.scalePosition(value,scale)*(bottom-top);
  ctx.strokeStyle='#e3e5e8';ctx.lineWidth=.7;
  C.scaleLevels(scale).forEach((value,index)=>{
   const yy=bottom-index/12*(bottom-top);ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-18,yy);ctx.stroke();
   const axisText=C.isPercent(metric)?new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:metric==='mc'?0:1}).format(value):format(value);
   if(!hidden)textBox(ctx,axisText,4,yy-5,left-12,13,{size:10,align:'right',color:'#505861'});
  });
  periods.forEach((period,index)=>{
   const xx=left+step*(index+.5),status=C.status(period);
   if(config.metric==='cashClosings'){
    textBox(ctx,period.cash?'M: '+period.cash.bad:'M: —',xx-step/2,158,step,13,{size:9,align:'center'});
    textBox(ctx,period.cash?'T: '+period.cash.total:'T: —',xx-step/2,171,step,13,{size:9,align:'center'});
   }
   if(!hidden&&period.goal!==null)textBox(ctx,format(period.goal),xx-step/2,185,step,11,{size:8,align:'center',color:'#59616a'});
   if(period.value!==null){const yy=yFor(period.value);ctx.fillStyle=COLORS[status];ctx.fillRect(xx-barWidth/2,yy,barWidth,Math.max(2,bottom-yy));}
   else{ctx.strokeStyle='#c9cdd2';ctx.strokeRect(xx-barWidth/2,bottom-7,barWidth,7);}
   if(period.goal!==null){const yy=yFor(period.goal);ctx.strokeStyle='#333';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(xx-barWidth*.7,yy);ctx.lineTo(xx+barWidth*.7,yy);ctx.stroke();}
   textBox(ctx,period.short,xx-step/2,393,step,18,{size:12,bold:true,align:'center'});
   if(!hidden)textBox(ctx,format(period.value),xx-step/2,415,step,18,{size:10,bold:true,align:'center'});
  });
  ctx.strokeStyle='#87919a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+step*3-2,top);ctx.lineTo(left+step*3-2,bottom+28);ctx.stroke();
  const legend=[['good','Cumple'],['bad','Fuera de objetivo'],['none','Sin objetivo'],['empty','Sin datos']];
  let lx=left;for(const [status,label] of legend){ctx.fillStyle=COLORS[status];ctx.fillRect(lx,445,9,9);ctx.strokeStyle='#777';ctx.strokeRect(lx,445,9,9);textBox(ctx,label,lx+14,444,130,15,{size:10});lx+=status==='bad'?148:110;}
  textBox(ctx,'— Meta',lx,444,95,15,{size:10});
  if(metric==='cashClosings')textBox(ctx,'M: malos · T: total',w-154,459,137,12,{size:8,align:'right'});
  ctx.strokeStyle='#d6dade';ctx.beginPath();ctx.moveTo(16,477);ctx.lineTo(w-16,477);ctx.stroke();
  textBox(ctx,text.quarterPeriod,18,484,w*.47-23,28,{size:11});textBox(ctx,text.weekPeriod,w*.47,484,w*.53-18,28,{size:11});
  textBox(ctx,'Frecuencia: '+text.frequency,18,517,w*.47-23,h-524,{size:11});textBox(ctx,'Responsable: '+text.responsible,w*.47,517,w*.53-18,h-524,{size:11});
  ctx.restore();
 }
 function renderPage(items,index,total,state){
  const canvas=document.createElement('canvas');canvas.width=WIDTH*SCALE;canvas.height=HEIGHT*SCALE;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no permite preparar el PDF.');ctx.scale(SCALE,SCALE);ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);
  textBox(ctx,'INDICADORES',26,15,950,28,{size:22,bold:true});textBox(ctx,`Año ${state.config.year} · Semana inicial ${state.config.startWeek}`,1000,20,658,22,{size:15,align:'right',color:'#525a62'});
  const gap=18,width=(WIDTH-52-gap)/2,height=548;
  items.forEach((item,i)=>card(ctx,item,26+(i%2)*(width+gap),53+Math.floor(i/2)*(height+gap),width,height));
  textBox(ctx,`Página ${index+1} de ${total}`,26,1175,WIDTH-52,14,{size:11,align:'right',color:'#525a62'});
  return canvas;
 }
 async function pdf(pages){
  const encoder=new TextEncoder(),parts=[],offsets=[0];let offset=0;
  const append=value=>{const data=typeof value==='string'?encoder.encode(value):value;parts.push(data);offset+=data.byteLength;};
  const object=(id,value)=>{offsets[id]=offset;append(`${id} 0 obj\n${value}\nendobj\n`);};
  append('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] >>`);
  for(const [i,canvas] of pages.entries()){
   const id=3+i*3,jpeg=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo crear una página del PDF.')),'image/jpeg',.96)),bytes=new Uint8Array(await jpeg.arrayBuffer());
   object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im${i} ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
   offsets[id+1]=offset;append(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);append(bytes);append('\nendstream\nendobj\n');
   const commands=`q\n841.89 0 0 595.28 0 0 cm\n/Im${i} Do\nQ\n`;object(id+2,`<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
   canvas.width=0;canvas.height=0;
  }
  const xref=offset;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(const position of offsets.slice(1))append(String(position).padStart(10,'0')+' 00000 n \n');
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
 }
 async function exportPdf(state,metrics,onProgress=()=>{}){
  const keys=[...new Set(metrics)];if(!keys.length)throw Error('Selecciona al menos un indicador.');
  if(keys.some(key=>!Object.hasOwn(IndicatorCore.metrics,key)||['uber','pddya','rappi'].includes(key)))throw Error('Indicador no disponible.');
  IndicatorCore.validateBackup(state);await document.fonts.ready;
  const items=model(state,keys),count=Math.ceil(items.length/4),pages=[];
  for(let i=0;i<count;i++){onProgress(`Preparando página ${i+1} de ${count}…`);await new Promise(resolve=>setTimeout(resolve,0));pages.push(renderPage(items.slice(i*4,i*4+4),i,count,state));}
  return pdf(pages);
 }
 window.IndicatorPdf=Object.freeze({export:exportPdf,model,renderPage});
})();
