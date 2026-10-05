# P06 — CMS editörü, medya ve yayın sürümleri

05.10.2026 · `codex/v2-p06` · Bağımsız v2, sentetik yerel veriler.

## Tamamlanan davranış

Panelde CMS sayfaları ve Medya kitaplığı açıldı. Sayfa adresi kongre içinde
benzersiz ve sabittir; iç düzenleme adı yalnız yetkili panelde görünür.
TR/EN başlık, giriş ve bloklar ayrı düzenlenir. Açık dil sürümünün başlığı
ve tamamlanmış en az bir bloğu yayın için gereklidir. Kapalı çeviri yerine
açık diğer dildeki içerik, açıklama ve doğru `lang` niteliğiyle gösterilir.
Eksik çeviri iç düzenleme adını halka açık başlığa dönüştürmez.

Sekiz blok: alt başlık (H2/H3), metin, bilgi kutusu, liste, görsel,
PDF bağlantısı, buton ve tablo. Hazır form kontrolleriyle ekleme, sıralama,
kaldırma ve önizleme yapılır. Her dilde en fazla 40 blok; metin, satır,
sütun ve toplam belge boyutları sınırlıdır. HTML çalıştırılmaz. Harici
butonlar yalnız kimlik bilgisi içermeyen HTTPS adresine gider. Kongre
sayfası hedefi yayımlanmış olmalıdır; kapalı bildiri/kayıt modülüne buton
yayımlanamaz. Tablo başlığı ve sütun başlıkları zorunludur.

Kaydet, değiştirilemeyen yeni bir taslak sürümü oluşturur; mevcut yayını
değiştirmez. Yayımla, son kaydedilmiş taslağın ayrı bir yayın sürümünü seçer.
Kaydedilmemiş değişiklik varken yayın/geri alma engellenir. Önizleme hem
ekrandaki değişiklikler hem kaydedilmiş taslak/geçmiş sürüm için bulunur.
Kaydedilmiş önizleme kişisel oturum, kongre yetkisi ve açık CMS gerektirir;
paylaşılabilir gizli token kullanılmaz ve arama motoruna kapalıdır.

Eski sürümü taslağa al, o içeriği yeni bir RESTORE sürümüne kopyalar;
mevcut yayın korunur. Tekrar Yayımla ile halka açılır. Yayından çekme
sayfayı ve yalnız ona bağlı dosyaları halka kapatır; geçmiş korunur.
Son 20 sürüm ve daha eski sürümleri yükleme, aktör/zaman/işlem türünü
gösterir. Aynı sürümden iki işlemde yalnız biri kabul edilir (diğeri 409).
Oluşturma, kayıt, yayın, geri alma ve medya işlemleri kongre/aktör bazında
işlem geçmişine yazılır.

Menüde göster ve sıra, yayımlanmış sürümden alınır. Menüye kapalı yayınlı
sayfa doğrudan adresinden açılabilir. Taslak, eski yayın, başka kongre
ve kapalı CMS sayfaları halka açık menü/veri uçlarına sızmaz.

## Medya ve erişim

Görsel/PDF en fazla 8 MB. PNG/JPEG/WebP gerçekten çözülür; kaynak en fazla
24 milyon piksel, çıktı en fazla 2400×2400, yönü düzeltilmiş ve metadata
taşımayan WebP'dir. SVG/HTML ve görüntü gibi etiketlenmiş başka içerik reddedilir.
PDF başlığı ve yapısı pdf-lib ile okunur; şifresiz, 1–200 sayfalı PDF kabul
edilir. PDF özgün baytları saklanır; PDF temizleme/antivirüs hizmeti değildir.
PDF sabit `congress-document.pdf` adıyla attachment olarak sunulur;
nosniff ve sandbox başlıkları uygulanır. Özgün dosya adı ve iç medya adı
halka açık başlığa/indirme adına taşınmaz.

Her yükleme yeni medya kimliği oluşturur. Eski sürümlerin dosyası üzerine
yazılmaz. İç adı değiştirme ve gizle/yeniden aç sürüm denetimlidir; gizleme
veriyi silmez. Gizlenen dosya halka kapanır, sayfa kullanılabilirlik
açıklaması gösterir. Yeniden açılınca kullanım geri gelir. Başka kongre
medyası sayfa bloğuna eklenemez; görsel/PDF türü blokla eşleşmelidir.

