# P07 — Başlangıç sayfaları, menüler ve kontrollü EYİ aktarımı

06.10.2026 · `codex/v2-p07` · Bağımsız v2, sentetik yerel ortam.

## Tamamlanan davranış

Planın 5.1 bölümünü karşılayan 41 genel sayfa taslağı yeni kongre/yıl
oluşturulurken eklenir. Ana sayfa P05 editöründe yönetilir ve CMS listesinden
ulaşılır. Davet, tema, slogan, afiş, kurullar, program, yazar bilgileri,
TR/EN şablonlar, kitaplar, yayın olanakları, genel bilgiler, gezi, şehir,
sponsorluk, galeri, iletişim, duyuru/haber/etkinlik ve arşivleri kapsanır.
TR/EN başlıklar hazırdır; içerik boştur, İngilizce kapalıdır ve menüye çıkmaz.
Eksik içerik yayımlanamaz. Gerçek tarih, kişi, ücret, IBAN veya yayın vaadi
varsayılmaz. CMS modülü yeni kongrede kendiliğinden açılmaz.

Eski kongrede “Eksik başlangıç sayfalarını ekle” mevcut sayfa, arşiv veya
adresleri değiştirmeden eksikleri oluşturur. Yeni yıl kopyasında yalnız
genel iskelet oluşturulur; önceki CMS içerikleri, tarihsel arşiv, medya,
eski adresler ve CMS açılışı kopyalanmaz.

Menü etiketi TR/EN halka açık başlıktan ayrı düzenlenir; boşsa başlık
kullanılır. İç düzenleme adı panelde kalır. Üst menü sayfası ve sıra ile
üç düzeye kadar menü oluşturulur. Döngü, eksik üst sayfa ve dördüncü düzey
reddedilir. Yayın kontrolü yayımlanmış üst sayfa ister. Gizli, arşivlenmiş
veya yayımlanmamış üst sayfanın çocukları menüden çıkar; kendi yayını açık
çocuk doğrudan adresinden erişilebilir. Masaüstü/mobil ve klavye menüsü
aynı ağacı kullanır; Escape alt menüyü kapatır, bağlantı seçimi menüyü kapatır.

Çoğaltma mevcut taslaktan yeni, menüye kapalı taslak oluşturur. Adres
değiştirme eski adresi kongreye ait bir alias olarak korur; yayın açıkken
308 ile güncel adrese yönlenir. Alt menü ve sayfa düğmelerinin eski hedefleri
aynı sayfaya çözülür. Sayfa/alias adres çakışmaları engellenir. Arşivleme
halka açık sayfayı, alias erişimini ve yalnız o yayına bağlı dosyaları kapatır;
veri ve sürümler korunur. Arşivden çıkarma tekrar yayın gerektirir.

CMS değişiklikleri kongreye göre işlem kilidi ve sürüm denetimi kullanır;
eşzamanlı karşılıklı üst menü değişikliği döngü oluşturamaz. İşlemler aktör,
kongre ve sürüm geçmişine yazılır. P06 yetki, özel önizleme ve dosya erişim
kuralları sürer; kongre dışı sayfa/medya kimlikleri kullanılamaz.

## EYİ 2026 referans aktarımı

