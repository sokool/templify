/* Authoring only: per-instance configuration, injected settings and palette picker. */
(function(root){'use strict';
const defaults={fill:{kind:'semantic',role:'accent'},ink:{kind:'semantic',role:'page'},border:{kind:'semantic',role:'border'},shadow:{kind:'semantic',role:'muted'}};
function normalise(items){const list=Array.isArray(items)?items:[];return (list.length?list:[{id:'primary',label:'Primary',style:'primary',colours:{}}]).map((item,index)=>({id:String(item.id||'button-'+index),label:String(item.label||'Primary'),style:['primary','split','secondary','ghost'].includes(item.style)?item.style:'primary',colours:{...item.colours}}));}
function mount(host,{themes,settings,Picker=root.PalettePicker,Field=root.DesignSystemFormField,Button=root.DesignSystemButtons}={}){
 const doc=host.ownerDocument,make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};let items=normalise(settings?.get('items')),views=[];
 host.classList.add('buttons-tool');const list=make('div','buttons-tool-list'),actions=make('div','buttons-tool-actions');host.append(list,actions);
 function save(){settings?.set('items',items);}
 function clear(){views.forEach(v=>v.destroy());views=[];list.replaceChildren();}
 function render(){clear();items.forEach((item,index)=>{
  const card=make('section','buttons-tool-item'),top=make('div','buttons-tool-heading'),preview=make('div','buttons-tool-preview'),controls=make('div','buttons-tool-controls');card.append(top,preview,controls);list.append(card);
  top.append(make('h3','',index===0?'Primary button':'Button '+(index+1)));if(index>0){const remove=make('button','buttons-tool-remove','Remove');remove.type='button';remove.addEventListener('click',()=>{items.splice(index,1);save();render();});top.append(remove);}
  const runtime=Button.mount(preview,{label:item.label,variant:item.style});views.push(runtime);const disabled=Button.mount(preview,{label:item.label,variant:item.style,disabled:true});views.push(disabled);const pickers={};
  function apply(){const appearance={};for(const key of Object.keys(defaults))appearance[key]=item.colours[key]?pickers[key].getCSS():null;runtime.update({label:item.label,variant:item.style,appearance});disabled.update({label:item.label,variant:item.style,appearance});for(const key of Object.keys(pickers))if(!item.colours[key])pickers[key].update?.(defaults[key]);item.appearance=Object.fromEntries(Object.entries(appearance).filter(([,value])=>value));save();}
  const fields=make('div','buttons-tool-fields');card.append(fields);
  views.push(Field.mount(fields,{label:'Label',value:item.label,attrs:{value:item.label},onChange({value}){item.label=value;apply();}}));
  views.push(Field.mount(fields,{kind:'select',label:'Style',value:item.style,options:[{value:'primary',label:'Primary · solid'},{value:'split',label:'Split · arrow'},{value:'secondary',label:'Outline'},{value:'ghost',label:'Ghost'}],onChange({value}){item.style=value;apply();}}));
  for(const [key,label] of Object.entries({fill:'Background',ink:'Text',border:'Border',shadow:'Shadow'})){
   const holder=make('div');controls.append(holder);const initial=Picker.valid(item.colours[key],root.DesignSystemThemes.tokens)?item.colours[key]:defaults[key];if(!Picker.valid(item.colours[key],root.DesignSystemThemes.tokens))delete item.colours[key];
   pickers[key]=Picker.mount(holder,{themes,label,value:initial,defaultValue:defaults[key],inherited:key==='ink'?()=>{const colour=doc.defaultView.getComputedStyle(runtime.element).color,parts=colour.match(/[\d.]+/g);return {css:'var(--ds-colour-on-accent)',colour:parts?'#'+parts.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('').toUpperCase():themes.getState().palettes[themes.getState().theme].page,label:'Inherited text'};}:undefined,onChange(value){if(JSON.stringify(value)===JSON.stringify(defaults[key]))delete item.colours[key];else item.colours[key]=value;apply();}});views.push(pickers[key]);
  }
  const reset=make('button','buttons-tool-reset','Inherit palette');reset.type='button';reset.addEventListener('click',()=>{item.colours={};save();render();});card.append(reset);apply();
 });}
 const add=Button.mount(actions,{label:'Add button',variant:'secondary',onClick(){items.push({id:'button-'+Date.now()+'-'+items.length,label:'Button '+(items.length+1),style:'primary',colours:{}});save();render();}});
 render();return {destroy(){clear();add.destroy();host.replaceChildren();host.classList.remove('buttons-tool');}};
}
root.DesignSystemButtonsTool={mount,normalise};if(typeof module==='object'&&module.exports)module.exports=root.DesignSystemButtonsTool;
})(globalThis);
