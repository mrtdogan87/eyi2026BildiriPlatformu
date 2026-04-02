type Props = {
  caption?: string;
  variant?: "default" | "submission";
};

export function PlatformHero({ caption, variant = "default" }: Props) {
  const isSubmission = variant === "submission";

  return (
    <section className={`hero ${isSubmission ? "hero-submission" : ""}`}>
      <h1 className="page-title">{isSubmission ? "Bildiri Gönderimi" : "Bildiri Gönder"}</h1>
      <p className="page-subtitle">
        23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu
      </p>
      <div className="intro">
        {isSubmission ? (
          <>
            <p>
              Bu sayfa, EYİ 2026 için resmi bildiri gönderim alanıdır. Kongre ana sayfasındaki
              akademik çerçevenin devamı olarak tasarlanan bu ekranda bildirinizle ilgili tüm
              bilgileri tek akışta tamamlayabilirsiniz.
            </p>
            <p>
              Gönderim süreci dört adımdan oluşur: bildiri bilgileri ve dosya, yazar bilgileri,
              katılım tercihleri ve son kontrol. Taslağınızı oluşturduktan sonra aynı başvuruya
              güvenli bağlantı ile yeniden dönebilirsiniz.
            </p>
          </>
        ) : (
          <p>
            Bildiri gönderim süreci dört adımdan oluşur. Önce bildiri bilgilerinizi ve dosyanızı
            eklersiniz, ardından yazar bilgilerini tamamlarsınız, üçüncü adımda katılım ve sosyal
            faaliyet tercihlerinizi girersiniz, son adımda ise tüm bilgileri kontrol ederek
            bildirinizi gönderirsiniz.
          </p>
        )}
      </div>
      {isSubmission ? (
        <>
          <div className="hero-grid">
            <div className="hero-panel">
              <h2>Gönderim Akışı</h2>
              <ul>
                <li>Bildiri bilgileri ve DOCX dosyası birlikte kaydedilir.</li>
                <li>Yazarlar ve sunan yazar bilgisi ikinci adımda tamamlanır.</li>
                <li>Katılım biçimi ile sosyal faaliyet tercihleri üçüncü adımda seçilir.</li>
                <li>Son ekranda tüm bilgiler ve zorunlu beyanlar onaylanarak gönderim yapılır.</li>
              </ul>
            </div>
            <div className="hero-panel">
              <h2>Dosya ve Dil</h2>
              <ul>
                <li>Gönderim dili Türkçe veya İngilizce olarak seçilebilir.</li>
                <li>Ana dosya DOCX formatında yüklenir ve taslak içinde güncellenebilir.</li>
                <li>Taslak bağlantısı ile aynı başvuru daha sonra kaldığınız yerden sürdürülebilir.</li>
              </ul>
            </div>
            <div className="hero-panel">
              <h2>Yazar ve Katılım</h2>
              <ul>
                <li>Tüm yazarlar aynı akış içinde tanımlanır ve sunan yazar işaretlenir.</li>
                <li>Sunum biçimi yüz yüze veya çevrim içi olarak seçilebilir.</li>
                <li>Gala ve gezi tercihleri, kayıt planlamasını desteklemek için ayrıca alınır.</li>
              </ul>
            </div>
            <div className="hero-panel">
              <h2>Son Kontrol</h2>
              <ul>
                <li>Gönderimden önce tüm alanlar tek sayfada özetlenir.</li>
                <li>Etik, yazarlık ve kişisel veri işleme beyanları son adımda onaylanır.</li>
                <li>Gönderim tamamlandığında başvurunuz kongre değerlendirme sürecine alınır.</li>
              </ul>
            </div>
          </div>
          <div className="hero-highlight">
            <h3>Önemli Not</h3>
            <p>
              Bu ekran, kongre ana sitesinden ayrı bir deneyim hissi oluşturmamak için aynı kurumsal
              dil ve görsel çerçeve içinde düzenlenmiştir. Burada tamamladığınız başvuru, EYİ 2026
              akademik değerlendirme sürecinin resmi parçasıdır.
            </p>
          </div>
        </>
      ) : null}
      {caption ? (
        <p className="hero-caption">
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
