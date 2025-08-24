/**
 * MCP Billing Gateway
 * Enterprise billing and subscription management for MCP services
 * Handles tiered pricing, usage tracking, and revenue optimization
 * 
 * Target Revenue: £1M+ annually through tiered SaaS pricing
 * Enterprise clients: £50K-£250K annually per organization
 */

import { auditLogger } from './audit-logger'
import type { OrganizationId, UserId } from '@/types/branded'

export interface BillingTier {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  features: BillingFeature[]
  limits: BillingLimits
  support: SupportLevel
  sla: ServiceLevelAgreement
}

export interface BillingFeature {
  id: string
  name: string
  description: string
  category: 'Analysis' | 'Intelligence' | 'Automation' | 'Integration' | 'Support'
  enabled: boolean
  usage_based: boolean
  overage_cost?: number // Cost per unit over limit
}

export interface BillingLimits {
  monthly_analyses: number
  concurrent_sessions: number
  data_retention_months: number
  ai_queries_per_month: number
  api_calls_per_month: number
  storage_gb: number
  users: number
  organizations: number
  custom_integrations: number
}

export interface ServiceLevelAgreement {
  uptime_percentage: number // e.g., 99.9%
  response_time_ms: number
  support_response_hours: number
  data_backup_frequency: 'Daily' | 'Hourly' | 'Real-time'
  geographic_redundancy: boolean
  compliance_certifications: string[]
}

export interface SupportLevel {
  tier: 'Basic' | 'Professional' | 'Enterprise' | 'White-glove'
  channels: ('Email' | 'Chat' | 'Phone' | 'Video' | 'On-site')[]
  response_time: string
  dedicated_support: boolean
  training_included: boolean
  implementation_support: boolean
  custom_development: boolean
}

export interface Subscription {
  id: string
  organizationId: string
  tier: BillingTier
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | 'expired'
  billing_cycle: 'monthly' | 'annual'
  start_date: Date
  end_date?: Date
  trial_end_date?: Date
  current_period_start: Date
  current_period_end: Date
  auto_renew: boolean
  payment_method: PaymentMethod
  billing_contact: BillingContact
  usage: UsageMetrics
  overages: OverageCharge[]
  discounts: Discount[]
  custom_pricing?: CustomPricing
}

export interface PaymentMethod {
  id: string
  type: 'credit_card' | 'bank_transfer' | 'purchase_order' | 'invoice'
  status: 'active' | 'expired' | 'failed'
  last_four?: string
  expiry_date?: Date
  billing_address: BillingAddress
  processor: 'stripe' | 'adyen' | 'manual'
  processor_id?: string
}

export interface BillingAddress {
  name: string
  company?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postal_code: string
  country: string
  tax_id?: string
  vat_number?: string
}

export interface BillingContact {
  name: string
  email: string
  phone?: string
  title?: string
  department?: string
  preferred_contact: 'email' | 'phone'
  language: string
  timezone: string
}

export interface UsageMetrics {
  current_period: {
    analyses_used: number
    ai_queries_used: number
    api_calls_used: number
    storage_used_gb: number
    concurrent_sessions_peak: number
    active_users: number
  }
  historical: {
    period: string
    metrics: Record<string, number>
  }[]
  projections: {
    next_month: Record<string, number>
    confidence: number
    factors: string[]
  }
}

export interface OverageCharge {
  id: string
  type: 'analyses' | 'ai_queries' | 'api_calls' | 'storage' | 'users'
  quantity: number
  rate: number
  amount: number
  period: string
  description: string
  approved: boolean
  invoice_id?: string
}

export interface Discount {
  id: string
  type: 'percentage' | 'fixed' | 'free_months' | 'custom'
  value: number
  description: string
  code?: string
  start_date: Date
  end_date?: Date
  max_redemptions?: number
  redemptions_used: number
  applicable_tiers: string[]
  conditions: DiscountCondition[]
}

export interface DiscountCondition {
  type: 'minimum_commitment' | 'annual_billing' | 'user_count' | 'custom'
  value: any
  description: string
}

export interface CustomPricing {
  base_price: number
  custom_rates: CustomRate[]
  commitment: {
    duration_months: number
    minimum_spend: number
    penalties: PenaltyClause[]
  }
  volume_discounts: VolumeDiscount[]
  success_fees?: SuccessFee[]
}

