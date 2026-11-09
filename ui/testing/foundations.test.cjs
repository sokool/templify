const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('shared focus/reset have one source and host pages load the foundation once before components',()=>{
 const primitives=fs.readFileSync(path.join(root,'primitives.css'),'utf8');assert(primitives.includes('.ds-focusable:focus-visible'));
 for(const name of ['breadcrumbs','tabs']){
  const css=fs.readFileSync(path.join(root,'components',name,name+'.css'),'utf8');assert(!css.includes(':focus-visible'));assert(!css.includes('box-sizing:'));assert(!css.includes('@import'));
 }
  for(const file of [path.join(root,'../index.html'),path.join(root,'examples/shared-foundations.html')]){
   const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/href="[^\"]*\/defaults\.css"/g)||[]).length,1);assert.equal((html.match(/href="[^\"]*\/primitives\.css"/g)||[]).length,1);
   const firstComponent=html.search(/href="[^"]*components\//);assert(firstComponent>html.indexOf('defaults.css'));assert(firstComponent>html.indexOf('primitives.css'));
 }
});
