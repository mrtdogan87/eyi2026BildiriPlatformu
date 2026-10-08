export function hasIntervention(session, congressId = session?.congressId) {
  return Boolean(session?.user?.platformAdmin && congressId && session.congressId === congressId
    && session.interventionReason?.trim().length >= 10 && session.interventionStartedAt
    && !session.revokedAt && new Date(session.expiresAt) > new Date());
}
