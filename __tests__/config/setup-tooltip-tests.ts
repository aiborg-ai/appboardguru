/**
 * Test Setup for InfoTooltip Components
 * 
 * Global test setup following CLAUDE.md standards
 * Configures Jest environment, custom matchers, and testing utilities
 */

import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { jest } from '@jest/globals'
import { customMatchers, setupCommonMocks } from '../helpers/tooltip-test-helpers'
import { TOOLTIP_TEST_CONFIG, validateTestConfig } from './tooltip-test-config'

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: TOOLTIP_TEST_CONFIG.timeouts.unit,
  computedStyleSupportsPseudoElements: true,
})

// Set default Jest timeout
jest.setTimeout(TOOLTIP_TEST_CONFIG.timeouts.unit)

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

/**
 * Setup DOM environment for tooltip testing
 */
const setupDOMEnvironment = () => {
  // Mock window.matchMedia for responsive testing
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock window.getComputedStyle for style testing
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = jest.fn().mockImplementation((element, pseudoElement) => {
    const style = originalGetComputedStyle.call(window, element, pseudoElement)
    return {
      ...style,
      // Add tooltip-specific style mocks
      getPropertyValue: jest.fn().mockImplementation((property: string) => {
        switch (property) {
          case 'color':
            return 'rgb(59, 130, 246)' // blue-500
          case 'background-color':
            return 'rgb(239, 246, 255)' // blue-50
          case 'border-color':
            return 'rgb(191, 219, 254)' // blue-200
          case 'width':
          case 'height':
            return '28px' // w-7 h-7
          case 'border-radius':
            return '50%' // rounded-full
          case 'transition-duration':
            return '200ms' // duration-200
          default:
            return style.getPropertyValue(property)
        }
      })
    }
  })

  // Mock ResizeObserver for tooltip positioning
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock IntersectionObserver for tooltip visibility
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }))

  // Mock requestAnimationFrame for animation testing
  global.requestAnimationFrame = jest.fn().mockImplementation(cb => setTimeout(cb, 16))
  global.cancelAnimationFrame = jest.fn().mockImplementation(id => clearTimeout(id))

  // Mock performance API for performance testing
  if (!(global as any).performance) {
    (global as any).performance = {}
  }
  
  if (!global.performance.now) {
    global.performance.now = jest.fn().mockImplementation(() => Date.now())
  }

  // Mock performance.memory for memory testing
  if (!(global.performance as any).memory) {
    (global.performance as any).memory = {
      usedJSHeapSize: 10000000, // 10MB default
      totalJSHeapSize: 50000000, // 50MB default
      jsHeapSizeLimit: 2000000000 // 2GB default
    }
  }

  // Setup viewport dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })

  // Mock scroll behavior
  Element.prototype.scrollIntoView = jest.fn()
  window.scrollTo = jest.fn()

  // Mock CSS custom properties
  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty
  CSSStyleDeclaration.prototype.setProperty = jest.fn().mockImplementation(
    function(property: string, value: string, priority?: string) {
      return originalSetProperty.call(this, property, value, priority)
    }
  )
}

/**
 * Setup console monitoring
 */
const setupConsoleMonitoring = () => {
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log

  // Track console calls for testing
  const consoleCalls = {
    errors: [] as string[],
    warnings: [] as string[],
    logs: [] as string[]
  }

  console.error = jest.fn().mockImplementation((...args) => {
    consoleCalls.errors.push(args.join(' '))
    
    // Still log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      originalError.apply(console, args)
    }
  })

  console.warn = jest.fn().mockImplementation((...args) => {
    consoleCalls.warnings.push(args.join(' '))
    
    if (process.env.NODE_ENV === 'development') {
      originalWarn.apply(console, args)
    }
  })

  console.log = jest.fn().mockImplementation((...args) => {
    consoleCalls.logs.push(args.join(' '))
    
    if (process.env.NODE_ENV === 'development') {
      originalLog.apply(console, args)
    }
  })

  // Make console calls available globally for testing
  ;(global as any).consoleCalls = consoleCalls
}

/**
 * Setup performance monitoring
 */
const setupPerformanceMonitoring = () => {
  const performanceData = {
    renderTimes: [] as number[],
    memoryUsage: [] as number[],
    interactionTimes: [] as number[]
  }

  // Track render performance
  const originalRender = require('@testing-library/react').render
  require('@testing-library/react').render = jest.fn().mockImplementation((ui, options) => {
    const startTime = performance.now()
    const result = originalRender(ui, options)
    const renderTime = performance.now() - startTime
    
    performanceData.renderTimes.push(renderTime)
    
    // Warn if render time exceeds budget
    if (renderTime > TOOLTIP_TEST_CONFIG.performance.renderTime.single) {
      console.warn(`Render time ${renderTime}ms exceeds budget of ${TOOLTIP_TEST_CONFIG.performance.renderTime.single}ms`)
    }
    
    return result
  })

  // Make performance data available globally
  ;(global as any).performanceData = performanceData
}

