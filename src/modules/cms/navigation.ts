export type CmsNavNode={href:string;label:string;children:CmsNavNode[]};
export type MenuPage={slug:string;title:string;menuLabel:string;menuParent:string;showInMenu:boolean;order:number};
export function menuProblem(slug:string,parent:string,pages:readonly {slug:string;parent:string}[]) {
 if(!parent)return null;const bySlug=new Map(pages.map(p=>[p.slug,p.parent]));bySlug.set(slug,parent);let current=slug;const visited=new Set<string>();let depth=0;
 while(current){if(visited.has(current))return 'Menüde döngü oluşturulamaz.';visited.add(current);if(++depth>3)return 'Menü en fazla üç düzey olabilir.';if(!bySlug.has(current))return 'Üst menü bu kongrenin mevcut bir sayfası olmalı.';current=bySlug.get(current)!;}
 return null;
}
export function cmsNavigation(slug:string,pages:readonly MenuPage[]):CmsNavNode[]{
 const visible=pages.filter(p=>p.showInMenu),bySlug=new Map(visible.map(p=>[p.slug,p]));
 const eligible=visible.filter(p=>!menuProblem(p.slug,p.menuParent,visible.map(x=>({slug:x.slug,parent:x.menuParent})))&&(!p.menuParent||bySlug.has(p.menuParent)));
 const children=(parent:string):CmsNavNode[]=>eligible.filter(p=>p.menuParent===parent).sort((a,b)=>a.order-b.order||a.slug.localeCompare(b.slug)).map(p=>({href:`/${slug}/sayfalar/${p.slug}`,label:p.menuLabel||p.title,children:children(p.slug)}));
 return children('');
}
