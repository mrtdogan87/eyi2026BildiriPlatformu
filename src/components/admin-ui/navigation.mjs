export const congressNavigation = [
  {label:'Genel bakış',items:[['panel','Genel bakış','context'],['is-listesi','İş listesi','worklist'],['talepler','Talepler','feedback','CMS'],['iletisim','İletişim','communications']]},
  {label:'Başvurular',items:[['bildiriler','Bildiriler','submissions.read','SUBMISSIONS'],['hakemlik','Hakemlik','reviews.read','REVIEWS'],['oduller','Ödüller','awards.read','AWARDS']]},
  {label:'Katılım',items:[['kayitlar','Kayıtlar','registrations.read','REGISTRATION'],['odemeler','Ödemeler','payments.read','REGISTRATION'],['ucretler','Ücretler','settings','REGISTRATION']]},
  {label:'Program',items:[['program','Oturumlar','program.read','PROGRAM'],['etkinlikler','Etkinlikler','activities.read','ACTIVITIES'],['yoklama','Yoklama','attendance.perform','ATTENDANCE']]},
  {label:'Web sitesi',items:[['cms','Sayfalar','cms','CMS'],['icerik','Ortak içerikler','cms','CMS'],['cms/medya','Medya','cms','CMS'],['site-gorunumu','Görünüm','settings'],['cms/aktarim','Referans aktarımı','cms','CMS']]},
  {label:'Belgeler ve yayın',items:[['belgeler','Sertifikalar','certificates.read','CERTIFICATES'],['belgeler/uygunluk','Belge kuralları','certificates.read','CERTIFICATES'],['tanitim','Davet ve afiş','promotion.read','PROMOTION'],['yayinlar','Tam metinler','publications.read','PUBLICATIONS'],['kitaplar','Kitaplar','publications.read','PUBLICATIONS'],['arsiv','Arşiv ve kapanış','archive.read','ARCHIVE']]},
  {label:'Yönetim',items:[['kongre-ayarlari','Kongre ayarları','settings'],['moduller','Modüller','modules'],['ekip','Ekip ve yetkiler','members'],['teslim-istisnalari','Teslim istisnaları','settings'],['islem-gecmisi','İşlem geçmişi','audit']]},
  {label:'Görevlerim',items:[['hakemlik/gorevler','Hakem görevlerim','reviews.perform','REVIEWS'],['oduller/juri','Jüri görevlerim','awards.perform','AWARDS'],['program/gorevler','Başkan görevlerim','program.perform','PROGRAM'],['kayitlarim','Kendi kayıtlarım','own']]},
];
export const platformNavigation = [{label:'Platform',items:[['platform','Genel bakış'],['kongreler','Kongreler'],['kurumlar','Kurumlar'],['kullanicilar','Kullanıcılar ve yetkiler'],['sistem','Sistem ayarları'],['platform/gecmis','İşlem geçmişi']]}];
export const platformPaths = new Set(['platform','platform/gecmis','kongreler','kurumlar','kullanicilar','sistem','kongre-olustur','arayuz-ornekleri']);
export function visibleNavigation(actions,modules,closed=false) {
  const allowed=new Set(actions), enabled=new Set(modules);
  return congressNavigation.map(group=>({label:group.label,items:group.items.filter(([, ,action,module])=>allowed.has(action)&&(!module||(enabled.has(module)&&(!closed||module==='ARCHIVE'))))})).filter(group=>group.items.length);
}
export function routeInfo(pathname) {
  const path=pathname.replace(/^\/admin\/?/,'');
  const items=[...platformNavigation,...congressNavigation].flatMap(group=>group.items.map(([route,label])=>({route,label,group:group.label})));
  const match=items.filter(item=>path===item.route||path.startsWith(item.route+'/')).sort((a,b)=>b.route.length-a.route.length)[0];
  if(path==='kongre-olustur')return {route:'kongre-olustur',label:'Yeni kongre',group:'Platform'};
  if(path==='arayuz-ornekleri')return {route:path,label:'Arayüz örnekleri',group:'Tasarım'};
  return match??{route:'',label:'Giriş',group:'Hesap'};
}
