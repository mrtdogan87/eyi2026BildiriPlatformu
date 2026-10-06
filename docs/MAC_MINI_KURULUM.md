# Mac mini yerel kurulum ve taşıma doğrulaması

6 Ekim 2026 · `/Users/dentalai/Documents/AIBildiriYonV2/v2`

P08 kaynak noktası `codex/v2-p08`, commit
`640552d59285b530bab53fcd1ea06b042c2c9e7b`. P09 bu kurulumda başlatılmadı.

## Araçlar ve bağımlılıklar

Homebrew üzerinden Node.js 24.21.0 (npm 11.19.0) ve PostgreSQL 16.15 kuruldu.
Araç yolları `/opt/homebrew/opt/node@24/bin` ve
`/opt/homebrew/opt/postgresql@16/bin`. Projenin kilit dosyasıyla `npm ci`
çalıştırıldı; Prisma 6.19.2 istemcisi Apple Silicon için yeniden üretildi.
Uygulama bağımlılık sürümleri ve kilit dosyası değiştirilmedi.

Homebrew kurulumunda gereken ek kütüphaneler kuruldu; ortak
ca-certificates, OpenSSL 3, readline ve xz bağımlılıkları güncellendi.
Otomatik cleanup/dependent upgrade kapalıydı. Dental proje dosyaları veya
servisleri değiştirilmedi. Homebrew varsayılan PostgreSQL kümesini oluşturdu
ancak o küme kullanılmadı ve Homebrew servisi başlatılmadı.

Kurulum kaynakları: [Node 24](https://formulae.brew.sh/formula/node@24),
[PostgreSQL 16](https://formulae.brew.sh/formula/postgresql@16).

## Verinin korunması ve geri yükleme

Kaynak checkpoint `../.recovery/P08-20261006-final`. `source.bundle`
doğrulaması ve `local.dump` SHA-256 kontrolü geçti. Taşınan hesap dosyasının
özeti de checkpoint ile eşleşti; içerikleri konsola veya bu belgeye yazılmadı.

Eski ham küme silinmeden `.local/postgres-transferred-20261006` dizinine
taşındı. `.local/postgres` altında yeni PG16 kümesi oluşturuldu; P08 dump'ı
boş `aibildiri_v2` veritabanına geri yüklendi. Yeni küme yalnız
`127.0.0.1:55432` üzerinde dinler. TCP ve özel yerel socket bağlantıları
SCRAM parolası ister; socket dizini `/private/tmp/aibildiri-v2-local`, izin 0700.

**Testlerden önce 32 tablonun tüm satır sayıları ve SHA-256 parmak izleri
kaynak manifestle birebir eşleşti.** Buna migration geçmişi de dahildir.
Kanıt `.local/mac-mini-restore.json`; tek kullanımlık uygulama betiği
`.local/mac-mini-restore.mjs` içindedir. Betik var olan koruma dizini/rapor
üzerine yeniden çalışmaz. Kaynak checkpoint değiştirilmedi.

Eski makine test kanıtları `.local/transferred-evidence-20261006` altında,
eski `.next` çıktısı `../.recovery/MAC-MINI-20261006/next-transferred`
altında korundu. Yeni `.next` bu Mac'te yeniden üretildi. İlk lint denemesinde
eski build arşivi çalışma ağacındaydı; dışarı taşındıktan sonra normal lint geçti.

## Bu Mac'te geçen kontroller

- `node --test scripts/*.test.mjs`: 69 DB'den bağımsız kontrol.
- Production sunucusunda sıralı HTTP/DB: smoke 15, platform 19, kongre 29,
  site 26, CMS 34, başlangıç/aktarım 34, ortak içerik 38; toplam 195.
- **Toplam 264 kontrol**, ayrıca preview erişim kapısında 26 kontrol.
- `npm run lint`, TypeScript `--noEmit --incremental false` ve
  `npm run build` başarılı.
- Salt okunur `prisma migrate status`: 17 migration, şema güncel.
  Migration veya seed uygulanmadı.
- Tarayıcıda EYİ sentetik ana sayfası, kişisel yönetim girişi ve yeni P08
  ortak içerik sayfası açıldı. 390×844 görünümde yatay taşma yok; görünür
  örnek kişi görseli yüklendi. Geçici viewport sıfırlandı.

Bu kurulumda yönetim işlemlerinin kabulü HTTP testleriyle yapıldı; önceki
makinenin bütün etkileşimli tarayıcı senaryoları yeniden yapılmış sayılmaz.
Testler yeni sentetik kongre, bildiri, kayıt ve talep bıraktı; çalışma DB'sinin
test sonrasında eski manifestle aynı kalması beklenmez. Test öncesi restore
eşleşmesi ayrı kanıttır. Toplu kanıtlar `.local/mac-mini-integration.json`
ve `.local/mac-mini-validation.json`, suite logları `.local/mac-mini-*.log`.

## Kullanım

Uygulama `http://127.0.0.1:3100/eyi-2026`, yönetim `http://127.0.0.1:3100/admin`.
Kurulum sonunda yeni production build `npm run start` ile açık bırakıldı.
E-posta `capture`, dosyalar ayrı yerel DB, çerez alanı `aibildiri_v2_local`.
Gerçek alıcıya e-posta gönderilmedi; canlı uygulama/DB ve üniversite sitesi
değiştirilmedi. Uzak deneme yayını hâlâ bekliyor.

Yeni terminalde:

```sh
cd /Users/dentalai/Documents/AIBildiriYonV2/v2
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
export PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
npm run db:start
npm run dev
```

3100'de açık uygulama varken ikinci uygulama başlatmayın. Dev ile production
aynı anda kullanılmaz. Dev sunucusunu kendi terminalinde Ctrl+C ile kapatın;
DB'yi durdurmak için `npm run db:stop` kullanın. Yeniden üretim gerektiğinde
uygulama kapalıyken `npm run build`, ardından `npm run start` çalıştırın.
`.next/standalone/server.js` doğrudan başlatılmaz: proje launcher'ı doğru
ortam kontrolünü ve capture kökünü ayarlar.

P06 kapanışındaki bağımlılık denetimi bulguları tarihsel olarak geçerlidir;
bu kurulum ayrı bir güvenlik güncelleme/audit paketi değildir.
