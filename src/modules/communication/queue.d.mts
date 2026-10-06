import type { EmailMessage, ModuleKey, Prisma, PrismaClient } from '@prisma/client';

export type EmailEnqueueInput = {
  congressId: string; dedupeKey: string; templateKey: string; templateVersion?: number;
  locale: 'tr' | 'en'; recipient: string; subject: string; text: string; html: string;
  module?: ModuleKey | null; replyTo?: string | null; sourceType?: string | null;
  sourceId?: string | null; expiresAt?: Date | null;
};
export type EmailTransportResult = {
  kind: 'captured' | 'accepted' | 'retry' | 'permanent' | 'unknown'; providerId?: string; errorCode?: string;
};
export type EmailTransport = { provider: 'capture' | 'smtp' | 'resend'; send(message: EmailMessage): Promise<EmailTransportResult> };
export function normalizeRecipient(value: string): string;
export function enqueueMessage(tx: Prisma.TransactionClient | PrismaClient, input: EmailEnqueueInput): Promise<EmailMessage>;
export function retryDelay(attempt: number): number;
export function processEmailQueue(options: { prisma: PrismaClient; transport: EmailTransport; now?: Date; batchSize?: number; leaseMs?: number; maxAttempts?: number; congressId?: string; messageIds?: string[] }): Promise<{ claimed: number; results: Array<{ id: string; status: EmailMessage['status'] }> }>;
