/**
 * tool-helpers.ts — per-tool error isolation helpers.
 *
 * KAREN Phase 1 (2026-05-02):
 *   - errorResponse(): structured MCP error scoped to a single user; other users unaffected.
 *   - MFA error string verbatim per ARIIA non-negotiable #6 (§3).
 *   - callWithBreaker(): wraps a client method call with circuit-breaker check (§3 spec).
 */

import { ClientPool } from '../client/client-pool.js';
import type { GarminClient } from '../client/garmin.client.js';

export type McpTextContent = { type: 'text'; text: string };
export type McpToolResult = { isError?: boolean; content: McpTextContent[] };

/** MFA error string — verbatim per ARIIA non-negotiable #6 */
export function mfaRequiredError(userId: string): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          `MFA REQUIRED for user '${userId}' — Carlos must disable MFA at ` +
          `https://www.garmin.com/account/security or this user is blocked. ` +
          `The MCP cannot complete login flows that require an MFA code.`,
      },
    ],
  };
}

/** Generic auth failure — scoped to a single user; other users unaffected. */
export function authErrorResponse(userId: string, err: unknown): McpToolResult {
  const message = err instanceof Error ? err.message : String(err);

  // Check for MFA-specific error patterns
  if (
    message.toLowerCase().includes('mfa') ||
    message.toLowerCase().includes('multifactor') ||
    message.toLowerCase().includes('mfa is required')
  ) {
    return mfaRequiredError(userId);
  }

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          `Garmin auth failure for user '${userId}': ${message}. ` +
          `Other users unaffected.`,
      },
    ],
  };
}

/** Circuit breaker fast-fail response — open state. */
export function breakerOpenResponse(userId: string, reopenAt: Date): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text:
          `Garmin circuit breaker OPEN for user '${userId}' — cooling off until ` +
          `${reopenAt.toISOString()} (PST: ${reopenAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}). ` +
          `Other users unaffected.`,
      },
    ],
  };
}

/** Generic tool error (non-auth network/API failure). */
export function toolErrorResponse(userId: string, toolName: string, err: unknown): McpToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Tool '${toolName}' failed for user '${userId}': ${message}. Other users unaffected.`,
      },
    ],
  };
}

/** Success response: JSON-serialized payload. */
export function successResponse(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * callWithBreaker — wraps a GarminClient method call with:
 *   1. Circuit-breaker check (fast-fail if open)
 *   2. Per-tool try/catch for failure isolation
 *   3. Auth failure detection → recordAuthFailure + half-open tracking
 *
 * @param pool        the ClientPool instance
 * @param userId      resolved user id from tool args
 * @param toolName    for error message context
 * @param fn          async function receiving the GarminClient and returning raw data
 */
export async function callWithBreaker(
  pool: ClientPool,
  userId: string,
  toolName: string,
  fn: (client: GarminClient) => Promise<unknown>,
): Promise<McpToolResult> {
  // 1. Circuit breaker check
  const breakerStatus = pool.checkBreaker(userId);
  if (breakerStatus.open) {
    return breakerOpenResponse(userId, breakerStatus.reopenAt!);
  }

  // Are we in half-open (just passed the reopenAt threshold)?
  const isHalfOpen = isInHalfOpen(pool, userId);

  let client: GarminClient;
  try {
    client = pool.get(userId);
  } catch (err) {
    return toolErrorResponse(userId, toolName, err);
  }

  // 2. Execute
  try {
    const data = await fn(client);

    // Half-open success → close breaker
    if (isHalfOpen) {
      pool.recordHalfOpenResult(userId, true);
    }

    return successResponse(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError = isGarminAuthError(message);

    if (isAuthError) {
      if (isHalfOpen) {
        // Half-open failure → re-open breaker
        pool.recordHalfOpenResult(userId, false);
      } else {
        // Record auth failure (only refreshOrRelogin throws count)
        pool.recordAuthFailure(userId);
      }
      return authErrorResponse(userId, err);
    }

    return toolErrorResponse(userId, toolName, err);
  }
}

/**
 * Detect whether the breaker is in half-open state (past reopenAt but not yet
 * resolved). We expose this by checking if the pool has a non-null reopenAt
 * that is now in the past.
 * ClientPool doesn't expose raw state directly — we use the semantics:
 * checkBreaker returns open:false when past reopenAt (half-open or fully closed).
 * We can't distinguish without exposing internal state, so we expose a helper method
 * on the pool. For now, implement conservatively: treat any call that gets through
 * as potentially half-open by checking if the breaker was recently opened.
 */
function isInHalfOpen(pool: ClientPool, userId: string): boolean {
  // We use a pool method to check — if the pool's internal reopenAt is non-null
  // and in the past, we're half-open.
  return pool.isHalfOpen(userId);
}

/** Heuristic: is this error from auth/refresh rather than a data API call? */
function isGarminAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('oauth') ||
    lower.includes('login') ||
    lower.includes('authentication') ||
    lower.includes('token') ||
    lower.includes('credential') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('mfa') ||
    lower.includes('invalid credentials') ||
    lower.includes('max retries exceeded') ||
    lower.includes('failed to obtain oauth') ||
    lower.includes('login failed')
  );
}
