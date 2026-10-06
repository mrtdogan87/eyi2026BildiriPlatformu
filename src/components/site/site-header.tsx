'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
import type {CmsNavNode} from '@/modules/cms/navigation';
type Props = { slug:string; name:string; organization:string; locale:'tr'|'en'; languages:readonly ('TR'|'EN')[]; modules:{SUBMISSIONS:boolean;REGISTRATION:boolean;PROGRAM?:boolean;ACTIVITIES?:boolean;CERTIFICATES?:boolean;AWARDS?:boolean;PROMOTION?:boolean;PUBLICATIONS?:boolean}; contact:boolean; logo?:{url:string;width:number;height:number}; logoAlt:string; pages?:CmsNavNode[] };
export function SiteHeader({slug,name,organization,locale,languages,modules,contact,logo,logoAlt,pages=[]}:Props) {
  const [open,setOpen]=useState(false);const nav=useRef<HTMLElement>(null);const closeMenus=()=>{setOpen(false);nav.current?.querySelectorAll('details[open]').forEach(element=>element.removeAttribute('open'));};const trigger=useRef<HTMLButtonElement>(null);const root=`/${slug}`;const en=locale==='en';
  const links=[{href:root,label:en?'Home':'Ana sayfa'},{href:root+'#kongre-hakkinda',label:en?'About':'Kongre hakkında'},{href:root+'#onemli-tarihler',label:en?'Important dates':'Önemli tarihler'},...(modules.SUBMISSIONS?[{href:root+'/bildiri-gonder',label:en?'Paper submission':'Bildiri gönderimi'}]:[]),...(modules.REGISTRATION?[{href:root+'/kayit',label:en?'Registration':'Kayıt'}]:[]),...(modules.ACTIVITIES?[{href:root+'/etkinlikler',label:en?'Workshops & social events':'Workshop ve sosyal etkinlikler'}]:[]),...(modules.PROGRAM?[{href:root+'/program',label:en?'Programme':'Program'}]:[]),...(modules.PROMOTION?[{href:root+'/tanitim',label:en?'Invitation & poster':'Davet ve afiş'}]:[]),...(modules.AWARDS?[{href:root+'/oduller',label:en?'Award results':'Ödül sonuçları'}]:[]),...(modules.SUBMISSIONS||modules.REGISTRATION||modules.PROGRAM||modules.ACTIVITIES||modules.CERTIFICATES||modules.AWARDS||modules.PUBLICATIONS?[{href:root+'/katilimci',label:en?'Participant panel':'Katılımcı paneli'}]:[]),...pages,...(contact?[{href:root+'#iletisim',label:en?'Contact':'İletişim'}]:[])];
  const menuLink=(link:{href:string;label:string;children?:CmsNavNode[]},level=0):React.ReactNode=>link.children?.length?<details className={`site-submenu level-${level}`} key={link.href}><summary>{link.label}</summary><div className="site-submenu-items"><Link href={link.href} onClick={closeMenus}>{en?'Overview':'Genel bakış'}</Link>{link.children.map(child=>menuLink(child,level+1))}</div></details>:<Link key={link.href} href={link.href} onClick={closeMenus}>{link.label}</Link>;
  return <header className="site-header" onKeyDown={event=>{if(event.key!=='Escape')return;const details=(event.target as HTMLElement).closest('details');if(details instanceof HTMLDetailsElement&&details.open){details.open=false;details.querySelector('summary')?.focus();}else if(open){closeMenus();trigger.current?.focus();}}}>
    <a className="site-skip" href="#congress-content">{en?'Skip to content':'İçeriğe geç'}</a>
    <div className="site-institution"><div className="site-width"><span>{organization}</span><span>{en?'Congress platform':'Kongre platformu'}</span></div></div>
    <div className="site-width site-navigation">
      <Link className="site-brand" href={root} onClick={closeMenus}>
        {logo ? <Image unoptimized src={logo.url} width={logo.width} height={logo.height} alt={logoAlt || name} /> : <svg viewBox="0 0 48 48" aria-hidden="true" className="site-brand-mark"><path d="M8 35V13l16 9 16-9v22l-16 9Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m8 13 16-9 16 9M24 4v40M8 35l32-22M8 13l32 22" fill="none" stroke="currentColor" strokeWidth="2"/></svg>}
        <strong>{name}</strong>
      </Link>
      <div className="site-nav-tools">{languages.length>1&&<LanguageToggle/>}<button ref={trigger} type="button" className="site-menu-toggle" aria-expanded={open} aria-controls="congress-menu" onClick={()=>setOpen(value=>!value)}>{open?<X aria-hidden="true" size={20}/>:<Menu aria-hidden="true" size={20}/>}<span>{en?'Menu':'Menü'}</span></button></div>
      <nav ref={nav} id="congress-menu" className={`site-menu${open?' is-open':''}`} aria-label={en?'Congress navigation':'Kongre menüsü'}>{links.map(link=>menuLink(link))}</nav>
    </div>
  </header>;
}
