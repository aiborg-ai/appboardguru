/**
 * Security Training and Awareness System
 * Implements ISO 27001:2022 Annex A.7 (Human Resource Security)
 * Ensures personnel understand security responsibilities and maintain competency
 */

export type TrainingType = 'onboarding' | 'annual' | 'role_specific' | 'incident_response' | 'compliance' | 'awareness';
export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'expired';
export type CompetencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type AssessmentType = 'quiz' | 'practical' | 'simulation' | 'certification';

export interface SecurityTrainingModule {
  id: string;
  title: string;
  description: string;
  type: TrainingType;
  version: string;
  duration: number; // in minutes
  competencyLevel: CompetencyLevel;
  prerequisites: string[];
  learningObjectives: string[];
  content: {
    sections: {
      title: string;
      content: string;
      examples: string[];
      exercises?: string[];
    }[];
    resources: string[];
    references: string[];
  };
  assessment: {
    type: AssessmentType;
    passingScore: number;
    maxAttempts: number;
    questions?: {
      id: string;
      question: string;
      type: 'multiple_choice' | 'true_false' | 'scenario';
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }[];
  };
  validityPeriod: number; // in days
  mandatory: boolean;
  applicableRoles: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TrainingAssignment {
  id: string;
  userId: string;
  moduleId: string;
  assignedDate: Date;
  dueDate: Date;
  startedDate: Date | null;
  completedDate: Date | null;
  status: TrainingStatus;
  attempts: {
    attemptNumber: number;
    startTime: Date;
    endTime: Date | null;
    score: number | null;
    passed: boolean;
    feedback: string;
  }[];
  currentProgress: {
    sectionsCompleted: number;
    totalSections: number;
    timeSpent: number; // in minutes
    lastAccessed: Date;
  };
  certificateIssued: boolean;
  expiryDate: Date | null;
}

export interface SecurityAwarenessMetrics {
  userId: string;
  period: string; // YYYY-MM
  trainingCompletionRate: number;
  averageScore: number;
  overdueCourses: number;
  incidentReports: number;
  phishingSimulationClicks: number;
  securityViolations: number;
  competencyScore: number;
  lastAssessmentDate: Date;
}

export interface PhishingSimulation {
  id: string;
  campaign: string;
  templateId: string;
  sentDate: Date;
  recipients: {
    userId: string;
    email: string;
    department: string;
    role: string;
  }[];
  results: {
    userId: string;
    action: 'clicked' | 'reported' | 'deleted' | 'forwarded' | 'no_action';
    timestamp: Date;
    deviceInfo?: string;
    location?: string;
  }[];
  metrics: {
    totalSent: number;
    clickRate: number;
    reportRate: number;
    trainingTriggered: number;
  };
  followUpActions: {
    userId: string;
    action: 'additional_training' | 'manager_notification' | 'policy_reminder';
    completed: boolean;
    completedDate: Date | null;
  }[];
}

export interface SecurityCulture {
  organizationId: string;
  period: string;
  metrics: {
    overallAwareness: number; // 1-5 scale
    reportingCulture: number; // incidents reported vs estimated actual
    policyAdherence: number;
    trainingEngagement: number;
    leadershipCommitment: number;
  };
  initiatives: {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    impact: number;
    status: 'planned' | 'active' | 'completed' | 'cancelled';
  }[];
  recommendations: string[];
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
}

export class SecurityTrainingController {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async createTrainingModule(module: Omit<SecurityTrainingModule, 'id' | 'created_at' | 'updated_at'>): Promise<SecurityTrainingModule> {
    const newModule: SecurityTrainingModule = {
      ...module,
      id: `module_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Validate assessment configuration
    if (module.assessment.passingScore < 60) {
      console.warn(`Low passing score (${module.assessment.passingScore}%) for security training module`);
    }

    console.log(`Created training module: ${module.title} (${module.duration} min, ${module.competencyLevel} level)`);
    return newModule;
  }

  async assignTraining(userId: string, moduleId: string, dueDate?: Date): Promise<TrainingAssignment> {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    const assignment: TrainingAssignment = {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      moduleId,
      assignedDate: new Date(),
      dueDate: dueDate || defaultDueDate,
      startedDate: null,
      completedDate: null,
      status: 'not_started',
      attempts: [],
      currentProgress: {
        sectionsCompleted: 0,
        totalSections: 0,
        timeSpent: 0,
        lastAccessed: new Date()
      },
      certificateIssued: false,
      expiryDate: null
    };

    console.log(`Assigned training module ${moduleId} to user ${userId}`);
    return assignment;
  }

  async recordTrainingProgress(assignmentId: string, progress: Partial<TrainingAssignment['currentProgress']>): Promise<void> {
    console.log(`Updated training progress for assignment: ${assignmentId}`);
    
    if (progress.sectionsCompleted && progress.totalSections && progress.sectionsCompleted >= progress.totalSections) {
      console.log(`Training content completed for assignment: ${assignmentId}`);
    }
  }

  async submitAssessment(assignmentId: string, answers: Record<string, string>): Promise<{
    score: number;
    passed: boolean;
    feedback: string;
    certificate?: string;
  }> {
    // This would validate answers against correct responses
    const score = 85; // placeholder calculation
    const passed = score >= 80; // assume 80% passing score
    
    const feedback = passed 
      ? `Excellent work! You scored ${score}% and demonstrated strong security awareness.`
      : `You scored ${score}%. Please review the material and retake the assessment.`;

    if (passed) {
      console.log(`Assessment passed for assignment: ${assignmentId} (Score: ${score}%)`);
      return {
        score,
        passed,
        feedback,
        certificate: `CERT_${assignmentId}_${Date.now()}`
      };
    }

    return { score, passed, feedback };
  }

  async schedulePhishingSimulation(campaign: Omit<PhishingSimulation, 'id' | 'results' | 'metrics' | 'followUpActions'>): Promise<PhishingSimulation> {
    const simulation: PhishingSimulation = {
      ...campaign,
      id: `phish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      results: [],
      metrics: {
        totalSent: campaign.recipients.length,
        clickRate: 0,
        reportRate: 0,
        trainingTriggered: 0
      },
      followUpActions: []
    };

