/* Product-specific copy belongs to the playground, not to the Tabs component. */
(function(root){
  root.TabsPlayground=Object.freeze({mount(element,component){return component.mount(element,{
    label:'Product details',value:'materials',items:[
      {id:'materials',label:'Materials',content:'Light surfaces and cool blues create a calm backdrop for the product.'},
      {id:'details',label:'Details',content:'Navy details and subtle colour accents bring the composition together.'},
      {id:'service',label:'Service',content:'Example process: consultation, measurement, design and installation.'}
    ]
  })}});
})(globalThis);
