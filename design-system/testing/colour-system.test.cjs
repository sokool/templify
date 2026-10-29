const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Themes=require('../foundations/themes.js'),Tokens=require('../tokens/tokens.js'),Generator=require('../palette/generator.js'),{Document}=require('./dom-fixture.cjs');
function create(storage){const doc=new Document();return Themes.create({target:doc.createElement('html'),storage});}
test('legacy theme colours migrate to categorized primitives without changing rendered roles',()=>{
 const legacy=Tokens.fromPalettes(Themes.defaults),themes=create({getItem:()=>JSON.stringify({theme:'light',tokens:legacy}),setItem(){}}),state=themes.getState();assert.deepEqual(state.palettes.light,Themes.defaults.light);
 assert.deepEqual(Object.keys(state.colours.light),['brand','accent','greys']);
 const ref=state.assignments.light.text;assert.equal(ref.category,'brand');const colour=state.colours.light.brand.find(c=>c.id===ref.id);
 assert.match(themes.getTokens().themes.light.text.$value,/^\{themes.light.colors.brand./);
 themes.updateColour('light','brand',colour.id,'#123456');assert.equal(themes.getState().palettes.light.text,'#123456');assert.equal(themes.getState().palettes.dark.text,Themes.defaults.dark.text);
});
test('adding, assigning, removing and emptying categories retain valid DTCG and stable application colours',()=>{
 const themes=create(),id=themes.addColour('light','brand','#2468AC','New brand');themes.assign('light','accent','brand',id);themes.assign('light','border','brand',id);
 themes.updateColour('light','brand',id,'#13579B');assert.equal(themes.getState().palettes.light.accent,'#13579B');assert.equal(themes.getState().palettes.light.border,'#13579B');
 themes.removeColour('light','brand',id);assert.equal(themes.getState().palettes.light.accent,'#13579B');assert.equal(themes.getState().assignments.light.accent,null);
 for(const colour of themes.getState().colours.light.greys)themes.removeColour('light','greys',colour.id);
 assert.deepEqual(themes.getState().colours.light.greys,[]);assert.equal(Tokens.validate(themes.getTokens()),true);
 assert.equal(themes.updateColour('light','greys','missing','#123456'),false);assert.throws(()=>themes.assign('light','text','greys','missing'));
 for(let i=0;i<35;i++)themes.addColour('light','accent','#123456','Accent '+i);assert(themes.getState().colours.light.accent.length>32);
});
test('seeded generation preserves anchors, produces tinted greys and reports known WCAG ratios',()=>{
 const input={seeds:'#22447F, #E9CB86',accents:8,greys:12},a=Generator.generate(input);assert.deepEqual(a,Generator.generate(input));assert.deepEqual(a.brand.map(c=>c.value),['#22447F','#E9CB86']);assert.equal(a.accent.length,8);assert.equal(a.greys.length,12);
 assert.equal(Generator.contrast('#000000','#FFFFFF').ratio,21);assert.equal(Generator.contrast('#888888','#888888').aa,false);
 assert.throws(()=>Generator.generate({seeds:'url(x)'}));assert.throws(()=>Generator.generate({seeds:'#22447F',greys:1}));
 for(const base of ['light','dark','matrix']){const mapping=Generator.autoAssign(a,base,Themes.registry),themes=create(),id=themes.add('Generated '+base,base,{colours:a,assignments:mapping});const state=themes.getState();assert.equal(state.colours[id].brand.length,2);assert.equal(state.colours[id].accent.length,8);assert(Generator.contrast(state.palettes[id].text,state.palettes[id].panel).aa);assert.equal(Tokens.validate(themes.getTokens()),true);assert.match(themes.exportCSS(),/--ds-palette-brand-colour-1: #22447F/);assert.match(themes.exportCSS(),/--ds-accent-1:/);}
});
test('categorized imports, aliases, copies and storage round trip; malformed imports are atomic',()=>{
 const storage={value:null,getItem(){return this.value},setItem(key,value){this.value=value}},themes=create(storage),id=themes.add('Clone','matrix'),ref=themes.getState().assignments[id].text;
 themes.updateColour(id,ref.category,ref.id,'#C0FFEE');assert.equal(themes.getState().palettes.matrix.text,Themes.defaults.matrix.text);
 const restored=create(storage);assert.equal(restored.getState().palettes[id].text,'#C0FFEE');assert.deepEqual(restored.getTokens(),themes.getTokens());
 const imported=create();imported.importTokens(themes.getTokens());assert.deepEqual(imported.getState().colours,themes.getState().colours);
 const before=imported.exportTokens(),bad=imported.getTokens();bad.themes[id].colors.brand[ref.id].$description={bad:true};assert.throws(()=>imported.importTokens(bad));assert.equal(imported.exportTokens(),before);
});
test('component manifests are the source of opt-in colour roles, with no tool dependencies in runtime',()=>{
 const foundation=JSON.parse(fs.readFileSync(path.join(__dirname,'../foundations/colour-roles.json'))),catalogue=Themes.registry;
 for(const role of foundation)assert(catalogue.some(r=>r.id===role.id));
 for(const component of ['form','kanban-board']){const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../components',component,'manifest.json')));for(const role of manifest.colourRoles)assert(catalogue.some(r=>r.id===role.id&&r.css===role.css&&r.owners.includes(component)));assert(!JSON.stringify(manifest.runtimeFiles).includes('chroma'));}
});
test('Buttons inherits foundation roles without adding palette applications',()=>{
 assert(!Themes.registry.some(role=>role.section==='Buttons'));
 const themes=create(),id=themes.add('User theme');themes.setColour(id,'accent','#123456');
 assert.equal(themes.getState().palettes[id].accent,'#123456');assert.equal(Tokens.validate(themes.getTokens()),true);
});
