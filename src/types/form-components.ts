/**
 * Form Components Type Definitions
 * Type definitions for form components and form handling
 */

import { ReactNode, ChangeEvent, FocusEvent, FormEvent, HTMLAttributes } from 'react'

// Base Form Types
export interface FormFieldValue {
  [key: string]: string | number | boolean | Date | null | undefined | FormFieldValue | FormFieldValue[]
}

export interface FormErrors {
  [key: string]: string | string[] | FormErrors
}

export interface FormTouchedFields {
  [key: string]: boolean | FormTouchedFields
}

export interface FormState<T = FormFieldValue> {
  values: T
  errors: FormErrors
  touched: FormTouchedFields
  isSubmitting: boolean
  isValidating: boolean
  isDirty: boolean
  isValid: boolean
}

// Validation Types
export type ValidationRule<T = any> = {
  required?: boolean | string
  minLength?: number | string
  maxLength?: number | string
  min?: number | string
  max?: number | string
  pattern?: RegExp | string
  email?: boolean | string
  url?: boolean | string
  custom?: (value: T) => string | null | undefined | Promise<string | null | undefined>
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule
}

// Form Hook Types
export interface UseFormOptions<T = FormFieldValue> {
  initialValues: T
  validationSchema?: FieldValidation
  onSubmit: (values: T) => void | Promise<void>
  validateOnChange?: boolean
  validateOnBlur?: boolean
  enableReinitialize?: boolean
}

export interface UseFormReturn<T = FormFieldValue> {
  values: T
  errors: FormErrors
  touched: FormTouchedFields
  isSubmitting: boolean
  isValidating: boolean
  isDirty: boolean
  isValid: boolean
  setFieldValue: (field: keyof T, value: any) => void
  setFieldError: (field: keyof T, error: string) => void
  setFieldTouched: (field: keyof T, touched?: boolean) => void
  validateField: (field: keyof T) => Promise<void>
  validateForm: () => Promise<void>
  resetForm: (values?: T) => void
  submitForm: () => Promise<void>
  handleSubmit: (e?: FormEvent<HTMLFormElement>) => Promise<void>
  getFieldProps: (name: keyof T) => FormFieldProps
}

// Form Field Props
export interface FormFieldProps {
  name: string
  value: any
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  error?: string
  touched?: boolean
}

// Form Components
export interface FormProps extends HTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
  noValidate?: boolean
  className?: string
  children: ReactNode
}

export interface FormItemProps {
  className?: string
  children: ReactNode
}

export interface FormLabelProps extends HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export interface FormControlProps {
  className?: string
  children: ReactNode
}

export interface FormDescriptionProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export interface FormMessageProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: ReactNode
}

// Input Field Components
export interface InputFieldProps {
  label?: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  autoComplete?: string
  autoFocus?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  className?: string
  inputClassName?: string
}

export interface TextareaFieldProps {
  label?: string
  name: string
  placeholder?: string
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  rows?: number
  cols?: number
  maxLength?: number
  minLength?: number
  className?: string
  textareaClassName?: string
}

export interface SelectFieldProps {
  label?: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
  selectClassName?: string
}

export interface CheckboxFieldProps {
  label?: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  value?: string
  className?: string
}

export interface RadioFieldProps {
  label?: string
  name: string
  value: string
  selectedValue: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export interface RadioGroupFieldProps {
  label?: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export interface SwitchFieldProps {
  label?: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Date and Time Components
export interface DatePickerFieldProps {
  label?: string
  name: string
  value: Date | null
  onChange: (date: Date | null) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  format?: string
  minDate?: Date
  maxDate?: Date
  className?: string
}

export interface TimePickerFieldProps {
  label?: string
  name: string
  value: string
  onChange: (time: string) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  format24?: boolean
  className?: string
}

export interface DateTimePickerFieldProps {
  label?: string
  name: string
  value: Date | null
  onChange: (date: Date | null) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  dateFormat?: string
  timeFormat?: string
  minDate?: Date
  maxDate?: Date
  className?: string
}

// File Upload Components
export interface FileUploadFieldProps {
  label?: string
  name: string
  value: File[] | null
  onChange: (files: File[] | null) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  className?: string
}

// Rich Text Editor Components
export interface RichTextEditorFieldProps {
  label?: string
  name: string
  value: string
  onChange: (content: string) => void
  onBlur?: () => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  toolbar?: string[]
  height?: number
  className?: string
}

// Multi-Select Components
export interface MultiSelectFieldProps {
  label?: string
  name: string
  value: string[]
  onChange: (values: string[]) => void
  onBlur?: () => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  clearable?: boolean
  maxSelected?: number
  className?: string
}

// Autocomplete Components
export interface AutocompleteFieldProps {
  label?: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onSearch?: (query: string) => void
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  noOptionsText?: string
  className?: string
}

// Form Array Components
export interface FieldArrayProps {
  name: string
  children: (helpers: {
    fields: any[]
    push: (item: any) => void
    remove: (index: number) => void
    move: (from: number, to: number) => void
    insert: (index: number, item: any) => void
    replace: (index: number, item: any) => void
    unshift: (item: any) => void
    pop: () => any
  }) => ReactNode
}

// Form Section Components
export interface FormSectionProps {
  title?: string
  description?: string
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

export interface FormStepperProps {
  steps: Array<{
    title: string
    description?: string
    optional?: boolean
    completed?: boolean
    error?: boolean
  }>
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

// Form Actions
export interface FormActionsProps {
  submitText?: string
  cancelText?: string
  resetText?: string
  onCancel?: () => void
  onReset?: () => void
  showCancel?: boolean
  showReset?: boolean
  submitDisabled?: boolean
  submitLoading?: boolean
  alignment?: 'left' | 'center' | 'right' | 'space-between'
  className?: string
}

// Form Validation Messages
export interface ValidationMessage {
  type: 'error' | 'warning' | 'info' | 'success'
  message: string
}

export interface FormValidationProps {
  messages: ValidationMessage[]
  className?: string
}

// Form Context Types
export interface FormContextValue<T = FormFieldValue> {
  values: T
  errors: FormErrors
  touched: FormTouchedFields
  isSubmitting: boolean
  isValidating: boolean
  isDirty: boolean
  isValid: boolean
  setFieldValue: (field: keyof T, value: any) => void
  setFieldError: (field: keyof T, error: string) => void
  setFieldTouched: (field: keyof T, touched?: boolean) => void
  validateField: (field: keyof T) => Promise<void>
  validateForm: () => Promise<void>
  resetForm: (values?: T) => void
  submitForm: () => Promise<void>
}

// Form Builder Types
export interface FormFieldConfig {
  name: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch' | 'date' | 'time' | 'datetime' | 'file' | 'multiselect' | 'autocomplete'
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  validation?: ValidationRule
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  props?: Record<string, any>
}

export interface FormBuilderProps {
  fields: FormFieldConfig[]
  initialValues: FormFieldValue
  onSubmit: (values: FormFieldValue) => void | Promise<void>
  submitText?: string
  className?: string
}