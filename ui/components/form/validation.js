/* Native validity adapter. No DOM creation, theme, storage or playground dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DesignSystemFormValidation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function message(control, options={}) {
 if(control.disabled || control.willValidate===false)return '';
 const v=control.validity;if(!v||v.valid)return '';
 const label=options.label||'this field', errors=options.messages||{};
 if(v.customError)return errors.customError||control.validationMessage;
 if(v.valueMissing)return errors.required||((control.type==='checkbox')?'Confirm '+label.toLowerCase()+'.':(control.tagName==='SELECT')?'Choose '+label.toLowerCase()+'.':'Enter '+label.toLowerCase()+'.');
 if(v.typeMismatch)return errors.typeMismatch||(control.type==='email'?'Enter a valid email address'+(control.multiple?' for each recipient.':'.'):'Enter a complete URL, for example https://example.com.');
 if(v.badInput)return errors.badInput||'Enter a valid '+label.toLowerCase()+'.';
 if(v.rangeUnderflow)return errors.min||'Use a value of '+control.min+' or more.';
 if(v.rangeOverflow)return errors.max||'Use a value of '+control.max+' or less.';
 if(v.stepMismatch)return errors.step||'Use increments of '+control.step+'.';
 if(v.tooShort)return errors.minlength||'Enter at least '+control.minLength+' characters.';
 if(v.tooLong)return errors.maxlength||'Use no more than '+control.maxLength+' characters.';
 if(v.patternMismatch)return errors.pattern||options.patternHint||'Use the requested format for '+label.toLowerCase()+'.';
 return control.validationMessage||'Check '+label.toLowerCase()+'.';
}
function groupMessage(controls,options={}) {
 const available=controls.filter(control=>!control.disabled&&!control.matches?.(':disabled'));
 return options.required&&available.length&&!available.some(control=>control.checked)?(options.messages?.required||'Select at least one '+(options.label||'option').toLowerCase()+'.'):'';
}
return Object.freeze({message,groupMessage});
});
