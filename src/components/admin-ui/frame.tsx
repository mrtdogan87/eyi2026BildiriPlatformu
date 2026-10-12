'use client';
import {ExitContext} from '@/components/platform-management/intervention';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useRef,useState,type ReactNode} from 'react';
import {AdminNavigationGuard,useAdminNavigation} from './navigation-guard';
import {routeInfo,type NavigationGroup} from './navigation.mjs';
import {managementLayer} from './account-avatar.mjs';
import {AccountProfile} from './account-profile';
import styles from './frame.module.css';
type Layer='PLATFORM'|'ORGANIZATION'|'CONGRESS';
type FrameProps={children:ReactNode;user:{id:string;name:string;email:string;platformAdmin:boolean;accountRoles:string[];roleScope:Layer};displayName:string;contexts:{id:string;name:string;organization:string}[];organizations:{id:string;name:string}[];selected:string|null;groups:NavigationGroup[];canManageInstitutions:boolean;contextName:string|null;institutionName:string|null;institutionId:string|null;roles:string[];accessSource:Layer|null;closed:boolean;intervention:{reason:string;startedAt:string}|null};
function ContextPicker({contexts,selected}:{contexts:FrameProps['contexts'];selected:string|null}){
  const router=useRouter(),{confirmLeave}=useAdminNavigation(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const current=contexts.find(c=>c.id===selected),matches=contexts.filter(c=>(c.name+' '+c.organization).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return <><button ref={button} type="button" className="ui-context-button" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><span className="ui-muted">{current?'Seçili kongre':'Çalışma kapsamı'}</span><strong>{current?.name??'Kongre seç'}</strong><span aria-hidden="true">⌄</span></button><dialog ref={dialog} className="ui-dialog ui-context-dialog" aria-labelledby="ui-context-title" onClose={()=>button.current?.focus()}><div className="ui-actions"><h2 id="ui-context-title">Kongre seç</h2><button type="button" className="button ghost" onClick={()=>dialog.current?.close()}>Kapat</button></div><label className="field">Kurum veya kongre ara<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kongre adı"/></label><p className="ui-muted">{matches.length} kongre bulundu{matches.length>100?' · İlk 100 gösteriliyor; aramayla daraltın.':'.'}</p><div className="ui-context-results">{matches.slice(0,100).map(c=><button type="button" key={c.id} disabled={busy} aria-current={c.id===selected?'true':undefined} onClick={async()=>{dialog.current?.close();if(!await confirmLeave())return;setBusy(true);setError('');try{const response=await fetch('/api/platform/context',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({congressId:c.id})}),result=await response.json();if(!response.ok)throw new Error(result.error??'Kongre değiştirilemedi.');router.push('/admin/panel');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><strong>{c.name}</strong><span>{c.organization}</span>{c.id===selected&&<span>Seçili</span>}</button>)}</div>{!matches.length&&<p>Bu aramayla kongre bulunamadı. Aramayı değiştirin.</p>}</dialog>{error&&<p className="error" role="alert">{error}</p>}</>;
}
function FrameContent(props:FrameProps){
  const path=usePathname(),params=useSearchParams(),info=routeInfo(path),route=path.replace(/^\/admin\/?/,''),[menu,setMenu]=useState(false),menuButton=useRef<HTMLButtonElement>(null),side=useRef<HTMLElement>(null);
  const requestedInstitution=params.get('institution')??params.get('organization')??(/^kurumlar\/([^/]+)\//.exec(route)?.[1]);
  const layer=managementLayer(route,props.user.platformAdmin,props.canManageInstitutions,!!params.get('organization'));
  const labels:Record<Layer,string>={PLATFORM:'Platform yönetimi',ORGANIZATION:'Kurum yönetimi',CONGRESS:'Kongre yönetimi'};
  const selectedInstitution=props.organizations.find(item=>item.id===requestedInstitution)??(layer==='CONGRESS'?props.organizations.find(item=>item.id===props.institutionId):undefined)??(props.organizations.length===1?props.organizations[0]:undefined);
  const institutionName=selectedInstitution?.name??(layer==='CONGRESS'?props.institutionName:null)??(props.user.platformAdmin?'Tüm kurumlar':'Yetkili kurumlar');
  const activeName=layer==='PLATFORM'?props.displayName:layer==='ORGANIZATION'?institutionName:route==='kongre-olustur'?'Yeni kongre':route==='kongreler'?'Kongrelerim':props.contextName??'Kongre seçilmedi';
  const institutionQuery=selectedInstitution?'?organization='+encodeURIComponent(selectedInstitution.id):'';
  const contextSource=props.accessSource==='PLATFORM'?'Platform müdahalesi':props.accessSource==='ORGANIZATION'?'Kurum yöneticiliği':'Kongre üyeliği';
  const scopeHeading=(value:Layer)=><span className={styles.scopeHeading}><strong>{labels[value]}</strong>{layer===value&&<span className={styles.currentMarker}>Buradasınız</span>}</span>;
  const navigationLink=(item:string,label:string,target:Layer,query='')=><Link key={item} href={'/admin/'+item+query} aria-current={layer===target&&info.route===item?'page':undefined} onClick={()=>setMenu(false)}>{label}</Link>;
  const closeMenu=()=>{setMenu(false);menuButton.current?.focus();};
  return <div className={`admin-ui ui-frame ${styles.frame}`}>
    <a className="ui-skip" href="#ui-content">İçeriğe geç</a>
    <header className={`ui-topbar ${styles.topbar}`}>
      <button type="button" ref={menuButton} className="ui-menu-button" aria-controls="ui-navigation" aria-expanded={menu} onClick={()=>{setMenu(!menu);if(!menu)requestAnimationFrame(()=>side.current?.querySelector<HTMLElement>('summary, a')?.focus());}}>Menü</button>
      <Link className="ui-brand" href={props.user.platformAdmin?'/admin/platform':props.canManageInstitutions?'/admin/kurumlar':'/admin/kongreler'}>{props.displayName}</Link>
      <div className={styles.activeContext}><span className={styles.layerBadge} data-layer={layer}>{labels[layer]}</span><strong title={activeName}>{activeName}</strong></div>
      <AccountProfile key={props.user.id} user={props.user} layerLabel={labels[layer]} contextName={activeName} intervention={!!props.intervention}/>
    </header>
    <aside ref={side} id="ui-navigation" className={`ui-sidebar ${styles.sidebar} ${menu?'ui-menu-open':''}`} aria-label="Yönetim menüsü" onKeyDown={event=>{if(event.key==='Escape')closeMenu();}}>
      <button type="button" className="ui-menu-close button ghost" onClick={closeMenu}>Menüyü kapat</button>
      <p className="ui-scope-label">Yönetim alanları</p>
      {props.user.platformAdmin?<details className={styles.scopeSection} data-active={layer==='PLATFORM'} open={layer==='PLATFORM'}><summary>{scopeHeading('PLATFORM')}</summary><p className={styles.scopeName}>{props.displayName}</p><nav aria-label="Platform bölümleri">{navigationLink('platform','Genel bakış','PLATFORM')}{navigationLink('kullanicilar','Kullanıcılar ve yetkiler','PLATFORM')}{navigationLink('sistem','Sistem ayarları','PLATFORM')}{navigationLink('platform/gecmis','İşlem geçmişi','PLATFORM')}</nav></details>:<section className={styles.scopeSection} data-unavailable="true"><h2 className={styles.unavailableHeading}>Platform yönetimi</h2><p className={styles.scopeName}>Bu hesapta platform yetkisi yok.</p></section>}
      {props.canManageInstitutions?<details className={styles.scopeSection} data-active={layer==='ORGANIZATION'} open={layer==='ORGANIZATION'}><summary>{scopeHeading('ORGANIZATION')}</summary><p className={styles.scopeName}>{institutionName}</p><nav aria-label="Kurum bölümleri">{navigationLink('kurumlar','Kurumlar','ORGANIZATION')}{!props.user.platformAdmin&&navigationLink('kongreler','Kurumun kongreleri','ORGANIZATION',institutionQuery)}{(selectedInstitution||!props.user.platformAdmin)&&navigationLink('kullanicilar','Sorumlular ve erişimler','ORGANIZATION',institutionQuery)}</nav></details>:<section className={styles.scopeSection} data-unavailable="true"><h2 className={styles.unavailableHeading}>Kurum yönetimi</h2><p className={styles.scopeName}>Bu hesapta kurum yönetim yetkisi yok.</p></section>}
      <details className={styles.scopeSection} data-active={layer==='CONGRESS'} open={layer==='CONGRESS'}><summary>{scopeHeading('CONGRESS')}</summary><p className={styles.scopeName}>{props.contextName??(props.user.platformAdmin?'Kurumdan bir kongre için müdahale başlatın.':'Yetkili olduğunuz kongreyi seçin.')}{props.intervention&&' · Müdahale açık'}</p>
        {!props.user.platformAdmin&&<div className={styles.contextTools}><ContextPicker contexts={props.contexts} selected={props.selected}/></div>}
        <nav aria-label="Kongre bölümleri">{props.groups.map(group=><details key={group.label} open={group.label===info.group||group.label==='Genel bakış'}><summary>{group.label}</summary>{group.items.map(([item,label])=>navigationLink(item,label,'CONGRESS'))}</details>)}{!props.user.platformAdmin&&navigationLink('kongreler','Kongrelerim','CONGRESS')}{props.user.platformAdmin&&!props.selected&&<Link href="/admin/kurumlar" onClick={()=>setMenu(false)}>Kurum seç ve müdahale başlat</Link>}</nav>
        {props.selected&&(props.user.platformAdmin||props.canManageInstitutions)&&<div className={styles.contextTools}><ExitContext platform={props.user.platformAdmin}/></div>}
      </details>
    </aside>
    <div className="ui-main-column" id="ui-content" tabIndex={-1}>
      {props.intervention&&<section className="ui-intervention-bar" aria-label="Platform müdahalesi"><div><strong>Müdahale açık · {props.institutionName} / {props.contextName}</strong><p>Gerekçe: {props.intervention.reason}</p></div><ExitContext platform/></section>}
      <div className={`ui-context-strip ${styles.contextStrip}`}><div><span className={styles.layerBadge} data-layer={layer}>{labels[layer]}</span><strong>{activeName}</strong>{layer==='CONGRESS'&&props.institutionName&&<span>{props.institutionName}</span>}</div>{layer==='CONGRESS'&&props.selected&&<span className={styles.contextDetail}>Yetki kaynağı: {contextSource} · {props.roles.join(' · ')}{props.closed?' · Kongre kapalı':''}</span>}</div>
      <nav className="ui-breadcrumb" aria-label="Konum yolu"><Link href={layer==='PLATFORM'?'/admin/platform':layer==='ORGANIZATION'?'/admin/kurumlar':props.selected?'/admin/panel':'/admin/kongreler'}>{labels[layer]}</Link><span aria-hidden="true">/</span>{path==='/admin/'+info.route?<span aria-current="page">{info.label}</span>:<><Link href={'/admin/'+info.route}>{info.label}</Link><span aria-hidden="true">/</span><span aria-current="page">{path.endsWith('/mudahele')?'Kongreye müdahale':'Kayıt detayı'}</span></>}</nav>
      <div className="ui-page-content">{props.children}</div>
    </div>
  </div>;
}
export function AdminFrame(props:FrameProps){const path=usePathname();if(path.endsWith('/onizleme'))return <>{props.children}</>;return <AdminNavigationGuard scope={`${props.user.email}:${props.selected??'platform'}`} key={`${props.user.email}:${props.selected??'platform'}:${path}`}><FrameContent {...props}/></AdminNavigationGuard>;}
