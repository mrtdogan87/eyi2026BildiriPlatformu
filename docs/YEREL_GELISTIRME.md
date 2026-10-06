# v2 yerel geliştirme

Dizin `/Users/dentalai/Documents/AIBildiriYonV2/v2`, güncel paket dalı `codex/v2-p09`.
Üst checkout korunmuştur. Node.js 22.13+ ve PostgreSQL 16 CLI araçları gerekir.
Mac mini kurulumu 6 Ekim 2026'da Node 24.21.0/PostgreSQL 16.15 ile doğrulandı.
Docker gerekmez. Taşıma ve doğrulama kaydı: [Mac mini kurulumu](MAC_MINI_KURULUM.md).

Mevcut P08 verisi geri yüklenmiş durumdadır. Yeni terminal oturumunda araç
yollarını ayarlayın; uygulama zaten 3100'de çalışıyorsa ikinci kez başlatmayın:

```sh
cd /Users/dentalai/Documents/AIBildiriYonV2/v2
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
export PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
npm run db:start
npm run dev
```

`PATH` çocuk süreçler için de gereklidir. `PG_BIN` yalnız checkpoint betiğinin
araç yoludur; `db:start` araçları `PATH` üzerinden bulur. Global shell ayarları
değiştirilmedi. Homebrew'nin varsayılan kümesi yerine proje kümesi kullanılır;
bu proje için `brew services start` çalıştırılmaz.

Aşağıdaki sıra yalnız **boş, yeni çalışma kopyası** içindir. Taşınmış mevcut
verinin üzerine uygulanmaz; özellikle `db:seed` taşıma doğrulaması değildir:

```sh
npm ci
npm run local:setup
npm run db:init
npm run db:start
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

Araç yolları ayarlandıktan sonra `npm run db:start` ve `npm run dev` yeterlidir.
Adres `http://127.0.0.1:3100/eyi-2026`, admin `/admin`. Admin parolası
yalnız v2'nin özel `.env` dosyasında; P03'e kadar eski tek admin akışı kullanılır.
DB kendi parolası/kümesiyle `127.0.0.1:55432/aibildiri_v2`, dosyaları `.local/postgres`.

## Ayrım

- Setup yeni DB/admin/iki oturum sırrı üretir; üst `.env` okunmaz. Var olan
  `.env` güvenlik kontrolünü geçmezse durur, üzerine yazılmaz.
- Başlatma/migration/seed aynı güvenlik denetimini kullanır; iki DB URL'si
  loopback, sabit v2 DB/kullanıcısı ve `55432` portunu gerektirir.
- Yerel/deneme e-postası sadece `capture`; SMTP/Resend kimlik bilgisi varsa
  uygulama başlamaz. Test alıcısı gerçek adres olsa bile teslimat yapılmaz.
- Yakalanan e-postalar `.local/mail/*.json` içinde `0600` izinle saklanır.
  `npm run mail:latest` yolu gösterir; yerel editörde bağlantıyı açabilirsiniz.
  Tokenlar sunucu loguna yazılmaz.
- Çerez ön eki `aibildiri_v2_local_`; yönetim oturumu rastgele DB oturumudur. HTTP sadece
  yerel loopback; denemede HTTPS/secure çerez gerekir.
- Dosyalar ayrı DB byte alanlarına gider; eski yükleme alanı kullanılmaz.
- `.env*`, `.local`, `.preview`, `.recovery` ve build çıktıları Git dışındadır.

Seed iki sentetik kurum, üç kongre (A açık/kapalı, B açık), 13 tarife ve temel rol hesapları içerir;
yazar adresleri `.invalid`. Banka/ücret bilgisi gerçek ödeme talimatı değildir.
Seed idempotenttir, mevcut test kayıtlarını silmez. İlk seed'de tarihler
30/60 gün ileridedir; gelecekte tarihler yerel admin'den yenilenebilir.

## Kontroller

```sh
npm run test:safety
npm run lint
npm run build
# dev kapatıldıktan sonra derlenmiş uygulamayı çalıştırmak için:
npm run start
# Uygulama çalışırken başka terminalde:
npm run test:smoke
npm run test:platform
```

Smoke gerçek HTTP üzerinden sentetik başvuru/dosya/kabul/kayıt/dekont ve
e-posta/yetki kontrolünü yapar, yeni test kayıtları bırakır. Kanıt
`.local/smoke-result.json`; gerçek veri/e-posta kullanılmaz.
Uygulama Ctrl+C, DB `npm run db:stop` ile durdurulur. P01 restore kümesi
uygulamaya bağlı değildir; kabul provasından sonra kapatılır.

