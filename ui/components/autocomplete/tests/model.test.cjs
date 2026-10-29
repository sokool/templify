const {test}=require('node:test'),assert=require('node:assert/strict');
const {filterItems,normalize}=require('../autocomplete.js');
test('filters labels, details, categories and supplied search keywords',()=>{
 const items=normalize([{id:1,name:'Natural oak',detail:'MAT-014',group:'Materials'},{id:2,label:'Anna',keywords:'customer Cottbus'}]);
 assert.deepEqual(filterItems(items,' OAK ').map(i=>i.id),['1']);
 for(const query of ['mat-014','materials'])assert.equal(filterItems(items,query)[0].id,'1');
 assert.equal(filterItems(items,'cottbus')[0].label,'Anna');assert.equal(filterItems(items,'unmatched').length,0);
});
test('normalization rejects duplicate and missing IDs without changing input data',()=>{
 assert.throws(()=>normalize([{id:'x'},{id:'x'}]),/unique/);assert.throws(()=>normalize([{label:'No ID'}]),/unique/);
 const input=[{id:0,name:'Zero'}];assert.equal(normalize(input)[0].id,'0');assert.equal(input[0].label,undefined);
});
