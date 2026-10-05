import {emptyDocument,type CmsDocument} from './configuration.ts';
// Generic structure only. Historical EYI dates, people, bank data and promises never enter this catalog.
export const starterPages=[
 ['davet','Davet','Invitation','', 'Davet metni'],
 ['kongre-hakkinda','Kongre hakkında / tema','About / theme','','Kongrenin amacı ve teması'],
 ['slogan','Slogan','Motto','','Etkinliğin sloganı'],
 ['afis','Afiş','Poster','','Afiş ve erişilebilir açıklaması'],
 ['kurullar','Kurullar','Committees','','Kurullar hakkında'],
 ['duzenleme-kurulu','Düzenleme Kurulu','Organizing Committee','kurullar','Üyeler ve kurumları'],
 ['danisma-kurulu','Danışma Kurulu','Advisory Committee','kurullar','Üyeler ve kurumları'],
 ['bilim-kurulu','Bilim Kurulu','Scientific Committee','kurullar','Üyeler ve kurumları'],
 ['sekreterya','Sekreterya','Secretariat','kurullar','Sekreterya ve iletişim'],
 ['konular','Konular','Topics','','Kongrenin konu başlıkları'],
 ['bilimsel-program','Bilimsel Program','Scientific Programme','','Program hakkında'],
 ['davetli-konusmacilar','Davetli Konuşmacılar','Invited Speakers','bilimsel-program','Konuşmacılar ve konuşma başlıkları'],
 ['panel','Panel','Panel','bilimsel-program','Panelin konusu ve katılımcıları'],
 ['workshop','Workshop','Workshop','bilimsel-program','Eğitimler ve katılım koşulları'],
 ['sempozyum-programi','Sempozyum Programı','Symposium Programme','bilimsel-program','Güncel program'],
 ['cevrim-ici-oturumlar','Çevrim içi oturumlar','Online Sessions','bilimsel-program','Salonlar ve bağlantılar'],
 ['yazarlar-icin-bilgiler','Yazarlar için Bilgiler','Author Guidelines','genel-bilgiler','Yazım ve değerlendirme kuralları'],
 ['ozet-sablonlari','TR/EN özet şablonları','Abstract Templates','yazarlar-icin-bilgiler','Türkçe ve İngilizce şablonlar'],
 ['tam-metin-sablonlari','TR/EN tam metin şablonları','Full Paper Templates','yazarlar-icin-bilgiler','Türkçe ve İngilizce şablonlar'],
 ['kabul-edilen-bildiriler','Kabul edilen bildiriler','Accepted Papers','bilimsel-program','Onaylı bildiri listesi'],
 ['kongre-kitaplari','Özet ve Tam Metin Kitabı','Congress Proceedings','bilimsel-program','Onaylı yayınlar ve dosyaları'],
 ['yayin-olanaklari','Yayın Olanakları ve Dergi Alternatifleri','Publication Opportunities','genel-bilgiler','Yayın tercihleri ve dergi koşulları'],
 ['oduller','Ödüller','Awards','genel-bilgiler','Ödül türleri ve ölçütleri'],
 ['genel-bilgiler','Genel Bilgiler','General Information','','Katılım hakkında'],
 ['onemli-tarihler','Önemli Tarihler','Important Dates','genel-bilgiler','Onaylı etkinlik ve teslim tarihleri'],
 ['kongre-yeri','Kongre Yeri','Venue','genel-bilgiler','Yer, adres ve ulaşım'],
 ['konaklama-transfer','Konaklama–Transfer','Accommodation & Transfer','genel-bilgiler','Konaklama ve transfer bilgileri'],
 ['ucretler','Ücretler','Fees','genel-bilgiler','Katılım ücretleri ve ödeme koşulları'],
 ['kayit-bilgileri','Kayıt','Registration Information','genel-bilgiler','Kayıt koşulları'],
 ['bildiri-gonderimi','Bildiri Gönderimi','Paper Submission Information','genel-bilgiler','Teslim koşulları'],
 ['gezi-programi','Gezi Programı','Social Programme','genel-bilgiler','Program ve katılım bilgileri'],
 ['sehir-tanitimi','Şehir tanıtımı','City Guide','genel-bilgiler','Şehir ve ziyaret noktaları'],
 ['sponsorluk','Sponsorluk','Sponsorship','genel-bilgiler','Sponsorlar ve destek koşulları'],
 ['galeri','Galeri','Gallery','','Görseller ve açıklamaları'],
 ['iletisim','İletişim / geri bildirim','Contact / Feedback','','İletişim yolları'],
 ['duyurular','Duyurular','Announcements','','Güncel duyurular'],
 ['haberler','Haberler','News','','Güncel haberler'],
 ['etkinlikler','Etkinlikler','Events','','Etkinlik bilgileri'],
 ['duyuru-arsivi','Duyuru arşivi','Announcement Archive','duyurular','Geçmiş duyurular'],
 ['haber-arsivi','Haber arşivi','News Archive','haberler','Geçmiş haberler'],
 ['etkinlik-arsivi','Etkinlik arşivi','Event Archive','etkinlikler','Geçmiş etkinlikler'],
] as const;
export function starterDocument(entry:typeof starterPages[number],order:number):CmsDocument {
 const doc=emptyDocument();doc.showInMenu=false;doc.menuOrder=order;doc.menuParent=entry[3];
 doc.translations.tr.title=entry[1];doc.translations.en.title=entry[2];
 doc.translations.tr.blocks=[{id:'section',type:'heading',level:2,text:entry[4]},{id:'content',type:'paragraph',text:''}];
 return doc;
}
