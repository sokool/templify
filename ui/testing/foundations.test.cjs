const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('both manifests declare the same two foundations; export union includes them only once',()=>{
 const files=new Set();
 for(const name of ['breadcrumbs','tabs']){
  const dir=path.join(root,'components',name),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.dependencies.components,[]);assert.deepEqual(manifest.dependencies.packages,[]);
   assert.deepEqual(manifest.dependencies.foundations,['../../defaults.css','../../primitives.css']);
  for(const file of manifest.exportFiles){const resolved=path.resolve(dir,file);assert(fs.existsSync(resolved),resolved);files.add(resolved)}
 }
  assert.equal(files.size,6);assert.equal([...files].filter(file=>path.dirname(file)===root).length,2);
});
test('shared focus/reset have one source and host pages load the foundation once before components',()=>{
 const primitives=fs.readFileSync(path.join(root,'primitives.css'),'utf8');assert(primitives.includes('.ds-focusable:focus-visible'));
 for(const name of ['breadcrumbs','tabs']){
  const css=fs.readFileSync(path.join(root,'components',name,name+'.css'),'utf8');assert(!css.includes(':focus-visible'));assert(!css.includes('box-sizing:'));assert(!css.includes('@import'));
 }
  for(const file of [path.join(root,'../top-schrank-ui.html'),path.join(root,'../app/index.html'),path.join(root,'examples/shared-foundations.html')]){
   const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/href="[^\"]*\/defaults\.css"/g)||[]).length,1);assert.equal((html.match(/href="[^\"]*\/primitives\.css"/g)||[]).length,1);
   const firstComponent=html.search(/href="[^"]*components\//);assert(firstComponent>html.indexOf('defaults.css'));assert(firstComponent>html.indexOf('primitives.css'));
 }
});
