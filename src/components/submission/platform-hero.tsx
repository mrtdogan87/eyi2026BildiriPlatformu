type Props = {
  caption?: string;
};

export function PlatformHero({ caption }: Props) {
  return (
    <section className="hero">
      <h1>23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu Bildiri Gönderme Platformu</h1>
      <p>
        Sistem dört adımda ilerler: önce bildiri bilgilerinizi ve dosyanızı eklersiniz, sonra
        yazar bilgilerini tamamlarsınız, üçüncü adımda katılım ve sosyal faaliyet bilgilerini
        girersiniz, son adımda ise tüm bilgileri kontrol ederek bildirinizi gönderirsiniz.
      </p>
      {caption ? (
        <p style={{ marginTop: 12, color: "rgba(232, 239, 249, 0.92)" }}>
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
