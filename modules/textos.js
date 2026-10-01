(function(){
 'use strict';
 function init({getConfig,getPeriods,commitConfig,escapeHtml:esc}){
  const C=IndicatorCore,M=IndicatorTextModel,$=id=>document.getElementById(id),dialog=$('indicatorTextDialog');
  let config,base;
  const visibility=document.createElement('label');visibility.className='indicator-hide-values';visibility.title='Ocultar los valores de escala, objetivos y resultados al exportar este indicador';
  visibility.innerHTML='<input id="indicatorHideValues" type="checkbox"> Ocultar valores en Excel';$('scaleButton').before(visibility);
  const button=document.createElement('button');button.type='button';button.textContent='Textos del indicador';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','indicatorTextDialog');$('goalsButton').after(button);
  function preview(){$('indicatorHeaderPreview').textContent=$('indicatorText-centerHeader').value;}
  function render(values){
   $('indicatorTextFields').innerHTML=M.fields.map(field=>`<label class="${field.multiline?'indicator-text-wide':''}">${esc(field.label)}${field.multiline?`<textarea id="indicatorText-${field.key}" maxlength="${field.limit}" rows="3">${esc(values[field.key])}</textarea>`:`<input id="indicatorText-${field.key}" type="text" maxlength="${field.limit}" value="${esc(values[field.key])}">`}</label>`).join('');
   preview();
  }
  button.addEventListener('click',()=>{
   config=structuredClone(getConfig());base=M.defaults(config,getPeriods(),C);
   $('indicatorTextContext').textContent=config.title;
   render({...base,...config.indicatorText?.[config.metric]});$('indicatorTextError').hidden=true;$('indicatorTextStatus').textContent='';dialog.showModal();
  });
  $('indicatorTextFields').addEventListener('input',()=>{preview();$('indicatorTextStatus').textContent='Cambios pendientes de guardar.';$('indicatorTextError').hidden=true;});
  $('indicatorHideValues').addEventListener('change',()=>{
   try{
    const next=structuredClone(getConfig());next.indicatorText??={};next.indicatorText[next.metric]??={};
    next.indicatorText[next.metric].hideValues=$('indicatorHideValues').checked;commitConfig(next);
   }catch(error){$('indicatorHideValues').checked=getConfig().indicatorText?.[getConfig().metric]?.hideValues===true;alert(error.message);}
  });
  $('indicatorTextReset').addEventListener('click',()=>{render(base);$('indicatorTextStatus').textContent='Valores predeterminados. Pendiente de guardar.';});
  $('indicatorTextForm').addEventListener('submit',event=>{
   event.preventDefault();
   try{
    const values={};for(const field of M.fields){const value=$('indicatorText-'+field.key).value.replace(/\r\n?/g,'\n');if(value!==base[field.key])values[field.key]=value;}
    if($('indicatorHideValues').checked)values.hideValues=true;
    const next=structuredClone(config);next.indicatorText??={};next.indicatorText[config.metric]=values;
    M.validate(next.indicatorText);commitConfig(next);config=next;
    $('indicatorTextError').hidden=true;$('indicatorTextStatus').textContent='Textos guardados para este indicador.';
   }catch(error){$('indicatorTextError').textContent=error.message;$('indicatorTextError').hidden=false;}
  });
 }
 window.IndicatorText=Object.freeze({init});
})();
