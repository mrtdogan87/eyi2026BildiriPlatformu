# ADR-0001 — Modül sınırları ve ortak temel

**Karar kaydı: P02, 05.10.2026.** Kaynak: ana plan Bölüm 14–15.
P02 altyapısı hazırdır; aşağıdaki modül ayrımı P03 ve ilgili iş paketlerinde
uygulanacak. Bu belge CMS/sertifika/modül seçiminin kodda hazır olduğunu göstermez.

## Yerleşim ve sahiplik

İlk sürüm tek Next.js uygulaması, tek bağımsız v2 PostgreSQL ve ortak admin
kabuğunda çalışacak. Her iş modülünü ayrı sunucuya dağıtmak gerekmiyor.
P03'ten itibaren `src/platform/` ortak temel/adaptörleri,
`src/modules/<module>/` iş kuralları/servis/ekranları,
`src/integrations/congress/` kongreye özel bağlantıları taşıyacak.
Mevcut `src/lib` başvuru/kayıt/ücret fonksiyonları aşamalı taşınacak;
P02'de test edilen akışlar bu sırada kabul örneği olarak korunacak.

| Sınır | Sahip olduğu veri | Ortak temelden aldığı bağlantı |
|---|---|---|
| CMS | Sayfa, blok, menü, taslak ve içerik sürümleri | Kimlik/yetki, bağlam, dil, medya, audit |
| Başvuru/kayıt | Başvuru, yazar, beyan, revizyon ve kayıt | Bağlam, izin, dosya, bildirim |
| Ödeme | Dekont kontrolü, doğrulama, muafiyet, eşleştirme | Kayıt referansı/tarife arayüzü, izin, dosya, audit |
| Değerlendirme | Atama, tur, çıkar çatışması, değerlendirme | Başvuru referansı ve dosya sürümü, izin, bildirim |
| Program | Salon, oturum, görev daveti, yayın sürümü | Kişi/etkinlik arayüzü; başvuru bağlantısı isteğe bağlı |
| Etkinlik katılımı | Kontenjan, kayıt, bekleme listesi | Kişi/etkinlik; ücret/program isteğe bağlı |
| Yoklama | Katılım/görev gerçekleşme kayıtları | Oturum/kişi arayüzü, izin, audit |
| Sertifika | PDF şablonu, alan yerleşimi, belge/sürüm/doğrulama | Dosya, kimlik/bağlam, audit; alıcı listesi veya dış arayüz |
| Ödül | Aday, jüri, ölçüt, puan, nihai karar | Değerlendirme; gerekirse yoklama uygunluğu |
| İletişim | Şablon, kalıcı kuyruk, deneme, teslim hatası | Sağlayıcı adaptörü, bağlam, audit |
| Tanıtım | Davet/afiş şablonu ve üretilmiş sürümler | Etkinlik bilgisi arayüzü, dosya |
| Yayın/arşiv | Tercih, prova, onay, kitap/çıktı sürümü | Başvuru/dosya arayüzü; program isteğe bağlı |

Modül kendi repository'si üzerinden kendi tablolarına yazar. Başka modülün
Prisma tablolarına doğrudan yazmaz; servis sözleşmesi kullanır. Bütün ortak
temel/modül kayıtları kurum-etkinlik bağlamı taşır; bağlamı API istemcisinin
iddiasından almak yerine P03 yetki katmanı doğrular. Birden fazla modülü
etkileyen işlem açık uygulama servisiyle yönetilir; işlem ve bildirim niyeti
aynı transaction/outbox içinde kaydedilir (kalıcı kuyruk P09).

## Ortak arayüzler ve bağımsız kullanım

- Kimlik/yetki: oturum aktörü, bağlam üyeliği ve `authorize(actor, action, context)`.
- Modül kaydı: sürüm, gerekli/isteğe bağlı hizmetler, etkinlikte açılma durumu,
  API ve iş kuyruğu kapıları. UI'de gizlemek tek başına kapatma değildir.
- Dosya: özel/public kapsam, kimlik ve sürümle put/read işlemleri; DB adaptörü
  P02'deki byte depolamayı korur, ileride obje alanı ayrı adaptör olur.
- Bildirim: sürümlü şablon ve alıcı verisiyle enqueue; SMTP/Resend/test
  capture sağlayıcısı modül iş kurallarına sabitlenmez.
- İşlem kaydı: aktör/bağlam/işlem/hedef/gerekçe. Hassas içerik gereksiz yere
  olay payload'ına kopyalanmaz. İş kuyruğu her çalıştırmada modül iznini denetler.
- Olay: `version`, `eventId`, bağlam, oluşma tarihi ve hedef referansı;
  tüketici idempotent olur. Örnek: yoklama uygunluğu sertifika üretim niyeti
  yaratabilir; e-posta gönderimi ayrıca organizatör seçimine bağlıdır.

CMS çalışmak için başvuru/ödeme/hakemlik kurulumunu istemez. Sertifika
çekirdeği PDF ve alıcı/katılım verisiyle çalışır; kongre adaptörü veya
Excel/CSV adaptörü bu veriyi sağlar. E-posta ile dağıtım seçilmişse iletişim
bağlantısı gerekir; yalnız PDF indirme e-posta adresini zorunlu kılmaz.
PDF tasarımının üst alıcı/alt görev alanı başlangıç yerleşimidir; koordinat
ve metin alanları P16A'da kullanıcı PDF'sine göre ayarlanır.

Modül kapatılması veri silmez. Yeni ekran/API/işler kapanır; mevcut belge
doğrulaması ve yayın arşivi ayrı yaşam döngüsü kuralıyla korunur. P04 form
alanları gizli/isteğe bağlı/zorunlu ve aşamalar seçmeli yapılandırılır.
Profil seçimi modülleri açıklamadan otomatik açmaz.

## Paket ve tahmin etkisi

P02 için ek sunucu/DB/dağıtım ürünü kurulması gerekmiyor. P03 ortak bağlam,
izin ve modül kapılarının temeli; P04 seçim/alan/aşama yapılandırması;
P05–P08 bağımsız CMS; P09 bildirim bağlantısıdır. Sonraki modüller bu
sözleşmelerle bağlanacak. P16A bağımsız PDF sertifikayı, P16B yoklama ve
kongre adaptörünü kapsar; P16A için P12/P14 zorunlu değildir.

Kaynak plandaki yeni P16 toplamı 3–5 gün, paket temel toplamı 35,5–58 gün.
Farklı uygulamada kullanım örnekleri ve sözleşme/adapter testleri için
P02 uygulama değerlendirmesi **toplam 2–4 ek geliştirici iş günü** belirsizlik
payıdır: ilk CMS gösterimine yaklaşık 1–2 gün, tam v2'ye 2–4 gün. Böylece
mevcut geçici 40–65 günlük tam v2 aralığı için çalışma risk aralığı
**42–69 gün** olur. Bu bir ölçülmüş hız/teslim sözü değildir; kaynak
planda kapsam ve kesin süre kararı planlama sohbetinde kalır. P03/P06'nın
gerçek bağımsız kullanım sonuçlarıyla yeniden değerlendirilecek.

Her iş modülünün kapanışı başka küçük örnek uygulamaya bağlama, yalnız
gerekli ortak hizmetlerle çalışma ve kapalı API/kuyruk davranışı kanıtı
içerecek. Klasör ayrımı taşınabilirlik kabulü değildir. Ayrı ticari ürün
paketleme ve çok sunuculu servis işletimi mevcut uygulama kapsamına eklenmedi.
