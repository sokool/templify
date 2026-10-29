/* Playground only. Not an exported design-system dependency. */
(function(root){'use strict';const defaults=Object.freeze({size:'small',multiple:true});function mount(host,{component,settings,Field=root.DesignSystemFormField}={}){
 const doc=host.ownerDocument,bar=doc.createElement('div');bar.className='ds-ac-tool';bar.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0 28px';host.append(bar);
 settings?.defaults(defaults);
 const config=settings?.snapshot()||defaults;
 const size=['small','big'].includes(config.size)?config.size:'small',multiple=typeof config.multiple==='boolean'?config.multiple:true;component.update({size,multiple});
 const fields=[['Size','size',size,[['small','Small · compact'],['big','Big · visual catalogue']]],['Selection','multiple',multiple?'multiple':'single',[['single','Single'],['multiple','Multiple · chips']]]].map(([label,key,value,options])=>Field.mount(bar,{kind:'select',label,value,options:options.map(([value,label])=>({value,label})),onChange({value}){const next=key==='multiple'?value==='multiple':value;component.update({[key]:next});settings?.set(key,next);}}));
 return {destroy(){fields.forEach(field=>field.destroy());bar.remove();}};
}root.DesignSystemAutocompleteTool={mount,defaults};})(globalThis);