## P03 kişisel hesaplar

`npm run db:seed` sentetik kişisel hesapları hazırlar. Hesap bilgileri yalnız
Git dışı `.local/p03-accounts.json` dosyasındadır; konsola yazdırmayın veya
paylaşmayın. Yerel panel `/admin`, kongre seçimi `/admin/panel`; ekip, modül
ve işlem geçmişi buradan açılır. `ADMIN_PASSWORD` ve `ADMIN_SESSION_SECRET`
artık giriş için kullanılmaz ve yeni env örneğinde yoktur. P02'nin ortak
parola/çerezi P03'te kabul edilmez. Seed yerel testle sınırlıdır.

Ekip davetinden sonra `.local/mail` içindeki kişisel etkinleştirme bağlantısı
24 saat içinde kullanılır. Kullanıcı parolasını kendi oluşturur; süre dolarsa
ekrandan daveti yeniden gönderebilirsiniz. Var olan hesabı kongreye eklemek
parolasını sıfırlamaz. CMS editör ekranları P06'da açıldı; hakem/başkan ekranları ilgili paketlerde açılır.

`test:platform` yerel sentetik davet/kayıtlar bırakır; modül ve rol ayarlarını
prova sonrası geri getirir. Derlenmiş sürümü test etmek için dev'i kapatıp
build/start çalıştırın. Kabul kanıtı `.local/platform-check-result.json`.

## P04 kongre kurulumu

Panelde **Yeni kongre oluştur**, **Kongre yapılandırması** ve **Teslim
istisnaları** ekranları açıldı. Ayrıntılı davranış ve kapsam sınırları
[P04 kapanışında](P04_KAPANIS.md) kayıtlıdır.

`npm run test:congress` 9 saf yapılandırma testi ve 29 sentetik HTTP/DB
senaryosu çalıştırır; ek yerel kongre/taslak/istisna/kayıt örnekleri bırakır.
`npm run test:smoke`, `npm run test:platform`, `npm run test:safety` ve
`npm run test:preview` önceki korumaları doğrular. DB'ye yazan senaryoları
sıralı çalıştırın. E-posta yalnız `.local/mail` altında yakalanır.

Paket commit'i temizken `node scripts/checkpoint.mjs P04-20261005-final`
yeni, özel root `.recovery` klasörünü oluşturur; kaynak ve yerel DB'yi
kopyalar ve ayrı rastgele adlı geçici yerel DB'de tam geri yükleme yaparak
tüm tablo parmak izlerini karşılaştırır. Klasör zaten varsa üzerine yazmaz.
PostgreSQL araçları için varsayılan yol `/opt/homebrew/opt/postgresql@16/bin`;
farklı kurulumda `PG_BIN` kullanılır. Hiçbir aşamada uzak DB seçilemez.

## P05 site görünümü

Panelde **Site görünümü** seçili kongrenin ana sayfasını, EYİ/sade temasını,
vurgu rengini ve butonlarını düzenler. TR/EN metinleri kaydedin, ardından
logo veya ana görsel yükleyin. **Yayınlanan sayfayı aç** sonucu gösterir.
Gizli görsel yeniden açılabilir; yeni yükleme mevcut görselin yerini alır.
Ayarlar bu yerel ortamda hemen uygulanır. Ayrıntılar [P05 kapanışında](P05_KAPANIS.md).

`npm run test:site` 7 saf yapılandırma ve 26 sentetik HTTP/DB senaryosudur.
Yeni örnek kongreler bırakır; son örnek adresi `.local/site-check-result.json`
içindeki `fixtures.demo.slug` alanındadır. Diğer DB senaryolarıyla sıralı
çalıştırın. Yalnız yerel ortam kabul edilir; gerçek e-posta gönderilmez.

Paket commit'i temizken `node scripts/checkpoint.mjs P05-20261005-final`
kaynak/DB/özel dosyaları yeni kurtarma klasörüne alır ve tüm tabloları ayrı
geçici yerel DB'ye geri yükleyerek satır sayıları ile SHA-256 değerlerini karşılaştırır.

## P06 CMS

Organizatör seçili kongrede Modüller ekranından **Sayfalar ve medya (CMS)**
açabilir. CMS sayfaları `/admin/cms`, kitaplık `/admin/cms/medya` adresindedir.
İçerik editörü yalnız kendi kongresinin CMS'sini kullanır; ayar/modül/ekip
yönetimine erişmez. Bildiri ve kayıt kapalıyken CMS tek başına çalışır.

