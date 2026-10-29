// Small DOM fixture: only browser primitives exercised by the component tests.
class Style extends Map {
  setProperty(name,value){this.set(name,String(value))}
  removeProperty(name){this.delete(name)}
  getPropertyValue(name){return this.get(name)||''}
  [Symbol.iterator](){return this.keys()}
}
class Node {
  constructor(tag,document){this.nodeType=1;this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.dataset={};this.attributes={};this.style=new Style();this.listeners=new Map();this.open=false;this.className='';this._text='';this.classList={add:(name)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),name])].join(' ')},remove:name=>{this.className=this.className.split(' ').filter(c=>c!==name).join(' ')}}}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('')}
  set textContent(value){this._text=String(value);this.children=[]}
  append(...children){for(const child of children){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(node=>node!==child);child.parentNode=this;this.children.push(child)}}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null}}
  prepend(...children){for(const child of children)child.parentNode=this;this.children.unshift(...children)}
  replaceChildren(...children){this.children.forEach(child=>child.parentNode=null);this.children=[];this._text='';this.append(...children)}
  setAttribute(name,value){this.attributes[name]=String(value)}
  getAttribute(name){return this.attributes[name]??null}
  removeAttribute(name){delete this.attributes[name];if(name==='data-hover')delete this.dataset.hover}
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback)}
  removeEventListener(type,callback){this.listeners.get(type)?.delete(callback)}
  emit(type,event={}){for(const callback of this.listeners.get(type)||[])callback({type,...event})}
  contains(node){return node===this||this.children.some(child=>child.contains(node))}
  matches(selector){if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector==='a[data-breadcrumb-index]')return this.tagName==='A'&&this.dataset.breadcrumbIndex!==undefined;if(selector==='[data-tab-index]')return this.dataset.tabIndex!==undefined;if(selector.startsWith('[role='))return this.getAttribute('role')===selector.slice(6,-1);if(selector==='[aria-current=page]')return this.getAttribute('aria-current')==='page';return this.tagName===selector.toUpperCase()}
  closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)||null}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)])}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  focus(){this.ownerDocument.activeElement=this}
}
class Document extends Node {
  constructor(){super('document');this.ownerDocument=this}
  createElement(tag){return new Node(tag,this)}
}
module.exports={Document};
