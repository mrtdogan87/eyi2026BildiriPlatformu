# P08 — Ortak içerik kayıtları ve dinamik sayfalar

06.10.2026 · `codex/v2-p08` · Bağımsız v2, sentetik yerel ortam.

## Tamamlanan davranış

`/admin/icerik` kişi, organizasyon, kurul, görev, konuşmacı, panel, mekân,
otel, transfer, gezi, sponsor, duyuru, haber, etkinlik ve galeri kayıtlarını
yönetir. TR/EN başlık, açıklama, sıralama, kitaplık görselleri ve bağlantılar
form alanlarıyla düzenlenir. İç düzenleme adı halka açık içerik değildir.
Kişi fotoğrafı, biyografisi ve kurumu tek ortak kişi kaydında tutulur;
kurul/görev/konuşmacı/panel ilişkilerinde görev, konuşma başlığı ve program
sayfası bağlantısı ayrıca belirlenir. Aynı kişi farklı ilişkilerde kullanılabilir.
Kamuya açık görevler hesap, yetki veya hakem ataması oluşturmaz.

CMS editörüne **Ortak kayıt / form** bloğu eklendi. Bölüm başlığı, kaynak
türü ve tek kayıt/tüm yayımlanmış kayıtlar seçilir. Yeni kongrenin ilgili
başlangıç taslaklarında kaynak blokları bulunur; mevcut CMS sayfaları ve
P07 tarihsel kaynak aktarımı değişmez. Eksik başlangıç içeriği otomatik
yayımlanmaz. Yeni yıl eski kişi, ortak içerik, talep veya medya taşımaz.

Kaydet mevcut yayını değiştirmez. Yayımla ayrı ortak kayıt sürümünü açar;
onu kullanan bütün sayfalarda güncel yayımlanmış kişi/kurum bilgileri görünür.
Bağlı kayıtlar ve sayfa hedefleri önce yayımlanmalıdır. Yayından çekme ve
arşivleme kamu erişimini kapatır. Arşivden çıkarma yeniden yayın ister.
Geçmiş sürüme dönme yalnız taslağı değiştirir. Sürüm denetimi eşzamanlı
değişiklikleri 409 ile reddeder; kongre işlem kilidi referans/yayın denetimini
aynı işlem içinde tutar. Aktör, kongre ve sürüm işlem geçmişine yazılır.

Özel CMS önizlemesi ortak kayıtların güncel taslaklarını gösterir. Eski bir
sayfa sürümünü önizlemek ortak verinin eski sürümünü dondurmaz; ekranda bu
açıklanır. Kayıt editörü son 50 sürümü ve ortak kaynak bloğu içeren yayımlanmış
sayfaları gösterir. Bu sayfa listesi inceleme için aday listesidir; kesin
bağımlılık grafiği değildir. Kayıt listesi en fazla 1000 kayıt döndürür.

## Tarihler, tarifeler ve medya

Önemli tarihler kongre işlem ayarlarından, ücretler aktif kayıt tarifelerinden
okunur. Mevcut ücret dönemi, katılımcı türü etiketleri, para biçimi ve gala
tarifesi yardımcıları kullanılır. Kapalı kayıt akışı açıklanır; ücretsiz akışta
eski ücret tutarları ve ücret son tarihleri gösterilmez. Toplam ücret hesabı
mevcut kayıt sistemindedir; bu paket yeni hesaplama veya ticari rezervasyon
motoru oluşturmaz. Program/salon tahsisi ve çakışma kontrolü P14'e aittir.

Kişi, organizasyon, mekân, sayfa ve medya seçimleri yalnız seçili kongreye
ait olabilir; farklı türde veya arşivlenmiş kayıtlar reddedilir. Görsellerde
alternatif metin ve güvenli bağlantı denetimi uygulanır. P06/P07 dosya türü,
boyut ve depolama kuralları sürer. Medya ancak aktif CMS ve güncel yayımlanmış
sayfanın görüntülediği ortak kaynak üzerinden halka açılır. Taslak, geçmiş,
arşivlenmiş kayıt veya rastgele harici adres dosya erişimi vermez. Sürüm medya
ilişkileri saklanır. İç dosya adları ve özel kayıt alanları kamuya taşınmaz.

