"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useUserOrganizations } from "@/hooks/useOrganizations"
import { Button } from "@/features/shared/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/features/shared/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/features/shared/ui/avatar"
import { Badge } from "@/features/shared/ui/badge"
import { cn } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { Database } from "@/types/database"

type OrganizationWithRole = Database['public']['Tables']['organizations']['Row'] & {
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  membershipStatus: 'active' | 'suspended' | 'pending_activation'
}

interface OrganizationSelectorProps {
  selectedOrganizationId?: string
  onOrganizationChange?: (organization: OrganizationWithRole) => void
  onCreateNew?: () => void
  className?: string
  disabled?: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case 'owner':
      return "default"
    case 'admin':
      return "secondary"
    case 'member':
      return "outline"
    case 'viewer':
      return "outline"
    default:
      return "outline"
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'owner':
      return "text-purple-600"
    case 'admin':
      return "text-red-600"
    case 'member':
      return "text-blue-600"
    case 'viewer':
      return "text-gray-600"
    default:
      return "text-gray-600"
  }
}

export function OrganizationSelector({
  selectedOrganizationId,
  onOrganizationChange,
  onCreateNew,
  className,
  disabled = false
}: OrganizationSelectorProps) {
  const [userId, setUserId] = React.useState<string>("")
  const [open, setOpen] = React.useState(false)

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

  const { data: organizations = [], isLoading, error } = useUserOrganizations(userId)

  const selectedOrganization = organizations.find(
    org => org.id === selectedOrganizationId
  )

  const handleSelect = (organization: OrganizationWithRole) => {
    onOrganizationChange?.(organization)
    setOpen(false)
  }

  const handleCreateNew = () => {
    onCreateNew?.()
    setOpen(false)
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        className={cn(
          "w-full justify-between",
          className
        )}
      >
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" />
          <span className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  if (error) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn(
          "w-full justify-between text-red-600",
          className
        )}
      >
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Error loading organizations</span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select organization"
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedOrganization && "text-muted-foreground",
            className
          )}
        >
          {selectedOrganization ? (
            <div className="flex items-center space-x-3 min-w-0">
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={selectedOrganization.logo_url || undefined} 
                  alt={selectedOrganization.name}
                />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedOrganization.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-medium truncate">
                  {selectedOrganization.name}
                </span>
                <Badge 
                  variant={getRoleBadgeVariant(selectedOrganization.userRole)}
                  className={cn("text-xs h-4 px-1", getRoleColor(selectedOrganization.userRole))}
                >
                  {selectedOrganization.userRole}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Select organization...</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[300px]">
        {organizations.length > 0 && (
          <>
            <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
            {organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => handleSelect(organization)}
                className="flex items-center space-x-3 p-3 cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={organization.logo_url || undefined}
                    alt={organization.name}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(organization.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {organization.name}
                    </span>
                    {selectedOrganizationId === organization.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge 
                      variant={getRoleBadgeVariant(organization.userRole)}
                      className={cn("text-xs h-4 px-1", getRoleColor(organization.userRole))}
                    >
                      {organization.userRole}
                    </Badge>
                    {organization.membershipStatus !== 'active' && (
                      <Badge variant="destructive" className="text-xs h-4 px-1">
                        {organization.membershipStatus}
                      </Badge>
                    )}
                  </div>
                  {organization.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {organization.description}
                    </p>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            {onCreateNew && <DropdownMenuSeparator />}
          </>
        )}
        
        {onCreateNew && (
          <DropdownMenuItem
            onSelect={handleCreateNew}
            className="flex items-center space-x-3 p-3 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <span className="font-medium">Create Organization</span>
              <p className="text-xs text-muted-foreground">
                Start a new organization
              </p>
            </div>
          </DropdownMenuItem>
        )}

        {organizations.length === 0 && !onCreateNew && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No organizations found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}