'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { 
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Calendar,
  Activity,
  Tag,
  Zap,
  Clock,
  Star,
  TrendingUp,
  Bookmark
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/features/shared/ui/collapsible'
import { cn } from '@/lib/utils'
import { Organization } from '@/types/entities/organization.types'
import { INDUSTRIES, ORGANIZATION_SIZES } from '@/features/organizations/types'

export interface FilterState {
  industries: string[]
  sizes: string[]
  roles: string[]
  statuses: string[]
  memberCountRange: [number, number]
  dateRange: {
    from?: Date
    to?: Date
  }
  lastActivityDays?: number
  preset?: string
}

export interface FilterPreset {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  filters: Partial<FilterState>
  isDefault?: boolean
}

export interface FilterPanelProps {
  organizations: Organization[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  className?: string
  compact?: boolean
  presets?: FilterPreset[]
  onPresetSave?: (name: string, filters: FilterState) => void
  onPresetDelete?: (presetId: string) => void
}

const defaultPresets: FilterPreset[] = [
  {
    id: 'my-orgs',
    name: 'My Organizations',
    description: 'Organizations where I am owner or admin',
    icon: Star,
    filters: {
      roles: ['owner', 'admin']
    },
    isDefault: true
  },
  {
    id: 'active-recent',
    name: 'Recently Active',
    description: 'Organizations with recent activity',
    icon: Clock,
    filters: {
      statuses: ['active'],
      lastActivityDays: 30
    },
    isDefault: true
  },
  {
    id: 'large-teams',
    name: 'Large Teams',
    description: 'Organizations with 50+ members',
    icon: Users,
    filters: {
      memberCountRange: [50, 1000],
      sizes: ['large', 'enterprise']
    },
    isDefault: true
  },
  {
    id: 'tech-companies',
    name: 'Tech Companies',
    description: 'Technology and software organizations',
    icon: TrendingUp,
    filters: {
      industries: ['Technology', 'Software']
    },
    isDefault: true
  }
]

interface FilterSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string | number
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badge
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="flex items-center space-x-3">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="mt-3 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface FilterCheckboxProps {
  label: string
  value: string
  checked: boolean
  onChange: (checked: boolean) => void
  count?: number
  disabled?: boolean
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({
  label,
  value,
  checked,
  onChange,
  count,
  disabled = false
}) => {
  return (
    <label 
      className={cn(
        "flex items-center justify-between space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      {count !== undefined && (
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      )}
    </label>
  )
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  organizations,
  filters,
  onFiltersChange,
  className,
  compact = false,
  presets = defaultPresets,
  onPresetSave,
  onPresetDelete
}) => {
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  // Calculate filter statistics
  const filterStats = useMemo(() => {
    const stats = {
      industries: new Map<string, number>(),
      sizes: new Map<string, number>(),
      roles: new Map<string, number>(),
      statuses: new Map<string, number>()
    }

    organizations.forEach(org => {
      // Industries
      if (org.industry) {
        stats.industries.set(org.industry, (stats.industries.get(org.industry) || 0) + 1)
      }

      // Organization sizes
      if (org.organization_size) {
        stats.sizes.set(org.organization_size, (stats.sizes.get(org.organization_size) || 0) + 1)
      }

      // Roles
      const role = (org as any).role || 'member'
      stats.roles.set(role, (stats.roles.get(role) || 0) + 1)

      // Statuses
      const status = (org as any).status || 'active'
      stats.statuses.set(status, (stats.statuses.get(status) || 0) + 1)
    })

    return stats
  }, [organizations])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.industries.length > 0) count++
    if (filters.sizes.length > 0) count++
    if (filters.roles.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.lastActivityDays) count++
    return count
  }, [filters])

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const handleArrayFilterToggle = (
    key: keyof Pick<FilterState, 'industries' | 'sizes' | 'roles' | 'statuses'>,
    value: string
  ) => {
    const currentArray = filters[key]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    updateFilters({ [key]: newArray })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      industries: [],
      sizes: [],
      roles: [],
      statuses: [],
      memberCountRange: [0, 1000],
      dateRange: {},
      preset: undefined
    })
  }

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange({
      ...filters,
      ...preset.filters,
      preset: preset.id
    })
  }

  const handleSavePreset = () => {
    if (newPresetName.trim() && onPresetSave) {
      onPresetSave(newPresetName.trim(), filters)
      setNewPresetName('')
      setShowPresetDialog(false)
    }
  }

  return (
    <Card className={cn("w-80", compact && "w-72", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filter Presets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Quick Filters</Label>
            {onPresetSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresetDialog(true)}
                className="text-xs h-6 px-2"
              >
                <Bookmark className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {presets.map(preset => {
              const Icon = preset.icon
              const isActive = filters.preset === preset.id
              
              return (
                <Button
                  key={preset.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2 justify-start h-auto p-3",
                    !isActive && "hover:bg-gray-50"
                  )}
                  onClick={() => applyPreset(preset)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-medium text-xs truncate">{preset.name}</div>
                    <div className="text-xs text-gray-500 truncate">{preset.description}</div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Industry Filter */}
        <FilterSection 
          title="Industry" 
          icon={Building2}
          badge={filters.industries.length > 0 ? filters.industries.length : undefined}
          defaultOpen={filters.industries.length > 0}
        >
          <div className="max-h-48 overflow-y-auto space-y-1">
            {INDUSTRIES.map(industry => {
              const count = filterStats.industries.get(industry) || 0
              return (
                <FilterCheckbox
                  key={industry}
                  label={industry}
                  value={industry}
                  checked={filters.industries.includes(industry)}
                  onChange={(checked) => handleArrayFilterToggle('industries', industry)}
                  count={count}
                  disabled={count === 0}
                />
              )
            })}
          </div>
        </FilterSection>

        <Separator />

        {/* Organization Size Filter */}
        <FilterSection 
          title="Organization Size" 
          icon={Users}
          badge={filters.sizes.length > 0 ? filters.sizes.length : undefined}
          defaultOpen={filters.sizes.length > 0}
        >
          <div className="space-y-1">
            {ORGANIZATION_SIZES.map(({ value, label, description }) => {
              const count = filterStats.sizes.get(value) || 0
              return (
                <FilterCheckbox
                  key={value}
                  label={`${label} (${description})`}
                  value={value}
                  checked={filters.sizes.includes(value)}
                  onChange={(checked) => handleArrayFilterToggle('sizes', value)}
                  count={count}
                  disabled={count === 0}
                />
              )
            })}
          </div>
        </FilterSection>

        <Separator />

        {/* Role Filter */}
        <FilterSection 
          title="My Role" 
          icon={Tag}
          badge={filters.roles.length > 0 ? filters.roles.length : undefined}
          defaultOpen={filters.roles.length > 0}
        >
          <div className="space-y-1">
            {[
              { value: 'owner', label: 'Owner', description: 'Full administrative access' },
              { value: 'admin', label: 'Admin', description: 'Administrative access' },
              { value: 'member', label: 'Member', description: 'Standard access' },
              { value: 'viewer', label: 'Viewer', description: 'Read-only access' }
            ].map(({ value, label, description }) => {
              const count = filterStats.roles.get(value) || 0
              return (
                <FilterCheckbox
                  key={value}
                  label={label}
                  value={value}
                  checked={filters.roles.includes(value)}
                  onChange={(checked) => handleArrayFilterToggle('roles', value)}
                  count={count}
                  disabled={count === 0}
                />
              )
            })}
          </div>
        </FilterSection>

        <Separator />

        {/* Status Filter */}
        <FilterSection 
          title="Status" 
          icon={Activity}
          badge={filters.statuses.length > 0 ? filters.statuses.length : undefined}
          defaultOpen={filters.statuses.length > 0}
        >
          <div className="space-y-1">
            {[
              { value: 'active', label: 'Active', description: 'Currently operational' },
              { value: 'pending', label: 'Pending', description: 'Awaiting activation' },
              { value: 'suspended', label: 'Suspended', description: 'Temporarily disabled' }
            ].map(({ value, label, description }) => {
              const count = filterStats.statuses.get(value) || 0
              return (
                <FilterCheckbox
                  key={value}
                  label={label}
                  value={value}
                  checked={filters.statuses.includes(value)}
                  onChange={(checked) => handleArrayFilterToggle('statuses', value)}
                  count={count}
                  disabled={count === 0}
                />
              )
            })}
          </div>
        </FilterSection>

        <Separator />

        {/* Member Count Range */}
        <FilterSection 
          title="Member Count" 
          icon={Users}
          badge={
            filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000 
              ? `${filters.memberCountRange[0]}-${filters.memberCountRange[1]}` 
              : undefined
          }
          defaultOpen={filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="min-members" className="text-xs">Min</Label>
                <Input
                  id="min-members"
                  type="number"
                  value={filters.memberCountRange[0]}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value) || 0)
                    updateFilters({ 
                      memberCountRange: [value, Math.max(value, filters.memberCountRange[1])]
                    })
                  }}
                  className="text-xs"
                  min={0}
                  max={1000}
                />
              </div>
              <div>
                <Label htmlFor="max-members" className="text-xs">Max</Label>
                <Input
                  id="max-members"
                  type="number"
                  value={filters.memberCountRange[1]}
                  onChange={(e) => {
                    const value = Math.min(1000, parseInt(e.target.value) || 1000)
                    updateFilters({ 
                      memberCountRange: [Math.min(filters.memberCountRange[0], value), value]
                    })
                  }}
                  className="text-xs"
                  min={0}
                  max={1000}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1000+</span>
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Last Activity */}
        <FilterSection 
          title="Last Activity" 
          icon={Clock}
          badge={filters.lastActivityDays ? `${filters.lastActivityDays} days` : undefined}
          defaultOpen={!!filters.lastActivityDays}
        >
          <div className="space-y-2">
            {[
              { value: undefined, label: 'Any time' },
              { value: 7, label: 'Last 7 days' },
              { value: 30, label: 'Last 30 days' },
              { value: 90, label: 'Last 3 months' },
              { value: 365, label: 'Last year' }
            ].map(({ value, label }) => (
              <label key={label} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="lastActivity"
                  checked={filters.lastActivityDays === value}
                  onChange={() => updateFilters({ lastActivityDays: value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Save Preset Dialog */}
        <AnimatePresence>
          {showPresetDialog && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowPresetDialog(false)}
            >
              <div 
                className="bg-white rounded-lg p-6 w-80 mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Enter preset name..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPresetDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim()}
                    >
                      Save Preset
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default FilterPanel