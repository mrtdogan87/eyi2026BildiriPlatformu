// Account activation and an institution's access gate are independent decisions.
// This presentation contains no credential or raw invitation token.
export function accountState({active,activationNeeded,inviteExpiresAt=null,inviteUsedAt=null},now=Date.now()) {
  const invitation=inviteUsedAt?'INVALID':!inviteExpiresAt?'MISSING':new Date(inviteExpiresAt).getTime()>now?'VALID':'EXPIRED';
  if(!active)return {key:'CLOSED',label:'Hesap kapalı',detail:'Kişisel hesap kapalı. Davet veya parola yenileme hesabı açmaz.',invitation,canInvite:false,inviteLabel:''};
  if(!activationNeeded)return {key:'ACTIVE',label:'Hesap etkin',detail:'Parola oluşturulmuş. Unutulan parola giriş ekranındaki “Parolamı unuttum” ile yenilenir.',invitation:'NONE',canInvite:false,inviteLabel:''};
  const detail=invitation==='VALID'?'Etkinleştirme bağlantısı geçerli. Kişinin kendi parolasını oluşturması bekleniyor.':invitation==='EXPIRED'?'Etkinleştirme bağlantısının süresi dolmuş. Yeni bağlantı oluşturun.':invitation==='INVALID'?'Önceki etkinleştirme bağlantısı geçersiz. Yeni bağlantı oluşturun.':'Henüz etkinleştirme bağlantısı oluşturulmamış.';
  return {key:'PENDING',label:'Parola oluşturması bekleniyor',detail,invitation,canInvite:true,inviteLabel:invitation==='MISSING'?'Etkinleştirme bağlantısı oluştur':'Etkinleştirme davetini yenile'};
}

export function organizationAccessLabel({organizer,active}) {
  return `${organizer?'Kurum yöneticiliği atanmış':'Kurum yöneticiliği yok'} · ${active?'Kurum erişimi açık':'Kurum erişimi kapalı'}`;
}

export function responsibleSummary(memberships) {
  if(!memberships.length)return 'Sorumlu yok';
  if(memberships.length===1){const member=memberships[0];return `${member.active?'Yetki atandı':'Kurum erişimi kapalı'} · ${member.account.label}`;}
  const waiting=memberships.filter(m=>m.account.key==='PENDING').length;
  const closed=memberships.filter(m=>!m.active||m.account.key==='CLOSED').length;
  return [`${memberships.length} sorumlu`,waiting?`${waiting} parola bekliyor`:null,closed?`${closed} erişim kapalı`:null].filter(Boolean).join(' · ');
}
