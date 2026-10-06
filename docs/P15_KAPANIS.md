# P15 — Workshop ve sosyal etkinlik katılımı

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p15`. Başlangıç: P14 `7594bbe2`.
Denemeler sentetik yerel verilerle ve capture e-postayla yapıldı.

## Kullanım

Panel → **Workshop ve sosyal etkinlikler** (`/admin/etkinlikler`),
platform yöneticisi, ilgili kurum organizatörü ve kongre sekreteri içindir.
Etkinlik türü, saat/yer, kişi kontenjanı, katılım aralığı ve yayın/açılış
ayarı belirlenir. Program oturumuna bağlama isteğe bağlıdır. Saatler
Europe/Istanbul olarak gösterilir. Genel liste `/<kongre>/etkinlikler`
adresindedir; isim, e-posta, geçmiş ve iç gerekçeler burada paylaşılmaz.

E-posta doğrulayan katılımcı kendi panelinden; ekip kullanıcısı
**Kendi kayıtlarım** ekranından yalnız kendi yerini ayırır veya iptal eder.
Workshop tek kişiliktir, gezi/gala 1–10 kişilik grup destekler. Kontenjan
kişi sayısıyla hesaplanır. Dolunca bekleme listesine girilir; ilk grubun
tamamı sığmıyorsa sonraki küçük grup öne geçmez. İptal veya kontenjan artışı,
katılım hâlâ açıksa sıra korunarak yer açar. İptal sonrası yeniden katılım
yeni sıra numarası alır. Başladıktan sonra katılımcı iptal yapamaz;
sekreterya gerekçe ve onayla işlem yapabilir.

Gala güncel kongre gala ücretini kullanır, gezi ücretsizdir; workshop
kendi kişi başı ücretini taşır. Kongre ödeme aşaması/kayıt modülü kapalıysa
gala ücretsizdir. Onaylanan ücret katılım kaydında saklanır; sonraki fiyat
değişikliği eski katılımcıya uygulanmaz. Bu modül ödeme almaz veya kayıt
toplamını değiştirmez. Yer ayrılması ödeme, yoklama veya belge hakkı değildir.

Eski kayıtların gala/gezi tercihleri otomatik yer ayırmaz. Sekreterya
**Eski kongre sosyal tercihini eşleştir** formunda uygun kayıt ve etkinliği
seçip açıkça onaylar. Aynı kayıt/tür ikinci etkinliğe aktarılamaz. Eski gala
ücreti korunur; kaynak kayıt değiştirilmez. Geçmişe bağlı kayıt kalıcı
silinemez. Katılımcı CSV indirme kongre/yetki kontrolü yapar; formül
başlatabilecek hücreler etkisizleştirilir.

## Sürüm, program ve bildirim

Kongre kilidi altında güncel oturum/yetki/modül ve sürüm tekrar kontrol
edilir. Eşzamanlı son-yer istekleri fazla kontenjan oluşturmaz. İşlem,
değişmez katılım geçmişi, audit ve isteğe bağlı bildirim aynı transaction
içindedir. JSON istekleri 64 KB ile sınırlıdır; değişiklik gerekçe ve açık
onay ister. Katılımcı işlem gerekçesi kendi geçmişinde görünür.

Katılımcısı olan etkinlikte saat/yer/ücret/program değişikliği ayrıca
katılımcıları inceleme onayı ister. Kontenjan ayrılan kişi sayısından aşağı
indirilemez. Etkinliğin tamamen iptali geçmişi korur, tüm aktif yerleri
iptal eder ve geri açılmaz. Yeni etkinlik ayrı kayıttır.

Bağlı program oturumu değişir veya kapanırsa yeni katılım durur; eski
yerler korunur. Sekreterya koşulları inceleyip bağlantıyı günceller.
Program bağı etkinlik saatini kendiliğinden değiştirmez. Genel listede
yalnız yayımlanmış eşleşen program sürümü gösterilir; taslak sızmaz.

Bildirim varsayılan kapalıdır. Açılırsa P09 kuyruğu ve izlenen Reply-To
gerekir; bozuk ayar tüm işlemi geri alır. Worker gönderim öncesi modül ve
katılım sürümünü tekrar doğrular. Eski yer/iptal bildirimi, yeni katılım
sürümü varsa gönderilmez. Yerel doğrulama gerçek e-posta göndermedi.

## Sınırlar ve doğrulama

ACTIVITIES-only eğitim; bildiri, kayıt, ödeme, program ve CMS modülleri
kapalıyken çalışır. İlk sürüm kongre başına toplam 100 etkinlik ve 5000
katılım kaydıyla sınırlıdır; iptal edilmiş kayıtlar da sayılır. Yönetim
formunda en fazla 500 eski tercih ve 500 aktif program oturumu gösterilir.
Kişisel/yönetim ekranı son 20 katılım olayını gösterir, eski olaylar DB'de
korunur. Sayfalama, grup bölme, yer transferi ve ödeme tahsilatı yoktur.

**755 otomatik kontrol** geçti: 215 birim (20 yeni etkinlik testi),
540 yerel HTTP (57 P15, 62 P14, 51 P13, 49 P12, 43 P11, 37 P10,
46 P09, 195 temel kontrol). Ayrıca **92 ayrı preview koruması** ve
**11 tarayıcı kontrolü** geçti: yönetim güncellemesi, Türkçe adla yer,
doğrulanmış kişisel erişim, bekleme, iptal/otomatik aktarım, geçmiş,
genel TR/EN görünüm ve 390 piksel taşmasız düzen. Lint, TypeScript,
üretim derlemesi ve DB/Prisma şema karşılaştırması temizdir.
Kanıtlar `.local/p15-*.json`, `p15-*.log`, `p15-*.jpg` ve
`.local/activities-check-result.json` içindedir.

Paket öncesi `P15-before-20261006` yedeğinde 60 tablo tam restore/parmak
iziyle eşleşti. Additive `20261006240000_p15_activities` üç tablo ekler:
`ActivityEvent`, `ActivityBooking`, `ActivityBookingEvent`. Toplam
**24 migration ve 63 tablo**; uygulanmış migration SHA-256 değerleri
eşleşir. Mevcut veriler sıfırlanmadı. Özel kimlik bilgisi taraması temizdir,
standalone çıktıda `.env` kopyası yoktur.

Final `../.recovery/P15-20261006-final`, temiz paket commit'i, kaynak/Git
bundle, özel yerel dosyalar, capture mail, DB dump ve kabul kanıtını korur.
Web/worker durdurularak 63 tablo tam restore edilir; satır sayısı ve sıralı
içerik SHA-256 değerleri eşleşir. Özel dosyalar 0600, klasör 0700;
geçici restore DB'si kaldırılır. Sonuç `.local/p15-close-result.json`
ile doğrulanır.

## Ardışık devam

06.10.2026 doğrudan insan talimatı kalan paketleri P22 yerel kullanıcı
testine hazır sürüme kadar sürdürür. Sıradaki **P16A bağımsız PDF
sertifika**, ardından P16B–P22 ve pilot öncesi P06-E1'dir.
Yerel sohbet heartbeat kimliği `aibildiriyonv2-p22-yerel-teslim`;
15 dakikada bir mevcut çalışmayı kontrol eder, çalışan işi çoğaltmaz.
P22 yerel tesliminde durdurulur. Yayın/deploy, merge, harici paylaşım,
gerçek e-posta ve ücretli işlemler bu yetkinin dışındadır.
