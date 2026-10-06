# P14 — Program ve oturum yönetimi

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p14`. Başlangıç: P13 `5c374547`.
Denemeler sentetik yerel verilerle ve capture e-postayla yapıldı.

## Kullanım ve görev ayrımı

Panelde **Program ve oturumlar** (`/admin/program`) kullanılır. Platform
yöneticisi, ilgili kurum organizatörü ve kongre sekreteri programı yönetir.
Oturum başkanı **Programım ve görevlerim** (`/admin/program/gorevler`)
ekranında yalnız kendi davetlerini görür. E-posta doğrulanmış katılımcı da
kendi panelinden kendi davetine yanıt verebilir; ekip hesabı/yetkisi kazanmaz.
İçerik editörü ve hakem program yönetim yetkisi edinmez.

Önce salon ve program kişisi oluşturulur; oturum, sunum ve başkan/teknik
destek daveti bunlara bağlanır. Program kişisi kongre içinde normalize edilmiş
e-postayla tekilleştirilir. CMS kişi kayıtlarından ayrı bir işlem kaydıdır;
CMS kaydı veya program daveti kendiliğinden kullanıcı hesabı oluşturmaz.
Sunum/görev geçmişi olan kişinin e-postası değiştirilemez. Başka kimlik için
yeni kişi oluşturulur; eski yanıt ve yayınlar korunur.

Bildiri sunumu, başkanlık ve teknik destek ayrı ilişkilerdir. Aynı kişi
kendi oturumunda sunucu ve başkan olabilir. Başkanlığı reddetmek kişinin
kendi sunumunu iptal etmez. Görev durumları **Yanıt bekleniyor / Kabul edildi /
Reddedildi / Değiştirildi** olarak izlenir. Ret veya eksik zorunlu kabul
sekreterya iş listesinde görünür. Yerine atama, eski görevi açıkça seçmeyi
gerektirir; eski yanıt gerekçesi ve yeni görev bağlantısı saklanır.

Oturum düzenlenince eski bekleyen/kabul edilmiş görevler değiştirilmiş olur,
aktif oturum için ayrı kimlikli yeni davetler açılır. Önceki yanıt korunur,
yeni zaman/koşullar yeniden kabul edilir; çevrim içi erişim kapanır.
Bu otomatik yenileme ayrıca e-posta üretmez: yeni görev kişisel panelde
görünür. İlk davet/yerine atamada seçilen e-posta bildirimi P09 kuyruğundadır;
izlenen Reply-To ayarı gerekir. Bozuk bildirim ayarı tüm işlemi geri alır.

## Saatler, çakışmalar ve bilimsel kaynak

Form ve görünüm saatleri **Europe/Istanbul (UTC+03:00)**, saklanan değerler
mutlak zamandır. Oturum, sunum ve çevrim içi pencere en fazla 24 saat sürer.
Aynı salonun paralel oturumları, oturum içindeki çakışan sunumlar, oturum
aralığı dışındaki sunumlar ve kişinin farklı oturumlardaki eşzamanlı sunum/
görevleri yayını durdurur. Bekleyen davet de zaman ayırır; reddedilmiş veya
değiştirilmiş görev zaman ayırmaz. Çakışma için yayın istisnası yoktur.

Bildiriye bağlı sunum, aynı kongrede **kabul edilmiş** güncel kaynağı ve
bildirinin sunan yazarıyla aynı e-postalı program kişisini ister. Başlık ve
düzeltme/hakemlik sürümleri sunucudan alınır. Bildiri aynı aktif programa
ikinci kez yerleştirilemez. P11 düzeltmesi, karar veya sunan yazar değişikliği
eski yerleşimi güncel kaynak olarak kullanmayı durdurur. Sunum kaynaktan
yeniden kaydedilir ve yeni program sürümü yayımlanır; eski yayın değişmez.
Program geçmişine bağlanmış bildiri kalıcı silinemez.

Bağımsız davetli konuşma için bildiri gerekmez. **PROGRAM-only seminer**,
bildiri, hakemlik, kayıt, ödeme ve CMS kapalıyken HTTP testinde çalışır.
Saf program çekirdeği de kongre/DB olmadan sınanır; ayrı ürün dağıtımı değildir.

## Yayın ve çevrim içi erişim

`/<kongre>/program` genel programı gösterir. Her yayın yeni ve değişmez
sürümdür. Taslak değişiklikleri kendiliğinden yayımlanmaz. Zorunlu başkan/
teknik destek kabulü eksikse ayrıca gerekçeli eksik görev onayı gerekir.
Yerleşmemiş kabul edilmiş bildirilerin program dışında bırakılması ayrı
onay ister. Yayını geri çekmek genel görünümü kapatır; geçmişi silmez.
Yetkili ekip geçmiş sürümleri JSON olarak indirebilir. Program kitabı/PDF
üretimi P20 kapsamıdır.

Genel programda sunucu adı/kurumu, kabul edilmiş görevli adı, salon, başlık
ve saatler vardır. E-postalar, iç kişi/bildiri kimlikleri, kaynak sürümleri,
iç gerekçeler ve toplantı URL'si genel yanıta çıkmaz. Sunucu tarafındaki
özel yayın kaydı kişisel program eşleştirmesi için kimlik kaynağını korur.

Çevrim içi URL ve açılış/kapanış zamanı yayın sürümünden ayrı yönetilir;
yalnız HTTPS, kullanıcı adı/parola içermeyen adres kabul edilir. Varsayılan
kitle bu kongrede e-posta doğrulaması yapan katılımcılardır. Bu seçenek
ödeme veya kayıt uygunluğu kontrolü değildir. Herkese açık erişim ayrıca
açık onay ister. URL yalnız kullanıcı bağlantı istediğinde canlı uçtan
verilir; genel yayın JSON'una/sayfasına gömülmez.

Bağlantı açılış anında kullanılabilir, kapanış anında kullanılamaz.
Yayın/aktif oturum/kaynak sürümü ve güncel program eşleşmesi yeniden
kontrol edilir. Kapanma veya anlık devre dışı bırakma genel programı
gizlemez. Önceden kopyalanmış dış toplantı adresinin sağlayıcı tarafında
iptali bu uygulamanın kontrolünde değildir. Yerel testler dış toplantı
sağlayıcısına bağlanmadı.

## Yetki ve ilk sürüm sınırları

PROGRAM kapatılınca yönetim, kişisel görev yanıtı, genel program ve canlı
bağlantı uçları kapanır; veriler korunur. Worker, gönderim öncesi modül,
kişi, oturum, davet ve zamanı tekrar doğrular; eski/kapatılmış davet
gönderilmez. Kimlik/kurum/kongre yetkisi mutasyonda kongre kilidinden sonra
tekrar kontrol edilir. Sürüm karşılaştırması, audit ve kuyruk DB işlemiyle
birliktedir. Katılımcı oturumu iptali görev yanıtı öncesi yeniden okunur.
JSON istekleri 64 KB sınırındadır; yazma gerekçe ve açık onay ister.

İlk sürüm kongre başına 1000 salon, 1000 kişi, toplam 500 oturum ve
1000 sunumla sınırlıdır; arşivlenen kayıtlar da bu sınırlara dahildir.
Kabul edilmiş bildiri listesi 5000 kaydı, kişisel görev geçmişi 200 kaydı
aşınca sessiz kesme yerine hata verir. Yönetimde son 100 yayın gösterilir;
eski sürümler DB'de korunur. Sayfalama ve toplu program içe aktarma yoktur.
Görev kabulü veya programa yerleşim otomatik yoklama, ödeme, sertifika
ya da workshop/sosyal etkinlik uygunluğu oluşturmaz. P15/P16 ayrı paketlerdir.

## Doğrulama ve kurtarma

**678 otomatik kontrol** geçti: 195 birim (24 yeni program testi),
483 yerel HTTP (62 P14, 51 P13, 49 P12, 43 P11, 37 P10, 46 P09,
195 temel paket kontrolü). Ayrıca **85 preview koruması** DB olmadan geçti.
Lint, TypeScript, üretim derlemesi ve DB/Prisma şema karşılaştırması temizdir.
**10 tarayıcı kontrolü** görev kabulü, gerekçeli yayın, değişmez geçmiş,
kişisel rol ayrımı, kapalı bağlantıyla açık program, TR/EN görünümü ve
390 piksel taşmasız düzeni doğrular. Kanıtlar `.local/p14-integration.json`,
`.local/program-check-result.json`, `.local/p14-browser-check-result.json`
ve `p14-*.jpg` dosyalarındadır. Örnek genel yayın sürümü 5'tir.

Paket öncesi `P14-before-20261006` yedeğinde 54 tablo tam restore ve
parmak iziyle karşılaştırıldı. Additive `20261006230000_p14_program`
altı tablo ekler: `ProgramRoom`, `ProgramPerson`, `ProgramSession`,
`ProgramTalk`, `ProgramDuty`, `ProgramPublication`. Toplam **23 migration,
60 tablo**; uygulanmış migration dosyalarının SHA-256 değerleri eşleşir.
Mevcut veri sıfırlanmadı. Kaynak/istemci kimlik bilgisi taraması temizdir;
standalone çıktıda `.env` kopyası yoktur. `MAIL_MODE=capture`, gerçek
e-posta gönderimi yapılmadı.

Final `../.recovery/P14-20261006-final` kaynak/Git bundle, özel yerel
dosyalar, capture mail, DB dump ve test/tarayıcı kanıtını korur. Web/worker
durdurularak tam restore yapıldı; 60 tablonun satır sayısı ve sıralı içerik
SHA-256 değerleri birebir eşleşti. Özel dosyalar 0600, checkpoint klasörü
0700; geçici restore DB'si kaldırıldı. Normal capture worker ile yerel
web yeniden açıldı. Sıradaki paket **P15 workshop ve sosyal katılım**dır.
