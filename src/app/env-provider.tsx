'use client'

import Script from 'next/script'

export function EnvProvider() {
  // Inject environment variables into window object for client-side access
  const envScript = `
    window.__ENV = {
      NEXT_PUBLIC_SUPABASE_URL: "${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}",
      NEXT_PUBLIC_ANALYTICS_ENDPOINT: "${process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || ''}",
      NEXT_PUBLIC_APP_URL: "${process.env.NEXT_PUBLIC_APP_URL || ''}",
      NODE_ENV: "${process.env.NODE_ENV || 'production'}"
    };
  `.trim();

  return (
    <Script
      id="env-vars"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: envScript }}
    />
  )
}