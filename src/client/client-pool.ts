/**
 * ClientPool — parses GARMIN_USERS JSON env var, instantiates one GarminClient
 * per user with per-user token directory derived as ${GARMIN_TOKEN_ROOT}/${userId}.
 *
 * KAREN BLOCKER (§2): TOKEN_DIR module-scope reference removed from GarminAuth;
 * each client now receives its own tokenDir via constructor parameter.
 *
 * Circuit-breaker spec (§3):
 *   - Per-user, isolated: one user's open breaker never affects others.
 *   - Increment only when refreshOrRelogin() itself throws (happy-path 401+refresh = no count).
 *   - 3 failures within 60s → open 5 minutes.
 *   - Half-open at 5-minute mark: next call passes through; success → close; failure → re-open.
 */

import path from 'node:path';
import { GarminClient } from './garmin.client.js';

export interface UserConfig {
  id: string;
  email: string;
  password: string;
}

interface BreakerState {
  /** timestamps (ms) of recent hard failures within the 60-second budget window */
  failureTimes: number[];
  /** when the breaker opened (ms), or null if closed/half-open */
  openedAt: number | null;
  /** reopenAt timestamp (ms) — calls before this fast-fail; at/after this, half-open */
  reopenAt: number | null;
}

const BREAKER_WINDOW_MS = 60_000;
const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_OPEN_DURATION_MS = 5 * 60_000;

export class ClientPool {
  private readonly clients = new Map<string, GarminClient>();
  private readonly breakers = new Map<string, BreakerState>();
  /** Ordered list of user ids as parsed from GARMIN_USERS */
  readonly userIds: string[];

  constructor(users: UserConfig[], tokenRoot: string) {
    if (users.length === 0) {
      throw new Error('GARMIN_USERS must contain at least one user');
    }

    for (const user of users) {
      if (!user.id || !user.email || !user.password) {
        throw new Error(`Invalid user config — all of id, email, password are required (got: ${JSON.stringify(user)})`);
      }
      const tokenDir = path.join(tokenRoot, user.id);
      this.clients.set(user.id, new GarminClient(user.email, user.password, tokenDir));
      this.breakers.set(user.id, { failureTimes: [], openedAt: null, reopenAt: null });
    }

    this.userIds = users.map((u) => u.id);
  }

  /**
   * Get the GarminClient for a user. Call isBreakerOpen() first to decide whether
   * to fast-fail before touching the client.
   */
  get(userId: string): GarminClient {
    const client = this.clients.get(userId);
    if (!client) {
      throw new Error(`Unknown user '${userId}'. Valid users: ${this.userIds.join(', ')}`);
    }
    return client;
  }

  has(userId: string): boolean {
    return this.clients.has(userId);
  }

  /**
   * Check breaker state for a user.
   * Returns { open: true, reopenAt } if fast-fail applies, { open: false } otherwise.
   * Side-effect: transitions closed → half-open at reopenAt threshold.
   */
  checkBreaker(userId: string): { open: boolean; reopenAt?: Date } {
    const state = this.breakers.get(userId)!;
    const now = Date.now();

    if (state.reopenAt !== null) {
      if (now < state.reopenAt) {
        // still open
        return { open: true, reopenAt: new Date(state.reopenAt) };
      }
      // half-open — let next call through; don't reset state yet (recordBreakerResult does that)
      return { open: false };
    }

    return { open: false };
  }

  /**
   * Record a hard auth failure (refreshOrRelogin threw).
   * Only call this when the auth-refresh path itself fails, NOT on a 401 that resolves after refresh.
   */
  recordAuthFailure(userId: string): void {
    const state = this.breakers.get(userId)!;
    const now = Date.now();

    // Prune stale failures outside the 60s window
    state.failureTimes = state.failureTimes.filter((t) => now - t < BREAKER_WINDOW_MS);
    state.failureTimes.push(now);

    if (state.failureTimes.length >= BREAKER_FAILURE_THRESHOLD) {
      state.openedAt = now;
      state.reopenAt = now + BREAKER_OPEN_DURATION_MS;
      state.failureTimes = []; // reset budget for next cycle
    }
  }

  /**
   * Record the result of a call that passed through while the breaker was half-open.
   * success=true → close breaker; success=false → re-open for another 5 minutes.
   */
  recordHalfOpenResult(userId: string, success: boolean): void {
    const state = this.breakers.get(userId)!;
    if (success) {
      // Close
      state.openedAt = null;
      state.reopenAt = null;
      state.failureTimes = [];
    } else {
      // Re-open
      const now = Date.now();
      state.openedAt = now;
      state.reopenAt = now + BREAKER_OPEN_DURATION_MS;
    }
  }

  /**
   * Returns true if the breaker is in half-open state:
   * reopenAt is non-null and has passed (i.e., the breaker just became half-open).
   * Half-open means: the next call is allowed through; outcome determines close vs re-open.
   */
  isHalfOpen(userId: string): boolean {
    const state = this.breakers.get(userId)!;
    if (state.reopenAt === null) return false;
    return Date.now() >= state.reopenAt;
  }

  /** Returns the Zod enum values array (string literals) for the user enum. */
  get userEnum(): [string, ...string[]] {
    if (this.userIds.length === 0) throw new Error('No users configured');
    return this.userIds as [string, ...string[]];
  }
}

/**
 * Parse GARMIN_USERS JSON and GARMIN_TOKEN_ROOT from env, return a ClientPool.
 * Throws with a descriptive message on invalid config.
 */
export function buildClientPool(): ClientPool {
  const usersJson = process.env.GARMIN_USERS;
  const tokenRoot = process.env.GARMIN_TOKEN_ROOT;

  if (!usersJson) {
    throw new Error(
      'GARMIN_USERS env var is required.\n' +
      'Expected JSON array: [{"id":"carlos","email":"...","password":"..."},{"id":"carlitos",...},...]',
    );
  }
  if (!tokenRoot) {
    throw new Error(
      'GARMIN_TOKEN_ROOT env var is required.\n' +
      'Per-user token directories will be created at ${GARMIN_TOKEN_ROOT}/${userId}/',
    );
  }

  let users: UserConfig[];
  try {
    users = JSON.parse(usersJson);
  } catch (err) {
    throw new Error(`GARMIN_USERS is not valid JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('GARMIN_USERS must be a non-empty JSON array');
  }

  return new ClientPool(users, tokenRoot);
}
