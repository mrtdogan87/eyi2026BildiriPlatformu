import { z } from 'zod';
import { assertEnvironment } from './environment.mjs';

const accountSchema = z.object({
  name: z.string().trim().min(1).max(120).refine(value => !/[\u0000-\u001f\u007f]/.test(value)),
  email: z.string().trim().toLowerCase().email().max(254)
    .refine(value => !value.endsWith('.invalid'), 'A real administrator email is required.'),
  passwordHash: z.string().regex(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/),
}).strict();

export function parseBootstrapAccount(value) {
  const parsed = accountSchema.safeParse(value);
  if (!parsed.success) throw new Error('Invalid bootstrap account: real email, name and existing password hash required.');
  return parsed.data;
}

export function assertBootstrapTarget(env = process.env) {
  if (assertEnvironment(env).mode !== 'production'
      || env.V2_BOOTSTRAP_CONFIRM !== 'aibildiri_v2_production') {
    throw new Error('Bootstrap requires the dedicated production database and explicit V2_BOOTSTRAP_CONFIRM.');
  }
}

// Import the owner's existing login only. Never seed congresses, members or mail.
export async function bootstrapProductionAdmin({ prisma, account, env = process.env }) {
  assertBootstrapTarget(env);
  const data = parseBootstrapAccount(account);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('aibildiri-v2-initial-admin'))`;
    const counts = await Promise.all([
      tx.platformUser.count(),
      tx.organization.count({ where: { id: { not: 'legacy-unassigned' } } }),
      tx.congress.count(),
      tx.emailMessage.count(),
    ]);
    if (counts.some(count => count !== 0)) {
      throw new Error('Bootstrap refused: application data or an account already exists. Nothing was changed.');
    }
    const user = await tx.platformUser.create({ data: { ...data, platformAdmin: true, active: true } });
    await tx.auditLog.create({ data: { actorId: user.id, targetId: user.id, action: 'platform.bootstrap' } });
    return { created: true };
  }, { isolationLevel: 'Serializable', timeout: 10000 });
}
