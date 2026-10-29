/* Independent runtime: data and state belong to the caller. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemLoadingState=api;})(globalThis,function(){'use strict';
function mount(element,options={}){const doc=element.ownerDocument;let state={...options};const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};element.classList.add('ds-component','ds-loading-state');
function render(){element.replaceChildren();element.setAttribute('aria-busy',String(state.loading!==false));if(state.loading!==false){const status=make('span','ds-loading-status',state.label||'Loading…');status.setAttribute('role','status');element.append(status);const skeleton=make('div','ds-loading-skeleton');skeleton.setAttribute('aria-hidden','true');const lines=Math.max(1,Math.min(12,Number(state.lines)||3));for(let i=0;i<lines;i++)skeleton.append(make('span'));element.append(skeleton);}else if(state.content?.nodeType)element.append(state.content);else element.append(make('div','',state.content||''));}

render();return {element,update(patch){state={...state,...patch};render();},destroy(){element.replaceChildren();element.classList.remove('ds-component','ds-loading-state');element.removeAttribute('aria-busy');}};}
return Object.freeze({mount});});
