# UI12 — Hesap ve Davet Akışını Tamamlama

Plan tarihi: **09.10.2026**. Durum: **Yerel teknik uygulama ve istenen veri temizliği tamamlandı; gerçek kullanıcı kabulü bekler**. Sonuçlar: [UI12 doğrulama](UI12_DOGRULAMA.md).

Bu paket, hazır oluş değerlendirmesindeki ilk üç maddeyi kapsar. Kullanıcı 09.10.2026 tarihinde “paketi uygula” diyerek geliştirmeyi onayladı. Bu dosya uygulama veya test sonuç raporu değildir. Kök `GELISTIRME_PLANI.md` Bölüm 19 ile birlikte takip edilir.

## 1. Amaç ve mevcut sorunlar

1. Kişisel hesap girişinde parola kurtarma yok. Mevcut etkinleştirme akışı, parolası zaten oluşturulmuş hesabın parolasını yenilemek için kullanılamaz.
2. Kurum detayındaki “Sorumlu ve erişimleri aç” bağlantısı, mevcut sorumlular yerine “Davet et” sekmesini açıyor; kurum parametresi kullanıcı listesini o kuruma daraltmıyor.
3. “Sorumlu atanmış” ve “Davet bekliyor” ifadeleri; yetkinin atanmasını, kullanıcının parola oluşturmasını ve hesabın erişim durumunu yeterince ayırmıyor.

Kaynak dayanakları: `src/components/admin/admin-login-form.tsx`, `src/modules/identity/service.ts`, `src/app/admin/kurumlar/page.tsx`, `src/app/admin/kullanicilar/page.tsx` ve `src/modules/platform-management/service.ts`. Uygulamadan önce bu davranışların güncel durumu yeniden doğrulanır.

## 2. UI12-A — Parola kurtarma

- Kişisel hesap girişine “Parolamı unuttum” bağlantısı eklenir. Kullanıcı e-posta adresini girer; uygun hesabın adresine kurtarma bağlantısı hazırlanır. Sonuç mesajı, adresin sistemde bulunup bulunmadığını veya hesabın kapalı olduğunu açıklamaz.
- İlk parola oluşturma ile parola kurtarma ayrı kalır. Henüz etkinleşmemiş hesap için mevcut davet/etkinleştirme yolu kullanılır; kurtarma isteği yeni hesap, rol veya üyelik oluşturmaz. Arayüz bu ayrımı hesap varlığını ifşa etmeden açıklar.
- Kurtarma bağlantısı **30 dakika geçerli ve tek kullanımlı** olur. Yeni bağlantı oluşturulunca önceki kurtarma bağlantıları geçersizleşir. Doğrulama kaydında token özeti saklanır; parola veya ham bağlantı/token uygulama ve işlem günlüklerine yazılmaz.
- Mevcut 12–256 karakter parola kuralı korunur. Başarılı işlem parolayı değiştirir, tokenı atomik olarak tüketir, kalan kurtarma bağlantılarını ve mevcut oturumları iptal eder. Kullanıcı yeni parolasıyla yeniden giriş yapar; otomatik oturum açılmaz.
- Kapalı hesap yeniden açılmaz; kurum erişimi, kongre üyeliği, roller ve platform müdahale yetkisi değişmez. Geçici giriş kilidi ile kapalı hesap ayrımı korunur; başarılı kurtarma sonrasında hatalı giriş sayacı ve geçici kilit temizlenir.
- İstekler sunucuda adres ve istemci bazında hız sınırına tabi olur. Tekrarlanan istekler sınırsız e-posta/kuyruk kaydı üretmez. Sınır değerleri uygulama ve doğrulama kaydında açıkça belgelenir; yanıtlar hesap varlığını açıklamaz.
- Mevcut iletişim altyapısı kullanılır. Yerel testte iletiler **capture** modunda tutulur; gerçek alıcıya gönderilmez. Kuyruğa alınma, yerel yakalama ve gerçek teslim farklı durumlardır. Token süresi dolmuş veya başarısız ileti için yeni istek yolu gösterilir.
- Mevcut kuyruk kongreye bağlı olmayan iletilerde yalnız hesap etkinleştirmeyi kabul ettiği için kurtarma mesajı desteği de bu alt işin kapsamındadır. İşçi, iletinin hesabını ve kurtarma kaynağını gönderim öncesinde yeniden denetler; süresi dolmuş, kullanılmış veya yerini yeni token almış mesaj gönderilmez. E-posta gövdesindeki zorunlu bağlantı yalnız mevcut yetkili iletişim saklama/erişim sınırında kalır; genel API yanıtına veya günlüklere taşınmaz.

## 3. UI12-B — Kurumdan mevcut sorumluya erişim

