# P12 — Ödeme doğrulama ve banka ekstresi eşleştirme

**Durum: Tamamlandı — yerel kabul ve kurtarma doğrulaması.**
**Tarih: 06.10.2026.** Dal: `codex/v2-p12`. Başlangıç: P11 `42e4a4c`.
Gerçek banka işlemi, gerçek e-posta gönderimi veya canlı/uzak ortam değişikliği yapılmadı.

## Kayıt ve ödeme ayrımı

Kongre panelindeki **Ödeme doğrulama ve banka ekstresi** ve kayıt detayındaki
**Ödeme doğrulama** alanı kullanılır. Platform yöneticisi, ilgili kongrenin
organizatörü ve sekreteri okuyabilir ve işlem kaydedebilir. Diğer roller banka
verisini, kanıt dosyasını veya doğrulama API'sini kullanamaz.

Dekont bekleniyor, dekont alındı/doğrulanmadı, kontrol bekliyor, doğrulandı,
eksik ödeme, fazla ödeme, davetli/muaf, kısmi iade, tam iade ve ücret yok ayrı
sonuçlardır. Kayıt tarifesi, doğrulanan toplam ödeme, yapılmış iade, net ödeme
ve tarifeden fark ayrı gösterilir. Tutarlar TRY/EUR/USD için tam sayı kuruş
biriminde hesaplanır; ondalık kayan noktayla para hesabı yapılmaz.

Eski `Registration.paidAt` dekont kayıt tarihi olarak korunur. Geçmiş satırlar
otomatik doğrulanmaz; katılımcının dekont dosyası banka kanıtının yerine geçmez.
Yönetici kayıt/bildiri listeleri ile kayıt portalındaki eski “ödendi” etiketi
kayıt/dekont anlamına düzeltildi. Eski API alan adları ve tarih filtreleri
uyumluluk için korunur; ödeme onayının kaynağı yeni ödeme geçmişidir.
Kayıt portalı zaten kayda bağlanmış bildiriyi dekont tarihi boş olsa da yeniden
kaydettirmez. Bildiri kararı, program ve belge uygunluğu ödeme onayıyla değişmez.

## Elle doğrulama, iade ve düzeltme

Elle ödeme doğrulaması ve yapılmış iade; banka işlem referansı, gerçekleşmiş
banka tarihi, pozitif tutar, kaydın aynı para birimi ve en fazla 2 MB gerçek
PDF/JPG/PNG içerikli kanıt ister. Yetkili kullanıcı dosyanın kaynağını ve
ödemenin gerçekten hesaba geçtiğini inceleyip açık onay verir. Dosya imzası ve
SHA-256 içerik bütünlüğünü destekler; bankanın gerçekliğini otomatik doğrulamaz.

Her işlem 8–2000 karakter gerekçe, aktör, işlem tarihi ve kayıt anındaki
email/tarife/dekont özetini korur. Muafiyet sıfır ödeme üretir; eski tarife
silinmez. Para bulunan kayda muafiyet eklenemez, muaf kayda para sayılmadan
önce muafiyet gerekçeyle kaldırılır. Kısmi ödemeler birikir; fazla tutar
ayrıca görünür. İade doğrulanmış net tutarı aşamaz. Bu paket banka transferi
veya otomatik iade yapmaz; iptal/geri çekme talebi iade kanıtı değildir.

Yanlış işlem silinmez: **geçersizleştirme** ona bağlı yeni geçmiş satırı ekler.
İade edilmiş tutarın altına düşüren ödeme iptali ve parayla çelişen muafiyeti
yeniden etkinleştiren düzeltme reddedilir. Hatalı ekstre eşleştirmesi bu şekilde
geçersizleştirilip doğru kayda yeniden onaylanabilir; ilk onay ve kanıt korunur.
Ödeme geçmişi bulunan kayıt kalıcı silinemez; arayüzde silme formu yerine
koruma açıklaması gösterilir. Katılımcı yalnız kendi durum ve toplamlarını
görür; ekip gerekçesi, banka referansı, ekstre, kanıt ve aktör kimliği paylaşılmaz.

## İlk ekstre biçimi: UTF-8 CSV

P12'nin uygulanmış standart biçimi **virgülle ayrılmış UTF-8 CSV**'dir.
Doğrudan XLSX okuyucu yoktur; Excel'deki banka verisi bu sütunlarla UTF-8 CSV
olarak dışa aktarılır. Bankaların kendi farklı başlık/ondalık biçimleri için
sütun eşleme arayüzü bu ilk sürümde yoktur. Şablon korumalı ekrandan indirilir.

Sütunlar aynı sırada ve başlıkları birebir olmalıdır:

```csv
transaction_id,date,amount,currency,description,payer_email,registration_id
TX-2026-001,2026-10-01,1250.50,TRY,Kongre kayıt açıklaması,kisi@example.invalid,kayit-kimligi
```

- En fazla 2 MB, 500 hareket. UTF-8 BOM, çift tırnakla kaçış, açıklamada virgül
  ve satır sonu desteklenir. Hatalı/boş satır sessizce atlanmaz; tüm dosya reddedilir.
- `transaction_id` hesabın kalıcı, benzersiz banka referansıdır; `date` gelecekte
  olmayan geçerli YYYY-MM-DD, `amount` pozitif noktalı ondalık ve binlik ayırıcısız,
  `currency` TRY/EUR/USD'dir. Sadece hesaba geçmiş ödeme hareketleri yüklenir;
  debit/iade satırları yüklenmez, yapılmış iade ayrı kanıtla elle kaydedilir.
