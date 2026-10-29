/* Runtime only: no editor, storage, application routing or icon-library dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemTooltip=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

let sequence=0;
const defaults=Object.freeze({bg:'var(--ds-colour-panel)',text:'var(--ds-colour-text)',border:'color-mix(in srgb,var(--ds-accent-1) 55%,var(--ds-colour-panel))',accent:'var(--ds-colour-accent)',weight:'500',style:'normal',padding:'8px 11px',size:'12'});
const tokens=Object.freeze({bg:'--ds-tooltip-bg',text:'--ds-tooltip-text',border:'--ds-tooltip-border',accent:'--ds-tooltip-accent',weight:'--ds-tooltip-weight',style:'--ds-tooltip-style',padding:'--ds-tooltip-padding',size:'--ds-tooltip-size'});
function mount(scope,options={}){
 const doc=scope.ownerDocument||scope,win=doc.defaultView||globalThis;let state={selector:'[data-tooltip],[title]',distance:6,duration:350,...options},anchor=null,previous=null,finishTimer=null,frame=null,destroyed=false,keyboard=false;const bindings=[],titles=new Map();
 const tip=doc.createElement('div');tip.className='ds-component ds-tooltip';tip.id='ds-tooltip-'+(++sequence);tip.setAttribute('role','tooltip');tip.setAttribute('popover','manual');tip.hidden=true;doc.body.append(tip);
 function listen(node,type,fn,opts){node.addEventListener(type,fn,opts);bindings.push(()=>node.removeEventListener(type,fn,opts))}
 function duration(){return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:Math.max(0,Number(state.duration)||0)}
 function detach(){if(anchor){if(previous===null)anchor.removeAttribute('aria-describedby');else anchor.setAttribute('aria-describedby',previous)}anchor=null;previous=null}
 function hide(immediate=false){clearTimeout(finishTimer);if(frame!==null){win.cancelAnimationFrame?.(frame);frame=null}detach();tip.dataset.visible='false';const finish=()=>{tip.hidden=true;if(tip.matches?.(':popover-open'))tip.hidePopover()};if(immediate||!duration())finish();else finishTimer=setTimeout(finish,duration())}
 function show(target,text=target?.dataset.tooltip||target?.getAttribute('title')){if(destroyed||!target||!text||target.isConnected===false)return false;if(anchor===target&&tip.dataset.visible==='true')return true;hide(true);if(target.getAttribute('title')){titles.set(target,target.getAttribute('title'));target.dataset.tooltip=text;target.removeAttribute('title')}anchor=target;previous=anchor.getAttribute('aria-describedby');anchor.setAttribute('aria-describedby',[previous,tip.id].filter(Boolean).join(' '));tip.textContent=String(text);tip.style.setProperty('--ds-tooltip-fade',duration()+'ms');tip.dataset.placement='top';tip.hidden=false;if(tip.showPopover)tip.showPopover();const bounds=target.getBoundingClientRect(),width=tip.offsetWidth,height=tip.offsetHeight;const vw=win.innerWidth||doc.documentElement.clientWidth,vh=win.innerHeight||doc.documentElement.clientHeight;const left=Math.max(8,Math.min(bounds.left+bounds.width/2-width/2,vw-width-8));let top=bounds.top-height-state.distance;if(top<8){top=bounds.bottom+state.distance;tip.dataset.placement='bottom'}tip.style.left=left+'px';tip.style.top=Math.max(8,Math.min(top,vh-height-8))+'px';tip.style.setProperty('--ds-tooltip-pointer',Math.max(10,Math.min(width-10,bounds.left+bounds.width/2-left))+'px');void tip.offsetWidth;frame=win.requestAnimationFrame?win.requestAnimationFrame(()=>{frame=null;tip.dataset.visible='true'}):null;if(frame===null)tip.dataset.visible='true';return true}
 function target(event){const node=event.target?.closest?.(state.selector);return node&&scope.contains(node)?node:null}
 listen(scope,'pointerover',event=>{if(event.pointerType==='touch')return;const node=target(event);if(node&&!node.contains(event.relatedTarget))show(node)});
 listen(scope,'pointerout',event=>{const node=target(event);if(node&&!node.contains(event.relatedTarget))hide()});
 listen(scope,'pointerdown',()=>{keyboard=false;hide()},true);
 listen(scope,'click',()=>hide(),true);
 listen(scope,'keydown',event=>{keyboard=true;if(event.key==='Escape'||event.key==='Enter'||event.key===' ')hide()},true);
 listen(scope,'focusin',event=>{if(keyboard){const node=target(event);if(node)show(node)}});
 listen(scope,'focusout',()=>hide());listen(scope,'pointermove',event=>{if(anchor&&!anchor.contains(event.target))hide()});listen(win,'scroll',()=>hide(),{capture:true,passive:true});listen(win,'resize',()=>hide());listen(win,'blur',()=>hide());
 const observer=win.MutationObserver?new win.MutationObserver(()=>{if(anchor&&!anchor.isConnected)hide(true)}):null;observer?.observe(scope===doc?doc.documentElement:scope,{childList:true,subtree:true});
 return {element:tip,show,hide,update(next){state={...state,...next};hide(true)},destroy(){destroyed=true;observer?.disconnect();hide(true);bindings.forEach(off=>off());for(const [node,title] of titles){node.setAttribute('title',title);if(node.dataset.tooltip===title)delete node.dataset.tooltip}titles.clear();tip.remove()}};
}
return Object.freeze({mount,defaults,tokens});

});
