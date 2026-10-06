# P22 — Yerel pilot işletimi

Bu belge 07.10.2026 tarihinde bu Mac mini üzerindeki **yerel, sentetik v2** için hazırlanmıştır. Uzak dağıtım veya gerçek kurum verisi aktarımı yapılmadı. Uygulama `/Users/dentalai/Documents/AIBildiriYonV2/v2`, dal `codex/v2-p22`; Node 24 ve PostgreSQL 16 kullanılır.

## Açma ve durdurma

```sh
cd /Users/dentalai/Documents/AIBildiriYonV2/v2
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
export PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
npm run db:start
npm run start
```

Son üretim derlemesi hazırdır. Kod değişirse uygulamayı Ctrl+C ile durdurup `npm run build`, sonra `npm run start` çalıştırın. Geliştirme için `npm run dev` kullanılabilir. Aynı portta ikinci sunucu açmayın. `start` ve `dev`, varsayılan olarak yerel capture işçisini de başlatır. İşçiyi ayrı çalıştırmak için `MAIL_WORKER_AUTOSTART=false npm run start` ve başka terminalde `npm run mail:worker` kullanın. `false` yerine `0` yazmak işçiyi kapatmaz.

DB `127.0.0.1:55432/aibildiri_v2`, uygulama `127.0.0.1:3100` ile sınırlıdır. `npm run db:stop` DB'yi kapatır; önce uygulama ve işçiyi durdurun. Makine uyurken uygulama veya otomasyonun işlemeye devam ettiği varsayılmaz.

## Kullanıcı testi

