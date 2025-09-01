'use client'

import React from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import {
  IconBox,
  RoleBadge,
  RoleBadgeGroup,
  StatusBadge,
  StatusIndicator,
  PageHeader,
  SectionHeader,
  StatCard,
  StatCardGrid,
  MiniStat,
  ActionButton,
  ActionButtonGroup,
  IconButton,
  PageLoading,
  Alert,
  EmptyState,
} from '@/components/ui'
import { 
  Settings, 
  Users, 
  Shield, 
  TrendingUp, 
  Download,
  Plus,
  Edit,
  Trash,
  Share,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react'

export default function UIComponentsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="UI Components Library"
        subtitle="Reusable components for consistent design"
        description="A comprehensive collection of DESIGN_SPEC compliant components that ensure visual consistency across the platform."
        primaryAction={{
          label: 'View Documentation',
          icon: FileText,
          onClick: () => console.log('View docs'),
        }}
        secondaryActions={[
          {
            label: 'Export',
            icon: Download,
            onClick: () => console.log('Export'),
            variant: 'outline',
          }
        ]}
        metadata={[
          { label: 'Components', value: '6 Core', icon: Settings },
          { label: 'Usage', value: '29+ Instances', icon: Activity },
        ]}
      />

      <div className="p-6 space-y-8">
        {/* IconBox Examples */}
        <section>
          <SectionHeader
            title="IconBox Component"
            subtitle="Replaces 29+ inline icon container implementations"
          />
          <div className="bg-white rounded-lg border p-6">
            <div className="flex flex-wrap gap-4">
              <IconBox icon={Settings} variant="primary" />
              <IconBox icon={Users} variant="success" size="lg" />
              <IconBox icon={Shield} variant="error" shape="circle" />
              <IconBox icon={TrendingUp} variant="warning" interactive />
              <IconBox icon={Briefcase} variant="info" badge={5} />
              <IconBox 
                icon={Calendar} 
                variant="purple" 
                label="Calendar" 
                labelPosition="bottom"
              />
              <IconBox 
                icon={DollarSign} 
                variant="gradient" 
                size="xl" 
                glow
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Variants: default, primary, success, warning, error, info, gradient • 
              Sizes: xs, sm, md, lg, xl, 2xl • 
              Shapes: square, circle, rounded
            </p>
          </div>
        </section>

        {/* RoleBadge Examples */}
        <section>
          <SectionHeader
            title="RoleBadge Component"
            subtitle="Replaces 8+ role display implementations"
          />
          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <RoleBadge role="admin" />
                <RoleBadge role="director" variant="filled" />
                <RoleBadge role="manager" variant="outline" />
                <RoleBadge role="member" variant="soft" />
                <RoleBadge role="viewer" variant="ghost" />
                <RoleBadge role="owner" size="lg" />
                <RoleBadge role="executive" count={3} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Role Badge Group:</p>
                <RoleBadgeGroup 
                  roles={[
                    'admin',
                    { role: 'director', count: 5 },
                    'manager',
                    'member'
                  ]}
                  variant="soft"
                />
              </div>
            </div>
          </div>
        </section>

        {/* StatusBadge Examples */}
        <section>
          <SectionHeader
            title="StatusBadge Component"
            subtitle="Consistent status indicators across the platform"
          />
          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="active" />
                <StatusBadge status="pending" variant="filled" />
                <StatusBadge status="completed" variant="outline" />
                <StatusBadge status="failed" variant="soft" />
                <StatusBadge status="processing" />
                <StatusBadge status="approved" showDot />
                <StatusBadge status="high" pulse />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Status Indicator:</p>
                <StatusIndicator
                  status="processing"
                  title="Analysis in Progress"
                  description="Your document is being analyzed and will be ready shortly."
                />
              </div>
            </div>
          </div>
        </section>

        {/* StatCard Examples */}
        <section>
          <SectionHeader
            title="StatCard Component"
            subtitle="Displays metrics and KPIs consistently"
          />
          <StatCardGrid columns={4}>
            <StatCard
              title="Total Revenue"
              value="$45,231"
              subtitle="USD"
              icon={DollarSign}
              trend={{ value: 12.5, type: 'increase', label: 'vs last month' }}
            />
            <StatCard
              title="Active Users"
              value="2,345"
              icon={Users}
              iconColor="success"
              trend={{ value: 5.2, type: 'increase' }}
              variant="bordered"
              borderColor="border-success-500"
            />
            <StatCard
              title="Completion Rate"
              value="87%"
              icon={CheckCircle}
              iconColor="info"
              trend={{ value: 3.1, type: 'decrease' }}
              tooltip="Percentage of completed tasks"
            />
            <StatCard
              title="Alerts"
              value="12"
              icon={AlertCircle}
              iconColor="warning"
              variant="interactive"
              onClick={() => console.log('View alerts')}
            />
          </StatCardGrid>

          <div className="mt-4 bg-white rounded-lg border p-4 space-y-3">
            <p className="text-sm text-gray-600 mb-2">Mini Stats:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniStat label="Sessions" value="1,234" icon={Activity} trend={{ value: 5, type: 'increase' }} />
              <MiniStat label="Bounce Rate" value="32%" trend={{ value: 2, type: 'decrease' }} />
              <MiniStat label="Avg. Duration" value="3m 42s" />
              <MiniStat label="Pages/Session" value="4.2" trend={{ value: 0, type: 'neutral' }} />
            </div>
          </div>
        </section>

        {/* ActionButton Examples */}
        <section>
          <SectionHeader
            title="ActionButton Component"
            subtitle="Enhanced buttons with loading states and features"
          />
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <ActionButtonGroup>
              <ActionButton label="Create New" icon={Plus} />
              <ActionButton label="Loading..." loading loadingText="Processing..." />
              <ActionButton label="Success" success successText="Saved!" variant="outline" />
              <ActionButton label="With Badge" badge={3} />
              <ActionButton 
                label="With Tooltip" 
                tooltip="This action will create a new item"
                icon={Plus}
              />
              <ActionButton 
                label="External Link" 
                external 
                href="https://example.com"
              />
            </ActionButtonGroup>

            <div>
              <p className="text-sm text-gray-600 mb-2">Icon Buttons:</p>
              <ActionButtonGroup>
                <IconButton label="Edit" icon={Edit} variant="outline" />
                <IconButton label="Delete" icon={Trash} variant="destructive" />
                <IconButton label="Share" icon={Share} tooltip="Share this item" />
              </ActionButtonGroup>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Dropdown Button:</p>
              <ActionButton
                label="Actions"
                icon={Settings}
                dropdownItems={[
                  { label: 'Edit', icon: Edit, onClick: () => console.log('Edit') },
                  { label: 'Share', icon: Share, onClick: () => console.log('Share') },
                  { separator: true },
                  { label: 'Delete', icon: Trash, onClick: () => console.log('Delete'), destructive: true },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Alert & Empty State Examples */}
        <section>
          <SectionHeader
            title="Feedback Components"
            subtitle="Alerts, empty states, and error displays"
          />
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <Alert
                type="info"
                title="Information"
                message="This is an informational message to keep users informed."
              />
              <Alert
                type="success"
                title="Success!"
                message="Your changes have been saved successfully."
                action={{
                  label: 'View Changes',
                  onClick: () => console.log('View'),
                }}
              />
              <Alert
                type="warning"
                message="Your trial expires in 5 days. Upgrade now to keep all features."
              />
              <Alert
                type="error"
                title="Error Occurred"
                message="Failed to save changes. Please try again."
                onClose={() => console.log('Close')}
              />
            </div>

            <div className="bg-white rounded-lg border">
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="No team members yet"
                message="Invite your team members to collaborate on boards and meetings."
                action={{
                  label: 'Invite Members',
                  onClick: () => console.log('Invite'),
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}