Taslak sayfa oluşturun, TR/EN başlık ve blokları doldurun. Kitaplığa görsel
veya PDF yükleyip uygun bloktan seçin. Taslağı kaydet, özel önizlemede kontrol
et, ardından Yayımla. Sonraki taslak kayıtları yayını değiştirmez. Geçmiş
sürümü taslağa almak yeni sürüm oluşturur; tekrar Yayımla gerekir. Dosyayı
gizlemek erişimi kapatır, yeniden açmak geri getirir; özgün veri silinmez.
CMS dosyaları herkese açık sitede kullanılacak içerikler içindir.

`npm run test:cms` 9 saf test + 34 sentetik HTTP/DB senaryosu çalıştırır.
DB testlerini `test:site`, `test:congress`, `test:smoke`, `test:platform`
ile sıralı çalıştırın. `test:safety` ve `test:preview` ile toplam 175 kontrol
ve ayrı preview kapısı doğrulanır. Son CMS örneği `.local/cms-check-result.json`
içinde; tarayıcı kanıtı `.local/p06-browser-check-result.json` içindedir.

Temiz paket commit'inden sonra `node scripts/checkpoint.mjs P06-20261005-final`
27 tabloyu geçici yerel DB'ye tam geri yükleyip karşılaştırır. Önceki paket
checkpoint'lerine yazılmaz. Kapsam ve bağımlılık bulguları [P06 kapanışında](P06_KAPANIS.md).


## P07 başlangıç sayfaları, menüler ve EYİ arşivi

Yeni kongre ve yeni yıl kopyası 41 genel başlangıç sayfasını boş taslak
olarak oluşturur. CMS modülü kendiliğinden açılmaz. Eski kongrede CMS
sayfalarındaki **Eksik başlangıç sayfalarını ekle** eksikleri ekler;
mevcut içerik ve adreslerin üzerine yazmaz. Ana sayfa P05 editöründe yönetilir.

TR/EN menü etiketi, üst menü ve sıra sayfa editöründedir. En fazla üç
menü düzeyi kullanılabilir; döngü reddedilir. Üst sayfa yayımlanıp menüye
açılmalıdır. Sayfa işlemleri çoğaltma, adres değiştirme ve arşivleme sunar.
Eski adres yayın açıkken yeni adrese 308 yönlenir. Arşivden çıkarmak yayını
açmaz; editörde yeniden Yayımla gerekir. Geçmiş ve dosyalar korunur.

Kitaplık artık PDF/görsel yanında DOCX/DOTX şablonlarını kabul eder.
Dosya bağlantısı bloğunda PDF veya Word seçilir. Doğrulama sınırlamaları
[P07 kapanışında](P07_KAPANIS.md) kayıtlıdır.

**EYİ 2026 aktarım kaynakları** `/admin/cms/aktarim` adresindedir. Kaynak
paketi 5 Ekim 2026'da salt okunur yakalanmıştır: 40 hedef, 38 erişilebilir,
2 eksik; 22 görsel, 4 PDF, 4 Word şablonu. Kaynakları seçip tarihsel arşiv
uyarısını doğrulayın. İşlem menüye kapalı yeni taslaklar ve kongreye ait
medya oluşturur; mevcut aktarımları korur. Kaynak/saklanan SHA-256 ve
kaynak adresleri panelde incelenebilir. Tarih, banka/ücret, kişiler ve
yayın vaatleri yeni kongre ayarlarına taşınmaz. Envanter
[P07 kaynak belgesinde](P07_KAYNAK_ENVANTERI.md).

Kaynağı yeniden yakalamak yalnız ayrı bir inceleme için yapılır:
`python3 scripts/eyi-source-capture.py`, `python3 scripts/eyi-asset-capture.py`,
`node scripts/eyi-prepare-assets.mjs`, `python3 scripts/eyi-prepare-pages.py`.
Yeni kaynak adresleri `data/eyi-2026/routes.json` içinde gözden geçirilmelidir.
Son derleyici kaynak metinlerinin ve tablo hücrelerinin korunduğunu denetler;
çıktıdan sonra `test:cms-starter`, kaynak/dosya karşılaştırması ve görsel
kontrol gereklidir. Uygulama aktarım sırasında uzaktan dosya indirmez.

`npm run test:cms-starter` 9 saf test + 34 sentetik HTTP/DB senaryosudur.
Önceki paketlerle toplam 218 kontrol ve bağımsız preview kapısı doğrulanır.
DB testlerini sırayla çalıştırın. Son örnek ve kanıtlar
`.local/cms-starter-check-result.json`, `.local/p07-browser-check-result.json`.

