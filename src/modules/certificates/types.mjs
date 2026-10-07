import { CertificateError, certificateRoleSchema, roles, roleLabels } from './core.ts';

const standardTypes = () => roles.map(key => ({ key, name: roleLabels[key], baseRole: key, custom: false }));
function customType(record) {
  if (!roles.includes(record.baseRole) || !certificateRoleSchema.safeParse(record.key).success || !record.key.startsWith('CUSTOM_')) {
    throw new CertificateError('Belge türünün temel görevi geçersiz; kongre yöneticisine başvurun.', 409);
  }
  return { key: record.key, name: record.name, baseRole: record.baseRole, custom: true };
}

// The stored type and its base role are immutable. A different policy gets a new
// type/key, so an existing recipient, rule or issued PDF cannot silently change.
export async function certificateTypes(db, congressId) {
  const records = await db.certificateType.findMany({ where: { congressId }, orderBy: { createdAt: 'asc' }, take: 101 });
  if (records.length > 100) throw new CertificateError('Kongre başına en fazla 100 özel belge türü desteklenir.');
  return [...standardTypes(), ...records.map(customType)];
}

export async function resolveCertificateType(db, congressId, key) {
  if (!certificateRoleSchema.safeParse(key).success) throw new CertificateError('Kayıtlı bir belge türü seçin.');
  const standard = standardTypes().find(type => type.key === key);
  if (standard) return standard;
  const record = await db.certificateType.findFirst({ where: { congressId, key } });
  if (!record) throw new CertificateError('Bu kongrede kayıtlı bir belge türü seçin.');
  return customType(record);
}

export function certificateRoleLabel(role, snapshot) {
  return typeof snapshot?.roleLabel === 'string' && snapshot.roleLabel ? snapshot.roleLabel : roleLabels[role] ?? 'Belge';
}
