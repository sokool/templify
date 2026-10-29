/* Kanban layout state. No DOM, card content, routing or persistence dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemKanbanModel=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function normalize(columns,items){
  const ids=new Set(),itemIds=new Set();
  const lanes=columns.map(column=>{const id=String(column.id);if(ids.has(id))throw new TypeError('Duplicate column id: '+id);ids.add(id);return {...column,id}});
  const cards=items.map(item=>{const id=String(item.id),columnId=String(item.columnId);if(itemIds.has(id))throw new TypeError('Duplicate item id: '+id);if(!ids.has(columnId))throw new TypeError('Unknown column id: '+columnId);itemIds.add(id);return {...item,id,columnId}});
  return {columns:lanes,items:cards};
 }
 function move(items,id,columnId,beforeId=null){
  id=String(id);columnId=String(columnId);beforeId=beforeId===null?null:String(beforeId);
  const item=items.find(item=>item.id===id);if(!item)return null;
  if(beforeId===id)return item.columnId===columnId?items.slice():null;
  const before=beforeId===null?null:items.find(item=>item.id===beforeId&&item.columnId===columnId);if(beforeId!==null&&!before)return null;
  const next=items.filter(item=>item.id!==id),index=before?next.findIndex(item=>item.id===before.id):next.length;
  next.splice(index,0,{...item,columnId});return next;
 }
 function deviceFor(width,device='auto'){return device==='mobile'||width<=620?'mobile':device==='tablet'||width<=1024?'tablet':'desktop'}
 function layoutFor(width,mode){const gap=mode==='tablet'?8:5,padding=mode==='mobile'?20:12;return {gap,padding,columnsPerPage:mode==='tablet'?3:1,columnWidth:mode==='mobile'?Math.max(1,width-2*padding):mode==='tablet'?Math.max(1,(width-2*padding-2*gap)/3):240}}
 return Object.freeze({normalize,move,deviceFor,layoutFor});
});
