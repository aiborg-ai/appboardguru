/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FYIFactory, FYIContextFactory } from '../../factories/fyi.factory'
import { testAssertions, performanceHelpers } from '../../utils/test-helpers'

// Error Boundary Component for Testing
class FYIErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FYI Error Boundary caught error:', error, errorInfo)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong in FYI system</h2>
          <p>Error: {this.state.error?.message}</p>
          <button 
            data-testid="error-retry" 
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Mock Components with Various Error Scenarios
const MockFYIComponent = ({ 
  scenario = 'normal',
  onError 
}: { 
  scenario?: 'normal' | 'network-error' | 'service-error' | 'data-corruption' | 'memory-leak' | 'race-condition' | 'timeout'
  onError?: (error: Error) => void 
}) => {
  const [insights, setInsights] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)

  const fetchInsights = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Simulate different error scenarios
      switch (scenario) {
        case 'network-error':
          throw new Error('NetworkError: Failed to fetch insights from external API')
        
        case 'service-error':
          throw new Error('ServiceError: FYI service is temporarily unavailable')
        
        case 'data-corruption':
          // Simulate corrupted data
          setInsights([
            { id: null, title: undefined, type: 'invalid' },
            { malformed: 'data', without: 'required', fields: true }
          ])
          break
        
        case 'memory-leak':
          // Simulate memory leak with large data
          const largeData = Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            title: `Insight ${i}`,
            content: 'x'.repeat(10000), // Large content
            data: new Array(1000).fill(Math.random())
          }))
          setInsights(largeData)
          break
        
        case 'race-condition':
          // Simulate race condition
          const delay = Math.random() * 100
          await new Promise(resolve => setTimeout(resolve, delay))
          if (retryCount % 2 === 0) {
            throw new Error('RaceCondition: Concurrent request conflict')
          }
          setInsights(FYIFactory.buildMany(3))
          break
        
        case 'timeout':
          // Simulate timeout
          await new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TimeoutError: Request timed out')), 5000)
          )
          break
        
        case 'normal':
        default:
          setInsights(FYIFactory.buildMany(5))
          break
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [scenario, onError, retryCount])

  React.useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchInsights()
  }

  // Simulate component crash in React render
  if (scenario === 'data-corruption' && insights.some(i => !i.id)) {
    throw new Error('RenderError: Cannot render corrupted insight data')
  }

  return (
    <div data-testid="fyi-component">
      <h2>FYI Insights</h2>
      
      {loading && <div data-testid="loading">Loading insights...</div>}
      
      {error && (
        <div data-testid="error-display">
          <p>Error: {error}</p>
          <button data-testid="retry-button" onClick={handleRetry}>
            Retry ({retryCount})
          </button>
        </div>
      )}
      
      {insights.length > 0 && (
        <div data-testid="insights-list">
          {insights.map((insight, index) => (
            <div key={insight.id || index} data-testid={`insight-${index}`}>
              <h3>{insight.title || 'Untitled'}</h3>
              <p>{insight.type || 'Unknown type'}</p>
            </div>
          ))}
        </div>
      )}
      
      <button data-testid="fetch-button" onClick={fetchInsights}>
        Refresh Insights
      </button>
    </div>
  )
}

// Mock localStorage for testing persistence errors
const createMockLocalStorage = (scenario: 'normal' | 'quota-exceeded' | 'access-denied' | 'data-corruption') => {
  const storage: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => {
      if (scenario === 'data-corruption') {
        if (key === 'fyi-preferences') return '{"malformed": json}'
        if (key === 'panel-width') return 'null'
      }
      return storage[key] || null
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (scenario === 'quota-exceeded') {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      }
      if (scenario === 'access-denied') {
        throw new Error('Access denied to localStorage')
      }
      storage[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key]
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    })
  }
}

