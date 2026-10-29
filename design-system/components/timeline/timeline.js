/* Independent runtime: data and state belong to the caller. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemTimeline=api;})(globalThis,function(){'use strict';
function mount(element,options={}){const doc=element.ownerDocument;let state={...options};const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};element.classList.add('ds-component','ds-timeline');
function render(){element.replaceChildren();const list=make('ol');list.setAttribute('aria-label',state.label||'Timeline');for(const item of state.items||[]){const row=make('li'),title=make('strong','',item.title);row.append(title);if(item.date){const date=make('time','',item.date);if(item.datetime)date.dateTime=item.datetime;row.append(date);}if(item.description)row.append(make('p','',item.description));list.append(row);}element.append(list);}

render();return {element,update(patch){state={...state,...patch};render();},destroy(){element.replaceChildren();element.classList.remove('ds-component','ds-timeline');element.removeAttribute('aria-busy');}};}
return Object.freeze({mount});});
