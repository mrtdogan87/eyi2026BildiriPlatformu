import { AccessError } from './http';

// A session's selected congress can change in another browser tab. Versions
// protect concurrent edits within a congress; this also binds the form to it.
export function requireExpectedCongress(input: unknown, congressId: string) {
  if (typeof input !== 'object' || input === null || !('congressId' in input) || input.congressId !== congressId) {
    throw new AccessError(409, 'Seçili kongre değişti veya bu sayfa eski. Sayfayı yenileyip kongre adını kontrol ederek tekrar deneyin.');
  }
}