- `payer_email` ve `registration_id` boş olabilir. Tam kayıt kimliği, tam
  e-posta veya en az sekiz karakterli tam havale açıklaması öneri üretir.
  İsim ya da tutar tek başına eşleştirme değildir. Çoklu kayıt, çelişen kimlik,
  para birimi veya tutar farkı ayrıca gösterilir. **Tekil öneri de otomatik onaylanmaz.**
- Kullanıcı banka hesabına sabit bir anahtar verir (ör. `kongre-try-01`).
  Aynı hesabı tüm dosyalarda aynı anahtarla, farklı hesapları farklı anahtarla
  yüklemelidir; hesabın bankayla otomatik bağlantısı yoktur. Aynı dosya tekrar
  yüklenirse yeni satır eklenmez. Örtüşen dosyalar yalnız yeni referansları ekler.
  Aynı hesap/ref farklı tarih, tutar veya içerikle gelirse bütün import durur.
- Ekstre onayında tutar/tarih/para birimi saklanan hareketten alınır; istemci
  değiştiremez. Aynı hareketin iki kayda eşzamanlı onayında bir işlem kazanır,
  diğeri 409 alır. Elle kullanılan banka referansı da aynı türde, kongre içinde
  iki kez aktif sayılamaz. Kaynaklar arasında referansları farklı yazmak veya
  aynı banka hesabına farklı anahtar vermek otomatik tespit edilemez; ekip kontrolü gerekir.

Hareketler 100'lü sayfalarda, son 100 ekstre kaydıyla gösterilir. İlk sürüm
bir kongrede en fazla 5000 kayıt üzerinden öneri sunar; bu sınır aşılırsa
hata verir, eksik aday listesinden güvenilir eşleşme varmış gibi davranmaz.

## Yetki, modül ve işlem güvenliği

API bağlamı sunucunun oturumundan gelir; istemci aktör/kongre atayamaz.
Banka dosyaları ve ek kanıtlar ilgili kongre yetkisiyle özel/önbelleksiz,
`nosniff` ve ek dosya indirmesi olarak sunulur. Başka kayıt üzerinden kanıt
indirmek reddedilir. Mutation formu akıştan ölçülür, en fazla 3 MB'dir;
proxy tamponunun daha büyük olması bu sınırı kaldırmaz. Çapraz kaynaklı
istekler yazmadan önce reddedilir.

Kongre kilidi, sürüm kontrolü, banka hareketi tekilliği, kayıt güncellemesi ve
audit aynı transaction'dadır. Modül kapanışı, kilitten sonra tekrar kontrol
edilir; önceden yetki kontrolünü geçmiş bekleyen onay da yazamaz. P11'in
ilişkili kayıt e-posta düzeltmesi ödeme inceleme sürümünü artırır; eski ekstre
incelemesi yeni kimliği sessizce onaylayamaz. Geçmiş para kayıtları korunur.
Kapalı kayıt modülü import, onay, okuma ve kanıt API'lerini durdurur; veri silmez.

## Modül sınırı ve doğrulama

`src/modules/payments` tutar/durum/ledger kuralları, CSV ve öneri çekirdeğidir.
`src/integrations/congress/payments` kayıt, izin, dosya ve audit bağlamını bağlar.
Kongre/Prisma/mail/CMS olmadan çalışan ücretli workshop örneği birim testinde
aynı çekirdekle doğrulanır. Ayrı ticari dağıtım ya da gerçek banka bağlantısı
bu örneğin kapsamı değildir.

**523 otomatik kontrol** geçti: 153 birim (24 yeni ödeme çekirdeği),
370 yerel HTTP senaryosu (49 P12, 43 P11, 37 P10, 46 P09, 195 önceki paketler).
Ayrı **62 preview koruması** kontrolü DB bağlantısı olmadan geçti.
Lint, TypeScript ve üretim derlemesi başarılıdır. DB/Prisma şema karşılaştırması temizdir; eski ücret indeksinin mevcut özel adı Prisma map alanına yazılarak korunmuştur. Tarayıcı kanıtı `.local/p12-*`
dosyalarında; tam ödeme, yeniden inceleme, bağlı geçmiş düzeltmesi, ekstre
belirsizliği, katılımcı görünürlüğü ve 390 piksel ekran kontrolünü kapsar.
Tüm finansal veriler sentetiktir; gerçek banka formatı/gerçek hesap henüz denenmedi.

Paket öncesi `P12-before-20261006` yedeğinde 47 tablo geri yükleme ve parmak
iziyle doğrulandı. Additive `20261006190000_p12_payment_verification` migration'ı
`PaymentEvent`, `BankStatement`, `BankTransaction` tablolarını ve kayıt inceleme
sürümünü ekler; eski tarihlerden veri üretmez. Toplam **21 migration, 50 tablo**.
Final `../.recovery/P12-20261006-final` kaynak/Git bundle, özel yerel dosyalar,
capture mail, DB dump ve test/tarayıcı kanıtını korur. Tam restore sonrası 50
tablonun satır sayısı ve sıralı içerik SHA-256 değerleri birebir karşılaştırılır.
Özel dosyalar 0600, checkpoint klasörü 0700; geçici restore DB'si kaldırılır.
Sıradaki paket **P13 hakemlik**tir.
