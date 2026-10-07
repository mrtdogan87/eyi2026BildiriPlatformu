# Admin arayüzü paketleri — teknik uygulama kaydı

Kök plan Bölüm 17, UI01–UI10. Başlangıç `5c0ef78`. Yerel dal: `codex/admin-ui-ui01-ui10`. Gerçek kullanıcı kabulü bekler; otomatik kontroller kullanıcı testi değildir. Canlıya yayın yapılmaz. P01–P22 ve uzak yayın kabulü bu kayıtla kapanmaz.

| Paket | Teknik durum | Gösterilebilir sonuç ve kontrol |
|---|---|---|
| UI01 | Tamamlandı | Üç örnek ekran, 33 menü hedefi, ortak bileşen ve stil kuralları. 6 rol/modül/menü kontrolü, TypeScript; masaüstü ve 390 px, klavye sekmeleri. Mobil örnekte içerik taşması giderildi. |
| UI02 | Tamamlandı | Dar çerçeve, gruplanmış menü, aranan kongre seçici, konum yolu, hesap, dört kısa yol. 19 mevcut platform regresyonu, TypeScript/ESLint; masaüstü/390 px, menü Escape dönüşü, taslakta gezinme ve kongre geçişini iptal. |
| UI03 | Devam ediyor | Platform, kurum, kullanıcı, kongre kurulumu, ayarlar, modüller, ekip. |
| UI04 | Planlandı | Listeler, kayıt detayları ve günlük operasyon. |
| UI05 | Planlandı | CMS, medya, içerik, yayın kontrolleri. |
| UI06 | Planlandı | Hakemlik, kişisel hakem görevleri ve ödüller. |
| UI07 | Planlandı | Program, görevler, etkinlik ve yoklama. |
| UI08 | Planlandı | Sertifika ve tanıtım çalışma alanları. |
| UI09 | Planlandı | Yayın, kitap, arşiv, kişisel kayıt. |
| UI10 | Planlandı | Tam ekran envanteri, %200/klavye/mobil, son regresyon, yedekli manuel test sürümü. |

Her paketin ekranları ve komut çıktıları özel `.local/ui/uiNN-*` dosyalarında tutulur. Geri dönüş noktaları paket başına Git commitleridir. Başlangıç yedeği `.recovery/P22M-20261007-final` içindedir; kaynak ve 100 tablo geri yüklemesi doğrulanmıştı. Yeni son sürüm için kapanışta yeni doğrulanmış yedek alınır.

Kaydedilmemiş form koruması değişen formları ve açıkça kaydedilmemiş editör durumunu izler; hata sonucu kaydedilmiş sayılmaz. Sekmelerin içerikleri durum kaybolmasın diye gizlenir, silinmez. Seçili kongre değiştiğinde önceki kongrenin bileşenleri yeniden kullanılamaz. Liste/kayıt dönüşü ilgili pakette filtreyi korur.