1. [Yönetim girişi](http://127.0.0.1:3100/admin) üzerinden özel `.local/p03-accounts.json` dosyasındaki kişisel test hesabını kullanın. Parolaları raporlara veya paylaşılan dosyalara kopyalamayın. Üst çubuktaki **Kurum / kongre** seçimi işlem bağlamını belirler.
2. **P22 A Birleşik Pilot 8856bb15 (sentetik)** açık ve ücretlidir. [Genel arşiv](http://127.0.0.1:3100/p22-pilot-a-8856bb15/arsiv?lang=tr), program ve kitapta aynı kabul edilmiş bildiri görünür. Ücret sentetik banka kanıtıyla sekreter tarafından doğrulanmıştır; gerçek ödeme değildir.
3. Katılımcı kişisel hesabıyla [kayıtlarım](http://127.0.0.1:3100/admin/kayitlarim) sayfasını açın; A'yı seçerek başvuru, kayıt, değerlendirme sonucu, program, yoklama, belge ve yayın tercihini inceleyin. Aynı bildiri kimliği bütün süreçte korunur. Bilimsel editör hesabının banka ve özel sertifika dosyalarına erişimi reddedilir.
4. Organizatör/platform hesabında program, yoklama, sertifika, yayına hazırlık, kitap ve arşiv ekranlarını inceleyin. Dosya üretimi, yayın ve e-posta gönderimi ayrı işlemlerdir. Pilot sertifika arka planı sentetiktir; gerçek kurum şablonu ve imza tasarımı henüz seçilmedi.
5. **P22 B Birleşik Pilot 8856bb15 (sentetik)** ücretsiz ve kapalıdır. [Kalıcı arşiv](http://127.0.0.1:3100/p22-pilot-b-8856bb15/arsiv?lang=tr) aynı PDF ve yayımlanmış programı korur. Yeni iş işlemleri kapalıdır; katılımcı ve canlı oturum eylemleri gösterilmez. Verilmiş belgenin doğrulanması açık kalır.
6. Pilot rehberi Türkçe yayımlanmıştır; İngilizce adresi 404 döner. CMS → EN → **Bu sayfanın İngilizce sürümünü etkinleştir**, gerekli İngilizce metinleri gir, taslak kaydet ve ayrı yayımla. Kapatmak kaydedilmiş çeviriyi silmez. Gerçek yayın metinleri kullanıcının içerik çalışmasıdır.

## Sağlık, hata ve e-posta

`GET /api/health` DB bağlantısını denetler: başarılıysa `200 {"status":"ok"}`, DB erişilemiyorsa `503 {"status":"unavailable"}`; yapılandırma ve hata ayrıntısı yayımlanmaz, önbellek kapalıdır. Preview ortamında bu adres de Basic erişim kapısına tabidir.

Yerel başlatma terminali hata çıktısını gösterir; bu teslimin sunucu kaydı `.local/p22-server.log` içindedir. İşlem geçmişi yetkili yönetim ekranında kongreyle sınırlıdır. Harici hata takip servisi kurulmadı. Günlükler ve özel kanıtlar `.local` içinde tutulur, Git'e alınmaz.

`MAIL_MODE=capture`; SMTP/Resend kimlik bilgileri yoktur. Gönderim düğmesi gerçek alıcıya teslimat yapmaz. Kuyruk/delivery durumu yönetim iletişim ekranında, yakalanan iletiler `.local/mail/*.json` içinde görülebilir. `npm run mail:latest` son dosyanın yolunu verir. Sertifika/PDF hazır olması ileti teslim edildi anlamına gelmez.

## Veri koruyan geçiş ve geri dönüş

P22 şema değiştirmedi: **33 uygulanmış migration / 97 tablo**. `npm run prisma:migrate:deploy` mevcut yerelde yeniden çalıştırıldı; iki pilotun tüm bağlantıları ve PDF byte'ları aynı kaldı. Migration derleme/başlatma sırasında otomatik uygulanmaz. Mevcut veride kurulum/seed/reset çalıştırmayın.

Paket kontrol noktası `../.recovery/P22-20261007-final` kaynak bundle/arşivi, tam `local.dump`, özel ortam/hesap/capture dosyaları ve kanıtları içerir. Ayrı geçici DB'ye restore sonrası her tablonun satır sayısı ve sıralanmış SHA-256 değeri eşleşir; sonucu `manifest.json` doğrular. Bu klasör özel veri içerir; erişimini koruyun.

P22 öncesi `P06E-20261007-final` yedeği yeni pilot kayıtlarını içermez. Geri dönmek için önce **en güncel DB ve dosya yedeğini** alın; yalnız eski dump'a dönmek yeni başvuruları kaybettirir. Dosyalar DB byte alanlarında olduğundan güncel dump hem kayıtları hem PDF'leri korumalıdır. Uygulama kaynak geri dönüşünde güncel DB'yi koruyun; önceki `1e311a8` ile şema eşitliği doğrulanmıştır, ancak bu sürüm P22 sertifika düzeltmesini içermez ve üretim geri dönüş adayı olarak onaylanmış değildir.

Yerel kayıpsız prova `npm run test:pilot-recovery` ile yapılır: additive migration, güncel dump, eski ve güncel dump'ın **ayrı geçici DB'lerde** restore edilmesi, pilot bağlantıları/sertifika sürümleri/PDF checksum karşılaştırması ve asıl DB'nin değişmediği kontrolü. Betik geçici DB'leri temizler; uygulamanın DB'sini eski dump ile değiştirmez. İşçi ve sunucu duruyken çalıştırın. Kongreye özel ZIP dışa aktarımı tam DB yedeği yerine geçmez.

Gerçek dağıtımda önce ayrı deneme ortamında bu yöntem prova edilmeli; güncel veri korunmadan canlı restore uygulanmamalıdır. [Deneme ortamı](DENEME_ORTAMI.md) yapılandırması hazırdır. Yeni alan adı, DNS/TLS, Docker imajının gerçek çalıştırılması, HTTPS/Secure oturumlar, gerçek e-posta sağlayıcısı/teslimatı, dış hata takibi, pilot ekip ve gerçek kurum içerik/şablonları **henüz uygulanmadı**. Mevcut canlı ve üniversite sitesi korunmuştur.

## Tekrar doğrulama

```sh
npm run lint
npm run build
# Üretim uygulaması açık, arka plan capture işçisi kapalıyken:
npm run test:pilot-regression
npm run test:pilot-load
npm run test:pilot-preflight
# Sunucu ve işçi duruyken:
npm run test:pilot-recovery
```

`test:pilot` yeni iki sentetik kongre oluşturur ve uçtan uca akışı/sertifika yaşam döngüsünü yeniden yürütür; teslim pilotunun kimliklerini değiştirmeden incelemek için yukarıdaki sabit bağlantıları kullanın. Yük testi sekiz eşzamanlı bağlantı ve 240 karma okuma/yetki isteğidir; üretim kapasitesi taahhüdü değildir. Bağımsız iş modülü örnekleri `scripts/*.test.mjs`, HTTP bağlama örnekleri ilgili `*-check.mjs` dosyalarında ve ortak gereksinimler [modül sınırları ADR'sinde](adr/0001-modul-sinirlari.md) bulunur.
