/* Progress configuration only. Runtime receives generic CSS colours, never palette/storage data. */
(function(root){'use strict';const defaults={fill:{kind:'semantic',role:'accent'},border:{kind:'semantic',role:'border'},shadow:{kind:'semantic',role:'muted'}};
function mount(host,{components,themes,settings,Picker=root.PalettePicker}={}){
 settings?.defaults({colours:defaults});const saved=settings?.snapshot()?.colours||{},state={},pickers=[];host.classList.add('progress-tool');
 for(const key of Object.keys(defaults)){state[key]=Picker.valid(saved[key],root.DesignSystemThemes.tokens)?saved[key]:defaults[key];const holder=host.ownerDocument.createElement('div');host.append(holder);pickers.push({key,view:Picker.mount(holder,{themes,label:{fill:'Progress bar',border:'Border',shadow:'Shadow'}[key],value:state[key],defaultValue:defaults[key],onChange(value){state[key]=value;settings?.set('colours',state);apply();}})});}
 function apply(){const appearance=Object.fromEntries(pickers.map(({key,view})=>[key,view.getCSS()]));components.forEach(component=>component.update({appearance}));settings?.set('appearance',appearance);}
 apply();return {destroy(){pickers.forEach(({view})=>view.destroy());host.replaceChildren();host.classList.remove('progress-tool');}};
}root.DesignSystemProgressTool={mount,defaults};})(globalThis);
