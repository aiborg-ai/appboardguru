import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = Boolean(event.ctrlKey) === Boolean(shortcut.ctrlKey);
        const altMatches = Boolean(event.altKey) === Boolean(shortcut.altKey);
        const shiftMatches = Boolean(event.shiftKey) === Boolean(shortcut.shiftKey);
        const metaMatches = Boolean(event.metaKey) === Boolean(shortcut.metaKey);

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Predefined shortcuts
export const KEYBOARD_SHORTCUTS = {
  OPEN_AI_CHAT: { key: 'k', ctrlKey: true, description: 'Open AI Assistant' },
  OPEN_LOGS: { key: 'l', ctrlKey: true, shiftKey: true, description: 'Open System Logs' },
  CLOSE_PANEL: { key: 'Escape', description: 'Close Panel' },
  TOGGLE_PANEL: { key: '/', ctrlKey: true, description: 'Toggle Panel' },
} as const;