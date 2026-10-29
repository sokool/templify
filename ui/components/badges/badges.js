/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemBadges=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

function mount(element,options={}){
 const doc=element.ownerDocument,badge=doc.createElement('span');badge.className='ds-component ds-badge';element.append(badge);let state={label:'Featured',...options};
 function render(){badge.replaceChildren();if(state.icon?.nodeType)badge.append(state.icon);const label=doc.createElement('span');label.textContent=String(state.label);badge.append(label);for(const key of ['fill','ink','edge'])if(state[key])badge.style.setProperty('--ds-badge-'+key,state[key]);else badge.style.removeProperty('--ds-badge-'+key)}
 render();return {element:badge,update(next){state={...state,...next};render()},destroy(){badge.remove()}};
}
return Object.freeze({mount});

});
