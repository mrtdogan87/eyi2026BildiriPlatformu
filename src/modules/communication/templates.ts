import { z } from 'zod';

export const templateKeys = ['DRAFT_ACCESS', 'REGISTRATION_ACCESS', 'PARTICIPANT_ACCESS', 'SUBMISSION_RECEIVED', 'SUBMISSION_STATUS', 'ACCOUNT_ACTIVATION', 'GENERAL'] as const;
export type TemplateKey = typeof templateKeys[number];
// Personal-account recovery is independent of a congress and cannot be edited
// or sent as a sample from a congress's communication administration.
export const platformTemplateKeys = ['ACCOUNT_PASSWORD_RECOVERY'] as const;
export type RenderableTemplateKey = TemplateKey | typeof platformTemplateKeys[number];
const renderableTemplateKeys: readonly string[] = [...templateKeys, ...platformTemplateKeys];
export type TemplateLocale = 'tr' | 'en';
export type TemplateContent = { subject: string; body: string };
const placeholders: Record<RenderableTemplateKey, readonly string[]> = {
  DRAFT_ACCESS: ['congressName', 'accessLink'], REGISTRATION_ACCESS: ['congressName', 'accessLink'],
  PARTICIPANT_ACCESS: ['congressName', 'accessLink'],
  SUBMISSION_RECEIVED: ['congressName', 'paperTitle'], SUBMISSION_STATUS: ['congressName', 'paperTitle', 'statusLabel', 'registrationUrl'],
  ACCOUNT_ACTIVATION: ['congressName', 'activationLink'], GENERAL: ['congressName', 'recipientName', 'message'],
  ACCOUNT_PASSWORD_RECOVERY: ['platformName', 'recoveryLink'],
};
const required: Partial<Record<RenderableTemplateKey, string>> = { DRAFT_ACCESS: 'accessLink', REGISTRATION_ACCESS: 'accessLink', PARTICIPANT_ACCESS: 'accessLink', ACCOUNT_ACTIVATION: 'activationLink', ACCOUNT_PASSWORD_RECOVERY: 'recoveryLink' };
const urlFields = new Set(['accessLink', 'activationLink', 'registrationUrl', 'recoveryLink']);
const placeholderPattern = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;
// Match existing business input limits: congress/event name and author name 180,
// configured submission titles 50,000. General messages have their own 12,000 cap.
const fieldLimits: Record<string, number> = {
  congressName: 180, platformName: 180, paperTitle: 50000, recipientName: 180, message: 12000,
  statusLabel: 120, accessLink: 2048, activationLink: 2048, registrationUrl: 2048, recoveryLink: 2048,
};
const maxTextLength = 64000, maxHtmlLength = 400000;
function expansionBudget(body: string): { text: number; html: number } {
  const literal = body.replace(placeholderPattern, '');
  // Reserve for optional Reply-To/contact footer, HTML links, layout and subject.
  let text = literal.length + 3000;
  let html = escapeEmailHtml(literal).replace(/\r?\n/g, '<br />').length + 32000;
  for (const match of body.matchAll(placeholderPattern)) {
    const limit = fieldLimits[match[1]] ?? 0;
    text += limit;
    // Six is the longest escaped character (or line break). URLs are rendered
    // twice, once in href and once as visible text; links add a small wrapper.
    html += urlFields.has(match[1]) ? limit * 12 + 20 : limit * 6;
  }
  return { text, html };
}
export function templatePlaceholders(key: RenderableTemplateKey): readonly string[] { return placeholders[key]; }

