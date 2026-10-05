# P03 — Kurum/kongre ayrımı ve kişisel hesaplar

05.10.2026 · bağımsız yerel v2 · `codex/v2-p03` · tamamlandı.
Canlı uygulama, sunucu ve üniversite sitesi değiştirilmedi; dış yayına çıkılmadı.

## Çıktı

- Kurum, kurum üyeliği, kongre üyeliği, kişisel kullanıcı, süreli/iptal edilebilir
  oturum, tek kullanımlık hesap etkinleştirme ve işlem geçmişi tabloları.
- Ortak parola/imzalı admin çerezi kaldırıldı. Kişisel parola scrypt/salt ile,
  rastgele oturum ve etkinleştirme tokenları SHA256 özetiyle saklanır.
  HttpOnly/SameSite=Lax, yerelde ayrı namespace, HTTPS ortamlarda Secure.
  Oturum 8 saat, etkinleştirme 24 saat. Beş başarısız kişisel giriş 10 dakika kilitler.
- Seçili kongre sunucudaki oturumdan alınır; kurum/üyelik/rol her istekte
  yeniden okunur. Hesap, kurum üyeliği veya kongre üyeliği iptali hemen işler.
  İstemcinin hedef kimliği veya URL'si kongre yetkisini değiştiremez.
- Kongre seçimi, ekip daveti/yenileme, üyelik rolü ve aktiflik, modül yönetimi,
  işlem geçmişi ve kişinin kendi kongre kayıtları için ekran/API.
- Mevcut bildiri, dosya, kayıt, dekont, öğrenci belgesi, ücret/ayar ve CSV
  servisleri seçilen kongreye sınırlandı. Başka kongre kimliği 404; yetersiz
  rol veya kapalı modül 403, geçersiz oturum 401.
- Bildiri durumu/geçmişi/audit aynı transaction içinde; eşzamanlı değişiklik
  çakışması 409. Ücret/ayar, üyelik, modül ve kalıcı silme işlemleri auditli.
  Hesap/oturum değişiklikleri ayrıca kaydedilir. Audit API sadece seçili kongredir.
- Davet e-postaları capture kutusuna gider; gerçek e-posta gönderilmez.
  Yeni davet eski hesabın parolasını değiştirmez. Yenilenen etkinleştirme
  önceki bağlantıyı geçersiz kılar; aynı davetle rol yükseltilemez.
- Bilinmeyen public slug artık kongre oluşturmaz. Katılımcı bağlantısı ve
  taslak ekranı gerçek kongreyle eşleştirilir; tarayıcıdaki eski oturumlar
  modül kapatılınca da devam edemez. Çapraz origin mutasyonları reddedilir.
  Geliştirme erişim URL logları token sızıntısını önlemek için kapalıdır.

## Rol tablosu

| Rol | Yetki |
|---|---|
| Platform yöneticisi | Bütün kurum/kongreler; işlem öncesi kongre seçer |
| Kurum organizatörü | Yalnız kendi kurumunun kongreleri |
| Kongre organizatörü | Yalnız üyesi olduğu kongre; ekip/modül/ayar/audit/silme |
| Sekreter | Bildiri/kayıt okuma, özel dosya indirme, bildiri durumu değiştirme |
| İçerik editörü | Kongre paneli ve kendi kayıtları; CMS ekranı P06 |
| Hakem | Kongre paneli ve kendi kayıtları; atanmış değerlendirme P13 |
| Oturum başkanı | Kongre paneli ve kendi kayıtları; program/görev ekranı P14 |
| Katılımcı | Kendi e-postası ve seçili kongresiyle ilişkili kayıtlar |

İçerik editörü/hakem/oturum başkanı tüm bildiri ve ödeme listesine erişmez.
Kongre ekip ekranı global platform/kurum yöneticiliği vermez; bunlar çekirdek
ayrı kapsamdır. Global yönetici kurulumu ve canlı kullanıcı geçişi P20'de
ayrıca ele alınacak; yerel seed bunun yerine üretimde çalıştırılamaz.

