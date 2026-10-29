const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path');
const {Document}=require('../../../testing/dom-fixture.cjs');
const shell=require('../navigation.js');
function setup(width=1440,saved={}){
 const doc=new Document(),frames=[],observers=[];
 const create=doc.createElement.bind(doc);
 doc.createElement=tag=>{
  const n=create(tag);n.hidden=false;n.clientHeight=40;n.scrollHeight=40;n.offsetHeight=64;n.offsetWidth=220;n.scrollTop=0;n.clientWidth=width;n.inert=false;
  n.classList.add=(...names)=>{n.className=[...new Set([...n.className.split(' '),...names])].filter(Boolean).join(' ')};
  n.classList.toggle=(name,on)=>on?n.classList.add(name):n.classList.remove(name);
  n.matches=selector=>{if(selector===':popover-open')return !!n.popoverOpen;if(selector[0]==='#')return n.id===selector.slice(1);if(selector[0]==='.')return n.className.split(' ').includes(selector.slice(1));if(selector==='button')return n.tagName==='BUTTON';const a=selector.match(/^\[([^=\]]+)(?:="?([^"\]]+)"?)?\]$/);if(a){const value=a[1].startsWith('data-')?n.dataset[a[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:n.getAttribute(a[1]);return a[2]===undefined?value!==null&&value!==undefined:value===a[2]}return false};
  const all=n.querySelectorAll.bind(n);n.querySelectorAll=selector=>{const i=selector.indexOf(' ');if(i<0)return all(selector);return all(selector.slice(0,i)).flatMap(parent=>parent.querySelectorAll(selector.slice(i+1)))};
  n.before=node=>{const parent=n.parentNode;const index=parent.children.indexOf(n);if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(c=>c!==node);node.parentNode=parent;parent.children.splice(index,0,node)};
  n.getBoundingClientRect=()=>({top:100,left:0,right:45,height:n.offsetHeight,width:n.offsetWidth});n.hasAttribute=name=>n.getAttribute(name)!==null;
  n.showPopover=()=>n.popoverOpen=true;n.hidePopover=()=>n.popoverOpen=false;n.scrollBy=({top})=>n.scrollTop+=top;
  return n;
 };
 doc.getElementById=id=>doc.querySelector('#'+id);
 doc.defaultView=doc.createElement('window');doc.defaultView.innerHeight=800;
 global.matchMedia=()=>({matches:false});global.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};global.cancelAnimationFrame=()=>{};
 global.ResizeObserver=global.MutationObserver=class{constructor(callback){this.callback=callback;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
 const el=(tag,id,parent,cls='')=>{const n=doc.createElement(tag);n.id=id;n.className=cls;parent?.append(n);return n};
 const viewport=el('div','preview',doc);viewport.clientWidth=width;const root=el('div','menu-live',viewport,'menu-live ds-navigation');
 const header=el('header','',root,'menu-live-header');el('nav','workspace-breadcrumbs',header);el('div','',header,'menu-header-actions');
 const nav=el('nav','menu-live-nav',root,'menu-live-nav');const items=el('div','',nav,'workspace-nav-items');
 const dash=el('button','',items,'menu-nav-action');dash.dataset.menuPage='dashboard';
 const section=el('div','',items,'menu-section'),parent=el('button','',section,'menu-nav-action');parent.dataset.menuGroup='components';parent.setAttribute('aria-controls','submenu-components');
 const panel=el('div','submenu-components',section,'menu-submenu');panel.hidden=true;const leaf=el('button','',panel,'menu-sub-action');leaf.dataset.menuPage='forms';
 const footer=el('div','',nav,'menu-sidebar-footer'),toggle=el('button','menu-sidebar-toggle',footer);el('span','',toggle,'sidebar-toggle-icon');
 el('div','',root,'menu-live-content');
 const storage={getItem:key=>saved[key]??null,setItem:(key,value)=>saved[key]=value},navigated=[],status={textContent:''};
 const control=shell.mount(root,{viewport,storage,storageKey:'test',statusElement:status,renderIcon:name=>'<svg>'+name+'</svg>',onNavigate:page=>navigated.push(page)});
 return {doc,root,viewport,nav,items,footer,toggle,parent,panel,leaf,dash,control,saved,navigated,frames,observers};
}
test('restores sidebar and groups without starting an initial animation',()=>{
 const f=setup(1440,{'test-sidebar-collapsed':'true','test-menu-groups':'{"components":true}'});
 assert.equal(f.root.dataset.sidebarCollapsed,'true');assert.equal(f.control.hasSavedGroups,true);assert.equal(f.panel.hidden,true);
 f.control.setCollapsed(false);assert.equal(f.panel.hidden,false);assert.equal(f.saved['test-sidebar-collapsed'],'false');
 f.parent.emit('click');assert.equal(f.panel.hidden,true);assert.equal(JSON.parse(f.saved['test-menu-groups']).components,false);
});
test('collapsed flyout, selection, outside click and keyboard preserve focus/state',()=>{
 const f=setup();f.control.setCollapsed(true);f.parent.emit('click');assert.equal(f.control.openFlyout,'components');assert.equal(f.panel.hidden,false);
 f.control.select('forms');assert.equal(f.leaf.getAttribute('aria-current'),'page');assert.equal(f.parent.className.includes('has-current-page'),true);assert.equal(f.control.openFlyout,null);assert.equal(f.doc.activeElement,f.parent);
 f.leaf.emit('click');assert.deepEqual(f.navigated,['forms']);f.control.select('dashboard');assert.equal(f.leaf.getAttribute('aria-current'),null);assert.equal(f.parent.className.includes('has-current-page'),false);
 f.parent.emit('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(f.doc.activeElement,f.leaf);
 f.nav.emit('keydown',{key:'Escape',target:f.leaf,preventDefault(){}});assert.equal(f.panel.hidden,true);
 f.parent.emit('click');f.doc.emit('pointerdown',{target:f.root});assert.equal(f.panel.hidden,true);
});
test('mobile uses inline groups and hamburger; Escape closes and restores focus',()=>{
 const f=setup(390,{'test-sidebar-collapsed':'true'});const mobile=f.control.installMobile();assert.equal(f.control.isCompact(),false);assert.equal(f.nav.inert,true);
 mobile.toggle.emit('click');assert.equal(f.root.dataset.mobileMenuOpen,'true');assert.equal(f.nav.inert,false);
 f.parent.emit('click');assert.equal(f.panel.hidden,false);
 f.doc.emit('keydown',{key:'Escape',defaultPrevented:false,preventDefault(){}});assert.equal(f.root.dataset.mobileMenuOpen,'false');assert.equal(f.doc.activeElement,mobile.toggle);
 mobile.setOpen(true);f.nav.emit('click',{target:f.leaf});assert.equal(f.nav.inert,true);
});
test('desktop/tablet breakpoint, independent scroll regions, both disabled directions and flush flyout',()=>{
 const f=setup(768);f.control.setCollapsed(true);const overflow=f.control.installOverflow({items:f.items,footer:f.footer,nav:f.nav});
 f.items.clientHeight=100;f.items.scrollHeight=500;overflow.regions[0].region.clientHeight=130;
 overflow.update();const primary=overflow.regions[0];assert.equal(primary.up.hidden,false);assert.equal(primary.down.hidden,false);assert.equal(primary.up.disabled,true);assert.equal(primary.down.disabled,false);
 f.items.scrollTop=400;overflow.update();assert.equal(primary.up.disabled,false);assert.equal(primary.down.disabled,true);
 assert.equal(overflow.regions[1].up.hidden,true);f.parent.emit('click');overflow.position();assert.equal(f.panel.popoverOpen,true);assert.equal(f.panel.style.left,'45px');
 f.viewport.clientWidth=390;overflow.position();assert.equal(f.panel.hasAttribute('popover'),false);assert.equal(f.panel.popoverOpen,false);
});
test('destroy detaches listeners and observers',()=>{const f=setup();f.control.installMobile();f.control.installOverflow({items:f.items,footer:f.footer,nav:f.nav});f.control.destroy();assert(f.observers.every(o=>o.disconnected));f.leaf.emit('click');assert.deepEqual(f.navigated,[]);assert.equal(f.toggle.listeners.get('click').size,0)});
test('export has no demo/router/editor dependency and main uses a single controller',()=>{
 const dir=path.resolve(__dirname,'..'),workspace=path.resolve(dir,'../../..'),source=readFileSync(path.join(dir,'navigation.js'),'utf8'),html=readFileSync(path.join(workspace,'top-schrank-ui.html'),'utf8');
 assert(!/demoOrders|actualWorkspacePages|selectMenuPage\(|BreadcrumbPlayground|localStorage/.test(source));assert(html.includes('DesignSystemNavigation.mount'));assert(html.includes('DesignSystemNavigation.renderStructure'));
 assert(!html.includes('function setSubmenuVisible('));assert(!html.includes('function positionScrollableSubmenus(){\n const floating'));
 assert.deepEqual(shell.scrollState(100,300,0),{overflow:true,up:false,down:true});assert.deepEqual(shell.scrollState(100,300,200),{overflow:true,up:true,down:false});
});
test('submenu animation is gated until restoration finishes and respects reduced motion',async()=>{
 const f=setup();const animations=[];f.panel.animate=(frames,options)=>{const animation={frames,options,cancelled:false,cancel(){this.cancelled=true},finished:Promise.resolve()};animations.push(animation);return animation};
 f.parent.emit('click');assert.equal(animations.length,0);f.parent.emit('click');f.root.dataset.motionReady='true';f.parent.emit('click');assert.equal(animations.length,1);assert.equal(animations[0].options.duration,180);await Promise.resolve();assert.equal(f.panel.hidden,false);
 global.matchMedia=()=>({matches:true});f.parent.emit('click');assert.equal(animations.length,1);assert.equal(f.panel.hidden,true);global.matchMedia=()=>({matches:false});
});
test('storage failures do not prevent mounting, selection or mobile navigation',()=>{
 const f=setup();f.control.destroy();const control=shell.mount(f.root,{viewport:f.viewport,renderIcon:()=>'',storage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}});
 assert.doesNotThrow(()=>{control.setCollapsed(true);control.remember();control.select('forms')});assert.equal(f.leaf.getAttribute('aria-current'),'page');control.destroy();
});
test('pointer use clears retained keyboard focus styling without blurring the toggle',()=>{
 const f=setup();f.toggle.focus();
 f.doc.emit('keydown',{key:'Tab'});assert.equal(f.root.dataset.inputModality,'keyboard');
 f.root.emit('pointerdown',{target:f.toggle});assert.equal(f.root.dataset.inputModality,'pointer');assert.equal(f.doc.activeElement,f.toggle);
 f.doc.emit('keydown',{key:' '});assert.equal(f.root.dataset.inputModality,'keyboard');
 f.control.destroy();assert.equal(f.root.dataset.inputModality,undefined);
});

test('fold and unfold retain the open submenu in both presentations',()=>{
 const f=setup();
 f.parent.emit('click');assert.equal(f.panel.hidden,false);
 f.control.setCollapsed(true);
 assert.equal(f.panel.hidden,false);assert.equal(f.control.openFlyout,'components');
 assert.equal(f.parent.getAttribute('aria-expanded'),'true');
 f.control.setCollapsed(false);
 assert.equal(f.panel.hidden,false);assert.equal(f.control.expandedGroups.components,true);
 assert.equal(f.control.openFlyout,null);
});

test('fold fades inline submenu before hiding, unfold fades the retained group in',async()=>{
 const f=setup(),pending=[],motions=[];
 f.parent.animate=()=>{};
 f.panel.animate=(frames,options)=>{motions.push({frames,options});let resolve;const finished=new Promise(done=>resolve=done);pending.push(resolve);return {finished,cancel(){}}};
 f.parent.emit('click');
 f.control.setCollapsed(true);
 assert.equal(f.root.dataset.sidebarFolding,'collapse');assert.equal(f.panel.hidden,false);
 assert.deepEqual(motions[0].frames,[{opacity:1},{opacity:0}]);
 pending.shift()();await Promise.resolve();await Promise.resolve();
 assert.equal(f.panel.hidden,true);assert.equal(f.control.expandedGroups.components,true);
 f.control.setCollapsed(false);assert.equal(f.panel.hidden,false);
 assert.deepEqual(motions[1].frames,[{opacity:0},{opacity:1}]);
 pending.shift()();await Promise.resolve();await Promise.resolve();
 assert.equal(f.panel.hidden,false);f.control.destroy();
});
