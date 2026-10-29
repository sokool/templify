const {test}=require('node:test'),assert=require('node:assert/strict');
const {Document}=require('../../../testing/dom-fixture.cjs');
const List=require('../list.js');
const columns=[{id:'name',secondaryKey:'address',mobile:true},{id:'ref',mobile:false},{id:'stage',mobile:true},{id:'date',mobile:false},{id:'price',mobile:true},{id:'city',tablet:false,mobile:false},{id:'project',tablet:false,mobile:false},{id:'colour',tablet:false,mobile:false}];
const rows=Array.from({length:19},(_,i)=>({id:'row-'+i,name:'Name '+i,address:'Address '+i,stage:'New',price:'10 PLN'}));
function setup(options={}){const doc=new Document(),host=doc.createElement('div');doc.append(host);return {doc,host,list:List.mount(host,{columns,rows,...options})};}
test('desktop all columns, tablet five, mobile three without losing normal secondary text',()=>{
 const f=setup();assert.equal(f.host.querySelectorAll('th').length,8);
 f.list.update({device:'tablet'});assert.equal(f.host.querySelectorAll('th').length,5);
 f.list.update({device:'mobile'});assert.equal(f.host.querySelectorAll('th').length,3);
 assert.equal(f.host.querySelectorAll('.ds-list-secondary').length,6);
 f.list.setDensity('compact');assert.equal(f.list.density,'compact');assert.equal(f.host.querySelectorAll('th').length,3);
 f.list.setDensity('normal');assert.equal(f.host.querySelector('.ds-list-secondary').textContent,'Address 0');
});
test('pagination clamps when rows shrink, empty state and multiple instances are independent',()=>{
 const a=setup(),b=setup();a.list.setPage(4);assert.equal(a.list.page,4);assert.match(a.host.textContent,/Items 19–19 of 19/);assert.equal(b.list.page,1);
 a.list.update({rows:rows.slice(0,2)});assert.equal(a.list.page,1);assert.equal(a.host.querySelectorAll('tbody')[0].children.length,2);
 a.list.update({rows:[]});assert.match(a.host.textContent,/No results/);assert.equal(a.host.querySelector('td').colSpan,8);
 a.list.destroy();assert.equal(a.host.children.length,0);assert.notEqual(b.host.children.length,0);
});
test('density callbacks are user actions only and do not reset the page',()=>{
 const changed=[],f=setup({onDensityChange:value=>changed.push(value)});f.list.setPage(2);
 f.host.querySelectorAll('[role=group]')[0].children[1].emit('click');
 assert.deepEqual(changed,['compact']);assert.equal(f.list.page,2);
 f.list.update({density:'normal'});assert.deepEqual(changed,['compact']);
});
test('text remains literal and composed cells are disposed on update and destruction',()=>{
 let disposed=0;const f=setup({columns:[{id:'name',render(value,row,{document}){const element=document.createElement('span');element.textContent=value;return {element,destroy(){disposed++}};}}],rows:[{id:'safe',name:'<img onerror=bad>'}]});
 assert.match(f.host.textContent,/<img onerror=bad>/);assert.equal(f.host.querySelectorAll('img').length,0);
 f.list.update({density:'compact'});assert.equal(disposed,1);f.list.destroy();assert.equal(disposed,2);f.list.destroy();assert.equal(disposed,2);
});
test('invalid duplicate IDs fail and pager stays bounded for large datasets',()=>{
 assert.throws(()=>setup({columns:[{id:'x'},{id:'x'}]}),/unique/);
 assert.throws(()=>setup({rows:[{id:1},{id:1}]}),/unique/);
 assert.ok(List.pageNumbers(500,1000).length<=7);assert.deepEqual(List.pageNumbers(1,4),[1,2,3,4]);
});
test('automatic layout follows container width and disconnects observer on destroy',()=>{
 const doc=new Document(),host=doc.createElement('div');let measure,disconnected=false;
 host.getBoundingClientRect=()=>({width:390});doc.defaultView={ResizeObserver:class{constructor(fn){measure=fn;}observe(){}disconnect(){disconnected=true;}}};
 const list=List.mount(host,{columns,rows});assert.equal(list.device,'mobile');measure([{contentRect:{width:768}}]);assert.equal(list.device,'tablet');measure([{contentRect:{width:1400}}]);assert.equal(list.device,'desktop');
 list.destroy();assert.equal(disconnected,true);
});
