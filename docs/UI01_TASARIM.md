# UI01 — Admin tasarım dili

Kaynak: kök `GELISTIRME_PLANI.md`, Bölüm 17 (07.10.2026). Başlangıç: `5c0ef78`. Uygulama yalnız `v2` admin sunum katmanındadır.

## Ortak düzen

Dar üst çubukta kurum/kongre, tek bağlam seçici ve hesap bulunur. Sol menü görev alanlarını gruplar; telefonda etiketli menü açılır. İçerik başlığı ve konum yolu kaydı tanımlar. Nötr yüzey, tek mavi vurgu, 44 px işlem hedefleri, 3 px odak ve metinle durum kullanılır. Genel stiller `.admin-ui` kapsamında kalır; katılımcı ve halka açık sayfalar kapsam dışıdır.

Listede arama/filtre, sayılan kapsam ve kayıt özeti; detayda özet, ilgili işlem, dosya/geçmiş ayrılır. Uzun çalışma alanları klavyeyle kullanılan sekmelere ayrılır. Sekme değişimi form durumunu korur; kapsam değişimi kaydedilmemiş değişikliği ele alır. Kaydetme, üretme, gönderme, yayımlama ve kapanış ayrı kalır. Gerekçe/onay otomatik doldurulmaz.

## Menü ve ekran eşlemesi

Tam eşleme `src/components/admin-ui/navigation.mjs` içindedir. Genel bakış: panel/iş listesi/talepler/iletişim. Başvurular: bildiriler/hakemlik/ödüller. Katılım: kayıtlar/ödeme/ücret. Program: oturum/etkinlik/yoklama. Web sitesi: CMS/medya/ortak içerik/görünüm/aktarım. Belgeler ve yayın: sertifika/uygunluk/tanıtım/tam metin/kitap/arşiv. Yönetim: ayar/modül/ekip/istisna/geçmiş. Görevlerim: hakem/jüri/başkan/kişisel kayıt. Platform menüsü ayrıca kurum/kongre/kullanıcı/sistem/geçmiş içerir.

`/admin/arayuz-ornekleri` üç sentetik örneği gerçek veri veya API işlemi yapmadan gösterir: genel bakış, kayıt listesi, sertifika akışı. Masaüstü ve 390 px taslak aynı bileşenleri kullanır.

## Kabul durumu

Teknik kontroller her paketin kanıt kaydında tutulur. Kullanıcının kongreyi, bekleyen işi, ana işlemi ve dönüşü açıklamasız bulabilmesi **henüz sınanmadı**. Paket aralarında onay beklememe talimatı gereği taslak sonraki paketlere yayılır; gerçek kullanıcı denemesi ayrı bekler.
