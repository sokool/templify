const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../..');
const component=require(path.join(base,'breadcrumbs.js')),{Document}=require(path.join(base,'../../testing/dom-fixture.cjs'));
const scope={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../configurator.js'),'utf8'),{globalThis:scope});
test('editor reuses component, restores settings, updates previews and persists only through injected storage',()=>{
 const doc=new Document(),page=doc.createElement('section');doc.append(page);
 const fields=[],updates=[],store=new Map([['top-schrank-breadcrumb-settings',JSON.stringify({size:'18',longPaths:'full',hover:'draw'})]]);
 const storage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
 const editor=scope.BreadcrumbPlayground.mount({page,component,storage,
  createSelect:config=>{fields.push(config);return {element:doc.createElement('div'),setValue(){}}},
  getItems:parts=>[{label:'top',href:'#home'},...parts.map(label=>({label,href:'#'+label}))],
  getTheme:()=>({accent:'#22447F'}),getColourGroups:()=>[],resolveColour:token=>token,icon:()=>'',onChange:settings=>updates.push(settings),onNavigate(){}
 });
 assert.equal(page.querySelectorAll('nav').length,7);assert.equal(fields.length,5);
 assert.equal(page.querySelectorAll('nav')[6].querySelectorAll('a').length,7);
 assert.equal(updates[0].size,18);assert.equal(updates[0].hover,'draw');
 fields.find(field=>field.label==='Long paths').onChange('collapse');
 assert.equal(page.querySelectorAll('nav')[6].querySelector('details').querySelectorAll('a').length,4);
 assert.equal(JSON.parse(storage.getItem('top-schrank-breadcrumb-settings')).longPaths,'collapse');
 fields.find(field=>field.label==='Font size').onChange('26');
 assert.equal(page.querySelector('nav').style.get('--ds-bc-size'),'26px');
 editor.destroy();assert.equal(page.children.length,0);assert.equal(doc.listeners.get('pointerdown').size,0);
});
test('main playground references real assets and no longer embeds breadcrumb rendering or editor copies',()=>{
  const root=path.resolve(__dirname,'../../../../..'),html=fs.readFileSync(path.join(root,'top-schrank-ui.html'),'utf8');
 for(const asset of ['ui/components/breadcrumbs/breadcrumbs.js','ui/components/breadcrumbs/breadcrumbs.css','ui/components/breadcrumbs/configurator/configurator.js','ui/components/breadcrumbs/configurator/configurator.css']){
  assert(html.includes('./'+asset));assert(fs.existsSync(path.join(root,asset)));
 }
 assert(!/function (renderBreadcrumbSegments|configureBreadcrumbDepth|createAppBreadcrumbs|breadcrumbLevelColour|renderBreadcrumbEditor)/.test(html));
 assert(html.includes('BreadcrumbWorkspaceAdapter.create'));assert(html.includes('BreadcrumbPlayground.mount'));
 assert(!html.includes('--bc-font-size'));assert(!html.includes('.app-breadcrumbs'));
});
test('workspace adapter maps routes and shares appearance without owning storage or menu state',()=>{
 const adapterScope={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../../../../app/workspace/breadcrumbs-adapter.js'),'utf8'),{globalThis:adapterScope});
 const doc=new Document(),nav=doc.createElement('nav');doc.append(nav);const selected=[];
 const adapter=adapterScope.BreadcrumbWorkspaceAdapter.create({component,element:nav,getPath:page=>page==='dashboard'?['dashboard']:['components','breadcrumbs'],resolveHref:route=>'#topschrank.'+route,navigate:item=>selected.push(item.id),getTheme:()=>({accent:'#ABCDEF'})});
 adapter.show('dashboard');assert.equal(nav.querySelector('[aria-current=page]').textContent,'dashboard');
 adapter.setAppearance({size:18,hover:'draw'});assert.equal(nav.style.get('--ds-bc-size'),'18px');
 adapter.show('breadcrumbs');assert.equal(nav.querySelector('[aria-current=page]').href,'#topschrank.breadcrumbs');assert.equal(nav.dataset.hover,'draw');
 const link=nav.querySelector('[aria-current=page]');nav.emit('click',{target:link,button:0,preventDefault(){}});assert.deepEqual(selected,['breadcrumbs']);
 adapter.destroy();assert.equal(doc.listeners.get('pointerdown').size,0);
});
