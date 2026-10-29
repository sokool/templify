/* Example content and configuration compose the component through its public API. */
(function(root){'use strict';function mount(page,{settings}={}){const doc=page.ownerDocument;
 const intro=doc.createElement('p');intro.className='example-lead';intro.textContent='Compact suggestions or a visual catalogue. Select one item, or collect several as removable chips. Try oak, wardrobe or Anna.';
 const tools=doc.createElement('div'),demo=doc.createElement('div');demo.className='example-autocomplete';demo.style.cssText='max-width:900px;min-height:500px';page.append(intro,tools,demo);
 const status=doc.createElement('p');status.className='example-status';status.setAttribute('role','status');
 const ac=root.DesignSystemAutocomplete.mount(demo,{label:'Find material, project or person',placeholder:'Try oak, wardrobe or Anna…',size:'small',multiple:true,name:'suggestions',items:root.ExampleAutocompleteItems,renderIcon:name=>root.DesignSystemIcons.svg(name),onChange(value,{items}){status.textContent=items.length?'Selected: '+items.map(item=>item.label).join(', '):'No items selected.';}});
 page.append(status);status.textContent='No items selected.';const tool=root.DesignSystemAutocompleteTool.mount(tools,{component:ac,settings});
 return {destroy(){tool.destroy();ac.destroy();intro.remove();tools.remove();demo.remove();status.remove();}};
}root.ExampleAutocomplete={mount};})(globalThis);
