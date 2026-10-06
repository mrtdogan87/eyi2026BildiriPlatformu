# P19 — Tam metin, prova ve yazar yayın onayı

**Durum: Yerel kabul tamamlandı. Tarih: 07.10.2026.** Dal: `codex/v2-p19`; başlangıç P18 `0ac05ec`. Bütün kaynaklar, hesaplar, PDF'ler ve onaylar sentetik yerel pilot verisidir.

Panel → **Tam metin, prova ve yayın onayı** (`/admin/yayinlar`). Organizatör, sekreterya ve içerik editörü bağımsız ilk tam metin teslim ve revizyon/yazar onayı tarihlerini belirler. Kaynak, kabul edilmiş bildiri veya dış referanslı bağımsız bilimsel çalışma olabilir. Bildirinin başlığı, özeti, yapılandırılmış özet alanları ve yazarları bilimsel kaynaktan gelir; serbest alanla üzerine yazılamaz. Kaynak sorumlusu yazar/sahip olmalıdır. Kaynak kimliği ve sorumlusu sonradan başka kişiye çevrilemez.

**Ödül dosyası yayın izni değildir.** Yayın dosyası bağımsız `FULL_TEXT` veya editörün hazırladığı `PROOF` olarak gerçek PDF kontrolü, numara, SHA-256 ve gerekçeyle kaydedilir. Ödül dosyası otomatik kopyalanmaz. Üç tercih başlangıçta kapalıdır: **özet kitabı**, **tam metin kitabı**, **dergiye yönlendirme isteği**. Yazar kendi kişisel hesabında veya e-posta doğrulamalı katılımcı panelinde tercihlerini ayrı seçer. Staff yazar adına tercih/onay veremez.

Editör güncel dosyayı, bilimsel kaynağı ve üç tercihi belirli **prova sürümüne** bağlar. Yazar dosyayı indirip tam o prova kimliği/SHA-256 için onay veya geri alma verir. Editörün **yayına hazır** kararı güncel prova ve güncel yazar onayını açıkça belirtir. Metin, dosya veya tercih değişince önceki onay/karar geçersiz kalır; aynı eski tercihlere dönmek onayı yeniden canlandırmaz. Yeni kaynak sürümü, prova ve yazar onayı gerekir. Kaydedilmemiş tercih varken tarayıcı onayı kapalıdır. Prova geçmişi o sürümün üç tercihini gösterir.

İlk tam metin kendi teslim tarihine, sonraki tam metin revizyon tarihine bağlıdır. Son tarih yeni izin/onay ve dosyayı durdurur; yazar tercihlerini veya mevcut prova iznini geri alabilir. Geri çekme kaydı kapatır, geçmişi silmez. Özel dosyalar yalnız aynı kongrenin yetkili editörüne veya güncel sorumlu yazarına attachment/no-store olarak verilir. Bildiriden kaldırılan yazar, üyeliği kaldırılan editör ve başka kongre eski bağlantıyla erişemez. Yayın geçmişinin bilimsel kaynağı silinemez.

Dergi isteği ve onaylı prova için yönlendirme hedefi/dış referans kaydı tutulur; **dergi kabulü değildir**, e-posta veya dergi sistemine işlem göndermez. Kitap derleme/yayımlama P20'nin ayrı onayıdır.

## Doğrulama ve sınırlar

**1087 otomatik kontrol:** 317 birim (20 P19), 770 HTTP (37 P19, 32 P18, 40 P17, 121 P16A/B, 345 P09–P15, 195 temel). Ayrıca **139 preview / 18 gerçek tarayıcı kontrolü**. İki kongre; eşzamanlı ilk takvim, tercih, yazar onayı ve editör kararında tek kazanan; açık onay/kaynak sürümü zorunluluğu; değişen PDF/tercih/bilimsel kaynak; eski iznin canlanmaması; onay geri alma; bağımsız teslim/revizyon; kaldırılan yazar/üyelik; özel dosya SHA-256; kapalı modül ve kaynak silme reddi çalıştı. Yalnız PUBLICATIONS açık bağımsız çalışma, capture erişim bağlantısı → yazar tercihi → prova → onay → hazır kararına ulaştı. İletişim kuyruğunun katılımcı erişim kaynağı yeni bağımsız yayın/ödül modüllerini de tanır.

Tarayıcıda editör bağımsız kaynak ve gerçek tam metin PDF yükledi; yazar üç tercihi ayrı kaydetti, özel PDF/provayı indirdi ve tam sürüme onay verdi; editör hazır kararı ve dergi kaydı ekledi. İndirilen dosyaların SHA-256 değerleri kaynağa eşleşti. Kaydedilmemiş tercih onayı engelledi. Yazar/editör ekranları 390 pikselde taşmadı.

Lint, TypeScript ve üretim derlemesi temiz; DB/Prisma farkı yok. **31 migration / 93 tablo**; uygulanmış migration sağlama toplamları eşleşir. Kaynak/istemci özel bilgi taraması temiz; standalone `.env` içermez. `npm run test:publications`: 20 birim + 37 HTTP. Gerçek e-posta gönderilmedi; yalnız yerel capture kullanıldı.

Kongre başına 500 yayın, kişisel listede 200 yayın; yayın başına 100 dosya sürümü; PDF en fazla 15 MB/200 sayfa. Ekranlar son 20 prova/onay/karar/dosya ve son 30 işlemi gösterir; önceki kayıtlar DB'de kalır. Bağımsız ekran tek yazarlı dış çalışma girişi sunar; bağlantı API'si en fazla 30 yazar destekler ve kabul edilmiş bildirilerin çok yazarlı kaynağını korur. Yazar onayı sorumlu yazarın beyanıdır; bütün ortak yazarların dış kimliğini doğrulayan veya hukuki elektronik imza veren sistem değildir. DOCX dizgi/dergi entegrasyonu bu paket kapsamında değildir.

Final kurtarma etiketi `../.recovery/P19-20261007-final`: temiz commit/bundle, özel ortam/capture/kanıtlar ve DB dump'ı. Web/worker kapalıyken 93 tablo ayrı geçici DB'ye tam restore edilir; tüm satır sayıları ve sıralı SHA-256 parmak izleri karşılaştırılır. Gerçek başarı manifest ve özel kapanış JSON'unda kayıtlıdır. Sıradaki P20 kitap/program PDF üretimi; kullanıcı talimatıyla P22 ve P06-E1'e kadar devam edilir.
