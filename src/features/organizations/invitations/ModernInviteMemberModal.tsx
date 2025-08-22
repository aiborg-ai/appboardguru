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
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
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
import { Badge } from "@/features/shared/ui/badge"
import { Separator } from "@/features/shared/ui/separator"
import { useToast } from "@/features/shared/ui/use-toast"
import { cn } from "@/lib/utils"

// Modern types for React 19
type InvitationRole = 'admin' | 'member' | 'viewer'
type FormState = 'idle' | 'submitting' | 'success' | 'error'

interface InvitationData {
  email: string
  role: InvitationRole
}

interface ModernInviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  onSuccess?: (invitations: any[]) => void
}

// Server Action for form submission
async function submitInvitations(formData: FormData): Promise<{
  success: boolean
  error?: string
  data?: any[]
}> {
  'use server'
  
  try {
    const invitations = JSON.parse(formData.get('invitations') as string)
    const personalMessage = formData.get('personalMessage') as string
    const expiresIn = parseInt(formData.get('expiresIn') as string)
    const organizationId = formData.get('organizationId') as string
    
    // Server-side validation
    for (const invitation of invitations) {
      if (!invitation.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
        throw new Error(`Invalid email: ${invitation.email}`)
      }
      if (!['admin', 'member', 'viewer'].includes(invitation.role)) {
        throw new Error(`Invalid role: ${invitation.role}`)
      }
    }
    
    if (personalMessage && personalMessage.length > 500) {
      throw new Error('Personal message too long')
    }
    
    if (expiresIn < 1 || expiresIn > 168) {
      throw new Error('Invalid expiration time')
    }
    
    // Process invitations (this would normally call your API)
    const results = []
    for (const invitation of invitations) {
      const response = await fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          email: invitation.email,
          role: invitation.role,
          personalMessage: personalMessage || undefined,
          expiresIn,
          invitedBy: 'user-id' // This would come from session
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send invitation to ${invitation.email}`)
      }
      
      const result = await response.json()
      results.push(result.data)
    }
    
    return { success: true, data: results }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitations' 
    }
  }
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

// Error Boundary for better error handling
class InvitationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Invitation form error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback
      return <Fallback error={this.state.error} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-medium">Something went wrong</h3>
      </div>
      <p className="text-sm text-red-600 mt-1">{error.message}</p>
    </div>
  )
}

export function ModernInviteMemberModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess
}: ModernInviteMemberModalProps) {
  const { toast } = useToast()
  
  // React 19: useActionState for form state management
  const [formState, formAction, isPending] = React.useActionState(
    async (prevState: FormState, formData: FormData) => {
      const result = await submitInvitations(formData)
      
      if (result.success) {
        // Use startTransition for non-urgent updates
        React.startTransition(() => {
          onSuccess?.(result.data || [])
          handleClose()
          toast({
            title: 'Invitations sent',
            description: `Successfully sent ${result.data?.length || 0} invitation(s)`,
            variant: 'success',
          })
        })
        return 'success'
      } else {
        toast({
          title: 'Failed to send invitations',
          description: result.error || 'An error occurred',
          variant: 'destructive',
        })
        return 'error'
      }
    },
    'idle'
  )

  // React 19: useOptimistic for optimistic updates
  const [invitations, setOptimisticInvitations] = React.useOptimistic(
    [{ email: '', role: 'member' as InvitationRole }],
    (state: InvitationData[], action: { type: string; payload?: any; index?: number }) => {
      switch (action.type) {
        case 'add':
          return state.length < 10 ? [...state, { email: '', role: 'member' as InvitationRole }] : state
        case 'remove':
          return state.length > 1 ? state.filter((_, i) => i !== action.index) : state
        case 'update':
          return state.map((item, i) => 
            i === action.index ? { ...item, [action.payload.field]: action.payload.value } : item
          )
        case 'reset':
          return [{ email: '', role: 'member' as InvitationRole }]
        default:
          return state
      }
    }
  )

  // Client-side validation with useMemo for performance
  const validationErrors = React.useMemo(() => {
    return invitations.map(invitation => {
      if (!invitation.email) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
        return 'Please enter a valid email address'
      }
      return ''
    })
  }, [invitations])

  const isValid = validationErrors.every(error => !error)

  // Actions using React 19 patterns
  const addInvitation = React.useCallback(() => {
    React.startTransition(() => {
      setOptimisticInvitations({ type: 'add' })
    })
  }, [setOptimisticInvitations])

  const removeInvitation = React.useCallback((index: number) => {
    React.startTransition(() => {
      setOptimisticInvitations({ type: 'remove', index })
    })
  }, [setOptimisticInvitations])

  const updateInvitation = React.useCallback((index: number, field: keyof InvitationData, value: string) => {
    React.startTransition(() => {
      setOptimisticInvitations({ 
        type: 'update', 
        index, 
        payload: { field, value } 
      })
    })
  }, [setOptimisticInvitations])

  const handleClose = React.useCallback(() => {
    if (!isPending) {
      React.startTransition(() => {
        setOptimisticInvitations({ type: 'reset' })
        onClose()
      })
    }
  }, [isPending, setOptimisticInvitations, onClose])

  // Suspense boundary for async operations
  const FormContent = React.memo(() => (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields for server action */}
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="invitations" value={JSON.stringify(invitations)} />

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
              disabled={isPending}
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
                      disabled={isPending}
                      className={validationErrors[index] ? 'border-red-500' : ''}
                      required
                    />
                    {validationErrors[index] && (
                      <p className="text-sm text-red-600 mt-1">
                        {validationErrors[index]}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="ml-6">
                  <select
                    value={invitation.role}
                    onChange={(e) => updateInvitation(index, 'role', e.target.value)}
                    disabled={isPending}
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
                  disabled={isPending}
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
      {invitations[0] && (
        <div className="bg-gray-50 rounded-lg p-4">
          {(() => {
            const selectedRoleInfo = roles.find(r => r.value === invitations[0]?.role)
            return selectedRoleInfo ? (
              <>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <div className={selectedRoleInfo.color}>
                    {selectedRoleInfo.icon}
                  </div>
                  <span>{selectedRoleInfo.label} Permissions</span>
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedRoleInfo.description}
                </p>
              </>
            ) : null
          })()}
        </div>
      )}

      {/* Personal Message */}
      <div className="space-y-2">
        <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
        <Textarea
          name="personalMessage"
          id="personalMessage"
          rows={3}
          placeholder="Add a personal message to the invitation..."
          disabled={isPending}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          This message will be included in the invitation email.
        </p>
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <Label htmlFor="expiresIn">Invitation Expires</Label>
        <select
          name="expiresIn"
          id="expiresIn"
          disabled={isPending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !isValid}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : formState === 'success' ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sent!
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
  ))

  return (
    <InvitationErrorBoundary fallback={ErrorFallback}>
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

          <React.Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading form...</span>
            </div>
          }>
            <FormContent />
          </React.Suspense>
        </DialogContent>
      </Dialog>
    </InvitationErrorBoundary>
  )
}