# UI10 — yerel gerçek kullanıcı testi

**Durum: uygulanmadı, insan kabulü bekliyor.** Otomatik kontroller bu formun yerine geçmez. İlk denemede beş temel görevden en az dördü sözlü yönlendirme olmadan tamamlanmalıdır. Yanlış kongrede işlem veya kaydedilmemiş veri kaybı kabul edilmez.

Başlangıç: [yerel yönetim paneli](http://127.0.0.1:3100/admin). Yerel üretim derlemesi `npm run start` ile 127.0.0.1:3100 üzerinde çalışır; e-posta capture modundadır. Gerçek alıcı, gerçek banka işlemi ve canlı yayın kullanılmaz. Denemeler yalnız aşağıdaki sentetik kongrelerde yapılır. Kişisel hesaplar ve parolalar özel `.local/p03-accounts.json` içindedir; bu dosya paylaşılmaz veya kaynak kontrolüne eklenmez.

Sabit ana örnek: **P22 A Birleşik Pilot a7bee868 (sentetik)**, `p22-pilot-a-a7bee868`. A Test Üniversitesi altında açık kongredir; bağlı bildiri, kayıt, PDF, yayın ve arşiv kayıtlarını içerir. **P22 B Birleşik Pilot a7bee868 (sentetik)** B kurumuna aittir ve kapanmıştır. Kongreyi işlemden önce başlıktan kontrol edin.

Kaynak noktası UI10 kapanış commitidir. Yedek `../.recovery/P22U-20261008-final` içindedir; `manifest.json` kaynak commitini ve gerçek geri yükleme sonucunu gösterir. Testten önce manifestte `restoreVerified: true` kontrol edilir. Otomatik senaryo üretimini tekrar çalıştırmak yeni örnekler oluşturur; insan testi boyunca bu sabit sürüm kullanılır. Mevcut insan kayıtları ve eski sentetik örnekler silinmez.

## Beş temel görev

Görev amacı kullanıcıya verilir; uygulama sırasında menü/alan yönlendirmesi yapılmaz. Aşağıdaki başarı ölçütünü gözlemci kullanır. Yardım istenen noktalar, yanlış geçişler ve başarısız görevler aynen kaydedilir; sonradan verilen yardımla başarı ilk deneme başarısı sayılmaz.

| Görev | Kullanıcının amacı | Gözlemcinin başarı ölçütü |
|---|---|---|
| 1 | A kurumunun birleşik pilot kongresini bulup o kongrenin bekleyen iş özetini açmak | Doğru kurum/kongre başlıkta görünür; boş özet varsa boş olduğu doğru okunur. Başka kongrede işlem yapılmaz. |
| 2 | Pilot A bildirisini arayıp ayrıntısını incelemek ve listeye dönmek | “Pilot A” filtresiyle doğru kayıt açılır; dönüşte filtre ve liste konumu korunur. Kayıt/dosya sürümü değiştirilmez. |
| 3 | Yalnız yerelde yeni bir CMS taslağını TR/EN düzenleyip önizlemek ve ayrı yayın onayını bulmak | “UI10 Kullanıcı Taslağı” gibi yeni sentetik bir sayfa oluşturulur. Dil alanları karışmaz; kaydetmek kendiliğinden yayın sayılmaz. Yerel yayın denenecekse hedef ve sürüm ayrıca kontrol edilir. |
| 4 | Kendi başkan veya hakem görevini açıp görev durumunu ve gerekli dosyayı bulmak | Hakem hesabıyla ana pilotta atanmış görev; veya başkan hesabıyla **P14 Program b3d9b0d6** içindeki güncellenen oturum açılır. Davet yanıtı, değerlendirme taslağı/teslimi ve yoklama ayrı okunur. Otomatik onay verilmez. |
| 5 | E-postasız bir alıcı listesini eşleyip PDF üretmek ve indirmek | **P16 PDF Sertifikalar 6f3bb882**, “Updated certificate template · sürüm 2” kullanılır. [Örnek CSV](ornekler/ui10-alicilar.csv) sütunları eşlenir; hata özeti okunur. Gerekçe/onay kullanıcı tarafından girilir. İndirilen PDF açılır; belge numarası/sürümü görülür ve üretim e-posta göndermemiştir. |

Sertifika görevinin üretim öncesi karşılaştırma kaydı: **UI08 Sentetik Bağımsız Alıcı**, `CERT-E27AE4D3391648769603`, PDF sürüm 1. Bu örnek e-postasızdır ve teknik denemede gerçek dosyası indirilebilmiştir. Yeni kullanıcı denemesinde bu alıcının mevcut sürümü değiştirilmez; yeni sentetik alıcılar kullanılır. XLSX ile aynı sütun eşleme görevi ayrıca tekrarlanır; otomatik XLSX kontrolü insan başarı sonucu değildir.

## Bütünlük ve ek senaryolar

- Bir alanı değiştirip başka ekrana veya kongreye geçmeyi deneyin. İptal edin; aynı kongrede ve aynı taslakta kalın. Sekmeler arası geçişte taslak, gerekçe veya seçili dosya kaybolmamalıdır.
- TR/EN CMS taslağında özel önizleme, taslak kaydı, genel yayın, zamanlama ve geçmişi ayrı bulun. Sürüm değişince eski önizleme/onayla işlem denenmemelidir.
- **P18 Şule Işık Bilimsel Buluşması 1b519ee0 — güncel** kongresinde davet/afiş metni, görsel, çıktı boyutu ve önizlemeyi bulun. Özel çıktı üretimi ile genel yayın onayı ayrı olmalıdır.
- Ana pilotta yazarın üç yayın tercihini, belirli prova onayını ve editörün hazır kararını okuyun. Kitapta kaynak → bütün PDF önizlemesi → özel üretim → ayrı genel yayın yolunu bulun. Bir onayı değiştirmenin eski kaynağı geçersizleştirdiğini kontrol edin.
- Çoklu rollü sentetik hesapta kendi görevleri ve yönetim görevleri birlikte görünmelidir. Yalnız hakem/başkan hesabı yönetim işlemi kazanmaz. Farklı kongre kaydının bağlantısı erişim vermemelidir.
- Yalnız sentetik kongrede modülü kapatıp menü ve sunucu engelini gözlemleyin. Program ve yoklama bağımsız seçimdir; sertifika veya ödül bağımsız modül olarak açılabilir. Kapatmak önceki kayıt/dosyaları silmez. Kapanmış B pilotunda operasyonlar kapalıyken izinli arşiv/belge erişimi korunur.
- Masaüstü ve 390 px telefonda menü, sekme, iletişim kutusu, boş/yükleniyor/hata/başarı durumlarını kontrol edin. Klavyede Tab, oklar, Home/End ve Escape kullanın. Geniş tablo kendi alanında kaymalı; sayfanın bütünü taşmamalıdır.
- **Gerçek tarayıcı yakınlaştırmasını %200 yaparak tekrar deneyin.** Bu kontrol otomasyonda geçmedi; 640 px viewport onun yerine kabul edilmez. Metin/odak/menü kırpılması ve bütün sayfa taşması gözlemci tarafından kaydedilir.

## Sonuç formu

| Görev | İlk denemede yardım olmadan başarı | Yardım / hata / düzeltme | Yeniden deneme |
|---|---|---|---|
| 1 | Bekliyor | — | — |
| 2 | Bekliyor | — | — |
| 3 | Bekliyor | — | — |
| 4 | Bekliyor | — | — |
| 5 | Bekliyor | — | — |

Test tarihi, tarayıcı, cihaz, gerçek %200 sonucu, yanlış kongrede işlem ve veri kaybı gözlemi ayrıca yazılır. Sonuç şu anda **0 görev denenmiş** durumundadır; bu bir 0/5 başarısızlık veya 4/5 başarı sonucu değildir. Başarısız görev arayüz düzeltmesi olarak kaydedilir ve aynı sürümden tekrar denenir.
