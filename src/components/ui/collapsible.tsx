'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  asChild?: boolean
}

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

// Context to share state between Collapsible components
const CollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {}
})

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open = false, onOpenChange, children, className, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(open)
    
    // Use controlled state if provided, otherwise use internal state
    const isOpen = onOpenChange ? open : internalOpen
    const setOpen = onOpenChange || setInternalOpen

    const contextValue = React.useMemo(() => ({
      open: isOpen,
      onOpenChange: setOpen
    }), [isOpen, setOpen])

    React.useEffect(() => {
      if (open !== undefined && open !== internalOpen) {
        setInternalOpen(open)
      }
    }, [open, internalOpen])

    return (
      <CollapsibleContext.Provider value={contextValue}>
        <div ref={ref} className={cn('', className)} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = 'Collapsible'

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, asChild, className, onClick, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(CollapsibleContext)
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpenChange(!open)
      onClick?.(event)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        ref,
        onClick: handleClick,
        'aria-expanded': open,
        'data-state': open ? 'open' : 'closed'
      } as any)
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        className={cn('', className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = 'CollapsibleTrigger'

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, style, ...props }, ref) => {
    const { open } = React.useContext(CollapsibleContext)
    const [height, setHeight] = React.useState(0)
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      if (contentRef.current) {
        if (open) {
          const scrollHeight = contentRef.current.scrollHeight
          setHeight(scrollHeight)
        } else {
          setHeight(0)
        }
      }
    }, [open, children])

    if (!open) {
      return null
    }

    return (
      <div
        ref={ref}
        data-state={open ? 'open' : 'closed'}
        className={cn('overflow-hidden transition-all duration-200', className)}
        style={{
          ...style,
        }}
        {...props}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    )
  }
)
CollapsibleContent.displayName = 'CollapsibleContent'

export { Collapsible, CollapsibleTrigger, CollapsibleContent }