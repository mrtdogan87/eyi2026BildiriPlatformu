import type { EmailTransport, EmailTransportResult } from './queue.mjs';
export function createEmailTransport(options?: { env?: NodeJS.ProcessEnv; root?: string }): EmailTransport;
export function classifySmtpFailure(error: unknown): EmailTransportResult;
