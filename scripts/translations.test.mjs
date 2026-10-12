import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDocument,newBlock,documentSchema} from '../src/modules/cms/configuration.ts';
import {emptyRecord} from '../src/modules/content/configuration.ts';
import {defaultSiteConfiguration,effectiveSite,siteSchema} from '../src/modules/site/configuration.ts';
import {profileConfiguration} from '../src/modules/congress/configuration.ts';
import {pageFields,recordFields,siteFields,settingsFields,prepareEnglishPage,replaceText,missingEnglish} from '../src/modules/translations/fields.ts';

test('all CMS block kinds expose their visible text without destinations or IDs',()=>{
 const d=emptyDocument();d.translations.tr.blocks=['heading','paragraph','notice','list','image','download','button','table','dynamic'].map((type,i)=>newBlock(type,'b'+i));
 const f=pageFields(d,'tr');assert.equal(f.length,17);assert.ok(f.some(x=>x.path.includes('headers')));assert.ok(f.some(x=>x.path.includes('rows')));assert.ok(f.some(x=>x.path.includes('items')));assert.ok(f.every(x=>!x.path.some(k=>['id','mediaId','url','target','recordId','source'].includes(k))));
});
test('English layout preparation keeps references and existing title, clears only new block text',()=>{
 const d=emptyDocument();d.translations.tr.title='Türkçe';d.translations.en.title='Existing English';d.translations.tr.blocks=[{...newBlock('button','go'),label:'Başvur',target:'PAGE',pageSlug:'kayit-bilgileri'},{...newBlock('image','photo'),mediaId:'media-1',alt:'Görsel',caption:'Açıklama'}];
 const next=prepareEnglishPage(d);assert.equal(next.translations.en.title,'Existing English');assert.equal(next.translations.en.blocks[0].pageSlug,'kayit-bilgileri');assert.equal(next.translations.en.blocks[1].mediaId,'media-1');assert.equal(next.translations.en.blocks[1].alt,'');assert.equal(next.translations.en.enabled,false);assert.equal(d.translations.tr.blocks[1].alt,'Görsel');assert.equal(d.translations.en.blocks.length,0);assert.equal(documentSchema.safeParse(next).success,true);assert.throws(()=>prepareEnglishPage(next));
});
test('editing text is immutable and preserves the other language and structural values',()=>{
 const d=emptyDocument();d.translations.tr.title='Kaynak';const next=replaceText(d,['translations','en','title'],'Translation');assert.equal(next.translations.en.title,'Translation');assert.equal(next.translations.tr.title,'Kaynak');assert.equal(d.translations.en.title,'');assert.equal(next.menuOrder,d.menuOrder);
});
test('record fields include person roles, talks, image alt, caption and link labels',()=>{
 const d=emptyRecord('SPEAKER');d.people=[{personId:'person',role:{tr:'Başkan',en:''},talk:{tr:'Konuşma',en:''},pageSlug:'oturum'}];d.images=[{mediaId:'pic',alt:{tr:'Resim',en:''},caption:{tr:'Açıklama',en:''}}];d.link={...d.link,target:'EXTERNAL',url:'https://example.com',label:{tr:'Site',en:''}};
 assert.equal(recordFields(d,'tr').length,7);assert.equal(missingEnglish(recordFields(d,'tr'),recordFields(d,'en')),5);
});
test('legacy site documents receive independent configurable section titles',()=>{
 const current=defaultSiteConfiguration();const old={...current};delete old.sections;const next=effectiveSite(old);assert.equal(next.sections.datesTitle.tr,'Önemli tarihler');next.sections.datesTitle.tr='Takvim';assert.equal(effectiveSite(old).sections.datesTitle.tr,'Önemli tarihler');assert.ok(siteFields(current,'en').some(x=>x.path.join('.')==='sections.aboutTitle.en'));assert.equal(siteSchema.safeParse({...current,sections:{...current.sections,datesTitle:{tr:'x'.repeat(181),en:''}}}).success,false);
});
test('settings translations cover both theme and every participant declaration',()=>{
 const c=profileConfiguration();assert.equal(settingsFields(c,'en').length,6);assert.equal(missingEnglish(settingsFields(c,'tr'),settingsFields(c,'en')),0);
});
