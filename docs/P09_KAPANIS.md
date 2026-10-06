# P09 — Kalıcı e-posta kuyruğu ve TR/EN şablonları

06.10.2026 · `codex/v2-p09` · Bağımsız v2, Mac mini yerel ortamı.

## Tamamlanan davranış

`/admin/iletisim` kongreye ait TR/EN şablonları, yanıt ayarlarını, son
100 iletiyi, deneme geçmişini ve son 100 teslim sorununu gösterir.
Platform yöneticisi ve organizatör şablonları/ayarları düzenler; sekreter
gönderim geçmişini izler, geçici hatayı yeniden denemeye alır ve teslim
sorunlarını gerekçesiyle sonuçlandırır. İçerik editörü, hakem, katılımcı ve
anonim kullanıcı iletişim yönetimine erişemez. Kongre dışı kimlikler 404,
eski sürümle değişiklik 409 alır. İstek gövdesi 64 KB ile sınırlıdır.

Altı şablon vardır: taslak erişimi, kayıt erişimi, bildiri alındı, bildiri
durumu, hesap etkinleştirme ve genel sekretarya mesajı. Kongre adı kayıttan
alınır; EYİ2026/ISEOS2026 adı türetilmez. Konu ve gövde yalnız desteklenen
alanlarla oluşturulur; HTML kaçışı ve bağlantı doğrulaması uygulanır.
Güvenli erişim/etkinleştirme alanı gövdede ayrı satırda zorunludur ve
konuya eklenemez. Önizleme gerçek token veya katılımcı verisi içermez.

Konu en fazla 200, şablon gövdesi 12.000 karakterdir. Değişkenler için
mevcut iş verisi sınırları ve en kötü genişleme bütçesi kayıtta denetlenir.
Oluşan konu tek satırda en fazla 240 Unicode karakterine indirilir;
gövde ve erişim bağlantısı kesilmez. Tam metin 64.000, HTML 400.000
karakterle sınırlıdır. Geçerli uzun bildiri başlığı gövdede korunur.

Başlangıç şablonu kuyrukta sürüm 1, ilk özel kayıt sürüm 2'dir; panelde
henüz özel kayıt yokken görülen 0 yalnız eşzamanlılık denetim değeridir.
Şablon düzenlenebilir; kuyruğa alınan iletinin konu, metin, HTML, dil,
alıcı, şablon sürümü ve Reply-To anlık görüntüsü değişmez. Sonraki şablon
ve yanıt ayarı değişiklikleri eski iletileri yeniden oluşturmaz.

## İşlem ve teslim ayrımı

Taslak oluşturma, erişim tokenı, başvurunun gönderilmesi, kabul/ret
durumu ve ekip davetiyle ilgili kuyruk kaydı aynı veritabanı işlemindedir.
Kuyruğa yazılamazsa kritik işlem geri alınır. SMTP/Resend erişilemezliği
tamamlanmış başvuru veya daveti geri almaz; web isteği sağlayıcıyı beklemez.
Tek bildirim arayüzü üzerinden ekleme yapılır; teslim ayrı worker'a aittir.

Kongre ve olay anahtarı aynı bildirimin yeniden eklenmesini önler;
aynı anahtarla farklı içerik reddedilir. Worker süreli iş sahipliği alır;
paralel çalışanlar aynı işi birlikte teslim etmez. Yakalama dosyası ileti
kimliğine bağlı atomik oluşturulur; kesinti sonrası tekrar ikinci dosya
üretmez. Gerçek sağlayıcıda kesinti sonrası kabul bilinmiyorsa durum
`UNKNOWN` olur ve otomatik tekrar yapılmaz. Başka sağlayıcıya otomatik
geçiş de yapılmaz; çift teslim riski saklanmaz.

Varsayılan üst sınır toplam 5 denemedir. Kesin geçici hatalar 1, 2, 4 ve
8 dakika beklenerek tekrar denenir. Kalıcı hata ve belirsiz sonuç teslim
sorunu oluşturur. Süresi dolmuş veya yenilenmiş erişim bağlantısı ve
kapalı kaynak modül worker tarafından teslim edilmez. Bildiri/kayıt
bildirimleri kendi modülüyle işaretlenir; hesap daveti bağımsızdır.
Hesap davetinde kullanıcı etkinliği, parola oluşturulmamış olması ve
ilgili kongre/kurum üyelikleri teslim öncesi tekrar denetlenir.

Durumlar `PENDING`, `PROCESSING`, `RETRY`, `CAPTURED`, `ACCEPTED`,
`PERMANENT_FAILURE`, `UNKNOWN`, `CANCELLED` olarak saklanır.
`CAPTURED` yerel yakalamadır; `ACCEPTED` yalnız sağlayıcının kabulüdür.
Alıcıya teslim ve okunma teyidi bu pakette alınmaz. Hata geçmişi sınırlı
kod/açıklama içerir; sağlayıcı cevabı, token ve ileti gövdesi yönetim
API'sine veya worker loguna dökülmez.

