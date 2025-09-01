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

// Import sub-components (we'll create these next)
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
  const [userId, setUserId] = React.useState<string>("")
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState("general")

  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Fetch organization data
  const { data: organization, isLoading, error } = useOrganization(organizationId, userId)
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

  const canEdit = userRole === 'owner' || userRole === 'admin'
  const canManageMembers = canEdit
  const canAccessDangerZone = userRole === 'owner'

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger 
            value="members" 
            className="flex items-center space-x-2"
            disabled={!canManageMembers}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger 
            value="invitations" 
            className="flex items-center space-x-2"
            disabled={!canManageMembers}
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Invitations</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger 
            value="danger" 
            className="flex items-center space-x-2"
            disabled={!canAccessDangerZone}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information about your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmitGeneral)} className="space-y-4">
                {/* Organization Logo */}
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={organization.logo_url || undefined} alt={organization.name} />
                      <AvatarFallback>{getInitials(organization.name)}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" disabled={!canEdit}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 256x256 pixels
                  </p>
                </div>

                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    disabled={!canEdit}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Organization Slug (read-only) */}
                <div className="space-y-2">
                  <Label>Organization URL</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      boardguru.com/
                    </span>
                    <Input
                      value={organization.slug}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Organization URL cannot be changed after creation.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    disabled={!canEdit}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    {...register('website')}
                    type="url"
                    placeholder="https://example.com"
                    disabled={!canEdit}
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    onValueChange={(value) => setValue('industry', value)}
                    value={watch('industry') || ''}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonIndustries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Organization Size */}
                <div className="space-y-2">
                  <Label htmlFor="organizationSize">Organization Size</Label>
                  <Select
                    onValueChange={(value: string) => setValue('organizationSize', value as any)}
                    value={watch('organizationSize') || ''}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization size" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canEdit && (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={!isDirty || isSubmitting || updateOrganizationMutation.isPending}
                    >
                      {(isSubmitting || updateOrganizationMutation.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
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