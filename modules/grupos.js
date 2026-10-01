/* Editor semanal de categorías y pegado del reporte del sistema. */
(function(){
 'use strict';
 function init({getData,getRows,getConfig,commitData,escapeHtml}){
  const C=IndicatorCore,M=IndicatorGroupSalesModel,$=id=>document.getElementById(id),esc=escapeHtml,dialog=$('groupSalesDialog');
  const number=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2}),money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',minimumFractionDigits:0,maximumFractionDigits:0});
  const date=s=>s.split('-').reverse().join('/');
  let draft={},selected=null,pending=null;
  function error(text=''){$('groupSalesError').textContent=text;$('groupSalesError').hidden=!text;$('groupSalesStatus').textContent='';}
  function invalidatePreview(){pending=null;$('applyGroupReport').disabled=true;$('groupReportPreview').textContent='Revisa el reporte antes de incorporarlo.';}
  function requestedStart(){const year=Number($('groupYear').value),week=Number($('groupWeek').value);if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(week)||week<1||week>C.weekInfo(`${year}-12-28`).week)throw Error('Indica un año válido y una semana ISO existente.');return C.weekStart(year,week);}
  function formatInput(value){return value===null?'':typeof value==='number'?number.format(value):value;}
  function updateTotals(){
   const ids=['groupQuantityTotal','groupAmountTotal','groupNetTotal','appsGrossTotal','appsNetTotal','grandGrossTotal','grandNetTotal'];
   if(!selected){ids.forEach(id=>$(id).textContent='—');$('groupComparison').textContent='Agrega una semana o pega un reporte con sus fechas.';return;}
   try {
    const data=M.normalizeWeek(draft[selected],C),total=M.totals(data);
    $('groupQuantityTotal').textContent=total.quantity===null?'—':number.format(total.quantity);
    for(const [id,key] of [['groupAmountTotal','groupGross'],['groupNetTotal','groupNet'],['appsGrossTotal','appGross'],['appsNetTotal','appNet'],['grandGrossTotal','amount'],['grandNetTotal','net']])$(id).textContent=money.format(total[key]);
    data.groups.forEach((g,i)=>{const output=$('groupRows').querySelector(`[data-net="${i}"]`);if(output)output.textContent=money.format(M.net(g.amount,g.code,g.name));});
    data.apps.forEach((app,i)=>{const output=$('appsRows').querySelector(`[data-app-net="${i}"]`);if(output)output.textContent=money.format(M.net(app.amount));});
    const rows=getRows().filter(r=>r.date>=selected&&r.date<=C.add(selected,6));
    $('groupComparison').textContent=rows.length?`Venta neta del registro diario: ${money.format(C.totals(rows).sales)} · Diferencia neta del desglose: ${money.format(Math.abs(total.net-C.totals(rows).sales)<0.5?0:total.net-C.totals(rows).sales)}`:'Esta semana todavía no tiene ventas en el registro diario.';
   }catch(e){ids.forEach(id=>$(id).textContent='—');dialog.querySelectorAll('[data-net],[data-app-net]').forEach(o=>o.textContent='—');$('groupComparison').textContent=e.message;}
  }
  function renderEditor(){
   const has=selected!==null;
   $('removeGroupWeek').disabled=!has;$('addSalesCategory').disabled=!has;$('addSalesApp').disabled=!has;
   $('groupDates').textContent=has?`Desde ${date(selected)} hasta ${date(C.add(selected,6))}`:'Sin semana seleccionada';
   $('groupRows').innerHTML=(has?draft[selected].groups:[]).map((r,i)=>`<tr data-category-row="${i}"><td><input data-category="${i}" data-field="code" inputmode="numeric" aria-label="Número de grupo, fila ${i+1}" value="${esc(r.code)}"></td><td><input data-category="${i}" data-field="name" maxlength="200" aria-label="Nombre del grupo, fila ${i+1}" value="${esc(r.name)}"></td><td><input data-category="${i}" data-field="quantity" inputmode="decimal" aria-label="Cantidad, fila ${i+1}" value="${esc(formatInput(r.quantity))}"></td><td><input data-category="${i}" data-field="amount" inputmode="decimal" aria-label="Venta bruta, fila ${i+1}" value="${esc(formatInput(r.amount))}"></td><td><output data-net="${i}" title="${M.isCigarettes(r.code,r.name)?'Cigarros: neto igual al bruto':'Bruto dividido por 1,19'}">—</output></td><td><button type="button" data-remove-category="${i}" class="text-button" aria-label="Quitar categoría ${esc(r.name||i+1)}">Quitar</button></td></tr>`).join('');
   $('groupNoRows').hidden=has&&draft[selected].groups.length>0;
   $('groupNoRows').textContent=has?'Esta semana no tiene categorías. Agrega una o pega el reporte.':'Todavía no hay semanas guardadas.';
   $('appsRows').innerHTML=(has?draft[selected].apps:[]).map((app,i)=>`<tr><td><input data-app="${i}" data-field="name" aria-label="Nombre APP ${i+1}" maxlength="100" value="${esc(app.name)}"></td><td><input data-app="${i}" data-field="amount" inputmode="decimal" aria-label="Venta bruta APP ${i+1}" value="${esc(formatInput(app.amount))}"></td><td><output data-app-net="${i}">—</output></td><td><button type="button" data-remove-app="${i}" class="text-button">Quitar</button></td></tr>`).join('');
   updateTotals();
  }
  function renderWeeks(){
   const starts=Object.keys(draft).sort().reverse();
   $('groupWeekSelect').innerHTML=starts.length?starts.map(start=>{const w=C.weekInfo(start);return `<option value="${start}">${w.year} · Semana ${w.week} · ${date(start)}</option>`;}).join(''):'<option value="">Sin semanas</option>';
   $('groupWeekSelect').disabled=!starts.length;
   if(!selected||!Object.hasOwn(draft,selected))selected=starts[0]||null;
   if(selected){$('groupWeekSelect').value=selected;const w=C.weekInfo(selected);$('groupYear').value=w.year;$('groupWeek').value=w.week;}
   renderEditor();
  }
  $('groupSalesButton').addEventListener('click',()=>{
   draft=Object.fromEntries(Object.entries(getData()).map(([start,value])=>[start,M.normalizeWeek(value,C)]));const config=getConfig();
   selected=Object.keys(draft).sort().at(-1)||null;$('groupYear').value=config.year;$('groupWeek').value=config.startWeek;
   $('groupReportText').value='';$('groupPaste').open=false;error();invalidatePreview();renderWeeks();dialog.showModal();
  });
  $('groupWeekSelect').addEventListener('change',()=>{selected=$('groupWeekSelect').value;error();invalidatePreview();renderWeeks();});
  for(const id of ['groupYear','groupWeek'])$(id).addEventListener('input',invalidatePreview);
  $('addGroupWeek').addEventListener('click',()=>{
   try {const start=requestedStart();if(Object.hasOwn(draft,start))throw Error('Esa semana ya existe. Selecciónala en la lista para editarla.');draft[start]=M.blankWeek(selected?M.normalizeWeek(draft[selected],C):undefined);selected=start;error();invalidatePreview();renderWeeks();}catch(e){error(e.message);}
  });
  $('removeGroupWeek').addEventListener('click',()=>{if(!selected)return;delete draft[selected];selected=null;error();invalidatePreview();renderWeeks();});
  $('addSalesCategory').addEventListener('click',()=>{
   if(!selected)return;
   const used=new Set(draft[selected].groups.map(r=>Number(r.code)));let code=1;while(used.has(code))code++;
   draft[selected].groups.push({code,name:'',quantity:0,amount:0});error();renderEditor();
   $('groupRows').querySelector('tr:last-child [data-field="name"]').focus();
  });
  $('groupRows').addEventListener('input',event=>{const input=event.target.closest('[data-category]');if(!input||!selected)return;draft[selected].groups[+input.dataset.category][input.dataset.field]=input.value;error();updateTotals();});
  $('groupRows').addEventListener('click',event=>{const button=event.target.closest('[data-remove-category]');if(!button||!selected)return;draft[selected].groups.splice(+button.dataset.removeCategory,1);error();renderEditor();});
  $('addSalesApp').addEventListener('click',()=>{if(!selected)return;draft[selected].apps.push({name:'',amount:0});error();renderEditor();$('appsRows').querySelector('tr:last-child [data-field="name"]').focus();});
  $('appsRows').addEventListener('input',event=>{const input=event.target.closest('[data-app]');if(!input||!selected)return;draft[selected].apps[+input.dataset.app][input.dataset.field]=input.value;error();updateTotals();});
  $('appsRows').addEventListener('click',event=>{const button=event.target.closest('[data-remove-app]');if(!button||!selected)return;draft[selected].apps.splice(+button.dataset.removeApp,1);error();renderEditor();});
  $('groupReportText').addEventListener('input',invalidatePreview);
  $('reviewGroupReport').addEventListener('click',()=>{
   try {
    const parsed=M.parse($('groupReportText').value,C),start=M.resolveStart(parsed,C,Number($('groupYear').value),selected||requestedStart());
    M.validate({[start]:parsed.data},C);
    pending={...parsed,start};const w=C.weekInfo(start);
    const totalText=parsed.reportTotal?`\nBruto informado en el reporte: ${money.format(parsed.reportTotal.amount)}`:'';
    $('groupReportPreview').textContent=`Semana ${w.week} / ${w.year} · ${date(start)} al ${date(C.add(start,6))}\n${parsed.rows.length} categorías · ${parsed.apps.length} APPs · Bruto total: ${money.format(parsed.total.amount)} · Neto calculado: ${money.format(parsed.total.net)}${totalText}\n${Object.hasOwn(draft,start)?'Se reemplazará el desglose de esta semana.':'Se agregará esta semana.'}${parsed.warnings.length?'\n'+parsed.warnings.join('\n'):''}`;
    $('applyGroupReport').disabled=false;error();
   }catch(e){invalidatePreview();error(e.message);}
  });
  $('applyGroupReport').addEventListener('click',()=>{if(!pending)return;draft[pending.start]=structuredClone(pending.data);selected=pending.start;error();renderWeeks();invalidatePreview();$('groupReportText').value='';$('groupPaste').open=false;});
  $('groupSalesForm').addEventListener('submit',event=>{
   event.preventDefault();
   try {
    const data={};
    for(const [start,rows] of Object.entries(draft)){
     try{data[start]=M.normalizeWeek(rows,C);}catch(e){selected=start;renderWeeks();throw e;}
    }
    M.validate(data,C);commitData(data);error();$('groupSalesStatus').textContent='Desglose guardado.';
   }catch(e){error(e.message);}
  });
 }
 window.IndicatorGroupSales={init};
})();
