import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {defaultSettings,settingsSchema,outputInput,generateInput,saveInput,interpolate,resolvedText,sizes,sameVersion,linkedPromotionSource,resolveChairSource,chairSourceOptions,promotionSettingsSnapshot} from '../src/modules/promotion/core.ts';
import {emptyInvitationFacts} from '../src/modules/congress/configuration.ts';
import {emptyRecord} from '../src/modules/content/configuration.ts';
import {renderPromotion,fingerprint} from '../src/modules/promotion/render.mjs';
const values={eventName:'Şule Işık Bilimsel Kongresi',organization:'İstanbul Üniversitesi',date:'7–9 Ekim 2026',venue:'Bilim Salonu',signature:'Düzenleme Kurulu',website:'https://example.invalid'},text=resolvedText(defaultSettings,values,'tr');
test('Template variables preserve Turkish scientific names',()=>assert.match(text.invitation,/Şule Işık/));
test('Unknown template variables are an explicit error',()=>assert.throws(()=>interpolate('{password}',values)));
test('Every known variable is interpolated without leaving markup',()=>assert.equal(interpolate('{eventName} / {venue}',values),values.eventName+' / '+values.venue));
test('Title and invitation remain separate editable text layers',()=>{const s={...defaultSettings,titleTr:'Yeni başlık',invitationTr:'Bağımsız ve düzenlenebilir davet metni.'};const r=resolvedText(s,values,'tr');assert.equal(r.title,s.titleTr);assert.equal(r.invitation,s.invitationTr);});
test('English output never substitutes Turkish title',()=>assert.throws(()=>resolvedText({...defaultSettings,titleEn:''},values,'en')));
test('English invitation requires independently supplied text',()=>assert.throws(()=>resolvedText({...defaultSettings,invitationEn:''},values,'en')));
test('Output sizes match the declared limited formats',()=>assert.deepEqual(sizes,{PRINT:{width:2480,height:3508},WEB:{width:1200,height:675},SQUARE:{width:1080,height:1080},STORY:{width:1080,height:1920}}));
test('Invitation supports print PDF rather than an arbitrary image size',()=>assert.equal(outputInput.safeParse({version:0,kind:'INVITATION',format:'SQUARE',locale:'tr'}).success,false));
test('Generation retains output-type validation and explicit approval',()=>{const v={version:0,kind:'INVITATION',format:'PRINT',locale:'tr',previewHash:'a'.repeat(64),reason:'Güncel önizleme kontrol edildi.',confirmed:true};assert.equal(generateInput.safeParse(v).success,true);assert.equal(generateInput.safeParse({...v,format:'WEB'}).success,false);assert.equal(generateInput.safeParse({...v,confirmed:false}).success,false);});
test('Singleton source identity is explicitly included in saves',()=>assert.equal(saveInput.safeParse({version:0,settings:defaultSettings,imageId:null,reason:'Yeni tasarım kaydedildi.',confirmed:true}).success,false));
test('Cross-source unknown fields cannot modify settings',()=>assert.equal(settingsSchema.safeParse({...defaultSettings,actorId:'forged'}).success,false));
test('Unsafe external URL protocols and credentials are rejected',()=>{for(const website of ['javascript:alert(1)','http://example.invalid','https://user:pass@example.invalid'])assert.equal(settingsSchema.safeParse({...defaultSettings,website}).success,false);});
test('Empty external URL is optional',()=>assert.equal(settingsSchema.safeParse({...defaultSettings,website:''}).success,true));
test('Unsafe accent injection cannot enter the SVG template',()=>assert.equal(settingsSchema.safeParse({...defaultSettings,accent:'red\" onload=\"x'}).success,false));
test('Unsupported format is rejected',()=>assert.equal(outputInput.safeParse({version:0,kind:'POSTER',format:'CUSTOM',locale:'tr'}).success,false));
test('Source fingerprint is stable across object key ordering',()=>assert.equal(fingerprint({b:1,a:{z:2,y:3}}),fingerprint({a:{y:3,z:2},b:1})));
test('Source changes invalidate an earlier preview fingerprint',()=>assert.notEqual(fingerprint({text:'a',imageHash:'1'}),fingerprint({text:'b',imageHash:'1'})));
test('Old source version is rejected',()=>assert.throws(()=>sameVersion(0,1)));
test('Real invitation PDF embeds Unicode fonts and remains bounded',async()=>{const r=await renderPromotion({kind:'INVITATION',format:'PRINT',text,settings:defaultSettings});assert.equal(r.mime,'application/pdf');const d=await PDFDocument.load(r.content);assert.equal(d.getPageCount(),1);assert.equal(d.getPage(0).getWidth(),595.28);assert.ok(r.content.length>2000);});
test('Excess invitation text is never silently cut',async()=>{await assert.rejects(()=>renderPromotion({kind:'INVITATION',format:'PRINT',text:{...text,invitation:('Bilimsel çalışmaya davet.\n').repeat(100)},settings:defaultSettings}));});
test('Web poster is an actual PNG with exact output dimensions',async()=>{const r=await renderPromotion({kind:'POSTER',format:'WEB',text,settings:defaultSettings});const m=await sharp(r.content).metadata();assert.equal(m.format,'png');assert.equal(m.width,1200);assert.equal(m.height,675);});
test('Uploaded image template requires the separate image source',async()=>assert.rejects(()=>renderPromotion({kind:'POSTER',format:'WEB',text,settings:{...defaultSettings,template:'UPLOADED'}})));
test('Supported upload template renders image with separate text fields',async()=>{const image=await sharp({create:{width:600,height:600,channels:3,background:'#246b46'}}).png().toBuffer();const r=await renderPromotion({kind:'POSTER',format:'SQUARE',text,settings:{...defaultSettings,template:'UPLOADED'},image});const m=await sharp(r.content).metadata();assert.equal(m.width,1080);assert.equal(m.height,1080);});

