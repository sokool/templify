/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemButtons=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

function mount(element,options={}){
 const doc=element.ownerDocument;let state={label:'Continue',disabled:false,variant:'split',type:'button',...options};const button=doc.createElement('button');button.className='ds-component ds-button ds-focusable';element.append(button);
 function render(){button.type=['button','submit','reset'].includes(state.type)?state.type:'button';button.disabled=Boolean(state.disabled);button.dataset.variant=['primary','secondary','ghost','split'].includes(state.variant)?state.variant:'primary';button.replaceChildren();if(state.icon?.nodeType)button.append(state.icon);const label=doc.createElement('span');label.textContent=String(state.label);button.append(label);if(state.ariaLabel)button.setAttribute('aria-label',state.ariaLabel);else button.removeAttribute('aria-label');for(const key of ['fill','ink','border','shadow']){const value=state.appearance?.[key]??state[key];if(value)button.style.setProperty('--ds-button-'+key,value);else button.style.removeProperty('--ds-button-'+key)}}
 function click(event){if(!state.disabled)state.onClick?.(event)}button.addEventListener('click',click);render();
 return {element:button,update(next){state={...state,...next,appearance:{...state.appearance,...next.appearance}};render()},destroy(){button.removeEventListener('click',click);button.remove()}};
}
return Object.freeze({mount});

});
