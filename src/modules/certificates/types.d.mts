import type { Prisma } from '@prisma/client';
import type { roles } from './core';
export type CertificateTypeDefinition = { key: string; name: string; baseRole: typeof roles[number]; custom: boolean };
type Db = Pick<Prisma.TransactionClient, 'certificateType'>;
export function certificateTypes(db: Db, congressId: string): Promise<CertificateTypeDefinition[]>;
export function resolveCertificateType(db: Db, congressId: string, key: string): Promise<CertificateTypeDefinition>;
export function certificateRoleLabel(role: string, snapshot?: unknown): string;
