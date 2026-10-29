const {test}=require('node:test'),assert=require('node:assert/strict');
const Progress=require('../components/progress/progress.js'),Picker=require('../palette/picker.js'),Themes=require('../foundations/themes.js'),{Document}=require('./dom-fixture.cjs');
test('Progress accepts generic CSS colour overrides, keeps them on value updates and restores host styles',()=>{
 const doc=new Document(),host=doc.createElement('div');host.style.setProperty('--ds-progress-fill','#ABCDEF');const view=Progress.mount(host,{value:60,appearance:{fill:'#123456',border:'var(--ds-colour-border)',shadow:'#2468AC'}});
 assert.equal(host.style.getPropertyValue('--ds-progress-fill'),'#123456');assert.equal(host.style.getPropertyValue('--ds-progress-shadow'),'#2468AC');view.update({value:80});assert.equal(host.style.getPropertyValue('--ds-progress-fill'),'#123456');view.update({appearance:{border:'#FF0000'}});assert.equal(host.style.getPropertyValue('--ds-progress-border'),'#FF0000');assert.equal(host.style.getPropertyValue('--ds-progress-shadow'),'#2468AC');view.destroy();assert.equal(host.style.getPropertyValue('--ds-progress-fill'),'#ABCDEF');assert.equal(host.style.getPropertyValue('--ds-progress-shadow'),'');
});
test('shared picker resolves active-theme palette refs with safe fallback and validates saved values',()=>{
 const doc=new Document(),themes=Themes.create({target:doc.createElement('html')}),state=themes.getState(),colour=state.colours.light.brand[0],ref={kind:'palette',category:'brand',id:colour.id,fallback:colour.value};
 assert(Picker.valid(ref,Themes.tokens));assert.equal(Picker.resolve(ref,state,Themes.tokens).colour,colour.value);assert.match(Picker.resolve(ref,state,Themes.tokens).css,/^var\(--ds-palette-brand-/);
 const missing={...ref,id:'missing'};assert.equal(Picker.resolve(missing,state,Themes.tokens).colour,colour.value);
 assert(!Picker.valid({...ref,id:'x);url(bad)'},Themes.tokens));assert(!Picker.valid({kind:'custom',value:'url(bad)'},Themes.tokens));assert(Picker.valid({kind:'semantic',role:'accent'},Themes.tokens));
 themes.select('matrix');assert.equal(Picker.resolve({kind:'semantic',role:'accent'},themes.getState(),Themes.tokens).colour,Themes.defaults.matrix.accent);
});
test('palette popup stays anchored, flips above near the bottom and fits narrow viewports',()=>{
 const normal=Picker.placement({left:100,top:100,bottom:150},{height:250},{width:1200,height:800});assert.equal(normal.top,156);assert.equal(normal.left,100);
 const bottom=Picker.placement({left:1100,top:700,bottom:750},{height:250},{width:1200,height:800});assert.equal(bottom.top,444);assert(bottom.left+bottom.width<=1192);
 const mobile=Picker.placement({left:5,top:60,bottom:100},{height:350},{width:280,height:600});assert.equal(mobile.width,264);assert.equal(mobile.left,8);
});
