/* Playground-only dependencies are injected; none enter the component package. */
(function(root) {
  'use strict';
  function mount({page,component,createSelect,getColourGroups,resolveColour,icon,getItems,getTheme,onChange,onNavigate,storage}) {
    const doc=page.ownerDocument, defaults={...component.defaults,colours:{brand:'var(--text)',parent:'var(--muted)',current:'var(--text)',dot:'var(--muted)',hover:'var(--link)'}};
    let saved={};try{saved=JSON.parse(storage?.getItem('top-schrank-breadcrumb-settings')||'{}')||{}}catch{}
    let settings=component.normalizeAppearance({...defaults,...saved,colours:{...defaults.colours,...saved.colours}}),role='current';
    const controls={},previews=[];
    const el=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node};
    page.replaceChildren();
    const heading=el('div','section-head');heading.append(el('h2','','Breadcrumbs'),el('small','','Application path navigation'));
    page.append(heading,el('p','small','Every segment is clickable. Configure colours, hierarchy, size and hover decoration. The header and these examples use the same independent component.'));
    const editor=el('div','breadcrumb-editor'),left=el('div','breadcrumb-editor-left'),selectors=el('div','breadcrumb-editor-selects'),examples=el('div','breadcrumbs-examples'),right=el('div'),tabs=el('div','breadcrumb-colour-tabs'),colours=el('div','breadcrumb-editor-colours');
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Breadcrumb colour part');
    left.append(selectors,examples);right.append(tabs,colours);editor.append(left,right);page.append(editor);
    const focusLabel=el('label','switch-row breadcrumb-brand-focus'),focusCopy=el('span'),focus=el('input','ui-switch');
    focusCopy.append(el('strong','','Brand focus'),el('small','','Use the theme accent for the current level'));focus.type='checkbox';focus.setAttribute('role','switch');focus.setAttribute('aria-label','Brand focus');focusLabel.append(focusCopy,focus);right.prepend(focusLabel);
    focus.addEventListener('change',()=>{settings.brandFocus=focus.checked;apply()});
    const choices=[
      ['scheme','Level colours',Object.entries(component.colourSchemes)],
      ['weight','Weight scheme',Object.entries(component.weightSchemes).map(([key,value])=>[key,value.name])],
      ['size','Font size',[14,16,18,20,23,26,28].map(value=>[String(value),value+' px'])],
      ['hover','Hover detail',Object.entries(component.hoverDetails)],
      ['longPaths','Long paths',[['collapse','Collapse middle levels'],['full','Show every level']]]
    ];
    choices.forEach(([key,label,options])=>{const field=createSelect({id:'breadcrumb-'+key+'-dropdown',label,options,value:settings[key],onChange:value=>{settings[key]=value;apply()}});selectors.append(field.element);controls[key]=field});
    const tabButtons=[];
    [['brand','Brand'],['parent','Parents'],['current','Current'],['dot','Dots'],['hover','Hover']].forEach(([key,label])=>{
      const button=el('button','',label);button.type='button';button.addEventListener('click',()=>{role=key;renderColours()});tabs.append(button);tabButtons.push([key,button]);
    });
    const parts=['components','forms','playground','specifications','cabinet','width'];
    for(let depth=1;depth<=7;depth++) {
      const sample=el('div','breadcrumbs-example breadcrumbs-deep-example'),nav=el('nav');
      sample.append(el('span','small',depth+' '+(depth===1?'level':'levels')),nav);examples.append(sample);
      previews.push(component.mount(nav,{items:getItems(parts.slice(0,depth-1)),onNavigate}));
    }
    const footer=el('div','breadcrumb-editor-footer'),reset=el('button','tooltip-editor-reset','Reset breadcrumbs'),status=el('span','','Changes apply to the header and previews.');
    reset.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');footer.append(reset,status);editor.append(footer);
    reset.addEventListener('click',()=>{settings=component.normalizeAppearance(defaults);apply()});
    function appearance(){return {...settings,...getTheme(),colours:{...settings.colours}}}
    function renderColours(){
      tabButtons.forEach(([key,button])=>button.setAttribute('aria-pressed',String(key===role)));colours.replaceChildren();
      const groups=[{name:'Theme colours',colours:[['Text','var(--text)'],['Muted','var(--muted)'],['Accent','var(--link)'],['White','var(--white)']]},...getColourGroups()];
      groups.forEach(group=>{
        const section=el('div','tooltip-colour-group');section.append(el('h3','',group.name));
        (group.scales||[{name:group.name,colours:group.colours}]).forEach(scale=>{
          if(group.scales)section.append(el('span','tooltip-grey-label',scale.name));
          const row=el('div','tooltip-compact-swatches');row.setAttribute('role','group');row.setAttribute('aria-label',scale.name);
          scale.colours.forEach(([name,token])=>{
            const button=el('button','tooltip-colour-swatch'),hex=resolveColour(token);button.type='button';button.style.setProperty('--swatch',token);button.dataset.tooltip=name+' · '+hex;button.setAttribute('aria-label',name+' '+hex);button.setAttribute('aria-pressed',String(settings.colours[role]===token));
            const fill=el('i'),check=el('span','tooltip-swatch-check');fill.setAttribute('aria-hidden','true');check.setAttribute('aria-hidden','true');check.innerHTML=icon('check');button.append(fill,check);button.addEventListener('click',()=>{settings.colours[role]=token;apply()});row.append(button);
          });section.append(row);
        });colours.append(section);
      });
    }
    function refresh(){
      Object.entries(controls).forEach(([key,field])=>field.setValue(settings[key]));focus.checked=Boolean(settings.brandFocus);
      const config=appearance();previews.forEach(preview=>preview.update({appearance:config}));onChange(config);renderColours();
    }
    function apply(){refresh();try{storage?.setItem('top-schrank-breadcrumb-settings',JSON.stringify(settings))}catch{}status.textContent='Breadcrumbs updated · saved'}
    refresh();
    return {refresh,destroy(){previews.forEach(preview=>preview.destroy());page.replaceChildren()}};
  }
  root.BreadcrumbPlayground=Object.freeze({mount});
})(globalThis);
