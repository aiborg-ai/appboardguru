'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
      </body>
    </html>
  )
}