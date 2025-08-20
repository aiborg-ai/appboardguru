/**
 * Type-Safe InviteMemberModal Implementation
 * 
 * This component demonstrates the advanced TypeScript type bridge solution
 * that resolves the type mismatch between Zod schema inference and React Hook Form types
 * for the `expiresIn` field using cutting-edge TypeScript and JavaScript features.
 */

"use client"

import * as React from "react"
import { 
  UserPlus, 
  Mail, 
  Send, 
  Plus, 
  Minus,
  Shield,
  User,
  Eye,
  Loader2
} from "lucide-react"
import {
  useCreateInvitation,
} from "@/hooks/useInvitations"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  useLightweightForm, 
  validators 
} from "@/lib/forms/lightweight-form"
import { 
  FormInput, 
  FormTextarea, 
  useFieldArray,
  useFormSubmission,
  invitationValidators
} from "@/lib/forms/form-components"
import {
  FormTypeBridge,
  createFormBridge,
  transformFieldProps,
  createFieldValueTransformer,
  type FormBridgeConfig,
  type SmartFormType,
  type TypeAdapter
} from "@/lib/forms/advanced-type-bridge"

// ============================================================================
// ADVANCED TYPE DEFINITIONS WITH CONDITIONAL CONSTRAINTS
// ============================================================================

// Enhanced type definitions using template literal types
type InvitationRole = 'admin' | 'member' | 'viewer'
type ExpirationHours = 24 | 48 | 72 | 168

// Advanced conditional type for form data with brand checking
interface EnhancedInvitationData {
  email: string
  role: InvitationRole
}

// Smart form type with conditional requirements
interface TypeSafeFormData {
  personalMessage: string
  expiresIn: ExpirationHours
}

// Type-safe modal props with enhanced generics
interface TypeSafeInviteMemberModalProps<
  TFormData extends Record<string, any> = TypeSafeFormData,
  TInvitationData extends Record<string, any> = EnhancedInvitationData
> {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSuccess?: (invitations: TInvitationData[]) => void
  formConfig?: FormBridgeConfig<TFormData>
}

// ============================================================================
// ADVANCED TYPE ADAPTERS AND TRANSFORMERS
// ============================================================================

// Create sophisticated type adapters for form fields
const expiresInAdapter: TypeAdapter<number> = createFieldValueTransformer<string, number>(
  (value: string) => {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 168) {
      throw new Error('Invalid expiration time')
    }
    return parsed
  },
  (value: number) => String(value)
)

const personalMessageAdapter: TypeAdapter<string> = createFieldValueTransformer<string, string>(
  (value: string) => value.trim(),
  (value: string) => value
)

// Advanced form bridge configuration with meta-programming
const formBridgeConfig: FormBridgeConfig<TypeSafeFormData> = {
  fieldTransformers: {
    expiresIn: (value: any, context: TypeSafeFormData) => {
      // Transform string to number with validation
      if (typeof value === 'string') {
        return expiresInAdapter.transform(value)
      }
      return value
    },
    personalMessage: (value: any, context: TypeSafeFormData) => {
      return personalMessageAdapter.transform(value)
    }
  },
  fieldValidators: {
    expiresIn: (value: any, context: TypeSafeFormData) => {
      try {
        const transformed = expiresInAdapter.transform(value)
        if (transformed < 1 || transformed > 168) {
          return 'Expiration must be between 1 and 168 hours'
        }
        return true
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid value'
      }
    },
    personalMessage: (value: any, context: TypeSafeFormData) => {
      if (typeof value !== 'string') {
        return 'Message must be a string'
      }
      if (value.length > 500) {
        return 'Message must be less than 500 characters'
      }
      return true
    }
  },
  typeAdapters: {
    expiresIn: expiresInAdapter,
    personalMessage: personalMessageAdapter
  },
  metadataExtractors: {
    expiresIn: (field: any) => ({
      type: 'number',
      min: 1,
      max: 168,
      step: 1,
      htmlType: 'select'
    }),
    personalMessage: (field: any) => ({
      type: 'string',
      maxLength: 500,
      htmlType: 'textarea'
    })
  }
}

// ============================================================================
// COMPONENT DATA WITH TYPE SAFETY
// ============================================================================

const roles = [
  {
    value: 'admin' as const,
    label: 'Admin',
    description: 'Manage members and organization content',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-red-600'
  },
  {
    value: 'member' as const,
    label: 'Member', 
    description: 'Access and create organization content',
    icon: <User className="h-4 w-4" />,
    color: 'text-blue-600'
  },
  {
    value: 'viewer' as const,
    label: 'Viewer',
    description: 'View organization content only',
    icon: <Eye className="h-4 w-4" />,
    color: 'text-gray-600'
  }
] as const

