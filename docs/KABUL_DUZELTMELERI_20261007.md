# Yerel kabul düzeltmeleri ve Beyin son kontrolleri

Bu çalışma, `1910e2d` sonrasındaki yerel kabul düzeltmesidir. Paketler atlanmamıştır: P16A `87b7244`, P16B `5440d3d`, P17 `ef54664`, P18 `0ac05ec`, P19 `ac506a2` kesintisiz parent zincirindedir. Denetim, paket kapanış beyanlarının tek başına yeterli olmadığını ve aşağıdaki üç plan açığını göstermiştir.

## Düzeltilen davranışlar

- **P16A / plan 15.1:** Kongreye özel belge türü oluşturulur; temel görev açıkça seçilir. Tür, manuel alıcıda, CSV/XLSX içe aktarımında, kongre uygunluğunda, PDF'de ve doğrulamada aynı kimlikle kullanılır. Tür adı ve temel görev değişmez; yeni amaç için yeni tür açılır. Önceki belge numaraları, alıcılar, PDF sürümleri ve standart türler korunur. Türün adı şablon adından bağımsızdır.
- **P16B / plan 14.3:** `ATTENDANCE` ayrı modül seçimidir. Yoklama kapalıyken bilimsel program açık kalır; yoklama API'si ve ekranı kapanır. Yoklama şartı olan belge/ödül uygunluğu kapalı modülde eski olumlu kaydı yeni kanıt saymaz. Oturum bağlantısı gerektiği için program bağımlılığı açıkça gösterilir; bağımsız bir oturum editörü eklenmemiştir.
- **P18 / plan 5.3:** Kongre yapılandırmasındaki TR/EN bilimsel tema ve katılım biçimi davet alanlarına bağlanır. Başkan, ortak içerikte yayımlanmış kurul/görev–kişi ilişkisinden açıkça seçilir. `{theme}`, `{participationMode}`, `{chair}` metne eklenebilir. Elle yazılmış davet/imza değiştirilmez. Yayımlanan kaynak değişikliği eski önizleme/çıktıyı güncelliğini yitirmiş olarak işaretler; taslak değişikliği yayına sızmaz. Eksik İngilizce kaynak Türkçe ile doldurulmaz.

## Kabul ölçütü → uygulama → kontrol

| Plan ölçütü | Gerçek uygulama | İşlevi sınayan test kaynağı |
|---|---|---|
| P16A PDF arka planı, konum/yazı/hizalama/taşma ve tekli/toplu PDF | `modules/certificates/pdf.mjs`, `integrations/congress/certificates.ts` | `certificates.test.mjs`, `certificates-check.mjs`: gerçek PDF, boyut/karakter, toplu üretim ve checksum |
| P16A Excel/CSV eşleme ve hatalı satır özeti | `modules/certificates/import.mjs` | `certificates-check.mjs`, `certificates-offline-check.mjs`: eşleme, tekrar kimliği, e-postasız alıcı |
| P16A organizatörün ek belge türü | `modules/certificates/types.mjs`, `CertificateType`, yönetim ekranı | `certificate-types.test.mjs`, `certificates-check.mjs`: kongre sınırı, sahte tür, özel tür CSV/PDF/iptal/geçmiş |
| P16A sürüm, indirme, teslim/adres düzeltmesi | `integrations/congress/certificates.ts`, iletişim kuyruğu | `certificates-check.mjs`: aynı numara, eski dosya, teslim hatası ve düzeltme |
| P16B başkanın kendi oturumunda yoklama vermesi | `integrations/congress/attendance.ts` | `attendance-check.mjs`: görev kapsamı, kendini onaylayamama, kaynak sürümü |
| P16B altı temel görev ve özel türün belge koşulları | `modules/certificates/eligibility.mjs` | `attendance-check.mjs`: ödeme/yoklama, kaynak düzeltme, aktarım, eski/yeni belge |
| P16B yoklamayı ayrı seçme | modül kataloğu, attendance gate, program/ödül bağlantıları | `attendance.test.mjs`, `attendance-check.mjs`, `program-check.mjs`, `awards-check.mjs`: kapatma/yeniden açma ve program yayınının sürmesi |
| P17 kategori/jüri/ölçüt/ağırlıklı sıralama | `modules/awards/core.ts`, ödül entegrasyonları | `awards.test.mjs`, `awards-check.mjs`: 70/30 ağırlık, eşitlik, çatışma ve eksik değerlendirme |
| P17 yetkili kurul kararı ve sunum koşulu | `integrations/congress/awards.ts`, `award-source.ts` | `awards-check.mjs`: güncel kurul kararı, yoklama değişimi/kapalı modül |
| P18 düzenlenebilir davet ve kaynak bilgileri | kongre ayarları, `modules/promotion/core.ts`, promotion entegrasyonu | `promotion.test.mjs`, `promotion-source-check.mjs`: gerçek kaynak, iki dil, manuel metni koruma, eski preview reddi |
| P18 görsel/şablon, ayrı katmanlar, PDF/web/sosyal boyutları | `modules/promotion/render.mjs`, tanıtım ekranı | `promotion-check.mjs`: gerçek PDF/PNG boyutları, yüklenen görsel, önizleme ve sürüm |
| P19 bağımsız teslim/revizyon ve dosya sürümü | `integrations/congress/publications.ts` | `publications-check.mjs`: farklı ilk teslim/revizyon tarihleri, gerçek PDF, yetkili erişim |
| P19 belirli prova → yazar onayı → editör kararı | `publication-source.ts`, publication entegrasyonu | `publications-check.mjs`: tam proof kimliği/hash, eşzamanlı istek, kaynak değişiminde onay düşmesi |
| P19 ödül dosyasından ayrı üç yayın tercihi ve geçmiş | publication preferences/proof snapshot | `publications.test.mjs`, `publications-check.mjs`: varsayılan izin yok, eski tercihe dönüş onayı canlandırmaz, dergi isteği kabul sayılmaz |

