import { z } from 'zod';

export const requestKinds = ['WITHDRAWAL_REQUEST', 'CANCELLATION_REQUEST', 'MANUAL_EMAIL', 'QUESTION'] as const;
export const requestStatuses = ['NEW', 'IN_PROGRESS', 'WAITING', 'RESOLVED'] as const;
export const sourceTypes = ['SUBMISSION', 'REGISTRATION', 'FEEDBACK', 'EMAIL_ISSUE'] as const;
const plainText = (max: number) => z.string().trim().max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Geçersiz kontrol karakteri.');
const source = {
  sourceType: z.enum(sourceTypes).optional(), sourceId: z.string().min(1).max(128).optional(),
};
const common = {
  requestKey: z.string().uuid(), subject: plainText(200).min(3), description: plainText(6000).min(8), ...source,
};
const sourcePair = (input: { sourceType?: string; sourceId?: string }, ctx: z.RefinementCtx) => {
  if (Boolean(input.sourceType) !== Boolean(input.sourceId)) ctx.addIssue({ code: 'custom', message: 'Kaynak türü ve kaydı birlikte gerekli.' });
};
export const participantRequestSchema = z.object({ ...common, kind: z.enum(['WITHDRAWAL_REQUEST', 'CANCELLATION_REQUEST', 'QUESTION']), sourceType: z.enum(['SUBMISSION', 'REGISTRATION']).optional() }).strict().superRefine((input, ctx) => {
  sourcePair(input, ctx);
  if ((input.kind === 'WITHDRAWAL_REQUEST' && input.sourceType !== 'SUBMISSION') || (input.kind === 'CANCELLATION_REQUEST' && input.sourceType !== 'REGISTRATION')) ctx.addIssue({ code: 'custom', message: 'Talep için ilgili bildiri veya kayıt seçilmeli.' });
});
export const staffRequestSchema = z.object({
  ...common, kind: z.enum(['MANUAL_EMAIL', 'QUESTION']),
  requesterEmail: z.string().trim().toLowerCase().email().max(254), requesterName: plainText(180).optional(),
  assigneeId: z.string().min(1).max(128).nullable().optional(),
}).strict().superRefine(sourcePair);
export const requestUpdateSchema = z.object({
  version: z.number().int().min(1), status: z.enum(requestStatuses),
  assigneeId: z.string().min(1).max(128).nullable().optional(),
  publicResult: plainText(4000).optional(), internalNote: plainText(4000).optional(),
}).strict();
export type ParticipantRequestInput = z.infer<typeof participantRequestSchema>;
export type StaffRequestInput = z.infer<typeof staffRequestSchema>;
export type RequestUpdateInput = z.infer<typeof requestUpdateSchema>;

export class WorklistError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function parseWorklist<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new WorklistError(400, result.error.issues[0]?.message ?? 'Talep alanlarını kontrol edin.');
  return result.data;
}
