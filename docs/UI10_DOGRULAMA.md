# UI10 — teknik doğrulama ve kabul sınırları

8 Ekim 2026. Kapsam: kök geliştirme planının Bölüm 17'sindeki UI01–UI10. Uygulama yereldir. Gerçek kullanıcı kabulü yapılmadı; 4/5 görev hedefi sonuç olarak yazılmadı. Canlıya yayın yapılmadı.

## Sonuç

UI01–UI09 paketleri ayrı commitlerle uygulanmıştır. UI10 ortak gezinme, odak, durumlar ve ekran envanteri kontrollerini tamamlar. Menü sunucunun mevcut REVIEWS + SUBMISSIONS ve ATTENDANCE + PROGRAM koşullarını izler. Sertifika, program ve ödülün bağımsız modül seçimleri korunur; bu değişiklik modül yapılandırmasını değiştirmez.

Liste araması ve seçili kayıt yalnız bu tarayıcı oturumunda, kullanıcı + kongre + yol kapsamında saklanır. CMS'nin araması ve arşiv filtresi de editörden dönüşte korunur. Form taslakları bu depoya yazılmaz. İşlem sürümü, kaynak kimliği, `reason`, `confirmed`, `previewHash` ve dosya bağları sunucuda aynı denetimden geçer. Yeni veri modeli/API veya yetki verilmedi.

Otomatik önizleme geçişinde gizlenen butondan düşen odak görünür sekmeye aktarılır. Klavyeyle oklar, Home/End, mobil menü Escape ve iletişim kutusu Escape/odak dönüşü denendi. Kapalı ayrıntıda geçersiz sihirbaz alanı açılarak odaklanır. Gezinme veya kongre geçişini iptal etmek yerel taslağı korur; sekmeler arasında içerik silinmez.

## Otomatik kontroller

- Nihai yerel üretim derlemesi, TypeScript ve ESLint başarılı.
- Tam regresyon: **408 birim + 916 HTTP = 1.324 kontrol**, ayrıca **157 önizleme kontrolü**. Rol birleşimi, kongre sınırı, kapalı modül/kongre, sürüm çatışmaları, körlük, dosya/yayın/onay ve arşiv erişimi kapsanır.
- Ek platform yönetimi 34, boş kurulum 4 ve iki kongreli birleşik pilot 31 + belge yaşam döngüsü 6 kontrolü başarılı. Bu sayılar insan görev başarı oranı değildir.
- Girişte boş ekran ve gerçek hatalı giriş sonucu; kitapta gerçek özel önizleme başarı durumu kontrol edildi. PDF işleminde alanlar kilitlenir ve yüklenme durumu bildirilir; hata taslağı kaydedilmiş saymaz.
- Son ortak odak düzeltmesinden sonra tam regresyon tekrar çalıştırıldı. Kanıt: özel `.local/p22u-regression-result.json`, `.local/p22u-*.log`, `.local/ui/ui10-build.log`, `.local/ui/ui10-lint.log`.

## Tarayıcı envanteri

Aşağıdaki **49 yol** gerçek sayfa yüklemesiyle kontrol edildi. Dinamik yollar sentetik gerçek kayıtlara bağlandı; kişisel hakem/düzeltme yolları kayıt sahibinin hesabında, başkan ve jüri yolları ilgili rollerde ayrıca açıldı. 1280 px masaüstü, 390 px telefon ve 640 px dar çalışma alanı kullanıldı. Genel sayfa taşması görülmedi. Bildiri/kayıt tablosu kendi etiketli kaydırma alanında kalır ve kaydırma açıklaması görünür.

**640 px kontrolü gerçek %200 tarayıcı büyütmesi değildir.** Uygulama içi tarayıcı yalnız viewport denetimi sunuyor; klavye büyütme denemesi ölçeği değiştirmedi ve yerel uygulama denetimi izin vermedi. Gerçek %200 kontrolü manuel kabulde bekliyor. Bu sütun veya aşağıdaki sonuçlar %200'ü geçmiş saymaz.

