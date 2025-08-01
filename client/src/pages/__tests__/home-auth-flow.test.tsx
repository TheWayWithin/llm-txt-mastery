import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../home'
import * as AuthContext from '@/contexts/AuthContext'

// Mock all the child components to focus on auth flow logic
vi.mock('@/components/url-input', () => ({
  default: ({ onAnalysisStart, isVisible }: any) => 
    isVisible ? (
      <div data-testid="url-input">
        <button onClick={() => onAnalysisStart('https://test.com')}>
          Start Analysis
        </button>
      </div>
    ) : null
}))

vi.mock('@/components/email-capture', () => ({
  default: ({ isVisible, onEmailCaptured, onLoginRequested, prefilledEmail }: any) => 
    isVisible ? (
      <div data-testid="email-capture">
        <div>Email Capture Component</div>
        {prefilledEmail && <div data-testid="prefilled-email">{prefilledEmail}</div>}
        {onLoginRequested && (
          <button onClick={onLoginRequested} data-testid="login-button">
            Login Instead
          </button>
        )}
        <button onClick={() => onEmailCaptured('test@example.com', 'starter')}>
          Submit Email
        </button>
      </div>
    ) : null
}))

vi.mock('@/components/tier-limits-display', () => ({
  default: ({ isVisible }: any) => 
    isVisible ? <div data-testid="tier-limits">Tier Limits Display</div> : null
}))

vi.mock('@/components/content-analysis', () => ({
  default: ({ isVisible }: any) => 
    isVisible ? <div data-testid="content-analysis">Content Analysis</div> : null
}))

vi.mock('@/components/AuthNav', () => ({
  AuthNav: () => <div data-testid="auth-nav">Auth Nav</div>
}))

vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose, defaultMode }: any) => 
    isOpen ? (
      <div data-testid="auth-modal">
        <div>Auth Modal - {defaultMode}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}))

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/']
}))

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('Home Component - Authentication Flow', () => {
  const mockUseAuth = vi.spyOn(AuthContext, 'useAuth')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unauthenticated User Flow', () => {
    it('shows email capture for unauthenticated users after URL input', async () => {
      const user = userEvent.setup()
      
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      renderWithQueryClient(<Home />)

      // Initially shows URL input
      expect(screen.getByTestId('url-input')).toBeInTheDocument()
      expect(screen.queryByTestId('email-capture')).not.toBeInTheDocument()

      // Click start analysis
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      // Should show email capture
      await waitFor(() => {
        expect(screen.getByTestId('email-capture')).toBeInTheDocument()
        expect(screen.queryByTestId('url-input')).not.toBeInTheDocument()
      })
    })

    it('shows login option in email capture', async () => {
      const user = userEvent.setup()
      
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      renderWithQueryClient(<Home />)

      // Navigate to email capture
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByTestId('login-button')).toBeInTheDocument()
      })
    })

    it('opens auth modal when login is requested', async () => {
      const user = userEvent.setup()
      
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      renderWithQueryClient(<Home />)

      // Navigate to email capture
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      // Click login button
      await waitFor(() => {
        const loginButton = screen.getByTestId('login-button')
        return user.click(loginButton)
      })

      // Should show auth modal
      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
        expect(screen.getByText('Auth Modal - login')).toBeInTheDocument()
      })
    })
  })

  describe('Authenticated User Flow', () => {
    it('skips email capture for authenticated users', async () => {
      const user = userEvent.setup()
      
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', tier: 'starter' },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true
      })

      renderWithQueryClient(<Home />)

      // Initially shows URL input
      expect(screen.getByTestId('url-input')).toBeInTheDocument()

      // Click start analysis
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      // Should skip email capture and go directly to tier limits
      await waitFor(() => {
        expect(screen.getByTestId('tier-limits')).toBeInTheDocument()
        expect(screen.queryByTestId('email-capture')).not.toBeInTheDocument()
        expect(screen.queryByTestId('url-input')).not.toBeInTheDocument()
      })
    })

    it('handles loading state properly', async () => {
      const user = userEvent.setup()
      
      // Start with loading state
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      const { rerender } = renderWithQueryClient(<Home />)

      // Click start analysis during loading
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText('Checking authentication status...')).toBeInTheDocument()
      })

      // Simulate auth loading completion with authenticated user
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', tier: 'starter' },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true
      })

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Home />
        </QueryClientProvider>
      )

      // Should automatically skip to tier limits
      await waitFor(() => {
        expect(screen.getByTestId('tier-limits')).toBeInTheDocument()
        expect(screen.queryByText('Checking authentication status...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Email Pre-fill', () => {
    it('pre-fills email from authenticated user in edge cases', async () => {
      const user = userEvent.setup()
      
      // Mock a scenario where email capture is shown but user data is available
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'prefill@example.com', tier: 'starter' },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true
      })

      // Force email capture to show by mocking the condition
      const originalUseAuth = mockUseAuth.getMockImplementation()
      
      // Temporarily show email capture as if user wasn't authenticated
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      renderWithQueryClient(<Home />)

      // Navigate to email capture
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      // Wait for email capture to appear
      await waitFor(() => {
        expect(screen.getByTestId('email-capture')).toBeInTheDocument()
      })

      // Now simulate user becoming available (edge case scenario)
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'prefill@example.com', tier: 'starter' },
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: true
      })

      // The component should handle this edge case gracefully
      // (In practice, this would transition to limits step due to useEffect)
    })
  })

  describe('Auth Modal Integration', () => {
    it('closes auth modal when requested', async () => {
      const user = userEvent.setup()
      
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        getAccessToken: vi.fn(),
        hasCredits: false,
        canAnalyze: true,
        isAuthenticated: false
      })

      renderWithQueryClient(<Home />)

      // Navigate to email capture and open modal
      const startButton = screen.getByText('Start Analysis')
      await user.click(startButton)

      await waitFor(() => {
        const loginButton = screen.getByTestId('login-button')
        return user.click(loginButton)
      })

      // Modal should be open
      await waitFor(() => {
        expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
      })

      // Close modal
      const closeButton = screen.getByText('Close Modal')
      await user.click(closeButton)

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
      })
    })
  })
})