## Modül sınırı

`src/platform` bağlam/yetki, HTTP, dosya, bildirim, audit ve modül kapılarını
sağlar. Sunucu sözleşmeleri `ports.ts` içindedir. Kişisel hesap işi
`src/modules/identity/service.ts`; mevcut kongre yönetimi
`src/integrations/congress/management.ts` adaptörüne taşındı; `lib/admin.ts`
eski ekranlar için facade olarak kaldı. Yeni iş modülleri bu arayüzleri kullanır.
Legacy başvuru/kayıt servislerinin tam ayrımı ilgili P10/P12 paketlerindedir.

Şu anda iki çalışan modül (bildiri; kayıt/ücretler) kongre başına açılıp
kapatılır. Yeni API, ekran ve dosya erişimi birlikte kapanır; veri silinmez.
Hesap/kongre/ekip yönetimi iki modül kapalıyken çalışır. CMS/değerlendirme/
program/belgeler katalogda hazır değil olarak gösterilir ve API'den açılamaz.
Henüz yayın arşivi/belge doğrulama veya kuyruk yok; onların bağımsız yaşam
kuralları ilgili paketlerde uygulanacak. Bu paket taşınabilir CMS/sertifika
ürünü veya bunların ayrı uygulama kabul provasını tamamlamış sayılmaz.

## Doğrulama ve geri dönüş

Yerel production build ve ESLint/TypeScript başarılı. 27 ortam koruması,
15 mevcut uçtan uca akış kontrolü, 19 P03 entegrasyon senaryosu başarılı.
P03 iki sentetik kurum, üç kongre ve dokuz temel hesapla çalışır; davet
provaları ek sentetik hesaplar bırakır. Ekran/API/dosya izolasyonu iki yönlü,
sekreterin okuma/değiştirme/silme sınırları, bütün temel roller, aktif oturumda
üyelik/kurum/hesap iptali, rol değişimi, modül kapatma, eski public oturumlar,
yanlış kongrede magic link/taslak, davet yenileme/tek kullanım, auditli
ayar/ücret/silme ve CSRF reddi test edildi. Tarayıcıda giriş, kongre seçimi,
yalnız B kaydı, ekip ve modül ekranları ayrıca gözden geçirildi.

Preview erişim kapısı yerelde, DB'ye bağlanmadan yeniden sınandı: sayfa,
API, dosya ve CSS anonim erişime kapalı. Bu prova kişisel preview hesabı
ve uzak Docker/TLS/DB kabulü değildir; uzak deneme yayını P02 gibi bekliyor.

Kanıtlar `.local/platform-check-result.json`, `.local/smoke-result.json`,
`.local/preview-check-result.json`; özel hesabın parolası, e-posta tokenları
ve env Git'e/rapora yazılmaz. P03 öncesi `.recovery/P03-before-20261005`
(root altında) eski kaynak bundle, yerel dump ve özel env içerir. Paket sonu
checkpoint ayrıca kaynak/dump/özel yerel dosyaları ve doğrulama manifestini
saklar. Eski veriler migration'da açıkça “kurum ataması bekliyor” kurumuna
bağlanır; gerçek kuruma atandıkları varsayılmaz. Yalnız sentetik local seed
A/B kurumlarına atama yapar. Canlı migration çalıştırılmadı.

## Sonraki paket

P04: kongre kurulum sihirbazı, kullanım profilleri, alan/aşama yapılandırması,
kurallı yıl kopyalama ve gerekçeli teslim istisnaları. P03 bunları içermez.
P02 ADR tahminindeki taşınabilirlik doğrulama payı P03 ile bitmiş sayılmaz;
P06/P16 bağımsız kullanım provasında yeniden değerlendirilecek. Kaynak
planın süre tahminleri bu uygulama kapanışında değiştirilmedi.
