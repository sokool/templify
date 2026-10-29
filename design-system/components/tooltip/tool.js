/* Development-only configurator. Excluded from the Tooltip runtime and export. */
(function(global){
 function create({document,storage,appearance=global.ExampleAppearance}={}){
  const api=global.DesignSystemTooltip;
  return appearance.create({document,storage,storageKey:'design-system-examples-tooltip',defaults:api.defaults,tokens:api.tokens,colours:['bg','text','border','accent'],controls:[
   {key:'weight',label:'Font weight',options:[['400','Regular · 400'],['500','Medium · 500'],['600','Semi-bold · 600'],['700','Bold · 700']]},
   {key:'style',label:'Font style',options:[['normal','Normal'],['italic','Italic']]},
   {key:'padding',label:'Text padding',options:[['4px 7px','Tight · 4 × 7'],['6px 9px','Compact · 6 × 9'],['8px 11px','Regular · 8 × 11'],['12px 16px','Spacious · 12 × 16']]},
   {key:'size',label:'Font size',options:[10,11,12,13,14,16,18].map(n=>[n,n+' px']),format:v=>v+'px'}
  ]});
 }
 global.TooltipTool={create};
})(globalThis);
