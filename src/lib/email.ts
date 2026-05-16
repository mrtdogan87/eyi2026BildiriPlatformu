type DraftEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
};

type RegistrationEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
};

type SubmissionStatusEmailInput = {
  to: string;
  congressName: string;
  congressSlug: string;
  paperTitle: string;
  statusLabel: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  registrationUrl?: string;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_SENDER_EMAIL;
  const senderName = process.env.RESEND_SENDER_NAME ?? "EYI 2026 Bildiri Platformu";

  return {
    apiKey,
    senderEmail,
    senderName,
    isConfigured: Boolean(apiKey && senderEmail),
  };
}

export function isResendConfigured() {
  return getResendConfig().isConfigured;
}

const EMAIL_BASE_STYLES = `
  body { margin:0; padding:0; background:#f5f7fb; font-family:Arial,Helvetica,sans-serif; color:#14213d; }
  .wrap { width:100%; padding:32px 16px; background:#f5f7fb; }
  .card { max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; padding:36px 32px; box-shadow:0 4px 18px rgba(15,32,64,0.08); border:1px solid #d6e1f1; }
  .brand { font-size:13px; font-weight:700; color:#1f4f9d; letter-spacing:0.12em; text-transform:uppercase; margin:0 0 8px; }
  h1 { font-size:22px; margin:0 0 20px; color:#002f6c; letter-spacing:-0.01em; line-height:1.3; }
  p { margin:0 0 14px; line-height:1.6; font-size:15px; color:#1f2937; }
  .meta { background:#f7faff; border:1px solid #d6e1f1; border-radius:10px; padding:14px 16px; margin:18px 0; }
  .meta-row { font-size:14px; line-height:1.55; }
  .meta-row strong { color:#002f6c; }
  .cta { display:inline-block; background:#002f6c; color:#ffffff !important; text-decoration:none; padding:13px 24px; border-radius:10px; font-weight:600; font-size:15px; margin:6px 0 18px; }
  .secondary { background:#eef4fb; color:#002f6c; }
  .small { font-size:12.5px; color:#4b5772; margin-top:18px; line-height:1.5; }
  .footer { max-width:560px; margin:18px auto 0; text-align:center; font-size:12px; color:#66758d; padding:0 16px; }
`;

function emailLayout(title: string, body: string, congressName: string): string {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${EMAIL_BASE_STYLES}</style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <p class="brand">${congressName}</p>
        ${body}
      </div>
      <p class="footer">Bu e-posta otomatik gönderilmiştir. Lütfen yanıtlamayınız.</p>
    </div>
  </body>
</html>`;
}

async function sendEmail(input: { subject: string; to: string; text: string; html: string }) {
  const resend = getResendConfig();
  if (!resend.isConfigured || !resend.apiKey || !resend.senderEmail) {
    throw new Error("Resend API ayarları eksik.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${resend.senderName} <${resend.senderEmail}>`,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ResendSendResponse | null;
    throw new Error(errorBody?.message ?? errorBody?.name ?? "Resend e-posta gönderimi başarısız oldu.");
  }

  return (await response.json().catch(() => null)) as ResendSendResponse | null;
}

export async function sendDraftAccessEmail({ to, congressName, magicLink }: DraftEmailInput) {
  const html = emailLayout(
    `${congressName} - Taslak Erişim Bağlantısı`,
    `
    <h1>Bildiri taslağınıza erişim bağlantınız hazır</h1>
    <p>
      <strong>${congressName}</strong> bildiri gönderim platformunda başlattığınız taslağa,
      güvenli erişim bağlantısı aşağıdadır. Bağlantıyı açtıktan sonra ekrandaki doğrulama adımıyla
      taslağınıza geçebilirsiniz.
    </p>
    <p><a class="cta" href="${magicLink}">Taslağı Aç</a></p>
    <p class="small">
      Bağlantı 24 saat geçerlidir. Doğrulamadan sonra aynı tarayıcıda 5 dakika boyunca devam
      edebilirsiniz; süre dolduğunda yeni bir bağlantı oluşturabilirsiniz.<br />
      Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.
    </p>
    `,
    congressName,
  );

  return sendEmail({
    to,
    subject: `${congressName} - Bildiri taslağınıza erişim bağlantısı`,
    text: [
      `${congressName} bildiri gönderim platformunda başlattığınız taslağa erişim bağlantısı:`,
      "",
      magicLink,
      "",
      "Bağlantı 24 saat geçerlidir; doğrulama sonrası aynı tarayıcıda 5 dakika boyunca devam edebilirsiniz.",
    ].join("\n"),
    html,
  });
}

