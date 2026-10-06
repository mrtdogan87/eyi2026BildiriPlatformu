# P16A — Bağımsız PDF sertifika modülü

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p16`; başlangıç P15 `717f159`.
Tüm örnekler sentetik, e-postalar yalnız yerel capture ortamındadır.

## Kullanım

Panel → **PDF sertifikalar ve alıcılar** (`/admin/belgeler`), ilgili kurum organizatörü/kongre sekreteri ve platform yöneticisi içindir. Tek sayfalı PDF arka planı yüklenir; ad, kurum, tarih/yer, katılım/görev metni, başlık, belge numarası ve doğrulama kodunun konumu, yazı tipi/boyutu, rengi ve hizalaması ayrı ayarlanır. Uzun metin satıra bölünür, belirlenen alt boyuta kadar küçülür veya açık taşma hatası verir; metin sessizce kesilmez. Önizleme numara üretmez. Arka plan sayfasının ölçüsü korunur; ekli form, belge eylemi ve dosyalar yeni çıktıya aktarılmaz.

PDF örnek tasarımı ve indirilebilir Excel örneği yerel deneme içindir. Kullanıcının onaylı kurum tasarımı/imzası sağlanmadı; örnek arka plan kurum belgesi değildir. Liberation Sans/Serif Türkçe fontları lisanslarıyla kaynakta bulunur. Türkçe uzun ad/kurum, A4 yatay ve 612×792 dikey sayfa görsel olarak kontrol edildi.

Tek alıcı manüel veya açık kongre kayıt eşleştirmesiyle eklenir. Bağımsız CSV/XLSX listesinde sütunlar eşleştirilir; satır hataları gösterilir. Hatalı listenin hiçbir satırı alınmaz; geçerli liste önizleme hash'i ve şablon sürümü tekrar doğrulanarak atomik alınır. XLSX tek sayfalı; UTF-8 CSV/XLSX en fazla 2 MB, 5000 veri satırı ve 32 sütundur. Dış worksheet bağlantıları, XML entity/DTD, makro ve formül hücreleri kabul edilmez. Aynı e-posta/görev/bağlam tekrarı reddedilir; farklı görevler ayrı belgedir.

Seçili en fazla 50 alıcıya tekli/toplu PDF üretilir; ZIP toplamı 25 MB ile sınırlıdır. PDF verisi, SHA-256, şablon revizyonu, alıcı ve kaynak sürümleri değişmez kayıt olarak korunur. Yeniden üretim ayrıca onay ve güncel belge sürümü ister; numara/doğrulama kodu korunur, yeni PDF sürümü eklenir. Eşzamanlı üretimde tek kazanan vardır. İptal ve alıcı metni düzeltmesi eski dosyaları silmez. Önceki PDF'ler yetkili ekip tarafından okunabilir; kişisel panel yalnız güncel/geçerli, aynı kongre ve doğrulanmış e-posta sahibinin belgesini sunar.

`/<kongre>/belge-dogrula/<kod>` gerekli ad, görev, numara, sürüm ve geçerli/iptal/eski durumunu gösterir. E-posta, özel kaynak kimliği veya PDF burada paylaşılmaz. Basılı imza görseli elektronik imza olarak doğrulanmaz.

## Üretim ve teslim

Bildirim isteğe bağlı tekli/topludur. P09 kuyruğu, izlenen Reply-To ve kişisel e-posta doğrulama bağlantısı kullanılır; halka açık PDF bağlantısı oluşturulmaz. Worker güncel PDF/alıcı/sürüm ve açık modülü yeniden kontrol eder. Alıcı düzeltmesi veya iptal sonrası eski kuyruk kaydı gönderilmez.

Geri dönen e-posta tam PDF sürümüne bağlanır; üretim READY kalabilirken teslim PERMANENT_FAILURE olur. Adres düzeltmesi yeni adresin aynı kongrede e-posta bağlantısıyla doğrulanmasını ve sekreteryanın sahibini kontrol etmesini ister. Numara/PDF sürümü değişmez; yeniden bildirim ayrı ve gerekçelidir. Genel teslim sorunu ekranı bu doğrulamayı atlayamaz. Eksik Reply-To, işlem/geçmiş/kuyruğu birlikte geri alır.

CERTIFICATES-only örnek kongre; bildiri, kayıt, ödeme, program ve CMS kapalıyken çalışır. Ortak kurum/kongre bağlamı, personel oturumu, erişim politikası, DB, dosya/font ve isteğe bağlı capture kuyruk altyapısı gerekir. PDF yerleşimi/liste okuma çekirdeği kongre veritabanından bağımsızdır. P16A manüel/liste alıcısının belge hakkını operatör teyit eder; kongre yoklama/ödeme/görev uygunluğu P16B'dedir.

## Kontroller ve kurtarma

**823 otomatik kontrol** geçti: 236 birim (21 P16A), 587 HTTP (47 P16A, 345 P09–P15, 195 temel). Ayrıca 103 preview koruması ve 12 gerçek tarayıcı kontrolü: örnek şablon, XLSX yükleme/eşleştirme/aktarma, toplu/tekli üretim, kişisel indirme, kod doğrulama, 390 piksel taşmasız genel/yönetim düzeni. PDF'ler render edilip görsel incelendi. Lint, TypeScript ve üretim derlemesi temiz; DB/Prisma farkı yok. Özel kimlik bilgisi taraması temiz; standalone'da `.env` yok.

Additive `20261006250000_p16a_certificates` altı tablo ekler; **25 migration / 69 tablo**. Uygulanmış migration SHA-256 değerleri eşleşir. P16 öncesi yedek 63 tabloyla restore edildi. `../.recovery/P16A-20261006-final` temiz kaynak commit'i, Git bundle, özel yerel ortam/capture dosyaları ve DB dump'ını korur. Web/worker kapalıyken 69 tablo tam restore edilir; tüm satır sayıları ve sıralı içerik SHA-256 değerleri eşleşir. Özel dosyalar 0600, klasör 0700; geçici restore DB'si kaldırılır. Kanıtlar `.local/p16a-*.log`, `.local/p16a-*.json`, `.local/certificates-check-result.json` ve yedek manifestindedir.

İlk sürüm kongre başına 100 şablon/5000 alıcıyla sınırlıdır; yönetim son 500 alıcı, şablon/PDF/işlem geçmişinin son 20 kaydını gösterir, eskileri DB'de korur. Tam bağımsız harici ürün dağıtımı, QR görüntüsü, otomatik görev hakkı ve e-posta eki bu ara teslimde yoktur. P16B ardından P17–P22 ve P06-E1 kullanıcı talimatıyla ardışık sürer.

## 07.10.2026 P16B tamamlayıcı düzeltmesi

P16A ilk teslimindeki e-posta zorunluluğu plan 14.3 ile uyumlu değildi. P16B aynı modülü e-postasız manuel/CSV/XLSX → PDF/ZIP akışıyla tamamladı. Değişmez alıcı kimliği ve isteğe bağlı referans aynı adlı kişileri ayırır; mevcut kayıtlar ve PDF sürümleri korunur. E-posta yalnız bildirim/kişisel doğrulama için gereklidir. Ek 3 birim, 22 HTTP ve gerçek tarayıcı indirme kanıtları güncel [P16B kapanışında](P16B_KAPANIS.md); yukarıdaki 823 kontrol ilk P16A tesliminin tarihsel sayısıdır.
