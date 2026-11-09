const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
for(const name of ['progress','timeline','process-steps','loading-state','counts-and-summaries','window'])test(name+' has a complete standalone export without example/tool dependencies',()=>{
  const dir=path.join(__dirname,'../components',name);
  assert.equal(typeof require(path.join(dir,name+'.js')).mount,'function');
  for(const extension of ['html','css','js'])assert(fs.existsSync(path.join(dir,name+'.'+extension)));
  const runtime=fs.readFileSync(path.join(dir,name+'.js'),'utf8');assert(!/localStorage|Example[A-Z]|Tool\.create|tools\//.test(runtime));
});
