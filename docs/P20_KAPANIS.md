# P20 — Kitap ve program PDF

**Durum: Yerel kabul tamamlandı. Tarih: 07.10.2026.** Dal `codex/v2-p20`; başlangıç P19 `ac506a2`. Bütün bilimsel kaynaklar, hesaplar ve yayınlar sentetik yerel test verisidir.

Panel → **Kitap ve program PDF** (`/admin/kitaplar`). Editör/sekreterya/organizatör kaynak, dil ve kapak alanlarını seçer; bütün PDF'yi önizler. Tarayıcı gömülü PDF açmıyorsa yetkili sunucu indirmesi bütün sayfaları verir; indirme kaynak parmak izini yeniden kontrol eder ve kalıcı çıktı oluşturmaz. Alan veya seçim değişikliği önceki önizlemeyi kaldırır. Gerekçe ve açık onay özel PDF sürümü üretir; **genel yayın ayrı onaydır**. Genel liste `/<kongre>/kitaplar`, EN listesi `?lang=en`.

Özet kitabı yalnız ilgili yazar tercihi, güncel prova/onay ve editör hazır kararı bulunan kayıtlardan derlenir. Yapılandırılmış Amaç/Yöntem/Bulgular/Sonuç veya serbest özet; Unicode kapak, gerçek sayfa referanslı içindekiler, sayfa numarası ve kurumlu yazar dizini bulunur. İngilizce kitap bağımsız onaylı İngilizce kaynak ister; Türkçe metin yerine geçmez.

Tam metin kitabı ilgili tam metin kitap izni ve **belirli onaylı prova PDF'sini** kullanır. Hazırlanmış kaynak sayfalar oran korunarak A4 gövde alanına yerleştirilir; kaynak içerik korunur, interaktif form/annotasyon aktarılmaz. Ödül dosyası, özet izni veya dergi isteği tam metin yayın izni oluşturmaz. Rastgele DOCX otomatik dizgisi desteklenmez. Program PDF yalnız mevcut yayımlanmış program sürümünün genel alanlarını kullanır; e-posta ve çevrim içi erişim bağlantısı içermez. Taslak program değişikliği eski yayını değiştirmez; yeni program yayını eski canlı PDF'yi güncellikten çıkarır.

PDF içeriği, SHA-256, kaynak dosya/prova/onay/karar kimlikleri, kapak ve sayfa yerleşimi değişmez sürümde saklanır. Genel onay ayrı sürümlenir; kaynak veya yazar tercihi değişince eski canlı bağlantı kalkar, özel geçmiş kalır. Kalıcı kapanış arşivinin ayrı yaşam döngüsü P21'de uygulanır.

## Doğrulama

**1129 otomatik kontrol:** 335 birim (18 P20) + 794 HTTP (24 P20, önceki 770). Ayrıca **147 preview ve 17 gerçek tarayıcı kontrolü**. Yetki/iki kongre/üyelik iptali, kapalı modül, açık onay, stale kaynak, ayrı yayın ve geri alma, EN kaynağı, çok sayfalı içindekiler, bağımsız PUBLICATIONS-only koleksiyon ve program sürümü kontrol edildi. Tarayıcıdaki yedi sayfalık önizleme indirildi ve görsel incelendi; özel/genel/DB dosyalarının SHA-256 değerleri eşleşti. Yönetim ve genel liste 390 pikselde taşmadı. Gerçek PDF'ler Poppler ile render edilerek kapak, içindekiler, gövde ve dizin incelendi; Türkçe karakter/başlık metinleri PDF'den doğrulandı.

P19'un 15 MB yükleme sınırıyla uyum için Next proxy gövde sınırı 20 MB oldu; **gerçek 15 MB PDF multipart isteği** geçti. Lint, üretim TypeScript derlemesi ve üretim build temiz; DB/Prisma farkı yok. **32 migration / 94 tablo**; uygulanmış migration SHA-256 değerleri eşleşir. Kaynak/istemci özel bilgi taraması temiz, standalone `.env` içermez. `npm run test:books`: 18 birim + 24 HTTP. Gerçek e-posta yok; temel testler yalnız yerel capture kullandı.

Kaynak/oturum sayısı 100, çıktı 300 sayfa/40 MB, tam metin kaynak toplamı 60 MB; kongre başına 500 çıktı, ekranda son 50 çıktı. Sınırı aşan kapak veya desteklenmeyen font karakteri sessiz kırpılmaz; hata verir. Önizleme ile kalıcı çıktı aynı kaynak kimliğine bağlıdır; PDF metadata nedeniyle birebir önizleme byte eşitliği taahhüt edilmez.

Final kurtarma etiketi `../.recovery/P20-20261007-final`. Temiz commit sonrası web/worker kapalıyken DB dump'ı 94 tabloluk ayrı geçici DB'ye geri yüklenir; her satır sayısı ve sıralı SHA-256 karşılaştırılır. Gerçek sonuç manifest ve özel kapanış JSON'unda kayıtlıdır. Sıradaki P21 arşiv/taşınabilirlik; P06-E1 ve P22 yerel teslimine kadar devam edilir.
