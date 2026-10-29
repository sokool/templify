/* DTCG 2025.10 colour-token profile. Independent of DOM, storage and tools. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemTokens=api;})(globalThis,function(){
'use strict';
const specification='https://www.designtokens.org/tr/2025.10/format/';
const copy=value=>JSON.parse(JSON.stringify(value));
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function colour(hex){if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))throw new TypeError('Use a six-digit HEX colour');return {colorSpace:'srgb',components:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),alpha:1};}
function checkColour(value,path){if(!value||value.colorSpace!=='srgb'||!Array.isArray(value.components)||value.components.length!==3||value.components.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||value.alpha!==undefined&&(typeof value.alpha!=='number'||!Number.isFinite(value.alpha)||value.alpha<0||value.alpha>1))throw new TypeError('Invalid sRGB colour: '+path);}
function index(document){
 JSON.stringify(document,(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw new TypeError('Unsafe token key');return value;});
 const tokens=new Map();
 function walk(group,path=[],type){
  if(!group||typeof group!=='object'||Array.isArray(group))throw new TypeError('Invalid token group: '+path.join('.'));
  const inherited=group.$type||type;
  if(own(group,'$value')){if(!path.length)throw new TypeError('Token requires a name');if(inherited!=='color')throw new TypeError('Unsupported token type: '+inherited);if(Object.keys(group).some(k=>!k.startsWith('$')))throw new TypeError('Token cannot also be a group');tokens.set(path.join('.'),{value:group.$value,type:inherited});return;}
  for(const [name,value] of Object.entries(group)){
   if(name.startsWith('$')){if(!['$type','$description','$extensions'].includes(name))throw new TypeError('Unsupported group property: '+name);continue;}
   if(/[.{}]/.test(name)||!name||['__proto__','prototype','constructor'].includes(name))throw new TypeError('Invalid token name: '+name);
   walk(value,[...path,name],inherited);
  }
 }
 walk(document);if(!tokens.size)throw new TypeError('No colour tokens found');
 return tokens;
}
function resolve(document,path){return resolveIndex(index(document),path);}
function resolveIndex(tokens,path,seen=new Set()){
 if(seen.has(path))throw new TypeError('Circular token alias: '+path);
 const token=tokens.get(path);if(!token)throw new TypeError('Missing token: '+path);
 if(typeof token.value==='string'){
  const match=token.value.match(/^\{([^{}]+)\}$/);if(!match)throw new TypeError('Invalid colour alias: '+path);
  return resolveIndex(tokens,match[1],new Set([...seen,path]));
 }
 checkColour(token.value,path);return copy(token.value);
}
function resolveAll(document,paths){const tokens=index(document);return Object.fromEntries(paths.map(path=>[path,resolveIndex(tokens,path)]));}
function validate(document){const tokens=index(document);for(const path of tokens.keys())resolveIndex(tokens,path);return true;}
function cssColour(value){checkColour(value,'CSS');const rgb=value.components.map(n=>Math.round(n*255));return value.alpha===undefined||value.alpha===1?'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase():`rgba(${rgb.join(', ')}, ${value.alpha})`;}
function fromPalettes(palettes){const document={themes:{}};for(const [mode,roles] of Object.entries(palettes)){document.themes[mode]={$type:'color'};for(const [role,hex] of Object.entries(roles))document.themes[mode][role]={$value:colour(hex)};}validate(document);return document;}
function toPalettes(document,bindings){validate(document);const entries=index(document),palettes={};const modes=Object.keys(document.themes||{}).filter(name=>!name.startsWith('$'));if(!modes.length)throw new TypeError('At least one theme is required');for(const mode of modes){if(!/^[a-z][a-z0-9-]*$/.test(mode))throw new TypeError('Invalid theme ID: '+mode);palettes[mode]={};for(const role of Object.keys(bindings))palettes[mode][role]=cssColour(resolveIndex(entries,'themes.'+mode+'.'+role));}return palettes;}
function compileThemes(document,bindings){const palettes=toPalettes(document,bindings);return Object.entries(palettes).map(([theme,roles],i)=>`${i===0?':root,\n':''}[data-ds-theme="${theme}"] {\n${Object.entries(roles).map(([role,value])=>`  ${bindings[role]}: ${value};`).join('\n')}\n}`).join('\n\n')+'\n';}
return Object.freeze({specification,colour,validate,resolve,resolveAll,cssColour,fromPalettes,toPalettes,compileThemes,copy});});
