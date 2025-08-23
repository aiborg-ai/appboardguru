/**
 * Unified Compliance Dashboard
 * Consolidates ISO 27001, GDPR, and other compliance frameworks into a single view
 * Provides executive reporting and operational oversight capabilities
 */

import type { GDPRComplianceReport } from './gdpr-compliance';
import type { BCPMetrics } from './iso27001/business-continuity';
import type { SecurityAwarenessMetrics } from './iso27001/security-training';

export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'under_review';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type TrendDirection = 'improving' | 'stable' | 'declining' | 'unknown';

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  applicabilityDate: Date;
  certificationRequired: boolean;
  certificationBody?: string;
  certificationExpiry?: Date;
  lastAssessment?: Date;
  nextAssessment: Date;
  status: ComplianceStatus;
  overallScore: number; // 0-100
  controls: {
    implemented: number;
    partial: number;
    notImplemented: number;
    total: number;
  };
}

export interface ComplianceMetric {
  id: string;
  frameworkId: string;
  name: string;
  description: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: {
    direction: TrendDirection;
    changePercent: number;
    period: string;
  };
  lastUpdated: Date;
  dataSource: string;
}

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  framework: string;
  control?: string;
  createdAt: Date;
  dueDate?: Date;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  metadata: {
    source: string;
    category: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    effort: 'low' | 'medium' | 'high';
    tags: string[];
  };
}

export interface ComplianceRisk {
  id: string;
  title: string;
  description: string;
  frameworks: string[];
  riskCategory: 'operational' | 'legal' | 'financial' | 'reputational' | 'strategic';
  likelihood: number; // 1-5 scale
  impact: number; // 1-5 scale
  riskScore: number; // likelihood × impact
  inherentRisk: number;
  residualRisk: number;
  riskTolerance: number;
  controls: string[];
  mitigations: {
    action: string;
    responsible: string;
    dueDate: Date;
    status: 'planned' | 'in_progress' | 'completed';
    effectiveness: number; // 0-100
  }[];
  lastReview: Date;
  nextReview: Date;
  owner: string;
}

export interface ComplianceGap {
  id: string;
  frameworkId: string;
  controlId: string;
  controlName: string;
  requirement: string;
  currentState: string;
  targetState: string;
  gapDescription: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: string;
  estimatedCost: number;
  dueDate: Date;
  responsibleParty: string;
  dependencies: string[];
  remediationPlan: {
    phase: string;
    tasks: string[];
    milestone: string;
    deadline: Date;
  }[];
  status: 'identified' | 'planned' | 'in_progress' | 'completed' | 'deferred';
}

export interface ComplianceDashboard {
  organizationId: string;
  lastUpdated: Date;
  summary: {
    overallCompliance: number; // 0-100
    activeFrameworks: number;
    totalControls: number;
    implementedControls: number;
    criticalGaps: number;
    openAlerts: number;
    dueCertifications: number;
  };
  frameworks: ComplianceFramework[];
  metrics: ComplianceMetric[];
  alerts: ComplianceAlert[];
  risks: ComplianceRisk[];
  gaps: ComplianceGap[];
  trends: {
    complianceScore: { period: string; value: number }[];
    incidentVolume: { period: string; value: number }[];
    trainingCompletion: { period: string; value: number }[];
    auditFindings: { period: string; value: number }[];
  };
  upcomingDeadlines: {
    type: 'certification' | 'assessment' | 'training' | 'review' | 'remediation';
    description: string;
    dueDate: Date;
    responsible: string;
    criticality: 'low' | 'medium' | 'high';
  }[];
}

export interface ExecutiveReport {
  reportDate: Date;
  reportPeriod: { start: Date; end: Date };
  executive_summary: string;
  compliance_posture: {
    overall_rating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';
    score: number;
    trend: TrendDirection;
    key_achievements: string[];
    critical_issues: string[];
  };
  framework_status: {
    framework: string;
    status: ComplianceStatus;
    score: number;
    next_milestone: string;
  }[];
  risk_landscape: {
    high_risks: number;
    new_risks: number;
    mitigated_risks: number;
    risk_trend: TrendDirection;
    top_risks: string[];
  };
  investment_summary: {
    compliance_spend: number;
    roi_security: number;
    cost_avoidance: number;
    budget_variance: number;
  };
  strategic_recommendations: {
    priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    recommendation: string;
    business_impact: string;
    estimated_cost: number;
    estimated_timeline: string;
  }[];
  regulatory_landscape: {
    upcoming_regulations: string[];
    regulatory_changes: string[];
    compliance_deadlines: { regulation: string; deadline: Date }[];
  };
}

export class UnifiedComplianceDashboard {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async generateDashboard(): Promise<ComplianceDashboard> {
    const frameworks = await this.loadComplianceFrameworks();
    const metrics = await this.collectMetrics();
    const alerts = await this.getActiveAlerts();
    const risks = await this.assessRisks();
    const gaps = await this.identifyGaps();
    const trends = await this.generateTrends();
    const deadlines = await this.getUpcomingDeadlines();

