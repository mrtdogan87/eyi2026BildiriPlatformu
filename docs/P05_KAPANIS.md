# P05 — Ortak ön yüz, tema ve ana sayfa

05.10.2026 · Bağımsız `v2/` checkout, sentetik yerel veriler.

## Tamamlanan davranış

Kongre ana sayfası, başvuru ve kayıt ekranları ortak kurum başlığı, kongre
kimliği, TR/EN seçimi, menü ve alt bilgi kullanır. Ana sayfada büyük başlık,
giriş, tarih/yer, iki çağrı butonu, kongre hakkında, açık katılım hizmetleri,
önemli tarihler ve isteğe bağlı iletişim bölümü bulunur. Etkinlik adı ve
tarihleri seçili kongreden alınır; yeni kongrelere eski EYİ yılı/adı atanmaz.
Son teslimi kapanmış bildiri butonu taslak/süreli izin erişimini belirtir.
Bildiri/kayıt kapalıysa ilgili menü ve butonlar gizlenir; tema ve içerik korunur.

EYİ akademik tema ve sade alternatif, aynı ortak bileşenleri kullanır.
Görsel referansın lacivert kurum başlığı, açık gezinme alanı, renkli vurgu
ve geniş ana görsel yaklaşımı yeniden yorumlandı. Referans:
[resmî EYİ 2026 sitesi](https://eyi2026-iibf.mcbu.edu.tr/), 05.10.2026.
Üniversite logosu, tarihleri ve tarihsel metinler yeni kongrelere kopyalanmadı.
Varsayılan logo ve ana çizim kodla oluşturulan özgün geometrik SVG'dir;
yüklenmiş görsellerin yerine kullanılan dekoratif çizim erişilebilirlik
ağacına gereksiz içerik eklemez.

`/admin/site-gorunumu` seçili kongrenin kısa adını, üst/ana başlığını,
giriş/hakkında/yer metnini, iletişim e-postasını, logo/görsel açıklamalarını,
temasını, rengini ve en fazla iki butonunu düzenler. TR/EN kısa metin alanları
ve renk önizlemesi bulunur. Buton kongrenin kendi başvuru/kayıt alanına,
ana sayfa bölümüne veya açıkça girilen HTTPS adresine gidebilir.
Boş ana başlık kongre adını, eksik çeviri mevcut diğer dildeki metni kullanır.
Metinler düz metin olarak kaçışlanır; HTML çalıştırılmaz. Tema/vurgu rengi
P04 kongre yapılandırmasıyla ortak kalır. Beyaz buton yazısı için renk
kontrastı en az 4.5:1 olacak şekilde gerektiğinde koyulaştırılır.

## Görseller ve erişim

Logo ve ana görsel iki ayrı kongre alanıdır. PNG/JPEG/WebP, en fazla 5 MB
ve 24 milyon kaynak piksel kabul edilir. Dosya gerçekten çözülür, yönü
normalleştirilir, logo en fazla 800×800 ve ana görsel en fazla 2400×1600'e
küçültülür; metadata taşımayan WebP olarak ayrı yerel DB tablosunda saklanır.
SVG/HTML, bozuk içerik, büyük dosya ve eski sürüm reddedilir. Yayınlanmış
logo/ana görsel kongre adresi ve sabit alan adıyla halka sunulur; başvuru,
dekont veya başka özel dosyanın kimliği bu uçtan okunamaz. Görsel dosya adı
ve editör iç bilgileri halka açık sayfaya aktarılmaz.

Organizatör, kurum organizatörü ve platform yöneticisi kendi yetkili
kongre bağlamında yönetebilir. Sekreter ve içerik editörü dahil diğer roller
bu ayar ekranına erişemez; CMS editör rolü P06 kapsamındadır. Görsel gizlemek
veriyi silmez; aynı görsel yeniden açılabilir. Yeni yükleme o alanın mevcut
görselinin yerini alır; sürümlü medya kitaplığı bu paketin kapsamı değildir.
Metin değişiklikleri önce kaydedilir; kaydedilmemiş metin/tema varken görsel
kontrolleri kapanır. Ayar, yükleme ve görünürlük değişiklikleri audit'e yazılır.

`siteVersion` eşzamanlı metin/görsel güncellemelerini; ortak `configVersion`
kongre ayarları ile tema editörünün eski renkleri ezmesini engeller. Yeni yıl
kopyası metin, iletişim, logo ve ana görseli kendiliğinden yayımlamaz. Yalnız
metin değiştirmek legacy `configuration=null` kongrenin sürecini dönüştürmez.

## Doğrulama ve geri dönüş

ESLint, TypeScript ve üretim derlemesi başarılı. 7 site yapılandırma,
26 P05 HTTP/DB, 9 kongre yapılandırma, 29 P04 entegrasyon, 15 mevcut akış,
19 P03 yetki/izolasyon ve 27 ortam koruması kontrolü geçti (132 toplam).
Preview kapısı yeni site ayar/görsel uçları dahil sayfa/API/dosya/CSS
isteklerini kimlik doğrulamadan engelledi; bu prova uzak DB'ye bağlanmadı.
Client bundle'da Prisma/yerel ortam denetimi bağımlılığı bulunmadı.

Üretim tarayıcısında TR/EN içerik/başlık/dil, ilk Tab ile içeriğe geç ve Enter
ile ana içerik odağı, mobil menü Enter/Escape/odak dönüşü, 360/390/768/1440
pikselde yerleşim, bildiri ekranı ortak başlığı ve panel kaydetme akışı
kontrol edildi. Kanıtlar `.local/site-check-result.json`,
`.local/p05-browser-check-result.json`, `.local/p05-home.png`,
`.local/p05-mobile.png` ve `.local/p05-editor.png` içindedir.

Migration `20261005224000_site_theme` yalnız izole yerel DB'ye uygulandı.
P05 öncesi kaynak/env/DB root `.recovery/P05-before-20261005` altında;
P05 sonu kaynak bundle/tar, dump, özel dosyalar ve kanıtlar
`.recovery/P05-20261005-final` altında tutulur. Son dump ayrı geçici yerel
DB'ye tamamen geri yüklendi; 23 tablonun satır sayısı ve SHA-256 parmak izi
eşleşti. Önceki sürüme dönüş kaynak ve aynı checkpoint DB dump'ını birlikte
kullanır; kolonları elle silmek geri dönüş yöntemi değildir.

## Sonraki paket

P06: bloklarla CMS sayfaları, medya kitaplığı, TR/EN sayfa eşleştirme,
taslak/önizleme/yayın ve sürümden geri dönme. P05 kısa ana sayfa metinleri
bu CMS işlevlerinin tamamlandığı anlamına gelmez. Tam menüler ve tarihsel
referans içerik aktarımı P07'de, uzak v2 yayını adres/proje seçimiyle yapılır.
