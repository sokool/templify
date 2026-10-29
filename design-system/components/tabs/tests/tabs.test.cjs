const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Document}=require('../../../testing/dom-fixture.cjs');
const tabs=require('../tabs.js');
const items=[{id:'materials',label:'Materials',content:'Material content'},{id:'details',label:'Details',content:'Detail content'},{id:'service',label:'Service',content:'Service content'}];
function setup(options={}){const doc=new Document(),host=doc.createElement('div');doc.append(host);return {doc,host,control:tabs.mount(host,{items,...options})}}
function press(host,button,key){let prevented=false;host.emit('keydown',{target:button,key,preventDefault(){prevented=true}});return prevented}
const buttons=host=>host.querySelectorAll('[role=tab]');
const panels=host=>host.querySelectorAll('[role=tabpanel]');

test('renders semantic links between tabs/panels, with one selected panel and focus stop',()=>{
 const {host,control}=setup();assert.equal(control.value,'materials');assert.equal(host.querySelectorAll('[role=tablist]').length,1);
 assert.equal(buttons(host).filter(button=>button.tabIndex===0).length,1);assert.equal(panels(host).filter(panel=>!panel.hidden).length,1);
 buttons(host).forEach((button,index)=>{assert.equal(button.getAttribute('aria-controls'),panels(host)[index].id);assert.equal(panels(host)[index].getAttribute('aria-labelledby'),button.id)});
});
test('click changes only its instance; IDs are unique across repeated mounts',()=>{
 const changes=[],a=setup({onChange:value=>changes.push(value)}),b=setup();
 a.host.emit('click',{target:buttons(a.host)[1]});assert.equal(a.control.value,'details');assert.equal(b.control.value,'materials');assert.deepEqual(changes,['details']);
 assert.notEqual(buttons(a.host)[0].id,buttons(b.host)[0].id);
});
test('automatic keyboard selection wraps and skips disabled tabs',()=>{
 const {host,control,doc}=setup({items:[items[0],{...items[1],disabled:true},items[2]]});
 press(host,buttons(host)[0],'ArrowRight');assert.equal(control.value,'service');assert.equal(doc.activeElement,buttons(host)[2]);
 press(host,buttons(host)[2],'ArrowRight');assert.equal(control.value,'materials');
 press(host,buttons(host)[0],'ArrowLeft');assert.equal(control.value,'service');
 press(host,buttons(host)[2],'Home');assert.equal(control.value,'materials');
 press(host,buttons(host)[0],'End');assert.equal(control.value,'service');
 assert.equal(control.select('details'),false);assert.equal(control.value,'service');
});
test('manual mode moves focus with arrows and selects using Enter or Space',()=>{
 const {host,control,doc}=setup({activation:'manual'});press(host,buttons(host)[0],'ArrowRight');
 assert.equal(control.value,'materials');assert.equal(doc.activeElement,buttons(host)[1]);press(host,buttons(host)[1],'Enter');assert.equal(control.value,'details');
 press(host,buttons(host)[1],'End');assert.equal(control.value,'details');press(host,buttons(host)[2],' ');assert.equal(control.value,'service');
});
test('update retains selection or falls back when the selected item is removed',()=>{
 const {host,control}=setup({value:'details'});control.update({label:'New label'});assert.equal(control.value,'details');
 control.update({items:[items[0],items[2]]});assert.equal(control.value,'materials');
 control.update({value:'service'});assert.equal(control.value,'service');assert.equal(panels(host)[1].hidden,false);
 control.update({items:[]});assert.equal(control.value,null);assert.equal(buttons(host).length,0);
});
test('real content nodes are moved and reused, not cloned; labels are plain text',()=>{
 const doc=new Document(),host=doc.createElement('div'),content=doc.createElement('input');content.value='Preserve me';
 const control=tabs.mount(host,{items:[{id:'a',label:'<img src=x>',content}]});assert.equal(panels(host)[0].children[0],content);
 control.update({label:'Updated'});assert.equal(panels(host)[0].children[0],content);assert.equal(content.value,'Preserve me');assert.equal(buttons(host)[0].textContent,'<img src=x>');assert.equal(host.querySelector('img'),null);
});
test('all-disabled state and destruction are safe; duplicate IDs are rejected',()=>{
 const {host,control}=setup({items:items.map(item=>({...item,disabled:true}))});assert.equal(control.value,null);assert.equal(panels(host).filter(panel=>!panel.hidden).length,0);
 control.destroy();assert.equal(host.children.length,0);assert.equal(host.listeners.get('keydown').size,0);assert.throws(()=>control.update({}),/destroyed/);
 assert.throws(()=>setup({items:[items[0],items[0]]}),/Duplicate tab id/);
});
test('playground supplies data to the extracted component and does not duplicate its logic',()=>{
 const root=path.resolve(__dirname,'../../../..'),html=readFileSync(path.join(root,'top-schrank-ui.html'),'utf8'),source=readFileSync(path.join(root,'playground/tabs/example.js'),'utf8');
 const scope={};vm.runInNewContext(source,{globalThis:scope});const doc=new Document(),host=doc.createElement('div');scope.TabsPlayground.mount(host,tabs);
 assert.equal(buttons(host).length,3);assert.equal(buttons(host)[0].textContent,'Materials');
 assert(html.includes('TabsPlayground.mount'));assert(!html.includes('function activateTab('));assert(!html.includes('class="tab"'));assert(!/\.tabs\{|\.tab\[/.test(html));
 const css=readFileSync(path.join(__dirname,'../tabs.css'),'utf8');assert(!/--(?:link|muted|ice)|menu-live|workspace/.test(css));assert(!css.includes(':focus-visible'));assert(css.includes('--ds-colour-accent'));
});
