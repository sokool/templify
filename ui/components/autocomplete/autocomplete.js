/* Data-driven autocomplete. Configuration tools and application data are excluded. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('../form/field.js'):root.DesignSystemFormField);if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemAutocomplete=api;})(typeof globalThis!=='undefined'?globalThis:this,function(FormField){
'use strict';let sequence=0;
function filterItems(items,query){const text=String(query||'').trim().toLocaleLowerCase();return items.filter(item=>[item.label??item.name,item.detail,item.group,item.keywords].join(' ').toLocaleLowerCase().includes(text));}
function normalize(items){const ids=new Set();return (items||[]).map(item=>{const id=String(item.id);if(item.id==null||ids.has(id))throw new TypeError('Autocomplete item IDs must be unique');ids.add(id);return {...item,id,label:String(item.label??item.name??id)};});}
function mount(host,options={}){
 if(!FormField)throw new Error('Autocomplete requires FormField');
 const doc=host.ownerDocument,win=doc.defaultView||globalThis,id='ds-ac-'+(++sequence),config={size:'small',multiple:false,...options},listeners=[];
 let items=normalize(config.items),selected=[],active=-1,results=[],opened=false,destroyed=false,blurTimer;
 const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e;};
 const listen=(e,type,fn,opts)=>{e.addEventListener(type,fn,opts);listeners.push(()=>e.removeEventListener(type,fn,opts));};
 const root=make('div','ds-component ds-autocomplete');host.append(root);
 const field=FormField.mount(root,{id:id+'-input',type:'text',label:config.label||'',accessibleLabel:config.accessibleLabel||'Search suggestions',attrs:{id:id+'-input',placeholder:config.placeholder||'Search…',autocomplete:'off',disabled:config.disabled,name:config.queryName}}),input=field.control;
 input.id=id+'-input';field.element.querySelector('label')?.setAttribute('for',input.id);
 const glyph=(name)=>{const span=make('span','ds-ac-icon');span.setAttribute('aria-hidden','true');if(config.renderIcon)span.innerHTML=config.renderIcon(name);else span.textContent=({search:'⌕',x:'×',check:'✓',plus:'+', 'chevron-right':'›'})[name]||'◇';return span;};
 const search=glyph('search');search.classList.add('ds-ac-search');
 const clear=make('button','ds-ac-clear');clear.type='button';clear.setAttribute('aria-label','Clear search');clear.append(glyph('x'));
 field.element.querySelector('.ds-field-body').append(search,clear);
 const chips=make('div','ds-ac-chips');chips.setAttribute('role','list');chips.setAttribute('aria-label','Selected items');const fieldBody=field.element.querySelector('.ds-field-body');fieldBody.insertBefore(chips,input);
 const popup=make('div','ds-ac-popup'),list=make('div','ds-ac-list');list.id=id+'-list';list.setAttribute('role','listbox');list.setAttribute('aria-label',config.suggestionsLabel||'Search suggestions');
 const footer=make('div','ds-ac-footer'),summary=make('span','ds-ac-summary'),help=make('span','ds-ac-help','↑ ↓ Navigate · Enter Select · Esc Close');footer.append(summary,help);popup.append(list,footer);root.append(popup);
 const status=make('span','ds-ac-status');status.id=id+'-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
 const values=make('div','ds-ac-values');values.hidden=true;root.append(values);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-describedby',status.id);
 function getItems(){return selected.map(value=>items.find(item=>item.id===value)).filter(Boolean);}
 function notify(){config.onChange?.([...selected],{items:getItems(),query:input.value});}
 function close(){opened=false;popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function setActive(index,scroll=false){active=index;Array.from(list.children).forEach((e,i)=>e.dataset.active=String(i===index));if(results[index]){input.setAttribute('aria-activedescendant',id+'-option-'+index);if(scroll)list.children[index]?.scrollIntoView?.({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
 function textMatch(tag,cls,text){const e=make(tag,cls),value=String(text||''),q=input.value.trim(),at=value.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());if(!q||at<0)e.textContent=value;else{e.append(doc.createTextNode(value.slice(0,at)),make('mark','',value.slice(at,at+q.length)),doc.createTextNode(value.slice(at+q.length)));}return e;}
 function renderChips(){
  chips.replaceChildren();chips.hidden=!config.multiple||!selected.length;values.replaceChildren();
  getItems().forEach(item=>{if(config.name){const n=make('input');n.type='hidden';n.name=config.name;n.value=item.id;n.disabled=Boolean(config.disabled);values.append(n);}if(!config.multiple)return;
   const chip=make('span','ds-ac-chip');chip.setAttribute('role','listitem');if(item.icon)chip.append(glyph(item.icon));chip.append(make('span','',item.label));const remove=make('button');remove.type='button';remove.disabled=Boolean(config.disabled);remove.setAttribute('aria-label','Remove '+item.label);remove.append(glyph('x'));remove.addEventListener('click',()=>{selected=selected.filter(v=>v!==item.id);renderChips();render();input.focus();notify();status.textContent=item.label+' removed. '+selected.length+' selected.';});chip.append(remove);chips.append(chip);
  });
 }
 function render(){
  const previous=results[active]?.id;root.dataset.size=config.size==='big'?'big':'small';root.dataset.multiple=String(Boolean(config.multiple));list.setAttribute('aria-multiselectable',String(Boolean(config.multiple)));
  results=(config.filter?config.filter([...items],input.value):filterItems(items,input.value)).slice(0,config.limit||100);list.replaceChildren();
  results.forEach((item,index)=>{
   const row=make('div','ds-ac-option');row.id=id+'-option-'+index;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selected.includes(item.id)));row.setAttribute('aria-disabled',String(Boolean(item.disabled)));
   if(item.image||item.icon){const media=make('span','ds-ac-media');if(item.image){const img=make('img');img.src=item.image;img.alt='';img.loading='lazy';media.append(img);if(item.icon){const badge=make('span','ds-ac-media-badge');badge.append(glyph(item.icon));media.append(badge);}}else media.append(glyph(item.icon));row.append(media);}
   const copy=make('span','ds-ac-copy');copy.append(textMatch('strong','',item.label));if(item.detail)copy.append(textMatch('small','',item.detail));if(item.group)copy.append(make('span','ds-ac-category',item.group));row.append(copy);
   const indicator=make('span','ds-ac-indicator');indicator.setAttribute('aria-hidden','true');if(selected.includes(item.id))indicator.append(glyph('check'));else if(!config.multiple)indicator.append(glyph('chevron-right'));row.append(indicator);
   row.addEventListener('pointerenter',()=>{if(!item.disabled)setActive(index);});row.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')event.preventDefault();});row.addEventListener('click',()=>choose(item.id));list.append(row);
  });
  if(!results.length)list.append(make('div','ds-ac-empty',config.emptyText||'No matches. Try another name or category.'));
  clear.hidden=!input.value;clear.disabled=Boolean(config.disabled);summary.textContent=results.length+' results · '+selected.length+' selected';popup.hidden=!opened;input.setAttribute('aria-expanded',String(opened));const old=results.findIndex(item=>item.id===previous&&!item.disabled);setActive(opened?(old>=0?old:results.findIndex(item=>!item.disabled)):-1);
 }
 function open(){if(destroyed||config.disabled)return;opened=true;render();status.textContent=results.length+' suggestions available.';}
 function choose(value){if(destroyed||config.disabled)return;const item=items.find(i=>i.id===String(value));if(!item||item.disabled)return;selected=config.multiple?(selected.includes(item.id)?selected.filter(v=>v!==item.id):[...selected,item.id]):[item.id];input.value=config.multiple?'':item.label;renderChips();render();input.focus({preventScroll:true});if(!config.multiple)close();notify();config.onQuery?.(input.value);status.textContent=selected.length+' selected.';}
 function keydown(event){if(event.isComposing||config.disabled)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const wasOpen=opened;if(!opened)open();const enabled=results.map((item,i)=>!item.disabled?i:-1).filter(i=>i>=0);if(enabled.length){const at=enabled.indexOf(active),direction=event.key==='ArrowDown'?1:-1;setActive(!wasOpen?(direction===1?enabled[0]:enabled[enabled.length-1]):enabled[(at+direction+enabled.length)%enabled.length],true);}}
  else if(event.key==='Enter'&&opened&&results[active]){event.preventDefault();choose(results[active].id);}
  else if(event.key==='Escape'){if(opened){event.preventDefault();event.stopPropagation();}close();}
  else if(event.key==='Tab')close();
  else if(event.key==='Backspace'&&config.multiple&&!input.value&&selected.length){selected.pop();renderChips();render();notify();}
 }
 listen(fieldBody,'click',event=>{if(event.target===fieldBody&&!config.disabled)input.focus();});
 listen(input,'focus',open);listen(input,'click',()=>{if(!opened)open();});listen(input,'input',()=>{if(!config.multiple&&selected.length){selected=[];renderChips();notify();}open();config.onQuery?.(input.value);});listen(input,'keydown',keydown);
 listen(clear,'click',()=>{input.value='';input.focus();open();config.onQuery?.('');});
 listen(doc,'pointerdown',event=>{if(!root.contains(event.target))close();});
 listen(root,'focusout',()=>{win.clearTimeout(blurTimer);blurTimer=win.setTimeout(()=>{if(!root.contains(doc.activeElement))close();},0);});
 function update(patch={}){if(destroyed)return;if(patch.items)items=normalize(patch.items);Object.assign(config,patch);if(patch.value!==undefined)selected=[].concat(patch.value??[]).map(String);selected=selected.filter((v,i,a)=>items.some(item=>item.id===v)&&a.indexOf(v)===i);if(!config.multiple)selected=selected.slice(0,1);input.disabled=Boolean(config.disabled);if(patch.placeholder!==undefined)input.placeholder=patch.placeholder;if(patch.value!==undefined||patch.multiple!==undefined)input.value=config.multiple?'':getItems()[0]?.label||'';if(config.disabled)close();renderChips();render();}
 update({value:config.value||[]});close();
 return {element:root,input,field,list,popup,open,close,choose,update,getValue:()=>[...selected],getSelectedItems:getItems,getQuery:()=>input.value,setQuery(query,{open:shouldOpen=false}={}){input.value=String(query);if(shouldOpen)open();else render();},setError:field.setError,reset(){selected=[].concat(config.value||[]).map(String);input.value='';update({value:selected});field.reset();close();},destroy(){close();destroyed=true;win.clearTimeout(blurTimer);listeners.forEach(remove=>remove());field.destroy();root.remove();}};
}
return {mount,filterItems,normalize};
});
