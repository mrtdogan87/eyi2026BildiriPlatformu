# UI12 — Hesap, davet ve temiz başlangıç doğrulaması

09.10.2026 · **Yerel teknik uygulama tamamlandı.** Gerçek kullanıcı kabulü kullanıcıda; canlı hazırlığı Beyin sohbetinde. Canlıya yayın ve gerçek alıcıya e-posta gönderimi yapılmadı.

## Sonuç

- Kişisel girişte “Parolamı unuttum”; 30 dakika geçerli, tek kullanımlık bağlantı ile parola yenileme. İlk etkinleştirme ayrı kalır. Başarılı yenileme eski bağlantıları ve oturumları iptal eder, geçici giriş kilidini temizler; hesap etkinliği, roller ve üyelikler değişmez.
- Kurumdan “Sorumlu ve erişimleri aç” mevcut sorumlulara gider. Tek sorumlu seçili açılır, çok sorumlu kuruma göre süzülür, boş kurumda atama yolu bulunur. Arama, sayfalama, açık kayıt ve kuruma dönüş bağlamı korunur. Yeni davet ayrı sekmedir.
- Yetki ataması, hesap etkinliği, parola bekleme, davet süresi ve kurum erişimi ayrı gösterilir. Kurumdan yeniden davetin ortak kişisel hesabın eski bağlantılarını geçersizleştirdiği açıklanır. Uzun durum etiketlerinin kişi adlarını sıkıştırması tarayıcı kontrolünde giderildi.
- Kullanıcının ek talimatıyla, kendi oluşturduğu denemeler dahil yerel iş verileri temizlendi. Yalnız mevcut platform giriş hesabı korundu; e-posta ve parola özeti değişmedi. Boş kurulumda kök adres artık silinmiş örnek kongre yerine `/admin` yoluna yönlenir; EYİ 2026 kaydı bulunan kurulumun eski kök bağlantısı korunur.

## Teknik kabul

| Kontrol | Sonuç |
|---|---|
| UI12 parola kurtarma HTTP | **16 geçti**: eş yanıt, token süresi/yenileme/tekrar kullanım, aynı token yarışı, eşzamanlı hesap kapatma ve giriş, eski oturumların iptali, rol ve kurum kapısının korunması, kuyruk hatasında geri alma, istek/yenileme sınırları |
| UI12 iletişim kuyruğu | **14 geçti**: kongresiz yakalama, yarışan işçiler, eski/kullanılmış/süresi dolmuş token, kapalı/ilk parolasız hesap, yanlış alıcı/kaynak, yeniden deneme ve belirsiz teslim |
| UI12 sorumlu ve durum HTTP | **9 geçti**: sıfır/tek/çok sorumlu, kurum izolasyonu, yabancı kullanıcı parametresi, arama/sayfalama, başka sayfadaki kişi bağlantısı, iki kurumdan davet ve ilk etkinleştirme |
| UI12 saf durum ve hız sınırı birim kontrolleri | **12 geçti**; aşağıdaki geniş birim toplamına dahildir |
| Ortak regresyon | **450 birim + 916 HTTP = 1.366 kontrol; ayrıca 157 önizleme** |
| UI11 yetki regresyonu | **27 geçti** |
| Kurum/kullanıcı yönetimi regresyonu | **34 geçti** |
| Son boş kurulum testi | **5 geçti**; ayrı geçici veritabanında kök yönlendirme, giriş, ilk kurum/kongre oluşturma ve veri izolasyonu |
| Son üretim derlemesi | Başarılı; TypeScript dahil |
| ESLint / diff | Tam lint ve son değişen dosyaların ek lint kontrolü başarılı; `git diff --check` temiz |

İlk manager test çalışmasındaki yanlış `findUnique` sorgusu yalnız test dosyasında düzeltildi; ilgili 9 senaryo yeniden geçti. İlk tam birim denemesinin yerel SMTP portu sandbox tarafından engellendi; uygun yerel çalıştırmada 450 testin tamamı geçti. Davet regresyonu yerel yakalama işçisi açıkken yeniden doğrulandı. Bu ilk denemeler başarılı sonuç diye sayılmadı.

Özel kanıtlar: `.local/ui12-recovery-result.json`, `communication-recovery-check-result.json`, `ui12-managers-result.json`, `ui12-regression-result.json`, `ui12-ui11-result.json`, `ui12-platform-management-result.json`, `platform-empty-result.json` ve `ui12-*.log`. `npm run test:ui12` yeni paket kontrollerini toplar. HTTP testleri sentetik kayıt üretir; temizlenmiş çalışma veritabanına yeniden çalıştırılmamalı, sonraki geliştirmede ayrı test veritabanı/yerel kopya hazırlanmalıdır.

## Tarayıcı

Gerçek CSS **1280 px masaüstü** ve **390 px mobil** genişliklerinde girişten kurtarmaya erişim, kurtarma isteğinin sabit sonucu ve sonuç odağı; yenileme formu, zorunlu alanlar, kayıp bağlantı durumu; kurum/sorumlu ayrıntısı, listeye dönüşten sonra yeniden açma, boş kurum, kurumla sınırlı arama ve kapalı kurum erişimi kontrol edildi. Sekmelerde sağ/sol ok ile geçiş doğrulandı. Genel yatay taşma yoktu. Son stil düzeltmesinin ardından ekranlar yeniden kontrol edildi.

