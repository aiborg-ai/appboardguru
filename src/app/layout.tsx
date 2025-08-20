import './globals.css'
import './disable-overlays.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'BoardGuru - Enterprise Board Management Platform',
  description: 'Secure, AI-powered board pack management with intelligent summarization and analysis for modern board directors.',
  keywords: ['board management', 'board packs', 'enterprise', 'AI summarization', 'secure documents'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Disable Next.js error overlays
                if (typeof window !== 'undefined') {
                  const removeOverlay = () => {
                    const overlay = document.querySelector('nextjs-portal');
                    if (overlay) overlay.remove();
                    
                    const errorOverlays = document.querySelectorAll('[data-nextjs-dialog-overlay]');
                    errorOverlays.forEach(el => el.remove());
                    
                    const errorDialogs = document.querySelectorAll('[data-nextjs-dialog]');
                    errorDialogs.forEach(el => el.remove());
                  };
                  
                  // Override console.error to suppress React warnings
                  const originalError = console.error;
                  console.error = function(...args) {
                    const message = args[0];
                    if (typeof message === 'string' && (
                      message.includes('Warning:') ||
                      message.includes('React will try to recreate') ||
                      message.includes('The above error occurred') ||
                      message.includes('Consider adding an error boundary')
                    )) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                  
                  // Remove overlays on load and periodically
                  window.addEventListener('load', removeOverlay);
                  setInterval(removeOverlay, 500);
                }
              `
            }}
          />
        )}
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}