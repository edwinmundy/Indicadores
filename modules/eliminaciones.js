(function(){
 'use strict';
 function init({getRows,getCashierSales,getConfig,commitRows,escapeHtml:esc,formatDate}){
  const C=IndicatorCore,M=IndicatorRemovalModel,$=id=>document.getElementById(id),dialog=$('removalDialog');
  const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
  const integer=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0}),share=new Intl.NumberFormat('es-CL',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}),ratio=new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:0});
  let draft=[],sales={},selected='',descending=false;
  function error(text=''){$('removalError').textContent=text;$('removalError').hidden=!text;}
  function changed(){$('removalStatus').textContent='Cambios pendientes de guardar.';error();}
  function periods(){
   const weeks=[...new Set([...draft.map(row=>M.week(row,C)),...Object.keys(sales)])].sort().reverse();
   if(selected&&!weeks.includes(selected))selected=weeks[0]||'';
   $('removalWeek').innerHTML='<option value="">Todas las semanas</option>'+weeks.map(start=>{
    const info=C.weekInfo(start);
    return `<option value="${start}">Semana ${info.week} / ${info.year} · ${esc(formatDate(start))} – ${esc(formatDate(C.add(start,6)))}</option>`;
   }).join('');
   $('removalWeek').value=selected;
   if(selected){const info=C.weekInfo(selected);$('removalSalesYear').value=info.year;$('removalSalesWeek').value=info.week;}
  }
  function render(){
   const visible=draft.filter(row=>!selected||M.week(row,C)===selected);
   if(descending)visible.sort((a,b)=>C.number(b.cells[12])-C.number(a.cells[12]));
   $('removalRows').innerHTML=visible.map(row=>`<tr>${row.cells.map((cell,index)=>`<td${index===12?' class="removal-amount"':''}>${esc(index===12?money.format(C.number(cell)):cell)}</td>`).join('')}<td><button type="button" class="text-button" data-removal-delete="${esc(row.id)}" aria-label="Quitar registro de ${esc(row.cells[2])}, ${esc(row.cells[9])}, ${esc(row.cells[7])}">Quitar</button></td></tr>`).join('');
   const summary=M.cross(draft,sales,C,selected),cell=(value,formatter)=>value===null?'—':esc(formatter.format(value));
   $('removalSummary').innerHTML=summary.items.map(item=>`<tr><th scope="row">${esc(item.name)}${item.missingSales?'<small class="removal-match-note">Sin venta asociada en alguna semana</small>':''}</th><td>${cell(item.hasSales?item.visits:null,integer)}</td><td>${cell(item.hasSales?item.gross:null,money)}</td><td>${cell(item.net,money)}</td><td>${cell(item.share,share)}</td><td>${cell(item.missingDetail?null:item.removed,money)}</td><td>${cell(item.ratio,ratio)}</td></tr>`).join('');
   const total=summary.total;
   $('removalSummaryFoot').innerHTML=`<tr><th>TOTAL VENTA</th><td>${cell(total.hasSales?total.visits:null,integer)}</td><td>${cell(total.hasSales?total.gross:null,money)}</td><td>${cell(total.hasSales?total.net:null,money)}</td><td>${total.hasSales&&total.net!==0?'100%':'—'}</td><td>${cell(total.removed,money)}</td><td>${cell(total.hasSales&&!total.incomplete&&total.gross!==0?total.removed/total.gross:null,ratio)}</td></tr>`;
   $('removalCrossNote').textContent=[summary.unmatched.length?'Sin coincidencia de ventas: '+summary.unmatched.join(', ')+'.':'',summary.missingDetail?'Falta el detalle de eliminaciones de alguna semana.':''].filter(Boolean).join(' ');
   $('removalCount').textContent=visible.length;
   $('removalEmpty').hidden=visible.length>0;
   $('removalSort').textContent=descending?'TOTAL ↓ · Mayor a menor':'Ordenar TOTAL de mayor a menor';
   $('removalSort').setAttribute('aria-pressed',String(descending));
   $('removalTotalHead').setAttribute('aria-sort',descending?'descending':'none');
  }
  $('removalButton').addEventListener('click',()=>{
   draft=structuredClone(getRows());sales=structuredClone(getCashierSales());selected=[...draft.map(row=>M.week(row,C)),...Object.keys(sales)].sort().at(-1)||'';descending=false;
   $('removalSalesYear').value=getConfig().year;$('removalSalesWeek').value=getConfig().startWeek;
   $('removalPaste').value='';$('removalSalesPaste').value='';$('removalStatus').textContent='';error();periods();render();dialog.showModal();
  });
  $('removalWeek').addEventListener('change',()=>{selected=$('removalWeek').value;periods();render();});
  $('removalSalesImport').addEventListener('click',()=>{
   try{
    const year=Number($('removalSalesYear').value),week=Number($('removalSalesWeek').value);
    if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(week)||week<1||week>C.weekInfo(year+'-12-28').week)throw Error('Selecciona un año y una semana ISO válidos para las ventas.');
    const imported=M.parseCashierSales($('removalSalesPaste').value,C),start=C.weekStart(year,week);
    sales[start]=imported;selected=start;$('removalSalesPaste').value='';periods();render();changed();
    $('removalStatus').textContent=`Ventas de ${imported.length} cajeros incorporadas a la semana ${week} / ${year}. Pendiente de guardar.`;
   }catch(e){error(e.message);}
  });
  $('removalSort').addEventListener('click',()=>{descending=true;render();});
  $('removalImport').addEventListener('click',()=>{
   try{
    const imported=M.parse($('removalPaste').value,C),next=[...draft,...imported];M.validate(next,C);
    draft=next;selected=imported.map(row=>M.week(row,C)).sort().at(-1)||'';
    $('removalPaste').value='';periods();render();changed();
    $('removalStatus').textContent=`${imported.length} filas agregadas. Cambios pendientes de guardar.`;
   }catch(e){error(e.message);}
  });
  $('removalRows').addEventListener('click',event=>{
   const button=event.target.closest('[data-removal-delete]');if(!button)return;
   draft=draft.filter(row=>row.id!==button.dataset.removalDelete);periods();render();changed();
  });
  $('removalForm').addEventListener('submit',event=>{
   event.preventDefault();
   try{M.validate(draft,C);M.validateCashierSales(sales,C);commitRows(structuredClone(draft),structuredClone(sales));error();$('removalStatus').textContent='Registro de eliminación y ventas por cajero guardados.';}catch(e){error(e.message);}
  });
 }
 window.IndicatorRemovals=Object.freeze({init});
})();
