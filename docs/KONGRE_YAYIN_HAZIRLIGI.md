# Kongre canlı yayın hazırlığı — 9 Ekim 2026

**10 Ekim güncel durum:** canlı kurulum tamamlandı. Sonuçlar ve işletim
bilgileri [canlı yayın kaydındadır](KONGRE_CANLI_YAYIN.md). Aşağıdaki metin,
hazırlık sırasında tutulan tarihsel kontrol noktalarını içerir; eski
"henüz yapılmadı" ifadeleri güncel kurulum durumunu anlatmaz.

Hedef `https://kongre.stativera.store`. Kullanıcı ayrı uzak deneme ortamı
istemiyor. `https://bildiriyonetim.stativera.store/eyi-2026`, eski uygulama ve
veritabanı korunacak. Hazırlık `codex/kongre-production` dalında, UI12 kapanışı
`887ece7` üzerine yapılmıştır. Bu kayıt canlıya çıkıldığını ifade etmez.

## Hazırlanan değişiklikler

- Ayrı PostgreSQL 16 DB/kullanıcı/volume; web, e-posta ve zamanlanmış CMS
  yayını için ayrı servisler. Üretim hedefi `aibildiri_v2_production`.
- Linux üzerinde Node 24 ile oluşturulan imajlar; işçilerin tam yerel modül
  ağacı, Prisma istemcisi ve PDF kaynakları. Mac bağımlılıkları imaja kopyalanmaz.
- Üretim migration'ı yalnız ayrı komutta açık DB adı doğrulamasıyla çalışır.
  Build/start migration veya seed çalıştırmaz. Eski DB ve domain engelleri korunur.
- CMS işçisinin yalnız yerel ortam kısıtı kaldırılmıştır; üretimde iki işçi
  ayrı süreç olarak yönetilir. Başarılı taramalar sağlık dosyalarını yeniler.
- İlk yönetici, yalnız boş hedefe mevcut hesabın scrypt parola özetiyle
  aktarılır; başka hesap/veri varsa işlem reddedilir. Parola özeti stdout'a,
  environment'a veya Docker imajına yazılmaz. Hiçbir otomatik e-posta gönderilmez.
- Kaynak hesabın adı/e-postası gerekirse sadece özel aktarım dosyasında
  kullanıcının verdiği gerçek bilgilerle değiştirilir; yerel hesap değişmez.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `npm run test:production` | 76 test geçti: ortam sınırları, üretim izinleri, işçi başlatma/sağlık, bootstrap ve container tanımları |
| `npm run test:production-database` | Geçici, bağımsız PostgreSQL kümesinde 9 kontrol geçti; 39 migration uygulandı |
| İlk hesap ve tekrar kurulum | Aynı parola özeti ve Türkçe ad korundu; tekrar kurulum mevcut hesabı değiştiremedi |
| İşçiler | Boş kuyruk ve CMS taraması gerçek Prisma bağlantısıyla başarılı; e-posta gönderilmedi |
| Yedek/restore | Yeni test DB'si dump alınıp ayrı DB'ye geri açıldı; hesap ve işlem geçmişi eşleşti |
| Next üretim derlemesi | Ayrı geçici kaynak/dependency kopyasında geçti; mevcut çalışan yerel `.next` değişmedi |
| ESLint / diff | Tam lint ve `git diff --check` başarılı |

Özel kanıtlar `.local/production-build.log` ve
`.local/production-database-result.json` içindedir. Test veritabanı kümesi test
sonunda durdurulup kaldırıldı; UI12'nin temizlenmiş çalışma veritabanına test
verisi yazılmadı. Docker/ARM64 imajı henüz oluşturulup çalıştırılmadı; yerel
derleme sonucu bunun yerine geçmez.

## Devir raporunun düzeltilen noktaları

- Yeni sürüm rapordaki eski `codex/v2-p08` commit'inden ileridedir; UI12
  tamamlanmıştır. GitHub okuma kontrolünde `main` hâlen eski `a0c224b` sürümüdür.
- 5 Ekim yedeğinin geri yükleme kanıtları `../.recovery/P01-20261005-200112/`
  altında mevcuttur: yeni ve günlük yedekte 13 tablo eşleşmiştir. Güncel sunucu
  yedeğinin durumu bundan çıkarılamaz.
- 9 Ekim dış kontrolünde mevcut EYİ adresi HTTP 200, panel HTTP 302 döndü;
  `kongre.stativera.store` aynı sunucu IP'sine çözülüyor. Yeni domainin TLS
  doğrulaması henüz geçmedi.