    const summary = {
      overallCompliance: this.calculateOverallCompliance(frameworks),
      activeFrameworks: frameworks.length,
      totalControls: frameworks.reduce((sum, f) => sum + f.controls.total, 0),
      implementedControls: frameworks.reduce((sum, f) => sum + f.controls.implemented, 0),
      criticalGaps: gaps.filter(g => g.priority === 'critical').length,
      openAlerts: alerts.filter(a => a.status === 'open').length,
      dueCertifications: frameworks.filter(f => 
        f.certificationExpiry && f.certificationExpiry < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      ).length
    };

    return {
      organizationId: this.organizationId,
      lastUpdated: new Date(),
      summary,
      frameworks,
      metrics,
      alerts,
      risks,
      gaps,
      trends,
      upcomingDeadlines: deadlines
    };
  }

  private async loadComplianceFrameworks(): Promise<ComplianceFramework[]> {
    return [
      {
        id: 'iso27001',
        name: 'ISO/IEC 27001:2022',
        version: '2022',
        description: 'Information Security Management System',
        applicabilityDate: new Date('2022-10-25'),
        certificationRequired: true,
        nextAssessment: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: 'partially_compliant',
        overallScore: 78,
        controls: { implemented: 89, partial: 22, notImplemented: 3, total: 114 }
      },
      {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        version: '2018',
        description: 'EU Data Protection Regulation',
        applicabilityDate: new Date('2018-05-25'),
        certificationRequired: false,
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'compliant',
        overallScore: 92,
        controls: { implemented: 37, partial: 3, notImplemented: 0, total: 40 }
      }
    ];
  }

  private async collectMetrics(): Promise<ComplianceMetric[]> {
    return [
      {
        id: 'security_awareness',
        frameworkId: 'iso27001',
        name: 'Security Awareness Training Completion',
        description: 'Percentage of staff completing annual security training',
        category: 'Human Resources Security',
        currentValue: 94,
        targetValue: 95,
        unit: '%',
        trend: { direction: 'improving', changePercent: 2.5, period: 'last_quarter' },
        lastUpdated: new Date(),
        dataSource: 'training_management_system'
      },
      {
        id: 'incident_response_time',
        frameworkId: 'iso27001',
        name: 'Average Incident Response Time',
        description: 'Average time to respond to security incidents',
        category: 'Incident Management',
        currentValue: 2.3,
        targetValue: 2.0,
        unit: 'hours',
        trend: { direction: 'improving', changePercent: -8.2, period: 'last_month' },
        lastUpdated: new Date(),
        dataSource: 'incident_management_system'
      },
      {
        id: 'gdpr_request_response',
        frameworkId: 'gdpr',
        name: 'GDPR Request Response Time',
        description: 'Average time to respond to data subject requests',
        category: 'Data Subject Rights',
        currentValue: 18,
        targetValue: 30,
        unit: 'days',
        trend: { direction: 'stable', changePercent: 0.5, period: 'last_quarter' },
        lastUpdated: new Date(),
        dataSource: 'privacy_management_system'
      }
    ];
  }

  private async getActiveAlerts(): Promise<ComplianceAlert[]> {
    return [
      {
        id: 'cert_expiry_warning',
        severity: 'warning',
        title: 'SSL Certificate Expiry',
        description: 'SSL certificate for api.example.com expires in 15 days',
        framework: 'iso27001',
        control: 'A.13.1.1',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
        status: 'open',
        assignedTo: 'it_security_team',
        metadata: {
          source: 'certificate_monitor',
          category: 'cryptography',
          impact: 'high',
          effort: 'low',
          tags: ['ssl', 'certificate', 'expiry']
        }
      }
    ];
  }

  private async assessRisks(): Promise<ComplianceRisk[]> {
    return [
      {
        id: 'data_breach_risk',
        title: 'Personal Data Breach Risk',
        description: 'Risk of unauthorized access to customer personal data',
        frameworks: ['gdpr', 'iso27001'],
        riskCategory: 'legal',
        likelihood: 3,
        impact: 5,
        riskScore: 15,
        inherentRisk: 20,
        residualRisk: 15,
        riskTolerance: 10,
        controls: ['A.9.1.1', 'A.9.2.1', 'A.13.1.1'],
        mitigations: [
          {
            action: 'Implement additional access controls',
            responsible: 'security_team',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            effectiveness: 70
          }
        ],
        lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextReview: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        owner: 'chief_security_officer'
      }
    ];
  }