Test dosyaları `scripts/` altındadır. HTTP kontrolleri yerel, sentetik kayıt oluşturur; gerçek e-posta/ödeme/uzak yayın işlemi yapmaz.

## Kullanıcı testi

- **PDF sertifikalar ve alıcılar** → `/admin/belgeler` → **Özel belge türleri**.
- **Belge kuralları ve kongre uygunluğu** → `/admin/belgeler/uygunluk`: özel tür için ödeme/yoklama koşullarını ayrıca etkinleştirin.
- **Modüller** → `/admin/moduller`: **Oturum yoklaması** bilimsel programdan ayrı seçilir; yoklama ekranı `/admin/yoklama`.
- **Kongre yapılandırması** → `/admin/kongre-ayarlari`: bilimsel tema ve katılım biçimi. **Davet ve afiş çıktıları** → `/admin/tanitim`: kaynak alanlarını metne ekleme ve başkan ilişkisini seçme.
- P17 yönetimi `/admin/oduller`; P19 yönetimi `/admin/yayinlar`. Kişisel başvuru/onaylar katılımcı panelindedir.

Seçili kongre, rol, modül durumu ve kongrenin kapanmış olması görünürlüğü belirler. Yönetim kartının görünmemesi tek başına paket yokluğu anlamına gelmez.

## Veri geçişi ve sınırlar

İki ek migration: enum anahtarı ayrı adımda eklenir; mevcut kongrelerde önceki PROGRAM durumu ATTENDANCE başlangıç durumu olarak korunur. Kapalı kongrenin yeniden açılma ayarı da korunur. `CertificateType` yeni tablodur; eski alıcı/belge verisi dönüştürülmez. Kongre başına en fazla 100 özel tür vardır.

Gerçek kurum sertifika tasarımı/imza yetkisi, uzak ortam, TLS ve gerçek e-posta teslimi bu düzeltmede seçilmez veya açılmaz. Başkan bağlantısı için ortak içerikte yayımlanmış kişi ve kurul/görev ilişkisi gerekir; otomatik kimlik veya başkan tahmini yapılmaz.

## Beyin listesindeki yerel ek kapsam

**Plan 5.2 / zamanlanmış CMS yayını:** Kaydedilmiş sayfa sürümü ve kaynak özeti için tek seferlik yayın zamanı seçilir. İstanbul (UTC+03:00) saati açıkça gösterilir. Yeniden zamanlama ve iptal ayrı gerekçe/onayla geçmişte tutulur. Sonradan kaydedilen taslak, manuel yayın/geri alma, arşiv veya adres değişikliği önceki işi durdurur; değişen içeriğe eski onay taşınmaz.

Yerel işçi zamanı gelince yayınlayan kişinin güncel yetkisini, kongrenin ve CMS'nin açık olmasını, aynı kaydedilmiş sürümü, çeviri/medya/bağlantı koşullarını yeniden doğrular. Birden fazla işçi aynı işi tek transaction ile bir kez yayımlar. Uygulama kapalıyken iş DB'de bekler; açılınca zamanı geçmiş işler aynı kontrollerden geçer. Uzak zamanlayıcı kurulmadı.

