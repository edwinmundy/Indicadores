/* Datos propios por indicador y período; sin dependencias del registro de ventas. */
(function(root){
 'use strict';
 const cash=root.IndicatorCashModel||(typeof require==='function'?require('./modelo-cierres.js'):null);
 const catalog={
  negativeSkus:{label:'SKUs NEGATIVOS',title:'SKUs NEGATIVOS',max:.05,unit:'percent',independent:true,fixedGoal:0,direction:'lower',definition:'SKUs negativos / SKUs vigentes'},
  removedSkus:{label:'SKUs ELIMINADOS POR TIENDA',title:'SKUs ELIMINADOS POR TIENDA',max:.1,unit:'percent',independent:true,definition:'Total de eliminaciones / venta bruta de cajeros'},
  cashClosings:{label:'CIERRES DE CAJA',title:'CIERRES DE CAJA',max:1,unit:'percent',independent:true,direction:'above',definition:'Cierres buenos / total de cierres'},
  complaints:{label:'RECLAMOS',title:'RECLAMOS',min:-10,max:10,unit:'count',independent:true,fixedGoal:0,direction:'lower',definition:'Cantidad de reclamos · objetivo cero'},
  compliments:{label:'FELICITACIONES',title:'FELICITACIONES',max:120,unit:'count',independent:true,fixedGoal:0,direction:'above',definition:'Cantidad de felicitaciones · positivo sobre cero'}
 };
 function result(metric,record){
  if(!record)return null;
  if(metric==='cashClosings')return cash.result(record);
  if(metric==='removedSkus')return record.ratio??null;
  if(metric==='negativeSkus')return record.negative!==null&&record.negative!==undefined&&record.active>0?record.negative/record.active:null;
  return record.value??null;
 }
 function period(data,metric,key){const record=data?.[metric]?.[key],value=result(metric,record);return {value,samples:value===null?0:1,...(metric==='cashClosings'?{cash:cash.totals(record)}:{})};}
 function validate(data,C){
  if(data===undefined)return {};
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Datos de indicadores independientes inválidos.');
  for(const [metric,records] of Object.entries(data)){
   if(!catalog[metric]||!records||typeof records!=='object'||Array.isArray(records))throw Error('Indicador independiente inválido.');
   for(const [key,record] of Object.entries(records)){
    const match=key.match(/^([mw]):(\d{4})-(\d{1,2})$/);
    if(!match||+match[2]<2000||+match[2]>2101||+match[3]<1||+match[3]>(match[1]==='m'?12:C.weekInfo(match[2]+'-12-28').week))throw Error('Período inválido en indicadores independientes.');
    if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Registro independiente inválido.');
    if(metric==='cashClosings')cash.validate(record);
    if(metric==='removedSkus'&&record.ratio!=null&&(!Number.isFinite(record.ratio)||Math.abs(record.ratio)>1e13))throw Error('Porcentaje de eliminación inválido.');
    const fields=metric==='negativeSkus'?['negative','active']:['value'];
    for(const field of fields){const value=record[field];if(value!==null&&value!==undefined&&(!Number.isSafeInteger(value)||value<0||value>1e13))throw Error('Las cantidades deben ser enteros de 0 o más.');}
    if(metric==='negativeSkus'&&record.negative!=null&&record.active!=null&&record.negative>record.active)throw Error('Los SKUs negativos no pueden superar los SKUs vigentes.');
   }
  }
  return data;
 }
 const api={catalog,result,period,validate};root.IndicatorIndependentModel=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