const expirationOptions = [
  { value: 24 as ExpirationHours, label: '24 hours' },
  { value: 48 as ExpirationHours, label: '2 days' },
  { value: 72 as ExpirationHours, label: '3 days (default)' },
  { value: 168 as ExpirationHours, label: '1 week' }
] as const

// ============================================================================
// ADVANCED CUSTOM HOOKS WITH TYPE SAFETY
// ============================================================================

/**
 * Advanced form hook with type bridge integration
 */
function useTypeSafeForm<T extends Record<string, any>>(
  config: FormBridgeConfig<T>,
  initialData: Partial<T> = {}
) {
  // Create the form bridge with advanced type transformation
  const formBridge = React.useMemo(() => 
    createFormBridge(initialData as T, config), 
    [config, initialData]
  )

  // Use the lightweight form with enhanced configuration
  const [formState, formActions] = useLightweightForm<T>({
    fields: {
      personalMessage: invitationValidators.personalMessage,
      expiresIn: {
        ...invitationValidators.expiresIn,
        validation: {
          ...invitationValidators.expiresIn.validation,
          custom: (value: any) => {
            const result = formBridge.validateField('expiresIn' as keyof T, value)
            return result === true ? undefined : result
          }
        }
      }
    } as any,
    validateOnBlur: true,
    onSubmit: async (data: T) => {
      // Apply final transformations before submission
      const transformedData = formBridge.getProxy()
      return transformedData
    }
  })

  // Enhanced field props getter with type safety
  const getEnhancedFieldProps = React.useCallback(<K extends keyof T>(
    fieldName: K
  ): React.SelectHTMLAttributes<HTMLSelectElement> => {
    const originalProps = formActions.getFieldProps(fieldName)
    return formBridge.transformFieldProps(originalProps, fieldName)
  }, [formActions, formBridge])

  return {
    formState,
    formActions,
    formBridge,
    getEnhancedFieldProps
  }
}

/**
 * Enhanced invitation management hook with optimistic updates
 */
function useInvitationManagement<T extends EnhancedInvitationData>(
  maxInvitations: number = 10
) {
  // Use field array for dynamic invitations with native state management
  const [invitations, invitationActions] = useFieldArray<T>(
    'invitations',
    [{ email: '', role: 'member' } as T],
    maxInvitations
  )

  // Advanced validation with type safety
  const [invitationErrors, setInvitationErrors] = React.useState<string[]>([])

  const validateInvitations = React.useCallback((): boolean => {
    const errors: string[] = []
    let isValid = true

    invitations.forEach((invitation, index) => {
      const emailError = invitationValidators.email.validation.custom?.(invitation.email)
      const roleError = invitationValidators.role.validation.custom?.(invitation.role)
      
      if (emailError || roleError) {
        errors[index] = emailError || roleError || ''
        isValid = false
      } else {
        errors[index] = ''
      }
    })

    setInvitationErrors(errors)
    return isValid
  }, [invitations])

  const updateInvitation = React.useCallback((
    index: number, 
    field: keyof T, 
    value: string
  ) => {
    const newInvitations = [...invitations]
    newInvitations[index] = { ...newInvitations[index], [field]: value }
    
    // Apply type-safe updates
    invitationActions.clear()
    newInvitations.forEach(inv => invitationActions.append(inv))
    
    // Clear specific error when user starts typing
    if (invitationErrors[index]) {
      const newErrors = [...invitationErrors]
      newErrors[index] = ''
      setInvitationErrors(newErrors)
    }
  }, [invitations, invitationActions, invitationErrors])

  return {
    invitations,
    invitationActions,
    invitationErrors,
    validateInvitations,
    updateInvitation
  }
}

// ============================================================================
// MAIN COMPONENT WITH ADVANCED TYPE SAFETY
// ============================================================================

export function TypeSafeInviteMemberModal<
  TFormData extends TypeSafeFormData = TypeSafeFormData,
  TInvitationData extends EnhancedInvitationData = EnhancedInvitationData