export interface CustomRate {
  feature: string
  rate_type: 'fixed' | 'per_unit' | 'tiered' | 'percentage'
  rate: number
  tiers?: { from: number; to: number; rate: number }[]
  conditions: string[]
}

export interface PenaltyClause {
  condition: string
  penalty_type: 'percentage' | 'fixed' | 'termination'
  penalty_amount: number
  description: string
}

export interface VolumeDiscount {
  threshold: number
  discount_percentage: number
  applies_to: string[]
  description: string
}

export interface SuccessFee {
  metric: string
  threshold: number
  fee_percentage: number
  description: string
}

export interface Invoice {
  id: string
  subscription_id: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  invoice_number: string
  issue_date: Date
  due_date: Date
  paid_date?: Date
  period_start: Date
  period_end: Date
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency: string
  line_items: InvoiceLineItem[]
  payment_terms: string
  notes?: string
  pdf_url?: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  category: 'subscription' | 'overage' | 'professional_services' | 'discount'
  quantity: number
  unit_price: number
  amount: number
  tax_rate: number
  period_start?: Date
  period_end?: Date
  metadata: Record<string, any>
}

export interface BillingAlert {
  id: string
  type: 'usage_threshold' | 'overage' | 'payment_failed' | 'trial_ending' | 'renewal_reminder'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  threshold?: number
  current_value?: number
  action_required: boolean
  action_description?: string
  created_at: Date
  resolved_at?: Date
  organization_id: string
  subscription_id: string
}

export interface RevenueAnalytics {
  overview: {
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
    churn_rate: number
    ltv: number // Customer Lifetime Value
    cac: number // Customer Acquisition Cost
    gross_margin: number
  }
  by_tier: {
    tier: string
    customers: number
    mrr: number
    churn_rate: number
    avg_revenue_per_customer: number
  }[]
  growth: {
    period: string
    new_customers: number
    churned_customers: number
    expansion_revenue: number
    contraction_revenue: number
    net_revenue_retention: number
  }[]
  forecasting: {
    next_quarter: {
      projected_mrr: number
      confidence: number
      factors: string[]
    }
    annual: {
      projected_arr: number
      confidence: number
      assumptions: string[]
    }
  }
}

