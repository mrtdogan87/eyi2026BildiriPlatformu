# P11 — Gerekçeli düzeltmeler ve dosya sürümleri

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p11`. Başlangıç: P10 commit'i `93b78ca`.
Canlı sistemlere veya uzak deneme ortamına değişiklik yapılmadı.

## Yönetici düzeltmesi

Gönderilmiş bildiri detayındaki **Düzeltmeler ve sürüm geçmişi** alanı;
başlık, özet, anahtar kelimeler, bildiri dili ve yazar bilgilerini düzenler.
Yazar ekleme, çıkarma, sıralama ve sunan yazarı değiştirme desteklenir.
İşlem, kongrenin mevcut dil/alan/yapılandırılmış özet kurallarını ve yazarın
en fazla iki bildiride yer alması koşulunu sunucuda yeniden kontrol eder.

Her içerik veya dosya düzeltmesi 8–2000 karakterlik gerekçe ister.
İsteğe bağlı kanıt en fazla 2 MB PDF/JPG/PNG'dir. Eski ve yeni değerler,
değişen alanlar, düzeltme sırası, işlem yapan kişi ve tarih ayrı geçmiş
satırında saklanır. Kanıt dosyası yalnız ilgili kongrenin yetkili ekibine
özel, önbelleksiz indirme ile sunulur. Önceki katılımcı beyanının metni,
sürümü ve kabul zamanı; bildiri kararının eski geçmişi değişmez.

İçerik formu kaydetmeden önce önceki/yeni değerleri gösterir. Eski sürümle
işlem 409 alır. Kongre → bildiri kilit sırası eşzamanlı düzeltme, karar,
dosya yükleme ve silme işlemlerini düzenler. Platform yöneticisi,
organizatör ve sekreter düzeltme yapabilir; diğer roller bu yetkiyi kazanmaz.
Başka kongredeki bildiri veya dosya kimliği erişim sağlamaz.

## Eski erişimlerin iptali ve ilişkili kayıt

Yazar e-postası veya taslak sahibi değiştiğinde ilgili bildirinin erişim
token'ları, etkilenen e-postaların kayıt/katılımcı bağlantıları, oturumları
ve teslim istisnaları iptal edilir. Eski/yeni yazar bilgilendirmesi isteğe
bağlı olarak P09 kuyruğuna alınır. Yanıt adresi/şablonu eksikse açıklayıcı
hata döner ve düzeltme transaction'ı bütünüyle geri alınır.

P10'un bağımsız imzalı köprü çerezleri artık kabul edilmez. Taslak ve kayıt
oturumları rastgele anahtarın hash'iyle DB'de tutulur, 8 saatte dolar ve
sunucuda iptal edilir. Panelden veya kişisel platform hesabından açılmış
köprü, onu açan oturuma da bağlıdır. Çıkıştan sonra kopyalanmış çerez
kullanılamaz. Düzeltmeyle eşzamanlı bağlantı doğrulaması da iptal edilmiş
token üzerinden yeni kullanılabilir oturum üretemez.

Tek bildirili kayıt eski sunan yazarın e-postasına aitse yeni sunan yazar
e-postası aynı işlemde kayıt tarafına taşınabilir. Tutar, dekont, eski
`paidAt` ve beyan kanıtı korunur; ödeme doğrulaması üretilmez. Ortak veya
farklı sahipli kayıt sessizce değiştirilmez: yönetici **gerekçeli kontrol
işi** seçeneğini kullanır ve bağlı kayıt takibi açılır.

## Dosya sürümleri ve katılımcı önerisi

`SubmissionFile` mevcut indirme/önizleme için güncel dosyayı tutar;
`SubmissionFileVersion` v1, v2… dosyaların tam baytlarını, SHA-256 değerini,
yükleyen kişi, tarih ve gerekçeyi korur. Eski dosya ilk değişiklikte v1'e
alınır. Geri alma eski satırı değiştirmez; seçilen dosyadan yeni güncel
sürüm oluşturur. Eski dosya baytları bulunamıyorsa değiştirme reddedilir.
Sürüm/düzeltme/talep geçmişi olan bildiride kalıcı silme API'de engellenir
ve arayüzde silme formu açılmaz.

Yönetici en fazla 30 günlük bir DOCX düzeltme talebi oluşturabilir. Yalnız
güncel taslak sahibi, doğrulanmış katılımcı panelinden veya kendi platform
hesabından öneriyi gönderir. Talep, süre ve sürüm sunucuda kontrol edilir.
Gönderilen DOCX yönetici onayına kadar güncel dosyayı değiştirmez. Onay yeni
dosya sürümü ve gerekçeli değişiklik kaydı oluşturur. Ret/kapama önerinin
baytlarını ve inceleme gerekçesini korur. Sonradan yapılan yönetici
düzeltmesi eski aktif talebi kapatır; kapanmış karar yeniden yazılamaz.

Dosya en fazla 10 MB DOCX; toplam düzeltme formu en fazla 13 MB'dir.
Next.js proxy tamponu 14 MB ayarlandı; 10 MB dosya + 2 MB kanıt + form
bilgisi kesilmeden route'a ulaşır. Route kendi akış sınırını ayrıca uygular.

## Çıktı ve iş takibi

Kabulden sonraki yazar/başlık değişikliği kabul mektubu, kabul listesi ve
program ihtiyacını; ilgili değişiklikler kitap, yazar belgesi ve kayıt
kontrolünü açar. Kabul listesinde mevcut sıraları koruyup düzeltmeyi ek
işlem olarak kaydetme kuralı ekranda belirtilir. Yönetici yaptığı dış
belge/listedeki işlemi ve sürümünü sonuç notuyla kaydeder. Dosya incelemeleri
ve bekleyen çıktı/kayıt güncellemeleri sekreterya iş listesinde görünür.

Bu takip **belge/PDF/Excel üretmez**. Kabul mektubunun veya mevcut harici
listenin fiilen yeniden düzenlenmesi ekip işidir. Henüz uygulanmamış
hakemlik, program, kitap/yayın ve sertifika modülleri tamamlanmış sayılmaz.
P12 ödeme doğrulaması ayrı pakettir.

## Doğrulama kanıtı

Bu paketin son çalıştırmasında **450 otomatik kontrol** geçti:
129 birim kontrolü ve 321 yerel HTTP senaryosu (43 P11, 37 P10, 46 P09,
195 önceki paketler). Ayrı **56 preview koruması** kontrolü DB bağlantısı
olmadan geçti. Lint, TypeScript ve üretim derlemesi başarılıdır.

P11 senaryoları tam eski/yeni geçmişi, beyan/karar korunmasını, yetki ve
kongre sınırını, dosya baytlarını, eski sürüme dönüşü, öneri/onay/ret,
kişisel hesap erişimini, kayıt belirsizliğini, boyut/süre/yazar limitlerini,
işlem geri almasını ve eşzamanlı eski bağlantı iptalini kapsar. Testlerde
yalnız sentetik `.invalid` adresler ve yerel capture kullanıldı.

Tarayıcı kanıtında 12 kontrol kayıtlıdır: gerekçeli düzeltme, önceki/yeni
başlık, süreli talep, İngilizce katılımcı doğrulaması ve DOCX önerisi,
yönetici onayıyla v5, v1–v4'ün korunması, Türkçe sonuç, 390 piksel
katılımcı/yönetici görünümü ve yatay taşma bulunmaması. Dosya seçicisinin
gecikmesi sonrası yükleme tamamlandı. Özel kanıtlar `.local/p11-*` ve
`.local/revisions-check-result.json` dosyalarındadır.

20 migration'ın DB checksum'ları kaynakla eşleşir; 47 tablo vardır.
Kaynak/istemci derlemesinde özel hesap bilgisi sızıntısı ve standalone
çıktısında `.env` kopyası bulunmadı. Bu tarama genel güvenlik denetimi değildir.

## Kurtarma

Paket öncesi `.recovery/P11-before-20261006` yedeği 42 tabloyla ayrı yerel
DB'ye restore edilerek doğrulandı. Final `.recovery/P11-20261006-final`
temiz commit'in kaynak bundle/arşivini, özel ortam/hesap/capture dosyalarını,
kontrol kanıtlarını ve DB dump'ını içerir. Web ve worker durdurularak
alınan dump ayrı geçici DB'ye tam restore edildi; **47 tablonun satır
sayıları ve SHA-256 parmak izleri eşleşti**. Özel yedek klasörleri 0700,
ortam/hesap/dump/kanıt dosyaları 0600 izinlidir. Büyük medya tablolarının
parmak izi, 0600 geçici dosyadan 64 KB parçalarla hesaplanır; tablo
çıktısını tek bir bellek tamponuna sığdırma sınırı kaldırıldı. Geçici
parmak izi dosyası işlem sonunda kaldırılır. Mevcut DB üzerine init/seed
çalıştırılmadı.

Sonraki paket **P12 — Ödeme doğrulama**. Uzak v2 yayını, gerçek alıcılara
e-posta ve canlı veri taşıması bu yerel kapanıştan ayrı işlerdir.
