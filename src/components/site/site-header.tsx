'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
type Props = { slug:string; name:string; organization:string; locale:'tr'|'en'; languages:readonly ('TR'|'EN')[]; modules:{SUBMISSIONS:boolean;REGISTRATION:boolean}; contact:boolean; logo?:{url:string;width:number;height:number}; logoAlt:string; pages?:{href:string;label:string}[] };
export function SiteHeader({slug,name,organization,locale,languages,modules,contact,logo,logoAlt,pages=[]}:Props) {
  const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);const root=`/${slug}`;const en=locale==='en';
  const links=[{href:root,label:en?'Home':'Ana sayfa'},{href:root+'#kongre-hakkinda',label:en?'About':'Kongre hakkında'},{href:root+'#onemli-tarihler',label:en?'Important dates':'Önemli tarihler'},...(modules.SUBMISSIONS?[{href:root+'/bildiri-gonder',label:en?'Paper submission':'Bildiri gönderimi'}]:[]),...(modules.REGISTRATION?[{href:root+'/kayit',label:en?'Registration':'Kayıt'}]:[]),...pages,...(contact?[{href:root+'#iletisim',label:en?'Contact':'İletişim'}]:[])];
  return <header className="site-header" onKeyDown={event=>{if(event.key==='Escape'&&open){setOpen(false);trigger.current?.focus();}}}>
    <a className="site-skip" href="#congress-content">{en?'Skip to content':'İçeriğe geç'}</a>
    <div className="site-institution"><div className="site-width"><span>{organization}</span><span>{en?'Congress platform':'Kongre platformu'}</span></div></div>
    <div className="site-width site-navigation">
      <Link className="site-brand" href={root} onClick={()=>setOpen(false)}>
        {logo ? <Image unoptimized src={logo.url} width={logo.width} height={logo.height} alt={logoAlt || name} /> : <svg viewBox="0 0 48 48" aria-hidden="true" className="site-brand-mark"><path d="M8 35V13l16 9 16-9v22l-16 9Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m8 13 16-9 16 9M24 4v40M8 35l32-22M8 13l32 22" fill="none" stroke="currentColor" strokeWidth="2"/></svg>}
        <strong>{name}</strong>
      </Link>
      <div className="site-nav-tools">{languages.length>1&&<LanguageToggle/>}<button ref={trigger} type="button" className="site-menu-toggle" aria-expanded={open} aria-controls="congress-menu" onClick={()=>setOpen(value=>!value)}>{open?<X aria-hidden="true" size={20}/>:<Menu aria-hidden="true" size={20}/>}<span>{en?'Menu':'Menü'}</span></button></div>
      <nav id="congress-menu" className={`site-menu${open?' is-open':''}`} aria-label={en?'Congress navigation':'Kongre menüsü'}>{links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)}>{link.label}</Link>)}</nav>
    </div>
  </header>;
}
