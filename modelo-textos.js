(function(root){
 'use strict';
 const fields=[
  {key:'definition',label:'Definición',limit:300},
  {key:'source',label:'Fuente',limit:160},
  {key:'quarterPeriod',label:'Período del trimestre',limit:160},
  {key:'frequency',label:'Frecuencia',limit:100},
  {key:'weekPeriod',label:'Período de semanas',limit:160},
  {key:'responsible',label:'Responsable',limit:160},
  {key:'centerHeader',label:'Encabezado de impresión · sección central',limit:200,multiline:true}
 ];
 function defaults(config,periods,C){
  const metric=config.metric,independent=C.metrics[metric].independent;
  const definitions={mc:'Margen de contribución = (venta neta - compra) / venta neta',sales:'Suma del neto y los exentos',visits:'Suma de los totales de documentos',tp:'Venta neta / atenciones',sa:'Venta neta de Servicios alimenticios',uber:'Venta neta UBER',pddya:'Venta neta PPD YA',rappi:'Venta neta RAPPI',apps:'Suma de venta neta de todas las APPs'};
  return {
   definition:metric==='visits'?'Total de atenciones del reporte de ventas por cajero':C.metrics[metric].definition||definitions[metric]||'',
   source:metric==='visits'?'Registro de eliminación · ventas por cajero':metric==='tp'?'Libro de Boletas y ventas por cajero':independent?'Datos independientes':metric==='mc'?'Registro diario y compras':C.extraMetrics.includes(metric)&&metric!=='tp'?'Desglose semanal':'Registro diario',
   quarterPeriod:independent?'Último trimestre · datos mensuales':metric==='mc'?'Último trimestre · MC mensual':metric==='tp'?'Último trimestre · ticket mensual':'Último trimestre · promedio semanal',
   frequency:'Semanal',weekPeriod:`Semanas ${periods[3].label} a ${periods[15].label} · ${config.year}`,
   responsible:'Edwin Mundy J',centerHeader:'WOR\nCONVENIENCE CHILE SPA\nKENNEDY 5753'
  };
 }
 function validate(data){
  if(data===undefined)return;
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Los textos de indicadores no son válidos.');
  for(const values of Object.values(data)){
   if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Los textos del indicador no son válidos.');
   if(Object.hasOwn(values,'hideValues')&&typeof values.hideValues!=='boolean')throw Error('La opción de ocultar valores no es válida.');
   for(const field of fields)if(Object.hasOwn(values,field.key)){
    const value=values[field.key];
    if(typeof value!=='string'||value.length>field.limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error(`Revisa ${field.label}; máximo ${field.limit} caracteres.`);
    if(field.key==='centerHeader'&&value.replaceAll('&','&&').length>225)throw Error('El encabezado contiene demasiados caracteres para Excel.');
   }
  }
 }
 function resolve(config,periods,C){return {...defaults(config,periods,C),...config.indicatorText?.[config.metric]};}
 // Retain the left and right sections, and escape literal ampersands in user text.
 function centerHeader(raw,text){
  const segments=[];let start=0,section='';
  for(let i=0;i<raw.length;i++){
   if(raw[i]!=='&')continue;
   if(raw[i+1]==='&'){i++;continue;}
   if('LCR'.includes(raw[i+1]||' ')&&raw[i+1]){segments.push({section,text:raw.slice(start,i)});section=raw[i+1];start=i;i++;}
  }
  segments.push({section,text:raw.slice(start)});
  return segments.filter(part=>part.section!=='C').map(part=>part.text).join('')+'&C&"Arial,Bold"&14'+text.replaceAll('&','&&');
 }
 const api={fields,defaults,resolve,validate,centerHeader};root.IndicatorTextModel=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