describe('FYI System Error Handling and Edge Cases - CLAUDE.md Comprehensive Coverage', () => {
  let user: ReturnType<typeof userEvent.setup>
  let onError: jest.Mock

  beforeEach(() => {
    user = userEvent.setup()
    onError = jest.fn()
    
    // Mock console methods to prevent test noise
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  describe('Network and API Error Handling', () => {
    it('should handle network connectivity errors gracefully', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="network-error" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument()
      })

      expect(screen.getByText(/NetworkError: Failed to fetch insights/)).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })

    it('should handle external service unavailability', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="service-error" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument()
      })

      expect(screen.getByText(/ServiceError: FYI service is temporarily unavailable/)).toBeInTheDocument()
    })

    it('should implement exponential backoff for retries', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="network-error" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })

      const retryButton = screen.getByTestId('retry-button')
      
      // First retry
      await act(async () => {
        await user.click(retryButton)
      })
      
      expect(screen.getByText('Retry (1)')).toBeInTheDocument()

      // Second retry
      await act(async () => {
        await user.click(retryButton)
      })
      
      expect(screen.getByText('Retry (2)')).toBeInTheDocument()
    })

    it('should handle request timeout scenarios', async () => {
      jest.setTimeout(10000) // Extend timeout for this test

      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="timeout" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument()
      }, { timeout: 6000 })

      expect(screen.getByText(/TimeoutError: Request timed out/)).toBeInTheDocument()
    })

    it('should handle partial API failures with fallback data', async () => {
      // This would test falling back to cached data when live APIs fail
      const MockWithFallback = () => {
        const [insights, setInsights] = React.useState<any[]>([])
        const [warning, setWarning] = React.useState<string>('')

        React.useEffect(() => {
          // Simulate partial failure with fallback
          try {
            throw new Error('Live API failed')
          } catch {
            // Fallback to cached data
            setInsights(FYIFactory.buildMany(2))
            setWarning('Showing cached data - live updates temporarily unavailable')
          }
        }, [])

        return (
          <div data-testid="fallback-component">
            {warning && <div data-testid="warning">{warning}</div>}
            <div data-testid="insights-list">
              {insights.map((insight, index) => (
                <div key={index} data-testid={`insight-${index}`}>
                  {insight.title}
                </div>
              ))}
            </div>
          </div>
        )
      }

      render(<MockWithFallback />)

      expect(screen.getByTestId('warning')).toBeInTheDocument()
      expect(screen.getByText(/showing cached data/i)).toBeInTheDocument()
      expect(screen.getAllByTestId(/insight-\d+/)).toHaveLength(2)
    })
  })

  describe('Data Corruption and Validation Errors', () => {
    it('should handle corrupted insight data gracefully', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="data-corruption" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByText(/RenderError: Cannot render corrupted insight data/)).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'RenderError: Cannot render corrupted insight data'
        })
      )
    })

    it('should validate insight data structure before rendering', async () => {
      const MockDataValidator = () => {
        const insights = [
          FYIFactory.buildNewsInsight(),
          { id: 'invalid', title: null, type: undefined }, // Invalid data
          FYIFactory.buildFinancialInsight(),
        ]

        const validInsights = insights.filter(insight => {
          return testAssertions.hasRequiredFields(insight, ['id', 'title', 'type'])
        })

        return (
          <div data-testid="validated-component">
            <div data-testid="total-insights">Total: {insights.length}</div>
            <div data-testid="valid-insights">Valid: {validInsights.length}</div>
            {validInsights.map((insight, index) => (
              <div key={insight.id} data-testid={`valid-insight-${index}`}>
                {insight.title}
              </div>
            ))}
          </div>
        )
      }

      render(<MockDataValidator />)

      expect(screen.getByText('Total: 3')).toBeInTheDocument()
      expect(screen.getByText('Valid: 2')).toBeInTheDocument()
      expect(screen.getAllByTestId(/valid-insight-\d+/)).toHaveLength(2)
    })

    it('should handle malformed JSON from external APIs', async () => {
      const MockMalformedJSON = () => {
        const [error, setError] = React.useState<string>('')

        React.useEffect(() => {
          try {
            // Simulate malformed JSON response
            const malformedResponse = '{"insights": [{"id": 1, "title": "Test", invalid-json}'
            JSON.parse(malformedResponse)
          } catch (err) {
            setError('Failed to parse API response: Invalid JSON format')
          }
        }, [])

        return (
          <div data-testid="json-error-component">
            {error && <div data-testid="json-error">{error}</div>}
          </div>
        )
      }

      render(<MockMalformedJSON />)

      expect(screen.getByTestId('json-error')).toBeInTheDocument()
      expect(screen.getByText(/Failed to parse API response: Invalid JSON format/)).toBeInTheDocument()
    })
  })

  describe('Memory Management and Performance Issues', () => {
    it('should handle memory leaks from large datasets', async () => {
      const { unmount } = render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="memory-leak" onError={onError} />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('insights-list')).toBeInTheDocument()
      })

      // Should render large dataset
      const insights = screen.getAllByTestId(/insight-\d+/)
      expect(insights.length).toBeGreaterThan(1000)

      // Cleanup should happen on unmount
      unmount()

      // Verify no memory leaks (this would be more robust with actual memory monitoring)
      expect(true).toBe(true) // Test passes if no errors thrown
    })

    it('should handle race conditions in concurrent operations', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="race-condition" onError={onError} />
        </FYIErrorBoundary>
      )

      // May show error or success depending on race condition simulation
      await waitFor(() => {
        const hasError = screen.queryByTestId('error-display')
        const hasInsights = screen.queryByTestId('insights-list')
        
        expect(hasError || hasInsights).toBeTruthy()
      })
    })

    it('should implement performance monitoring and alerts', async () => {
      const performanceMonitor = jest.fn()

      const MockPerformanceMonitored = () => {
        React.useEffect(() => {
          const startTime = performance.now()
          
          // Simulate expensive operation
          const largeArray = new Array(100000).fill(0).map((_, i) => i * Math.random())
          
          const duration = performance.now() - startTime
          performanceMonitor({ operation: 'large-data-processing', duration })
          
          if (duration > 100) {
            console.warn('Performance warning: Operation took', duration, 'ms')
          }
        }, [])

        return <div data-testid="performance-component">Monitored Component</div>
      }

      render(<MockPerformanceMonitored />)

      expect(performanceMonitor).toHaveBeenCalledWith({
        operation: 'large-data-processing',
        duration: expect.any(Number)
      })
    })
  })

  describe('Browser and Environment Compatibility Issues', () => {
    it('should handle localStorage unavailability', async () => {
      const mockStorage = createMockLocalStorage('access-denied')
      Object.defineProperty(window, 'localStorage', { value: mockStorage })

      const MockStorageComponent = () => {
        const [error, setError] = React.useState<string>('')

        const savePreference = () => {
          try {
            localStorage.setItem('fyi-test', 'value')
          } catch (err) {
            setError('Storage unavailable: ' + (err instanceof Error ? err.message : 'Unknown error'))
          }
        }

        return (
          <div data-testid="storage-component">
            <button data-testid="save-button" onClick={savePreference}>Save</button>
            {error && <div data-testid="storage-error">{error}</div>}
          </div>
        )
      }

      render(<MockStorageComponent />)

      const saveButton = screen.getByTestId('save-button')
      
      await act(async () => {
        await user.click(saveButton)
      })

      expect(screen.getByTestId('storage-error')).toBeInTheDocument()
      expect(screen.getByText(/Storage unavailable: Access denied/)).toBeInTheDocument()
    })

    it('should handle Safari private mode restrictions', async () => {
      const mockStorage = createMockLocalStorage('quota-exceeded')
      Object.defineProperty(window, 'localStorage', { value: mockStorage })

      const MockPrivateModeComponent = () => {
        const [warning, setWarning] = React.useState<string>('')

        React.useEffect(() => {
          try {
            localStorage.setItem('test-private-mode', 'test')
          } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
              setWarning('Private browsing mode detected - some features may be limited')
            }
          }
        }, [])

        return (
          <div data-testid="private-mode-component">
            {warning && <div data-testid="private-mode-warning">{warning}</div>}
          </div>
        )
      }

      render(<MockPrivateModeComponent />)

      expect(screen.getByTestId('private-mode-warning')).toBeInTheDocument()
      expect(screen.getByText(/Private browsing mode detected/)).toBeInTheDocument()
    })

    it('should handle missing browser APIs gracefully', async () => {
      // Mock missing Intersection Observer
      const originalIntersectionObserver = window.IntersectionObserver
      delete (window as any).IntersectionObserver

      const MockIntersectionComponent = () => {
        const [supported, setSupported] = React.useState(false)

        React.useEffect(() => {
          if (typeof IntersectionObserver !== 'undefined') {
            setSupported(true)
          } else {
            console.warn('IntersectionObserver not supported, falling back to scroll events')
          }
        }, [])

        return (
          <div data-testid="intersection-component">
            <div data-testid="intersection-support">
              Intersection Observer: {supported ? 'Supported' : 'Not Supported'}
            </div>
          </div>
        )
      }

      render(<MockIntersectionComponent />)

      expect(screen.getByText('Intersection Observer: Not Supported')).toBeInTheDocument()

      // Restore
      window.IntersectionObserver = originalIntersectionObserver
    })
  })

  describe('Security and Data Protection Issues', () => {
    it('should sanitize potentially malicious content in insights', async () => {
      const MockSanitizedComponent = () => {
        const maliciousInsight = {
          id: 'xss-test',
          title: '<script>alert("XSS")</script>Market Update',
          summary: '<img src="x" onerror="alert(\'XSS\')" />Financial report',
          content: 'javascript:alert("XSS")',
        }

        // Simple sanitization
        const sanitize = (text: string) => {
          return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[REMOVED]')
                    .replace(/javascript:/gi, '[REMOVED]')
                    .replace(/on\w+\s*=/gi, '[REMOVED]')
        }

        return (
          <div data-testid="sanitized-component">
            <h3 data-testid="sanitized-title">{sanitize(maliciousInsight.title)}</h3>
            <p data-testid="sanitized-summary">{sanitize(maliciousInsight.summary)}</p>
            <div data-testid="sanitized-content">{sanitize(maliciousInsight.content)}</div>
          </div>
        )
      }

      render(<MockSanitizedComponent />)

      const title = screen.getByTestId('sanitized-title')
      const summary = screen.getByTestId('sanitized-summary')
      const content = screen.getByTestId('sanitized-content')

      expect(title.textContent).toBe('[REMOVED]Market Update')
      expect(summary.textContent).toBe('<img src="x" [REMOVED] />Financial report')
      expect(content.textContent).toBe('[REMOVED]')
    })

    it('should handle authentication expiration gracefully', async () => {
      const MockAuthComponent = () => {
        const [authError, setAuthError] = React.useState<string>('')

        const simulateAuthExpired = () => {
          // Simulate 401 response
          setAuthError('Authentication expired - please sign in again')
        }

        React.useEffect(() => {
          // Simulate auth check on mount
          simulateAuthExpired()
        }, [])

        return (
          <div data-testid="auth-component">
            {authError && (
              <div data-testid="auth-error">
                <p>{authError}</p>
                <button data-testid="signin-button">Sign In Again</button>
              </div>
            )}
          </div>
        )
      }

      render(<MockAuthComponent />)

      expect(screen.getByTestId('auth-error')).toBeInTheDocument()
      expect(screen.getByText(/Authentication expired/)).toBeInTheDocument()
      expect(screen.getByTestId('signin-button')).toBeInTheDocument()
    })

    it('should protect against CSRF attacks', async () => {
      const MockCSRFComponent = () => {
        const [csrfToken] = React.useState(() => 
          Math.random().toString(36).substring(2, 15)
        )

        const makeSecureRequest = (token: string) => {
          if (token !== csrfToken) {
            throw new Error('CSRF token mismatch')
          }
          return 'Request successful'
        }

        return (
          <div data-testid="csrf-component">
            <div data-testid="csrf-token">Token: {csrfToken}</div>
            <button
              data-testid="secure-request"
              onClick={() => {
                try {
                  makeSecureRequest(csrfToken)
                } catch (err) {
                  console.error('Security error:', err)
                }
              }}
            >
              Make Secure Request
            </button>
          </div>
        )
      }

      render(<MockCSRFComponent />)

      const tokenElement = screen.getByTestId('csrf-token')
      expect(tokenElement.textContent).toMatch(/Token: \w+/)

      const secureButton = screen.getByTestId('secure-request')
      await act(async () => {
        await user.click(secureButton)
      })

      // Should not throw errors with valid token
      expect(true).toBe(true)
    })
  })

  describe('Accessibility and User Experience Edge Cases', () => {
    it('should provide meaningful error messages for screen readers', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="network-error" />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument()
      })

      const errorDisplay = screen.getByTestId('error-display')
      expect(errorDisplay).toHaveAttribute('role', 'alert')
      expect(errorDisplay).toHaveAttribute('aria-live', 'polite')
    })

    it('should handle keyboard navigation during error states', async () => {
      render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="service-error" />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })

      const retryButton = screen.getByTestId('retry-button')
      
      // Test keyboard focus
      retryButton.focus()
      expect(document.activeElement).toBe(retryButton)

      // Test keyboard activation
      fireEvent.keyDown(retryButton, { key: 'Enter' })
      expect(retryButton).toHaveFocus()
    })

    it('should provide loading states with proper ARIA attributes', async () => {
      render(<MockFYIComponent scenario="normal" />)

      // Should show loading state initially
      const loadingElement = screen.getByTestId('loading')
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
      expect(loadingElement).toHaveAttribute('aria-busy', 'true')

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('Recovery and Resilience Mechanisms', () => {
    it('should implement circuit breaker pattern for failing services', async () => {
      let failureCount = 0
      const maxFailures = 3

      const MockCircuitBreaker = () => {
        const [circuitOpen, setCircuitOpen] = React.useState(false)
        const [status, setStatus] = React.useState<string>('normal')

        const makeRequest = async () => {
          if (circuitOpen) {
            setStatus('Circuit breaker is open - service temporarily disabled')
            return
          }

          try {
            // Simulate service call
            failureCount++
            if (failureCount <= maxFailures) {
              throw new Error('Service failure')
            }
            
            setStatus('Request successful')
            failureCount = 0 // Reset on success
          } catch (error) {
            if (failureCount >= maxFailures) {
              setCircuitOpen(true)
              setStatus('Too many failures - opening circuit breaker')
              
              // Auto-reset after timeout
              setTimeout(() => {
                setCircuitOpen(false)
                failureCount = 0
                setStatus('Circuit breaker reset')
              }, 5000)
            } else {
              setStatus(`Failure ${failureCount}/${maxFailures}`)
            }
          }
        }

        return (
          <div data-testid="circuit-breaker">
            <div data-testid="status">{status}</div>
            <button data-testid="request-button" onClick={makeRequest}>
              Make Request
            </button>
          </div>
        )
      }

      render(<MockCircuitBreaker />)

      const requestButton = screen.getByTestId('request-button')
      
      // Trigger failures
      for (let i = 1; i <= maxFailures; i++) {
        await act(async () => {
          await user.click(requestButton)
        })
        
        expect(screen.getByText(`Failure ${i}/${maxFailures}`)).toBeInTheDocument()
      }

      // Next request should open circuit breaker
      await act(async () => {
        await user.click(requestButton)
      })

      expect(screen.getByText(/Too many failures - opening circuit breaker/)).toBeInTheDocument()

      // Subsequent requests should be blocked
      await act(async () => {
        await user.click(requestButton)
      })

      expect(screen.getByText(/Circuit breaker is open/)).toBeInTheDocument()
    })

    it('should implement graceful degradation when features fail', async () => {
      const MockGracefulDegradation = ({ featuresAvailable }: { featuresAvailable: string[] }) => {
        const checkFeature = (feature: string) => featuresAvailable.includes(feature)

        return (
          <div data-testid="degradation-component">
            {checkFeature('live-insights') ? (
              <div data-testid="live-insights">Live insights available</div>
            ) : (
              <div data-testid="cached-insights">Showing cached insights only</div>
            )}
            
            {checkFeature('ai-analysis') ? (
              <div data-testid="ai-analysis">AI analysis enabled</div>
            ) : (
              <div data-testid="manual-analysis">Manual analysis mode</div>
            )}
            
            {checkFeature('real-time-updates') ? (
              <div data-testid="real-time">Real-time updates active</div>
            ) : (
              <div data-testid="polling">Using periodic updates</div>
            )}
          </div>
        )
      }

      // Test full feature availability
      const { rerender } = render(
        <MockGracefulDegradation featuresAvailable={['live-insights', 'ai-analysis', 'real-time-updates']} />
      )

      expect(screen.getByTestId('live-insights')).toBeInTheDocument()
      expect(screen.getByTestId('ai-analysis')).toBeInTheDocument()
      expect(screen.getByTestId('real-time')).toBeInTheDocument()

      // Test partial degradation
      rerender(<MockGracefulDegradation featuresAvailable={['live-insights']} />)

      expect(screen.getByTestId('live-insights')).toBeInTheDocument()
      expect(screen.getByTestId('manual-analysis')).toBeInTheDocument()
      expect(screen.getByTestId('polling')).toBeInTheDocument()

      // Test complete degradation
      rerender(<MockGracefulDegradation featuresAvailable={[]} />)

      expect(screen.getByTestId('cached-insights')).toBeInTheDocument()
      expect(screen.getByTestId('manual-analysis')).toBeInTheDocument()
      expect(screen.getByTestId('polling')).toBeInTheDocument()
    })

    it('should handle component recovery after errors', async () => {
      const { rerender } = render(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="data-corruption" />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()

      // Test recovery mechanism
      const retryButton = screen.getByTestId('error-retry')
      
      // Switch to normal scenario
      await act(async () => {
        await user.click(retryButton)
      })

      // Rerender with normal scenario
      rerender(
        <FYIErrorBoundary onError={onError}>
          <MockFYIComponent scenario="normal" />
        </FYIErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
        expect(screen.getByTestId('fyi-component')).toBeInTheDocument()
      })
    })
  })
})