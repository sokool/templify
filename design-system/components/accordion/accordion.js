/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemAccordion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

let sequence=0;
function mount(element,options={}){
 const doc=element.ownerDocument,prefix='ds-accordion-'+(++sequence);let state={items:[],multiple:true,...options},entries=[],closed=false;
 element.classList.add('ds-component');element.classList.add('ds-accordion');
 function render(){const ids=new Set();entries=[];element.replaceChildren();state.items.forEach((item,i)=>{const id=String(item.id??i);if(ids.has(id))throw new TypeError('Duplicate accordion id: '+id);ids.add(id);const details=doc.createElement('details'),summary=doc.createElement('summary'),panel=doc.createElement('div');details.className='ds-accordion__item';summary.className='ds-accordion__summary ds-focusable';panel.className='ds-accordion__content';summary.textContent=String(item.label??'');summary.id=prefix+'-summary-'+i;panel.id=prefix+'-panel-'+i;summary.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',summary.id);content(panel,item.content);details.open=Boolean(item.open);summary.setAttribute('aria-expanded',String(details.open));details.append(summary,panel);details.addEventListener('toggle',()=>{if(closed)return;if(details.open&&!state.multiple)entries.forEach(entry=>{if(entry.details!==details)entry.details.open=false});summary.setAttribute('aria-expanded',String(details.open));state.onChange?.(id,details.open)});entries.push({id,details,summary});element.append(details)})}
 render();
 return {element,setOpen(id,open=true){const entry=entries.find(item=>item.id===String(id));if(!entry||closed)return false;if(open&&!state.multiple)entries.forEach(item=>item.details.open=false);entry.details.open=Boolean(open);entry.summary.setAttribute('aria-expanded',String(open));return true},update(next){if(closed)return;state={...state,...next};render()},destroy(){closed=true;element.replaceChildren();element.classList.remove('ds-accordion');element.classList.remove('ds-component')}};
}
return Object.freeze({mount});

});
