/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemNotifications=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

let sequence=0;
function mount(element,options={}){
 const doc=element.ownerDocument;let state={kind:'info',title:'',message:'',...options};element.classList.add('ds-component');element.classList.add('ds-notification');
 function render(){const kind=['info','success','warning','error'].includes(state.kind)?state.kind:'info';element.dataset.kind=kind;element.setAttribute('role',kind==='error'||kind==='warning'?'alert':'status');element.replaceChildren();const title=doc.createElement('strong');title.className='ds-notification__title';const glyph=doc.createElement('span');glyph.setAttribute('aria-hidden','true');glyph.textContent={info:'ⓘ',success:'✓',warning:'!',error:'×'}[kind];const words=doc.createElement('span');words.textContent=String(state.title);title.append(glyph,words);element.append(title);if(state.message){const body=doc.createElement('p');content(body,state.message);element.append(body)}if(state.action){const button=doc.createElement('button');button.type='button';button.className='ds-notification__action ds-focusable';button.textContent=String(state.action.label);button.addEventListener('click',event=>state.action.onClick?.(event));element.append(button)}if(state.dismissible){const close=doc.createElement('button');close.type='button';close.className='ds-notification__dismiss ds-focusable';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';close.addEventListener('click',()=>{element.hidden=true;state.onDismiss?.()});element.append(close)}}
 render();return {element,update(next){state={...state,...next};element.hidden=false;render()},destroy(){element.replaceChildren();element.classList.remove('ds-notification');element.classList.remove('ds-component');element.removeAttribute('role')}};
}
function createToaster({document,container=document.body,duration=2400}={}){
 const host=document.createElement('div');host.className='ds-toast-region';host.setAttribute('aria-label','Notifications');container.append(host);const live=new Map();
 function dismiss(id){const item=live.get(id);if(!item)return;clearTimeout(item.timer);item.view.destroy();item.node.remove();live.delete(id)}
 return {show(options={}){const id=++sequence,node=document.createElement('div');host.append(node);const view=mount(node,{...options,dismissible:true,onDismiss(){dismiss(id);options.onDismiss?.()}});const delay=options.duration??duration;live.set(id,{node,view,timer:delay>0?setTimeout(()=>dismiss(id),delay):null});return id},dismiss,destroy(){[...live.keys()].forEach(dismiss);host.remove()}};
}
return Object.freeze({mount,createToaster});

});
