const {test}=require('node:test'),assert=require('node:assert/strict');
const {Document}=require('./dom-fixture.cjs'),Settings=require('../storage/settings.js'),Button=require('../components/buttons/buttons.js'),Tool=require('../components/buttons/tool.js');
test('button editor preserves a primary, saves independent variants and resets overrides to theme inheritance',()=>{
 global.DesignSystemThemes={tokens:{accent:'--ds-colour-accent',page:'--ds-colour-page',border:'--ds-colour-border',muted:'--ds-colour-muted'}};
 const settings=Settings.create().scope('components.buttons'),doc=new Document(),host=doc.createElement('div');let pickers=[];
 const Picker={valid:value=>Boolean(value),mount(holder,options){pickers.push(options);let selected=options.value;return {getCSS:()=>selected.value||'var(--ds-colour-'+selected.role+')',destroy(){}};}};
 const Field={mount(){return {destroy(){}};}};
 const editor=Tool.mount(host,{settings,Picker,Field,Button});
 assert.equal(settings.get('items').length,1);assert.equal(settings.get('items')[0].style,'primary');assert.deepEqual(settings.get('items')[0].appearance,{});
 host.querySelectorAll('button').find(n=>n.textContent==='Add button').emit('click');assert.equal(settings.get('items').length,2);
 const last=pickers.slice(-8);last[4].onChange({kind:'custom',value:'#123456'});
 assert.equal(settings.get('items')[1].colours.fill.value,'#123456');assert.equal(settings.get('items')[0].colours.fill,undefined);
 host.querySelectorAll('button').filter(n=>n.textContent==='Inherit palette')[1].emit('click');assert.deepEqual(settings.get('items')[1].appearance,{});
 host.querySelectorAll('button').find(n=>n.textContent==='Remove').emit('click');assert.equal(settings.get('items').length,1);assert(!host.querySelectorAll('button').some(n=>n.textContent==='Remove'));
 editor.destroy();assert.equal(host.children.length,0);delete global.DesignSystemThemes;
});