## Özel geri bildirim talepleri

Yayımlanmış, etkin dildeki **Geri bildirim formu** ad, e-posta, konu ve mesaj
alır. Bilgi metninin okunduğu doğrulanır; metin sürümü, metin, dil ve kayıt
zamanı kalıcı denetim kaydına yazılır. Talep içeriği halka açık değildir.
Formun son yayımlanmış kaynağı kapandığında yeni gönderim kapanır.

Gönderim anahtarı aynı mesajın ağ tekrarıyla çoğalmasını önler; aynı anahtarla
değişen mesaj 409 alır. Tuzak alanı otomatik gönderimleri kaydetmez. Kalıcı
sınır kongre içinde aynı e-posta için 15 dakikada 3, tüm kongre için dakikada
30 taleptir. İstek gövdesi 16 KB ile sınırlıdır; çapraz kaynak gönderim ve
beklenmeyen alanlar reddedilir. Harici CAPTCHA veya mesaj sağlayıcısı yoktur.

`/admin/talepler` son 200 talebi gösterir. Platform/organizasyon yönetimi ve
sekreter Yeni/İnceleniyor/Kapalı durumu ile özel takip notu düzenleyebilir.
İçerik editörü bu mesajları okuyamaz. Kongre dışı kimlikler 404, eski sürümle
güncelleme 409 alır. Durum işlemi e-posta göndermez. Daha geniş sekreterya
iş listesi P10, kalıcı e-posta kuyruğu ve şablonları P09 kapsamındadır.

## Doğrulama ve kurtarma

P08: 8 saf doğrulama + 38 gerçek HTTP/DB senaryosu. Önceki paketlerle toplam
264 kontrol geçti: P07 43, P06 43, P05 33, P04 38, P03 19, smoke 15 ve
ortam güvenliği 27; ayrıca bağımsız preview erişim kapısı geçti. Kongre/yetki
ayrımı, ortak kişi kullanımı, yayın/taslak ayrımı, geçmişe dönüş, TR/EN geri
dönüşü, dosya erişimi, güncel/kapalı/ücretsiz tarifeler, yeni yıl ayrımı,
talep mahremiyeti, idempotency, hız sınırı ve modül kapatma doğrulandı.
Lint, TypeScript ve production build geçti. İstemci paketlerinde Prisma ve
sunucu ortam değişkenleri bulunmadı; `git diff --check` temizdir.

Tarayıcıda kişi oluşturma, kurum bağlama, kaydetme/yayımlama, aynı kişiyi
kurula ekleme ve kamuya yansıması doğrulandı. Formdan sentetik talep gönderildi;
yönetimde durum/not kaydedildi ve özel notun halka açık sayfada bulunmadığı
kontrol edildi. CMS kaynak seçicileri ve özel taslak önizlemesi incelendi.
390×844 mobil kayıt, konuşmacı ve form sayfalarında yatay taşma bulunmadı;
geçici viewport sıfırlandı. Kanıtlar `.local/content-check-result.json`,
`.local/p08-browser-check-result.json` ve `p08-*.png` dosyalarındadır.

Additive migration `20261006010000_dynamic_content` dört tablo ekler:
`SiteRecord`, `SiteRecordRevision`, `SiteRecordMedia`, `FeedbackRequest`.
Önceki veriler korunur. Paket öncesi yedek `.recovery/P08-before-20261006`,
final checkpoint `.recovery/P08-20261006-final` içindedir. Final kaynak Git
bundle/arşivi, özel ortam/test kanıtı ve yerel DB yedeği içerir; ayrı geçici
yerel DB'ye tam geri yükleme ile 32 tablonun satır sayısı ve SHA-256 değerleri
eşleştirilir. Önceki checkpoint'lere yazılmaz.

Canlı checkout, gerçek DB, gerçek e-posta ve uzak dağıtım değiştirilmedi.
Uzak v2 deneme yayını ayrı ortam seçimini bekler. Önceki bağımlılık denetimi
bulguları ayrıca değerlendirilmelidir; bu pakette bağımlılık değişmedi.
Sonraki paket P09'dur; burada başlatılmadı.
