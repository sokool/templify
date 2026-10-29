/* Reusable fields, including one shared select renderer. Values stay in native controls. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./validation.js'):root.DesignSystemFormValidation);if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemFormField=api;})(typeof globalThis!=='undefined'?globalThis:this,function(validation){
'use strict';let nextId=0;
const booleanAttrs=new Set(['required','disabled','readonly','multiple','checked','autofocus']);
const allowedAttrs=new Set(['name','value','required','disabled','readonly','placeholder','minlength','maxlength','min','max','step','pattern','autocomplete','form','accept','multiple','checked','rows','cols','size','src','alt','inputmode','title','spellcheck','capture','dirname','formaction','formmethod','formenctype','formtarget','formnovalidate']);
function attrs(node, values={}){Object.entries(values).forEach(([key,value])=>{const name=key.toLowerCase();if(!allowedAttrs.has(name)&&!name.startsWith('aria-'))return;if(value==null||value===false)return;if(booleanAttrs.has(name)){if(value)node.setAttribute(name,'');}else node.setAttribute(name,String(value));});}
function el(doc,tag,className,text){const n=doc.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=String(text);return n;}
function mount(host,options={}){
 const doc=host.ownerDocument, config={...options}, kind=config.kind||'input', type=config.type||'text', id=config.id||'ds-field-'+(++nextId), listeners=[];
 const root=el(doc,kind==='checkbox-group'||kind==='radio-group'?'fieldset':'div','ds-component ds-field');root.dataset.kind=kind;root.dataset.type=type;
 const caption=el(doc,root.tagName==='FIELDSET'?'legend':'div','ds-field-caption');
 const label=el(doc,root.tagName==='FIELDSET'?'span':'label','ds-field-label',config.label||'');if(label.tagName==='LABEL')label.htmlFor=id;
 const error=el(doc,'span','ds-field-error');error.id=id+'-error';error.hidden=true;error.setAttribute('aria-live','polite');caption.append(label,error);root.append(caption);
 const body=el(doc,'div','ds-field-body');root.append(body);host.append(root);
 const isButton=['submit','reset','button','image'].includes(type),isCheck=type==='checkbox'||type==='radio';if(isCheck)label.removeAttribute('for');
 const controls=[];let control,focusTarget,selectApi=null,touched=false,forcedError='',list=null;
 function listen(node,type,fn,opts){node.addEventListener(type,fn,opts);listeners.push(()=>node.removeEventListener(type,fn,opts));}
 function native(tag,inputType,values,controlId){const n=el(doc,tag,'ds-field-control');if(inputType)n.type=inputType;n.id=controlId;attrs(n,values);if(values.value!=null&&inputType!=='file'){n.defaultValue=String(values.value);n.value=String(values.value);}return n;}
 if(kind==='checkbox-group'||kind==='radio-group'){
  root.classList.add('ds-field-choice-group');const radio=kind==='radio-group';if(config.disabled)root.disabled=true;
  (config.options||[]).forEach((option,index)=>{const row=el(doc,'label','ds-field-choice');const n=native('input',radio?'radio':'checkbox',{...config.attrs,required:false,...option,name:config.name||config.attrs?.name},id+'-'+index);if(radio&&config.required)n.required=true;row.append(n,el(doc,'span','',option.label));body.append(row);controls.push(n);});control=controls[0];focusTarget=control;
 }else if(kind==='actions'){
  const details=el(doc,'details','ds-field-actions'),summary=el(doc,'summary','ds-field-action-trigger',config.label||'Form actions');summary.id=id;summary.append(el(doc,'span','ds-field-chevron'));details.append(summary);label.hidden=true;
  const menu=el(doc,'div','ds-field-action-list');(config.options||[]).forEach(item=>{const b=el(doc,'button','ds-field-action',item.label);b.type=item.type||'button';attrs(b,item);listen(b,'click',event=>{details.open=false;item.onClick?.(event);config.onAction?.(item,event);});menu.append(b);});details.append(menu);body.append(details);control=summary;focusTarget=summary;
 }else{
  const tag=kind==='textarea'?'textarea':kind==='select'?'select':kind==='button'?'button':'input';
  control=native(tag,tag==='input'||tag==='button'?type:null,{...config.attrs,name:config.name??config.attrs?.name},id);controls.push(control);focusTarget=control;
  if(tag==='button')control.textContent=config.text||config.label||'Continue';
  if(kind==='select'){
   function appendOption(parent,option){if(option.options){const group=el(doc,'optgroup');group.label=option.label;group.disabled=Boolean(option.disabled);option.options.forEach(o=>appendOption(group,o));parent.append(group);}else{const n=el(doc,'option','',option.label);n.value=String(option.value??'');n.disabled=Boolean(option.disabled);n.defaultSelected=Boolean(option.selected);parent.append(n);}}
   (config.options||[]).forEach(o=>appendOption(control,o));if(config.value!==undefined){const values=new Set([].concat(config.value).map(String));Array.from(control.options).forEach(o=>o.selected=values.has(o.value));Array.from(control.options).forEach(o=>o.defaultSelected=o.selected);}
   body.append(control);
   // Multiple selection keeps the native listbox: platform keyboard, size and optgroups work intact.
   if(!control.multiple)selectApi=enhanceSelect(control,body,config,listen);
   focusTarget=selectApi?.trigger||control;
  }else if(type==='checkbox'||type==='radio'){
   root.classList.add('ds-field-check');caption.classList.add('ds-field-check-caption');const row=el(doc,'label','ds-field-choice');row.htmlFor=id;row.append(control,el(doc,'span','',config.text||config.label));body.append(row);if(type==='checkbox'&&config.switch){control.setAttribute('role','switch');control.classList.add('ds-field-switch');}
  }else if(type==='hidden'){
   root.hidden=true;body.append(control);
  }else{body.append(control);}
  if(config.unit){root.classList.add('ds-field-unit');body.append(el(doc,'span','ds-field-unit-text',config.unit));}
  if(config.suggestions){list=el(doc,'datalist');list.id=id+'-suggestions';config.suggestions.forEach(value=>{const option=el(doc,'option');option.value=typeof value==='string'?value:value.value;if(value.label)option.label=value.label;list.append(option);});control.setAttribute('list',list.id);body.append(list);}
  if(type==='range'||type==='color'||type==='file'||kind==='textarea'){
   const out=el(doc,'output','ds-field-output');out.htmlFor=id;body.append(out);
   const syncOutput=()=>{out.textContent=type==='file'?(Array.from(control.files||[]).map(f=>f.name).join(', ')||'No files selected.'):kind==='textarea'?(control.value.length+(control.maxLength>0?' / '+control.maxLength:'')):control.value;};listen(control,'input',syncOutput);listen(control,'change',syncOutput);root.syncOutput=syncOutput;syncOutput();
  }
  if(config.quantity){const minus=el(doc,'button','ds-field-stepper','−'),plus=el(doc,'button','ds-field-stepper','+');minus.type=plus.type='button';minus.setAttribute('aria-label','Decrease '+config.label);plus.setAttribute('aria-label','Increase '+config.label);body.prepend(minus);body.append(plus);[minus,plus].forEach((b,i)=>{b.disabled=control.disabled||control.readOnly;listen(b,'click',()=>{try{i?control.stepUp():control.stepDown();}catch{}control.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));control.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});});root.classList.add('ds-field-quantity');}
 }
 if(typeof config.onClick==='function'&&control)listen(control,'click',event=>config.onClick({control,event}));
 if(!config.label&&!config.text&&control&&!control.getAttribute('aria-label'))control.setAttribute('aria-label',config.accessibleLabel||config.name||'Value');
 const hint=config.hint?el(doc,'p','ds-field-hint',config.hint):null;if(hint){hint.id=id+'-hint';root.append(hint);}
 if(!config.label)caption.hidden=true;
 if(['submit','reset','button','image'].includes(type)){root.classList.add('ds-field-button');caption.hidden=true;if(control&&control.tagName==='INPUT'&&!control.value&&type!=='image')control.value=config.text||config.label||type;}
 function value(){if(kind==='checkbox-group'||kind==='radio-group')return controls.filter(n=>n.checked).map(n=>n.value);if(type==='checkbox'||type==='radio')return control.checked;if(control.multiple&&kind==='select')return Array.from(control.selectedOptions).map(n=>n.value);if(type==='file')return Array.from(control.files||[]);return control.value;}
 function setError(text){const message=String(text||'');error.textContent=message?(config.label&&!isCheck?' · ':'')+message:'';error.hidden=!message;if(kind==='actions')label.hidden=!message;caption.hidden=isButton||kind==='actions'&&!message||(!config.label&&!message);if(isButton)label.removeAttribute('for');root.dataset.invalid=String(Boolean(message));const targets=Array.from(new Set([...controls,focusTarget].filter(Boolean)));targets.forEach(n=>{if(message)n.setAttribute('aria-invalid','true');else n.removeAttribute('aria-invalid');const ids=new Set((n.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.delete(error.id);if(hint)ids.add(hint.id);if(message)ids.add(error.id);if(ids.size)n.setAttribute('aria-describedby',Array.from(ids).join(' '));else n.removeAttribute('aria-describedby');});}
 function getError(){if(root.disabled)return '';if(kind==='checkbox-group'||kind==='radio-group')return validation.groupMessage(controls,{...config,required:config.required||kind==='radio-group'&&config.attrs?.required});if(kind==='actions')return '';return validation.message(control,{...config,label:config.label||config.accessibleLabel||config.name});}
 function validate(){touched=true;const message=getError();setError(forcedError||message);return !message;}
 function notify(eventType,event){selectApi?.sync();root.syncOutput?.();if(touched)validate();config.onChange?.({value:value(),control,eventType,event});}
 controls.forEach(n=>{listen(n,'input',e=>notify('input',e));listen(n,'change',e=>notify('change',e));});
 function sync(){selectApi?.sync();root.syncOutput?.();}
 function reset(){root.querySelectorAll('details').forEach(n=>n.open=false);touched=false;forcedError='';setError('');sync();selectApi?.close();}
 setError('');sync();
 return {element:root,control,controls,focusTarget,getValue:value,validate,getError,setError,sync,reset,previewError(enabled,message){forcedError=enabled?(message||config.messages?.required||'Check this value.'):'';setError(forcedError||(touched?getError():''));},focus(){focusTarget?.focus();},destroy(){selectApi?.close();listeners.forEach(fn=>fn());root.remove();}};
}
function enhanceSelect(native,body,config,listen){
 const doc=native.ownerDocument,id=native.id;body.classList.add('ds-select');const trigger=el(doc,'button','ds-field-control ds-select-trigger');trigger.type='button';trigger.id=id+'-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'-list');trigger.setAttribute('aria-labelledby',id+'-label');
 const caption=native.closest('.ds-field').querySelector('.ds-field-label');caption.id=id+'-label';caption.htmlFor=trigger.id;if(!config.label)trigger.setAttribute('aria-label',config.accessibleLabel||config.name||'Select an option');
 const value=el(doc,'span','ds-select-value'),chevron=el(doc,'span','ds-field-chevron');trigger.append(value,chevron);
 const list=el(doc,'div','ds-select-list');list.id=id+'-list';list.setAttribute('role','listbox');list.setAttribute('aria-labelledby',caption.id);list.hidden=true;body.append(trigger,list);native.classList.add('ds-select-native');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
 let active=-1,opened=false,search='',timer;const nodes=[];
 function disabled(option){return native.disabled||option.disabled||option.parentElement?.disabled;}
 Array.from(native.options).forEach((option,index)=>{if(option.parentElement.tagName==='OPTGROUP'&&option.parentElement.firstElementChild===option){const heading=el(doc,'div','ds-select-group',option.parentElement.label);heading.setAttribute('role','presentation');list.append(heading);}const row=el(doc,'div','ds-select-option',option.label);row.id=id+'-option-'+index;row.setAttribute('role','option');row.setAttribute('aria-disabled',String(Boolean(disabled(option))));row.dataset.placeholder=String(option.value==='');nodes.push(row);list.append(row);listen(row,'pointerdown',e=>e.preventDefault());listen(row,'click',()=>choose(index));listen(row,'pointermove',()=>{if(!disabled(option)){active=index;paint();}});});
 function paint(){nodes.forEach((n,i)=>{n.dataset.active=String(i===active);n.setAttribute('aria-selected',String(native.options[i].selected));});if(opened&&nodes[active])trigger.setAttribute('aria-activedescendant',nodes[active].id);else trigger.removeAttribute('aria-activedescendant');}
 function sync(){trigger.disabled=native.disabled;value.textContent=native.selectedOptions[0]?.label||config.placeholder||'Choose an option…';trigger.dataset.placeholder=String(!native.value);nodes.forEach((row,i)=>row.setAttribute('aria-disabled',String(Boolean(disabled(native.options[i])))));paint();}
 function open(){if(native.disabled)return;opened=true;list.hidden=false;body.dataset.open='true';trigger.setAttribute('aria-expanded','true');active=native.selectedIndex;paint();}
 function close(){opened=false;list.hidden=true;body.dataset.open='false';trigger.setAttribute('aria-expanded','false');paint();}
 function choose(index){if(!native.options[index]||disabled(native.options[index]))return;native.selectedIndex=index;sync();close();trigger.focus();native.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));native.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));}
 function move(delta){const enabled=Array.from(native.options).map((o,i)=>disabled(o)?-1:i).filter(i=>i>=0);if(!enabled.length)return;let pos=enabled.indexOf(active);pos=Math.max(0,Math.min(enabled.length-1,pos+delta));active=enabled[pos];paint();nodes[active]?.scrollIntoView?.({block:'nearest'});}
 listen(trigger,'click',()=>opened?close():open());
 listen(trigger,'keydown',e=>{if(['ArrowDown','ArrowUp','Home','End','Escape','Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='Escape'){close();return;}if(e.key==='Enter'||e.key===' '){opened?choose(active):open();return;}if(!opened)open();if(e.key==='Home'||e.key==='End'){const enabled=Array.from(native.options).map((o,i)=>disabled(o)?-1:i).filter(i=>i>=0);active=e.key==='Home'?enabled[0]:enabled[enabled.length-1];paint();}else move(e.key==='ArrowDown'?1:-1);}else if(e.key==='Tab')close();else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){search+=e.key.toLowerCase();clearTimeout(timer);timer=setTimeout(()=>search='',600);const index=Array.from(native.options).findIndex(o=>!disabled(o)&&o.label.toLowerCase().startsWith(search));if(index>=0){if(!opened)open();active=index;paint();}}});
 listen(doc,'pointerdown',e=>{if(!body.contains(e.target))close();});listen(doc,'focusin',e=>{if(!body.contains(e.target))close();});sync();return{trigger,sync,close(){close();clearTimeout(timer);}};
}
return Object.freeze({mount});
});
