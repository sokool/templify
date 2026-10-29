/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemUserIdentity=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

function mount(element,options={}){
 const doc=element.ownerDocument;let state={name:'',description:'',...options};element.classList.add('ds-component');element.classList.add('ds-user-identity');
 function render(){element.replaceChildren();const avatar=doc.createElement('span'),text=doc.createElement('div'),name=doc.createElement('strong'),description=doc.createElement('span');avatar.className='ds-user-identity__avatar';avatar.setAttribute('aria-hidden','true');const initials=state.initials??String(state.name).trim().split(/\s+/).slice(0,2).map(part=>Array.from(part)[0]||'').join('').toUpperCase();if(state.image){const img=doc.createElement('img');img.src=state.image;img.alt='';img.addEventListener('error',()=>{avatar.replaceChildren();avatar.textContent=initials},{once:true});avatar.append(img)}else avatar.textContent=initials;name.textContent=String(state.name);description.className='ds-user-identity__description';description.textContent=String(state.description);text.append(name,description);element.append(avatar,text)}
 render();return {element,update(next){state={...state,...next};render()},destroy(){element.replaceChildren();element.classList.remove('ds-component');element.classList.remove('ds-user-identity')}};
}
return Object.freeze({mount});

});
