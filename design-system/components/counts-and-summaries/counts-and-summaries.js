/* Independent runtime: data and state belong to the caller. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemCountsAndSummaries=api;})(globalThis,function(){'use strict';
function mount(element,options={}){const doc=element.ownerDocument;let state={...options};const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};element.classList.add('ds-component','ds-counts-and-summaries');
function render(){element.replaceChildren();const list=make('dl');list.setAttribute('aria-label',state.label||'Summary');for(const item of state.items||[]){const row=make('div');row.append(make('dt','',item.label),make('dd','',item.value));if(item.description)row.append(make('dd','ds-count-description',item.description));list.append(row);}element.append(list);}

render();return {element,update(patch){state={...state,...patch};render();},destroy(){element.replaceChildren();element.classList.remove('ds-component','ds-counts-and-summaries');element.removeAttribute('aria-busy');}};}
return Object.freeze({mount});});
