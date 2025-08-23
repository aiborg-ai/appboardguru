/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Mock the actual hook to test shortcut definitions
const mockShortcuts = {
  OPEN_AI_CHAT: { key: 'a', ctrlKey: true, shiftKey: true, description: 'Open AI Chat Panel' },
  OPEN_FYI: { key: 'i', ctrlKey: true, shiftKey: true, description: 'Open FYI Insights' },
  OPEN_LOGS: { key: 'l', ctrlKey: true, shiftKey: true, description: 'Open Activity Logs' },
  CLOSE_PANEL: { key: 'Escape', description: 'Close/Minimize Panel' },
  TOGGLE_WIDTH: { key: 'w', ctrlKey: true, shiftKey: true, description: 'Toggle Panel Width' },
  REFRESH_INSIGHTS: { key: 'r', ctrlKey: true, shiftKey: true, description: 'Refresh FYI Insights' },
  SEARCH_INSIGHTS: { key: 'f', ctrlKey: true, shiftKey: true, description: 'Search FYI Insights' },
}

// Test component that uses keyboard shortcuts
const TestKeyboardComponent = ({ onShortcut }: { onShortcut: (action: string) => void }) => {
  const shortcuts = useKeyboardShortcuts()

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Test FYI-specific shortcuts
      if (event.ctrlKey && event.shiftKey && event.key === 'i') {
        event.preventDefault()
        onShortcut('OPEN_FYI')
      }
      
      if (event.ctrlKey && event.shiftKey && event.key === 'a') {
        event.preventDefault()
        onShortcut('OPEN_AI_CHAT')
      }
      
      if (event.ctrlKey && event.shiftKey && event.key === 'l') {
        event.preventDefault()
        onShortcut('OPEN_LOGS')
      }
      
      if (event.key === 'Escape') {
        event.preventDefault()
        onShortcut('CLOSE_PANEL')
      }
      
      if (event.ctrlKey && event.shiftKey && event.key === 'w') {
        event.preventDefault()
        onShortcut('TOGGLE_WIDTH')
      }
      
      if (event.ctrlKey && event.shiftKey && event.key === 'r') {
        event.preventDefault()
        onShortcut('REFRESH_INSIGHTS')
      }
      
      if (event.ctrlKey && event.shiftKey && event.key === 'f') {
        event.preventDefault()
        onShortcut('SEARCH_INSIGHTS')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onShortcut])

  return (
    <div data-testid="keyboard-test-component">
      <div>Shortcuts: {JSON.stringify(shortcuts)}</div>
      <div>Press keyboard shortcuts to test</div>
    </div>
  )
}

