/**
 * Investment Trust Domain Entity
 * Represents an investment trust with comprehensive tracking of performance,
 * holdings, and key metrics for AI-powered analysis
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';

export type TrustId = string & { __brand: 'TrustId' };
export type ISIN = string & { __brand: 'ISIN' };
export type Ticker = string & { __brand: 'Ticker' };

export type TrustSector = 
  | 'UK Equity Income'
  | 'UK Smaller Companies'
  | 'Global Equity Income'
  | 'Global'
  | 'Emerging Markets'
  | 'Europe'
  | 'Asia Pacific'
  | 'North America'
  | 'Property'
  | 'Private Equity'
  | 'Infrastructure'
  | 'Debt'
  | 'Commodities'
  | 'Flexible Investment'
  | 'Other';

export type TrustStatus = 'active' | 'suspended' | 'delisted' | 'merged';

export interface TrustHolding {
  name: string;
  ticker?: string;
  percentage: number;
  value: number;
  isUnlisted: boolean;
  sector?: string;
  country?: string;
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  nav: number; // Net Asset Value per share
  sharePrice: number;
  discount: number; // Negative = discount, Positive = premium
  dividendYield: number;
  ongoingCharges: number;
  gearing: number; // Borrowing as % of net assets
  performanceYTD: number;
  performance1Y: number;
  performance3Y: number;
  performance5Y: number;
  lastUpdated: Date;
}

export interface DividendInfo {
  frequency: 'quarterly' | 'semi-annual' | 'annual' | 'monthly';
  lastAmount: number;
  lastExDate: Date;
  lastPayDate: Date;
  totalPaidYTD: number;
  dividendCover: number;
  revenueReserves: number;
  history: Array<{
    exDate: Date;
    payDate: Date;
    amount: number;
    type: 'interim' | 'final' | 'special';
  }>;
}

export interface BuybackActivity {
  isActive: boolean;
  authorizedShares: number;
  sharesRepurchasedYTD: number;
  averageDiscount: number;
  lastBuybackDate?: Date;
  policy?: string;
  history: Array<{
    date: Date;
    shares: number;
    price: number;
    discount: number;
  }>;
}

export interface BoardInfo {
  chair: string;
  directors: Array<{
    name: string;
    role: string;
    appointedDate: Date;
    independent: boolean;
  }>;
  nextAGM?: Date;
  lastUpdated: Date;
}

export interface ManagerInfo {
  managementCompany: string;
  fundManager: string;
  managementFee: number;
  performanceFee?: {
    rate: number;
    hurdle: number;
    highWaterMark?: number;
  };
  mandate: string;
}

export interface InvestmentTrustProps {
  id: TrustId;
  isin: ISIN;
  ticker: Ticker;
  name: string;
  sector: TrustSector;
  status: TrustStatus;
  
  // Core data
  launchDate: Date;
  yearEnd: string; // Month of financial year end
  domicile: string;
  currency: string;
  totalAssets: number;
  marketCap: number;
  sharesInIssue: number;
  
  // Complex data structures
  holdings: TrustHolding[];
  topTenHoldings: TrustHolding[];
  performance: PerformanceMetrics;
  dividend: DividendInfo;
  buyback: BuybackActivity;
  board: BoardInfo;
  manager: ManagerInfo;
  
  // Investment policy
  investmentObjective: string;
  investmentPolicy: string;
  benchmark?: string;
  discountPolicy?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  dataSource?: string;
}

export class InvestmentTrust extends AggregateRoot<InvestmentTrustProps> {
  private constructor(props: InvestmentTrustProps) {
    super(props);
  }

  /**
   * Factory method to create a new Investment Trust
   */
  static create(props: Omit<InvestmentTrustProps, 'createdAt' | 'updatedAt'>): Result<InvestmentTrust> {
    // Validate ISIN format
    if (!this.isValidISIN(props.isin)) {
      return ResultUtils.fail('Invalid ISIN format');
    }

    // Validate ticker
    if (!props.ticker || props.ticker.length === 0) {
      return ResultUtils.fail('Ticker is required');
    }

    // Validate holdings percentages
    const totalPercentage = props.holdings.reduce((sum, h) => sum + h.percentage, 0);
    if (totalPercentage > 100.01) { // Allow small rounding error
      return ResultUtils.fail('Holdings percentages exceed 100%');
    }

    const trust = new InvestmentTrust({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    trust.addDomainEvent('InvestmentTrustCreated', {
      trustId: props.id,
      isin: props.isin,
      name: props.name,
      sector: props.sector,
    });

    return ResultUtils.ok(trust);
  }

  /**
   * Update performance metrics
   */
  updatePerformance(metrics: Partial<PerformanceMetrics>): Result<void> {
    const newPerformance = {
      ...this.props.performance,
      ...metrics,
      lastUpdated: new Date(),
    };

    // Calculate discount/premium
    if (metrics.nav && metrics.sharePrice) {
      newPerformance.discount = ((metrics.sharePrice - metrics.nav) / metrics.nav) * 100;
    }

    this.props.performance = newPerformance;
    this.props.updatedAt = new Date();

    // Emit event if discount crosses threshold
    if (Math.abs(newPerformance.discount) > 10) {
      this.addDomainEvent('DiscountThresholdCrossed', {
        trustId: this.props.id,
        discount: newPerformance.discount,
        threshold: 10,
      });
    }

    return ResultUtils.ok();
  }

  /**
   * Update holdings
   */
  updateHoldings(holdings: TrustHolding[]): Result<void> {
    const totalPercentage = holdings.reduce((sum, h) => sum + h.percentage, 0);
    if (totalPercentage > 100.01) {
      return ResultUtils.fail('Holdings percentages exceed 100%');
    }

    this.props.holdings = holdings;
    this.props.topTenHoldings = holdings
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);
    
    this.props.updatedAt = new Date();

    // Check for concentration risk
    const topHolding = this.props.topTenHoldings[0];
    if (topHolding && topHolding.percentage > 15) {
      this.addDomainEvent('ConcentrationRiskDetected', {
        trustId: this.props.id,
        holding: topHolding.name,
        percentage: topHolding.percentage,
      });
    }

    return ResultUtils.ok();
  }

  /**
   * Record dividend payment
   */
  recordDividend(dividend: {
    exDate: Date;
    payDate: Date;
    amount: number;
    type: 'interim' | 'final' | 'special';
  }): Result<void> {
    this.props.dividend.history.push(dividend);
    this.props.dividend.lastAmount = dividend.amount;
    this.props.dividend.lastExDate = dividend.exDate;
    this.props.dividend.lastPayDate = dividend.payDate;
    
    // Update YTD total
    const currentYear = new Date().getFullYear();
    this.props.dividend.totalPaidYTD = this.props.dividend.history
      .filter(d => d.payDate.getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.amount, 0);
    
    this.props.updatedAt = new Date();

    this.addDomainEvent('DividendRecorded', {
      trustId: this.props.id,
      ...dividend,
    });

    return ResultUtils.ok();
  }

  /**
   * Record buyback activity
   */
  recordBuyback(buyback: {
    date: Date;
    shares: number;
    price: number;
    discount: number;
  }): Result<void> {
    this.props.buyback.history.push(buyback);
    this.props.buyback.lastBuybackDate = buyback.date;
    this.props.buyback.sharesRepurchasedYTD += buyback.shares;
    
    // Update average discount
    const totalDiscountValue = this.props.buyback.history
      .reduce((sum, b) => sum + (b.discount * b.shares), 0);
    const totalShares = this.props.buyback.history
      .reduce((sum, b) => sum + b.shares, 0);
    this.props.buyback.averageDiscount = totalDiscountValue / totalShares;
    
    this.props.updatedAt = new Date();

    // Check if buyback is within policy
    if (this.props.discountPolicy && buyback.discount < 8) {
      this.addDomainEvent('BuybackOutsidePolicy', {
        trustId: this.props.id,
        discount: buyback.discount,
        policy: this.props.discountPolicy,
      });
    }

    return ResultUtils.ok();
  }

  /**
   * Calculate dividend cover
   */
  calculateDividendCover(earnings: number): number {
    const annualDividend = this.props.dividend.totalPaidYTD;
    if (annualDividend === 0) return 0;
    
    const cover = earnings / annualDividend;
    this.props.dividend.dividendCover = cover;
    
    if (cover < 1) {
      this.addDomainEvent('DividendCoverWarning', {
        trustId: this.props.id,
        cover,
        message: 'Dividend not fully covered by earnings',
      });
    }
    
    return cover;
  }

  /**
   * Check if trust matches peer criteria
   */
  matchesPeerCriteria(criteria: {
    sector?: TrustSector;
    minMarketCap?: number;
    maxMarketCap?: number;
    minDiscount?: number;
    maxDiscount?: number;
  }): boolean {
    if (criteria.sector && this.props.sector !== criteria.sector) {
      return false;
    }
    
    if (criteria.minMarketCap && this.props.marketCap < criteria.minMarketCap) {
      return false;
    }
    
    if (criteria.maxMarketCap && this.props.marketCap > criteria.maxMarketCap) {
      return false;
    }
    
    const discount = this.props.performance.discount;
    if (criteria.minDiscount && discount < criteria.minDiscount) {
      return false;
    }
    
    if (criteria.maxDiscount && discount > criteria.maxDiscount) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate ISIN format
   */
  private static isValidISIN(isin: string): boolean {
    // ISIN format: 2 letter country code + 9 alphanumeric + 1 check digit
    const isinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
    return isinRegex.test(isin);
  }

  /**
   * Get concentration metrics
   */
  getConcentrationMetrics(): {
    top10Percentage: number;
    herfindahlIndex: number;
    unlistedPercentage: number;
  } {
    const top10Percentage = this.props.topTenHoldings
      .reduce((sum, h) => sum + h.percentage, 0);
    
    const herfindahlIndex = this.props.holdings
      .reduce((sum, h) => sum + Math.pow(h.percentage / 100, 2), 0);
    
    const unlistedPercentage = this.props.holdings
      .filter(h => h.isUnlisted)
      .reduce((sum, h) => sum + h.percentage, 0);
    
    return {
      top10Percentage,
      herfindahlIndex,
      unlistedPercentage,
    };
  }

  // Getters for key metrics
  get id(): TrustId { return this.props.id; }
  get isin(): ISIN { return this.props.isin; }
  get ticker(): Ticker { return this.props.ticker; }
  get name(): string { return this.props.name; }
  get sector(): TrustSector { return this.props.sector; }
  get discount(): number { return this.props.performance.discount; }
  get dividendYield(): number { return this.props.performance.dividendYield; }
  get nav(): number { return this.props.performance.nav; }
  get sharePrice(): number { return this.props.performance.sharePrice; }
}