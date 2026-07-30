/**
 * Shared fail-closed guard for shared-secret admin endpoints (LTM-ISS-18).
 *
 * Replaces the pattern `if (header !== process.env.SOME_TOKEN) return 403`, which
 * fails OPEN when the environment variable is unset: `undefined !== undefined` is
 * false, so the guard never fires and the route is served to anyone. That was a
 * live exposure on /api/admin/ai-costs/* in production, where ADMIN_API_TOKEN was
 * never set (verified 2026-07-29).
 *
 * Contract:
 *   - configured secret missing or empty -> 403, ALWAYS. Never serve the route.
 *   - header missing / wrong / wrong length -> 403.
 *   - enforced in every NODE_ENV. There is no environment in which an admin route
 *     is open, because "staging is safe" is how the production hole survived.
 *   - comparison is constant-time, so the secret cannot be recovered by timing.
 *
 * The 403 body is identical whether the server is misconfigured or the caller is
 * simply wrong: a distinct "not configured" response would tell an attacker which
 * deployments to keep probing. Misconfiguration is surfaced in the server log and
 * refused at boot (server/startup-security-validation.ts) instead.
 */

import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const FORBIDDEN = {
  error: 'Admin access required',
  code: 'ADMIN_ACCESS_REQUIRED',
} as const;

/** Constant-time string compare that is safe for differing lengths. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // timingSafeEqual throws unless the buffers are the same length, so compare
  // lengths separately and still run the constant-time check on equal-length
  // input to keep the timing profile flat for same-length guesses.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Build an Express middleware that requires a shared admin secret.
 *
 * @param envVar name of the environment variable holding the expected secret
 * @param headerName request header carrying the caller's secret
 */
export function requireAdminSecret(envVar: string, headerName: string) {
  return function adminSecretGuard(req: Request, res: Response, next: NextFunction) {
    const expected = process.env[envVar];

    // Fail closed. A missing secret is a server misconfiguration, never a pass.
    if (!expected || expected.trim() === '') {
      console.error(
        `[ADMIN AUTH] ${envVar} is not set — refusing ${req.method} ${req.originalUrl}. ` +
          `Admin endpoints stay closed until it is configured.`
      );
      return res.status(403).json(FORBIDDEN);
    }

    const raw = req.headers[headerName.toLowerCase()];
    const provided = Array.isArray(raw) ? raw[0] : raw;
    if (typeof provided !== 'string' || provided.length === 0) {
      return res.status(403).json(FORBIDDEN);
    }

    if (!secretsMatch(provided, expected)) {
      return res.status(403).json(FORBIDDEN);
    }

    return next();
  };
}
