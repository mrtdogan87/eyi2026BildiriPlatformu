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
  const senderName = process.env.RESEND_SENDER_NAME ?? "EYİ2026 / ISEOS2026 Platformu";

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
  .divider { border:none; border-top:1px solid #e2e8f0; margin:26px 0; }
  .lang-tag { font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:0.12em; text-transform:uppercase; margin:0 0 10px; }
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
      <p class="footer">Bu e-posta otomatik gönderilmiştir, lütfen yanıtlamayınız. · This email was sent automatically, please do not reply.</p>
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
    `${congressName} - Draft Access Link / Taslak Erişim Bağlantısı`,
    `
    <p class="lang-tag">Türkçe</p>
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
    <hr class="divider" />
    <p class="lang-tag">English</p>
    <h1>Your draft access link is ready</h1>
    <p>
      Below is the secure access link to the draft you started on the
      <strong>${congressName}</strong> paper submission platform. After opening the link, you can
      reach your draft via the on-screen verification step.
    </p>
    <p><a class="cta" href="${magicLink}">Open Draft</a></p>
    <p class="small">
      The link is valid for 24 hours. After verification you can continue on the same browser for
      5 minutes; once it expires you can generate a new link.<br />
      If you did not request this link, you can ignore this email.
    </p>
    `,
    congressName,
  );

  return sendEmail({
    to,
    subject: `${congressName} - Draft access link / Taslak erişim bağlantısı`,
    text: [
      `${congressName} bildiri gönderim platformunda başlattığınız taslağa erişim bağlantısı:`,
      "",
      magicLink,
      "",
      "Bağlantı 24 saat geçerlidir; doğrulama sonrası aynı tarayıcıda 5 dakika boyunca devam edebilirsiniz.",
      "",
      "----",
      "",
      `Access link to the draft you started on the ${congressName} paper submission platform:`,
      "",
      magicLink,
      "",
      "The link is valid for 24 hours; after verification you can continue on the same browser for 5 minutes.",
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
    `${congressName} - Registration Access Link / Kayıt Erişim Bağlantısı`,
    `
    <p class="lang-tag">Türkçe</p>
    <h1>Kayıt sayfanıza giriş bağlantınız hazır</h1>
    <p>
      <strong>${congressName}</strong> kayıt sayfasına girmek için aşağıdaki güvenli bağlantıyı
      kullanabilirsiniz.
    </p>
    <p><a class="cta" href="${magicLink}">Kayıt Sayfasını Aç</a></p>
    <p>
      Kabul edilmiş bildirileriniz panele otomatik gelecektir; birden fazla bildiri için tek
      seferde ödeme yapabilirsiniz. Dilerseniz dinleyici olarak da kayıt yapabilirsiniz.
    </p>
    <p class="small">
      Bağlantı 24 saat geçerlidir; doğrulama sonrası aynı tarayıcıda 5 dakika boyunca devam
      edebilirsiniz. Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.
    </p>
    <hr class="divider" />
    <p class="lang-tag">English</p>
    <h1>Your registration login link is ready</h1>
    <p>
      You can use the secure link below to access the <strong>${congressName}</strong> registration
      page.
    </p>
    <p><a class="cta" href="${magicLink}">Open Registration Page</a></p>
    <p>
      Your accepted papers will appear in the panel automatically; you can pay for multiple papers
      at once. You may also register as a listener if you wish.
    </p>
    <p class="small">
      The link is valid for 24 hours; after verification you can continue on the same browser for
      5 minutes. If you did not request this link, you can ignore this email.
    </p>
    `,
    congressName,
  );

  return sendEmail({
    to,
    subject: `${congressName} - Registration access link / Kayıt erişim bağlantısı`,
    text: [
      `${congressName} kayıt sayfasına erişim bağlantısı:`,
      "",
      magicLink,
      "",
      "Kabul edilmiş bildirileriniz panele otomatik gelecek; tek seferde ödeme yapabilirsiniz.",
      "",
      "----",
      "",
      `Access link to the ${congressName} registration page:`,
      "",
      magicLink,
      "",
      "Your accepted papers will appear in the panel automatically; you can pay at once.",
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
  const statusLabelEn =
    status === "ACCEPTED"
      ? "Accepted"
      : status === "REJECTED"
        ? "Rejected"
        : status === "UNDER_REVIEW"
          ? "Under Review"
          : "Submitted";

  // ---- Türkçe bloklar ----
  const acceptedBlockTr =
    status === "ACCEPTED"
      ? `
        <p>
          Bildiriniz kongre programına kabul edilmiştir. Kayıt ücretinizi yatırmak ve programa
          dahil olmak için aşağıdaki bağlantıyı kullanabilirsiniz. Birden fazla kabul edilmiş
          bildiriniz varsa hepsini tek seferde ödeyebilirsiniz.
        </p>
        ${registrationUrl ? `<p><a class="cta" href="${registrationUrl}">Kayıt Sayfasına Git</a></p>` : ""}
      `
      : "";

  const rejectedBlockTr =
    status === "REJECTED"
      ? `
        <p>
          Bildiriniz hakem değerlendirmesi sonucunda bu yıl programa alınamamıştır. Emeğiniz için
          teşekkür ederiz; ilerideki kongrelerimizde sizi tekrar aramızda görmekten memnuniyet
          duyarız.
        </p>
      `
      : "";

  const reviewBlockTr =
    status === "UNDER_REVIEW"
      ? `
        <p>
          Bildiriniz hakem değerlendirmesine alınmıştır. Süreç tamamlandığında sonuç yine bu
          e-posta adresine iletilecektir.
        </p>
      `
      : "";

  // ---- English blocks ----
  const acceptedBlockEn =
    status === "ACCEPTED"
      ? `
        <p>
          Your paper has been accepted into the congress program. You can use the link below to pay
          your registration fee and join the program. If more than one of your papers is accepted,
          you can pay for all of them at once.
        </p>
        ${registrationUrl ? `<p><a class="cta" href="${registrationUrl}">Go to Registration Page</a></p>` : ""}
      `
      : "";

  const rejectedBlockEn =
    status === "REJECTED"
      ? `
        <p>
          As a result of the peer review, your paper could not be included in this year's program.
          Thank you for your effort; we would be glad to see you again at our future congresses.
        </p>
      `
      : "";

  const reviewBlockEn =
    status === "UNDER_REVIEW"
      ? `
        <p>
          Your paper has been taken into peer review. Once the process is complete, the result will
          be sent again to this email address.
        </p>
      `
      : "";

  const html = emailLayout(
    `${congressName} - Paper Status Update / Bildiri Durum Güncellemesi`,
    `
    <p class="lang-tag">Türkçe</p>
    <h1>Bildirinizin durumu güncellendi</h1>
    <div class="meta">
      <p class="meta-row"><strong>Başlık:</strong> ${paperTitle}</p>
      <p class="meta-row"><strong>Yeni durum:</strong> ${statusLabel}</p>
    </div>
    ${reviewBlockTr}
    ${acceptedBlockTr}
    ${rejectedBlockTr}
    <p class="small">
      Bu güncelleme ile ilgili soru veya itirazlarınız için kongre sekretaryasına
      ulaşabilirsiniz.
    </p>
    <hr class="divider" />
    <p class="lang-tag">English</p>
    <h1>The status of your paper has been updated</h1>
    <div class="meta">
      <p class="meta-row"><strong>Title:</strong> ${paperTitle}</p>
      <p class="meta-row"><strong>New status:</strong> ${statusLabelEn}</p>
    </div>
    ${reviewBlockEn}
    ${acceptedBlockEn}
    ${rejectedBlockEn}
    <p class="small">
      For any questions or objections regarding this update, you can contact the congress
      secretariat.
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
  textLines.push("", "----", "");
  textLines.push(
    `The status of the paper you submitted for ${congressName} has been updated.`,
    "",
    `Title: ${paperTitle}`,
    `New status: ${statusLabelEn}`,
  );
  if (status === "ACCEPTED" && registrationUrl) {
    textLines.push("", `To pay the registration fee: ${registrationUrl}`);
  }

  return sendEmail({
    to,
    subject: `${congressName} - Paper status update / Bildiri durum güncellemesi`,
    text: textLines.join("\n"),
    html,
  });
}
