# UI11 — Kurum hiyerarşisi ve yönetici ekranları

08.10.2026 · Yerel teknik uygulama tamamlandı. Gerçek kullanıcı kabulü bekler. Kaynak başlangıcı `46eab25a88592e3986fb1e699458e5a60ea6ae30`, dal `codex/admin-ui-ui01-ui10`. Kök `GELISTIRME_PLANI.md` Bölüm 18 uygulanmıştır; bu plan dosyası `v2` Git deposunun dışındadır.

## Uygulanan davranış

| Yönetici | Başlangıç ve kapsam |
|---|---|
| Platform | `/admin/platform`: kurumlar, genel hesap/yetki ve sistem desteği. Günlük görünümde kongre seçicisi, listesi, operasyon kartları ve kongre oluşturma çağrısı yoktur. Genel bağlam ve kullanıcı yanıtları bütün kongreleri tarayıcıya yüklemez. |
| Kurum | `/admin/kurumlar`: yalnız yönettiği kurumlar; kurumun kongreleri ve sorumluları. Kongre oluşturma seçili kurumla başlar. Kongre yönetimine geçiş ve kurum yönetimine dönüş açıktır. |
| Kongre | Tek kongrede `/admin/panel`, birden çok kongrede kendi kongre listesi. Yetkili kongrelerin mevcut açık modülleri ve günlük işlemleri; genel platform/kurum yönetimi menüleri yoktur. |

Platform ilgili kurum kaydından **Kongreye müdahale** yolunu açar; o kurumun kongresini seçip 10–500 karakterlik tek satır gerekçe yazar. Giriş, hedef değişikliği ve çıkış gerçek platform hesabıyla işlem geçmişine yazılır. Müdahale durumu, hedef, gerekçe ve **Müdahaleyi bitir** işlemi admin sayfalarında görünür. Sabit üst başlık da müdahaleyi ve hedef kongreyi belirtir. Bu geçiş başka hesabı kullanmaz ve üyelik/kalıcı rol eklemez.

Sunucu yetkisi yalnız oturumdaki gerekçeli hedef için geçerlidir. Eski doğrudan bağlantı, başka kongrenin API/özel dosyası veya şablonu müdahaleyi atlayamaz. Çıkış ve yeniden giriş önceki kongreyi sessizce seçmez. Kapalı modül, kapanmış kongre, sürüm, gerekçe ve onay kuralları korunmuştur.

Altı kongre rolü ve çoklu rol atamaları mevcut modelde tanımlıydı; yeniden oluşturulmadı. Hakem/başkan kişisel görev kısa yolları, geniş yönetim yetkisinden ayrı olarak kişinin gerçek kongre görevleriyle gösterilir. Kurumdan gelen yönetim yetkisi, kişinin ayrıca atanmış görevlerini silmez.

## Kabul ve regresyon kanıtı

| Kontrol | Sonuç | Yerel kanıt |
|---|---|---|
| Son kaynak build, TypeScript ve ESLint | Geçti | `.local/ui11-final-build.log`, komut çıktıları |
| UI11 giriş/kapsam/gerekçe/audit/çıkış/rol/özel dosya senaryoları | 27 geçti | `.local/ui11-check-result.json` · `npm run test:ui11` |
| Kurum, çoklu rol, davet, hesap/üyelik kapatma ve boş ilk kurulum | 34 + 4 geçti | `.local/platform-management-result.json`, `.local/platform-empty-result.json` · `npm run test:platform-management` |
| Geniş regresyon | 416 birim + 916 HTTP = 1.332 geçti; ayrıca 157 önizleme geçti | `.local/ui11-regression-result.json` · `node scripts/pilot-regression.mjs` |
| Son konum yolu düzeltmesi ve müdahale birimleri | 15 geçti | `node --test scripts/admin-ui.test.mjs scripts/intervention.test.mjs` |
| Masaüstü/mobil tarayıcı | 1280 px ve gerçek CSS 390 px; yatay taşma yok | `.local/ui11-browser-result.json`, `.local/ui11-*-desktop.png`, `.local/ui11-*-mobile.png` |

