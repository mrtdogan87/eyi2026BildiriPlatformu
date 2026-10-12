type Entry={key:string;url:string};
type TraverseEvent=Event&{navigationType:string;canIntercept:boolean;destination:Entry&{sameDocument:boolean};signal:AbortSignal;info?:unknown;intercept(options:{precommitHandler:()=>Promise<void>;focusReset:'manual'}):void};
type Navigation=EventTarget&{currentEntry:Entry|null;entries():Entry[];traverseTo(key:string,options?:{info:unknown}):{committed:Promise<unknown>;finished:Promise<unknown>}};
type NavigationWindow=Window&{navigation?:Navigation;NavigationPrecommitController?:unknown};
const captureKey=Symbol.for('aibildiri.admin.history-capture'),installedKey=Symbol.for('aibildiri.admin.history-capture-installed');
// Window is the popstate target: register before Next, not merely with capture=true.
export const historyCaptureBootstrap="(()=>{const k=Symbol.for('aibildiri.admin.history-capture'),i=Symbol.for('aibildiri.admin.history-capture-installed');if(window[i])return;window[i]=true;window.addEventListener('popstate',event=>window[k]?.(event),true);})()";

export function changesAdminPage(from:string,to:string){
 const source=new URL(from),target=new URL(to,source);
 return source.origin===target.origin&&(source.pathname!==target.pathname||source.search!==target.search);
}

// Observe native history entries; never replace Next's state/tree or create sentinel entries.
export function guardHistoryNavigation(win:NavigationWindow,dirty:()=>boolean,confirmLeave:()=>Promise<boolean>){
 const navigation=win.navigation;
 if(!navigation)return ()=>{}; // Older browsers retain the existing beforeunload protection.
 const restore={},approved={};
 let disposed=false,decision:Promise<boolean>|null=null;
 let suspended:{origin:Entry;target:Entry;restoring:boolean;revision:number;decision?:Promise<boolean>}|null=null;
 const ask=()=>decision??(decision=confirmLeave().finally(()=>{decision=null;}));
 const traverse=async(key:string,info:unknown)=>{
  const result=navigation.traverseTo(key,{info});
  // Both promises reject if another browser action supersedes this traversal.
  void result.committed.catch(()=>{});
  return await result.finished;
 };
 const navigate=(raw:Event)=>{
  const event=raw as TraverseEvent,origin=navigation.currentEntry;
  if(event.navigationType!=='traverse'){suspended=null;return;}
  if(!event.destination.sameDocument){suspended=null;return;}
  if(!origin||event.info===restore||event.info===approved)return;
  if(!suspended&&(!dirty()||!changesAdminPage(origin.url,event.destination.url)))return;
  if(!suspended&&event.canIntercept&&event.cancelable&&win.NavigationPrecommitController){
   event.intercept({focusReset:'manual',precommitHandler:async()=>{
    if(!await ask()||disposed||event.signal.aborted)throw new DOMException('Navigation cancelled','AbortError');
   }});
   return;
  }
  // Some traversal events cannot be deferred. Suppress the router's popstate,
  // restore the exact original entry, and only then ask before replaying it.
  if(suspended){suspended.target=event.destination;suspended.revision++;}
  else suspended={origin,target:event.destination,restoring:false,revision:0};
 };
 const decide=async(pending:NonNullable<typeof suspended>)=>{
  if(disposed||suspended!==pending)return;
  const leave=await (pending.decision??=ask());
  if(disposed||suspended!==pending||pending.restoring||navigation.currentEntry?.key!==pending.origin.key)return;
  suspended=null;
  if(leave)void traverse(pending.target.key,approved).catch(()=>{});
 };
 const restoreOrigin=(pending:NonNullable<typeof suspended>)=>{
  if(navigation.currentEntry?.key===pending.origin.key){void decide(pending);return;}
  const revision=pending.revision;
  pending.restoring=true;
  void traverse(pending.origin.key,restore).then(()=>{
   pending.restoring=false;
   void decide(pending);
  }).catch(()=>{
   pending.restoring=false;
   // A second back/forward action can cancel the restoration. Its popstate
   // was intentionally suppressed too; resume restoration before asking.
   if(!disposed&&suspended===pending&&pending.revision!==revision&&navigation.entries().some(entry=>entry.key===pending.origin.key))restoreOrigin(pending);
  });
 };
 const popstate=(event:PopStateEvent)=>{
  const pending=suspended;
  if(!pending)return;
  event.stopImmediatePropagation();
  if(navigation.currentEntry?.key===pending.origin.key||pending.restoring)return;
  restoreOrigin(pending);
 };
 navigation.addEventListener('navigate',navigate);
 const registry=win as unknown as Record<symbol,unknown>,earlyCapture=registry[installedKey]===true;
 if(earlyCapture)registry[captureKey]=popstate;
 else win.addEventListener('popstate',popstate,true);
 return ()=>{disposed=true;suspended=null;navigation.removeEventListener('navigate',navigate);if(registry[captureKey]===popstate)delete registry[captureKey];if(!earlyCapture)win.removeEventListener('popstate',popstate,true);};
}
