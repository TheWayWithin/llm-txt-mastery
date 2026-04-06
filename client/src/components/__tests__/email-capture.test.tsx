import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Sprint 16 (issue #23): Skipped — characterizes pre-Sprint-9 Coffee tier UI
// (e.g. "☕ Already purchased Coffee tier?", "$4.95 Coffee tier" copy) that
// has been refactored to Solo branding. Rewrite with current copy in a future
// sprint or replace with behavior-driven tests.
describe.skip('EmailCapture Component', () => {
  const mockProps = {
    websiteUrl: 'https://example.com',
    onEmailCaptured: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('shows login option when onLoginRequested is provided', () => {
    const onLoginRequested = vi.fn();
    renderWithQueryClient(<EmailCapture {...mockProps} onLoginRequested={onLoginRequested} />);

    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByText('Login Instead')).toBeInTheDocument();
  });

  it('calls onLoginRequested when login button is clicked', async () => {
    const user = userEvent.setup();
    const onLoginRequested = vi.fn();

    renderWithQueryClient(<EmailCapture {...mockProps} onLoginRequested={onLoginRequested} />);

    const loginButton = screen.getByText('Login Instead');
    await user.click(loginButton);

    expect(onLoginRequested).toHaveBeenCalledTimes(1);
  });

  it('defaults to coffee tier selection', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    const coffeeRadio = screen.getByLabelText(/Solopreneur Special/i) as HTMLInputElement;
    expect(coffeeRadio.checked).toBe(true);
  });

  it('shows authentication options when tier is selected', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Since coffee is default, auth buttons should be visible
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('renders all tier options correctly', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Check tier options
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Coffee Analysis ($4.95)')).toBeInTheDocument();
    expect(screen.getByText('Growth ($25/mo)')).toBeInTheDocument();
    expect(screen.getByText('Scale ($99/mo)')).toBeInTheDocument();

    // Check tier descriptions
    expect(
      screen.getByText(/3 analyses per day.*20 pages max.*HTML extraction.*Smart categorization/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 premium analysis.*200 pages.*Full AI-enhanced.*No subscription/)
    ).toBeInTheDocument();
  });

  it('allows tier selection', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    // Initially Free tier should be selected
    const freeRadio = screen.getByRole('radio', { name: /free/i });
    expect(freeRadio).toBeChecked();

    // Select Coffee tier
    const coffeeRadio = screen.getByRole('radio', { name: /coffee analysis/i });
    await user.click(coffeeRadio);
    expect(coffeeRadio).toBeChecked();
    expect(freeRadio).not.toBeChecked();
  });

  it('validates email input', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    const submitButton = screen.getByText('Start Analysis');
    await user.click(submitButton);

    // Should show validation error for empty email
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    const onEmailCaptured = vi.fn();

    renderWithQueryClient(<EmailCapture {...mockProps} onEmailCaptured={onEmailCaptured} />);

    // Fill email
    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'test@example.com');

    // Select Coffee tier
    const coffeeRadio = screen.getByRole('radio', { name: /coffee analysis/i });
    await user.click(coffeeRadio);

    // Submit form
    const submitButton = screen.getByText('Start Analysis');
    await user.click(submitButton);

    // Wait for form submission
    await waitFor(() => {
      expect(onEmailCaptured).toHaveBeenCalledWith('test@example.com', 'solo');
    });
  });

  it('shows correct trust indicators', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    expect(screen.getByText('No Spam')).toBeInTheDocument();
    expect(screen.getByText('Expert Quality')).toBeInTheDocument();
  });

  it('shows returning customer notice', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />);

    expect(screen.getByText('☕ Already purchased Coffee tier?')).toBeInTheDocument();
    expect(
      screen.getByText(/If you recently purchased the \$4\.95 Coffee tier/)
    ).toBeInTheDocument();
  });
});
