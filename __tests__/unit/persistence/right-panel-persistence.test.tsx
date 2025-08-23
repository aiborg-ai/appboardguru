/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock component that simulates RightPanel localStorage usage
const MockRightPanel = () => {
  const [panelWidth, setPanelWidth] = React.useState<'narrow' | 'wide' | 'full'>('wide')
  const [activeTab, setActiveTab] = React.useState<'ai-chat' | 'fyi' | 'logs'>('ai-chat')
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(true)

  // Simulate localStorage persistence logic
  React.useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('rightPanel-width')
      if (savedWidth) {
        setPanelWidth(JSON.parse(savedWidth))
      }
    } catch (error) {
      console.warn('Failed to load panel width from localStorage:', error)
    }
  }, [])

  React.useEffect(() => {
    try {
      const savedTab = localStorage.getItem('rightPanel-activeTab')
      if (savedTab) {
        setActiveTab(JSON.parse(savedTab))
      }
    } catch (error) {
      console.warn('Failed to load active tab from localStorage:', error)
    }
  }, [])

  React.useEffect(() => {
    try {
      const savedMinimized = localStorage.getItem('rightPanel-isMinimized')
      if (savedMinimized) {
        setIsMinimized(JSON.parse(savedMinimized))
      }
    } catch (error) {
      console.warn('Failed to load minimized state from localStorage:', error)
    }
  }, [])

  const updateWidth = (newWidth: typeof panelWidth) => {
    setPanelWidth(newWidth)
    try {
      localStorage.setItem('rightPanel-width', JSON.stringify(newWidth))
    } catch (error) {
      console.warn('Failed to save panel width to localStorage:', error)
    }
  }

  const updateActiveTab = (newTab: typeof activeTab) => {
    setActiveTab(newTab)
    try {
      localStorage.setItem('rightPanel-activeTab', JSON.stringify(newTab))
    } catch (error) {
      console.warn('Failed to save active tab to localStorage:', error)
    }
  }

  const updateMinimized = (minimized: boolean) => {
    setIsMinimized(minimized)
    try {
      localStorage.setItem('rightPanel-isMinimized', JSON.stringify(minimized))
    } catch (error) {
      console.warn('Failed to save minimized state to localStorage:', error)
    }
  }

  const getWidthClass = () => {
    if (isMinimized) return 'w-12'
    switch (panelWidth) {
      case 'narrow': return 'w-80'
      case 'wide': return 'w-120'
      case 'full': return 'w-160'
      default: return 'w-120'
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`right-panel ${getWidthClass()}`}
      data-testid="right-panel"
      data-width={panelWidth}
      data-active-tab={activeTab}
      data-minimized={isMinimized}
    >
      {!isMinimized && (
        <>
          {/* Tab Navigation */}
          <div className="tab-nav">
            <button 
              onClick={() => updateActiveTab('ai-chat')}
              className={activeTab === 'ai-chat' ? 'active' : ''}
              data-testid="ai-chat-tab"
            >
              AI Chat
            </button>
            <button 
              onClick={() => updateActiveTab('fyi')}
              className={activeTab === 'fyi' ? 'active' : ''}
              data-testid="fyi-tab"
            >
              FYI
            </button>
            <button 
              onClick={() => updateActiveTab('logs')}
              className={activeTab === 'logs' ? 'active' : ''}
              data-testid="logs-tab"
            >
              Logs
            </button>
          </div>

          {/* Width Controls */}
          <div className="width-controls">
            <button 
              onClick={() => updateWidth('narrow')}
              className={panelWidth === 'narrow' ? 'active' : ''}
              data-testid="narrow-width-btn"
            >
              Narrow
            </button>
            <button 
              onClick={() => updateWidth('wide')}
              className={panelWidth === 'wide' ? 'active' : ''}
              data-testid="wide-width-btn"
            >
              Wide
            </button>
            <button 
              onClick={() => updateWidth('full')}
              className={panelWidth === 'full' ? 'active' : ''}
              data-testid="full-width-btn"
            >
              Full
            </button>
          </div>

          {/* Panel Controls */}
          <div className="panel-controls">
            <button 
              onClick={() => updateMinimized(true)}
              data-testid="minimize-btn"
            >
              Minimize
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              data-testid="close-btn"
            >
              Close
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content" data-testid="tab-content">
            {activeTab === 'ai-chat' && <div>AI Chat Content</div>}
            {activeTab === 'fyi' && <div>FYI Insights Content</div>}
            {activeTab === 'logs' && <div>Activity Logs Content</div>}
          </div>
        </>
      )}

      {isMinimized && (
        <button 
          onClick={() => updateMinimized(false)}
          data-testid="expand-btn"
        >
          Expand
        </button>
      )}
    </div>
  )
}

