'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Suppress error overlays in development
    if (typeof window !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = `
        [data-nextjs-error-overlay] {
          display: none !important;
        }
        #webpack-dev-server-client-overlay {
          display: none !important;
        }
        [data-nextjs-dialog-overlay] {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // In development/demo mode, just show a minimal error without overlay
  return (
    <html>
      <body>
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'system-ui',
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div>
            <h2 style={{ color: '#374151', marginBottom: '16px' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Please refresh the page to continue.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide Next.js error overlays
              if (typeof window !== 'undefined') {
                const hideOverlays = () => {
                  const overlays = document.querySelectorAll('[data-nextjs-error-overlay], #webpack-dev-server-client-overlay, [data-nextjs-dialog-overlay]');
                  overlays.forEach(overlay => overlay.remove());
                };
                
                // Run immediately and on DOM changes
                hideOverlays();
                const observer = new MutationObserver(hideOverlays);
                observer.observe(document.body, { childList: true, subtree: true });
              }
            `
          }}
        />
      </body>
    </html>
  )
}