**Bağımlılıklar:** Güncel tarama, erişilebilirlik ve güvenli sürüm düzeltmeleri [güvenlik kaydında](BAGIMLILIK_GUVENLIK_20261007.md). Hiç açık kalmadığı veya gerçek SMTP teslimatı doğrulandığı anlamına gelmez.

**Kullanıcı testi sırası:** Kongre/modüller/CMS/TR–EN → başvuru/hakemlik/kayıt/ödeme/program → yoklama/belge/ödül/davet/afiş → tam metin/onay/kitap/arşiv. Kullanıcının kullanım kolaylığı değerlendirmesi otomatik kabulün yerine geçmez.

## Doğrulama kaydı

7 Ekim 2026 tarihli son kodda `npm run lint`, bağımsız TypeScript ve üretim build geçti. Tam regresyon: **401 birim + 916 HTTP = 1.317 otomatik kontrol**, ayrıca **157 preview kontrolü**. CMS zamanlama HTTP paketi 27 kontrol içerir; yetki iptaliyle eşzamanlı yayın, iki işçi, tekrar başlatma, iptal/yeniden zamanlama, eski sürüm, kapalı modül/kongre, eksik dil ve bağlantı/medya engelleri sınanır.

**24 gerçek tarayıcı kabul kontrolü**: özel tür oluşturma/alıcı/PDF/geçmiş/doğrulama; yoklama kapatma/erişim reddi/programın sürmesi/yeniden açma; TR–EN davet kaynakları ve manuel metin; CMS kaydetme/zamanlama/iptal/yeniden zamanlama/kaynak değişikliğinde engel/yayın öncesi 404 ve zamanı gelince doğru kaynak sürümü. Davet formunda 390px yatay taşma yok; indirilmiş sertifika ve davet PDF'lerinin metni ve görünümü kontrol edildi. Tarayıcı konsolunda uygulama hatası yok. CMS kabulünde onaylanan v3, 08:18 UTC için zamanlandı ve yerel işçiyle 08:18:09 UTC'de yayın v4 olarak açıldı; sonraki işçi taraması 0 iş üretti.

Yerel yük denemesi **240 istek / 8 eşzamanlı bağlantı / 0 hata / p95 50 ms**. Üretim kapasitesi sonucu değildir. Ön kontrol **36 migration / 99 tablo**, SQL checksum/şema uyumu, loopback/capture ve gizli değer taramasını doğruladı. Tarihsel kaynakla salt kod geri dönüşü desteklenmiş sayılmaz.

Migration provasında belge/yoklama geçişi 95 değişmemesi gereken tabloyu korudu; yalnız planlanan modül/arşiv başlangıç alanları değişti. Sonraki CMS migration'ı geri yüklenmiş kopyada önceki **98 tablonun tamamını** birebir korudu. Nihai kaynak ve tam DB kontrol noktası `../.recovery/P22A-20261007-final` adıyla alınır; bu sürüme ait `manifest.json` ve `p22-preflight-result.json` içindeki `recoveryReady:true`, nihai tam geri yükleme/onay kanıtıdır. Kontrol noktası sonrasında yeni kullanıcı yazmaları olursa tekrar alınmalıdır.

Kanıtlar özel `.local` dizininde: `p22-regression-result.json`, `cms-schedule-check-result.json`, `p22-load-result.json`, `p22-recovery-check-result.json`, `p22a-acceptance-browser-result.json`; son lint/types/build logları `acceptance-final-*.log` adlarını taşır. Görseller `p22a-acceptance-*.png`; öncesi migration raporları `p22a-migration-rehearsal.json` ve `p22a-scheduler-migration-rehearsal.json`. Gerçek kullanıcı bilgileri ve parolalar raporlara eklenmemiştir.

Bağımsız kod incelemesindeki CMS yetki iptali ve deadlock bulguları düzeltildi; son incelemede açık kabul engeli yok. Güvenlik taramasında kalan **7 üretim ağacı / 12 tüm ağaç** bulgusu ve erişim sınırları ayrı güvenlik kaydında açıklanmıştır. Gerçek kurum şablonları, domain/TLS, gerçek sağlayıcı e-posta teslimatı ve uzak üretim kapasitesi bu yerel kapanışın dışında kalır. Kullanıcının ekran kullanım kolaylığı kabulü ayrıca yapılır.
