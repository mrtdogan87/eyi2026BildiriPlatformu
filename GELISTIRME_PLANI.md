# Bildiri Yönetim Sistemi — v2 Geliştirme Planı

> Durum: **P01 tamamlandı; P02 yerel doğrulamada** · Başlangıç / son güncelleme: 05.10.2026
> İlk gerçek kullanım: EYİ 2026 kongresi (`eyi-2026`) — sistem uçtan uca başarıyla çalıştı.
> Bu kopya uygulama takibidir. P01 sonuçları `docs/P01_KAPANIS.md` içinde. v2 ayrı `v2/` checkout'ta geliştirilir; mevcut canlı ve üniversite sitesi korunur. Ana checkout'taki planlama metni değiştirilmedi.

## 1. Hedef

Sistemi tek kongrelik bir araçtan, her yıl tekrar kullanılabilen bir **kongre platformuna** dönüştürmek:

- Kendi **ön yüz web sitemiz** ve onu yöneten **CMS admin paneli** (şu ana kadar okulun CMS'i kullanıldı).
- Son kongrede eksik kalan özelliklerin eklenmesi.
- Mevcut canlı uygulama ve EYİ 2026 web sitesi korunurken, v2'nin ayrı yerel ortamda geliştirilmesi ve yeni bir alt alan adında kullanılması.
- Yeni kongre ekiplerinin kendi sitelerini ve süreçlerini yönetebilmesi; EYİ 2026 sitesinin bütün kongre sayfalarının başlangıç şablonunda bulunması.

---

## 2. SWOT Analizi

### 💪 Güçlü yönler
- Uçtan uca akış gerçek kongrede çalıştı: bildiri gönderimi → kabul/ret → kayıt → dekont.
- Katılımcı tarafı TR/EN, otomatik e-postalar, bildiri durum geçmişi.
- Esnek ücret tarifesi altyapısı ve çoklu kongreye temel sağlayan `Congress` ilişkileri ile `/[kongre-slug]/...` rotaları; kongre bazlı kullanıcı/yetki ayrımı henüz tamamlanmış değil.
- Önceki plan notuna göre kendi sunucumuz (Coolify / Hetzner) ve günlük veritabanı yedeği var. Gerçek dağıtım ve yedek durumu P01'de doğrulanacak; `DEPLOYMENT.md` hâlen Neon/Vercel anlatıyor.

### ⚠️ Zayıf yönler
- **Hakem modülü yok** — atama, puanlama, yorum yok; karar tek admin elinde.
- **Tek ortak admin şifresi** — kullanıcı/rol yok, "kim neyi değiştirdi" kaydı yok.
- **Ödeme onayı sistem dışında (Excel)** — "Davetli", "Ödenmeyecek" gibi statüler veritabanında yok.
- **Kongre kodda sabit** (`eyi-2026`, `src/lib/admin.ts`) — yeni kongre açmak kod değişikliği istiyor.
- **Dosyalar veritabanında saklanıyor** (`content Bytes`) — veritabanı ve yedekler hızla büyüyor.
- **Gönderim sonrası düzenleme yapılamıyor** — e-posta, dosya, yazar listesi değiştirilemiyor (bkz. Bölüm 4).
- **Ön yüz okul CMS'inde** — site ile sistem birbirinden kopuk.

### 🚀 Fırsatlar
- Kendi site + CMS ile başvuru ve içerik tek yerden yönetilir.
- Program/oturum planlama, katılım belgesi, bildiri kitabı otomasyonu.
- Her yıl ve başka kongreler/bölümler için tekrar kullanılabilir ürün.
- Banka ekstresi eşleştirmesinin sisteme alınması.

### 🔥 Tehditler
- Veriler artık **gerçek** — şema değişikliklerinde veri kaybı riski (daha önce yaşandı).
- **Beyan geçmişi** — gönderimde kişisel veri beyanı dahil onaylar kontrol ediliyor; hangi metin sürümünün ne zaman onaylandığı kalıcı olarak saklanmıyor.
- Excel ile veritabanı **iki ayrı doğru kaynağı** → tutarsızlık riski.
- Tek ve küçük sunucu — son gün yoğunluğunda kapasite riski.

---

## 3. Veritabanına Eklenmesi Önerilenler

| # | Başlık | İçerik |
|---|--------|--------|
| 1 | **Admin kullanıcıları ve roller** | Süper admin, sekreterya, hakem rolleri; işlem kaydı (audit log) |
| 2 | **Hakem sistemi** | Hakem, bildiri-hakem ataması, değerlendirme (puan, yorum, karar önerisi) |
| 3 | **Ödeme doğrulama** | Ödeme kaydı, statü (bekliyor / onaylandı / davetli / muaf), banka hareketi eşleştirme |
| 4 | **Kongre ayarları** | Tarihler, konu başlıkları, aşamalar (özet → tam metin → revizyon) veritabanından yönetilsin |
| 5 | **Program** | Oturum, salon, oturum başkanı, bildirinin hangi oturumda olduğu |
| 6 | **Belgeler** | Katılım / sunum belgesi, doğrulama kodu |
| 7 | **CMS içerikleri (TR/EN)** | Sayfalar, duyurular, kurullar, davetli konuşmacılar, önemli tarihler, sponsorlar |
| 8 | **KVKK** | Aydınlatma metni onayı / açık rıza kaydı (tarih, versiyon) |
| 9 | **Gönderim sonrası düzenleme** | Değişiklik kaydı + dosya versiyonlama (bkz. Bölüm 4) |

---

## 4. Gönderim Sonrası Admin Düzenlemesi

**Sorun:** Kullanıcı bildiriyi gönderdikten sonra admin olarak birçok alanı değiştiremiyorduk.

### 4.1 Admin neleri düzenleyebilmeli
- **Yazarlar:** e-posta, ad, kurum düzeltme; yazar ekleme / çıkarma / sıra değiştirme; sunucu yazarı değiştirme.
- **Dosya:** düzeltme istendikten sonra güncel versiyonu yükleme. Eski dosya silinmez, versiyon olarak arşivde kalır (v1, v2…).
- **İçerik:** başlık, özet, anahtar kelimeler.

### 4.2 "Kullanıcı beyanı" kuralı
Her değişiklikte admin şunları girmek **zorunda**:
- **Gerekçe / beyan** — örn. "Yazar 03.10.2026'da e-posta ile talep etti".
- **Kanıt (opsiyonel)** — talep e-postasının ekran görüntüsü / PDF'i.

Sistem otomatik olarak **kim, ne zaman, hangi alanı, eskiden → yeniye** kaydeder. Bildiri detayında **"Değişiklik geçmişi"** sekmesi bulunur.

### 4.3 Veritabanı değişiklikleri
- `SubmissionFile` → bildiri başına **çoklu versiyon** (versiyon no, güncel mi, yükleyen, tarih).
- Yeni `SubmissionChangeLog` tablosu: alan, eski değer, yeni değer, gerekçe, kanıt dosyası, admin, tarih.
- Opsiyonel yeni statü: **"Düzeltme istendi"** → kullanıcıya link gider, yeni versiyonu kendisi yükler, admin onaylar.

### 4.4 Dikkat edilecekler
- E-posta değişince yazarın **eski erişim linkleri iptal** edilmeli; varsa kayıt/ödeme tarafındaki e-posta da güncellenmeli.
- Kabulden sonra yazar listesi değişirse **kabul mektubu yeniden düzenlenmeli**. Kabul listesi Excel'i yalnızca ekleme ile güncellenir (sıra bozulmaz, yeni satır sona eklenir).
- Etkilenen yazarlara bilgilendirme e-postası gönderme seçeneği.

---

## 5. Ön Yüz Web Sitesi + CMS Admin Paneli

Referans: [EYİ 2026 kongre sitesi](https://eyi2026-iibf.mcbu.edu.tr/). Kongre menüleri ve alt sayfaları 05.10.2026'da web okuyucu ve tarayıcı üzerinden incelendi. Üniversiteye ait ortak üst/alt bağlantılar organizatöre göre değiştirilebilir alanlar olacak.

### 5.1 Her yeni kongrede hazır bulunacak sayfalar

| Bölüm | Başlangıç şablonundaki sayfalar |
|--------|-------------------------------|
| Tanıtım | Ana sayfa, Davet, kongre hakkında/teması (mevcut Ekonometri sayfasının karşılığı), slogan, afiş |
| Kurullar | Düzenleme Kurulu, Danışma Kurulu, Bilim Kurulu, Sekreterya |
| Bilimsel içerik | Konular, Davetli Konuşmacılar, Panel, Workshop |
| Program | Sempozyum Programı, çevrim içi oturumlar ve salon bağlantıları |
| Yazar ve yayın | Yazarlar için Bilgiler, TR/EN özet ve tam metin şablonları, kabul edilen bildiriler, Özet ve Tam Metin Kitabı, Yayın Olanakları ve Dergi Alternatifleri, Ödüller |
| Katılım ve ulaşım | Önemli Tarihler, Kongre Yeri, Konaklama–Transfer, Ücretler, Kayıt, Bildiri Gönderimi |
| Sosyal ve kurumsal | Gezi Programı, şehir tanıtımı, Sponsorluk, Galeri, İletişim/geri bildirim |
| Güncel içerik | Duyurular, Haberler, Etkinlikler ve arşivleri |

- Bütün sayfalar yönetim panelinde başlangıçta şablonlarıyla bulunur; organizatör doldurur, yayımlar veya gizler. Eksik gerçek bilgiler uydurulmaz.
- Yeni kongreye tema, menü ve içerik iskeleti aktarılır. Eski katılımcılar, ödemeler, tarihler, banka bilgileri, kurul üyeleri ve yayın kimlikleri kendiliğinden kopyalanmaz.
- EYİ 2026'nın tarihsel içeriğini örnek/arşiv olarak aktarmak ile yeni kongre oluşturmak ayrı işlemlerdir.

### 5.2 CMS davranışı

- Sayfa ekleme, çıkarma/arşivleme, menü ve alt menü düzenleme, sıralama, sayfa çoğaltma.
- Metin, görsel, kişi kartı, tablo, dosya, galeri, harita, takvim ve soru-cevap blokları.
- TR/EN karşılıkları, eksik çeviri uyarısı, taslak, önizleme, yayımlama, zamanlanmış yayın, sürüm geri alma.
- İç yönetim adı, halka görünen başlık, menü etiketi ve URL ayrı alanlar; adres değişince yönlendirme.
- Ortak medya/dosya kitaplığı; dosya türü/boyutu ve erişim kontrolü. Kişisel belgeler herkese açık medya alanına konulmaz.
- Ücret, tarih, program ve başvuru kuralları işlem ekranlarıyla aynı kayıtlardan gösterilir.
- Duyuru bir metin olabileceği gibi mevcut sayfaya veya dosyaya bağlantı da olabilir.
- Mobil görünüm, erişilebilir gezinme ve yayından önce eksik içerik/bozuk bağlantı kontrolü.

### 5.3 Dinamik içerik ve çıktı üretimi

- **Davet:** kongre/tema/tarih/yer/katılım biçimi/başkan bilgilerinden düzenlenebilir metin; organizatörün son kontrolüyle yayın.
- **Kurullar ve konuşmacılar:** tek kişi kaydı, çoklu kurul/görev ilişkisi; fotoğraf, kurum, konuşma ve program bağlantıları. Kamuya açık kurul üyeliği kullanıcı yetkisi veya otomatik hakem ataması değildir.
- **Afiş:** mevcut afişi yükleme ve seçilmiş şablondan üretme birlikte bulunur. Görsel ve metin katmanları ayrıdır; ilk sürümde bir ana tasarım ve sınırlı baskı/web/sosyal medya boyutları.
- **Program ve kitap:** onaylı veriden çıktılar; kullanılan veri/dosya ve şablon sürümünün kaydı. Değişiklikte yayımlanmış çıktıyı sessizce değiştirmek yerine yeni sürüm/yeniden üretim uyarısı.
- **Workshop:** kontenjan, kayıt, bekleme listesi ve katılım. **Ödül:** ölçütler, komisyon, çıkar çatışması beyanı, bilimsel/sunum puanları ve ağırlıklar.
- **Sosyal program:** gezi/gala katılımı, otel listeleri, transfer saatleri ve güzergâhlar; dış hizmet sağlayıcısında otomatik rezervasyon ilk kapsamda değildir.

Site incelemesinde alt kısımdaki `/Iletisim` ve etkinlik arşivi `/Arsiv/3/101` bulunamadı ekranına gitti; ana menüdeki `/GeriBildirim` açıldı. Galeri içerik bekliyor. Manisa tanıtım PDF'sinin bağlantısı doğrulandı, gövdesi görüntülenemedi. Bağlı PDF/DOTX dosyalarının tamamının içeriği bu incelemede doğrulanmadı; aktarım paketinde kontrol edilecek.

---

## 6. Ek Talepler ve Notlar

- Katılımcının tek paneli: bildiriler, revizyonlar, kayıt/ödeme, program, belgeler, mesajlar ve değişiklik talepleri.
- Sekreterya iş listesi: eksik belge, yanıtsız talep, kontrol bekleyen ödeme, programa yerleşmemiş kabul edilmiş bildiri.
- E-posta şablonları, kalıcı gönderim kuyruğu, başarısız gönderimi yeniden deneme ve sağlayıcıdan alınabildiği ölçüde teslimat/geri dönüş geçmişi. Mevcut SMTP/Resend geçişi yeniden kullanılabilir; sağlayıcının kabulü alıcının okuduğu anlamına gelmez.
- **Dekont alındı ile ödeme doğrulandı ayrılacak.** Mevcut `paidAt` dekont yüklemesini temsil edebiliyor; eski kayıtlar banka/Excel kanıtı olmadan otomatik onaylanmış ödeme sayılmayacak.
- Değerlendirme, kayıt, ödeme, sunum/katılım, programa yerleşme ve yayın durumu ayrı izlenecek.
- Özet ve tam metin için ayrı teslim/revizyon takvimleri, yayın tercihi, sürüme bağlı yazar prova onayı ve editör yayın kararı.
- Oturum başkanı yoklaması; katılımcı, sunucu, oturum başkanı ve diğer görevler için ayrı belge koşulları.
- Geri çekme/iptal, neden ve işlem geçmişi; geri alınabilir arşivleme. İptal kaydı banka iadesinin yapıldığı anlamına gelmez.
- E-posta incelemesinin dayanağı, 2026 EYİ yazışmalarından seçili örneklerdir: kayıt/ödeme teyidi, iade olmuş havale, tam metin alındı teyidi, özet düzeltmesi, yayın onayı, oturum başkanlığı belgesi ve yayın takvimi. Bu liste bütün posta kutusunun nicel analizi değildir.

---

## 7. Öncelik Sırası

1. Çalışan sürümü koruma ve bağımsız yerel ortam.
2. Kongre/kurum/yetki temeli, kendi site ve CMS.
3. Mevcut başvuru/kayıt akışlarının bağlanması; iletişim, düzenleme ve ödeme kontrolü.
4. Hakemlik, program, workshop, ödül, katılım ve belgeler.
5. Dinamik tanıtım çıktıları, yayın hazırlığı, kitap ve arşiv.
6. Uçtan uca pilot ve yeni alt alan adında v2 yayını.

Ayrıntılı paketler ve kabul ölçütleri Bölüm 11'de. Sıra bağımlılıklara göre korunur; bağımsız arayüz işleri mevcut paketi bozmayacak şekilde paralel yürütülebilir.

---

## 8. Açık Sorular

- **Netleşen:** mevcut canlı site ve uygulama korunacak; v2 yerelde geliştirilecek, ayrı alt alan adı kullanılacak. Test ve yeni canlı adreslerinin kesin adları henüz seçilmedi.
- **Netleşen:** mevcut web sayfalarının tamamı başlangıç şablonuna dahil; organizatör ek sayfa oluşturabilecek. Tam metin/yayın hazırlığı planın kapsamında.
- **Netleşecek:** kör hakemlik seçenekleri ve hangi kongrede hangi yöntemin varsayılan olacağı (P13).
- **Netleşecek:** ödeme doğrulamasında banka dosyasının biçimi ve Excel'in geçiş dönemindeki rolü (P12).
- **Netleşecek:** yeniden kullanılabilecek ayrı bir CMS kaynak kodu var mı? Verilen kongre adresi ön yüz referansıdır; CMS yönetim koduna erişildiği varsayılmıyor (P02/P06).
- **Netleşecek:** ilk pilot kongre, pilot ekip ve kesin alt alan adları; mevcut EYİ verisini v2'ye aktarma ihtiyacı (P01/P22).
- **Netleşecek:** belge tasarımları/imza yetkisi, yayın şablonu, otomatik dizginin destekleyeceği tam metin biçimleri (P16–P20).

---

## 9. Mevcut Sistemi Koruma ve Ortam Planı

| Ortam | Amaç | Ayrım |
|-------|------|-------|
| Mevcut canlı | EYİ 2026 uygulaması ve üniversite kongre sitesi çalışmaya devam eder | Mevcut adresler, veriler ve dağıtım korunur |
| Yerel v2 | Geliştirme ve ilk kontroller | Ayrı çalışma kopyası/dal, yerel veritabanı, test verisi, test e-postası |
| v2 deneme | Ekipçe tarayıcıdan önizleme ve pilot prova | Ayrı uygulama, DB, dosya alanı, oturum anahtarları; erişimi sınırlı test alt alan adı |
| Yeni canlı v2 | Kabul edilmiş sürümün gerçek kullanımı | Seçilecek yeni alt alan adı; eski sistemin üstüne yazılmadan bağımsız dağıtım |

Alt alan adı tek başına ortamları ayırmaz. Veritabanı kullanıcıları/bağlantıları, dosya alanları, arka plan işleri, e-posta çıkışı ve oturum çerezleri de ayrı olmalı. Test ortamı kimlik doğrulamayla korunmalı; arama motoruna kapatma tek başına erişim kontrolü değildir.

### Geliştirmeden önce P01/P02'de yapılacaklar

1. Gerçekte yayında olan sürüm/commit, barındırma ve yedek konumunu belirle; yerel klasörün canlıyla aynı olduğunu varsayma.
2. Kod, bağımlılık kilidi, izlenmeyen dosyalar (bu plan dahil), veritabanı ve yüklenen dosyalar için tarihli geri dönüş noktası oluştur. Sırlar ayrıca güvenli saklanır, Git'e yazılmaz.
3. Yedeği ayrı veritabanına geri yükle; kayıt sayıları ve dosya örneklerini doğrula. Günlük yedek iddiasını fiilen kontrol et.
4. Yeni geliştirme çalışma kopyasını ayır. Canlı veritabanı bağlantısı yerel `.env` dosyasından körlemesine kopyalanmaz; sentetik veri önceliklidir, gereken veri kopyası anonimleştirilir.
5. Yerelde gerçek alıcılara e-posta çıkışını engelle; test alıcıları veya yerel e-posta yakalayıcı kullan.
6. Şema değişikliklerini yalnız deneme DB'sinde prova et. Mevcut `vercel-build` betiğinin migration çalıştırdığı dikkate alınmalı; build/şema geçişi/dağıtım sırası ortam bazında açık olmalı.

Yeni canlıya geçişte eski sistemi kapatmak veya verisini taşımak zorunlu değildir. Yeni kongre v2'de başlayabilir, EYİ mevcut sistemde kalabilir. Eski veriler aktarılacaksa sonradan oluşan kayıtların nasıl taşınacağı ayrıca kararlaştırılır. Yeni kayıt alınmış DB'nin üzerine eski yedeği geri yüklemek bir geri dönüş yöntemi olarak kabul edilmez; veri kaybını önleyen bir plan gerekir.

---

## 10. Paketlerle Çalışma Yöntemi

Dental projesindeki kapsamı belirli, doğrulanabilir sonuç ve kısa kapanış raporu yaklaşımı örnek alınır.

- Bir paket ortalama **1–3 geliştirici iş günü** büyüklüğünde tutulur; P01 yaklaşık yarım–bir gündür. Beklenenden büyüyen iş, kapsamı açık alt parçalara ayrılır.
- Her paket için amaç, bağımlılık, yapılacak iş, tamamlanma ölçütü ve durum bulunur.
- Kapanışta çalışan ekran/akış, ilgili kontroller, değişen dosyalar, açık sınırlar ve geri dönüş noktası kaydedilir.
- Kodun yazılması tek başına tamamlanma değildir. İlgili kabul senaryosu çalışmalı; arayüz işi tarayıcıda görülmeli.
- Yetki, ödeme, dosya sürümleri ve veri geçişi gibi riskli akışlar anlamlı testlerle doğrulanır. Değişmeyen kontroller gerekçesiz tekrar edilmez.
- Paket sonuçları kısa biçimde kullanıcıya gösterilir. Plan dosyasının hazırlanması uygulama paketlerinin başladığı anlamına gelmez.
- Durumlar: **Planlandı → Devam ediyor → Kontrol ediliyor → Tamamlandı**; dış bilgi bekleyen paket için somut engel ayrıca yazılır.

---

## 11. Geliştirme Paketleri

P01 **Tamamlandı**, P02 **Kontrol ediliyor**, P03–P22 **Planlandı**. Uzak v2 deneme yayını seçilecek adresi bekliyor. Bağımlılık sütununda belirtilen paketlerin kendi ön koşulları da geçerlidir.

| Paket | Kapsam / çıktı | Ön koşul | İş günü |
|-------|----------------|----------|---------|
| P01 | Çalışan sürümün korunması, dağıtım envanteri ve geri yükleme provası | — | 0,5–1 |
| P02 | Bağımsız yerel v2, test verisi/e-postası ve deneme ortamı yapılandırması | P01 | 1–2 |
| P03 | Kurum/kongre ayrımı, kişisel hesaplar, üyelikler ve temel roller | P02 | 2–3 |
| P04 | Kongre ayarları, oluşturma sihirbazı ve güvenli yıl çoğaltma | P03 | 1–2 |
| P05 | Ortak ön yüz, ilk tema, ana sayfa ve mobil görünüm | P03 | 1–2 |
| P06 | CMS editörü, medya kitaplığı, TR/EN, taslak/önizleme ve sürümler | P03, P05 | 2–3 |
| P07 | Eksiksiz başlangıç sayfaları/menüler ve EYİ referans içeriğinin kontrollü aktarımı | P04, P06 | 2–3 |
| P08 | Ortak kişi/kurul/konuşmacı ve organizasyon kayıtlarıyla dinamik sayfalar | P07 | 2–3 |
| P09 | E-posta şablonları, gönderim kuyruğu, yeniden deneme ve geçmiş | P03, P04 | 1–2 |
| P10 | Mevcut başvuru/kayıt akışları, katılımcı paneli ve sekreterya iş listesi | P04, P07, P09 | 2–3 |
| P11 | Revizyon, dosya sürümleri ve gerekçeli admin düzeltmeleri | P10 | 2–3 |
| P12 | Ödeme kontrolü, davetli/muaf durumları ve banka dosyası eşleştirme | P10 | 2–3 |
| P13 | Hakem atama, değerlendirme turları, revizyon ve karar | P09, P11 | 2–3 |
| P14 | Oturum/program, salon, çakışma kontrolü ve çevrim içi bağlantılar | P08, P10, P13 | 2–3 |
| P15 | Workshop ve sosyal etkinlik katılımı, kontenjan ve bekleme listesi | P10, P14 | 1–2 |
| P16 | Oturum yoklaması ve göreve göre doğrulanabilir belgeler | P12, P14 | 1–2 |
| P17 | Ödül başvurusu, komisyon, ölçütler ve puanlama | P11, P13, P14, P16 | 1–2 |
| P18 | Düzenlenebilir davet ve şablonlu afiş/tanıtım çıktıları | P08 | 1–2 |
| P19 | Tam metin teslimi, yayın tercihi, prova ve yazar onayı | P11, P13 | 2–3 |
| P20 | Program/özet kitabı PDF üretimi ve onaylı tam metinlerden kitap derleme | P14, P19 | 2–3 |
| P21 | Kongre kapanışı, kalıcı yayın arşivi ve veri/dosya dışa aktarma | P16, P20 | 1–2 |
| P22 | Uçtan uca pilot, yük/erişim kontrolleri, geçiş provası ve yeni v2 yayını | P01–P21 | 2–3 |

### Paketlerin tamamlanma ölçütleri

**P01 — Çalışan sürümü koruma**

- Kod ve veri/dosya yedekleri ayrı kapsamlarla tanımlanmış; hangi canlı sürüme ait oldukları kayıtlı.
- Ayrı DB'de geri yükleme ve dosya örnekleri doğrulanmış; mevcut canlı dağıtım değiştirilmemiş.

**P02 — Yerel geliştirme**

- Uygulama canlı bağlantısı olmadan yerelde açılıyor; deneme verisiyle başvuru/kayıt denenebiliyor.
- Canlı e-posta/DB/dosya alanlarına yazamadığı doğrulanmış; yerel başlatma ve ortam ayarları belgelenmiş.
- Deneme alt alan adı için yapılandırma hazır. Ad ve erişim bilgisi hazırsa sınırlı test yayını yapılabilir; değilse yerel çalışma devam eder, uzak yayın tamamlandı sayılmaz.

**P03 — Hesaplar ve kongre ayrımı**

- İki örnek kongre ve farklı rollerle ekran/API/dosya erişimi sınanmış; başka kongrenin kaydına erişim reddediliyor.
- Platform yöneticisi, organizatör, sekreterya, içerik editörü, hakem, oturum başkanı ve katılımcı için temel yetkiler tanımlı; hassas değişikliklerin işlem kaydı var.

**P04 — Yeni kongre oluşturma**

- Kod değiştirmeden ad, tarih, dil, tema, ücret ve süreç ayarları girilebiliyor.
- Önceki yılın şablonu kopyalanıyor; eski işlemler ve tarih/banka/kişi bilgileri kontrolsüz aktarılmıyor. Kişi kopyalama ayrıca seçilip gözden geçiriliyor.

**P05 — Ön yüz**

- EYİ görsel yaklaşımından türetilen bir tema; logo, renk, ana görseller ve çağrı düğmeleri yönetilebilir.
- Ana sayfa ve örnek içerikler masaüstü/mobilde okunur; klavyeyle temel gezinme çalışıyor.

**P06 — CMS**

- Bloklarla sayfa oluşturma, TR/EN eşleştirme, önizleme, yayınlama ve eski sürüme dönme tamamlanabiliyor.
- Medya yükleme ve kongreye göre erişim çalışıyor; iç düzenleme adları halka görünen başlığa sızmıyor.
- Süre, kendi uygulamamızda çalışan hazır editör bileşenleri ve başlangıç sayfalarını karşılayan belirli bir blok seti varsayar; sıfırdan genel amaçlı görsel editör geliştirme içermez.

**P07 — Tüm sayfalar ve aktarım**

- Bölüm 5.1'deki bütün sayfalar şablonda var; kullanıcı yeni sayfa/alt menü ekleyip sıralayabiliyor.
- Referans metinler, görseller ve gerekli ekler kaynaklarıyla karşılaştırılmış; eksik/erişilemeyen dosyalar kayıtlı. EYİ'nin canlı sitesi değiştirilmemiş.
- Üniversiteye/Drive'a bağlı gerekli dosyaların kendi dosya alanımıza kontrollü aktarımı planlanıp doğrulanmış; gerçek yeni kongreye eski vaat/tarih taşınmıyor.

**P08 — Dinamik içerikler**

- Kişi/kurul/görev/konuşmacı/panel kayıtları bir kez girilip ilgili sayfalarda kullanılıyor.
- Önemli tarih, ücret bilgisi, mekân, otel, transfer, gezi, sponsor, duyuru/haber ve galeri blokları ortak kayıtlara bağlı. Geri bildirim formu talep kaydı oluşturuyor; bu kayıt P10'da sekreterya iş listesinde gösterilecek.
- Fiyat hesaplama kuralları mevcut ücret altyapısıyla tutarlı; ticari rezervasyon entegrasyonu yok.

**P09 — İletişim**

- Gönderim durumu ve hatası kalıcı; kesinti sonrası deneme aynı bildirimi gereksiz yere çoğaltmıyor.
- TR/EN şablon önizlemesi ve test alıcısıyla örnek tamamlanmış; gerçek gönderim ayrı ortam ayarına bağlı.

**P10 — Katılımcı ve sekreterya**

- Başvuru/kayıt akışları kongre bazlı çalışıyor; katılımcı kendi bildiri/ödeme/program/görev durumunu görüyor.
- Başvuru kuralları ve metin sürümlü beyanlar kaydediliyor; geri çekme/iptal talebi ve eksik işlem listesi var.
- Henüz geliştirilmemiş modül tamamlanmış gibi gösterilmiyor; panel sonraki paketlere genişletilebilir.

**P11 — Düzeltmeler**

- Bölüm 4'teki gerekçe, kanıt, yazar/e-posta değişikliği, eski erişim iptali ve dosya sürümü kuralları örnek üzerinden doğrulanmış.
- Önceki metin/dosya kaybolmuyor; değişikliğe bağlı belge/çıktı güncelleme ihtiyacı izleniyor.

**P12 — Ödeme doğrulama**

- Dekont alındı/kontrol bekliyor/doğrulandı/eksik-fazla ödeme/davetli-muaf/iade durumları ayrı.
- İlk sürümde elle doğrulama ve bir anlaşılmış banka CSV/XLSX biçiminden eşleştirme önerisi; belirsiz eşleşme otomatik onaylanmıyor.
- Eski `paidAt` kayıtlarının anlamı korunuyor, kanıtsız doğrulama üretilmiyor. Doğrudan banka API'si, kart tahsilatı veya otomatik para iadesi bu paket değildir.

**P13 — Hakemlik**

- Atama daveti → kabul/ret → değerlendirme → revizyon → yeni tur → editör kararı çalışıyor.
- Körlük seçeneği, son tarih, yetkili dosya erişimi, çıkar çatışması beyanı ve yazara/hakeme farklı görünürlük kontrol edilmiş.
- Kör değerlendirmede hakeme verilecek ayrı dosya/sürüm kontrol ediliyor; içerik, dosya adı ve belge özellikleri kimlik barındırabilir. Ekrandaki yazar adını gizlemek dosyanın anonim olduğunu garanti etmez; yazar/editör kontrolü akışta bulunur.

**P14 — Program**

- Bildiri, sunucu, salon, oturum başkanı ve teknik destek bağlanabiliyor; çakışma/yerleşmemiş bildiri uyarıları var.
- Program yayın sürümü ve çevrim içi bağlantıların açılma/kapanma zamanı ayrı; genel program erişimi bağlantı kapatılınca kaybolmuyor.

**P15 — Workshop ve sosyal katılım**

- Kontenjan doluluğu, bekleme listesi, iptal ve katılımcı listesi örneği çalışıyor.
- Gezi/gala tercihleri ve program ilişkisi panelde görülebiliyor; mevcut ücret kuralları korunuyor.

**P16 — Katılım ve belgeler**

- Oturum başkanı yoklama verebiliyor; sunucu, ortak yazar, dinleyici ve görevli belge koşulları kongre ayarına göre uygulanıyor.
- İlk belge şablonları, doğrulama kodu/QR, yeniden üretim ve iptal/sürüm geçmişi örnek üzerinden kontrol edilmiş.

**P17 — Ödüller**

- Kategori, jüri, ölçüt ve bilimsel/sunum ağırlıkları ayarlanabiliyor; örnek sıralama hesaplaması doğrulanmış.
- Eksik değerlendirme veya çatışmalı jüri uyarısı var; nihai ödül kararı yetkili kurulca veriliyor. Sunum koşulu P16'daki yoklamayla kontrol ediliyor.

**P18 — Davet ve afiş**

- Kongre bilgileriyle düzenlenebilir davet metni; hazırlanmış görsel yükleme veya bir afiş şablonundan üretim var.
- Metin/görsel katmanları ayrı; baskı PDF, web ve sınırlı sosyal medya boyutları önizleme sonrası üretilebiliyor. Tam bir grafik tasarım editörü hedeflenmiyor.

**P19 — Yayına hazırlık**

- Tam metin için bağımsız teslim/revizyon süresi; yayın tercihi ve dosya sürümü mevcut bildiriye bağlı.
- Prova → belirli sürüme yazar onayı → editörün yayına hazır kararı çalışıyor. Dergiye yönlendirme kaydı dergi kabulü anlamına gelmiyor.

**P20 — Kitap ve PDF**

- Yapılandırılmış özetlerden kapak/içindekiler/sayfa numarası/yazar dizini içeren örnek kitap; aynı program verisinden PDF üretimi.
- Tam metin kitabı ilk sürümde onaylı, yayın için hazırlanmış PDF'lerden veya açıkça desteklenen standart şablondan derleniyor; çıktı sürümü ve kaynak dosyalar izleniyor.
- Rastgele biçimlendirilmiş bütün DOCX dosyalarının tablo/denklem/şekilleriyle kusursuz otomatik dizgisi bu süreye dahil değil; örnek dosyalarla ayrıca kapsamlandırılacak.

**P21 — Arşiv ve taşınabilirlik**

- Kongre kapanınca yayın/kitap/program bağlantıları kalıcı; sonradan düzeltmeler sürümlü.
- İçerik, metadata ve yetkiye uygun dosyalar dışa aktarılabiliyor; saklama/arşivleme ayarları tanımlı. DOI/ISBN alanlarını kaydetmek, dış kurumdan numara almak değildir.

**P22 — Pilot ve yeni yayın**

- İki kongreli örnekte başvuru → değerlendirme → kayıt/ödeme → program → katılım → belge → yayın tamamlanmış; yetki/dosya kontrolleri ve hedef yüke uygun deneme yapılmış.
- Yeni alt alan adı, TLS, yedek, hata takibi, e-posta ve dağıtım/şema geçişi doğrulanmış; işletim belgesi gerçek ortamla uyumlu.
- Eski canlı korunmuş; yeni kayıtlar için veri kaybettirmeyen geri dönüş yöntemi prova edilmiş. Gerçek yayına açma ayrı bir dağıtım adımı olarak sonuçlarıyla gösterilir.

---

## 12. Süre Tahmini ve Ara Teslimler

Bu süreler **bir geliştirici iş günü yaklaşık 6–8 saat odaklı çalışma**, mevcut başvuru/kayıt/ücret altyapısının yeniden kullanılması ve karar/içerik dönüşlerinin gecikmemesi varsayımıyla yapılan ilk planlama tahminidir. Kesintisiz otomatik çalışma veya belirli tarihte teslim sözü değildir. CMS kaynak kodunun yeniden kullanılabildiği henüz doğrulanmadığı için tahmin buna dayanmaz.

CMS için kendi ortamımızda çalıştırılan hazır editör bileşenleri ve belirlenmiş başlangıç blokları kullanılması öngörülür. Genel amaçlı bir görsel editörü sıfırdan geliştirmek ayrı kapsamdır.

| Ara teslim | İçerik | Başlangıçtan itibaren yaklaşık iş günü |
|------------|--------|---------------------------------------|
| Kendi site + CMS'nin kapsamlı ilk gösterimi | P01–P08; hazır sayfalar, ilk tema, menü/içerik yönetimi ve dinamik kayıtlar | 12–20 |
| Kontrollü kullanılabilir pilot | P01–P12; mevcut başvuru/kayıt, panel, düzeltmeler, ödeme kontrolü ve iletişim; ilgili uçtan uca kontroller | 20–35 |
| Planlanan tam v2 | P01–P22; hakemlik, program, workshop/ödül, belgeler, tanıtım, yayın/kitap ve arşiv | 40–65 |

- Paket tablolarının temel toplamı **33,5–55 iş günü**; tam v2 için entegrasyon, düzeltme ve belirsizlik payıyla **40–65 iş günü** ayrılır.
- Haftada beş gün çalışmayla tam v2 yaklaşık **8–13 hafta**; ara teslimler beklenmeden gösterilir. Süreler kümülatiftir, birbirine eklenmez.
- Pilot bütün hakemlik/kitap özelliklerini içermez; tamamlanan kapsam ve eksikler kullanıcıya açık gösterilir. Uzak pilotta P22'nin ilgili ortam/erişim/geri dönüş kontrolleri erkenden uygulanır, tüm v2 hazır sayılmaz.
- İlk iki paketten sonra mevcut kodun gerçek yeniden kullanım oranı, barındırma ve veri geçişi durumuna göre tahmin güncellenir.
- İleri DOCX dizgisi, çok sayıda özgün tema, banka/kart entegrasyonu, dış kurumda DOI/ISBN işlemleri veya ek bir dergi platformu bu tahmine ek kapsamdır.

---

## 13. Referanslar ve Planın Dayanağı

- [EYİ 2026 sitesi](https://eyi2026-iibf.mcbu.edu.tr/) ve 05.10.2026 tarihli ana/alt menü incelemesi.
- [Davet](https://eyi2026-iibf.mcbu.edu.tr/Sayfa/Davet), [Workshop](https://eyi2026-iibf.mcbu.edu.tr/Sayfa/WorkshopVdort), [Ödüller](https://eyi2026-iibf.mcbu.edu.tr/Sayfa/OdullerViki), [Afiş](https://eyi2026-iibf.mcbu.edu.tr/Haber/eyi-2026-afis), [Kongre Kitapları](https://eyi2026-iibf.mcbu.edu.tr/Sayfa/KongreKitaplar).
- Eylül–Ekim 2026 EYİ e-postalarındaki seçili operasyon örnekleri; kişisel yazışma gövdeleri bu plana kopyalanmadı.
- [PKP OJS](https://pkp.sfu.ca/software/ojs/) ve [resmî üretim akışı](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/production.md): aşamalı değerlendirme/yayına hazırlık örneği. OJS'nin standart kurulumu her Word dosyasını otomatik dizgiyle PDF'ye dönüştürüyor varsayımı yapılmıyor.
- Dental projesinin “Altyapı kurulumu” ve “Hedefini Netleştir” sohbetlerinde görülen sınırlı kapsam, sürüm koruma, kabul sonucu ve paket kapanışı yaklaşımı.
- Yerel kaynak incelemesi: `prisma/schema.prisma`, `src/lib/admin.ts`, `src/lib/email.ts`, gönderim/kayıt API'leri, `package.json`, `DEPLOYMENT.md`.