export async function sendRegistrationAccessEmail({
  to,
  congressName,
  magicLink,
}: RegistrationEmailInput) {
  const html = emailLayout(
    `${congressName} - Kayıt Erişim Bağlantısı`,
    `
    <h1>Kayıt sayfanıza giriş bağlantınız hazır</h1>
    <p>
      <strong>${congressName}</strong> kayıt sayfasına girmek için aşağıdaki güvenli bağlantıyı
      kullanabilirsiniz.
    </p>
    <p><a class="cta" href="${magicLink}">Kayıt Sayfasını Aç</a></p>
    <p>
      Kabul edilmiş bildirileriniz panele otomatik gelecektir; birden fazla bildiri için tek
      seferde, indirimler uygulanmış biçimde ödeme yapabilirsiniz. Dilerseniz dinleyici olarak da
      kayıt yapabilirsiniz.
    </p>
    <p class="small">
      Bağlantı 24 saat geçerlidir; doğrulama sonrası aynı tarayıcıda 5 dakika boyunca devam
      edebilirsiniz. Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.
    </p>
    `,
    congressName,
  );

  return sendEmail({
    to,
    subject: `${congressName} - Kayıt sayfanıza erişim bağlantısı`,
    text: [
      `${congressName} kayıt sayfasına erişim bağlantısı:`,
      "",
      magicLink,
      "",
      "Kabul edilmiş bildirileriniz panele otomatik gelecek; tek seferde ödeme yapabilirsiniz.",
    ].join("\n"),
    html,
  });
}

export async function sendSubmissionStatusEmail({
  to,
  congressName,
  paperTitle,
  statusLabel,
  status,
  registrationUrl,
}: SubmissionStatusEmailInput) {
  const acceptedBlock =
    status === "ACCEPTED"
      ? `
        <p>
          Bildiriniz kongre programına kabul edilmiştir. Kayıt ücretinizi yatırmak ve programa
          dahil olmak için aşağıdaki bağlantıyı kullanabilirsiniz. Birden fazla kabul edilmiş
          bildiriniz varsa hepsini tek seferde, indirimler uygulanmış biçimde ödeyebilirsiniz.
        </p>
        ${registrationUrl ? `<p><a class="cta" href="${registrationUrl}">Kayıt Sayfasına Git</a></p>` : ""}
      `
      : "";

  const rejectedBlock =
    status === "REJECTED"
      ? `
        <p>
          Bildiriniz hakem değerlendirmesi sonucunda bu yıl programa alınamamıştır. Emeğiniz için
          teşekkür ederiz; ilerideki kongrelerimizde sizi tekrar aramızda görmekten memnuniyet
          duyarız.
        </p>
      `
      : "";

  const reviewBlock =
    status === "UNDER_REVIEW"
      ? `
        <p>
          Bildiriniz hakem değerlendirmesine alınmıştır. Süreç tamamlandığında sonuç yine bu
          e-posta adresine iletilecektir.
        </p>
      `
      : "";

  const html = emailLayout(
    `${congressName} - Bildiri durum güncellemesi`,
    `
    <h1>Bildirinizin durumu güncellendi</h1>
    <div class="meta">
      <p class="meta-row"><strong>Başlık:</strong> ${paperTitle}</p>
      <p class="meta-row"><strong>Yeni durum:</strong> ${statusLabel}</p>
    </div>
    ${reviewBlock}
    ${acceptedBlock}
    ${rejectedBlock}
    <p class="small">
      Bu güncelleme ile ilgili soru veya itirazlarınız için kongre sekretaryasına
      ulaşabilirsiniz.
    </p>
    `,
    congressName,
  );

  const textLines = [
    `${congressName} kapsamında gönderdiğiniz bildirinin durumu güncellendi.`,
    "",
    `Başlık: ${paperTitle}`,
    `Yeni durum: ${statusLabel}`,
  ];
  if (status === "ACCEPTED" && registrationUrl) {
    textLines.push("", `Kayıt ücretini yatırmak için: ${registrationUrl}`);
  }

  return sendEmail({
    to,
    subject: `${congressName} - Bildiri durum güncellemesi`,
    text: textLines.join("\n"),
    html,
  });
}