Yenilemenin başarılı parola değişimi ve hata/yarış davranışları API'de sentetik hesaplarla doğrulandı. Tarayıcıda yeni parola girilmedi; formun görünümü ve boş alan doğrulaması kontrol edildi. Bu çalışma gerçek kişinin kullanıcı kabul testi sayılmaz. Gerçek %200 tarayıcı yakınlaştırması doğrulanmadı ve manuel kabulde açık kaldı; viewport daraltma %200 sonucu sayılmadı.

Ekran kanıtları `.local/ui12-recovery-desktop.png`, `ui12-recovery-mobile.png`, `ui12-reset-desktop.png`, `ui12-reset-mobile.png`, `ui12-manager-desktop.png`, `ui12-manager-mobile.png` ve temiz başlangıç için `ui12-clean-platform.png` dosyalarındadır.

## Hız sınırı ve sırların korunması

Kurtarma isteği adres başına **5/saat**, istemci başına **20/15 dakika**; yenileme denemesi **30/15 dakika** ile sınırlıdır. Sayaçlar veritabanında tutulur. İstemci sınırı aşıldığında yeni adres satırı açılmaz. `RECOVERY_TRUSTED_IP_HEADER` varsayılan olarak boştur; sahte gelen proxy başlıkları dikkate alınmaz ve doğrudan istemciler ortak kotayı kullanır. Üretimde farklı istemcileri ayırmak için yalnız başlığı üzerine yazan güvenilir ters vekil ile tek IP başlığı yapılandırılmalıdır; bu ayar Beyin'deki canlı hazırlığının konusudur.

Token doğrulama tablosunda yalnız özet bulunur; e-posta gövdesindeki bağlantı mevcut özel iletişim saklaması içinde kalır. Link fragmenti sunucu erişim URL'sine gönderilmez ve sayfa açıldığında adres çubuğundan kaldırılır. İstek yanıtı hesap varlığını açıklamaz. Kuyruk, parola ve işlem kaydı tek transaction içinde yürür; sorgu hatalarında bağlantı/parola uygulama günlüğüne yazılmaz. Kullanıcı satırı kilidi reset, yeni bağlantı ve giriş yarışlarını sıralar.

## Veri koruma ve kullanıcının istediği temizlik

1. Geliştirme öncesi yedek `../.recovery/UI12-20261009-before` altında alındı; ayrı veritabanına geri yüklenerek **100 tablonun** satır sayısı ve içerik özetleri karşılaştırıldı.
2. `20261009120000_password_recovery` geçişi yalnız `PasswordRecoveryToken` ve `RecoveryRateLimit` tablolarını ekledi. Geçiş sonrasında önceki **99 uygulama tablosunun tüm kayıtları** değişmeden korundu; migration geçmişi karşılaştırmanın dışında tutuldu.
3. Bütün veri üreten testlerden sonra uygulama/işçiler durduruldu. Son yedek `../.recovery/UI12-20261009-before-clean` altında alındı ve **102 tablo** ayrı veritabanına açılıp içerik özetleriyle doğrulandı. Son kullanıcı denemeleri ve test kayıtları bu özel geri dönüş yedeğinde bulunur; canlıya taşınmaz.
4. Kullanıcının açık temiz başlangıç talimatıyla, tek transaction içinde bütün uygulama tabloları temizlenip yalnız mevcut `local-user-platform` hesabı korundu. Şema ve migration geçmişi korundu. Yakalanmış **1.848 e-posta dosyası** da çalışan yerel yakalama klasöründen silindi.

| Kayıt | Temizlik öncesi (son testler dahil) | Temizlik sonrası |
|---|---:|---:|
| Kurum | 60 | 0 |
| Kongre | 1.314 | 0 |
| Kullanıcı | 543 | 1 platform giriş hesabı |
| Bildiri | 974 | 0 |
| Kayıt | 605 | 0 |
| E-posta kuyruğu/geçmiş iletileri | 2.825 | 0 |

Toplam **101 uygulama tablosu** tek tek kontrol edildi: korunan hesap dışındaki bütün tablolar temizlik anında boştu. Üyelikler, eski oturumlar, etkinleştirme/kurtarma tokenları, yüklenen dosyalar, belgeler, eski geçmişler ve ayarlar buna dahildir. Ardından normal platform girişiyle oluşan yeni oturum/giriş kaydı deneme kalıntısı değildir. Uygulama kaynakları ve yeniden kurum/kongre açmak için kullanılan şablon kaynakları silinmedi; seed yeniden çalıştırılmadı.

Özel temizlik kanıtı: `.local/ui12-clean-start-result.json`. Her iki yedeğin `manifest.json` dosyası dump özeti ve doğrulanmış tablo özetlerini içerir. Geri dönüş gerekirse önce uygulama/işçiler durdurulur ve yedek ayrı veritabanına açılır; mevcut çalışma verilerinin üzerine otomatik geri yükleme yapılmaz. Kaynak geri dönüşü için yedekteki `source.tar.gz` ve `working-source.tar.gz` ile Git geçmişi bulunur. Temizlik hiçbir uzak/canlı veritabanına uygulanmadı.

## Kalan kabul

Gerçek kullanıcı denemesi ve %200 yakınlaştırma kullanıcıda. Canlı e-posta, alan adı/TLS, üretim yedekleme/izleme, gerçek ortam yük/güvenlik kontrolü ve yayın kararı Beyin sohbetinde. Yerel teknik kapanış bu işleri tamamlanmış saymaz.
