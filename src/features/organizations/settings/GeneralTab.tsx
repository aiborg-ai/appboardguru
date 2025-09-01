'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Save, Loader2, Globe, Building2, Users, Link as LinkIcon } from 'lucide-react'

// Form validation schema
const generalSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
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
  organization_size: z
    .enum(['startup', 'small', 'medium', 'large', 'enterprise'])
    .optional(),
})

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>

interface GeneralTabProps {
  organization: any
  canEdit: boolean
  onUpdate: (data: any) => Promise<void>
}

const industries = [
  'Technology',
  'Finance & Banking',
  'Healthcare & Life Sciences',
  'Education',
  'Manufacturing',
  'Retail & E-commerce',
  'Real Estate',
  'Legal Services',
  'Consulting',
  'Media & Entertainment',
  'Energy & Utilities',
  'Transportation & Logistics',
  'Food & Beverage',
  'Non-Profit',
  'Government',
  'Other'
]

const organizationSizes = [
  { value: 'startup', label: 'Startup', description: '1-10 employees' },
  { value: 'small', label: 'Small Business', description: '11-50 employees' },
  { value: 'medium', label: 'Medium Business', description: '51-250 employees' },
  { value: 'large', label: 'Large Business', description: '251-1000 employees' },
  { value: 'enterprise', label: 'Enterprise', description: '1000+ employees' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function GeneralTab({ organization, canEdit, onUpdate }: GeneralTabProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = React.useState(false)
  const [logoUrl, setLogoUrl] = React.useState(organization.logo_url || '')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      description: organization.description || '',
      website: organization.website || '',
      industry: organization.industry || '',
      organization_size: organization.organization_size || undefined,
    }
  })

  const onSubmit = async (data: GeneralSettingsFormData) => {
    try {
      await onUpdate({
        ...data,
        logo_url: logoUrl
      })
      
      reset(data)
      toast({
        title: 'Settings updated',
        description: 'Your organization settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    
    try {
      // In a real implementation, you would upload to storage here
      // For now, we'll create a local URL
      const url = URL.createObjectURL(file)
      setLogoUrl(url)
      
      toast({
        title: 'Logo uploaded',
        description: 'Your organization logo has been updated.',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Basic information about your organization that appears across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Logo */}
            <div className="space-y-2">
              <Label>Organization Logo</Label>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={logoUrl} alt={organization.name} />
                  <AvatarFallback>{getInitials(organization.name)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || isUploading}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Logo
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrl('')}
                        disabled={!canEdit}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 200x200px, max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization Name
              </Label>
              <Input
                id="name"
                {...register('name')}
                disabled={!canEdit}
                placeholder="Enter organization name"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL Slug
              </Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">boardguru.ai/</span>
                <Input
                  id="slug"
                  {...register('slug')}
                  disabled={!canEdit}
                  placeholder="organization-slug"
                  className="flex-1"
                />
              </div>
              {errors.slug && (
                <p className="text-sm text-red-600">{errors.slug.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                disabled={!canEdit}
                placeholder="Describe your organization..."
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={watch('industry')}
                onValueChange={(value) => setValue('industry', value, { shouldDirty: true })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Organization Size */}
            <div className="space-y-2">
              <Label htmlFor="organization_size" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Organization Size
              </Label>
              <Select
                value={watch('organization_size')}
                onValueChange={(value) => setValue('organization_size', value as any, { shouldDirty: true })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization size" />
                </SelectTrigger>
                <SelectContent>
                  {organizationSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      <div>
                        <div className="font-medium">{size.label}</div>
                        <div className="text-xs text-muted-foreground">{size.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                {...register('website')}
                disabled={!canEdit}
                placeholder="https://example.com"
                type="url"
              />
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            {/* Submit Button */}
            {canEdit && (
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={!isDirty || isSubmitting}
                  className="min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}