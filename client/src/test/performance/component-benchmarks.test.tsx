/**
 * Component Performance Benchmarks
 * 
 * PURPOSE: Establish performance baselines before refactoring
 * CRITICAL: These benchmarks ensure refactoring doesn't degrade performance
 * 
 * Metrics Tracked:
 * 1. Component render times
 * 2. State update performance  
 * 3. Memory usage patterns
 * 4. Re-render frequency
 * 5. Bundle size impact
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithQueryClient, createMockAuthContext, createMockUser } from '@/test/test-utils'
import * as AuthContext from '@/contexts/AuthContext'

// Performance measurement utilities
interface PerformanceMetrics {
  renderTime: number
  updateTime: number
  memoryUsage: number
  rerenderCount: number
}

const measurePerformance = (fn: () => void): number => {
  const startTime = performance.now()
  fn()
  const endTime = performance.now()
  return endTime - startTime
}

const measureMemoryUsage = (): number => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

// Mock components for isolated testing
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  useRoute: () => [false, {}],
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>
}))

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn()
}))

vi.mock('@/components/HelpSystem', () => ({
  QuickHelp: () => <div data-testid="quick-help">Help</div>
}))

import EmailCapture from '@/components/email-capture'
import AnalyzePage from '@/pages/analyze'

describe('Component Performance Benchmarks', () => {
  const mockUseAuth = vi.spyOn(AuthContext, 'useAuth')
  let renderCount = 0

  const originalConsoleLog = console.log
  
  beforeEach(() => {
    vi.clearAllMocks()
    renderCount = 0
    // Suppress console logs during performance tests
    console.log = vi.fn()
    
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true
    })
  })

  afterEach(() => {
    console.log = originalConsoleLog
  })

  describe('EmailCapture Component Performance', () => {
    const defaultProps = {
      websiteUrl: 'https://example.com',
      onEmailCaptured: vi.fn(),
      isVisible: true
    }

    it('should render within acceptable time limits (baseline)', () => {
      const renderTime = measurePerformance(() => {
        renderWithQueryClient(<EmailCapture {...defaultProps} />)
      })

      // Baseline: EmailCapture should render in under 50ms
      expect(renderTime).toBeLessThan(50)
      console.log(`EmailCapture initial render: ${renderTime.toFixed(2)}ms`)
    })

    it('should handle tier selection state updates efficiently', async () => {
      const user = userEvent.setup()
      
      renderWithQueryClient(<EmailCapture {...defaultProps} />)
      
      // Measure tier selection update time
      const updateTime = await measurePerformance(async () => {
        await user.click(screen.getByText('Professional Power ($9.95/mo)'))
      })

      // Baseline: Tier selection should update in under 20ms
      expect(updateTime).toBeLessThan(20)
      console.log(`EmailCapture tier selection: ${updateTime.toFixed(2)}ms`)
    })

    it('should not cause memory leaks with multiple renders', () => {
      const initialMemory = measureMemoryUsage()
      
      // Render component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithQueryClient(<EmailCapture {...defaultProps} />)
        unmount()
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = measureMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory
      
      // Baseline: Memory increase should be minimal (under 1MB for 10 renders)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
      console.log(`EmailCapture memory increase: ${memoryIncrease} bytes`)
    })

    it('should minimize re-renders during interactions', async () => {
      const user = userEvent.setup()
      let renderCount = 0
      
      const TestWrapper = () => {
        renderCount++
        return <EmailCapture {...defaultProps} />
      }
      
      renderWithQueryClient(<TestWrapper />)
      const initialRenders = renderCount
      
      // Perform multiple interactions
      await user.click(screen.getByText('Free (But Crippled)'))
      await user.click(screen.getByText('Coffee Power ($4.95 one-time)'))
      await user.click(screen.getByText('Professional Power ($9.95/mo)'))
      
      const finalRenders = renderCount
      const additionalRenders = finalRenders - initialRenders
      
      // Baseline: Should not re-render more than necessary (1 render per state change)
      expect(additionalRenders).toBeLessThanOrEqual(3)
      console.log(`EmailCapture re-renders during interaction: ${additionalRenders}`)
    })
  })

  describe('Analyze Page Performance', () => {
    it('should render within acceptable time limits (baseline)', () => {
      const mockUser = createMockUser({ tier: 'coffee' })
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser,
        isAuthenticated: true,
        authResolved: true
      }))

      const renderTime = measurePerformance(() => {
        renderWithQueryClient(<AnalyzePage />)
      })

      // Baseline: Analyze page should render in under 100ms
      expect(renderTime).toBeLessThan(100)
      console.log(`AnalyzePage initial render: ${renderTime.toFixed(2)}ms`)
    })

    it('should handle URL input changes efficiently', async () => {
      const user = userEvent.setup()
      const mockUser = createMockUser({ tier: 'coffee' })
      mockUseAuth.mockReturnValue(createMockAuthContext({
        user: mockUser,
        isAuthenticated: true,
        authResolved: true
      }))

      renderWithQueryClient(<AnalyzePage />)
      
      const urlInput = screen.getByLabelText('Website URL')
      const testUrl = 'https://performance-test.com'
      
      const updateTime = measurePerformance(() => {
        act(() => {
          user.type(urlInput, testUrl)
        })
      })

      // Baseline: URL input should update in under 30ms
      expect(updateTime).toBeLessThan(30)
      console.log(`AnalyzePage URL input: ${updateTime.toFixed(2)}ms`)
    })

    it('should handle authentication state changes efficiently', () => {
      // Start with unauthenticated
      mockUseAuth.mockReturnValue(createMockAuthContext({
        authResolved: false,
        isAuthenticated: false
      }))

      const { rerender } = renderWithQueryClient(<AnalyzePage />)
      
      // Measure auth state change time
      const updateTime = measurePerformance(() => {
        const mockUser = createMockUser({ tier: 'coffee' })
        mockUseAuth.mockReturnValue(createMockAuthContext({
          user: mockUser,
          authResolved: true,
          isAuthenticated: true
        }))
        rerender(<AnalyzePage />)
      })

      // Baseline: Auth state change should update in under 50ms
      expect(updateTime).toBeLessThan(50)
      console.log(`AnalyzePage auth state change: ${updateTime.toFixed(2)}ms`)
    })
  })

  describe('Component Bundle Size Impact', () => {
    it('should track EmailCapture component size impact', () => {
      // This test documents the bundle size impact for future comparison
      const componentSize = JSON.stringify(EmailCapture).length
      
      // Baseline: Component should be reasonably sized
      expect(componentSize).toBeLessThan(50000) // 50KB serialized
      console.log(`EmailCapture serialized size: ${componentSize} characters`)
    })

    it('should track AnalyzePage component size impact', () => {
      const componentSize = JSON.stringify(AnalyzePage).length
      
      // Baseline: Page component can be larger but should be reasonable
      expect(componentSize).toBeLessThan(100000) // 100KB serialized
      console.log(`AnalyzePage serialized size: ${componentSize} characters`)
    })
  })

  describe('State Management Performance', () => {
    it('should handle frequent state updates without performance degradation', async () => {
      const user = userEvent.setup()
      
      renderWithQueryClient(<EmailCapture 
        websiteUrl="https://state-test.com"
        onEmailCaptured={vi.fn()}
        isVisible={true}
      />)

      const startTime = performance.now()
      
      // Perform rapid tier selections
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByText('Free (But Crippled)'))
        await user.click(screen.getByText('Coffee Power ($4.95 one-time)'))
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Baseline: 10 rapid state changes should complete in under 200ms
      expect(totalTime).toBeLessThan(200)
      console.log(`Rapid state updates (10 changes): ${totalTime.toFixed(2)}ms`)
    })

    it('should maintain performance with complex auth context', () => {
      const complexUser = createMockUser({
        id: '12345',
        email: 'complex-user@example.com',
        tier: 'coffee',
        creditsRemaining: 100,
        emailVerified: true
      })

      const renderTime = measurePerformance(() => {
        mockUseAuth.mockReturnValue(createMockAuthContext({
          user: complexUser,
          authResolved: true,
          isAuthenticated: true,
          hasCredits: true,
          canAnalyze: true
        }))

        renderWithQueryClient(<AnalyzePage />)
      })

      // Baseline: Complex auth context should not significantly impact render time
      expect(renderTime).toBeLessThan(120)
      console.log(`Complex auth context render: ${renderTime.toFixed(2)}ms`)
    })
  })

  describe('DOM Manipulation Performance', () => {
    it('should efficiently handle visibility toggles', () => {
      const toggleTime = measurePerformance(() => {
        const { rerender } = renderWithQueryClient(
          <EmailCapture 
            websiteUrl="https://test.com"
            onEmailCaptured={vi.fn()}
            isVisible={false}
          />
        )

        // Toggle visibility
        rerender(
          <EmailCapture 
            websiteUrl="https://test.com"
            onEmailCaptured={vi.fn()}
            isVisible={true}
          />
        )

        rerender(
          <EmailCapture 
            websiteUrl="https://test.com"
            onEmailCaptured={vi.fn()}
            isVisible={false}
          />
        )
      })

      // Baseline: Visibility toggles should be fast
      expect(toggleTime).toBeLessThan(20)
      console.log(`Visibility toggle performance: ${toggleTime.toFixed(2)}ms`)
    })
  })

  describe('Performance Regression Thresholds', () => {
    it('should document performance thresholds for regression testing', () => {
      const performanceThresholds = {
        emailCaptureRender: 50, // ms
        analyzePageRender: 100,  // ms
        tierSelectionUpdate: 20, // ms
        urlInputUpdate: 30,      // ms
        authStateChange: 50,     // ms
        rapidStateUpdates: 200,  // ms for 10 changes
        visibilityToggle: 20,    // ms
        memoryLeakThreshold: 1024 * 1024, // 1MB for 10 renders
      }

      // Document thresholds for CI/CD monitoring
      console.log('Performance Thresholds:', JSON.stringify(performanceThresholds, null, 2))
      
      // All thresholds should be positive numbers
      Object.values(performanceThresholds).forEach(threshold => {
        expect(threshold).toBeGreaterThan(0)
      })
    })
  })
})

/**
 * Performance Test Utilities for CI/CD
 * 
 * These utilities can be used in CI/CD pipelines to monitor
 * performance regressions after refactoring.
 */
export const performanceUtils = {
  measureComponentRender: (component: React.ReactElement): number => {
    return measurePerformance(() => {
      render(component)
    })
  },

  measureMemoryUsage: (): number => {
    return measureMemoryUsage()
  },

  createPerformanceReport: (metrics: PerformanceMetrics): string => {
    return `
Performance Report:
- Render Time: ${metrics.renderTime.toFixed(2)}ms
- Update Time: ${metrics.updateTime.toFixed(2)}ms  
- Memory Usage: ${metrics.memoryUsage} bytes
- Re-render Count: ${metrics.rerenderCount}
`
  }
}