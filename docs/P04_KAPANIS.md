# P04 — Kongre kurulumu ve süreç yapılandırması

05.10.2026 · Yalnız bağımsız `v2/` checkout ve sentetik yerel veriler.
Canlı uygulama, üniversite sitesi, uzak veritabanı ve gerçek e-posta gönderimi
bu pakette değiştirilmedi. Kaynak plan başka sohbette tutulur; yalnız v2
uygulama takip kopyası güncellendi.

## Tamamlanan davranış

`/admin/kongre-olustur` kurum, yeni adres, ad/yıl, etkinlik tarihleri,
TR/EN form dilleri, EYİ/sade tema ve vurgu rengiyle kongre oluşturur.
Bildirili, yalnız özet/ücretsiz, kayıt odaklı/ücretsiz ve özel profiller
başlangıç seçenekleridir. Bildiri ve kayıt modülleri; özet, tam metin,
sunum bilgileri ve ücret/dekont aşamaları ayrı ayarlanır. Alanlar gizli,
isteğe bağlı veya zorunlu seçilir. Son gözden geçirme ekranı menü, form,
aktif aşama, asgari bilgi, tarifeler ve ekip kopyalama sonucunu gösterir.

Bildiri için başlık, yazar adı/e-postası ve tek sunan yazar her zaman
zorunludur. Sunucu yapılandırmayı yeniden doğrular; ücretli bildiri kaydı
sunum şekli ve akademik statü olmadan açılamaz. Yeni alan gereksinimleri
formda ve gönderim API'lerinde uygulanır. Kapalı aşamanın alanları ve
son tarihi kullanılamaz. Modül kapatılması aşama ayarlarını/verileri korur.

`/admin/kongre-ayarlari` seçili kongrede çalışır; modüller kapalıyken de
organizatör tarafından kullanılabilir. `configVersion` ile eski ekranın
ayarları ezmesi engellenir. Tarifeler mevcut `/admin/ucretler` ekranında
düzenlenir; yapılandırma ekranı tarifeleri sessizce değiştirmez. İlk
kurulumda erken/geç akademik, öğrenci ve dinleyici tarifeleri aynı girilen
tutardan açılır; ikinci bildiri ve çevrim içi dinleyici mevcut ücretsiz
kurallarını izler. Ayrıntılı farklı dönem tarifeleri Ücretler ekranındadır.

Ödeme aşaması kapalıysa kayıt tutarı, saklı tarifeler pozitif olsa bile,
sunucuda sıfırdır. Banka ve dekont alanları katılımcıya açılmaz. Dekont
isteğe bağlıysa pozitif tutarda belgesiz kayıt mümkündür; zorunluysa
belge aranır. Öğrenci belgesi gizli/isteğe bağlı/zorunlu olabilir; zorunlu
seçimi bu aşamada bütün kayıtlara uygulanır. Ücret/dekont aşamasının ayrı
son tarihi yeni ücretli kaydı durdurur. Ödeme teyidi muhasebesinin mevcut
semantiği P12 kapsamında ayrıca geliştirilecek; bu paket ödeme onayı
ürünü değildir.

## Yıl şablonu ve erişim sınırı

Şablon kaynakları yalnız kullanıcının ayar yönetme yetkisi olan kongrelerdir.
Yeni kongre aynı kurumda oluşturulur. Kongre organizatörü veya kurum
organizatörü kendi kurumunda oluşturabilir; platform yöneticisi kurum
seçer. Sekreter ve diğer roller bu işlemleri yapamaz.

Kaynak yapılandırma alınırken tüm aşama son tarihleri temizlenir. Kaynak
etkinlik tarihleri ve banka bilgileri API önizlemesine alınmaz; yeni
etkinlik tarihleri zorunludur. Tarifeler ayrıca seçilirse yalnız tarife
alanları yeni kimliklerle kopyalanır. Aktif kongre üyeleri tek tek seçilip
sonuç ekranında gözden geçirilir; kurum ve platform rolleri aktarılmaz.
Oluşturan kişinin kongre organizatörlüğü ayrıca açılır. Başvurular, kayıtlar,
dosyalar, tokenlar, teslim istisnaları ve eski işlem geçmişi taşınmaz.
Geçersiz ekip seçimi bütün oluşturma işlemini geri alır.

## Teslim istisnası

