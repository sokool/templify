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
test('mobile edge dwell advances only one column until the finger returns to the neutral zone',async()=>{
 const {board,element,window,frames,document}=mount(390);
 board.update({columns:[...columns,{id:'c',label:'C'}]});
 const scroller=element.querySelector('.ds-kanban__scroll'),lanes=element.querySelector('.ds-kanban__lanes');
 scroller.scrollWidth=1100;
 scroller.getBoundingClientRect=()=>({left:0,right:390,top:200,bottom:700,width:390,height:500});
 [...lanes.children].forEach((lane,i)=>{lane.getBoundingClientRect=()=>({left:20+i*355-scroller.scrollLeft,right:370+i*355-scroller.scrollLeft,top:200,bottom:700,width:350,height:500});});
 const tick=now=>{const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn(now));};
 const point=x=>window.emit('pointermove',{pointerId:1,clientX:x,clientY:300,preventDefault(){}});
 const main=element.querySelector('.ds-card__main');
 lanes.emit('pointerdown',{target:main,button:0,pointerType:'touch',pointerId:1,clientX:195,clientY:300});
 await new Promise(resolve=>setTimeout(resolve,480));
 let hitX;
 document.elementFromPoint=x=>{hitX=x;return [...lanes.children].find(lane=>{const box=lane.getBoundingClientRect();return x>=box.left&&x<=box.right;});};
 point(380);tick(0);tick(349);assert.equal(scroller.scrollLeft,0);
 // Leaving the edge before the dwell ends cancels the pending transition.
 point(195);tick(350);point(380);tick(400);tick(749);assert.equal(scroller.scrollLeft,0);
 tick(750);tick(890);assert(scroller.scrollLeft>0&&scroller.scrollLeft<355);
 tick(1030);assert.equal(scroller.scrollLeft,355);
 tick(3000);tick(6000);assert.equal(scroller.scrollLeft,355);
 assert.equal(element.querySelector('.is-drop-target').dataset.columnId,'b');
 assert.equal(hitX,326); // Do not drop into the next column's narrow edge preview.
 // A small movement at the edge does not rearm; returning to the center does.
 point(360);tick(6100);point(380);tick(6500);tick(7000);assert.equal(scroller.scrollLeft,355);
 point(195);tick(7100);point(380);tick(7200);tick(7550);tick(7830);assert.equal(scroller.scrollLeft,710);
 point(195);tick(7900);point(380);tick(8000);tick(8350);tick(9000);assert.equal(scroller.scrollLeft,710);
 // The same gesture works backwards.
 point(195);tick(9100);point(10);tick(9200);tick(9550);tick(9830);assert.equal(scroller.scrollLeft,355);
 point(195);tick(9900);point(10);tick(10000);tick(10350);tick(10490);
 const stoppedAt=scroller.scrollLeft;assert(stoppedAt>0&&stoppedAt<355);
 window.emit('pointercancel');tick(11000);assert.equal(scroller.scrollLeft,stoppedAt);
 assert.equal(element.dataset.dragging,undefined);assert.equal(document.querySelector('.ds-kanban__ghost'),null);
 assert.deepEqual(board.getState().items,items);board.destroy();assert.equal(frames.size,0);
});
test('exports contain no application, storage or configurator dependency',()=>{
 for(const name of ['card','kanban-board']){const base=path.join(__dirname,'../..',name),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));assert.deepEqual(manifest.dependencies.components,[]);for(const file of manifest.runtimeFiles){const code=fs.readFileSync(path.join(base,file),'utf8');assert(!/demoOrders|localStorage|ExampleKanban|top-schrank-ui/.test(code));}manifest.exportFiles.forEach(file=>assert(fs.existsSync(path.resolve(base,file))));}
});
test('neighbour trigger follows an inset board rather than the screen edge',()=>{
 const {board,element,window,frames}=mount(800);board.setDevice('mobile');
 const lanes=element.querySelector('.ds-kanban__lanes'),scroller=element.querySelector('.ds-kanban__scroll');
 scroller.clientWidth=390;scroller.scrollWidth=745;
 scroller.getBoundingClientRect=()=>({left:100,right:490,top:200,bottom:700});
 [...lanes.children].forEach((lane,i)=>{lane.getBoundingClientRect=()=>({left:120+i*355-scroller.scrollLeft,right:470+i*355-scroller.scrollLeft});});
 const tick=now=>{const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn(now));};
 const point=x=>window.emit('pointermove',{pointerId:1,clientX:x,clientY:300,preventDefault(){}});
 lanes.emit('pointerdown',{target:element.querySelector('.ds-card__main'),button:0,pointerType:'mouse',pointerId:1,clientX:295,clientY:300});
 // Next column begins at 475: approach it without entering it.
 point(460);tick(0);tick(350);tick(630);assert.equal(scroller.scrollLeft,355);
 tick(1000);tick(2000);assert.equal(scroller.scrollLeft,355);
 // Previous column ends at 115: approach from the current column.
 point(295);tick(2100);point(130);tick(2200);tick(2550);tick(2830);assert.equal(scroller.scrollLeft,0);
 board.destroy();
});
for(const device of ['mobile','tablet'])for(const pointerType of ['mouse','touch'])test(`${device} ${pointerType} reveals a clipped neighbour only once per approach`,async()=>{
 const {board,element,window,frames}=mount(390);
 board.update({device,columns:[...columns,{id:'c',label:'C'}]});
 const lanes=element.querySelector('.ds-kanban__lanes'),scroller=element.querySelector('.ds-kanban__scroll');
 scroller.scrollWidth=1100;
 scroller.getBoundingClientRect=()=>({left:0,right:390,top:200,bottom:700});
 [...lanes.children].forEach((lane,i)=>{lane.getBoundingClientRect=()=>({left:20+i*355-scroller.scrollLeft,right:370+i*355-scroller.scrollLeft});});
 const tick=now=>{const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn(now));};
 const point=x=>window.emit('pointermove',{pointerId:1,clientX:x,clientY:300,preventDefault(){}});
 lanes.emit('pointerdown',{target:element.querySelector('.ds-card__main'),button:0,pointerType,pointerId:1,clientX:195,clientY:300});
 if(pointerType==='touch')await new Promise(resolve=>setTimeout(resolve,480));
 // More than 24px from the neighbour does not trigger scrolling.
 point(340);tick(0);tick(350);tick(630);assert.equal(scroller.scrollLeft,0);
 // The neighbour starts at 375: 355 is close, but still over the current column.
 point(355);tick(700);tick(1050);tick(1330);assert.equal(scroller.scrollLeft,355);
 tick(2000);tick(4000);assert.equal(scroller.scrollLeft,355);
 point(385);tick(4100);tick(5000);assert.equal(scroller.scrollLeft,355);
 // Moving closer to the edge still must not advance again.
 point(389);tick(5100);tick(5450);tick(5730);assert.equal(scroller.scrollLeft,355);
 // Leaving the edge zone is sufficient; no return to the center is needed.
 point(320);tick(5800);point(380);tick(5900);tick(6250);tick(6530);assert.equal(scroller.scrollLeft,710);
 point(389);tick(8000);tick(12000);assert.equal(scroller.scrollLeft,710);
 board.destroy();assert.equal(frames.size,0);
});
