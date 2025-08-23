"use client"

import React from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'
import { InfoTooltipEnhanced, InfoBadge } from '@/components/atoms/feedback/info-tooltip-enhanced'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Info, HelpCircle, Settings, Users, Shield } from 'lucide-react'

export default function TooltipTestPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">InfoTooltip Test Page</h1>
          <p className="text-gray-600">Testing various InfoTooltip implementations and styles</p>
        </div>

        {/* Basic Tooltip Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Basic InfoTooltips
              <InfoTooltip
                content="This is a simple tooltip with basic text content. It should appear on hover with enhanced blue styling."
                size="sm"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span>Small size:</span>
              <InfoTooltip
                content="Small tooltip example"
                size="sm"
              />
              
              <span>Medium size:</span>
              <InfoTooltip
                content="Medium tooltip example"
                size="md"
              />
              
              <span>Large size:</span>
              <InfoTooltip
                content="Large tooltip example"
                size="lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* InfoSection Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              InfoSection Examples
              <InfoTooltip
                content={
                  <InfoSection
                    title="Advanced Tooltip Content"
                    description="This shows how InfoSections provide structured, comprehensive information with features and tips."
                    features={[
                      "Rich formatted content with titles and descriptions",
                      "Feature lists with checkmark icons",
                      "Tip sections with lightbulb icons",
                      "Consistent styling and spacing"
                    ]}
                    tips={[
                      "Use InfoSections for complex explanations",
                      "Keep content concise but informative",
                      "Group related information logically"
                    ]}
                  />
                }
                side="bottom"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Settings</span>
                <InfoTooltip
                  content="Access system configuration and preferences"
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded">
                <Users className="h-5 w-5 text-green-600" />
                <span>Team Members</span>
                <InfoTooltip
                  content="Manage team members and their permissions"
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded">
                <Shield className="h-5 w-5 text-purple-600" />
                <span>Security</span>
                <InfoTooltip
                  content="Security settings and compliance controls"
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tooltips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Enhanced Tooltips with Pulse
              <InfoTooltipEnhanced
                content="This enhanced tooltip includes a pulse animation to draw attention!"
                pulse={true}
                size="md"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span>With pulse animation:</span>
              <InfoTooltipEnhanced
                content="I have a pulsing animation!"
                pulse={true}
                size="sm"
              />
              
              <span>Without pulse:</span>
              <InfoTooltipEnhanced
                content="I'm static but still enhanced"
                pulse={false}
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <span>Info badge:</span>
              <InfoBadge content="New Feature!" />
              <InfoBadge content="Updated" className="bg-green-100 text-green-800 border-green-200" />
            </div>
          </CardContent>
        </Card>

        {/* Different Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Tooltip Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-8 p-8">
                <div></div>
                <div className="flex justify-center">
                  <InfoTooltip
                    content="Top position tooltip"
                    side="top"
                  />
                </div>
                <div></div>
                
                <div className="flex justify-center">
                  <InfoTooltip
                    content="Left position tooltip"
                    side="left"
                  />
                </div>
                <div className="flex justify-center items-center text-gray-500">
                  Center
                </div>
                <div className="flex justify-center">
                  <InfoTooltip
                    content="Right position tooltip"
                    side="right"
                  />
                </div>
                
                <div></div>
                <div className="flex justify-center">
                  <InfoTooltip
                    content="Bottom position tooltip"
                    side="bottom"
                  />
                </div>
                <div></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}