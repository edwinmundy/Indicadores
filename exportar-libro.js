/* Libros separados: presentación del indicador o datos, sin contenido heredado ajeno. */
(function () {
  'use strict';
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const REL='http://schemas.openxmlformats.org/package/2006/relationships';
  const CT='http://schemas.openxmlformats.org/package/2006/content-types';
  const XDR='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
  const A='http://schemas.openxmlformats.org/drawingml/2006/main';
  const XML='http://www.w3.org/XML/1998/namespace';
  const all=(node,tag,ns=NS)=>Array.from(node.getElementsByTagNameNS(ns,tag));
  const first=(node,tag,ns=NS)=>all(node,tag,ns)[0];
  const parse=text=>new DOMParser().parseFromString(text,'application/xml');
  const serialize=doc=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+new XMLSerializer().serializeToString(doc.documentElement);
  function element(doc,name,attributes={},text,ns=NS){
    const node=doc.createElementNS(ns,name);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function resolve(base,target){
    const out=[];
    for(const part of (target.startsWith('/')?target.slice(1):base.slice(0,base.lastIndexOf('/')+1)+target).split('/')){
      if(part==='..')out.pop();else if(part&&part!=='.')out.push(part);
    }
    return out.join('/');
  }
  const relPath=path=>path.replace(/([^/]+)$/,'_rels/$1.rels');
  function cellPosition(ref){
    const match=String(ref).replaceAll('$','').match(/^([A-Z]+)(\d+)$/);
    return match?{col:[...match[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),row:Number(match[2])}:null;
  }
  function within(ref){const p=cellPosition(ref);return p&&p.col<=39&&p.row<=53&&p.row>0;}
  function freezeCell(cell,strings){
    const doc=cell.ownerDocument,type=cell.getAttribute('t'),value=first(cell,'v')?.textContent??'';
    all(cell,'f').forEach(node=>node.remove());
    if(type==='s'||type==='str'){
      cell.replaceChildren();cell.setAttribute('t','inlineStr');
      const inline=element(doc,'is');
      if(type==='s'&&strings[Number(value)]){
        for(const child of strings[Number(value)].children)inline.append(doc.importNode(child,true));
      }else{
        const text=element(doc,'t',{},type==='str'?value:'');text.setAttributeNS(XML,'xml:space','preserve');inline.append(text);
      }
      cell.append(inline);
    }
  }
  function presentationSheet(source,strings){
    const doc=parse(`<worksheet xmlns="${NS}" xmlns:r="${R}"/>`),root=doc.documentElement;
    // Solo estos elementos pertenecen a la presentación; se excluyen controles, vínculos y reglas auxiliares.
    const allowed=['sheetPr','dimension','sheetViews','sheetFormatPr','cols','sheetData','mergeCells','printOptions','pageMargins','pageSetup','headerFooter'];
    for(const name of allowed){const node=first(source,name);if(node)root.append(doc.importNode(node,true));}
    for(const node of Array.from(root.getElementsByTagName('*'))){
      if(node.namespaceURI!==NS){node.remove();continue;}
      for(const attr of Array.from(node.attributes))if(attr.namespaceURI&&attr.namespaceURI!==XML)node.removeAttributeNode(attr);
    }
    let properties=first(doc,'sheetPr');
    if(!properties){properties=element(doc,'sheetPr');root.prepend(properties);}
    properties.removeAttribute('codeName');
    let setupProperties=first(properties,'pageSetUpPr');
    if(!setupProperties){setupProperties=element(doc,'pageSetUpPr');properties.append(setupProperties);}
    setupProperties.setAttribute('fitToPage','1');
    let dimension=first(doc,'dimension');
    if(!dimension){dimension=element(doc,'dimension');root.insertBefore(dimension,properties.nextSibling);}
    dimension.setAttribute('ref','A1:AM53');
    let views=first(doc,'sheetViews');
    if(!views){views=element(doc,'sheetViews');root.insertBefore(views,dimension.nextSibling);}
    views.replaceChildren();
    const view=element(doc,'sheetView',{workbookViewId:0,showGridLines:0,showRowColHeaders:0,tabSelected:1,topLeftCell:'A1',zoomScale:70});
    view.append(element(doc,'selection',{activeCell:'A1',sqref:'A1'}));views.append(view);
    let format=first(doc,'sheetFormatPr');
    if(!format){format=element(doc,'sheetFormatPr',{defaultRowHeight:15});root.insertBefore(format,views.nextSibling);}
    // Las filas sin declaración (54 en adelante) quedan ocultas, sin crear un millón de filas.
    format.setAttribute('zeroHeight','1');
    let cols=first(doc,'cols');
    if(!cols){cols=element(doc,'cols');root.insertBefore(cols,format.nextSibling);}
    for(const col of all(cols,'col')){
      if(Number(col.getAttribute('min'))>39)col.remove();
      else col.setAttribute('max',Math.min(39,Number(col.getAttribute('max'))));
    }
    cols.append(element(doc,'col',{min:40,max:16384,hidden:1,width:0,customWidth:1}));
    const data=first(doc,'sheetData');
    for(const row of all(data,'row')){
      if(Number(row.getAttribute('r'))>53){row.remove();continue;}
      row.removeAttribute('spans');row.setAttribute('hidden','0');
      for(const cell of all(row,'c')){if(!within(cell.getAttribute('r')))cell.remove();else freezeCell(cell,strings);}
    }
    const rows=new Map(all(data,'row').map(row=>[Number(row.getAttribute('r')),row]));
    data.replaceChildren(...Array.from({length:53},(_,i)=>rows.get(i+1)||element(doc,'row',{r:i+1,hidden:0})));
    const merges=first(doc,'mergeCells');
    if(merges){
      for(const merge of all(merges,'mergeCell'))if(!merge.getAttribute('ref').split(':').every(within))merge.remove();
      merges.setAttribute('count',merges.children.length);if(!merges.children.length)merges.remove();
    }
    let page=first(doc,'pageSetup');
    if(!page){page=element(doc,'pageSetup');root.insertBefore(page,first(doc,'headerFooter')||null);}
    for(const name of ['scale','horizontalDpi','verticalDpi'])page.removeAttribute(name);
    page.setAttribute('paperSize','9');page.setAttribute('orientation','landscape');
    page.setAttribute('fitToWidth','1');page.setAttribute('fitToHeight','1');
    return doc;
  }
  async function presentationDrawing({zip,sourcePath,sourceDoc,output,addType,sourceTypes}){
    const drawingNode=first(sourceDoc,'drawing'),sheetRels=zip.file(relPath(sourcePath));
    if(!drawingNode||!sheetRels)return false;
    const sourceRels=parse(await sheetRels.async('string'));
    const drawingRel=all(sourceRels,'Relationship',REL).find(node=>node.getAttribute('Id')===drawingNode.getAttributeNS(R,'id'));
    if(!drawingRel)return false;
    const drawingPath=resolve(sourcePath,drawingRel.getAttribute('Target'));
    const source=parse(await zip.file(drawingPath).async('string'));
    const relFile=zip.file(relPath(drawingPath)),relationships=relFile?all(parse(await relFile.async('string')),'Relationship',REL):[];
    const drawing=parse(`<xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}" xmlns:r="${R}"/>`);
    const drawingRels=parse(`<Relationships xmlns="${REL}"/>`),media=new Map();
    for(const original of source.documentElement.children){
      const name=first(original,'cNvPr',XDR)?.getAttribute('name')||'';
      if(!first(original,'pic',XDR)&&!/^cn_\d+$/.test(name))continue;
      const from=first(original,'from',XDR),to=first(original,'to',XDR);
      if(!from||!to)continue;
      const coordinate=(node,key)=>Number(first(node,key,XDR)?.textContent||0);
      if(coordinate(from,'col')>=39||coordinate(from,'row')>=53||coordinate(to,'col')>39||coordinate(to,'row')>53||
        coordinate(to,'col')===39&&coordinate(to,'colOff')>0||coordinate(to,'row')===53&&coordinate(to,'rowOff')>0)continue;
      const anchor=drawing.importNode(original,true);
      for(const node of Array.from(anchor.getElementsByTagName('*'))){
        node.removeAttribute('macro');node.removeAttribute('textlink');
        if(['extLst','hlinkClick','hlinkHover','stCxn','endCxn'].includes(node.localName))node.remove();
      }
      let available=true;
      for(const blip of all(anchor,'blip',A)){
        const id=blip.getAttributeNS(R,'embed'),rel=relationships.find(node=>node.getAttribute('Id')===id&&node.getAttribute('Type')===R+'/image'&&node.getAttribute('TargetMode')!=='External');
        if(!rel){available=false;break;}
        if(!media.has(id)){
          const part=resolve(drawingPath,rel.getAttribute('Target')),sourceFile=zip.file(part);
          if(!sourceFile){available=false;break;}
          const extension=part.split('.').at(-1).toLowerCase(),index=media.size+1,target=`xl/media/image${index}.${extension}`,newId='rId'+index;
          output.file(target,await sourceFile.async('uint8array'));
          const sourceType=all(sourceTypes,'Override',CT).find(node=>node.getAttribute('PartName')==='/'+part)?.getAttribute('ContentType')||all(sourceTypes,'Default',CT).find(node=>node.getAttribute('Extension').toLowerCase()===extension)?.getAttribute('ContentType')||'image/png';
          addType(target,sourceType);
          drawingRels.documentElement.append(element(drawingRels,'Relationship',{Id:newId,Type:R+'/image',Target:'../media/'+target.split('/').at(-1)},undefined,REL));
          media.set(id,newId);
        }
        blip.removeAttributeNS(R,'link');blip.setAttributeNS(R,'r:embed',media.get(id));
      }
      if(available)drawing.documentElement.append(anchor);
    }
    if(!drawing.documentElement.children.length)return false;
    output.file('xl/drawings/drawing1.xml',serialize(drawing));
    addType('xl/drawings/drawing1.xml','application/vnd.openxmlformats-officedocument.drawing+xml');
    if(drawingRels.documentElement.children.length)output.file('xl/drawings/_rels/drawing1.xml.rels',serialize(drawingRels));
    return true;
  }
  async function create({zip,sourcePath,sourceDoc,styles,sourceRelationships,mode,sheets,indicatorName}){
    const output=new JSZip(),sourceTypes=parse(await zip.file('[Content_Types].xml').async('string'));
    const types=parse(`<Types xmlns="${CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`);
    const addType=(path,type)=>types.documentElement.append(element(types,'Override',{PartName:'/'+path,ContentType:type},undefined,CT));
    const workbook=parse(`<workbook xmlns="${NS}" xmlns:r="${R}"><bookViews><workbookView activeTab="0" firstSheet="0"/></bookViews><sheets/></workbook>`);
    const relationships=parse(`<Relationships xmlns="${REL}"/>`);
    const addRel=(id,type,target)=>relationships.documentElement.append(element(relationships,'Relationship',{Id:id,Type:R+'/'+type,Target:target},undefined,REL));
    let selected=sheets;
    if(mode==='indicator'){
      const sharedRel=all(sourceRelationships,'Relationship',REL).find(node=>node.getAttribute('Type')===R+'/sharedStrings');
      const sharedFile=sharedRel&&zip.file(resolve('xl/workbook.xml',sharedRel.getAttribute('Target')));
      const strings=sharedFile?all(parse(await sharedFile.async('string')),'si'):[];
      const doc=presentationSheet(sourceDoc,strings);
      if(await presentationDrawing({zip,sourcePath,sourceDoc,output,addType,sourceTypes})){
        const drawing=element(doc,'drawing');drawing.setAttributeNS(R,'r:id','rIdDrawing');doc.documentElement.append(drawing);
        const sheetRels=parse(`<Relationships xmlns="${REL}"/>`);
        sheetRels.documentElement.append(element(sheetRels,'Relationship',{Id:'rIdDrawing',Type:R+'/drawing',Target:'../drawings/drawing1.xml'},undefined,REL));
        output.file('xl/worksheets/_rels/sheet1.xml.rels',serialize(sheetRels));
      }
      selected=[{name:indicatorName.replace(/[\\/*?:\[\]]/g,' ').slice(0,31),doc}];
    }
    selected.forEach(({name,doc},index)=>{
      const i=index+1,path=`xl/worksheets/sheet${i}.xml`,sheet=element(workbook,'sheet',{name,sheetId:i});
      sheet.setAttributeNS(R,'r:id','rIdSheet'+i);first(workbook,'sheets').append(sheet);
      addRel('rIdSheet'+i,'worksheet',`worksheets/sheet${i}.xml`);
      output.file(path,serialize(doc));addType(path,'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');
    });
    if(mode==='indicator'){
      const names=element(workbook,'definedNames');
      names.append(element(workbook,'definedName',{name:'_xlnm.Print_Area',localSheetId:0},"'"+selected[0].name.replaceAll("'","''")+"'!$A$1:$AM$53"));
      workbook.documentElement.append(names);
    }else workbook.documentElement.append(element(workbook,'calcPr',{calcMode:'auto',fullCalcOnLoad:1,forceFullCalc:1}));
    output.file('xl/styles.xml',serialize(styles));addType('xl/styles.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml');addRel('rIdStyles','styles','styles.xml');
    const theme=all(sourceRelationships,'Relationship',REL).find(node=>node.getAttribute('Type')===R+'/theme');
    if(theme){
      const file=zip.file(resolve('xl/workbook.xml',theme.getAttribute('Target')));
      if(file){output.file('xl/theme/theme1.xml',await file.async('uint8array'));addRel('rIdTheme','theme','theme/theme1.xml');addType('xl/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml');}
    }
    output.file('xl/workbook.xml',serialize(workbook));addType('xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
    output.file('xl/_rels/workbook.xml.rels',serialize(relationships));
    output.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL}"><Relationship Id="rIdWorkbook" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    output.file('[Content_Types].xml',serialize(types));
    return output.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  }
  window.IndicatorWorkbookExport=Object.freeze({create});
})();
