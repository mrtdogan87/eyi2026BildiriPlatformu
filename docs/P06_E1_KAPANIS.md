# P06-E1 — Sayfaya özel İngilizce yayın

**Yerel kabul: 07.10.2026**, başlangıç P21 `f281ca2`. Önceki sayfa şeması ve `translations.en.enabled` seçeneği korunur; yeni migration veya içerik dönüştürme yoktur.

CMS editörü → EN → **Bu sayfanın İngilizce sürümünü etkinleştir**. Başlık, menü etiketi ve bloklar ayrı girilir; menü etiketi boşsa aynı dilin başlığı kullanılır. İngilizce isteğe bağlıdır: kapalı veya hazırlanmakta olan çeviri Türkçe yayına engel olmaz. Değişiklik önce taslağa kaydedilir, sonra yayımlanır. Taslak kaydetmek mevcut yayını değiştirmez.

Genel menü/listeler ve `/<kongre>/sayfalar/<sayfa>?lang=en` yalnız etkin, tamamlanmış ve yayımlanmış İngilizce sürümü gösterir. Türkçe içerik İngilizce yerine kullanılmaz. İngilizce sürüm yoksa doğrudan adres 404, Türkçe sayfadaki EN düğmesi kapalıdır. Dil geçişi tüm gövde/başlık/menüyü birlikte yeniler; bağlantılar seçilen dili korur. Eski sayfa adresi yeni adrese yönlenirken dil korunur. Sayfalar arasında istemci gezinmesi dil düğmesinin güncel sayfa durumunu yeniler. URL ön yüklemesi dil çerezini değiştirmez.

İngilizceyi kapatıp Türkçeyi yayımlamak kaydedilmiş çeviriyi silmez. Yeniden etkinleştirmek, eksik içerik denetimini ve ayrı yayın adımını yeniden gerektirir. Yalnız Türkçe, İngilizcesi taslak, iki dilde yayın ve İngilizcesi kapalı örnekler kontrol edildi. Önceden mevcut sayfa kayıtları, taslakları, sürüm numaraları ve yayın işaretçileri byte karşılaştırmasında aynı kaldı.

P21 düzeltmesi de bu kontrol noktasına dahildir: sorumlu yazarın arşivde geri aldığı PDF izni, kongre yeniden açılıp arşiv genel erişimi kapansa da eski canlı kitap listesinden/indirme adresinden veya organizatörün tekrar yayın API'sinden canlanmaz. Özel PDF geçmişi korunur.

## Doğrulama

18 CMS birim kontrolü, 16 yeni dil HTTP senaryosu, önceki 68 CMS HTTP ve 36 arşiv/26 kitap HTTP senaryosu geçti: **164 kontrol**. Lint, üretim build/TypeScript ve özel bilgi taraması temiz. Şema aynı: **33 migration / 97 tablo**. 12 gerçek tarayıcı kontrolünde dil geçişi, sayfalar arası gezinme, editörde İngilizceyi kapatma/yayınlama, çevirinin korunması ve 404 doğrulandı; ek kanıt özel `.local/p06e-browser-check-result.json` içindedir.

Kurtarma etiketi `../.recovery/P06E-20261007-final`; ayrı geçici DB'ye tam restore ve 97 tablonun satır/SHA-256 eşleşmesi manifestte kayıtlıdır. Uygulama P22 yerel pilota devam eder.
