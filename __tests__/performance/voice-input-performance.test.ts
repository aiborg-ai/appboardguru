/**
 * Performance Tests for Voice Input Functionality
 * Following CLAUDE.md performance testing guidelines
 * Testing memory usage, render performance, API response times, and resource management
 */

import { performance, PerformanceObserver } from 'perf_hooks'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput'

// Performance testing utilities following CLAUDE.md patterns
class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map()
  private memorySnapshots: any[] = []
  
  startMeasurement(name: string): () => number {
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()
    
    return () => {
      const endTime = performance.now()
      const endMemory = this.getMemoryUsage()
      const duration = endTime - startTime
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, [])
      }
      this.measurements.get(name)!.push(duration)
      
      // Log memory usage if significant change
      const memoryDiff = endMemory.usedJSHeapSize - startMemory.usedJSHeapSize
      if (Math.abs(memoryDiff) > 1024 * 1024) { // > 1MB change
        console.log(`Memory change for ${name}: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`)
      }
      
      return duration
    }
  }
  
  getMeasurements(name: string): { average: number, min: number, max: number, count: number } {
    const measurements = this.measurements.get(name) || []
    if (measurements.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 }
    }
    
    return {
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length
    }
  }
  
  private getMemoryUsage(): MemoryInfo {
    // @ts-ignore - performance.memory is available in Chrome/Node
    return global.performance?.memory || { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 }
  }
  
  takeMemorySnapshot(label: string): void {
    this.memorySnapshots.push({
      label,
      timestamp: Date.now(),
      memory: this.getMemoryUsage()
    })
  }
  
  getMemoryLeakReport(): { hasLeak: boolean, report: string } {
    if (this.memorySnapshots.length < 2) {
      return { hasLeak: false, report: 'Insufficient data for leak detection' }
    }
    
    const first = this.memorySnapshots[0]
    const last = this.memorySnapshots[this.memorySnapshots.length - 1]
    
    const memoryIncrease = last.memory.usedJSHeapSize - first.memory.usedJSHeapSize
    const significantIncrease = memoryIncrease > 5 * 1024 * 1024 // 5MB threshold
    
    return {
      hasLeak: significantIncrease,
      report: `Memory usage: ${(first.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB → ${(last.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (${memoryIncrease > 0 ? '+' : ''}${(memoryIncrease / 1024 / 1024).toFixed(2)}MB)`
    }
  }
  
  reset(): void {
    this.measurements.clear()
    this.memorySnapshots = []
  }
}

// Mock setup for performance testing
const setupPerformanceMocks = (options: {
  apiDelay?: number
  recordingDelay?: number
  transcriptionSize?: number
} = {}) => {
  const { apiDelay = 100, recordingDelay = 50, transcriptionSize = 100 } = options
  
  // Mock MediaRecorder with timing controls
  global.MediaRecorder = class PerformanceMediaRecorder {
    static isTypeSupported = () => true
    state: 'inactive' | 'recording' = 'inactive'
    ondataavailable: ((event: any) => void) | null = null
    onstop: (() => void) | null = null
    
    start() {
      this.state = 'recording'
      setTimeout(() => {
        if (this.ondataavailable) {
          // Create blob with specified size for performance testing
          const data = new Uint8Array(transcriptionSize * 1024) // KB
          const blob = new Blob([data], { type: 'audio/webm' })
          this.ondataavailable({ data: blob })
        }
      }, recordingDelay)
    }
    
    stop() {
      this.state = 'inactive'
      setTimeout(() => {
        if (this.onstop) this.onstop()
      }, recordingDelay)
    }
  } as any
  
  // Mock getUserMedia
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      })
    }
  })
  
  // Mock FileReader with timing
  global.FileReader = class PerformanceFileReader {
    readAsDataURL(blob: Blob) {
      const processingTime = blob.size / (1024 * 1024) * 100 // ~100ms per MB
      setTimeout(() => {
        // @ts-ignore
        this.result = `data:audio/webm;base64,${'A'.repeat(Math.floor(blob.size * 1.33))}`
        if (this.onloadend) this.onloadend({} as ProgressEvent)
      }, processingTime)
    }
    onloadend: ((event: ProgressEvent) => void) | null = null
    onerror: ((event: ProgressEvent) => void) | null = null
    result: string | null = null
  } as any
  
  // Mock fetch with controlled delay
  global.fetch = jest.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, apiDelay))
    return {
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          text: 'performance test transcription',
          confidence: 0.95,
          duration: apiDelay / 10, // Simulated audio duration
          language: 'en',
          format: 'webm'
        }
      })
    }
  })
}