Kalıcı adres hatasında sekreter doğrulama gerekçesiyle farklı alıcı
belirtebilir; eski geçmiş korunur ve yeni bir ileti oluşur. Erişim veya
hesap etkinleştirme bağlantısı başka adrese taşınamaz; ilgili hesap veya
başvuru akışından yeni bağlantı gerekir. Belirsiz sonuç doğrudan yeniden
gönderilemez. İptal/inceleme sonucu aktör ve kongreyle kaydedilir.

## Yanıt ayarları ve kapsam sınırı

Reply-To, organizatörün takip ettiği posta kutusudur; genel sekretarya
şablonu için zorunludur. İletişim/panel bağlantısı aynı uygulamadaki
seçili kongre yoluyla sınırlıdır; erişim anahtarı, sorgu veya parça
içeremez. Kaydedilen Reply-To yakalama dosyası ve gerçek sağlayıcı
adaptörlerine aktarılır. Posta kutusu otomatik okunmaz; sağlayıcı teslim
webhook'u ve okundu takibi bu pakette yoktur.

Yerel/preview ortamı yalnız `capture` kullanır. Örnek alıcısı `.invalid`
olmalıdır; örnek API'si production ortamında kapalıdır. SMTP/Resend
başarı/hata senaryoları test adaptörleriyle sınanır; gerçek e-posta
gönderilmez. Sağlayıcı seçimi ortam ayarıdır. Aynı olayda sağlayıcı
değiştirilmesi otomatik teslimi sürdürmez.

Kuyruk, CMS/bildiri/kayıt iş tablosu gerektirmeyen örnek bir bildirimle
bağımsız modül sözleşmesi üzerinden sınanır. Bu örnek kaynak kongre
bağlamını ve ortak kalıcılık altyapısını kullanır. Katılımcı paneli,
geniş sekreterya iş listesi ve genel toplu ileti düzenleyicisi P10 ve
sonraki kapsam kararlarına aittir; burada tamamlanmış sayılmaz.

## Doğrulama ve kurtarma

P09'un 31 saf testi ve 46 HTTP/DB senaryosu geçti. Önceki 69 saf ve
195 HTTP/DB kontrolüyle toplam **341 kontrol** başarılı; ayrıca bağımsız
preview erişim kapısında **36 kontrol** geçti. Lint, TypeScript ve
production build başarılı. DB testleri bu Mac'te yeni production derlemesi
üzerinde çalıştı; eski makine kanıtları yeni doğrulama yerine sayılmadı.
Kuyruk yarışları, kesinti sonrası toparlanma, transaction rollback,
sürüm/tenant/yetki ayrımı, geçici/kalıcı/belirsiz sonuçlar ve geçersiz
kaynak iptali sınandı. Bağımsız bildirimin kaynak iş tablosu olmadan
kuyruk ve capture sözleşmesini kullanması da doğrulandı.

Tarayıcıda sentetik P09 kongresinin Reply-To ayarı ile TR/EN şablonları
kaydedildi; iki dilin güvenli önizlemesi ve örneklerinin `CAPTURED` sonucu
görüldü. Deneme geçmişi açıldı ve belirsiz sonuç için inceleme notu
kaydedildi. 390×844 mobil görünümde yatay taşma yok; viewport sıfırlandı.
Kanıtlar `.local/communication-check-result.json`, `.local/p09-integration.json`,
`.local/p09-browser-check-result.json` ve `p09-*.jpg` dosyalarındadır.

Additive migration `20261006150000_email_queue` beş tablo ekler:
`EmailSettings`, `EmailTemplate`, `EmailMessage`, `EmailAttempt`,
`EmailDeliveryIssue`. Toplam tablo sayısı 32'den 37'ye çıkar. Paket öncesi
`.recovery/P09-before-20261006` yedeğinin 32 tablo parmak izi doğrulandı.

Final kurtarma noktası `.recovery/P09-20261006-final` dizinidir. Temiz
paket commit'inden Git bundle/arşivi, özel ortam ve test kanıtları ile
DB dump'ı alınır. `scripts/checkpoint.mjs` ayrı geçici yerel DB'ye tam
restore yapar; 37 tablonun satır sayısı ve SHA-256 değerleri eşleşmeden
başarı manifesti üretmez. Doğrulama sonucu checkpoint'in `manifest.json`
dosyasında kayıtlıdır. Önceki checkpoint'ler ve taşınmış PostgreSQL
kümesi korunur.

Preview Docker dosyalarında ayrı worker servisi tanımlıdır. Bu Mac'te
Docker yoktur; imaj/Compose/uzak worker dağıtımı çalıştırılmadı. Canlı
uygulama, gerçek DB, EYİ üniversite sitesi ve Dental değiştirilmedi.
Gerçek e-posta ve uzak yayın yapılmadı. P10 başlatılmadı.
