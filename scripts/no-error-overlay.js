// Disable Next.js error overlay completely
if (typeof window !== 'undefined') {
  // Prevent error overlay from showing
  window.__NEXT_DATA__ = window.__NEXT_DATA__ || {}
  
  // Override error handling
  const originalError = console.error
  console.error = (...args) => {
    // Filter out Next.js overlay errors
    const message = args[0]
    if (typeof message === 'string' && (
      message.includes('Warning:') ||
      message.includes('The above error occurred') ||
      message.includes('React will try to recreate') ||
      message.includes('Consider adding an error boundary')
    )) {
      return
    }
    originalError(...args)
  }
  
  // Disable React DevTools overlay
  if (typeof window !== 'undefined' && window.React) {
    window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
      ...window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
      ReactCurrentDispatcher: null,
      ReactCurrentBatchConfig: null,
      ReactCurrentOwner: null
    }
  }
}