Temiz paket commit'inden sonra `node scripts/checkpoint.mjs P07-20261006-final`
kaynak/yerel DB/özel ortam/test kanıtlarını yeni kurtarma klasörüne alır;
28 tablo ayrı geçici yerel DB'ye tam geri yüklenip parmak izleri eşleştirilir.
Önceki checkpoint'ler korunur. Kaynak HTML yakalaması Git dışı özel yedektedir;
uygulamanın dondurulmuş kaynak manifestleri ve doğrulanmış dosyaları Git'tedir.


## P08 ortak kayıtlar ve dinamik sayfalar

**Ortak içerik kayıtları** `/admin/icerik` adresindedir. Kişi ve organizasyon
bilgilerini oluşturun, TR/EN halka açık başlık/biyografi ve kitaplıktan fotoğraf
seçin. Önce organizasyonu, sonra kişiyi yayımlayın. Kurul, görev, konuşmacı
ve panel kayıtlarında aynı kişiyi seçin; görev/konuşma ve program sayfası
bağlantısı ilişki üzerinde tutulur. Bu kayıtlar kullanıcı hesabı/yetkisi vermez.
Mekân, otel, transfer, gezi, sponsor, duyuru/haber/etkinlik ve galeri aynı
kayıt akışını kullanır. Görüntüleme sırası ve kişi sırası düzenlenebilir.

CMS editöründe **Ortak kayıt / form** bloğunu seçin. Başlık, ortak kaynak
ve tek kayıt/tüm yayımlanmış kayıtlar seçilir. Yeni kongre başlangıç taslakları
ilgili kaynak bloklarını içerir. Mevcut sayfalara blok kullanıcı tarafından
eklenir; eski içerik değiştirilmez. Taslağı kaydedip özel önizlemeyi açın:
ortak kayıtların güncel taslakları gösterilir. Halka açık sayfa yalnız
ortak kayıtların ayrı yayımlanmış sürümlerini kullanır. Yeni ortak kayıt
Yayımla işlemi onu kullanan bütün sayfalara yansır. Sayfa geçmişini geri
almak ortak kişi/organizasyon geçmişini geri almaz.

Tarih ve ücret blokları doğrudan kongre işlem ayarları ve aktif kayıt
tarifelerinden okunur. Kapalı kayıt veya ücretsiz akışta eski ücretler ve
ücret son tarihleri gösterilmez. Toplam hesaplaması mevcut kayıt sistemindedir;
CMS ayrı fiyat hesaplama veya rezervasyon motoru oluşturmaz.

İletişim sayfasında **Geri bildirim formu** bloğunu yayımlayın. Ziyaretçi
bilgi metnini okuyup mesaj gönderir; form yalnız aktif, yayımlanmış sayfa
varken çalışır. Talep özel olarak saklanır. **Geri bildirim talepleri**
`/admin/talepler` adresinde organizatör/platform yöneticisi/sekreter tarafından
görülür; içerik editörü mesajları okuyamaz. Yeni/İnceleniyor/Kapalı ve iç not
ile takip edilir; e-posta gönderilmez. Daha geniş sekreterya iş listesi P10'dadır.

`npm run test:content` 8 saf doğrulama + 38 sentetik HTTP/DB senaryosudur.
Diğer DB testleriyle sıralı çalıştırın. Önceki paketlerle toplam 264 kontrol
ve ayrı preview kapısı doğrulanır. Kanıt `.local/content-check-result.json`
ve `.local/p08-browser-check-result.json`. Yeni yıl ortak kayıt/talep taşımaz.

Temiz commit sonrası `node scripts/checkpoint.mjs P08-20261006-final`
kaynak/özel test kanıtı/yerel DB yedeği alır; 32 tabloyu ayrı geçici yerel
DB'ye tam geri yükleyip parmak izlerini karşılaştırır. Önceki checkpoint'ler
korunur. Kapsam ve sınırlar [P08 kapanışında](P08_KAPANIS.md).


## P09 iletişim kuyruğu ve worker

Güncel Mac mini checkout'u `/Users/dentalai/Documents/AIBildiriYonV2/v2`,
dal `codex/v2-p09`'dur. Baştaki temiz kurulum örneği yalnız boş çalışma
kopyası içindir; taşınmış mevcut DB üzerinde `db:init`/seed tekrarlanmaz.
Web adresi `http://127.0.0.1:3100`, DB `127.0.0.1:55432/aibildiri_v2` ve
capture dizini `v2/.local/mail` olarak ayrılmıştır.

