import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EmailCapture from '../email-capture'

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({ success: true })
}))

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
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

describe('EmailCapture Component', () => {
  const mockProps = {
    websiteUrl: 'https://example.com',
    onEmailCaptured: vi.fn(),
    isVisible: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when visible', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    expect(screen.getByText('Choose Your Analysis Type')).toBeInTheDocument()
    expect(screen.getByText(/Get instant access to your LLM\.txt analysis for/)).toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByText('Start Analysis')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} isVisible={false} />)
    
    expect(screen.queryByText('Choose Your Analysis Type')).not.toBeInTheDocument()
  })

  it('shows login option when onLoginRequested is provided', () => {
    const onLoginRequested = vi.fn()
    renderWithQueryClient(
      <EmailCapture {...mockProps} onLoginRequested={onLoginRequested} />
    )
    
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Login Instead')).toBeInTheDocument()
  })

  it('calls onLoginRequested when login button is clicked', async () => {
    const user = userEvent.setup()
    const onLoginRequested = vi.fn()
    
    renderWithQueryClient(
      <EmailCapture {...mockProps} onLoginRequested={onLoginRequested} />
    )
    
    const loginButton = screen.getByText('Login Instead')
    await user.click(loginButton)
    
    expect(onLoginRequested).toHaveBeenCalledTimes(1)
  })

  it('pre-fills email when prefilledEmail prop is provided', () => {
    renderWithQueryClient(
      <EmailCapture {...mockProps} prefilledEmail="test@example.com" />
    )
    
    const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    expect(emailInput.value).toBe('test@example.com')
  })

  it('updates email field when prefilledEmail prop changes', () => {
    const { rerender } = renderWithQueryClient(
      <EmailCapture {...mockProps} prefilledEmail="initial@example.com" />
    )
    
    let emailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    expect(emailInput.value).toBe('initial@example.com')
    
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <EmailCapture {...mockProps} prefilledEmail="updated@example.com" />
      </QueryClientProvider>
    )
    
    emailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    expect(emailInput.value).toBe('updated@example.com')
  })

  it('renders all tier options correctly', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    // Check tier options
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Coffee Analysis ($4.95)')).toBeInTheDocument()
    expect(screen.getByText('Growth ($25/mo)')).toBeInTheDocument()
    expect(screen.getByText('Scale ($99/mo)')).toBeInTheDocument()
    
    // Check tier descriptions
    expect(screen.getByText(/1 analysis per day.*20 pages max.*HTML extraction.*Smart categorization/)).toBeInTheDocument()
    expect(screen.getByText(/1 premium analysis.*200 pages.*Full AI-enhanced.*No subscription/)).toBeInTheDocument()
  })

  it('allows tier selection', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    // Initially Free tier should be selected
    const freeRadio = screen.getByRole('radio', { name: /free/i })
    expect(freeRadio).toBeChecked()
    
    // Select Coffee tier
    const coffeeRadio = screen.getByRole('radio', { name: /coffee analysis/i })
    await user.click(coffeeRadio)
    expect(coffeeRadio).toBeChecked()
    expect(freeRadio).not.toBeChecked()
  })

  it('validates email input', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    const submitButton = screen.getByText('Start Analysis')
    await user.click(submitButton)
    
    // Should show validation error for empty email
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    const onEmailCaptured = vi.fn()
    
    renderWithQueryClient(
      <EmailCapture {...mockProps} onEmailCaptured={onEmailCaptured} />
    )
    
    // Fill email
    const emailInput = screen.getByLabelText('Email Address')
    await user.type(emailInput, 'test@example.com')
    
    // Select Coffee tier
    const coffeeRadio = screen.getByRole('radio', { name: /coffee analysis/i })
    await user.click(coffeeRadio)
    
    // Submit form
    const submitButton = screen.getByText('Start Analysis')
    await user.click(submitButton)
    
    // Wait for form submission
    await waitFor(() => {
      expect(onEmailCaptured).toHaveBeenCalledWith('test@example.com', 'coffee')
    })
  })

  it('shows correct trust indicators', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    expect(screen.getByText('Secure & Private')).toBeInTheDocument()
    expect(screen.getByText('No Spam')).toBeInTheDocument()
    expect(screen.getByText('Expert Quality')).toBeInTheDocument()
  })

  it('shows returning customer notice', () => {
    renderWithQueryClient(<EmailCapture {...mockProps} />)
    
    expect(screen.getByText('☕ Already purchased Coffee tier?')).toBeInTheDocument()
    expect(screen.getByText(/If you recently purchased the \$4\.95 Coffee tier/)).toBeInTheDocument()
  })
})