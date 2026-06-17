import nodemailer, { type Transporter } from "nodemailer";
import type { Locale } from "@/lib/i18n";

type DraftEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
  locale: Locale;
};

type RegistrationEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
  locale: Locale;
};

type SubmissionStatusEmailInput = {
  to: string;
  congressName: string;
  congressSlug: string;
  paperTitle: string;
  statusLabel: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  registrationUrl?: string;
  locale: Locale;
};

type SubmissionReceivedEmailInput = {
  to: string;
  congressName: string;
  paperTitle: string;
  locale: Locale;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

function getCongressEmailNames(congressName: string) {
  const normalized = congressName.toLocaleLowerCase("tr-TR");
  const isEyiCongress =
    normalized.includes("eyi") ||
    normalized.includes("iseos") ||
    normalized.includes("ekonometri") ||
    normalized.includes("econometrics");

  if (!isEyiCongress) {
    return { tr: congressName, en: congressName, brand: congressName };
  }

  return {
    tr: "EYİ2026",
    en: "ISEOS2026",
    brand: "EYİ2026 / ISEOS2026",
  };
}

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

function emailLayout(title: string, body: string, congressName: string, locale: Locale): string {
  const footer =
    locale === "en"
      ? "This email was sent automatically, please do not reply."
      : "Bu e-posta otomatik gönderilmiştir, lütfen yanıtlamayınız.";
  return `<!doctype html>
<html lang="${locale}">
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
      <p class="footer">${footer}</p>
    </div>
  </body>
</html>`;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = process.env.SMTP_FROM ?? user ?? "";
  const fromName = process.env.SMTP_FROM_NAME ?? "EYİ 2026";
  return { host, user, pass, port, secure, from, fromName, isConfigured: Boolean(host && user && pass) };
}

export function isSmtpConfigured() {
  return getSmtpConfig().isConfigured;
}

export function isEmailConfigured() {
  return isSmtpConfigured() || isResendConfigured();
}

let smtpTransport: Transporter | null = null;
function getSmtpTransport() {
  if (!smtpTransport) {
    const cfg = getSmtpConfig();
    smtpTransport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return smtpTransport;
}

type SendInput = { subject: string; to: string; text: string; html: string };

async function sendViaSmtp(input: SendInput) {
  const cfg = getSmtpConfig();
  const info = await getSmtpTransport().sendMail({
    from: `"${cfg.fromName}" <${cfg.from}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { id: info.messageId };
}

async function sendViaResend(input: SendInput) {
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

// EMAIL_PRIMARY=smtp|resend (varsayılan resend). Birincil başarısız/yapılandırılmamışsa diğerine düşer.
function getProviderOrder(): Array<"smtp" | "resend"> {
  const primary = (process.env.EMAIL_PRIMARY ?? "resend").toLowerCase() === "smtp" ? "smtp" : "resend";
  return primary === "smtp" ? ["smtp", "resend"] : ["resend", "smtp"];
}

async function sendEmail(input: SendInput) {
  const errors: string[] = [];
  for (const provider of getProviderOrder()) {
    try {
      if (provider === "smtp") {
        if (!isSmtpConfigured()) continue;
        return await sendViaSmtp(input);
      }
      if (!isResendConfigured()) continue;
      return await sendViaResend(input);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "hata"}`);
    }
  }
  throw new Error(
    errors.length
      ? `E-posta gönderilemedi (${errors.join(" | ")})`
      : "E-posta sağlayıcısı yapılandırılmadı.",
  );
}

export async function sendDraftAccessEmail({ to, congressName, magicLink, locale }: DraftEmailInput) {
  const congress = getCongressEmailNames(congressName);
  const name = locale === "en" ? congress.en : congress.tr;

  if (locale === "en") {
    const html = emailLayout(
      `${name} - Draft Access Link`,
      `
      <h1>Your draft access link is ready</h1>
      <p>
        Below is the secure access link to the draft you started on the <strong>${name}</strong>
        paper submission platform. After opening the link, you can reach your draft via the
        on-screen verification step.
      </p>
      <p><a class="cta" href="${magicLink}">Open Draft</a></p>
      <p class="small">
        The link is valid for 24 hours. After verification you can continue on the same browser for
        5 minutes; once it expires you can generate a new link.<br />
        If you did not request this link, you can ignore this email.
      </p>
      `,
      name,
      locale,
    );
    return sendEmail({
      to,
      subject: `${name} - Draft access link`,
      text: [
        `Access link to the draft you started on the ${name} paper submission platform:`,
        "",
        magicLink,
        "",
        "The link is valid for 24 hours; after verification you can continue on the same browser for 5 minutes.",
      ].join("\n"),
      html,
    });
  }

  const html = emailLayout(
    `${name} - Taslak Erişim Bağlantısı`,
    `
    <h1>Bildiri taslağınıza erişim bağlantınız hazır</h1>
    <p>
      <strong>${name}</strong> bildiri gönderim platformunda başlattığınız taslağa, güvenli erişim
      bağlantısı aşağıdadır. Bağlantıyı açtıktan sonra ekrandaki doğrulama adımıyla taslağınıza
      geçebilirsiniz.
    </p>
    <p><a class="cta" href="${magicLink}">Taslağı Aç</a></p>
    <p class="small">
      Bağlantı 24 saat geçerlidir. Doğrulamadan sonra aynı tarayıcıda 5 dakika boyunca devam
      edebilirsiniz; süre dolduğunda yeni bir bağlantı oluşturabilirsiniz.<br />
      Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.
    </p>
    `,
    name,
    locale,
  );
  return sendEmail({
    to,
    subject: `${name} - Taslak erişim bağlantısı`,
    text: [
      `${name} bildiri gönderim platformunda başlattığınız taslağa erişim bağlantısı:`,
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
  locale,
}: RegistrationEmailInput) {
  const congress = getCongressEmailNames(congressName);
  const name = locale === "en" ? congress.en : congress.tr;

  if (locale === "en") {
    const html = emailLayout(
      `${name} - Registration Access Link`,
      `
      <h1>Your registration login link is ready</h1>
      <p>
        You can use the secure link below to access the <strong>${name}</strong> registration page.
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
      name,
      locale,
    );
    return sendEmail({
      to,
      subject: `${name} - Registration access link`,
      text: [
        `Access link to the ${name} registration page:`,
        "",
        magicLink,
        "",
        "Your accepted papers will appear in the panel automatically; you can pay at once.",
      ].join("\n"),
      html,
    });
  }

  const html = emailLayout(
    `${name} - Kayıt Erişim Bağlantısı`,
    `
    <h1>Kayıt sayfanıza giriş bağlantınız hazır</h1>
    <p>
      <strong>${name}</strong> kayıt sayfasına girmek için aşağıdaki güvenli bağlantıyı
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
    `,
    name,
    locale,
  );
  return sendEmail({
    to,
    subject: `${name} - Kayıt erişim bağlantısı`,
    text: [
      `${name} kayıt sayfasına erişim bağlantısı:`,
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
  locale,
}: SubmissionStatusEmailInput) {
  const congress = getCongressEmailNames(congressName);
  const name = locale === "en" ? congress.en : congress.tr;
  const en = locale === "en";

  const statusLabelLocalized = en
    ? status === "ACCEPTED"
      ? "Accepted"
      : status === "REJECTED"
        ? "Rejected"
        : status === "UNDER_REVIEW"
          ? "Under Review"
          : "Submitted"
    : statusLabel;

  let block = "";
  if (status === "ACCEPTED") {
    block = en
      ? `<p>Your paper has been accepted into the congress program. You can use the link below to pay your registration fee and join the program. If more than one of your papers is accepted, you can pay for all of them at once.</p>${registrationUrl ? `<p><a class="cta" href="${registrationUrl}">Go to Registration Page</a></p>` : ""}`
      : `<p>Bildiriniz kongre programına kabul edilmiştir. Kayıt ücretinizi yatırmak ve programa dahil olmak için aşağıdaki bağlantıyı kullanabilirsiniz. Birden fazla kabul edilmiş bildiriniz varsa hepsini tek seferde ödeyebilirsiniz.</p>${registrationUrl ? `<p><a class="cta" href="${registrationUrl}">Kayıt Sayfasına Git</a></p>` : ""}`;
  } else if (status === "REJECTED") {
    block = en
      ? `<p>As a result of the peer review, your paper could not be included in this year's program. Thank you for your effort; we would be glad to see you again at our future congresses.</p>`
      : `<p>Bildiriniz hakem değerlendirmesi sonucunda bu yıl programa alınamamıştır. Emeğiniz için teşekkür ederiz; ilerideki kongrelerimizde sizi tekrar aramızda görmekten memnuniyet duyarız.</p>`;
  } else if (status === "UNDER_REVIEW") {
    block = en
      ? `<p>Your paper has been taken into peer review. Once the process is complete, the result will be sent again to this email address.</p>`
      : `<p>Bildiriniz hakem değerlendirmesine alınmıştır. Süreç tamamlandığında sonuç yine bu e-posta adresine iletilecektir.</p>`;
  }

  const html = emailLayout(
    en ? `${name} - Paper Status Update` : `${name} - Bildiri Durum Güncellemesi`,
    en
      ? `
      <h1>The status of your paper has been updated</h1>
      <div class="meta">
        <p class="meta-row"><strong>Title:</strong> ${paperTitle}</p>
        <p class="meta-row"><strong>New status:</strong> ${statusLabelLocalized}</p>
      </div>
      ${block}
      <p class="small">For any questions or objections regarding this update, you can contact the congress secretariat.</p>
      `
      : `
      <h1>Bildirinizin durumu güncellendi</h1>
      <div class="meta">
        <p class="meta-row"><strong>Başlık:</strong> ${paperTitle}</p>
        <p class="meta-row"><strong>Yeni durum:</strong> ${statusLabelLocalized}</p>
      </div>
      ${block}
      <p class="small">Bu güncelleme ile ilgili soru veya itirazlarınız için kongre sekretaryasına ulaşabilirsiniz.</p>
      `,
    name,
    locale,
  );

  const textLines = en
    ? [
        `The status of the paper you submitted for ${name} has been updated.`,
        "",
        `Title: ${paperTitle}`,
        `New status: ${statusLabelLocalized}`,
      ]
    : [
        `${name} kapsamında gönderdiğiniz bildirinin durumu güncellendi.`,
        "",
        `Başlık: ${paperTitle}`,
        `Yeni durum: ${statusLabelLocalized}`,
      ];
  if (status === "ACCEPTED" && registrationUrl) {
    textLines.push("", en ? `To pay the registration fee: ${registrationUrl}` : `Kayıt ücretini yatırmak için: ${registrationUrl}`);
  }

  return sendEmail({
    to,
    subject: en ? `${name} - Paper status update` : `${name} - Bildiri durum güncellemesi`,
    text: textLines.join("\n"),
    html,
  });
}

export async function sendSubmissionReceivedEmail({
  to,
  congressName,
  paperTitle,
  locale,
}: SubmissionReceivedEmailInput) {
  const congress = getCongressEmailNames(congressName);
  const name = locale === "en" ? congress.en : congress.tr;
  const en = locale === "en";

  const html = emailLayout(
    en ? `${name} - Paper Received` : `${name} - Bildiriniz Alındı`,
    en
      ? `
      <h1>Your paper has been received</h1>
      <div class="meta">
        <p class="meta-row"><strong>Title:</strong> ${paperTitle}</p>
      </div>
      <p>
        Your paper has been successfully uploaded to the <strong>${name}</strong> system and listed
        among its authors. The result will be sent to this email address after the peer review
        process is complete.
      </p>
      <p class="small">You are receiving this email because you are listed as an author of this paper.</p>
      `
      : `
      <h1>Bildiriniz alındı</h1>
      <div class="meta">
        <p class="meta-row"><strong>Başlık:</strong> ${paperTitle}</p>
      </div>
      <p>
        Bildiriniz <strong>${name}</strong> sistemine başarıyla yüklenmiş ve yazarları arasında yer
        almaktadır. Hakem değerlendirme süreci tamamlandığında sonuç bu e-posta adresine
        iletilecektir.
      </p>
      <p class="small">Bu e-postayı, bu bildiride yazar olarak kayıtlı olduğunuz için alıyorsunuz.</p>
      `,
    name,
    locale,
  );

  return sendEmail({
    to,
    subject: en ? `${name} - Your paper has been received` : `${name} - Bildiriniz alındı`,
    text: en
      ? [`Your paper has been received by ${name}.`, "", `Title: ${paperTitle}`, "", "The result will be emailed after the review process."].join("\n")
      : [`Bildiriniz ${name} sistemine alındı.`, "", `Başlık: ${paperTitle}`, "", "Sonuç, değerlendirme süreci sonrası e-posta ile iletilecektir."].join("\n"),
    html,
  });
}
