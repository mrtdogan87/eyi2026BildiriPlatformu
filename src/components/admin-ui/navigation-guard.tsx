'use client';
import {createContext,useContext,useEffect,useId,useRef,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
const Context=createContext<{confirmLeave:()=>Promise<boolean>;register:(id:string,read:()=>boolean)=>()=>void}>({confirmLeave:async()=>true,register:()=>()=>{}});
const snapshot=(form:HTMLFormElement)=>JSON.stringify([...form.elements].filter((el):el is HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement=>el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement).map((el,index)=>[index,el.name,el instanceof HTMLInputElement&&(el.type==='checkbox'||el.type==='radio')?el.checked:el instanceof HTMLInputElement&&el.type==='file'?[...(el.files??[])].map(f=>[f.name,f.size,f.lastModified]):el.value]));
export function useAdminNavigation(){return useContext(Context);}
export function useUnsavedChanges(dirty:boolean){const context=useContext(Context),id=useId();useEffect(()=>context.register(id,()=>dirty),[context,id,dirty]);}
export function AdminNavigationGuard({children}:{children:ReactNode}){
  const router=useRouter(),root=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),resolve=useRef<((value:boolean)=>void)|null>(null),lastFocus=useRef<HTMLElement|null>(null),forms=useRef(new Map<HTMLFormElement,string>()),submitted=useRef<HTMLFormElement|null>(null),requests=useRef(new Map<string,{form:HTMLFormElement;values:string}>()),readers=useRef(new Map<string,()=>boolean>());
  const dirty=()=>[...forms.current].some(([form,before])=>form.isConnected&&snapshot(form)!==before)||[...readers.current.values()].some(read=>read());
  function finish(value:boolean){dialog.current?.close();const done=resolve.current;resolve.current=null;lastFocus.current?.focus();done?.(value);}
  async function confirmLeave(){if(!dirty())return true;if(resolve.current)return false;lastFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog.current?.showModal();return new Promise<boolean>(done=>{resolve.current=done;});}
  function register(id:string,read:()=>boolean){readers.current.set(id,read);return ()=>{readers.current.delete(id);};}
  useEffect(()=>{
    const collect=()=>root.current?.querySelectorAll('form').forEach(form=>{if(form.getAttribute('method')?.toLowerCase()!=='get'&&!forms.current.has(form))forms.current.set(form,snapshot(form));});
    collect();const observer=new MutationObserver(collect);if(root.current)observer.observe(root.current,{childList:true,subtree:true});
    const leaving=(event:BeforeUnloadEvent)=>{if(dirty()){event.preventDefault();event.returnValue='';}};
    const started=(event:Event)=>{const id=(event as CustomEvent<string>).detail,form=submitted.current;if(form?.isConnected)requests.current.set(id,{form,values:snapshot(form)});submitted.current=null;};
    const saved=(event:Event)=>{const id=(event as CustomEvent<string>).detail,request=requests.current.get(id);if(request)forms.current.set(request.form,request.values);requests.current.delete(id);};
    const failed=(event:Event)=>{requests.current.delete((event as CustomEvent<string>).detail);};
    window.addEventListener('beforeunload',leaving);window.addEventListener('admin-ui:request',started);window.addEventListener('admin-ui:saved',saved);window.addEventListener('admin-ui:failed',failed);
    return ()=>{observer.disconnect();window.removeEventListener('beforeunload',leaving);window.removeEventListener('admin-ui:request',started);window.removeEventListener('admin-ui:saved',saved);window.removeEventListener('admin-ui:failed',failed);resolve.current?.(false);};
  },[]);
  return <Context.Provider value={{confirmLeave,register}}><div ref={root} onSubmitCapture={event=>{const form=event.target;if(form instanceof HTMLFormElement&&form.getAttribute('method')?.toLowerCase()!=='get')submitted.current=form;}} onClickCapture={event=>{
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=(event.target as HTMLElement).closest('a');if(!link||link.hasAttribute('download')||link.target==='_blank')return;const target=new URL(link.href,location.href);
    if(target.origin!==location.origin||target.pathname.startsWith('/api/')||(target.pathname===location.pathname&&target.search===location.search))return;
    if(!dirty())return;event.preventDefault();event.stopPropagation();void confirmLeave().then(ok=>{if(ok)router.push(target.pathname+target.search+target.hash);});
  }}>{children}</div><dialog className="ui-dialog" ref={dialog} aria-labelledby="ui-unsaved-title" onCancel={event=>{event.preventDefault();finish(false);}}><h2 id="ui-unsaved-title">Kaydedilmemiş değişiklikler var</h2><p>Geçerseniz bu ekrandaki kaydedilmemiş bilgiler kaybolur. Önce düzenlemeyi kaydedebilir veya değişiklikleri bırakabilirsiniz.</p><div className="ui-actions"><button autoFocus type="button" className="button primary" onClick={()=>finish(false)}>Düzenlemeye dön</button><button type="button" className="button secondary" onClick={()=>finish(true)}>Değişiklikleri bırak ve geç</button></div></dialog></Context.Provider>;
}
