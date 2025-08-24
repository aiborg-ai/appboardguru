import { 
  Brain,
  BookOpen,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  BarChart3,
  TrendingDown,
  FileSpreadsheet,
  Users,
  Building2,
  DollarSign,
  Activity,
  Zap,
  Search,
  Award,
  Gauge
} from 'lucide-react';
import { InstrumentConfig, GoalOption } from '@/features/instruments/InstrumentPlayWizard';

// Goal definitions for different instruments
const COMMON_GOALS = {
  COMPREHENSIVE_ANALYSIS: {
    id: 'comprehensive-analysis',
    title: 'Comprehensive Analysis',
    description: 'Complete end-to-end analysis with all available insights',
    icon: Brain,
    category: 'Analysis',
    minimumAssets: 1
  },
  QUICK_INSIGHTS: {
    id: 'quick-insights',
    title: 'Quick Insights',
    description: 'Fast overview of key findings and highlights',
    icon: Zap,
    category: 'Analysis',
    minimumAssets: 1
  },
  COMPARATIVE_ANALYSIS: {
    id: 'comparative-analysis',
    title: 'Comparative Analysis',
    description: 'Compare performance against benchmarks or previous periods',
    icon: BarChart3,
    category: 'Comparison',
    minimumAssets: 2
  }
};

const BOARD_PACK_GOALS: GoalOption[] = [
  {
    ...COMMON_GOALS.COMPREHENSIVE_ANALYSIS,
    description: 'Complete analysis of board pack documents with executive summary',
    requiredAssetTypes: ['pdf', 'docx', 'pptx'],
    parameters: [
      {
        key: 'focus_area',
        label: 'Focus Area',
        type: 'select',
        options: [
          { value: 'financial', label: 'Financial Performance' },
          { value: 'strategic', label: 'Strategic Initiatives' },
          { value: 'operational', label: 'Operational Metrics' },
          { value: 'governance', label: 'Governance Issues' }
        ],
        defaultValue: 'financial'
      },
      {
        key: 'detail_level',
        label: 'Detail Level',
        type: 'range',
        defaultValue: 70
      }
    ]
  },
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'Generate concise executive summary for board presentation',
    icon: FileSpreadsheet,
    category: 'Summarization',
    minimumAssets: 3,
    requiredAssetTypes: ['pdf', 'docx']
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Identify and assess risks mentioned across board materials',
    icon: AlertTriangle,
    category: 'Risk',
    minimumAssets: 2,
    requiredAssetTypes: ['pdf', 'docx', 'xlsx']
  }
];

const ANNUAL_REPORT_GOALS: GoalOption[] = [
  {
    ...COMMON_GOALS.COMPREHENSIVE_ANALYSIS,
    description: 'Complete analysis of annual report with financial and strategic insights',
    requiredAssetTypes: ['pdf', 'docx'],
    parameters: [
      {
        key: 'analysis_type',
        label: 'Analysis Type',
        type: 'select',
        options: [
          { value: 'financial', label: 'Financial Analysis' },
          { value: 'strategic', label: 'Strategic Review' },
          { value: 'governance', label: 'Governance Assessment' },
          { value: 'comprehensive', label: 'Comprehensive Review' }
        ],
        defaultValue: 'comprehensive'
      }
    ]
  },
  {
    id: 'financial-analysis',
    title: 'Financial Performance Analysis',
    description: 'Deep dive into financial metrics, trends, and ratios',
    icon: DollarSign,
    category: 'Financial',
    minimumAssets: 1,
    requiredAssetTypes: ['pdf', 'xlsx']
  },
  {
    id: 'trend-analysis',
    title: 'Trend Analysis',
    description: 'Identify performance trends and patterns over time',
    icon: TrendingUp,
    category: 'Analysis',
    minimumAssets: 1,
    parameters: [
      {
        key: 'time_period',
        label: 'Time Period',
        type: 'select',
        options: [
          { value: '1year', label: '1 Year' },
          { value: '3years', label: '3 Years' },
          { value: '5years', label: '5 Years' }
        ],
        defaultValue: '3years'
      }
    ]
  }
];

const RISK_DASHBOARD_GOALS: GoalOption[] = [
  {
    id: 'risk-identification',
    title: 'Risk Identification',
    description: 'Identify and categorize risks from documents',
    icon: Search,
    category: 'Risk',
    minimumAssets: 1,
    requiredAssetTypes: ['pdf', 'docx', 'xlsx']
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment & Scoring',
    description: 'Assess and score identified risks by impact and likelihood',
    icon: AlertTriangle,
    category: 'Risk',
    minimumAssets: 2,
    parameters: [
      {
        key: 'scoring_model',
        label: 'Scoring Model',
        type: 'select',
        options: [
          { value: 'standard', label: 'Standard (5x5 Matrix)' },
          { value: 'advanced', label: 'Advanced (Quantitative)' },
          { value: 'regulatory', label: 'Regulatory Framework' }
        ],
        defaultValue: 'standard'
      }
    ]
  },
  {
    id: 'mitigation-planning',
    title: 'Mitigation Planning',
    description: 'Generate risk mitigation strategies and action plans',
    icon: Shield,
    category: 'Planning',
    minimumAssets: 1
  }
];

