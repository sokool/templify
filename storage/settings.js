/* Injectable JSON settings store. No DOM, component, tool or localStorage globals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemSettings=api;})(globalThis,function(){'use strict';
const schema='design-system-workspace',version=2;
function clone(value){const text=JSON.stringify(value,(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw new TypeError('Reserved settings key');if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint'||value===undefined||typeof value==='number'&&!Number.isFinite(value))throw new TypeError('Settings must be JSON data');return value;});return JSON.parse(text);}
function parts(path){const keys=Array.isArray(path)?path:String(path).split('.');if(keys.some(k=>!k||['__proto__','prototype','constructor'].includes(k)))throw new TypeError('Invalid settings path');return keys;}
function valid(doc){return doc?.schema===schema&&[1,version].includes(doc.version)&&doc.data&&typeof doc.data==='object'&&!Array.isArray(doc.data);}
function create({storage,key='design-system-workspace',onError=()=>{}}={}){
 let data={},readOnly=false,lastError=null,batchDepth=0,dirty=false;const listeners=new Set();
 function error(e){lastError=String(e.message||e);onError(e);}
 try{const raw=storage?.getItem(key);if(raw){const doc=clone(JSON.parse(raw));if(!valid(doc)){readOnly=true;error(new Error('Unsupported settings document; existing storage preserved'));}else data=doc.data;}}catch(e){error(e);}
 const snapshot=()=>({schema,version,data:clone(data)});
 function flush(){if(!dirty||batchDepth)return;dirty=false;if(!readOnly){try{storage?.setItem(key,JSON.stringify(snapshot()));lastError=null;}catch(e){error(e);}}listeners.forEach(fn=>fn(snapshot()));}
 function get(path,fallback=null){let value=data;for(const key of parts(path)){if(!value||!Object.hasOwn(value,key))return clone(fallback);value=value[key];}return clone(value);}
 function has(path){let value=data;for(const key of parts(path)){if(!value||!Object.hasOwn(value,key))return false;value=value[key];}return true;}
 function set(path,value){const keys=parts(path),copy=clone(value);let node=data;for(const key of keys.slice(0,-1)){if(!node[key]||typeof node[key]!=='object'||Array.isArray(node[key]))node[key]={};node=node[key];}node[keys.at(-1)]=copy;dirty=true;flush();}
 function batch(fn){batchDepth++;try{return fn();}finally{batchDepth--;flush();}}
 function scope(path){const prefix=parts(path);return {get:(key,fallback=null)=>get([...prefix,...parts(key)],fallback),has:key=>has([...prefix,...parts(key)]),set:(key,value)=>set([...prefix,...parts(key)],value),patch(values){batch(()=>Object.entries(values).forEach(([key,value])=>set([...prefix,key],value)));},defaults(values){batch(()=>Object.entries(values).forEach(([key,value])=>{const path=[...prefix,key];if(!has(path))set(path,value);}));},snapshot:()=>get(prefix,{}),subscribe(fn){return subscribe(()=>fn(get(prefix,{})));}};}
 function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
 // Bridge existing injected Web Storage interfaces, while canonical data stays typed.
 function adapter(routes){const route=key=>{if(!Object.hasOwn(routes,key))throw new Error('Unregistered settings key: '+key);return typeof routes[key]==='string'?{path:routes[key],format:'json'}:routes[key];};return {getItem(key){const r=route(key);if(!has(r.path))return null;const value=get(r.path);return r.format==='text'?String(value):JSON.stringify(value);},setItem(key,value){const r=route(key);set(r.path,r.format==='text'?String(value):JSON.parse(value));},removeItem(key){const r=route(key),keys=parts(r.path);let node=data;for(const key of keys.slice(0,-1))node=node?.[key];if(node&&Object.hasOwn(node,keys.at(-1))){delete node[keys.at(-1)];dirty=true;flush();}}};}
 function migrateLegacy(routes){batch(()=>{for(const [legacy,definition] of Object.entries(routes)){const r=typeof definition==='string'?{path:definition,format:'json'}:definition;if(has(r.path))continue;try{const raw=storage?.getItem(legacy);if(raw!==null&&raw!==undefined)set(r.path,r.format==='text'?raw:JSON.parse(raw));}catch(e){error(e);}}});}
 return {get,set,has,scope,batch,snapshot,subscribe,adapter,migrateLegacy,flush(){dirty=true;flush();},exportTemplate(){return {schema:'design-system-template',version,layout:get('layout',{}),components:get('components',{}),tokens:get('tokens',{})};},exportJSON({template=true}={}){return JSON.stringify(template?this.exportTemplate():snapshot(),null,2);},get status(){return {readOnly,error:lastError,persistent:Boolean(storage)&&!readOnly&&!lastError};}};
}
return Object.freeze({create,schema,version});});