    console.log(`Scheduled phishing simulation: ${campaign.campaign} for ${campaign.recipients.length} recipients`);
    return simulation;
  }

  async processPhishingResult(simulationId: string, userId: string, action: PhishingSimulation['results'][0]['action']): Promise<void> {
    console.log(`Phishing simulation result: User ${userId} ${action} the email`);

    if (action === 'clicked') {
      // Trigger immediate training
      await this.triggerJustInTimeTraining(userId, 'phishing_awareness');
      console.log(`Triggered just-in-time phishing training for user ${userId}`);
    } else if (action === 'reported') {
      console.log(`User ${userId} correctly reported suspicious email - positive reinforcement triggered`);
    }
  }

  async triggerJustInTimeTraining(userId: string, topic: string): Promise<void> {
    // Create immediate micro-learning session
    const microModule: Partial<SecurityTrainingModule> = {
      title: `Just-in-Time: ${topic}`,
      duration: 5,
      type: 'awareness',
      mandatory: true
    };

    console.log(`Triggered just-in-time training for user ${userId}: ${topic}`);
  }

  async assessSecurityCulture(): Promise<SecurityCulture> {
    const culture: SecurityCulture = {
      organizationId: this.organizationId,
      period: new Date().toISOString().substr(0, 7),
      metrics: {
        overallAwareness: 3.8,
        reportingCulture: 0.75,
        policyAdherence: 0.82,
        trainingEngagement: 0.88,
        leadershipCommitment: 4.2
      },
      initiatives: [
        {
          name: 'Security Champions Program',
          description: 'Peer-to-peer security awareness initiative',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          impact: 4.1,
          status: 'active'
        }
      ],
      recommendations: [
        'Increase frequency of security communications',
        'Implement security metrics dashboards for teams',
        'Enhance manager training on security leadership'
      ],
      trends: {
        improving: ['phishing reporting', 'policy awareness'],
        declining: ['password hygiene'],
        stable: ['incident reporting', 'training completion']
      }
    };

    return culture;
  }

  async generateTrainingMetrics(userId?: string, startDate?: Date, endDate?: Date): Promise<SecurityAwarenessMetrics[]> {
    // This would query actual training data
    const metrics: SecurityAwarenessMetrics = {
      userId: userId || 'aggregate',
      period: new Date().toISOString().substr(0, 7),
      trainingCompletionRate: 0.92,
      averageScore: 86.5,
      overdueCourses: 1,
      incidentReports: 3,
      phishingSimulationClicks: 0,
      securityViolations: 0,
      competencyScore: 4.2,
      lastAssessmentDate: new Date()
    };

    return [metrics];
  }

  async createSecurityChampionsProgram(): Promise<{
    champions: { userId: string; department: string; certificationLevel: string }[];
    activities: string[];
    metrics: { engagement: number; influence: number; satisfaction: number };
  }> {
    return {
      champions: [
        { userId: 'user1', department: 'IT', certificationLevel: 'advanced' },
        { userId: 'user2', department: 'HR', certificationLevel: 'intermediate' }
      ],
      activities: [
        'Monthly security spotlight presentations',
        'Peer security reviews',
        'Security incident tabletop exercises',
        'New employee security mentoring'
      ],
      metrics: {
        engagement: 0.87,
        influence: 0.79,
        satisfaction: 4.3
      }
    };
  }

  async auditTrainingCompliance(): Promise<{
    overall: number;
    byDepartment: Record<string, number>;
    overdue: { userId: string; modules: string[]; daysPastDue: number }[];
    recommendations: string[];
  }> {
    return {
      overall: 0.94,
      byDepartment: {
        'IT': 0.98,
        'Finance': 0.91,
        'HR': 0.96,
        'Sales': 0.89
      },
      overdue: [
        { userId: 'user123', modules: ['data_protection'], daysPastDue: 5 }
      ],
      recommendations: [
        'Implement automated reminders at 7, 3, and 1 days before due dates',
        'Create mobile-friendly training modules for better accessibility',
        'Establish manager dashboards for team training oversight'
      ]
    };
  }

  async generateComplianceReport(): Promise<{
    summary: string;
    trainingCoverage: number;
    competencyLevels: Record<string, number>;
    riskAreas: string[];
    achievements: string[];
    nextActions: string[];
  }> {
    return {
      summary: 'Security training program demonstrates strong compliance with ISO 27001 human resource security requirements',
      trainingCoverage: 0.94,
      competencyLevels: {
        'basic': 0.89,
        'intermediate': 0.76,
        'advanced': 0.52,
        'expert': 0.23
      },
      riskAreas: [
        'New employee onboarding completion timing',
        'Contractor security training verification',
        'Role-specific training for elevated privileges'
      ],
      achievements: [
        'Zero security incidents attributed to training gaps',
        '15% improvement in phishing simulation results',
        '94% annual training completion rate achieved'
      ],
      nextActions: [
        'Implement adaptive learning paths based on risk profiles',
        'Expand security simulation exercises',
        'Create executive security briefing program'
      ]
    };
  }
}

export default SecurityTrainingController;