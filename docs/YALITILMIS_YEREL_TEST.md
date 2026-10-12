# Sentetik kabul testi ortamı

Bu ortam çalışma veritabanını ve 3100 sunucusunu kullanmaz. Ayrı `kongre-test`
Colima profili içinde sıfırdan PostgreSQL migration'ları ve sentetik seed
çalıştırılır. Kaynaklar izin verilen dosya listesinden
`.local/isolated-acceptance/app` altına kopyalanır; mevcut `.env`, `.local`,
veritabanı veya hesap dosyaları kopyalanmaz. Test parolaları yeniden üretilir.

Uygulama ve PostgreSQL aynı yalıtılmış container ağ alanında çalıştığından
mevcut yerel güvenlik kontrolleri değişmeden `127.0.0.1:3100` ve
`127.0.0.1:55432` kullanılır. DB portu bilgisayara yayımlanmaz. E-posta yalnız
capture modundadır; SMTP ve Resend alanları boştur.

İlk kurulum (Docker/Colima araçları gerekir):

```sh
colima start kongre-test --cpu 2 --memory 4 --disk 20 --runtime docker --vm-type vz --mount-type virtiofs
node scripts/isolated-local.mjs prepare
node scripts/isolated-local.mjs install
node scripts/isolated-local.mjs start
```

Colima başlangıçta Docker'ın varsayılan bağlamını değiştirebilir; gerekiyorsa
önceki bağlamı geri seçin. Test betiği her zaman açıkça
`--context colima-kongre-test` kullanır.

Tarayıcı adresi **http://kongre-test.localhost:3102/admin**. Bu ayrı hostname
çalışma panelinin 127.0.0.1 çerezlerinden ayrılır. Teste ait ters proxy yalnız
bu adresin Origin/Host değerlerini içerideki 3100 adresine eşler; yabancı
Origin değerlerini değiştirmez. Uygulamanın kaynak kontrolü korunur.

Hesaplar yalnız özel, Git dışı
`.local/isolated-acceptance/app/.local/p03-accounts.json` dosyasındadır.
Parolaları sohbete veya loglara yazdırmayın. Yakalanan e-postalardaki
`127.0.0.1:3100` bağlantıları container içi testler içindir. Tarayıcıda bunları
doğrudan açmayın; gerekiyorsa yalnız kök adresi `http://kongre-test.localhost:3102`
ile değiştirin. Çalışma sunucusunda sentetik bağlantı açmayın.

Kod değişince ve kontrolleri çalıştırırken:

```sh
node scripts/isolated-local.mjs sync
node scripts/isolated-local.mjs exec scripts/login-cooldown-check.mjs
node scripts/isolated-local.mjs status
node scripts/isolated-local.mjs stop
```

DB'ye yazan testleri aynı anda çalıştırmayın. Test çıktıları kaynak
kopyasının `.local` dizininde kalır. `stop` yalnız bu iki test container'ını
durdurur; sentetik DB korunur. Yeniden açmak için `start` yeterlidir. DB'nin
volume adı `kongre-acceptance-postgres`; silme işlemi otomatik yapılmaz.

Uygulama kodundaki değişiklikler `sync` sonrasında Next geliştirme sunucusuna
yansır. Sunucu betiği veya ortam değiştiğinde test app container'ını yeniden
başlatın. Paket veya migration değiştiğinde `install` tekrar kullanılabilir;
seed idempotenttir ve yalnız test ortamında çalışır.