// Predefined billing tiers for BoardGuru MCP
export const BILLING_TIERS: Record<string, BillingTier> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small boards getting started with AI governance',
    monthlyPrice: 2500, // £2,500/month
    annualPrice: 25000, // £25,000/year (2 months free)
    features: [
      { id: 'board_analysis', name: 'Board Composition Analysis', description: 'AI-powered board analysis', category: 'Analysis', enabled: true, usage_based: true, overage_cost: 50 },
      { id: 'basic_compliance', name: 'Basic Compliance Monitoring', description: 'Core compliance tracking', category: 'Intelligence', enabled: true, usage_based: false },
      { id: 'meeting_insights', name: 'Meeting Intelligence', description: 'Basic meeting analysis', category: 'Analysis', enabled: true, usage_based: true, overage_cost: 25 },
      { id: 'email_support', name: 'Email Support', description: '48-hour response time', category: 'Support', enabled: true, usage_based: false }
    ],
    limits: {
      monthly_analyses: 50,
      concurrent_sessions: 5,
      data_retention_months: 12,
      ai_queries_per_month: 1000,
      api_calls_per_month: 10000,
      storage_gb: 100,
      users: 10,
      organizations: 1,
      custom_integrations: 2
    },
    support: {
      tier: 'Basic',
      channels: ['Email'],
      response_time: '48 hours',
      dedicated_support: false,
      training_included: false,
      implementation_support: false,
      custom_development: false
    },
    sla: {
      uptime_percentage: 99.5,
      response_time_ms: 2000,
      support_response_hours: 48,
      data_backup_frequency: 'Daily',
      geographic_redundancy: false,
      compliance_certifications: ['SOC2']
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Comprehensive governance intelligence for growing organizations',
    monthlyPrice: 7500, // £7,500/month
    annualPrice: 75000, // £75,000/year
    features: [
      { id: 'advanced_board_analysis', name: 'Advanced Board Analysis', description: 'Comprehensive AI board intelligence', category: 'Analysis', enabled: true, usage_based: true, overage_cost: 35 },
      { id: 'full_compliance', name: 'Full Compliance Intelligence', description: 'Advanced compliance automation', category: 'Intelligence', enabled: true, usage_based: false },
      { id: 'meeting_intelligence', name: 'Advanced Meeting Intelligence', description: 'Full meeting AI analysis', category: 'Analysis', enabled: true, usage_based: true, overage_cost: 20 },
      { id: 'predictive_analytics', name: 'Predictive Analytics', description: 'AI-powered predictions', category: 'Intelligence', enabled: true, usage_based: false },
      { id: 'api_access', name: 'API Access', description: 'RESTful API integration', category: 'Integration', enabled: true, usage_based: true, overage_cost: 0.01 },
      { id: 'priority_support', name: 'Priority Support', description: '24-hour response time', category: 'Support', enabled: true, usage_based: false }
    ],
    limits: {
      monthly_analyses: 200,
      concurrent_sessions: 15,
      data_retention_months: 24,
      ai_queries_per_month: 5000,
      api_calls_per_month: 50000,
      storage_gb: 500,
      users: 25,
      organizations: 3,
      custom_integrations: 5
    },
    support: {
      tier: 'Professional',
      channels: ['Email', 'Chat'],
      response_time: '24 hours',
      dedicated_support: false,
      training_included: true,
      implementation_support: true,
      custom_development: false
    },
    sla: {
      uptime_percentage: 99.9,
      response_time_ms: 1000,
      support_response_hours: 24,
      data_backup_frequency: 'Hourly',
      geographic_redundancy: true,
      compliance_certifications: ['SOC2', 'ISO27001', 'GDPR']
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full-scale governance automation for large organizations',
    monthlyPrice: 20000, // £20,000/month
    annualPrice: 200000, // £200,000/year
    features: [
      { id: 'unlimited_analysis', name: 'Unlimited Analysis', description: 'No limits on AI analysis', category: 'Analysis', enabled: true, usage_based: false },
      { id: 'enterprise_compliance', name: 'Enterprise Compliance Suite', description: 'Full regulatory automation', category: 'Intelligence', enabled: true, usage_based: false },
      { id: 'advanced_meeting_ai', name: 'Advanced Meeting AI', description: 'Real-time meeting intelligence', category: 'Analysis', enabled: true, usage_based: false },
      { id: 'custom_ai_models', name: 'Custom AI Models', description: 'Tailored AI for your organization', category: 'Intelligence', enabled: true, usage_based: false },
      { id: 'white_label', name: 'White Label Options', description: 'Brand the platform as your own', category: 'Integration', enabled: true, usage_based: false },
      { id: 'dedicated_support', name: 'Dedicated Support', description: 'Dedicated customer success manager', category: 'Support', enabled: true, usage_based: false }
    ],
    limits: {
      monthly_analyses: -1, // Unlimited
      concurrent_sessions: 50,
      data_retention_months: 60,
      ai_queries_per_month: -1, // Unlimited
      api_calls_per_month: -1, // Unlimited
      storage_gb: 5000,
      users: 100,
      organizations: -1, // Unlimited
      custom_integrations: -1 // Unlimited
    },
    support: {
      tier: 'Enterprise',
      channels: ['Email', 'Chat', 'Phone', 'Video'],
      response_time: '4 hours',
      dedicated_support: true,
      training_included: true,
      implementation_support: true,
      custom_development: true
    },
    sla: {
      uptime_percentage: 99.99,
      response_time_ms: 500,
      support_response_hours: 4,
      data_backup_frequency: 'Real-time',
      geographic_redundancy: true,
      compliance_certifications: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'FedRAMP']
    }
  },
  whiteLabelPartner: {
    id: 'white_label_partner',
    name: 'White Label Partner',
    description: 'Complete platform licensing for partners and resellers',
    monthlyPrice: 50000, // £50,000/month base + revenue share
    annualPrice: 500000, // £500,000/year + revenue share
    features: [
      { id: 'full_platform_access', name: 'Full Platform Access', description: 'Complete BoardGuru MCP platform', category: 'Integration', enabled: true, usage_based: false },
      { id: 'white_label_branding', name: 'White Label Branding', description: 'Complete brand customization', category: 'Integration', enabled: true, usage_based: false },
      { id: 'reseller_portal', name: 'Reseller Portal', description: 'Partner management dashboard', category: 'Integration', enabled: true, usage_based: false },
      { id: 'revenue_sharing', name: 'Revenue Sharing', description: '30-50% revenue share model', category: 'Integration', enabled: true, usage_based: false },
      { id: 'dedicated_engineering', name: 'Dedicated Engineering', description: 'Dedicated development resources', category: 'Support', enabled: true, usage_based: false }
    ],
    limits: {
      monthly_analyses: -1,
      concurrent_sessions: -1,
      data_retention_months: -1,
      ai_queries_per_month: -1,
      api_calls_per_month: -1,
      storage_gb: -1,
      users: -1,
      organizations: -1,
      custom_integrations: -1
    },
    support: {
      tier: 'White-glove',
      channels: ['Email', 'Chat', 'Phone', 'Video', 'On-site'],
      response_time: '2 hours',
      dedicated_support: true,
      training_included: true,
      implementation_support: true,
      custom_development: true
    },
    sla: {
      uptime_percentage: 99.99,
      response_time_ms: 200,
      support_response_hours: 2,
      data_backup_frequency: 'Real-time',
      geographic_redundancy: true,
      compliance_certifications: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'FedRAMP', 'Custom']
    }
  }
}

