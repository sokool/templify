const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../settings.js');
function memory(seed={}){const values=new Map(Object.entries(seed)),writes=[];return {values,writes,getItem:k=>values.get(k)??null,setItem(k,v){values.set(k,v);writes.push(k);}};}
test('scopes persist typed values in one document and restore them',()=>{
 const storage=memory(),store=create({storage});
 store.batch(()=>{store.scope('components.tooltip').patch({size:12,enabled:false});store.scope('layout.fonts').set('family','Outfit');});
 assert.deepEqual(storage.writes,['design-system-workspace']);
 assert.equal(create({storage}).get('components.tooltip.enabled'),false);
 assert.equal(store.get('layout.fonts.family'),'Outfit');
 const copy=store.scope('components.tooltip').snapshot();copy.size=99;
 assert.equal(store.get('components.tooltip.size'),12);
});
test('legacy migration imports missing settings once and preserves original keys',()=>{
 const storage=memory({old:'{"size":14}',font:'Outfit'}),store=create({storage});
 const routes={old:'components.tooltip',font:{path:'layout.fonts.family',format:'text'}};
 store.migrateLegacy(routes);assert.equal(storage.writes.length,1);
 store.scope('components.tooltip').set('size',18);store.migrateLegacy(routes);
 assert.equal(store.get('components.tooltip.size'),18);assert.equal(storage.getItem('old'),'{"size":14}');
 const adapter=store.adapter(routes);assert.equal(adapter.getItem('font'),'Outfit');
 adapter.setItem('old','{"size":16}');assert.equal(store.get('components.tooltip.size'),16);
 adapter.removeItem('old');assert.equal(store.has('components.tooltip'),false);
 assert.throws(()=>adapter.setItem('unknown','true'));
});
test('template export excludes editor preview and session data',()=>{
 const store=create();store.set('layout.fonts.family','Inter');store.set('components.window.mode','side');store.set('preview.device','mobile');store.set('session.kanban',[]);
 const exported=JSON.parse(store.exportJSON());
 assert.deepEqual(Object.keys(exported),['schema','version','layout','components','tokens']);
 assert.equal(exported.components.window.mode,'side');assert.equal(exported.layout.fonts.family,'Inter');
 assert.equal(JSON.parse(store.exportJSON({template:false})).data.preview.device,'mobile');
});
test('denied storage retains useful in-memory state and reports failure',()=>{
 const storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 const store=create({storage});store.set('components.card.enabled',true);
 assert.equal(store.get('components.card.enabled'),true);assert.equal(store.status.persistent,false);assert.match(store.status.error,/denied/);
});
test('future schemas are never overwritten',()=>{
 const storage=memory({'design-system-workspace':'{"schema":"design-system-workspace","version":9,"data":{}}'});
 const store=create({storage});store.set('layout.theme','light');
 assert.equal(store.status.readOnly,true);assert.equal(storage.writes.length,0);
});
test('corrupt storage can recover and missing storage is optional',()=>{
 const storage=memory({'design-system-workspace':'broken'}),store=create({storage});
 assert.ok(store.status.error);store.set('layout.theme','light');assert.equal(create({storage}).get('layout.theme'),'light');
 assert.equal(create().status.persistent,false);
});
test('rejects non JSON values and unsafe paths',()=>{
 const store=create();for(const value of [undefined,NaN,Infinity,()=>{},Symbol('x'),1n])assert.throws(()=>store.set('bad',value));
 assert.throws(()=>store.set('__proto__.polluted',true));assert.throws(()=>store.set('bad',JSON.parse('{"constructor":{}}')));
 assert.equal({}.polluted,undefined);
});
test('scope defaults preserve user values; subscriptions can be disposed',()=>{
 const store=create(),scope=store.scope('components.window');scope.set('width',720);let calls=0;
 const off=scope.subscribe(()=>calls++);scope.defaults({width:480,mode:'modal'});off();scope.set('mode','side');
 assert.equal(calls,1);assert.equal(scope.get('width'),720);assert.equal(scope.get('mode'),'side');
});
test('host migration adapter maps actual example keys to canonical scopes',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),context={DesignSystemSettings:{create},DesignSystemTokens:require('../../tokens/tokens.js'),DesignSystemThemes:require('../../foundations/themes.js')};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../examples/settings.js'),'utf8'),context);
 const storage=memory({'design-system-examples-font':'Inter','design-system-examples-sidebar-collapsed':'true','design-system-examples-device':'tablet'});
 const host=context.ExampleSettings.create({storage});
 assert.equal(host.settings.get('layout.fonts.family'),'Inter');assert.equal(host.settings.get('layout.navigation.collapsed'),true);
 host.storage.setItem('design-system-examples-surface','{"radius":12}');
 assert.equal(host.settings.get('components.surface.radius'),12);
 assert.equal(host.settings.exportTemplate().preview,undefined);
 assert.deepEqual([...new Set(storage.writes)],['design-system-workspace']);
});
