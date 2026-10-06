# P22 — Yerel uçtan uca pilot ve teslim

**Yerel kullanıcı testi kapsamı: 07.10.2026.** Başlangıç `1e311a8` (P06-E1), dal `codex/v2-p22`. P01–P21, P16A/B ve P06-E1 üzerinde iki kurum/kongreyle aynı bilimsel kaydın bütün süreci yürütüldü. Uzak deneme/üretim yayını P22'nin ayrı ve henüz uygulanmamış dağıtım adımıdır.

## Sonuç ve sınır

| Pilot | Tamamlanan bağlı akış | Teslim durumu |
|---|---|---|
| A — `p22-pilot-a-8856bb15` | Başvuru → tek kör hakem değerlendirmesi → editör kabulü → aynı bildiriyi bağlı kayıt → 100 TRY sentetik ödeme doğrulaması → yayımlanmış sunum → yoklama → sertifika → yazar yayın tercihi/prova onayı → özet kitabı PDF → kalıcı arşiv | Yeniden açılmış; kişisel panel ve yeni işlemler kullanılabilir. Belge v2, eski v1 PDF korunur. |
| B — `p22-pilot-b-8856bb15` | Aynı akış; ücretsiz kayıt, ödeme zorunluluğu yok | Kapalı; yeni işler reddedilir, aynı kitap/program ve verilmiş belge doğrulaması korunur. |

Başvuru, hakem görevi, kayıt, sunum ve yayın kaynağı aynı bildiri kimliğine bağlıdır. A'da dekont ile banka onayı ayrı; B'de ücretsiz kayıt için sahte banka onayı üretilmedi. Sertifika PDF üretimi ve capture bildirimi ayrıdır. Yayın tercihi, belirli prova onayı, editörün hazır kararı, PDF üretimi, kitap yayını ve arşiv yayını ayrı onay adımlarıyla yapıldı. Gerçek banka işlemi veya e-posta teslimatı yoktur.

İki kongre arasında bilimsel dosya, banka kanıtı, belge ve arşiv kimlikleri reddedildi. İçerik editörü/anonim kullanıcı özel banka/sertifika dosyasını alamaz. Türkçe pilot CMS sayfasının yayımlanmamış İngilizcesi görünmez; İngilizce doğrudan adres 404 döner. Kapalı kongrede eski iş kuyrukları gönderim yapmaz; arşiv yaşam döngüsü ayrı korunur.

## Pilot sırasında giderilen sorunlar

- Geçmiş geçerli belge anlık görüntüsü, yalnız sertifika modülü kapatıldığında güncel yoklama/ödeme değişikliklerinin önüne geçebiliyordu. Donmuş uygunluk artık yalnız gerçek **kongre kapanışında** kullanılır. Açık kongrede modül kapalıyken mevcut belgenin güncel kaynağı denetlenir; yeni üretim/gönderim kapalı kalır. Yoklama düzeltmesiyle geçersizleşmiş belge modülü kapatıp açmakla geçerli olmaz; açık kaynak aktarımı ve yeniden üretim gerekir.
- Kapalı arşivde program/kitap menüsünün korunması katılımcı menüsünü de açıyordu. Kişisel işlem erişimi kapanıştan ayrı hesaplanır; kapalı bilimsel programda panel ve çevrim içi katılım düğmeleri gösterilmez.
- Arşiv, kitap ve belge doğrulama sayfalarının klavye **İçeriğe geç** hedefi düzeltildi.
- Eski platform testi bütün kurum üyeliklerinin yok olmasını bekliyordu. Bir kurumda üyelik kapatılınca yalnız o kurumun bağlamlarının kalktığı, diğer açık üyeliklerin korunduğu denetlenir. P08'in eski İngilizce sayfa fallback beklentisi P06-E1'in açık yayın/404 kuralıyla güncellendi.

`GET /api/health` no-store DB readiness sağlar: 200/503, yalnız `ok`/`unavailable`. Preview'da Basic kapısına tabidir; özel hata/yapılandırma yayımlanmaz.

## Çalıştırılan doğrulama

| Kanıt | Başarılı kontrol |
|---|---:|
| Tam regresyon: bağımsız iş kuralları / yerel HTTP bağlama senaryoları | 345 + 850 = **1195** |
| Preview sayfa/API/dosya/asset kapısı ve DB erişilemiyorken readiness | **157** |
| İki kongreli bağlı pilot | **31** |
| Sertifika geçersizleşme / modül kapanışı / gerçek kongre kapanışı | **6** |
| Karma yük: 240 istek, sekiz eşzamanlı bağlantı | **3 kabul kontrolü**, sıfır durum hatası |
| Yerel işletim, şema, migration checksum ve özel bilgi taraması | **11** |
| Yeni kayıtları koruyan migration / iki ayrı restore provası | **7** |
| Gerçek tarayıcı PDF indirmelerinin checksum karşılaştırması | **2** |
| Gerçek tarayıcı: kurum/rol, kişisel panel, arşiv/program/kitap/belge, dil, klavye, mobil | **17** |

