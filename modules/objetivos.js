/* Editor anual: borradores mensuales y ajustes manuales por período. */
(function () {
  'use strict';
  function init({getConfig,getPeriods,commitConfig,formatValue,formatDate,escapeHtml}) {
    const $=id=>document.getElementById(id),dialog=$('goalsDialog');
    const M=IndicatorObjectivesModel,C=IndicatorCore,esc=escapeHtml;
    const numbers=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2});
    const mcPoints=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0,useGrouping:false});
    const currencies=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
    let draft,periods,year;
    function showError(text=''){$('goalsError').textContent=text;$('goalsError').hidden=!text;}
    function ensurePlan(y) {
      draft.objectivePlans??={};
      if(!draft.objectivePlans[y]) {
        const seed=window.INDICADOR_OBJECTIVES_BASE;
        draft.objectivePlans[y]=M.emptyPlan(seed?.year===Number(y)?seed:null);
      }
      return draft.objectivePlans[y];
    }
    function display(v,type){return v===null?'—':type==='money'?currencies.format(v):type==='percent'?numbers.format(v*100)+' %':numbers.format(v);}
    function currentPlan(){return draft.objectivePlans[year];}
    function renderAnnual() {
      const plan=ensurePlan(year);
      $('goalsYear').value=year;
      $('goalsSource').textContent=`Objetivos ${year}`+(Number(year)===window.INDICADOR_OBJECTIVES_BASE?.year?' · Base: objetivos.xlsx':' · Tabla anual');
      $('visitsGoalMode').value=plan.visitsMode;
      $('annualGoalsHead').innerHTML='<tr><th scope="col">Objetivos / mes</th>'+C.months.map(m=>`<th scope="col">${m.toUpperCase()}</th>`).join('')+'</tr>';
      $('annualGoalsRows').innerHTML=M.rows.map(row=>`<tr class="${row.formula?'formula-row':''} ${row.id==='weeklySales'?'annual-divider':''}"><th scope="row">${esc(row.label)}${row.formula?`<small title="${esc(row.formula)}">Calculado</small>`:''}</th>`+C.months.map((month,i)=>{
        const v=M.value(plan,row.id,i);
        return row.formula?`<td><output data-result="${row.id}" data-month="${i}" title="${esc(row.formula)}">${esc(display(v,row.type))}</output></td>`:
          `<td><input type="text" inputmode="decimal" data-field="${row.id}" data-month="${i}" aria-label="${esc(row.label)} ${month} ${year}" placeholder="Sin dato" value="${v===null?'':esc(row.id==='mc'?mcPoints.format(v*100):numbers.format(row.type==='percent'?v*100:v))}"></td>`;
      }).join('')+'</tr>').join('');
    }
    function updateCalculated() {
      dialog.querySelectorAll('[data-result]').forEach(output=>{
        const row=M.rows.find(r=>r.id===output.dataset.result);
        output.textContent=display(M.value(currentPlan(),row.id,Number(output.dataset.month)),row.type);
      });
      updateAutomaticTargets();
    }
    function goalInput(v){return v===null||v===undefined?'':draft.metric==='mc'?Number(mcPoints.format(v*100)):v;}
    function manualTargets(){return draft.goals[draft.metric];}
    function renderPeriods() {
      $('goals').innerHTML=periods.map(period=>{
        const manual=Object.hasOwn(manualTargets(),period.key),v=M.goal(draft,period);
        return `<tr><td>${period.kind==='month'?esc(period.label):'Semana '+period.label} ${period.year}</td><td>${formatDate(period.start)} – ${formatDate(period.end)}</td><td>${esc(formatValue(period.value))}</td>
        <td><select data-goal-source="${period.key}" aria-label="Origen ${esc(period.short)} ${period.year}"><option value="annual" ${manual?'':'selected'}>Tabla anual</option><option value="manual" ${manual?'selected':''}>Manual</option></select></td>
        <td><input type="number" ${draft.metric==='mc'?'':'min="0"'} step="any" placeholder="Sin objetivo" aria-label="Objetivo ${esc(period.short)} ${period.year}" data-goal="${period.key}" value="${goalInput(v)}" ${manual?'':'disabled'}></td></tr>`;
      }).join('');
      updateCount();
    }
    function updateCount(){const count=periods.filter(p=>Object.hasOwn(manualTargets(),p.key)).length;$('overrideCount').textContent=`· ${count} metas manuales`;}
    function updateAutomaticTargets(){for(const period of periods){const input=dialog.querySelector(`[data-goal="${period.key}"]`);if(input?.disabled)input.value=goalInput(M.annualGoal(draft,period));}updateCount();}
    $('goalsButton').addEventListener('click',()=>{
      if(C.metrics[getConfig().metric].independent)return;
      draft=structuredClone(getConfig());draft.goals??={};draft.goals[draft.metric]??={};
      periods=getPeriods();year=draft.year;
      if(['uber','pddya','rappi'].includes(draft.metric))for(const period of periods)if(!Object.hasOwn(draft.goals[draft.metric],period.key))draft.goals[draft.metric][period.key]=null;
      $('goalsContext').textContent=draft.title;
      $('goalsTargetHeader').textContent=draft.metric==='mc'?'Objetivo (%)':'Objetivo';
      renderAnnual();renderPeriods();showError();
      $('periodOverrides').open=periods.some(p=>Object.hasOwn(manualTargets(),p.key));
      dialog.showModal();dialog.scrollTop=0;dialog.querySelector('.annual-scroll').scrollLeft=0;
    });
    $('goalsYear').addEventListener('change',()=>{
      const next=Number($('goalsYear').value);
      if(!Number.isInteger(next)||next<2000||next>2100){showError('El año debe estar entre 2000 y 2100.');$('goalsYear').value=year;return;}
      if(!$('goalsForm').reportValidity()){$('goalsYear').value=year;return;}
      year=next;renderAnnual();updateAutomaticTargets();showError();
    });
    $('annualGoalsRows').addEventListener('input',event=>{
      const input=event.target.closest('[data-field]');if(!input)return;
      try {
        const row=M.rows.find(r=>r.id===input.dataset.field);
        let value=input.value.trim()===''?null:C.number(input.value);
        if(value!==null&&row.type==='percent')value/=100;
        if(value!==null&&((!row.negative&&value<0)||(row.id==='effectiveDays'&&value<=0)))throw Error(row.id==='effectiveDays'?'Los días efectivos deben ser mayores que cero.':'Ingresa un valor de 0 o más.');
        currentPlan().values[row.id][Number(input.dataset.month)]=value;
        input.setCustomValidity('');input.removeAttribute('aria-invalid');showError();updateCalculated();
      }catch(error){input.setCustomValidity(error.message);input.setAttribute('aria-invalid','true');showError(error.message);}
    });
    $('annualGoalsRows').addEventListener('change',event=>{const input=event.target.closest('[data-field="mc"]');if(input&&input.value!==''&&!input.validationMessage){const value=currentPlan().values.mc[Number(input.dataset.month)];input.value=value===null?'':mcPoints.format(value*100);}});
    $('goals').addEventListener('change',event=>{const input=event.target.closest('[data-goal]');if(input&&draft.metric==='mc')input.value=goalInput(manualTargets()[input.dataset.goal]);});
    $('visitsGoalMode').addEventListener('change',()=>{currentPlan().visitsMode=$('visitsGoalMode').value;updateAutomaticTargets();});
    $('goals').addEventListener('change',event=>{
      const select=event.target.closest('[data-goal-source]');if(!select)return;
      const key=select.dataset.goalSource,p=periods.find(p=>p.key===key),input=dialog.querySelector(`[data-goal="${key}"]`);
      if(select.value==='annual'){delete manualTargets()[key];input.disabled=true;input.value=goalInput(M.annualGoal(draft,p));}
      else {manualTargets()[key]=M.annualGoal(draft,p);input.disabled=false;input.value=goalInput(manualTargets()[key]);}
      updateCount();
    });
    $('goals').addEventListener('input',event=>{
      const input=event.target.closest('[data-goal]');if(!input)return;
      const v=input.value===''?null:Number(input.value)/(draft.metric==='mc'?100:1);
      if(v===null||Number.isFinite(v)&&(draft.metric==='mc'||v>=0))manualTargets()[input.dataset.goal]=v;
    });
    $('useAnnualGoals').addEventListener('click',()=>{for(const p of periods)delete manualTargets()[p.key];renderPeriods();showError();});
    $('goalsForm').addEventListener('submit',event=>{
      event.preventDefault();
      try {
        if(!$('goalsForm').reportValidity())return;
        const config=structuredClone(getConfig());
        // No transfiere cambios de escala ni de ventas.
        config.objectivePlans=draft.objectivePlans;
        config.goals=draft.goals;
        for(const plan of Object.values(config.objectivePlans))M.validate(plan);
        commitConfig(config);dialog.close();
      }catch(error){showError(error.message);}
    });
  }
  window.IndicatorGoals=Object.freeze({init});
})();
