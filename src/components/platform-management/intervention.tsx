'use client';
import {useId,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAdminNavigation,useUnsavedChanges} from '@/components/admin-ui/navigation-guard';
import {mutate} from './controls';
export function ExitContext({platform=false}:{platform?:boolean}){
 const router=useRouter(),{confirmLeave}=useAdminNavigation(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button type="button" className="button secondary" disabled={busy} onClick={async()=>{if(!await confirmLeave())return;setBusy(true);try{await mutate('/api/platform/context','DELETE',{});router.push(platform?'/admin/platform':'/admin/kurumlar');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{platform?'Müdahaleyi bitir':'Kurum yönetimine dön'}</button>{error&&<p role="alert" className="error">{error}</p>}</>;
}
export function StartIntervention({congress,organization}:{congress:{id:string;name:string};organization:{id:string;name:string}}){
 const reasonId=useId(),router=useRouter(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');useUnsavedChanges(Boolean(reason));
 return <form className="form-stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await mutate('/api/platform/context','POST',{congressId:congress.id,reason});setReason('');router.push('/admin/panel');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><p>Kurum: <strong>{organization.name}</strong></p><p>Hedef kongre: <strong>{congress.name}</strong></p><div className="field"><label htmlFor={reasonId}>Müdahale gerekçesi</label><input id={reasonId} aria-describedby={reasonId+'-hint'} value={reason} onChange={e=>setReason(e.target.value)} required minLength={10} maxLength={500} disabled={busy}/><span id={reasonId+'-hint'} className="field-hint">10–500 karakter. Gerekçe ve yapacağınız işlemler kişisel hesabınızla kaydedilir.</span></div><button className="button primary" disabled={busy}>{busy?'Açılıyor…':'Müdahaleyi başlat'}</button>{error&&<p role="alert" className="error">{error}</p>}</form>;
}
