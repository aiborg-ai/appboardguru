/**
 * Portfolio Domain Entity
 * Represents a user's investment portfolio with multiple trusts,
 * performance tracking, and AI-powered analysis capabilities
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { UserId } from './user.entity';
import type { TrustId } from './investment-trust.entity';

export type PortfolioId = string & { __brand: 'PortfolioId' };

export type PortfolioType = 'ISA' | 'SIPP' | 'General' | 'Junior ISA';
export type RebalancingStrategy = 'none' | 'threshold' | 'calendar' | 'dynamic';

export interface PortfolioHolding {
  trustId: TrustId;
  trustName: string;
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  percentageOfPortfolio: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dividendsReceived: number;
  firstPurchaseDate: Date;
  lastPurchaseDate?: Date;
  notes?: string;
}

export interface Transaction {
  id: string;
  trustId: TrustId;
  type: 'buy' | 'sell' | 'dividend' | 'fee';
  date: Date;
  shares?: number;
  price?: number;
  amount: number;
  fees: number;
  notes?: string;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  weekChange: number;
  weekChangePercentage: number;
  monthChange: number;
  monthChangePercentage: number;
  ytdReturn: number;
  ytdReturnPercentage: number;
  annualizedReturn?: number;
  sharpeRatio?: number;
  volatility?: number;
  lastUpdated: Date;
}

export interface RebalancingTarget {
  trustId: TrustId;
  targetPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  priority: number;
}

export interface RebalancingAlert {
  trustId: TrustId;
  currentPercentage: number;
  targetPercentage: number;
  deviation: number;
  action: 'buy' | 'sell';
  suggestedShares?: number;
  reason: string;
}

export interface PortfolioAlert {
  id: string;
  type: 'rebalancing' | 'performance' | 'dividend' | 'corporate_action' | 'thesis_violation';
  severity: 'info' | 'warning' | 'critical';
  trustId?: TrustId;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  actionRequired?: string;
}

export interface PortfolioProps {
  id: PortfolioId;
  userId: UserId;
  name: string;
  type: PortfolioType;
  currency: string;
  
  // Holdings and transactions
  holdings: PortfolioHolding[];
  transactions: Transaction[];
  
  // Performance tracking
  performance: PortfolioPerformance;
  historicalPerformance: Array<{
    date: Date;
    totalValue: number;
    dayReturn: number;
  }>;
  
  // Rebalancing
  rebalancingStrategy: RebalancingStrategy;
  rebalancingTargets: RebalancingTarget[];
  rebalancingThreshold?: number; // Percentage deviation to trigger alert
  lastRebalanced?: Date;
  
  // Alerts and monitoring
  alerts: PortfolioAlert[];
  watchlist: TrustId[];
  
  // Settings
  settings: {
    autoRebalance: boolean;
    dividendReinvestment: boolean;
    taxOptimization: boolean;
    riskTolerance: 'low' | 'medium' | 'high';
    investmentHorizon: 'short' | 'medium' | 'long';
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date;
}

export class Portfolio extends AggregateRoot<PortfolioProps> {
  private constructor(props: PortfolioProps) {
    super(props);
  }

  /**
   * Factory method to create a new Portfolio
   */
  static create(props: Omit<PortfolioProps, 'createdAt' | 'updatedAt' | 'performance' | 'historicalPerformance' | 'alerts'>): Result<Portfolio> {
    // Validate portfolio name
    if (!props.name || props.name.trim().length === 0) {
      return ResultUtils.fail('Portfolio name is required');
    }

    // Initialize performance metrics
    const initialPerformance: PortfolioPerformance = {
      totalValue: 0,
      totalCost: 0,
      totalReturn: 0,
      totalReturnPercentage: 0,
      dayChange: 0,
      dayChangePercentage: 0,
      weekChange: 0,
      weekChangePercentage: 0,
      monthChange: 0,
      monthChangePercentage: 0,
      ytdReturn: 0,
      ytdReturnPercentage: 0,
      lastUpdated: new Date(),
    };

    const portfolio = new Portfolio({
      ...props,
      performance: initialPerformance,
      historicalPerformance: [],
      alerts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    portfolio.addDomainEvent('PortfolioCreated', {
      portfolioId: props.id,
      userId: props.userId,
      name: props.name,
      type: props.type,
    });

    return ResultUtils.ok(portfolio);
  }

  /**
   * Add a new holding to the portfolio
   */
  addHolding(transaction: Omit<Transaction, 'id'>): Result<void> {
    if (transaction.type !== 'buy') {
      return ResultUtils.fail('Can only add holdings through buy transactions');
    }

    if (!transaction.shares || transaction.shares <= 0) {
      return ResultUtils.fail('Invalid number of shares');
    }

    // Create transaction
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateTransactionId(),
    };
    this.props.transactions.push(newTransaction);

    // Update or create holding
    const existingHolding = this.props.holdings.find(h => h.trustId === transaction.trustId);
    
    if (existingHolding) {
      // Update existing holding
      const totalCost = (existingHolding.shares * existingHolding.averageCost) + 
                       (transaction.shares * transaction.price! + transaction.fees);
      const totalShares = existingHolding.shares + transaction.shares;
      
      existingHolding.shares = totalShares;
      existingHolding.averageCost = totalCost / totalShares;
      existingHolding.lastPurchaseDate = transaction.date;
    } else {
      // Create new holding
      const newHolding: PortfolioHolding = {
        trustId: transaction.trustId,
        trustName: '', // To be populated from trust data
        ticker: '', // To be populated from trust data
        shares: transaction.shares,
        averageCost: (transaction.price! * transaction.shares + transaction.fees) / transaction.shares,
        currentPrice: transaction.price!,
        currentValue: transaction.price! * transaction.shares,
        percentageOfPortfolio: 0, // Will be recalculated
        totalReturn: 0,
        totalReturnPercentage: 0,
        dividendsReceived: 0,
        firstPurchaseDate: transaction.date,
      };
      
      this.props.holdings.push(newHolding);
    }

    // Recalculate portfolio metrics
    this.recalculateMetrics();
    this.checkRebalancingNeeded();
    
    this.props.updatedAt = new Date();

    this.addDomainEvent('HoldingAdded', {
      portfolioId: this.props.id,
      trustId: transaction.trustId,
      shares: transaction.shares,
      price: transaction.price,
    });

    return ResultUtils.ok();
  }

  /**
   * Remove shares from a holding
   */
  sellHolding(transaction: Omit<Transaction, 'id'>): Result<void> {
    if (transaction.type !== 'sell') {
      return ResultUtils.fail('Invalid transaction type for selling');
    }

    const holding = this.props.holdings.find(h => h.trustId === transaction.trustId);
    if (!holding) {
      return ResultUtils.fail('Holding not found');
    }

    if (!transaction.shares || transaction.shares > holding.shares) {
      return ResultUtils.fail('Insufficient shares');
    }

    // Create transaction
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateTransactionId(),
    };
    this.props.transactions.push(newTransaction);

    // Update holding
    holding.shares -= transaction.shares;
    
    // Remove holding if all shares sold
    if (holding.shares === 0) {
      this.props.holdings = this.props.holdings.filter(h => h.trustId !== transaction.trustId);
    }

    // Calculate realized gain/loss
    const realizedGain = (transaction.price! - holding.averageCost) * transaction.shares - transaction.fees;
    
    // Recalculate portfolio metrics
    this.recalculateMetrics();
    this.checkRebalancingNeeded();
    
    this.props.updatedAt = new Date();

    this.addDomainEvent('HoldingSold', {
      portfolioId: this.props.id,
      trustId: transaction.trustId,
      shares: transaction.shares,
      price: transaction.price,
      realizedGain,
    });

    return ResultUtils.ok();
  }

  /**
   * Update current prices for all holdings
   */
  updatePrices(prices: Map<TrustId, number>): Result<void> {
    let totalValue = 0;
    const previousTotalValue = this.props.performance.totalValue;

    for (const holding of this.props.holdings) {
      const newPrice = prices.get(holding.trustId);
      if (newPrice) {
        holding.currentPrice = newPrice;
        holding.currentValue = newPrice * holding.shares;
        
        // Calculate returns
        const totalCost = holding.averageCost * holding.shares;
        holding.totalReturn = holding.currentValue - totalCost + holding.dividendsReceived;
        holding.totalReturnPercentage = (holding.totalReturn / totalCost) * 100;
      }
      
      totalValue += holding.currentValue;
    }

    // Update portfolio percentages
    for (const holding of this.props.holdings) {
      holding.percentageOfPortfolio = (holding.currentValue / totalValue) * 100;
    }

    // Update performance metrics
    this.props.performance.totalValue = totalValue;
    this.props.performance.dayChange = totalValue - previousTotalValue;
    this.props.performance.dayChangePercentage = (this.props.performance.dayChange / previousTotalValue) * 100;
    this.props.performance.lastUpdated = new Date();

    // Add to historical performance
    this.props.historicalPerformance.push({
      date: new Date(),
      totalValue,
      dayReturn: this.props.performance.dayChange,
    });

    // Check for alerts
    this.checkPerformanceAlerts();
    this.checkRebalancingNeeded();

    this.props.updatedAt = new Date();

    return ResultUtils.ok();
  }

  /**
   * Check if rebalancing is needed
   */
  checkRebalancingNeeded(): void {
    if (this.props.rebalancingStrategy === 'none') {
      return;
    }

    const alerts: RebalancingAlert[] = [];

    for (const target of this.props.rebalancingTargets) {
      const holding = this.props.holdings.find(h => h.trustId === target.trustId);
      const currentPercentage = holding?.percentageOfPortfolio || 0;
      const deviation = Math.abs(currentPercentage - target.targetPercentage);

      if (deviation > (this.props.rebalancingThreshold || 5)) {
        alerts.push({
          trustId: target.trustId,
          currentPercentage,
          targetPercentage: target.targetPercentage,
          deviation,
          action: currentPercentage < target.targetPercentage ? 'buy' : 'sell',
          reason: `Deviation of ${deviation.toFixed(2)}% from target`,
        });
      }
    }

    // Create portfolio alerts
    for (const alert of alerts) {
      this.addAlert({
        type: 'rebalancing',
        severity: alert.deviation > 10 ? 'warning' : 'info',
        trustId: alert.trustId,
        message: `${alert.action.toUpperCase()}: ${alert.reason}`,
        actionRequired: `Consider ${alert.action}ing to rebalance`,
      });
    }
  }

  /**
   * Check for performance-based alerts
   */
  private checkPerformanceAlerts(): void {
    // Check for significant daily moves
    if (Math.abs(this.props.performance.dayChangePercentage) > 5) {
      this.addAlert({
        type: 'performance',
        severity: 'warning',
        message: `Portfolio ${this.props.performance.dayChangePercentage > 0 ? 'up' : 'down'} ${Math.abs(this.props.performance.dayChangePercentage).toFixed(2)}% today`,
      });
    }

    // Check individual holdings for large moves
    for (const holding of this.props.holdings) {
      if (Math.abs(holding.totalReturnPercentage) > 20) {
        this.addAlert({
          type: 'performance',
          severity: holding.totalReturnPercentage < -20 ? 'critical' : 'info',
          trustId: holding.trustId,
          message: `${holding.trustName} ${holding.totalReturnPercentage > 0 ? 'up' : 'down'} ${Math.abs(holding.totalReturnPercentage).toFixed(2)}% since purchase`,
        });
      }
    }
  }

  /**
   * Add an alert to the portfolio
   */
  private addAlert(alert: Omit<PortfolioAlert, 'id' | 'createdAt' | 'acknowledged'>): void {
    // Check if similar alert already exists
    const existingAlert = this.props.alerts.find(
      a => a.type === alert.type && 
           a.trustId === alert.trustId && 
           !a.acknowledged
    );

    if (!existingAlert) {
      this.props.alerts.push({
        ...alert,
        id: this.generateAlertId(),
        createdAt: new Date(),
        acknowledged: false,
      });

      this.addDomainEvent('PortfolioAlertCreated', {
        portfolioId: this.props.id,
        alertType: alert.type,
        severity: alert.severity,
      });
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): Result<void> {
    const alert = this.props.alerts.find(a => a.id === alertId);
    if (!alert) {
      return ResultUtils.fail('Alert not found');
    }

    alert.acknowledged = true;
    this.props.updatedAt = new Date();

    return ResultUtils.ok();
  }

  /**
   * Add trust to watchlist
   */
  addToWatchlist(trustId: TrustId): Result<void> {
    if (this.props.watchlist.includes(trustId)) {
      return ResultUtils.fail('Trust already in watchlist');
    }

    this.props.watchlist.push(trustId);
    this.props.updatedAt = new Date();

    this.addDomainEvent('TrustAddedToWatchlist', {
      portfolioId: this.props.id,
      trustId,
    });

    return ResultUtils.ok();
  }

  /**
   * Recalculate all portfolio metrics
   */
  private recalculateMetrics(): void {
    let totalValue = 0;
    let totalCost = 0;

    for (const holding of this.props.holdings) {
      totalValue += holding.currentValue;
      totalCost += holding.averageCost * holding.shares;
    }

    this.props.performance.totalValue = totalValue;
    this.props.performance.totalCost = totalCost;
    this.props.performance.totalReturn = totalValue - totalCost;
    this.props.performance.totalReturnPercentage = totalCost > 0 
      ? (this.props.performance.totalReturn / totalCost) * 100 
      : 0;

    // Update holding percentages
    for (const holding of this.props.holdings) {
      holding.percentageOfPortfolio = totalValue > 0 
        ? (holding.currentValue / totalValue) * 100 
        : 0;
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): PortfolioId { return this.props.id; }
  get userId(): UserId { return this.props.userId; }
  get name(): string { return this.props.name; }
  get type(): PortfolioType { return this.props.type; }
  get totalValue(): number { return this.props.performance.totalValue; }
  get totalReturn(): number { return this.props.performance.totalReturn; }
  get holdings(): PortfolioHolding[] { return this.props.holdings; }
  get alerts(): PortfolioAlert[] { return this.props.alerts.filter(a => !a.acknowledged); }
}