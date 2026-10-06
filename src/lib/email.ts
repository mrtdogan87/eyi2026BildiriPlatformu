import type { ModuleKey, Prisma } from '@prisma/client';
import { enqueueMessage } from '@/modules/communication/queue.mjs';
import { defaultTemplate, renderTemplate, type TemplateKey, type TemplateLocale } from '@/modules/communication/templates';
import { AccessError } from '@/platform/http';

export type NotificationInput = {
  congressId: string; key: TemplateKey; locale: TemplateLocale; to: string; dedupeKey: string;
  values: Record<string, string>; module?: ModuleKey | null; sourceType?: string; sourceId?: string; expiresAt?: Date;
};

// The caller supplies its business transaction. Only the worker performs transport.
export async function enqueueNotification(tx: Prisma.TransactionClient, input: NotificationInput) {
  const [template, settings] = await Promise.all([
    tx.emailTemplate.findUnique({ where: { congressId_key_locale: { congressId: input.congressId, key: input.key, locale: input.locale } } }),
    tx.emailSettings.findUnique({ where: { congressId: input.congressId } }),
  ]);
  const content = template ?? defaultTemplate(input.key, input.locale);
  let rendered: ReturnType<typeof renderTemplate>;
  try { rendered = renderTemplate({ ...content, key: input.key, locale: input.locale, values: input.values, replyTo: settings?.replyTo, replyUrl: settings?.replyUrl }); }
  catch { throw new AccessError(400, 'Bilgilendirme şablonunu ve kongrenin yanıt adresini İletişim ekranından kontrol edin.'); }
  return enqueueMessage(tx, {
    congressId: input.congressId, dedupeKey: input.dedupeKey, templateKey: input.key, locale: input.locale,
    recipient: input.to, ...rendered, templateVersion: template?.version ?? 1, replyTo: settings?.replyTo,
    module: input.module ?? null, sourceType: input.sourceType, sourceId: input.sourceId, expiresAt: input.expiresAt,
  });
}
