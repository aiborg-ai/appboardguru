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
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  useCreateModernInvitations, 
  useInvitationFormState,
  modernInvitationKeys 
} from "@/hooks/useModernInvitations"
import { createInvitationsAction } from "@/lib/actions/invitation-actions"

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

// Enhanced Error Boundary with retry mechanism
class InvitationErrorBoundary extends React.Component<
  { 
    children: React.ReactNode
    fallback: React.ComponentType<{ error: Error; retry: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: Record<string, unknown>) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Invitation form error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback
      return <Fallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center space-x-2 text-red-600 mb-3">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-medium">Something went wrong</h3>
      </div>
      <p className="text-sm text-red-600 mb-3">{error.message}</p>
      <Button 
        onClick={retry} 
        variant="outline" 
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50"
      >
        Try again
      </Button>
    </div>
  )
}

// Network status indicator
function NetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded-md mb-4">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm">You're offline. Changes will be synced when connection is restored.</span>
    </div>
  )
}

// Optimistic invitation item component
function OptimisticInvitationItem({ 
  invitation, 
  index, 
  onUpdate, 
  onRemove, 
  validationError, 
  disabled 
}: {
  invitation: InvitationData
  index: number
  onUpdate: (index: number, field: keyof InvitationData, value: string) => void
  onRemove: (index: number) => void
  validationError?: string
  disabled: boolean
}) {
  // React 19: Automatic batching for performance
  const handleEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, 'email', e.target.value)
  }, [index, onUpdate])

  const handleRoleChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(index, 'role', e.target.value as InvitationRole)
  }, [index, onUpdate])

  const handleRemove = React.useCallback(() => {
    onRemove(index)
  }, [index, onRemove])

  return (
    <div className="flex items-start space-x-2">
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-muted-foreground mt-2" />
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={invitation.email}
              onChange={handleEmailChange}
              disabled={disabled}
              className={validationError ? 'border-red-500' : ''}
              required
              autoComplete="email"
            />
            {validationError && (
              <p className="text-sm text-red-600 mt-1">
                {validationError}
              </p>
            )}
          </div>
        </div>
        
        <div className="ml-6">
          <select
            value={invitation.role}
            onChange={handleRoleChange}
            disabled={disabled}
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

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={disabled}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
        aria-label={`Remove invitation for ${invitation.email || 'empty email'}`}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Main form component with React 19 features
function InvitationForm({ 
  organizationId, 
  onSuccess, 
  onClose 
}: { 
  organizationId: string
  onSuccess?: (invitations: any[]) => void
  onClose: () => void
}) {
  const { toast } = useToast()
  
  // React 19: useActionState for form state management
  const [formState, formAction, isPending] = React.useActionState(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      const result = await createInvitationsAction(prevState, formData)
      
      if (result.success) {
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

  // Modern invitation management with optimistic updates
  const { 
    createInvitations, 
    optimisticInvitations, 
    isPending: isMutationPending 
  } = useCreateModernInvitations(organizationId)

  // React 19: useOptimistic for form state
  const [formData, dispatchFormData] = useInvitationFormState()

  // Client-side validation with React.useMemo for performance
  const validationErrors = React.useMemo(() => {
    return formData.invitations.map((invitation: any) => {
      if (!invitation.email) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
        return 'Please enter a valid email address'
      }
      return ''
    })
  }, [formData.invitations])

  const isValid = validationErrors.every((error: any) => !error) && formData.invitations.length > 0

  // Actions using React 19 patterns with automatic batching
  const addInvitation = React.useCallback(() => {
    if (formData.invitations.length < 10) {
      dispatchFormData({ type: 'add' })
    }
  }, [formData.invitations.length, dispatchFormData])

  const removeInvitation = React.useCallback((index: number) => {
    if (formData.invitations.length > 1) {
      dispatchFormData({ type: 'remove', index })
    }
  }, [formData.invitations.length, dispatchFormData])

  const updateInvitation = React.useCallback((
    index: number, 
    field: keyof InvitationData, 
    value: string
  ) => {
    if (field === 'email') {
      dispatchFormData({ type: 'update', index, field, value })
    } else if (field === 'role') {
      dispatchFormData({ type: 'update', index, field, value: value as InvitationRole })
    }
  }, [dispatchFormData])

  const updateInvitationRole = React.useCallback((
    index: number, 
    role: 'admin' | 'member' | 'viewer'
  ) => {
    dispatchFormData({ type: 'update', index, field: 'role', value: role })
  }, [dispatchFormData])

  const handleClose = React.useCallback(() => {
    if (!isPending && !isMutationPending) {
      React.startTransition(() => {
        dispatchFormData({ type: 'reset' })
        onClose()
      })
    }
  }, [isPending, isMutationPending, dispatchFormData, onClose])

  const isSubmitting = isPending || isMutationPending

  return (
    <>
      <NetworkStatus />
      
      <form action={formAction} className="space-y-6">
        {/* Hidden fields for server action */}
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="invitations" value={JSON.stringify(formData.invitations)} />

        {/* Optimistic invitations display */}
        {optimisticInvitations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Sending invitations...</h4>
            <div className="space-y-1">
              {optimisticInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center space-x-2 text-sm text-blue-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{invitation.email} ({invitation.role})</span>
                  <Badge variant="secondary" className="text-xs">
                    {invitation.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

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
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {formData.invitations.map((invitation: any, index: number) => (
              <OptimisticInvitationItem
                key={index}
                invitation={invitation}
                index={index}
                onUpdate={updateInvitation}
                onRemove={removeInvitation}
                validationError={validationErrors[index]}
                disabled={isSubmitting}
              />
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
        {formData.invitations[0] && (
          <div className="bg-gray-50 rounded-lg p-4">
            {(() => {
              const selectedRoleInfo = roles.find(r => r.value === formData.invitations[0]?.role)
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? (
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
                Send {formData.invitations.length > 1 ? 'Invitations' : 'Invitation'}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function ModernInviteMemberModalWithSuspense({
  isOpen,
  onClose,
  organizationId,
  onSuccess
}: ModernInviteMemberModalProps) {
  return (
    <InvitationErrorBoundary 
      fallback={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Invitation modal error:', error, errorInfo)
        // Could send to error tracking service here
      }}
    >
      <Dialog open={isOpen} onOpenChange={onClose}>
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
            <InvitationForm 
              organizationId={organizationId}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </React.Suspense>
        </DialogContent>
      </Dialog>
    </InvitationErrorBoundary>
  )
}