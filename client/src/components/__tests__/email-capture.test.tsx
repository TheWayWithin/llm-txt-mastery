import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmailCapture from '../email-capture';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Sprint 16 (issue #23) skipped this suite because it characterised the
// pre-Sprint-9 Coffee-tier UI. LTM-ISS-22 un-skipped it and re-pointed every
// assertion at the copy and behaviour the component renders today: the email
// input and its client-side submit were replaced by direct navigation to the
// /login and /signup routes carrying the selected tier.
describe('EmailCapture Component', () => {
  const mockProps = {
    websiteUrl: 'https://example.com',
    onEmailCaptured: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // The component navigates via wouter (history.pushState), so reset the
    // jsdom URL between tests.
    window.history.pushState({}, '', '/');
  });

  it('renders correctly when visible', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    expect(screen.getByText('Choose Your Analysis Type')).toBeInTheDocument();
    expect(screen.getByText(/Generate professional llms.txt files for/)).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    // Note: Email input was removed in favor of direct auth navigation
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} isVisible={false} />);

    expect(screen.queryByText('Choose Your Analysis Type')).not.toBeInTheDocument();
  });

  it('navigates to the login route with the selected tier when Sign In is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/login?tier=solo&website=https%3A%2F%2Fexample.com'
    );
  });

  it('navigates to the signup route with the selected tier when Sign Up is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Switch off the default tier first so the URL proves the selection is carried
    await user.click(screen.getByRole('radio', { name: /Professional Power \(\$9\.95\/mo\)/i }));
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/signup?tier=growth&website=https%3A%2F%2Fexample.com'
    );
  });

  it('defaults to the solo (Coffee Power) tier selection', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    const soloRadio = screen.getByRole('radio', { name: /Coffee Power \(\$4\.95\/month\)/i });
    expect(soloRadio).toBeChecked();
  });

  it('shows authentication options when tier is selected', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Since solo is default, auth buttons should be visible
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('renders all tier options correctly', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Check tier options
    expect(screen.getByText('Free (But Crippled)')).toBeInTheDocument();
    expect(screen.getByText('Coffee Power ($4.95/month)')).toBeInTheDocument();
    expect(screen.getByText('Professional Power ($9.95/mo)')).toBeInTheDocument();
    expect(screen.getByText('Agency & API ($19.95/mo)')).toBeInTheDocument();

    // Check tier descriptions
    expect(
      screen.getByText(
        /3 analyses per day.*20 pages only.*No AI quality scoring.*Basic HTML extraction only/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /20 monthly analyses.*200 pages per analysis.*AI-powered content scoring.*Beat competitors/
      )
    ).toBeInTheDocument();
  });

  it('allows tier selection', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Initially the solo (Coffee Power) tier is selected
    const soloRadio = screen.getByRole('radio', { name: /Coffee Power \(\$4\.95\/month\)/i });
    const starterRadio = screen.getByRole('radio', { name: /Free \(But Crippled\)/i });
    expect(soloRadio).toBeChecked();
    expect(starterRadio).not.toBeChecked();

    // Select the free (starter) tier
    await user.click(starterRadio);
    expect(starterRadio).toBeChecked();
    expect(soloRadio).not.toBeChecked();
  });

  it('shows the tier benefit reminder for the selected tier', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    expect(
      screen.getByText(
        '🚀 SMART CHOICE: Full power • 30-day guarantee • Cancel instantly • Risk-FREE'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Free \(But Crippled\)/i }));

    expect(
      screen.getByText(
        '⚠️ WARNING: Severely limited • Will miss critical pages • Competitors will outrank you'
      )
    ).toBeInTheDocument();
  });

  it('shows correct trust indicators', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // The indicators render as one assembled line, not separate elements
    const trustLine = screen.getByText(/Secure & Private/);
    expect(trustLine.textContent).toContain('✅ Secure & Private');
    expect(trustLine.textContent).toContain('✅ No Spam Ever');
    expect(trustLine.textContent).toContain('✅ Built by Expert Solopreneur');
    expect(trustLine.textContent).toContain('✅ Self Not VC-Funded');
  });

  it('shows returning customer notice', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    const returningNotice = screen.getByText('Returning user?').closest('p');
    expect(returningNotice).not.toBeNull();
    expect(returningNotice!.textContent).toBe('Returning user? Click "Sign In" above.');

    const newUserNotice = screen.getByText('New to LLM.txt Mastery?').closest('p');
    expect(newUserNotice).not.toBeNull();
    expect(newUserNotice!.textContent).toBe(
      'New to LLM.txt Mastery? Click "Sign Up" to create your account.'
    );
  });
});
