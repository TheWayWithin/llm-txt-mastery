/**
 * Browser-level check for the post-verification redirect (LTM-ISS-4).
 *
 * The vitest suite in client/src/pages/__tests__/verify-email-redirect.test.tsx
 * pins the logic; this drives the real page in a real browser, which is how the
 * distinction between "live session" and "stale session" was caught: a session
 * whose /api/auth/me answers 401 is signed out by refreshUser() and correctly
 * lands on /login, so only a 200 models the fast-path case.
 *
 * No real token, mailbox, or database is involved: the verification and
 * current-user endpoints are stubbed, and storage is seeded per case.
 *
 * Usage (two terminals, from the repo root):
 *   1. VITE_API_URL=https://llm-txt-mastery-staging.up.railway.app \
 *        npx vite --port 5199 --strictPort
 *   2. node tests/verify-email-redirect-flow.mjs
 *
 * Exit code 0 = both paths correct.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const PENDING = 'https://example.com/docs';
const results = [];

const run = async (name, { authenticated }, expectedUrlPart) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Stub the verification API so no real token or mailbox is needed.
  await page.route('**/api/auth/verify-email*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, email: 'flow@example.com' }),
    })
  );
  // /api/auth/me decides whether the seeded session is live. Answering 200 models
  // a genuinely live session; answering 401 would make refreshUser() sign the user
  // out, which correctly sends them to /login and is a different case entirely.
  await page.route('**/api/auth/me*', (route) =>
    route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 1,
          email: 'flow@example.com',
          tier: 'starter',
          emailVerified: true,
          creditsRemaining: 5,
        },
      }),
    })
  );

  await page.addInitScript(
    ({ authenticated, pending }) => {
      localStorage.setItem('pendingAnalysisUrl', pending);
      localStorage.setItem('pendingVerificationEmail', 'flow@example.com');
      if (authenticated) {
        sessionStorage.setItem('auth_access_token', 'fake-access-token');
        sessionStorage.setItem('auth_refresh_token', 'fake-refresh-token');
        sessionStorage.setItem(
          'auth_user',
          JSON.stringify({
            id: 1,
            email: 'flow@example.com',
            tier: 'starter',
            emailVerified: false,
          })
        );
      }
    },
    { authenticated, pending: PENDING }
  );

  // Record every navigation so we can see the first hop out of /verify-email,
  // not just wherever the app finally settles (the destination page may itself
  // redirect, e.g. /analyze bouncing a session it cannot validate).
  const chain = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) chain.push(frame.url().replace(BASE, ''));
  });

  await page.goto(`${BASE}/verify-email?token=flow-token-123`);
  try {
    await page.waitForURL((u) => !u.pathname.startsWith('/verify-email'), { timeout: 15000 });
  } catch {
    chain.push(`TIMED OUT on ${page.url().replace(BASE, '')}`);
  }
  await page.waitForTimeout(1500); // let any onward redirect settle into the chain

  const firstHop = chain.find((u) => !u.startsWith('/verify-email')) ?? 'NO REDIRECT';
  const pass = firstHop.includes(expectedUrlPart);
  results.push({ name, firstHop, chain, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`      first hop out of /verify-email: ${firstHop}`);
  console.log(`      full chain: ${chain.join('  ->  ')}`);

  await browser.close();
};

await run(
  'authenticated session skips /login and carries the URL',
  { authenticated: true },
  '/analyze?url=https%3A%2F%2Fexample.com%2Fdocs'
);
await run(
  'unauthenticated (new tab) goes to /login with the URL preserved',
  { authenticated: false },
  '/login?verified=true&websiteUrl=https%3A%2F%2Fexample.com%2Fdocs'
);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} browser paths passed`);
process.exit(failed.length ? 1 : 0);
