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

// Types for our optimized form
type InvitationRole = 'admin' | 'member' | 'viewer'

interface InvitationFormData {
  email: string
  role: InvitationRole
}

interface InviteMemberFormData {
  invitations: InvitationFormData[]
  personalMessage: string
  expiresIn: number
}

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSuccess?: (invitations: any[]) => void
}

// Validation functions using native HTML5 + custom logic
const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "Please enter a valid email address"
  return null
}

const validateRole = (role: string): string | null => {
  if (!['admin', 'member', 'viewer'].includes(role)) return "Please select a valid role"
  return null
}

const validatePersonalMessage = (message: string): string | null => {
  if (message.length > 500) return "Message must be less than 500 characters"
  return null
}

const validateExpiresIn = (hours: number): string | null => {
  if (hours < 1) return "Must be at least 1 hour"
  if (hours > 168) return "Cannot exceed 168 hours (1 week)"
  return null
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

export function InviteMemberModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess
}: InviteMemberModalProps) {
  const { toast } = useToast()
  const createInvitationMutation = useCreateInvitation()
  
  // Form state using native React state instead of react-hook-form
  const [formData, setFormData] = React.useState<InviteMemberFormData>({
    invitations: [{ email: '', role: 'member' }],
    personalMessage: '',
    expiresIn: 72,
  })
  
  // Error state for validation feedback
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Validate invitations
    formData.invitations.forEach((invitation, index) => {
      const emailError = validateEmail(invitation.email)
      if (emailError) {
        newErrors[`invitations.${index}.email`] = emailError
      }
      
      const roleError = validateRole(invitation.role)
      if (roleError) {
        newErrors[`invitations.${index}.role`] = roleError
      }
    })
    
    // Validate personal message
    const messageError = validatePersonalMessage(formData.personalMessage)
    if (messageError) {
      newErrors.personalMessage = messageError
    }
    
    // Validate expires in
    const expiresInError = validateExpiresIn(formData.expiresIn)
    if (expiresInError) {
      newErrors.expiresIn = expiresInError
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addInvitation = () => {
    setFormData(prev => ({
      ...prev,
      invitations: [...prev.invitations, { email: '', role: 'member' }]
    }))
  }

  const removeInvitation = (index: number) => {
    if (formData.invitations.length > 1) {
      setFormData(prev => ({
        ...prev,
        invitations: prev.invitations.filter((_, i) => i !== index)
      }))
      
      // Clear errors for removed invitation
      const newErrors = { ...errors }
      delete newErrors[`invitations.${index}.email`]
      delete newErrors[`invitations.${index}.role`]
      setErrors(newErrors)
    }
  }

  const updateInvitation = (index: number, field: keyof InvitationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      invitations: prev.invitations.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    }))
    
    // Clear field error when user starts typing
    const errorKey = `invitations.${index}.${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const updateField = (field: keyof InviteMemberFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user updates
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const results = []
      
      // Send invitations sequentially to avoid rate limits
      for (const invitation of formData.invitations) {
        const result = await createInvitationMutation.mutateAsync({
          organizationId,
          email: invitation.email,
          role: invitation.role as any,
          personalMessage: formData.personalMessage || undefined,
          expiresIn: formData.expiresIn,
        })
        results.push(result)
      }

      onSuccess?.(results)
      handleClose()
      
      toast({
        title: 'Invitations sent',
        description: `Successfully sent ${formData.invitations.length} invitation${formData.invitations.length > 1 ? 's' : ''}`,
        variant: 'default',
      })
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting && !createInvitationMutation.isPending) {
      // Reset form
      setFormData({
        invitations: [{ email: '', role: 'member' }],
        personalMessage: '',
        expiresIn: 72,
      })
      setErrors({})
      onClose()
    }
  }

  const isLoading = isSubmitting || createInvitationMutation.isPending
  const selectedRole = formData.invitations[0]?.role
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

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Invitations List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Email Invitations <span className="text-red-500">*</span>
              </Label>
              {formData.invitations.length < 10 && (
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
              {formData.invitations.map((invitation, index) => (
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
                          className={errors[`invitations.${index}.email`] ? 'border-red-500' : ''}
                          required
                        />
                        {errors[`invitations.${index}.email`] && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors[`invitations.${index}.email`]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Select
                        value={invitation.role}
                        onValueChange={(value) => updateInvitation(index, 'role', value as InvitationRole)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center space-x-2">
                                <div className={role.color}>
                                  {role.icon}
                                </div>
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {role.description}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.invitations.length > 1 && (
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

            {formData.invitations.length >= 10 && (
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
          <div className="space-y-2">
            <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
            <Textarea
              id="personalMessage"
              rows={3}
              placeholder="Add a personal message to the invitation..."
              value={formData.personalMessage}
              onChange={(e) => updateField('personalMessage', e.target.value)}
              disabled={isLoading}
              className={errors.personalMessage ? 'border-red-500' : ''}
              maxLength={500}
            />
            {errors.personalMessage && (
              <p className="text-sm text-red-600">{errors.personalMessage}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This message will be included in the invitation email.
            </p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresIn">Invitation Expires</Label>
            <Select
              value={formData.expiresIn.toString()}
              onValueChange={(value) => updateField('expiresIn', parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expirationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  Send {formData.invitations.length > 1 ? 'Invitations' : 'Invitation'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}