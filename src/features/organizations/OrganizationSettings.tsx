"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Settings,
  Users,
  Mail,
  Shield,
  AlertTriangle,
  Save,
  Loader2,
  Upload,
  UserPlus,
  Crown,
  Trash2,
} from "lucide-react"
import {
  useOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from "@/hooks/useOrganizations"
import { useOrganizationMembers } from "@/hooks/useMembers"
import { useInvitations } from "@/hooks/useInvitations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Database } from "@/types/database"

// Import sub-components
import { GeneralTab } from "./settings/GeneralTab"
import { AssetSettingsTab } from "./settings/AssetSettingsTab"
import { ComplianceTab } from "./settings/ComplianceTab"
import { NotificationsTab } from "./settings/NotificationsTab"
import { MembersTab } from "./settings/MembersTab"
import { InvitationsTab } from "./settings/InvitationsTab"
import { FeaturesTab } from "./settings/FeaturesTab"
import { DangerZoneTab } from "./settings/DangerZoneTab"

type Organization = Database['public']['Tables']['organizations']['Row']

// Form validation schema
const generalSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  industry: z.string().optional(),
  organizationSize: z
    .enum(['startup', 'small', 'medium', 'large', 'enterprise'])
    .optional(),
})

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>

interface OrganizationSettingsProps {
  organizationId: string
  userRole?: 'owner' | 'admin' | 'member' | 'viewer'
  onClose?: () => void
}

const organizationSizes = [
  { value: 'startup', label: 'Startup (1-10 employees)' },
  { value: 'small', label: 'Small (11-50 employees)' },
  { value: 'medium', label: 'Medium (51-200 employees)' },
  { value: 'large', label: 'Large (201-1000 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
] as const

const commonIndustries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Legal',
  'Consulting',
  'Non-profit',
  'Government',
  'Other'
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function OrganizationSettings({
  organizationId,
  userRole = 'viewer',
  onClose
}: OrganizationSettingsProps) {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [isUserLoading, setIsUserLoading] = React.useState(true)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState("general")

  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Error fetching user:', error)
          setIsUserLoading(false)
          return
        }
        if (user) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error('Error in getUser:', error)
      } finally {
        setIsUserLoading(false)
      }
    }
    getUser()
  }, [])

  // Fetch organization data - only when userId is available
  const { data: organization, isLoading, error } = useOrganization(
    organizationId, 
    userId || undefined
  )
  const updateOrganizationMutation = useUpdateOrganization()

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
  })

  // Update form when organization data loads
  React.useEffect(() => {
    if (organization) {
      reset({
        name: organization.name,
        description: organization.description || '',
        website: organization.website || '',
        industry: organization.industry || '',
        organizationSize: organization.organization_size as ("medium" | "small" | "startup" | "large" | "enterprise") || undefined,
      })
    }
  }, [organization, reset])

  const onSubmitGeneral = async (data: GeneralSettingsFormData) => {
    try {
      await updateOrganizationMutation.mutateAsync({
        organizationId,
        name: data.name,
        description: data.description || undefined,
        website: data.website || undefined,
        industry: data.industry || undefined,
        organizationSize: data.organizationSize,
      })
      
      // Reset form dirty state
      reset(data)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  // Handler for updating general organization info
  const handleUpdateOrganization = async (data: any) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) throw new Error('Failed to update organization')
      
      toast({
        title: 'Settings updated',
        description: 'Organization settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Handler for updating complex settings (assets, compliance, notifications)
  const handleUpdateSettings = async (data: any) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) throw new Error('Failed to update settings')
      
      toast({
        title: 'Settings updated',
        description: 'Your settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const canEdit = userRole === 'owner' || userRole === 'admin'
  const canManageMembers = canEdit
  const canAccessDangerZone = userRole === 'owner'

  // Show loading while user is being fetched
  if (isUserLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading user information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check if user is authenticated
  if (!userId) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600">
              Please sign in to access organization settings.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !organization) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Organization
            </h3>
            <p className="text-gray-600">
              Unable to load organization settings. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
            <AvatarFallback>{getInitials(organization.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            <p className="text-muted-foreground">Organization Settings</p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">Assets</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden lg:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="members" 
            className="flex items-center space-x-2"
            disabled={!canManageMembers}
          >
            <Users className="h-4 w-4" />
            <span className="hidden lg:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger 
            value="invitations" 
            className="flex items-center space-x-2"
            disabled={!canManageMembers}
          >
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">Invitations</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden lg:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger 
            value="danger" 
            className="flex items-center space-x-2"
            disabled={!canAccessDangerZone}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden lg:inline">Danger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralTab
            organization={organization}
            canEdit={canEdit}
            onUpdate={handleUpdateOrganization}
          />
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <AssetSettingsTab
            settings={organization.settings?.assets || {
              categories: ['Board Documents', 'Financial Reports', 'Legal Documents', 'Other'],
              storageLimit: 100,
              approvalWorkflow: false,
              aiProcessing: true,
              defaultPermissions: 'organization',
              watermarking: true,
              retentionDays: 2555,
              autoClassification: true
            }}
            canEdit={canEdit}
            onUpdate={handleUpdateSettings}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceTab
            settings={organization.compliance_settings || {
              auditLogging: true,
              twoFactorRequired: false,
              dataEncryption: true,
              accessLogging: true,
              complianceStandards: []
            }}
            canEdit={canEdit}
            onUpdate={handleUpdateSettings}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab
            settings={organization.settings?.notifications || {
              emailUpdates: true,
              securityAlerts: true,
              weeklyReports: false,
              monthlyDigest: true,
              activityAlerts: true
            }}
            canEdit={canEdit}
            onUpdate={handleUpdateSettings}
          />
        </TabsContent>


        <TabsContent value="members">
          <MembersTab 
            organizationId={organizationId}
            userRole={userRole}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTab 
            organizationId={organizationId}
            userRole={userRole}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesTab 
            organizationId={organizationId}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZoneTab 
            organization={organization}
            userRole={userRole}
            userId={userId}
            onClose={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}