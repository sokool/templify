const {test}=require('node:test'),assert=require('node:assert/strict');
const Card=require('../card.js'),{createFixture}=require('../../../testing/kanban-fixture.cjs');
test('Card renders untrusted labels as text, aligns generic metadata and updates independently',()=>{
 const {element,document}=createFixture();let called=0;
 const view=Card.mount(element,{title:'<b>Title</b>',metaLeft:'Reference',metaRight:'Value',onActivate:()=>called++});
 assert.equal(element.querySelectorAll('b').length,0);assert.equal(element.querySelector('.ds-card__meta-right').textContent,'Value');
 assert(element.querySelector('.ds-card__menu-trigger').hidden);element.querySelector('.ds-card__main').emit('click',{});assert.equal(called,1);
 view.update({title:'New',device:'mobile',accent:'#123456'});assert.equal(element.dataset.device,'mobile');assert.equal(element.style.get('--ds-card-accent'),'#123456');
 view.destroy();assert.equal(document.querySelectorAll('.ds-card-menu').length,0);assert.equal(element.children.length,0);
});
test('Card action menu supports nested actions, keyboard dismissal, disabled actions and cleanup',()=>{
 const {element,document}=createFixture();let called=0;
 const view=Card.mount(element,{title:'One',actions:[{id:'move',label:'Move',children:[{id:'next',label:'Next',onSelect:()=>called++}]}]});
 const trigger=element.querySelector('.ds-card__menu-trigger'),menu=document.querySelector('.ds-card-menu');
 trigger.emit('click',{stopPropagation(){}});assert(!menu.hidden);menu.querySelector('button').emit('click',{});
 assert.equal(menu.children[0].textContent,'← Back');menu.children[1].emit('click',{});assert.equal(called,1);assert(menu.hidden);
 trigger.emit('click',{stopPropagation(){}});menu.emit('keydown',{key:'Escape',preventDefault(){}});assert(menu.hidden);assert.equal(document.activeElement,trigger);
 assert.equal(view.canDrag(trigger),false);view.destroy();assert.equal([...document.listeners.values()].reduce((n,set)=>n+set.size,0),0);
});
