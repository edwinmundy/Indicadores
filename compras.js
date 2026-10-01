/* Compras semanales: el formulario mantiene un borrador hasta guardar. */
(function(){
 'use strict';
 function init({getRows,getPurchases,getYear,commitPurchases}){
  const C=IndicatorCore,$=id=>document.getElementById(id),dialog=$('purchasesDialog');
  const number=new Intl.NumberFormat('es-CL',{maximumFractionDigits:2});
  const date=s=>s.split('-').reverse().join('/');
  let draft={},year;
  function error(text=''){$('purchasesError').textContent=text;$('purchasesError').hidden=!text;}
  function capture(){
   const next={...draft};
   for(const input of $('purchasesRows').querySelectorAll('[data-purchase]')){
    const value=input.value.trim();
    try {
     if(value==='')delete next[input.dataset.purchase];
     else {const amount=C.number(value);if(amount<0)throw Error('Ingresa un monto de 0 o más');next[input.dataset.purchase]=amount;}
     input.removeAttribute('aria-invalid');
    } catch(e){input.setAttribute('aria-invalid','true');input.focus();throw Error(`Semana ${input.dataset.week}: ${e.message}.`);}
   }
   C.validatePurchases(next);draft=next;
  }
  function render(){
   const rows=getRows();
   $('purchasesRows').innerHTML=C.purchaseWeeks(year).map(w=>{
    const count=new Set(rows.filter(r=>r.date>=w.start&&r.date<=w.end).map(r=>r.date)).size;
    const amount=draft[w.start];
    return `<tr><th scope="row">S${w.week}</th><td>${date(w.start)}</td><td>${date(w.end)}</td><td><input type="text" inputmode="decimal" data-purchase="${w.start}" data-week="${w.week}" aria-label="Compra semana ${w.week} de ${year}" value="${amount===undefined?'':number.format(amount)}" placeholder="Sin compra"></td><td>${count?`${count} ${count===1?'día':'días'}`:'Sin registros todavía'}</td></tr>`;
   }).join('');
  }
  $('purchasesButton').addEventListener('click',()=>{draft={...getPurchases()};year=getYear();$('purchasesYear').value=year;error();render();dialog.showModal();});
  $('purchasesYear').addEventListener('change',()=>{
   try {const next=Number($('purchasesYear').value);C.purchaseWeeks(next);if(next===year)return;capture();year=next;render();error();}
   catch(e){$('purchasesYear').value=year;error(e.message);}
  });
  $('purchasesForm').addEventListener('submit',event=>{
   event.preventDefault();
   try {capture();commitPurchases({...draft});dialog.close();}catch(e){error(e.message);}
  });
 }
 window.IndicatorPurchases={init};
})();
