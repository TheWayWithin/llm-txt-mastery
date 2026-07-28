import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';

import VerifyEmailPage, { resolveVerifiedRedirect } from '../verify-email';
import { authApi } from '@/lib/auth-api';
import * as AuthContext from '@/contexts/AuthContext';
import * as FlowStateMachine from '@/hooks/useFlowStateMachine';

/**
 * LTM-ISS-4 regression cover.
 *
 * The "already logged in" fast-path after email verification never executed:
 * it branched on refreshUser()'s return value, which is `Promise<void>`. Every
 * verified user was sent to /login, and the pendingAnalysisUrl they signed up
 * with was deleted unread.
 *
 * "Authenticated" for this flow is defined as authApi.isAuthenticated(): this
 * tab's sessionStorage holds BOTH a live access token and a stored user. These
 * tests pin both branches so a regression to a stale or void check fails loudly.
 */

vi.mock('@/lib/api-config', () => ({
  getApiBaseUrl: () => 'https://api.test',
}));

describe('resolveVerifiedRedirect', () => {
  it('sends an authenticated user straight to /analyze', () => {
    expect(resolveVerifiedRedirect(true, null)).toBe('/analyze');
  });

  it('carries the pending analysis URL to /analyze when authenticated', () => {
    expect(resolveVerifiedRedirect(true, 'https://example.com/docs')).toBe(
      '/analyze?url=https%3A%2F%2Fexample.com%2Fdocs'
    );
  });

  it('sends an unauthenticated user to /login', () => {
    expect(resolveVerifiedRedirect(false, null)).toBe('/login?verified=true');
  });

  it('hands the pending analysis URL to /login, which forwards it after sign-in', () => {
    expect(resolveVerifiedRedirect(false, 'https://example.com/docs')).toBe(
      '/login?verified=true&websiteUrl=https%3A%2F%2Fexample.com%2Fdocs'
    );
  });

  it('escapes query-breaking characters in the pending URL', () => {
    expect(resolveVerifiedRedirect(true, 'https://e.com/a?b=1&c=2')).toBe(
      '/analyze?url=https%3A%2F%2Fe.com%2Fa%3Fb%3D1%26c%3D2'
    );
  });
});

describe('VerifyEmailPage redirect wiring', () => {
  let originalLocation: Location;

  const renderVerifyPage = async ({ authenticated }: { authenticated: boolean }) => {
    vi.spyOn(authApi, 'isAuthenticated').mockReturnValue(authenticated);
    render(<VerifyEmailPage />);
    // Fake timers are in play, so testing-library's waitFor (which polls on real
    // timers) would deadlock. runAllTimersAsync flushes microtasks between timer
    // runs, which settles the verification fetch and refreshUser() and then fires
    // the 2s redirect timer that those awaits schedule.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '', search: '?token=verify-token-123' },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, email: 'new@example.com' }),
    }) as unknown as typeof fetch;

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      refreshUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof AuthContext.useAuth>);

    vi.spyOn(FlowStateMachine, 'useFlowStateMachine').mockReturnValue({
      actions: {},
    } as unknown as ReturnType<typeof FlowStateMachine.useFlowStateMachine>);

    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('skips the login round-trip when the session is still live', async () => {
    localStorage.setItem('pendingAnalysisUrl', 'https://example.com/docs');

    await renderVerifyPage({ authenticated: true });

    expect(window.location.href).toBe('/analyze?url=https%3A%2F%2Fexample.com%2Fdocs');
  });

  it('sends an unauthenticated user to login with the URL preserved', async () => {
    localStorage.setItem('pendingAnalysisUrl', 'https://example.com/docs');

    await renderVerifyPage({ authenticated: false });

    expect(window.location.href).toBe(
      '/login?verified=true&websiteUrl=https%3A%2F%2Fexample.com%2Fdocs'
    );
  });

  it('clears both pending signup keys once they have been used', async () => {
    localStorage.setItem('pendingVerificationEmail', 'new@example.com');
    localStorage.setItem('pendingAnalysisUrl', 'https://example.com/docs');

    await renderVerifyPage({ authenticated: true });

    expect(localStorage.getItem('pendingVerificationEmail')).toBeNull();
    expect(localStorage.getItem('pendingAnalysisUrl')).toBeNull();
  });
});
