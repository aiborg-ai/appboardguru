'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { ItemCard } from '@/features/shared/components/views'
import { 
  FileText,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  BarChart3,
  Play,
  Calendar,
  Sparkles,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Search,
  BookOpen,
  Award,
  Gauge
} from 'lucide-react'

// Instruments configuration with descriptions and routing
const INSTRUMENTS = [
  {
    id: 'board-pack-ai',
    title: 'Board Pack AI',
    description: 'AI-powered analysis and summarization of board documents with intelligent insights and recommendations.',
    icon: Brain,
    iconColor: 'text-purple-600',
    href: '/dashboard/board-pack-ai',
    category: 'AI & Analytics',
    status: 'active' as const,
    badges: [
      { label: 'AI Powered', color: 'bg-purple-100 text-purple-700' },
      { label: 'Popular', color: 'bg-green-100 text-green-700' }
    ],
    metrics: [
      { label: 'Documents Analyzed', value: '2.4K+', icon: FileText },
      { label: 'Time Saved', value: '150+ hrs', icon: Activity }
    ]
  },
  {
    id: 'annual-report-ai',
    title: 'Annual Report AI',
    description: 'Comprehensive AI analysis of annual reports with trend identification and performance insights.',
    icon: BookOpen,
    iconColor: 'text-blue-600',
    href: '/dashboard/annual-report-ai',
    category: 'AI & Analytics',
    status: 'active' as const,
    badges: [
      { label: 'AI Powered', color: 'bg-purple-100 text-purple-700' },
      { label: 'Enterprise', color: 'bg-blue-100 text-blue-700' }
    ],
    metrics: [
      { label: 'Reports Processed', value: '340+', icon: BookOpen },
      { label: 'Insights Generated', value: '1.2K+', icon: Sparkles }
    ]
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Comprehensive meeting scheduling and calendar management with automated reminders and integrations.',
    icon: Calendar,
    iconColor: 'text-indigo-600',
    href: '/dashboard/calendar',
    category: 'Scheduling',
    status: 'active' as const,
    badges: [
      { label: 'Real-time', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Integrated', color: 'bg-blue-100 text-blue-700' }
    ],
    metrics: [
      { label: 'Meetings Scheduled', value: '89', icon: Calendar },
      { label: 'This Month', value: '12', icon: Activity }
    ]
  },
  {
    id: 'board-effectiveness',
    title: 'Board Effectiveness',
    description: 'Comprehensive assessment and optimization tools for board performance and governance effectiveness.',
    icon: Target,
    iconColor: 'text-green-600',
    href: '/dashboard/board-effectiveness',
    category: 'Governance',
    status: 'active' as const,
    badges: [
      { label: 'Assessment', color: 'bg-green-100 text-green-700' }
    ],
    metrics: [
      { label: 'Effectiveness Score', value: '87%', icon: Gauge },
      { label: 'Assessments', value: '45+', icon: Target }
    ]
  },
  {
    id: 'risk-dashboard',
    title: 'Risk Dashboard',
    description: 'Real-time risk monitoring and assessment with predictive analytics and compliance tracking.',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    href: '/dashboard/risk',
    category: 'Risk & Compliance',
    status: 'active' as const,
    badges: [
      { label: 'Real-time', color: 'bg-orange-100 text-orange-700' },
      { label: 'Critical', color: 'bg-red-100 text-red-700' }
    ],
    metrics: [
      { label: 'Risk Factors', value: '23', icon: AlertTriangle },
      { label: 'Compliance Score', value: '94%', icon: Shield }
    ]
  },
  {
    id: 'esg-scorecard',
    title: 'ESG Scorecard',
    description: 'Environmental, Social, and Governance performance tracking with industry benchmarking.',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    href: '/dashboard/esg',
    category: 'Sustainability',
    status: 'active' as const,
    badges: [
      { label: 'ESG Certified', color: 'bg-emerald-100 text-emerald-700' }
    ],
    metrics: [
      { label: 'ESG Score', value: '8.2/10', icon: Award },
      { label: 'Initiatives', value: '12', icon: CheckCircle2 }
    ]
  },
  {
    id: 'compliance-tracker',
    title: 'Compliance Tracker',
    description: 'Automated compliance monitoring with regulatory updates and deadline management.',
    icon: Shield,
    iconColor: 'text-indigo-600',
    href: '/dashboard/compliance',
    category: 'Risk & Compliance',
    status: 'active' as const,
    badges: [
      { label: 'Automated', color: 'bg-indigo-100 text-indigo-700' }
    ],
    metrics: [
      { label: 'Compliance Rate', value: '98%', icon: Shield },
      { label: 'Regulations', value: '47', icon: FileText }
    ]
  },
  {
    id: 'performance-analytics',
    title: 'Performance Analytics',
    description: 'Advanced financial and operational performance analysis with predictive modeling.',
    icon: TrendingUp,
    iconColor: 'text-cyan-600',
    href: '/dashboard/performance',
    category: 'Analytics',
    status: 'active' as const,
    badges: [
      { label: 'Predictive', color: 'bg-cyan-100 text-cyan-700' }
    ],
    metrics: [
      { label: 'KPIs Tracked', value: '156', icon: LineChart },
      { label: 'Accuracy', value: '95%', icon: TrendingUp }
    ]
  },
  {
    id: 'peer-benchmarking',
    title: 'Peer Benchmarking',
    description: 'Industry comparison and competitive analysis with market positioning insights.',
    icon: BarChart3,
    iconColor: 'text-violet-600',
    href: '/dashboard/benchmarking',
    category: 'Analytics',
    status: 'active' as const,
    badges: [
      { label: 'Market Data', color: 'bg-violet-100 text-violet-700' }
    ],
    metrics: [
      { label: 'Peer Companies', value: '250+', icon: BarChart3 },
      { label: 'Benchmarks', value: '89', icon: PieChart }
    ]
  }
]

export default function InstrumentsPage() {
  const handlePlayInstrument = (instrumentId: string, href: string) => {
    // Navigate to the new play workflow
    window.location.href = `/dashboard/instruments/play/${instrumentId}`
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              All Instruments
            </h1>
            <p className="text-gray-600 mt-2">
              Powerful AI-driven tools and analytics for comprehensive board management
            </p>
          </div>
        </div>

        {/* Instruments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INSTRUMENTS.map((instrument) => {
            const actions = [
              {
                id: 'play',
                label: 'Launch Instrument',
                icon: Play,
                onClick: () => handlePlayInstrument(instrument.id, instrument.href)
              }
            ]

            return (
              <ItemCard
                key={instrument.id}
                id={instrument.id}
                title={instrument.title}
                description={instrument.description}
                icon={instrument.icon}
                iconColor={instrument.iconColor}
                badges={instrument.badges}
                metrics={instrument.metrics}
                actions={actions}
                onClick={() => handlePlayInstrument(instrument.id, instrument.href)}
                status={instrument.status}
                priority="medium"
                className="group hover:shadow-xl transition-all duration-300"
                footer={
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {instrument.category}
                      </span>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                }
              >
                {/* Custom gradient overlay for premium feel */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </ItemCard>
            )
          })}
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center space-x-3">
              <Brain className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">AI & Analytics</p>
                <p className="text-xs text-purple-600">
                  {INSTRUMENTS.filter(i => i.category === 'AI & Analytics').length} instruments
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Risk & Compliance</p>
                <p className="text-xs text-green-600">
                  {INSTRUMENTS.filter(i => i.category === 'Risk & Compliance').length} instruments
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <div>
                <p className="text-sm font-medium text-indigo-900">Scheduling</p>
                <p className="text-xs text-indigo-600">
                  {INSTRUMENTS.filter(i => i.category === 'Scheduling').length} instrument
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-100">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-cyan-600" />
              <div>
                <p className="text-sm font-medium text-cyan-900">Performance</p>
                <p className="text-xs text-cyan-600">
                  {INSTRUMENTS.filter(i => i.category === 'Analytics').length} instruments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Harmonized Instrument Workflow
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                Each instrument now follows a unified 4-step workflow: <strong>Goal Selection → Asset Selection → AI Analysis → Save & Share</strong>. 
                Click the play button on any card to launch the guided workflow. Choose your analysis objectives, select relevant documents, 
                review AI-generated insights, and easily save results to vaults or share with board mates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}