/* Connect the reusable component to the host's routes and theme. No storage here. */
(function(root) {
  'use strict';
  function create({component,element,getPath,resolveHref,navigate,getTheme}) {
    let appearance={},instance=null,currentPage=null;
    function items(parts,routeFor){
      return [{id:'dashboard',label:'topschrank',emphasisLength:3,href:'#topschrank.dashboard'},...parts.map((label,index)=>{
        const route=routeFor(label,index,parts.length);
        return {id:route,label,href:resolveHref(route,'topschrank.'+parts.slice(0,index+1).join('.'))};
      })];
    }
    function show(page){
      currentPage=page;
      const options={items:items(getPath(page),(label,index,count)=>index===count-1?page:label),appearance:{colours:{brand:'var(--text)',parent:'var(--muted)',current:'var(--text)',dot:'var(--muted)',hover:'var(--link)'},...getTheme(),...appearance}};
      if(instance)instance.update(options);else instance=component.mount(element,{...options,onNavigate:navigate});
    }
    return {
      show,items,
      setAppearance(next){appearance=next;if(currentPage)show(currentPage)},
      destroy(){instance?.destroy();instance=null;currentPage=null}
    };
  }
  root.BreadcrumbWorkspaceAdapter=Object.freeze({create});
})(globalThis);
