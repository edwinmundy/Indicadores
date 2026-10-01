/* Borrador de cierres por cajero, separado de ventas y de los demás indicadores. */
(function(){
 'use strict';
 function init({getConfig,getPeriods,getData,commitData,formatDate,formatValue,escapeHtml}){
  const C=IndicatorCore,M=IndicatorCashModel,$=id=>document.getElementById(id),dialog=$('cashDialog'),esc=escapeHtml;
  const integer=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
  let data,config,periods,key,edited=false,cleared=false;
  function error(text=''){$('cashError').textContent=text;$('cashError').hidden=!text;}
  function count(input){if(input.value==='')return 0;const value=Number(input.value);if(!Number.isSafeInteger(value)||value<0||value>1e10)throw Error('Ingresa cierres enteros de 0 o más.');return value;}
  function readRows(){
   const rows=[];
   for(const row of $('cashRows').children){
    const name=row.querySelector('[data-cash-name]').value.trim(),good=count(row.querySelector('[data-cash-good]')),bad=count(row.querySelector('[data-cash-bad]'));
    if(!name&&good===0&&bad===0)continue;
    if(!name)throw Error('Escribe el nombre de cada cajero con cierres.');
    rows.push({name,good,bad});
   }
   M.validate({cashiers:rows});return rows;
  }
  function rowHtml(row={name:'',good:0,bad:0}){
   return `<tr><td><input type="number" min="0" step="1" data-cash-good aria-label="Cierres buenos" value="${row.good}" placeholder="0"></td><td><input type="number" min="0" step="1" data-cash-bad aria-label="Cierres malos" value="${row.bad}" placeholder="0"></td><td><input type="text" maxlength="160" data-cash-name aria-label="Nombre del cajero" value="${esc(row.name)}"></td><td><button type="button" class="text-button" data-cash-remove aria-label="Quitar cajero">Quitar</button></td></tr>`;
  }
  function totals(){
   if(key.startsWith('m:')){
    const record=data.cashClosings[key];
    $('cashTotals').innerHTML=`<tr><th colspan="2">Promedio mensual</th><td colspan="2">${esc(formatValue(M.result(record),'cashClosings'))}</td></tr><tr><th colspan="2">Días con datos</th><td colspan="2">${record?.days||0}</td></tr>`;
    return;
   }
   try{
    const record={cashiers:readRows()},summary=M.totals(record),value=M.result(record);
    $('cashTotals').innerHTML=`<tr><th>${integer.format(summary.good)}</th><th>${integer.format(summary.bad)}</th><th colspan="2">Total de cierres: ${integer.format(summary.total)}</th></tr><tr><th colspan="2">Porcentaje alcanzado</th><td colspan="2">${esc(formatValue(value,'cashClosings'))}</td></tr>`;
   }catch(error){$('cashTotals').innerHTML='<tr><td colspan="4">Completa las cantidades y los nombres de los cajeros.</td></tr>';}
  }
  function capture(){
   if(!key.startsWith('m:')){
   const record={cashiers:readRows()};
   if(cleared&&!record.cashiers.length)delete data.cashClosings[key];
   else if(edited)data.cashClosings[key]={...data.cashClosings[key],...record};
   }
   const input=$('cashGoal'),goal=input.value===''?.9:Number(input.value)/100;
   if(goal!==null&&(!Number.isFinite(goal)||goal<M.minimumGoal||goal>1))throw Error('Ingresa un objetivo porcentual válido, de hasta 100 %.');
   config.goals.cashClosings[key]=goal;
  }
  function render(){
   data=M.indicatorData(data,C);
   const period=periods.find(p=>p.key===key),record=data.cashClosings[key];
   const monthly=period.kind==='month';
   for(const id of ['cashAdd','cashClear','cashPastePanel'])$(id).hidden=monthly;
   $('cashRows').closest('table').querySelector('thead').hidden=monthly;
   $('cashFormula').textContent=monthly?'Promedio de porcentajes semanales ponderado por los días calendario de cada semana dentro del mes. Solo se incluyen semanas con cierres.':M.description;
   $('cashPeriod').value=key;$('cashRange').textContent=formatDate(period.start)+' – '+formatDate(period.end)+' · '+period.year;
   $('cashGoal').value=Number((IndicatorObjectivesModel.cashGoal(config,key)*100).toPrecision(14));
   if(Number.isFinite(M.minimumGoal))$('cashGoal').min=M.minimumGoal*100;else $('cashGoal').removeAttribute('min');
   $('cashGoal').max='100';
   $('cashRows').innerHTML=(monthly?[]:record?.cashiers||[]).map(rowHtml).join('');
   $('cashPaste').value='';$('cashPastePanel').open=false;edited=false;cleared=false;totals();
   $('cashStatus').textContent=monthly?'Promedio automático a partir de las semanas.':record?.value!=null&&!record.cashiers?'Cantidad anterior conservada: '+integer.format(record.value)+'. Ingresa el detalle para calcular el porcentaje.':'';
  }
  function open(focusGoals=false){
   if(getConfig().metric!=='cashClosings')return;
   config=structuredClone(getConfig());data=structuredClone(getData());data.cashClosings??={};config.goals??={};
   if(config.cashClosingsVersion!==2){
    config.cashClosingsLegacy={goals:config.goals.cashClosings||{},scale:config.scales?.cashClosings||null};
    config.goals.cashClosings={};config.cashClosingsVersion=2;
    if(config.scales?.cashClosings?.unit!=='percent')delete config.scales.cashClosings;
   }
   config.goals.cashClosings??={};
   if(config.cashClosingsGoalVersion!==1){
    for(const periodKey of Object.keys(config.goals.cashClosings))config.goals.cashClosings[periodKey]=IndicatorObjectivesModel.cashGoal(config,periodKey);
    config.cashClosingsGoalVersion=1;
   }
   periods=getPeriods();
   $('cashPeriod').innerHTML=periods.map(p=>`<option value="${p.key}">${esc((p.kind==='month'?p.label:'Semana '+p.label)+' '+p.year)}</option>`).join('');
   key=periods.find(p=>p.kind==='week').key;
   $('cashFormula').textContent=M.description;
   error();render();dialog.showModal();if(focusGoals)$('cashGoal').focus();
  }
  $('independentButton').addEventListener('click',()=>open());
  $('goalsButton').addEventListener('click',()=>open(true));
  $('cashPeriod').addEventListener('change',()=>{try{capture();key=$('cashPeriod').value;error();render();}catch(e){$('cashPeriod').value=key;error(e.message);}});
  $('cashRows').addEventListener('input',()=>{edited=true;cleared=false;error();$('cashStatus').textContent='';totals();});
  $('cashGoal').addEventListener('input',()=>{error();$('cashStatus').textContent='';});
  $('cashRows').addEventListener('click',event=>{const button=event.target.closest('[data-cash-remove]');if(!button)return;button.closest('tr').remove();edited=true;cleared=false;totals();$('cashStatus').textContent='';});
  $('cashAdd').addEventListener('click',()=>{$('cashRows').insertAdjacentHTML('beforeend',rowHtml());edited=true;cleared=false;$('cashRows').lastElementChild.querySelector('[data-cash-name]').focus();});
  $('cashClear').addEventListener('click',()=>{$('cashRows').replaceChildren();edited=true;cleared=true;error();totals();$('cashStatus').textContent='';});
  $('cashImport').addEventListener('click',()=>{try{const rows=M.parse($('cashPaste').value,C);$('cashRows').innerHTML=rows.map(rowHtml).join('');edited=true;cleared=false;error();totals();$('cashStatus').textContent='Reporte incorporado al borrador.';}catch(e){error(e.message);}});
  $('cashForm').addEventListener('submit',event=>{
   event.preventDefault();
   try{capture();data=M.indicatorData(data,C);C.independentModel.validate(data,C);C.configValid(config);commitData(structuredClone(data),structuredClone(config));edited=false;cleared=false;error();$('cashStatus').textContent='Cierres guardados.';}catch(e){error(e.message);}
  });
 }
 window.IndicatorCash=Object.freeze({init});
})();
