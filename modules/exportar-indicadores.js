(function(){
 'use strict';
 function init({getState,getTemplate,download,escapeHtml:esc}){
  const $=id=>document.getElementById(id),dialog=$('multiExportDialog');let selection=null,busy=false,mode='excel';const hiddenValues=new Map();
  const button=document.createElement('button');button.id='exportIndicators';button.type='button';button.textContent='↓ Exportar varios';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','multiExportDialog');$('export').after(button);
  const pdfButton=document.createElement('button');pdfButton.id='exportIndicatorsPdf';pdfButton.type='button';pdfButton.textContent='↓ Exportar PDF';pdfButton.setAttribute('aria-haspopup','dialog');pdfButton.setAttribute('aria-controls','multiExportDialog');button.after(pdfButton);
  function choices(){return Array.from(dialog.querySelectorAll('[data-export-metric]'));}
  function hideChoices(){return Array.from(dialog.querySelectorAll('[data-hide-metric]'));}
  function update(){const count=choices().filter(input=>input.checked).length;$('multiExportSubmit').disabled=!count||busy;$('multiExportCount').textContent=count+' indicadores seleccionados'+(mode==='pdf'?' · '+Math.ceil(count/4)+' páginas · máximo 4 por página':'');}
  function open(format){
   mode=format;$('multiExportEyebrow').textContent=mode==='pdf'?'PDF · HASTA 4 INDICADORES POR PÁGINA':'UN SOLO LIBRO EXCEL';$('multiExportSubmit').textContent=mode==='pdf'?'Descargar PDF':'Descargar libro';
   const state=getState();selection??=new Set([state.config.metric]);
   $('multiExportChoices').innerHTML=Array.from($('metric').options).map(option=>{
    const metric=option.value,hidden=hiddenValues.get(metric)===true;
    const visibility=mode==='pdf'?'<span class="multi-export-pdf-lock">Solo porcentajes visibles</span>':`<label class="multi-export-hide" title="Ocultar los valores de este indicador en el libro Excel"><input type="checkbox" data-hide-metric="${esc(metric)}" ${hidden?'checked':''} aria-label="Ocultar valores de ${esc(option.textContent)}"><span class="multi-export-switch"></span></label>`;
    return `<div class="multi-export-choice"><input type="checkbox" data-export-metric="${esc(metric)}" ${selection.has(metric)?'checked':''} aria-label="Exportar ${esc(option.textContent)}">${visibility}<span class="multi-export-name">${esc(option.textContent)}</span></div>`;
   }).join('');
   $('multiExportStatus').textContent='';$('multiExportError').hidden=true;update();dialog.showModal();
  }
  button.addEventListener('click',()=>open('excel'));pdfButton.addEventListener('click',()=>open('pdf'));
  $('multiExportChoices').addEventListener('change',event=>{const metric=event.target.dataset.hideMetric;if(metric)hiddenValues.set(metric,event.target.checked);update();});
  $('multiExportAll').addEventListener('click',()=>{choices().forEach(input=>input.checked=true);update();});
  $('multiExportNone').addEventListener('click',()=>{choices().forEach(input=>input.checked=false);update();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('multiExportForm').addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;
   const metrics=choices().filter(input=>input.checked).map(input=>input.dataset.exportMetric);if(!metrics.length)return;
   selection=new Set(metrics);const snapshot=structuredClone(getState()),template=getTemplate();
   busy=true;button.disabled=true;pdfButton.disabled=true;dialog.querySelectorAll('button,input').forEach(input=>input.disabled=true);$('multiExportError').hidden=true;
   try{
    const progress=text=>$('multiExportStatus').textContent=text;
    if(mode==='excel'){
     snapshot.config.indicatorText??={};
     for(const metric of metrics){snapshot.config.indicatorText[metric]??={};snapshot.config.indicatorText[metric].hideValues=hiddenValues.get(metric)===true;}
    }
    const blob=mode==='pdf'?await IndicatorPdf.export(snapshot,metrics,progress):await IndicatorExcel.exportMany(template,snapshot,metrics,progress);
    download(blob,`INDICADORES-${snapshot.config.year}-S${snapshot.config.startWeek}.${mode==='pdf'?'pdf':'xlsx'}`);
    $('multiExportStatus').textContent=mode==='pdf'?`PDF descargado con ${metrics.length} indicadores en ${Math.ceil(metrics.length/4)} páginas.`:`Libro descargado con ${metrics.length} hojas de indicadores.`;
   }catch(error){$('multiExportError').textContent='No se pudo generar el archivo: '+error.message;$('multiExportError').hidden=false;$('multiExportStatus').textContent='';}
   finally{busy=false;button.disabled=false;pdfButton.disabled=false;dialog.querySelectorAll('button,input').forEach(input=>input.disabled=false);update();}
  });
 }
 window.IndicatorMultiExport=Object.freeze({init});
})();