- Sunucu kapasitesi bugün ölçülmedi; yeni sunucu satın alma/yükseltme kararı
  verilmedi. Eski raporda 4 GB sunucuda webpack OOM geçmişi bulunuyor.

## Uzak kurulum için kalanlar

1. Kullanıcı Coolify oturumunu açacak; sunucu kaynakları, eski uygulamanın dalı,
   mevcut yedekler ve yeni kaynağın sınırları okunarak doğrulanacak.
2. Yerel tek yönetici hesabı `.invalid` test adresi kullanıyor. Kullanıcının
   gerçek ad/e-postası bekleniyor; parola korunarak özel aktarım hazırlanacak.
3. Yeni uygulama ayrı kaynak ve bu yayın dalına bağlanacak. Eski `main` dalına
   v2 merge/push yapılmayacak. Yetkili erişim olmadan uzak değişiklik yapılmadı.
4. Güncel kaynak ölçümüne göre Linux ARM64 build yeri seçilecek; gerçek Docker
   build ve image smoke kontrolleri yapılacak. Aktif eski servisleri bellek
   baskısına sokacak bir build başlatılmayacak.
5. SMTP 587/STARTTLS veya seçilen sağlayıcının güncel erişimi yeni ortamda
   doğrulanacak; sırlar yeni uygulamaya özel korunacak. Kullanıcının adresine
   gönderim testi ayrıca açıkça kararlaştırılacak.
6. Yeni DB/migration/bootstrap, günlük yedekleme ve doğrulanmış geri dönüş,
   HTTPS, giriş ve temel akışlar tamamlanacak; eski EYİ adresi tekrar kontrol
   edilecek. Push, yayın veya yeni sunucu alımı henüz yapılmadı.

Kurulum adımları: [üretim rehberi](../deploy/README.production.md).

## 10 Ekim 2026 erişim ve sunucu kontrolü

- Kullanıcı Coolify oturumunu açtı. Eski `AIBildiriYonetim` kaynağının aynı
  GitHub deposundaki `main` dalını izlediği ekrandan doğrulandı; ayarı değişmedi.
- Canlı sunucu ARM64, 2 CPU ve 3,7 GiB RAM: ölçüm sırasında yaklaşık 1,4 GiB
  kullanılabilir RAM, 17 GiB boş disk vardı. Swap kullanımı 2,2 GiB idi.
  Derleme için bu Mac'te ayrı `kongre-build` Colima profili seçildi; sunucuda
  build başlatılmadı. Yerel Linux ARM64 imajları oluşturuldu ve doğrulandı.
- Eski DB'nin 10 Ekim 03:00 UTC tarihli yedek dosyası 69.556.301 bayt;
  önceki günlük dosyalar da mevcut. Bu kontrol güncel dosyanın varlığını
  doğrular; bu yedeğe yeni bir restore denemesi yapılmadı.
- Eski uygulamada `smtp.gmail.com:587`, `SMTP_SECURE=false` ve gerekli
  kullanıcı/parola/gönderen alanları tanımlı. Sır değerleri günlüğe alınmadı;
  bu kontrol e-posta teslimatını kanıtlamaz.
- Kullanıcının doğruladığı gerçek e-posta ile özel yönetici aktarımı hazır.
  Yerel hesaptaki parola özeti korunuyor; yerel DB değişmedi. Aktarım dosyası
  Git dışında, yalnız sahibi tarafından okunabilir izinlerle saklanıyor.
- Yereldeki `codex/kongre-production` dalı henüz GitHub'a gönderilmedi.
  GitHub CLI oturum açma akışı henüz tamamlanmadı; ilk tek kullanımlık kodun
  süresi doldu. Dosya aktarımı için hazırlanan
  geçici SSH anahtarı sunucuya henüz eklenmedi; erişim onayı bekleniyor.
  Canlı sunucunun SSH kimliği, kimliği doğrulanmış Coolify terminalinden
  okunarak yerel bağlantı için sabitlendi.

### Gerçek Linux ARM64 imajı doğrulaması

- `stativera/kongre-web:prod-d068a47cd90f-arm64` ve
  `stativera/kongre-tools:prod-d068a47cd90f-arm64` imajları hazır.
- Native sharp görsel dönüşümü, Prisma motoru, Türkçe PDF/fontlar ve
  işçilerin modül yüklemeleri geçti. Gerçek çalışma DB'si kullanılmadı.