export function defaultTemplate(key: RenderableTemplateKey, locale: TemplateLocale): TemplateContent {
  const en = locale === 'en';
  const defaults: Record<RenderableTemplateKey, TemplateContent> = {
    PARTICIPANT_ACCESS: {
      subject: en ? '{{congressName}} - Participant panel access' : '{{congressName}} - Katılımcı paneli erişimi',
      body: en ? 'View your papers, registration and requests for {{congressName}} using the link below:\n\n{{accessLink}}\n\nThe link is valid for 24 hours and can be used once. If you did not request this message, you can ignore it.' : '{{congressName}} kapsamında bildiri, kayıt ve taleplerinizi aşağıdaki bağlantıdan takip edebilirsiniz:\n\n{{accessLink}}\n\nBağlantı 24 saat geçerlidir ve bir kez kullanılabilir. Bu mesajı talep etmediyseniz yok sayabilirsiniz.',
    },
    DRAFT_ACCESS: {
      subject: en ? '{{congressName}} - Draft access link' : '{{congressName}} - Taslak erişim bağlantısı',
      body: en ? 'Access your draft for {{congressName}} using the secure link below:\n\n{{accessLink}}\n\nThis link is valid for 24 hours. After verification you can continue in the same browser for 5 minutes. If you did not request this link, you can ignore this email.' : '{{congressName}} bildiri taslağınıza aşağıdaki güvenli bağlantıdan erişebilirsiniz:\n\n{{accessLink}}\n\nBağlantı 24 saat geçerlidir. Doğrulamadan sonra aynı tarayıcıda 5 dakika devam edebilirsiniz. Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.',
    },
    REGISTRATION_ACCESS: {
      subject: en ? '{{congressName}} - Registration access link' : '{{congressName}} - Kayıt erişim bağlantısı',
      body: en ? 'Access your registration for {{congressName}} using the secure link below:\n\n{{accessLink}}\n\nThis link is valid for 24 hours. After verification you can continue in the same browser for 5 minutes. If you did not request this link, you can ignore this email.' : '{{congressName}} kayıt sayfanıza aşağıdaki güvenli bağlantıdan erişebilirsiniz:\n\n{{accessLink}}\n\nBağlantı 24 saat geçerlidir. Doğrulamadan sonra aynı tarayıcıda 5 dakika devam edebilirsiniz. Bu bağlantıyı talep etmediyseniz e-postayı yok sayabilirsiniz.',
    },
    SUBMISSION_RECEIVED: {
      subject: en ? '{{congressName}} - Your paper has been received' : '{{congressName}} - Bildiriniz alındı',
      body: en ? 'Your paper has been received by {{congressName}}.\n\nTitle: {{paperTitle}}\n\nYou are receiving this notification because you are listed as an author. Submission, evaluation, registration and payment are tracked separately.' : 'Bildiriniz {{congressName}} sistemine alındı.\n\nBaşlık: {{paperTitle}}\n\nBu bildiride yazar olarak kayıtlı olduğunuz için bu bildirimi alıyorsunuz. Gönderim, değerlendirme, kayıt ve ödeme durumları ayrı izlenir.',
    },
    SUBMISSION_STATUS: {
      subject: en ? '{{congressName}} - Paper status update' : '{{congressName}} - Bildiri durum güncellemesi',
      body: en ? 'The status of your paper for {{congressName}} has changed.\n\nTitle: {{paperTitle}}\nNew status: {{statusLabel}}\n\n{{registrationUrl}}\n\nThis update does not confirm payment or a scheduled presentation.' : '{{congressName}} kapsamında bildirinizin durumu güncellendi.\n\nBaşlık: {{paperTitle}}\nYeni durum: {{statusLabel}}\n\n{{registrationUrl}}\n\nBu bildirim ödeme doğrulaması veya programda sunum saati atandığı anlamına gelmez.',
    },
    ACCOUNT_ACTIVATION: {
      subject: en ? '{{congressName}} - Activate your personal account' : '{{congressName}} - Kişisel hesabınızı etkinleştirin',
      body: en ? 'You have been invited to the {{congressName}} team. Set your personal password within 24 hours using the secure link below:\n\n{{activationLink}}\n\nIf you were not expecting this invitation, you can ignore this email.' : '{{congressName}} ekibine davet edildiniz. Aşağıdaki güvenli bağlantıyla 24 saat içinde kişisel parolanızı oluşturun:\n\n{{activationLink}}\n\nBu daveti beklemiyorsanız e-postayı yok sayabilirsiniz.',
    },
    ACCOUNT_PASSWORD_RECOVERY: {
      subject: en ? '{{platformName}} - Reset your password' : '{{platformName}} - Parolanızı yenileyin',
      body: en ? 'A password reset was requested for your personal account on {{platformName}}. Choose a new password using the secure link below:\n\n{{recoveryLink}}\n\nThis link is valid for 30 minutes and can be used once. Requesting another link invalidates this one. If you did not request this reset, you can ignore this email; your password remains unchanged.' : '{{platformName}} kişisel hesabınız için parola yenileme isteği alındı. Aşağıdaki güvenli bağlantıyla yeni parolanızı belirleyin:\n\n{{recoveryLink}}\n\nBağlantı 30 dakika geçerlidir ve bir kez kullanılabilir. Yeni bağlantı istemeniz bu bağlantıyı geçersizleştirir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; parolanız değişmez.',
    },
    GENERAL: {
      subject: en ? '{{congressName}} - Message from the secretariat' : '{{congressName}} - Sekretaryadan mesaj',
      body: en ? 'Hello {{recipientName}},\n\n{{message}}' : 'Merhaba {{recipientName}},\n\n{{message}}',
    },
  };
  return { ...defaults[key] };
}

