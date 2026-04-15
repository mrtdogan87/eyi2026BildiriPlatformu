type DraftEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
};

type SubmissionStatusEmailInput = {
  to: string;
  congressName: string;
  paperTitle: string;
  statusLabel: string;
  note?: string;
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

export async function sendDraftAccessEmail({
  to,
  congressName,
  magicLink,
}: DraftEmailInput) {
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
      to: [to],
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
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ResendSendResponse | null;
    throw new Error(errorBody?.message ?? errorBody?.name ?? "Resend e-posta gönderimi başarısız oldu.");
  }

  return (await response.json().catch(() => null)) as ResendSendResponse | null;
}

export async function sendSubmissionStatusEmail({
  to,
  congressName,
  paperTitle,
  statusLabel,
  note,
}: SubmissionStatusEmailInput) {
  const resend = getResendConfig();

  if (!resend.isConfigured || !resend.apiKey || !resend.senderEmail) {
    throw new Error("Resend API ayarları eksik.");
  }

  const noteText = note?.trim() ? `Not: ${note.trim()}` : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${resend.senderName} <${resend.senderEmail}>`,
      to: [to],
      subject: `${congressName} - Bildiri durum güncellemesi`,
      text: [
        `${congressName} kapsamında gönderdiğiniz bildirinin durumu güncellendi.`,
        "",
        `Başlık: ${paperTitle}`,
        `Yeni durum: ${statusLabel}`,
        noteText,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>${congressName} kapsamında gönderdiğiniz bildirinin durumu güncellendi.</p>
        <p><strong>Başlık:</strong> ${paperTitle}</p>
        <p><strong>Yeni durum:</strong> ${statusLabel}</p>
        ${noteText ? `<p><strong>Not:</strong> ${note?.trim()}</p>` : ""}
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ResendSendResponse | null;
    throw new Error(errorBody?.message ?? errorBody?.name ?? "Resend e-posta gönderimi başarısız oldu.");
  }

  return (await response.json().catch(() => null)) as ResendSendResponse | null;
}
