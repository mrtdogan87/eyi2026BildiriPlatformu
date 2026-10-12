# Kongre yönetimi iyileştirmeleri — 13 Ekim 2026

Bu kayıt uygulama ve teknik kabul kapsamını açıklar. Kullanıcının insan kabulü henüz yapılmadı. Canlı yayın, imaj kimlikleri ve geri dönüş kanıtı ayrıca kaydedilecektir.

## Tamamlanan paketler

1. E-posta alanlarında örnek adres; beş hatalı girişten sonra 10 dakikalık bekleme, kalan süre ve tekrar deneme bilgisi. Bilinen/bilinmeyen hesaplar aynı yanıtı alır. Güvenilir istemci kimliği bulunmayan doğrudan bağlantılar ortak bir küresel kilide bağlanmaz.
2. Kongre başlangıcında 00:00, bitiş ve son tarihlerde 23:59 başlangıç değeri; değiştirilebilir saatler ve İstanbul saat dilimi. Mevcut kayıtlı tarihler korunur. Etkinlik, bildiri, tam metin, katılım ve ödeme tarihlerinin amaçları panelde açıklanır; açık modüllere göre gösterilir.
3. Platform, kurum ve kongre yönetimini ayıran sol menü; sağ üstte ad, gerçek hesap rolü ve aktif alan. Avatar harfi/rengi kullanıcıya ait tarayıcı tercihidir; yetki veya kalıcı kullanıcı profilini değiştirmez.
4. Web sitesi > Dil ve çeviriler: ana sayfa başlıkları, tam/kısa kongre adı, görsel açıklamaları, CMS sayfaları, ortak içerikler, tema ve başvuru beyanları tek ekranda. TR/EN yan yana; eksik metin göstergesi, taslak kaydetme ve ayrı yayımlama. Otomatik çeviri yapılmaz. CMS kapalıyken ayar yetkilisi ana sayfa/başvuru metinlerini düzenleyebilir; CMS endpoint yetkileri değişmez.
5. Üst şerit ve ana görsel alt bandı seçili tema rengini izler. Solda düzenleyici kurum, sağda kongre adı vardır. Alt bant metni iki dilde düzenlenebilir; boş bırakılan dilde slogan gizlenir, yıl kongre ayarından gelir. Bölüm başlıkları düzenlenebilir.
6. PNG/JPEG/WebP, 5 MB sınırı, logo/ana görsel boyut ve kompozisyon önerileri. S harfli favicon ve Apple simgesi. Drive aramasında asıl statiVera logosu bulunamadığı için simge bağımsız taslaktır; resmî logonun aynısı olduğu iddia edilmez.
7. Kayıt değişiminde eski taslak/rollerin taşınması, kayıt kimliğine bağlı görünüm tercihi, aynı CSV'nin tekrar seçilmesi, başarılı yeni kayıt formunun sıfırlanması, aynı yayın satırının taslağı sıfırlaması ve katılım iptal talebinin yanlış çalışma alanına yönlenmesi düzeltildi. Site/ayar/görsel yazımlarında beklenen kongre kimliği denetlenir.

## Teknik kabul

Bütün veri üreten testler ayrı `kongre-test.localhost:3102` ortamında, sıfırdan oluşturulan sentetik PostgreSQL veritabanında ve capture mail ile çalıştı. Canlı kayıtlar, gerçek e-postalar ve çalışma alanının mevcut yerel veritabanı test hedefi olmadı.

- Birim testleri: **542/542** geçti.
- TypeScript ve ESLint: başarılı. Yerel test kopyaları ve derlenmiş çıktılar lint/typecheck kapsamından çıkarıldı; kaynak kuralları gevşetilmedi.
- Site ayarları/görseller: **30 HTTP senaryosu**; kongre oluşturma ve ayarları: **29 senaryo**.
- Giriş beklemesi: **6 HTTP/DB senaryosu**, bağımsız tarayıcı giriş/form/dosya kontrolleri: **16 senaryo**.
- Çeviri metinleri ve yayımlama: **6 HTTP senaryosu**; rol/modül/kongre erişim matrisi: **6 senaryo**; merkezi ekranın gerçek Chrome tarayıcı kabulü: **9 kontrol**.
- Çapraz sekmede kongre değişimi: **7 senaryo**. Yanlış/eski kimlik 409 ile reddedildi; içerik, audit, modül ve görsel kayıtları değişmedi.
- Kayıt ayrıntısı/kullanıcı yetkisi: **6 sentetik tarayıcı senaryosu**.
- Geri/ileri: **4 birim**, **8 izole tarayıcı** ve **2 gerçek Next App Router** senaryosu. İptalde taslak, URL ve Next geçmiş durumu; onayda hedef sayfa ve geçmiş uzunluğu doğrulandı. Chrome'da precommit ve restore fallback sınandı. Navigation API olmayan eski tarayıcılarda SPA geri/ileri koruması yoktur; mevcut sayfadan ayrılma uyarısı sürer.
- Desktop/tablet/mobile ve CSS 2× büyütme kontrolü yanında **ayrı gerçek Chrome 154, native 200% zoom** kontrolü yapıldı. Pencere 1440×1000 sabit; CSS viewport 1440→720, CDP zoom 1→2, DPR 1→2, CSS zoom=1. 35 kontrolün hiçbirinde yatay taşma yok; TR/EN ve kaydet alanı görsel olarak kontrol edildi.

Yerel kanıtlar: `.local/isolated-acceptance/app/.local/*-result.json`, `/private/tmp/kongre-auth-browser-qa/`, `/private/tmp/kongre-translations-browser/`.

## Yayın sınırları

Bu değişiklikler migration gerektirmez. Eski EYI uygulaması ve üretim verileri korunmalıdır. Yeni SSH anahtarı, token, kalıcı erişim veya güvenlik gevşetmesi oluşturulmaz. Üretim runner/tools imajları aynı dondurulmuş kaynak commit'inden üretilip izole olarak doğrulanmalı; mevcut Coolify hizmeti değiştirilmeden önce sunucu üzerinde güncel yedek ve eski imajlar korunmalıdır.

Bağımlılık audit'inde önceden mevcut Prisma/Mammoth CLI zincirlerinde 4 high ve 3 moderate kayıt bulundu; geliştirme araçları ayrıca 5 kayıt içeriyor. Bu paket çalışma zamanında yeni bağımlılık eklemez. Next.js 16.3.8 için bu taramada advisory bulunmadı. Audit çıktıları `.local/kongre-release-audit-*-20261013.json` içindedir; sıfır açık veya genel güvenlik garantisi verilmez.
