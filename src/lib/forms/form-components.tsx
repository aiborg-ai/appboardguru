/**
 * Optimized Form Components
 * Lightweight components that work with the custom form library
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { FormActions, FormState, FieldProps } from "./lightweight-form"

// Enhanced Input component with validation integration
interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur'> {
  fieldProps: FieldProps
  error?: string
  label?: string
  description?: string
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ fieldProps, error, label, description, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={fieldProps.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldProps.name}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...(fieldProps as any)}
          {...props}
        />
        {error && (
          <p id={`${fieldProps.name}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
)
FormInput.displayName = "FormInput"

// Enhanced Textarea component
interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onBlur'> {
  fieldProps: FieldProps
  error?: string
  label?: string
  description?: string
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ fieldProps, error, label, description, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={fieldProps.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldProps.name}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...(fieldProps as any)}
          {...props}
        />
        {error && (
          <p id={`${fieldProps.name}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
)
FormTextarea.displayName = "FormTextarea"

// Enhanced Select component that works with native HTML select
interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'onBlur'> {
  fieldProps: FieldProps
  error?: string
  label?: string
  description?: string
  children: React.ReactNode
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ fieldProps, error, label, description, className, children, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={fieldProps.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={fieldProps.name}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...(fieldProps as any)}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${fieldProps.name}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
)
FormSelect.displayName = "FormSelect"

// Form field array utilities for dynamic fields
export interface FieldArrayActions<T> {
  append: (value: T) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  clear: () => void
}

export function useFieldArray<T>(
  name: string,
  initialValues: T[] = [],
  maxItems = 10
): [T[], FieldArrayActions<T>] {
  const [items, setItems] = React.useState<T[]>(initialValues)

  const actions: FieldArrayActions<T> = {
    append: React.useCallback((value: T) => {
      setItems(current => 
        current.length < maxItems ? [...current, value] : current
      )
    }, [maxItems]),

    remove: React.useCallback((index: number) => {
      setItems(current => current.filter((_, i) => i !== index))
    }, []),

    move: React.useCallback((from: number, to: number) => {
      setItems(current => {
        const newItems = [...current]
        const [movedItem] = newItems.splice(from, 1)
        newItems.splice(to, 0, movedItem)
        return newItems
      })
    }, []),

    clear: React.useCallback(() => {
      setItems([])
    }, [])
  }

  return [items, actions]
}

// Form submission helper with loading states
export function useFormSubmission<T>(
  onSubmit: (data: T) => Promise<void>
) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = React.useCallback(async (data: T) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit])

  return {
    isSubmitting,
    error,
    handleSubmit,
    clearError: () => setError(null)
  }
}

// Validation utilities specifically for invitation forms
export const invitationValidators = {
  email: {
    validation: {
      required: 'Email is required',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value: string) => {
        if (!value) return 'Email is required'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address'
        }
        return undefined
      }
    }
  },
  role: {
    validation: {
      required: 'Please select a role',
      custom: (value: string) => {
        if (value === 'owner') return 'Cannot invite as owner'
        if (!['admin', 'member', 'viewer'].includes(value)) return 'Invalid role'
        return undefined
      }
    }
  },
  personalMessage: {
    validation: {
      maxLength: 500,
      custom: (value: string) => {
        if (value && value.length > 500) {
          return 'Message must be less than 500 characters'
        }
        return undefined
      }
    }
  },
  expiresIn: {
    validation: {
      min: 1,
      max: 168,
      custom: (value: number) => {
        if (value < 1) return 'Must be at least 1 hour'
        if (value > 168) return 'Cannot exceed 168 hours (1 week)'
        return undefined
      }
    },
    transform: (value: string) => parseInt(value, 10)
  }
}