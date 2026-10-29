(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DesignSystemTabs=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  let nextInstance=0;
  function mount(element,options={}){
    if(!element)throw new TypeError('Tabs requires a mount element.');
    const doc=element.ownerDocument,prefix='ds-tabs-'+(++nextInstance);
    let state={label:'Tabs',items:[],activation:'automatic',...options},destroyed=false,selected=null;
    let buttons=[],panels=[];
    element.classList.add('ds-component');element.classList.add('ds-tabs');
    function create(tag,className,text){const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
    function normalizeItems(items){
      const ids=new Set();
      return items.map(item=>{const id=String(item.id);if(ids.has(id))throw new TypeError('Duplicate tab id: '+id);ids.add(id);return {...item,id}});
    }
    function sync(){
      const enabled=state.items.findIndex(item=>!item.disabled),active=state.items.findIndex(item=>item.id===selected);
      buttons.forEach((button,index)=>{const isSelected=index===active;button.setAttribute('aria-selected',String(isSelected));button.tabIndex=index===(active>=0?active:enabled)?0:-1;panels[index].hidden=!isSelected});
    }
    function select(id,{focus=false,notify=false,event}={}){
      const index=state.items.findIndex(item=>item.id===String(id)&&!item.disabled);
      if(index<0)return false;
      const changed=selected!==state.items[index].id;selected=state.items[index].id;sync();
      if(focus)buttons[index].focus();
      if(changed&&notify)state.onChange?.(selected,event);
      return true;
    }
    function render(){
      const list=create('div','ds-tabs__list');list.setAttribute('role','tablist');list.setAttribute('aria-label',state.label);
      buttons=[];panels=[];
      state.items.forEach((item,index)=>{
        const button=create('button','ds-tabs__tab ds-focusable',String(item.label??'')),panel=create('div','ds-tabs__panel');
        button.type='button';button.id=prefix+'-tab-'+index;button.dataset.tabIndex=String(index);button.disabled=Boolean(item.disabled);
        button.setAttribute('role','tab');button.setAttribute('aria-controls',prefix+'-panel-'+index);
        if(item.disabled)button.setAttribute('aria-disabled','true');
        panel.id=prefix+'-panel-'+index;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
        if(item.content?.nodeType)panel.append(item.content);else panel.textContent=String(item.content??'');
        buttons.push(button);panels.push(panel);list.append(button);
      });
      element.replaceChildren(list,...panels);sync();
    }
    function onClick(event){const button=event.target.closest('[data-tab-index]');if(button&&element.contains(button)&&buttons.includes(button))select(state.items[Number(button.dataset.tabIndex)].id,{notify:true,event})}
    function onKey(event){
      const button=event.target.closest('[data-tab-index]');if(!button||!buttons.includes(button))return;
      const current=buttons.indexOf(button),enabled=state.items.map((item,index)=>item.disabled?-1:index).filter(index=>index>=0);
      if(!enabled.length)return;
      if(event.key==='Enter'||event.key===' '){event.preventDefault();select(state.items[current].id,{notify:true,event});return}
      let next;
      if(event.key==='ArrowRight')next=enabled[(enabled.indexOf(current)+1)%enabled.length];
      else if(event.key==='ArrowLeft')next=enabled[(enabled.indexOf(current)-1+enabled.length)%enabled.length];
      else if(event.key==='Home')next=enabled[0];else if(event.key==='End')next=enabled.at(-1);else return;
      event.preventDefault();buttons.forEach((node,index)=>node.tabIndex=index===next?0:-1);buttons[next].focus();
      if(state.activation!=='manual')select(state.items[next].id,{notify:true,event});
    }
    state.items=normalizeItems(state.items);selected=String(state.value??state.items.find(item=>!item.disabled)?.id??'');
    if(!state.items.some(item=>item.id===selected&&!item.disabled))selected=state.items.find(item=>!item.disabled)?.id??null;
    render();element.addEventListener('click',onClick);element.addEventListener('keydown',onKey);
    return {
      element,
      get value(){return selected},
      select(id){if(destroyed)throw new Error('Cannot select destroyed Tabs.');return select(id)},
      update(next={}){
        if(destroyed)throw new Error('Cannot update destroyed Tabs.');
        const items=normalizeItems(next.items??state.items);state={...state,...next,items};
        if(Object.hasOwn(next,'value'))selected=String(next.value);
        if(!state.items.some(item=>item.id===selected&&!item.disabled))selected=state.items.find(item=>!item.disabled)?.id??null;
        render();
      },
      destroy(){element.removeEventListener('click',onClick);element.removeEventListener('keydown',onKey);element.replaceChildren();element.classList.remove('ds-component');element.classList.remove('ds-tabs');destroyed=true}
    };
  }
  return Object.freeze({mount});
});
