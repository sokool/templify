const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Tokens=require('../tokens.js'),Themes=require('../../themes.js'),Settings=require('../../../../app/storage/settings.js'),{Document}=require('../../../testing/dom-fixture.cjs');
const defaults=JSON.parse(fs.readFileSync(path.join(__dirname,'../palette.tokens.json'),'utf8'));
test('authored DTCG defaults, generated file bundle and existing CSS share exactly the same colours',()=>{
 assert.deepEqual(defaults,require('../defaults.js'));assert.equal(Tokens.validate(defaults),true);
 assert.deepEqual(Tokens.toPalettes(defaults,Themes.tokens),Themes.defaults);
 const css=Tokens.compileThemes(defaults,Themes.tokens);assert.match(css,/\[data-ds-theme="matrix"\]/);assert.match(css,/--ds-colour-accent: #75E89A/);assert.equal((css.match(/--ds-colour-panel:/g)||[]).length,3);
});
test('aliases inherit type, resolve transitively and survive export',()=>{
 const doc=Tokens.copy(defaults);doc.base={$type:'color',mint:{$value:Tokens.colour('#123456')}};doc.themes.matrix.accent={$value:'{base.mint}'};
 assert.equal(Tokens.cssColour(Tokens.resolve(doc,'themes.matrix.accent')),'#123456');assert.match(Tokens.compileThemes(doc,Themes.tokens),/#123456/);assert.equal(doc.themes.matrix.accent.$value,'{base.mint}');
});
test('reject invalid colours, broken references, cycles, unknown types and unsafe names',()=>{
 const bad=[{$type:'color',$value:'#123456'},{$type:'color',$value:{colorSpace:'srgb',components:[2,0,0]}},{$type:'dimension',$value:{value:12,unit:'px'}},{$type:'color',$value:'{missing}'}];
 for(const token of bad)assert.throws(()=>Tokens.validate({bad:token}));
 assert.throws(()=>Tokens.validate({a:{$type:'color',$value:'{b}'},b:{$type:'color',$value:'{a}'}}),/Circular/);
 assert.throws(()=>Tokens.validate({'bad.name':{$type:'color',$value:Tokens.colour('#123456')}}));
 const incomplete=Tokens.copy(defaults);delete incomplete.themes.dark.panel;assert.throws(()=>Tokens.toPalettes(incomplete,Themes.tokens),/Missing/);
});
test('v1 workspace palette migrates to DTCG once, retaining all other component settings',()=>{
 const data={layout:{palette:{theme:'matrix',palettes:{matrix:{accent:'#123456'}}}},components:{surface:{radius:28}},preview:{device:'tablet'}};
 const values=new Map([['design-system-workspace',JSON.stringify({schema:'design-system-workspace',version:1,data})]]);let writes=0;
 const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes++;values.set(key,value)}};
 const context={DesignSystemSettings:Settings,DesignSystemThemes:Themes,DesignSystemTokens:Tokens};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../../app/storage/workspace-settings.js'),'utf8'),context);
 const {settings}=context.ExampleSettings.create({storage});assert.equal(settings.snapshot().version,2);assert.equal(settings.has('layout.palette'),false);assert.equal(settings.get('layout.theme'),'matrix');assert.equal(Tokens.cssColour(Tokens.resolve(settings.get('tokens'),'themes.matrix.accent')),'#123456');assert.equal(settings.get('components.surface.radius'),28);assert.equal(settings.exportTemplate().preview,undefined);
 const before=writes;context.ExampleSettings.create({storage});assert.equal(writes,before);
});
test('theme runtime reads/writes canonical tokens, rejects invalid imports atomically and resets a single mode',()=>{
 const settings=Settings.create();settings.set('tokens',defaults);settings.set('layout.theme','matrix');const doc=new Document(),target=doc.createElement('html'),themes=Themes.create({target,settings});
 themes.setColour('matrix','accent','#123456');assert.equal(target.style.get('--ds-colour-accent'),'#123456');assert.equal(settings.get('layout.palette'),null);assert.equal(settings.get('tokens.themes.matrix.accent.$type'),'color');
 const before=themes.exportTokens();assert.throws(()=>themes.importTokens({}));assert.equal(themes.exportTokens(),before);
 const imported=themes.getTokens();imported.themes.matrix.accent={$type:'color',$value:Tokens.colour('#ABCDEF')};themes.importTokens(imported);assert.equal(target.style.get('--ds-colour-accent'),'#ABCDEF');
 themes.reset('matrix');assert.equal(target.style.get('--ds-colour-accent'),Themes.defaults.matrix.accent);assert.equal(JSON.parse(themes.exportTokens()).themes.light.$type,'color');
});
test('earlier Buttons choices migrate once to an independent editable instance',()=>{
 const old=Tokens.copy(defaults);old.themes.dark.buttonFill={$type:'color',$value:Tokens.colour('#123456')};
 const data={tokens:old,layout:{theme:'dark'},components:{buttons:{colours:{ink:{kind:'semantic',role:'panel'}}}}};
 const values=new Map([['design-system-workspace',JSON.stringify({schema:'design-system-workspace',version:2,data})]]),storage={getItem:key=>values.get(key)??null,setItem(key,value){values.set(key,value)}};
 const context={DesignSystemSettings:Settings,DesignSystemThemes:Themes,DesignSystemTokens:Tokens};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../../../app/storage/workspace-settings.js'),'utf8'),context);const {settings}=context.ExampleSettings.create({storage});
 assert.equal(settings.get('components.buttons.items')[0].colours.fill.value,'#123456');
 assert.equal(settings.get('components.buttons.items')[0].colours.ink.role,'panel');
 settings.set('components.buttons.items',[{id:'custom',label:'Saved'}]);context.ExampleSettings.create({storage});assert.equal(settings.get('components.buttons.items')[0].label,'Saved');
});
