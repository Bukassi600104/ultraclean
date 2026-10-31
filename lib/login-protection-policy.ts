/** Prepared policy only. No login caller imports this module; activation is held. */
export const LOGIN_PROTECTION_ACTIVE = false;
const MINUTE = 60_000;
export type AccountProtection = { failures: number[]; lockouts: number[]; blockedUntil: number };
export type ProtectionDecision = { allowed: boolean; retryAfterSeconds: number };
export const emptyAccountProtection = (): AccountProtection => ({ failures: [], lockouts: [], blockedUntil: 0 });
const decision = (until: number, now: number): ProtectionDecision => ({
  allowed: until <= now, retryAfterSeconds: Math.max(0, Math.ceil((until - now) / 1000)),
});
/** Run inside a database transaction holding this subject's row lock. Never use process memory as the store. */
export function accountPasswordAttempt(state: AccountProtection, valid: boolean, now: number) {
  if (state.blockedUntil > now) return { state, ...decision(state.blockedUntil, now), shouldLogoutUser: false as const };
  const lockouts = state.lockouts.filter(t => t > now - 24 * 60 * MINUTE);
  const failures = valid ? [] : [...state.failures.filter(t => t > now - 15 * MINUTE), now];
  if (failures.length >= 5) {
    const duration = [15, 30, 60][Math.min(lockouts.length, 2)] * MINUTE;
    const next = { failures: [], lockouts: [...lockouts, now], blockedUntil: now + duration };
    return { state: next, ...decision(next.blockedUntil, now), shouldLogoutUser: false as const };
  }
  return { state: { failures, lockouts, blockedUntil: 0 }, allowed: true, retryAfterSeconds: 0, shouldLogoutUser: false as const };
}

export type WindowProtection = { events: number[]; blockedUntil: number };
/** allowed means proceed to authentication, never that authentication succeeded. */
export function consumeWindow(state: WindowProtection, now: number, limit: number, windowMs: number, blockMs = 0) {
  if (state.blockedUntil > now) return { state, ...decision(state.blockedUntil, now) };
  const events = state.events.filter(t => t > now - windowMs);
  if (events.length >= limit) {
    const until = blockMs ? now + blockMs : events[0] + windowMs;
    return { state: { events, blockedUntil: blockMs ? until : 0 }, ...decision(until, now) };
  }
  return { state: { events: [...events, now], blockedUntil: 0 }, allowed: true, retryAfterSeconds: 0 };
}

export const PROTECTION_LIMITS = {
  ipAttempts: { limit: 20, windowMs: MINUTE },
  ipFailures: { limit: 50, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE },
  recoveryAccount: { limit: 3, windowMs: 60 * MINUTE },
  recoveryIp: { limit: 10, windowMs: 60 * MINUTE },
} as const;

/** Record a failed password result; the threshold failure itself starts the IP restriction. */
export function recordIpFailure(state: WindowProtection, now: number) {
  if (state.blockedUntil > now) return { state, ...decision(state.blockedUntil, now) };
  const events = [...state.events.filter(t => t > now - 15 * MINUTE), now];
  const until = events.length >= 50 ? now + 15 * MINUTE : 0;
  return { state: { events: until ? [] : events, blockedUntil: until }, ...decision(until, now) };
}

/** Storage/network errors must never become successful protection decisions. */
export async function requireProtectionDecision(operation: () => Promise<ProtectionDecision>): Promise<ProtectionDecision> {
  try {
    const result = await operation();
    if (typeof result?.allowed !== 'boolean' || !Number.isFinite(result.retryAfterSeconds) || result.retryAfterSeconds < 0) throw Error();
    return result;
  } catch { throw new Error('LOGIN_PROTECTION_UNAVAILABLE'); }
}

/** This checks eligibility only. Endpoint must derive inputs from verified server identity and audit atomically. */
export function canUnlockStaff(input: { actorRole: string; actorSuspended: boolean; targetRole: string; reauthenticatedAt: number; now: number }) {
  return input.actorRole === 'admin' && !input.actorSuspended &&
    ['manager', 'property_manager', 'content_manager', 'farm_vet', 'farm_accountant'].includes(input.targetRole) &&
    input.reauthenticatedAt > 0 && input.reauthenticatedAt <= input.now && input.now - input.reauthenticatedAt <= 5 * MINUTE;
}