// ============================================================================
// CUSTOM MATCHERS SETUP
// ============================================================================

/**
 * Extend Jest matchers with tooltip-specific assertions
 */
const setupCustomMatchers = () => {
  expect.extend(customMatchers)
  
  // Additional custom matchers
  expect.extend({
    toBeWithinPerformanceBudget(received: number, budget: number) {
      const pass = received <= budget
      return {
        message: () => 
          pass 
            ? `Expected ${received}ms to exceed performance budget ${budget}ms`
            : `Expected ${received}ms to be within performance budget ${budget}ms`,
        pass,
      }
    },
    
    toHaveAccessibleTooltipStructure(received: HTMLElement) {
      const hasRole = received.getAttribute('role') === 'button'
      const hasAriaLabel = !!received.getAttribute('aria-label')
      const hasType = received.getAttribute('type') === 'button'
      const hasTabIndex = received.tabIndex >= 0
      
      const pass = hasRole && hasAriaLabel && hasType && hasTabIndex
      
      return {
        message: () => 
          pass 
            ? `Expected element not to have accessible tooltip structure`
            : `Expected element to have accessible tooltip structure (role=button, aria-label, type=button, tabIndex >= 0)`,
        pass,
      }
    },
    
    toHaveConsistentTooltipStyling(received: HTMLElement) {
      const requiredClasses = [
        'inline-flex',
        'items-center', 
        'justify-center',
        'rounded-full',
        'text-blue-500',
        'bg-blue-50',
        'border-blue-200',
        'transition-all',
        'duration-200'
      ]
      
      const missingClasses = requiredClasses.filter(className => 
        !received.classList.contains(className)
      )
      
      const pass = missingClasses.length === 0
      
      return {
        message: () => 
          pass 
            ? `Expected element not to have consistent tooltip styling`
            : `Expected element to have consistent tooltip styling. Missing classes: ${missingClasses.join(', ')}`,
        pass,
      }
    }
  })
}

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Setup Next.js specific mocks
 */
const setupNextJSMocks = () => {
  // Mock Next.js Image component
  jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, ...props }: any) => {
      return React.createElement('img', { src, alt, ...props })
    }
  }))

  // Mock Next.js Link component
  jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...props }: any) => {
      return React.createElement('a', { href, ...props }, children)
    }
  }))

  // Mock Next.js router
  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      pathname: '/test',
      query: {},
      asPath: '/test',
    })),
    usePathname: jest.fn(() => '/test'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
    useParams: jest.fn(() => ({})),
  }))

  // Mock Next.js font optimization
  jest.mock('next/font/google', () => ({
    Inter: () => ({
      style: { fontFamily: 'Inter, sans-serif' },
      variable: '--font-inter',
      className: 'font-inter'
    }),
  }))
}

/**
 * Setup Radix UI mocks if needed
 */
const setupRadixMocks = () => {
  // Most Radix components work well in testing, but we can mock specific behaviors
  
  // Mock Radix Tooltip with simplified behavior for testing
  jest.mock('@radix-ui/react-tooltip', () => ({
    Provider: ({ children, delayDuration }: any) => 
      React.createElement('div', { 'data-testid': 'tooltip-provider' }, children),
    
    Root: ({ children, open, onOpenChange }: any) =>
      React.createElement('div', { 'data-testid': 'tooltip-root' }, children),
    
    Trigger: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('button', { ref, ...props, 'data-testid': 'tooltip-trigger' }, children)
    ),
    
    Content: React.forwardRef(({ children, side, ...props }: any, ref: any) =>
      React.createElement('div', { 
        ref, 
        role: 'tooltip', 
        'data-side': side,
        'data-testid': 'tooltip-content',
        ...props 
      }, children)
    ),
    
    Portal: ({ children }: any) => children,
    Arrow: () => React.createElement('div', { 'data-testid': 'tooltip-arrow' })
  }))
}

// ============================================================================
// ERROR HANDLING SETUP
// ============================================================================

/**
 * Setup global error handling for tests
 */
