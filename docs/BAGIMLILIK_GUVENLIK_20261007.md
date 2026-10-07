# Bağımlılık güvenlik incelemesi — 7 Ekim 2026

## Sonuç ve kapsam

Kilitli ve kurulu bağımlılıklar incelendi; `npm audit --omit=dev --json` ve `npm audit --json` çalıştırıldı. Güvenlik düzeltmeleri kabul düzeltmeleri kopyasına uygulandı. Gerçek e-posta gönderilmedi, üretim veritabanına bağlanılmadı ve dağıtım yapılmadı. Nihai uygulama build/HTTP regresyonu kabul kapanışının bütünleşik doğrulamasına aittir.

| Denetim | Önce | Güncellemeden sonra |
| --- | --- | --- |
| Üretim bağımlılık ağacı | 12: 8 yüksek, 4 orta | 7: 4 yüksek, 3 orta |
| Dev dahil tüm ağaç | 22: 16 yüksek, 5 orta, 1 düşük | 12: 9 yüksek, 3 orta |
| Kritik | 0 | 0 |

Bu sayılar ayrı saldırıların sayısı değil, npm'nin etkilenen paket ve üst bağımlılık düğümleridir. Üretim ağacında görünmek, paketin HTTP isteği işlerken çağrıldığı anlamına gelmez. Kalan kayıtlar aşağıda kod akışına göre değerlendirilmiştir; sonuç sıfır açık beyanı değildir.

## Uygulanan sürümler

| Paket | Önce → sonra | Konum / gerekçe |
| --- | --- | --- |
| `@xmldom/xmldom` | 0.8.11 → **0.8.15** | Mammoth üzerinden dolaylı üretim; XML ayrıştırma kaynak tüketimi |
| `defu` | 6.1.4 → **6.1.5** | Prisma yapılandırma zincirinde dolaylı üretim; prototype pollution |
| `source-map-js` | 1.2.1 → **1.2.2** | Next/PostCSS üzerinden dolaylı; kaynak haritası işleme DoS |
| `baseline-browser-mapping` | 2.10.10 → **2.11.0** | Next/Browserslist üzerinden dolaylı; geçersiz ayarda process exit |
| `nodemailer` | 9.0.0 → **10.0.15** | Doğrudan üretim; SMTP ayrıştırıcı/taşıyıcı güvenlik düzeltmeleri |
| `@babel/core` | 7.29.0 → **7.29.6** | Dolaylı dev; sourceMappingURL dosya okuma |
| `@humanfs/node` | 0.16.7 → **0.16.8** | Dolaylı dev; recursive copy symlink davranışı |
| `brace-expansion` | 1.1.12 → **1.1.21**; 5.0.4 → **5.0.12** | Dolaylı dev; iki ana sürüm hattı korunarak DoS düzeltmeleri |
| `browserslist` | 4.28.1 → **4.28.7** | Dolaylı dev; cache/custom stats kaynak tüketimi |
| `js-yaml` | 4.1.1 → **4.3.2** | Dolaylı dev; alias/merge kaynak tüketimi |

Nodemailer manifestte tam sürüme sabitlendi. Diğer hedefler mevcut üst paket sürüm aralıkları içinde kilitlendi; kalıcı `overrides` eklenmedi. Baseline ve js-yaml aynı ana sürümde küçük yükseltmedir. Babel generator 7.29.6/parser 7.29.3, HumanFS core 0.19.2/types 0.15.0 ve Browserslist veri paketleri zorunlu alt bağımlılıkları karşılayacak biçimde güncellendi. Next 16.3.6, Prisma 6.19.2 ve Mammoth 1.12.0 korunmuştur. npm'nin önerdiği Prisma/Mammoth/eslint-config-next geri sürüm düşürmeleri uygulanmadı.

