/**
 * ADMIN CREDIT-RESET ENDPOINT TESTS (LTM-ISS-3)
 *
 * Covers POST /api/auth/admin/reset-coffee-credits and its sibling
 * POST /api/auth/admin/fix-coffee-credits, the manual recovery levers used when
 * a paying Solo customer's monthly credit renewal fails. The reset handler once
 * crashed on an undefined COFFEE_TIER_CREDITS (ReferenceError -> 500); the
 * constant now lives at module scope (= 20 = TIER_LIMITS.solo.dailyAnalyses).
 *
 * These tests mount the REAL auth router via supertest and mock only the storage
 * and renewal layer, so every branch and its side-effects are exercised without a
 * database or network. "Correct" per branch (from server/routes/auth.ts):
 *   - no / wrong x-admin-key        -> 403 ADMIN_ACCESS_REQUIRED
 *   - valid key, missing email      -> 400 EMAIL_REQUIRED
 *   - valid key, unknown user       -> 404 USER_NOT_FOUND
 *   - valid key, non-Solo tier      -> 400 NOT_SOLO_TIER (+ userTier)
 *   - valid key, solo/coffee user   -> 200, credits set to 20, and
 *                                      handleSubscriptionRenewal(user.id) called
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const ADMIN_KEY = 'test-admin-key-ltm-iss3';
const RESET_CREDITS = 20; // COFFEE_TIER_CREDITS === TIER_LIMITS.solo.dailyAnalyses

// vi.hoisted so the mock factories can reference these before vitest hoists vi.mock().
const { mockGetUserByEmail, mockUpdateUser, mockGetUsersByTier, mockHandleRenewal } = vi.hoisted(
  () => ({
    mockGetUserByEmail: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockGetUsersByTier: vi.fn(),
    mockHandleRenewal: vi.fn(),
  })
);

vi.mock('../../server/services/auth-storage', () => ({
  authStorage: {
    getUserByEmail: mockGetUserByEmail,
    updateUser: mockUpdateUser,
    getUsersByTier: mockGetUsersByTier,
  },
  AuthStorage: class {},
}));

// handleSubscriptionRenewal is dynamically imported inside the success path.
vi.mock('../../server/services/usage', () => ({
  handleSubscriptionRenewal: mockHandleRenewal,
}));

// Stub the email service so importing the router has no side effects.
vi.mock('../../server/services/email', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  verifyEmailToken: vi.fn(),
  checkEmailServiceHealth: vi.fn(),
}));

// Router reads process.env.ADMIN_KEY per request; set it before requests run.
const previousAdminKey = process.env.ADMIN_KEY;

// eslint-disable-next-line @typescript-eslint/no-var-requires
import authRouter from '../../server/routes/auth';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

const RESET_PATH = '/api/auth/admin/reset-coffee-credits';
const FIX_PATH = '/api/auth/admin/fix-coffee-credits';

const soloUser = {
  id: 42,
  email: 'solo-customer@example.com',
  tier: 'solo',
  creditsRemaining: 3,
};
const coffeeUser = {
  id: 43,
  email: 'legacy-coffee@example.com',
  tier: 'coffee',
  creditsRemaining: 0,
};
const starterUser = {
  id: 44,
  email: 'free-user@example.com',
  tier: 'starter',
  creditsRemaining: 0,
};

describe('POST /api/auth/admin/reset-coffee-credits (LTM-ISS-3)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_KEY = ADMIN_KEY;
    mockUpdateUser.mockResolvedValue({ ...soloUser, creditsRemaining: RESET_CREDITS });
    mockHandleRenewal.mockResolvedValue(undefined);
    app = makeApp();
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = previousAdminKey;
  });

  it('rejects a request with no admin key: 403 ADMIN_ACCESS_REQUIRED', async () => {
    const res = await request(app).post(RESET_PATH).send({ email: soloUser.email });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_ACCESS_REQUIRED');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects a wrong admin key: 403 ADMIN_ACCESS_REQUIRED', async () => {
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', 'wrong-key')
      .send({ email: soloUser.email });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_ACCESS_REQUIRED');
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects a valid key with no email: 400 EMAIL_REQUIRED', async () => {
    const res = await request(app).post(RESET_PATH).set('x-admin-key', ADMIN_KEY).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('EMAIL_REQUIRED');
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects an unknown user: 404 USER_NOT_FOUND', async () => {
    mockGetUserByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', ADMIN_KEY)
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects a non-Solo tier user: 400 NOT_SOLO_TIER with the tier echoed', async () => {
    mockGetUserByEmail.mockResolvedValue(starterUser);
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', ADMIN_KEY)
      .send({ email: starterUser.email });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NOT_SOLO_TIER');
    expect(res.body.userTier).toBe('starter');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('resets a Solo user to 20 credits, calls the renewal handler, returns 200', async () => {
    mockGetUserByEmail.mockResolvedValue(soloUser);
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', ADMIN_KEY)
      .send({ email: soloUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newCredits).toBe(RESET_CREDITS);
    expect(res.body.previousCredits).toBe(soloUser.creditsRemaining);

    // Side-effect 1: credits set to the Solo monthly allocation.
    expect(mockUpdateUser).toHaveBeenCalledWith(soloUser.id, {
      creditsRemaining: RESET_CREDITS,
    });
    // Side-effect 2: renewal handler invoked with the user's id.
    expect(mockHandleRenewal).toHaveBeenCalledWith(soloUser.id);
  });

  it('accepts a legacy coffee-tier user on the success path', async () => {
    mockGetUserByEmail.mockResolvedValue(coffeeUser);
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', ADMIN_KEY)
      .send({ email: coffeeUser.email });

    expect(res.status).toBe(200);
    expect(res.body.newCredits).toBe(RESET_CREDITS);
    expect(mockUpdateUser).toHaveBeenCalledWith(coffeeUser.id, {
      creditsRemaining: RESET_CREDITS,
    });
    expect(mockHandleRenewal).toHaveBeenCalledWith(coffeeUser.id);
  });

  it('returns 500 (not a silent crash) if storage throws', async () => {
    mockGetUserByEmail.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post(RESET_PATH)
      .set('x-admin-key', ADMIN_KEY)
      .send({ email: soloUser.email });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('RESET_ERROR');
  });
});

describe('POST /api/auth/admin/fix-coffee-credits (sibling, shares COFFEE_TIER_CREDITS)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_KEY = ADMIN_KEY;
    mockUpdateUser.mockResolvedValue(undefined);
    app = makeApp();
  });

  it('rejects with no admin key: 403 ADMIN_ACCESS_REQUIRED', async () => {
    const res = await request(app).post(FIX_PATH).send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_ACCESS_REQUIRED');
    expect(mockGetUsersByTier).not.toHaveBeenCalled();
  });

  it('tops up only Solo/coffee users below 20 credits and reports the fixes', async () => {
    // Two solo users (one already at 20, one below) + one legacy coffee user below.
    mockGetUsersByTier.mockImplementation((tier: string) => {
      if (tier === 'solo')
        return Promise.resolve([
          { id: 1, email: 'full@example.com', tier: 'solo', creditsRemaining: 20 },
          { id: 2, email: 'low@example.com', tier: 'solo', creditsRemaining: 5 },
        ]);
      if (tier === 'coffee')
        return Promise.resolve([
          { id: 3, email: 'legacy@example.com', tier: 'coffee', creditsRemaining: 0 },
        ]);
      return Promise.resolve([]);
    });

    const res = await request(app).post(FIX_PATH).set('x-admin-key', ADMIN_KEY).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Only the two below-threshold users are fixed; the already-full one is skipped.
    expect(res.body.fixes).toHaveLength(2);
    const fixedIds = res.body.fixes.map((f: { userId: number }) => f.userId).sort();
    expect(fixedIds).toEqual([2, 3]);
    expect(mockUpdateUser).toHaveBeenCalledTimes(2);
    expect(mockUpdateUser).toHaveBeenCalledWith(2, { creditsRemaining: RESET_CREDITS });
    expect(mockUpdateUser).toHaveBeenCalledWith(3, { creditsRemaining: RESET_CREDITS });
  });
});
