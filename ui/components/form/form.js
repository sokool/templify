/* Form composition and lifecycle. The host owns submission, data, storage and tools. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./field.js'):root.DesignSystemFormField);if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemForm=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Field){
'use strict';let serial=0;
function mount(host,options={}){
 const doc=host.ownerDocument,form=doc.createElement('form'),fields=[],byName=new Map(),listeners=[];form.className='ds-component ds-form';form.id=options.id||'ds-form-'+(++serial);form.noValidate=true;if(options.label)form.setAttribute('aria-label',options.label);host.append(form);
 const listen=(node,type,callback)=>{node.addEventListener(type,callback);listeners.push(()=>node.removeEventListener(type,callback));};let submitted=false,imageClick=null;
 function addField(parent,config){const field=Field.mount(parent,config);fields.push(field);if(config.name)byName.set(config.name,field);return field;}
 (options.sections||[{fields:options.fields||[]}]).forEach(section=>{const container=doc.createElement('section');container.className='ds-form-section';if(section.label){const h=doc.createElement('h3');h.textContent=section.label;container.append(h);}if(section.description){const p=doc.createElement('p');p.className='ds-form-description';p.textContent=section.description;container.append(p);}const grid=doc.createElement('div');grid.className='ds-form-grid';container.append(grid);form.append(container);(section.fields||[]).forEach(config=>{const field=addField(grid,config);if(config.fullWidth)field.element.classList.add('ds-field-full');});});
 const footer=doc.createElement('div');footer.className='ds-form-footer';form.append(footer);
 const status=doc.createElement('p');status.className='ds-form-status';status.setAttribute('role','status');form.append(status);
 function validate(focus=false){submitted=true;let first=null;fields.forEach(field=>{if(!field.validate()&&!first)first=field;});if(first&&focus)first.focus();status.textContent=first?'Review the highlighted fields.':'';return !first;}
 function data(submitter){const FormDataClass=doc.defaultView.FormData;const result=submitter?new FormDataClass(form,submitter):new FormDataClass(form);if(submitter?.type==='image'&&imageClick?.target===submitter){const prefix=submitter.name?submitter.name+'.':'';result.set(prefix+'x',String(imageClick.x));result.set(prefix+'y',String(imageClick.y));}return result;}
 listen(form,'click',event=>{if(event.target.type==='image'){const rect=event.target.getBoundingClientRect();imageClick={target:event.target,x:Math.max(0,Math.round(event.clientX-rect.left)),y:Math.max(0,Math.round(event.clientY-rect.top))};}});
 listen(form,'submit',event=>{event.preventDefault();const valid=event.submitter?.formNoValidate||validate(true);if(!valid){options.onInvalid?.({form,fields});return;}const values=data(event.submitter);status.textContent='Form is valid.';options.onSubmit?.({form,data:values,submitter:event.submitter,event});imageClick=null;});
 listen(form,'reset',()=>{queueMicrotask(()=>{submitted=false;imageClick=null;fields.forEach(field=>field.reset());status.textContent='Form reset.';options.onReset?.({form});});});
 function change(event){if(submitted){fields.forEach(field=>{if(field.controls.includes(event.target))field.validate();});}options.onChange?.({form,event});}
 listen(form,'input',change);listen(form,'change',change);
 return {element:form,fields,footer,status,getField:name=>byName.get(name),validate,formData:data,reset:()=>form.reset(),attachField(field){if(!fields.includes(field))fields.push(field);if(field.control?.name)byName.set(field.control.name,field);return field;},addField(config,parent=footer){return addField(parent,config);},previewErrors(enabled){fields.forEach(field=>{if(!['hidden','submit','reset','button','image'].includes(field.control?.type))field.previewError(enabled);});},destroy(){listeners.forEach(off=>off());fields.forEach(field=>field.destroy());form.remove();}};
}
return Object.freeze({mount,field:Field.mount});
});