export function isSafeEmailUrl(value: string): boolean {
  if (!value || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)));
  } catch { return false; }
}
export function isSafeReplyTo(value: string): boolean { return value.length <= 254 && !/[\r\n]/.test(value) && z.string().email().safeParse(value).success; }

export function templateProblems(key: RenderableTemplateKey, content: TemplateContent): string[] {
  const problems: string[] = [];
  if (!renderableTemplateKeys.includes(key)) return ['Geçersiz e-posta şablonu.'];
  if (!content.subject.trim() || content.subject.length > 200 || /[\r\n\u0000]/.test(content.subject)) problems.push('Konu tek satır ve 1–200 karakter olmalı.');
  if (!content.body.trim() || content.body.length > 12000 || /\u0000/.test(content.body)) problems.push('Mesaj 1–12000 karakter olmalı.');
  for (const text of [content.subject, content.body]) {
    for (const match of text.matchAll(placeholderPattern)) if (!placeholders[key].includes(match[1])) problems.push('Şablonda desteklenmeyen alan var.');
    if (/[{}]/.test(text.replace(placeholderPattern, ''))) problems.push('Alanlar {{alanAdı}} biçiminde yazılmalı.');
  }
  const link = required[key];
  if (link && ![...content.body.matchAll(placeholderPattern)].some(m => m[1] === link)) problems.push('Güvenli erişim bağlantısı mesajda bulunmalı.');
  if (link && content.body.split(/\r?\n/).some(line => {
    const matches = [...line.matchAll(placeholderPattern)];
    return matches.some(m => m[1] === link) && !(matches.length === 1 && line.trim() === matches[0][0]);
  })) problems.push('Güvenli erişim bağlantısı ayrı satırda tek başına bulunmalı.');
  if ([...content.subject.matchAll(placeholderPattern)].some(m => urlFields.has(m[1]))) problems.push('Erişim bağlantıları e-posta konusuna eklenemez.');
  const budget = expansionBudget(content.body);
  if (budget.text > maxTextLength || budget.html > maxHtmlLength) problems.push('Şablon alanları çok fazla tekrar ediyor veya mesaj çok uzun; gövdeyi kısaltın.');
  return [...new Set(problems)];
}
export const templateInputSchema = z.object({ key: z.enum(templateKeys), locale: z.enum(['tr', 'en']), subject: z.string().min(1).max(200), body: z.string().min(1).max(12000) }).strict().superRefine((input, ctx) => {
  for (const message of templateProblems(input.key, input)) ctx.addIssue({ code: 'custom', message });
});
export function escapeEmailHtml(value: string): string { return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!)); }

