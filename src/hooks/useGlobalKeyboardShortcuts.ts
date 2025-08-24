import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIntegrationActions } from '@/lib/stores/integration-store'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  action: () => void
  preventDefault?: boolean
}

export function useGlobalKeyboardShortcuts() {
  const router = useRouter()
  const { addSearchQuery } = useIntegrationActions()

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'h',
      ctrlKey: true,
      description: 'Go to dashboard home',
      action: () => router.push('/dashboard'),
      preventDefault: true
    },
    {
      key: 'o',
      ctrlKey: true,
      description: 'Go to organizations',
      action: () => router.push('/dashboard/organizations'),
      preventDefault: true
    },
    {
      key: 'a',
      ctrlKey: true,
      description: 'Go to assets',
      action: () => router.push('/dashboard/assets'),
      preventDefault: true
    },
    {
      key: 'm',
      ctrlKey: true,
      description: 'Go to meetings',
      action: () => router.push('/dashboard/meetings'),
      preventDefault: true
    },
    {
      key: 'v',
      ctrlKey: true,
      description: 'Go to vaults',
      action: () => router.push('/dashboard/vaults'),
      preventDefault: true
    },
    
    // Search shortcuts
    {
      key: '/',
      ctrlKey: true,
      description: 'Focus global search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      },
      preventDefault: true
    },
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open universal search',
      action: () => router.push('/dashboard/search'),
      preventDefault: true
    },
    
    // Creation shortcuts
    {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      description: 'Create new organization',
      action: () => router.push('/dashboard/organizations/create'),
      preventDefault: true
    },
    {
      key: 'u',
      ctrlKey: true,
      shiftKey: true,
      description: 'Upload asset',
      action: () => router.push('/dashboard/assets'),
      preventDefault: true
    },
    {
      key: 'm',
      ctrlKey: true,
      shiftKey: true,
      description: 'Create new meeting',
      action: () => router.push('/dashboard/meetings/create'),
      preventDefault: true
    },
    {
      key: 'v',
      ctrlKey: true,
      shiftKey: true,
      description: 'Create new vault',
      action: () => router.push('/dashboard/vaults/create'),
      preventDefault: true
    },
    
    // Utility shortcuts
    {
      key: 'b',
      ctrlKey: true,
      description: 'Go back',
      action: () => router.back(),
      preventDefault: true
    },
    {
      key: 'r',
      ctrlKey: true,
      description: 'Refresh current page',
      action: () => window.location.reload(),
      preventDefault: true
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Go to settings',
      action: () => router.push('/dashboard/settings'),
      preventDefault: true
    },
    
    // Workflow shortcuts
    {
      key: 'w',
      ctrlKey: true,
      description: 'Go to workflow',
      action: () => router.push('/dashboard/workflow'),
      preventDefault: true
    },
    
    // Help shortcut
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts',
      action: () => {
        // This would open a modal with all shortcuts
        console.log('Show keyboard shortcuts modal')
      },
      preventDefault: true
    }
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.metaKey === event.metaKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
        )
      })

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault) {
          event.preventDefault()
        }
        matchingShortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [router])

  // Return shortcuts for help display
  return shortcuts
}

// Hook to show/hide keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const shortcuts = useGlobalKeyboardShortcuts()
  
  const groupedShortcuts = {
    Navigation: shortcuts.filter(s => 
      ['h', 'o', 'a', 'm', 'v', 'b', 'r', 's', 'w'].includes(s.key) && 
      !s.shiftKey
    ),
    Search: shortcuts.filter(s => 
      ['/', 'k'].includes(s.key)
    ),
    Creation: shortcuts.filter(s => 
      s.shiftKey && s.ctrlKey
    ),
    Help: shortcuts.filter(s => 
      s.key === '?'
    )
  }

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts = []
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.metaKey) parts.push('⌘')
    if (shortcut.shiftKey) parts.push('Shift')
    if (shortcut.altKey) parts.push('Alt')
    parts.push(shortcut.key.toUpperCase())
    return parts.join(' + ')
  }

  return {
    shortcuts: groupedShortcuts,
    formatShortcut
  }
}