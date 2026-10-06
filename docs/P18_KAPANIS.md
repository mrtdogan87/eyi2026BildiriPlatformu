# P18 — Düzenlenebilir davet ve afiş

**Durum: Yerel kabul tamamlandı. Tarih: 07.10.2026.** Dal: `codex/v2-p18`; başlangıç P17 `ef54664`. Tüm içerik, yükleme ve yayımlama kontrolleri sentetik yerel verilerle yapıldı.

Panel → **Davet ve afiş çıktıları** (`/admin/tanitim`). Organizatör, sekreterya ve içerik editörü kongre adı/kurum/tarih alanlarını kullanan TR/EN davet metnini ve afiş başlığını düzenler. Metin, şablon ve görsel ayrı sürümlerle korunur. Kaydedilmemiş metin varken eski kaynağın önizlenmesi engellenir. Hazırlanmış PNG/JPEG yükleme metni değiştirmez; akademik şablon görsel gerektirmez. Yalnız PROMOTION açık bağımsız etkinlikte de çalışır.

Önizleme → güncel kaynak sürümüne bağlı açık onay → özel dosya üretimi. Davet mektubu A4 PDF; afiş A4 baskı PDF, web 1200×675, kare 1080×1080 veya dikey hikâye 1080×1920 PNG olabilir. PDF Unicode yazı tipi gömer; afiş aynı yazı tipinden vektör glifler kullanır. Uzun veya desteklenmeyen metin sessizce kesilmez; düzeltme uyarısı verir. İngilizce çıktı ayrı İngilizce başlık ve metin ister.

Dosyanın genel görünümü ayrıca gerekçe ve onayla açılır; üretim tek başına yayımlamaz. `/<kongre>/tanitim` her tür/boyut/dil için son güncel onaylı dosyayı gösterir. Kaynak metin, görsel veya kongre bilgisi değişince eski genel çıktı kaldırılır; özel sürüm geçmişi korunur. Genel DTO özel metin, işlem yapan kişi veya e-posta içermez. Dosyalar kapsam ve yetki kontrolünden sonra attachment/no-store olarak verilir. Yayımlama geri alma sürüm kontrolü ve işlem kaydıyla çalışır.

## Doğrulama ve sınırlar

**1030 otomatik kontrol:** 297 birim (23 P18), 733 HTTP (32 P18, 40 P17, 121 P16A/B, 345 P09–P15, 195 temel). Ayrıca **129 preview ve 17 gerçek tarayıcı kontrolü**. Eşzamanlı ilk kaynak kaydı, eski önizleme/onay, açık onay zorunluluğu, gerçek Unicode PDF/PNG boyutları, kaynak değişimi, yayımlama/geri alma, üyelik iptali, kapalı modül ve başka kongre dosyası reddi doğrulandı. SVG ve küçük/geçersiz görsel kabul edilmez; gerçek PNG/JPEG yeniden kodlanır. Görsel yüklemesi metni korur. Editör tarayıcıda metin kaydetti, görsel yükledi, önizlenen web dosyasını üretti, indirdi ve ayrıca yayımladı; genel/özel dosya SHA-256 değerleri eşleşti. PDF davet tarayıcıdan indirildi ve render edilerek incelendi. Editör/genel sayfa 390 pikselde taşmadı.

Lint, TypeScript ve üretim derlemesi temiz; DB/Prisma farkı yok. **29 migration / 85 tablo**; uygulanmış migration sağlama toplamları eşleşir. Kaynak/istemci özel bilgi taraması temiz; standalone `.env` içermez. `npm run test:promotion` 23 birim ve 32 HTTP kontrolünü çalıştırır.

Kaynak görsel en fazla 8 MB, 12 milyon piksel, 200–6000 piksel kenar ve tek kare PNG/JPEG; normalize dosya en fazla 12 MB. Kongre başına 50 kaynak görsel ve 500 çıktı; yönetim son 50 çıktı/20 kaynak sürümünü gösterir, önceki kayıtlar DB'de kalır. Davet en fazla iki A4 sayfa; tam grafik tasarım editörü veya otomatik sosyal medya/e-posta gönderimi kapsamda değildir.

Final kurtarma etiketi `../.recovery/P18-20261007-final`. Temiz commit/bundle, özel ortam, capture ve kanıt dosyaları ile DB dump'ı korunur. Web/worker kapalıyken 85 tablo geçici DB'ye tam restore edilir; tüm satır sayıları ve sıralı SHA-256 parmak izleri karşılaştırılır. Gerçek başarı manifest ve özel kapanış JSON'unda kayıtlıdır. Sıradaki P19 tam metin, prova ve yayın onayı; kullanıcı talimatıyla P22 ve P06-E1'e kadar devam edilir.
