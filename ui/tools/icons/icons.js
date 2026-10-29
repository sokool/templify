/* Catalogue tool, not a component dependency. The asset library knows none of this UI. */
(function(global){
'use strict';
function mount(element,{icons=global.DesignSystemIcons,categories=global.ExampleIconCategories,tags=global.ExampleIconTags||{},controls,copy,onCopied=()=>{}}={}){
 const document=element.ownerDocument;
 element.classList.add('example-icon-catalogue');
 if(!controls){
  element.innerHTML='<p class="example-lead">Find an icon, adjust its preview size, or click to copy its name.</p><div class="example-icon-tools"><label class="example-icon-search"><span>Find an icon</span><input type="search" placeholder="Search by name or context…" autocomplete="off"></label><label class="example-icon-size">Icon size <input type="range" min="16" max="40" step="2" value="20"><output>20 px</output></label><span class="example-icon-count" role="status" aria-live="polite"></span></div><div class="example-icon-groups"></div><p class="example-icon-status" role="status" aria-live="polite"></p><section class="example-glyphs"><h2>Keyboard glyphs</h2><p>Text symbols for shortcuts and instructions; they inherit the interface font.</p><div><kbd>Ctrl</kbd><kbd>⌘</kbd><kbd>⌥</kbd><kbd>⇧</kbd><kbd>Esc</kbd><kbd>↵</kbd><kbd>←</kbd><kbd>→</kbd></div></section>';
  controls={search:element.querySelector('input[type=search]'),size:element.querySelector('input[type=range]'),output:element.querySelector('output'),count:element.querySelector('.example-icon-count'),groups:element.querySelector('.example-icon-groups'),status:element.querySelector('.example-icon-status')};
 }
 const {search,size,output,count,groups,status}=controls;
 const write=copy|| (value=>global.navigator.clipboard.writeText(value));
 let disposed=false;
 function render(){
  const needle=search.value.trim().toLowerCase();let found=0;groups.replaceChildren();
  categories.forEach(([category,names])=>{
   const matches=names.filter(name=>icons.has(name)&&(name+' '+category+' '+(tags[name]||[]).join(' ')).toLowerCase().includes(needle));if(!matches.length)return;
   const section=document.createElement('section');section.className='icon-category';
   const heading=document.createElement('h3');heading.textContent=category;const total=document.createElement('span');total.className='icon-category-count';total.textContent=' · '+matches.length+' / '+names.length;heading.append(total);
   const grid=document.createElement('div');grid.className='icon-grid';
   matches.forEach(name=>{
    const button=document.createElement('button');button.type='button';button.className='icon-tile';button.dataset.iconName=name;button.dataset.tooltip=name;button.setAttribute('aria-label','Copy icon name: '+name);button.innerHTML=icons.svg(name);
    // The shared Tooltip handles the label outside the tile's layout.
    grid.append(button);found++;
   });section.append(heading,grid);groups.append(section);
  });
  count.textContent=found+' icons';
  if(!found){const empty=document.createElement('p');empty.className='example-icon-empty';empty.textContent='No matching icons. Try another name or context.';groups.append(empty)}
 }
 function resize(){const pixels=Math.max(16,Math.min(40,Number(size.value)||20));element.style.setProperty('--catalog-icon-size',pixels+'px');element.style.setProperty('--catalog-tile-size',(pixels+24)+'px');size.value=pixels;output.value=pixels+' px';output.textContent=pixels+' px'}
 async function onClick(event){const button=event.target.closest('[data-icon-name]');if(!button||!groups.contains(button))return;const name=button.dataset.iconName;try{await write(name);if(disposed)return;if(status)status.textContent='Copied: '+name;onCopied('Copied icon name: '+name)}catch{if(disposed)return;if(status)status.textContent='Icon name: '+name;onCopied('Icon name: '+name)}}
 search.addEventListener('input',render);size.addEventListener('input',resize);groups.addEventListener('click',onClick);resize();render();
 return {destroy(){disposed=true;search.removeEventListener('input',render);size.removeEventListener('input',resize);groups.removeEventListener('click',onClick)}};
}
global.ExampleIcons={mount};
})(typeof globalThis!=='undefined'?globalThis:this);
