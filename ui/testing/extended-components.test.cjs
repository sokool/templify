const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
for(const name of ['progress','timeline','process-steps','loading-state','counts-and-summaries','window'])test(name+' has a complete standalone export without example/tool dependencies',()=>{
 const dir=path.join(__dirname,'../components',name),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 assert.equal(typeof require(path.join(dir,manifest.entry)).mount,'function');assert.deepEqual(manifest.dependencies.components,[]);assert.deepEqual(manifest.dependencies.packages,[]);
 for(const file of manifest.exportFiles){assert(fs.existsSync(path.join(dir,file)),file);assert(!file.includes('tool.js'));assert(!file.includes('examples'));}
 const runtime=fs.readFileSync(path.join(dir,manifest.entry),'utf8');assert(!/localStorage|Example[A-Z]|Tool\.create|tools\//.test(runtime));
});
