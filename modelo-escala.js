/* Niveles compartidos por la vista, las barras y la exportación a Excel. */
(function(root){
  'use strict';
  // Recorta las cifras restantes: nunca aumenta el valor introducido.
  function truncate(value){
    if(!Number.isFinite(value)||value<1000)return value;
    const digits=Math.floor(Math.log10(value))+1;
    const keep=value>=10000000?4:value>=1000000?3:2;
    const unit=10**Math.max(0,digits-keep);
    return Math.floor(value/unit)*unit;
  }
  function validate(scale){
    if(!scale||!Number.isFinite(scale.min)||!Number.isFinite(scale.max)||(scale.unit!=='percent'&&!scale.allowNegative&&scale.min<0)||scale.max<=scale.min)throw Error('La escala máxima debe ser mayor que la mínima.');
    if(scale.levels!==undefined){
      const levels=scale.levels;
      if(!Array.isArray(levels)||levels.length!==13||levels[0]!==scale.min||levels[12]!==scale.max||levels.some((v,i)=>!Number.isFinite(v)||(i>0&&v<=levels[i-1])))throw Error('Los 13 niveles deben ir de menor a mayor y coincidir con el mínimo y el máximo.');
    }
    return scale;
  }
  function levels(scale){
    validate(scale);
    if(scale.levels)return scale.levels.slice();
    const step=(scale.max-scale.min)/12;
    const raw=Array.from({length:13},(_,i)=>i===0?scale.min:i===12?scale.max:Number((scale.min+step*i).toPrecision(14)));
    const ticks=raw.map((v,i)=>i===0||i===12||scale.unit==='percent'?v:truncate(v));
    // Permite cargar respaldos antiguos con rangos estrechos. Al editar, normalize los valida.
    return ticks.some((v,i)=>i>0&&v<=ticks[i-1])?raw:ticks;
  }
  function normalize(scale){
    validate(scale);
    const trim=scale.unit==='percent'?v=>v:truncate;
    const ticks=levels(scale).map(trim),min=trim(scale.min),max=trim(scale.max);
    if(ticks.some((v,i)=>i>0&&v<=ticks[i-1]))throw Error('El recorte deja niveles repetidos. Amplía el rango o separa más los valores.');
    return validate({min,max,levels:ticks,...(scale.unit==='percent'?{unit:'percent'}:{}),...(scale.allowNegative?{allowNegative:true}:{})});
  }
  function position(value,scale){
    const ticks=levels(scale);
    if(value<=ticks[0])return 0;if(value>=ticks[12])return 1;
    const i=ticks.findIndex((v,j)=>j<12&&value>=v&&value<ticks[j+1]);
    return (i+(value-ticks[i])/(ticks[i+1]-ticks[i]))/12;
  }
  function valueAt(proportion,scale){
    const ticks=levels(scale),p=Math.max(0,Math.min(1,proportion))*12,i=Math.min(11,Math.floor(p));
    return ticks[i]+(ticks[i+1]-ticks[i])*(p-i);
  }
  const api={validate,levels,position,valueAt,truncate,normalize};root.IndicatorScaleModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
