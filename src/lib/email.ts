import nodemailer from "nodemailer";

type DraftEmailInput = {
  to: string;
  congressName: string;
  magicLink: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    isConfigured: Boolean(host && port && user && pass && from),
  };
}

export function isSmtpConfigured() {
  return getSmtpConfig().isConfigured;
}

export async function sendDraftAccessEmail({
  to,
  congressName,
  magicLink,
}: DraftEmailInput) {
  const smtp = getSmtpConfig();

  if (!smtp.isConfigured || !smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from) {
    throw new Error("SMTP ayarları eksik.");
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transport.sendMail({
    from: smtp.from,
    to,
    subject: `${congressName} - Bildiri taslağınıza erişim linki`,
    text: [
      `${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.`,
      "",
      magicLink,
      "",
      "Bu bağlantı tek kullanımlıktır. Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.",
    ].join("\n"),
    html: `
      <p>${congressName} için başlattığınız bildiri taslağına aşağıdaki bağlantı ile erişebilirsiniz.</p>
      <p><a href="${magicLink}">Taslağı aç</a></p>
      <p>Bu bağlantı tek kullanımlıktır. Süresi dolduysa yeni bir bağlantı oluşturabilirsiniz.</p>
    `,
  });
}
