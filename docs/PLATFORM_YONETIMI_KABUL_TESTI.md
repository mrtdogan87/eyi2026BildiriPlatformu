# Platform yönetimi — kullanıcı kabul testi

Tarih: 07.10.2026. Teknik kontroller tamamlandı. Aşağıdaki manuel adımlar kullanıcı tarafından henüz onaylanmadı. Her adım ayrı denenmeli; sorun varsa o adımda durulmalı.

Yerel giriş: <http://127.0.0.1:3100/admin>. Platform hesabı daha önce bu sohbette verildi. Gerçek kişileri davet etmek yerine `@example.invalid` uzantılı sentetik adresler kullanın. Yerel davetler gerçek e-posta göndermez; yakalama kutusuna kaydedilir. Parolalar belgede saklanmaz.

1. **Platform sahibi olarak giriş yapın.** Açılışta `Platform Yönetimi`, genel sayılar ve beş yönetim menüsü görünmeli. İlk kongre otomatik seçilmemeli.
2. **Kurumlar ekranını açın.** Yeni kurum oluşturun, adını düzenleyin. Yönetici atamadan kurum kalabilmeli.
3. **Yeni kongre oluştur ekranını açın.** `Yeni kurum oluştur` seçip farklı bir kurum adı girin. `Sıfırdan başla` seçili olmalı; başka kurumdan kopyalama kapalı olmalı.
4. **Kongreyi hazırlayın.** Ad, adres, başlangıç/bitiş tarihlerini girin. Kolay ilk deneme için `Yalnız özet / ücretsiz` profilini kullanabilirsiniz. Kurum ve kongre adının özette birlikte göründüğünü kontrol edin.
5. **Kongre sorumlusunu isteğe bağlı atayın.** Kutuyu işaretlerseniz ad ve sentetik e-posta girin. Açıklama yalnız kongre yöneticiliği verdiğini göstermeli. Kurum yöneticisi atamak zorunlu olmamalı.
6. **Kongreyi oluşturun.** Kongre panelinde doğru kurum ve kongre adı görünmeli. `Platform yönetimine dön` bağlantısı çalışmalı.
7. **Kongreler ekranında arayın ve filtreleyin.** Kongre adı/kurum/durum filtresi doğru kayıtları göstermeli. `Kongre yönetimine geç` doğru kongreyi açmalı.
8. **Kullanıcılar ve yetkiler ekranını açın.** Ad/e-posta girip kapsam ve görev seçin. Hiçbir yönetici görevi kendiliğinden seçilmemeli. Önce yetki özeti, ardından `Daveti oluştur` görünmeli.
9. **Kurum yöneticisi davetini deneyin.** Kapsam olarak yalnız test kurumunu seçin. Bekleyen davet ve geçerlilik tarihi görünmeli. Daveti yeniden oluşturunca eski etkinleştirme bağlantısı geçersiz olmalı.
10. **Sentetik davetli kendi hesabını etkinleştirsin.** Yerel yakalama kutusunu `npm run mail:latest` ile inceleyebilirsiniz. Bağlantı `http://127.0.0.1:3100/hesap/etkinlestir?...` olmalı. Kullanıcı kendi parolasını belirlemeli; ikinci kullanım reddedilmeli.
11. **Kurum yöneticisiyle giriş yapın.** Yalnız kendi kurum ve kongreleri görünmeli. Kendi kurumunda kongre oluşturabilmeli ve ekip yetkisi dağıtabilmeli; platform yetkisi veya başka kurumda erişim verememeli.
12. **Kongre yöneticisiyle giriş yapın.** Yalnız verilen kongreyi yönetebilmeli. `Ekip ve roller` ekranından sekreter/editör/hakem gibi görevler verebilmeli; yeni kurum, başka kongre veya platform yetkisi verememeli.
13. **Aynı kişiye sekreter + hakem görevleri verin.** Panelde iki çalışma alanı da görünmeli. Açık bildiri/hakemlik modüllerinde atanan hakem işi kullanılabilmeli. Sekreter görevini kaldırınca yönetim kayıtlarına erişim kapanmalı, hakem görevi sürmeli.
14. **Aynı kişiye ikinci kongrede farklı görev verin.** Yeni girişte kongre seçimi görünmeli. Her kongrede yalnız o kongrenin görev ve kayıtları açılmalı. Kapalı modülün işi gösterilmemeli.
15. **Erişimi kapsamına göre kaldırın.** Kongre üyeliği, kurum yöneticiliği, kurumun bütün kongrelerindeki erişim kapısı ve kişisel hesap ayrı işlemlerdir. Üst kapsam erişimi varsa ekranda belirtilmeli. Kişisel hesabı kapatmak bütün oturumları durdurmalı; kayıtlar silinmemeli.
16. **Platform yöneticiliğini ayrı inceleyin.** Bütün platforma erişim verdiği açıkça yazmalı ve onay kutusu zorunlu olmalı. Alt yöneticiler bu yetkiyi verememeli. Kişi kendi yetkisini bu ekrandan değiştirememeli.
17. **Sistem ayarı ve işlem geçmişini kontrol edin.** Platform adı kaydedilmeli; işlem geçmişinde kim, hangi kapsamda işlem yaptı görülebilmeli. Parola/etkinleştirme bağlantısı görünmemeli.

## Deneme notları

Mevcut yerel veritabanında önceki otomatik testlerin çok sayıda sentetik kurum, kongre, davet ve teslim kaydı vardır. Genel sayılar bu kayıtları da kapsar. Yeni bir test adıyla arama yapın; mevcut verileri silmeyin. Boş kurulum davranışı ayrıca geçici veritabanında otomatik sınandı.

Bir sorunu bildirirken adım numarası, hesap rolü, kurum/kongre adı, yaptığınız işlem ve gördüğünüz sonucu belirtin. Parola veya etkinleştirme bağlantısını rapora eklemeyin.

## Kullanıcı onayı

- [ ] 1–7: Platform başlangıcı, kurum ve kongre oluşturma
- [ ] 8–12: Davet ve yönetici kapsamları
- [ ] 13–16: Çoklu görev, erişim kaldırma ve platform yetkisi
- [ ] 17: Sistem ayarı ve işlem geçmişi

Bu kutular yalnız kullanıcının kendi manuel test sonucuyla işaretlenir.
