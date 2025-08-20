"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  invitationValidation
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Form validation schema
const inviteMemberSchema = z.object({
  invitations: z.array(z.object({
    email: z
      .string()
      .email('Please enter a valid email address')
      .min(1, 'Email is required'),
    role: z
      .enum(['owner', 'admin', 'member', 'viewer'])
      .refine(role => role !== 'owner', 'Cannot invite as owner'),
  })).min(1, 'At least one invitation is required'),
  personalMessage: z
    .string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
  expiresIn: z
    .number()
    .min(1, 'Must be at least 1 hour')
    .max(168, 'Cannot exceed 168 hours (1 week)')
    .default(72),
})

type InviteMemberFormData = z.infer<typeof inviteMemberSchema>

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSuccess?: (invitations: any[]) => void
}

const roles = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage members and organization content',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-red-600'
  },
  {
    value: 'member',
    label: 'Member', 
    description: 'Access and create organization content',
    icon: <User className="h-4 w-4" />,
    color: 'text-blue-600'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View organization content only',
    icon: <Eye className="h-4 w-4" />,
    color: 'text-gray-600'
  }
] as const

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
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    control
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      invitations: [{ email: '', role: 'member' }],
      personalMessage: '',
      expiresIn: 72,
    }
  })

  const watchedInvitations = watch('invitations')

  const addInvitation = () => {
    setValue('invitations', [
      ...watchedInvitations,
      { email: '', role: 'member' }
    ])
  }

  const removeInvitation = (index: number) => {
    if (watchedInvitations.length > 1) {
      setValue('invitations', watchedInvitations.filter((_, i) => i !== index))
    }
  }

  const onSubmit = async (data: InviteMemberFormData) => {
    try {
      const results = []
      
      // Send invitations sequentially to avoid rate limits
      for (const invitation of data.invitations) {
        const result = await createInvitationMutation.mutateAsync({
          organizationId,
          email: invitation.email,
          role: invitation.role as any,
          personalMessage: data.personalMessage || undefined,
          expiresIn: data.expiresIn,
        })
        results.push(result)
      }

      onSuccess?.(results)
      handleClose()
      
      toast({
        title: 'Invitations sent',
        description: `Successfully sent ${data.invitations.length} invitation${data.invitations.length > 1 ? 's' : ''}`,
        variant: 'success',
      })
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleClose = () => {
    if (!isSubmitting && !createInvitationMutation.isPending) {
      reset()
      onClose()
    }
  }

  const isLoading = isSubmitting || createInvitationMutation.isPending
  const selectedRole = watchedInvitations[0]?.role
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invitations List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Email Invitations <span className="text-red-500">*</span>
              </Label>
              {watchedInvitations.length < 10 && (
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
              {watchedInvitations.map((invitation, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-2" />
                      <div className="flex-1">
                        <Input
                          {...register(`invitations.${index}.email`)}
                          type="email"
                          placeholder="colleague@company.com"
                          disabled={isLoading}
                          className={errors.invitations?.[index]?.email ? 'border-red-500' : ''}
                        />
                        {errors.invitations?.[index]?.email && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.invitations[index]?.email?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Select
                        value={invitation.role}
                        onValueChange={(value) => 
                          setValue(`invitations.${index}.role`, value as any)
                        }
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

                  {watchedInvitations.length > 1 && (
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

            {watchedInvitations.length >= 10 && (
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
              {...register('personalMessage')}
              rows={3}
              placeholder="Add a personal message to the invitation..."
              disabled={isLoading}
              className={errors.personalMessage ? 'border-red-500' : ''}
            />
            {errors.personalMessage && (
              <p className="text-sm text-red-600">{errors.personalMessage.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This message will be included in the invitation email.
            </p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresIn">Invitation Expires</Label>
            <Select
              value={watch('expiresIn')?.toString()}
              onValueChange={(value) => setValue('expiresIn', parseInt(value))}
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
                  Send {watchedInvitations.length > 1 ? 'Invitations' : 'Invitation'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}