'use client';
import {useEffect,useRef,useState} from 'react';
import {AdminLogoutButton} from '@/components/admin/admin-logout-button';
import {avatarColors,defaultAvatar,parseAvatarPreference} from './account-avatar.mjs';
import styles from './frame.module.css';

type Props={user:{id:string;name:string;email:string;accountRoles:string[];roleScope:'PLATFORM'|'ORGANIZATION'|'CONGRESS'};layerLabel:string;contextName:string;intervention:boolean};
export function AccountProfile({user,layerLabel,contextName,intervention}:Props){
  const initial=defaultAvatar(user.id,user.name),[avatar,setAvatar]=useState(initial),[initials,setInitials]=useState(initial.initials),[message,setMessage]=useState('');
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),edited=useRef(false),storageKey=`admin-avatar:v1:${user.id}`;
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      if(edited.current)return;
      let preference=defaultAvatar(user.id,user.name);
      try{preference=parseAvatarPreference(localStorage.getItem(storageKey),preference);}catch{/* Avatar settings never block account access. */}
      setAvatar(preference);setInitials(preference.initials);
    });
    return ()=>cancelAnimationFrame(frame);
  },[storageKey,user.id,user.name]);
  const color=avatarColors.find(value=>value.id===avatar.color)??avatarColors[0];
  function save(next:typeof avatar){
    edited.current=true;setAvatar(next);
    try{localStorage.setItem(storageKey,JSON.stringify(next));setMessage('Avatar tercihiniz bu tarayıcıda kaydedildi.');}catch{setMessage('Avatar bu oturumda değişti. Tarayıcı tercihi kalıcı olarak kaydedemedi.');}
  }
  return <>
    <button ref={trigger} type="button" className={styles.accountTrigger} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>
      <span className={styles.avatar} style={{backgroundColor:color.value}} aria-hidden="true">{avatar.initials}</span>
      <span className={styles.accountSummary}><strong>{user.name}</strong><span className={styles.roleBadge} data-layer={user.roleScope}>{user.accountRoles.join(' · ')}</span><small>Hesap bilgileri ve avatar</small></span>
    </button>
    <dialog ref={dialog} className={`ui-dialog ${styles.accountDialog}`} aria-labelledby="account-profile-title" onClose={()=>trigger.current?.focus()}>
      <div className={styles.dialogHeading}><h2 id="account-profile-title">Hesap bilgileri</h2><button type="button" className="button ghost" onClick={()=>dialog.current?.close()}>Kapat</button></div>
      <div className={styles.profileHeading}><span className={`${styles.avatar} ${styles.largeAvatar}`} style={{backgroundColor:color.value}} aria-hidden="true">{avatar.initials}</span><div><strong>{user.name}</strong><p>{user.email}</p></div></div>
      <dl className={styles.accountFacts}><div><dt>Hesap rolü</dt><dd><span className={styles.roleBadge} data-layer={user.roleScope}>{user.accountRoles.join(' · ')}</span></dd></div><div><dt>Bulunduğunuz yönetim</dt><dd>{layerLabel}</dd></div><div><dt>Aktif alan</dt><dd>{contextName}</dd></div></dl>
      {intervention&&<p className={styles.interventionNote}>Platform müdahalesi açık. Hesap rolünüz platform yöneticisi olarak korunur.</p>}
      <form onSubmit={event=>{event.preventDefault();const value=initials.trim().toLocaleUpperCase('tr');if(!/^[\p{L}\p{N}]{1,3}$/u.test(value)){setMessage('Avatar için 1–3 harf veya rakam girin.');return;}setInitials(value);save({...avatar,initials:value});}}>
        <h3>Avatarınızı değiştirin</h3><p className="ui-muted">Bu tercih yalnız bu tarayıcıdaki hesabınıza aittir. Adınız, rolünüz ve yetkileriniz değişmez.</p>
        <label className="field">Avatar harfleri<input value={initials} maxLength={3} onChange={event=>setInitials(event.target.value)} autoComplete="off" aria-describedby="avatar-initials-hint"/><small id="avatar-initials-hint">1–3 harf veya rakam</small></label>
        <fieldset><legend>Avatar rengi</legend><div className={styles.colorChoices}>{avatarColors.map(option=><button type="button" key={option.id} className={styles.colorChoice} style={{backgroundColor:option.value}} aria-label={option.label} aria-pressed={avatar.color===option.id} onClick={()=>save({...avatar,color:option.id})}><span aria-hidden="true">{avatar.color===option.id?'✓':''}</span><span className={styles.colorName}>{option.label}</span></button>)}</div></fieldset>
        <button type="submit" className="button secondary">Avatar harflerini kaydet</button><p role="status">{message}</p>
      </form><div className={styles.accountActions}><AdminLogoutButton/></div>
    </dialog>
  </>;
}
