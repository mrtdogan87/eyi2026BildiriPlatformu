# Bağımsız v2 deneme ortamı

**Yapılandırma hazır; uzak dağıtım yapılmadı.** Kesin test/yeni canlı alt
alan adları henüz seçilmedi. Mevcut Coolify uygulaması ve üniversite CMS'i korunur.

Dosyalar `deploy/Dockerfile.preview`, `deploy/compose.preview.yml`,
`deploy/preview.env.example`, `src/proxy.ts`. Yeni proje `aibildiri-v2-preview`;
DB/kullanıcı `aibildiri_v2_preview`, ayrı DB/mail volume'ları. DB dışarı port
açmaz; uygulama `127.0.0.1:3101` dinler. Yeni HTTPS adresi ayrı proxy/Coolify
kaynağında buna bağlanır. Tüm sayfa/API/dosya/asset isteklerine Basic auth
uygulanır; `noindex` ek kontroldür.

1. Mevcut canlıya bağlı olmayan yeni test projesi oluşturun.
2. Örnek env'yi Git dışında `.env.preview` olarak kopyalayın. Yeni
   DB/admin/iki oturum/önizleme sırlarını üretin. Aynı DB parolası
   `V2_PREVIEW_DB_PASSWORD` ve iki URL'de kullanılır; gerektiğinde URL kodlayın.
   `replace-with` örnek değerleri uygulama tarafından reddedilir.
3. Ayrı HTTPS adresini seçin; `V2_DB_HOST=db-v2-preview` iç ağ hedefidir.
4. Docker bulunan yeni test ortamında, `v2/` dizininden:

   ```sh
   docker compose --env-file .env.preview -f deploy/compose.preview.yml build
   docker compose --env-file .env.preview -f deploy/compose.preview.yml up -d db-v2-preview
   docker compose --env-file .env.preview -f deploy/compose.preview.yml --profile migration run --rm migrate
   docker compose --env-file .env.preview -f deploy/compose.preview.yml up -d app
   ```

5. Ayrı HTTPS yönlendirmesini kurun; anonim istek `401`, doğru test girişi
   başarılı olmalı. Sentetik verilerle başvuru/kayıt/dosya/mail sınayın.
   Seed betiği yalnız yerelde çalışır; gerçek veri ithali kapsam dışıdır.
6. Ayrı günlük test DB yedeği ve geri yükleme/erişim kontrolünü doğrulayın.

Migration build/start içinde çalışmaz; ayrı job hedefi denetler.
Docker build `.env*`, yerel DB/mail/yedek/yüklemeleri dışlar; sahte build
ayarları kullanır. Gerçek test ayarları runtime env'den alınır. Mail özel
volume'a kaydedilir; SMTP/Resend yasaktır. Dosyalar sadece test DB'sindedir.

Bu makinede Docker yok; imaj/Compose uzak ortamda çalıştırılmadı.
Yerel Next derlemesi ve preview erişim kodu prova edilir; Docker/TLS/domain
kabulü yayından önce ayrıca yapılmalıdır.
