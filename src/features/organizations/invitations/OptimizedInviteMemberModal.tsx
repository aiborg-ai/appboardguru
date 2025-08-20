"use client"

import * as React from "react"
import { 
  UserPlus, 
  Mail, 
  Send, 
  Plus, 
  Minus,
  Crown,
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
} from "@/features/shared/ui/dialog"
import { Button } from "@/features/shared/ui/button"
import { Input } from "@/features/shared/ui/input"
import { Textarea } from "@/features/shared/ui/textarea"
import { Label } from "@/features/shared/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/shared/ui/select"
import { Badge } from "@/features/shared/ui/badge"
import { Separator } from "@/features/shared/ui/separator"
import { useToast } from "@/features/shared/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  useLightweightForm, 
  validators 
} from "@/lib/forms/lightweight-form"
import { 
  FormInput, 
  FormTextarea, 
  FormSelect,
  useFieldArray,
  useFormSubmission,
  invitationValidators
} from "@/lib/forms/form-components"

// Optimized types without heavy dependencies
type InvitationRole = 'admin' | 'member' | 'viewer'

interface InvitationData {
  email: string
  role: InvitationRole
}

interface OptimizedFormData {
  personalMessage: string
  expiresIn: number
}

interface OptimizedInviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSuccess?: (invitations: any[]) => void
}

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
]

const expirationOptions = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
  { value: 72, label: '3 days (default)' },
  { value: 168, label: '1 week' }
]

export function OptimizedInviteMemberModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess
}: OptimizedInviteMemberModalProps) {
  const { toast } = useToast()
  const createInvitationMutation = useCreateInvitation()
  
  // Use field array for dynamic invitations with native state management
  const [invitations, invitationActions] = useFieldArray<InvitationData>(
    'invitations',
    [{ email: '', role: 'member' }],
    10
  )

  // Lightweight form for additional fields
  const [formState, formActions] = useLightweightForm<OptimizedFormData>({
    fields: {
      personalMessage: invitationValidators.personalMessage,
      expiresIn: invitationValidators.expiresIn
    },
    validateOnBlur: true,
    onSubmit: handleSubmit
  })

  // Form submission with error handling
  const { isSubmitting, error, handleSubmit: submitForm } = useFormSubmission(handleSubmit)

  // Manual validation for invitations array
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

  async function handleSubmit(formData: OptimizedFormData) {
    // Validate invitations
    if (!validateInvitations()) {
      return
    }

    try {
      const results = []
      
      // Send invitations sequentially to avoid rate limits
      for (const invitation of invitations) {
        const result = await createInvitationMutation.mutateAsync({
          organizationId,
          email: invitation.email,
          role: invitation.role,
          personalMessage: formData.personalMessage || undefined,
          expiresIn: formData.expiresIn,
        })
        results.push(result)
      }

      onSuccess?.(results)
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
    invitationActions.append({ email: '', role: 'member' })
  }, [invitationActions])

  const removeInvitation = React.useCallback((index: number) => {
    if (invitations.length > 1) {
      invitationActions.remove(index)
      setInvitationErrors(prev => prev.filter((_, i) => i !== index))
    }
  }, [invitations.length, invitationActions])

  const updateInvitation = React.useCallback((index: number, field: keyof InvitationData, value: string) => {
    const newInvitations = [...invitations]
    newInvitations[index] = { ...newInvitations[index], [field]: value }
    
    // Since we're using native state, we need to trigger re-render manually
    invitationActions.clear()
    newInvitations.forEach(inv => invitationActions.append(inv))
    
    // Clear specific error when user starts typing
    if (invitationErrors[index]) {
      const newErrors = [...invitationErrors]
      newErrors[index] = ''
      setInvitationErrors(newErrors)
    }
  }, [invitations, invitationActions, invitationErrors])

  const handleClose = React.useCallback(() => {
    if (!isSubmitting && !createInvitationMutation.isPending) {
      formActions.reset()
      invitationActions.clear()
      invitationActions.append({ email: '', role: 'member' })
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
            <DialogTitle>Invite Members</DialogTitle>
          </div>
          <DialogDescription>
            Invite new members to join your organization. They will receive an email with instructions to accept the invitation.
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

          {/* Personal Message */}
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

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresIn">Invitation Expires</Label>
            <select
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
            <p className="text-xs text-muted-foreground">
              The invitation link will expire after this time period.
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