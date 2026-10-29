/* Integration and catalogue only: no field markup, style or validation copied here. */
(function(root){'use strict';
function mount(host,{document:doc=host.ownerDocument}={}){
 const controllers=[],allFields=[];const node=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const intro=node('p','example-lead','Native form semantics, shared field styles and label-message validation. Explore each type, then try them together in the playground.');host.append(intro);
 const wrapper=node('div','example-form'),jump=node('nav','form-example-jump');jump.setAttribute('aria-label','Form subsections');wrapper.append(jump);host.append(wrapper);
 const tools=node('div','form-example-tools');wrapper.append(tools);controllers.push(FormTool.mount(tools,{getFields:()=>allFields}));
 const idPrefix='form-example-';
 for(const group of ExampleFormData.groups){const link=node('a','',group.label);link.href='#'+idPrefix+group.id;jump.append(link);
  const section=node('section','form-example-section');section.id=idPrefix+group.id;section.append(node('h2','',group.label),node('p','form-example-description',group.description));wrapper.append(section);
  const form=DesignSystemForm.mount(section,{label:group.label,sections:[{fields:group.fields}],onSubmit(){}});controllers.push(form);allFields.push(...form.fields);
 }
 const actions=node('section','form-example-section');actions.id=idPrefix+'actions';actions.append(node('h2','','Submission & actions'),node('p','form-example-description','Submit sends field values and the chosen submitter’s name / value. Reset restores defaults. An action menu runs commands; it does not select a field value.'));wrapper.append(actions);
 const actionLink=node('a','','Submission & actions');actionLink.href='#'+actions.id;jump.append(actionLink);
 const playground=node('section','form-example-section form-example-playground');playground.id=idPrefix+'playground';playground.append(node('h2','','Form playground'),node('p','form-example-description','All controls together. Validate the form or inspect its current FormData without sending it. Errors appear beside the label. No data leaves this page.'));wrapper.append(playground);
 const playLink=node('a','','Playground');playLink.href='#'+playground.id;jump.append(playLink);
 const output=node('pre','form-example-data','No submission yet. Inspect values to see what the browser includes.');output.setAttribute('role','status');
 function inspect(data){const entries=Array.from(data,([name,value])=>[name,typeof value==='string'?value:{file:value.name||'(no file)',size:value.size,type:value.type}]);output.textContent=JSON.stringify(entries,null,2);}
 let main;
 function actionFields(prefix){return [
  {name:'action',label:'Button · submit',kind:'button',type:'submit',text:'Validate form',attrs:{value:'validate'}},
  {name:'input_action',label:'Input · submit',type:'submit',attrs:{value:'Submit with input'}},
  {name:'map_point',label:'Image · submit',type:'image',attrs:{src:'../icons/assets/svg/file-plus.svg',alt:'Submit image coordinates'},hint:'Submitter includes map_point.x and map_point.y.'},
  {label:'Button · reset',kind:'button',type:'reset',text:'Reset form'},
  {label:'Input · reset',type:'reset',attrs:{value:'Reset with input'}},
  {label:'Button · action',kind:'button',type:'button',text:'Inspect values'},
  {label:'Input · action',type:'button',attrs:{value:'Inspect with input'}},
  {kind:'actions',label:'Form actions',name:'commands',options:[{label:'Preview values',value:'preview'},{label:'Reset form',value:'reset'}],onAction(item){if(prefix==='playground'){if(item.value==='reset')main.reset();else inspect(main.formData());}else actionStatus.textContent='Action: '+item.label+' · no field value selected.';}}
 ];}
 const actionStatus=node('p','form-example-description');actions.append(actionStatus);
 const actionForm=DesignSystemForm.mount(actions,{label:'Submit and action types',fields:actionFields('catalogue'),onSubmit({data}){inspect(data);actionStatus.textContent='Submitted locally. See data below the playground.';}});controllers.push(actionForm);allFields.push(...actionForm.fields);
 main=DesignSystemForm.mount(playground,{id:'ds-form-playground',label:'Form playground',sections:[...ExampleFormData.groups.filter(g=>g.id!=='states').map(g=>({label:g.label,fields:g.fields})),{label:'Submission & actions',fields:actionFields('playground')},{label:'Read-only & disabled',fields:ExampleFormData.groups.find(g=>g.id==='states').fields}],onSubmit({data,submitter}){inspect(data);main.status.textContent='Valid · '+(submitter?.value||'submitted')+' · no data sent.';},onReset(){output.textContent='Reset to initial values. No data sent.';}});controllers.push(main);allFields.push(...main.fields);
 for(const form of [main,actionForm]){for(const field of form.fields){if(field.control?.type==='button'){const cb=()=>inspect(form.formData());field.control.addEventListener('click',cb);controllers.push({destroy:()=>field.control.removeEventListener('click',cb)});}}}
 const external=node('div','form-example-associated');playground.append(external);external.append(node('p','form-example-description','This field sits outside the <form>. Its form attribute associates it with the playground.'));
 const externalField=DesignSystemFormField.mount(external,{name:'external_reference',label:'External reference',attrs:{form:main.element.id,value:'EXT-001'}});main.attachField(externalField);allFields.push(externalField);playground.append(output);
 // Section links are local catalogue anchors; they do not change the workspace route.
 const onJump=event=>{const link=event.target.closest('a');if(!link)return;event.preventDefault();doc.getElementById(link.getAttribute('href').slice(1))?.scrollIntoView({behavior:'smooth',block:'start'});};jump.addEventListener('click',onJump);
 return{destroy(){jump.removeEventListener('click',onJump);controllers.reverse().forEach(c=>c.destroy());wrapper.remove();intro.remove();}};
}
root.ExampleForm={mount};
})(globalThis);