| Yol | Masaüstü 1280 | Telefon 390 | Dar alan 640 |
|---|---|---|---|
| `/admin` | Geçti | Geçti | Geçti |
| `/admin/arayuz-ornekleri` | Geçti | Geçti | Geçti |
| `/admin/arsiv` | Geçti | Geçti | Geçti |
| `/admin/belgeler` | Geçti | Geçti | Geçti |
| `/admin/belgeler/uygunluk` | Geçti | Geçti | Geçti |
| `/admin/bildiriler` | Geçti | Geçti | Geçti |
| `/admin/bildiriler/[id]` | Geçti | Geçti | Geçti |
| `/admin/cms` | Geçti | Geçti | Geçti |
| `/admin/cms/[id]` | Geçti | Geçti | Geçti |
| `/admin/cms/[id]/onizleme` | Geçti | Geçti | Geçti |
| `/admin/cms/aktarim` | Geçti | Geçti | Geçti |
| `/admin/cms/medya` | Geçti | Geçti | Geçti |
| `/admin/ekip` | Geçti | Geçti | Geçti |
| `/admin/etkinlikler` | Geçti | Geçti | Geçti |
| `/admin/hakemlik` | Geçti | Geçti | Geçti |
| `/admin/hakemlik/bildiriler/[id]` | Geçti | Geçti | Geçti |
| `/admin/hakemlik/gorevler` | Geçti | Geçti | Geçti |
| `/admin/hakemlik/gorevler/[id]` | Geçti | Geçti | Geçti |
| `/admin/icerik` | Geçti | Geçti | Geçti |
| `/admin/iletisim` | Geçti | Geçti | Geçti |
| `/admin/is-listesi` | Geçti | Geçti | Geçti |
| `/admin/islem-gecmisi` | Geçti | Geçti | Geçti |
| `/admin/kayitlar` | Geçti | Geçti | Geçti |
| `/admin/kayitlar/[id]` | Geçti | Geçti | Geçti |
| `/admin/kayitlarim` | Geçti | Geçti | Geçti |
| `/admin/kayitlarim/duzeltme/[id]` | Geçti | Geçti | Geçti |
| `/admin/kitaplar` | Geçti | Geçti | Geçti |
| `/admin/kongre-ayarlari` | Geçti | Geçti | Geçti |
| `/admin/kongre-olustur` | Geçti | Geçti | Geçti |
| `/admin/kongreler` | Geçti | Geçti | Geçti |
| `/admin/kullanicilar` | Geçti | Geçti | Geçti |
| `/admin/kurumlar` | Geçti | Geçti | Geçti |
| `/admin/moduller` | Geçti | Geçti | Geçti |
| `/admin/odemeler` | Geçti | Geçti | Geçti |
| `/admin/oduller` | Geçti | Geçti | Geçti |
| `/admin/oduller/juri` | Geçti | Geçti | Geçti |
| `/admin/panel` | Geçti | Geçti | Geçti |
| `/admin/platform` | Geçti | Geçti | Geçti |
| `/admin/platform/gecmis` | Geçti | Geçti | Geçti |
| `/admin/program` | Geçti | Geçti | Geçti |
| `/admin/program/gorevler` | Geçti | Geçti | Geçti |
| `/admin/sistem` | Geçti | Geçti | Geçti |
| `/admin/site-gorunumu` | Geçti | Geçti | Geçti |
| `/admin/talepler` | Geçti | Geçti | Geçti |
| `/admin/tanitim` | Geçti | Geçti | Geçti |
| `/admin/teslim-istisnalari` | Geçti | Geçti | Geçti |
| `/admin/ucretler` | Geçti | Geçti | Geçti |
| `/admin/yayinlar` | Geçti | Geçti | Geçti |
| `/admin/yoklama` | Geçti | Geçti | Geçti |