  private async identifyGaps(): Promise<ComplianceGap[]> {
    return [
      {
        id: 'backup_testing_gap',
        frameworkId: 'iso27001',
        controlId: 'A.12.3.1',
        controlName: 'Information Backup',
        requirement: 'Regular testing of backup restoration procedures',
        currentState: 'Backups created but restoration not regularly tested',
        targetState: 'Monthly backup restoration testing with documented results',
        gapDescription: 'Lack of regular backup restoration testing creates risk of data loss in disaster scenarios',
        priority: 'high',
        estimatedEffort: '2 weeks',
        estimatedCost: 5000,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        responsibleParty: 'infrastructure_team',
        dependencies: ['backup_automation_project'],
        remediationPlan: [
          {
            phase: 'Planning',
            tasks: ['Define test procedures', 'Schedule test windows'],
            milestone: 'Test plan approved',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
        ],
        status: 'planned'
      }
    ];
  }

  private async generateTrends(): Promise<ComplianceDashboard['trends']> {
    return {
      complianceScore: [
        { period: '2024-09', value: 76 },
        { period: '2024-10', value: 78 },
        { period: '2024-11', value: 81 },
        { period: '2024-12', value: 83 }
      ],
      incidentVolume: [
        { period: '2024-09', value: 12 },
        { period: '2024-10', value: 8 },
        { period: '2024-11', value: 6 },
        { period: '2024-12', value: 4 }
      ],
      trainingCompletion: [
        { period: '2024-09', value: 89 },
        { period: '2024-10', value: 91 },
        { period: '2024-11', value: 93 },
        { period: '2024-12', value: 94 }
      ],
      auditFindings: [
        { period: '2024-09', value: 15 },
        { period: '2024-10', value: 12 },
        { period: '2024-11', value: 8 },
        { period: '2024-12', value: 6 }
      ]
    };
  }

  private async getUpcomingDeadlines(): Promise<ComplianceDashboard['upcomingDeadlines']> {
    return [
      {
        type: 'certification',
        description: 'ISO 27001 surveillance audit',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        responsible: 'compliance_team',
        criticality: 'high'
      },
      {
        type: 'training',
        description: 'Annual security awareness training deadline',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        responsible: 'hr_team',
        criticality: 'medium'
      }
    ];
  }

  private calculateOverallCompliance(frameworks: ComplianceFramework[]): number {
    const weightedSum = frameworks.reduce((sum, f) => sum + f.overallScore, 0);
    return Math.round(weightedSum / frameworks.length);
  }

  async generateExecutiveReport(period: { start: Date; end: Date }): Promise<ExecutiveReport> {
    return {
      reportDate: new Date(),
      reportPeriod: period,
      executive_summary: 'The organization maintains strong compliance posture with continued improvement across all frameworks. Key achievements include successful GDPR compliance maintenance and significant progress on ISO 27001 certification preparation.',
      compliance_posture: {
        overall_rating: 'good',
        score: 85,
        trend: 'improving',
        key_achievements: [
          'Achieved 94% security training completion rate',
          'Reduced incident response time by 15%',
          'Implemented automated retention policies',
          'Completed comprehensive risk assessment'
        ],
        critical_issues: [
          'Backup restoration testing gaps identified',
          'SSL certificate management automation needed'
        ]
      },
      framework_status: [
        {
          framework: 'ISO/IEC 27001:2022',
          status: 'partially_compliant',
          score: 78,
          next_milestone: 'Stage 1 certification audit in Q2 2025'
        },
        {
          framework: 'GDPR',
          status: 'compliant',
          score: 92,
          next_milestone: 'Annual privacy impact assessment review'
        }
      ],
      risk_landscape: {
        high_risks: 2,
        new_risks: 1,
        mitigated_risks: 4,
        risk_trend: 'improving',
        top_risks: [
          'Personal data breach exposure',
          'Third-party vendor security gaps',
          'Insider threat from privileged access'
        ]
      },
      investment_summary: {
        compliance_spend: 245000,
        roi_security: 4.2,
        cost_avoidance: 1800000,
        budget_variance: -3.5
      },
      strategic_recommendations: [
        {
          priority: 'immediate',
          recommendation: 'Implement automated backup testing procedures',
          business_impact: 'Ensures business continuity and regulatory compliance',
          estimated_cost: 25000,
          estimated_timeline: '6 weeks'
        },
        {
          priority: 'short_term',
          recommendation: 'Enhance third-party risk management program',
          business_impact: 'Reduces supply chain security risks and improves vendor accountability',
          estimated_cost: 75000,
          estimated_timeline: '3 months'
        }
      ],
      regulatory_landscape: {
        upcoming_regulations: [
          'EU AI Act implementation requirements',
          'Updated NIS2 Directive compliance'
        ],
        regulatory_changes: [
          'GDPR enforcement trends showing increased fines for data minimization violations'
        ],
        compliance_deadlines: [
          { regulation: 'ISO 27001 Certification', deadline: new Date('2025-06-30') }
        ]
      }
    };
  }

  async exportComplianceData(format: 'json' | 'csv' | 'pdf'): Promise<string> {
    const dashboard = await this.generateDashboard();
    
    switch (format) {
      case 'json':
        return JSON.stringify(dashboard, null, 2);
      case 'csv':
        // Convert to CSV format
        return this.convertToCSV(dashboard);
      case 'pdf':
        // Generate PDF report
        return 'PDF generation would be implemented here';
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(data: ComplianceDashboard): string {
    // Basic CSV conversion for metrics
    let csv = 'Framework,Metric,Current Value,Target Value,Trend\n';
    data.metrics.forEach(metric => {
      csv += `${metric.frameworkId},${metric.name},${metric.currentValue},${metric.targetValue},${metric.trend.direction}\n`;
    });
    return csv;
  }
}

export default UnifiedComplianceDashboard;