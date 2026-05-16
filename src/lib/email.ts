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
  note?: string;
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
  return sendEmail({
    to,
    subject: `${congressName} - Bildiri taslağınıza erişim linki`,
    text: [
      `${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.`,
      "",
      magicLink,
      "",
      "Bağlantıyı açtıktan sonra ekrandaki doğrulama adımı ile taslağınıza geçebilirsiniz.",
      "Doğrulamanın ardından aynı cihazda 5 dakika boyunca devam edebilirsiniz.",
      "Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.",
    ].join("\n"),
    html: `
      <p>${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.</p>
      <p><a href="${magicLink}">Taslağı aç</a></p>
      <p>Bağlantıyı açtıktan sonra ekrandaki doğrulama adımı ile taslağınıza geçebilirsiniz.</p>
      <p>Doğrulamanın ardından aynı cihazda 5 dakika boyunca devam edebilirsiniz.</p>
      <p>Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.</p>
    `,
  });
}

export async function sendRegistrationAccessEmail({
  to,
  congressName,
  magicLink,
}: RegistrationEmailInput) {
  return sendEmail({
    to,
    subject: `${congressName} - Kayıt sayfanıza erişim linki`,
    text: [
      `${congressName} kayıt sayfasına aşağıdaki bağlantı ile erişebilirsiniz.`,
      "",
      magicLink,
      "",
      "Bağlantıyı açtıktan sonra ekrandaki doğrulama adımı ile kayıt panelinize geçebilirsiniz.",
      "Kabul edilmiş bildirileriniz varsa otomatik listelenecektir; dinleyici olarak da kayıt yapabilirsiniz.",
    ].join("\n"),
    html: `
      <p>${congressName} kayıt sayfasına aşağıdaki bağlantı ile erişebilirsiniz.</p>
      <p><a href="${magicLink}">Kayıt sayfasını aç</a></p>
      <p>Kabul edilmiş bildirileriniz varsa otomatik listelenecektir; dinleyici olarak da kayıt yapabilirsiniz.</p>
    `,
  });
}

export async function sendSubmissionStatusEmail({
  to,
  congressName,
  paperTitle,
  statusLabel,
  status,
  note,
  registrationUrl,
}: SubmissionStatusEmailInput) {
  const noteText = note?.trim() ? `Not: ${note.trim()}` : "";
  const acceptedExtra =
    status === "ACCEPTED" && registrationUrl
      ? `Kabul edilen bildiriniz için kayıt ücretini ${registrationUrl} adresinden yatırabilirsiniz. Birden fazla bildiriniz kabul edildiyse tek seferde, indirimli olarak ödeyebilirsiniz.`
      : "";

  return sendEmail({
    to,
    subject: `${congressName} - Bildiri durum güncellemesi`,
    text: [
      `${congressName} kapsamında gönderdiğiniz bildirinin durumu güncellendi.`,
      "",
      `Başlık: ${paperTitle}`,
      `Yeni durum: ${statusLabel}`,
      noteText,
      "",
      acceptedExtra,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>${congressName} kapsamında gönderdiğiniz bildirinin durumu güncellendi.</p>
      <p><strong>Başlık:</strong> ${paperTitle}</p>
      <p><strong>Yeni durum:</strong> ${statusLabel}</p>
      ${noteText ? `<p><strong>Not:</strong> ${note?.trim()}</p>` : ""}
      ${
        acceptedExtra
          ? `<p>${acceptedExtra.replace(
              registrationUrl ?? "",
              `<a href="${registrationUrl}">${registrationUrl}</a>`,
            )}</p>`
          : ""
      }
    `,
  });
}
