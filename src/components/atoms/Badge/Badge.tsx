import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-500/80",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
        outline: "text-foreground border-border",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  closable?: boolean
  onClose?: () => void
  pulse?: boolean
}

const Badge = React.memo(React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size,
    leftIcon,
    rightIcon,
    closable,
    onClose,
    pulse = false,
    children,
    ...props 
  }, ref) => {
    const handleClose = React.useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      onClose?.()
    }, [onClose])

    return (
      <div 
        className={cn(
          badgeVariants({ variant, size }), 
          pulse && "animate-pulse",
          className
        )} 
        ref={ref} 
        {...props}
      >
        {leftIcon && (
          <span className="mr-1 flex-shrink-0">
            {leftIcon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {rightIcon && (
          <span className="ml-1 flex-shrink-0">
            {rightIcon}
          </span>
        )}
        {closable && (
          <button
            type="button"
            className="ml-1 flex-shrink-0 hover:opacity-70"
            onClick={handleClose}
            aria-label="Remove"
          >
            <svg
              className="h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
))
Badge.displayName = "Badge"

export { Badge, badgeVariants }