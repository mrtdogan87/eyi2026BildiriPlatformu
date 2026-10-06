# P21 — Kongre kapanışı ve taşınabilir arşiv

**Yerel kabul tamamlandı, 07.10.2026.** Dal `codex/v2-p21`, başlangıç P20 `96c7378`. Tüm kabul kayıtları sentetik; gerçek e-posta gönderilmedi.

Panel → **Kongre arşivi ve dışa aktarma** (`/admin/arsiv`). Editör/sekreterya arşivi okuyup kendi kaynak yetkisiyle ZIP çıkarabilir; organizatör gerekçeli önizleme/onayla arşiv yayımlar, yaşam döngüsünü ayarlar ve kongreyi kapatır. Genel arşiv `/<kongre>/arsiv`; `?version=N` değişmez sürüm bağlantısıdır. Başlık, DOI, ISBN ve atıf elle kaydedilen metadata alanlarıdır; dış kurumdan numara tahsis edilmez.

Kapanış yeni iş modülü işlemlerini durdurur. Bekleyen e-postalar iptal edilir; işlenmekte olan teslim denemesi kapanıştan önce sonuçlanmalıdır. Yeniden açma önceki modül seçimlerini geri getirir, iptal edilen mesajları yeniden göndermez. Açıkça yayımlanmış arşiv/PDF/program ve mevcut yayımlanmış CMS ayrı yaşam döngüsüyle korunur. Belge doğrulamasını koruma seçeneği kapanış öncesinde uygunluğun sürümlü görüntüsünü alır; iptal edilmiş belge hiçbir zaman geçerli sayılmaz.

Arşiv eski bilimsel çıktıyı kaynak düzenlemesiyle değiştirmez. Yazarın yayın iznini geri alması ilgili eski PDF erişimini kalıcı kapatır; izin yeniden açılınca eski çıktı canlanmaz. Oturum açmış sorumlu yazar kongre kapandıktan sonra **Kendi kayıtlarım → Arşivdeki yayınlarım** üzerinden de izni geri alabilir. Organizatör yazarın geri almasını kaldırmaz. E-posta bağlantılı katılımcı oturumlarının yeni erişimi kapanır; kapanış sonrası bu işlem kişisel platform hesabından yapılır. Geçmiş arşiv metadata kaydı korunur.

Genel, yayın, belge ve CMS ZIP'leri kaynak yetkisini yeniden kontrol eder. Seçili dosyaların SHA-256 değerleri ve içerik manifesti bulunur; özel oturum/şifre/doğrulama sırları metadata'ya aktarılmaz. ZIP bir tam DB yedeği değildir. Seçim en fazla 50 dosya/60 MB; metadata 500 kayıt (belge uygunluğu görüntüsü 5000), arşiv sürümü 200 sınırındadır. Saklama tarihi İstanbul tarihiyle korunur; inceleme tarihi otomatik veri silmez.

P20 uyumluluk düzeltmesi: dergi yönlendirme gibi bilimsel kaynak/prova/onay/izin değiştirmeyen işlem sürümü artışı canlı kitabı gereksiz gizlemiyor. Yeni üretim hâlâ güncel önizleme sürümünü ister; gerçek kaynak veya izin değişikliği eski canlı kitabı kapatır.

## Kabul kanıtı

**1175 otomatik kontrol: 345 birim + 830 HTTP** (34 P21, güncel kitap testi 26, önceki 770). Ayrıca **155 preview, 21 gerçek tarayıcı kontrolü**. İki kongre, kaynak yetkisi, iptal edilmiş üyelik, stale/onaysız yayın, eşzamanlı yayın, kapalı modüller, worker kapanış kilidi, yazar geri alması ve yeniden açma kontrol edildi. Gerçek dört sayfalık EN PDF ve tek seçili dosyalı ZIP tarayıcıda indirildi; DB PDF ve ZIP manifestinin checksum'ları eşleşti. PDF kapak/içindekiler/gövde/dizini render edilip incelendi. Yönetim ve genel arşiv 390px genişlikte taşmadı; retention tarihi kaydetme/yükleme sonrası aynı kaldı.

Lint, üretim build/TypeScript temiz; DB/Prisma farkı yok. **33 migration / 97 tablo**, uygulanan migration checksum'ları eşleşir; kaynak/istemci sır taraması temiz, standalone `.env` içermez. `npm run test:archive`: 10 birim + 34 HTTP (hazırlıkta kitap testi de çalışır).

Final kurtarma etiketi `../.recovery/P21-20261007-final`. Temiz commit ve durdurulmuş web/worker sonrası ayrı geçici DB'ye tam restore yapılır; 97 tablonun satır sayısı ve sıralı SHA-256 eşleşmesi gerçek manifestte kayıtlıdır. Sıradaki P06-E1 ve P22 yerel pilotudur; harici dağıtım ayrı adımdır.
