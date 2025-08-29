'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/stores/auth-store'
import { useOrganizations } from '@/lib/stores/organization-store'
import ExecutiveDashboard from '@/components/executive/ExecutiveDashboard'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { AlertTriangle, Crown, Building, Shield, Target } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'

/**
 * Executive Dashboard Page
 * 
 * High-level governance intelligence dashboard for executives managing
 * multiple board positions and organizational oversight responsibilities.
 * Provides strategic insights, portfolio management, and real-time
 * governance monitoring capabilities.
 */

// Executive role mapping based on user context and organization roles
type ExecutiveRole = 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'

interface ExecutiveContext {
  role: ExecutiveRole
  organizations: string[]
  permissions: string[]
  totalBoardPositions: number
}

const ROLE_DEFINITIONS = {
  ceo: {
    title: 'Chief Executive Officer',
    description: 'Strategic oversight and executive decision-making across organizational portfolio',
    icon: Crown,
    color: 'bg-purple-500',
    minOrganizations: 1
  },
  board_chair: {
    title: 'Board Chair',
    description: 'Board governance and meeting coordination leadership',
    icon: Target,
    color: 'bg-blue-500',
    minOrganizations: 1
  },
  audit_committee: {
    title: 'Audit Committee Chair',
    description: 'Compliance oversight and risk management supervision',
    icon: Shield,
    color: 'bg-green-500',
    minOrganizations: 1
  },
  multi_org_executive: {
    title: 'Portfolio Executive',
    description: 'Multi-organization oversight and cross-board coordination',
    icon: Building,
    color: 'bg-orange-500',
    minOrganizations: 2
  }
}

export default function ExecutiveDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const organizations = useOrganizations()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executiveContext, setExecutiveContext] = useState<ExecutiveContext | null>(null)
  const [selectedRole, setSelectedRole] = useState<ExecutiveRole | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/signin')
        return
      }
      
      analyzeExecutiveContext()
    }
  }, [user, authLoading, organizations, router])

  const analyzeExecutiveContext = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        throw new Error('User not authenticated')
      }

      if (organizations.length === 0) {
        // User has no organizations - redirect to organization creation
        router.push('/dashboard/organizations?create=true')
        return
      }

      // Analyze user's roles across organizations to determine executive context
      const executiveRoles = await analyzeUserRoles(organizations.map(org => org.id))
      const context = determineExecutiveRole(executiveRoles)
      
      setExecutiveContext(context)
      
      // Auto-select appropriate role if only one option
      const availableRoles = getAvailableRoles(context)
      if (availableRoles.length === 1) {
        setSelectedRole(availableRoles[0])
      }

    } catch (err) {
      console.error('Executive context analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze executive context')
    } finally {
      setLoading(false)
    }
  }

  const analyzeUserRoles = async (organizationIds: string[]): Promise<any[]> => {
    try {
      // In a real implementation, this would analyze the user's roles across organizations
      // For demonstration, we'll simulate based on organization count and membership patterns
      
      return organizationIds.map(orgId => ({
        organizationId: orgId,
        role: organizations.find(org => org.id === orgId)?.user_role || 'member',
        permissions: ['read', 'write'], // Simplified permissions
        isOwner: organizations.find(org => org.id === orgId)?.user_role === 'owner',
        isAdmin: ['owner', 'admin'].includes(organizations.find(org => org.id === orgId)?.user_role || ''),
        memberCount: Math.floor(Math.random() * 15) + 5, // Synthetic member count
        meetingFrequency: Math.floor(Math.random() * 4) + 2 // Monthly meetings
      }))

    } catch (error) {
      console.error('Role analysis error:', error)
      return []
    }
  }

  const determineExecutiveRole = (roleAnalysis: any[]): ExecutiveContext => {
    const totalOrganizations = roleAnalysis.length
    const ownedOrganizations = roleAnalysis.filter(r => r.isOwner).length
    const adminOrganizations = roleAnalysis.filter(r => r.isAdmin).length
    const totalBoardPositions = adminOrganizations + ownedOrganizations

    // Determine primary executive role based on context
    let primaryRole: ExecutiveRole = 'multi_org_executive' // Default

    if (totalOrganizations === 1) {
      // Single organization - determine specific role
      const singleOrgRole = roleAnalysis[0]
      if (singleOrgRole.isOwner) {
        primaryRole = 'ceo'
      } else if (singleOrgRole.isAdmin) {
        primaryRole = 'board_chair'
      }
    } else if (totalOrganizations >= 2) {
      // Multiple organizations - portfolio management
      if (ownedOrganizations >= 2) {
        primaryRole = 'ceo' // CEO of multiple organizations
      } else {
        primaryRole = 'multi_org_executive'
      }
    }

    return {
      role: primaryRole,
      organizations: roleAnalysis.map(r => r.organizationId),
      permissions: ['executive_dashboard', 'analytics', 'reporting', 'portfolio_management'],
      totalBoardPositions
    }
  }

  const getAvailableRoles = (context: ExecutiveContext): ExecutiveRole[] => {
    const roles: ExecutiveRole[] = []
    
    // Always available if user has organizations
    if (context.organizations.length >= 1) {
      roles.push('board_chair', 'audit_committee')
    }
    
    // CEO role for owners
    const ownerOrganizations = organizations.filter(org => org.user_role === 'owner')
    if (ownerOrganizations.length >= 1) {
      roles.push('ceo')
    }
    
    // Multi-org executive for multiple organizations
    if (context.organizations.length >= 2) {
      roles.push('multi_org_executive')
    }
    
    return roles
  }

  const handleRoleSelection = (role: ExecutiveRole) => {
    setSelectedRole(role)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-5 w-96 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
          
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="mb-4">{error}</p>
                <div className="flex gap-3">
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Retry
                  </Button>
                  <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!executiveContext) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Alert>
            <Building className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="mb-4">Unable to determine executive context. Please ensure you have appropriate permissions and organizational access.</p>
                <Button onClick={() => router.push('/dashboard/organizations')} size="sm">
                  Manage Organizations
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!selectedRole) {
    const availableRoles = getAvailableRoles(executiveContext)
    
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto mt-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Executive Dashboard Role</h1>
            <p className="text-gray-600">Choose the executive perspective for your governance dashboard</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableRoles.map((role) => {
              const roleConfig = ROLE_DEFINITIONS[role]
              const Icon = roleConfig.icon
              
              return (
                <div
                  key={role}
                  onClick={() => handleRoleSelection(role)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${roleConfig.color} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {roleConfig.title}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {roleConfig.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {executiveContext.organizations.length} Organization{executiveContext.organizations.length > 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline">
                          {executiveContext.totalBoardPositions} Board Position{executiveContext.totalBoardPositions > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="text-center mt-8">
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Standard Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Role Selection Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${ROLE_DEFINITIONS[selectedRole].color} text-white`}>
                  {React.createElement(ROLE_DEFINITIONS[selectedRole].icon, { className: 'h-5 w-5' })}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {ROLE_DEFINITIONS[selectedRole].title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Executive Dashboard • {executiveContext.organizations.length} Organizations
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedRole} onValueChange={(value: ExecutiveRole) => setSelectedRole(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(executiveContext).map(role => (
                    <SelectItem key={role} value={role}>
                      {ROLE_DEFINITIONS[role].title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => router.push('/dashboard')} 
                variant="outline" 
                size="sm"
              >
                Standard View
              </Button>
            </div>
          </div>
        </div>

        {/* Executive Dashboard Component */}
        <ExecutiveDashboard 
          userRole={selectedRole}
          viewMode="strategic"
        />
      </div>
    </DashboardLayout>
  )
}