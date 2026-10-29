const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('both manifests declare the same two foundations; export union includes them only once',()=>{
 const files=new Set();
 for(const name of ['breadcrumbs','tabs']){
  const dir=path.join(root,'components',name),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.dependencies.components,[]);assert.deepEqual(manifest.dependencies.packages,[]);
  assert.deepEqual(manifest.dependencies.foundations,['../../foundations/tokens.css','../../foundations/primitives.css']);
  for(const file of manifest.exportFiles){const resolved=path.resolve(dir,file);assert(fs.existsSync(resolved),resolved);files.add(resolved)}
 }
 assert.equal(files.size,6);assert.equal([...files].filter(file=>file.includes('/foundations/')).length,2);
});
test('shared focus/reset have one source and host pages load the foundation once before components',()=>{
 const primitives=fs.readFileSync(path.join(root,'foundations/primitives.css'),'utf8');assert(primitives.includes('.ds-focusable:focus-visible'));
 for(const name of ['breadcrumbs','tabs']){
  const css=fs.readFileSync(path.join(root,'components',name,name+'.css'),'utf8');assert(!css.includes(':focus-visible'));assert(!css.includes('box-sizing:'));assert(!css.includes('@import'));
 }
 for(const file of [path.join(root,'../top-schrank-ui.html'),path.join(root,'examples/shared-foundations.html')]){
  const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/href="[^\"]*foundations\/tokens.css"/g)||[]).length,1);assert.equal((html.match(/href="[^\"]*foundations\/primitives.css"/g)||[]).length,1);
  assert(html.indexOf('foundations/tokens.css')<html.indexOf('components/tabs/tabs.css'));
 }
});
