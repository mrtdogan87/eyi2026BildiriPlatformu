import { z } from 'zod';
const text = (max: number) => z.object({ tr:z.string().trim().max(max), en:z.string().trim().max(max) }).strict();
const defaultHeroCaption = () => ({tr:'Bilgiyle buluş.\nBirlikte düşün.',en:'Meet through knowledge.\nThink together.'});
export const defaultSectionTitles = () => ({
  aboutTitle:{tr:'Yeni fikirler için ortak bir zemin.',en:'Common ground for new ideas.'},
  participationTitle:{tr:'Kongre yolculuğunuz burada başlıyor.',en:'Your congress journey starts here.'},
  datesTitle:{tr:'Önemli tarihler',en:'Important dates'},
  contactTitle:{tr:'Birlikte konuşalım.',en:'Let’s start a conversation.'},
});
const sectionTitles=z.object({aboutTitle:text(180),participationTitle:text(180),datesTitle:text(180),contactTitle:text(180)}).strict();
const safeUrl = z.string().trim().max(500).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Harici bağlantı kullanıcı bilgisi içermeyen tam bir HTTPS adresi olmalı.');
const action = z.object({ enabled:z.boolean(), target:z.enum(['SUBMISSIONS','REGISTRATION','ABOUT','DATES','CONTACT','EXTERNAL']), label:text(45), url:safeUrl }).strict().superRefine((value,ctx) => {
  if (value.enabled && (!value.label.tr || !value.label.en)) ctx.addIssue({code:'custom',message:'Açık düğmenin Türkçe ve İngilizce etiketi gerekli.'});
  if (value.enabled && value.target === 'EXTERNAL' && !value.url) ctx.addIssue({code:'custom',message:'Harici düğme için HTTPS adresi gerekli.'});
});
export const siteSchema = z.object({ version:z.literal(1), shortName:text(50), fullName:text(180).default(()=>({tr:'',en:''})), eyebrow:text(80), headline:text(200), introduction:text(1000), about:text(2000), venue:text(200), contactEmail:z.union([z.literal(''),z.string().trim().email().max(254)]), logoAlt:text(180), heroAlt:text(300), heroCaption:text(160).default(defaultHeroCaption), sections:sectionTitles.default(defaultSectionTitles), actions:z.array(action).max(2) }).strict();
export type SiteConfiguration = z.infer<typeof siteSchema>;
export type SiteAction = SiteConfiguration['actions'][number];
export const actionLabels: Record<SiteAction['target'],string> = {SUBMISSIONS:'Bildiri gönderimi',REGISTRATION:'Kayıt',ABOUT:'Kongre hakkında',DATES:'Önemli tarihler',CONTACT:'İletişim',EXTERNAL:'Harici HTTPS bağlantısı'};
export function defaultSiteConfiguration(): SiteConfiguration {
  return { version:1,shortName:{tr:'',en:''},fullName:{tr:'',en:''},eyebrow:{tr:'Bilimsel buluşma',en:'An academic gathering'},headline:{tr:'',en:''},introduction:{tr:'Bilgiyi paylaşmak, yeni sorular sormak ve birlikte düşünmek için buluşuyoruz.',en:'A place to share knowledge, ask new questions and think together.'},about:{tr:'Kongreye ilişkin başvuru ve katılım bilgilerini bu sayfada takip edebilirsiniz. Açık işlemlere aşağıdaki bağlantılardan ulaşabilirsiniz.',en:'Follow submission and participation information here, and use the links below to access the available services.'},venue:{tr:'',en:''},contactEmail:'',logoAlt:{tr:'',en:''},heroAlt:{tr:'',en:''},heroCaption:defaultHeroCaption(),sections:defaultSectionTitles(),actions:[{enabled:true,target:'SUBMISSIONS',label:{tr:'Bildiri gönder',en:'Submit a paper'},url:''},{enabled:true,target:'REGISTRATION',label:{tr:'Kayıt ol',en:'Register'},url:''}] };
}
export function effectiveSite(value: unknown) { return value == null ? defaultSiteConfiguration() : siteSchema.parse(value); }
export function localized(value: {tr:string;en:string},locale:'tr'|'en',fallback='') { return value[locale] || value.tr || value.en || fallback; }
export function actionHref(action: SiteAction,slug: string,modules: {SUBMISSIONS:boolean;REGISTRATION:boolean},contactAvailable=true) {
  if (!action.enabled) return null;
  const root=`/${encodeURIComponent(slug)}`;
  switch(action.target) { case 'SUBMISSIONS':return modules.SUBMISSIONS ? root+'/bildiri-gonder' : null;case 'REGISTRATION':return modules.REGISTRATION ? root+'/kayit' : null;case 'ABOUT':return root+'#kongre-hakkinda';case 'DATES':return root+'#onemli-tarihler';case 'CONTACT':return contactAvailable ? root+'#iletisim' : null;case 'EXTERNAL':return action.url || null; }
}
function luminance(hex: string) { const c=hex.slice(1).match(/../g)!.map(part=>parseInt(part,16)/255).map(value=>value<=0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
export function contrast(a:string,b:string) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function readableAccent(hex: string) {
  let color=hex; const components=hex.slice(1).match(/../g)!.map(part=>parseInt(part,16));
  for (let step=0;contrast(color,'#ffffff')<4.5 && step<100;step++) color='#'+components.map(value=>Math.round(value*(1-(step+1)/100)).toString(16).padStart(2,'0')).join('');
  return color;
}
export const appearanceSchema = z.object({theme:z.enum(['eyi','simple']),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).strict();
