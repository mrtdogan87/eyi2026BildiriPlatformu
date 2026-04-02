type Props = {
  caption?: string;
};

export function PlatformHero({ caption }: Props) {
  return (
    <section className="hero">
      <h1 className="page-title">Bildiri Gönder</h1>
      <p className="page-subtitle">
        23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu
      </p>
      <div className="intro">
        <p>
          Bildiri gönderim süreci dört adımdan oluşur. Önce bildiri bilgilerinizi ve dosyanızı
          eklersiniz, ardından yazar bilgilerini tamamlarsınız, üçüncü adımda katılım ve sosyal
          faaliyet tercihlerinizi girersiniz, son adımda ise tüm bilgileri kontrol ederek
          bildirinizi gönderirsiniz.
        </p>
      </div>
      {caption ? (
        <p className="hero-caption">
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
