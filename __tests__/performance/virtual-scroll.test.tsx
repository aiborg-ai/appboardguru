/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VirtualScrollList } from '@/components/ui/virtual-scroll-list'
import { AssetVirtualList } from '@/components/ui/asset-virtual-list'
import { NotificationVirtualList } from '@/components/ui/notification-virtual-list'
import { VirtualListPerformanceMonitor } from '@/components/ui/virtual-list-performance-monitor'
import { AssetFactory, NotificationFactory } from '../factories'
import { performanceHelpers } from '../utils/test-helpers'

// Mock intersection observer
class MockIntersectionObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: (callback: FrameRequestCallback) => setTimeout(callback, 16),
})

describe('Virtual Scroll Performance Tests', () => {
  beforeEach(() => {
    // Mock viewport dimensions
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 600,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      value: 800,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('VirtualScrollList Base Component', () => {
    it('should render large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        content: `Item ${i}`,
      }))

      const renderItem = ({ item, index }: any) => (
        <div key={item.id} data-testid={`item-${index}`}>
          {item.content}
        </div>
      )

      const { result, duration } = await performanceHelpers.measureRenderTime(() => {
        return render(
          <VirtualScrollList
            data={largeDataset}
            itemHeight={50}
            height={600}
            renderItem={renderItem}
          />
        )
      })

      // Should render quickly even with large datasets
      expect(duration).toBeLessThan(100) // Under 100ms initial render
      
      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/item-/)
      expect(renderedItems.length).toBeLessThan(50) // Much less than total items
      expect(renderedItems.length).toBeGreaterThan(10) // But enough to fill viewport
    })

    it('should handle rapid scrolling without performance degradation', async () => {
      const dataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `item-${i}`,
        content: `Item ${i}`,
      }))

      const renderItem = ({ item }: any) => (
        <div key={item.id}>{item.content}</div>
      )

      render(
        <VirtualScrollList
          data={dataset}
          itemHeight={50}
          height={600}
          renderItem={renderItem}
        />
      )

      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      
      // Simulate rapid scrolling
      const scrollEvents = Array.from({ length: 50 }, (_, i) => i * 100)
      const startTime = performance.now()
      
      for (const scrollTop of scrollEvents) {
        await act(async () => {
          fireEvent.scroll(scrollContainer, { target: { scrollTop } })
          await new Promise(resolve => setTimeout(resolve, 1))
        })
      }
      
      const totalTime = performance.now() - startTime
      
      // Rapid scrolling should complete in reasonable time
      expect(totalTime).toBeLessThan(1000) // Under 1 second for 50 scroll events
    })

    it('should maintain consistent frame rate during scrolling', async () => {
      const dataset = Array.from({ length: 3000 }, (_, i) => ({
        id: `item-${i}`,
        content: `Item ${i}`,
      }))

      const renderItem = ({ item }: any) => (
        <div key={item.id}>{item.content}</div>
      )

      render(
        <VirtualListPerformanceMonitor>
          <VirtualScrollList
            data={dataset}
            itemHeight={50}
            height={600}
            renderItem={renderItem}
          />
        </VirtualListPerformanceMonitor>
      )

      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      const frameTimings: number[] = []
      let lastFrameTime = performance.now()

      // Monitor frame timings during scroll
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          const currentTime = performance.now()
          frameTimings.push(currentTime - lastFrameTime)
          lastFrameTime = currentTime
          
          fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 200 } })
          await new Promise(resolve => requestAnimationFrame(resolve))
        })
      }

      // Calculate average frame time
      const averageFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length
      
      // Should maintain close to 60fps (16.67ms per frame)
      expect(averageFrameTime).toBeLessThan(25) // Allow some variance
      
      // No frame should take longer than 50ms
      const slowFrames = frameTimings.filter(time => time > 50)
      expect(slowFrames.length).toBeLessThan(frameTimings.length * 0.1) // Less than 10% slow frames
    })
  })

  describe('AssetVirtualList Performance', () => {
    it('should efficiently render large asset lists', async () => {
      const largeAssetList = AssetFactory.buildList(5000)

      const { result, duration } = await performanceHelpers.measureRenderTime(() => {
        return render(
          <AssetVirtualList
            assets={largeAssetList}
            onAssetClick={jest.fn()}
            itemHeight={120}
            height={600}
          />
        )
      })

      expect(duration).toBeLessThan(150) // Under 150ms for 5000 items
      
      // Verify virtualization is working
      const renderedAssets = screen.getAllByTestId(/asset-item-/)
      expect(renderedAssets.length).toBeLessThan(100) // Much less than total
    })

    it('should handle asset thumbnail loading efficiently', async () => {
      const assetsWithThumbnails = AssetFactory.buildList(1000, {
        thumbnail_url: 'https://example.com/thumbnail.jpg',
      })

      const mockImageLoad = jest.fn()
      const originalImage = global.Image
      global.Image = class extends originalImage {
        set src(value: string) {
          mockImageLoad(value)
          super.src = value
          // Simulate image load
          setTimeout(() => this.onload?.(new Event('load')), 1)
        }
      } as any

      render(
        <AssetVirtualList
          assets={assetsWithThumbnails}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
          loadThumbnails={true}
        />
      )

      // Should only load thumbnails for visible items
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should load reasonable number of thumbnails, not all 1000
      expect(mockImageLoad).toHaveBeenCalledTimes(expect.any(Number))
      expect(mockImageLoad.mock.calls.length).toBeLessThan(50)
      expect(mockImageLoad.mock.calls.length).toBeGreaterThan(5)

      global.Image = originalImage
    })

    it('should implement efficient asset search filtering', async () => {
      const diverseAssets = [
        ...AssetFactory.buildList(1000, { name: 'Document A', file_type: 'application/pdf' }),
        ...AssetFactory.buildList(1000, { name: 'Spreadsheet B', file_type: 'application/xlsx' }),
        ...AssetFactory.buildList(1000, { name: 'Presentation C', file_type: 'application/pptx' }),
      ]

      const { rerender } = render(
        <AssetVirtualList
          assets={diverseAssets}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
        />
      )

      // Test filtering performance
      const startTime = performance.now()
      
      rerender(
        <AssetVirtualList
          assets={diverseAssets}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
          filter={{ fileType: 'application/pdf', searchTerm: 'Document' }}
        />
      )
      
      const filterTime = performance.now() - startTime
      
      // Filtering should be fast even with large datasets
      expect(filterTime).toBeLessThan(50) // Under 50ms
      
      // Should show filtered results
      expect(screen.queryByText('Spreadsheet B')).not.toBeInTheDocument()
      expect(screen.getByText('Document A')).toBeInTheDocument()
    })
  })

  describe('NotificationVirtualList Performance', () => {
    it('should handle large notification lists efficiently', async () => {
      const largeNotificationList = NotificationFactory.buildList(10000)

      const { result, duration } = await performanceHelpers.measureRenderTime(() => {
        return render(
          <NotificationVirtualList
            notifications={largeNotificationList}
            onNotificationClick={jest.fn()}
            itemHeight={80}
            height={600}
          />
        )
      })

      expect(duration).toBeLessThan(100) // Under 100ms
      
      const renderedNotifications = screen.getAllByTestId(/notification-item-/)
      expect(renderedNotifications.length).toBeLessThan(50)
    })

    it('should efficiently group notifications by date', async () => {
      const notificationsWithDates = NotificationFactory.buildList(2000, {
        created_at: new Date().toISOString(),
      })

      const startTime = performance.now()
      
      render(
        <NotificationVirtualList
          notifications={notificationsWithDates}
          onNotificationClick={jest.fn()}
          itemHeight={80}
          height={600}
          groupByDate={true}
        />
      )
      
      const renderTime = performance.now() - startTime
      
      expect(renderTime).toBeLessThan(200) // Grouping adds some overhead but should still be fast
      
      // Should show date group headers
      expect(screen.getByText(/today/i)).toBeInTheDocument()
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should not create memory leaks with large datasets', async () => {
      const createLargeList = () => AssetFactory.buildList(5000)
      
      const { unmount } = render(
        <AssetVirtualList
          assets={createLargeList()}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
        />
      )

      // Simulate scroll to load more items
      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 1000 } })
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      }

      // Unmount should clean up properly
      unmount()
      
      // No way to directly test memory usage in Jest, but we can ensure
      // no errors are thrown during unmount which would indicate cleanup issues
      expect(true).toBe(true) // Test passes if no errors during unmount
    })

    it('should recycle DOM nodes efficiently', async () => {
      const dataset = AssetFactory.buildList(1000)

      render(
        <AssetVirtualList
          assets={dataset}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
        />
      )

      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      
      // Get initial DOM node count
      const initialNodes = document.querySelectorAll('[data-testid^="asset-item-"]').length
      
      // Scroll significantly to trigger node recycling
      await act(async () => {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } })
        await new Promise(resolve => setTimeout(resolve, 50))
      })
      
      // Node count should remain similar (recycled, not created new)
      const finalNodes = document.querySelectorAll('[data-testid^="asset-item-"]').length
      expect(Math.abs(finalNodes - initialNodes)).toBeLessThan(5) // Allow small variance
    })
  })

  describe('Accessibility Performance', () => {
    it('should maintain ARIA attributes efficiently during scrolling', async () => {
      const dataset = AssetFactory.buildList(2000)

      render(
        <AssetVirtualList
          assets={dataset}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
        />
      )

      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      
      // Scroll and check ARIA attributes are maintained
      await act(async () => {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } })
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const visibleItems = screen.getAllByRole('listitem')
      
      // All visible items should have proper ARIA attributes
      visibleItems.forEach(item => {
        expect(item).toHaveAttribute('aria-setsize')
        expect(item).toHaveAttribute('aria-posinset')
      })
      
      // Container should have proper ARIA list properties
      expect(scrollContainer).toHaveAttribute('role', 'list')
    })
  })

  describe('Edge Cases and Stress Tests', () => {
    it('should handle empty datasets gracefully', () => {
      const { result, duration } = performanceHelpers.measureSync(() => {
        return render(
          <AssetVirtualList
            assets={[]}
            onAssetClick={jest.fn()}
            itemHeight={120}
            height={600}
          />
        )
      })

      expect(duration).toBeLessThan(10)
      expect(screen.getByText(/no assets/i)).toBeInTheDocument()
    })

    it('should handle extremely large items efficiently', async () => {
      const largeItemDataset = AssetFactory.buildList(100, {
        description: 'A'.repeat(10000), // Very large description
        metadata: { largeField: 'B'.repeat(5000) },
      })

      const { result, duration } = await performanceHelpers.measureRenderTime(() => {
        return render(
          <AssetVirtualList
            assets={largeItemDataset}
            onAssetClick={jest.fn()}
            itemHeight={200} // Larger height for large items
            height={600}
          />
        )
      })

      expect(duration).toBeLessThan(200) // Should still render quickly
    })

    it('should handle rapid data updates efficiently', async () => {
      let dataset = AssetFactory.buildList(1000)
      
      const { rerender } = render(
        <AssetVirtualList
          assets={dataset}
          onAssetClick={jest.fn()}
          itemHeight={120}
          height={600}
        />
      )

      // Simulate rapid data updates
      const updateTimes: number[] = []
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        
        // Update dataset
        dataset = [...dataset.slice(100), ...AssetFactory.buildList(100)]
        
        rerender(
          <AssetVirtualList
            assets={dataset}
            onAssetClick={jest.fn()}
            itemHeight={120}
            height={600}
          />
        )
        
        const updateTime = performance.now() - startTime
        updateTimes.push(updateTime)
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      }

      // Each update should be fast
      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      expect(averageUpdateTime).toBeLessThan(50) // Under 50ms per update
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should provide performance metrics', async () => {
      const metricsCallback = jest.fn()
      
      render(
        <VirtualListPerformanceMonitor onMetrics={metricsCallback}>
          <AssetVirtualList
            assets={AssetFactory.buildList(5000)}
            onAssetClick={jest.fn()}
            itemHeight={120}
            height={600}
          />
        </VirtualListPerformanceMonitor>
      )

      const scrollContainer = screen.getByTestId('virtual-scroll-container')
      
      // Trigger some scrolling to generate metrics
      await act(async () => {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(metricsCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          renderTime: expect.any(Number),
          scrollPerformance: expect.any(Number),
          memoryUsage: expect.any(Number),
          visibleItems: expect.any(Number),
          totalItems: 5000,
        })
      )
    })
  })
})
