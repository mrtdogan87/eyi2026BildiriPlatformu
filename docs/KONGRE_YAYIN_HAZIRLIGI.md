# Kongre canlı yayın hazırlığı — 9 Ekim 2026

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