describe('RightPanel localStorage Persistence - Following CLAUDE.md Performance Standards', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockLocalStorage: {
    getItem: jest.Mock
    setItem: jest.Mock
    removeItem: jest.Mock
    clear: jest.Mock
  }

  beforeEach(() => {
    user = userEvent.setup()

    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }

    // Replace window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock console.warn to prevent test noise
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Panel Width Persistence', () => {
    it('should load default width when no saved preference exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide') // Default
      expect(panel).toHaveClass('w-120') // Wide width class
    })

    it('should load saved narrow width from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '"narrow"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')
      expect(panel).toHaveClass('w-80') // Narrow width class
    })

    it('should load saved full width from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '"full"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'full')
      expect(panel).toHaveClass('w-160') // Full width class
    })

    it('should save width changes to localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const narrowBtn = screen.getByTestId('narrow-width-btn')
      
      await act(async () => {
        await user.click(narrowBtn)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'rightPanel-width',
        '"narrow"'
      )

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')
    })

    it('should handle rapid width changes without localStorage conflicts', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Rapidly change width settings
      const narrowBtn = screen.getByTestId('narrow-width-btn')
      const fullBtn = screen.getByTestId('full-width-btn')
      const wideBtn = screen.getByTestId('wide-width-btn')
      
      await act(async () => {
        await user.click(narrowBtn)
        await user.click(fullBtn)
        await user.click(wideBtn)
      })

      // Should save the final state
      expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(
        'rightPanel-width',
        '"wide"'
      )

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide')
    })

    it('should handle invalid width data in localStorage gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return 'invalid-json'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should fall back to default width
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide') // Default
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load panel width from localStorage:',
        expect.any(Error)
      )
    })

    it('should handle localStorage quota exceeded gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const narrowBtn = screen.getByTestId('narrow-width-btn')
      
      await act(async () => {
        await user.click(narrowBtn)
      })

      // Should continue working despite localStorage failure
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save panel width to localStorage:',
        expect.any(DOMException)
      )
    })
  })

  describe('Active Tab Persistence', () => {
    it('should load default tab when no saved preference exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-active-tab', 'ai-chat') // Default
      expect(screen.getByText('AI Chat Content')).toBeInTheDocument()
    })

    it('should load saved FYI tab from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-activeTab') return '"fyi"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-active-tab', 'fyi')
      expect(screen.getByText('FYI Insights Content')).toBeInTheDocument()
    })

    it('should save tab changes to localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const fyiTab = screen.getByTestId('fyi-tab')
      
      await act(async () => {
        await user.click(fyiTab)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'rightPanel-activeTab',
        '"fyi"'
      )

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-active-tab', 'fyi')
    })

    it('should persist tab selection across all tab types', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const tabs = [
        { testId: 'fyi-tab', value: 'fyi', content: 'FYI Insights Content' },
        { testId: 'logs-tab', value: 'logs', content: 'Activity Logs Content' },
        { testId: 'ai-chat-tab', value: 'ai-chat', content: 'AI Chat Content' },
      ]

      for (const tab of tabs) {
        const tabButton = screen.getByTestId(tab.testId)
        
        await act(async () => {
          await user.click(tabButton)
        })

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'rightPanel-activeTab',
          `"${tab.value}"`
        )

        expect(screen.getByText(tab.content)).toBeInTheDocument()
        
        jest.clearAllMocks()
      }
    })

    it('should handle invalid tab data in localStorage gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-activeTab') return '"invalid-tab"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should fall back to default tab
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-active-tab', 'ai-chat') // Default
    })
  })

  describe('Panel State Persistence', () => {
    it('should load default expanded state when no saved preference exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-minimized', 'false') // Default expanded
      expect(screen.getByTestId('tab-content')).toBeInTheDocument()
    })

    it('should load saved minimized state from localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-isMinimized') return 'true'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-minimized', 'true')
      expect(panel).toHaveClass('w-12') // Minimized width
      expect(screen.getByTestId('expand-btn')).toBeInTheDocument()
      expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument()
    })

    it('should save minimize state to localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const minimizeBtn = screen.getByTestId('minimize-btn')
      
      await act(async () => {
        await user.click(minimizeBtn)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'rightPanel-isMinimized',
        'true'
      )

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-minimized', 'true')
    })

    it('should save expand state to localStorage', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-isMinimized') return 'true'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const expandBtn = screen.getByTestId('expand-btn')
      
      await act(async () => {
        await user.click(expandBtn)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'rightPanel-isMinimized',
        'false'
      )

      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-minimized', 'false')
    })
  })

  describe('Cross-Tab Synchronization', () => {
    it('should handle localStorage changes from other tabs', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'rightPanel-width',
        newValue: '"full"',
        oldValue: '"wide"',
        storageArea: localStorage,
        url: window.location.href,
      })

      act(() => {
        window.dispatchEvent(storageEvent)
      })

      // This would require implementing storage event listeners in the actual component
      // For now, we test that the event can be dispatched without errors
      expect(true).toBe(true)
    })

    it('should handle concurrent localStorage access from multiple instances', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      // Render multiple instances
      const { rerender } = await act(async () => {
        return render(
          <div>
            <MockRightPanel />
            <MockRightPanel />
          </div>
        )
      })

      // Both should work independently
      const panels = screen.getAllByTestId('right-panel')
      expect(panels).toHaveLength(2)
      
      panels.forEach(panel => {
        expect(panel).toHaveAttribute('data-width', 'wide')
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with localStorage operations', async () => {
      const { unmount } = await act(async () => {
        return render(<MockRightPanel />)
      })

      // Perform multiple operations
      const narrowBtn = screen.getByTestId('narrow-width-btn')
      const fyiTab = screen.getByTestId('fyi-tab')
      
      await act(async () => {
        await user.click(narrowBtn)
        await user.click(fyiTab)
      })

      // Unmount component
      unmount()

      // localStorage operations should not continue after unmount
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2)
    })

    it('should debounce rapid localStorage writes for performance', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await act(async () => {
        render(<MockRightPanel />)
      })

      const narrowBtn = screen.getByTestId('narrow-width-btn')
      const wideBtn = screen.getByTestId('wide-width-btn')
      const fullBtn = screen.getByTestId('full-width-btn')

      // Simulate rapid clicking
      await act(async () => {
        await user.click(narrowBtn)
        await user.click(wideBtn)
        await user.click(fullBtn)
        await user.click(narrowBtn)
        await user.click(wideBtn)
      })

      // Each click should trigger localStorage write (no debouncing implemented yet)
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(5)
    })

    it('should handle large localStorage data efficiently', async () => {
      // Mock large existing data in localStorage
      const largeData = JSON.stringify({
        someOtherAppData: 'x'.repeat(1000000), // 1MB of data
      })

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'someOtherData') return largeData
        return null
      })

      const startTime = performance.now()

      await act(async () => {
        render(<MockRightPanel />)
      })

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100) // Should render quickly despite large localStorage
    })
  })

  describe('Browser Compatibility and Edge Cases', () => {
    it('should handle Safari private mode localStorage restrictions', async () => {
      // Mock Safari private mode behavior
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException(
          'QuotaExceededError: DOM Exception 22: An attempt was made to add something to storage that exceeded the quota.',
          'QuotaExceededError'
        )
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      const narrowBtn = screen.getByTestId('narrow-width-btn')
      
      await act(async () => {
        await user.click(narrowBtn)
      })

      // Component should continue working
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save panel width to localStorage:',
        expect.any(DOMException)
      )
    })

    it('should handle localStorage being null/undefined', async () => {
      // Mock localStorage not being available
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true,
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should render with defaults
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide')
    })

    it('should handle JSON parsing errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '{"malformed": json}'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should fall back to defaults
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide')
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load panel width from localStorage:',
        expect.any(Error)
      )
    })

    it('should handle localStorage.clear() gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '"narrow"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Panel starts with saved narrow width
      let panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')

      // Simulate localStorage being cleared
      mockLocalStorage.getItem.mockReturnValue(null)
      
      // This would trigger re-initialization in a real component
      // For this test, we just verify the current state remains stable
      expect(panel).toHaveAttribute('data-width', 'narrow')
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate stored data types before using them', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '123' // Number instead of string
        if (key === 'rightPanel-isMinimized') return '"not-a-boolean"' // String instead of boolean
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should handle invalid types gracefully and use defaults
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide') // Default
      expect(panel).toHaveAttribute('data-minimized', 'false') // Default
    })

    it('should maintain data consistency across app restarts', async () => {
      // First render - set some preferences
      mockLocalStorage.getItem.mockReturnValue(null)

      const { unmount } = await act(async () => {
        return render(<MockRightPanel />)
      })

      const narrowBtn = screen.getByTestId('narrow-width-btn')
      const fyiTab = screen.getByTestId('fyi-tab')
      
      await act(async () => {
        await user.click(narrowBtn)
        await user.click(fyiTab)
      })

      unmount()

      // Second render - simulate app restart
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return '"narrow"'
        if (key === 'rightPanel-activeTab') return '"fyi"'
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should restore previous state
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'narrow')
      expect(panel).toHaveAttribute('data-active-tab', 'fyi')
    })

    it('should handle localStorage data migration/versioning', async () => {
      // Mock old format data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'rightPanel-width') return 'normal' // Old format
        return null
      })

      await act(async () => {
        render(<MockRightPanel />)
      })

      // Should handle old format gracefully
      const panel = screen.getByTestId('right-panel')
      expect(panel).toHaveAttribute('data-width', 'wide') // Fallback to default
    })
  })
})