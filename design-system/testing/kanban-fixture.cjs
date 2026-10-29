// Geometry/pointer fixture for module tests; not a browser-layout substitute.
const {Document}=require('./dom-fixture.cjs');
function createFixture(width=1200){
 const document=new Document(),baseCreate=document.createElement.bind(document);
 document.createElement=function(tag){
  const node=baseCreate(tag),matches=node.matches.bind(node);
  node.matches=selector=>selector==='*'?true:selector===':popover-open'?Boolean(node.popoverOpen):selector==='button:not(:disabled)'?node.tagName==='BUTTON'&&!node.disabled:matches(selector);
  Object.defineProperties(node,{firstElementChild:{get:()=>node.children[0]},isConnected:{get:()=>document.contains(node)}});
  node.clientWidth=width;node.scrollWidth=1700;node.scrollLeft=0;
  node.getBoundingClientRect=()=>({left:100,top:200,right:340,bottom:480,width:240,height:280});
  node.insertBefore=(child,before)=>{child.remove();child.parentNode=node;node.children.splice(node.children.indexOf(before),0,child);};
  node.setPointerCapture=id=>node.capture=id;node.hasPointerCapture=id=>node.capture===id;node.releasePointerCapture=()=>node.capture=null;
  node.showPopover=()=>node.popoverOpen=true;node.hidePopover=()=>node.popoverOpen=false;
  node.animate=(frames,options)=>{node.animation={frames,options};};
  node.scrollTo=({left})=>node.scrollLeft=left;
  node.cloneNode=function(deep){const copy=document.createElement(tag);copy.className=node.className;copy.dataset={...node.dataset};copy.attributes={...node.attributes};copy._text=node._text;for(const key of node.style.keys())copy.style.setProperty(key,node.style.get(key));if(deep)node.children.forEach(child=>copy.append(child.cloneNode(true)));return copy;};
  return node;
 };
 document.body=document.createElement('body');document.append(document.body);
 const window=document.createElement('window'),frames=new Map();let sequence=0;
 Object.assign(window,{innerWidth:width,innerHeight:800,performance:{now:()=>0},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),scrollBy(){},getComputedStyle:()=>({length:0})});
 document.defaultView=window;document.elementFromPoint=()=>document.hit;
 const element=document.createElement('section');document.body.append(element);
 return {document,window,element,frames};
}
module.exports={createFixture};
