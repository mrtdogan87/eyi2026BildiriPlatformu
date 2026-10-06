import { z } from 'zod';
export const paymentInputSchema = z.object({
  kind: z.enum(['CREDIT', 'REFUND', 'PENDING', 'EXEMPT', 'REVOKE_EXEMPT', 'VOID']),
  version: z.number().int().nonnegative(), reason: z.string().trim().min(8).max(2000),
  amount: z.string().max(30).optional(), currency: z.enum(['TRY', 'EUR', 'USD']).optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(), reference: z.string().trim().min(3).max(128).optional(),
  bankTransactionId: z.string().min(1).max(128).optional(), targetId: z.string().min(1).max(128).optional(),
  confirmed: z.literal(true),
}).strict();
export const statementInputSchema = z.object({ accountKey: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/), note: z.string().trim().min(8).max(1000) }).strict();