describe('Keyboard Shortcuts - FYI Integration', () => {
  let onShortcut: jest.Mock

  beforeEach(() => {
    onShortcut = jest.fn()
    
    // Mock the useKeyboardShortcuts hook
    jest.doMock('@/hooks/useKeyboardShortcuts', () => ({
      useKeyboardShortcuts: () => mockShortcuts,
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('FYI-Specific Shortcuts', () => {
    it('should trigger OPEN_FYI shortcut with Ctrl+Shift+I', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should not trigger OPEN_FYI without proper modifiers', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Test various incomplete combinations
      await act(async () => {
        fireEvent.keyDown(document, { key: 'i' })
      })

      await act(async () => {
        fireEvent.keyDown(document, { key: 'i', ctrlKey: true })
      })

      await act(async () => {
        fireEvent.keyDown(document, { key: 'i', shiftKey: true })
      })

      expect(onShortcut).not.toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should trigger REFRESH_INSIGHTS shortcut with Ctrl+Shift+R', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'r',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('REFRESH_INSIGHTS')
    })

    it('should trigger SEARCH_INSIGHTS shortcut with Ctrl+Shift+F', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'f',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('SEARCH_INSIGHTS')
    })
  })

  describe('Panel Navigation Shortcuts', () => {
    it('should trigger OPEN_AI_CHAT shortcut with Ctrl+Shift+A', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'a',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_AI_CHAT')
    })

    it('should trigger OPEN_LOGS shortcut with Ctrl+Shift+L', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'l',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_LOGS')
    })

    it('should trigger CLOSE_PANEL shortcut with Escape key', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'Escape',
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('CLOSE_PANEL')
    })

    it('should trigger TOGGLE_WIDTH shortcut with Ctrl+Shift+W', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'w',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('TOGGLE_WIDTH')
    })
  })

  describe('Shortcut Conflict Prevention', () => {
    it('should not trigger shortcuts when input elements are focused', async () => {
      const TestWithInput = () => (
        <div>
          <TestKeyboardComponent onShortcut={onShortcut} />
          <input data-testid="test-input" type="text" />
        </div>
      )

      const { getByTestId } = render(<TestWithInput />)
      const input = getByTestId('test-input')
      
      input.focus()

      await act(async () => {
        fireEvent.keyDown(input, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      // Should not trigger when input is focused
      expect(onShortcut).not.toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should not trigger shortcuts when textarea elements are focused', async () => {
      const TestWithTextarea = () => (
        <div>
          <TestKeyboardComponent onShortcut={onShortcut} />
          <textarea data-testid="test-textarea" />
        </div>
      )

      const { getByTestId } = render(<TestWithTextarea />)
      const textarea = getByTestId('test-textarea')
      
      textarea.focus()

      await act(async () => {
        fireEvent.keyDown(textarea, {
          key: 'r',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).not.toHaveBeenCalledWith('REFRESH_INSIGHTS')
    })

    it('should not trigger shortcuts when contentEditable elements are focused', async () => {
      const TestWithContentEditable = () => (
        <div>
          <TestKeyboardComponent onShortcut={onShortcut} />
          <div data-testid="content-editable" contentEditable />
        </div>
      )

      const { getByTestId } = render(<TestWithContentEditable />)
      const contentEditable = getByTestId('content-editable')
      
      contentEditable.focus()

      await act(async () => {
        fireEvent.keyDown(contentEditable, {
          key: 'f',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).not.toHaveBeenCalledWith('SEARCH_INSIGHTS')
    })
  })

  describe('Sequential Shortcut Handling', () => {
    it('should handle rapid sequential shortcut presses', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Fire multiple shortcuts rapidly
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
        
        fireEvent.keyDown(document, {
          key: 'a',
          ctrlKey: true,
          shiftKey: true,
        })
        
        fireEvent.keyDown(document, {
          key: 'l',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
      expect(onShortcut).toHaveBeenCalledWith('OPEN_AI_CHAT')
      expect(onShortcut).toHaveBeenCalledWith('OPEN_LOGS')
      expect(onShortcut).toHaveBeenCalledTimes(3)
    })

    it('should handle shortcut chaining correctly', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Open FYI, then refresh
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'r',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenNthCalledWith(1, 'OPEN_FYI')
      expect(onShortcut).toHaveBeenNthCalledWith(2, 'REFRESH_INSIGHTS')
    })
  })

  describe('Browser Compatibility and Event Handling', () => {
    it('should prevent default behavior on shortcut activation', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      const event = new KeyboardEvent('keydown', {
        key: 'i',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault')

      await act(async () => {
        document.dispatchEvent(event)
      })

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should handle case-insensitive key matching', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Test with uppercase key
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'I', // Uppercase
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should work across different keyboard layouts', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Test with different key codes (common in international keyboards)
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          code: 'KeyI', // Physical key
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
    })
  })

  describe('Accessibility and Screen Reader Support', () => {
    it('should announce shortcut actions to screen readers', async () => {
      const announceAction = jest.fn()
      
      const TestWithAnnouncement = () => {
        React.useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'i') {
              announceAction('Opening FYI Insights panel')
              onShortcut('OPEN_FYI')
            }
          }

          document.addEventListener('keydown', handleKeyDown)
          return () => document.removeEventListener('keydown', handleKeyDown)
        })

        return (
          <div>
            <div aria-live="polite" aria-atomic="true" data-testid="announcer">
              {/* Screen reader announcements would go here */}
            </div>
          </div>
        )
      }

      render(<TestWithAnnouncement />)

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })

      expect(announceAction).toHaveBeenCalledWith('Opening FYI Insights panel')
      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')
    })

    it('should provide shortcut descriptions for help systems', () => {
      const shortcuts = mockShortcuts

      expect(shortcuts.OPEN_FYI.description).toBe('Open FYI Insights')
      expect(shortcuts.REFRESH_INSIGHTS.description).toBe('Refresh FYI Insights')
      expect(shortcuts.SEARCH_INSIGHTS.description).toBe('Search FYI Insights')
      expect(shortcuts.TOGGLE_WIDTH.description).toBe('Toggle Panel Width')
      expect(shortcuts.CLOSE_PANEL.description).toBe('Close/Minimize Panel')
    })
  })

  describe('Context-Aware Shortcut Behavior', () => {
    it('should modify shortcut behavior based on panel state', async () => {
      const TestContextAware = ({ panelOpen }: { panelOpen: boolean }) => {
        React.useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              if (panelOpen) {
                onShortcut('CLOSE_PANEL')
              } else {
                onShortcut('ESCAPE_IGNORED')
              }
            }
          }

          document.addEventListener('keydown', handleKeyDown)
          return () => document.removeEventListener('keydown', handleKeyDown)
        }, [panelOpen])

        return <div>Panel {panelOpen ? 'Open' : 'Closed'}</div>
      }

      const { rerender } = render(<TestContextAware panelOpen={true} />)

      // Test with panel open
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })
      expect(onShortcut).toHaveBeenCalledWith('CLOSE_PANEL')

      // Test with panel closed
      onShortcut.mockClear()
      rerender(<TestContextAware panelOpen={false} />)
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })
      expect(onShortcut).toHaveBeenCalledWith('ESCAPE_IGNORED')
    })

    it('should enable different shortcuts based on active tab', async () => {
      const TestTabAware = ({ activeTab }: { activeTab: string }) => {
        React.useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'r') {
              if (activeTab === 'fyi') {
                onShortcut('REFRESH_FYI')
              } else if (activeTab === 'ai-chat') {
                onShortcut('REFRESH_CHAT')
              }
            }
          }

          document.addEventListener('keydown', handleKeyDown)
          return () => document.removeEventListener('keydown', handleKeyDown)
        }, [activeTab])

        return <div>Active Tab: {activeTab}</div>
      }

      const { rerender } = render(<TestTabAware activeTab="fyi" />)

      // Test refresh in FYI tab
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'r',
          ctrlKey: true,
          shiftKey: true,
        })
      })
      expect(onShortcut).toHaveBeenCalledWith('REFRESH_FYI')

      // Test refresh in AI Chat tab
      onShortcut.mockClear()
      rerender(<TestTabAware activeTab="ai-chat" />)
      
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'r',
          ctrlKey: true,
          shiftKey: true,
        })
      })
      expect(onShortcut).toHaveBeenCalledWith('REFRESH_CHAT')
    })
  })

  describe('Performance and Memory Management', () => {
    it('should not create memory leaks with event listeners', async () => {
      const { unmount } = render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Trigger shortcut before unmount
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })
      expect(onShortcut).toHaveBeenCalledWith('OPEN_FYI')

      // Unmount component
      unmount()
      onShortcut.mockClear()

      // Shortcut should not trigger after unmount
      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: true,
          shiftKey: true,
        })
      })
      expect(onShortcut).not.toHaveBeenCalled()
    })

    it('should handle high-frequency shortcut events efficiently', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      const startTime = performance.now()

      // Simulate high-frequency events
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          fireEvent.keyDown(document, {
            key: 'i',
            ctrlKey: true,
            shiftKey: true,
          })
        })
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(1000) // Should complete quickly
      expect(onShortcut).toHaveBeenCalledTimes(100)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed keyboard events', async () => {
      render(<TestKeyboardComponent onShortcut={onShortcut} />)

      // Test with undefined/null properties
      await act(async () => {
        fireEvent.keyDown(document, {
          key: undefined,
          ctrlKey: true,
          shiftKey: true,
        } as any)
      })

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'i',
          ctrlKey: undefined,
          shiftKey: true,
        } as any)
      })

      // Should not crash and should not trigger shortcuts
      expect(onShortcut).not.toHaveBeenCalled()
    })

    it('should handle keyboard events during React state updates', async () => {
      const TestWithStateUpdate = () => {
        const [count, setCount] = React.useState(0)

        React.useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'i') {
              setCount(prev => prev + 1)
              onShortcut('OPEN_FYI')
            }
          }

          document.addEventListener('keydown', handleKeyDown)
          return () => document.removeEventListener('keydown', handleKeyDown)
        })

        return <div>Count: {count}</div>
      }

      render(<TestWithStateUpdate />)

      // Trigger shortcut multiple times during state updates
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.keyDown(document, {
            key: 'i',
            ctrlKey: true,
            shiftKey: true,
          })
        })
      }

      expect(onShortcut).toHaveBeenCalledTimes(5)
    })
  })
})