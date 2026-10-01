/* Combina libros de presentación ya generados, conservando estilos y dibujos por hoja. */
(function(){
 'use strict';
 const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',REL='http://schemas.openxmlformats.org/package/2006/relationships',CT='http://schemas.openxmlformats.org/package/2006/content-types';
 const all=(node,tag,ns=NS)=>Array.from(node.getElementsByTagNameNS(ns,tag)),first=(node,tag,ns=NS)=>all(node,tag,ns)[0];
 function parse(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('No se pudo leer una parte XML del indicador.');return doc;}
 // Serialize only the root: Chromium preserves the parsed XML declaration on Document.
 const serialize=doc=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(doc.documentElement);
 function el(doc,tag,attrs={},text,ns=NS){const node=doc.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;}
 function resolve(owner,target){const out=[];for(const part of (target.startsWith('/')?target.slice(1):owner.slice(0,owner.lastIndexOf('/')+1)+target).split('/')){if(part==='..')out.pop();else if(part&&part!=='.')out.push(part);}return out.join('/');}
 function relative(owner,target){const from=owner.split('/').slice(0,-1),to=target.split('/');while(from.length&&to.length&&from[0]===to[0]){from.shift();to.shift();}return [...from.map(()=>'..'),...to].join('/');}
 const relPath=path=>path.replace(/([^/]+)$/,'_rels/$1.rels');
 function mergeStyles(target,source){
  const order=['numFmts','fonts','fills','borders','cellStyleXfs','cellXfs','cellStyles','dxfs','tableStyles','colors','extLst'];
  function ensure(name){let node=first(target,name);if(!node){node=el(target,name,{count:0});const after=Array.from(target.documentElement.children).find(child=>order.indexOf(child.localName)>order.indexOf(name));target.documentElement.insertBefore(node,after||null);}return node;}
  const formats=new Map(),numFmts=ensure('numFmts');let nextFormat=Math.max(163,...all(target,'numFmt').map(node=>Number(node.getAttribute('numFmtId'))))+1;
  for(const node of all(source,'numFmt')){const copy=target.importNode(node,true),id=nextFormat++;formats.set(Number(node.getAttribute('numFmtId')),id);copy.setAttribute('numFmtId',id);numFmts.append(copy);}
  numFmts.setAttribute('count',numFmts.children.length);
  const offsets={};
  for(const name of ['fonts','fills','borders']){const dest=ensure(name);offsets[name]=dest.children.length;for(const node of Array.from(first(source,name)?.children||[]))dest.append(target.importNode(node,true));dest.setAttribute('count',dest.children.length);}
  function remap(xf,styleOffset){
   for(const [attribute,name] of [['fontId','fonts'],['fillId','fills'],['borderId','borders']])if(xf.hasAttribute(attribute))xf.setAttribute(attribute,Number(xf.getAttribute(attribute))+offsets[name]);
   const format=Number(xf.getAttribute('numFmtId'));if(formats.has(format))xf.setAttribute('numFmtId',formats.get(format));
   if(styleOffset!==undefined&&xf.hasAttribute('xfId'))xf.setAttribute('xfId',Number(xf.getAttribute('xfId'))+styleOffset);
  }
  const styleXfs=ensure('cellStyleXfs'),styleOffset=styleXfs.children.length;
  for(const node of Array.from(first(source,'cellStyleXfs')?.children||[])){const copy=target.importNode(node,true);remap(copy);styleXfs.append(copy);}styleXfs.setAttribute('count',styleXfs.children.length);
  const cellXfs=ensure('cellXfs'),cellOffset=cellXfs.children.length;
  for(const node of Array.from(first(source,'cellXfs')?.children||[])){const copy=target.importNode(node,true);remap(copy,styleOffset);cellXfs.append(copy);}cellXfs.setAttribute('count',cellXfs.children.length);
  return cellOffset;
 }
 async function merge(entries){
  if(!entries.length)throw Error('Selecciona al menos un indicador.');
  const output=new JSZip(),workbook=parse(`<workbook xmlns="${NS}" xmlns:r="${R}"><bookViews><workbookView activeTab="0" firstSheet="0"/></bookViews><sheets/><definedNames/></workbook>`),relationships=parse(`<Relationships xmlns="${REL}"/>`),types=parse(`<Types xmlns="${CT}"/>`);
  const contentKeys=new Set(),names=new Set();let styles;
  function content(tag,attrs){const key=tag+':'+(attrs.PartName||attrs.Extension);if(!contentKeys.has(key)){contentKeys.add(key);types.documentElement.append(el(types,tag,attrs,undefined,CT));}}
  function relationship(id,type,target){relationships.documentElement.append(el(relationships,'Relationship',{Id:id,Type:R+'/'+type,Target:target},undefined,REL));}
  for(const [index,entry] of entries.entries()){
   const zip=await JSZip.loadAsync(await entry.blob.arrayBuffer()),i=index+1,sourceWorkbook=parse(await zip.file('xl/workbook.xml').async('string'));
   const sourceStyles=parse(await zip.file('xl/styles.xml').async('string'));let offset=0;if(!styles)styles=sourceStyles;else offset=mergeStyles(styles,sourceStyles);
   const mapping=new Map();
   for(const part of Object.keys(zip.files)){
    if(zip.files[part].dir||part.includes('/_rels/')||part.endsWith('.rels'))continue;
    if(part==='xl/worksheets/sheet1.xml')mapping.set(part,`xl/worksheets/sheet${i}.xml`);
    else if(part.startsWith('xl/drawings/')||part.startsWith('xl/media/')){const slash=part.lastIndexOf('/');mapping.set(part,part.slice(0,slash+1)+`indicator${i}-`+part.slice(slash+1));}
    else if(part.startsWith('xl/theme/'))mapping.set(part,part);
   }
   for(const [sourcePath,destPath] of mapping){
    if(sourcePath.startsWith('xl/theme/')&&index>0)continue;
    if(sourcePath==='xl/worksheets/sheet1.xml'){
     const sheet=parse(await zip.file(sourcePath).async('string'));
     for(const node of [...all(sheet,'c'),...all(sheet,'row')])if(node.hasAttribute('s'))node.setAttribute('s',Number(node.getAttribute('s'))+offset);
     for(const node of all(sheet,'col'))if(node.hasAttribute('style'))node.setAttribute('style',Number(node.getAttribute('style'))+offset);
     for(const view of all(sheet,'sheetView'))view.setAttribute('tabSelected',index===0?'1':'0');
     output.file(destPath,serialize(sheet));
    }else output.file(destPath,await zip.file(sourcePath).async('uint8array'));
    const relFile=zip.file(relPath(sourcePath));
    if(relFile){
     const rels=parse(await relFile.async('string'));
     for(const rel of all(rels,'Relationship',REL)){
      if(rel.getAttribute('TargetMode')==='External')continue;
      const target=resolve(sourcePath,rel.getAttribute('Target')),mapped=mapping.get(target);
      if(!mapped)throw Error('No se pudo conservar una relación del indicador: '+entry.name);
      rel.setAttribute('Target',relative(destPath,mapped));
     }
     output.file(relPath(destPath),serialize(rels));
    }
   }
   const sourceTypes=parse(await zip.file('[Content_Types].xml').async('string'));
   for(const node of Array.from(sourceTypes.documentElement.children)){
    if(node.localName==='Default')content('Default',{Extension:node.getAttribute('Extension'),ContentType:node.getAttribute('ContentType')});
    else{const path=node.getAttribute('PartName').slice(1),mapped=mapping.get(path);if(mapped)content('Override',{PartName:'/'+mapped,ContentType:node.getAttribute('ContentType')});}
   }
   const originalName=first(sourceWorkbook,'sheet').getAttribute('name');
   const base=originalName.replace(/[\\/*?:\[\]]/g,' ').replace(/^'+|'+$/g,'').slice(0,31)||'Indicador';let name=base,n=2;
   while(names.has(name.toLocaleLowerCase())){const suffix=' ('+(n++)+')';name=base.slice(0,31-suffix.length)+suffix;}names.add(name.toLocaleLowerCase());
   const sheet=el(workbook,'sheet',{name,sheetId:String(i)});sheet.setAttributeNS(R,'r:id','rIdSheet'+i);first(workbook,'sheets').append(sheet);
   relationship('rIdSheet'+i,'worksheet',`worksheets/sheet${i}.xml`);
   first(workbook,'definedNames').append(el(workbook,'definedName',{name:'_xlnm.Print_Area',localSheetId:String(index)},"'"+name.replaceAll("'","''")+"'!$A$1:$AM$53"));
  }
  relationship('rIdStyles','styles','styles.xml');
  if(output.file('xl/theme/theme1.xml'))relationship('rIdTheme','theme','theme/theme1.xml');
  content('Override',{PartName:'/xl/styles.xml',ContentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'});
  content('Override',{PartName:'/xl/workbook.xml',ContentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'});
  output.file('xl/styles.xml',serialize(styles));output.file('xl/workbook.xml',serialize(workbook));output.file('xl/_rels/workbook.xml.rels',serialize(relationships));output.file('[Content_Types].xml',serialize(types));
  output.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL}"><Relationship Id="rIdWorkbook" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  return output.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
 }
 window.IndicatorWorkbookMerge=Object.freeze({merge});
})();
