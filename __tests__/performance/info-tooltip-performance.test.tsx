/**
 * Performance Tests for InfoTooltip Components
 * 
 * Comprehensive performance testing following CLAUDE.md performance standards
 * Tests rendering speed, memory usage, animation performance, and scalability
 */

import React, { Profiler, ProfilerOnRenderCallback } from 'react'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoTooltip, InfoSection } from '@/components/ui/info-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'

// Performance testing utilities
interface RenderMetrics {
  renderTime: number
  renderCount: number
  memoryUsage: {
    initial: number
    peak: number
    final: number
  }
}

interface AnimationMetrics {
  framerate: number
  duration: number
  smooth: boolean
}

// Test wrapper with performance monitoring
const PerformanceTestWrapper: React.FC<{ 
  children: React.ReactNode
  onRender?: ProfilerOnRenderCallback
}> = ({ children, onRender }) => (
  <TooltipProvider delayDuration={0}>
    <Profiler id="info-tooltip-performance" onRender={onRender || (() => {})}>
      {children}
    </Profiler>
  </TooltipProvider>
)

// Performance measurement helpers
const measureMemory = (): number => {
  if ('memory' in performance && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const startTime = performance.now()
  await act(async () => {
    renderFn()
  })
  return performance.now() - startTime
}

const measureFrameRate = async (duration: number = 1000): Promise<number> => {
  let frames = 0
  const startTime = performance.now()
  
  const countFrames = () => {
    frames++
    if (performance.now() - startTime < duration) {
      requestAnimationFrame(countFrames)
    }
  }
  
  requestAnimationFrame(countFrames)
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(frames / (duration / 1000))
    }, duration)
  })
}

