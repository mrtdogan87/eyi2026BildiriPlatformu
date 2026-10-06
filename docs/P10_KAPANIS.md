# P10 — Katılımcı paneli ve sekreterya iş listesi

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p10`. Canlı sistemlere değişiklik yapılmadı.

> P11 tamamlandı: aşağıdaki bağımsız köprü çerezi sınırlaması artık
> sunucuda iptal edilen bağlı oturumlarla giderildi. Güncel davranış için
> `docs/P11_KAPANIS.md` esas alınır.

## Katılımcının görebildiği ve yapabildiği işlemler

Kongreye ait `/<kongre>/katilimci` adresinden e-posta doğrulama bağlantısı
istenir. Bağlantı P09 kalıcı kuyruğuyla gönderilir; yerelde capture kullanır.
Token 24 saatlik ve tek kullanımlı, sunucu oturumu 8 saatliktir. Token ve
oturum anahtarı DB'de hash olarak saklanır. Oturum seçili kongreye ve
doğrulanmış e-postaya bağlıdır; ekip hesabı veya yönetici yetkisi oluşturmaz.
Doğrulama ve çıkış, önceki taslak/kayıt köprü çerezlerini de temizler.

Mevcut taslak/kayıt akışını açarken verilen köprü oturumu bağımsız, imzalı
ve sunucuda en çok 8 saat geçerli bir çerezdir. Panelden çıkış bu çerezi
tarayıcıdan siler; önceden kopyalanmış köprü çerezi kendi süresi dolana kadar
eski akışta geçerli kalabilir. Panel oturumunun DB'de iptali köprü oturumunu
sunucuda ayrıca iptal etmez. Birleşik erişim iptali P11'de ele alınacaktır.

`/<kongre>/katilimci/panel` ile kişisel platform hesabındaki
`/admin/kayitlarim`, doğrulanmış kimliğe ait bildiri ve kayıtları gösterir.
Taslaklar yalnız taslak sahibine; gönderilmiş bildiriler taslak sahibi ve
eşleşen yazarlara görünür. Kayıtlar sahibinin e-postasıyla eşleşir. Katılımcı
yalnız sahibi olduğu bildirinin mevcut akışını açabilir; kayıt köprüsü de
yalnız kendi e-postasıyla açılır.

Panel, bildiri durumu, mevcut kayıt/tutar, dekontun alınması ve kayıtlı
beyan bilgisini birbirinden ayırır. Eski `paidAt` ödeme doğrulaması sayılmaz;
bu alan kayıt sırasında dekont yüklenmesiyle doldurulmuş olabilir. P12 ödeme
doğrulaması henüz yoktur. Hakemlik, program, görev ve belge modülleri hazır
gibi gösterilmez. Eski kayıtlara geriye dönük beyan onayı uydurulmaz.

Katılımcı, gönderilmiş bildirisi için geri çekme, kendi kaydı için iptal
veya soru/yardım talebi oluşturabilir. Geri çekme yalnız taslak sahibine
açıktır; ortak yazarın görüntüleme hakkı bu işlemi açmaz. Bu talepler
bildiriyi geri çekmez, kaydı silmez, ödeme/iade veya program durumunu
değiştirmez. Kaynak modül kapalıysa yeni kaynak işlemi engellenir. Her iki
katılımcı modülü kapalıyken yeni genel talep de oluşturulamaz; eski talep
geçmişi korunur.

## Başvuru kuralları ve beyan kanıtı

Kongre ayarları, yapılandırılmış özetin açık olup olmadığını, ilgili teslim
aşamasını, TR/EN amaç-yöntem-bulgular-sonuç alanlarının zorunluluk ve kelime
sınırlarını tanımlar. Başvuru ekranı bu kuralları gösterir ve sunucu
gönderimde tekrar kontrol eder. Eski düz özet akışı korunur.

Bildiri gönderimi ve kayıt oluşturma, ekranda gösterilen beyanların gerçek
boolean onaylarını, dilini ve güncel metin/kurallar sürümünü ister. Eski
sürümle gönderim 409 alır. Sürüm hesabı nesne alanlarının sırasından bağımsızdır;
eşdeğer yapılandırmayı yeniden kaydetmek tek başına sürümü değiştirmez. Kabul edilen işlemle aynı transaction içinde
`DeclarationAcceptance` satırı oluşturulur: tam metinler, dil, sürüm,
uygulanan kurallar, kimlik ve kabul zamanı korunur. Sonraki ayar/metin
değişikliği geçmiş kanıtı değiştirmez. Tek entity için ikinci kabul satırı
oluşturulmaz.

Taslak düzenlemeleri ile nihai gönderim aynı bildiri/kongre kilit sırasını
kullanır. Gönderilmiş bildirinin içeriği eski form API'leriyle
değiştirilemez. Gerekçeli düzeltme, dosya sürümü ve eski erişim iptali P11
kapsamında kalır.

## Sekreterya iş listesi

`/admin/is-listesi` yalnız seçili kongrenin platform yöneticisi,
organizatörü ve sekreterine açıktır. Katılımcı, içerik editörü, hakem ve
diğer yetkisiz roller personel taleplerini okuyamaz. API'ler bağlamı
oturumdan alır; başka kongrenin kayıt kimliği erişim sağlamaz.

Kalıcı taleplerde sorumlu, Yeni/İnceleniyor/Bekliyor/Sonuçlandı durumu,
katılımcıya açık sonuç ve yalnız ekip için iç not ayrı tutulur. Sonuçlandırma
açıklayıcı sonuç ister. Her değişiklik sürüm kontrollüdür; eski sürüm 409
alır ve olay geçmişi eklenir. Atanabilecek kişiler aktif, ilgili kongrede
yetkili organizatör/sekreter veya platform yöneticileridir.

Personel e-posta/görüşmeden talebi elle kaydedebilir; bu işlem posta
kutusunu içe aktarmaz ve e-posta göndermez. Kaynak seçicisinde bu kongrenin
erişilebilir bildirisi, kaydı, CMS geri bildirimi veya e-posta teslim sorunu
seçilir. Kaynağa bağlama kendi durumunu otomatik değiştirmez. Elle yazılmış
talep sahibi e-postası katılımcıya bu iç kaydı okuma yetkisi vermez.

Geri bildirim ve teslim sorunları kendi modüllerinin mevcut durumlarından
okunur; iki ayrı değişebilir durum kopyası tutulmaz. Eksik işlem listesi
açık modüllerin etkin kurallarına göre taslak ve belge eksiklerini gösterir.
Ücret aşaması açık, tutarı pozitif kayıtlarda alınmış dekont veya eski
dekont tarihi ayrıca takip edilir; ödeme doğrulama düğmesi yoktur.

Liste sınırları görünürdür: son 200 talep; son 100 geri bildirim ve teslim
sorunu; tür başına son 200 kaynak/eksik işlem kaydı. Bu sınırlar eski
kayıtları DB'den silmez. Katılımcı DTO'sunda iç not, personel geçmişi ve
atama bilgisi bulunmaz. Personel kaynak listesine e-posta gövdesi, erişim
tokenı veya dosya içeriği taşınmaz.

Talep gönderimi kongre + gönderim anahtarıyla idempotenttir; aynı anahtarla
farklı içerik 409 alır. Tekrarlar hız sınırından önce kontrol edilir.
Doğrulanmış katılımcı için saatte 10, kongre genelinde dakikada 60 yeni
talep sınırı aynı kilit altında uygulanır. Personel iş listesi JSON
gövdeleri 64 KiB, katılımcı JSON uçları 32 KiB ile sınırlıdır. Yeni talepler
kongre satırını modül değişikliğiyle aynı sırada kilitler; kaynak/modül
kontrolü ve kayıt aynı transaction içinde tamamlanır. Eski taleplerin
personelce takibi kaynak modülün açık olmasını gerektirmez.

## Modül sınırları ve şema

İş listesi çekirdeği `src/modules/worklist` içinde yalnız kendi tablolarına
yazar. Kaynak doğrulama, yetkili sorumlu seçimi ve audit enjekte edilen
portlardır. Kongre bağlantısı `src/integrations/congress/worklist.ts`
üzerindedir. Bağımsız kullanım kanıtı ortak altyapıyla, kongre başvuru/kayıt
iş tablolarını çekirdeğe zorunlu kılmadan sınanır.

Tek migration `20261006170000_participant_worklist` beş yeni tablo ekler:
`WorkRequest`, `WorkRequestEvent`, `ParticipantAccessToken`,
`ParticipantSession`, `DeclarationAcceptance`. `Submission` tablosuna
nullable `structuredAbstract` eklenir. Toplam iş tablosu 37'den 42'ye çıkar.
Eski kayıtlar silinmez ve geçmiş beyan verisiyle doldurulmaz.

## Doğrulama ve kurtarma

- P10: **20 saf test + 37 HTTP/DB senaryosu** geçti.
- Birikimli: **122 saf test + 278 HTTP/DB kontrolü = 400 kontrol** geçti.
  HTTP/DB toplamı eski paketlerin 195, iletişimin 46 ve P10'un 37 kontrolüdür.
- Bağımsız preview: **50 kontrol** geçti; yeni personel ve katılımcı yolları
  preview kapısının arkasında kaldı.
- Tam ESLint, `tsc --noEmit`, üretim derlemesi ve `git diff --check` geçti.
- Kaynaklar ve tarayıcı JS çıktılarından oluşan 502 dosyada, yerel ortamda
  tanımlı iki gizli değer için tarama yapıldı; eşleşme yoktu.
- Tarayıcı: TR/EN katılımcı paneli, yerel e-posta doğrulaması, talep oluşturma,
  sorumlu atama, sonuçlandırma ve katılımcıya açık yanıt doğrulandı. Ekip iç
  notu katılımcı DOM'una çıkmadı. Personel işlem geçmişi aktör ve değişimi
  gösterdi. Her iki panelde 390×844 genişlikte yatay taşma görülmedi.
- Yapılandırılmış özet ayarları yönetimden kaydedildi. Bir kelimelik alana
  iki kelime girildiğinde gönderim engellendi; düzeltilen sentetik taslak,
  beyan sürümü gösterilen son kontrol ekranından başarıyla gönderildi.
- Son tarayıcı geçişi katılımcı URL'sine ulaştıktan sonra otomasyon bağlantısı
  zaman aşımına uğradı. Tamamlanan UI kontrolleri ve ekran görüntüleri korundu.

Kanıtlar `.local/participation-check-result.json`, `.local/p10-integration.json`,
`.local/communication-check-result.json`, `.local/p10-browser-check-result.json`
ve `.local/p10-{unit,lint,types,build}.log` içindedir. Ekran görüntüleri
`.local/p10-{participant,worklist,structured,mobile}.jpg` olarak saklandı.
Sentetik adresler dışında gerçek alıcıya e-posta gönderilmedi.

Paket öncesi `.recovery/P10-before-20261006` yedeğinde 37 tablo ayrı geçici
DB'ye geri yüklenerek doğrulandı. Final checkpoint
`.recovery/P10-20261006-final`, temiz paket commit'inin kaynak bundle/arşivini,
korumalı yerel ortam ve hesap dosyalarını, capture kayıtlarını, kabul kanıtlarını
ve tam DB dump'ını içerir. **42 tablo ayrı geçici yerel DB'ye geri yüklenip
satır sayısı ve SHA-256 parmak izleri eşleştirildi.** Kesin commit, dump özeti
ve tablo kanıtları checkpoint içindeki `manifest.json` dosyasındadır.
`.recovery` dizini v2 klasörünün kardeşidir; gizli dosyalar Git'e eklenmez.

Canlı uygulama, EYİ üniversite sitesi, Dental ve gerçek e-posta alıcıları
bu yerel paket kapsamının dışındadır. Uzak v2 deneme yayını hâlâ ayrı iştir.
Sıradaki geliştirme paketi P11'dir; bu kapanış P11'in başlatıldığı anlamına gelmez.