export function renderTemplate(input: TemplateContent & { key: RenderableTemplateKey; locale: TemplateLocale; values: Record<string, string>; replyTo?: string | null; replyUrl?: string | null }): { subject: string; text: string; html: string } {
  const problems = templateProblems(input.key, input);
  if (problems.length) throw new Error(problems[0]);
  if (input.locale !== 'tr' && input.locale !== 'en') throw new Error('Geçersiz e-posta dili.');
  if (input.replyTo && !isSafeReplyTo(input.replyTo)) throw new Error('Geçerli bir yanıt adresi gerekli.');
  if (input.replyUrl && !isSafeEmailUrl(input.replyUrl)) throw new Error('Geçerli bir iletişim bağlantısı gerekli.');
  if (input.key === 'GENERAL' && !input.replyTo) throw new Error('Yanıt beklenen mesajlar için yanıt adresi gerekli.');
  for (const [name, value] of Object.entries(input.values)) {
    if (!placeholders[input.key].includes(name) || typeof value !== 'string' || value.length > fieldLimits[name] || /\u0000/.test(value)) throw new Error('Geçersiz şablon alanı.');
    if (urlFields.has(name) && value && !isSafeEmailUrl(value)) throw new Error('Güvenli bağlantı doğrulanamadı.');
  }
  const render = (source: string, html: boolean, subjectValue = false) => source.replace(placeholderPattern, (_match, name: string) => {
    const value = input.values[name];
    if (value === undefined || (required[input.key] === name && !value)) throw new Error('Şablon alanı eksik.');
    if (html && urlFields.has(name) && value) return `<a href="${escapeEmailHtml(value)}">${escapeEmailHtml(value)}</a>`;
    return html ? escapeEmailHtml(value) : subjectValue ? value.replace(/[\r\n\t\u2028\u2029]+/g, ' ') : value;
  });
  // A long or multiline business field must not abort the business transaction.
  // Keep the complete field in the body; bound only the display subject by codepoint.
  const subjectPoints = Array.from(render(input.subject, false, true).trim());
  const subject = subjectPoints.length > 240 ? subjectPoints.slice(0, 239).join('') + '…' : subjectPoints.join('');
  if (!subject || /[\r\n\u0000]/.test(subject)) throw new Error('Oluşturulan e-posta konusu geçersiz.');
  const footer: string[] = [], en = input.locale === 'en';
  if (input.replyTo) footer.push(en ? `Reply to the secretariat: ${input.replyTo}` : `Sekretaryaya yanıt adresi: ${input.replyTo}`);
  if (input.replyUrl) footer.push(en ? `Contact / participant panel: ${input.replyUrl}` : `İletişim / katılımcı paneli: ${input.replyUrl}`);
  if (!input.replyTo && !input.replyUrl) footer.push(en ? 'This is an automatic notification; no reply address has been configured.' : 'Bu otomatik bir bildirimdir; yanıt adresi tanımlanmamıştır.');
  const text = [render(input.body, false), ...footer].join('\n\n');
  if (text.length > maxTextLength) throw new Error('Oluşturulan e-posta çok uzun.');
  const bodyHtml = render(escapeEmailHtml(input.body), true).replace(/\r?\n/g, '<br />');
  const footerHtml = footer.map(line => {
    let escaped = escapeEmailHtml(line);
    if (input.replyUrl && line.includes(input.replyUrl)) escaped = escaped.replace(escapeEmailHtml(input.replyUrl), () => `<a href="${escapeEmailHtml(input.replyUrl!)}">${escapeEmailHtml(input.replyUrl!)}</a>`);
    if (input.replyTo && line.includes(input.replyTo)) escaped = escaped.replace(escapeEmailHtml(input.replyTo), () => `<a href="mailto:${escapeEmailHtml(input.replyTo!)}">${escapeEmailHtml(input.replyTo!)}</a>`);
    return `<p>${escaped}</p>`;
  }).join('');
  const html = `<!doctype html><html lang="${input.locale}"><head><meta charset="utf-8"><title>${escapeEmailHtml(subject)}</title></head><body><main><p>${bodyHtml}</p>${footerHtml}</main></body></html>`;
  if (html.length > maxHtmlLength) throw new Error('Oluşturulan e-posta çok uzun.');
  return { subject, text, html };
}
export function sampleTemplateValues(key: RenderableTemplateKey, locale: TemplateLocale): Record<string, string> {
  const all: Record<string, string> = {
    congressName: locale === 'en' ? 'Example Congress' : 'Örnek Kongre', accessLink: 'https://example.invalid/congress/access?token=preview', activationLink: 'https://example.invalid/account/activate?token=preview',
    platformName: locale === 'en' ? 'Congress Management Platform' : 'Kongre Yönetim Platformu', recoveryLink: 'https://example.invalid/hesap/parola-yenile#token=preview',
    paperTitle: locale === 'en' ? 'Example paper' : 'Örnek bildiri', statusLabel: locale === 'en' ? 'Accepted' : 'Kabul edildi', registrationUrl: 'https://example.invalid/congress/registration',
    recipientName: locale === 'en' ? 'Example participant' : 'Örnek katılımcı', message: locale === 'en' ? 'This is a template preview.' : 'Bu bir şablon önizlemesidir.',
  };
  return Object.fromEntries(placeholders[key].map(name => [name, all[name]]));
}
