type DraftEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
};

type BrevoSendResponse = {
  messageId?: string;
  code?: string;
  message?: string;
};

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? process.env.SMTP_FROM;
  const senderName = process.env.BREVO_SENDER_NAME ?? "EYI 2026 Bildiri Platformu";

  return {
    apiKey,
    senderEmail,
    senderName,
    isConfigured: Boolean(apiKey && senderEmail),
  };
}

export function isBrevoConfigured() {
  return getBrevoConfig().isConfigured;
}

export async function sendDraftAccessEmail({
  to,
  congressName,
  magicLink,
}: DraftEmailInput) {
  const brevo = getBrevoConfig();

  if (!brevo.isConfigured || !brevo.apiKey || !brevo.senderEmail) {
    throw new Error("Brevo API ayarları eksik.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": brevo.apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: brevo.senderEmail,
        name: brevo.senderName,
      },
      to: [
        {
          email: to,
        },
      ],
      subject: `${congressName} - Bildiri taslağınıza erişim linki`,
      textContent: [
        `${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.`,
        "",
        magicLink,
        "",
        "Bu bağlantı tek kullanımlıktır. Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.",
      ].join("\n"),
      htmlContent: `
        <p>${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.</p>
        <p><a href="${magicLink}">Taslağı aç</a></p>
        <p>Bu bağlantı tek kullanımlıktır. Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.</p>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as BrevoSendResponse | null;
    throw new Error(errorBody?.message ?? "Brevo e-posta gönderimi başarısız oldu.");
  }

  return (await response.json().catch(() => null)) as BrevoSendResponse | null;
}
