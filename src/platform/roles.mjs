export const roleOrder = ['ORGANIZER','SECRETARY','CONTENT_EDITOR','REVIEWER','SESSION_CHAIR','PARTICIPANT'];
export function membershipRoles(member) {
  if (!member) return [];
  const roles = member.roles?.length ? member.roles : [member.role];
  return roleOrder.filter(role => roles.includes(role));
}
export function effectiveRoles(platformAdmin, org, member) {
  return platformAdmin ? ['PLATFORM_ADMIN'] : org?.active && org.organizer ? ['ORGANIZER'] : org?.active && member?.active ? membershipRoles(member) : [];
}