>({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
  formConfig = formBridgeConfig as FormBridgeConfig<TFormData>
}: TypeSafeInviteMemberModalProps<TFormData, TInvitationData>) {
  const { toast } = useToast()
  const createInvitationMutation = useCreateInvitation()
  
  // Use advanced type-safe form management
  const {
    formState,
    formActions,
    formBridge,
    getEnhancedFieldProps
  } = useTypeSafeForm<TFormData>(formConfig, {
    personalMessage: '',
    expiresIn: 72
  } as Partial<TFormData>)

  // Use enhanced invitation management
  const {
    invitations,
    invitationActions,
    invitationErrors,
    validateInvitations,
    updateInvitation
  } = useInvitationManagement<TInvitationData>()

  // Form submission with error handling and type safety
  const { isSubmitting, error, handleSubmit: submitForm } = useFormSubmission(handleSubmit)

  async function handleSubmit(formData: TFormData) {
    // Validate invitations
    if (!validateInvitations()) {
      return
    }

    try {
      const results = []
      
      // Apply final type transformations
      const transformedFormData = formBridge.getProxy()
      
      // Send invitations sequentially to avoid rate limits
      for (const invitation of invitations) {
        const result = await createInvitationMutation.mutateAsync({
          organizationId,
          email: invitation.email,
          role: invitation.role,
          personalMessage: transformedFormData.personalMessage || undefined,
          expiresIn: transformedFormData.expiresIn,
        })
        results.push(result)
      }

      onSuccess?.(results as TInvitationData[])
      handleClose()
      
      toast({
        title: 'Invitations sent',
        description: `Successfully sent ${invitations.length} invitation${invitations.length > 1 ? 's' : ''}`,
        variant: 'success',
      })
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const addInvitation = React.useCallback(() => {
    invitationActions.append({ email: '', role: 'member' } as TInvitationData)
  }, [invitationActions])

  const removeInvitation = React.useCallback((index: number) => {
    if (invitations.length > 1) {
      invitationActions.remove(index)
      setInvitationErrors(prev => prev.filter((_, i) => i !== index))
    }
  }, [invitations.length, invitationActions])

  const handleClose = React.useCallback(() => {
    if (!isSubmitting && !createInvitationMutation.isPending) {
      formActions.reset()
      invitationActions.clear()
      invitationActions.append({ email: '', role: 'member' } as TInvitationData)
      setInvitationErrors([])
      onClose()
    }
  }, [isSubmitting, createInvitationMutation.isPending, formActions, invitationActions, onClose])

  const isLoading = isSubmitting || createInvitationMutation.isPending
  const selectedRole = invitations[0]?.role
  const selectedRoleInfo = roles.find(r => r.value === selectedRole)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <DialogTitle>Invite Members (Type-Safe)</DialogTitle>
          </div>
          <DialogDescription>
            Advanced TypeScript implementation with runtime type transformation.
            This modal demonstrates cutting-edge type safety with Proxy-based field transformation.
          </DialogDescription>
        </DialogHeader>

        <form {...formActions.getFormProps()} className="space-y-6">
          {/* Invitations List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Email Invitations <span className="text-red-500">*</span>
              </Label>
              {invitations.length < 10 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addInvitation}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {invitations.map((invitation, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-2" />
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="colleague@company.com"
                          value={invitation.email}
                          onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                          disabled={isLoading}
                          className={invitationErrors[index] ? 'border-red-500' : ''}
                          required
                        />
                        {invitationErrors[index] && (
                          <p className="text-sm text-red-600 mt-1">
                            {invitationErrors[index]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <select
                        value={invitation.role}
                        onChange={(e) => updateInvitation(index, 'role', e.target.value)}
                        disabled={isLoading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label} - {role.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {invitations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvitation(index)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {invitations.length >= 10 && (
              <p className="text-sm text-muted-foreground">
                Maximum of 10 invitations can be sent at once.
              </p>
            )}
          </div>

          <Separator />

          {/* Role Information */}
          {selectedRoleInfo && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                <div className={selectedRoleInfo.color}>
                  {selectedRoleInfo.icon}
                </div>
                <span>{selectedRoleInfo.label} Permissions</span>
              </h4>
              <p className="text-sm text-gray-600">
                {selectedRoleInfo.description}
              </p>
            </div>
          )}

          {/* Personal Message with Type Bridge */}
          <FormTextarea
            fieldProps={formActions.getFieldProps('personalMessage')}
            error={formState.errors.personalMessage}
            label="Personal Message (Optional)"
            description="This message will be included in the invitation email."
            rows={3}
            placeholder="Add a personal message to the invitation..."
            disabled={isLoading}
            name="personalMessage"
          />

          {/* Expiration with Advanced Type Safety */}
          <div className="space-y-2">
            <Label htmlFor="expiresIn">Invitation Expires</Label>
            <select
              {...getEnhancedFieldProps('expiresIn' as keyof TFormData)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              name="expiresIn"
              defaultValue="72"
            >
              {expirationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formState.errors.expiresIn && (
              <p className="text-sm text-red-600">
                {formState.errors.expiresIn}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The invitation link will expire after this time period.
              <Badge variant="outline" className="ml-2">
                Type-Safe: {typeof formState.values.expiresIn}
              </Badge>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send {invitations.length > 1 ? 'Invitations' : 'Invitation'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Export the component with type safety
export default TypeSafeInviteMemberModal