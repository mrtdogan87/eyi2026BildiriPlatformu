# Platform yönetimi ve kapsamlı görev dağıtımı

07.10.2026. Kullanıcının onayladığı yönetim kurgusu yerel uygulamaya eklendi. Kullanıcının manuel kabulü bekliyor.

## Davranış

Platform sahibi `/admin/platform` genel yönetimiyle başlar; girişte kongre seçilmez. Kurum yöneticisi kendi kurumlarıyla başlar. Birden fazla kongrede çalışan kişi kongre seçer; tek kongreli kişi kendi çalışma paneline ulaşır. Kongre içinde platforma dönüş ve yetkinin kaynağı görünür.

Kongreler aranıp kurum/durumla filtrelenebilir. Kurumlar oluşturulup adları düzenlenebilir; sorumlu atamak isteğe bağlıdır. Kongre oluşturma formunda mevcut kurum ve yeni kurum ayrı seçeneklerdir. Kurum, kongre, başlangıç ayarları, açıkça seçilen ekip ve isteğe bağlı kongre sorumlusu tek işlemde kaydedilir. Bir hata olursa bütün kurulum geri alınır. Kopyalama yalnız aynı kurum içinde yapılır; başvuru, dosya, kişisel erişim bağlantısı ve işlem geçmişi kopyalanmaz.

Platform yöneticisi bütün kapsamları yönetir. Kurum yöneticisi yalnız kendi kurumunda kongre oluşturabilir ve ekip yönetebilir. Kongre yöneticisi yalnız verilen kongreyi ve ekibini yönetir. Önceki kongre yöneticisinin aynı kurumda yeni kongre açabilmesi bu onaylanan kapsam ayrımına göre kaldırıldı; mevcut kongre üyelikleri korundu.

Davet akışı ad/e-posta, kapsam, açıkça seçilen görevler, yetki özeti ve kayıt adımlarını içerir. Yeni hesap kişisel parolasını etkinleştirme bağlantısıyla belirler. Mevcut hesabın parolası veya mevcut kapsam rolü davetle sessizce değiştirilmez. Davet yenileme önceki tokenı geçersiz kılar. Platform yöneticiliği ayrı onay ister; alt yöneticiler veremez. Kendi yetkisini değiştirme ve son aktif platform yöneticisini kaldırma engelleri vardır.

Kongre üyeliği birden çok görevi destekler. Yetkilendirme, hakem/jüri seçimi, kuyruk doğrulaması, CMS zamanlayıcısı, takım kopyalaması ve çalışma paneli görevleri birlikte değerlendirir. Bildiri yönetimi ve hakemlik gibi farklı çalışma alanları birbirini kaybettirmez; görevler başka kongreye taşmaz. İş özetleri yetki ve modül durumunu kullanır.

Kongre üyeliğini kapatmak üst kurum/platform yetkisini kaldırmaz. Kurum yöneticiliğini kaldırmak kongre üyeliklerini silmez. Kurumun tüm kongrelerindeki üyelik erişimini kapatan ayrı işlem vardır. Kişisel hesabı kapatmak bütün oturumları sonlandırır. Üst kapsam erişimleri ekip ekranında ayrıca gösterilir; değişiklik geçmişi önceki/güncel görev ve kapsamı kaydeder.

## Veri geçişi ve güvenlik

`20261007140000_platform_management` mevcut `CongressMembership.role` değerlerini `roles` dizisine aktarır. Eski tek görev alanı ve üyelik kimlikleri korunur; eski uyumlu fixture kayıtlarında boş dizi birincil görevi kullanır. `EmailMessage.congressId` genel hesap davetleri için nullable olur; genel kuyrukta yalnız geçerli hesap etkinleştirmesi işlenir. Genel dedupe için kısmi unique index vardır. Kongrelerin normal e-posta kuyruğu ve teslim geçmişi korunur. Ortak platform adı ayrı ayar kaydında tutulur.

Yerel ortam ve capture korumaları değiştirilmedi. Boş kurulum testi kendi geçici PostgreSQL veritabanına yönlendirilmiş ayrı sunucuda çalışır; test ön yükleyicisi yalnız o geçici sürecin Prisma bağlantısını değiştirir, uygulamanın ortam güvenliği değiştirilmez. Test süreci ve veritabanı sonunda kaldırılır. Değişiklik öncesi veri yedeği `.local/platform-management-before.dump` içindedir; kullanıcı/parola bilgileri raporlara yazılmaz.

## Doğrulama

- Tam mevcut kabul paketi: **1.317 kontrol** (401 birim + 916 entegrasyon); ayrıca **157 preview kontrolü**.
- Yeni yönetim kapsamı: **34 sentetik API/UI senaryosu**; gerçek sentetik hakem daveti/yanıtı, sekreter + hakem, rol kaldırma, farklı kongrede farklı görev, kurum kapısı, davet yenileme, eşzamanlı kurulum ve sorumlu atayarak çoklu görev kopyalaması dahil.
- Boş kurulum: **4 kontrol**, ayrı geçici veritabanı ve sunucuda.
- Önceki yedekten geri yükleyerek korunma: **4 karşılaştırma**; 226 mevcut hesap, 231 kurum üyeliği ve 1.906 kongre üyeliğinin kimlik, parola, rol ve aktiflik durumu korunmuş; 1.906 eski görev dizide bulunmuş.
- ESLint ve üretim derlemesi başarılı.
- Tarayıcıda yeni platform girişi, yeni kurumla kongre oluşturma, dönüş bağlantısı, çoklu görev özeti, ayrı platform onayı ve 390 px görünüm kontrol edildi.

Manuel sıra: [PLATFORM_YONETIMI_KABUL_TESTI.md](PLATFORM_YONETIMI_KABUL_TESTI.md). Kullanıcının kabul adımları otomatik kontrollerle tamamlanmış sayılmaz. Uzak yayın veya gerçek kişilere davet yapılmadı.
