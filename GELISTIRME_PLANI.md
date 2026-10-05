# Bildiri Yönetim Sistemi — v2 Geliştirme Planı

> Durum: **P01, P02 yerel kapsamı, P03 ve P04 tamamlandı; uzak v2 deneme yayını bekliyor** · Son güncelleme: 05.10.2026
> İlk gerçek kullanım: EYİ 2026 (`eyi-2026`); canlı sistem korunuyor.
> Bu kopya uygulama takibidir. Kaynak plan ayrı planlama sohbetindedir ve bu çalışmada değiştirilmedi. Kapanışlar `docs/P01_KAPANIS.md`, `docs/P02_KAPANIS.md`, `docs/P03_KAPANIS.md`, `docs/P04_KAPANIS.md`. Henüz geliştirilmemiş modüller tamamlandı sayılmaz.

## 1. Hedef

Sistemi tek kongrelik bir araçtan, her yıl tekrar kullanılabilen bir **kongre platformuna** dönüştürmek:

- Kendi **ön yüz web sitemiz** ve onu yöneten **CMS admin paneli** (şu ana kadar okulun CMS'i kullanıldı).
- Son kongrede eksik kalan özelliklerin eklenmesi.
- Mevcut canlı uygulama ve EYİ 2026 web sitesi korunurken, v2'nin ayrı yerel ortamda geliştirilmesi ve yeni bir alt alan adında kullanılması.
- Yeni kongre ekiplerinin kendi sitelerini ve süreçlerini yönetebilmesi; EYİ 2026 sitesinin bütün kongre sayfalarının başlangıç şablonunda bulunması.
- CMS, sertifika ve diğer iş modüllerinin başka projelerde de kullanılabilecek sınırlarla tasarlanması; PDF arka planıyla çalışan sertifika modülünün ayrıca sunulması (Bölüm 14–15).
- **Seçmeli kullanım:** organizatör her kongre için kullanacağı iş modüllerini, aşamaları, sayfaları, form alanlarını ve belge koşullarını seçer. Geliştirme planındaki bir özelliğin var olması, her kongrede kullanımını zorunlu kılmaz (Bölüm 14.3).

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
| 6 | **Sertifika modülü** | PDF arka planı, yerleşim alanları, katılım/konuşmacı/görev belgeleri, toplu üretim, şablon ve belge sürümleri, doğrulama kodu |
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
- Ayrı sertifika modülü: yüklenen PDF tasarımı üzerine alıcı ve katılım/görev bilgileri; kongre kaydından veya bağımsız Excel/CSV listesinden üretim (Bölüm 15).
- Geri çekme/iptal, neden ve işlem geçmişi; geri alınabilir arşivleme. İptal kaydı banka iadesinin yapıldığı anlamına gelmez.
- E-posta incelemesinin dayanağı, 2026 EYİ yazışmalarından seçili örneklerdir: kayıt/ödeme teyidi, iade olmuş havale, tam metin alındı teyidi, özet düzeltmesi, yayın onayı, oturum başkanlığı belgesi ve yayın takvimi. Bu liste bütün posta kutusunun nicel analizi değildir.
- Ek araştırma kaynağı: `noreply@stativera.store` Google Workspace hesabına 05.10.2026'da Chrome üzerinden erişim doğrulandı. Altı seçili yazışma zinciri incelendi: sertifika teslim hatası, oturum başkanlığı reddi, özet biçimi düzeltmesi, tam metin yayın tercihi, geç başvuru talebi ve iki bildiriye ilişkin hakem formu dönüşü. Bulgular Bölüm 16'da; tüm posta kutusunun veya bütün eklerin incelendiği anlamına gelmez.

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

**Uygulama durumu:** P01, P02 yerel kapsamı, P03 ve P04 tamamlandı. P05–P22 planlandı. Ayrı test adresi/projesi seçilmediği için uzak deneme yayını bekliyor. Sonraki paket P05 ortak ön yüz, tema varlıkları, ana sayfa ve mobil/klavye doğrulamasıdır. Kaynak planın kapsam/süre tablosu korunmuştur.


Bu tablo paket kapsamlarını ve ilk süre tahminlerini gösterir. P01/P02 uygulaması ayrı sohbette başlatıldı; tamamlanma durumları uygulama kapanış kayıtlarıyla güncellenir. Süreler P01/P02 sonunda yeniden değerlendirilecek. Bağımlılık sütununda belirtilen paketlerin kendi ön koşulları da geçerlidir. Modül sınırları P02/P03'te tasarlanır; P16 iki orta büyüklükte alt pakete ayrılmıştır.

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
| P16 | P16A bağımsız PDF sertifika modülü; P16B oturum yoklaması ve kongreye bağlama | A: P03, P09; B: P12, P14, P16A | 3–5 |
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
- Bölüm 14'teki modül sınırları ve ortak altyapı bağlantıları için kısa mimari karar kaydı hazırlanmış; modülerliğin altyapı ve paket sırasına etkisi tahmine yansıtılmış.

**P03 — Hesaplar ve kongre ayrımı**

- İki örnek kongre ve farklı rollerle ekran/API/dosya erişimi sınanmış; başka kongrenin kaydına erişim reddediliyor.
- Platform yöneticisi, organizatör, sekreterya, içerik editörü, hakem, oturum başkanı ve katılımcı için temel yetkiler tanımlı; hassas değişikliklerin işlem kaydı var.
- Kimlik/yetki, kurum-etkinlik bağlamı, dosya ve bildirim bağlantıları modüllere açık arayüzlerle sunuluyor; modüller başka modülün tablolarına doğrudan yazmıyor. Modül açma/kapama hem ekran hem API tarafında uygulanıyor.

**P04 — Yeni kongre oluşturma**

- Kod değiştirmeden ad, tarih, dil, tema, ücret ve süreç ayarları girilebiliyor.
- Kurulumda kullanım profili seçilip modüller ve süreç aşamaları ayrı ayrı açılıp kapatılabiliyor; seçim özeti ilgili menü, form ve panel davranışını gösteriyor. Form alanları gizli/isteğe bağlı/zorunlu olarak yapılandırılabiliyor; seçilen işlemi yürütmek için gereken asgari bilgiler açıkça belirtiliyor.
- Önceki yılın şablonu kopyalanıyor; eski işlemler ve tarih/banka/kişi bilgileri kontrolsüz aktarılmıyor. Kişi kopyalama ayrıca seçilip gözden geçiriliyor.
- Yetkili organizatör belirli kişi/başvuru ve aşama için gerekçeli, süreli teslim istisnası tanımlayabiliyor. Genel son tarih bütün katılımcılar için kendiliğinden açılmıyor; istisna başvuruyu kabul edilmiş saymıyor.

**P05 — Ön yüz**

- EYİ görsel yaklaşımından türetilen bir tema; logo, renk, ana görseller ve çağrı düğmeleri yönetilebilir.
- Ana sayfa ve örnek içerikler masaüstü/mobilde okunur; klavyeyle temel gezinme çalışıyor.

**P06 — CMS**

- Bloklarla sayfa oluşturma, TR/EN eşleştirme, önizleme, yayınlama ve eski sürüme dönme tamamlanabiliyor.
- Medya yükleme ve kongreye göre erişim çalışıyor; iç düzenleme adları halka görünen başlığa sızmıyor.
- Süre, kendi uygulamamızda çalışan hazır editör bileşenleri ve başlangıç sayfalarını karşılayan belirli bir blok seti varsayar; sıfırdan genel amaçlı görsel editör geliştirme içermez.
- Başvuru, hakemlik veya ödeme modülü kurulmadan örnek bir etkinlik/kurum sitesi yönetilebiliyor; ortak altyapı bağımlılıkları belgelenmiş.

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
- Geçici gönderim hatası ile kalıcı alıcı/adres hatası ayrılıyor. Kalıcı hata sekreteryaya iş oluşturuyor; adres düzeltilmeden aynı alıcıya sürekli yeniden deneme yapılmıyor. Sağlayıcı kabulü, teslim teyidi ve okunma farklı kavramlar olarak gösteriliyor.
- Yanıt beklenen iletilerde organizatörün takip edilen yanıt adresi (`Reply-To`) ve ilgili panel/talep bağlantısı tanımlanıyor. İlk kapsam bütün posta kutusunu otomatik içe aktarmayı gerektirmiyor.

**P10 — Katılımcı ve sekreterya**

- Başvuru/kayıt akışları kongre bazlı çalışıyor; katılımcı kendi bildiri/ödeme/program/görev durumunu görüyor.
- Başvuru kuralları ve metin sürümlü beyanlar kaydediliyor; geri çekme/iptal talebi ve eksik işlem listesi var.
- Henüz geliştirilmemiş modül tamamlanmış gibi gösterilmiyor; panel sonraki paketlere genişletilebilir.
- Yapılandırılmış özet gereken kongrede amaç/yöntem/bulgular/sonuç alanları, zorunluluk ve kelime sınırları gönderimde gösterilip kontrol ediliyor; kurallar TR/EN ve aşamaya göre ayarlanabiliyor.
- E-posta veya panelden gelen talep ilgili başvuru/görev/belgeyle ilişkilendirilebiliyor; sorumlu, durum ve sonuç kaydı var. Tam otomatik posta kutusu eşleme sonraki bağlantı kararıdır.

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
- Bir hakemin birden fazla bildiri değerlendirmesi ayrı bildiri kimliği, tur ve dosya sürümüne bağlı tutuluyor. Dışarıdan gelen değerlendirme eki elle eşlenirse hedef kayıt ve gerekçe doğrulanıyor; benzer dosya adları tek başına eşleştirme ölçütü değil.

**P14 — Program**

- Bildiri, sunucu, salon, oturum başkanı ve teknik destek bağlanabiliyor; çakışma/yerleşmemiş bildiri uyarıları var.
- Program yayın sürümü ve çevrim içi bağlantıların açılma/kapanma zamanı ayrı; genel program erişimi bağlantı kapatılınca kaybolmuyor.
- Oturum başkanlığı/görev daveti için bekliyor/kabul/reddetti/değiştirildi durumları var. Ret halinde boş görev ve yerine atama ihtiyacı sekreteryada görünür; aynı kişinin kendi bildiri sunumu ayrıca izlenir.

**P15 — Workshop ve sosyal katılım**

- Kontenjan doluluğu, bekleme listesi, iptal ve katılımcı listesi örneği çalışıyor.
- Gezi/gala tercihleri ve program ilişkisi panelde görülebiliyor; mevcut ücret kuralları korunuyor.

**P16A — Bağımsız sertifika modülü (2–3 iş günü)**

- Bölüm 15'teki PDF arka planı, alıcı ve alt katılım/görev alanları için konum, yazı tipi/boyutu, hizalama ve uzun metin davranışı ayarlanabiliyor; önizleme ile tekli/toplu PDF üretimi çalışıyor.
- Kongre kaydından veya bağımsız Excel/CSV listesinden katılımcı, konuşmacı ve diğer görev türleri için belge üretilebiliyor. Liste eşleştirme/hata özeti görülüyor; hatalı kayıtlar sessizce atlanmıyor.
- Türkçe karakterler, uzun isim/kurum ve farklı PDF sayfa ölçüleri örneklerle kontrol edilmiş; kullanılan şablon/veri sürümü ve doğrulama kodu kayıtlı.
- Katılımcı indirme ve isteğe bağlı toplu e-posta akışı P09 arayüzüyle bağlanabiliyor; başka örnek uygulamada kongreye özel modüller olmadan kullanımı gösterilmiş.
- Belgenin üretilmesi ve alıcıya teslim süreci ayrı izleniyor. Geri dönen e-posta doğru belge/alıcıya bağlanıyor; doğrulanmış adres düzeltmesi sonrası belgeyi gereksiz yere yeniden numaralandırmadan tekrar gönderme örneği çalışıyor.

**P16B — Yoklama ve kongre bağlantısı (1–2 iş günü)**

- Oturum başkanı yoklama verebiliyor; sunucu, ortak yazar, dinleyici, konuşmacı ve görevli belge koşulları kongre ayarına göre uygulanıyor.
- Sertifika modülüne uygunluk sonucu ve gerekli alanlar aktarılıyor. Yeniden üretim, düzeltme, iptal ve eski belge/sürüm geçmişi örnek üzerinden kontrol edilmiş.

**P17 — Ödüller**

- Kategori, jüri, ölçüt ve bilimsel/sunum ağırlıkları ayarlanabiliyor; örnek sıralama hesaplaması doğrulanmış.
- Eksik değerlendirme veya çatışmalı jüri uyarısı var; nihai ödül kararı yetkili kurulca veriliyor. Sunum koşulu P16B'deki yoklamayla kontrol ediliyor.

**P18 — Davet ve afiş**

- Kongre bilgileriyle düzenlenebilir davet metni; hazırlanmış görsel yükleme veya bir afiş şablonundan üretim var.
- Metin/görsel katmanları ayrı; baskı PDF, web ve sınırlı sosyal medya boyutları önizleme sonrası üretilebiliyor. Tam bir grafik tasarım editörü hedeflenmiyor.

**P19 — Yayına hazırlık**

- Tam metin için bağımsız teslim/revizyon süresi; yayın tercihi ve dosya sürümü mevcut bildiriye bağlı.
- Prova → belirli sürüme yazar onayı → editörün yayına hazır kararı çalışıyor. Dergiye yönlendirme kaydı dergi kabulü anlamına gelmiyor.
- Ödül için tam metin teslimi, tam metin kitapta yayın izni sayılmıyor. Yalnız özet yayını, tam metin kitap tercihi ve dergiye yönlendirme isteği ayrı alanlarda tutuluyor; tercih/onay geçmişi hangi dosya sürümünü kapsadığını gösteriyor.

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
- Modüllerin bağımsız örnek kullanımları, belgelenmiş ortak altyapı gereksinimleri ve kapalı modüllerin erişim davranışı doğrulanmış.

---

## 12. Süre Tahmini ve Ara Teslimler

Bu süreler **bir geliştirici iş günü yaklaşık 6–8 saat odaklı çalışma**, mevcut başvuru/kayıt/ücret altyapısının yeniden kullanılması ve karar/içerik dönüşlerinin gecikmemesi varsayımıyla yapılan ilk planlama tahminidir. Kesintisiz otomatik çalışma veya belirli tarihte teslim sözü değildir. CMS kaynak kodunun yeniden kullanılabildiği henüz doğrulanmadığı için tahmin buna dayanmaz.

CMS için kendi ortamımızda çalıştırılan hazır editör bileşenleri ve belirlenmiş başlangıç blokları kullanılması öngörülür. Genel amaçlı bir görsel editörü sıfırdan geliştirmek ayrı kapsamdır.

| Ara teslim | İçerik | Başlangıçtan itibaren yaklaşık iş günü |
|------------|--------|---------------------------------------|
| Kendi site + CMS'nin kapsamlı ilk gösterimi | P01–P08; hazır sayfalar, ilk tema, menü/içerik yönetimi ve dinamik kayıtlar | 12–20 |
| Kontrollü kullanılabilir pilot | P01–P12; mevcut başvuru/kayıt, panel, düzeltmeler, ödeme kontrolü ve iletişim; ilgili uçtan uca kontroller | 20–35 |
| Planlanan tam v2 | P01–P22; hakemlik, program, workshop/ödül, belgeler, tanıtım, yayın/kitap ve arşiv | 40–65 |

- Sertifika modülünün ayrıntılandırılmasıyla paket tablolarının temel toplamı **35,5–58 iş günü** oldu. Tam v2 için mevcut **40–65 iş günü** aralığı geçici tahmindir; modüllerin farklı projelerde kullanımını doğrulama maliyeti P02/P03'te belirlenip toplam ve ara teslim tahminleri yeniden değerlendirilecek.
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

---

## 14. Başka Projelerde Kullanılabilen Modüller

05.10.2026 kullanıcı kararı: sistem iş modülleri halinde tasarlanacak; her modül başka bir projede de kullanılabilecek. İlk kurulumda tek uygulama ve ortak yönetim kabuğu içinde, sınırları açık modüller önerilir. Başka projede kullanım; ilgili modülün ve belgelenmiş temel altyapısının eklenmesiyle mümkün olmalı. Her modül için ayrı sunucu kurmak ilk gereksinim değildir.

### 14.1 Ortak altyapı ve modül sınırları

- Ortak temel: kimlik/yetki, kurum ve etkinlik bağlamı, dil, dosya saklama, işlem kaydı ve iş kuyruğu. Modül bu hizmetleri tanımlanmış arayüzlerden alır; kullanılan uygulamanın e-posta veya dosya sağlayıcısı değiştirilebilir.
- Modül kendi iş kurallarını, verisini, servis/API arayüzünü, ekranlarını ve şema değişikliklerini sahiplenir. Başka modülün veri tablosuna doğrudan erişim/yazma yerine ilgili servis kullanılır.
- Gerekli ve isteğe bağlı bağımlılıklar ayrı tanımlanır. Bir modül kapatıldığında yeni işlem menüsü ve ilgili API işlemleri kapanır; bağımlı özellikler anlaşılır biçimde gösterilir. Mevcut kayıtlar korunur; yayımlanmış arşiv ve verilmiş belgelerin doğrulama erişimi ayrı yaşam döngüsü ayarlarıyla yönetilir.
- Tek bir kongre kodu, belirli proje dosya yolu, tema veya e-posta sağlayıcısı modülün içine sabitlenmez. Etkinlik/kişi verileri ihtiyaca göre dış uygulamadan, API'den veya liste içe aktarımından sağlanabilir.
- Modüller arasında veri aktarımı sürümlü arayüzler ve açık olaylarla yapılır: örneğin `katılım onaylandı` bilgisi sertifika uygunluğunu tetikler; otomatik toplu gönderim organizatörün yayın/gönderim ayarına bağlıdır.
- Başka projeye taşıma; kurulum belgesi, örnek bağlama uygulaması ve uyumluluk kontrolüyle gösterilir. “Ayrı klasörde” olması tek başına yeniden kullanılabilirlik kabulü değildir.
- Bu yapı P02/P03'te kararlaştırılıp sonraki paketlere uygulanacak; bu plan güncellemesi kodun modüllere ayrılmış olduğunu göstermez.

### 14.2 İş modülleri

| Modül | Başka projede örnek kullanım | Kongre platformuna bağlantısı / paket |
|-------|-----------------------------|--------------------------------------|
| CMS ve web sitesi | Kurum, etkinlik veya eğitim sitesi | Ortak temel ve isteğe bağlı dinamik etkinlik verisi; P05–P08 |
| Başvuru/kayıt ve revizyon | Etkinlik, eğitim veya içerik başvurusu | Kongreye özel form/ücret kuralları yapılandırma ve bağlantı katmanında; P10–P11 |
| Değerlendirme | Bildiri veya proje başvurusu değerlendirmesi | Dışarıdan değerlendirilecek kayıt/dosya alır, karar sonucu sunar; P13 |
| Ödeme kontrolü | Etkinlik/eğitim ücretlerinin doğrulanması | Katılımcı ve ücret verisini alır; banka biçimi ayrı içe aktarma bağlantısı; P12 |
| Program ve oturum | Eğitim, seminer veya etkinlik takvimi | Bildiri kaydı isteğe bağlı; kişi, oturum ve salon temel verileriyle çalışır; P14 |
| Etkinlik katılımı | Kontenjanlı workshop, gezi veya kurs | Kayıt/kişi bağlantısı ve isteğe bağlı ücret/program; P15 |
| Yoklama | Eğitim/seminer katılım takibi | Oturum/kişi verisini alır, katılım sonucunu verir; P16B |
| Sertifika | Katılım, konuşmacı, eğitim veya görev belgesi | Kongre bağlantısı veya Excel/CSV; PDF şablonu ve alıcı verileri yeterli; P16A |
| Ödül | Proje, yarışma veya bilimsel etkinlik ödülleri | Aday/jüri/değerlendirme verisi alır; sunum zorunluysa yoklama sonucu; P17 |
| İletişim | İşlem ve durum bildirimleri | Sağlayıcı bağlantısı, şablon, kuyruk, geçmiş; P09 |
| Tanıtım çıktıları | Davet ve etkinlik afişi | Etkinlik bilgileri ve şablon; P18 |
| Yayın ve arşiv | Özet koleksiyonu veya onaylı içerik yayını | Dosya, prova/onay ve metadata; kongreye özgü alanlar bağlantı katmanında; P19–P21 |

Her iş modülünün kapanışında küçük bir bağımsız kullanım örneği ve gereken temel hizmetler belgelenir. Ürün içindeki bütün modüllerin aynı anda kullanılması zorunlu değildir. Modüllerin kodla taşınabilirliği ilk hedeftir; ayrı ayrı ticari ürün paketleme ve geniş kapsamlı bağımsız kurulum ekranları ayrıca değerlendirilecek.

### 14.3 Seçmeli özellikler ve kongreye göre yapılandırma

05.10.2026 kullanıcı kararı: özellikler seçmeli olacak. Kongre ekibi kendi ihtiyacına göre modül, süreç, sayfa ve kuralları belirleyecek; öneriler zorunlu bir iş akışına dönüşmeyecek.

- **Modüller:** CMS, kayıt, bildiri, hakemlik, ücret/ödeme, program, workshop, yoklama, sertifika, ödül ve yayın gibi işlevler kongre bazında seçilir. Sadece sertifika veya sadece web sitesi kullanımı mümkündür.
- **Süreçler:** hakemli/hakemsiz değerlendirme, yalnız özet/tam metin, ücretli/ücretsiz katılım, fiziksel/çevrim içi/karma etkinlik ve belge üretimi ayrı tercihlerdir. Kapalı aşama kullanıcıdan işlem beklemez; ilerleme durumu seçili aşamalara göre hesaplanır.
- **Alanlar ve koşullar:** organizatör form alanlarının görünürlüğünü ve zorunluluğunu, özet başlıklarını/kelime sınırlarını, tarihleri ve belge koşullarını ayarlar. Bir özelliğin gerçekten gerektirdiği veri eksikse yalnız o özellik için anlaşılır uyarı gösterilir; örneğin e-posta gönderimi alıcı adresi isterken yalnız PDF indirmek e-posta adresi gerektirmez.
- **Sayfalar:** EYİ referansındaki bütün sayfa şablonları başlangıçta yönetim panelinde bulunur. Organizatör yayımlayacağı sayfaları seçer; kapalı veya doldurulmamış bir özellik halka açık menüde boş sayfa oluşturmaz.
- **Hazır başlangıç seçimleri:** yalnız web sitesi, web sitesi + ücretsiz kayıt, bildiri süreçli kongre ve yalnız sertifika gibi seçimler kolaylık sağlar; her biri sonradan özelleştirilebilir. Hangi modüllerin açılacağı yayın öncesi özetlenir.
- **Bağımlılıklar:** ihtiyaç duyulan ek modül veya alternatif veri girişi açıkça gösterilir; seçim kullanıcıya açıklanmadan genişletilmez. Paket tablosundaki geliştirme sırası, ürün kullanımında bütün önceki modüllerin açılmasını gerektirmez.
- **Devam eden etkinlikte değişiklik:** ayar değişikliğinin mevcut kayıtlar, görevler, bildirimler ve belgeler üzerindeki etkisi gösterilir. Modül kapatmak veri silmez veya geçmiş onayları değiştirmez; işlem geçmişi korunur. Yeni işlemler ve geçmiş kayıtların erişimi ayrı yönetilir.
- **Doğrulama:** P04/P22'de yalnız site, ücretsiz kayıt, hakemsiz bildiri ve bağımsız sertifika örnekleriyle seçimlerin ekran/API/iş kuyruğuna yansıdığı kontrol edilir. Kapalı modüller hatırlatma veya otomatik e-posta üretmez.

---

## 15. Sertifika Modülü — PDF Arka Planlı İlk Sürüm

05.10.2026 kullanıcı kararı: mevcut yöntem korunacak. Sertifika tasarımı PDF olarak yüklenir; üst alanda alıcının ayrıntıları, alt alanda katılım/görev bilgileri bulunur. İlk sürüm bu yerleşimi ön tanımlı sunar; şablonun ölçüsüne göre alan konumları ayarlanabilir.

### 15.1 Şablon ve alanlar

- Katılımcı, konuşmacı, bildiri sunucusu, oturum başkanı, kurul/görevli ve workshop katılımcısı için belge türleri; organizatör ek tür tanımlayabilir.
- Üst alan: ad-soyad, isteğe bağlı unvan, kurum ve belge için seçilen diğer bilgiler. E-posta, iç kayıt numarası ve kimlik bilgileri varsayılan olarak sertifikaya basılmaz.
- Alt alan: etkinlik adı, tarih/yer, katılım veya görev açıklaması, varsa konuşma/bildiri/oturum başlığı. Aynı kişi farklı görevler için birden fazla belge alabilir.
- İlk PDF arka planı ve alıcı/katılım alanları; yazı tipi ve boyutu, renk, hizalama, satır kırılması ve konum ayarları. İmza/logo hazırlanmış PDF tasarımında bulunabilir.
- Şablon önizlemesi: kısa/uzun isim, uzun kurum ve Türkçe karakter örnekleri; taşan alan uyarısı. İlk kapsam sertifika sayfası için PDF arka planıdır; çok sayfalı belge tasarımı daha sonra kapsamlandırılır.

### 15.2 Üretim ve dağıtım

- Tek belge önizleme/indirme; seçilmiş kişilere toplu PDF üretimi ve arşiv indirme. Modül bağımsız çalışırken Excel/CSV sütunları alanlarla eşleştirilir.
- Kongre içinden üretimde kayıt, katılım veya görev şartları yapılandırılır. Her belge türü için ödeme/yoklama zorunluluğu ayrıca seçilir; davetli konuşmacı gibi roller katılımcı ücretine otomatik bağlanmaz.
- İçe aktarılan satırlar ve aynı kişinin farklı belgeleri ayrıştırılır; tekrar üretim yeni bir kişiye/mükerrer belgelendirmeye dönüşmez. Şablon değişikliği geçmiş PDF'yi sessizce değiştirmez.
- Belge kimliği ve isteğe bağlı QR/doğrulama bağlantısı; şablon/veri sürümü, üretim tarihi ve üreten kullanıcı kaydı. Düzeltme, yeniden üretim ve iptal geçmişi tutulur; doğrulamada yalnız gerekli belge bilgileri gösterilir.
- Katılımcı panelinden indirme ve organizatörün seçimiyle e-posta gönderimi; gönderim kuyruğu/geçmişi İletişim modülü üzerinden. Basılı imza görseli hukuki elektronik imza olarak adlandırılmaz.
- Üretim ve teslim durumları ayrı: PDF hazır, gönderim bekliyor, sağlayıcı kabul etti, teslim hatası ve varsa doğrulanmış teslim bilgisi. Kalıcı adres hatasında organizatöre düzeltme işi açılır; toplu üretimin başarılı olması bütün alıcılara ulaşıldığını göstermez.

### 15.3 Pakete yansıması ve bağımsız kullanım kanıtı

- **P16A:** sertifika çekirdeği, PDF alan yerleşimi, şablon/üretim geçmişi, doğrulama ve Excel/CSV örneği.
- **P16B:** yoklama ve kongreye bağlantı; göreve/katılıma göre uygunluk ve panelden erişim.
- Kabul örneği: aynı PDF tasarımından bir katılımcı ve bir konuşmacı belgesi; uzun ad/kurum ve Türkçe karakterler; aynı kişiye iki farklı rol; hatalı içe aktarım satırı; düzeltme/iptal; kongre modülleri olmadan örnek kullanım.
- Referans sertifika PDF'si ve örnek alanlar uygulama paketi öncesinde kullanıcıdan alınacak; tasarımın kesin koordinatları şu aşamada varsayılmayacak.

---

## 16. Workspace Yazışmalarından Planı Netleştiren Örnekler

05.10.2026'da kullanıcının açık Chrome oturumunda `noreply@stativera.store` hesabı doğrulandı. Temmuz–Eylül 2026 döneminden altı yazışma zincirinin görünen mesajları incelendi. Tablo kişisel içeriklerin dökümünü değil, gözlenen iş akışı ile önerilen davranışın bağlantısını kaydeder. Eklerin tamamı okunmadı; hakem puanları, bütün sertifika tasarımları veya başvuruların son sonuçları hakkında çıkarım yapılmadı.

| Yazışma / tarih | Gözlenen durum | Plana yansıyan davranış |
|----------------|----------------|------------------------|
| Workshop III Katılım Belgesi, 25.09.2026 | PDF sertifika e-postasına adres bulunamadı (`550 5.1.1`) teslim hatası dönmüş. | P09/P16A: belge üretimi ve teslimi ayrı; kalıcı hata listesi, adres düzeltme ve kontrollü yeniden gönderim. |
| EYİ 2026 Oturum Başkanlığı Hk., 07.09.2026 | Davet edilen kişi kendi sunumunu çevrim içi yapmayı planlıyor; bağlantı koşulları nedeniyle başkanlık görevini üstlenemeyeceğini bildiriyor. | P14/P16B: görev kabul/ret durumu, yerine atama ve görev belgesi uygunluğu; sunucu rolü ile başkanlık ayrı. |
| EYİ 2026 Özet Bildiri Kitabı Hakkında — Özet Düzenleme Talebi, 22–24.09.2026 | Güncel metin geldikten sonra amaç/yöntem/bulgular/sonuç alt başlıkları ayrıca istenmiş ve yeni dosya gönderilmiş. | P04/P10/P11/P20: kongreye göre yapılandırılmış özet alanları, erken biçim kontrolü ve kitapta kullanılacak onaylı sürüm. |
| EYİ 2026 — Tam Metin Bildiri Kitabı Yayın Onayı Hakkında, 22–23.09.2026 | Ödül değerlendirmesi için teslim edilen çalışmanın yazarı tam metnin kitapta yayımlanmasını istemiyor; yalnız özet ve dergi seçeneğini soruyor. | P17/P19/P20: ödül teslimi ile yayın onayı ayrı; açık yayın tercihine göre kitap seçimi. |
| EYİ 2026 Kongre Kayıt İşlemlerinin Tamamlanması Hakkında, 03.09.2026 | Kayıt yaptırmış kişi son tarih geçtikten sonra bildiri özeti sunmak için uygunluk soruyor. Yazışmada nihai kabul sonucu doğrulanmadı. | P04/P10/P11: kayıt ve bildiri süreçleri ayrı; organizatörün gerekçeli, belirli kişi/aşama için süreli istisnası. |
| EYİ 2026 Bildiri Değerlendirme Talebi, 27–30.07.2026 | Bir hakem iki bildiri için iki ayrı değerlendirme formunu aynı e-postayla göndermiş. Yanlış eşleştirme yaşandığına dair bulgu yok. | P13: her formu bildiri/hakem/tur/sürümle açık eşleştirme; birden çok değerlendirmeyi tek yazışmadan izleme. |

Bu örnekler mevcut paketlerin kabul ölçütlerini netleştirir. Yanıtlar `noreply` adlı hesaba da geldiği için yanıt bekleyen iletilerde takip edilen yanıt adresi ve panelden talep bağlantısı tasarlanmalı. Tam otomatik gelen kutusu bağlama, kapsamı ve erişimi ayrıca kararlaştırılacak bir entegrasyondur.
