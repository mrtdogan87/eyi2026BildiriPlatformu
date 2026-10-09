import test from 'node:test';
import assert from 'node:assert/strict';
import {accountState,organizationAccessLabel,responsibleSummary} from '../src/modules/platform-management/account-state.mjs';
const now=Date.parse('2026-10-09T10:00:00Z'),future=new Date(now+3600000).toISOString(),past=new Date(now-1).toISOString();

test('assigned authority does not imply an active personal account',()=>{
 const state=accountState({active:true,activationNeeded:true,inviteExpiresAt:future},now);
 assert.equal(state.key,'PENDING');assert.equal(state.invitation,'VALID');assert(state.canInvite);
 assert.equal(responsibleSummary([{active:true,account:state}]),'Yetki atandı · Parola oluşturması bekleniyor');
});
test('expired, missing and consumed activation links have distinct next steps',()=>{
 const base={active:true,activationNeeded:true};
 const expired=accountState({...base,inviteExpiresAt:past},now),boundary=accountState({...base,inviteExpiresAt:new Date(now).toISOString()},now),missing=accountState(base,now),invalid=accountState({...base,inviteExpiresAt:future,inviteUsedAt:past},now);
 assert.equal(expired.invitation,'EXPIRED');assert.equal(boundary.invitation,'EXPIRED');assert.match(expired.detail,/süresi dolmuş/);
 assert.equal(missing.invitation,'MISSING');assert.equal(missing.inviteLabel,'Etkinleştirme bağlantısı oluştur');
 assert.equal(invalid.invitation,'INVALID');assert.match(invalid.detail,/geçersiz/);
});
test('active account never offers another activation invitation',()=>{
 const state=accountState({active:true,activationNeeded:false,inviteExpiresAt:future},now);
 assert.equal(state.label,'Hesap etkin');assert.equal(state.invitation,'NONE');assert.equal(state.canInvite,false);assert.match(state.detail,/Parolamı unuttum/);
});
test('closed account takes precedence over password and invitation state',()=>{
 for(const activationNeeded of [true,false]){const state=accountState({active:false,activationNeeded,inviteExpiresAt:future},now);assert.equal(state.label,'Hesap kapalı');assert.equal(state.canInvite,false);assert.match(state.detail,/hesabı açmaz/);}
});
test('institution gate is independent from assigned authority and account activation',()=>{
 assert.equal(organizationAccessLabel({organizer:true,active:false}),'Kurum yöneticiliği atanmış · Kurum erişimi kapalı');
 assert.equal(organizationAccessLabel({organizer:false,active:true}),'Kurum yöneticiliği yok · Kurum erişimi açık');
 assert.equal(responsibleSummary([{active:false,account:accountState({active:true,activationNeeded:false},now)}]),'Kurum erişimi kapalı · Hesap etkin');
});
test('multiple and zero managers produce accurate institution summaries',()=>{
 assert.equal(responsibleSummary([]),'Sorumlu yok');
 assert.equal(responsibleSummary([{active:true,account:accountState({active:true,activationNeeded:true},now)},{active:true,account:accountState({active:false,activationNeeded:true},now)}]),'2 sorumlu · 1 parola bekliyor · 1 erişim kapalı');
});
