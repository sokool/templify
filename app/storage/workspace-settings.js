/* Application-owned mapping and one-time import of earlier scattered settings. */
(function(root){'use strict';function create({storage,onError}={}){
 const settings=DesignSystemSettings.create({storage,onError,key:'design-system-workspace'});
 const routes={
  'design-system-examples-palette':'layout.palette',
  'design-system-examples-font':{path:'layout.fonts.family',format:'text'},
  'design-system-examples-sidebar-collapsed':'layout.navigation.collapsed',
  'design-system-examples-menu-groups':'layout.navigation.groups',
  'design-system-examples-surface':'components.surface',
  'design-system-examples-tooltip':'components.tooltip',
  'design-system-examples-device':{path:'preview.device',format:'text'},
  'design-system-examples-theme':{path:'preview.legacyTheme',format:'text'},
  'design-system-examples-kanban-v1':'session.kanban.placement'
 };
 settings.migrateLegacy(Object.fromEntries(Object.entries(routes).filter(([key])=>key!=='design-system-examples-palette'||!settings.has('tokens.themes'))));
 settings.batch(()=>{
  if(!settings.has('tokens.themes')){
   const legacy=settings.get('layout.palette',{}),palettes=JSON.parse(JSON.stringify(DesignSystemThemes.defaults));
   for(const mode of Object.keys(palettes))for(const role of Object.keys(palettes[mode])){const value=legacy.palettes?.[mode]?.[role];if(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value))palettes[mode][role]=value;}
   settings.set('tokens',DesignSystemTokens.fromPalettes(palettes));
   if(!settings.has('layout.theme'))settings.set('layout.theme',legacy.theme||settings.get('preview.legacyTheme','light'));
  }
  // Preserve earlier Buttons choices as the first editable instance, not palette applications.
  if(!settings.has('components.buttons.items')){
   const colours=settings.get('components.buttons.colours',{}),doc=settings.get('tokens'),theme=settings.get('layout.theme','light'),group=doc.themes?.[theme];
   for(const [key,role] of Object.entries({fill:'buttonFill',ink:'buttonInk',border:'buttonBorder',shadow:'buttonShadow'})){
    if(!colours[key]&&group?.[role]&&group[role].$value!=='{themes.'+theme+'.'+({fill:'accent',ink:'panel',border:'accent',shadow:'muted'}[key])+'}'){const colour=DesignSystemTokens.cssColour(DesignSystemTokens.resolve(doc,'themes.'+theme+'.'+role));colours[key]={kind:'custom',value:colour};}
   }
   settings.set('components.buttons.items',[{id:'primary',label:'Primary',style:'primary',colours}]);
  }
  // Remove the earlier duplicate palette after it has been converted successfully.
  settings.adapter(routes).removeItem('design-system-examples-palette');
 });
 const adapter=settings.adapter(routes);
 return {settings,storage:adapter};
}root.ExampleSettings={create};})(globalThis);
