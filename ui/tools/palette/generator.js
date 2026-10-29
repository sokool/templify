/* Palette editor algorithms. chroma.js is tooling-only, never a component dependency. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./vendor/chroma.min.js'):root.chroma);if(typeof module==='object'&&module.exports)module.exports=api;else root.PaletteGenerator=api;})(globalThis,function(chroma){
'use strict';
function seeds(value){const items=Array.isArray(value)?value:String(value||'').split(/[\s,;]+/).filter(Boolean);if(!items.length||items.some(v=>!/^#[a-f0-9]{6}$/i.test(v)))throw new TypeError('Enter one or more six-digit HEX colours, separated by commas.');return [...new Set(items.map(v=>v.toUpperCase()))];}
function count(value,min){const n=Number(value);if(!Number.isInteger(n)||n<min||n>128)throw new TypeError('Generator count must be '+min+'–128.');return n;}
function generate({seeds:input,accents=6,greys=10}={}){
 const anchors=seeds(input),a=count(accents,0),g=count(greys,2),average=chroma.average(anchors,'oklab'),hue=average.get('oklch.h')||0;
 const colours={brand:anchors.map((value,i)=>({label:'Brand '+(i+1),value})),accent:[],greys:[]};
 for(let i=0;i<a;i++){const base=chroma(anchors[i%anchors.length]),h=(base.get('oklch.h')||hue)+(Math.floor(i/anchors.length)+1)*137.508;colours.accent.push({label:'Accent '+(i+1),value:chroma.oklch(.69,.13,h).hex().toUpperCase()});}
 const ramp=chroma.scale([chroma.oklch(.985,.008,hue),chroma.oklch(.09,.016,hue)]).mode('oklab').colors(g);
 colours.greys=ramp.map((value,i)=>({label:'Grey '+String(Math.round(i/(g-1)*1000)).padStart(3,'0'),value:value.toUpperCase()}));return colours;
}
function asEntries(colours){return Object.fromEntries(Object.entries(colours).map(([category,items])=>[category,items.map((item,i)=>({...item,id:item.id||'colour-'+(i+1),category}))]));}
function autoAssign(colours,base,registry){
 const groups=asEntries(colours),greys=[...(groups.greys||[])].sort((a,b)=>chroma(a.value).luminance()-chroma(b.value).luminance()),all=Object.values(groups).flat(),dark=base!=='light';
 if(!all.length)throw new TypeError('Add a palette colour first.');
 const grey=f=>greys[Math.round((greys.length-1)*f)]||all[0];const background=grey(dark?0:1);
 const best=(pool,bg)=>[...pool].sort((a,b)=>chroma.contrast(b.value,bg)-chroma.contrast(a.value,bg))[0]||all[0];
 const fractions=dark?{page:0,panel:.1,lane:.15,laneHeader:.2,selection:.25,hover:.18,border:.5,divider:.25,scrollIndicator:.6,scrollBorder:.75,muted:.75}:{page:.95,panel:1,lane:.9,laneHeader:.95,selection:.85,hover:.9,border:.5,divider:.8,scrollIndicator:.6,scrollBorder:.45,muted:.3};
 const result={};for(const role of registry){if(role.fallback&&result[role.fallback]){result[role.id]={...result[role.fallback]};continue;}let chosen;
  if(role.id==='text')chosen=best([...(groups.brand||[]),...greys],background.value);
  else if(role.id==='accent')chosen=(groups.brand||[]).find(c=>chroma.contrast(c.value,background.value)>=3)||best(groups.brand?.length?groups.brand:all,background.value);
  else if(role.id==='error'){const accents=groups.accent?.length?groups.accent:all;chosen=[...accents].sort((a,b)=>chroma.distance(a.value,'#D43A4F','lab')-chroma.distance(b.value,'#D43A4F','lab')).find(c=>chroma.contrast(c.value,background.value)>=4.5)||best(accents,background.value);}
  else if(fractions[role.id]!==undefined){chosen=grey(fractions[role.id]);if(role.id==='muted'&&chroma.contrast(chosen.value,background.value)<4.5)chosen=best(greys,background.value);}
  else chosen=(groups[role.category]||[])[0]||all[0];
  result[role.id]={category:chosen.category,id:chosen.id};
 }return result;
}
function contrast(foreground,background){if(!chroma.valid(foreground)||!chroma.valid(background))throw new TypeError('Choose valid colours.');const ratio=chroma.contrast(foreground,background);return {ratio,aa:ratio>=4.5,aaa:ratio>=7,large:ratio>=3};}
return Object.freeze({generate,autoAssign,contrast,seeds});});