Aday sürümlerin yayımlandığı ve ilgili sürümler için eşleşen danışma kalmadığı NPM registry ve bulk advisory API ile kontrol edildi. Ardından gerçek kurulu ağacın audit sonucu yeniden alındı. `npm ci --ignore-scripts` ve son iki paketin hedefli kurulumu başarılıdır; Prisma client üretimi kabul kapanışında ayrıca yapılır.

Birincil danışmalar: [xmldom parser](https://github.com/advisories/GHSA-x4fp-j954-r2f4), [defu](https://github.com/advisories/GHSA-737v-mqg7-c878), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [baseline](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), [Babel](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8), [HumanFS](https://github.com/advisories/GHSA-p498-v437-472g), [brace-expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [Browserslist](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [js-yaml](https://github.com/advisories/GHSA-2883-xcg3-v3hh).

## Ulaşılabilir DOCX yolu ve regresyon kanıtı

Katılımcı dosya yüklemesi `src/app/api/submissions/[id]/file/route.ts:17` üzerinden `readRevisionBinary` çağırır. `src/integrations/congress/revision-files.ts:7` dosya türünü, 10 MB sınırını ve ZIP içinde gereken dosyaların varlığını kontrol eder. Bu kontroller XML ayrıştırıcısının algoritmik kaynak tüketimini engellemez. Yetkili yönetici ayrıntısında `src/integrations/congress/management.ts:262` kayıtlı içeriği `mammoth.extractRawText` ile ayrıştırır. Mammoth'un XML katmanı `@xmldom/xmldom` kullanır. Dolayısıyla yükleyen katılımcının hazırladığı içerik, yönetici önizlemesi açıldığında savunmasız ayrıştırıcıya ulaşabiliyordu.

Yeni `scripts/dependency-security.test.mjs` normal DOCX/Türkçe metin çıkarmayı ve aynı Mammoth XML katmanında bozuk kapanış etiketi işinin sınırlı sürede bitmesini doğrular. Tehlikeli girdi, CI ana sürecini kilitlememek için 4 saniyelik üst sınırla ayrı süreçte çalışır. Aynı sentetik girdi eski 0.8.11 ile süre sınırında sonlandırıldı; 0.8.15 ile yaklaşık 41 ms içinde tamamlandı. Dosya yükleme veya veritabanı mutasyonu yapılmadı.

## Nodemailer geçişi ve teslim sonucu düzeltmesi

Mevcut uygulama yalnız izin verilen `from/to/subject/text/html/replyTo/messageId` alanlarını gönderir (`src/modules/communication/transport.mjs:66`). Adresler tek string ve en fazla 254 karakterdir; liste, yorum ve görüntü adı sözdizimi reddedilir (`src/modules/communication/queue.mjs:23`). Kullanıcı `raw`, dosya/URL ekleri veya tenant SMTP host bilgisi sağlayamaz. Bu yüzden eski paketin danışmalarındaki birçok saldırı önkoşulu normal uygulama girişlerinde bulunmuyordu; paket yine de yükseltildi.

10.0.15'in ESM default/CommonJS importları, mevcut TypeScript kullanım biçimi ve Node 24 ortamı doğrulandı. 10.x **Node >=20** gerektirir. Yalnız 10.0.6'ya yükseltmek yeterli değildir: [quoted local-part danışması](https://github.com/advisories/GHSA-g57g-f23g-4646) 10.0.9'dan önceki ilgili sürümleri etkiler. Ayrıca [addressparser DoS](https://github.com/advisories/GHSA-v53p-9fqp-m79j) ve [raw erişimi](https://github.com/advisories/GHSA-p6gq-j5cr-w38f) incelendi.

Yerel SMTP testi hem 9.0.0 hem 10.0.15'in DATA gövdesi karşı tarafa ulaştıktan sonraki bağlantı kopmasını `ECONNECTION/CONN` olarak bildirdiğini gösterdi. Önceki sınıflandırma bunu otomatik tekrar ediyordu. Bu yükseltmeye özgü olmayan mevcut çift gönderim riski giderildi: yalnız DNS çözümleme hatası veya açık SMTP 4xx cevabı yeniden denenir; aşaması kanıtlanamayan bağlantı/timeout hataları `DELIVERY_UNKNOWN` olur. Bunun bilinçli sonucu, bazı gerçekten gönderim öncesi bağlantı kopmalarının da otomatik tekrar edilmemesidir.

`scripts/nodemailer-smtp.test.mjs` sadece `127.0.0.1` üzerinde sentetik SMTP konuşur; dış teslim veya veritabanı erişimi yoktur. Import, AUTH+MIME kabulü, RCPT 550/451, AUTH 535 ve DATA sonrası belirsizlik doğrulanır. TLS ve gerçek sağlayıcı entegrasyonu bu yerel testin kapsamı değildir. `test:communication` ve `test:dependency-security` bu testi çalıştırır.

## Kalan danışmalar ve karar

| Kalan kök neden | Audit konumu | Gerçek erişim ve karar |
| --- | --- | --- |
| `deepmerge-ts` 7.1.5 | Prisma 6.19.2 → `@prisma/config` 6.19.2; yüksek | Açık recursive/self-referencing nesne grafiği gerektirir. Uygulama HTTP kodunda bu paket veya Prisma config importu yok; CLI/build yapılandırma yolu. Temiz sürüm 8.0.0 ana sürüm değiştirir; kör override yapılmadı. [Danışma](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) |
| `effect` 3.18.4 | Aynı Prisma zinciri; yüksek | Danışma eşzamanlı Effect RPC fiber/AsyncLocalStorage bağlamını konu alır. Uygulama bu RPC yolunu kullanmaz. 3.20.0 temizdir fakat Prisma tam 3.18.4 sabitler; upstream uyumlu güncelleme olmadan override yapılmadı. [Danışma](https://github.com/advisories/GHSA-38f7-945m-qr2g) |
| `sprintf-js` 1.0.3 | Mammoth 1.12.0 → argparse 1.0.10; orta | `argparse`, Mammoth'un `bin/mammoth` CLI girişinde çağrılır; uygulamanın `extractRawText` yolunda yüklenmez. Düzeltilmiş sürüm yayımlanmamış; Mammoth geri sürüm düşürülmedi. [Danışma](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |
| `braces` 3.0.3 | eslint-config-next → Next ESLint plugin → fast-glob → micromatch; yalnız dev, yüksek | Glob kalıpları repo/lint yapılandırmasından gelir; HTTP kullanıcı girdisi bu hatta aktarılmaz. Düzeltilmiş sürüm yayımlanmamış; Next ile uyumsuz ESLint geri sürüm düşürmesi yapılmadı. [Danışma](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |

Kalan kayıtların sınırlı erişim değerlendirmesi mevcut import ve çağrı akışına dayanır. Gelecekte dışarıdan yapılandırma, glob, sprintf biçimi veya Effect RPC girdisi alınırsa yeniden değerlendirilmelidir. Üretim kurulumunda Prisma CLI bulunması audit üretim sayısına dahildir; audit kaydı araç kullanımını kendiliğinden HTTP açığına dönüştürmez.

## Doğrulama

- Kurulu son sürümlerle `node --test scripts/dependency-security.test.mjs scripts/nodemailer-smtp.test.mjs scripts/communication.test.mjs scripts/environment.test.mjs`: **68/68 geçti**.
- Yeni/değişen güvenlik testleri ve iletişim taşıyıcısında ESLint geçti.
- SMTP testi ilk sandbox denemesinde loopback `listen` izni nedeniyle çalışamadı; yetkili yalnız yerel ağ çalıştırmasında geçti.
- Son üretim audit **7**, tüm audit **12**; iki komutun exit 1 sonucu yukarıda belgelenen kalan danışmalar nedeniyledir.
- Paket manifesti/kilidi dışında değişiklikler iki regresyon testi, dar SMTP sınıflandırması ve bunun mevcut birim testidir. Tam build, uygulama HTTP ve görsel kabul kontrolleri ana kabul kapanışında raporlanır.
