import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "../../atoms/Button"
import { Icon } from "../../atoms/Icon"

const modalVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        default: "max-w-lg", 
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] max-h-[95vh]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

// Context for compound components
interface ModalContextValue {
  onClose: () => void
}

const ModalContext = React.createContext<ModalContextValue | null>(null)

const useModalContext = () => {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error('Modal compound components must be used within a Modal')
  }
  return context
}

export interface ModalProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
    VariantProps<typeof modalVariants> {
  children: React.ReactNode
  onClose?: () => void
}

const Modal = React.memo<ModalProps>(({
  children,
  size,
  onClose,
  open,
  onOpenChange,
  ...props
}) => {
  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose?.()
    }
    onOpenChange?.(isOpen)
  }, [onClose, onOpenChange])

  const contextValue: ModalContextValue = React.useMemo(() => ({
    onClose: () => handleOpenChange(false),
  }), [handleOpenChange])

  return (
    <ModalContext.Provider value={contextValue}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        <DialogPrimitive.Portal>
          <ModalOverlay />
          <DialogPrimitive.Content className={cn(modalVariants({ size }))}>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ModalContext.Provider>
  )
})

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = "ModalOverlay"

interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
}

const ModalHeader = React.memo<ModalHeaderProps>(({
  className,
  showCloseButton = true,
  children,
  ...props
}) => {
  const { onClose } = useModalContext()

  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        showCloseButton && "pr-6",
        className
      )}
      {...props}
    >
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={onClose}
          >
            <Icon name="X" size="sm" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogPrimitive.Close>
      )}
      {children}
    </div>
  )
})

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
ModalTitle.displayName = "ModalTitle"

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
ModalDescription.displayName = "ModalDescription"

const ModalBody = React.memo<React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}) => (
  <div
    className={cn("flex-1 overflow-y-auto", className)}
    {...props}
  />
))

interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right'
}

const ModalFooter = React.memo<ModalFooterProps>(({
  className,
  align = 'right',
  ...props
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center', 
    right: 'justify-end',
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        alignClasses[align],
        className
      )}
      {...props}
    />
  )
})

// Pre-built action buttons
interface ModalActionsProps {
  onCancel?: () => void
  onConfirm?: () => void
  cancelText?: string
  confirmText?: string
  confirmVariant?: 'default' | 'destructive'
  confirmDisabled?: boolean
  confirmLoading?: boolean
  showCancel?: boolean
  children?: React.ReactNode
}

const ModalActions = React.memo<ModalActionsProps>(({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmVariant = 'default',
  confirmDisabled = false,
  confirmLoading = false,
  showCancel = true,
  children,
}) => {
  const { onClose } = useModalContext()

  const handleCancel = React.useCallback(() => {
    onCancel?.()
    onClose()
  }, [onCancel, onClose])

  if (children) {
    return <ModalFooter>{children}</ModalFooter>
  }

  return (
    <ModalFooter>
      {showCancel && (
        <Button variant="outline" onClick={handleCancel}>
          {cancelText}
        </Button>
      )}
      <Button
        variant={confirmVariant}
        onClick={onConfirm}
        disabled={confirmDisabled}
        loading={confirmLoading}
      >
        {confirmText}
      </Button>
    </ModalFooter>
  )
})

// Compound component assignments
Modal.Header = ModalHeader
Modal.Title = ModalTitle
Modal.Description = ModalDescription
Modal.Body = ModalBody
Modal.Footer = ModalFooter
Modal.Actions = ModalActions

export {
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalActions,
  modalVariants,
}