- “Sorumlu ve erişimleri aç” seçili kurumun sorumlularına gider. Tek sorumlu varsa ilgili ayrıntı seçili açılır; birden çok sorumlu varsa kuruma göre süzülmüş listeden seçim yapılır.
- Sorumlu yoksa boş durum ve yetkili kullanıcı için “Sorumlu ata” işlemi gösterilir. “Yeni sorumlu davet et” mevcut sorumluyu incelemekten ayrı sunulur ve seçili kurumla başlar.
- Kurum filtresi sunucuda uygulanır. Arama, sayfalama, ayrıntı ve geri dönüşte kurum bağlamı korunur. URL parametresi değiştirmek başka kurumun kullanıcılarını veya erişimlerini görme/değiştirme yetkisi vermez.
- Kurum yöneticisi yalnız yetkili olduğu kurum kapsamını görür. Bir sorumlunun başka kurumlardaki üyelikleri izinsiz açılmaz. Platform günlük görünümü UI11'deki kongre gizliliği ve açık müdahale akışını korur.
- Mevcut genel kullanıcı araması ve açık davet bağlantıları çalışmaya devam eder. Eski kurum bağlantısı artık mevcut sorumluları açar; doğrudan davet niyeti ayrı bağlantı/parametreyle ifade edilir.

## 4. UI12-C — Davet, hesap ve erişim durumları

Durumlar mevcut gerçek kayıtlardan türetilir; yeni bir “admin onayı” iş kuralı eklenmez. Aynı kişi için hesap durumu ile kuruma ait yetki/erişim durumu ayrı gösterilir.

Etkinleştirme bağlantısı kurumun değil, kişinin ortak hesabınındır. Bir kurumdan yeniden davet oluşturulması kişinin önceki etkinleştirme bağlantılarını geçersizleştirir; mevcut davranış korunur ve işlemin açıklamasında belirtilir. Başka kurum üyeliklerinin durumu yetkisiz kullanıcıya açılmaz.

| Durum | Gösterim ve uygun işlem |
|---|---|
| Sorumlu atanmamış | “Sorumlu yok”; yetkili kullanıcıya sorumlu atama |
| Yetki atanmış, parola yok, bağlantı geçerli | “Yetki atandı · Parola oluşturması bekleniyor”; geçerlilik tarihi ve izin verilen yeniden davet işlemi |
| Parola yok, geçerli bağlantı yok | Süresi dolmuş bağlantı ile hiç oluşturulmamış bağlantı ayırt edilir; uygun etkinleştirme bağlantısı oluşturma/yenileme |
| Parola oluşturulmuş, hesap açık | “Hesap etkin”; mevcut yetkileri yönetme. Etkinleştirme daveti yeniden gönderilmez; unutulan parola kurtarma akışından yenilenir. |
| Kurum sorumluluğu veya kurum erişimi kapalı | Hesap açık olsa bile ilgili kapsamın kapalı olduğu belirtilir; parola yenileme bu erişimi açmaz. |
| Kişisel hesap kapalı | “Hesap kapalı”; bekleyen davet veya parola işlemi hesabı açık göstermez, yeniden etkinleştirme yetkisi vermez. |

Kurum özeti, kullanıcı listesi ve ayrıntıdaki ifadeler tutarlı olur. Davet yenilendiğinde eski bağlantı geçersizleşir. İletişim durumu gösteriliyorsa “yerelde yakalandı”, “kuyrukta” veya “başarısız” hesap etkinliğinden ayrı belirtilir; capture kaydı “alıcıya ulaştı” sayılmaz.

## 5. Kabul ve yerel doğrulama

Onaydan sonra her alt iş kendi kontrolleriyle doğrulanır; ardından ortak regresyon yapılır. Aşağıdakiler **hedef ölçütlerdir, henüz test sonucu değildir**.

1. Kurtarma: geçerli bağlantıyla parola değişir; eski parola çalışmaz, yeni parola çalışır. Süresi dolmuş, kullanılmış, değiştirilmiş ve önceki bağlantılar reddedilir. Aynı tokenla eşzamanlı isteklerden yalnız biri başarılı olur. Token kontrolü ile işlem arasında hesap kapatılırsa kurtarma hesabı etkinleştiremez.
2. Oturum ve yetki: eski oturumlar kullanılamaz; giriş kilidi/sayacı planlandığı gibi temizlenir. Hesap etkinliği, mevcut kurum/kongre üyelikleri ve roller değişmez. Parola değişimi mevcut platform müdahalesini yeni oturuma taşımaz.
3. İstek sınırı ve iletişim: bilinmeyen, kapalı ve etkin hesap için dış yanıt hesap varlığını ele vermez. Hız sınırı aşımı ve kuyruk hatası kontrol edilir; parola/token günlüklerde bulunmaz. Süresi dolmuş, kullanılmış veya eski tokena ait mesajın işçi tarafından gönderilmediği doğrulanır. Yalnız sentetik adresler ve yerel capture kullanılır.
4. Sorumluya erişim: sıfır, bir ve birden çok sorumlu; arama/sayfalama, seçili kayıt ve geri dönüş kontrol edilir. Yetkisiz kurum/kullanıcı parametresi sunucu tarafından reddedilir. Mevcut genel kullanıcı ve davet akışları çalışır.
5. Durumlar: Bölüm 4'teki her durum ve uygun sonraki işlem doğrulanır. Özellikle yetki atama hesap etkinleştirme sayılmaz; hesabın kapanması veya kurum erişiminin kapanması birbirine karıştırılmaz. Yeni davet eski tokenı geçersizleştirir; aynı hesabın iki kurumdan davet edilmesi de sınanır.
6. Tarayıcı: etkilenen giriş/kurtarma, kurum ve kullanıcı ekranları **1280 px masaüstü ve 390 px mobilde**, klavye ile denenir. Alan etiketleri, hata/başarı/bekleme halleri, odak, geri dönüş ve yatay taşma kontrol edilir. Gerçek %200 yakınlaştırma denenir; araç sınırı varsa açıkça bekler olarak kaydedilir.
7. Regresyon: anlamlı birim/API kontrolleri; ilk etkinleştirme, giriş/çıkış, davet yenileme, hesap/üyelik kapatma, çoklu rol, UI11 kurum/kongre sınırları ve müdahale; ardından etkilenen ortak kimlik/iletişim akışlarının mevcut regresyonları, build, TypeScript ve lint. Başarısız veya çalıştırılamayan kontroller raporda açık kalır.

Kapanışta `docs/UI12_DOGRULAMA.md` dosyasında uygulanan kapsam, komut sonuçları, tarayıcı kanıtları, veri koruma ve geri dönüş noktası kaydedilir. Gerçek kullanıcı kabulü ayrı sonuçtur; otomatik veya ajan tarafından yapılan tarayıcı kontrolüyle geçti sayılmaz.

## 6. Uygulama sınırı ve iş paylaşımı

- **Bu sohbet:** Açık kullanıcı onayından sonra UI12-A → UI12-B → UI12-C uygulaması ve yerel teknik doğrulaması. Bu plan yalnız görünüm kapsamı değildir; kurtarma için gereken API, güvenli token saklama ve veri koruyan eklemeli şema geçişi kapsam içindedir.
- **Veri koruma:** Uygulama öncesinde kaynak ve yerel veritabanı geri dönüş noktası alınır. Şema değişikliği varsa önce/sonra mevcut hesap, parola ve üyeliklerin korunması doğrulanır; testler sentetik hesaplarla yapılır. Kullanıcının gerçek hesabına test parolası yazılmaz. Geri dönüş planı ve yedeğin açılabildiği belgelenir; eski yedek mevcut verilerin üzerine otomatik yazılmaz.
- **Kullanıcı — önceki 4. madde:** Gerçek kullanıcı denemesi ve kabulü kullanıcı yürütür. Teknik kontrol sonuçları ve deneme adımları teslim edilir; mevcut UI10/UI11 kullanıcı kabulü kendiliğinden kapanmaz.
- **Beyin sohbeti — önceki 5. madde:** Canlı e-posta, alan adı/DNS/TLS, üretim yedekleme/izleme, hedef ortam yük ve güvenlik kontrolleri ile yayın hazırlığı orada planlanır. Bu kayıt Beyin'de işlem başlatıldığı anlamına gelmez.
- **Kapsam dışı:** Canlıya yayın, gerçek alıcıya deneme e-postası, yeni rol politikası, SSO/MFA ve önceki paketlerin yeniden uygulanması.

**Başlangıç koşulu sağlandı:** Kullanıcı paketin geliştirilmesini açıkça onayladı.

## 7. Kullanıcının ek kararı — temiz başlangıç

09.10.2026 tarihli uygulama onayında kullanıcı, kendi oluşturduğu denemeler dahil yerel deneme ve sentetik kurum, kongre, kullanıcı ve ilgili bütün iş kayıtlarının temizlenmesini istedi. Bu açık talimat önceki veri temizliği kapsam dışı kaydını değiştirir. Canlı sistem bu işlemin hedefi değildir.

Temizlik UI12 testleri tamamlandıktan sonra yapılır. Öncesinde yerel yedek ayrı veritabanına geri yüklenerek doğrulanır. Uygulama veritabanındaki deneme verileri, ilişkili dosyalar, üyelikler, oturumlar, tokenlar, e-posta kuyruğu ve geçmişler temizlenir; şema/geçiş kayıtları ve çalışmayı sağlayan uygulama kaynakları korunur. Giriş için tek platform yönetici hesabının korunması veya ilk yönetici kurulumunun da sıfırlanması kullanıcı tercihine göre belirlenir. Özel kurtarma yedekleri uygulama dışında tutulur ve canlıya taşınmaz. Son durumda sayımlar ve boş başlangıç ekranı doğrulanır; test fixture'ları yeniden yüklenmez.
