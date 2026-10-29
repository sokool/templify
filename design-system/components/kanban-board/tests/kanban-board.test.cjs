const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Model=require('../model.js'),Board=require('../kanban-board.js'),Card=require('../../card/card.js'),{createFixture}=require('../../../testing/kanban-fixture.cjs');
const columns=[{id:'a',label:'A'},{id:'b',label:'B'}],items=[{id:'1',columnId:'a',title:'One'},{id:'2',columnId:'a',title:'Two'},{id:'3',columnId:'b',title:'Three'}];
function mount(width=1200){const f=createFixture(width),moves=[];const board=Board.mount(f.element,{columns,items,onMove:e=>moves.push(e),renderItem:(item,context)=>Card.mount(f.document.createElement('article'),{...item,...context})});return {...f,board,moves};}
test('model rejects duplicate IDs and unknown columns, moves immutably with explicit before target',()=>{
 assert.throws(()=>Model.normalize(columns,[...items,items[0]]),/Duplicate item/);assert.throws(()=>Model.normalize(columns,[{id:'x',columnId:'missing'}]),/Unknown column/);
 const next=Model.move(items,'1','b','3');assert.equal(items[0].columnId,'a');assert.deepEqual(next.filter(i=>i.columnId==='b').map(i=>i.id),['1','3']);
 assert.equal(Model.move(items,'1','b','1'),null);assert.equal(Model.move(items,'1','b','missing'),null);
});
test('mobile centers one column, tablet sizes three with gaps; auto breakpoints honor preview width',()=>{
 assert.equal(Model.deviceFor(390),'mobile');assert.equal(Model.deviceFor(768),'tablet');assert.equal(Model.deviceFor(1440),'desktop');
 assert.equal(Model.layoutFor(390,'mobile').columnWidth,350);const tablet=Model.layoutFor(768,'tablet');assert.equal(tablet.columnWidth*3+tablet.gap*2+tablet.padding*2,768);
 const {board,element}=mount(768);assert.equal(element.dataset.device,'tablet');board.setDevice('mobile');assert.equal(element.dataset.device,'mobile');board.destroy();
});
test('board renderer is injected; moving, filtering and Alt keyboard moves share one model',()=>{
 const {board,element,moves,document}=mount();assert.equal(document.querySelectorAll('.ds-card').length,3);
 assert(board.move('1','b','3'));assert.equal(moves.length,1);assert.equal(board.getState().items.find(i=>i.id==='1').columnId,'b');
 const main=element.querySelector('.ds-card__main'),lanes=element.querySelector('.ds-kanban__lanes');
 lanes.emit('keydown',{target:main,altKey:true,key:'ArrowRight',preventDefault(){}});assert.equal(board.getState().items.find(i=>i.id==='2').columnId,'b');
 board.setFilter(i=>i.id==='3');assert.equal(document.querySelectorAll('.ds-card').length,1);assert.equal(board.getState().items.length,3);
 board.destroy();assert.equal(document.querySelectorAll('.ds-card-menu').length,0);
});
test('mouse pickup preserves grab point, cloned size and menu exclusion; cancel leaves model intact',()=>{
 const {board,element,document,window}=mount(),lanes=element.querySelector('.ds-kanban__lanes'),main=element.querySelector('.ds-card__main');
 lanes.emit('pointerdown',{target:main,button:0,pointerType:'mouse',pointerId:1,clientX:130,clientY:220});
 window.emit('pointermove',{pointerId:1,clientX:160,clientY:250,preventDefault(){}});
 const ghost=document.querySelector('.ds-kanban__ghost');assert(ghost);assert.equal(ghost.style.left,'130px');assert.equal(ghost.style.top,'230px');assert.equal(ghost.style.transformOrigin,'30px 20px');assert.equal(ghost.style.height,'280px');
 document.emit('keydown',{key:'Escape',preventDefault(){}});assert.equal(document.querySelector('.ds-kanban__ghost'),null);assert.deepEqual(board.getState().items,items);
 const trigger=element.querySelector('.ds-card__menu-trigger');lanes.emit('pointerdown',{target:trigger,button:0,pointerType:'mouse',pointerId:2,clientX:130,clientY:220});window.emit('pointermove',{pointerId:2,clientX:160,clientY:250});assert.equal(document.querySelector('.ds-kanban__ghost'),null);board.destroy();
});
test('touch hold lifts smoothly without rotation; pointer cancellation removes ghost and listeners',async()=>{
 const {board,element,document,window}=mount(390),lanes=element.querySelector('.ds-kanban__lanes'),main=element.querySelector('.ds-card__main');
 lanes.emit('pointerdown',{target:main,button:0,pointerType:'touch',pointerId:1,clientX:130,clientY:220});assert.equal(document.querySelector('.ds-kanban__ghost'),null);
 await new Promise(resolve=>setTimeout(resolve,480));const ghost=document.querySelector('.ds-kanban__ghost');assert(ghost);assert.equal(ghost.style.transform,'scale(1.025)');assert.equal(ghost.animation.options.duration,320);assert.equal(ghost.animation.frames[1].transform,ghost.style.transform);
 window.emit('pointercancel');assert.equal(document.querySelector('.ds-kanban__ghost'),null);board.destroy();assert.equal([...window.listeners.values()].reduce((n,set)=>n+set.size,0),0);
});
test('touch pan before hold cancels pickup and teardown clears timers',async()=>{
 const {board,element,document,window}=mount(390),lanes=element.querySelector('.ds-kanban__lanes'),main=element.querySelector('.ds-card__main');
 lanes.emit('pointerdown',{target:main,button:0,pointerType:'touch',pointerId:1,clientX:130,clientY:220});window.emit('pointermove',{pointerId:1,clientX:150,clientY:220});
 await new Promise(resolve=>setTimeout(resolve,480));assert.equal(document.querySelector('.ds-kanban__ghost'),null);board.destroy();
});
test('exports contain no application, storage or configurator dependency',()=>{
 for(const name of ['card','kanban-board']){const base=path.join(__dirname,'../..',name),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));assert.deepEqual(manifest.dependencies.components,[]);for(const file of manifest.runtimeFiles){const code=fs.readFileSync(path.join(base,file),'utf8');assert(!/demoOrders|localStorage|ExampleKanban|top-schrank-ui/.test(code));}manifest.exportFiles.forEach(file=>assert(fs.existsSync(path.resolve(base,file))));}
});
