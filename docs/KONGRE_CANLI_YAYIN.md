# Kongre canlı yayın kaydı — 10 Ekim 2026

`https://kongre.stativera.store` yayındadır. Ana adres, ilk kongre oluşturulana
kadar `/admin` giriş sayfasına yönlenir. Coolify'deki `kongre-production`
hizmetinde web, mail worker, CMS worker ve PostgreSQL sağlıklıdır.

## Kurulum

- Çalışan kaynak sürümü `c0c12764b973`; Next.js 16.3.8 / Node 24, Linux ARM64.
- İmajlar `stativera/kongre-web:prod-c0c12764b973-arm64` ve
  `stativera/kongre-tools:prod-c0c12764b973-arm64`.
- Mac'teki ayrı Linux ortamında derlenen ve doğrulanan imajlar sunucuya
  aktarıldı. Sunucuda build yapılmadı. Arşivin SHA256 özeti, boyutu, gzip
  bütünlüğü ve yüklenen platform manifest/config özetleri eşleşti.
- Coolify **Docker Compose Empty** hizmeti hazır imajları kullanır.
  Uygulama imajlarında `pull_policy: never`; GitHub'a push tek başına canlı
  imajı değiştirmez. Yeni sürüm için yeni imajlar üretilip aktarılmalıdır.
- Ayrı DB/kullanıcı `aibildiri_v2_production`, ayrı kalıcı volume ve ayrı ağ
  kullanılır. Host'a DB veya uygulama portu açılmadı; HTTPS proxy web'e 3000
  portundan ulaşır. Eski uygulama ağına bağlantı kurulmadı.
- 39 migration açık kurulum onayıyla uygulandı. İlk yönetici, kullanıcının
  doğruladığı kimlikle aktarıldı; mevcut parola özeti birebir korundu.
  İlk durumda bir yönetici, sıfır kongre ve sıfır e-posta kaydı vardır.
- Migration ve bootstrap ayrı profillerdedir; normal başlangıçta çalışmaz.
  Coolify'de bu iki tek seferlik işin `Exited` görünmesi beklenir.

## Canlı doğrulama

| Kontrol | Sonuç |
|---|---|
| HTTPS sertifika doğrulaması | Başarılı; TLS doğrulaması kapatılmadı |
| `/api/health` | HTTP 200, `status: ok`; DB sorgusu başarılı |
| `/admin` | HTTP 200; tarayıcıda giriş formu ve görünüm doğrulandı |
| HTTP adresi | HTTPS adresine yönleniyor |
| Oturumsuz yönetim API erişimi | HTTP 401 |
| Web / iki işçi / DB | Dördü de sağlıklı; Coolify genel durumu `Running (healthy)` |
| SMTP | Sunucudan ve çalışan mail worker'dan TLS ve hesap doğrulaması başarılı |
| Eski EYI sayfası | `https://bildiriyonetim.stativera.store/eyi-2026` HTTP 200 |

Gerçek hesaba parola girerek canlı giriş işlemi yapılmadı. Hesabın aktif
yönetici olduğu ve aktarılan kimlik/parola özetiyle eşleştiği DB'den doğrulandı;
aynı imajların izole ortamındaki sentetik giriş kontrolü daha önce geçti.
Gerçek e-posta gönderilmedi; SMTP doğrulaması teslimat denemesi değildir.

## Yedekleme ve geri dönüş

- Coolify'de yeni DB için günlük **03.15 Türkiye saati** yedeklemesi etkin.
  Sunucu UTC kaldı; yalnız yeni yedek kaydında UTC 00.15 zamanlaması kullanılır.
- Son **14 başarılı yerel yedek** saklanır. Diğer DB yedekleri değiştirilmedi.
- İlk custom-format PostgreSQL yedeği 285.681 bayttır. Ayrı, ağa kapalı,
  geçici PostgreSQL 16 ortamında geri yüklendi. **102 tablonun sayıları ve
  39 tamamlanmış migration eşleşti.** Geçici kaynaklar temizlendi.
- İlk geri yükleme denemesinde doğrulama betiğinin tamponlu dosya okuması,
  alt sürece yanlış dosya konumu aktardı. Tamponsuz okuma ile düzeltildi;
  aynı yedek başarıyla geri yüklendi. Canlı DB ve yedek değiştirilmedi.
- Yedekler şu an sunucudadır. Mac'e ek kopya aktarımı otomatik onay incelemesi
  tarafından ayrı hedef onayı gerektirdiği için durduruldu; açık kullanıcı
  onayı beklenmektedir. Sunucu dışına kopyalandığı iddia edilmez.

İleride sürüm geri dönüşünde yalnız uygulama etiketini değiştirmek şema
uyumunu garanti etmez. Önce o sürüme uygun DB yedeğini ayrı ortamda doğrulayın;
gerekirse yeni hizmetin DB'sini kontrollü olarak geri yükleyin. Eski EYI
kaynaklarını veya volume'lerini kullanmayın; `down -v` uygulamayın.

## Erişim ve kaynak kaydı

Kurulum için verilen geçici SSH anahtarı sunucudan kaldırıldı; yeni bağlantı
denemesi reddedildi. Yerel anahtar dosyaları ve sunucudaki geçici kimlik/ayar
aktarım dosyaları temizlendi. Kalıcı uygulama sırları yalnız çalışma
yapılandırmasında kalır; Git'e veya imajlara eklenmedi.

Yayın sonrası ölçümde dört yeni servis yaklaşık 314 MiB toplam bellek,
sunucu yaklaşık 1,3 GiB kullanılabilir RAM gösterdi. Bu anlık ölçümdür;
yük testi veya gelecekteki kapasite garantisi değildir.

Kaynak `codex/kongre-production` dalına gönderildi. Eski `main` dalı
`a0c224b793102dd9ad134defc39f456fb0bebec2` olarak korundu; eski uygulama ve
veritabanı değiştirilmedi. Hazırlık, Linux imajı doğrulamaları ve kalan
bağımlılık audit kayıtları [hazırlık raporunda](KONGRE_YAYIN_HAZIRLIGI.md),
genel işletim adımları [üretim rehberinde](../deploy/README.production.md).

Sır içermeyen ayrıntılı yerel sonuç `.local/kongre-production-deployment-result.json`,
imaj aktarımı kanıtı `.local/kongre-transfer-result-c0c12764b973.json` içindedir.