const facts={theme:{tr:'Bilim ve toplum',en:'Science and society'},participationMode:'HYBRID'};
function chairFixture(){
 const person=emptyRecord('PERSON');person.translations.tr.title='Prof. Şule Işık';person.translations.en={enabled:true,title:'Professor Şule Işık',body:''};
 const committee=emptyRecord('COMMITTEE');committee.translations.tr.title='Düzenleme Kurulu';committee.translations.en={enabled:true,title:'Organizing Committee',body:''};
 committee.people=[{personId:'person-1',role:{tr:'Kongre Başkanı',en:'Congress Chair'},talk:{tr:'',en:''},pageSlug:''}];
 return [{id:'person-1',kind:'PERSON',archived:false,publishedVersion:2,published:person},{id:'committee-1',kind:'COMMITTEE',archived:false,publishedVersion:4,published:committee}];
}
const binding={recordId:'committee-1',personId:'person-1'};
test('promotion-only congress facts resolve real translated values without a CMS or chair dependency',()=>{
 const tr=linkedPromotionSource(facts,null,[],'tr'),en=linkedPromotionSource(facts,null,[],'en');
 assert.deepEqual(tr.values,{theme:'Bilim ve toplum',participationMode:'Hibrit (yüz yüze ve çevrim içi)'});
 assert.deepEqual(en.values,{theme:'Science and society',participationMode:'Hybrid (in person and online)'});
 assert.equal(interpolate('{theme} / {participationMode}',en.values),'Science and society / Hybrid (in person and online)');
});
test('missing scientific theme, attendance mode or chairman is never fabricated or replaced by Turkish',()=>{
 const empty=linkedPromotionSource(emptyInvitationFacts(),null,[],'tr');assert.deepEqual(empty.values,{});assert.equal(empty.evidence,null);
 for(const key of ['theme','participationMode','chair'])assert.throws(()=>interpolate('{'+key+'}',empty.values),/kaynağını/);
 const en=linkedPromotionSource({...facts,theme:{tr:'Yalnız Türkçe',en:''}},null,[],'en');assert.equal(en.values.theme,undefined);assert.throws(()=>interpolate('{theme}',en.values));
});
test('chairman uses the explicitly selected published relationship and the requested locale',()=>{
 const records=chairFixture();assert.equal(resolveChairSource(binding,records,'en').text,'Professor Şule Işık · Congress Chair');
 assert.equal(chairSourceOptions(records).length,1);assert.equal(resolveChairSource(null,records,'tr'),null);
 assert.throws(()=>resolveChairSource({...binding,recordId:'another-congress'},records,'tr'));
 assert.throws(()=>resolveChairSource({...binding,personId:'unrelated-person'},records,'tr'));
});
test('withdrawn, archived, removed or untranslated chairman sources stop generation instead of using a stale name',()=>{
 const changes=[r=>r[0].publishedVersion=null,r=>r[1].archived=true,r=>r[1].published.people=[],r=>r[0].published.translations.en.enabled=false,r=>r[1].published.people[0].role.en=''];
 for(const change of changes){const records=chairFixture();change(records);assert.throws(()=>resolveChairSource(binding,records,'en'));}
});
test('source edits invalidate approval fingerprints even when the manually edited invitation stays unchanged',()=>{
 const manual={...defaultSettings,invitationTr:'Bu metin organizatör tarafından elle düzenlendi; imza sabit.'};
 const make=(f,records)=>{const source=linkedPromotionSource(f,binding,records,'tr');return {text:resolvedText(manual,{...values,...source.values},'tr'),source:source.evidence};};
 const base=make(facts,chairFixture());
 for(const nextFacts of [{...facts,theme:{...facts.theme,tr:'Yeni bilimsel tema'}},{...facts,participationMode:'ONLINE'}]){const next=make(nextFacts,chairFixture());assert.notEqual(fingerprint(next),fingerprint(base));assert.equal(next.text.invitation,manual.invitationTr);}
 const renamed=chairFixture();renamed[0].published.translations.tr.title='Prof. Yeni Başkan';renamed[0].publishedVersion++;
 const next=make(facts,renamed);assert.notEqual(fingerprint(next),fingerprint(base));assert.equal(next.text.invitation,manual.invitationTr);assert.equal(next.text.signature,values.signature);
 const republished=chairFixture();republished[1].publishedVersion++;assert.notEqual(fingerprint(make(facts,republished)),fingerprint(base));
});
test('adding source placeholders preserves the saved manual text and resolves a real Unicode invitation PDF',async()=>{
 const original='Elle yazılan giriş. Tema: {theme}. Katılım: {participationMode}.\nBaşkan: {chair}.\n{signature}';
 const settings={...defaultSettings,invitationTr:original,chairSource:binding},source=linkedPromotionSource(facts,binding,chairFixture(),'tr'),resolved=resolvedText(settings,{...values,...source.values},'tr');
 assert.equal(settings.invitationTr,original);assert.match(resolved.invitation,/Bilim ve toplum/);assert.match(resolved.invitation,/Şule Işık · Kongre Başkanı/);assert.match(resolved.invitation,/Düzenleme Kurulu/);
 const r=await renderPromotion({kind:'INVITATION',format:'PRINT',text:resolved,settings});assert.equal((await PDFDocument.load(r.content)).getPageCount(),1);
});
test('legacy manual settings and output snapshots are preserved when no new source is selected',()=>{
 const legacy={...defaultSettings};delete legacy.chairSource;const parsed=settingsSchema.parse(legacy);
 assert.equal(parsed.chairSource,null);assert.deepEqual(promotionSettingsSnapshot(parsed),legacy);
 const source=linkedPromotionSource(emptyInvitationFacts(),parsed.chairSource,[],'tr');
 assert.deepEqual(resolvedText(parsed,{...values,...source.values},'tr'),resolvedText(legacy,values,'tr'));
});
