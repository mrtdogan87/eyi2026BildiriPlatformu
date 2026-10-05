# Ortam ve dağıtım — v2

05.10.2026 tarihinde gerçek ortam SSH, HTTP/DNS, konteyner ve GitHub kayıtlarıyla doğrulandı.

| Ortam | Uygulama ve veri | Durum |
|---|---|---|
| Mevcut canlı | `https://bildiriyonetim.stativera.store`, Coolify; PostgreSQL 16 `aibildiri` | Korundu; canlıya migration/dağıtım yapılmadı |
| Üniversite sitesi | `https://eyi2026-iibf.mcbu.edu.tr/`, ayrı üniversite CMS'i | Korundu; CMS kaynak koduna erişim doğrulanmadı |
| Tarihsel Vercel | Başarılı dağıtım kayıtları mevcut | Güncel üniversite başvuru bağlantısının hedefi değil |
| Yerel v2 | `http://127.0.0.1:3100`, ayrı `v2/` checkout; PostgreSQL `127.0.0.1:55432/aibildiri_v2` | Yalnız sentetik veri ve yakalanan e-posta |
| v2 deneme | Seçilecek ayrı HTTPS adresi; ayrı `aibildiri_v2_preview` DB/kullanıcısı ve volume'lar | Yapılandırma hazır; uzak yayın bekliyor |

Canlı commit `a0c224b793102dd9ad134defc39f456fb0bebec2`. Önceki Neon/Vercel
metni çalışan sürümün yedeğinde saklandı; güncel DB Neon değildir. Dosyalar
DB byte alanlarında saklanır. Obje depolama sonraki paketlerde ele alınacak.

- [Yerel başlatma](docs/YEREL_GELISTIRME.md)
- [Deneme ortamı](docs/DENEME_ORTAMI.md)
- [P01 kapanışı](docs/P01_KAPANIS.md)
- [P02 kapanışı](docs/P02_KAPANIS.md)

`build` ve `vercel-build` yalnız derleme yapar. Migration build/start sırasında
çalışmaz; `prisma:migrate:deploy` ayrı adımdır, P02'de yalnız yerel/deneme
DB'sine izin verir. Bu dal mevcut canlı Coolify uygulamasına bağlanmayacak.
