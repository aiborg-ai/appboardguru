/**
 * Investment Thesis Domain Entity
 * Represents a one-page investment thesis for each holding,
 * tracking buy/sell triggers and quarterly reviews
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { UserId } from './user.entity';
import type { TrustId } from './investment-trust.entity';
import type { PortfolioId } from './portfolio.entity';

export type ThesisId = string & { __brand: 'ThesisId' };

export type InvestmentDecision = 'buy' | 'hold' | 'sell' | 'watch';
export type ThesisStatus = 'active' | 'under_review' | 'violated' | 'closed';

export interface ThesisTrigger {
  id: string;
  type: 'buy' | 'sell';
  condition: string;
  metric?: string;
  threshold?: number;
  operator?: '<' | '>' | '=' | '<=' | '>=';
  isActive: boolean;
  lastChecked?: Date;
  triggered?: boolean;
  triggeredAt?: Date;
}

export interface ThesisMetric {
  name: string;
  current: number;
  target?: number;
  min?: number;
  max?: number;
  unit?: string;
  lastUpdated: Date;
  trend?: 'improving' | 'stable' | 'deteriorating';
}

export interface QuarterlyReview {
  id: string;
  quarter: string; // e.g., "Q1 2024"
  date: Date;
  decision: InvestmentDecision;
  performance: {
    totalReturn: number;
    vsObjective: number;
    vsBenchmark: number;
  };
  keyDevelopments: string[];
  concernsRaised: string[];
  actionsRequired: string[];
  nextReviewFocus: string[];
  reviewedBy?: UserId;
}

export interface PermanentQuestion {
  id: string;
  question: string;
  category: 'financial' | 'strategic' | 'governance' | 'risk' | 'market';
  priority: 'high' | 'medium' | 'low';
  lastAnswer?: string;
  lastAnsweredAt?: Date;
  requiresUpdate: boolean;
}

export interface InvestmentThesisProps {
  id: ThesisId;
  portfolioId: PortfolioId;
  trustId: TrustId;
  userId: UserId;
  
  // Core thesis
  investmentCase: string; // Why we own this
  investmentObjective: string; // What we expect to achieve
  timeHorizon: string; // Expected holding period
  targetReturn?: number; // Expected annual return
  
  // Current position
  position: {
    shares: number;
    averageCost: number;
    currentPrice: number;
    percentageOfPortfolio: number;
    maxPosition?: number; // Maximum % of portfolio
    minPosition?: number; // Minimum % to maintain
  };
  
  // Key strengths and risks
  strengths: string[];
  risks: string[];
  mitigations: string[]; // How we're managing the risks
  
  // Triggers and monitoring
  buyTriggers: ThesisTrigger[];
  sellTriggers: ThesisTrigger[];
  watchMetrics: ThesisMetric[];
  
  // Permanent questions to track
  permanentQuestions: PermanentQuestion[];
  
  // Reviews and updates
  quarterlyReviews: QuarterlyReview[];
  lastReviewDate?: Date;
  nextReviewDate: Date;
  
  // Status and metadata
  status: ThesisStatus;
  decision: InvestmentDecision;
  confidence: 'high' | 'medium' | 'low';
  
  // Notes and documentation
  notes?: string;
  sources: string[]; // Research sources
  attachments?: string[]; // Document references
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closureReason?: string;
}

export class InvestmentThesis extends AggregateRoot<InvestmentThesisProps> {
  private constructor(props: InvestmentThesisProps) {
    super(props);
  }

  /**
   * Factory method to create a new Investment Thesis
   */
  static create(props: Omit<InvestmentThesisProps, 'createdAt' | 'updatedAt' | 'status' | 'quarterlyReviews'>): Result<InvestmentThesis> {
    // Validate required fields
    if (!props.investmentCase || props.investmentCase.trim().length === 0) {
      return ResultUtils.fail('Investment case is required');
    }

    if (!props.investmentObjective || props.investmentObjective.trim().length === 0) {
      return ResultUtils.fail('Investment objective is required');
    }

    if (props.strengths.length === 0) {
      return ResultUtils.fail('At least one strength must be identified');
    }

    if (props.risks.length === 0) {
      return ResultUtils.fail('At least one risk must be identified');
    }

    // Validate triggers
    if (props.sellTriggers.length === 0) {
      return ResultUtils.fail('At least one sell trigger must be defined');
    }

    const thesis = new InvestmentThesis({
      ...props,
      status: 'active',
      quarterlyReviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    thesis.addDomainEvent('InvestmentThesisCreated', {
      thesisId: props.id,
      portfolioId: props.portfolioId,
      trustId: props.trustId,
      userId: props.userId,
    });

    return ResultUtils.ok(thesis);
  }

  /**
   * Update thesis position
   */
  updatePosition(position: Partial<InvestmentThesisProps['position']>): Result<void> {
    this.props.position = {
      ...this.props.position,
      ...position,
    };
    
    this.props.updatedAt = new Date();
    
    // Check if position size triggers any alerts
    if (this.props.position.maxPosition && 
        this.props.position.percentageOfPortfolio > this.props.position.maxPosition) {
      this.addDomainEvent('PositionExceedsMaximum', {
        thesisId: this.props.id,
        current: this.props.position.percentageOfPortfolio,
        maximum: this.props.position.maxPosition,
      });
    }
    
    return ResultUtils.ok();
  }

  /**
   * Check all triggers
   */
  checkTriggers(marketData: Map<string, number>): Result<ThesisTrigger[]> {
    const triggeredList: ThesisTrigger[] = [];
    
    // Check buy triggers
    for (const trigger of this.props.buyTriggers) {
      if (!trigger.isActive) continue;
      
      const result = this.evaluateTrigger(trigger, marketData);
      if (result) {
        trigger.triggered = true;
        trigger.triggeredAt = new Date();
        triggeredList.push(trigger);
      }
      trigger.lastChecked = new Date();
    }
    
    // Check sell triggers
    for (const trigger of this.props.sellTriggers) {
      if (!trigger.isActive) continue;
      
      const result = this.evaluateTrigger(trigger, marketData);
      if (result) {
        trigger.triggered = true;
        trigger.triggeredAt = new Date();
        triggeredList.push(trigger);
        
        // Mark thesis as violated if sell trigger hit
        this.props.status = 'violated';
        
        this.addDomainEvent('SellTriggerActivated', {
          thesisId: this.props.id,
          trustId: this.props.trustId,
          trigger: trigger.condition,
        });
      }
      trigger.lastChecked = new Date();
    }
    
    this.props.updatedAt = new Date();
    
    return ResultUtils.ok(triggeredList);
  }

  /**
   * Evaluate a single trigger
   */
  private evaluateTrigger(trigger: ThesisTrigger, marketData: Map<string, number>): boolean {
    if (!trigger.metric || !trigger.threshold || !trigger.operator) {
      return false; // Cannot evaluate without complete criteria
    }
    
    const currentValue = marketData.get(trigger.metric);
    if (currentValue === undefined) {
      return false; // No data available
    }
    
    switch (trigger.operator) {
      case '<':
        return currentValue < trigger.threshold;
      case '>':
        return currentValue > trigger.threshold;
      case '<=':
        return currentValue <= trigger.threshold;
      case '>=':
        return currentValue >= trigger.threshold;
      case '=':
        return Math.abs(currentValue - trigger.threshold) < 0.01;
      default:
        return false;
    }
  }

  /**
   * Update watch metrics
   */
  updateMetrics(metrics: Map<string, number>): Result<void> {
    for (const metric of this.props.watchMetrics) {
      const newValue = metrics.get(metric.name);
      if (newValue !== undefined) {
        // Determine trend
        if (metric.current !== newValue) {
          const change = newValue - metric.current;
          metric.trend = change > 0.01 ? 'improving' : 
                        change < -0.01 ? 'deteriorating' : 
                        'stable';
        }
        
        metric.current = newValue;
        metric.lastUpdated = new Date();
        
        // Check if metric is out of bounds
        if (metric.min !== undefined && newValue < metric.min) {
          this.addDomainEvent('MetricBelowMinimum', {
            thesisId: this.props.id,
            metric: metric.name,
            value: newValue,
            minimum: metric.min,
          });
        }
        
        if (metric.max !== undefined && newValue > metric.max) {
          this.addDomainEvent('MetricAboveMaximum', {
            thesisId: this.props.id,
            metric: metric.name,
            value: newValue,
            maximum: metric.max,
          });
        }
      }
    }
    
    this.props.updatedAt = new Date();
    
    return ResultUtils.ok();
  }

  /**
   * Add quarterly review
   */
  addQuarterlyReview(review: Omit<QuarterlyReview, 'id'>): Result<void> {
    const newReview: QuarterlyReview = {
      ...review,
      id: this.generateReviewId(),
    };
    
    this.props.quarterlyReviews.push(newReview);
    this.props.lastReviewDate = review.date;
    
    // Update next review date (add 3 months)
    const nextDate = new Date(review.date);
    nextDate.setMonth(nextDate.getMonth() + 3);
    this.props.nextReviewDate = nextDate;
    
    // Update decision based on review
    this.props.decision = review.decision;
    
    // Check if thesis needs to be closed
    if (review.decision === 'sell') {
      this.props.status = 'violated';
      this.addDomainEvent('ThesisReviewSellDecision', {
        thesisId: this.props.id,
        trustId: this.props.trustId,
        quarter: review.quarter,
      });
    }
    
    this.props.updatedAt = new Date();
    
    this.addDomainEvent('QuarterlyReviewCompleted', {
      thesisId: this.props.id,
      quarter: review.quarter,
      decision: review.decision,
    });
    
    return ResultUtils.ok();
  }

  /**
   * Answer a permanent question
   */
  answerPermanentQuestion(questionId: string, answer: string): Result<void> {
    const question = this.props.permanentQuestions.find(q => q.id === questionId);
    if (!question) {
      return ResultUtils.fail('Question not found');
    }
    
    question.lastAnswer = answer;
    question.lastAnsweredAt = new Date();
    question.requiresUpdate = false;
    
    this.props.updatedAt = new Date();
    
    // Check if answer indicates a concern
    const concernKeywords = ['concern', 'worry', 'risk', 'problem', 'issue', 'negative'];
    if (concernKeywords.some(keyword => answer.toLowerCase().includes(keyword))) {
      this.addDomainEvent('ConcernRaisedInAnswer', {
        thesisId: this.props.id,
        questionId,
        category: question.category,
      });
    }
    
    return ResultUtils.ok();
  }

  /**
   * Mark questions for update
   */
  markQuestionsForUpdate(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const question of this.props.permanentQuestions) {
      if (!question.lastAnsweredAt || question.lastAnsweredAt < thirtyDaysAgo) {
        question.requiresUpdate = true;
      }
    }
    
    this.props.updatedAt = new Date();
  }

  /**
   * Update investment decision
   */
  updateDecision(decision: InvestmentDecision, reason: string): Result<void> {
    const previousDecision = this.props.decision;
    this.props.decision = decision;
    
    if (this.props.notes) {
      this.props.notes += `\n\n${new Date().toISOString()}: Decision changed from ${previousDecision} to ${decision}. Reason: ${reason}`;
    } else {
      this.props.notes = `${new Date().toISOString()}: Decision changed to ${decision}. Reason: ${reason}`;
    }
    
    this.props.updatedAt = new Date();
    
    this.addDomainEvent('InvestmentDecisionChanged', {
      thesisId: this.props.id,
      trustId: this.props.trustId,
      previousDecision,
      newDecision: decision,
      reason,
    });
    
    return ResultUtils.ok();
  }

  /**
   * Close the thesis
   */
  close(reason: string): Result<void> {
    if (this.props.status === 'closed') {
      return ResultUtils.fail('Thesis is already closed');
    }
    
    this.props.status = 'closed';
    this.props.closedAt = new Date();
    this.props.closureReason = reason;
    this.props.updatedAt = new Date();
    
    this.addDomainEvent('InvestmentThesisClosed', {
      thesisId: this.props.id,
      trustId: this.props.trustId,
      reason,
    });
    
    return ResultUtils.ok();
  }

  /**
   * Check if review is due
   */
  isReviewDue(): boolean {
    return new Date() >= this.props.nextReviewDate;
  }

  /**
   * Get unanswered questions
   */
  getUnansweredQuestions(): PermanentQuestion[] {
    return this.props.permanentQuestions.filter(q => q.requiresUpdate);
  }

  /**
   * Get active triggers
   */
  getActiveTriggers(): ThesisTrigger[] {
    return [
      ...this.props.buyTriggers.filter(t => t.isActive),
      ...this.props.sellTriggers.filter(t => t.isActive),
    ];
  }

  /**
   * Calculate thesis health score
   */
  calculateHealthScore(): number {
    let score = 100;
    
    // Deduct for violated triggers
    const violatedTriggers = [...this.props.buyTriggers, ...this.props.sellTriggers]
      .filter(t => t.triggered);
    score -= violatedTriggers.length * 20;
    
    // Deduct for metrics out of bounds
    const outOfBoundsMetrics = this.props.watchMetrics.filter(m => 
      (m.min !== undefined && m.current < m.min) ||
      (m.max !== undefined && m.current > m.max)
    );
    score -= outOfBoundsMetrics.length * 10;
    
    // Deduct for overdue review
    if (this.isReviewDue()) {
      score -= 15;
    }
    
    // Deduct for unanswered questions
    const unansweredCount = this.getUnansweredQuestions().length;
    score -= unansweredCount * 5;
    
    // Deduct for poor performance
    const latestReview = this.props.quarterlyReviews[this.props.quarterlyReviews.length - 1];
    if (latestReview && latestReview.performance.vsObjective < -10) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate review ID
   */
  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): ThesisId { return this.props.id; }
  get trustId(): TrustId { return this.props.trustId; }
  get portfolioId(): PortfolioId { return this.props.portfolioId; }
  get status(): ThesisStatus { return this.props.status; }
  get decision(): InvestmentDecision { return this.props.decision; }
  get healthScore(): number { return this.calculateHealthScore(); }
}