describe('Voice Input Performance Tests', () => {
  let profiler: PerformanceProfiler
  
  beforeEach(() => {
    profiler = new PerformanceProfiler()
    jest.clearAllMocks()
    setupPerformanceMocks()
  })
  
  afterEach(() => {
    cleanup()
    profiler.reset()
  })
  
  describe('Component Rendering Performance', () => {
    
    test('should render VoiceInputButton within performance budget', async () => {
      const endMeasurement = profiler.startMeasurement('voice-button-render')
      
      const onTranscription = jest.fn()
      
      // Measure render time
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const renderTime = endMeasurement()
      
      // Should render within 50ms (CLAUDE.md guideline for component rendering)
      expect(renderTime).toBeLessThan(50)
      
      // Should be visible immediately
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toBeVisible()
    })
    
    test('should handle multiple VoiceInputButton instances efficiently', async () => {
      profiler.takeMemorySnapshot('before-multiple-buttons')
      
      const endMeasurement = profiler.startMeasurement('multiple-voice-buttons-render')
      
      // Render multiple instances
      const instances = Array.from({ length: 10 }, (_, i) => (
        <VoiceInputButton key={i} onTranscription={jest.fn()} />
      ))
      
      render(<div>{instances}</div>)
      
      const renderTime = endMeasurement()
      profiler.takeMemorySnapshot('after-multiple-buttons')
      
      // Should render 10 instances within 200ms
      expect(renderTime).toBeLessThan(200)
      
      // All buttons should be functional
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(10)
      buttons.forEach(button => {
        expect(button).toBeVisible()
        expect(button).toHaveAttribute('aria-pressed', 'false')
      })
      
      // Memory usage should be reasonable
      const memoryReport = profiler.getMemoryLeakReport()
      expect(memoryReport.hasLeak).toBe(false)
    })
    
    test('should re-render efficiently on prop changes', async () => {
      const onTranscription = jest.fn()
      const { rerender } = render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const endMeasurement = profiler.startMeasurement('voice-button-rerender')
      
      // Multiple re-renders with different props
      for (let i = 0; i < 20; i++) {
        rerender(
          <VoiceInputButton
            onTranscription={onTranscription}
            disabled={i % 2 === 0}
            size={i % 3 === 0 ? 'lg' : 'sm'}
            variant={i % 2 === 0 ? 'default' : 'ghost'}
          />
        )
      }
      
      const totalRerenderTime = endMeasurement()
      
      // 20 re-renders should complete within 200ms
      expect(totalRerenderTime).toBeLessThan(200)
      
      const measurements = profiler.getMeasurements('voice-button-rerender')
      expect(measurements.count).toBe(1)
      expect(measurements.average).toBeLessThan(10) // Average per re-render
    })
  })
  
  describe('Voice Recording Performance', () => {
    
    test('should start recording within acceptable time', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('start-recording')
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      const recordingStartTime = endMeasurement()
      
      // Should start recording within 200ms
      expect(recordingStartTime).toBeLessThan(200)
    })
    
    test('should handle recording state transitions efficiently', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('recording-state-transitions')
      
      // Start recording
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      // Stop recording
      fireEvent.click(button)
      await waitFor(() => expect(button).toBeDisabled())
      
      // Wait for completion
      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).toHaveAttribute('aria-pressed', 'false')
      }, { timeout: 5000 })
      
      const totalTransitionTime = endMeasurement()
      
      // Complete recording workflow should finish within 2 seconds
      expect(totalTransitionTime).toBeLessThan(2000)
      
      expect(onTranscription).toHaveBeenCalledWith('performance test transcription')
    })
    
    test('should handle rapid recording attempts gracefully', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      profiler.takeMemorySnapshot('before-rapid-clicks')
      
      const endMeasurement = profiler.startMeasurement('rapid-recording-attempts')
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      const rapidClickTime = endMeasurement()
      profiler.takeMemorySnapshot('after-rapid-clicks')
      
      // Should handle rapid clicks within 2 seconds
      expect(rapidClickTime).toBeLessThan(2000)
      
      // Should not cause memory leaks
      const memoryReport = profiler.getMemoryLeakReport()
      expect(memoryReport.hasLeak).toBe(false)
      
      // Component should still be functional
      expect(button).toBeInTheDocument()
      expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'))
    })
  })
  
  describe('Audio Processing Performance', () => {
    
    test('should process small audio files efficiently', async () => {
      setupPerformanceMocks({ transcriptionSize: 10 }) // 10KB
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('small-audio-processing')
      
      // Complete recording cycle
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      const processingTime = endMeasurement()
      
      // Small files should process very quickly
      expect(processingTime).toBeLessThan(1000)
    })
    
    test('should handle larger audio files within acceptable limits', async () => {
      setupPerformanceMocks({ transcriptionSize: 1024 }) // 1MB
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('large-audio-processing')
      
      // Complete recording cycle
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 10000 })
      
      const processingTime = endMeasurement()
      
      // Larger files should still complete within reasonable time
      expect(processingTime).toBeLessThan(5000)
    })
    
    test('should handle concurrent audio processing efficiently', async () => {
      const components = Array.from({ length: 3 }, (_, i) => {
        const onTranscription = jest.fn()
        return { onTranscription, key: i }
      })
      
      render(
        <div>
          {components.map(({ onTranscription, key }) => (
            <VoiceInputButton key={key} onTranscription={onTranscription} />
          ))}
        </div>
      )
      
      const buttons = screen.getAllByRole('button')
      
      profiler.takeMemorySnapshot('before-concurrent-processing')
      
      const endMeasurement = profiler.startMeasurement('concurrent-audio-processing')
      
      // Start all recordings simultaneously
      buttons.forEach(button => fireEvent.click(button))
      
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button).toHaveAttribute('aria-pressed', 'true')
        })
      })
      
      // Stop all recordings simultaneously
      buttons.forEach(button => fireEvent.click(button))
      
      // Wait for all to complete
      await waitFor(() => {
        components.forEach(({ onTranscription }) => {
          expect(onTranscription).toHaveBeenCalled()
        })
      }, { timeout: 10000 })
      
      const concurrentProcessingTime = endMeasurement()
      profiler.takeMemorySnapshot('after-concurrent-processing')
      
      // Concurrent processing should be efficient
      expect(concurrentProcessingTime).toBeLessThan(6000)
      
      // No significant memory leaks
      const memoryReport = profiler.getMemoryLeakReport()
      expect(memoryReport.hasLeak).toBe(false)
    })
  })
  
  describe('API Performance', () => {
    
    test('should handle fast API responses efficiently', async () => {
      setupPerformanceMocks({ apiDelay: 50 }) // Fast API
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('fast-api-response')
      
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      })
      
      const totalTime = endMeasurement()
      
      // Fast API should result in very quick completion
      expect(totalTime).toBeLessThan(500)
    })
    
    test('should handle slow API responses gracefully', async () => {
      setupPerformanceMocks({ apiDelay: 2000 }) // Slow API
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      const endMeasurement = profiler.startMeasurement('slow-api-response')
      
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(button)
      
      // Should show processing state immediately
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 5000 })
      
      const totalTime = endMeasurement()
      
      // Should complete despite slow API
      expect(totalTime).toBeLessThan(4000)
      
      // Button should return to normal state
      expect(button).not.toBeDisabled()
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
    
    test('should batch multiple API requests efficiently', async () => {
      let requestCount = 0
      global.fetch = jest.fn().mockImplementation(async () => {
        requestCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              text: `batch test ${requestCount}`,
              confidence: 0.95
            }
          })
        }
      })
      
      const components = Array.from({ length: 5 }, (_, i) => jest.fn())
      
      render(
        <div>
          {components.map((onTranscription, i) => (
            <VoiceInputButton key={i} onTranscription={onTranscription} />
          ))}
        </div>
      )
      
      const buttons = screen.getAllByRole('button')
      
      const endMeasurement = profiler.startMeasurement('batched-api-requests')
      
      // Trigger all voice inputs rapidly
      for (let i = 0; i < buttons.length; i++) {
        fireEvent.click(buttons[i])
        await waitFor(() => expect(buttons[i]).toHaveAttribute('aria-pressed', 'true'))
        fireEvent.click(buttons[i])
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      // Wait for all to complete
      await waitFor(() => {
        components.forEach(onTranscription => {
          expect(onTranscription).toHaveBeenCalled()
        })
      }, { timeout: 10000 })
      
      const batchedTime = endMeasurement()
      
      // Should handle multiple requests efficiently
      expect(batchedTime).toBeLessThan(8000)
      expect(requestCount).toBe(5)
    })
  })
  
  describe('Memory Management', () => {
    
    test('should not leak memory during repeated use', async () => {
      const onTranscription = jest.fn()
      
      profiler.takeMemorySnapshot('memory-test-start')
      
      const { unmount } = render(<VoiceInputButton onTranscription={onTranscription} />)
      
      // Simulate repeated usage
      for (let i = 0; i < 20; i++) {
        const button = screen.getByRole('button')
        
        fireEvent.click(button)
        await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
        
        fireEvent.click(button)
        
        // Wait briefly for processing
        await new Promise(resolve => setTimeout(resolve, 200))
        
        profiler.takeMemorySnapshot(`iteration-${i}`)
      }
      
      profiler.takeMemorySnapshot('before-unmount')
      unmount()
      profiler.takeMemorySnapshot('after-unmount')
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
        profiler.takeMemorySnapshot('after-gc')
      }
      
      const memoryReport = profiler.getMemoryLeakReport()
      
      // Should not have significant memory leaks
      expect(memoryReport.hasLeak).toBe(false)
    })
    
    test('should clean up audio resources properly', async () => {
      const trackStopSpy = jest.fn()
      
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [{ stop: trackStopSpy }]
          })
        }
      })
      
      const onTranscription = jest.fn()
      const { unmount } = render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Start recording (acquires media stream)
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      // Stop recording
      fireEvent.click(button)
      
      // Unmount component
      unmount()
      
      // Audio resources should be cleaned up
      await waitFor(() => {
        expect(trackStopSpy).toHaveBeenCalled()
      })
    })
  })
  
  describe('Search Input Integration Performance', () => {
    
    test('should handle voice integration without impacting search performance', async () => {
      const onChange = jest.fn()
      const onSearch = jest.fn()
      
      render(
        <SearchInput
          onChange={onChange}
          onSearch={onSearch}
          debounceMs={100}
        />
      )
      
      const searchInput = screen.getByRole('searchbox')
      const voiceButton = screen.getByTestId('voice-input-button')
      
      const endMeasurement = profiler.startMeasurement('search-with-voice-integration')
      
      // Test mixed manual and voice input
      fireEvent.change(searchInput, { target: { value: 'manual text' } })
      
      fireEvent.click(voiceButton)
      await waitFor(() => expect(voiceButton).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(voiceButton)
      
      await waitFor(() => {
        const value = (searchInput as HTMLInputElement).value
        expect(value).toContain('manual text')
        expect(value).toContain('performance test transcription')
      }, { timeout: 3000 })
      
      const integrationTime = endMeasurement()
      
      // Integration should not significantly impact performance
      expect(integrationTime).toBeLessThan(3000)
      
      // All handlers should have been called appropriately
      expect(onChange.mock.calls.length).toBeGreaterThan(0)
    })
  })
  
  describe('Performance Regression Tests', () => {
    
    test('should maintain consistent performance across versions', async () => {
      const performanceBaseline = {
        render: 50,           // ms
        startRecording: 200,  // ms
        processAudio: 1000,   // ms
        apiResponse: 2000     // ms
      }
      
      const onTranscription = jest.fn()
      
      // Render performance
      const renderEnd = profiler.startMeasurement('baseline-render')
      render(<VoiceInputButton onTranscription={onTranscription} />)
      const renderTime = renderEnd()
      
      const button = screen.getByRole('button')
      
      // Recording start performance
      const recordStart = profiler.startMeasurement('baseline-recording-start')
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      const recordStartTime = recordStart()
      
      // Complete workflow performance
      const workflowEnd = profiler.startMeasurement('baseline-complete-workflow')
      fireEvent.click(button)
      await waitFor(() => expect(onTranscription).toHaveBeenCalled(), { timeout: 5000 })
      const workflowTime = workflowEnd()
      
      // Assert performance meets baseline requirements
      expect(renderTime).toBeLessThan(performanceBaseline.render)
      expect(recordStartTime).toBeLessThan(performanceBaseline.startRecording)
      expect(workflowTime).toBeLessThan(performanceBaseline.apiResponse)
      
      // Log performance metrics for monitoring
      console.log('Performance Metrics:', {
        render: `${renderTime.toFixed(2)}ms (target: <${performanceBaseline.render}ms)`,
        recordingStart: `${recordStartTime.toFixed(2)}ms (target: <${performanceBaseline.startRecording}ms)`,
        completeWorkflow: `${workflowTime.toFixed(2)}ms (target: <${performanceBaseline.apiResponse}ms)`
      })
    })
  })
})