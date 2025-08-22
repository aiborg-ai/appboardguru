import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
      },
      variant: {
        default: "",
        bordered: "border-2 border-border",
        ring: "ring-2 ring-ring ring-offset-2",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const avatarImageVariants = cva("aspect-square h-full w-full object-cover")

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  loading?: "eager" | "lazy"
  onError?: () => void
}

const Avatar = React.memo(React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ 
  className, 
  size, 
  variant,
  src, 
  alt, 
  fallback, 
  loading = "lazy",
  onError,
  ...props 
}, ref) => {
  const initials = React.useMemo(() => {
    if (fallback) return fallback
    if (alt) {
      return alt
        .split(' ')
        .slice(0, 2)
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
    }
    return 'U'
  }, [fallback, alt])

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, variant }), className)}
      {...props}
    >
      <AvatarImage 
        src={src} 
        alt={alt} 
        loading={loading}
        onError={onError}
        size={size}
      />
      <AvatarFallback size={size}>
        {initials}
      </AvatarFallback>
    </AvatarPrimitive.Root>
  )
}))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface AvatarImageProps 
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>,
    VariantProps<typeof avatarVariants> {}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(avatarImageVariants(), className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

interface AvatarFallbackProps 
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ size }), className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }