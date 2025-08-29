'use client'

import { ReactNode } from 'react'
import { DemoProvider } from '@/contexts/DemoContext'
import { TooltipProvider } from '@/components/atoms/feedback/tooltip'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <DemoProvider>
        {children}
      </DemoProvider>
    </TooltipProvider>
  )
}