/* Palette configurator. Tool controls and chroma.js are excluded from runtime exports. */
(function(global){
'use strict';
function mount(element,{themes,Generator=global.PaletteGenerator,Field=global.DesignSystemFormField,Buttons=global.DesignSystemButtons}={}){
 const doc=element.ownerDocument,registry=global.DesignSystemThemes.registry,controls=[],views=new Map(),colourInputs=new Map(),comparisonControls=[];let sourceField,themeKey='',colourKey='',currentRole='text',state=themes.getState();
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function button(host,label,fn,cls=''){const b=make('button',cls,label);b.type='button';b.addEventListener('click',()=>{try{fn()}catch(error){status.textContent=error.message;}});host.append(b);return b;}
 const intro=make('p','example-lead','Build each theme from Brand, Accent and Greys. Assign palette colours to shared interface roles; every linked component follows automatically.');element.append(intro);
 const bar=make('div','palette-theme-bar');bar.setAttribute('role','group');bar.setAttribute('aria-label','Colour themes');element.append(bar);
 const creator=make('details','palette-create');creator.append(make('summary','','Add a theme'));const creatorFields=make('div','palette-create-fields');creator.append(creatorFields);element.append(creator);
 const name=Field.mount(creatorFields,{label:'Theme name',attrs:{placeholder:'e.g. Ocean',maxlength:80}});controls.push(name);
 const method=Field.mount(creatorFields,{kind:'select',label:'Starting point',value:'copy',options:[{value:'copy',label:'Copy an existing theme'},{value:'generate',label:'Generate from seed colours'}],onChange(){generation.hidden=method.getValue()!=='generate';}});controls.push(method);
 const sourceHost=make('div');creatorFields.append(sourceHost);
 const generation=make('div','palette-generate-fields');generation.hidden=true;creator.append(generation);
 const seed=Field.mount(generation,{label:'Seed colours',attrs:{value:'#22447F',placeholder:'#22447F, #E9CB86'},hint:'One or more HEX colours, separated by commas. Brand keeps your seeds.'});controls.push(seed);
 const accents=Field.mount(generation,{label:'Accent colours',type:'number',attrs:{value:6,min:0,max:128,step:1}}),greys=Field.mount(generation,{label:'Grey shades',type:'number',attrs:{value:10,min:2,max:128,step:1}});controls.push(accents,greys);
 const createActions=make('div','palette-create-actions');creator.append(createActions);
 controls.push(Buttons.mount(createActions,{label:'Add theme',variant:'secondary',onClick(){try{
  const source=sourceField.getValue();let config;
  if(method.getValue()==='generate'){const colours=Generator.generate({seeds:seed.getValue(),accents:accents.getValue(),greys:greys.getValue()}),base=state.themes.find(t=>t.id===source).base;config={colours,assignments:Generator.autoAssign(colours,base,registry)};}
  themes.add(name.getValue(),source,config);name.control.value='';name.setError('');creator.open=false;status.textContent='Theme created and saved.';
 }catch(error){name.setError(error.message);status.textContent=error.message;}}}));
 const guidance=make('p','palette-note','The copied theme determines light or dark behaviour. Generated assignments are a starting point — review contrast and adjust roles below.');creator.append(guidance);
 const workspace=make('div','palette-workspace'),main=make('div','palette-main'),aside=make('section','palette-role-panel');workspace.append(main);element.append(workspace);
 const title=make('h2','palette-section-title'),categories=make('div','palette-categories');main.append(title,categories,aside);
 const contrast=make('section','palette-contrast');contrast.append(make('h2','palette-section-title','Contrast checker'));
 const comparePalette=make('div','palette-compare-selects');contrast.append(comparePalette);
 const contrastFields=make('div','palette-contrast-fields'),sample=make('div','palette-contrast-preview','The quick brown fox · Aa 012'),ratio=make('p','palette-contrast-ratio');ratio.setAttribute('role','status');contrast.append(contrastFields,sample,ratio);main.append(contrast);
 function contrastInput(label,value){const holder=make('label','palette-contrast-input');holder.append(make('span','',label));const picker=make('input');picker.type='color';picker.value=value;picker.setAttribute('aria-label',label+' colour');const hex=make('input');hex.type='text';hex.value=value;hex.maxLength=7;hex.setAttribute('aria-label',label+' HEX');holder.append(picker,hex);contrastFields.append(holder);picker.addEventListener('input',()=>{clearComparison(label);hex.value=picker.value;paintContrast();});hex.addEventListener('input',()=>{if(/^#[a-f0-9]{6}$/i.test(hex.value)){clearComparison(label);picker.value=hex.value;hex.removeAttribute('aria-invalid');paintContrast();}else hex.setAttribute('aria-invalid','true');});return {picker,hex,bound:null};}
 const foreground=contrastInput('Foreground','#1B2D50'),background=contrastInput('Background','#FFFFFF');
 function clearComparison(label){const pair=label==='Foreground'?foreground:background;pair.bound=null;const index=label==='Foreground'?0:1;if(comparisonControls[index]){comparisonControls[index].control.value='';comparisonControls[index].sync();}}
 function buildComparison(){comparisonControls.splice(0).forEach(c=>c.destroy());for(const [label,pair] of [['Foreground',foreground],['Background',background]]){
  const options=[{value:'',label:'Custom colour'},...Object.entries(state.colours[state.theme]).map(([category,items])=>({label:category,options:items.map(item=>({label:item.label,value:category+':'+item.id}))}))];
  comparisonControls.push(Field.mount(comparePalette,{kind:'select',label:label+' from palette',value:pair.bound||'',options,onChange({value}){pair.bound=value||null;paintComparison();}}));
 }}
 function paintComparison(){for(const pair of [foreground,background]){if(!pair.bound)continue;const [category,id]=pair.bound.split(':'),item=state.colours[state.theme][category]?.find(c=>c.id===id);if(item)pair.picker.value=pair.hex.value=item.value;else pair.bound=null;}paintContrast();}
 function paintContrast(){const fg=foreground.picker.value,bg=background.picker.value,result=Generator.contrast(fg,bg);sample.style.color=fg;sample.style.background=bg;ratio.textContent=result.ratio.toFixed(2)+':1 · AA text '+(result.aa?'✓':'✗')+' · AAA text '+(result.aaa?'✓':'✗')+' · Large text / UI '+(result.large?'✓':'✗');ratio.dataset.pass=String(result.aa);}
 button(contrast,'Use current Text / Panel',()=>{clearComparison('Foreground');clearComparison('Background');foreground.picker.value=foreground.hex.value=state.palettes[state.theme].text;background.picker.value=background.hex.value=state.palettes[state.theme].panel;paintContrast();},'palette-text-action');
 contrast.append(make('p','palette-note','WCAG contrast: 4.5:1 normal text, 7:1 AAA text, 3:1 large text and non-text UI. This checks the selected pair, not the entire interface.'));paintContrast();
 const roleHeading=make('div','palette-role-heading');roleHeading.append(make('h2','palette-section-title','Applications'));aside.append(roleHeading);
 button(roleHeading,'Auto assign',()=>{const theme=state.themes.find(t=>t.id===state.theme);themes.assignMany(theme.id,Generator.autoAssign(state.colours[theme.id],theme.base,registry));status.textContent='Interface roles assigned from the current palette. Review the colour pairs.';},'palette-text-action');
 aside.append(make('p','palette-note','Click an application to choose from Brand, Accent and Greys, or set a custom colour.'));
 const roleList=make('div','palette-role-list');roleList.setAttribute('role','group');roleList.setAttribute('aria-label','Colour applications');aside.append(roleList);
 for(const role of registry){const b=button(roleList,'',()=>openRole(role),'palette-role');b.setAttribute('aria-label','Assign '+role.label);b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');
  const swatch=make('i'),text=make('span','palette-role-copy'),label=make('strong','',(role.section||role.owners.join(', '))+' · '+role.label),description=make('small','',role.description||'Colour used by '+role.owners.join(', ')),value=make('code','palette-role-value');text.append(label,description,value);b.append(swatch,text);views.set(role.id,{button:b,swatch,value});
 }
 const assignment=make('section','palette-assignment'),assignmentNote=make('p','palette-note'),choices=make('div','palette-colour-choices');assignment.append(assignmentNote,choices);
 const custom=make('div','palette-custom');const customLabel=make('label');customLabel.append(make('span','','Custom colour'));const customPicker=make('input');customPicker.type='color';customPicker.setAttribute('aria-label','Custom application colour');customPicker.addEventListener('input',()=>themes.setColour(state.theme,currentRole,customPicker.value));customLabel.append(customPicker);custom.append(customLabel);assignment.append(custom);
 const customHex=Field.mount(custom,{label:'Custom HEX',attrs:{placeholder:'#123456',maxlength:7},onChange({value}){customHex.setError(themes.setColour(state.theme,currentRole,value)?'':'Enter a six-digit HEX colour.');}});controls.push(customHex);
 const pickerWindow=global.DesignSystemWindow.mount(element,{title:'Choose colour',content:assignment,width:560,onOpen:()=>paintRoles(),onClose:()=>paintRoles()});controls.push(pickerWindow);pickerWindow.element.classList.add('palette-picker-window');
 function openRole(role){currentRole=role.id;customHex.setError('');pickerWindow.update({title:(role.section||role.owners.join(', '))+' · '+role.label});paintRoles();pickerWindow.open();}
 const themeActions=make('div','palette-editor-actions');main.append(themeActions);button(themeActions,'Reset this theme',()=>themes.reset(state.theme),'palette-text-action');
 const status=make('p','example-status');status.setAttribute('role','status');element.append(status);
 const inspector=make('details','example-palette-references');inspector.append(make('summary','','DTCG token document'));const tokenPreview=make('pre','example-palette-json');inspector.append(tokenPreview);element.append(inspector);
 function paintRoles(){
  const id=state.theme,palette=state.palettes[id],active=registry.find(role=>role.id===currentRole),ref=state.assignments[id][currentRole];
  for(const [key,view] of views){view.button.setAttribute('aria-expanded',String(currentRole===key&&pickerWindow.isOpen()));view.swatch.style.background=palette[key];view.value.textContent=palette[key];}
  const item=ref&&state.colours[id][ref.category].find(c=>c.id===ref.id);assignmentNote.textContent=item?ref.category+' · '+item.label+' · '+item.value:'Custom value · '+palette[currentRole];customPicker.value=palette[currentRole];if(doc.activeElement!==customHex.control)customHex.control.value=palette[currentRole];
  choices.replaceChildren();for(const [category,items] of Object.entries(state.colours[id])){const section=make('section');section.append(make('h4','',category[0].toUpperCase()+category.slice(1)));const row=make('div','palette-choice-row');for(const colour of items){const b=button(row,'',()=>{themes.assign(id,currentRole,category,colour.id);pickerWindow.close('selection');},'palette-choice');b.style.background=colour.value;b.setAttribute('aria-label','Assign '+active.label+' to '+category+' '+colour.label);b.setAttribute('aria-pressed',String(ref?.category===category&&ref?.id===colour.id));if(ref?.category===category&&ref?.id===colour.id)b.append(make('span','','✓'));}if(!items.length)row.append(make('span','palette-note','No colours yet'));section.append(row);choices.append(section);}
 }
 function paintCategories(){categories.replaceChildren();colourInputs.clear();const id=state.theme;
  for(const [category,items] of Object.entries(state.colours[id])){const section=make('section','palette-category'),heading=make('div','palette-category-heading');heading.append(make('h3','',category[0].toUpperCase()+category.slice(1)),make('span','palette-count',String(items.length)));section.append(heading);
   for(const item of items){const row=make('div','palette-colour-row'),picker=make('input'),hex=make('input'),name=make('span','palette-colour-name',item.label);picker.type='color';picker.setAttribute('aria-label',category+' '+item.label+' colour');hex.type='text';hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label',category+' '+item.label+' HEX');
    picker.addEventListener('input',()=>themes.updateColour(id,category,item.id,picker.value));hex.addEventListener('input',()=>hex.setAttribute('aria-invalid',String(!themes.updateColour(id,category,item.id,hex.value))));hex.addEventListener('blur',()=>{hex.value=state.colours[id][category].find(c=>c.id===item.id)?.value||'';hex.removeAttribute('aria-invalid');});
    row.append(picker,name,hex);const remove=button(row,'×',()=>themes.removeColour(id,category,item.id),'palette-colour-remove');remove.setAttribute('aria-label','Remove '+category+' '+item.label);section.append(row);colourInputs.set(category+':'+item.id,{picker,hex});
   }
   button(section,'+ Add colour',()=>themes.addColour(id,category,state.palettes[id].accent,category[0].toUpperCase()+category.slice(1)+' '+(items.length+1)),'palette-text-action');categories.append(section);
  }
 }
 function update(next){state=next;const nextKey=state.themes.map(t=>t.id+':'+t.label).join('|');if(nextKey!==themeKey){
   const source=sourceField?.getValue()||state.theme;sourceField?.destroy();sourceField=Field.mount(sourceHost,{kind:'select',label:'Copy / base theme',value:state.palettes[source]?source:state.theme,options:state.themes.map(t=>({value:t.id,label:t.label}))});
   bar.replaceChildren();for(const theme of state.themes){const card=make('div','palette-theme');card.dataset.themeId=theme.id;const b=button(card,theme.label,()=>themes.select(theme.id),'palette-theme-select');b.setAttribute('aria-label','Use '+theme.id+' theme');const dots=make('span','palette-theme-dots');for(const role of ['accent','page','text','selection']){const dot=make('i');dot.dataset.previewRole=role;dots.append(dot);}b.append(dots);const remove=button(card,'×',()=>themes.remove(theme.id),'palette-theme-remove');remove.setAttribute('aria-label','Remove '+theme.label+' theme');remove.disabled=state.themes.length===1;bar.append(card);}themeKey=nextKey;
  }
  for(const card of bar.children){const id=card.dataset.themeId;card.querySelector('.palette-theme-select').setAttribute('aria-pressed',String(id===state.theme));card.dataset.active=String(id===state.theme);card.querySelectorAll('i').forEach(dot=>dot.style.background=state.palettes[id][dot.dataset.previewRole]);}
  const current=state.themes.find(t=>t.id===state.theme);title.textContent=current.label+' · colour categories';
  if(pickerWindow.isOpen()&&colourKey&&!colourKey.startsWith(state.theme+'['))pickerWindow.close('theme-change',{immediate:true});
  const nextColours=state.theme+JSON.stringify(Object.entries(state.colours[state.theme]).map(([key,items])=>[key,items.map(i=>[i.id,i.label])]));if(nextColours!==colourKey){foreground.bound=null;background.bound=null;paintCategories();buildComparison();colourKey=nextColours;}
  for(const [category,items] of Object.entries(state.colours[state.theme]))for(const item of items){const view=colourInputs.get(category+':'+item.id);view.picker.value=item.value;if(doc.activeElement!==view.hex)view.hex.value=item.value;}
  paintRoles();paintComparison();tokenPreview.textContent=themes.exportTokens();status.textContent='Active theme: '+current.label+' · '+state.themes.length+' themes · saved automatically';
 }
 update(state);const off=themes.subscribe(update);
 return {destroy(){off();comparisonControls.forEach(c=>c.destroy());sourceField?.destroy();controls.forEach(control=>control.destroy());element.replaceChildren();}};
}
global.PaletteTool={mount};
})(globalThis);