Özel dosya ucu her istekte kongre/rol/CMS denetler. Halka açık dosya ucu
aynı kongrenin **şu an yayımlanan sürümündeki açık çeviriye** bağlı ve aktif
medyayı sunar. Yalnız taslak, geçmiş sürüm, kapalı çeviri veya kitaplıkta
kullanılmamış dosya 404 döner. Oturum ve dosya yanıtları no-store'dur.

İçerik editörü CMS kullanabilir; kongre ayarları, modül seçimi, ekip,
bildiri ve kayıt yönetimine yetki kazanmaz. Organizatör, kurum organizatörü
ve platform yöneticisi kendi mevcut kongre kapsamlarında CMS kullanabilir.
Sekreter, hakem, başkan ve katılımcı CMS yönetemez. Üyelik iptali mevcut
oturumda hemen uygulanır.

## Bağımsız kullanım ve kapsam

Sentetik `p06-cms-1e029543` kongresi yalnız CMS açık, bildiri/kayıt kapalı
olarak Katılım Rehberi ve Bilimsel Buluşma sayfalarını yönetir. Hakemlik,
ödeme veya başvuru kaydı gerekmez. Ortak bağımlılıklar: kişisel hesap ve
kongre bağlamı (P03), tema/ortak ön yüz (P05), Prisma/PostgreSQL dosya ve
sürüm depolama, işlem geçmişi. Ayrı ticari CMS kurulumu bu paket değildir.
CMS açma/kapama P04 iş akışı JSON'unu veya yapılandırma sürümünü değiştirmez.
Yeni yıl kopyası sayfa, medya, eski yayın veya CMS açılışını otomatik taşımaz.

P07'nin tüm başlangıç sayfaları, alt menü yapısı ve kaynak içerik/ek aktarımı
henüz yapılmadı. Dinamik kişi/program verisi P08'de; zamanlanmış yayın
ayrıca planlanacak. Genel amaçlı sürükle-bırak görsel tasarım aracı yoktur.

## Doğrulama ve kurtarma

- Üretim derlemesinde CMS: 9 saf yapılandırma + 34 HTTP/DB senaryosu.
- Önceki paketlerle toplam 175 kontrol: P05 33, P04 38, smoke 15,
  P03 19 ve ortam güvenliği 27; ayrıca bağımsız preview denetimi.
- CMS/sayfa/dosya/özel önizleme, CSS, RSC prefetch ve middleware-subrequest
  istekleri preview kimliği olmadan 401. Preview provasının DB bağlantısı yok.
- Lint, TypeScript ve production build geçti. Tarayıcıda oluşturma,
  TR/EN, blok sırası/kaldırma, önizleme, kayıt/yayın, taslak ayrımı,
  geri alma/yeniden yayın ve medya ad/gizleme/açma doğrulandı.
- Mobil genişlikler, tablo iç kaydırma, ortak menü ve klavye kontrolleri
  `.local/p06-browser-check-result.json` ile ekran görüntülerinde kayıtlı.
- Migration `20261005235000_cms`: dört yeni CMS tablosu; önceki kayıtlar korunur.
- Final checkpoint `.recovery/P06-20261005-final`: kaynak bundle/arşiv,
  özel ortam/test kanıtları ve yerel DB. Ayrı geçici yerel DB'ye tam geri
  yükleme ile 27 tablonun satır/SHA-256 değerleri karşılaştırılır.

Next.js/eslint-config-next 16.3.6 ve Sharp 0.35.5'e yükseltildi; pdf-lib
1.17.1 sabitlendi. Next güncellemesinin güvenlik gerekçesi
[resmî sürüm kaydında](https://github.com/vercel/next.js/releases/tag/v16.3.6)
bulunur. Npm audit kritik bulgusu 0; Next, Sharp ve pdf-lib için bulgu yok.
Mevcut diğer bağımlılık ağacında 15 yüksek, 2 orta, 1 düşük bulgu devam eder
(Prisma araçları, e-posta ve geliştirme/ayrıştırma bağımlılıkları dahil).
Bu paket tüm bağımlılık denetimini temizlediğini iddia etmez. Ayrıntılı
özel çıktı `.local/p06-audit.json`; uzak yayından önce ayrı değerlendirilmelidir.

Canlı checkout, gerçek veritabanı, gerçek e-posta ve uzak dağıtım değiştirilmedi.
