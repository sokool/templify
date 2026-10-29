/* Development-only configurator. Excluded from the Surface runtime and export. */
(function(global){
 function create({document,storage,appearance=global.ExampleAppearance}={}){
  const api=global.DesignSystemSurface;
  return appearance.create({document,storage,storageKey:'design-system-examples-surface',defaults:api.defaults,tokens:api.tokens,colours:['bg','text','border'],controls:[
   {key:'radius',label:'Corner radius',options:[0,6,12,16,20,28].map(n=>[n,n+' px']),format:v=>v+'px'},
   {key:'padding',label:'Padding',options:[8,12,16,20,25,32].map(n=>[n,n+' px']),format:v=>v+'px'},
   {key:'borderWidth',label:'Border width',options:[0,1,2].map(n=>[n,n+' px']),format:v=>v+'px'},
   {key:'shadow',label:'Shadow',options:[['none','None'],['soft','Soft'],['raised','Raised']],format:v=>api.shadows[v]}
  ]});
 }
 global.SurfaceTool={create};
})(globalThis);
