/**
 * Test Helpers and Utilities for InfoTooltip Components
 * 
 * Comprehensive testing utilities following CLAUDE.md standards
 * Provides reusable helpers for unit, integration, E2E, and performance testing
 */

import React, { ReactElement, ReactNode } from 'react'
import { render, screen, waitFor, RenderOptions, RenderResult } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { InfoTooltip, InfoSection } from '@/components/ui/info-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Page } from 'playwright'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TooltipTestConfig {
  content: string | ReactElement
  size?: 'sm' | 'md' | 'lg'
  side?: 'top' | 'right' | 'bottom' | 'left'
  testId?: string
  ariaLabel?: string
  delayDuration?: number
}

export interface TooltipInteractionTest {
  trigger: 'hover' | 'focus' | 'click' | 'keyboard'
  expectedContent: string
  delay?: number
}

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  frameRate?: number
  interactionTime?: number
}

export interface AccessibilityTestCase {
  name: string
  component: ReactElement
  expectedAriaAttributes: Record<string, string>
  keyboardNavigation?: string[]
}

export interface VisualTestCase {
  name: string
  component: ReactElement
  expectedClasses: string[]
  viewport?: { width: number; height: number }
}

// ============================================================================
// WRAPPER COMPONENTS
// ============================================================================

/**
 * Standard test wrapper with TooltipProvider
 */
export const TooltipTestWrapper: React.FC<{ 
  children: ReactNode
  delayDuration?: number 
}> = ({ children, delayDuration = 0 }) => (
  <TooltipProvider delayDuration={delayDuration}>
    <div data-testid="tooltip-test-wrapper">
      {children}
    </div>
  </TooltipProvider>
)

/**
 * Accessibility test wrapper with additional ARIA context
 */
export const AccessibilityTestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TooltipProvider delayDuration={0}>
    <div role="main" aria-label="Test application">
      {children}
    </div>
  </TooltipProvider>
)

/**
 * Performance test wrapper with monitoring
 */
export const PerformanceTestWrapper: React.FC<{ 
  children: ReactNode
  onRender?: (metrics: PerformanceMetrics) => void
}> = ({ children, onRender }) => (
  <TooltipProvider delayDuration={0}>
    <React.Profiler
      id="tooltip-performance"
      onRender={(id, phase, actualDuration) => {
        onRender?.({
          renderTime: actualDuration,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        })
      }}
    >
      {children}
    </React.Profiler>
  </TooltipProvider>
)

/**
 * Visual test wrapper with consistent styling context
 */
export const VisualTestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TooltipProvider delayDuration={0}>
    <div className="p-8 bg-white min-h-screen font-inter">
      {children}
    </div>
  </TooltipProvider>
)

// ============================================================================
// RENDER UTILITIES
// ============================================================================

/**
 * Enhanced render function with tooltip-specific setup
 */