- Docker içindeki ayrı, dış erişimi olmayan ağ ve geçici PostgreSQL 16 ile
  **12/12 kontrol geçti**: 39 migration, kurulum onayı kontrolleri, stdin ile
  sentetik yönetici/audit oluşturma, tekrar kurulumun reddi, web sağlık
  isteğinde HTTP 200, mail/CMS taramaları ve heartbeat kontrolleri.
- E-posta kuyruğu boş kaldı; gerçek e-posta gönderilmedi. Denemenin bütün
  container, ağ ve volume kaynakları temizlendi. Kanıt:
  `.local/kongre-image-e2e-result.json`.
- `scripts/generate-prebuilt-compose.mjs`, sırları okumadan ve runtime
  değişkenlerini çözmeden hazır imajlara göre Compose üretiyor. Dört yeni
  kontrol ve sekiz container kontrolü geçti; kaynak Compose korunuyor.
- Coolify beta.470 / sunucudaki Compose 5.1.1 davranışı resmî kaynak kodundan
  doğrulandı: normal Deploy'daki pull, `pull_policy: never` tanımlı uygulama
  imajlarını atlıyor. Yeni kaynağın üretilmiş Compose'u ayrıca incelenecek.
- Eski EYİ adresi 10 Ekim kontrolünde tekrar HTTP 200 döndü. Uzak kurulum,
  gerçek yönetici aktarımı, HTTPS ve yeni DB yedekleme kabulü henüz yapılmadı.

### Yayın öncesi bağımlılık düzeltmesi

İmaj kontrolünden sonraki npm audit, Next.js 16.3.6 için düzeltilmiş sürüm
gerektiren güvenlik duyuruları bildirdi. Bu nedenle yukarıdaki `d068a47cd90f`
etiketli imajlar **canlıya yüklenmeyecek**. Next.js ve eşleşen ESLint paketi
16.3.8 sürümüne sabitlendi; düzeltme sonrası imaj/çalışma kontrolleri
yenilendi. Yalnız package/lock dosyaları güncellendi: çalışan yerel
`node_modules`, `.next` ve DB değiştirilmedi. DOCX/SMTP regresyonlarının
sekizi de geçti.

Yeni lock audit'inde Next uyarısı kalmadı. Yedi paket kaydı (dört high,
üç moderate) hâlâ mevcut: Prisma CLI yapılandırmasının effect/deepmerge-ts
zinciri ve Mammoth CLI'ın argparse/sprintf-js zinciri. Kaynak incelemesinde
bu uyarıların gerektirdiği HTTP çağrı yolu bulunmadı. Prisma migration işleri
depo içindeki güvenilen şemayı kullanır; uygulama Prisma Client ve Mammoth'un
`extractRawText` kütüphane arayüzünü çağırır. Deepmerge için düzeltme major
davranış değişikliği içeriyor; sprintf için yayımlanmış düzeltme bulunmuyor.
Audit'in Prisma/Mammoth geriye sürüm geçişi önerileri uygulanmadı. Bu kayıt
sıfır audit uyarısı iddiası değildir. Kanıtlar `.local/kongre-npm-audit.json`
ve `.local/kongre-production-npm-audit-next1638.json` içinde.

Resmî kaynaklar: [Next 16.3.8 sürüm notu](https://github.com/vercel/next.js/releases/tag/v16.3.8),
[Effect duyurusu](https://github.com/Effect-TS/effect/security/advisories/GHSA-38f7-945m-qr2g),
[Deepmerge duyurusu](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx),
[sprintf üretici bildirimi](https://github.com/alexei/sprintf.js/issues/237).

### Güncellenmiş yayın adayı

Güncel imaj kaynağı `c0c12764b973`, iki imaj etiketi
`stativera/kongre-web:prod-c0c12764b973-arm64` ve
`stativera/kongre-tools:prod-c0c12764b973-arm64`.
Her iki imajda Next 16.3.8 doğrulandı. Native kontroller ve gerçek Docker
imajlarıyla **13/13 entegrasyon kontrolü geçti**. Önceki kapsama ek olarak
sentetik yöneticinin gerçek giriş isteği HTTP 200 döndürdü, oturum cookie'si
oluştu ve platform yönetim sayfası açıldı. Testin DB/ağ/container kaynakları
temizlendi; gerçek hesap, çalışma DB'si ve e-posta kullanılmadı.

Güncel kanıt `.local/kongre-image-e2e-result.json` içinde; önceki imajın
kanıtları `.local/kongre-evidence-d068a47cd90f/` altında ayrı saklanıyor.
