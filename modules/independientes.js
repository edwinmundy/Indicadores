/* Editor aislado de datos y objetivos por período. */
(function(){
 'use strict';
 function init({getConfig,getPeriods,getData,commitData,formatDate,formatValue,escapeHtml}){
  const C=IndicatorCore,M=IndicatorIndependentModel,$=id=>document.getElementById(id),dialog=$('independentDialog'),esc=escapeHtml;
  let data,config,periods,metric;
  function error(text=''){$('independentError').textContent=text;$('independentError').hidden=!text;}
  function input(field,value,label){return `<input type="number" min="0" step="1" data-independent-field="${field}" aria-label="${esc(label)}" value="${value??''}" placeholder="Sin dato">`;}
  function read(input){if(input.value==='')return null;const value=Number(input.value);if(!Number.isSafeInteger(value)||value<0||value>1e13)throw Error('Ingresa cantidades enteras de 0 o más.');return value;}
  function readPercent(input){if(input.value==='')return null;const value=Number(input.value);if(!Number.isFinite(value)||value<0||value>1e13)throw Error('Ingresa un porcentaje de 0 o más.');return value/100;}
  function captureRow(row){
   const result={};for(const input of row.querySelectorAll('[data-independent-field]'))result[input.dataset.independentField]=read(input);
   return result;
  }
  function open(focusGoals=false){
   metric=getConfig().metric;if(!C.metrics[metric].independent||metric==='cashClosings')return;
   config=structuredClone(getConfig());data=structuredClone(getData());data[metric]??={};config.goals??={};config.goals[metric]??={};periods=getPeriods();
   if(metric==='removedSkus'&&config.removalGoalsVersion!==1){config.removalLegacyGoals=config.goals.removedSkus;config.goals.removedSkus={};config.removalGoalsVersion=1;}
   const negative=metric==='negativeSkus',fixed=Object.hasOwn(C.metrics[metric],'fixedGoal');
   $('independentTitle').textContent=C.metrics[metric].label;
   $('independentDescription').textContent=negative?'Negativos ÷ vigentes × 100 · Objetivo fijo: 0 %. Cada mes y semana se ingresa por separado.':metric==='complaints'?'Objetivo: 0 reclamos. Cero cumple; cualquier cantidad mayor que cero queda fuera del objetivo.':metric==='compliments'?'Toda cantidad mayor que cero es positiva. Cada mes y semana se ingresa por separado.':'Cantidades propias por período. Cada mes y semana se ingresa por separado.';
   if(metric==='removedSkus')$('independentDescription').textContent='Semanas: eliminaciones ÷ venta bruta. Meses: promedio de porcentajes semanales ponderado por los días calendario de cada semana dentro del mes; solo semanas con datos completos.';
   $('independentDirectionLabel').hidden=fixed;
   $('independentDirection').value=config.independentDirections?.[metric]||(metric==='removedSkus'?'lower':'higher');
   $('independentHead').innerHTML='<tr><th>Período</th><th>Fechas</th>'+(negative?'<th>SKUs negativos</th><th>SKUs vigentes</th><th>Resultado</th>':metric==='removedSkus'?'<th>Eliminación (%)</th>':'<th>Cantidad</th>')+`<th>Objetivo${metric==='removedSkus'?' (%)':''}</th><th></th></tr>`;
   $('independentRows').innerHTML=periods.map(p=>{
    const record=data[metric][p.key]||{},label=(p.kind==='month'?p.label:'Semana '+p.label)+' '+p.year;
    if(metric==='removedSkus')return `<tr data-independent-period="${p.key}"><th scope="row">${esc(label)}</th><td>${formatDate(p.start)} – ${formatDate(p.end)}</td><td><input type="number" min="0" step="any" data-removal-ratio value="${record.ratio==null?'':Number((record.ratio*100).toFixed(1))}" aria-label="Eliminación (%) · ${esc(label)}" placeholder="Sin dato" readonly></td><td><input type="number" min="0" step="any" data-independent-goal value="${config.goals[metric][p.key]==null?'':Number((config.goals[metric][p.key]*100).toFixed(1))}" aria-label="Objetivo (%) · ${esc(label)}" placeholder="Sin objetivo"></td><td>${p.kind==='week'?'Automático':`Automático · ${record.days||0} días`}</td></tr>`;
    return `<tr data-independent-period="${p.key}"><th scope="row">${esc(label)}</th><td>${formatDate(p.start)} – ${formatDate(p.end)}</td>`+
     (negative?`<td>${input('negative',record.negative,'Negativos · '+label)}</td><td>${input('active',record.active,'Vigentes · '+label)}</td><td data-independent-result>${esc(formatValue(M.result(metric,record)))}</td>`:`<td>${input('value',record.value,'Cantidad · '+label)}</td>`)+
     `<td>${fixed?`<span>${negative?'0 %':'0'}</span>`:`<input type="number" min="0" step="1" data-independent-goal aria-label="Objetivo · ${esc(label)}" value="${config.goals[metric][p.key]??''}" placeholder="Sin objetivo">`}</td><td><button type="button" class="text-button" data-independent-clear aria-label="Quitar dato · ${esc(label)}">Quitar dato</button></td></tr>`;
   }).join('');
   error();$('independentStatus').textContent='';dialog.showModal();
   if(focusGoals)dialog.querySelector('[data-independent-goal]')?.focus();
  }
  $('independentButton').addEventListener('click',()=>open());
  $('goalsButton').addEventListener('click',()=>{if(C.metrics[getConfig().metric].independent)open(true);});
  $('independentRows').addEventListener('input',event=>{
   const row=event.target.closest('[data-independent-period]');if(!row)return;
   $('independentStatus').textContent='';error();
   const output=row.querySelector('[data-independent-result]');if(output){try{output.textContent=formatValue(M.result(metric,captureRow(row)));}catch(e){output.textContent='—';}}
  });
  $('independentRows').addEventListener('click',event=>{
   if(!event.target.closest('[data-independent-clear]'))return;
   const row=event.target.closest('[data-independent-period]');
   row.querySelectorAll('[data-independent-field],[data-removal-ratio]').forEach(input=>input.value='');
   const output=row.querySelector('[data-independent-result]');if(output)output.textContent='Sin datos';
   $('independentStatus').textContent='';error();
  });
  $('independentForm').addEventListener('submit',event=>{
   event.preventDefault();
   try{
    const next=structuredClone(data),nextConfig=structuredClone(config);
    for(const row of $('independentRows').children){
     if(metric==='removedSkus'){
      const key=row.dataset.independentPeriod;
      nextConfig.goals[metric][key]=readPercent(row.querySelector('[data-independent-goal]'));continue;
     }
     const key=row.dataset.independentPeriod,record=captureRow(row);
     if(Object.values(record).every(value=>value===null))delete next[metric][key];else next[metric][key]=record;
     const goal=row.querySelector('[data-independent-goal]');if(goal)nextConfig.goals[metric][key]=read(goal);
    }
    if(Object.hasOwn(C.metrics[metric],'fixedGoal'))delete nextConfig.goals[metric];
    else{nextConfig.independentDirections??={};nextConfig.independentDirections[metric]=$('independentDirection').value;}
    M.validate(next,C);C.configValid(nextConfig);commitData(next,nextConfig);data=structuredClone(next);config=structuredClone(nextConfig);
    error();$('independentStatus').textContent='Datos guardados.';
   }catch(e){error(e.message);}
  });
 }
 window.IndicatorIndependent=Object.freeze({init});
})();