Kanıtlar özel `.local/ui/ui10-inventory.json`, `ui10-*-1280.png`, `ui10-*-390.png` ve DOM kayıtlarındadır. Çok uzun kongre listesinde görüntü görünür pencereyi kaydeder; tam sayfa genişliği DOM ölçümüyle kontrol edildi. Ekran envanteri her olası veri durumunu veya insan kullanılabilirliğini doğruladığı anlamına gelmez.

Genel kongre ana sayfası, program, kitap, arşiv ve katılımcı giriş yüzü üç genişlikte kontrol edildi; admin kapsayıcısı yoktur ve sayfa taşması görülmedi. Genel katılımcı girişinin TR/EN geçişi de denendi. Ortak kişisel bileşenlerin halka açık davranışı HTTP regresyonuyla ayrıca doğrulandı.

## PDF ve görev sonuçları

- UI08'de e-postasız “UI08 Sentetik Bağımsız Alıcı” için `CERT-E27AE4D3391648769603`, PDF sürüm 1 üretildi. UI10'da görünür PDF bağlantısı üzerinden tarayıcı indirme API'siyle indirildi; PDF açılabilir ve **1 sayfa**. E-posta teslimi oluşmadı. Önceki UI08 denemesinde indirme olayı zaman aşımına düşmüştü; UI10'daki gerçek dosya sonucu bu eksik teknik doğrulamayı tamamlar.
- Birleşik pilot A'nın kitap önizlemesi görünür bağlantıdan indirildi; **4 sayfa**. Bu denemede yeni kitap üretimi veya genel yayın yapılmadı.
- Hakemde teslim edilmiş değerlendirme, jüri görevinde yeni sürüm teslimi ve başkanda değişen zaman nedeniyle yeniden yanıt gereken davet açıkça görünür. Gerekçe boş ve onay kutusu işaretlenmemiş kaldı; görev yanıtı/yeni değerlendirme gönderilmedi.
- Kişisel düzeltmede “inceleme bekliyor” durumu yalnız kayıt sahibi hesabında gösterildi. Kongre değişimini iptal eden kitap taslağı, aynı kongre ve içerikle korundu.

Özel sonuç dosyası `.local/ui/ui10-interaction-result.json`; indirilen doğrulama kopyaları `.local/ui/ui10-downloaded-certificate.pdf` ve `ui10-downloaded-preview.pdf`.

## Bekleyen kabul ve geri dönüş

Gerçek kullanıcı için [manuel görev rehberi](UI10_MANUEL_TEST.md) hazırdır. İlk denemede en az 4/5 yönlendirmesiz görev, yanlış kongrede işlem olmaması ve veri kaybı olmaması **bekleyen kabul hedefidir**. Gerçek %200, kullanıcı indirme/Excel akışı ve hatalı görevlerin yeniden denemesi bu oturumda geçmiş sayılmaz.

Paket geri dönüş commitleri: UI01 `24790f2`, UI02 `f55dba4`, UI03 `51e5c1a`, UI04 `9f4eb2e`, UI05 `1d18681`, UI06 `13428ff`, UI07 `ae9cb61`, UI08 `f1494ef`, UI09 `442a18b`. UI10 kaynak noktası son yerel commit ve aşağıdaki yedeğin `manifest.json` içindeki `commit` alanıdır. Başlangıç kaynak noktası `5c0ef78` ve başlangıç doğrulanmış yedeği `../.recovery/P22M-20261007-final`.

Nihai yerel kapanış yedeği: `../.recovery/P22U-20261008-final`. Yalnız `manifest.json` içindeki `restoreVerified: true` ve tablo parmak izleri eşleştiğinde doğrulanmış sayılır. Kaynak bundle/tar, yerel veritabanı, özel yapılandırma, hesaplar, capture posta ve UI kanıtları birlikte saklanır. Geri dönüşte önce mevcut çalışma/veri ayrıca yedeklenir; paket kaynak commitine dönüş ile veritabanı geri yükleme ayrı kararlardır. UI değişiklikleri için veri resetlemek gerekmez.
