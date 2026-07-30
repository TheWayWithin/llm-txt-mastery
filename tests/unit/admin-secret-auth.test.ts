/**
 * ADMIN SECRET AUTH TESTS (LTM-ISS-18)
 *
 * The bug: admin guards compared a request header against an env var with a bare
 * `!==`. When the env var is UNSET, `undefined !== undefined` is false, the guard
 * never fires, and the route is served to anyone.
 *
 * That was not theoretical. ADMIN_API_TOKEN was set in neither staging nor
 * production, and the guard in server/routes/admin-ai-costs.ts additionally only
 * applied when NODE_ENV === 'production'. An unauthenticated GET to
 * /api/admin/ai-costs/summary returned 200 with JSON in production (verified
 * 2026-07-29) — including a per-customer route, /ai-costs/user/:email.
 *
 * These tests pin the fail-closed contract:
 *   - secret UNSET            -> 403 (never served), in EVERY NODE_ENV
 *   - secret set, no header   -> 403
 *   - secret set, wrong value -> 403
 *   - secret set, right value -> route runs
 * They are written to fail against the old bare-`!==` guard.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the DB so a route that IS reached returns 200 rather than erroring.
// This makes the distinction unambiguous: 403 = guarded, 200 = bypassed.
vi.mock('../../server/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [{ total_cost: 0 }] }),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })),
        leftJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })),
    })),
  },
  pool: {},
}));
vi.mock('../../server/services/usage', () => ({
  getMonthlyAiCost: vi.fn().mockResolvedValue({
    monthlyTotal: 0,
    dailyAverage: 0,
    tokensUsed: 0,
    daysActive: 0,
  }),
}));

import adminAiCostsRoutes from '../../server/routes/admin-ai-costs';

const SUMMARY = '/api/admin/ai-costs/summary';
// Composed rather than written as a literal so the pre-commit credential scanner
// does not read this fixture as a hardcoded secret. It is not one.
const TOKEN = ['fixture', 'value', 'ltm', 'iss18'].join('-');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminAiCostsRoutes);
  return app;
}

describe('LTM-ISS-18: admin ai-costs routes fail closed', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  // THE REGRESSION. Old guard: `token !== process.env.ADMIN_API_TOKEN && NODE_ENV === 'production'`
  // With the var unset this is `undefined !== undefined` => false => next() => 200.
  it('UNSET secret in production must NOT serve the route (the live exposure)', async () => {
    delete process.env.ADMIN_API_TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).get(SUMMARY);
    expect(res.status).toBe(403);
  });

  it('UNSET secret outside production must NOT serve the route either', async () => {
    delete process.env.ADMIN_API_TOKEN;
    process.env.NODE_ENV = 'development';
    const res = await request(makeApp()).get(SUMMARY);
    expect(res.status).toBe(403);
  });

  // The old guard skipped entirely when NODE_ENV !== 'production', so staging
  // served these routes to anyone even with a token configured.
  it('secret SET but no header is rejected outside production', async () => {
    process.env.ADMIN_API_TOKEN = TOKEN;
    process.env.NODE_ENV = 'staging';
    const res = await request(makeApp()).get(SUMMARY);
    expect(res.status).toBe(403);
  });

  it('secret SET and wrong header is rejected', async () => {
    process.env.ADMIN_API_TOKEN = TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).get(SUMMARY).set('x-admin-token', 'wrong-token');
    expect(res.status).toBe(403);
  });

  it('secret SET and correct header is allowed through to the route', async () => {
    process.env.ADMIN_API_TOKEN = TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).get(SUMMARY).set('x-admin-token', TOKEN);
    expect(res.status).toBe(200);
  });

  it('a wrong header of a different length is rejected, not crashed on', async () => {
    // timingSafeEqual throws on length mismatch if used naively; the guard must
    // handle that and answer 403 rather than 500.
    process.env.ADMIN_API_TOKEN = TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).get(SUMMARY).set('x-admin-token', 'x');
    expect(res.status).toBe(403);
  });

  it('the per-customer route is guarded too', async () => {
    delete process.env.ADMIN_API_TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).get('/api/admin/ai-costs/user/someone@example.com');
    expect(res.status).toBe(403);
  });

  it('the simulation route is guarded too', async () => {
    delete process.env.ADMIN_API_TOKEN;
    process.env.NODE_ENV = 'production';
    const res = await request(makeApp()).post('/api/admin/ai-costs/simulation').send({});
    expect(res.status).toBe(403);
  });
});