`/admin/iletisim` içinden şablonlar, takip edilen Reply-To adresi ve aynı
kongreye ait iletişim/panel bağlantısı ayarlanır. Genel sekretarya şablonu
Reply-To ister. Önizleme örnek veriyle çalışır; test alıcısı `.invalid`
olmalıdır. Kuyruktaki eski iletiler sonradan düzenlenen şablonu almaz.
Gönderim geçmişi güvenli bağlantıları veya mesaj gövdelerini göstermez.

Web isteği yalnız kuyruğa yazar. `npm run dev` ve `npm run start` yerelde
capture worker'ı otomatik başlatır ve web kapandığında durdurur. Normal
kullanımda v2 kökünde aşağıdaki komutlar yeterlidir:

```sh
npm run db:start
npm run start
```

Worker'ı ayrı yönetmek için web'i `MAIL_WORKER_AUTOSTART=false npm run start`
ile başlatıp diğer terminalde `npm run mail:worker` çalıştırın.

Geliştirme için `start` yerine `dev` kullanılabilir. Değişikliklerden
sonra production sürümü sınanacaksa çalışan web sürecini durdurup
`npm run build`, ardından `npm run start` çalıştırın. Worker'ı da kod
değişikliğinden sonra yeniden başlatın. Web başlatma komutu `V2_LOCAL_ROOT`
ayarını kurar; standalone sunucuyu doğrudan açmayın. Node ve PostgreSQL
16 araçları `PATH` içinde bulunmalıdır.

`npm run mail:once` o anda hazır en fazla 20 işi bir tur işler; tüm
kuyruğu boşalttığı anlamına gelmez. `mail:worker` iki saniyede bir yeni
tur yapar; Ctrl+C ile kapanır. Worker kapalıyken işler DB'de bekler.
Geçici hata toplam en fazla 5 denemeye tabidir; kalıcı hata veya belirsiz
sağlayıcı sonucu panelde inceleme gerektirir. Süresi bitmiş/yenilenmiş
erişim bağlantısı teslim edilmez. Yerelde SMTP/Resend kullanılmaz.

P09 kuyruk yarışları ve hata simülasyonları test edilirken normal worker
**kapalı** olmalıdır. Web'i `MAIL_WORKER_AUTOSTART=false npm run start` ile
açıp `npm run test:communication` çalıştırın; bu test kendi kontrollü
worker çağrılarını yapar. Sonra ayrı terminalde `npm run mail:worker`
başlatın ve önceki paketlerin testlerini sırayla çalıştırın:

```sh
npm run test:smoke
npm run test:platform
npm run test:congress
npm run test:site
npm run test:cms
npm run test:cms-starter
npm run test:content
npm run test:safety
npm run test:preview
```

DB'ye yazan testleri sıralı çalıştırın. Sentetik kongre/ileti ve işlem
geçmişi bırakırlar; capture kontrolü worker sonucunu bekler. P09 testinin
SMTP/Resend nesneleri test adaptörleridir ve gerçek ağa gönderim yapmaz.
Tüm saf testler ayrıca `node --test scripts/*.test.mjs` ile çalışır;
test komutlarının saf bölümlerini gereksiz yere tekrar etmeyin. Preview
kontrolü 3102'de ayrı kısa ömürlü uygulama açar; DB'ye bağlanmaz. Lint,
TypeScript ve production build sonuçları ayrıca doğrulanır.

Son P09 sayıları ve final kabul sonucu [P09 kapanışında](P09_KAPANIS.md)
kayıtlıdır. HTTP/DB kanıtı `.local/communication-check-result.json`
dosyasındadır; özel e-posta ve hesap dosyaları konsola yazdırılmaz.

Kontroller bittikten sonra worker'ı durdurun; temiz paket commit'inden
`node scripts/checkpoint.mjs P09-20261006-final` yeni checkpoint oluşturur.
37 tablo ayrı geçici yerel DB'ye restore edilip parmak izleri eşleştirilir.
Worker'ın durması yedek ile karşılaştırma arasında e-posta durumlarının
değişmesini önler; bu sırada web üzerinden işlem/test yapmayın. PostgreSQL
araçları farklı konumdaysa checkpoint için `PG_BIN` tanımlanır.

Preview Compose'da ayrı `mail-worker` servisi vardır; ileride yetkili
deneme yayını yapılırken uygulamayla birlikte başlatılmalıdır. Bu Mac'te
Docker/uzak dağıtım denenmedi. Uzak v2 yayını ve P10 geliştirmesi bu
yerel doğrulamadan ayrı işlerdir.