const ESG_SCORECARD_GOALS: GoalOption[] = [
  {
    id: 'esg-assessment',
    title: 'ESG Assessment',
    description: 'Comprehensive ESG performance evaluation',
    icon: CheckCircle2,
    category: 'Assessment',
    minimumAssets: 1,
    requiredAssetTypes: ['pdf', 'docx', 'xlsx']
  },
  {
    id: 'sustainability-metrics',
    title: 'Sustainability Metrics',
    description: 'Track and analyze sustainability KPIs and targets',
    icon: Activity,
    category: 'Metrics',
    minimumAssets: 1,
    parameters: [
      {
        key: 'framework',
        label: 'ESG Framework',
        type: 'select',
        options: [
          { value: 'gri', label: 'GRI Standards' },
          { value: 'sasb', label: 'SASB Standards' },
          { value: 'tcfd', label: 'TCFD Framework' },
          { value: 'custom', label: 'Custom Framework' }
        ],
        defaultValue: 'gri'
      }
    ]
  },
  {
    id: 'benchmarking',
    title: 'ESG Benchmarking',
    description: 'Compare ESG performance against industry peers',
    icon: BarChart3,
    category: 'Comparison',
    minimumAssets: 1
  }
];

const PERFORMANCE_ANALYTICS_GOALS: GoalOption[] = [
  {
    id: 'kpi-analysis',
    title: 'KPI Analysis',
    description: 'Analyze key performance indicators and metrics',
    icon: Gauge,
    category: 'Performance',
    minimumAssets: 1,
    requiredAssetTypes: ['xlsx', 'csv', 'pdf']
  },
  {
    id: 'predictive-modeling',
    title: 'Predictive Modeling',
    description: 'Generate predictive models and forecasts',
    icon: TrendingUp,
    category: 'Forecasting',
    minimumAssets: 2,
    parameters: [
      {
        key: 'model_type',
        label: 'Model Type',
        type: 'select',
        options: [
          { value: 'linear', label: 'Linear Regression' },
          { value: 'timeseries', label: 'Time Series' },
          { value: 'ml', label: 'Machine Learning' }
        ],
        defaultValue: 'timeseries'
      }
    ]
  }
];

