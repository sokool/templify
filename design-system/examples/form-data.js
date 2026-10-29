/* Demonstration data only. Every native field is rendered by the shared Form module. */
(function(root){'use strict';
const projectOptions=[{value:'',label:'Choose a project…'},{value:'wardrobe',label:'Made-to-measure wardrobe'},{value:'dressing-room',label:'Dressing room'},{value:'alcove',label:'Alcove cabinetry'},{value:'unavailable',label:'Option unavailable',disabled:true}];
const groups=[
 {id:'text',label:'Text & contact',description:'One field frame, floating fine-line labels and a consistent font. The project-name input intentionally has no visible label.',fields:[
  {name:'full_name',label:'Full name',attrs:{type:'text',required:true,minlength:2,maxlength:80,placeholder:'e.g. Anna Kowalska',autocomplete:'name'},messages:{required:'Enter your full name.'}},
  {name:'project_name',accessibleLabel:'Project name',attrs:{required:true,placeholder:'Enter a project name…'},messages:{required:'Enter a project name.'}},
  {name:'password',label:'Password',type:'password',attrs:{minlength:8,autocomplete:'new-password',placeholder:'At least 8 characters'}},
  {name:'email',label:'Email address',type:'email',attrs:{required:true,autocomplete:'email',placeholder:'anna@example.com'},messages:{required:'Enter your email address.'}},
  {name:'recipients',label:'Multiple email addresses',type:'email',attrs:{multiple:true,placeholder:'anna@example.com, piotr@example.com'},hint:'Separate addresses with commas.'},
  {name:'phone',label:'Telephone',type:'tel',attrs:{autocomplete:'tel',placeholder:'+48 123 456 789',pattern:'[+0-9 ()-]{7,20}'},patternHint:'Use 7–20 digits, spaces, +, ( ) or -.'},
  {name:'website',label:'Website',type:'url',attrs:{placeholder:'https://example.com',autocomplete:'url'}},
  {name:'search',label:'Search',type:'search',attrs:{placeholder:'Search by name…',autocomplete:'off'}},
  {name:'note',kind:'textarea',label:'Project note',fullWidth:true,attrs:{rows:3,cols:40,maxlength:240,required:true,placeholder:'Materials, dimensions, requirements…'},messages:{required:'Enter a project note.'}}
 ]},
 {id:'numbers',label:'Numbers & range',description:'Native min / max / step constraints, range output and the existing quantity stepper.',fields:[
  {name:'width',label:'Cabinet width',type:'number',unit:'cm',attrs:{value:240,min:30,max:1000,step:1,required:true},messages:{required:'Enter cabinet width.'}},
  {name:'budget',label:'Budget',type:'number',unit:'PLN',attrs:{value:14200,min:0,max:1000000,step:100,required:true},messages:{required:'Enter a budget.'}},
  {name:'shelves',label:'Number of shelves',type:'range',attrs:{value:4,min:1,max:10,step:1}},
  {name:'quantity',label:'Quantity',type:'number',quantity:true,attrs:{value:1,min:1,max:99,step:1,required:true}}
 ]},
 {id:'dates',label:'Dates & time',description:'Native pickers remain native. Month and week fall back to text when the browser has no dedicated picker.',fields:[
  {name:'measurement_date',label:'Measurement date',type:'date',attrs:{required:true,min:'2026-01-01',max:'2030-12-31',value:'2026-11-04'},messages:{required:'Choose a measurement date.'}},
  {name:'measurement_time',label:'Time',type:'time',attrs:{required:true,min:'08:00',max:'18:00',step:900,value:'10:00'},messages:{required:'Choose a measurement time.'}},
  {name:'appointment',label:'Date and time',type:'datetime-local',attrs:{min:'2026-01-01T08:00',max:'2030-12-31T18:00'}},
  {name:'production_month',label:'Production month',type:'month',attrs:{min:'2026-01',max:'2030-12'}},
  {name:'installation_week',label:'Installation week',type:'week',attrs:{min:'2026-W01',max:'2030-W52'}}
 ]},
 {id:'choices',label:'Checkboxes, radios & switches',description:'Groups use a fieldset and legend. A required checkbox group needs at least one enabled option.',fields:[
  {name:'services',kind:'checkbox-group',label:'Service scope',required:true,messages:{required:'Select at least one service.'},options:[{label:'Measurement',value:'measurement',checked:true},{label:'Transport',value:'transport'},{label:'Option unavailable',value:'unavailable',disabled:true}]},
  {name:'contact_channel',kind:'radio-group',label:'Preferred contact',required:true,options:[{label:'Email',value:'email',checked:true},{label:'Phone',value:'phone'}]},
  {name:'checklist',kind:'checkbox-group',label:'Project checklist',options:[{label:'Customer brief',value:'brief',checked:true},{label:'Alcove dimensions',value:'dimensions',checked:true},{label:'Material selection',value:'material'},{label:'Quote approval',value:'approval'}]},
  {name:'notifications',label:'Notifications',type:'checkbox',switch:true,text:'Notify me about stage changes',attrs:{required:true,checked:true,value:'enabled'},messages:{required:'Enable notifications.'}},
  {name:'reply',label:'Reply confirmation',type:'checkbox',text:'I would like a reply at this email address.',attrs:{required:true,value:'yes'},messages:{required:'Confirm that you would like a reply.'}}
 ]},
 {id:'lists',label:'Selects & suggestions',description:'One shared single-select with divided rows. Multiple select keeps the native listbox and keyboard selection; datalist suggests values without restricting free text.',fields:[
  {name:'project',label:'What are you planning?',kind:'select',attrs:{required:true},options:projectOptions,messages:{required:'Choose what you are planning.'}},
  {name:'finish',label:'Grouped single select',kind:'select',options:[{value:'',label:'Choose a finish…'},{label:'Wood',options:[{value:'oak',label:'Natural oak'},{value:'walnut',label:'Walnut'}]},{label:'Paint',disabled:true,options:[{value:'white',label:'Unavailable white'}]}]},
  {name:'materials',label:'Materials · multiple',kind:'select',attrs:{multiple:true,size:6},options:[{label:'Wood',options:[{value:'oak',label:'Oak',selected:true},{value:'walnut',label:'Walnut'}]},{label:'Metal',options:[{value:'steel',label:'Steel'},{value:'brass',label:'Brass',disabled:true}]}],hint:'Use Ctrl / ⌘ or Shift to select multiple options.'},
  {name:'city',label:'City · datalist',attrs:{placeholder:'Type or choose a city…'},suggestions:['Berlin','Cottbus','Frankfurt (Oder)','Guben','Spremberg']}
 ]},
 {id:'files',label:'Files, colour & hidden values',description:'Files use the system chooser. Hidden values participate in FormData without rendering a field.',fields:[
  {name:'attachment',label:'Single attachment',type:'file',attrs:{accept:'.pdf,.txt,image/*'}},
  {name:'attachments',label:'Multiple attachments',type:'file',attrs:{accept:'.pdf,image/*',multiple:true},hint:'Drawing, photo or document.'},
  {name:'accent',label:'Colour',type:'color',attrs:{value:'#22447f'}},
  {name:'source',type:'hidden',attrs:{value:'form-playground'}}
 ]},
 {id:'states',label:'States & attributes',description:'Disabled fields are excluded from submission. Read-only fields are included. Name, value, autocomplete, pattern and length constraints stay on the native element.',fields:[
  {name:'disabled_example',label:'Disabled',attrs:{disabled:true,value:'Not submitted'}},
  {name:'readonly_example',label:'Read only',attrs:{readonly:true,value:'Included in FormData'}},
  {name:'reference',label:'Reference · pattern',attrs:{pattern:'PRJ-[0-9]{3}',placeholder:'PRJ-001',maxlength:7},patternHint:'Use PRJ followed by a dash and three digits, e.g. PRJ-001.'}
 ]}
];
root.ExampleFormData={groups,projectOptions};
})(globalThis);
