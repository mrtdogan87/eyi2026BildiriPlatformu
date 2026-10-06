# P13 — Hakemlik, değerlendirme turları ve editör kararı

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p13`. Başlangıç: P12 `6629d9bb`.
Tüm denemeler sentetik yerel verilerle ve capture e-postayla yapıldı.

## Davet ve değerlendirme akışı

Panelde **Hakemlik ve editör kararları**, hakem hesabında **Hakem görevlerim**
kullanılır. Platform yöneticisi, ilgili kurum organizatörü ve kongre sekreteri
bilimsel turları yönetir. Hakem yalnız kendi görevlerini görür ve yanıtlar.
CMS içerik editörü bilimsel karar yetkisi kazanmaz. Hakem adayları Ekip ekranından
kongreye aktif hakem rolüyle eklenir; atama mevcut, aktif hesaba yapılır.

Gönderilmiş bildiriye tur açılırken metin, yazar/kimlik kaynağı, dosya sürümü,
içerik SHA-256 ve puan ölçütleri sabitlenir. Aynı anda tek açık tur vardır.
Tur bazında son tarih ve açık/tek kör/çift kör yöntem seçilir; varsayılan tek
kördür. Arayüz üç ölçütün TR/EN etiketlerini düzenler; çekirdek 1–10 benzersiz
ölçüt destekler. Puanlar 1–5 tam sayıdır; otomatik kabul veya ret üretmez.

Davet kabulü, ret ve çıkar çatışması ayrı sonuçlardır. Güncel sahip/yazarın
kendi bildirisini değerlendirmesi engellenir. Diğer kişisel/kurumsal ilişkiler
hakemin açık beyanıyla kontrol edilir. Kabulden sonra fark edilen çatışma
bildirilebilir; görev durur. Davet ve değerlendirme son tarihi sunucuda
uygulanır; editör süreyi gerekçeyle uzatabilir. Atama veya tur gerekçeyle
kapatılabilir; teslim edilmiş formlar geçmişte korunur.

Kısmi puanlarla taslak kaydedilebilir ve sayfa yenilenince geri gelir. Teslim
bütün ölçütleri, karar önerisini ve yazara açık yorumu ister. Teslim edilen
form değişmez; ayrı tur üzerinden yeni değerlendirme yapılır. Her form tam
bildiri/hakem/tur/kaynak sürümüne bağlıdır. İki eşzamanlı teslimden yalnız biri
kazanır. Hakem değişikliği eski değerlendirmeyi başka kişiye taşımaz.

## Körlük ve özel dosyalar

Çift körde hakeme gösterilecek **ayrı anonim metin**, kaynakta dosya varsa
**ayrı PDF/DOCX** ve editörün içerik/özellik kontrolü onayı zorunludur. Hakem
cevabında yazar kimliği, asıl dosya adı ve kaynak kimlik özeti bulunmaz.
İndirilen dosyanın adı genel tur adıdır. Tek kör ve açık değerlendirmede
metne yazar adı/kurumu eklenir, yazar e-postaları paylaşılmaz.

Sistem belge içeriğini, teşekkürleri, kendine atıfları veya DOCX/PDF özelliklerini
otomatik anonimleştirmez. İnsan kontrolü gerekli ve arayüzde açıkça belirtilir.
Dosya imzası ve hash içeriğin biçim/bütünlüğünü kontrol eder; anonimlik garantisi
vermez. Dosyasız bildiri metin üzerinden değerlendirilebilir.

Dosya en fazla 10 MB gerçek PDF/DOCX olmalıdır. Akıştan okunan multipart istek
13 MB, JSON 64 KB ile sınırlıdır. Özel dosyalar yetkili kongre/görev bağlamında,
önbelleksiz, `nosniff` ve indirme olarak verilir. Hakem kabul ve çatışma yok
beyanı öncesi dosya indiremez. Kapatılmış kararlı turda kendi teslim edilmiş
formunun dosyası korunur; iptal edilen turda dosya erişimi durur.

## Dışarıdan gelen form, revizyon ve karar

Sekreterya **kabul edilmiş ve çatışmasız atamaya** dışarıdan gelen formu elle
kaydedebilir. Orijinal PDF/DOCX kanıtı, tam hedef eşleşmesi onayı, puanlar,
yorumlar ve gerekçe gerekir. Dosya adı eşleştirme anahtarı değildir; her eki
ayrı atamaya bağlamak gerekir. Otomatik e-posta kutusu okuma veya belge içinden
puan çıkarma bu sürümde yoktur. Kanıt dosyası yalnız yetkili ekipçe indirilir.

Editör revizyon/kabul/ret kararı verir. Bekleyen veya hiç teslim edilmemiş
formla karar için ayrıca eksik değerlendirme onayı gerekir. Hakem önerisiyle
çelişen karar formu değiştirmez. Karar ve iç gerekçe değişmez geçmişte tutulur;
bildiri durumu aynı transaction içinde güncellenir. Eski bildiri durum API'si
hakemlik geçmişini atlayamaz, geçmişi olan bildiri kalıcı silinemez.

Revizyon kararı isteğe bağlı P11 DOCX düzeltme talebini aynı işlemde açar.
Yazar dosyayı önerir, yetkili onaylar, sonra yeni tur açılır. P11 içerik/yazar/
dosya değişikliği eski turun kaynak hash/sürümünü geçersiz kılar; eski görev
kabulü, teslimi ve kararı durur. Tur metni ve önceki formlar silinmez. Revizyon
sonrası değişmemiş kaynakla yeni tur açılamaz; açık P11 talebi önce çözülür.
Kesin kabul/ret sonrası yeniden açma ayrıca açık onay ister.

Yazar portalı yalnız kendi sonuçlarını görür. TR/EN editör geri bildirimi
karar sonrasında yayımlanır. Hakemlerin açık yorum ve puanlarının yayını editörün
ayrı içerik/kimlik kontrolü onayına bağlıdır. Açık yöntemde yayımlanan formda
hakem adı görünür; tek/çift körde görünmez. Özel editör yorumları, karar iç
gerekçesi, aktör kimliği, davet gerekçesi ve kanıt dosyaları yazara verilmez.
Serbest yorumlar kişisel bilgi barındırabilir; yayın öncesi editör incelemesi
otomatik metin temizliğinin yerini tutmaz.

## Yetki, kuyruk ve modül sınırı

Hakemlik ve bildiri modüllerinin ikisi de açık olmalıdır. Kapalı modül okuma,
yazma, özel dosya, yazar sonuçları ve bekleyen e-posta gönderimini durdurur;
veriyi silmez. Rol/hesap/kurum üyeliği her istekte ve mutasyonda kongre kilidi
sonrası tekrar kontrol edilir. Sürüm karşılaştırması, kayıt değişikliği,
bildirim kuyruğu ve audit aynı transaction içindedir. İstemci aktör veya
kongre atayamaz; çapraz kaynaklı yazı reddedilir.

Davet ve karar bildirimleri P09 kuyruğunu kullanır; izlenen yanıt adresi
İletişim ekranında tanımlanır. Bozuk ayar/kuyruk oluşturma bütün işlemi geri
alır. Worker, taşıma öncesi kaynak sürümünü, geçerli davet/kararı, alıcıyı,
üyeliği ve modülleri kontrol eder. Yeni tur açılmışsa eski bekleyen karar
bildirimi iptal edilir. Yerelde `MAIL_MODE=capture`; gerçek gönderim yapılmadı.

Sekreterya iş listesi eksik atama, davet yanıtları, çatışma/ret, bekleyen
form, geçmiş son tarih ve değişmiş kaynak ihtiyacını gösterir. Yönetim ve
hakem listeleri ilk sürümde son 200 kayıt/görevle sınırlıdır; sayfalama yoktur.
`src/modules/reviews` kurallar/şema/projeksiyon çekirdeğidir;
`src/integrations/congress/reviews` izin, DB, dosya, audit ve kuyruğu bağlar.
Kongre, ödeme ve CMS olmadan bağımsız workshop değerlendirmesi birim testinde
aynı çekirdekle doğrulanır; ayrı ürün dağıtımı değildir.

## Doğrulama ve kurtarma

**592 otomatik kontrol** geçti: 171 birim (18 yeni hakemlik), 421 yerel HTTP
(51 P13, 49 P12, 43 P11, 37 P10, 46 P09, 195 önceki paketler).
Ayrı **75 preview koruması** kontrolü DB bağlantısı olmadan geçti.
Lint, TypeScript, üretim derlemesi ve DB/Prisma şema karşılaştırması başarılıdır.
**13 tarayıcı kontrolü** geçti. Kanıtlar `.local/p13-browser-check-result.json` ve `p13-*.jpg` içinde:
davet kabulü, kalıcı taslak, teslim, editör kararı, iki turlu değişmez geçmiş,
çift kör hazırlık alanları, TR/EN yazar görünürlüğü ve 390 piksel ekran.

Paket öncesi `P13-before-20261006` yedeğinde 50 tablo restore/parmak iziyle
karşılaştırıldı. Additive `20261006220000_p13_reviews` migration'ı dört tabloyu
(`ReviewRound`, `ReviewAssignment`, `ReviewEvaluation`, `ReviewDecision`) ve
bildiri inceleme sürümünü ekler. Toplam **22 migration, 54 tablo**; mevcut
migration dosyaları ve eski veri korunmuştur. Kaynak/istemci çıktısında özel
kimlik bilgisi taraması ve standalone `.env` kopyası kontrolü temizdir.

Final `../.recovery/P13-20261006-final` kaynak/Git bundle, özel yerel dosyalar,
capture mail, DB dump ve test/tarayıcı kanıtını korur. Web/worker durdurularak
tam restore yapıldı; 54 tablonun satır sayısı ve sıralı içerik SHA-256 değerleri
birebir eşleşti. Özel dosyalar 0600, checkpoint klasörü 0700; geçici restore
DB'si kaldırıldı. Sonra normal capture worker ile yerel web yeniden açıldı.
Sıradaki paket **P14 program ve oturum yönetimi**dir.
