/* Editor de escala independiente; MC se edita en puntos porcentuales. */
(function () {
  'use strict';
  function init({ getConfig, getPeriods, commitConfig, formatValue }) {
    const $ = id => document.getElementById(id), dialog = $('scaleDialog');
    const isPercent = () => IndicatorCore.isPercent(getConfig().metric);
    const allowsNegative = () => isPercent() || getConfig().metric === 'complaints';
    const inputValue = value => Number((value*(isPercent()?100:1)).toFixed(getConfig().metric==='mc'?0:1));
    const formatScale = value => new Intl.NumberFormat('es-CL',{style:isPercent()?'percent':'decimal',maximumFractionDigits:getConfig().metric==='mc'?0:1}).format(value);
    const readValue = input => isPercent() && input.dataset.rawValue !== undefined && input.value === input.dataset.displayValue ? Number(input.dataset.rawValue) : Number(input.value) / (isPercent() ? 100 : 1);
    function setInput(input,value){input.value=inputValue(value);input.dataset.rawValue=String(value);input.dataset.displayValue=input.value;}
    const trim = value => isPercent() ? value : IndicatorScaleModel.truncate(value);
    const withUnit = scale => isPercent() ? {...scale, unit:'percent'} : getConfig().metric==='complaints' ? {...scale,allowNegative:true} : scale;
    function showError(text = '') {
      $('scaleError').textContent = text;
      $('scaleError').hidden = !text;
    }
    function renderLevels(scale) {
      $('scaleLevels').innerHTML = IndicatorScaleModel.levels(scale).map((v,i) => `<tr><td>${i+1}</td><td><input type="number" ${allowsNegative()?'':'min="0"'} step="any" required data-scale-level="${i}" data-raw-value="${v}" data-display-value="${inputValue(v)}" aria-label="Nivel ${i+1}${isPercent()?' (%)':''}" value="${inputValue(v)}" ${i===0||i===12?'readonly':''}><small>${formatScale(v)}</small></td></tr>`).join('');
    }
    function regenerateLevels() {
      const min = readValue($('scaleMin')), max = readValue($('scaleMax'));
      if ($('scaleMin').value !== '' && $('scaleMax').value !== '' && Number.isFinite(min) && Number.isFinite(max) && (allowsNegative() || min >= 0) && max > min) {
        try { renderLevels(IndicatorScaleModel.normalize(withUnit({min,max}))); }
        catch (error) { showError(error.message); }
      }
    }
    for (const id of ['scaleMin','scaleMax']) {
      $(id).addEventListener('input', () => { showError(); $('scaleSuggestion').textContent=''; regenerateLevels(); });
      $(id).addEventListener('change', () => {
        if ($(id).value !== '') { setInput($(id),trim(readValue($(id)))); regenerateLevels(); }
      });
    }
    $('scaleButton').addEventListener('click', () => {
      const config = getConfig(), scale = IndicatorCore.metricScale(config);
      $('scaleContext').textContent = config.title;
      $('scaleMinLabel').textContent = isPercent() ? 'Mínimo (%)' : 'Mínimo';
      $('scaleMaxLabel').textContent = isPercent() ? 'Máximo (%)' : 'Máximo';
      $('scaleRoundingNote').hidden = isPercent()||!!IndicatorCore.metrics[getConfig().metric].independent;
      for (const id of ['scaleMin','scaleMax']) {
        if (allowsNegative()) $(id).removeAttribute('min'); else $(id).min='0';
      }
      setInput($('scaleMin'),scale.min);
      setInput($('scaleMax'),scale.max);
      renderLevels(scale); showError(); dialog.showModal();
    });
    $('autoScale').addEventListener('click', () => {
      const values = getPeriods().flatMap(p => [p.value,p.goal]).filter(v => v !== null && Number.isFinite(v));
      let min=0, max;
      if (getConfig().metric==='complaints') {
        max=Math.max(10,...values.map(value=>Math.ceil(Math.abs(value))));min=-max;
      } else if (isPercent()) {
        const sku=['negativeSkus','removedSkus'].includes(getConfig().metric),step=sku ? 0.001 : 0.05;
        const low=sku?0:Math.min(0,...values), high=Math.max(0,...values), span=Math.max(sku ? 0.001 : 0.1,high-low);
        min=Math.floor((low-(low<0?span*.1:0))/step)*step;
        max=values.length?Math.ceil((high+span*.1)/step)*step:IndicatorCore.metrics[getConfig().metric].max;
      } else {
        const top=Math.max(1,...values)*1.1, step=10**(Math.floor(Math.log10(top))-1);
        max=Math.ceil(top/step)*step;
      }
      setInput($('scaleMin'),min); setInput($('scaleMax'),max);
      showError(); regenerateLevels();
      $('scaleSuggestion').textContent=`Propuesta: de ${formatScale(min)} a ${formatScale(max)}. Se aplicará al guardar.`;
    });
    dialog.addEventListener('close', () => { $('scaleSuggestion').textContent=''; });
    $('scaleForm').addEventListener('submit', event => {
      event.preventDefault();
      try {
        if ($('scaleMin').value === '' || $('scaleMax').value === '') throw Error('Completa ambos límites de la escala.');
        const min=trim(readValue($('scaleMin'))), max=trim(readValue($('scaleMax')));
        const inputs=Array.from(dialog.querySelectorAll('[data-scale-level]'));
        if (inputs.some(input=>input.value==='')) throw Error('Completa todos los niveles de la escala.');
        const levels=inputs.map(input=>trim(readValue(input)));
        levels[0]=min; levels[12]=max;
        const config=structuredClone(getConfig());
        config.scales[config.metric]=IndicatorScaleModel.normalize(withUnit({min,max,levels}));
        commitConfig(config); dialog.close();
      } catch(error) { showError(error.message); }
    });
    $('scaleLevels').addEventListener('input', event => {
      const input=event.target.closest('[data-scale-level]');
      if(input) { showError(); input.nextElementSibling.textContent=input.value===''?'':formatScale(readValue(input)); }
    });
    $('scaleLevels').addEventListener('change', event => {
      const input=event.target.closest('[data-scale-level]');
      if(input && input.value!=='') {
        setInput(input,trim(readValue(input)));
        input.nextElementSibling.textContent=formatScale(readValue(input));
      }
    });
  }
  window.IndicatorScale=Object.freeze({init});
})();
