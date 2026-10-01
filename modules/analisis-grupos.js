/* Comparador de desgloses guardados. Vista de consulta, sin modificar ventas ni indicadores. */
(function(){
 'use strict';
 function init({getData,getRows,getPurchases,getCashierSales,getConfig,escapeHtml}){
  const C=IndicatorCore,M=IndicatorGroupSalesModel,$=id=>document.getElementById(id),esc=escapeHtml,dialog=$('groupAnalysisDialog');
  const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  const percent=new Intl.NumberFormat('es-CL',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1});
  const number=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2}),integer=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const appName=s=>{const name=norm(s).replace(/^VENTAS?\s+/,'');return ['PDD YA','PPD YA','PEDIDOS YA'].includes(name)?'PPD YA':name;};
  const date=s=>C.date(s).toLocaleDateString('es-CL',{day:'2-digit',month:'short',timeZone:'UTC'});
  const fmt=v=>v===null||v===undefined?'—':money.format(v);
  const mcPercent=new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:0});
  const mcPct=v=>v===null||v===undefined?'—':mcPercent.format(v);
  const pct=v=>v===null||v===undefined?'—':percent.format(v);
  const signed=v=>v===null?'—':(v>0?'+':'')+money.format(v);
  const short=v=>Math.abs(v)>=1e6?number.format(v/1e6)+' M':Math.abs(v)>=1000?number.format(v/1000)+' mil':number.format(v);
  const ratio=(a,b)=>a===null||b===null||b===0?null:a/b;
  const change=(now,before)=>now===null||before===null?null:before===0?(now===0?0:null):(now-before)/Math.abs(before);
  const weekName=start=>{const w=C.weekInfo(start);return `S${w.week} · ${w.year}`;};
  let selectedEnd=null,selectedItem='__total',view=null;

  function build(end,count){
   const data=getData(),daily=new Map(),cache=new Map(),purchases=getPurchases();
   const attendance=C.attendanceContext(getRows(),getCashierSales());
   for(const row of getRows()){
    const w=C.weekInfo(row.date),start=C.weekStart(w.year,w.week);
    if(!daily.has(start))daily.set(start,[]);daily.get(start).push(row);
   }
   function read(start){
    if(cache.has(start))return cache.get(start);
    const present=Object.hasOwn(data,start),items=new Map(),records=daily.get(start)||[],totals=C.totals(records);
    let total=null,groups=null,apps=null,cigarettes=null;
    if(present){
     const normalized=M.normalizeWeek(data[start],C),t=M.totals(normalized);
     total={gross:t.amount,net:t.net};groups={gross:t.groupGross,net:t.groupNet};apps={gross:t.appGross,net:t.appNet};
     for(const g of normalized.groups){
      const key=g.code===0?'g0:'+norm(g.name):'g:'+g.code;
      const entry={key,type:'group',code:g.code,name:g.name,quantity:g.quantity,gross:g.amount,net:M.net(g.amount,g.code,g.name),sa:g.code===25||g.code===0&&norm(g.name)==='SERVICIOS ALIMENTICIOS',cigarettes:M.isCigarettes(g.code,g.name)};
      items.set(key,entry);if(entry.cigarettes)cigarettes=(cigarettes??0)+entry.net;
     }
     for(const a of normalized.apps){
      const name=appName(a.name),key='a:'+name,existing=items.get(key);
      if(existing){existing.gross+=a.amount;existing.net+=M.net(a.amount);}
      else items.set(key,{key,type:'app',code:'APP',name,quantity:null,gross:a.amount,net:M.net(a.amount)});
     }
    }
    const sales=records.length?totals.sales:null,visits=attendance.weeks.get(start)??null;
    const result={start,end:C.add(start,6),present,items,total,groups,apps,sales,visits,tp:ratio(sales,visits),mc:sales!==null&&sales!==0&&Object.hasOwn(purchases,start)?(sales-purchases[start])/sales:null,cigaretteShare:ratio(cigarettes,total?.net??null),difference:total&&sales!==null?total.net-sales:null,days:new Set(records.map(r=>r.date)).size};
    cache.set(start,result);return result;
   }
   const weeks=Array.from({length:count},(_,i)=>read(C.add(end,(i-count+1)*7))),entries=new Map();
   for(const week of weeks)for(const [key,item] of week.items)entries.set(key,item);
   const list=[...entries.values()].sort((a,b)=>a.type!==b.type?(a.type==='group'?-1:1):a.type==='group'?a.code-b.code||a.name.localeCompare(b.name,'es'):a.name.localeCompare(b.name,'es'));
   return {weeks,list,read};
  }
  function variation(now,before,bars=false){
   const value=change(now,before);
   if(value===null)return `<span class="analysis-unavailable" title="${now===null?'No hay dato en esta semana':before===null?'No hay dato comparable en la semana anterior':'La semana anterior tiene valor cero'}">${now===null?'—':before===0?'Base 0':'Sin base'}</span>`;
   const color=value>0?'up':value<0?'down':'flat',label=(value>0?'▲ +':value<0?'▼ ':'')+percent.format(value);
   if(!bars)return `<span class="analysis-change ${color}">${esc(label)}</span>`;
   const width=Math.min(48,Math.abs(value)*48),position=value<0?50-width:50;
   return `<span class="analysis-growth ${color}" title="${esc(label)}"><i style="left:${position}%;width:${width}%"></i><b>${esc(label)}</b></span>`;
  }
  function extrema(value,values){
   const valid=values.filter(Number.isFinite);if(!Number.isFinite(value)||valid.length<2)return '';
   const low=Math.min(...valid),high=Math.max(...valid);if(low===high)return '';
   return value===high?'<span class="metric-high" title="Máximo de las semanas seleccionadas">▲</span>':value===low?'<span class="metric-low" title="Mínimo de las semanas seleccionadas">▼</span>':'';
  }
  function spark(values){
   const valid=values.filter(Number.isFinite);if(!valid.length)return '—';
   const low=Math.min(...valid),high=Math.max(...valid),span=high-low||1;
   const points=values.map((v,i)=>v===null?null:{x:values.length===1?48:6+i*84/(values.length-1),y:high===low?20:34-(v-low)/span*28});
   let paths='',dots='';
   points.forEach((p,i)=>{if(!p)return;const prev=points[i-1];if(prev)paths+=`<path d="M${prev.x},${prev.y} L${p.x},${p.y}"/>`;dots+=`<circle cx="${p.x}" cy="${p.y}" r="3"><title>${esc(weekName(view.weeks[i].start)+': '+fmt(values[i]))}</title></circle>`;});
   return `<svg class="analysis-spark" viewBox="0 0 96 40" role="img" aria-label="Evolución neta">${paths}${dots}</svg>`;
  }
  function metricFor(week,key){return key==='__total'?week.total:key==='__apps'?week.apps:week.items.get(key)||null;}
  function renderChart(){
   if(!view)return;const basis=$('analysisBasis').value,metricName=basis==='gross'?'Venta bruta':'Venta neta',weeks=view.weeks;
   const selected=view.list.find(e=>e.key===selectedItem),name=selectedItem==='__total'?'Venta total':selectedItem==='__apps'?'TOTAL APPs':selected?.name||'Venta total';
   $('analysisTrendTitle').textContent=name;
   const values=weeks.map(w=>metricFor(w,selectedItem)?.[basis]??null),valid=values.filter(Number.isFinite);
   if(!valid.length){$('analysisTrend').innerHTML='<div class="analysis-placeholder">Sin datos para esta selección.</div>';return;}
   const low=Math.min(0,...valid),high=Math.max(0,...valid),span=high-low||1,left=100,right=735,top=36,bottom=222;
   const y=v=>bottom-(v-low)/span*(bottom-top),zero=y(0),step=(right-left)/weeks.length,barWidth=Math.min(70,step*.5);
   let svg=`<svg viewBox="0 0 760 285" role="img" aria-label="${esc(metricName+' por semana: '+name)}"><title>${esc(metricName+' por semana: '+name)}</title>`;
   for(let i=0;i<=4;i++){const value=low+span*i/4,yy=y(value);svg+=`<line class="analysis-grid-line" x1="${left}" y1="${yy}" x2="${right}" y2="${yy}"/><text class="analysis-axis" x="88" y="${yy+4}" text-anchor="end">${esc(short(value))}</text>`;}
   weeks.forEach((week,i)=>{
    const x=left+step*(i+.5),value=values[i],position=value===null?zero:y(value),height=value===null?0:Math.abs(position-zero),color=value!==null&&value<0?'#ef6464':i===weeks.length-1?'#70AD47':'#8b9dc3';
    svg+=`<text class="analysis-chart-value" x="${x}" y="${value===null?zero-10:value<0?position+18:position-10}" text-anchor="middle">${esc(fmt(value))}</text>`;
    if(value!==null)svg+=`<rect x="${x-barWidth/2}" y="${Math.min(position,zero)}" width="${barWidth}" height="${Math.max(2,height)}" rx="4" fill="${color}"><title>${esc(weekName(week.start)+' · '+fmt(value))}</title></rect>`;
    svg+=`<text class="analysis-chart-label" x="${x}" y="250" text-anchor="middle">${esc(weekName(week.start))}</text><text class="analysis-axis" x="${x}" y="271" text-anchor="middle">${esc(date(week.start)+' – '+date(week.end))}</text>`;
   });
   $('analysisTrend').innerHTML=svg+'</svg>';
  }
  function selectItem(key){selectedItem=key;$('analysisChartItem').value=key;renderChart();}
  function renderRanking(){
   const basis=$('analysisBasis').value,total=view.weeks.reduce((sum,w)=>sum+(w.total?.[basis]||0),0);
   const ranking=view.list.filter(e=>e.type==='group').map(entry=>({...entry,amount:view.weeks.reduce((sum,w)=>sum+(w.items.get(entry.key)?.[basis]||0),0)})).sort((a,b)=>b.amount-a.amount).slice(0,8);
   const maximum=Math.max(1,...ranking.map(e=>Math.abs(e.amount)));
   $('analysisRankTitle').textContent='Grupos con mayor '+(basis==='gross'?'venta bruta':'venta neta');
   $('analysisRanking').innerHTML=ranking.length?ranking.map((e,i)=>`<button type="button" class="analysis-rank" data-analysis-item="${esc(e.key)}"><span class="analysis-rank-line"><span><small>${i+1}.</small> ${esc(e.name)}</span><strong>${esc(fmt(e.amount))}</strong></span><span class="analysis-rank-track"><i style="width:${Math.abs(e.amount)/maximum*100}%;background:${e.amount<0?'#ef6464':'#70AD47'}"></i></span><small>${esc(pct(total!==0?e.amount/total:null))} de la venta total del período</small></button>`).join(''):'<div class="analysis-placeholder">Sin grupos en las semanas seleccionadas.</div>';
  }
  function renderCards(){
   const weeks=view.weeks,available=weeks.filter(w=>w.present),last=weeks.at(-1),previous=view.read(C.add(last.start,-7));
   const net=available.length?available.reduce((sum,w)=>sum+w.total.net,0):null,app=available.length?available.reduce((sum,w)=>sum+w.apps.net,0):null;
   const registered=weeks.filter(w=>w.visits!==null),visits=registered.length?registered.reduce((sum,w)=>sum+w.visits,0):null,sales=registered.length&&registered.every(w=>w.sales!==null)?registered.reduce((sum,w)=>sum+w.sales,0):null;
   $('analysisCards').innerHTML=[
    ['Venta neta del desglose',fmt(net),`${available.length} de ${weeks.length} semanas con datos`],
    ['APPs · venta neta',fmt(app),pct(ratio(app,net))+' de la venta neta'],
    ['Ticket promedio del registro',fmt(ratio(sales,visits)),visits===null?'Sin atenciones registradas':integer.format(visits)+' atenciones'],
    ['Cambio de la última semana',variation(last.total?.net??null,previous.total?.net??null),weekName(last.start)+' vs '+weekName(previous.start)]
   ].map(([title,value,note],i)=>`<article><span>${esc(title)}</span><strong>${i===3?value:esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
   const changes=view.list.map(e=>{const now=last.items.get(e.key)?.net??null,before=previous.items.get(e.key)?.net??null;return {...e,now,before,delta:now===null||before===null?null:now-before};}).filter(e=>e.delta!==null);
   const best=changes.filter(e=>e.delta>0).sort((a,b)=>b.delta-a.delta)[0],worst=changes.filter(e=>e.delta<0).sort((a,b)=>a.delta-b.delta)[0];
   $('analysisHighlights').innerHTML=[[best,'Mayor subida','up'],[worst,'Mayor caída','down']].map(([item,title,color])=>`<article class="analysis-highlight"><span class="${color}">${title} · ${esc(weekName(last.start))}</span>${item?`<strong>${esc(item.name)}</strong><div>${esc(signed(item.delta))} ${variation(item.now,item.before)}</div>`:'<strong>Sin variación comparable</strong>'}</article>`).join('');
  }
  function tableCells(values,previous,quantity=false){
   return values.map((entry,i)=>{
    const gross=entry?.gross??null,net=entry?.net??null;
    return `${quantity?`<td>${entry?.quantity===null||entry?.quantity===undefined?'—':esc(number.format(entry.quantity))}</td>`:''}<td class="analysis-gross">${esc(fmt(gross))}${extrema(gross,values.map(e=>e?.gross??null))}</td><td class="analysis-net">${esc(fmt(net))}${extrema(net,values.map(e=>e?.net??null))}</td><td class="analysis-growth-cell">${variation(net,previous[i]?.net??null,true)}</td>`;
   }).join('');
  }
  function renderTable(){
   const weeks=view.weeks,quantity=$('analysisShowQuantity').checked,span=quantity?4:3,last=weeks.at(-1),query=norm($('analysisSearch').value),type=$('analysisType').value;
   const entries=view.list.filter(e=>(type==='all'||e.type===type)&&(!query||norm(e.name+' '+e.code).includes(query)));
   $('analysisTableHead').innerHTML=`<tr><th rowspan="2" class="analysis-code">Grupo</th><th rowspan="2" class="analysis-name">Descripción</th>${weeks.map(w=>`<th colspan="${span}" class="analysis-week${w.present?'':' missing'}">${esc(weekName(w.start))}<small>${esc(date(w.start)+' – '+date(w.end))}${w.present?'':' · Sin desglose'}</small></th>`).join('')}<th rowspan="2">% última<br>semana</th><th rowspan="2">Evolución<br>neta</th></tr><tr>${weeks.map(()=>`${quantity?'<th>Cantidad</th>':''}<th>Venta bruta</th><th>Venta neta</th><th>Crecimiento</th>`).join('')}</tr>`;
   $('analysisTableRows').innerHTML=entries.map(e=>{
    const values=weeks.map(w=>w.items.get(e.key)||null),previous=weeks.map(w=>view.read(C.add(w.start,-7)).items.get(e.key)||null),net=values.at(-1)?.net??null;
    const cls=e.sa?'sa':e.cigarettes?'cigarettes':e.type==='app'?'app':'';
    return `<tr class="analysis-${cls}"><td class="analysis-code">${esc(e.code)}</td><th scope="row" class="analysis-name"><button type="button" data-analysis-item="${esc(e.key)}">${esc(e.name)}</button></th>${tableCells(values,previous,quantity)}<td>${esc(pct(ratio(net,last.total?.net??null)))}</td><td>${spark(values.map(v=>v?.net??null))}</td></tr>`;
   }).join('')||`<tr><td colspan="${4+weeks.length*span}" class="analysis-placeholder">No hay filas para esta selección.</td></tr>`;
   $('analysisTableFoot').innerHTML=[['groups','TOTAL GRUPOS'],['apps','TOTAL APPs'],['total','VENTA TOTAL']].map(([key,label])=>{
    const values=weeks.map(w=>w[key]),previous=weeks.map(w=>view.read(C.add(w.start,-7))[key]);
    return `<tr><th colspan="2" class="analysis-total-name">${label}</th>${tableCells(values,previous,quantity)}<td>${esc(pct(ratio(last[key]?.net??null,last.total?.net??null)))}</td><td>${spark(values.map(v=>v?.net??null))}</td></tr>`;
   }).join('');
   $('analysisVisibleCount').textContent=`${entries.length} filas · Totales del desglose completo`;
  }
  function renderSummary(){
   const weeks=view.weeks,rows=[['Atenciones del registro','visits',v=>v===null?'—':integer.format(v)],['TP del registro','tp',fmt],['MC del registro','mc',mcPct],['Participación cigarros en venta neta','cigaretteShare',pct],['Diferencia neta: desglose − registro','difference',fmt]];
   $('analysisSummaryHead').innerHTML='<tr><th>Resumen semanal</th>'+weeks.map(w=>`<th>${esc(weekName(w.start))}</th>`).join('')+'</tr>';
   $('analysisSummaryRows').innerHTML=rows.map(([label,key,format])=>`<tr><th scope="row">${esc(label)}</th>${weeks.map(w=>`<td>${esc(format(w[key]))}</td>`).join('')}</tr>`).join('');
  }
  function exportSnapshot(){
   if(!view)throw Error('Selecciona las semanas del análisis.');
   const weeks=view.weeks,last=weeks.at(-1),before=view.read(C.add(last.start,-7)),query=norm($('analysisSearch').value),type=$('analysisType').value,basis=$('analysisBasis').value;
   const row=(entry,values,previous)=>({...entry,values:values.map(v=>v?{gross:v.gross,net:v.net,quantity:v.quantity??null}:null),previous:previous.map(v=>v?{gross:v.gross,net:v.net}:null),share:ratio(values.at(-1)?.net??null,last.total?.net??null)});
   const entries=view.list.filter(e=>(type==='all'||e.type===type)&&(!query||norm(e.name+' '+e.code).includes(query))).map(e=>row(e,weeks.map(w=>w.items.get(e.key)||null),weeks.map(w=>view.read(C.add(w.start,-7)).items.get(e.key)||null)));
   const totals=[['groups','TOTAL GRUPOS'],['apps','TOTAL APPs'],['total','VENTA TOTAL']].map(([key,name])=>row({name,code:''},weeks.map(w=>w[key]),weeks.map(w=>view.read(C.add(w.start,-7))[key])));
   const available=weeks.filter(w=>w.present),registered=weeks.filter(w=>w.visits!==null),net=available.length?available.reduce((s,w)=>s+w.total.net,0):null,apps=available.length?available.reduce((s,w)=>s+w.apps.net,0):null,visits=registered.length?registered.reduce((s,w)=>s+w.visits,0):null,sales=registered.length&&registered.every(w=>w.sales!==null)?registered.reduce((s,w)=>s+w.sales,0):null;
   const difference=change(last.total?.net??null,before.total?.net??null),changeLabel=difference===null?(last.total===null?'—':before.total?.net===0?'Base 0':'Sin base'):(difference>0?'▲ +':difference<0?'▼ ':'')+percent.format(difference);
   const summary=[['Atenciones del registro','visits','number'],['TP del registro','tp','money'],['MC del registro','mc','mc'],['Participación cigarros en venta neta','cigaretteShare','percent'],['Diferencia neta: desglose − registro','difference','money']].map(([label,key,format])=>({label,format,values:weeks.map(w=>w[key])}));
   return {weeks:weeks.map(w=>({start:w.start,end:w.end,present:w.present,label:weekName(w.start),dates:date(w.start)+' – '+date(w.end),total:w.total})),range:weeks[0].start.split('-').reverse().join('/')+' – '+last.end.split('-').reverse().join('/'),entries,totals,summary,basis,quantity:$('analysisShowQuantity').checked,filterLabel:(type==='group'?'Solo grupos':type==='app'?'Solo APPs':'Grupos y APPs')+(query?' · Filtro: '+$('analysisSearch').value.trim():''),chartName:$('analysisTrendTitle').textContent,chartValues:weeks.map(w=>metricFor(w,selectedItem)?.[basis]??null),ranking:view.list.filter(e=>e.type==='group').map(e=>({name:e.name,amount:weeks.reduce((s,w)=>s+(w.items.get(e.key)?.[basis]||0),0)})).sort((a,b)=>b.amount-a.amount).slice(0,8),cards:[
    {label:'Venta neta del desglose',value:fmt(net),note:`${available.length} de ${weeks.length} semanas con datos`},
    {label:'APPs · venta neta',value:fmt(apps),note:pct(ratio(apps,net))+' de la venta neta'},
    {label:'TP del registro',value:fmt(ratio(sales,visits)),note:visits===null?'Sin atenciones registradas':integer.format(visits)+' atenciones'},
    {label:'Cambio última semana',value:changeLabel,note:weekName(last.start)+' vs '+weekName(before.start),tone:difference>0?'up':difference<0?'down':''}
   ]};
  }
  async function exportAnalysis(kind){
   const buttons=[$('analysisExportPng'),$('analysisExportExcel'),$('analysisDetailPng'),$('analysisDetailExcel')],status=$('analysisExportStatus');buttons.forEach(b=>b.disabled=true);status.hidden=false;status.classList.remove('module-error');status.textContent='Preparando descarga…';
   try{
    const mode=$('analysisImageMode').value,snapshot={...exportSnapshot(),detailOnly:kind.startsWith('detail-')||kind==='png'&&mode==='detail'},summaryOnly=mode==='summary'&&!snapshot.detailOnly;
    status.textContent=await (kind.endsWith('png')?IndicatorAnalysisExport.png(snapshot,summaryOnly):IndicatorAnalysisExport.excel(snapshot));
   }catch(error){status.classList.add('module-error');status.textContent='No se pudo exportar: '+error.message;}
   finally{buttons.forEach(b=>b.disabled=false);}
  }
  function render(){
   const end=$('analysisEndWeek').value;if(!end)return;
   const count=Math.max(1,Math.min(5,Number($('analysisWeeks').value)||3));selectedEnd=end;view=build(end,count);
   const entries=view.list,valid=['__total','__apps',...entries.map(e=>e.key)];if(!valid.includes(selectedItem))selectedItem='__total';
   $('analysisChartItem').innerHTML='<option value="__total">Venta total</option><option value="__apps">TOTAL APPs</option>'+entries.map(e=>`<option value="${esc(e.key)}">${esc((e.type==='app'?'APP':e.code)+' · '+e.name)}</option>`).join('');
   $('analysisChartItem').value=selectedItem;
   $('analysisRange').textContent=`${date(view.weeks[0].start)} – ${date(view.weeks.at(-1).end)} · ${view.weeks.filter(w=>w.present).length} de ${count} semanas con desglose`;
   renderCards();renderChart();renderRanking();renderTable();renderSummary();
  }
  $('groupAnalysisButton').addEventListener('click',()=>{
   const starts=Object.keys(getData()).sort().reverse(),config=getConfig();
   if(!selectedEnd||!starts.includes(selectedEnd))selectedEnd=starts[0]||C.weekStart(config.year,config.startWeek);
   const first=C.weekStart(2000,1),last=C.weekStart(2100,C.weekInfo('2100-12-28').week),options=new Set(starts);
   for(let offset=-5;offset<=5;offset++){const start=C.add(selectedEnd,offset*7);if(start>=first&&start<=last)options.add(start);}
   $('analysisEndWeek').innerHTML=[...options].sort().reverse().map(start=>`<option value="${start}">${esc(weekName(start)+' · '+date(start)+' – '+date(C.add(start,6)))}${Object.hasOwn(getData(),start)?'':' · Sin desglose'}</option>`).join('');
   $('analysisEndWeek').value=selectedEnd;render();dialog.showModal();dialog.scrollTop=0;
  });
  for(const id of ['analysisEndWeek','analysisWeeks'])$(id).addEventListener('change',render);
  $('analysisBasis').addEventListener('change',()=>{renderChart();renderRanking();});
  $('analysisChartItem').addEventListener('change',()=>selectItem($('analysisChartItem').value));
  $('analysisSearch').addEventListener('input',renderTable);
  $('analysisExportPng').addEventListener('click',()=>exportAnalysis('png'));
  $('analysisExportExcel').addEventListener('click',()=>exportAnalysis('excel'));
  $('analysisDetailPng').addEventListener('click',()=>exportAnalysis('detail-png'));
  $('analysisDetailExcel').addEventListener('click',()=>exportAnalysis('detail-excel'));
  for(const id of ['analysisType','analysisShowQuantity'])$(id).addEventListener('change',renderTable);
  dialog.addEventListener('click',event=>{const button=event.target.closest('[data-analysis-item]');if(button){selectItem(button.dataset.analysisItem);$('analysisTrendTitle').scrollIntoView({block:'nearest',behavior:'smooth'});}});
 }
 window.IndicatorGroupAnalysis={init};
})();
