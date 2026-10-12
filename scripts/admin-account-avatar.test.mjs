import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarInitials,defaultAvatar,parseAvatarPreference,managementLayer} from '../src/components/admin-ui/account-avatar.mjs';

test('avatar initials support Turkish names without using account email',()=>{
  assert.equal(avatarInitials('  Murat Doğan  '),'MD');
  assert.equal(avatarInitials('ipek ışık'),'İI');
  assert.equal(avatarInitials('Şule Çığ Öztürk'),'ŞÖ');
  assert.equal(avatarInitials(''),'K');
  assert.deepEqual(defaultAvatar('account-a','Murat Doğan'),defaultAvatar('account-a','Murat Doğan'));
});
test('stored avatar accepts only palette colors and short plain initials',()=>{
  const fallback=defaultAvatar('account-a','Murat Doğan');
  assert.deepEqual(parseAvatarPreference('{"color":"teal","initials":"MD"}',fallback),{color:'teal',initials:'MD'});
  for(const raw of [null,'broken','null','{"color":"url(https://example.invalid)","initials":"MD"}','{"color":"teal","initials":"<b>"}','{"color":"teal","initials":"LONG"}','{"color":"teal","initials":""}'])assert.deepEqual(parseAvatarPreference(raw,fallback),fallback);
});
test('management location stays separate from the platform account role',()=>{
  assert.equal(managementLayer('platform',true,true),'PLATFORM');
  assert.equal(managementLayer('sistem',true,true),'PLATFORM');
  assert.equal(managementLayer('kurumlar/org-a/mudahele',true,true),'ORGANIZATION');
  assert.equal(managementLayer('kullanicilar',true,true,true),'ORGANIZATION');
  assert.equal(managementLayer('kullanicilar',true,true,false),'PLATFORM');
  assert.equal(managementLayer('cms',true,true),'CONGRESS');
  assert.equal(managementLayer('panel',true,true),'CONGRESS');
});
test('institution and ordinary congress accounts retain their own directory layer',()=>{
  assert.equal(managementLayer('kongreler',false,true),'ORGANIZATION');
  assert.equal(managementLayer('kongreler',false,false),'CONGRESS');
  assert.equal(managementLayer('kullanicilar',false,true),'ORGANIZATION');
  assert.equal(managementLayer('kongre-olustur',false,true),'CONGRESS');
});