Preview hariç **1255 otomatik kabul kontrolü**, ayrıca 157 preview ve 17 gerçek tarayıcı senaryosu. Bazı HTTP senaryoları aynı kaynaklar üzerinde farklı güvenlik/yaşam döngüsü durumlarını sınar; sayı benzersiz ürün özelliği sayısı değildir. Lint ve üretim build/TypeScript geçti. Tam regresyondan sonraki son düzenleme yalnız belge doğrulama ana içeriğinin klavye hedefidir; son derleme ve gerçek tarayıcı odak kontrolüyle doğrulandı.

Her iki pilotun kitapları ve güncel sertifikaları render edilerek **10 PDF sayfası** görsel olarak incelendi: Türkçe karakterler, alan sınırları, kapak, içindekiler, bilimsel içerik ve yazar dizini temiz. Bu şablon sentetik örnektir; gerçek kurum tasarım onayı değildir. Mobil 390 px görünümde yatay taşma yok; menü Escape ile kapanır.

Yük sonucu `.local/p22-load-result.json` içindedir; p95 değeri çalışma anına aittir. Yerel eşik 2500 ms, sekiz eşzamanlı bağlantıdır. Bu test üretimde hedeflenen kullanıcı sayısını veya kapasiteyi onaylamaz; uzak hedef yük henüz seçilmedi.

## Geçiş ve kurtarma

Şema değişmedi: **33 migration / 97 tablo**. Migration deploy tekrar çalıştırıldı; yeni pilotların bağlı kayıtları ve PDF byte'ları aynı kaldı. P06-E1 yedeği pilot öncesidir ve yeni kayıtları içermez. Güncel dump ayrı DB'ye restore edilerek bütün pilot ilişkileri, belge v1/v2 geçmişi, kitap ve sertifika SHA-256 değerleri karşılaştırıldı. Asıl DB değişmedi; geçici DB'ler kaldırıldı. Uygulama kaynak geri dönüşünde güncel DB korunmalıdır; eski DB yedeğine dönmek yeni kayıtları kaybettirir.

Final kontrol noktası **`../.recovery/P22-20261007-final`**: temiz kaynak commit/bundle, tam DB dump, özel ortam/hesap/capture dosyaları ve kanıtlar. Paket kapanışında web/worker durdurularak 97 tablonun tamamı ayrı geçici DB'ye restore edilir; satır sayıları ve sıralı SHA-256 eşleşmesi **`manifest.json`** içinde kayıtlı olmalıdır. Son kapanış durumu `.local/p22-close-result.json` içindedir. Kontrol noktası yalnız yerel sentetik v2'dir; mevcut canlı ve üniversite sitesi değiştirilmedi.

## Kullanıcıya teslim

[A pilot arşivi](http://127.0.0.1:3100/p22-pilot-a-8856bb15/arsiv?lang=tr), [B kapalı arşivi](http://127.0.0.1:3100/p22-pilot-b-8856bb15/arsiv?lang=tr), [yönetim girişi](http://127.0.0.1:3100/admin). Kişisel test hesabı Git dışı `.local/p03-accounts.json` içinde bulunur. Kullanıcı testi, başlangıç/durdurma komutları, hata/capture takibi ve kayıpsız geri dönüş yöntemi [P22 işletim belgesinde](P22_ISLETIM.md) açıklanmıştır.

**Çalıştırılmayan / kalan uzak kapsam:** alan adı/DNS, gerçek TLS/HTTPS/Secure çerez, Docker imajının gerçek çalıştırılması, gerçek e-posta sağlayıcısı ve teslimat, harici hata takip servisi, gerçek pilot ekip/veri aktarımı, kurum sertifika/afiş/kitap şablonu ve içerik onayı, uzak hedef yük ve gerçek yayına geçiş/geri dönüş. Hazır deneme yapılandırması bunların tamamlandığı anlamına gelmez. P22 yerel kullanıcı testine hazırdır; uzak yayın ayrıca yetki ve ortam gerektirir.

Kabul kanıtları `.local/p22-*.json/log/png/pdf` içinde özeldir; Git'e parola, oturum, verification kodu veya gerçek kişisel veri kopyalanmadı. P22 teslimi tamamlanınca devam heartbeat'i duraklatılır.