const setupErrorHandling = () => {
  // Track unhandled promise rejections
  const unhandledRejections: Promise<any>[] = []
  
  process.on('unhandledRejection', (reason, promise) => {
    unhandledRejections.push(promise)
    console.error('Unhandled Promise Rejection in test:', reason)
  })

  // Track uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in test:', error)
  })

  // Make rejection tracking available
  ;(global as any).unhandledRejections = unhandledRejections

  // Set up error boundary testing utilities
  ;(global as any).TestErrorBoundary = class TestErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props)
      this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
      return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.log('Test Error Boundary caught:', error, errorInfo)
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', { 'data-testid': 'error-fallback' }, 'Something went wrong.')
      }

      return this.props.children
    }
  }
}

// ============================================================================
// TEST DATA SETUP
// ============================================================================

/**
 * Setup global test data and utilities
 */
const setupTestData = () => {
  const testData = {
    tooltipContents: [
      'Simple tooltip content',
      'More complex tooltip with detailed information',
      'Tooltip with special characters: !@#$%^&*()',
      'Very long tooltip content that spans multiple lines and includes detailed information about the feature being described'
    ],
    
    complexTooltipData: {
      title: 'Test Tooltip Section',
      description: 'Comprehensive test description',
      features: [
        'Feature 1: Basic functionality',
        'Feature 2: Advanced capabilities',
        'Feature 3: Integration support'
      ],
      tips: [
        'Tip 1: Best practices',
        'Tip 2: Performance optimization',
        'Tip 3: Accessibility guidelines'
      ]
    },
    
    performanceBenchmarks: TOOLTIP_TEST_CONFIG.performance,
    accessibilityStandards: TOOLTIP_TEST_CONFIG.accessibility
  }

  ;(global as any).testData = testData
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Setup test cleanup utilities
 */
const setupCleanup = () => {
  // Clean up after each test
  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset console call tracking
    if ((global as any).consoleCalls) {
      (global as any).consoleCalls.errors = []
      ;(global as any).consoleCalls.warnings = []
      ;(global as any).consoleCalls.logs = []
    }
    
    // Reset performance data
    if ((global as any).performanceData) {
      (global as any).performanceData.renderTimes = []
      ;(global as any).performanceData.memoryUsage = []
      ;(global as any).performanceData.interactionTimes = []
    }
    
    // Clear unhandled rejections
    if ((global as any).unhandledRejections) {
      (global as any).unhandledRejections.length = 0
    }
  })

  // Clean up after all tests
  afterAll(() => {
    // Restore all mocks
    jest.restoreAllMocks()
  })
}

// ============================================================================
// MAIN SETUP EXECUTION
// ============================================================================

/**
 * Execute all setup procedures
 */
const initializeTestEnvironment = () => {
  // Validate configuration first
  if (!validateTestConfig()) {
    throw new Error('Invalid test configuration')
  }

  // Setup environment
  setupDOMEnvironment()
  setupConsoleMonitoring()
  setupPerformanceMonitoring()
  
  // Setup testing utilities
  setupCustomMatchers()
  setupCommonMocks()
  
  // Setup framework-specific mocks
  setupNextJSMocks()
  setupRadixMocks()
  
  // Setup error handling and cleanup
  setupErrorHandling()
  setupTestData()
  setupCleanup()
  
  console.log('✅ InfoTooltip test environment initialized successfully')
  console.log(`📊 Performance budgets: Render ${TOOLTIP_TEST_CONFIG.performance.renderTime.single}ms, Memory ${TOOLTIP_TEST_CONFIG.performance.memoryUsage.single / 1000000}MB`)
  console.log(`♿ Accessibility standards: WCAG ${TOOLTIP_TEST_CONFIG.accessibility.wcag.level}, Contrast ${TOOLTIP_TEST_CONFIG.accessibility.wcag.colorContrast}:1`)
  console.log(`🎯 Coverage thresholds: Lines ${TOOLTIP_TEST_CONFIG.coverage.global.lines}%, Functions ${TOOLTIP_TEST_CONFIG.coverage.global.functions}%`)
}

// Initialize the test environment
initializeTestEnvironment()

// ============================================================================
// GLOBAL TYPE DECLARATIONS
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceBudget(budget: number): R
      toHaveAccessibleTooltipStructure(): R
      toHaveConsistentTooltipStyling(): R
    }
  }
  
  var consoleCalls: {
    errors: string[]
    warnings: string[]
    logs: string[]
  }
  
  var performanceData: {
    renderTimes: number[]
    memoryUsage: number[]
    interactionTimes: number[]
  }
  
  var testData: {
    tooltipContents: string[]
    complexTooltipData: any
    performanceBenchmarks: typeof TOOLTIP_TEST_CONFIG.performance
    accessibilityStandards: typeof TOOLTIP_TEST_CONFIG.accessibility
  }
  
  var unhandledRejections: Promise<any>[]
  var TestErrorBoundary: React.ComponentType<{ children: React.ReactNode }>
}

export {}