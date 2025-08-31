import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-white",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-px hover:shadow-md active:bg-primary-800 active:translate-y-0",
        primary: "bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-px hover:shadow-md active:bg-primary-800 active:translate-y-0",
        destructive:
          "bg-error-500 text-white hover:bg-error-600 hover:-translate-y-px hover:shadow-md active:bg-error-700 active:translate-y-0",
        outline:
          "border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 hover:-translate-y-px hover:shadow-sm",
        secondary:
          "bg-secondary-100 text-secondary-900 hover:bg-secondary-200 hover:-translate-y-px hover:shadow-md active:bg-secondary-300 active:translate-y-0",
        ghost: "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700",
        success: "bg-success-500 text-white hover:bg-success-600 hover:-translate-y-px hover:shadow-md active:bg-success-700 active:translate-y-0",
        warning: "bg-warning-500 text-white hover:bg-warning-600 hover:-translate-y-px hover:shadow-md active:bg-warning-700 active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  variant?: "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "warning"
  size?: "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg"
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    loadingText = "Loading...",
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Show loading state
    if (loading) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={true}
          {...props}
        >
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {loadingText || children}
        </Comp>
      )
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }