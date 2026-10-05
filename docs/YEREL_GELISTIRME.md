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
- Çerez ön eki `aibildiri_v2_local_`, imza sırları bağımsızdır. HTTP sadece
  yerel loopback; denemede HTTPS/secure çerez gerekir.
- Dosyalar ayrı DB byte alanlarına gider; eski yükleme alanı kullanılmaz.
- `.env*`, `.local`, `.preview`, `.recovery` ve build çıktıları Git dışındadır.

Seed iki sentetik kongre (açık/kapalı), 13 tarife ve iki test bildirisi içerir;
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
```

Smoke gerçek HTTP üzerinden sentetik başvuru/dosya/kabul/kayıt/dekont ve
e-posta/yetki kontrolünü yapar, yeni test kayıtları bırakır. Kanıt
`.local/smoke-result.json`; gerçek veri/e-posta kullanılmaz.
Uygulama Ctrl+C, DB `npm run db:stop` ile durdurulur. P01 restore kümesi
uygulamaya bağlı değildir; kabul provasından sonra kapatılır.
