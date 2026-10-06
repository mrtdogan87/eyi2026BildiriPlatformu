import {createHash} from 'node:crypto';
const normalized=v=>(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr-TR');
export function recipientIdentity(recipient){
  if(recipient.email)return 'email:'+recipient.email.trim().toLowerCase();
  if(recipient.recipientRef)return 'ref:'+normalized(recipient.recipientRef);
  return 'person:'+createHash('sha256').update(JSON.stringify([normalized(recipient.data.recipientName),normalized(recipient.data.institution)])).digest('hex');
}
