/* Window runtime. Native dialog owns top-layer stacking, inert background and focus containment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemWindow=api;})(globalThis,function(){'use strict';
let sequence=0;const locks=new WeakMap();
function lock(doc){let state=locks.get(doc);if(!state){state={count:0,overflow:doc.documentElement.style.overflow};locks.set(doc,state);}state.count++;doc.documentElement.style.overflow='hidden';}
function unlock(doc){const state=locks.get(doc);if(!state)return;if(--state.count===0){doc.documentElement.style.overflow=state.overflow;locks.delete(doc);}}
function mount(host,options={}){
 const doc=host.ownerDocument,win=doc.defaultView,id='ds-window-'+(++sequence);let state={mode:'modal',side:'right',width:480,closeOnEscape:true,closeOnBackdrop:true,showClose:true,lockScroll:true,duration:220,...options},destroyed=false,closing=false,timer=null,opener=null,locked=false,backdropPress=false;
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
 const dialog=make('dialog','ds-component ds-window');dialog.id=id;dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 const header=make('header','ds-window-header'),title=make('h2','ds-window-title'),closeButton=make('button','ds-window-close','×'),body=make('div','ds-window-body'),footer=make('footer','ds-window-footer');title.id=id+'-title';dialog.setAttribute('aria-labelledby',title.id);closeButton.type='button';closeButton.setAttribute('aria-label','Close window');header.append(title,closeButton);dialog.append(header,body,footer);
 // Portal avoids clipping and transforms on the caller's layout. No host data is imported.
 (state.container||doc.body).append(dialog);
 function content(node,value){node.replaceChildren();if(value?.nodeType)node.append(value);else if(value!=null)node.textContent=String(value);}
 function sync(patch){dialog.dataset.mode=state.mode==='side'?'side':'modal';dialog.dataset.side=state.side==='left'?'left':'right';dialog.style.setProperty('--ds-window-width',Math.max(240,Math.min(1200,Number(state.width)||480))+'px');dialog.style.setProperty('--ds-window-duration',Math.max(0,Math.min(2000,Number(state.duration)||0))+'ms');title.textContent=state.title||'Window';closeButton.hidden=!state.showClose;
  if('content' in patch)content(body,state.content);if('footer' in patch)content(footer,state.footer);footer.hidden=!footer.childNodes.length;
 }
 function release(){if(locked){unlock(doc);locked=false;}}
 function finish(reason){if(!dialog.open)return;closing=false;dialog.classList.remove('is-closing');dialog.close(reason);}
 function close(reason='api',{immediate=false}={}){if(!dialog.open||closing)return;closing=true;dialog.classList.add('is-closing');const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const duration=immediate||reduced?0:Math.max(0,Math.min(2000,Number(state.duration)||0));if(duration)timer=win.setTimeout(()=>finish(reason),duration);else finish(reason);}
 function open(){if(destroyed||dialog.open)return;opener=doc.activeElement;dialog.classList.remove('is-closing');closing=false;dialog.showModal();if(state.lockScroll){lock(doc);locked=true;}const focus=typeof state.initialFocus==='string'?body.querySelector(state.initialFocus):state.initialFocus;if(focus?.focus)focus.focus({preventScroll:true});state.onOpen?.();}
 function closed(){win.clearTimeout(timer);release();closing=false;dialog.classList.remove('is-closing');if(opener?.isConnected)opener.focus?.({preventScroll:true});if(!destroyed)state.onClose?.(dialog.returnValue);}
 function cancel(event){event.preventDefault();if(state.closeOnEscape)close('escape');}
 function onPointerDown(event){backdropPress=event.target===dialog&&outside(event);}
 function outside(event){const box=dialog.getBoundingClientRect();return event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom;}
 function onPointerUp(event){if(backdropPress&&event.target===dialog&&outside(event)&&state.closeOnBackdrop)close('backdrop');backdropPress=false;}
 const clickClose=()=>close('button');closeButton.addEventListener('click',clickClose);dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',closed);dialog.addEventListener('pointerdown',onPointerDown);dialog.addEventListener('pointerup',onPointerUp);
 sync(state);
 return {element:dialog,body,open,close,isOpen:()=>dialog.open&&!closing,update(patch){if(destroyed)return;Object.assign(state,patch);sync(patch);if(dialog.open){if(state.lockScroll&&!locked){lock(doc);locked=true;}else if(!state.lockScroll)release();}},destroy(){if(destroyed)return;destroyed=true;win.clearTimeout(timer);dialog.removeEventListener('close',closed);dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('pointerdown',onPointerDown);dialog.removeEventListener('pointerup',onPointerUp);closeButton.removeEventListener('click',clickClose);if(dialog.open)dialog.close();release();dialog.remove();if(opener?.isConnected)opener.focus?.({preventScroll:true});}};
}
return Object.freeze({mount});});