`/admin/teslim-istisnalari` yetkili organizatöre kişi e-postası, isteğe bağlı
taslak kimliği, özet/tam metin aşaması, gerekçe ve gelecekteki bitiş tarihi
ile izin verir. Taslak kimliği aynı kongrede ve aynı kişiye ait olmalıdır.
İzin kaydı, veren kişi ve geri alma işlemi audit geçmişinde bulunur.
Süresi dolmuş/geri alınmış izin çalışmaz; kapalı modül veya aşamayı açmaz.
Genel süre bütün katılımcılar için kapalı kalır. İzin kabul veya gönderim
kararı oluşturmaz.

Özet izni bildiri bilgilerini/yazarları düzenleme süresini açar. Tam metin
izni yalnız dosya teslimine uygulanır; kapanmış özet alanları değiştirilemez.
Zorunlu tam metin varsa son teslim bu aşamanın süresini izler ve önceki
kaydedilmiş başlık/özet/yazar gereksinimleri yeniden doğrulanır. Tam metin
istemeyen profilde son gönderim özet süresini izler. Manuel genel kapatma
da aşama izniyle aşılabilir; genel kapatma bayrağı değişmez.

Bu pakette teslim izni yeni veya henüz gönderilmemiş taslaklar içindir.
Gönderilmiş/kabul edilmiş bildirinin içerik düzeltmesi ve dosya sürümleme
P10/P11 kapsamındadır. Kayıt yaptırmış fakat bildiri başlatmamış kişiye
kişi kapsamlı izin verilip yeni taslak açılabilir.

Taslak bağlantısı istemek artık bildiri verisi veya giriş çerezi döndürmez.
E-posta bağlantısı doğrulanınca erişim sağlanır. Kimlik doğrulanmadan yapılan
tekrar bağlantı isteği taslağın dilini/içeriğini değiştirmez. Tarayıcıdaki
ücret gösterim yardımcıları veritabanı/ortam korumasından ayrıldı; sunucu
ayarları client bundle'a bağımlılık olarak taşınmaz.

## Doğrulama ve geri dönüş

Üretim derlemesi ve ESLint/TypeScript başarılı.
27 ortam koruması, 9 yapılandırma testi, 29 P04 entegrasyon senaryosu,
15 mevcut bildiri/kayıt akışı ve 19 P03 yetki/izolasyon senaryosu geçti.
Preview sayfa/API/dosya/CSS erişim kapısı DB'ye bağlanmadan yerelde yeniden
sınandı; uzak preview dağıtımı hâlâ bekliyor.

Kurum ve rol reddi, alanların sunucuda gizli/isteğe bağlı/zorunlu davranışı,
dil sınırı, sürüm çakışması, temiz şablon/ekip/ücret aktarımı, işlem geri alma,
isimli ve taslağa bağlı izin, farklı aşama izni, süre dolması, geri alma,
modül kapanması, ücretsiz tutar ve belge gereksinimleri sınandı. Tarayıcıda
kurulum özeti, şablonun tarih temizliği ve ayrı ekip seçimi, yapılandırılmış
özet formunun kaydet/gözden geçir akışı, mevcut taslak başlangıcı ve yeni
panel menüsü üretim derlemesinde ayrıca doğrulandı.

Kanıtlar yalnız `.local/*-result.json`, `.local/p04-*.png` dosyalarındadır.
Özel env, hesap parolaları ve e-posta bağlantıları Git'e yazılmaz. Önceki
paket checkpoint'i ve `.recovery/P04-before-20261005` root altında korunur.
Paket sonu `.recovery/P04-20261005-final` kaynak bundle/tar, yerel DB dump,
özel yerel dosyalar ve doğrulama manifestini içerir. Dump ayrı geçici yerel
veritabanına tamamen geri yüklendi; 22 tablonun satır sayıları ve SHA-256
parmak izleri eşleşti. Geçici DB prova sonrası kaldırıldı.

Migration `20261005193000_congress_configuration` yalnız yerel DB'de
uygulandı. Eski kongrelerin `configuration = null` değeri önceki akışı
korur; gerçek kongreler otomatik olarak yeni profile çevrilmez. P03'e dönüş
P04 öncesi kaynak ve dump birlikte geri yüklenerek yapılır; ek kolonları
elle silmek geri dönüş yöntemi değildir.

## Sonraki paket

P05: ortak ön yüz, tema varlıkları/logo/ana görseller, ana sayfa, mobil ve
klavye doğrulaması. P04'ün tema adı/vurgu rengi desteği bu kapsamı tamamlamaz.
CMS, yapılandırılmış özet, düzeltme/sürümleme, ödeme teyidi, hakemlik,
program ve belgeler kendi sonraki paketlerinde geliştirilir.
