import type { CongressRole } from '@prisma/client';
export type EffectiveRole = CongressRole | 'PLATFORM_ADMIN';
export const roleOrder: CongressRole[];
export function membershipRoles(member: { role: CongressRole; roles?: CongressRole[] } | null | undefined): CongressRole[];
export function effectiveRoles(platformAdmin: boolean | undefined, org: {active:boolean;organizer:boolean} | null | undefined, member: {role:CongressRole;roles?:CongressRole[];active:boolean} | null | undefined): EffectiveRole[];
