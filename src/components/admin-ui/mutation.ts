export function uiMutationStart(url:string,body?:unknown){
  if(typeof window==='undefined'||!location.pathname.startsWith('/admin')||body===undefined||/\/preview(?:\/|\?|$)/.test(url))return null;
  if(url.includes('/import')&&body&&typeof body==='object'&&('inspect' in body||('commit' in body&&!body.commit)))return null;
  const id=crypto.randomUUID();window.dispatchEvent(new CustomEvent('admin-ui:request',{detail:id}));return id;
}
export function uiMutationEnd(id:string|null,success:boolean){if(id)window.dispatchEvent(new CustomEvent(success?'admin-ui:saved':'admin-ui:failed',{detail:id}));}
export async function uiFetch(url:string,options?:RequestInit){const id=uiMutationStart(url,options?.body);try{const result=await fetch(url,options);uiMutationEnd(id,result.ok);return result;}catch(error){uiMutationEnd(id,false);throw error;}}
