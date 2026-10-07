import { z } from 'zod';
import { eventSettingsSchema } from './configuration';

// Shared by the setup review and the API; no database or account data here.
export const creationSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  newOrganization: z.object({
    name: z.string().trim().min(3, 'Kurum adı en az 3 karakter olmalı.').max(200, 'Kurum adı en fazla 200 karakter olabilir.').refine(name => !/[\u0000-\u001f\u007f]/.test(name), 'Kurum adı tek satır olmalı.'),
  }).strict().optional(),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Adres küçük harf, sayı ve tirelerden oluşmalı.').refine(s => !['admin', 'api', 'hesap', 'yeni', 'login'].includes(s), 'Bu adres kullanılamaz.'),
  settings: eventSettingsSchema,
  responsible:z.object({name:z.string().trim().min(1).max(120),email:z.string().trim().toLowerCase().email().max(254)}).strict().optional(),
  sourceId: z.string().min(1).optional(),
  copyFees: z.boolean().default(false),
  memberIds: z.array(z.string()).max(100).default([]),
}).strict().superRefine((input, ctx) => {
  if (Boolean(input.organizationId) === Boolean(input.newOrganization)) ctx.addIssue({ code: 'custom', message: 'Mevcut kurumu seçin veya yeni kurum adı girin; ikisini birlikte seçmeyin.' });
  if (!input.settings.eventStartsAt || !input.settings.eventEndsAt) ctx.addIssue({ code: 'custom', message: 'Yeni kongre için başlangıç ve bitiş tarihi gerekli.' });
  if ((input.copyFees || input.memberIds.length) && !input.sourceId) ctx.addIssue({ code: 'custom', message: 'Kopyalama için kaynak kongre seçin.' });
});
