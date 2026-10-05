# P02 — Bağımsız yerel v2

**Yerel kapsam ve deneme yapılandırması tamamlandı · 05.10.2026**
**Uzak yayın bekliyor; yayımlandı sayılmaz.**

Bağımsız checkout `/Users/mrt/Documents/Codex/AIBildiriYonetim/v2`, dal
`codex/v2-p01-p02`. Ana checkout kodu/planı korunur; sadece özel yedek ve
v2 klasörlerini dışlamak için ana `.gitignore` güncellendi. Push yapılmadı.
P01 kaydı commit `6c4d82c`; P02 kod/belgeleri ayrı yerel commit ile kaydedilir.

## Çalışan sonuç

- `http://127.0.0.1:3100/eyi-2026`: mevcut TR/EN başvuru/kayıt ekranları.
- Bağımsız PostgreSQL 16: `127.0.0.1:55432/aibildiri_v2`; kendi kümesi,
  DB kullanıcı/parolası. Mevcut 11 migration sadece bu yerel DB'de uygulandı.
- Sentetik seed: iki kongre (açık/kapalı), 13 tarife, gönderilmiş/kabul
  edilmiş iki bildiri ve `.invalid` yazarlar. Gerçek veri geliştirme DB'sine aktarılmadı.
- `capture` e-postaları özel `.local/mail` dosyalarında; SMTP/Resend'e çıkış yok.
- Bağımsız yerel/deneme çerez adları ve yeni admin/oturum sırları.
- Dosyalar yalnız yerel DB'de. Mevcut canlı dosya alanı kullanılmaz.
- Deneme Dockerfile/Compose/env örneği ve tüm isteklere kimlik doğrulama kapısı.
- Güncellenen kaynak planın modülerlik, seçmeli kullanım ve P16A/P16B
  kararları v2 kopyasına alındı. [ADR-0001](adr/0001-modul-sinirlari.md)
  sahiplik/ortak arayüz, bağımsız CMS/sertifika ve tahmin etkisini kaydeder.
- Build/start'tan migration çıkarıldı. Migration/seed/dev komutları hedef
  ortamı denetler; mevcut canlı DB ve üretim migration'ı reddedilir.
- Standalone derleme özel env, yerel DB/mail/yedek içermez. Next'in otomatik
  env kopyası derleme sonunda temizlenir; ayarlar runtime'dan alınır.

## Kabul kanıtı

| Kontrol | Sonuç |
|---|---|
| Kilit dosyasından bağımsız `npm ci` | Başarılı; Mac native Next derleyicisi kuruldu |
| Güvenlik testleri | 27/27: iki DB URL'sinde uzak/canlı hedef, yanlış port/DB; SMTP/Resend; oturum ve preview ayarı; production migration reddi |
| TypeScript / ESLint | Başarılı; lint uyarısı/hatası yok |
| Üretim derlemesi | Başarılı; migration içermez |
| Gerçek yerel HTTP akışı | 15 kabul kontrolü başarılı |
| Deneme erişim provası | Sayfa/API/dosya/CSS anonim `401`; doğru giriş `200`, bağımsız Secure/HttpOnly oturum çerezi |
| Tarayıcı | Yerel hub, başvuru/kayıt ekranları açıldı |
| Mevcut canlı | Aynı konteyner/imaj/başlangıç zamanı; HTTP 200; migration sayısı 11 |

HTTP senaryosu: yakalanan taslak linkini doğrulama → içerik/yazar/katılım
→ DOCX yükleme → gönderim → iki yazara yakalanmış bildirim → admin kabulü
→ yakalanan kayıt linki → 100 TRY **sentetik** tarife → dekont/öğrenci
belgesi → yetkili indirme/anonim ret. Yüklenen/indirilen byte SHA-256'ları eşleşti.
Eski admin çerezi ve bozuk taslak imzası reddedildi. Gerçek e-posta gönderilmedi.
Test kayıtları yerelde bırakıldı. `paidAt` eski akıştaki dekont yükleme
anlamını korur; banka doğrulaması yapıldığı iddia edilmez (P12).

Kanıt dosyaları `.local/smoke-result.json`/`preview-check-result.json`;
özel/tekrar üretilebilir veriler Git dışındadır. Çalıştırma komutları
[YEREL_GELISTIRME.md](YEREL_GELISTIRME.md) içinde.

## Değişen alanlar, sınırlar ve sonraki paket

`scripts/`: ortam/başlatma/PostgreSQL/seed/kabul testleri. `src/lib/`:
ortam kontrolü, e-posta yakalama, oturum ayrımı. `src/proxy.ts`: deneme
erişimi. `next.config.ts`/`package.json`: bağımsız build/start.
`deploy/`, env örnekleri, ignore kuralları ve işletim belgeleri tamamlandı.
Bu pakette yeni Prisma şeması/migration eklenmedi.

Somut bekleyen işler: kesin deneme alt alan adı, ayrı test Coolify/Compose
projesi, o ortamda Docker/TLS/domain/yedek kabulü. Yerelde Docker yok;
Compose YAML/yapı ayrımı kontrol edildi, uzak imaj çalıştırılmadı. Mevcut
canlı uygulama ve üniversite CMS'i değişmedi. Üniversite CMS kaynak kodu
erişimi bilinmiyor; P06 tahmini buna dayanmıyor.

Sonraki paket **P03**: kurum/kongre ayrımı, kişisel hesaplar, üyelikler,
temel roller ve ortak modül hizmetleri/kapıları. Eski tek admin/sabit kongre
akışı P03/P04'te genişletilecek. Kaynak planın 40–65 günlük geçici toplamına
taşınabilirlik örnekleri için 2–4 günlük uygulama risk payı ADR'de belirtildi
(42–69 gün); kapsam/kesin süre kararları planlama sohbetinde kalır.
