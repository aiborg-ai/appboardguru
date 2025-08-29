"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Building2, Loader2 } from "lucide-react"
import {
  useCreateOrganization,
  generateSlug,
  // organizationValidation
} from "@/hooks/useOrganizations"
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Form validation schema
const createOrganizationSchema = z.object({
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
  industry: z
    .string()
    .optional(),
  organizationSize: z
    .enum(['startup', 'small', 'medium', 'large', 'enterprise'])
    .optional(),
})

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (_organization: any) => void
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

export function CreateOrganizationModal({
  isOpen,
  onClose,
  onSuccess
}: CreateOrganizationModalProps) {
  const createOrganizationMutation = useCreateOrganization()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      website: '',
      industry: '',
      organizationSize: undefined,
    }
  })

  const watchedName = watch('name')
  const [slugManuallyModified, setSlugManuallyModified] = React.useState(false)

  // Auto-generate slug from name
  React.useEffect(() => {
    if (watchedName && !slugManuallyModified) {
      const newSlug = generateSlug(watchedName)
      setValue('slug', newSlug)
      // Validate the new slug
      trigger('slug')
    }
  }, [watchedName, slugManuallyModified, setValue, trigger])

  const handleSlugChange = (e: React.ChangeEvent<Element>) => {
    setSlugManuallyModified(true)
    const slug = (e.target as any).value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setValue('slug', slug)
    trigger('slug')
  }

  const onSubmit = async (data: CreateOrganizationFormData) => {
    try {
      const result = await createOrganizationMutation.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        website: data.website || undefined,
        industry: data.industry || undefined,
        organizationSize: data.organizationSize,
      })

      onSuccess?.(result)
      handleClose()
    } catch (_error) {
      // Error handling is done in the mutation
    }
  }

  const handleClose = () => {
    if (!isSubmitting && !createOrganizationMutation.isPending) {
      reset()
      setSlugManuallyModified(false)
      onClose()
    }
  }

  const isLoading = isSubmitting || createOrganizationMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <DialogTitle>Create Organization</DialogTitle>
          </div>
          <DialogDescription>
            Set up a new organization to manage your board materials and team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Acme Corporation"
                disabled={isLoading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Organization Slug <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  boardguru.com/
                </span>
                <Input
                  id="slug"
                  {...register('slug')}
                  onChange={handleSlugChange}
                  placeholder="acme-corp"
                  disabled={isLoading}
                  className={errors.slug ? 'border-red-500' : ''}
                />
              </div>
              {errors.slug && (
                <p className="text-sm text-red-600">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be used in your organization's URL and cannot be changed later.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of your organization..."
                rows={3}
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}