class BillingGateway {
  /**
   * Get subscription details for organization
   */
  async getSubscription(organizationId: OrganizationId): Promise<Subscription | null> {
    try {
      // In real implementation, would fetch from database
      // Mock implementation for demonstration
      return {
        id: `sub_${organizationId}_${Date.now()}`,
        organizationId: organizationId,
        tier: BILLING_TIERS.professional,
        status: 'active',
        billing_cycle: 'annual',
        start_date: new Date('2024-01-01'),
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-12-31'),
        auto_renew: true,
        payment_method: {
          id: 'pm_123',
          type: 'credit_card',
          status: 'active',
          last_four: '4242',
          expiry_date: new Date('2026-12-31'),
          billing_address: {
            name: 'BoardGuru Customer',
            company: 'Example Corp',
            line1: '123 Business Street',
            city: 'London',
            postal_code: 'SW1A 1AA',
            country: 'GB',
            vat_number: 'GB123456789'
          },
          processor: 'stripe',
          processor_id: 'pm_stripe_123'
        },
        billing_contact: {
          name: 'Finance Director',
          email: 'finance@example.com',
          phone: '+44 20 1234 5678',
          title: 'CFO',
          department: 'Finance',
          preferred_contact: 'email',
          language: 'en',
          timezone: 'Europe/London'
        },
        usage: {
          current_period: {
            analyses_used: 145,
            ai_queries_used: 3200,
            api_calls_used: 28500,
            storage_used_gb: 245,
            concurrent_sessions_peak: 12,
            active_users: 18
          },
          historical: [
            { period: '2024-03', metrics: { analyses_used: 158, ai_queries_used: 3400 } },
            { period: '2024-02', metrics: { analyses_used: 134, ai_queries_used: 2900 } }
          ],
          projections: {
            next_month: { analyses_used: 165, ai_queries_used: 3600 },
            confidence: 0.85,
            factors: ['Seasonal increase', 'New team members']
          }
        },
        overages: [],
        discounts: [
          {
            id: 'early_adopter',
            type: 'percentage',
            value: 20,
            description: 'Early adopter discount',
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
            redemptions_used: 1,
            applicable_tiers: ['professional', 'enterprise'],
            conditions: [
              { type: 'annual_billing', value: true, description: 'Must use annual billing' }
            ]
          }
        ]
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  }

  /**
   * Check if organization has access to specific feature
   */
  async checkFeatureAccess(
    organizationId: OrganizationId,
    featureId: string
  ): Promise<{ hasAccess: boolean; reason?: string; upgradeRequired?: string }> {
    try {
      const subscription = await this.getSubscription(organizationId)
      
      if (!subscription || subscription.status !== 'active') {
        return {
          hasAccess: false,
          reason: 'No active subscription',
          upgradeRequired: 'starter'
        }
      }

      const feature = subscription.tier.features.find(f => f.id === featureId)
      if (!feature || !feature.enabled) {
        return {
          hasAccess: false,
          reason: 'Feature not included in current tier',
          upgradeRequired: this.getUpgradeRecommendation(featureId)
        }
      }

      // Check usage limits for usage-based features
      if (feature.usage_based) {
        const usageCheck = await this.checkUsageLimits(subscription, featureId)
        if (!usageCheck.withinLimit) {
          return {
            hasAccess: false,
            reason: `Usage limit exceeded: ${usageCheck.current}/${usageCheck.limit}`,
            upgradeRequired: this.getUpgradeRecommendation(featureId)
          }
        }
      }

      return { hasAccess: true }
    } catch (error) {
      console.error('Error checking feature access:', error)
      return {
        hasAccess: false,
        reason: 'Error checking access'
      }
    }
  }

  /**
   * Record usage for billing
   */
  async recordUsage(
    organizationId: OrganizationId,
    usage: {
      feature: string
      quantity: number
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    try {
      await auditLogger.logEvent('billing_usage_recorded', {
        organizationId,
        feature: usage.feature,
        quantity: usage.quantity,
        metadata: usage.metadata,
        timestamp: new Date()
      })

      // In real implementation, would update usage metrics in database
      // Check for overage alerts
      await this.checkAndCreateOverageAlerts(organizationId, usage.feature, usage.quantity)
    } catch (error) {
      console.error('Error recording usage:', error)
      throw new Error('Failed to record usage')
    }
  }

  /**
   * Generate invoice for organization
   */
  async generateInvoice(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Invoice> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      const lineItems: InvoiceLineItem[] = []
      
      // Base subscription fee
      const baseFee = subscription.billing_cycle === 'annual' 
        ? subscription.tier.annualPrice 
        : subscription.tier.monthlyPrice

      lineItems.push({
        id: `li_base_${Date.now()}`,
        description: `${subscription.tier.name} Plan - ${this.formatPeriod(periodStart, periodEnd)}`,
        category: 'subscription',
        quantity: 1,
        unit_price: baseFee,
        amount: baseFee,
        tax_rate: 0.20, // 20% VAT for UK
        period_start: periodStart,
        period_end: periodEnd,
        metadata: { tier: subscription.tier.id, billing_cycle: subscription.billing_cycle }
      })

      // Add overage charges
      for (const overage of subscription.overages) {
        if (overage.approved) {
          lineItems.push({
            id: `li_overage_${overage.id}`,
            description: `Overage: ${overage.description}`,
            category: 'overage',
            quantity: overage.quantity,
            unit_price: overage.rate,
            amount: overage.amount,
            tax_rate: 0.20,
            metadata: { overage_type: overage.type }
          })
        }
      }

      // Apply discounts
      let discountAmount = 0
      for (const discount of subscription.discounts) {
        const discountValue = this.calculateDiscount(discount, baseFee)
        if (discountValue > 0) {
          lineItems.push({
            id: `li_discount_${discount.id}`,
            description: `Discount: ${discount.description}`,
            category: 'discount',
            quantity: 1,
            unit_price: -discountValue,
            amount: -discountValue,
            tax_rate: 0,
            metadata: { discount_type: discount.type, discount_code: discount.code }
          })
          discountAmount += discountValue
        }
      }

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
      const taxAmount = lineItems.reduce((sum, item) => sum + (item.amount * item.tax_rate), 0)
      const total = subtotal + taxAmount

      const invoice: Invoice = {
        id: `inv_${Date.now()}`,
        subscription_id: subscriptionId,
        status: 'draft',
        invoice_number: `BG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        issue_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        period_start: periodStart,
        period_end: periodEnd,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        currency: 'GBP',
        line_items: lineItems,
        payment_terms: 'Net 30 days',
        notes: 'Thank you for your business. Please remit payment within 30 days.'
      }

      await auditLogger.logEvent('invoice_generated', {
        invoiceId: invoice.id,
        subscriptionId,
        amount: total,
        currency: invoice.currency
      })

      return invoice
    } catch (error) {
      console.error('Error generating invoice:', error)
      throw new Error('Failed to generate invoice')
    }
  }

  /**
   * Calculate revenue analytics
   */
  async getRevenueAnalytics(timeframe?: { start: Date; end: Date }): Promise<RevenueAnalytics> {
    try {
      // Mock implementation - would calculate from actual subscription data
      return {
        overview: {
          mrr: 2500000, // £2.5M monthly recurring revenue
          arr: 30000000, // £30M annual recurring revenue
          churn_rate: 0.05, // 5% monthly churn
          ltv: 500000, // £500K customer lifetime value
          cac: 50000, // £50K customer acquisition cost
          gross_margin: 0.85 // 85% gross margin
        },
        by_tier: [
          {
            tier: 'starter',
            customers: 150,
            mrr: 375000, // £375K from starter tier
            churn_rate: 0.08,
            avg_revenue_per_customer: 2500
          },
          {
            tier: 'professional',
            customers: 80,
            mrr: 600000, // £600K from professional tier
            churn_rate: 0.04,
            avg_revenue_per_customer: 7500
          },
          {
            tier: 'enterprise',
            customers: 35,
            mrr: 700000, // £700K from enterprise tier
            churn_rate: 0.02,
            avg_revenue_per_customer: 20000
          },
          {
            tier: 'white_label_partner',
            customers: 5,
            mrr: 250000, // £250K from white label partners
            churn_rate: 0.01,
            avg_revenue_per_customer: 50000
          }
        ],
        growth: [
          {
            period: '2024-Q1',
            new_customers: 45,
            churned_customers: 12,
            expansion_revenue: 150000,
            contraction_revenue: 25000,
            net_revenue_retention: 1.15
          }
        ],
        forecasting: {
          next_quarter: {
            projected_mrr: 2750000,
            confidence: 0.88,
            factors: ['Strong pipeline', 'Low churn rate', 'Expansion opportunities']
          },
          annual: {
            projected_arr: 35000000,
            confidence: 0.82,
            assumptions: ['Current growth rate continues', 'No major market changes', 'Product roadmap delivery']
          }
        }
      }
    } catch (error) {
      console.error('Error calculating revenue analytics:', error)
      throw new Error('Failed to calculate revenue analytics')
    }
  }

  // Private helper methods
  private async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    // Mock implementation - would fetch from database
    return null
  }

  private async checkUsageLimits(
    subscription: Subscription,
    featureId: string
  ): Promise<{ withinLimit: boolean; current: number; limit: number }> {
    // Map feature IDs to usage metrics
    const usageMapping: Record<string, keyof typeof subscription.usage.current_period> = {
      'board_analysis': 'analyses_used',
      'advanced_board_analysis': 'analyses_used',
      'meeting_insights': 'analyses_used',
      'meeting_intelligence': 'analyses_used',
      'api_access': 'api_calls_used'
    }

    const usageKey = usageMapping[featureId]
    if (!usageKey) {
      return { withinLimit: true, current: 0, limit: -1 }
    }

    const current = subscription.usage.current_period[usageKey]
    const limit = subscription.tier.limits.monthly_analyses // Simplified mapping

    return {
      withinLimit: limit === -1 || current < limit,
      current,
      limit
    }
  }

  private getUpgradeRecommendation(featureId: string): string {
    // Simplified logic - would be more sophisticated in real implementation
    if (featureId.includes('advanced') || featureId.includes('enterprise')) {
      return 'enterprise'
    }
    if (featureId.includes('professional') || featureId === 'api_access') {
      return 'professional'
    }
    return 'starter'
  }

  private async checkAndCreateOverageAlerts(
    organizationId: OrganizationId,
    feature: string,
    quantity: number
  ): Promise<void> {
    const subscription = await this.getSubscription(organizationId)
    if (!subscription) return

    // Check if usage is approaching limits
    const usagePct = this.calculateUsagePercentage(subscription, feature)
    
    if (usagePct > 0.8) { // 80% threshold
      const alert: BillingAlert = {
        id: `alert_${Date.now()}`,
        type: 'usage_threshold',
        severity: usagePct > 0.95 ? 'critical' : 'warning',
        title: 'Usage Threshold Reached',
        description: `${feature} usage is at ${Math.round(usagePct * 100)}% of monthly limit`,
        threshold: 0.8,
        current_value: usagePct,
        action_required: usagePct > 0.95,
        action_description: usagePct > 0.95 ? 'Consider upgrading your plan to avoid overages' : undefined,
        created_at: new Date(),
        organization_id: organizationId,
        subscription_id: subscription.id
      }

      // Would save alert to database and notify customer
      await auditLogger.logEvent('billing_alert_created', alert)
    }
  }

  private calculateUsagePercentage(subscription: Subscription, feature: string): number {
    // Simplified calculation - would be more comprehensive in real implementation
    return subscription.usage.current_period.analyses_used / subscription.tier.limits.monthly_analyses
  }

  private calculateDiscount(discount: Discount, baseAmount: number): number {
    switch (discount.type) {
      case 'percentage':
        return baseAmount * (discount.value / 100)
      case 'fixed':
        return discount.value
      default:
        return 0
    }
  }

  private formatPeriod(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const endStr = end.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`
  }
}

export const billingGateway = new BillingGateway()