Tarayıcıda platform → kurum → kongre → gerekçeli müdahale → çıkış; kurum yöneticisi → kendi kongresi → kurum yönetimine dönüş; kongre yöneticisinin kendi kongre seçicisi ve operasyonları doğrulandı. Kurumdan kongre oluşturma akışı doğru kurumu seçili açtı. Mobil menü Escape ile kapandı ve odağı tetikleyiciye döndürdü. Kaydedilmemiş gerekçede gezinme uyarısı iptal edildiğinde metin korundu. Son ekran görüntüleri görsel olarak incelendi.

Tarayıcının mevcut ölçeği ilk viewport isteklerini farklı CSS genişliğinde açtı. Kabul için boyutlar DOM üzerinden ölçülüp **390 ve 1280 px** olacak şekilde tekrarlandı; nihai ekran görüntüleri bu ölçülerdedir. 200% yakınlaştırma ve gerçek insan kullanımı bu paketle geçmiş sayılmaz; UI10 manuel kabul kaydı da bekler.

Son yalnız konum yolu ve sabit başlık gösterim değişikliklerinden sonra ilgili birimler, UI11 senaryoları, build ve lint tekrar geçti. Geniş regresyondan sonra iş kuralları değiştirilmedi. Eski regresyon istekleri artık test yardımcısıyla açık sentetik müdahale gerekçesi gönderir; gerçek uygulamanın gerekçesiz isteği reddetmesi ayrı ham HTTP senaryosunda doğrulanır.

## Veri koruma ve geri dönüş

Şema geçişi `20261008102000_platform_intervention` yalnız `PlatformSession` tablosuna iki nullable alan ekler: `interventionReason`, `interventionStartedAt`. Yerel geçiş uygulandı. Eski oturumda yalnız seçili kongre bulunması müdahale yetkisi sağlamaz. Kurum/kongre ilişkileri, iş kayıtları veya dosyalar taşınmadı; reset/seed yapılmadı.

Geçiş öncesi yedekler `.local/ui11-before.dump` (601.492.608 bayt) ve `.local/ui11-source-before.tar` içindedir. Geçişin hemen ardından beş temel modelin tam kayıt sayıları ve özetleri aynı kaldı; başlangıç ölçümü `.local/ui11-before-records.json` dosyasındadır. Regresyon sonunda yedek ayrı geçici veritabanına geri açıldı ve aşağıdaki özgün kayıtlar mevcut veritabanıyla eşleştirildi:

| Özgün kayıtlar | Sonuç |
|---|---|
| 26 kurumun tüm alanları | Aynı |
| 1.143 kongrenin kimliği, adı, adresi ve sahip kurumu | Aynı |
| 317 hesabın kimliği, adı, e-postası, parola özeti, platform yetkisi ve aktifliği | Aynı |
| 328 kurum üyeliğinin tüm alanları | Aynı |
| 2.404 kongre üyeliğinin tüm alanları, tek ve çoklu rolleri | Aynı |

Kanıt `.local/ui11-preservation-result.json`; yalnız oluşturulan geçici kontrol veritabanı kaldırıldı. Uygulama veritabanının üzerine yedek geri yüklenmedi. Oturum ve denetim kayıtları normal kullanım/testlerle yenilenir; mevcut yerel sentetik test ortamına yeni sentetik kayıtlar eklenmiştir. Bu karşılaştırma bütün bilimsel kayıtların alan alan son durum karşılaştırması değildir; bu akışlar ilgili regresyonlarla kontrol edilmiştir.

Geri dönüşte UI11 kaynak değişikliği geri alınabilir; ek nullable sütunlar tutulmalıdır. Platform oturumları iptal edilip yeniden giriş istenir. Yeni kayıtların üzerine eski tam veritabanı yedeği yazılmaz; tam yedek yalnız ayrı bir hedefte doğrulama veya kontrollü kurtarma için kullanılır. Kaynak ve veri yedekleri, hesaplar ve test kimlik bilgileri `.local` altında özel kalır; Git'e eklenmez.

Yerel uygulama `http://127.0.0.1:3100` üzerinde çalışır. E-posta modu `capture`; gerçek alıcılara deneme iletisi gönderilmedi. Canlıya yayın yapılmadı.