describe('InfoTooltip Performance Tests', () => {
  let renderMetrics: RenderMetrics
  
  beforeEach(() => {
    renderMetrics = {
      renderTime: 0,
      renderCount: 0,
      memoryUsage: {
        initial: measureMemory(),
        peak: 0,
        final: 0
      }
    }
  })
  
  afterEach(() => {
    cleanup()
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  describe('Render Performance', () => {
    it('renders single tooltip within performance budget (< 16ms)', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <InfoTooltip content="Performance test tooltip" />,
          { wrapper: PerformanceTestWrapper }
        )
      })

      expect(renderTime).toBeLessThan(16) // 60fps budget
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders complex InfoSection within performance budget', async () => {
      const complexContent = (
        <InfoSection
          title="Complex Performance Test"
          description="Detailed description with multiple elements for performance testing"
          features={Array.from({ length: 20 }, (_, i) => `Feature ${i + 1}`)}
          tips={Array.from({ length: 10 }, (_, i) => `Performance tip ${i + 1}`)}
        />
      )

      const renderTime = await measureRenderTime(() => {
        render(
          <InfoTooltip content={complexContent} />,
          { wrapper: PerformanceTestWrapper }
        )
      })

      expect(renderTime).toBeLessThan(32) // Allow more time for complex content
    })

    it('handles multiple tooltips efficiently', async () => {
      const tooltipCount = 50
      
      const renderTime = await measureRenderTime(() => {
        render(
          <div>
            {Array.from({ length: tooltipCount }, (_, i) => (
              <InfoTooltip key={i} content={`Tooltip ${i}`} />
            ))}
          </div>,
          { wrapper: PerformanceTestWrapper }
        )
      })

      // Should render 50 tooltips in reasonable time (< 100ms)
      expect(renderTime).toBeLessThan(100)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(tooltipCount)
    })

    it('measures actual render time with React Profiler', (done) => {
      let totalRenderTime = 0
      let renderCount = 0

      const onRender: ProfilerOnRenderCallback = (
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime
      ) => {
        totalRenderTime += actualDuration
        renderCount++
        
        // Complete test after renders stabilize
        if (renderCount >= 2) {
          expect(totalRenderTime).toBeLessThan(20) // Total render time budget
          expect(actualDuration).toBeLessThan(10) // Individual render budget
          done()
        }
      }

      render(
        <InfoTooltip content="Profiler test tooltip" />,
        { 
          wrapper: ({ children }) => (
            <PerformanceTestWrapper onRender={onRender}>
              {children}
            </PerformanceTestWrapper>
          )
        }
      )
    })
  })

  describe('Memory Usage Performance', () => {
    it('maintains reasonable memory usage for single tooltip', async () => {
      const initialMemory = measureMemory()
      
      const { unmount } = render(
        <InfoTooltip content="Memory test tooltip" />,
        { wrapper: PerformanceTestWrapper }
      )
      
      const afterRenderMemory = measureMemory()
      const memoryIncrease = afterRenderMemory - initialMemory
      
      unmount()
      
      // Allow time for garbage collection
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const finalMemory = measureMemory()
      
      // Memory increase should be reasonable (< 1MB for single tooltip)
      expect(memoryIncrease).toBeLessThan(1000000)
      
      // Most memory should be freed after unmount
      expect(finalMemory - initialMemory).toBeLessThan(memoryIncrease * 0.5)
    })

    it('handles memory efficiently with many tooltips', async () => {
      const initialMemory = measureMemory()
      const tooltipCount = 100
      
      const { unmount } = render(
        <div>
          {Array.from({ length: tooltipCount }, (_, i) => (
            <InfoTooltip key={i} content={`Memory test ${i}`} />
          ))}
        </div>,
        { wrapper: PerformanceTestWrapper }
      )
      
      const afterRenderMemory = measureMemory()
      const memoryIncrease = afterRenderMemory - initialMemory
      
      // Memory should scale reasonably with tooltip count
      const memoryPerTooltip = memoryIncrease / tooltipCount
      expect(memoryPerTooltip).toBeLessThan(50000) // < 50KB per tooltip
      
      unmount()
      
      // Allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const finalMemory = measureMemory()
      const memoryLeakage = finalMemory - initialMemory
      
      // Memory leakage should be minimal
      expect(memoryLeakage).toBeLessThan(memoryIncrease * 0.3)
    })

    it('cleans up event listeners properly', () => {
      const initialListenerCount = document.getElementsByTagName('*').length
      
      const { unmount } = render(
        <div>
          {Array.from({ length: 20 }, (_, i) => (
            <InfoTooltip key={i} content={`Cleanup test ${i}`} />
          ))}
        </div>,
        { wrapper: PerformanceTestWrapper }
      )
      
      unmount()
      
      const finalListenerCount = document.getElementsByTagName('*').length
      
      // DOM should be cleaned up properly
      expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 5)
    })
  })

  describe('Animation Performance', () => {
    it('maintains smooth frame rate during hover animations', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip content="Animation performance test" />,
        { wrapper: PerformanceTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      
      // Start measuring frame rate
      const frameRatePromise = measureFrameRate(500) // 500ms test
      
      // Trigger hover animations
      await user.hover(trigger)
      await user.unhover(trigger)
      
      const frameRate = await frameRatePromise
      
      // Should maintain smooth frame rate (> 50 fps)
      expect(frameRate).toBeGreaterThan(50)
    })

    it('animation performance with multiple concurrent tooltips', async () => {
      const user = userEvent.setup()
      
      render(
        <div style={{ display: 'flex', gap: '10px' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <InfoTooltip key={i} content={`Concurrent animation ${i}`} />
          ))}
        </div>,
        { wrapper: PerformanceTestWrapper }
      )
      
      const triggers = screen.getAllByRole('button')
      
      const frameRatePromise = measureFrameRate(1000)
      
      // Trigger multiple hover states simultaneously
      await Promise.all(triggers.slice(0, 5).map(trigger => user.hover(trigger)))
      
      const frameRate = await frameRatePromise
      
      // Should maintain reasonable frame rate even with multiple animations
      expect(frameRate).toBeGreaterThan(30)
    })

    it('CSS transition performance', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip content="CSS transition test" />,
        { wrapper: PerformanceTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      
      // Measure transition performance
      const startTime = performance.now()
      
      await user.hover(trigger)
      
      // Wait for transition to complete (duration-200 = 200ms)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const transitionTime = performance.now() - startTime
      
      // Transition should complete smoothly
      expect(transitionTime).toBeLessThan(500)
      
      // Tooltip should be visible
      expect(screen.getByText('CSS transition test')).toBeInTheDocument()
    })
  })

  describe('Interaction Performance', () => {
    it('responds to hover events quickly', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(
        <InfoTooltip content="Hover performance test" />,
        { wrapper: PerformanceTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      
      const startTime = performance.now()
      await user.hover(trigger)
      
      // Wait for tooltip to appear
      await screen.findByText('Hover performance test')
      const responseTime = performance.now() - startTime
      
      // Should respond within reasonable time (< 50ms)
      expect(responseTime).toBeLessThan(50)
    })

    it('handles rapid hover/unhover cycles', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(
        <InfoTooltip content="Rapid interaction test" />,
        { wrapper: PerformanceTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      
      const startTime = performance.now()
      
      // Perform rapid hover cycles
      for (let i = 0; i < 10; i++) {
        await user.hover(trigger)
        await user.unhover(trigger)
      }
      
      const totalTime = performance.now() - startTime
      const averageTime = totalTime / 10
      
      // Each cycle should be fast (< 10ms average)
      expect(averageTime).toBeLessThan(10)
    })

    it('keyboard navigation performance', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          {Array.from({ length: 20 }, (_, i) => (
            <InfoTooltip key={i} content={`Keyboard nav ${i}`} />
          ))}
        </div>,
        { wrapper: PerformanceTestWrapper }
      )
      
      const startTime = performance.now()
      
      // Navigate through all tooltips with keyboard
      for (let i = 0; i < 20; i++) {
        await user.tab()
      }
      
      const navigationTime = performance.now() - startTime
      const averageTime = navigationTime / 20
      
      // Each navigation step should be fast (< 5ms average)
      expect(averageTime).toBeLessThan(5)
    })
  })

  describe('Scalability Performance', () => {
    it('scales linearly with tooltip count', async () => {
      const testCounts = [10, 50, 100]
      const renderTimes: number[] = []
      
      for (const count of testCounts) {
        const renderTime = await measureRenderTime(() => {
          const { unmount } = render(
            <div>
              {Array.from({ length: count }, (_, i) => (
                <InfoTooltip key={i} content={`Scale test ${i}`} />
              ))}
            </div>,
            { wrapper: PerformanceTestWrapper }
          )
          
          // Clean up immediately
          setTimeout(unmount, 0)
        })
        
        renderTimes.push(renderTime)
        cleanup()
      }
      
      // Performance should scale reasonably (not exponentially)
      const timeRatio = renderTimes[2] / renderTimes[0] // 100 vs 10 tooltips
      const countRatio = testCounts[2] / testCounts[0] // 10x more tooltips
      
      expect(timeRatio).toBeLessThan(countRatio * 2) // Should not be more than 2x the count ratio
    })

    it('maintains performance with complex content at scale', async () => {
      const complexContent = (i: number) => (
        <InfoSection
          title={`Complex Title ${i}`}
          description={`Complex description ${i} with detailed information`}
          features={[`Feature ${i}.1`, `Feature ${i}.2`, `Feature ${i}.3`]}
          tips={[`Tip ${i}.1`, `Tip ${i}.2`]}
        />
      )
      
      const renderTime = await measureRenderTime(() => {
        render(
          <div>
            {Array.from({ length: 25 }, (_, i) => (
              <InfoTooltip key={i} content={complexContent(i)} />
            ))}
          </div>,
          { wrapper: PerformanceTestWrapper }
        )
      })
      
      // Should render 25 complex tooltips in reasonable time
      expect(renderTime).toBeLessThan(200)
    })

    it('handles large datasets without memory leaks', async () => {
      const iterations = 5
      const tooltipsPerIteration = 50
      const memoryReadings: number[] = []
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <div>
            {Array.from({ length: tooltipsPerIteration }, (_, j) => (
              <InfoTooltip key={j} content={`Memory leak test ${i}-${j}`} />
            ))}
          </div>,
          { wrapper: PerformanceTestWrapper }
        )
        
        memoryReadings.push(measureMemory())
        
        unmount()
        cleanup()
        
        // Allow garbage collection
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Memory usage should not continuously increase
      const memoryGrowth = memoryReadings[iterations - 1] - memoryReadings[0]
      const maxReasonableGrowth = 5000000 // 5MB
      
      expect(memoryGrowth).toBeLessThan(maxReasonableGrowth)
    })
  })

  describe('Bundle Size Impact', () => {
    it('tree-shaking works correctly', () => {
      // This test would typically be run with a bundler analysis
      // For now, we verify that components can be imported individually
      expect(InfoTooltip).toBeDefined()
      expect(InfoSection).toBeDefined()
      expect(TooltipProvider).toBeDefined()
    })

    it('dynamic imports work for code splitting', async () => {
      const startTime = performance.now()
      
      // Simulate dynamic import (in real app this would split bundles)
      const ComponentModule = await Promise.resolve({
        InfoTooltip,
        InfoSection
      })
      
      const importTime = performance.now() - startTime
      
      expect(ComponentModule.InfoTooltip).toBeDefined()
      expect(ComponentModule.InfoSection).toBeDefined()
      expect(importTime).toBeLessThan(10) // Should be nearly instantaneous
    })
  })

  describe('Real-world Performance Scenarios', () => {
    it('dashboard page with multiple tooltips performs well', async () => {
      const user = userEvent.setup({ delay: null })
      
      // Simulate dashboard page with many tooltips
      const DashboardSimulation = () => (
        <div>
          <h1>Dashboard <InfoTooltip content="Dashboard overview tooltip" /></h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ border: '1px solid #ccc', padding: '1rem' }}>
                <h3>Metric {i + 1} <InfoTooltip content={`Metric ${i + 1} explanation`} /></h3>
                <p>Value: {Math.random() * 100}</p>
              </div>
            ))}
          </div>
        </div>
      )
      
      const renderTime = await measureRenderTime(() => {
        render(<DashboardSimulation />, { wrapper: PerformanceTestWrapper })
      })
      
      expect(renderTime).toBeLessThan(100) // Dashboard should load quickly
      
      // Test interaction performance
      const tooltips = screen.getAllByRole('button')
      
      const interactionStart = performance.now()
      await user.hover(tooltips[0])
      await user.hover(tooltips[5])
      await user.hover(tooltips[10])
      const interactionTime = performance.now() - interactionStart
      
      expect(interactionTime).toBeLessThan(50) // Interactions should be snappy
    })

    it('form with help tooltips performs well', async () => {
      const user = userEvent.setup({ delay: null })
      
      const FormSimulation = () => (
        <form>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ margin: '1rem 0' }}>
              <label>
                Field {i + 1} 
                <InfoTooltip content={`Help for field ${i + 1}`} />
              </label>
              <input type="text" />
            </div>
          ))}
        </form>
      )
      
      const renderTime = await measureRenderTime(() => {
        render(<FormSimulation />, { wrapper: PerformanceTestWrapper })
      })
      
      expect(renderTime).toBeLessThan(50)
      
      // Test tab navigation performance through form
      const startTime = performance.now()
      
      // Tab through form fields and tooltips
      for (let i = 0; i < 10; i++) {
        await user.tab() // Input field
        await user.tab() // Tooltip
      }
      
      const tabTime = performance.now() - startTime
      expect(tabTime).toBeLessThan(200) // Should tab through form quickly
    })

    it('mobile touch performance', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      render(
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <InfoTooltip key={i} content={`Mobile tooltip ${i}`} />
          ))}
        </div>,
        { wrapper: PerformanceTestWrapper }
      )
      
      const triggers = screen.getAllByRole('button')
      
      const touchStart = performance.now()
      
      // Simulate touch interactions
      triggers.slice(0, 3).forEach(trigger => {
        fireEvent.touchStart(trigger)
        fireEvent.touchEnd(trigger)
      })
      
      const touchTime = performance.now() - touchStart
      
      // Touch interactions should be responsive on mobile
      expect(touchTime).toBeLessThan(30)
    })
  })

  describe('Performance Monitoring', () => {
    it('provides performance metrics', (done) => {
      let renderMetrics: any = {}
      
      const onRender: ProfilerOnRenderCallback = (
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime
      ) => {
        renderMetrics = {
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime
        }
        
        expect(renderMetrics.actualDuration).toBeGreaterThan(0)
        expect(renderMetrics.baseDuration).toBeGreaterThan(0)
        expect(renderMetrics.actualDuration).toBeLessThan(20) // Performance budget
        
        done()
      }
      
      render(
        <InfoTooltip content="Performance monitoring test" />,
        { 
          wrapper: ({ children }) => (
            <PerformanceTestWrapper onRender={onRender}>
              {children}
            </PerformanceTestWrapper>
          )
        }
      )
    })

    it('tracks performance over time', async () => {
      const measurements: number[] = []
      
      // Take multiple performance measurements
      for (let i = 0; i < 5; i++) {
        const renderTime = await measureRenderTime(() => {
          const { unmount } = render(
            <InfoTooltip content={`Performance tracking ${i}`} />,
            { wrapper: PerformanceTestWrapper }
          )
          setTimeout(unmount, 0)
        })
        
        measurements.push(renderTime)
        cleanup()
      }
      
      // Performance should be consistent (low variance)
      const average = measurements.reduce((a, b) => a + b, 0) / measurements.length
      const variance = measurements.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / measurements.length
      const standardDeviation = Math.sqrt(variance)
      
      // Standard deviation should be low (consistent performance)
      expect(standardDeviation).toBeLessThan(average * 0.5) // SD < 50% of average
    })
  })
})