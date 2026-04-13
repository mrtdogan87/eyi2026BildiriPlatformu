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
          <p>
            Gönderim süreci beş adımdan oluşur: bildiri bilgileri ve dosya, yazar bilgileri,
            katılım tercihleri, ücret ve dekont, son kontrol. Taslağınızı oluşturduktan sonra aynı
            başvuruya güvenli bağlantı ile yeniden dönebilirsiniz.
          </p>
        ) : (
          <p>
            Bildiri gönderim süreci beş adımdan oluşur. Önce bildiri bilgilerinizi ve dosyanızı
            eklersiniz, ardından yazar bilgilerini tamamlarsınız, üçüncü adımda katılım ve sosyal
            faaliyet tercihlerinizi girersiniz, dördüncü adımda ücret ve dekont işlemlerini
            tamamlarsınız, son adımda ise tüm bilgileri kontrol ederek bildirinizi gönderirsiniz.
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
                <li>Ücret hesabı ve dekont yükleme dördüncü adımda tamamlanır.</li>
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
                <li>Ücret bilgisi ve yüklenen dekont da son kontrolde tekrar gösterilir.</li>
                <li>Etik, yazarlık ve kişisel veri işleme beyanları son adımda onaylanır.</li>
                <li>Gönderim tamamlandığında başvurunuz kongre değerlendirme sürecine alınır.</li>
              </ul>
            </div>
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
