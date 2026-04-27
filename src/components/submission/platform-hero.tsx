type Props = {
  caption?: string;
  variant?: "default" | "submission";
  congressName?: string;
};

export function PlatformHero({ caption, variant = "default", congressName }: Props) {
  const isSubmission = variant === "submission";
  const subtitle =
    congressName ?? "23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu";

  return (
    <section className={`hero ${isSubmission ? "hero-submission" : ""}`}>
      <h1 className="page-title">{isSubmission ? "Bildiri Gönderimi" : "Bildiri Gönder"}</h1>
      <p className="page-subtitle">{subtitle}</p>
      <div className="intro">
        <p>
          Gönderim süreci beş adımdan oluşur: bildiri bilgileri ve dosya, yazar bilgileri, katılım
          tercihleri, ücret ve dekont, son kontrol. Taslağınızı oluşturduktan sonra aynı başvuruya
          güvenli bağlantı ile yeniden dönebilirsiniz.
        </p>
      </div>
      {isSubmission ? (
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
            <h2>Katılım Seçenekleri</h2>
            <ul>
              <li>Yüz yüze veya çevrim içi katılım seçilebilir.</li>
              <li>Akademisyen, öğrenci ve dinleyici kategorilerinde farklı ücretler uygulanır.</li>
              <li>Erken kayıt dönemi geç dönemden daha avantajlıdır; tarihler kongre yönetimince güncellenir.</li>
              <li>Çevrim içi dinleyici katılımı ücretsizdir.</li>
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
            <h2>Son Kontrol</h2>
            <ul>
              <li>Gönderimden önce tüm alanlar tek sayfada özetlenir.</li>
              <li>Ücret bilgisi ve yüklenen dekont da son kontrolde tekrar gösterilir.</li>
              <li>Etik, yazarlık ve kişisel veri işleme beyanları son adımda onaylanır.</li>
              <li>Gönderim tamamlandığında başvurunuz kongre değerlendirme sürecine alınır.</li>
            </ul>
          </div>
        </div>
      ) : null}
      {caption ? (
        <p className="hero-caption">
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
