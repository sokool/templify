const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {Document}=require('../../../testing/dom-fixture.cjs');
const component=require('../breadcrumbs.js');
const items=Array.from({length:7},(_,i)=>({id:String(i),label:i===0?'topschrank':'level'+i,href:'#level'+i,emphasisLength:i===0?3:0}));
function setup(options={}){const doc=new Document(),nav=doc.createElement('nav');doc.append(nav);return {doc,nav,control:component.mount(nav,{items,...options})}}
function click(nav,target,extra={}){let prevented=false;nav.emit('click',{target,button:0,preventDefault(){prevented=true},...extra});return prevented}

test('1–7 levels preserve every destination and exactly one current link',()=>{
  for(let depth=1;depth<=7;depth++){
    const {nav,control}=setup({items:items.slice(0,depth),appearance:{longPaths:'full'}});
    assert.equal(nav.querySelectorAll('a').length,depth);
    assert.equal(nav.querySelectorAll('[aria-current=page]').length,1);
    assert.equal(nav.querySelector('[aria-current=page]').href,'#level'+(depth-1));
    assert.equal(nav.querySelectorAll('ol').length,1);
    assert.equal(nav.querySelector('strong').textContent,'top');control.destroy();
  }
});
test('collapse exposes earlier levels as working links and Escape restores focus',()=>{
  const {nav,control}=setup();const overflow=nav.querySelector('details'),summary=overflow.querySelector('summary');
  assert.equal(overflow.querySelectorAll('a').length,4);assert.equal(summary.getAttribute('aria-label'),'Show 4 earlier levels');
  overflow.open=true;nav.emit('keydown',{key:'Escape'});assert.equal(overflow.open,false);assert.equal(nav.ownerDocument.activeElement,summary);
  control.update({appearance:{longPaths:'full'}});assert.equal(nav.querySelector('details'),null);
});
test('current links and collapsed links navigate; modified clicks remain browser links',()=>{
  const navigations=[];const {nav}=setup({onNavigate:item=>navigations.push(item.id)});
  assert.equal(click(nav,nav.querySelector('[aria-current=page]')),true);assert.deepEqual(navigations,['6']);
  assert.equal(click(nav,nav.querySelector('details').querySelector('a')),true);assert.deepEqual(navigations,['6','1']);
  assert.equal(click(nav,nav.querySelector('a'),{ctrlKey:true}),false);assert.deepEqual(navigations,['6','1']);
});
test('outside pointer closes only this instance; destroy removes document listeners',()=>{
  const {doc,nav,control}=setup();const overflow=nav.querySelector('details');overflow.open=true;
  doc.emit('pointerdown',{target:doc.createElement('div')});assert.equal(overflow.open,false);
  assert.equal(doc.listeners.get('pointerdown').size,1);control.destroy();assert.equal(doc.listeners.get('pointerdown').size,0);assert.equal(nav.children.length,0);assert.equal(nav.style.size,0);
  assert.throws(()=>control.update({items}),/destroyed/);
});
test('appearance and data are isolated between instances',()=>{
  const a=setup({appearance:{size:14,hover:'draw',colours:{current:'#112233'}}}),b=setup({appearance:{size:28,hover:'dot'}});
  a.control.update({appearance:{size:18}});assert.equal(a.nav.style.get('--ds-bc-size'),'18px');assert.equal(b.nav.style.get('--ds-bc-size'),'28px');assert.equal(a.nav.style.get('--ds-bc-current'),'#112233');assert.equal(b.nav.dataset.hover,'dot');
  a.control.update({items:items.slice(0,2)});assert.equal(a.nav.querySelectorAll('a').length,2);assert.equal(b.nav.querySelectorAll('a').length,7);
});
test('text is not HTML and unsafe URL schemes are neutralized',()=>{
  const {nav}=setup({items:[{label:'<img onerror=alert(1)>',href:'javascript:alert(1)'}]});assert.equal(nav.querySelector('a').textContent,'<img onerror=alert(1)>');assert.equal(nav.querySelector('a').href,'#');assert.equal(nav.querySelector('img'),null);
});
test('every colour scheme and hover setting accepts seven levels',()=>{
  for(const scheme of Object.keys(component.colourSchemes))for(let i=0;i<6;i++)assert.equal(typeof component.levelColour(i,6,{scheme,brandFocus:false}),'string');
  assert.equal(component.normalizeAppearance({size:99,scheme:'unknown',hover:'unknown'}).size,48);
  assert.equal(component.normalizeAppearance({hover:'unknown'}).hover,'curve');
});
test('component files do not import playground, application globals or third-party packages',()=>{
  const js=readFileSync(path.join(__dirname,'../breadcrumbs.js'),'utf8'),css=readFileSync(path.join(__dirname,'../breadcrumbs.css'),'utf8');
  assert(!/localStorage|workspace|menu-live|createFormSelect|tooltipPalette|querySelectorAll\('nav/.test(js));
  assert(!/#menu-live|\.wordmark|var\(--(?:text|link|ui-font|accent-\d|blue-gray)/.test(css));
});
