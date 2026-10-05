export function hashPassword(password: string): string;
export function verifyPassword(password: string, hash: string | null): boolean;
export function hashToken(token: string): string;
export function newToken(): string;
