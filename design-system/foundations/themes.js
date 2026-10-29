/* Optional theme configuration runtime. No component or editor dependencies. */
(function(global){
 'use strict';
 const registry=typeof module==='object'&&module.exports?require('./colour-roles.js'):global.DesignSystemColourRoles;
 const System=typeof module==='object'&&module.exports?require('../tokens/colour-system.js'):global.DesignSystemColourSystem;
 const roles=Object.fromEntries(registry.map(role=>[role.id,role.label]));
 const tokens=Object.fromEntries(registry.map(role=>[role.id,role.css]));
 const Tokens=typeof module==='object'&&module.exports?require('../tokens/tokens.js'):global.DesignSystemTokens;
 const defaultDocument=typeof module==='object'&&module.exports?require('../tokens/defaults.js'):global.DesignSystemDefaultTokens;
 const defaults=Tokens.toPalettes(defaultDocument,tokens);
 Object.values(defaults).forEach(Object.freeze);Object.freeze(defaults);Object.freeze(roles);Object.freeze(tokens);
 const extension='org.topschrank.theme';
 const metadata=(doc,id)=>doc.themes[id].$extensions?.[extension]||{};
 const valid=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 function withRoleDefaults(value){const doc=Tokens.copy(value);for(const [id,group] of Object.entries(doc.themes||{})){if(id.startsWith('$'))continue;for(const role of registry)if(role.fallback&&!Object.hasOwn(group,role.id))group[role.id]={$type:'color',$value:'{themes.'+id+'.'+role.fallback+'}'};}return doc;}
 function checkDocument(doc){
  const palettes=Tokens.toPalettes(doc,tokens);
  if(Object.values(palettes).some(roles=>Object.values(roles).some(colour=>!valid(colour))))throw new TypeError('Palette editor requires opaque sRGB colours');
  for(const id of Object.keys(palettes)){const meta=metadata(doc,id);if(meta.label!==undefined&&(typeof meta.label!=='string'||!meta.label.trim()||meta.label.length>80))throw new TypeError('Invalid theme label');if(meta.base!==undefined&&!Object.hasOwn(defaults,meta.base))throw new TypeError('Invalid base theme');}
  return palettes;
 }
 function create({target,settings,storage,storageKey='design-system-examples-palette',initialTheme='light'}={}){
  let theme=defaults[initialTheme]?initialTheme:'light',document=Tokens.copy(defaultDocument);
  const listeners=new Set();
  // Old standalone consumers may still inject a Web Storage adapter. The example
  // host instead supplies the shared settings service; canonical colours are DTCG.
  try{const saved=settings?{theme:settings.get('layout.theme',initialTheme),tokens:settings.get('tokens',null)}:JSON.parse(storage?.getItem(storageKey)||'null');
   if(saved?.theme)theme=saved.theme;
   if(saved?.tokens){const upgraded=withRoleDefaults(saved.tokens);checkDocument(upgraded);document=upgraded;}
   else if(saved?.palettes){const palettes=JSON.parse(JSON.stringify(defaults));for(const id of Object.keys(defaults))for(const role of Object.keys(roles))if(valid(saved.palettes?.[id]?.[role]))palettes[id][role]=saved.palettes[id][role].toUpperCase();document=Tokens.fromPalettes(palettes);}
  }catch{}
  document=System.normalise(document,registry,defaultDocument);
  function entries(){return Object.keys(Tokens.toPalettes(document,tokens)).map(id=>({id,label:metadata(document,id).label||id[0].toUpperCase()+id.slice(1),base:metadata(document,id).base|| (defaults[id]?id:'light')}))}
  if(!Object.hasOwn(Tokens.toPalettes(document,tokens),theme))theme=entries()[0].id;
  function snapshot(){const ids=entries();return {theme,themes:ids,palettes:Tokens.toPalettes(document,tokens),colours:Object.fromEntries(ids.map(({id})=>[id,System.read(document,id)])),assignments:Object.fromEntries(ids.map(({id})=>[id,System.assignments(document,id,registry)]))}}
  let appliedPrimitives=[];
  function apply(remember=true){const palettes=Tokens.toPalettes(document,tokens);target.dataset.dsThemeBase=entries().find(entry=>entry.id===theme).base;target.dataset.dsTheme=theme;target.dataset.theme=theme;for(const [role,token] of Object.entries(tokens))target.style.setProperty(token,palettes[theme][role]);
   appliedPrimitives.forEach(key=>target.style.removeProperty?.(key));appliedPrimitives=[];
   for(const [category,items] of Object.entries(System.read(document,theme)))for(const item of items){const key='--ds-palette-'+category+'-'+item.id;target.style.setProperty(key,item.value);appliedPrimitives.push(key);}
   const accents=System.read(document,theme).accent;for(let i=0;i<6;i++){const key='--ds-accent-'+(i+1);if(accents[i]){target.style.setProperty(key,accents[i].value);appliedPrimitives.push(key);}}
   if(remember){if(settings)settings.batch(()=>{settings.set('tokens',document);settings.set('layout.theme',theme);});else try{storage?.setItem(storageKey,JSON.stringify({theme,tokens:document}))}catch{}}
   listeners.forEach(fn=>fn(snapshot()));
  }
  apply(false);
  return {getState:snapshot,getTokens:()=>Tokens.copy(document),exportTokens:()=>JSON.stringify(document,null,2),exportCSS:()=>Tokens.compileThemes(document,tokens)+entries().map(({id},index)=>(index===0?':root,\n':'')+'[data-ds-theme="'+id+'"] {\n'+[...Object.entries(System.read(document,id)).flatMap(([category,items])=>items.map(item=>'  --ds-palette-'+category+'-'+item.id+': '+item.value+';')),...System.read(document,id).accent.slice(0,6).map((item,i)=>'  --ds-accent-'+(i+1)+': '+item.value+';')].join('\n')+'\n}').join('\n'),
   importTokens(value){const upgraded=withRoleDefaults(value),imported=checkDocument(upgraded);const next=System.normalise(upgraded,registry,defaultDocument);checkDocument(next);document=next;if(!Object.hasOwn(imported,theme))theme=Object.keys(imported)[0];apply();},
   select(id){if(!Object.hasOwn(document.themes,id))return false;theme=id;apply();return true},
   setColour(id,role,value){if(!Object.hasOwn(document.themes,id)||!Object.hasOwn(tokens,role)||!valid(value))return false;document.themes[id][role]={$type:'color',$value:Tokens.colour(value)};apply();return true},
   addColour(id,category,value='#808080',label='New colour'){const next=Tokens.copy(document),key=System.add(next,id,category,value,label);checkDocument(next);document=next;apply();return key;},
   updateColour(id,category,key,value){if(!valid(value)||!System.categories.includes(category)||!Object.hasOwn(document.themes[id]?.colors?.[category]||{},key))return false;document.themes[id].colors[category][key].$value=Tokens.colour(value);apply();return true;},
   removeColour(id,category,key){const next=Tokens.copy(document);if(!System.remove(next,id,category,key))return false;checkDocument(next);document=next;apply();return true;},
   assign(id,role,category,key){if(!Object.hasOwn(tokens,role))throw new TypeError('Unknown semantic role');const next=Tokens.copy(document);System.assign(next,id,role,category,key);checkDocument(next);document=next;apply();},
   assignMany(id,mapping){const next=Tokens.copy(document);for(const [role,ref] of Object.entries(mapping)){if(!Object.hasOwn(tokens,role))throw new TypeError('Unknown semantic role');System.assign(next,id,role,ref.category,ref.id);}checkDocument(next);document=next;apply();},
   replaceColours(id,values,mapping){const next=Tokens.copy(document);System.replace(next,id,values);for(const [role,ref] of Object.entries(mapping||{})){if(!Object.hasOwn(tokens,role))throw new TypeError('Unknown semantic role');System.assign(next,id,role,ref.category,ref.id);}checkDocument(next);document=next;apply();},
   next(){const ids=entries().map(entry=>entry.id);theme=ids[(ids.indexOf(theme)+1)%ids.length];apply();return theme},
   add(label,source=theme,configuration){
    label=String(label||'').trim();if(!label||label.length>80)throw new TypeError('Enter a theme name (1–80 characters).');
    const list=entries();if(list.some(entry=>entry.label.toLowerCase()===label.toLowerCase()))throw new TypeError('A theme with this name already exists.');
    if(!Object.hasOwn(document.themes,source))throw new TypeError('Choose an existing theme to copy.');
    const slug='theme-'+(label.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'custom');
    let id=slug,n=2;while(Object.hasOwn(document.themes,id))id=slug+'-'+n++;
    const next=Tokens.copy(document);next.themes[id]=JSON.parse(JSON.stringify(document.themes[source]).replaceAll('{themes.'+source+'.','{themes.'+id+'.'));
    next.themes[id].$extensions={[extension]:{label,base:list.find(entry=>entry.id===source).base}};
    if(configuration){System.replace(next,id,configuration.colours);for(const [role,ref] of Object.entries(configuration.assignments||{})){if(!Object.hasOwn(tokens,role))throw new TypeError('Unknown semantic role');System.assign(next,id,role,ref.category,ref.id);}}
    checkDocument(next);document=next;theme=id;apply();return id;
   },
   remove(id){
    const ids=entries().map(entry=>entry.id);if(!ids.includes(id))return false;
    if(ids.length===1)throw new TypeError('Keep at least one theme.');
    // Resolve dependent aliases before deletion so other palettes keep their colours.
    const next=Tokens.copy(document);
    function detach(group){for(const [key,node] of Object.entries(group)){if(key.startsWith('$'))continue;if(node&&typeof node==='object'){if(typeof node.$value==='string'&&node.$value.startsWith('{themes.'+id+'.'))node.$value=Tokens.resolve(document,node.$value.slice(1,-1));else if(!Object.hasOwn(node,'$value'))detach(node);}}}
    detach(next);delete next.themes[id];Tokens.toPalettes(next,tokens);document=next;
    if(theme===id)theme=ids[(ids.indexOf(id)+1)%ids.length];apply();return true;
   },
   reset(id=theme){if(!Object.hasOwn(document.themes,id))return;const meta=metadata(document,id);document.themes[id]=Tokens.fromPalettes({[id]:defaults[id]||defaults[meta.base]||defaults.light}).themes[id];if(meta.label)document.themes[id].$extensions={[extension]:meta};document=System.normalise(document,registry,defaultDocument);apply()},
   subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}};
 }

 const api={defaults,roles,tokens,registry,create};if(typeof module==='object'&&module.exports)module.exports=api;else global.DesignSystemThemes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
