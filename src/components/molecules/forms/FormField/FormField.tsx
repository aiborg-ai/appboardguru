import * as React from "react"
import { cn } from "@/lib/utils"
import { Input, type InputProps } from "../../atoms/Input"
import { Icon, type IconName } from "../../atoms/Icon"

export interface FormFieldProps extends Omit<InputProps, 'id'> {
  label?: string
  description?: string
  error?: string
  success?: string
  required?: boolean
  id?: string
  helperText?: string
  leftIcon?: IconName
  rightIcon?: IconName
}

const FormField = React.memo(React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({
    label,
    description,
    error,
    success,
    required,
    id,
    helperText,
    leftIcon,
    rightIcon,
    className,
    ...inputProps
  }, ref) => {
    const fieldId = id || React.useId()
    const descriptionId = `${fieldId}-description`
    const errorId = `${fieldId}-error`

    const leftIconElement = leftIcon ? <Icon name={leftIcon} size="sm" /> : undefined
    const rightIconElement = rightIcon ? <Icon name={rightIcon} size="sm" /> : undefined

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <Input
          ref={ref}
          id={fieldId}
          leftIcon={leftIconElement}
          rightIcon={rightIconElement}
          error={error}
          success={success}
          aria-describedby={
            [
              description ? descriptionId : undefined,
              error ? errorId : undefined,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          {...inputProps}
        />

        {(error || success || helperText) && (
          <div className="space-y-1">
            {error && (
              <p id={errorId} className="text-sm text-destructive flex items-center gap-1">
                <Icon name="AlertCircle" size="xs" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Icon name="CheckCircle2" size="xs" />
                {success}
              </p>
            )}
            {helperText && !error && !success && (
              <p className="text-sm text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
))

FormField.displayName = "FormField"

export { FormField }