import { createHmac } from 'node:crypto';

/** Server-only utility. Dedicated secret, not public API key; never persist raw identifiers. */
export function protectionSubject(kind: 'account' | 'ip', identifier: string, secret: string): string {
  if (secret.length < 32) throw new Error('LOGIN_PROTECTION_UNAVAILABLE');
  const normalized = kind === 'account' ? identifier.trim().toLowerCase() : identifier.trim();
  if (!normalized) throw new Error('LOGIN_PROTECTION_UNAVAILABLE');
  return createHmac('sha256', secret).update(`${kind}:${normalized}`).digest('hex');
}
