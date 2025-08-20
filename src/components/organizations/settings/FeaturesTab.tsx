"use client"

import * as React from "react"
import { 
  Shield, 
  Zap, 
  Users, 
  Database, 
  Key,
  Palette,
  Crown,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface FeaturesTabProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
}

// Mock organization features data - in real app this would come from API
const mockFeatures = {
  ai_summarization: true,
  advanced_permissions: true,
  sso_enabled: false,
  audit_logs: true,
  api_access: false,
  white_label: false,
  max_board_packs: 50,
  max_file_size_mb: 100,
  max_storage_gb: 10,
  current_board_packs: 12,
  current_storage_gb: 3.2,
  plan_type: 'professional' as const,
  subscription_ends_at: '2024-12-31T23:59:59.000Z'
}

const planFeatures = {
  free: {
    name: 'Free',
    color: 'text-gray-600',
    maxBoardPacks: 5,
    maxStorageGB: 1,
    maxFileSizeMB: 25,
    features: ['ai_summarization'],
    price: '$0/month'
  },
  professional: {
    name: 'Professional', 
    color: 'text-blue-600',
    maxBoardPacks: 50,
    maxStorageGB: 10,
    maxFileSizeMB: 100,
    features: ['ai_summarization', 'advanced_permissions', 'audit_logs'],
    price: '$49/month'
  },
  enterprise: {
    name: 'Enterprise',
    color: 'text-purple-600',
    maxBoardPacks: -1, // unlimited
    maxStorageGB: 100,
    maxFileSizeMB: 500,
    features: ['ai_summarization', 'advanced_permissions', 'sso_enabled', 'audit_logs', 'api_access', 'white_label'],
    price: '$199/month'
  }
}

const featureDescriptions = {
  ai_summarization: {
    name: 'AI Document Summarization',
    description: 'Automatically generate summaries of board pack documents',
    icon: <Zap className="h-5 w-5" />
  },
  advanced_permissions: {
    name: 'Advanced Permissions',
    description: 'Fine-grained access control and custom roles',
    icon: <Shield className="h-5 w-5" />
  },
  sso_enabled: {
    name: 'Single Sign-On (SSO)',
    description: 'Integrate with your organization\'s identity provider',
    icon: <Key className="h-5 w-5" />
  },
  audit_logs: {
    name: 'Audit Logs',
    description: 'Detailed logging of all user activities',
    icon: <Database className="h-5 w-5" />
  },
  api_access: {
    name: 'API Access',
    description: 'Programmatic access to your organization\'s data',
    icon: <Users className="h-5 w-5" />
  },
  white_label: {
    name: 'White Label',
    description: 'Custom branding and domain for your organization',
    icon: <Palette className="h-5 w-5" />
  }
}

export function FeaturesTab({ organizationId, userRole }: FeaturesTabProps) {
  // In real app, this would fetch from API
  const features = mockFeatures
  const currentPlan = planFeatures[features.plan_type]
  
  const storagePercentage = (features.current_storage_gb / features.max_storage_gb) * 100
  const boardPacksPercentage = (features.current_board_packs / features.max_board_packs) * 100

  const canManageBilling = userRole === 'owner'

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5" />
                <span>Current Plan</span>
              </CardTitle>
              <CardDescription>
                Your organization's current subscription and limits.
              </CardDescription>
            </div>
            {canManageBilling && (
              <Button variant="outline">
                Manage Billing
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={cn("text-2xl font-bold", currentPlan.color)}>
                {currentPlan.name}
              </h3>
              <p className="text-lg text-muted-foreground">{currentPlan.price}</p>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              Active
            </Badge>
          </div>

          {features.subscription_ends_at && (
            <div className="text-sm text-muted-foreground">
              <Info className="inline h-4 w-4 mr-1" />
              Renews on {new Date(features.subscription_ends_at).toLocaleDateString()}
            </div>
          )}

          <Separator />

          {/* Usage Statistics */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Board Packs</span>
                <span className="text-sm text-muted-foreground">
                  {features.current_board_packs} / {features.max_board_packs === -1 ? '∞' : features.max_board_packs}
                </span>
              </div>
              <Progress 
                value={boardPacksPercentage} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">
                  {features.current_storage_gb.toFixed(1)} GB / {features.max_storage_gb} GB
                </span>
              </div>
              <Progress 
                value={storagePercentage} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature List */}
      <Card>
        <CardHeader>
          <CardTitle>Features & Capabilities</CardTitle>
          <CardDescription>
            Features available with your current plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(featureDescriptions).map(([key, feature]) => {
              const isEnabled = features[key as keyof typeof features]
              const isAvailableInPlan = currentPlan.features.includes(key)
              
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg",
                    !isAvailableInPlan && "opacity-60"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      isEnabled 
                        ? "bg-green-100 text-green-600" 
                        : isAvailableInPlan 
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-gray-100 text-gray-400"
                    )}>
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isEnabled ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    ) : isAvailableInPlan ? (
                      <div className="flex items-center space-x-1 text-yellow-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Available</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Upgrade Required
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>
            Compare features across different plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(planFeatures).map(([planKey, plan]) => {
              const isCurrentPlan = planKey === features.plan_type
              
              return (
                <div
                  key={planKey}
                  className={cn(
                    "border rounded-lg p-4 space-y-4",
                    isCurrentPlan && "border-blue-200 bg-blue-50"
                  )}
                >
                  <div className="text-center">
                    <h3 className={cn("text-xl font-bold", plan.color)}>
                      {plan.name}
                    </h3>
                    <p className="text-lg text-muted-foreground">{plan.price}</p>
                    {isCurrentPlan && (
                      <Badge className="mt-2">Current Plan</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Board Packs</span>
                      <span className="font-medium">
                        {plan.maxBoardPacks === -1 ? 'Unlimited' : plan.maxBoardPacks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage</span>
                      <span className="font-medium">{plan.maxStorageGB} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max File Size</span>
                      <span className="font-medium">{plan.maxFileSizeMB} MB</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {Object.entries(featureDescriptions).map(([key, feature]) => {
                      const included = plan.features.includes(key)
                      return (
                        <div
                          key={key}
                          className="flex items-center space-x-2 text-sm"
                        >
                          {included ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" />
                          )}
                          <span className={included ? "" : "text-muted-foreground"}>
                            {feature.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {!isCurrentPlan && canManageBilling && (
                    <Button className="w-full" variant="outline">
                      {planKey === 'free' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}