Resmî [EYİ 2026 kaynağı](https://eyi2026-iibf.mcbu.edu.tr/) 5 Ekim 2026'da
salt okunur HTTPS ile yakalandı. Canlı yönetim paneli veya kaynak CMS kodu
kullanılmadı. [Kaynak envanteri](P07_KAYNAK_ENVANTERI.md) her hedefi ve dosyayı
kaynak adresiyle gösterir.

- 40 kaynak hedefi: 38 erişilebilir, 2 eksik (`/Iletisim`, `/Arsiv/3/101`).
- 30 dosya: 22 görsel, 4 PDF, 4 DOTX. Kaynak ve saklanan SHA-256 kayıtlıdır.
- 749 kaynak metin öğesi ve 84 tablo hücresi derlenmiş içerikle karşılaştırıldı.
- PDF programı 13, özet kitabı 175, kabul listesi 6, Manisa tanıtımı 17 sayfa.
  Tüm metinler okunup ilk sayfalar görsel olarak kontrol edildi. TR/EN özet
  ve tam metin şablonlarının XML içeriği yazar bilgileriyle karşılaştırıldı.

Aktarım ekranı kaynakları, eksikleri ve dosya özetlerini gösterir. Kullanıcı
kaynakları seçip tarihsel içerik uyarısını doğrular. Yalnız dondurulmuş,
doğrulanmış dosyalar kongrenin kendi CMS depolamasına kopyalanır; işlem
anında kullanıcı adresinden veya uzak kaynaktan dosya indirilmez. Başarısız
kaynak seçilemez; bilinmeyen kaynak ve dosya yolu kabul edilmez. Tekrar
aktarım mevcut sayfa ve medyayı korur; kullanıcı değişikliklerini ezmez.
Üretim standalone paketinde 30 kaynak dosyanın yer aldığı doğrulandı.

Sayfalar `eyi-2026-` adresi, tarihsel iç ad ve belirgin arşiv uyarısıyla
menüye kapalı taslak olarak oluşturulur. Kongrenin tarihleri, ücretleri,
banka bilgileri, rolleri, modülleri ve ana sayfası değişmez. Eski başvuru
formları/oturum bağlantıları süreç olarak etkinleştirilmez; özgün bağlantılar
kaynak manifestinde korunur ve resmî kaynak sayfasına bağlantı sunulur.
Kaynak TR içeriktir; İngilizce çeviri üretilmez. Galeri/etkinlik için kaynakta
olmayan içerik, henüz bulunmayan tam metin kitabı veya yayın garantisi eklenmez.

Kaynak yakalama, dosya doğrulama ve belge derleme betikleri kayıtlıdır.
`routes.json` gözden geçirilmiş adres eşlemesini tutar. Uzun listeler metin
öğesi sınırında bölünür; kaynak metni/table hücresi kaybı derlemeyi durdurur.
Özgün HTML ve ayrıntılı karşılaştırma kanıtları özel yerel kurtarma kaydındadır.

## Word şablonları ve dosya sınırları

DOCX/DOTX kitaplığa yüklenip Dosya bağlantısı bloğunda kullanılabilir.
Gerçek OpenXML ana belge türü ile MIME eşleşmesi kontrol edilir. ZIP merkez
dizini açılmadan önce dosya/adet/boyut/genişleme oranı sınırları uygulanır;
CRC, gerekli XML, yol geçişi, şifreleme, makro, ActiveX, gömülü nesne,
DOCTYPE/entity ve dış içerik ilişkileri kontrol edilir. Dış hyperlink
ilişkisi kabul edilir; dış resim/şablon gibi içerik yüklemeleri reddedilir.
Bu doğrulama antivirüs hizmeti değildir. PDF ve Word özgün baytlarla,
görseller metadata kaldırılarak WebP olarak saklanır.

P06'nın 8 MB yükleme, 24 milyon kaynak pikseli, 2400×2400 çıktı ve
1–200 sayfalı şifresiz PDF sınırları sürer. Word'de en fazla 300 ZIP girdisi,
10 MB tek girdi ve 30 MB toplam açılmış içerik kabul edilir. Dosyalar sabit
indirme adı, no-store, nosniff ve sandbox başlıklarıyla sunulur. Özgün/iç
dosya adı halka açık indirme adına taşınmaz. Bir dosya yalnız aktif CMS ve
aktif, güncel yayımlanmış sayfa referansı olduğunda halka açılır.

## Doğrulama ve kurtarma

P07: 9 saf test + 34 gerçek HTTP/DB senaryosu. Önceki paketlerle 218 kontrol:
P06 43, P05 33, P04 38, P03 19, smoke 15, ortam güvenliği 27; ayrıca preview
kapısı. Yetki/kongre ayrımı, idempotent iskelet/aktarım, eksik kaynaklar,
medya özetleri, özel/yayımlanmış dosya erişimi, yeni yıl ayrımı, alias,
arşiv/geri çıkarma, eşzamanlı menü döngüsü ve Word taklitleri kontrol edildi.
Lint, TypeScript ve production build geçti.

Tarayıcıda çoğaltma, bağımsız başlık/menü etiketi, üst menü/sıra, kayıt/yayın,
eski adres yönlendirmesi, arşiv/geri çıkarma/yeniden yayın ve tekrar aktarım
kontrol edildi. Mobil 390 px ve masaüstü görünümünde üç düzeyli menü,
TR/EN, klavye ve kaynak özetleri doğrulandı. Kanıtlar `.local` içinde.

Migration `20261005235900_cms_templates` tek alias tablosu ve ek CMS alanları
oluşturur; mevcut P06 belgeleri varsayılan menü alanlarıyla okunur. Önceki
veri korunur. Final checkpoint `.recovery/P07-20261006-final` kaynak bundle/
arşivi, özel ortam/test kanıtları ve yerel DB'yi tutar. Ayrı geçici yerel DB'ye
tam geri yükleme ile 28 tablonun satır/SHA-256 değerleri karşılaştırılır.
Önceki paket yedeklerine yazılmaz.

Dinamik kişi/kurul/program kayıtları P08'e aittir. Zamanlanmış yayın ve
sonraki iş akışları bu pakette tamamlandı sayılmaz. Uzak v2 deneme yayını
ayrı ortam seçimini bekler. Canlı checkout, gerçek DB, gerçek e-posta ve
uzak dağıtım değiştirilmedi. P06 bağımlılık denetiminin kalan bulguları
ayrıca değerlendirilmelidir; P07 yalnız JSZip 3.10.1'i doğrudan sabitler.
