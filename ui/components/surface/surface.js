/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemSurface=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function content(node,value){if(value?.nodeType)node.append(value);else node.textContent=String(value??'')}

const defaults=Object.freeze({bg:'var(--ds-colour-panel)',text:'var(--ds-colour-text)',border:'var(--ds-colour-divider)',radius:'20',padding:'25',borderWidth:'1',shadow:'none'});
const shadows=Object.freeze({none:'none',soft:'0 6px 18px #00000012',raised:'0 12px 30px #00000020'});
const tokens=Object.freeze({bg:'--ds-surface-bg',text:'--ds-surface-text',border:'--ds-surface-border',radius:'--ds-surface-radius',padding:'--ds-surface-padding',borderWidth:'--ds-surface-border-width',shadow:'--ds-surface-shadow'});
function mount(element,options={}){let state={...options};element.classList.add('ds-component');element.classList.add('ds-surface');const original=new Map(Object.values(tokens).map(token=>[token,element.style.getPropertyValue(token)]));
 function render(){for(const [key,token] of Object.entries(tokens))if(state[key]!==undefined){const value=state[key];element.style.setProperty(token,['radius','padding','borderWidth'].includes(key)?Math.max(0,Number(value)||0)+'px':key==='shadow'?(shadows[value]||'none'):String(value))}if(Object.hasOwn(state,'content')){element.replaceChildren();content(element,state.content);delete state.content}}
 render();return {element,update(next){state={...state,...next};render()},destroy(){element.classList.remove('ds-surface');element.classList.remove('ds-component');for(const [token,value] of original)if(value)element.style.setProperty(token,value);else element.style.removeProperty(token)}};
}
return Object.freeze({mount,defaults,tokens,shadows});

});