export const renderWithTooltipProvider = (
  ui: ReactElement,
  options: RenderOptions & {
    wrapper?: React.ComponentType<{ children: ReactNode }>
    delayDuration?: number
  } = {}
): RenderResult => {
  const { wrapper, delayDuration = 0, ...renderOptions } = options
  
  const Wrapper = wrapper || (({ children }: { children: ReactNode }) => (
    <TooltipTestWrapper delayDuration={delayDuration}>
      {children}
    </TooltipTestWrapper>
  ))
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Render tooltip with common configurations
 */
export const renderTooltip = (config: TooltipTestConfig, options?: RenderOptions): RenderResult => {
  const tooltip = (
    <InfoTooltip
      content={config.content}
      size={config.size}
      side={config.side}
      data-testid={config.testId}
      aria-label={config.ariaLabel}
    />
  )
  
  return renderWithTooltipProvider(tooltip, {
    ...options,
    delayDuration: config.delayDuration
  })
}

/**
 * Render multiple tooltips for testing scalability
 */
export const renderMultipleTooltips = (
  count: number,
  getConfig: (index: number) => TooltipTestConfig,
  options?: RenderOptions
): RenderResult => {
  const tooltips = (
    <div data-testid="multiple-tooltips">
      {Array.from({ length: count }, (_, i) => {
        const config = getConfig(i)
        return (
          <InfoTooltip
            key={i}
            content={config.content}
            size={config.size}
            data-testid={`tooltip-${i}`}
          />
        )
      })}
    </div>
  )
  
  return renderWithTooltipProvider(tooltips, options)
}

// ============================================================================
// INTERACTION HELPERS
// ============================================================================

/**
 * Helper to interact with tooltip triggers
 */
export class TooltipInteractionHelper {
  constructor(private user: UserEvent) {}
  
  /**
   * Find tooltip trigger button
   */
  async findTrigger(testId?: string): Promise<HTMLElement> {
    if (testId) {
      return screen.getByTestId(testId).querySelector('button') as HTMLElement
    }
    return screen.getByRole('button', { name: /additional information/i })
  }
  
  /**
   * Find multiple tooltip triggers
   */
  async findAllTriggers(): Promise<HTMLElement[]> {
    return screen.getAllByRole('button', { name: /information/i })
  }
  
  /**
   * Hover over tooltip trigger
   */
  async hover(trigger?: HTMLElement): Promise<void> {
    const element = trigger || await this.findTrigger()
    await this.user.hover(element)
  }
  
  /**
   * Remove hover from tooltip trigger
   */
  async unhover(trigger?: HTMLElement): Promise<void> {
    const element = trigger || await this.findTrigger()
    await this.user.unhover(element)
  }
  
  /**
   * Focus tooltip trigger with keyboard
   */
  async focus(trigger?: HTMLElement): Promise<void> {
    const element = trigger || await this.findTrigger()
    element.focus()
  }
  
  /**
   * Click tooltip trigger
   */
  async click(trigger?: HTMLElement): Promise<void> {
    const element = trigger || await this.findTrigger()
    await this.user.click(element)
  }
  
  /**
   * Navigate with keyboard
   */
  async navigateWithKeyboard(key: string): Promise<void> {
    await this.user.keyboard(key)
  }
  
  /**
   * Tab to element
   */
  async tab(): Promise<void> {
    await this.user.tab()
  }
  
  /**
   * Press Escape key
   */
  async pressEscape(): Promise<void> {
    await this.user.keyboard('{Escape}')
  }
  
  /**
   * Press Enter key
   */
  async pressEnter(): Promise<void> {
    await this.user.keyboard('{Enter}')
  }
  
  /**
   * Press Space key
   */
  async pressSpace(): Promise<void> {
    await this.user.keyboard(' ')
  }
}

/**
 * Create interaction helper instance
 */
export const createInteractionHelper = (): TooltipInteractionHelper => {
  const user = userEvent.setup({ delay: null })
  return new TooltipInteractionHelper(user)
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Wait for tooltip to appear
 */
export const waitForTooltipToAppear = async (content: string | RegExp): Promise<HTMLElement> => {
  return await waitFor(() => {
    if (typeof content === 'string') {
      return screen.getByText(content)
    } else {
      return screen.getByText(content)
    }
  })
}

/**
 * Wait for tooltip to disappear
 */
export const waitForTooltipToDisappear = async (content: string | RegExp): Promise<void> => {
  await waitFor(() => {
    if (typeof content === 'string') {
      expect(screen.queryByText(content)).not.toBeInTheDocument()
    } else {
      expect(screen.queryByText(content)).not.toBeInTheDocument()
    }
  })
}

/**
 * Assert tooltip is visible with specific content
 */
export const assertTooltipVisible = async (expectedContent: string | RegExp): Promise<void> => {
  const tooltip = await waitForTooltipToAppear(expectedContent)
  expect(tooltip).toBeInTheDocument()
  expect(tooltip).toBeVisible()
}

/**
 * Assert tooltip is not visible
 */
export const assertTooltipNotVisible = async (content: string | RegExp): Promise<void> => {
  await waitForTooltipToDisappear(content)
}

/**
 * Assert tooltip trigger has correct attributes
 */
export const assertTriggerAttributes = (
  trigger: HTMLElement,
  expectedAttributes: Record<string, string>
): void => {
  Object.entries(expectedAttributes).forEach(([attr, value]) => {
    expect(trigger).toHaveAttribute(attr, value)
  })
}

/**
 * Assert tooltip has correct styling classes
 */
export const assertTooltipStyling = (element: HTMLElement, expectedClasses: string[]): void => {
  expectedClasses.forEach(className => {
    expect(element).toHaveClass(className)
  })
}

/**
 * Assert tooltip accessibility
 */
export const assertTooltipAccessibility = (trigger: HTMLElement): void => {
  expect(trigger).toHaveAttribute('role', 'button')
  expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('information'))
  expect(trigger).toHaveAttribute('type', 'button')
}

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

/**
 * Measure render performance
 */
export const measureRenderPerformance = async (renderFn: () => void): Promise<number> => {
  const startTime = performance.now()
  renderFn()
  return performance.now() - startTime
}

/**
 * Measure memory usage
 */
export const measureMemoryUsage = (): number => {
  if ('memory' in performance && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

/**
 * Measure interaction performance
 */
export const measureInteractionTime = async (
  interactionFn: () => Promise<void>
): Promise<number> => {
  const startTime = performance.now()
  await interactionFn()
  return performance.now() - startTime
}

/**
 * Performance test runner
 */
export const runPerformanceTest = async <T,>(
  testName: string,
  testFn: () => Promise<T>,
  maxDuration: number = 100
): Promise<{ result: T; duration: number; passed: boolean }> => {
  const startTime = performance.now()
  const result = await testFn()
  const duration = performance.now() - startTime
  const passed = duration <= maxDuration
  
  if (!passed) {
    console.warn(`Performance test "${testName}" exceeded limit: ${duration}ms > ${maxDuration}ms`)
  }
  
  return { result, duration, passed }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate test tooltip configurations
 */
export const generateTooltipConfigs = (count: number): TooltipTestConfig[] => {
  return Array.from({ length: count }, (_, i) => ({
    content: `Test tooltip ${i + 1}`,
    size: (['sm', 'md', 'lg'] as const)[i % 3],
    side: (['top', 'right', 'bottom', 'left'] as const)[i % 4],
    testId: `test-tooltip-${i}`
  }))
}

/**
 * Generate complex InfoSection content
 */
export const generateComplexTooltipContent = (index: number): ReactElement => {
  return (
    <InfoSection
      title={`Complex Tooltip ${index}`}
      description={`Detailed description for tooltip ${index} with comprehensive information`}
      features={[
        `Feature ${index}.1: Advanced functionality`,
        `Feature ${index}.2: Enhanced user experience`,
        `Feature ${index}.3: Improved accessibility`
      ]}
      tips={[
        `Tip ${index}.1: Best practices for usage`,
        `Tip ${index}.2: Advanced techniques`,
        `Tip ${index}.3: Optimization strategies`
      ]}
    />
  )
}

/**
 * Generate accessibility test cases
 */
export const generateAccessibilityTestCases = (): AccessibilityTestCase[] => {
  return [
    {
      name: 'Basic tooltip accessibility',
      component: <InfoTooltip content="Basic accessibility test" />,
      expectedAriaAttributes: {
        'role': 'button',
        'aria-label': expect.stringContaining('information'),
        'type': 'button'
      }
    },
    {
      name: 'Complex content accessibility',
      component: <InfoTooltip content={generateComplexTooltipContent(1)} />,
      expectedAriaAttributes: {
        'role': 'button',
        'aria-label': expect.stringContaining('information')
      },
      keyboardNavigation: ['{Tab}', '{Enter}', '{Escape}']
    }
  ]
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Mock Next.js router
 */
export const mockNextRouter = () => {
  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      pathname: '/test',
      query: {},
    })),
    usePathname: jest.fn(() => '/test'),
  }))
}

