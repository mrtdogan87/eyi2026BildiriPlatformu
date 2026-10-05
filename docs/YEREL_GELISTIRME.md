# v2 yerel geliştirme

Dizin `/Users/mrt/Documents/Codex/AIBildiriYonetim/v2`, dal `codex/v2-p01-p02`.
Üst checkout korunmuştur. Node.js 22.13+ ve PostgreSQL 16 CLI araçları gerekir.
Bu makinede Node 25.8.2/PostgreSQL 16.13 ile doğrulandı. Docker gerekmez.

İlk kurulum bu makinede tamamlandı. Yeni temiz kurulum:

```sh
cd /Users/mrt/Documents/Codex/AIBildiriYonetim/v2
npm ci
npm run local:setup
npm run db:init
npm run db:start
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

Sonraki çalıştırmalarda `npm run db:start` ve `npm run dev` yeterlidir.
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
parolasını sıfırlamaz. Hakem/editör/başkan ekranları ilgili paketlerde açılır.

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
