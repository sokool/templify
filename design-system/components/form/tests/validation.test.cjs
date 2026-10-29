const {test}=require('node:test');const assert=require('node:assert/strict');const validation=require('../validation.js');
const control=(flags,extra={})=>({tagName:'INPUT',type:'text',willValidate:true,validity:{valid:false,...flags},...extra});
test('required, format and range messages are descriptive and overridable',()=>{
 assert.equal(validation.message(control({valueMissing:true}),{label:'Full name',messages:{required:'Enter your full name.'}}),'Enter your full name.');
 assert.equal(validation.message(control({typeMismatch:true},{type:'email',multiple:true})),'Enter a valid email address for each recipient.');
 assert.equal(validation.message(control({patternMismatch:true}),{patternHint:'Use PRJ-001.'}),'Use PRJ-001.');
 assert.equal(validation.message(control({rangeUnderflow:true},{min:'30'})),'Use a value of 30 or more.');
 assert.equal(validation.message(control({rangeOverflow:true},{max:'1000'})),'Use a value of 1000 or less.');
 assert.equal(validation.message(control({stepMismatch:true},{step:'5'})),'Use increments of 5.');
});
test('disabled, barred and valid controls have no validation errors',()=>{
 assert.equal(validation.message(control({valueMissing:true},{disabled:true})), '');
 assert.equal(validation.message(control({valueMissing:true},{willValidate:false})), '');
 assert.equal(validation.message(control({valid:true})), '');
});
test('native custom validity and text lengths are retained',()=>{
 assert.equal(validation.message(control({customError:true},{validationMessage:'Server rejected this value.'})),'Server rejected this value.');
 assert.equal(validation.message(control({tooShort:true},{minLength:8})),'Enter at least 8 characters.');
 assert.equal(validation.message(control({tooLong:true},{maxLength:240})),'Use no more than 240 characters.');
});
test('required group counts enabled selections only',()=>{
 const options={required:true,label:'service',messages:{required:'Select at least one service.'}};
 assert.equal(validation.groupMessage([{checked:true,disabled:true},{checked:false}],options),'Select at least one service.');
 assert.equal(validation.groupMessage([{checked:true},{checked:false}],options),'');
 assert.equal(validation.groupMessage([{checked:false,disabled:true}],options),'');
 assert.equal(validation.groupMessage([{checked:false}],{required:false}),'');
});
