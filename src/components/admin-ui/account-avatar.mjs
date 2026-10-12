export const avatarColors = [
  {id:'blue',label:'Mavi',value:'#2459a6'},
  {id:'teal',label:'Yeşil',value:'#0f766e'},
  {id:'violet',label:'Mor',value:'#7e22ce'},
  {id:'rose',label:'Pembe',value:'#be185d'},
  {id:'amber',label:'Altın',value:'#a16207'},
  {id:'slate',label:'Gri',value:'#475569'},
];
export function avatarInitials(name) {
  const parts=name.trim().split(/\s+/u).filter(Boolean);
  const initials=[parts[0],parts.length>1?parts.at(-1):undefined].filter(Boolean).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase('tr');
  return /^[\p{L}\p{N}]{1,3}$/u.test(initials)?initials:'K';
}
export function defaultAvatar(userId,name) {
  const index=Array.from(userId).reduce((value,char)=>(value+char.codePointAt(0))%avatarColors.length,0);
  return {color:avatarColors[index].id,initials:avatarInitials(name)};
}
export function parseAvatarPreference(raw,fallback) {
  try {
    const value=JSON.parse(raw);
    if(value&&avatarColors.some(color=>color.id===value.color)&&typeof value.initials==='string'&&/^[\p{L}\p{N}]{1,3}$/u.test(value.initials))return {color:value.color,initials:value.initials};
  } catch { /* Invalid or unavailable browser storage falls back to the account initials. */ }
  return fallback;
}
export function managementLayer(route,platformAdmin,canManageInstitutions,organizationSelected=false) {
  if(route==='kurumlar'||route.startsWith('kurumlar/')||(route==='kongreler'&&canManageInstitutions)||(route==='kullanicilar'&&(!platformAdmin||organizationSelected)))return 'ORGANIZATION';
  if(route==='platform'||route.startsWith('platform/')||route==='sistem'||route==='arayuz-ornekleri'||(route==='kullanicilar'&&platformAdmin))return 'PLATFORM';
  return 'CONGRESS';
}