// Instrument configurations
export const INSTRUMENT_CONFIGS: Record<string, InstrumentConfig> = {
  'board-pack-ai': {
    id: 'board-pack-ai',
    name: 'Board Pack AI',
    description: 'AI-powered analysis and summarization of board documents',
    icon: Brain,
    goals: BOARD_PACK_GOALS,
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'pptx', 'xlsx'],
      minFiles: 1,
      maxFiles: 20
    },
    dashboardComponents: {
      chartTypes: ['bar', 'line', 'pie'],
      insightCategories: ['Financial', 'Strategic', 'Operational', 'Governance']
    },
    processingConfig: {
      estimatedTime: '2-5 minutes',
      requiresML: true,
      batchSize: 5
    }
  },

  'annual-report-ai': {
    id: 'annual-report-ai',
    name: 'Annual Report AI',
    description: 'Comprehensive AI analysis of annual reports',
    icon: BookOpen,
    goals: ANNUAL_REPORT_GOALS,
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'xlsx'],
      minFiles: 1,
      maxFiles: 10
    },
    dashboardComponents: {
      chartTypes: ['line', 'bar', 'scatter'],
      insightCategories: ['Financial', 'Strategic', 'Market', 'Risk']
    },
    processingConfig: {
      estimatedTime: '3-7 minutes',
      requiresML: true
    }
  },

  'calendar': {
    id: 'calendar',
    name: 'Calendar Analytics',
    description: 'Meeting and scheduling analytics',
    icon: Calendar,
    goals: [
      {
        id: 'meeting-analysis',
        title: 'Meeting Analysis',
        description: 'Analyze meeting patterns and efficiency',
        icon: Calendar,
        category: 'Analytics',
        minimumAssets: 1
      }
    ],
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'ics'],
      minFiles: 1
    },
    dashboardComponents: {
      chartTypes: ['line', 'bar', 'heatmap'],
      insightCategories: ['Efficiency', 'Patterns', 'Utilization']
    },
    processingConfig: {
      estimatedTime: '1-3 minutes'
    }
  },

  'board-effectiveness': {
    id: 'board-effectiveness',
    name: 'Board Effectiveness',
    description: 'Assessment and optimization of board performance',
    icon: Target,
    goals: [
      {
        id: 'effectiveness-assessment',
        title: 'Effectiveness Assessment',
        description: 'Comprehensive board effectiveness evaluation',
        icon: Target,
        category: 'Assessment',
        minimumAssets: 1
      }
    ],
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'xlsx'],
      minFiles: 1
    },
    dashboardComponents: {
      chartTypes: ['bar', 'pie', 'scatter'],
      insightCategories: ['Performance', 'Governance', 'Structure']
    },
    processingConfig: {
      estimatedTime: '2-4 minutes'
    }
  },

  'risk-dashboard': {
    id: 'risk-dashboard',
    name: 'Risk Dashboard',
    description: 'Real-time risk monitoring and assessment',
    icon: AlertTriangle,
    goals: RISK_DASHBOARD_GOALS,
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'xlsx', 'csv'],
      minFiles: 1,
      maxFiles: 15
    },
    dashboardComponents: {
      chartTypes: ['bar', 'heatmap', 'scatter'],
      insightCategories: ['Operational', 'Financial', 'Strategic', 'Compliance']
    },
    processingConfig: {
      estimatedTime: '3-6 minutes',
      requiresML: true
    }
  },

  'esg-scorecard': {
    id: 'esg-scorecard',
    name: 'ESG Scorecard',
    description: 'Environmental, Social, and Governance performance tracking',
    icon: CheckCircle2,
    goals: ESG_SCORECARD_GOALS,
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'xlsx', 'csv'],
      minFiles: 1
    },
    dashboardComponents: {
      chartTypes: ['bar', 'line', 'pie'],
      insightCategories: ['Environmental', 'Social', 'Governance', 'Overall']
    },
    processingConfig: {
      estimatedTime: '2-5 minutes'
    }
  },

  'compliance-tracker': {
    id: 'compliance-tracker',
    name: 'Compliance Tracker',
    description: 'Automated compliance monitoring and reporting',
    icon: Shield,
    goals: [
      {
        id: 'compliance-assessment',
        title: 'Compliance Assessment',
        description: 'Assess compliance status across regulations',
        icon: Shield,
        category: 'Compliance',
        minimumAssets: 1
      }
    ],
    assetFilters: {
      supportedTypes: ['pdf', 'docx', 'xlsx'],
      minFiles: 1
    },
    dashboardComponents: {
      chartTypes: ['bar', 'line', 'table'],
      insightCategories: ['Regulatory', 'Risk', 'Status']
    },
    processingConfig: {
      estimatedTime: '2-4 minutes'
    }
  },

  'performance-analytics': {
    id: 'performance-analytics',
    name: 'Performance Analytics',
    description: 'Advanced financial and operational performance analysis',
    icon: TrendingUp,
    goals: PERFORMANCE_ANALYTICS_GOALS,
    assetFilters: {
      supportedTypes: ['xlsx', 'csv', 'pdf', 'docx'],
      minFiles: 1,
      maxFiles: 25
    },
    dashboardComponents: {
      chartTypes: ['line', 'bar', 'scatter', 'heatmap'],
      insightCategories: ['Financial', 'Operational', 'Strategic', 'Predictive']
    },
    processingConfig: {
      estimatedTime: '3-8 minutes',
      requiresML: true
    }
  },

  'peer-benchmarking': {
    id: 'peer-benchmarking',
    name: 'Peer Benchmarking',
    description: 'Industry comparison and competitive analysis',
    icon: BarChart3,
    goals: [
      {
        ...COMMON_GOALS.COMPARATIVE_ANALYSIS,
        description: 'Compare performance against industry peers and benchmarks'
      }
    ],
    assetFilters: {
      supportedTypes: ['pdf', 'xlsx', 'csv'],
      minFiles: 1
    },
    dashboardComponents: {
      chartTypes: ['bar', 'scatter', 'line'],
      insightCategories: ['Performance', 'Position', 'Opportunities']
    },
    processingConfig: {
      estimatedTime: '2-4 minutes'
    }
  }
};

// Export INSTRUMENTS for compatibility
export const INSTRUMENTS = INSTRUMENT_CONFIGS;

// Helper function to get instrument configuration
export function getInstrumentConfig(instrumentId: string): InstrumentConfig | null {
  return INSTRUMENT_CONFIGS[instrumentId] || null;
}

// Get all available instruments
export function getAllInstrumentConfigs(): InstrumentConfig[] {
  return Object.values(INSTRUMENT_CONFIGS);
}

// Get instruments by category
export function getInstrumentsByCategory(category: string): InstrumentConfig[] {
  return getAllInstrumentConfigs().filter(config => 
    config.goals.some(goal => goal.category === category)
  );
}