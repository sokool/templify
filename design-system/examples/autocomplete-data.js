(function(root){
function acThumbnail(kind){const oak=kind==='oak',dark=kind==='graphite';const bg=oak?'#E8D4B7':dark?'#536171':'#D6E1ED';const face=oak?'#C7A67F':dark?'#34445C':'#F3F6FA';const grain=oak?'<path d="M16 5q8 12 0 24t0 26M26 3q-7 14 0 28t0 28M43 4q8 16 0 30t0 25" stroke="#8D6A43" opacity=".3" fill="none"/>':'';const cabinet=kind==='wardrobe'||kind==='alcove'?'<rect x="10" y="8" width="44" height="48" rx="2" fill="'+face+'" stroke="#617086"/><path d="M32 8v48M27 28v10M37 28v10" stroke="#617086" stroke-width="2"/>':'';return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="'+bg+'"/>'+grain+cabinet+'</svg>')}
const items=[
{id:'oak',name:'Natural oak',detail:'Warm wood finish · MAT-014',group:'Materials',icon:'layers',image:acThumbnail('oak')},
{id:'graphite',name:'Matte graphite',detail:'Lacquered finish · MAT-028',group:'Materials',icon:'palette',image:acThumbnail('graphite')},
{id:'wardrobe',name:'Sliding wardrobe',detail:'Made to measure · PRJ-012',group:'Projects',icon:'columns-3',image:acThumbnail('wardrobe')},
{id:'alcove',name:'Alcove cabinetry',detail:'Bedroom storage · PRJ-019',group:'Projects',icon:'folder',image:acThumbnail('alcove')},
{id:'anna',name:'Anna Kowalska',detail:'Client · Cottbus',group:'People',icon:'user'},
{id:'piotr',name:'Piotr Zieliński',detail:'Client · Frankfurt (Oder)',group:'People',icon:'user'},
{id:'drawing',name:'Wardrobe drawing.pdf',detail:'Technical document · Updated today',group:'Documents',icon:'file-text'},
{id:'visit',name:'Measurement visit',detail:'Calendar event · 4 November',group:'Planning',icon:'calendar-days'}
];
root.ExampleAutocompleteItems=items;
})(globalThis);
