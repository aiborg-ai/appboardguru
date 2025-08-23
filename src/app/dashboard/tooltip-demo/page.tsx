"use client"

import React from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'
import { InfoTooltipEnhanced, InfoBadge } from '@/components/atoms/feedback/info-tooltip-enhanced'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { 
  Target, Shield, Users, TrendingUp, FileText, Upload, Plus, Brain,
  BarChart3, Search, Settings, Calendar, MessageSquare, Vault, Building2,
  CheckCircle, AlertTriangle, Info, HelpCircle
} from 'lucide-react'

export default function TooltipDemoPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header with InfoTooltip */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">InfoTooltip Demo & Showcase</h1>
            <InfoTooltip
              content={
                <InfoSection
                  title="Interactive Demo Page"
                  description="This page showcases the comprehensive InfoTooltip system implemented throughout BoardGuru."
                  features={[
                    "Enhanced visibility with blue styling and animations",
                    "Rich content with InfoSection components",
                    "Multiple sizes and positions",
                    "Pulse animations for attention",
                    "Consistent accessibility features"
                  ]}
                  tips={[
                    "Hover over any blue info icon to see tooltips in action",
                    "Notice the smooth animations and professional styling",
                    "Check various tooltip positions and sizes",
                    "All tooltips include helpful tips and feature lists"
                  ]}
                />
              }
              side="bottom"
              size="lg"
              className="text-white hover:text-blue-200 bg-white/20 hover:bg-white/30 border-white/30"
            />
          </div>
          <p className="text-blue-100 mt-2">Comprehensive showcase of all InfoTooltip variations and features</p>
        </div>

        {/* Live Dashboard Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📍 Live Implementation Examples
                <InfoTooltip
                  content="These are the actual InfoTooltips deployed across the BoardGuru dashboard pages."
                  size="sm"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">InfoTooltips are now live on these pages:</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Dashboard</span>
                    </div>
                    <InfoTooltip content="Main dashboard with header and metric tooltips" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Vault className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Vaults</span>
                    </div>
                    <InfoTooltip content="Vault management with creation process tooltips" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Assets</span>
                    </div>
                    <InfoTooltip content="Asset management with upload and view mode tooltips" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">BoardChat</span>
                    </div>
                    <InfoTooltip content="Communication features with security explanations" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Calendar</span>
                    </div>
                    <InfoTooltip content="Meeting management with view mode and export tooltips" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm">BoardMates</span>
                    </div>
                    <InfoTooltip content="Member management with role and permission tooltips" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-pink-600" />
                      <span className="text-sm">AI Assistant</span>
                    </div>
                    <InfoTooltip content="AI chat with context and feature explanations" size="sm" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Settings</span>
                    </div>
                    <InfoTooltip content="Application settings with detailed tab descriptions" size="sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎨 Styling Features
                <InfoTooltip
                  content="Visual enhancements that make InfoTooltips highly visible and professional."
                  size="sm"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Size Variations</p>
                  <div className="flex items-center gap-2">
                    <InfoTooltip content="Small (h-4 w-4)" size="sm" />
                    <InfoTooltip content="Medium (h-5 w-5)" size="md" />
                    <InfoTooltip content="Large (h-6 w-6)" size="lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Visual Effects</p>
                  <div className="flex items-center gap-2">
                    <InfoTooltip content="Blue background with shadow" />
                    <InfoTooltipEnhanced content="Enhanced with pulse!" pulse={true} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Content Types</p>
                <div className="flex flex-wrap gap-2">
                  <InfoTooltip content="Simple text tooltip" />
                  <InfoTooltip
                    content={<InfoSection title="Rich Content" description="With sections and features" features={["Feature 1", "Feature 2"]} />}
                  />
                  <InfoBadge content="Badge Style" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✅ Implementation Summary
              <InfoTooltip
                content="Comprehensive overview of the InfoTooltip system deployment across BoardGuru."
                size="sm"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  Technical Improvements
                  <InfoTooltip content="Core technical enhancements for better functionality and performance" size="sm" />
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Global TooltipProvider in app layout</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Enhanced component styling with blue theme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Increased icon sizes for visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Hover animations and shadow effects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Accessibility with ARIA labels</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  Content Features
                  <InfoTooltip content="Rich content system for comprehensive user guidance" size="sm" />
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>InfoSection with structured content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Feature lists with checkmark icons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Tips section with lightbulb icons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Improved typography and spacing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Context-specific explanations</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  User Experience
                  <InfoTooltip content="Enhancements that improve user adoption and feature discovery" size="sm" />
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Highly visible blue circular buttons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Strategic placement next to key features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Comprehensive feature explanations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Helpful tips and best practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Consistent behavior across all pages</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">InfoTooltips Successfully Deployed!</h3>
              <p className="text-green-700">The comprehensive InfoTooltip system is now live across all dashboard pages.</p>
            </div>
            <InfoTooltip
              content="InfoTooltips are now fully operational and providing helpful guidance to users throughout the application."
              size="sm"
              className="bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-800 border-green-300"
            />
          </div>
          <div className="text-sm text-green-800">
            <p><strong>Next Steps:</strong> Navigate to any dashboard page and look for the blue info icons. Hover over them to experience the enhanced tooltips with rich content, smooth animations, and helpful guidance.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}