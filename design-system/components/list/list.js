/* Generic paginated List. No application data, storage, icon library or tools. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemList=api;})(globalThis,function(){
'use strict';
const defaults=Object.freeze({density:'normal',pageSize:6,device:'auto'});
function visibleColumns(columns,device){return columns.filter((c,i)=>c[device]!==false&&(c[device]===true||device==='desktop'||i<(device==='mobile'?3:5)));}
function pageNumbers(current,total){const pages=new Set([1,total,current-1,current,current+1]);if(current<4)[2,3,4].forEach(n=>pages.add(n));if(current>total-3)[total-3,total-2,total-1].forEach(n=>pages.add(n));return [...pages].filter(n=>n>0&&n<=total).sort((a,b)=>a-b);}
function mount(host,options={}){
 if(!host?.ownerDocument)throw new TypeError('List requires a mount element');
 const doc=host.ownerDocument,element=doc.createElement('section');element.className='ds-component ds-list';host.append(element);
 let state={...defaults,label:'List',columns:[],rows:[],showDensityControl:true,emptyText:'No results',...options},page=1,device='desktop',destroyed=false,children=[];
 function make(tag,className,text){const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
 function normalise(){
  state.density=state.density==='compact'?'compact':'normal';
  state.pageSize=Math.max(1,Math.floor(Number(state.pageSize)||6));
  state.columns=state.columns.map(c=>({...c,id:String(c.id)}));
  if(new Set(state.columns.map(c=>c.id)).size!==state.columns.length)throw new TypeError('List column IDs must be unique');
  if(state.rows.some(r=>r.id===undefined)||new Set(state.rows.map(r=>String(r.id))).size!==state.rows.length)throw new TypeError('List row IDs must be unique');
  device=['mobile','tablet','desktop'].includes(state.device)?state.device:device;
 }
 function appendValue(cell,value){if(value?.element?.nodeType){cell.append(value.element);if(typeof value.destroy==='function')children.push(value);}else if(value?.nodeType)cell.append(value);else cell.textContent=String(value??'—');}
 function disposeCells(){children.forEach(child=>child.destroy());children=[];}
 function button(label,text,action){const node=make('button','ds-list-button',text);node.type='button';node.setAttribute('aria-label',label);node.addEventListener('click',action);return node;}
 function render(){
  if(destroyed)return;
  disposeCells();element.replaceChildren();element.dataset.density=state.density;element.dataset.device=device;element.setAttribute('aria-label',state.label);
  if(state.showDensityControl){const bar=make('div','ds-list-toolbar'),group=make('div','ds-list-density');group.setAttribute('role','group');group.setAttribute('aria-label','List density');for(const mode of ['normal','compact']){const control=button(mode[0].toUpperCase()+mode.slice(1),mode[0].toUpperCase()+mode.slice(1),()=>setDensity(mode,true));control.setAttribute('aria-pressed',String(state.density===mode));group.append(control);}bar.append(group);element.append(bar);}
  const columns=visibleColumns(state.columns,device),pages=Math.max(1,Math.ceil(state.rows.length/state.pageSize));page=Math.max(1,Math.min(page,pages));
  const frame=make('div','ds-list-frame'),table=make('table','ds-list-table'),caption=make('caption','ds-list-sr',state.label),head=make('thead'),header=make('tr'),body=make('tbody');
  columns.forEach(column=>{const th=make('th',null,column.label??column.id);th.setAttribute('scope','col');if(column.align==='right')th.dataset.align='right';const width=typeof column.width==='object'?column.width[device]:column.width;if(width)th.style.width=String(width);header.append(th);});head.append(header);table.append(caption,head,body);
  const start=(page-1)*state.pageSize;
  state.rows.slice(start,start+state.pageSize).forEach(row=>{
   const tr=make('tr');tr.dataset.rowId=String(row.id);if(row.accent)tr.style.setProperty('--ds-list-row-accent',row.accent);
   columns.forEach((column,index)=>{const cell=make('td');cell.dataset.column=column.id;if(column.align==='right')cell.dataset.align='right';if(index===0)cell.classList.add('ds-list-primary');
    const value=row[column.key||column.id],main=make('span','ds-list-value');
    if(column.monospace)main.classList.add('ds-list-mono');if(column.strong)main.classList.add('ds-list-strong');
    appendValue(main,column.render?column.render(value,row,{document:doc,device,density:state.density}):value);cell.append(main);
    if(column.secondaryKey&&row[column.secondaryKey])cell.append(make('span','ds-list-secondary',row[column.secondaryKey]));tr.append(cell);
   });body.append(tr);
  });
  if(!state.rows.length){const tr=make('tr'),cell=make('td','ds-list-empty',state.emptyText);cell.colSpan=Math.max(1,columns.length);tr.append(cell);body.append(tr);}
  frame.append(table);element.append(frame);
  const footer=make('div','ds-list-footer'),summary=make('span','ds-list-summary',state.rows.length?'Items '+(start+1)+'–'+Math.min(start+state.pageSize,state.rows.length)+' of '+state.rows.length:state.emptyText);summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');footer.append(summary);
  const pager=make('nav','ds-list-pagination');pager.setAttribute('aria-label',state.label+' pages');
  const previous=button('Previous page','←',()=>setPage(page-1,true));previous.disabled=page===1;pager.append(previous);
  let last=0;for(const number of pageNumbers(page,pages)){if(last&&number-last>1)pager.append(make('span','ds-list-ellipsis','…'));const control=button('Page '+number,number,()=>setPage(number,true));if(number===page)control.setAttribute('aria-current','page');pager.append(control);last=number;}
  const next=button('Next page','→',()=>setPage(page+1,true));next.disabled=page===pages;pager.append(next);footer.append(pager);element.append(footer);
 }
 function setPage(value,notify=false){const next=Math.max(1,Math.min(Math.ceil(state.rows.length/state.pageSize)||1,Math.floor(Number(value)||1)));if(next===page)return;page=next;render();if(notify){element.querySelector('[aria-current=page]')?.focus();state.onPageChange?.(page);}}
 function setDensity(value,notify=false){const next=value==='compact'?'compact':'normal';if(next===state.density)return;state.density=next;render();if(notify){element.querySelector('[aria-pressed=true]')?.focus();state.onDensityChange?.(next);}}
 function measure(width){if(state.device!=='auto')return;const next=width<=620?'mobile':width<=1100?'tablet':'desktop';if(next!==device){device=next;render();}}
 normalise();if(options.page!==undefined)page=Math.max(1,Math.floor(Number(options.page)||1));if(host.getBoundingClientRect)measure(host.getBoundingClientRect().width);render();
 const Observer=doc.defaultView?.ResizeObserver;let observer;if(Observer){observer=new Observer(entries=>{if(!destroyed)measure(entries[0].contentRect.width);});observer.observe(host);}
 return {element,setPage,setDensity,get page(){return page;},get density(){return state.density;},get device(){return device;},update(patch={}){if(destroyed)return;state={...state,...patch};normalise();if(patch.page!==undefined)page=Math.max(1,Math.floor(Number(patch.page)||1));if(state.device==='auto'&&host.getBoundingClientRect)measure(host.getBoundingClientRect().width);render();},destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();disposeCells();element.remove();}};
}
return Object.freeze({mount,visibleColumns,pageNumbers,defaults});});
