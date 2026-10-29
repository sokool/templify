/* Development tool only: excluded from Window runtime and export. */
(function(root){'use strict';const defaults=Object.freeze({mode:'modal',side:'right',width:480,duration:220,closeOnEscape:true,closeOnBackdrop:true,showClose:true,lockScroll:true});function mount(host,{component,settings,Field=root.DesignSystemFormField}={}){
 const doc=host.ownerDocument,bar=doc.createElement('div');bar.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:18px;margin:24px 0';host.append(bar);
 settings?.defaults(defaults);
 const saved=settings?.snapshot()||{},config={...defaults};for(const key of Object.keys(defaults)){if(typeof saved[key]===typeof defaults[key])config[key]=saved[key];}component.update(config);
 const select=(label,key,value,options)=>Field.mount(bar,{kind:'select',label,value:String(config[key]),options:options.map(([value,label])=>({value,label})),onChange({value}){const next=key==='width'||key==='duration'?Number(value):value;component.update({[key]:next});settings?.set(key,next);}});
 const fields=[select('Window mode','mode','modal',[['modal','Modal · popup'],['side','Side panel']]),select('Panel side','side','right',[['right','Right'],['left','Left']]),select('Width','width','480',[['320','Small · 320 px'],['480','Regular · 480 px'],['720','Wide · 720 px'],['960','Large · 960 px']]),select('Animation','duration','220',[['0','None'],['220','Quick · 220 ms'],['450','Smooth · 450 ms'],['700','Slow · 700 ms']])];
 for(const [label,key] of [['Escape closes','closeOnEscape'],['Backdrop click closes','closeOnBackdrop'],['Show close button','showClose'],['Lock page scroll','lockScroll']])fields.push(Field.mount(bar,{type:'checkbox',switch:true,label,text:label,attrs:{checked:config[key]},onChange({value}){component.update({[key]:value});settings?.set(key,value);}}));
 return {destroy(){fields.forEach(f=>f.destroy());bar.remove();}};
}root.DesignSystemWindowTool={mount,defaults};})(globalThis);