/**
 * Mock ResizeObserver for tooltip positioning
 */
export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

/**
 * Mock IntersectionObserver
 */
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }))
}

/**
 * Setup all common mocks
 */
export const setupCommonMocks = () => {
  mockNextRouter()
  mockResizeObserver()
  mockIntersectionObserver()
  
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
}

/**
 * Cleanup all mocks
 */
export const cleanupMocks = () => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
}

// ============================================================================
// E2E HELPERS (for Playwright)
// ============================================================================

/**
 * E2E tooltip interaction helpers
 */
export class PlaywrightTooltipHelper {
  constructor(private page: Page) {}
  
  async hoverTooltip(selector: string): Promise<void> {
    await this.page.hover(selector)
  }
  
  async clickTooltip(selector: string): Promise<void> {
    await this.page.click(selector)
  }
  
  async waitForTooltip(content: string): Promise<void> {
    await this.page.waitForSelector(`[role="tooltip"]:has-text("${content}")`)
  }
  
  async assertTooltipVisible(content: string): Promise<void> {
    await expect(this.page.locator(`[role="tooltip"]:has-text("${content}")`)).toBeVisible()
  }
  
  async assertTooltipNotVisible(content: string): Promise<void> {
    await expect(this.page.locator(`[role="tooltip"]:has-text("${content}")`)).not.toBeVisible()
  }
  
