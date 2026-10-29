/* Composition examples only. Runtime components receive data and callbacks. */
(function(global){
 function create({document,storage,icons,tooltip,themes,settings}={}){
  const surfaceTool=SurfaceTool.create({document,storage}),tooltipTool=TooltipTool.create({document,storage});
  const node=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n};
  function button(host,label,onClick,options={}){return DesignSystemButtons.mount(host,{label,onClick,...options})}
  function mount(page,id){const views=[];const add=view=>(views.push(view),view);const section=(title,host=page)=>{const s=node('section','example-component-section');if(title)s.append(node('h2','',title));host.append(s);return s};
   if(id==='accordion'){
    page.append(node('p','example-lead','Expandable sections for related information. Multiple sections can remain open.'));
    add(DesignSystemAccordion.mount(section('Project information'),{items:[{id:'measurement',label:'How should I prepare for measurement?',content:'Prepare the alcove dimensions and mark the power sockets.',open:true},{id:'documentation',label:'What does the documentation include?',content:'Drawings, materials, dimensions and customer requirements.'}]}));
    add(DesignSystemAccordion.mount(section('One section at a time'),{multiple:false,items:[{id:'materials',label:'Materials',content:'Oak, lacquered fronts and steel fittings.',open:true},{id:'installation',label:'Installation',content:'Confirm access and the installation date.'}]}));
   }
   if(id==='notifications'){
    page.append(node('p','example-lead','Messages explain what happened and suggest the next step. Inline notices and transient notifications share the same component.'));
    const grid=node('div','example-grid');page.append(grid);
    const samples=[['info','Measurement has been scheduled','Check the address and prepare documentation before your visit.'],['success','Changes saved','The example project is ready for the next step.'],['warning','Documentation missing','Add a drawing before handing over the project.'],['error','Could not save','Check your connection and try again.']];
    const toaster=add(DesignSystemNotifications.createToaster({document}));samples.forEach(([kind,title,message])=>{const s=section(kind[0].toUpperCase()+kind.slice(1),grid),host=node('div');s.append(host);add(DesignSystemNotifications.mount(host,{kind,title,message,action:kind==='info'?{label:'View appointment →',onClick:()=>toaster.show({kind:'info',title:'Appointment preview opened'})}:null}));const actions=node('div','example-actions');s.append(actions);add(button(actions,'Show notification',()=>toaster.show({kind,title,message}),{variant:'secondary'}))});
   }
   if(id==='user-identity'){
    page.append(node('p','example-lead','Avatar, name and description for a customer, owner, assignee or team member. Images fall back to initials.'));
    [{name:'Piotr Zieliński',description:'Owner: Anna Kowalska'},{name:'Anna Kowalska',description:'Project owner'},{name:'Workshop team',initials:'WT',description:'Production and installation'}].forEach(person=>add(DesignSystemUserIdentity.mount(section(''),person)));
   }
   if(id==='surface'){
    page.append(node('p','example-lead','An optional content container. Configure its colours, corners, border, padding and shadow. The editor is not part of the component.'));
    const host=node('div');page.append(host);add(surfaceTool.mount(host,{preview(stage){const sample=node('article');sample.append(node('h3','','Content surface'),node('p','','A reusable container for information, actions and forms.'));stage.append(sample);const view=DesignSystemSurface.mount(sample);return ()=>view.destroy()}}));
    const inside=section('Composition with User identity and Buttons'),surface=node('div');inside.append(surface);add(DesignSystemSurface.mount(surface));const identity=node('div');surface.append(identity);add(DesignSystemUserIdentity.mount(identity,{name:'Piotr Zieliński',description:'Owner: Anna Kowalska'}));const action=node('div','example-actions');surface.append(action);add(button(action,'Open project',()=>tooltip.hide()));
    const pairings=section('Colour combinations');pairings.append(node('p','example-status','All six accents on base navy and brand blue. These surfaces inherit the configured shape, padding, border and shadow.'));const pairs=node('div','example-surface-pairings');pairings.append(pairs);for(let i=1;i<=6;i++)for(const [label,bg] of [['navy','#1B2D50'],['blue','#22447F']]){const sample=node('article');sample.append(node('span','','Accent '+i+' on '+label),node('small','','Colour pairing'));pairs.append(sample);add(DesignSystemSurface.mount(sample,{bg,text:'var(--ds-accent-'+i+')'}))}
   }
   if(id==='tooltip'){
    page.append(node('p','example-lead','Side accent and a fine outline. Configure appearance below; the component owns only tooltip behaviour and rendering.'));
    const host=node('div');page.append(host);add(tooltipTool.mount(host,{preview(stage){stage.classList.add('example-tooltip-stage');const preview=node('span','ds-component ds-tooltip ds-tooltip--preview','Add a new order');preview.setAttribute('role','tooltip');preview.id='example-tooltip-static-preview';const trigger=node('button','example-tooltip-sample');trigger.type='button';trigger.setAttribute('aria-label','Tooltip preview');trigger.setAttribute('aria-describedby',preview.id);trigger.innerHTML=icons.svg('file-plus');stage.append(preview,trigger);return()=>{}}}));
    const samples=section('Hover or focus'),row=node('div','example-actions');samples.append(row);for(const [name,label] of [['file-plus','Add a new order'],['save','Save changes'],['trash-2','Delete project']]){const b=node('button','example-tooltip-sample');b.type='button';b.setAttribute('aria-label',label);b.dataset.tooltip=label;b.innerHTML=icons.svg(name);row.append(b)}
   }
   if(id==='buttons'){
    page.append(node('p','example-lead','Create button variants. Each button inherits the theme until you override its colours or style.'));
    const editor=node('div');page.append(editor);add(DesignSystemButtonsTool.mount(editor,{themes,settings:settings?.scope('components.buttons')}));
   }
   if(id==='badges'){
    page.append(node('p','example-lead','Curved line badges fit their text. Their lower border adds a quiet accent.'));const row=node('div','example-actions');page.append(row);for(let i=1;i<=6;i++)add(DesignSystemBadges.mount(row,{label:'Accent '+i,fill:'var(--ds-accent-'+i+')',ink:'#1B2D50'}));
    const examples=section('Labels and highlights'),labels=node('div','example-actions');examples.append(labels);[['Featured','var(--ds-accent-2)','#1B2D50'],['VIP','#1B2D50','var(--ds-accent-2)'],['Made to measure','var(--ds-colour-divider)','var(--ds-colour-text)']].forEach(([label,fill,ink])=>add(DesignSystemBadges.mount(labels,{label,fill,ink})))
   }
   return {destroy(){tooltip.hide(true);views.reverse().forEach(view=>view.destroy())}};
  }
  return {mount};
 }
 global.ExampleComponents={create};
})(globalThis);
