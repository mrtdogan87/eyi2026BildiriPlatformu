# P01 — Çalışan sürümün korunması

**Tamamlandı · 05.10.2026 (Europe/Istanbul)**

Canlı adres üniversite sitesindeki bağlantıdan, gerçek servis ise DNS,
bilinen SSH sunucusu ve Coolify konteyner etiketlerinden doğrulandı:
`https://bildiriyonetim.stativera.store`. Çalışan imajın commit'i
`a0c224b793102dd9ad134defc39f456fb0bebec2`; canlı kaynak arşivindeki bütün
Git dosyaları yerel HEAD ile birebir eşleşti. Yerel eşitlik varsayılmadı.
Sunucunun fiziksel sağlayıcısı ayrıca hesap panelinden doğrulanmadı.

Gerçek DB PostgreSQL 16, `aibildiri`. Konteynerde kalıcı dosya mount'u yok;
bildiri/dekont/öğrenci dosyaları DB'de. Eski Vercel bağlantısı/başarılı dağıtım
geçmişi mevcut; güncel başvuru adresi Vercel'e yönlenmiyor. Üniversite CMS'i ayrı.

## Geri dönüş noktası

Ana checkout altında, Git dışında `.recovery/P01-20261005-200112/`:

- `local-checkout.tar.gz`: izlenmeyen plan dahil yerel dosyalar, eski SQLite
  DB'ler/yüklemeler, kilit dosyası ve özel env. `node_modules`/`.next` hariç.
- `local-history.bundle`: bütün yerel Git geçmişi/ref'leri; bundle verify geçti.
- `live-source.tar.gz`: çalışan konteyner kaynağı.
- `live-image.tar.gz`: çalışan Docker imajının tamamı; gzip/tar kontrol edildi.
- `live-aibildiri-20261005.dump`: yeni DB yedeği, içindeki dosyalar dahil.
- `scheduled-aibildiri-20261005.dump`: mevcut günlük yedeğin yerel kopyası.
- `live-runtime.private.json`: sır içeren ayarlar, yalnız özel koruma klasöründe.
- `manifest.json`, `restore-validation.json`: kapsam, tarih, SHA-256 ve kanıt.

Klasör `0700`, özel arşiv/ayarlar `0600`; sırlar rapora/çıktıya/Git'e yazılmadı.
Yerel koruma tek bilgisayardadır; makine kaybına karşı bağımsız güvenli
ikinci kopya ayrıca gerekir. Sunucunun mevcut günlük DB yedekleri korundu.

## Kabul doğrulaması

Yeni ve günlük yedek, TCP'ye kapalı ayrı yerel PostgreSQL kümesindeki
`p01_live_restore`/`p01_scheduled_restore` DB'lerine geri yüklendi.
Canlı yalnız `REPEATABLE READ READ ONLY` işlemiyle sorgulandı.
UTC ve aynı sıralamayla 13 tablonun sayıları/tüm satır SHA-256 içerik
özetleri her iki geri yüklemeyle eşleşti.

| Kapsam | Sayı |
|---|---:|
| Kongre kayıtları | 55 |
| Bildiriler | 201 |
| Yazarlar | 321 |
| Kayıtlar | 189 |
| Bildiri dosyaları | 174 |
| Dekontlar | 173 |
| Öğrenci belgeleri | 45 |
| Migration kayıtları | 11 |

392 dosyanın tümünde içerik mevcut, `fileSize` byte uzunluğuyla aynı.
Her dosya grubundan üç örnek: dokuz DOCX/PDF/görselin biçim bütünlüğü geçti.
İki eski SQLite DB de ayrı dosyalara geri yüklendi; sayılar/integrity_check
doğrulandı. Bunlar canlı yedek yerine kullanılmıyor.

29.09–05.10.2026 günlük DB yedekleri kesintisiz bulundu: yaklaşık 70 MB,
saat 06:00 Türkiye saati. Son günlük yedek geri yükleme provasını geçti.
Daha eski saklama politikası ve otomatik hata bildirimi doğrulanmadı.

Canlıya migration, yeniden başlatma veya dağıtım yapılmadı. Tam sunucu/TLS
felaket kurtarma provasının kapsamı ayrıdır. Yeni kayıt almış DB üstüne
eski yedek geri yüklemek veri kaybettirir; uygulanmadı. P01 erişim engeli
kalmadı. Sonraki paket P02 bağımsız yerel geliştirme.