  async testKeyboardNavigation(): Promise<void> {
    await this.page.keyboard.press('Tab')
    await this.page.keyboard.press('Enter')
    await this.page.keyboard.press('Escape')
  }
  
  async measureTooltipPerformance(): Promise<number> {
    const startTime = Date.now()
    await this.page.hover('[aria-label*="information"]')
    await this.page.waitForSelector('[role="tooltip"]')
    return Date.now() - startTime
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a delay for testing timing
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate random test content
 */
export const generateRandomContent = (length: number = 10): string => {
  const words = ['test', 'tooltip', 'content', 'information', 'help', 'guide', 'feature', 'description']
  return Array.from({ length }, () => words[Math.floor(Math.random() * words.length)]).join(' ')
}

/**
 * Validate tooltip configuration
 */
export const validateTooltipConfig = (config: TooltipTestConfig): boolean => {
  return !!(config.content && typeof config.content !== 'undefined')
}

/**
 * Get computed style property
 */
export const getComputedStyleProperty = (element: Element, property: string): string => {
  return window.getComputedStyle(element).getPropertyValue(property)
}

/**
 * Check if element is visible
 */
export const isElementVisible = (element: Element): boolean => {
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         parseFloat(style.opacity) > 0
}

// ============================================================================
// CUSTOM MATCHERS (extend Jest)
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTooltipStyling(): R
      toBeAccessibleTooltip(): R
      toHavePerformantRender(maxTime: number): R
    }
  }
}

/**
 * Custom Jest matchers for tooltip testing
 */
export const customMatchers = {
  toHaveTooltipStyling(received: HTMLElement) {
    const expectedClasses = [
      'inline-flex', 'items-center', 'justify-center', 'rounded-full',
      'text-blue-500', 'bg-blue-50', 'border-blue-200'
    ]
    
    const hasAllClasses = expectedClasses.every(className => 
      received.classList.contains(className)
    )
    
    return {
      message: () => `Expected element to have tooltip styling classes`,
      pass: hasAllClasses
    }
  },
  
  toBeAccessibleTooltip(received: HTMLElement) {
    const hasRole = received.getAttribute('role') === 'button'
    const hasAriaLabel = !!received.getAttribute('aria-label')
    const hasType = received.getAttribute('type') === 'button'
    
    return {
      message: () => `Expected element to be an accessible tooltip`,
      pass: hasRole && hasAriaLabel && hasType
    }
  },
  
  toHavePerformantRender(received: number, maxTime: number) {
    return {
      message: () => `Expected render time ${received}ms to be less than ${maxTime}ms`,
      pass: received < maxTime
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Main helpers
  createInteractionHelper,
  renderWithTooltipProvider,
  renderTooltip,
  renderMultipleTooltips,
  
  // Interaction helpers
  TooltipInteractionHelper,
  
  // Assertion helpers
  waitForTooltipToAppear,
  waitForTooltipToDisappear,
  assertTooltipVisible,
  assertTooltipNotVisible,
  assertTriggerAttributes,
  assertTooltipStyling,
  assertTooltipAccessibility,
  
  // Performance helpers
  measureRenderPerformance,
  measureMemoryUsage,
  measureInteractionTime,
  runPerformanceTest,
  
  // Test data generators
  generateTooltipConfigs,
  generateComplexTooltipContent,
  generateAccessibilityTestCases,
  
  // Mock helpers
  setupCommonMocks,
  cleanupMocks,
  
  // E2E helpers
  PlaywrightTooltipHelper,
  
  // Utility functions
  delay,
  generateRandomContent,
  validateTooltipConfig,
  getComputedStyleProperty,
  isElementVisible,
  
  // Custom matchers
  customMatchers
}